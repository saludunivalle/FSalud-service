// api/index.js
const cors = require('cors'); // Import cors
const errorHandler = require('../middleware/errorHandler');

// --- CORS Configuration ---
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',');
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow specified origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,POST,PUT,DELETE,OPTIONS', // Specify allowed methods
  allowedHeaders: 'Content-Type,Authorization,X-Requested-With,Accept', // Specify allowed headers
  credentials: true, // IMPORTANT: Allow credentials
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

module.exports = async (req, res) => {
  // Apply CORS middleware FIRST
  cors(corsOptions)(req, res, async (corsError) => {
    if (corsError) {
      console.error('CORS Error:', corsError.message);
      // Use errorHandler for consistent error response
      return errorHandler(corsError, req, res, () => {});
    }

    // If CORS passed, proceed to handle the API request
    try {
      // Handle OPTIONS preflight requests explicitly after CORS check
      if (req.method === 'OPTIONS') {
         console.log('Handling OPTIONS request');
         // CORS middleware already set headers, just end successfully
         return res.status(200).end();
      }

      // Proceed with your existing request handling logic
      await handleApiRequest(req, res);

    } catch (error) {
      console.error('Error after CORS check:', error);
      // Use errorHandler for any errors during request handling
      errorHandler(error, req, res, () => {});
    }
  });
};

/**
 * Función para manejar las solicitudes a la API
 */
async function handleApiRequest(req, res) {
  // Extraer la ruta de la solicitud ANTES del try block
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname; // path is now defined for the whole function scope

  try {
    console.log(`Handling ${req.method} request for path: ${path}`); // Add logging

    // Ruta principal de la API y Raíz
    if (path === '/' || path === '/api' || path === '/api/') {
      return res.status(200).json({
        success: true,
        message: 'API del Sistema de Gestión Documental funcionando correctamente',
        version: '1.0.0'
      });
    }

    // Health check
    if (path === '/api/health' || path === '/health') {
      const healthHandler = require('./health');
      return await healthHandler(req, res);
    }

    // --- Your existing routing logic ---
    if (path === '/getUser') {
      const userId = url.searchParams.get('userId');
      // Basic validation for userId
      if (!userId) {
         return res.status(400).json({ success: false, error: 'Se requiere el ID del usuario (userId query parameter)' });
      }
      req.params = { id: userId };
      const userController = require('../controllers/usersController');
      return await userController.getUserById(req, res);
    }

    if (path === '/getUserDocuments') {
      const userId = url.searchParams.get('userId');
      // Basic validation for userId
      if (!userId) {
         return res.status(400).json({ success: false, error: 'Se requiere el ID del usuario (userId query parameter)' });
      }
      req.params = { id: userId };
      const documentsController = require('../controllers/documentsController');
      return await documentsController.getDocumentosUsuario(req, res);
    }

    if (path === '/getActiveRequests') {
      const userId = url.searchParams.get('userId');
      // Basic validation for userId
      if (!userId) {
         return res.status(400).json({ success: false, error: 'Se requiere el ID del usuario (userId query parameter)' });
      }
      req.params = { id: userId };
      const documentsController = require('../controllers/documentsController');
      return await documentsController.getActiveRequests(req, res);
    }

    if (path === '/getDocumentos') {
      const documentsController = require('../controllers/documentsController');
      return await documentsController.getTiposDocumentos(req, res);
    }

    // Rutas específicas para cada tipo de dashboard
    if (path.startsWith('/api/dashboard/profesor/')) {
      // Verificar que el usuario sea profesor o admin
      // Esto asume que un middleware de autenticación (ej. verifyJWT) ya populó req.user
      const isAuthorized = req.user && (req.user.role === 'profesor' || req.user.role === 'admin');
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requiere rol de profesor o admin'
        });
      }
      
      // Dirigir a los controladores correspondientes
      // Asegúrate de que el archivo './dashboard/profesor.js' exista y exporte un manejador.
      const profesorDashboardHandler = require('./dashboard/profesor');
      return await profesorDashboardHandler(req, res);
    }
    
    if (path.startsWith('/api/dashboard/estudiante/')) {
      // Verificar que el usuario sea estudiante
      // Esto asume que un middleware de autenticación (ej. verifyJWT) ya populó req.user
      const isAuthorized = req.user && req.user.role === 'estudiante';
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requiere rol de estudiante'
        });
      }
      
      // Dirigir a los controladores correspondientes
      // Asegúrate de que el archivo './dashboard/estudiante.js' exista y exporte un manejador.
      const estudianteDashboardHandler = require('./dashboard/estudiante');
      return await estudianteDashboardHandler(req, res);
    }

    // --- Sub-router handlers ---
    if (path.startsWith('/api/auth/')) {
      const authHandler = require('./auth');
      return await authHandler(req, res);
    }

    if (path.startsWith('/api/users/')) {
      const usersHandler = require('./users');
      return await usersHandler(req, res);
    }

    if (path.startsWith('/api/documentos/')) {
      const documentsHandler = require('./documents');
      return await documentsHandler(req, res);
    }

    if (path.startsWith('/api/programs/') || path === '/api/programs') {
      const programsHandler = require('./programs');
      return await programsHandler(req, res);
    }
    // --- End sub-router handlers ---

    // Ruta no encontrada
    console.log(`Route not found: ${path}`);
    return res.status(404).json({
      success: false,
      error: 'Ruta no encontrada',
      path: path
    });

  } catch (error) {
    // Log the error with the path
    console.error(`Error in handleApiRequest for ${path}:`, error);
    // Delegate error handling to the outer handler by re-throwing
    throw error;
  }
}
