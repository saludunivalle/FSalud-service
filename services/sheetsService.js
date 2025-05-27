// services/sheetsService.js
const { google } = require('googleapis');
const { jwtClient } = require('../config/google');

/**
 * Servicio para manejar operaciones con Google Sheets
 */
class SheetsService {
  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  }
  
  /**
   * Obtiene el cliente autenticado de Google Sheets
   * @returns {Object} Cliente de Google Sheets
   */
  getClient() {
    try {
      return google.sheets({ version: 'v4', auth: jwtClient });
    } catch (error) {
      console.error('Error al obtener cliente de Sheets:', error);
      throw error;
    }
  }
  
  /**
   * Busca un usuario por su correo electrónico
   * @param {string} email - Correo electrónico del usuario
   * @returns {Promise<Object|null>} - Datos del usuario o null si no existe
   */
  async findUserByEmail(email) {
    try {
      console.log(`Finding user by email: ${email}`);
      const client = this.getClient();
      const response = await client.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'USUARIOS!A2:N', // Get all columns including primer_login
      });

      const rows = response.data.values || [];
      const userRow = rows.find(row => row[1] === email); // Email is in column B
      
      if (!userRow) return null;

      // Map the full row to user object
      const HEADERS = [ 
        'id_usuario', 'correo_usuario', 'nombre_usuario', 'apellido_usuario',
        'programa_academico', 'documento_usuario', 'tipoDoc', 'telefono', 
        'observaciones', 'fecha_nac', 'email', 'rol', 'admin', 'primer_login'
      ];
      
      const user = {};
      HEADERS.forEach((header, index) => {
        user[header] = userRow[index] || (header === 'primer_login' ? 'no' : '');
      });
      
      // Si el correo del usuario está en la columna admin, asignar rol admin
      if (user.admin && user.admin.trim() === user.correo_usuario) {
        user.rol = 'admin';
      }
      
      console.log(`User found by email ${email}:`, user);
      return user;
    } catch (error) {
      console.error(`Error finding user by email ${email}:`, error);
      return null;
    }
  }
  
  /**
   * Guarda un usuario en la hoja de cálculo si no existe
   * @param {string} userId - ID de usuario
   * @param {string} email - Correo electrónico
   * @param {string} name - Nombre completo
   * @returns {Promise<boolean>} - true si se guardó, false si ya existía
   */
  async saveUserIfNotExists(userId, email, name) {
    try {
      const client = this.getClient();
      
      // Verificar si el usuario ya existe
      const userCheckRange = 'USUARIOS!A2:A';
      const userCheckResponse = await client.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: userCheckRange,
      });

      const existingUsers = userCheckResponse.data.values 
        ? userCheckResponse.data.values.map(row => row[0]) 
        : [];
      
      // Si el usuario no existe, guardar
      if (!existingUsers.includes(userId)) {
        const userRange = 'USUARIOS!A2:L2';
        
        // Preparar los datos del usuario con todos los campos
        // (asumiendo que la hoja tiene 12 columnas A-L como se definió en las estructuras)
        const userData = [
          userId,              // id_usuario
          email,               // correo_usuario
          name.split(' ')[0],  // nombre_usuario (primer nombre)
          name.split(' ').slice(1).join(' '), // apellido_usuario (resto del nombre)
          '',                  // documento_usuario
          '',                  // tipoDoc
          '',                  // telefono
          '',                  // direccion
          '',                  // observaciones
          '',                  // fecha_nac
          '',                  // email (alternativo)
          'estudiante'         // rol
        ];

        await client.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: userRange,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: [userData] }
        });
        
        console.log(`Usuario ${userId} (${email}) guardado correctamente.`);
        return true;
      }
      
      console.log(`Usuario ${userId} (${email}) ya existe.`);
      return false;
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      throw error;
    }
  }
}

// Exportar una instancia del servicio
const sheetsService = new SheetsService();
module.exports = sheetsService;