// api/documentos/index.js
const documentosController = require('../../controllers/documentosController');
const { verifyJWT, isAdmin } = require('../../middleware/auth');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Extraer la ruta de la solicitud
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace(/^\/api\/documentos\/?/, '');
    
    // Rutas GET
    if (req.method === 'GET') {
      // Ruta para obtener tipos de documentos
      if (path === 'tipos' || path === '/tipos' || path === '') {
        return await documentosController.getTiposDocumentos(req, res);
      }
      
      // Ruta para obtener documentos pendientes (para administradores)
      if (path === 'pendientes' || path === '/pendientes') {
        // En un entorno real, verificaríamos permisos aquí
        // await verifyJWT(req, res);
        // await isAdmin(req, res);
        return await documentosController.getDocumentosPendientes(req, res);
      }
      
      // Ruta para obtener estadísticas (para administradores)
      if (path === 'estadisticas' || path === '/estadisticas') {
        // await verifyJWT(req, res);
        // await isAdmin(req, res);
        return await documentosController.getEstadisticas(req, res);
      }
      
      // Ruta para obtener documentos de un usuario específico
      if (path.startsWith('usuario/') || path.startsWith('/usuario/')) {
        const userId = path.split('/').pop();
        req.params = { id: userId };
        return await documentosController.getDocumentosUsuario(req, res);
      }
    }
    
    // Rutas POST
    if (req.method === 'POST') {
      // Ruta para subir documentos
      if (path === 'subir' || path === '/subir') {
        return await documentosController.subirDocumento(req, res);
      }
      
      // Ruta para actualizar estados de documentos vencidos
      if (path === 'actualizar-vencidos' || path === '/actualizar-vencidos') {
        return await documentosController.actualizarEstadosVencidos(req, res);
      }
    }
    
    // Rutas PUT
    if (req.method === 'PUT') {
      // Ruta para revisar un documento (para administradores)
      if (path.startsWith('revisar/') || path.startsWith('/revisar/')) {
        // await verifyJWT(req, res);
        // await isAdmin(req, res);
        const docId = path.split('/').pop();
        req.params = { id: docId };
        return await documentosController.revisarDocumento(req, res);
      }
    }
    
    // Si no se encuentra ninguna ruta válida
    return res.status(404).json({ 
      success: false,
      error: 'Ruta no encontrada',
      path: path
    });
  } catch (error) {
    console.error('Error en API de documentos:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};