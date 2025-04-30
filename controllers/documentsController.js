// controllers/documentsController.js
const documentsService = require('../services/documentsService');
const { validateData } = require('../utils/validators');
const { uploadSingleFile } = require('../middleware/upload');

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
    // Procesar archivo con nuestro middleware
    await uploadSingleFile('documento')(req, res);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se ha proporcionado ningún archivo'
      });
    }
    
    // Validar campos requeridos
    const { userId, tipoDocId } = req.body;
    
    if (!userId || !tipoDocId) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los campos userId y tipoDocId'
      });
    }
    
    // Subir documento
    const documento = await documentsService.subirDocumento(
      userId,
      tipoDocId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    
    res.status(200).json({
      success: true,
      message: 'Documento subido correctamente',
      data: documento
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir documento',
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