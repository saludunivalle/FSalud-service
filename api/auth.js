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
      // Autenticación con Google - única opción disponible
      if (endpoint === 'google') {
        return await authController.googleAuth(req, res);
      }
    }
    
    // Si no se encuentra ninguna ruta válida
    return res.status(404).json({ 
      success: false,
      error: 'Ruta de autenticación no encontrada. Solo está disponible la autenticación con Google.',
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