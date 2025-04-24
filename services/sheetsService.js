// services/sheetsService.js
const googleConfig = require('../config/google');

// ID de la hoja de cálculo
const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

/**
 * Obtiene todos los usuarios de la hoja de cálculo
 */
const getUsers = async () => {
  try {
    const sheets = await googleConfig.getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'USUARIOS!A2:L'
    });

    const rows = response.data.values || [];
    return rows.map(row => ({
      id_usuario: row[0] || '',
      correo_usuario: row[1] || '',
      nombre_usuario: row[2] || '',
      apellido_usuario: row[3] || '',
      documento_usuario: row[4] || '',
      tipoDoc: row[5] || '',
      telefono: row[6] || '',
      direccion: row[7] || '',
      observaciones: row[8] || '',
      fecha_nac: row[9] || '',
      email: row[10] || '',
      rol: row[11] || 'estudiante'
    }));
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    throw error;
  }
};

/**
 * Busca un usuario por correo electrónico
 */
const findUserByEmail = async (email) => {
  try {
    const users = await getUsers();
    return users.find(user => user.correo_usuario === email) || null;
  } catch (error) {
    console.error('Error buscando usuario por email:', error);
    throw error;
  }
};

/**
 * Añade un nuevo usuario a la hoja de cálculo
 */
const addUser = async (user) => {
  try {
    const sheets = await googleConfig.getSheetsClient();
    
    // Crear array con todos los campos en el orden correcto
    const values = [
      [
        user.id_usuario,
        user.correo_usuario,
        user.nombre_usuario,
        user.apellido_usuario,
        user.documento_usuario || '',
        user.tipoDoc || '',
        user.telefono || '',
        user.direccion || '',
        user.observaciones || '',
        user.fecha_nac || '',
        user.email || '',
        user.rol || 'estudiante'
      ]
    ];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'USUARIOS!A2:L',
      valueInputOption: 'RAW',
      resource: { values }
    });
    
    return user;
  } catch (error) {
    console.error('Error añadiendo usuario:', error);
    throw error;
  }
};

module.exports = {
  spreadsheetId,
  getUsers,
  findUserByEmail,
  addUser
};