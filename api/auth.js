// api/auth.js
const authController = require('../controllers/authController');

module.exports = async (req, res) => {
  try {
    // Extraer la ruta de la solicitud
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const endpoint = path.replace('/api/auth/', '');
    
    // Rutas POST
    if (req.method === 'POST') {
      // Login regular
      if (endpoint === 'login') {
        return await authController.login(req, res);
      }
      
      // Autenticación con Google
      if (endpoint === 'google') {
        return await authController.googleAuth(req, res);
      }
    }
    
    // Si no se encuentra ninguna ruta válida
    return res.status(404).json({ 
      success: false,
      error: 'Ruta de autenticación no encontrada',
      path: path
    });
    
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error en servicio de autenticación',
      details: error.message 
    });
  }
};