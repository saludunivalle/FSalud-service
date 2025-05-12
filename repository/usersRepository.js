// repository/usersRepository.js
const { BaseRepository } = require('./baseRepository');
const { generateUserId } = require('../utils/idGenerator'); // generateUserId ya no se usa aquí directamente

const HEADERS = [
  'id_usuario', 'correo_usuario', 'nombre_usuario', 'apellido_usuario',
  'programa_academico', 'documento_usuario', 'tipoDoc', 'telefono', 'direccion', 
  'observaciones', 'fecha_nac', 'email', 'rol', 'admin', 'primer_login'
];

class UsersRepository extends BaseRepository {
  constructor() {
    super('USUARIOS', HEADERS);
  }
  
  /**
   * Crea un nuevo usuario. Asume que userData ya incluye un id_usuario válido.
   * @param {Object} userData - Datos del usuario (debe incluir id_usuario)
   * @returns {Promise<Object>} - Usuario creado
   */
  async createUser(userData) {
    try {
      // Validar que el ID viene del servicio
      if (!userData.id_usuario) {
        // Si no viene ID, es un error de lógica interna, no deberíamos generar uno aquí.
        console.error('Error Crítico: createUser en Repository llamado sin id_usuario.');
        throw new Error('Falta id_usuario al intentar crear el registro en el repositorio.');
      }
      
      // Asegurar que el ID sea un string (aunque el servicio ya debería hacerlo)
      userData.id_usuario = String(userData.id_usuario);
      
      // Log para verificar el ID justo antes de pasarlo al BaseRepository
      console.log('UsersRepository - Preparando para crear con ID:', userData.id_usuario);
      
      // Asegurarnos que todos los campos definidos en HEADERS existen, aunque sea vacíos
      const completeUserData = {};
      HEADERS.forEach(header => {
        completeUserData[header] = userData[header] !== undefined && userData[header] !== null 
                                    ? String(userData[header]) // Asegurar que todo sea string
                                    : ''; 
      });

      // Llamar al método create del BaseRepository
      return await this.create(completeUserData);
      
    } catch (error) {
      console.error('Error en UsersRepository.createUser:', error);
      // Re-lanzar el error para que sea manejado por capas superiores
      throw error; 
    }
  }

  /**
   * Encuentra un usuario por su correo electrónico
   * @param {string} email - Correo electrónico del usuario
   * @returns {Promise<Object|null>} - Usuario encontrado o null
   */
  async findByEmail(email) {
    // Asegúrate de que findOneBy esté implementado en BaseRepository o aquí
    return this.findOneBy('correo_usuario', email); 
  }
}

module.exports = new UsersRepository();