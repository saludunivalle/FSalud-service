// controllers/userController.js
const sheetsService = require('../services/sheetsService');
const usersService = require('../services/usersService'); // Import usersService

/**
 * Guarda un usuario en Google Sheets si no existe previamente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const saveUser = async (req, res) => {
  try {
    console.log('Datos recibidos en saveUser:', req.body);
    const { id, email, name } = req.body;

    // Validación de datos
    if (!id || !email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren los campos id, email y name'
      });
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
    console.log('updateFirstLogin - ID recibido:', id);
    console.log('updateFirstLogin - Datos recibidos en req.body:', req.body);
    
    // Extraer todos los campos del req.body, incluyendo sede
    const { 
      programa_academico, 
      sede,                // Agregado el campo sede
      documento_usuario, 
      tipoDoc, 
      telefono,
      fecha_nac, 
      email,
      correo_usuario,      // Agregado correo_usuario
      nombre_usuario,   
      apellido_usuario, 
      rol             
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del usuario'
      });
    }

    // Validar datos incluyendo sede
    if (!programa_academico || !sede || !documento_usuario || !tipoDoc || !telefono || !fecha_nac || !email) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos (programa, sede, documento, tipoDoc, telefono, fecha_nac, email personal) son requeridos'
      });
    }

    console.log('updateFirstLogin - Datos a enviar al servicio:', {
      programa_academico,
      sede,
      documento_usuario,
      tipoDoc,
      telefono,
      fecha_nac,
      email,
      correo_usuario,
      nombre_usuario,
      apellido_usuario,
      rol
    });

    const updatedUser = await usersService.updateUserFirstLogin(id, {
      programa_academico,
      sede,                // Agregado sede
      documento_usuario,
      tipoDoc,
      telefono,
      fecha_nac,
      email,
      correo_usuario,      // Agregado correo_usuario
      nombre_usuario,    
      apellido_usuario,  
      rol                
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

/**
 * Obtiene todos los usuarios
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await usersService.getAllUsers();

    res.status(200).json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error al obtener todos los usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios',
      details: error.message
    });
  }
};

/**
 * Crea un usuario manualmente desde el panel de administración
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const createUserFromAdmin = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      documentType,
      documentNumber,
      phone,
      email,
      role,
      birthDate,
      program,
      sede
    } = req.body;

    // Validación básica
    if (!firstName || !lastName || !documentType || !documentNumber || !phone || !email || !role || !birthDate || !program || !sede) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      });
    }

    // Construir el objeto de usuario para el servicio
    const newUserData = {
      nombre: firstName,
      apellido: lastName,
      tipoDoc: documentType,
      documento: documentNumber,
      telefono: phone,
      email,
      rol: role,
      fecha_nac: birthDate,
      programa_academico: program,
      sede
    };

    const createdUser = await usersService.createUserFromAdmin(newUserData);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: createdUser
    });
  } catch (error) {
    console.error('Error al crear usuario desde admin:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear usuario',
      details: error.message
    });
  }
};

module.exports = {
  saveUser,
  getUserById,
  updateFirstLogin,
  getAllUsers,
  createUserFromAdmin
};