// services/authService.js (mejorado)
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
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
    
    // Verificar que sea un correo institucional
    if (!this.isInstitutionalEmail(payload.email)) {
      throw new Error('Solo se permiten correos institucionales (@correounivalle.edu.co)');
    }
    
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

/**
 * Genera un token JWT para uso interno
 * @param {Object} userData - Datos del usuario para incluir en el token
 * @returns {string} - Token JWT generado
 */
exports.generateJWT = (userData) => {
  return jwt.sign(
    userData,
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn: '24h' }
  );
};

/**
 * Verifica un token JWT
 * @param {string} token - Token JWT a verificar
 * @returns {Object|null} - Datos del usuario o null si es inválido
 */
exports.verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
  } catch (error) {
    console.error('Error verificando JWT:', error);
    return null;
  }
};