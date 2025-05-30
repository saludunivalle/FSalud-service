// filepath: c:\Marcela\MONITORIA\FSalud-service\services\programsService.js
const sheetsServiceInstance = require('./sheetsService'); // Usamos la instancia exportada

/**
 * Obtiene todos los programas académicos y sus sedes de la hoja "PROGRAMAS".
 * Asume que los programas están en la columna A y las sedes en la columna C, comenzando desde A2.
 * @returns {Promise<Array<{value: string, label: string, sede: string}>>} - Lista de programas con sus sedes.
 */
exports.fetchAllPrograms = async () => {
  try {
    const client = sheetsServiceInstance.getClient();
    const spreadsheetId = sheetsServiceInstance.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error('Google Sheets ID no está configurado en el backend.');
    }

    const range = 'PROGRAMAS!A1:C'; // Columnas A y C, incluye la fila de encabezado
    console.log(`[programsService] Fetching programs and sedes from range: ${range}`);

    const response = await client.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });

    const rows = response.data.values || [];
    console.log(`[programsService] Rows fetched: ${rows.length}`);

    // Verificar que el encabezado sea correcto y omitir la primera fila
    if (rows.length === 0) {
      console.log('[programsService] No data found in the sheet');
      return [];
    }

    // Verificar los encabezados (primera fila)
    const headers = rows[0];
    if (headers[0] !== 'Programa Académico' || headers[2] !== 'Sede') {
      console.warn(`[programsService] Expected headers "Programa Académico" and "Sede" but found "${headers[0]}" and "${headers[2]}"`);
    }

    // Procesar las filas de datos (omitir la primera fila que es el encabezado)
    const programs = rows
      .slice(1) // Omitir el encabezado
      .filter(row => row[0] && row[0].trim() !== '') // Filtrar filas sin programa
      .map(row => ({
        value: row[0].trim(),
        label: row[0].trim(),
        sede: row[2] ? row[2].trim() : '' // Sede del programa
      }));
    
    console.log(`[programsService] Programs mapped: ${programs.length}`);
    return programs;

  } catch (error) {
    console.error('[programsService] Error fetching programs from Google Sheet:', error.message);
    if (error.response && error.response.data) {
      console.error('[programsService] Google API Error Details:', JSON.stringify(error.response.data.error, null, 2));
    }
    // Relanzar el error para que el controlador lo maneje
    throw new Error(`Error al obtener programas académicos: ${error.message}`);
  }
};