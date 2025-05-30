// repository/usersRepository.js
const { BaseRepository } = require('./baseRepository');
const { generateUserId } = require('../utils/idGenerator'); // generateUserId ya no se usa aquí directamente

// Update the headers array to match exactly with your Google Sheet columns
const HEADERS = [
  'id_usuario', 
  'correo_usuario', 
  'nombre_usuario', 
  'apellido_usuario',
  'programa_academico', 
  'sede',
  'documento_usuario', 
  'tipoDoc', 
  'telefono', 
  'fecha_nac', 
  'email', 
  'rol', 
  'primer_login'
];

class UsersRepository extends BaseRepository {
  constructor() {
    super('USUARIOS', HEADERS);
    // Additional initialization if needed
  }
  
  /**
   * Crea un nuevo usuario. Asume que userData ya incluye un id_usuario válido.
   * @param {Array} userData - Array con los datos del usuario en el orden correcto
   * @returns {Promise<Object>} - Usuario creado
   */
  async createUser(userData) {
    try {
      // Validar que el ID viene del servicio
      if (!userData[0]) {
        console.error('Error Crítico: createUser en Repository llamado sin id_usuario.');
        throw new Error('Falta id_usuario al intentar crear el registro en el repositorio.');
      }
      
      // Asegurar que el ID sea un string
      userData[0] = String(userData[0]);
      
      // Log para verificar el ID justo antes de pasarlo al BaseRepository
      console.log('UsersRepository - Preparando para crear con ID:', userData[0]);
      
      // Convertir el array a objeto para el BaseRepository
      const userObject = {};
      HEADERS.forEach((header, index) => {
        userObject[header] = userData[index] !== undefined && userData[index] !== null 
                            ? String(userData[index]) // Asegurar que todo sea string
                            : ''; 
      });

      // Llamar al método create del BaseRepository
      return await this.create(userObject);
      
    } catch (error) {
      console.error('Error en UsersRepository.createUser:', error);
      throw error; 
    }
  }

  /**
   * Actualiza un usuario existente
   * @param {string} field - Campo para buscar el usuario
   * @param {string} value - Valor del campo
   * @param {Array} updateData - Array con los datos actualizados en el orden correcto
   * @returns {Promise<Object>} - Usuario actualizado
   */
  async update(field, value, updateData) {
    try {
      console.log('UsersRepository.update - Datos recibidos:', {
        field,
        value,
        updateData
      });

      // Convertir el array a objeto para el BaseRepository
      const updateObject = {};
      HEADERS.forEach((header, index) => {
        updateObject[header] = updateData[index] !== undefined && updateData[index] !== null 
                            ? String(updateData[index]) // Asegurar que todo sea string
                            : ''; 
      });

      console.log('UsersRepository.update - Objeto convertido:', updateObject);

      // Llamar al método update del BaseRepository
      const result = await super.update(field, value, updateObject);
      
      console.log('UsersRepository.update - Resultado:', result);
      return result;
    } catch (error) {
      console.error('Error en UsersRepository.update:', error);
      throw error;
    }
  }

  /**
   * Encuentra un usuario por su correo electrónico
   * @param {string} email - Correo electrónico del usuario
   * @returns {Promise<Object|null>} - Usuario encontrado o null
   */
  async findByEmail(email) {
    return this.findOneBy('correo_usuario', email); 
  }
}

module.exports = new UsersRepository();