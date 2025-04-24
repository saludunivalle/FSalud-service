// services/authService.js
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

// Cliente OAuth2 para verificar tokens
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifica un token de Google y devuelve información del usuario
 * @param {string} token - Token ID de Google
 * @returns {Object} - Datos del usuario verificado
 */
exports.verifyGoogleToken = async (token) => {
  try {
    // Verificar el token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    // Obtener la información del payload
    const payload = ticket.getPayload();
    
    // Devolver solo los datos necesarios
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      verified: payload.email_verified,
    };
  } catch (error) {
    console.error('Error verificando token de Google:', error);
    throw new Error('Token de autenticación inválido');
  }
};

/**
 * Verifica si el correo es institucional
 * @param {string} email - Correo a verificar
 * @returns {boolean} - Verdadero si es correo institucional
 */
exports.isInstitutionalEmail = (email) => {
  return email && email.endsWith('@correounivalle.edu.co');
};