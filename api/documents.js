// api/documents.js
const documentosController = require('../controllers/documentosController');
const { verifyJWT, isAdmin } = require('../middleware/auth');

module.exports = async (req, res) => {
  try {
    // Extraer la ruta de la solicitud
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const fullEndpoint = path.replace('/api/documentos/', '');
    
    // Verificar si hay parámetros en la ruta (formato: endpoint/param)
    const parts = fullEndpoint.split('/');
    const endpoint = parts[0] || ''; // Si está vacío (ruta es solo /api/documentos/)
    const param = parts.length > 1 ? parts[1] : null;
    
    // RUTAS GET
    if (req.method === 'GET') {
      // Listar tipos de documentos (GET /api/documentos/tipos)
      if (endpoint === 'tipos' || endpoint === '') {
        return await documentosController.getTiposDocumentos(req, res);
      }
      
      // Listar documentos pendientes (GET /api/documentos/pendientes)
      if (endpoint === 'pendientes') {
        // En producción, verificar permisos: verifyJWT, isAdmin
        return await documentosController.getDocumentosPendientes(req, res);
      }
      
      // Obtener estadísticas (GET /api/documentos/estadisticas)
      if (endpoint === 'estadisticas') {
        // En producción, verificar permisos: verifyJWT, isAdmin
        return await documentosController.getEstadisticas(req, res);
      }
      
      // Obtener documentos de un usuario (GET /api/documentos/usuario/{user_id})
      if (endpoint === 'usuario' && param) {
        req.params = { id: param };
        return await documentosController.getDocumentosUsuario(req, res);
      }
    }
    
    // RUTAS POST
    if (req.method === 'POST') {
      // Subir documento (POST /api/documentos/subir)
      if (endpoint === 'subir') {
        return await documentosController.subirDocumento(req, res);
      }
      
      // Actualizar estados de documentos vencidos (POST /api/documentos/actualizar-vencidos)
      if (endpoint === 'actualizar-vencidos') {
        return await documentosController.actualizarEstadosVencidos(req, res);
      }
    }
    
    // RUTAS PUT
    if (req.method === 'PUT') {
      // Revisar documento (PUT /api/documentos/revisar/{doc_id})
      if (endpoint === 'revisar' && param) {
        // En producción, verificar permisos: verifyJWT, isAdmin
        req.params = { id: param };
        return await documentosController.revisarDocumento(req, res);
      }
    }
    
    // Si no se encuentra ninguna ruta válida
    return res.status(404).json({ 
      success: false,
      error: 'Ruta de documentos no encontrada',
      path: path
    });
    
  } catch (error) {
    console.error('Error en API de documentos:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error en servicio de documentos',
      details: error.message 
    });
  }
};