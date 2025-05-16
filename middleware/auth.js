// middleware/auth.js (mejorado)
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const usersService = require('../services/usersService');

// Cliente OAuth2 para verificación de tokens de Google
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Middleware para verificar tokens JWT
 */
const verifyJWT = async (req, res, next) => {
  try {
    // Extraer token del header o query
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token;
    
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (queryToken) {
      token = queryToken;
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    // Verificar token JWT
    jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }
      
      // Añadir información del usuario a la solicitud
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Error de autenticación JWT:', error);
    return res.status(401).json({ error: 'Error de autenticación' });
  }
};

/**
 * Middleware para verificar tokens de Google directamente
 */
const verifyGoogleToken = async (req, res, next) => {
  try {
    // Extraer token del header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar con Google
    const ticket = await client.verifyIdToken({
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
    
    // Buscar usuario en base de datos
    const user = await usersService.findUserByEmail(payload.email);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'Usuario no registrado en el sistema' 
      });
    }
    
    // Añadir información del usuario a la solicitud
    req.user = {
      id: user.id_usuario,
      email: user.correo_usuario,
      name: user.nombre_usuario + ' ' + user.apellido_usuario,
      role: user.rol
    };
    
    next();
  } catch (error) {
    console.error('Error de autenticación con Google:', error);
    return res.status(401).json({ error: 'Token inválido o error de autenticación' });
  }
};

/**
 * Middleware para verificar tokens de Firebase
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Código existente...
  } catch (error) {
    console.error('Error de autenticación con Firebase:', error);
    
    // Respuestas más específicas según el tipo de error
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expirado. Por favor, inicie sesión nuevamente.' });
    } else if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ error: 'Token revocado. Por favor, inicie sesión nuevamente.' });
    } else {
      return res.status(401).json({ error: 'Token inválido o error de autenticación' });
    }
  }
};

/**
 * Middleware para verificar roles de usuario
 * @param {Array|string} roles - Roles permitidos ('admin', 'profesor', 'estudiante' o un array de ellos)
 */
const checkRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }
      
      // Convertir a array si es un string
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (allowedRoles.includes(req.user.role)) {
        next();
      } else {
        return res.status(403).json({ 
          error: 'Acceso denegado. No tiene los permisos necesarios',
          requiredRoles: allowedRoles,
          userRole: req.user.role 
        });
      }
    } catch (error) {
      console.error('Error verificando roles:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
};

// Middleware específicos para cada rol
const isAdmin = checkRole('admin');
const isProfesor = checkRole(['admin', 'profesor']); // Profesores y admins pueden acceder
const isEstudiante = checkRole('estudiante');

/**
 * Middleware para verificar dominio de correo
 */
const checkInstitutionalEmail = (req, res, next) => {
  const email = req.body.email || '';
  
  if (!email.endsWith('@correounivalle.edu.co')) {
    return res.status(403).json({
      error: 'Debe utilizar un correo institucional (@correounivalle.edu.co)'
    });
  }
  
  next();
};

module.exports = {
  verifyJWT,
  verifyGoogleToken,
  verifyFirebaseToken,
  checkRole,
  isAdmin,
  isProfesor,
  isEstudiante,
  checkInstitutionalEmail
};