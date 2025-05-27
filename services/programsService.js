// filepath: c:\Marcela\MONITORIA\FSalud-service\services\programsService.js
const sheetsServiceInstance = require('./sheetsService'); // Usamos la instancia exportada

/**
 * Obtiene todos los programas académicos de la hoja "PROGRAMAS".
 * Asume que los programas están en la columna A, comenzando desde A2.
 * @returns {Promise<Array<{value: string, label: string}>>} - Lista de programas.
 */
exports.fetchAllPrograms = async () => {
  try {
    const client = sheetsServiceInstance.getClient();
    const spreadsheetId = sheetsServiceInstance.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error('Google Sheets ID no está configurado en el backend.');
    }

    const range = 'PROGRAMAS!A1:A'; // Columna A, incluye la fila de encabezado para verificar que sea "Programa Académico"
    console.log(`[programsService] Fetching programs from range: ${range}`);

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

    // Verificar el encabezado (primera fila)
    const header = rows[0] && rows[0][0];
    if (header !== 'Programa Académico') {
      console.warn(`[programsService] Expected header "Programa Académico" but found "${header}"`);
    }

    // Procesar las filas de datos (omitir la primera fila que es el encabezado)
    const programs = rows
      .slice(1) // Omitir el encabezado
      .map(row => row[0]) // Tomar el primer elemento de cada fila (columna A)
      .filter(programName => programName && programName.trim() !== '') // Filtrar nombres vacíos o solo espacios
      .map(programName => ({
        value: programName.trim(), // Usar el nombre del programa como valor
        label: programName.trim()  // y como etiqueta
      }));
    
    console.log(`[programsService] Programs mapped: ${programs.length}`);
    return programs;

  } catch (error) {
    console.error('[programsService] Error fetching programs from Google Sheet:', error.message);
    if (error.response && error.response.data) {
      console.error('[programsService] Google API Error Details:', JSON.stringify(error.response.data.error, null, 2));
    }
    // Re-lanzar el error para que el controlador lo maneje
    throw new Error(`Error al obtener programas académicos: ${error.message}`);
  }
};