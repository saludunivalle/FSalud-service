// config/google.js
const { google } = require('googleapis');
require('dotenv').config();

// Cliente OAuth2 para autenticación de usuarios
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI || undefined
);

// Verificar que tenemos las variables de entorno necesarias
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
  console.warn('⚠️ Advertencia: Variables de entorno para Google Service Account no configuradas correctamente');
}

// Ámbitos de permisos requeridos
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets', 
  'https://www.googleapis.com/auth/drive'
];

// Cliente JWT para autenticación de servicio
let jwtClient = null;

// Solo crear el jwtClient si tenemos las credenciales necesarias
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  try {
    jwtClient = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      SCOPES
    );
    
    // Iniciar la autenticación de servicio
    jwtClient.authorize((err, tokens) => {
      if (err) {
        console.error('Error al autorizar JWT:', err);
        return;
      }
      console.log('Conexión exitosa usando JWT!');
    });
  } catch (error) {
    console.error('Error al configurar JWT client:', error);
  }
}

module.exports = {
  oAuth2Client,
  jwtClient,
  getAccessToken: async (code) => {
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      console.error('Error al obtener token de acceso:', error);
      throw error;
    }
  }
};