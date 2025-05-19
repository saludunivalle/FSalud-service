// services/authService.js (mejorado)
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

// Cliente OAuth2 para verificar tokens
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Almacenamiento temporal de códigos de verificación (en producción usar Redis o DB)
const verificationCodes = new Map();

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
 * Verifica si el correo es institucional (utilidad, pero ya no es obligatorio)
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

/**
 * Genera un hash de contraseña
 * @param {string} password - Contraseña en texto plano
 * @returns {string} - Hash de la contraseña
 */
exports.hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

/**
 * Verifica si una contraseña coincide con un hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hashedPassword - Hash almacenado
 * @returns {boolean} - True si la contraseña coincide
 */
exports.verifyPassword = (password, hashedPassword) => {
  const [salt, hash] = hashedPassword.split(':');
  const calculatedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === calculatedHash;
};

/**
 * Genera un código de verificación y lo almacena temporalmente
 * @param {string} email - Correo electrónico del usuario
 * @returns {string} - Código de verificación generado
 */
exports.generateVerificationCode = (email) => {
  // Generar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Almacenar el código con tiempo de expiración (15 minutos)
  verificationCodes.set(email, {
    code,
    expires: Date.now() + (15 * 60 * 1000)
  });
  
  return code;
};

/**
 * Verifica un código de verificación
 * @param {string} email - Correo electrónico del usuario
 * @param {string} code - Código de verificación a verificar
 * @returns {boolean} - True si el código es válido y no ha expirado
 */
exports.verifyCode = (email, code) => {
  const storedData = verificationCodes.get(email);
  
  if (!storedData) {
    return false;
  }
  
  // Verificar expiración
  if (storedData.expires < Date.now()) {
    verificationCodes.delete(email);
    return false;
  }
  
  // Verificar código
  const isValid = storedData.code === code;
  
  // Si es válido, eliminar el código (uso único)
  if (isValid) {
    verificationCodes.delete(email);
  }
  
  return isValid;
};

/**
 * Verifica un token de reCAPTCHA
 * @param {string} token - Token de reCAPTCHA
 * @returns {Promise<boolean>} - True si el token es válido
 */
exports.verifyCaptcha = async (token) => {
  try {
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token
      }
    });
    
    return response.data.success;
  } catch (error) {
    console.error('Error verificando CAPTCHA:', error);
    return false;
  }
};

/**
 * Envía un correo electrónico con código de verificación
 * @param {string} email - Correo electrónico del destinatario
 * @param {string} code - Código de verificación
 * @returns {Promise<boolean>} - True si el correo se envió correctamente
 */
exports.sendVerificationEmail = async (email, code) => {
  try {
    // Aquí deberías integrar con un servicio de correo como Nodemailer, SendGrid, etc.
    // Por ahora, simulamos el envío
    console.log(`Sending verification code ${code} to ${email}`);
    
    // Simular éxito en desarrollo
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};