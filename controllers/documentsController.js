// controllers/documentsController.js
const documentsService = require('../services/documentsService');
const { validateData } = require('../utils/validators');
const { uploadSingleFile } = require('../middleware/upload'); // Ensure this uses memoryStorage

/**
 * Obtiene todos los tipos de documentos
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getTiposDocumentos = async (req, res) => {
  try {
    const tiposDocumentos = await documentsService.getTiposDocumentos();
    
    res.status(200).json({
      success: true,
      data: tiposDocumentos
    });
  } catch (error) {
    console.error('Error al obtener tipos de documentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tipos de documentos',
      details: error.message
    });
  }
};

/**
 * Obtiene documentos de un usuario
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getDocumentosUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del usuario'
      });
    }
    
    const documentos = await documentsService.getDocumentosUsuario(id);
    
    res.status(200).json({
      success: true,
      data: documentos
    });
  } catch (error) {
    console.error('Error al obtener documentos del usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener documentos del usuario',
      details: error.message
    });
  }
};

/**
 * Obtiene documentos pendientes (sin revisar)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getDocumentosPendientes = async (req, res) => {
  try {
    const documentosPendientes = await documentsService.getDocumentosPendientes();
    
    res.status(200).json({
      success: true,
      data: documentosPendientes
    });
  } catch (error) {
    console.error('Error al obtener documentos pendientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener documentos pendientes',
      details: error.message
    });
  }
};

/**
 * Sube un documento
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.subirDocumento = async (req, res) => {
  try {
    // Usar middleware de Multer para procesar el archivo EN MEMORIA
    // 'file' es el nombre del campo esperado en FormData
    await new Promise((resolve, reject) => {
        uploadSingleFile('file')(req, res, (err) => {
            if (err) {
                console.error('Error de Multer:', err);
                // Handle specific Multer errors if needed
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return reject(new Error('El archivo excede el tamaño máximo permitido.'));
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                     return reject(new Error(`Campo de archivo inesperado: ${err.field}`));
                }
                 if (err instanceof Error && err.message.includes('Tipo de archivo no permitido')) {
                     return reject(err); // Propagate file type error
                 }
                return reject(new Error('Error al procesar el archivo.'));
            }
            resolve();
        });
    });

    // --- ADDED Logging ---
    console.log('Datos del formulario (req.body):', req.body);
    console.log('Archivo recibido (req.file):', req.file ? `${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)` : 'Ninguno');
    // --- END Logging ---

    if (!req.file) {
      // Este chequeo podría ser redundante si Multer ya lanzó error, pero es seguro tenerlo
      return res.status(400).json({
        success: false,
        error: 'No se ha proporcionado ningún archivo en el campo "file".'
      });
    }

    // Extraer datos del cuerpo (después de que Multer procese)
    const { userId, documentType, expeditionDate, expirationDate, userName, userEmail, numeroDosis } = req.body;

    // --- ADDED Logging ---
    console.log('Extracted userId:', userId);
    console.log('Extracted documentType:', documentType);
    console.log('Extracted expeditionDate:', expeditionDate);
    console.log('Extracted expirationDate:', expirationDate); // Puede ser undefined
    // --- END Logging ---

    // Validar campos requeridos
    if (!userId || !documentType || !expeditionDate) {
       // Construir mensaje de error más detallado
       let missingFields = [];
       if (!userId) missingFields.push('userId');
       if (!documentType) missingFields.push('documentType');
       if (!expeditionDate) missingFields.push('expeditionDate');

      return res.status(400).json({
        success: false,
        error: `Faltan campos requeridos en la solicitud: ${missingFields.join(', ')}.`
      });
    }

    // Llamar al servicio para subir el documento
    // Pasamos el buffer del archivo desde req.file.buffer
    const documento = await documentsService.subirDocumento(
      userId,
      documentType,
      req.file.buffer, // El buffer está aquí gracias a memoryStorage
      req.file.originalname,
      req.file.mimetype,
      { // Pasar metadatos adicionales como un objeto
          expeditionDate,
          expirationDate, // Puede ser undefined
          userName,
          userEmail
      },
      numeroDosis ? parseInt(numeroDosis) : null // Número de dosis específica
    );

    // Responder con éxito
    res.status(200).json({
      success: true,
      message: 'Documento subido y registrado correctamente.',
      data: documento // Devolver la información del documento creado/actualizado
    });

  } catch (error) {
    // Loggear el error completo en el servidor
    console.error('Error en controller subirDocumento:', error);

    // Enviar una respuesta de error genérica pero informativa al cliente
    res.status(error.status || 500).json({ // Usar error.status si está disponible
      success: false,
      error: 'Error al subir el documento',
      // Proporcionar detalles del error SÓLO si es seguro (evitar exponer detalles internos)
      // En desarrollo, puedes enviar error.message, pero en producción considera un mensaje genérico.
      details: error.message || 'Ocurrió un error inesperado en el servidor.'
    });
  }
};

/**
 * Obtiene información de dosis de un documento específico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getDocumentDoses = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del documento'
      });
    }
    
    const doseInfo = await documentsService.getDocumentDoses(id);
    
    res.status(200).json({
      success: true,
      data: doseInfo
    });
  } catch (error) {
    console.error('Error al obtener información de dosis:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener información de dosis',
      details: error.message
    });
  }
};

/**
 * Revisa un documento (cambio de estado)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.revisarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, comentario } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del documento'
      });
    }
    
    if (!estado) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el campo estado'
      });
    }
    
    const documentoActualizado = await documentsService.revisarDocumento(
      id,
      estado,
      comentario || ''
    );
    
    res.status(200).json({
      success: true,
      message: `Documento ${id} actualizado a estado: ${estado}`,
      data: documentoActualizado
    });
  } catch (error) {
    console.error('Error al revisar documento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al revisar documento',
      details: error.message
    });
  }
};

/**
 * Actualiza estados de documentos vencidos
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.actualizarEstadosVencidos = async (req, res) => {
  try {
    const resultado = await documentsService.actualizarEstadosVencidos();
    
    res.status(200).json({
      success: true,
      message: `${resultado.actualizados} documentos actualizados a estado Expirado`,
      data: resultado
    });
  } catch (error) {
    console.error('Error al actualizar estados de documentos vencidos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estados de documentos vencidos',
      details: error.message
    });
  }
};

/**
 * Obtiene estadísticas de documentos
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getEstadisticas = async (req, res) => {
  try {
    const estadisticas = await documentsService.getEstadisticas();
    
    res.status(200).json({
      success: true,
      data: estadisticas
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de documentos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas de documentos',
      details: error.message
    });
  }
};

/**
 * Obtiene las solicitudes activas de documentos
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.getActiveRequests = async (req, res) => {
  try {
    const documentosUsuariosRepo = require('../repository/documentosUsuariosRepository');
    const solicitudes = await documentosUsuariosRepo.findByEstado('Sin revisar');

    if (!solicitudes || solicitudes.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No hay solicitudes activas'
      });
    }

    return res.status(200).json({
      success: true,
      data: solicitudes
    });
  } catch (error) {
    console.error('Error al obtener solicitudes activas:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener solicitudes activas',
      details: error.message
    });
  }
};