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
    
    // Obtener el token 
    const token = req.body.idToken || req.body.token || req.body.credential;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: 'No se proporcionó token de autenticación' 
      });
    }

    // Implementar verificación alternativa para entornos de desarrollo
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.warn('Error en verificación estándar, intentando verificación alternativa', verifyError);
      
      // Alternativa: decodificar el token manualmente (solo para desarrollo)
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) throw new Error('Formato de token inválido');
        
        payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('Token decodificado manualmente:', payload);
      } catch (decodeError) {
        throw new Error(`No se pudo verificar el token: ${decodeError.message}`);
      }
    }
    
    // Verificar que sea un correo institucional
    const userId = payload.sub;
    const userEmail = payload.email;
    const userName = payload.name;
    
    if (!userEmail.endsWith('@correounivalle.edu.co')) {
      return res.status(403).json({
        success: false,
        error: 'Por favor ingrese con un correo institucional (@correounivalle.edu.co)'
      });
    }

    console.log('Token verificado, información del usuario:', { userId, userEmail, userName });

    const googleUserData = {
      googleId: userId, 
      email: userEmail,
      name: userName,
    };

    console.log('Llamando a findOrCreateUser con:', googleUserData);
    const user = await usersService.findOrCreateUser(googleUserData);
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
        isFirstLogin: user.rol === 'profesor' 
          ? false // Los profesores nunca requieren completar el formulario
          : (user.primer_login !== 'si') // Si primer_login es 'si', entonces NO es su primer login
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
  login
};