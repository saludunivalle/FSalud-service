// api/adminDashboard.js
const sheetsService = require('../services/sheetsService');
const { llamadaApiConCola } = require('../utils/apiQueue');

// Cache simple en memoria
const cache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

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
 * Obtiene datos del dashboard de admin usando batchGet para optimizar llamadas a Google Sheets
 * @returns {Promise<Object>} - Datos completos del dashboard de admin
 */
const getAdminDashboardData = async () => {
  try {
    console.log(`🔄 Obteniendo datos del dashboard de admin usando batchGet...`);
    
    const client = sheetsService.getClient();
    const spreadsheetId = sheetsService.spreadsheetId;
    
    // Definir todos los rangos necesarios para el dashboard de admin
    const ranges = [
      'USUARIOS!A2:N',           // Todos los usuarios
      'ADMINISTRADORES!A2:F',     // Administradores
      'DOCUMENTOS_USUARIOS!A2:M', // Todos los documentos de usuarios
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
    
    console.log(`✅ batchGet completado para dashboard admin. Rangos obtenidos: ${response.data.valueRanges.length}`);
    
    // Extraer los datos de cada rango
    const [usuariosData, adminsData, documentosUsuariosData, documentosData, programasData] = response.data.valueRanges;
    
    // Procesar usuarios
    const usuariosRows = usuariosData.values || [];
    const users = usuariosRows.map(row => ({
      id_usuario: row[0] || '',
      correo_usuario: row[1] || '',
      nombre_usuario: row[2] || '',
      apellido_usuario: row[3] || '',
      programa_academico: row[4] || '',
      sede: row[5] || '',
      documento_usuario: row[6] || '',
      tipoDoc: row[7] || '',
      telefono: row[8] || '',
      fecha_nac: row[9] || '',
      email: row[10] || '',
      rol: row[11] || 'estudiante',
      primer_login: row[12] || 'no'
    }));
    
    // Procesar administradores
    const adminsRows = adminsData.values || [];
    const admins = adminsRows.map(row => ({
      id_usuario: row[0] || '',
      correo_usuario: row[1] || '',
      nombre_usuario: row[2] || '',
      apellido_usuario: row[3] || '',
      programa_academico: '',
      sede: '',
      documento_usuario: '',
      tipoDoc: '',
      telefono: '',
      fecha_nac: '',
      email: '',
      rol: 'admin',
      primer_login: 'si'
    }));
    
    // Combinar usuarios y administradores
    const allUsers = [...users, ...admins];
    
    // Procesar documentos de usuarios
    const documentosUsuariosRows = documentosUsuariosData.values || [];
    const userDocuments = documentosUsuariosRows.map(row => ({
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
      descripcion: row[2] || '',
      dosis: row[3] || '1',
      vence: row[4] || 'no',
      tiempo_vencimiento: row[5] || '0',
      obligatorio: row[6] || 'si'
    }));
    
    // Procesar programas académicos
    const programasRows = programasData.values || [];
    const programs = programasRows.map(row => ({
      id_programa: row[0] || '',
      nombre_programa: row[1] || '',
      sede: row[2] || ''
    }));
    
    // Calcular estadísticas generales
    const totalUsers = allUsers.length;
    const totalStudents = users.length;
    const totalAdmins = admins.length;
    const totalDocuments = userDocuments.length;
    const pendingDocuments = userDocuments.filter(doc => !doc.estado || doc.estado === 'Sin revisar').length;
    const approvedDocuments = userDocuments.filter(doc => doc.estado === 'Aprobado' || doc.estado === 'Cumplido').length;
    const rejectedDocuments = userDocuments.filter(doc => doc.estado === 'Rechazado').length;
    const expiredDocuments = userDocuments.filter(doc => doc.estado === 'Vencido' || doc.estado === 'Expirado').length;
    
    // Calcular estadísticas por programa
    const statsByProgram = {};
    users.forEach(user => {
      const programa = user.programa_academico || 'Sin programa';
      if (!statsByProgram[programa]) {
        statsByProgram[programa] = {
          totalStudents: 0,
          totalDocuments: 0,
          pendingDocuments: 0,
          approvedDocuments: 0,
          rejectedDocuments: 0,
          expiredDocuments: 0
        };
      }
      statsByProgram[programa].totalStudents++;
      
      // Contar documentos de este usuario
      const userDocs = userDocuments.filter(doc => doc.id_persona === user.id_usuario);
      statsByProgram[programa].totalDocuments += userDocs.length;
      statsByProgram[programa].pendingDocuments += userDocs.filter(doc => !doc.estado || doc.estado === 'Sin revisar').length;
      statsByProgram[programa].approvedDocuments += userDocs.filter(doc => doc.estado === 'Aprobado' || doc.estado === 'Cumplido').length;
      statsByProgram[programa].rejectedDocuments += userDocs.filter(doc => doc.estado === 'Rechazado').length;
      statsByProgram[programa].expiredDocuments += userDocs.filter(doc => doc.estado === 'Vencido' || doc.estado === 'Expirado').length;
    });
    
    // Obtener documentos pendientes de revisión (para la tabla de pendientes)
    const pendingDocumentsList = userDocuments
      .filter(doc => !doc.estado || doc.estado === 'Sin revisar')
      .map(doc => {
        const user = allUsers.find(u => u.id_usuario === doc.id_persona);
        const documentType = documentTypes.find(dt => dt.id_doc === doc.id_doc);
        return {
          ...doc,
          user: user ? {
            id_usuario: user.id_usuario,
            nombre_usuario: user.nombre_usuario,
            apellido_usuario: user.apellido_usuario,
            correo_usuario: user.correo_usuario,
            programa_academico: user.programa_academico,
            sede: user.sede
          } : null,
          documentType: documentType ? {
            id_doc: documentType.id_doc,
            nombre_doc: documentType.nombre_doc,
            descripcion: documentType.descripcion,
            vence: documentType.vence,
            tiempo_vencimiento: documentType.tiempo_vencimiento
          } : null
        };
      })
      .sort((a, b) => new Date(b.fecha_cargue) - new Date(a.fecha_cargue)); // Ordenar por fecha de carga más reciente
    
    // Construir respuesta consolidada
    const adminDashboard = {
      success: true,
      data: {
        users: allUsers,
        userDocuments,
        documentTypes,
        programs,
        pendingDocumentsList,
        stats: {
          totalUsers,
          totalStudents,
          totalAdmins,
          totalDocuments,
          pendingDocuments,
          approvedDocuments,
          rejectedDocuments,
          expiredDocuments
        },
        statsByProgram
      }
    };
    
    console.log(`✅ Dashboard de admin procesado exitosamente`);
    return adminDashboard;
    
  } catch (error) {
    console.error(`❌ Error obteniendo dashboard de admin:`, error);
    throw error;
  }
};

/**
 * Handler principal del endpoint /api/v1/admin-dashboard
 */
module.exports = async (req, res) => {
  try {
    console.log(`📥 Solicitud GET /api/v1/admin-dashboard`);
    
    // Verificar cache
    const cacheKey = 'admin-dashboard';
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`💾 Cache hit para dashboard admin`);
      return res.status(200).json(cached.data);
    }
    
    console.log(`🔄 Cache miss para dashboard admin, obteniendo datos frescos...`);
    
    // Obtener datos frescos
    const adminDashboard = await getAdminDashboardData();
    
    // Guardar en cache
    cache.set(cacheKey, {
      data: adminDashboard,
      timestamp: Date.now()
    });
    
    console.log(`✅ Datos del dashboard admin guardados en cache`);
    
    return res.status(200).json(adminDashboard);
    
  } catch (error) {
    console.error('❌ Error en adminDashboard endpoint:', error);
    
    // Manejo específico para errores de rate limiting
    if (error.response?.status === 429 || 
        (error.response?.status === 500 && error.message?.includes('Quota exceeded'))) {
      return res.status(429).json({
        success: false,
        error: 'El sistema está experimentando una alta demanda. Inténtalo de nuevo en unos momentos.',
        retryAfter: 30
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener datos del dashboard de admin'
    });
  }
}; 