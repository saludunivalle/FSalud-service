// middleware/errorHandler.js

/**
 * Middleware para manejo centralizado de errores en la API
 * @param {Error} err - Error capturado
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error capturado por middleware:', err);
    
    // Si ya se ha enviado la respuesta, pasar al siguiente middleware
    if (res.headersSent) {
      return next(err);
    }
    
    // Determinar el código de estado según el tipo de error
    let statusCode = 500;
    let errorMessage = 'Error interno del servidor';
    
    // Errores de validación
    if (err.name === 'ValidationError' || err.message.includes('validación')) {
      statusCode = 400;
      errorMessage = 'Error de validación de datos';
    }
    
    // Errores de autenticación
    if (err.name === 'AuthenticationError' || err.message.includes('autenticación')) {
      statusCode = 401;
      errorMessage = 'Error de autenticación';
    }
    
    // Errores de autorización
    if (err.name === 'AuthorizationError' || err.message.includes('autorización') || err.message.includes('permiso')) {
      statusCode = 403;
      errorMessage = 'No tiene permisos para realizar esta acción';
    }
    
    // Errores de recurso no encontrado
    if (err.name === 'NotFoundError' || err.message.includes('no encontrado')) {
      statusCode = 404;
      errorMessage = 'Recurso no encontrado';
    }
    
    // Errores de multer (archivos)
    if (err.name === 'MulterError') {
      statusCode = 400;
      
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          errorMessage = 'El archivo excede el tamaño máximo permitido';
          break;
        case 'LIMIT_UNEXPECTED_FILE':
          errorMessage = 'Tipo de archivo no esperado';
          break;
        default:
          errorMessage = 'Error al procesar el archivo';
      }
    }
    
    // Si el error tiene un código propio y es un número, usarlo
    if (err.statusCode && !isNaN(err.statusCode)) {
      statusCode = err.statusCode;
    }
    
    // Respuesta de error
    const errorResponse = {
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'production' ? undefined : err.message
    };
    
    // Agregar stack trace en desarrollo
    if (process.env.NODE_ENV === 'development' && err.stack) {
      errorResponse.stack = err.stack;
    }
    
    res.status(statusCode).json(errorResponse);
  };
  
  module.exports = errorHandler;