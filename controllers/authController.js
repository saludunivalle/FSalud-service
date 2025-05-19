// controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
const usersService = require('../services/usersService'); 
const authService = require('../services/authService');
const jwt = require('jsonwebtoken'); 

// Crear el cliente OAuth2
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Autentica al usuario mediante Google OAuth2
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const googleAuth = async (req, res) => {
  try {
    console.log('Procesando solicitud de autenticación Google');
    
    const token = req.body.idToken || req.body.token || req.body.credential;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        error: 'No se proporcionó token de autenticación' 
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const userId = payload['sub']; 
    const userEmail = payload['email'];
    const userName = payload['name'];
    
    console.log('Token verificado, información del usuario:', { userId, userEmail, userName });

    // Ya no requerimos correo institucional
    // if (!userEmail.endsWith('@correounivalle.edu.co')) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Por favor ingrese con un correo institucional (@correounivalle.edu.co)'
    //   });
    // }

    const googleUserData = {
      googleId: userId, 
      email: userEmail,
      name: userName,
    };

    console.log('Llamando a findOrCreateUser con:', googleUserData);
    const user = await usersService.findOrCreateUser(googleUserData);
    console.log('Usuario procesado por el servicio:', user);

    if (!user || !user.id_usuario) {
       console.error('Error: El servicio findOrCreateUser no devolvió un usuario válido.');
       return res.status(500).json({
           success: false,
           error: 'No se pudo obtener la información completa del usuario desde el servicio.'
       });
    }

    const jwtToken = jwt.sign(
      { 
        id: user.id_usuario, 
        email: user.correo_usuario,
        name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
        role: user.rol || 'estudiante'
      },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );
      
    res.status(200).json({
      success: true,
      user: {
        id: user.id_usuario,
        email: user.correo_usuario,
        name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
        role: user.rol,
        isFirstLogin: user.rol === 'profesor' 
          ? false
          : String(user.primer_login || '').trim().toLowerCase() !== 'si'
      },
      token: jwtToken
    });

  } catch (error) {
    console.error('Error al autenticar con Google:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al autenticar con Google',
      details: error.message 
    });
  }
};

/**
 * Registra un nuevo usuario con correo y contraseña
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const register = async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;
    
    // Validar datos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren correo y contraseña'
      });
    }
    
    // Verificar CAPTCHA
    if (captchaToken) {
      const isValidCaptcha = await authService.verifyCaptcha(captchaToken);
      if (!isValidCaptcha) {
        return res.status(400).json({
          success: false,
          error: 'Verificación CAPTCHA fallida'
        });
      }
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await usersService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El correo electrónico ya está registrado'
      });
    }
    
    // Hashear contraseña
    const hashedPassword = authService.hashPassword(password);
    
    // Crear usuario
    const userData = {
      correo_usuario: email,
      password: hashedPassword,
      nombre_usuario: email.split('@')[0], // Nombre temporal basado en correo
      rol: 'estudiante', // Rol por defecto
      primer_login: 'si' // Requerirá completar el perfil
    };
    
    const newUser = await usersService.createUser(userData);
    
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar el usuario',
      details: error.message
    });
  }
};

/**
 * Inicia sesión with correo y contraseña
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const login = async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;
    
    // Validar datos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren correo y contraseña'
      });
    }
    
    // Verificar CAPTCHA
    if (captchaToken) {
      const isValidCaptcha = await authService.verifyCaptcha(captchaToken);
      if (!isValidCaptcha) {
        return res.status(400).json({
          success: false,
          error: 'Verificación CAPTCHA fallida'
        });
      }
    }
    
    // Buscar usuario
    const user = await usersService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Correo o contraseña incorrectos'
      });
    }
    
    // Verificar si tiene contraseña (usuario creado por correo)
    if (!user.password) {
      return res.status(401).json({
        success: false,
        error: 'Esta cuenta fue creada con Google. Por favor, inicie sesión con Google.'
      });
    }
    
    // Verificar contraseña
    const isValidPassword = authService.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Correo o contraseña incorrectos'
      });
    }
    
    // Generar token JWT
    const jwtToken = authService.generateJWT({
      id: user.id_usuario,
      email: user.correo_usuario,
      name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
      role: user.rol || 'estudiante'
    });
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id_usuario,
        email: user.correo_usuario,
        name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
        role: user.rol || 'estudiante',
        isFirstLogin: user.rol === 'profesor' 
          ? false
          : String(user.primer_login || '').trim().toLowerCase() !== 'si'
      },
      token: jwtToken
    });
    
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al iniciar sesión',
      details: error.message
    });
  }
};

/**
 * Envía un código de verificación al correo
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const sendVerificationCode = async (req, res) => {
  try {
    const { email, captchaToken } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere correo electrónico'
      });
    }
    
    // Verificar CAPTCHA (si se proporciona)
    if (captchaToken) {
      const isValidCaptcha = await authService.verifyCaptcha(captchaToken);
      if (!isValidCaptcha) {
        return res.status(400).json({
          success: false,
          error: 'Verificación CAPTCHA fallida'
        });
      }
    }
    
    // Generar código
    const code = authService.generateVerificationCode(email);
    
    // Enviar correo
    const emailSent = await authService.sendVerificationEmail(email, code);
    
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        error: 'Error al enviar el correo de verificación'
      });
    }
    
    // Preparar respuesta
    const response = {
      success: true,
      message: 'Código de verificación enviado'
    };

    // Incluir código en la respuesta en cualquier entorno
    // Esto permitirá probar la funcionalidad mientras se soluciona
    // la configuración de correo en producción
    response.testCode = code; // FIX: Remove the duplicate esponse line

    res.status(200).json(response);
    
  } catch (error) {
    console.error('Error al enviar código de verificación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar el código de verificación',
      details: error.message
    });
  }
};

/**
 * Verifica el código enviado por correo y autentica
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log(`Verificando código para ${email}: ${code}`);
    
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren correo y código de verificación'
      });
    }
    
    // PRIMERA SOLUCIÓN TEMPORAL: Modo desarrollador, acepta cualquier código de 6 dígitos
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isValidFormat = /^\d{6}$/.test(code); // Verifica que sea un código de 6 dígitos
    
    // Si estamos en desarrollo y es un código de 6 dígitos, permitir acceso
    if (isDevelopment && isValidFormat) {
      console.log('MODO DESARROLLO: Aceptando código temporal');
      
      // Procedemos con la autenticación...
      let user = await usersService.findUserByEmail(email);
      
      if (!user) {
        // Generar ID único para el usuario (timestamp + hash del email)
        const emailHash = require('crypto').createHash('md5').update(email).digest('hex');
        const uniqueId = `email_${Date.now().toString().substring(0, 10)}_${emailHash.substring(0, 8)}`;
        
        // Crear usuario nuevo si no existe
        const userData = {
          id_usuario: uniqueId,
          googleId: uniqueId,  // Necesario para la validación
          correo_usuario: email,
          nombre_usuario: email.split('@')[0], // Nombre temporal basado en correo
          rol: 'estudiante',
          primer_login: 'si'
        };
        
        user = await usersService.createUser(userData);
      }
      
      // Generar token JWT
      const jwtToken = authService.generateJWT({
        id: user.id_usuario,
        email: user.correo_usuario,
        name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
        role: user.rol || 'estudiante'
      });
      
      return res.status(200).json({
        success: true,
        user: {
          id: user.id_usuario,
          email: user.correo_usuario,
          name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
          role: user.rol || 'estudiante',
          isFirstLogin: user.rol === 'profesor' 
            ? false
            : String(user.primer_login || '').trim().toLowerCase() !== 'si'
        },
        token: jwtToken
      });
    }
    
    // Si no estamos en desarrollo o el formato es inválido, continuar con la verificación normal
    // Verificar código
    const isValidCode = authService.verifyCode(email, code);
    
    // Loguear más información para depuración
    console.log(`Resultado de verificación: ${isValidCode ? 'Válido' : 'Inválido'}`);
    
    if (!isValidCode) {
      return res.status(401).json({
        success: false,
        error: 'Código inválido o expirado'
      });
    }
    
    // Buscar usuario o crearlo si no existe
    let user = await usersService.findUserByEmail(email);
    
    if (!user) {
      // Generar ID único para el usuario (timestamp + hash del email)
      const emailHash = require('crypto').createHash('md5').update(email).digest('hex');
      const uniqueId = `email_${Date.now().toString().substring(0, 10)}_${emailHash.substring(0, 8)}`;
      
      // Crear usuario nuevo si no existe
      const userData = {
        id_usuario: uniqueId,  // Include the generated unique ID
        googleId: uniqueId,    // Set googleId to the same value to satisfy the validation
        correo_usuario: email,
        nombre_usuario: email.split('@')[0], // Nombre temporal basado en correo
        rol: 'estudiante',
        primer_login: 'si'
      };
      
      user = await usersService.createUser(userData);
    }
    
    // Generar token JWT
    const jwtToken = authService.generateJWT({
      id: user.id_usuario,
      email: user.correo_usuario,
      name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
      role: user.rol || 'estudiante'
    });
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id_usuario,
        email: user.correo_usuario,
        name: `${user.nombre_usuario || ''} ${user.apellido_usuario || ''}`.trim(),
        role: user.rol || 'estudiante',
        isFirstLogin: user.rol === 'profesor' 
          ? false
          : String(user.primer_login || '').trim().toLowerCase() !== 'si'
      },
      token: jwtToken
    });
    
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar el código',
      details: error.message
    });
  }
};

module.exports = {
  googleAuth,
  register,
  login,
  sendVerificationCode,
  verifyCode
};