// config/google.js
const { google } = require('googleapis');
require('dotenv').config();

// Configuración para autenticación de servicio (para acceder a Sheets/Drive)
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  },
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
  ]
});

// Cliente OAuth2 para verificar tokens de usuarios
const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID
);

// Exportar los clientes de autenticación
module.exports = {
  auth,
  oAuth2Client,
  getSheetsClient: async () => {
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
  },
  getDriveClient: async () => {
    const authClient = await auth.getClient();
    return google.drive({ version: 'v3', auth: authClient });
  }
};