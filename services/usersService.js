// services/userService.js
const sheetsRepository = require('../repository/sheetsRepository');
const { v4: uuidv4 } = require('uuid');

/**
 * Busca un usuario por correo electrónico
 * @param {string} email - Correo electrónico del usuario
 * @returns {Object|null} - Datos del usuario o null si no existe
 */
exports.findUserByEmail = async (email) => {
  try {
    const users = await sheetsRepository.getUsers();
    return users.find(user => user.correo_usuario === email) || null;
  } catch (error) {
    console.error('Error buscando usuario por email:', error);
    throw error;
  }
};

/**
 * Busca un usuario por su ID
 * @param {string} userId - ID del usuario
 * @returns {Object|null} - Datos del usuario o null si no existe
 */
exports.findUserById = async (userId) => {
  try {
    const users = await sheetsRepository.getUsers();
    return users.find(user => user.id_usuario === userId) || null;
  } catch (error) {
    console.error('Error buscando usuario por ID:', error);
    throw error;
  }
};

/**
 * Crea un nuevo usuario en la base de datos
 * @param {Object} userData - Datos del usuario a crear
 * @returns {Object} - Usuario creado
 */
exports.createUser = async (userData) => {
  try {
    const newUser = {
      id_usuario: uuidv4(),
      correo_usuario: userData.email,
      nombre_usuario: userData.name.split(' ')[0] || '',
      apellido_usuario: userData.name.split(' ').slice(1).join(' ') || '',
      rol: 'estudiante', // Rol por defecto
      // Otros campos pueden ser nulos inicialmente
    };
    
    await sheetsRepository.addUser(newUser);
    return newUser;
  } catch (error) {
    console.error('Error creando usuario:', error);
    throw error;
  }
};

/**
 * Busca un usuario por correo, si no existe lo crea
 * @param {Object} googleUserData - Datos del usuario de Google
 * @returns {Object} - Usuario encontrado o creado
 */
exports.findOrCreateUser = async (googleUserData) => {
  try {
    // Buscar si el usuario ya existe
    const existingUser = await this.findUserByEmail(googleUserData.email);
    
    // Si existe, devolver el usuario existente
    if (existingUser) {
      return existingUser;
    }
    
    // Si no existe, crear nuevo usuario
    return await this.createUser(googleUserData);
  } catch (error) {
    console.error('Error en findOrCreateUser:', error);
    throw error;
  }
};