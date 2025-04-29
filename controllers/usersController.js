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
  getUserById // Añadir a las exportaciones
};