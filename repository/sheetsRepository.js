const { google } = require('googleapis');

// Configuración para autenticación de servicio
let auth = null;

const initAuth = async () => {
  // En producción usarías una cuenta de servicio:
  auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    // En desarrollo puedes usar keyFile, en producción variables de entorno
    // keyFile: './credentials.json',
  });
  
  return auth;
};

const getSheets = async () => {
  if (!auth) await initAuth();
  return google.sheets({ version: 'v4', auth });
};

exports.getUsers = async () => {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'USUARIOS!A2:L',
    });
    
    const rows = response.data.values || [];
    return rows.map(row => ({
      id_usuario: row[0],
      correo_usuario: row[1],
      nombre_usuario: row[2],
      apellido_usuario: row[3],
      // Mapear el resto de campos
    }));
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    throw error;
  }
};

// Implementar funciones para otras entidades