// api/programs.js
const programsController = require('../controllers/programsController');

module.exports = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  try {
    console.log(`[Programs API] Handling ${method} request for ${path}`);

    // GET /api/programs - Obtener todos los programas
    if (path === '/api/programs' && method === 'GET') {
      return await programsController.getAllPrograms(req, res);
    }

    // Ruta no encontrada
    return res.status(404).json({
      success: false,
      error: 'Ruta de programas no encontrada',
      path: path
    });

  } catch (error) {
    console.error('[Programs API] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
}; 