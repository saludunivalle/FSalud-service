// api/users.js
const userController = require('../controllers/userController');
const { verifyJWT, isAdmin } = require('../middleware/auth');

module.exports = async (req, res) => {
  try {
    // Extraer la ruta de la solicitud
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const fullEndpoint = path.replace('/api/users/', '');
    
    // Verificar si hay parámetros en la ruta (formato: endpoint/param)
    const parts = fullEndpoint.split('/');
    const endpoint = parts[0];
    const param = parts.length > 1 ? parts[1] : null;
    
    // Guardar usuario (POST /api/users/save)
    if (endpoint === 'save' && req.method === 'POST') {
      return await userController.saveUser(req, res);
    }
    
    // Obtener usuario por ID (GET /api/users/id/{user_id})
    if (endpoint === 'id' && param && req.method === 'GET') {
      req.params = { id: param };
      return await userController.getUserById(req, res);
    }
    
    // Si no se encuentra ninguna ruta válida
    return res.status(404).json({ 
      success: false,
      error: 'Ruta de usuarios no encontrada',
      path: path
    });
    
  } catch (error) {
    console.error('Error en API de usuarios:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error en servicio de usuarios',
      details: error.message 
    });
  }
};