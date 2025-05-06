// repository/baseRepository.js
const { google } = require('googleapis');
const { jwtClient } = require('../config/google');
require('dotenv').config();

// Obtener el ID de la hoja de cálculo desde variables de entorno
const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

/**
 * Obtiene el cliente autenticado de Google Sheets
 * @returns {Object} Cliente de Google Sheets
 */
const getClient = () => {
  try {
    if (!jwtClient) {
      throw new Error('No se ha inicializado correctamente el cliente JWT');
    }
    return google.sheets({ version: 'v4', auth: jwtClient });
  } catch (error) {
    console.error('Error al obtener cliente de Sheets:', error);
    throw error;
  }
};

/**
 * Repositorio base para operaciones CRUD en Google Sheets
 * @param {string} sheetName - Nombre de la hoja en Google Sheets
 * @param {Array} headers - Cabeceras/campos de la entidad
 */
class BaseRepository {
  constructor(sheetName, headers) {
    this.sheetName = sheetName;
    this.headers = headers;
    this.range = `${sheetName}!A2:${this.getLastColumn()}`;
    this.headersRange = `${sheetName}!A1:${this.getLastColumn()}1`;
  }

  /**
   * Obtiene la última columna basada en la cantidad de headers
   * @returns {string} - Letra de la última columna
   */
  getLastColumn() {
    const colIndex = this.headers.length - 1;
    // Convertir índice a letra (A=0, B=1, ..., Z=25, AA=26, etc.)
    let lastCol = '';
    let n = colIndex;
    
    do {
      const remainder = n % 26;
      lastCol = String.fromCharCode(65 + remainder) + lastCol;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    
    return lastCol;
  }

  /**
   * Mapea los valores de fila a objeto
   * @param {Array} row - Fila de valores
   * @returns {Object} - Objeto con propiedades mapeadas
   */
  mapRowToObject(row) {
    if (!row) return null;
    const obj = {};
    this.headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  }

  /**
   * Mapea un objeto a valores de fila
   * @param {Object} obj - Objeto con datos
   * @returns {Array} - Array de valores ordenados según headers
   */
  mapObjectToRow(obj) {
    return this.headers.map(header => obj[header] || '');
  }

  /**
   * Obtiene todos los registros
   * @returns {Promise<Array>} - Array de objetos
   */
  async getAll() {
    try {
      const sheets = getClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: this.range,
      });
      
      const rows = response.data.values || [];
      return rows.map(row => this.mapRowToObject(row));
    } catch (error) {
      console.error(`Error obteniendo datos de ${this.sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Busca registros por un campo específico
   * @param {string} field - Campo por el que buscar
   * @param {any} value - Valor a buscar
   * @returns {Promise<Array>} - Array de objetos que coinciden
   */
  async findBy(field, value) {
    try {
      const all = await this.getAll();
      return all.filter(item => item[field] === value);
    } catch (error) {
      console.error(`Error buscando en ${this.sheetName} por ${field}:`, error);
      throw error;
    }
  }

  /**
   * Busca un registro por un campo específico
   * @param {string} field - Campo por el que buscar
   * @param {any} value - Valor a buscar
   * @returns {Promise<Object|null>} - Objeto que coincide o null
   */
  async findOneBy(field, value) {
    try {
      const results = await this.findBy(field, value);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error buscando un registro en ${this.sheetName} por ${field}:`, error);
      throw error;
    }
  }

  /**
   * Crea un nuevo registro
   * @param {Object} data - Datos a insertar
   * @returns {Promise<Object>} - Objeto creado
   */
  async create(data) {
    try {
      console.log(`[BaseRepository.create] Intentando crear registro en hoja: ${this.sheetName}. Datos recibidos:`, JSON.stringify(data, null, 2));
      const sheets = await getClient();
      
      // Asegurar que todos los headers tengan un valor, aunque sea vacío
      const values = [this.headers.map(header => data[header] === undefined ? '' : data[header])];
      console.log(`[BaseRepository.create] Valores preparados para Google Sheets API (hoja ${this.sheetName}):`, JSON.stringify(values, null, 2));

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: `${this.sheetName}!A1`, // Apendiza después de la última fila con datos
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS', // Asegura que se inserte una nueva fila
        resource: { values },
      });

      console.log(`[BaseRepository.create] Respuesta de Google Sheets API (append para ${this.sheetName}):`, JSON.stringify(response.data, null, 2));

      // Validar que response.data.updates.updatedData.values exista y tenga contenido
      if (response.data && response.data.updates && response.data.updates.updatedData && response.data.updates.updatedData.values && response.data.updates.updatedData.values.length > 0) {
        const appendedRow = response.data.updates.updatedData.values[0];
        const result = this.mapRowToObject(appendedRow);
        console.log(`[BaseRepository.create] Registro mapeado después de la creación en ${this.sheetName}:`, JSON.stringify(result, null, 2));
        return result;
      } else {
        console.warn(`[BaseRepository.create] La respuesta de Google Sheets API para append en ${this.sheetName} no contenía los datos esperados. Respuesta completa:`, JSON.stringify(response.data, null, 2));
        // Devolver los datos originales o un objeto indicando el problema, en lugar de fallar si mapRowToObject no puede procesar.
        // Opcionalmente, podrías intentar leer la última fila para confirmar.
        return data; // O manejar de otra forma
      }

    } catch (error) {
      console.error(`[BaseRepository.create] Error creando registro en ${this.sheetName}:`, error.message, error.stack);
      if (error.response && error.response.data && error.response.data.error) {
        console.error('[BaseRepository.create] Google API Error Details:', JSON.stringify(error.response.data.error, null, 2));
      }
      console.error(`[BaseRepository.create] Datos que se intentaban escribir en ${this.sheetName}:`, JSON.stringify(data, null, 2));
      throw new Error(`No se pudo crear el registro en ${this.sheetName}. Detalles: ${error.message}`);
    }
  }

  /**
   * Actualiza un registro existente
   * @param {string} idField - Campo identificador
   * @param {any} idValue - Valor del identificador
   * @param {Object} data - Datos actualizados
   * @returns {Promise<Object|null>} - Objeto actualizado o null si no existe
   */
  async update(idField, idValue, data) {
    try {
      const sheets = getClient();
      const all = await this.getAll();
      
      // Encontrar el índice del registro a actualizar
      const rowIndex = all.findIndex(item => item[idField] === idValue);
      
      if (rowIndex === -1) {
        return null; // No se encontró el registro
      }
      
      // Calcular la fila real en la hoja (índice + 2 porque la fila 1 son los headers)
      const sheetRowIndex = rowIndex + 2;
      
      // Preparar los datos actualizados
      const updatedData = { ...all[rowIndex], ...data };
      const values = [this.mapObjectToRow(updatedData)];
      
      // Actualizar la fila en la hoja
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${this.sheetName}!A${sheetRowIndex}:${this.getLastColumn()}${sheetRowIndex}`,
        valueInputOption: 'RAW',
        resource: { values }
      });
      
      return updatedData;
    } catch (error) {
      console.error(`Error actualizando registro en ${this.sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Elimina un registro
   * @param {string} idField - Campo identificador
   * @param {any} idValue - Valor del identificador
   * @returns {Promise<boolean>} - true si se eliminó, false si no existía
   */
  async delete(idField, idValue) {
    try {
      const sheets = getClient();
      const all = await this.getAll();
      
      // Encontrar el índice del registro a eliminar
      const rowIndex = all.findIndex(item => item[idField] === idValue);
      
      if (rowIndex === -1) {
        return false; // No se encontró el registro
      }
      
      // Calcular la fila real en la hoja
      const sheetRowIndex = rowIndex + 2;
      
      // Solicitar eliminar la fila
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: this.getSheetId(), // Necesitamos obtener el ID interno de la hoja
                  dimension: 'ROWS',
                  startIndex: sheetRowIndex - 1, // 0-indexed
                  endIndex: sheetRowIndex // exclusive
                }
              }
            }
          ]
        }
      });
      
      return true;
    } catch (error) {
      console.error(`Error eliminando registro en ${this.sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el ID interno de la hoja
   * @returns {Promise<number>} - ID interno de la hoja
   */
  async getSheetId() {
    try {
      const sheets = getClient();
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties'
      });
      
      const sheet = response.data.sheets.find(s => 
        s.properties.title === this.sheetName
      );
      
      if (!sheet) {
        throw new Error(`No se encontró la hoja ${this.sheetName}`);
      }
      
      return sheet.properties.sheetId;
    } catch (error) {
      console.error(`Error obteniendo ID de la hoja ${this.sheetName}:`, error);
      throw error;
    }
  }
}

module.exports = {
  BaseRepository,
  getClient,
  spreadsheetId
};