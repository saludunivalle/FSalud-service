// controllers/userController.js
const sheetsService = require('../services/sheetsService');
const usersService = require('../services/usersService');

// Create a mock firebaseAdmin if the real module isn't available
let firebaseAdmin;
try {
  firebaseAdmin = require('firebase-admin');
} catch (error) {
  console.warn('firebase-admin module not found, fallback authentication will be used');
  // Mock implementation with minimal functionality
  firebaseAdmin = {
    auth: () => ({
      verifyIdToken: async (token) => {
        console.log('MOCK: Skipping Firebase token verification due to missing firebase-admin');
        // Extract basic info from token without verification (NOT SECURE - TEMPORARY FIX ONLY)
        try {
          // Extract minimal data from the token without verification
          const tokenParts = token.split('.');
          if (tokenParts.length !== 3) throw new Error('Invalid token format');
          
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          return {
            uid: payload.user_id || payload.sub,
            email: payload.email
          };
        } catch (err) {
          console.error('Error parsing token without verification:', err);
          throw new Error('Invalid token format');
        }
      }
    })
  };
}

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  console.error('ERROR DE CONFIGURACIÓN: No se encontraron credenciales de Firebase Admin.' +
    'Debes configurar FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH en tu archivo .env');
  
  // Opcional: podrías lanzar un error para detener la aplicación en caso de configuración faltante
  // throw new Error('Credenciales de Firebase Admin no configuradas');
}

/**
 * Guarda un usuario en Google Sheets si no existe previamente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const saveUser = async (req, res) => {
  try {
    console.log('Datos recibidos en saveUser:', req.body);
    
    // Extract data respecting both naming conventions
    const id = req.body.id || req.body.firebaseUid;
    const email = req.body.email;
    const name = req.body.name || req.body.displayName;

    // Validación de datos
    if (!id || !email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los campos id/firebaseUid, email y name/displayName'
      });
    }

    // Verificar token si viene incluido en la solicitud
    if (req.body.token) {
      try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(req.body.token);
        // Si el ID no coincide con el token, podría ser una solicitud maliciosa
        if (decodedToken.uid !== id) {
          return res.status(401).json({
            success: false,
            error: 'ID de usuario no coincide con el token proporcionado'
          });
        }
      } catch (tokenError) {
        return res.status(401).json({
          success: false,
          error: 'Token inválido',
          details: tokenError.message
        });
      }
    }

    // Verificar si el usuario ya existe
    const userExists = await sheetsService.saveUserIfNotExists(id, email, name);

    res.status(200).json({
      success: true,
      message: userExists
        ? 'Usuario guardado correctamente'
        : 'Usuario ya existe, no se requirió guardado',
      userInfo: { id, email, name }
    });
  } catch (error) {
    console.error('Error al guardar el usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar el usuario',
      details: error.message
    });
  }
};

/**
 * Actualiza información de primer inicio de sesión
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const updateFirstLogin = async (req, res) => {
  try {
    const { id } = req.params;
    // Extraer los campos adicionales del req.body
    const { 
      programa_academico, 
      documento_usuario, 
      tipoDoc, 
      telefono,
      direccion, 
      fecha_nac, 
      email 
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del usuario'
      });
    }

    // Validar datos (puedes añadir validación para los nuevos campos si es necesario)
    if (!programa_academico || !documento_usuario || !tipoDoc || !telefono || !direccion || !fecha_nac || !email) {
      return res.status(400).json({
        success: false,
        // Actualizar mensaje de error para incluir los nuevos campos si son obligatorios
        error: 'Todos los campos (programa, documento, tipoDoc, telefono, direccion, fecha_nac, email personal) son requeridos'
      });
    }

    const updatedUser = await usersService.updateUserFirstLogin(id, {
      programa_academico,
      documento_usuario,
      tipoDoc,
      telefono,
      direccion,
      fecha_nac,
      email    
    });

    res.status(200).json({
      success: true,
      message: 'Información de primer inicio de sesión actualizada correctamente',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar primer inicio de sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar información de primer inicio de sesión',
      details: error.message
    });
  }
};

/**
 * Obtiene un usuario por su ID
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del usuario'
      });
    }

    // Aquí usamos el servicio para buscar el usuario
    const user = await usersService.findUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `Usuario con ID ${id} no encontrado`
      });
    }

    // Devolver todos los datos del usuario encontrados por el servicio
    // El servicio findUserById ya mapea las columnas a un objeto
    res.status(200).json({
      success: true,
      data: user // Devolver el objeto completo tal como lo retorna el servicio
    });
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuario',
      details: error.message
    });
  }
};

module.exports = {
  saveUser,
  getUserById,
  updateFirstLogin
};