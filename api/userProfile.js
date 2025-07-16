// api/userProfile.js
const sheetsService = require('../services/sheetsService');
const { llamadaApiConCola } = require('../utils/apiQueue');

// Cache simple en memoria
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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
    const isRateLimit = error.response?.status === 429 || 
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
 * Obtiene datos del usuario usando batchGet para optimizar llamadas a Google Sheets
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} - Datos completos del usuario
 */
const getUserProfileData = async (userId) => {
  try {
    console.log(`🔄 Obteniendo perfil completo del usuario ${userId} usando batchGet...`);
    
    const client = sheetsService.getClient();
    const spreadsheetId = sheetsService.spreadsheetId;
    
    // Definir todos los rangos necesarios para el perfil completo
    const ranges = [
      'USUARIOS!A2:N',           // Datos del usuario
      'ADMINISTRADORES!A2:F',     // Datos de administradores
      'DOCUMENTOS_USUARIOS!A2:M', // Documentos del usuario
      'DOCUMENTOS!A2:E',          // Tipos de documentos (corregido)
      'PROGRAMAS!A2:C'            // Programas académicos
    ];
    
    // Usar batchGet para obtener todos los datos en una sola llamada
    const response = await retryWithBackoff(async () => {
      return await client.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges
      });
    });
    
    console.log(`✅ batchGet completado para usuario ${userId}. Rangos obtenidos: ${response.data.valueRanges.length}`);
    
    // Extraer los datos de cada rango
    const [usuariosData, adminsData, documentosUsuariosData, documentosData, programasData] = response.data.valueRanges;
    
    // Buscar el usuario en la lista de usuarios normales
    const usuariosRows = usuariosData.values || [];
    let userRow = usuariosRows.find(row => row[0] === String(userId));
    let isAdmin = false;
    
    // Debug: Log de las primeras filas para ver la estructura
    console.log(`🔍 Debug - Primeras 3 filas de USUARIOS:`, usuariosRows.slice(0, 3));
    console.log(`🔍 Debug - Buscando usuario ID: ${userId}`);
    
    // Si no se encuentra en usuarios normales, buscar en administradores
    if (!userRow) {
      const adminsRows = adminsData.values || [];
      userRow = adminsRows.find(row => row[0] === String(userId));
      isAdmin = true;
      console.log(`🔍 Debug - Usuario encontrado en ADMINISTRADORES`);
    } else {
      console.log(`🔍 Debug - Usuario encontrado en USUARIOS`);
    }
    
    if (!userRow) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }
    
    console.log(`🔍 Debug - userRow completo:`, userRow);
    
    // Construir objeto del usuario
    const user = isAdmin ? {
      id_usuario: userRow[0] || '',
      correo_usuario: userRow[1] || '',
      nombre_usuario: userRow[2] || '',
      apellido_usuario: userRow[3] || '',
      programa_academico: '',
      sede: '',
      documento_usuario: '',
      tipoDoc: '',
      telefono: '',
      fecha_nac: '',
      email: '',
      rol: 'admin',
      primer_login: 'si'
    } : {
      id_usuario: userRow[0] || '',
      correo_usuario: userRow[1] || '',
      nombre_usuario: userRow[2] || '',
      apellido_usuario: userRow[3] || '',
      programa_academico: userRow[4] || '',
      sede: userRow[5] || '',
      documento_usuario: userRow[6] || '',
      tipoDoc: userRow[7] || '',
      telefono: userRow[8] || '',
      fecha_nac: userRow[9] || '',
      email: userRow[10] || '',
      rol: userRow[11] || userRow[12] || userRow[13] || 'estudiante', // Intentar diferentes posiciones
      primer_login: userRow[12] || userRow[13] || userRow[14] || 'no'
    };
    
    // Debug: Log del rol capturado
    console.log(`🔍 Debug - Usuario ${userId} - Rol capturado: "${user.rol}"`);
    
    // Filtrar documentos del usuario específico
    const documentosUsuariosRows = documentosUsuariosData.values || [];
    const userDocuments = documentosUsuariosRows
      .filter(row => row[1] === String(userId)) // Usar id_persona (columna 1) en lugar de id_usuarioDoc (columna 0)
      .map(row => ({
        id_usuarioDoc: row[0] || '',
        id_persona: row[1] || '',
        id_doc: row[2] || '',
        nombre_doc: row[3] || '',
        dosis: row[4] || '1',
        numero_dosis: row[4] || '1',
        fecha_cargue: row[5] || '',
        fecha_expedicion: row[6] || '',
        fecha_vencimiento: row[7] || '',
        revision: row[8] || '',
        fecha_revision: row[9] || '',
        estado: row[10] || '',
        ruta_archivo: row[11] || '',
        comentario: row[12] || ''
      }));
    
    // Procesar tipos de documentos
    const documentosRows = documentosData.values || [];
    const documentTypes = documentosRows.map(row => ({
      id_doc: row[0] || '',
      nombre_doc: row[1] || '',
      vence: row[2] || 'no',
      tiempo_vencimiento: row[3] || '0',
      dosis: row[4] || '1',
    }));
    
    // Procesar programas académicos
    const programasRows = programasData.values || [];
    const programs = programasRows.map(row => ({
      id_programa: row[0] || '',
      nombre_programa: row[1] || '',
      sede: row[2] || ''
    }));
    
    // Construir respuesta consolidada
    const userProfile = {
      success: true,
      data: {
        user,
        documents: userDocuments,
        documentTypes,
        programs,
        stats: {
          totalDocuments: documentTypes.length,
          uploadedDocuments: userDocuments.length,
          pendingDocuments: userDocuments.filter(doc => !doc.estado || doc.estado === 'Sin revisar').length,
          approvedDocuments: userDocuments.filter(doc => doc.estado === 'Aprobado' || doc.estado === 'Cumplido').length,
          rejectedDocuments: userDocuments.filter(doc => doc.estado === 'Rechazado').length,
          expiredDocuments: userDocuments.filter(doc => doc.estado === 'Vencido' || doc.estado === 'Expirado').length
        }
      }
    };
    
    console.log(`✅ Perfil completo del usuario ${userId} procesado exitosamente`);
    return userProfile;
    
  } catch (error) {
    console.error(`❌ Error obteniendo perfil del usuario ${userId}:`, error);
    throw error;
  }
};

/**
 * Handler principal del endpoint /api/v1/user-profile/:userId
 */
module.exports = async (req, res) => {
  try {
    // Extraer userId de la URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const userId = path.split('/').pop(); // Obtener el último segmento de la URL
    
    console.log(`📥 Solicitud GET /api/v1/user-profile/${userId}`);
    
    // Validar userId
    if (!userId || userId === 'user-profile') {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del usuario'
      });
    }
    
    // Verificar cache
    const cacheKey = `user-profile-${userId}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`💾 Cache hit para usuario ${userId}`);
      return res.status(200).json(cached.data);
    }
    
    console.log(`🔄 Cache miss para usuario ${userId}, obteniendo datos frescos...`);
    
    // Obtener datos frescos
    const userProfile = await getUserProfileData(userId);
    
    // Guardar en cache
    cache.set(cacheKey, {
      data: userProfile,
      timestamp: Date.now()
    });
    
    console.log(`✅ Datos del usuario ${userId} guardados en cache`);
    
    return res.status(200).json(userProfile);
    
  } catch (error) {
    console.error('❌ Error en userProfile endpoint:', error);
    
    // Manejo específico para errores de rate limiting
    if (error.response?.status === 429 || 
        (error.response?.status === 500 && error.message?.includes('Quota exceeded'))) {
      return res.status(429).json({
        success: false,
        error: 'El sistema está experimentando una alta demanda. Inténtalo de nuevo en unos momentos.',
        retryAfter: 30
      });
    }
    
    // Manejo para usuario no encontrado
    if (error.message && error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}; 