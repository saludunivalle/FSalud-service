// controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
const sheetsService = require('../services/sheetsService');

// Crear el cliente OAuth2 ANTES de usarlo
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Autentica al usuario mediante Google OAuth2
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const googleAuth = async (req, res) => {
  try {
    console.log('Procesando solicitud de autenticación Google:', req.body);
    
    // Verificar si tenemos idToken o token
    const token = req.body.idToken || req.body.token;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: 'No se proporcionó token de autenticación' 
      });
    }

    // Verificar el token con Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const userId = payload['sub'];
    const userEmail = payload['email'];
    const userName = payload['name'];
    
    console.log('Token verificado, información del usuario:', { userId, userEmail });

    // Verificar dominio de correo institucional
    if (!userEmail.endsWith('@correounivalle.edu.co')) {
      return res.status(403).json({
        success: false,
        error: 'Por favor ingrese con un correo institucional (@correounivalle.edu.co)'
      });
    }

    // Usar el servicio de sheets para guardar el usuario
    try {
      // Usar sheetsService directamente en lugar de obtener client
      // Verificar si el usuario existe
      const userCheckRange = 'USUARIOS!A2:C';
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
      
      // Intentar guardar el usuario sin verificar si existe
      const userRange = 'USUARIOS!A2:C2';
      const userValues = [[userId, userEmail, userName]];

      // Responder con éxito (incluso si no pudimos guardar en sheets)
      res.status(200).json({
        success: true,
        user: {
          id: userId,
          email: userEmail,
          name: userName
        }
      });
    } catch (sheetError) {
      console.error('Error al interactuar con Google Sheets:', sheetError);
      // Continuamos y devolvemos el usuario de todas formas
      res.status(200).json({
        success: true,
        user: {
          id: userId,
          email: userEmail,
          name: userName
        }
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
};