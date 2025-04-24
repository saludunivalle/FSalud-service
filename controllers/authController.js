// controllers/authController.js
const { v4: uuidv4 } = require('uuid');
const { oAuth2Client } = require('../config/google');
const sheetsService = require('../services/sheetsService');

/**
 * Autentica al usuario mediante Google OAuth2
 */
const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'Token requerido' });
    }
    
    // Verificar el token de Google
    const ticket = await oAuth2Client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const email = payload.email;
    
    // Verificar si es correo institucional
    if (!email.endsWith('@correounivalle.edu.co')) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Por favor, utiliza un correo institucional (@correounivalle.edu.co)' 
      });
    }
    
    // Buscar si el usuario ya existe
    let user = await sheetsService.findUserByEmail(email);
    
    // Si no existe, crear nuevo usuario
    if (!user) {
      // Extraer nombre y apellido del nombre completo
      const nameParts = payload.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      user = {
        id_usuario: uuidv4(), // Generar UUID único
        correo_usuario: email,
        nombre_usuario: firstName,
        apellido_usuario: lastName,
        rol: 'estudiante' // Rol por defecto
      };
      
      await sheetsService.addUser(user);
    }
    
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

module.exports = {
  googleAuth
};