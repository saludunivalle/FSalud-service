// config/google.js
// Fix for OpenSSL issues in Node.js 17+
const nodeCrypto = require('crypto');
if (nodeCrypto.setFips) {
  // Only call if the function exists
  try {
    nodeCrypto.setFips(false);
  } catch (e) {
    console.warn('Failed to set FIPS mode:', e.message);
  }
}

const { google } = require('googleapis');
require('dotenv').config();

// Cliente OAuth2 para autenticación de usuarios
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Ámbitos de permisos requeridos
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets', 
  'https://www.googleapis.com/auth/drive'
];

// Cliente JWT para autenticación de servicio con las credenciales ORIGINALES
let jwtClient = null;

// Usar credenciales originales para Google Sheets y Drive
const initServiceAuth = () => {
  try {
    jwtClient = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      SCOPES
    );
    console.log('Servicio Google configurado para Sheets/Drive');
    return jwtClient;
  } catch (error) {
    console.error('Error al configurar JWT:', error);
    return null;
  }
};

// Inicializar el cliente JWT
try {
  jwtClient = initServiceAuth();
  if (!jwtClient) {
    console.error('Failed to initialize JWT client. Check your Google credentials.');
  } else {
    console.log('JWT client initialized successfully');
  }
} catch (error) {
  console.error('Error initializing JWT client:', error);
}

module.exports = {
  oAuth2Client,
  jwtClient
};