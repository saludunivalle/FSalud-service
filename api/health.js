// api/health.js

module.exports = async (req, res) => {
    try {
      // Obtener información del sistema
      const healthInfo = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        cors: {
          allowedOrigins: process.env.CORS_ALLOWED_ORIGINS 
            ? process.env.CORS_ALLOWED_ORIGINS.split(',') 
            : ['http://localhost:3000', 'https://fsalud-saludunivalles-projects.vercel.app'],
        },
        services: {
          googleSheets: !!process.env.GOOGLE_SHEETS_ID,
          googleDrive: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
          auth: !!process.env.JWT_SECRET
        },
        requestInfo: {
          origin: req.headers.origin || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        }
      };
  
      // Respuesta exitosa
      res.status(200).json({
        success: true,
        message: 'API funcionando correctamente',
        data: healthInfo
      });
    } catch (error) {
      console.error('Error en health check:', error);
      res.status(500).json({
        success: false,
        error: 'Error al verificar estado del sistema',
        details: error.message
      });
    }
  };