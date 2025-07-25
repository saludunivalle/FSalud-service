// repository/sheetsRepository.js
const { google } = require('googleapis');
require('dotenv').config();
const { llamadaApiConCola } = require('../utils/apiQueue');

// Configuración para autenticación de servicio
let auth = null;


const initAuth = async () => {
  try {
    // Utiliza las credenciales de la variable de entorno si están disponibles
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        credentials: credentials
      });
    } else {
      // Fallback a la autenticación estándar (para desarrollo local)
      auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      });
    }
    
    return auth;
  } catch (error) {
    console.error('Error inicializando autenticación:', error);
    throw error;
  }
};

const getSheets = async () => {
  if (!auth) await initAuth();
  return google.sheets({ version: 'v4', auth });
};

/**
 * Obtiene todos los usuarios de la hoja de cálculo
 * @returns {Array} - Lista de usuarios
 */
exports.getUsers = async () => {
  try {
    const sheets = await getSheets();
    const response = await llamadaApiConCola(
      (params) => sheets.spreadsheets.values.get(params),
      {
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: 'USUARIOS!A2:M',
      }
    );
    
    const rows = response.data.values || [];
    return rows.map(row => ({
      id_usuario: row[0] || '',
      correo_usuario: row[1] || '',
      nombre_usuario: row[2] || '',
      apellido_usuario: row[3] || '',
      programa_academico: row[4] || '',
      sede: row[5] || '',
      documento_usuario: row[6] || '',
      tipoDoc: row[7] || '',
      telefono: row[8] || '',
      fecha_nac: row[9] || '',
      email: row[10] || '',
      rol: row[11] || 'estudiante',
      primer_login: row[12] || 'no'
    }));
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    throw error;
  }
};

/**
 * Añade un nuevo usuario a la hoja de cálculo
 * @param {Object} user - Datos del usuario a añadir
 * @returns {Object} - Usuario añadido
 */
exports.addUser = async (user) => {
  try {
    const sheets = await getSheets();
    
    // Preparar los datos para insertar
    const values = [
      [
        user.id_usuario,
        user.correo_usuario,
        user.nombre_usuario,
        user.apellido_usuario,
        user.programa_academico || '',
        user.sede || '',
        user.documento_usuario || '',
        user.tipoDoc || '',
        user.telefono || '',
        user.fecha_nac || '',
        user.email || '',
        user.rol || 'estudiante',
        user.primer_login || 'no'
      ]
    ];
    
    // Insertar en la hoja de cálculo
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'USUARIOS!A2:M',
      valueInputOption: 'RAW',
      resource: { values }
    });
    
    return user;
  } catch (error) {
    console.error('Error añadiendo usuario:', error);
    throw error;
  }
};