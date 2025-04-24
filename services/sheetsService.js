// services/sheetsService.js
const { google } = require('googleapis');
const { jwtClient } = require('../config/google');

// Obtener el ID de la hoja de cálculo desde variables de entorno
const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

/**
 * Obtiene el cliente autenticado de Google Sheets
 * @returns {Object} Cliente de Google Sheets
 */
const getClient = () => {
  try {
    return google.sheets({ version: 'v4', auth: jwtClient });
  } catch (error) {
    console.error('Error al obtener cliente de Sheets:', error);
    return null;
  }
};

/**
 * Busca un usuario por su correo electrónico
 * @param {string} email - Correo electrónico del usuario
 * @returns {Object|null} - Datos del usuario o null si no existe
 */
const findUserByEmail = async (email) => {
  try {
    const sheets = getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'USUARIOS!A2:C',
    });

    const rows = response.data.values || [];
    const user = rows.find(row => row[1] === email);
    
    return user ? {
      id_usuario: user[0],
      correo_usuario: user[1],
      nombre_usuario: user[2]
    } : null;
  } catch (error) {
    console.error('Error buscando usuario por email:', error);
    return null;
  }
};

module.exports = {
  spreadsheetId,
  getClient,
  findUserByEmail
};