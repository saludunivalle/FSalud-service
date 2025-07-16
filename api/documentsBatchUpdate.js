// api/documentsBatchUpdate.js
const documentsService = require('../services/documentsService');
const sheetsService = require('../services/sheetsService');
const { validateData } = require('../utils/validators');

/**
 * Función para hacer retry con backoff exponencial
 * @param {Function} fn - Función a ejecutar
 * @param {number} retries - Número de reintentos
 * @param {number} delay - Delay inicial en ms
 * @returns {Promise} - Resultado de la función
 */
const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    // Si es un error de rate limiting (429 o 500 con mensaje de quota) y aún tenemos reintentos
    const isRateLimit = error.code === 429 || 
                       error.response?.status === 429 || 
                       error.response?.status === 500 && 
                       (error.response?.data?.message?.includes('Quota exceeded') || 
                        error.message?.includes('Quota exceeded'));
    
    if (isRateLimit && retries > 0) {
      console.log(`Rate limit detectado, esperando ${delay}ms antes de reintentar. Reintentos restantes: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2); // Duplicar el delay
    }
    throw error;
  }
};

/**
 * Valida los datos de actualización de documentos
 * @param {Array} updates - Array de actualizaciones
 * @returns {Object} - Resultado de la validación
 */
const validateBatchUpdates = (updates) => {
  const errors = [];
  const validUpdates = [];

  if (!Array.isArray(updates)) {
    return { valid: false, errors: ['El campo updates debe ser un array'] };
  }

  updates.forEach((update, index) => {
    const updateErrors = [];

    // Validar campos requeridos
    if (!update.id_usuarioDoc) {
      updateErrors.push('id_usuarioDoc es requerido');
    }

    if (!update.estado && update.estado !== '') {
      updateErrors.push('estado es requerido');
    }

    // Validar estado válido
    const estadosValidos = ['Sin revisar', 'Cumplido', 'Rechazado', 'Expirado'];
    if (update.estado && !estadosValidos.includes(update.estado)) {
      updateErrors.push(`estado debe ser uno de: ${estadosValidos.join(', ')}`);
    }

    // Validar comentarios si se proporcionan
    if (update.comentarios && typeof update.comentarios !== 'string') {
      updateErrors.push('comentarios debe ser una cadena de texto');
    }

    // Validar revisado_por si se proporciona
    if (update.revisado_por && typeof update.revisado_por !== 'string') {
      updateErrors.push('revisado_por debe ser una cadena de texto');
    }

    if (updateErrors.length > 0) {
      errors.push(`Actualización ${index + 1}: ${updateErrors.join(', ')}`);
    } else {
      validUpdates.push(update);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    validUpdates
  };
};

/**
 * Actualiza múltiples documentos usando batchUpdate
 * @param {Array} updates - Array de actualizaciones
 * @returns {Promise<Object>} - Resultado de la actualización
 */
const batchUpdateDocuments = async (updates) => {
  try {
    console.log(`🔄 Iniciando actualización masiva de ${updates.length} documentos...`);
    
    const client = sheetsService.getClient();
    
    // Preparar las actualizaciones para Google Sheets
    const batchUpdates = [];
    
    updates.forEach(update => {
      // Encontrar la fila del documento en la hoja DOCUMENTOS_USUARIOS
      // Asumimos que el id_usuarioDoc está en la columna A
      const range = `DOCUMENTOS_USUARIOS!A:A`;
      
      // Buscar la fila que contiene el id_usuarioDoc
      const findRow = async () => {
        const response = await client.spreadsheets.values.get({
          spreadsheetId: sheetsService.spreadsheetId,
          range: range
        });
        
        const rows = response.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === update.id_usuarioDoc);
        
        if (rowIndex === -1) {
          throw new Error(`Documento con ID ${update.id_usuarioDoc} no encontrado`);
        }
        
        return rowIndex + 1; // +1 porque las filas en Google Sheets empiezan en 1
      };
      
      // Preparar los valores a actualizar
      const updateValues = [];
      
      // Mapear los campos a las columnas correspondientes
      // A=id_usuarioDoc, B=id_doc, C=id_usuario, D=nombre_doc, E=estado, F=fecha_expedicion, 
      // G=fecha_vencimiento, H=fecha_cargue, I=fecha_revision, J=comentarios, K=ruta_archivo, 
      // L=dosis, M=numero_dosis, N=revisado_por, O=fecha_ultima_revision
      
      if (update.estado !== undefined) {
        updateValues.push({ range: `DOCUMENTOS_USUARIOS!E${rowIndex}`, values: [[update.estado]] });
      }
      
      if (update.comentarios !== undefined) {
        updateValues.push({ range: `DOCUMENTOS_USUARIOS!J${rowIndex}`, values: [[update.comentarios]] });
      }
      
      if (update.revisado_por !== undefined) {
        updateValues.push({ range: `DOCUMENTOS_USUARIOS!N${rowIndex}`, values: [[update.revisado_por]] });
      }
      
      if (update.fecha_revision !== undefined) {
        updateValues.push({ range: `DOCUMENTOS_USUARIOS!I${rowIndex}`, values: [[update.fecha_revision]] });
      }
      
      if (update.fecha_ultima_revision !== undefined) {
        updateValues.push({ range: `DOCUMENTOS_USUARIOS!O${rowIndex}`, values: [[update.fecha_ultima_revision]] });
      }
      
      batchUpdates.push(...updateValues);
    });
    
    // Ejecutar la actualización masiva
    if (batchUpdates.length > 0) {
      const response = await client.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetsService.spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: batchUpdates
        }
      });
      
      console.log(`✅ Actualización masiva completada. ${response.data.totalUpdatedCells} celdas actualizadas`);
      
      return {
        success: true,
        totalUpdated: response.data.totalUpdatedCells,
        updatedDocuments: updates.length,
        response: response.data
      };
    } else {
      console.log('⚠️ No hay actualizaciones que realizar');
      return {
        success: true,
        totalUpdated: 0,
        updatedDocuments: 0,
        message: 'No hay actualizaciones que realizar'
      };
    }
    
  } catch (error) {
    console.error('❌ Error en actualización masiva de documentos:', error);
    throw error;
  }
};

/**
 * Manejador principal del endpoint de actualización masiva
 */
module.exports = async (req, res) => {
  try {
    const { method } = req;
    
    if (method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Método no permitido. Solo se permite POST'
      });
    }

    // Validar que el cuerpo de la solicitud sea JSON
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'El cuerpo de la solicitud debe ser un objeto JSON válido'
      });
    }

    const { updates } = req.body;

    // Validar los datos de entrada
    const validation = validateBatchUpdates(updates);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Datos de actualización inválidos',
        details: validation.errors
      });
    }

    console.log(`📋 Solicitud de actualización masiva para ${validation.validUpdates.length} documentos`);

    // Ejecutar la actualización masiva con retry
    const result = await retryWithBackoff(() => batchUpdateDocuments(validation.validUpdates));

    // Responder con el resultado
    res.status(200).json({
      success: true,
      message: 'Actualización masiva completada exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error en endpoint de actualización masiva:', error);
    
    // Manejo específico para errores de rate limiting
    if (error.code === 429 || error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'El sistema está experimentando una alta demanda. Inténtalo de nuevo en unos momentos.'
      });
    }
    
    // Manejo para documentos no encontrados
    if (error.message?.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        error: 'Uno o más documentos no fueron encontrados',
        details: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al realizar la actualización masiva',
      details: error.message
    });
  }
}; 