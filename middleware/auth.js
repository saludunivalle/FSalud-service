// middleware/auth.js
const { oAuth2Client } = require('../config/google');

/**
 * Middleware para verificar tokens de autenticación
 */
const verifyToken = async (req, res, next) => {
  try {
    // Extraer token del header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar con Google
    const ticket = await oAuth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    // Verificar si es correo institucional
    if (!payload.email.endsWith('@correounivalle.edu.co')) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Por favor, utiliza un correo institucional (@correounivalle.edu.co)' 
      });
    }
    
    // Añadir información del usuario a la solicitud
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name
    };
    
    next();
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

/**
 * Middleware para verificar permisos de administrador
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    // Aquí se debería consultar si el usuario tiene rol de administrador en la base de datos
    // Por ahora simplificamos con una lista en .env
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    
    if (adminEmails.includes(req.user.email)) {
      next();
    } else {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
  } catch (error) {
    console.error('Error verificando permisos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  verifyToken,
  isAdmin
};