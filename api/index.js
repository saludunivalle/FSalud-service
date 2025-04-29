// api/index.js - Opción de coordinador centralizado
const documentosHandler = require('./documentos');
const usersHandler = require('./users');
const authHandler = require('./auth');

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    // Dirigir solicitudes a los manejadores correspondientes
    if (path.startsWith('/api/documentos') || path === '/api/documentos') {
      return await documentosHandler(req, res);
    }
    
    if (path.startsWith('/api/users') || path === '/api/users') {
      return await usersHandler(req, res);
    }
    
    if (path.startsWith('/api/auth') || path === '/api/auth') {
      return await authHandler(req, res);
    }
    
    // Ruta principal de la API
    if (path === '/api' || path === '/api/') {
      return res.status(200).json({ 
        message: 'API del Sistema de Gestión Documental funcionando correctamente' 
      });
    }
    
    // Ruta no encontrada
    return res.status(404).json({ 
      error: 'Ruta no encontrada',
      path: path
    });
  } catch (error) {
    console.error('Error en coordinador de API:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};