// api/documents.js
const documentosController = require('../controllers/documentsController');
const { verifyJWT, isProfesor, isAdmin } = require('../middleware/auth');

module.exports = async (req, res) => {
  try {
    // Extraer la ruta de la solicitud
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    // Manejar tanto /api/documents como /api/documentos
    let fullEndpoint = '';
    if (path.includes('/api/documents/')) {
      fullEndpoint = path.replace('/api/documents/', '');
    } else if (path.includes('/api/documentos/')) {
      fullEndpoint = path.replace('/api/documentos/', '');
    } else {
      // Si es solo /api/documents o /api/documentos, el endpoint está vacío
      fullEndpoint = '';
    }
    
    // Verificar si hay parámetros en la ruta (formato: endpoint/param)
    const parts = fullEndpoint.split('/');
    const endpoint = parts[0] || ''; // Si está vacío (ruta es solo /api/documents/)
    const param = parts.length > 1 ? parts[1] : null;
    
    // RUTAS GET
    if (req.method === 'GET') {
      // Listar tipos de documentos (GET /api/documents/ o GET /api/documents/tipos)
      if (endpoint === 'tipos' || endpoint === '') {
        return await documentosController.getTiposDocumentos(req, res);
      }
      
      // Listar documentos pendientes (GET /api/documents/pendientes)
      if (endpoint === 'pendientes') {
        // En producción, verificar permisos: verifyJWT, isAdmin
        return await documentosController.getDocumentosPendientes(req, res);
      }
      
      // Obtener estadísticas (GET /api/documents/estadisticas)
      if (endpoint === 'estadisticas') {
        // En producción, verificar permisos: verifyJWT, isAdmin
        return await documentosController.getEstadisticas(req, res);
      }
      
      // Obtener documentos de un usuario (GET /api/documents/user/{user_id})
      if (endpoint === 'user' && param) {
        req.params = { id: param };
        return await documentosController.getDocumentosUsuario(req, res);
      }
      
      // Obtener documentos de un usuario (GET /api/documents/usuario/{user_id}) - mantener compatibilidad
      if (endpoint === 'usuario' && param) {
        req.params = { id: param };
        return await documentosController.getDocumentosUsuario(req, res);
      }
      
      // Obtener información de dosis de un documento (GET /api/documents/dosis/{doc_id})
      if (endpoint === 'dosis' && param) {
        req.params = { id: param };
        return await documentosController.getDocumentDoses(req, res);
      }

      // Obtener datos solo para administradores (GET /api/documents/some-admin-only-data/{param})
      if (endpoint === 'some-admin-only-data' && param) {
        await verifyJWT(req, res, async () => {
          await isProfesor(req, res, async () => {
            // If both pass, req.user is populated and role is correct
            // return await someController.getAdminOnlyData(req, res);
          });
        });
        if (!res.headersSent) {
          // Handle cases where middleware didn't send response but should have stopped
        }
        return; // Ensure function exits if response sent by middleware
      }
    }
    
    // RUTAS POST
    if (req.method === 'POST') {
      // Subir documento (POST /api/documents/subir)
      if (endpoint === 'subir') {
        // Aplicar middleware de autenticación JWT
        const { verifyJWT } = require('../middleware/auth');
        return await verifyJWT(req, res, async () => {
          return await documentosController.subirDocumento(req, res);
        });
      }
      
      // Actualizar estados de documentos vencidos (POST /api/documents/actualizar-vencidos)
      if (endpoint === 'actualizar-vencidos') {
        return await documentosController.actualizarEstadosVencidos(req, res);
      }
    }
    
    // RUTAS PUT
    if (req.method === 'PUT') {
      // Revisar documento (PUT /api/documents/revisar/{doc_id})
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
      path: path,
      fullEndpoint: fullEndpoint,
      endpoint: endpoint,
      param: param
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