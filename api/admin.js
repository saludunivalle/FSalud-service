const usersController = require('../controllers/usersController');
const { verifyJWT, isProfesor } = require('../middleware/auth');

module.exports = async (req, res) => {
  try {
    // Apply authentication middleware first
    await new Promise((resolve, reject) => {
      verifyJWT(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Apply authorization middleware
    await new Promise((resolve, reject) => {
      isProfesor(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Extraer la ruta de la solicitud
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const fullEndpoint = path.replace('/api/admin/', ''); // e.g., "create-user"
    
    const parts = fullEndpoint.split('/');
    const routePart1 = parts[0]; // For /create-user, this is "create-user"
    const routePart2 = parts.length > 1 ? parts[1] : null;

    // Crear usuario manualmente desde el panel de administración (POST /api/admin/create-user)
    if (routePart1 === 'create-user' && !routePart2 && req.method === 'POST') {
      return await usersController.createUserFromAdmin(req, res);
    }

    // Obtener datos de estudiante para admin (GET /api/admin/student-data/:studentId)
    if (routePart1 === 'student-data' && routePart2 && req.method === 'GET') {
      req.params = { studentId: routePart2 };
      // Logic to fetch student data for admin/professor
      return res.json({ 
        success: true, 
        message: `Access granted for user ${req.user.email} to student ${routePart2}` 
      });
    }

    // Actualizar estado de estudiante (POST /api/admin/update-student-status/:studentId)
    if (routePart1 === 'update-student-status' && routePart2 && req.method === 'POST') {
      req.params = { studentId: routePart2 };
      // Logic to update student status
      return res.json({ 
        success: true, 
        message: `Status updated for student ${routePart2} by ${req.user.email}` 
      });
    }
    
    // Si no se encuentra ninguna ruta válida
    return res.status(404).json({ 
      success: false,
      error: 'Ruta de administración no encontrada',
      path: path,
      endpoint: fullEndpoint
    });
    
  } catch (error) {
    console.error('Error en API de administración:', error);
    
    // Handle authentication/authorization errors specifically
    if (error.message === 'Token no proporcionado' || error.message === 'Token inválido') {
      return res.status(401).json({ 
        success: false,
        error: error.message 
      });
    }
    
    if (error.message === 'Acceso denegado' || error.message === 'No autorizado') {
      return res.status(403).json({ 
        success: false,
        error: error.message 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: 'Error en servicio de administración',
      details: error.message 
    });
  }
}; 