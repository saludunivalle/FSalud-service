// config/google.js
const { google } = require('googleapis');
require('dotenv').config();

// Cliente OAuth2 para autenticación de usuarios
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI || undefined
);

// Ámbitos de permisos requeridos
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets', 
  'https://www.googleapis.com/auth/drive'
];

// Cliente JWT para autenticación de servicio
let jwtClient = null;

// Función para inicializar la autenticación de servicio
const initServiceAuth = () => {
  // Intentar inicializar usando GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      jwtClient = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        SCOPES
      );
      console.log('Servicio configurado usando credenciales JSON');
      return jwtClient;
    } catch (error) {
      console.error('Error al configurar JWT con credenciales JSON:', error);
    }
  }
  
  // Fallback a email y clave privada individuales
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      jwtClient = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        SCOPES
      );
      console.log('Servicio configurado usando EMAIL y PRIVATE_KEY');
      return jwtClient;
    } catch (error) {
      console.error('Error al configurar JWT con EMAIL y PRIVATE_KEY:', error);
    }
  }
  
  console.error('⚠️ ERROR: No se pudieron configurar las credenciales de servicio');
  return null;
};

// Inicializar el cliente JWT
jwtClient = initServiceAuth();

// Verificar la conexión si existe un cliente
if (jwtClient) {
  jwtClient.authorize((err, tokens) => {
    if (err) {
      console.error('Error al autorizar JWT:', err);
      return;
    }
    console.log('✅ Conexión exitosa usando JWT!');
  });
}

// Función para obtener cliente de Drive con OAuth delegation
const getDriveClientWithOAuth = (userEmail) => {
  if (!userEmail) {
    console.error('No se proporcionó email de usuario para OAuth delegation');
    return null;
  }

  try {
    // Crear cliente JWT con delegation
    const delegatedJWT = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      SCOPES,
      userEmail // Delegar a este usuario
    );

    return google.drive({ version: 'v3', auth: delegatedJWT });
  } catch (error) {
    console.error('Error al crear cliente de Drive con OAuth delegation:', error);
    return null;
  }
};

module.exports = {
  oAuth2Client,
  jwtClient,
  getDriveClientWithOAuth
};