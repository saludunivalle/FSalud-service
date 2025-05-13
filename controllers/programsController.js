// filepath: c:\Marcela\MONITORIA\FSalud-service\controllers\programsController.js
const programsService = require('../services/programsService');

/**
 * Obtiene todos los programas académicos.
 * @param {Object} req - Objeto de solicitud Express.
 * @param {Object} res - Objeto de respuesta Express.
 */
exports.getAllPrograms = async (req, res) => {
  try {
    const programs = await programsService.fetchAllPrograms();
    res.status(200).json({ success: true, data: programs });
  } catch (error) {
    console.error('[programsController] Error in getAllPrograms:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'No se pudieron obtener los programas académicos.', 
      details: error.message 
    });
  }
};