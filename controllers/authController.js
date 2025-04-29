// controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
// *** Cambiar sheetsService por usersService y jwt ***
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
    const userId = payload['sub']; // ID de Google
    const userEmail = payload['email'];
    const userName = payload['name'];
    const userPicture = payload['picture']; // Podríamos usarlo si tuviéramos un campo
    
    console.log('Token verificado, información del usuario:', { userId, userEmail });

    if (!userEmail.endsWith('@correounivalle.edu.co')) {
      return res.status(403).json({
        success: false,
        error: 'Por favor ingrese con un correo institucional (@correounivalle.edu.co)'
      });
    }

    // *** Usar usersService para buscar o crear el usuario ***
    try {
      const googleUserData = {
        googleId: userId, // Pasar el ID de Google
        email: userEmail,
        name: userName,
        // picture: userPicture // Si tuvieras un campo para la foto
      };

      console.log('Llamando a findOrCreateUser con:', googleUserData);
      const user = await usersService.findOrCreateUser(googleUserData);
      console.log('Usuario procesado por el servicio:', user);

      if (!user || !user.id_usuario) {
         console.error('Error: El servicio findOrCreateUser no devolvió un usuario válido.');
         throw new Error('No se pudo obtener la información del usuario del servicio.');
      }

      // Generar token JWT para uso interno
      const jwtToken = jwt.sign(
        { 
          id: user.id_usuario, // Usar el ID de nuestra base de datos
          email: user.correo_usuario,
          name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
          role: user.rol || 'estudiante' // Asegurar que el rol esté presente
        },
        process.env.JWT_SECRET || 'secret_key', // Usa una variable de entorno segura
        { expiresIn: '24h' }
      );
      
      // Responder con éxito
      res.status(200).json({
        success: true,
        user: {
          id: user.id_usuario,
          email: user.correo_usuario,
          name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
          role: user.rol || 'estudiante'
        },
        token: jwtToken // Enviar el token JWT al cliente
      });

    } catch (dbError) {
      console.error('Error al procesar usuario con usersService:', dbError);
      // Devolver un error 500 si falla la interacción con el servicio/repositorio
      res.status(500).json({
        success: false,
        error: 'Error al procesar la información del usuario',
        details: dbError.message
      });
    }
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
  // Podrías añadir verifyToken y logout aquí si los implementas
};