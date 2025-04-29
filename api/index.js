// api/index.js
module.exports = async (req, res) => {
  // Configuración básica de CORS para todas las rutas
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Manejo directo de OPTIONS para CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Extraer la ruta de la solicitud
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    // Ruta principal de la API
    if (path === '/api' || path === '/api/') {
      return res.status(200).json({ 
        message: 'API del Sistema de Gestión Documental funcionando correctamente',
        version: '1.0.0'
      });
    }
    
    // Determinar el tipo de ruta y llamar al handler correspondiente
    // La importación se hace dentro del bloque para evitar cargar todos los handlers
    // si solo se necesita uno específico
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
    
    // Ruta no encontrada
    return res.status(404).json({ 
      error: 'Ruta no encontrada',
      path: path
    });
    
  } catch (error) {
    console.error('Error en API:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};