// controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
const usersService = require('../services/usersService'); 
const jwt = require('jsonwebtoken'); 

// Crear el cliente OAuth2
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Autentica al usuario mediante Google OAuth2
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const googleAuth = async (req, res) => {
  try {
    console.log('Procesando solicitud de autenticación Google');
    
    const token = req.body.idToken || req.body.token || req.body.credential;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: 'No se proporcionó token de autenticación' 
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const userId = payload['sub']; 
    const userEmail = payload['email'];
    const userName = payload['name'];
    
    console.log('Token verificado, información del usuario:', { userId, userEmail, userName });

    if (!userEmail.endsWith('@correounivalle.edu.co')) {
      return res.status(403).json({
        success: false,
        error: 'Por favor ingrese con un correo institucional (@correounivalle.edu.co)'
      });
    }

    const googleUserData = {
      googleId: userId, 
      email: userEmail,
      name: userName,
    };

    console.log('Llamando a findOrCreateUser con:', googleUserData);
    const user = await usersService.findOrCreateUser(googleUserData); // user is defined HERE
    console.log('Usuario procesado por el servicio:', user);

    if (!user || !user.id_usuario) {
       console.error('Error: El servicio findOrCreateUser no devolvió un usuario válido.');
       return res.status(500).json({
           success: false,
           error: 'No se pudo obtener la información completa del usuario desde el servicio.'
       });
    }

    const jwtToken = jwt.sign(
      { 
        id: user.id_usuario, 
        email: user.correo_usuario,
        name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
        role: user.rol || 'estudiante'
      },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );
      
    res.status(200).json({
      success: true,
      user: {
        id: user.id_usuario,
        email: user.correo_usuario,
        name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
        role: user.rol || 'estudiante',
        // If user.rol is 'profesor', isFirstLogin is false.
        // Otherwise, it's based on the primer_login field.
        isFirstLogin: user.rol === 'profesor' ? false : (user.primer_login === 'si') 
      },
      token: jwtToken
    });

  } catch (error) {
    console.error('Error al autenticar con Google:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al autenticar con Google',
      details: error.message 
    });
  }
};

// Agregando la función login que se usa en el endpoint api/auth/login.js
const login = async (req, res) => {
  return googleAuth(req, res);
};

module.exports = {
  googleAuth,
  login // Assuming login just calls googleAuth
};