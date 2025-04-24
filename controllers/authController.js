// controllers/authController.js
const authService = require('../services/authService');
const userService = require('../services/userService');

/**
 * Maneja el inicio de sesión con Google
 */
exports.login = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'Token requerido' });
    }
    
    // Verificar el token de Google
    const googleUserData = await authService.verifyGoogleToken(idToken);
    
    // Verificar si es correo institucional
    if (!authService.isInstitutionalEmail(googleUserData.email)) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Por favor, utiliza un correo institucional (@correounivalle.edu.co)' 
      });
    }
    
    // Buscar o crear el usuario en nuestra base de datos
    const user = await userService.findOrCreateUser(googleUserData);
    
    // Responder con los datos del usuario
    return res.status(200).json({
      success: true,
      user: {
        id: user.id_usuario,
        email: user.correo_usuario,
        name: `${user.nombre_usuario} ${user.apellido_usuario}`,
        role: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login controller:', error);
    return res.status(401).json({ error: 'Autenticación fallida' });
  }
};