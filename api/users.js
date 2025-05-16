// api/users.js
const someController = require('../controllers/usersController'); // Correctly imported as someController
const { verifyJWT, isAdmin, verifyFirebaseToken, isEstudiante } = require('../middleware/auth');

module.exports = async (req, res) => {
  try {
    // Extraer la ruta de la solicitud
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const fullEndpoint = path.replace('/api/users/', ''); // e.g., "USER_ID/first-login" or "save" or "id/USER_ID"
    
    const parts = fullEndpoint.split('/');
    const routePart1 = parts[0]; // For /:userId/first-login, this is userId. For /save, this is "save". For /id/:userId, this is "id".
    const routePart2 = parts.length > 1 ? parts[1] : null; // For /:userId/first-login, this is "first-login". For /id/:userId, this is userId.

    // Ruta pública para verificar token (POST /api/users/verify-token)
    if (routePart1 === 'verify-token' && req.method === 'POST') {
      return await someController.verifyFirebaseToken(req, res);
    }

    // Aplicar middleware de autenticación para todas las demás rutas
    await new Promise((resolve) => {
      verifyFirebaseToken(req, res, () => resolve());
    });

    // Actualizar primer inicio de sesión (POST /api/users/:userId/first-login)
    // routePart1 will be the userId, routePart2 will be "first-login"
    if (routePart2 === 'first-login' && routePart1 && req.method === 'POST') {
      req.params = { id: routePart1 }; // routePart1 is the userId
      return await someController.updateFirstLogin(req, res); // Use someController
    } 
    
    // Guardar usuario (POST /api/users/save)
    // routePart1 will be "save", routePart2 will be null
    if (routePart1 === 'save' && !routePart2 && req.method === 'POST') {
      return await someController.saveUser(req, res); // Use someController
    }
    
    // Obtener usuario por ID (GET /api/users/id/:userId)
    // routePart1 will be "id", routePart2 will be the userId
    if (routePart1 === 'id' && routePart2 && req.method === 'GET') {
      req.params = { id: routePart2 }; // routePart2 is the userId
      return await someController.getUserById(req, res); // Use someController
    }
    
    // Si no se encuentra ninguna ruta válida
    return res.status(404).json({ 
      success: false,
      error: 'Ruta de usuarios no encontrada',
      path: path // Return the original path for debugging
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