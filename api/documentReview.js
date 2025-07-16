// api/documentReview.js
const documentsService = require('../services/documentsService');
const usersService = require('../services/usersService');
const sheetsService = require('../services/sheetsService');

// Cache simple en memoria para el endpoint
const cache = new Map();
const CACHE_DURATION = 1 * 60 * 1000; // 1 minuto

/**
 * Función para hacer retry con backoff exponencial
 * @param {Function} fn - Función a ejecutar
 * @param {number} retries - Número de reintentos
 * @param {number} delay - Delay inicial en ms
 * @returns {Promise} - Resultado de la función
 */
const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    // Si es un error de rate limiting (429 o 500 con mensaje de quota) y aún tenemos reintentos
    const isRateLimit = error.code === 429 || 
                       error.response?.status === 429 || 
                       error.response?.status === 500 && 
                       (error.response?.data?.message?.includes('Quota exceeded') || 
                        error.message?.includes('Quota exceeded'));
    
    if (isRateLimit && retries > 0) {
      console.log(`Rate limit detectado, esperando ${delay}ms antes de reintentar. Reintentos restantes: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2); // Duplicar el delay
    }
    throw error;
  }
};

/**
 * Función helper para obtener datos con caché
 * @param {string} cacheKey - Clave del caché
 * @param {Function} fetchFn - Función para obtener datos
 * @returns {Promise} - Datos cacheados o frescos
 */
const getWithCache = async (cacheKey, fetchFn) => {
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Cache hit para: ${cacheKey}`);
    return cached.data;
  }
  
  console.log(`Cache miss para: ${cacheKey}, obteniendo datos frescos...`);
  const data = await retryWithBackoff(fetchFn);
  
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
};

/**
 * Función para limpiar cache específico
 * @param {string} pattern - Patrón para limpiar ciertas entradas
 */
const clearDocumentReviewCache = (pattern = null) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
  console.log('Cache de document review limpiado:', pattern ? `patrón: ${pattern}` : 'completo');
};

/**
 * Obtiene datos consolidados para la revisión de un documento específico
 * @param {string} documentId - ID del documento a revisar
 * @returns {Promise<Object>} - Datos consolidados para revisión
 */
const getDocumentReviewData = async (documentId) => {
  try {
    console.log(`🔄 Obteniendo datos para revisión del documento ${documentId}...`);
    
    const client = sheetsService.getClient();
    
    // Obtener datos del documento específico usando batchGet para eficiencia
    const documentResponse = await client.spreadsheets.values.batchGet({
      spreadsheetId: sheetsService.spreadsheetId,
      ranges: [
        'DOCUMENTOS_USUARIOS!A2:O', // Datos del documento
        'DOCUMENTOS!A2:H',          // Tipos de documentos
        'USUARIOS!A2:M'             // Datos de usuarios
      ]
    });

    const [documentosUsuariosData, documentosData, usuariosData] = documentResponse.data.valueRanges;
    
    // Encontrar el documento específico
    const documentosUsuarios = documentosUsuariosData.values || [];
    const documentoUsuario = documentosUsuarios.find(row => row[0] === documentId);
    
    if (!documentoUsuario) {
      throw new Error(`Documento con ID ${documentId} no encontrado`);
    }

    // Obtener información del tipo de documento
    const documentos = documentosData.values || [];
    const tipoDocumento = documentos.find(row => row[0] === documentoUsuario[1]); // id_doc
    
    // Obtener información del usuario
    const usuarios = usuariosData.values || [];
    const usuario = usuarios.find(row => row[0] === documentoUsuario[2]); // id_usuario

    // Construir respuesta consolidada
    const reviewData = {
      documento: {
        id_usuarioDoc: documentoUsuario[0],
        id_doc: documentoUsuario[1],
        id_usuario: documentoUsuario[2],
        nombre_doc: documentoUsuario[3],
        estado: documentoUsuario[4],
        fecha_expedicion: documentoUsuario[5],
        fecha_vencimiento: documentoUsuario[6],
        fecha_cargue: documentoUsuario[7],
        fecha_revision: documentoUsuario[8],
        comentarios: documentoUsuario[9],
        ruta_archivo: documentoUsuario[10],
        dosis: documentoUsuario[11],
        numero_dosis: documentoUsuario[12],
        revisado_por: documentoUsuario[13],
        fecha_ultima_revision: documentoUsuario[14]
      },
      tipoDocumento: tipoDocumento ? {
        id_doc: tipoDocumento[0],
        nombre_doc: tipoDocumento[1],
        descripcion: tipoDocumento[2],
        dosis: tipoDocumento[3],
        vence: tipoDocumento[4],
        tiempo_vencimiento: tipoDocumento[5],
        obligatorio: tipoDocumento[6],
        activo: tipoDocumento[7]
      } : null,
      usuario: usuario ? {
        id_usuario: usuario[0],
        correo_usuario: usuario[1],
        nombre_usuario: usuario[2],
        apellido_usuario: usuario[3],
        programa_academico: usuario[4],
        sede: usuario[5],
        documento_usuario: usuario[6],
        tipoDoc: usuario[7],
        telefono: usuario[8],
        fecha_nac: usuario[9],
        email: usuario[10],
        rol: usuario[11],
        primer_login: usuario[12]
      } : null,
      estadisticas: {
        totalDocumentos: documentosUsuarios.length,
        documentosPendientes: documentosUsuarios.filter(doc => doc[4] === 'Sin revisar').length,
        documentosAprobados: documentosUsuarios.filter(doc => doc[4] === 'Cumplido').length,
        documentosRechazados: documentosUsuarios.filter(doc => doc[4] === 'Rechazado').length
      }
    };

    console.log(`✅ Datos para revisión del documento ${documentId} obtenidos exitosamente`);
    return reviewData;
  } catch (error) {
    console.error(`❌ Error obteniendo datos para revisión del documento ${documentId}:`, error);
    throw error;
  }
};

/**
 * Manejador principal del endpoint de revisión de documentos
 */
module.exports = async (req, res) => {
  try {
    const { method } = req;
    
    if (method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Método no permitido. Solo se permite GET'
      });
    }

    // Extraer documentId de la URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const documentId = pathParts[pathParts.length - 1];

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del documento'
      });
    }

    console.log(`📋 Solicitud de revisión para documento: ${documentId}`);

    // Obtener datos con cache
    const cacheKey = `document-review-${documentId}`;
    const reviewData = await getWithCache(cacheKey, () => getDocumentReviewData(documentId));

    // Responder con los datos consolidados
    res.status(200).json({
      success: true,
      message: 'Datos para revisión obtenidos exitosamente',
      data: reviewData,
      cache: {
        cached: true,
        duration: '1 minuto'
      }
    });

  } catch (error) {
    console.error('Error en endpoint de revisión de documentos:', error);
    
    // Manejo específico para errores de rate limiting
    if (error.code === 429 || error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'El sistema está experimentando una alta demanda. Inténtalo de nuevo en unos momentos.'
      });
    }
    
    // Manejo para documento no encontrado
    if (error.message?.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        error: 'Documento no encontrado'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos para revisión',
      details: error.message
    });
  }
};

// Exportar función para limpiar cache (útil para testing o mantenimiento)
module.exports.clearCache = clearDocumentReviewCache; 