// services/usersService.js
// *** Importar el repositorio en lugar de sheetsService directamente para crear ***
const usersRepository = require('../repository/usersRepository'); 
const sheetsService = require('./sheetsService'); // Aún necesario para findUserByEmail

/**
 * Busca un usuario por correo electrónico
 * @param {string} email - Correo electrónico del usuario
 * @returns {Promise<Object|null>} - Datos del usuario o null si no existe
 */
exports.findUserByEmail = async (email) => {
  try {
    // Usar el método del repositorio si existe, o mantener el de sheetsService si es más directo
    // return await usersRepository.findByEmail(email); // Opción 1: Usar repositorio
    return await sheetsService.findUserByEmail(email); // Opción 2: Mantener sheetsService para búsqueda simple
  } catch (error) {
    console.error('Error buscando usuario por email:', error);
    // Decidir si lanzar el error o devolver null/objeto vacío
    return null; // Devolver null si no se encuentra o hay error
  }
};

/**
 * Busca un usuario por su ID
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>} - Datos del usuario o null si no existe
 */
exports.findUserById = async (userId) => {
  try {
    const client = sheetsService.getClient();
    const response = await client.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'USUARIOS!A2:O', 
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row => row[0] === String(userId)); 
    
    if (!userRow) return null;

    const user = {};
    const HEADERS = [ 
      'id_usuario', 'correo_usuario', 'nombre_usuario', 'apellido_usuario',
      'programa_academico', 'documento_usuario', 'tipoDoc', 'telefono', 
      'direccion', 'observaciones', 'fecha_nac', 'email', 'rol', 'admin', 'primer_login'
    ];
    HEADERS.forEach((header, index) => {
      user[header] = userRow[index] || (header === 'primer_login' ? 'no' : '');
    });

    // Si el correo del usuario está en la columna admin, asignar rol profesor
    if (user.admin && user.admin.trim() === user.correo_usuario) {
      user.rol = 'profesor';
    }

    return user;
  } catch (error) {
    console.error('Error buscando usuario por ID:', error);
    throw error; 
  }
};

/**
 * Actualiza la información del primer inicio de sesión del usuario
 * @param {string} userId - ID del usuario
 * @param {Object} data - Datos para actualizar (programa_academico, documento_usuario, tipoDoc, telefono, direccion, fecha_nac, email)
 * @returns {Promise<Object>} - Usuario actualizado
 */
exports.updateUserFirstLogin = async (userId, data) => {
  try {
    console.log(`Actualizando primer inicio de sesión para usuario ${userId} con datos:`, data);
    
    // Actualizar campos requeridos si los nuevos son obligatorios
    const requiredFields = [
      'programa_academico', 'documento_usuario', 'tipoDoc', 'telefono', 
      'direccion', 'fecha_nac', 'email' 
    ];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
    }
    
    // Preparar datos para actualización
    const updateData = {
      programa_academico: data.programa_academico,
      documento_usuario: data.documento_usuario,
      tipoDoc: data.tipoDoc,
      telefono: data.telefono,
      direccion: data.direccion,         // Nuevo
      fecha_nac: data.fecha_nac,         // Nuevo
      email: data.email,                 // Nuevo (email personal)
      primer_login: 'si'                 // Marcar que ya completó el primer login
    };
    
    // Actualizar usuario
    const updatedUser = await usersRepository.update('id_usuario', userId, updateData);
    
    if (!updatedUser) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }
    
    console.log(`Primer inicio de sesión actualizado exitosamente para usuario ${userId}`);
    return updatedUser;
  } catch (error) {
    console.error(`Error actualizando primer inicio de sesión: ${error.message}`);
    throw error;
  }
};

/**
 * Crea un nuevo usuario en la base de datos usando el repositorio
 * @param {Object} googleUserData - Datos del usuario de Google { googleId, email, name }
 * @returns {Promise<Object>} - Usuario creado
 */
exports.createUser = async (googleUserData) => {
  try {
    console.log('[usersService.createUser] Iniciando creación de usuario. Datos de Google recibidos:', JSON.stringify(googleUserData, null, 2));

    const nameParts = googleUserData.name ? googleUserData.name.split(' ') : [''];
    const nombre = nameParts[0] || '';
    const apellido = nameParts.slice(1).join(' ') || '';

    if (!googleUserData.googleId) {
      console.error('[usersService.createUser] ERROR CRÍTICO: googleUserData.googleId está indefinido o es nulo.');
      throw new Error('No se pudo obtener el ID de Google para crear el usuario.');
    }

    const newUser = {
      id_usuario: String(googleUserData.googleId),
      correo_usuario: googleUserData.email,
      nombre_usuario: nombre,
      apellido_usuario: apellido,
      documento_usuario: '',
      tipoDoc: '',
      telefono: '',
      direccion: '',
      observaciones: '',
      fecha_nac: '',
      email: '', 
      rol: 'estudiante',
      primer_login: 'no' // Correctly set for new users
    };

    console.log('[usersService.createUser] Objeto newUser construido para el repositorio:', JSON.stringify(newUser, null, 2));

    const createdUser = await usersRepository.createUser(newUser);
    
    console.log('[usersService.createUser] Respuesta del repositorio usersRepository.createUser:', JSON.stringify(createdUser, null, 2));
    return createdUser;

  } catch (error) {
    console.error('[usersService.createUser] Error detallado:', error.message, error.stack);
    // Si el error tiene una respuesta de Google API, muéstrala
    if (error.response && error.response.data && error.response.data.error) {
        console.error('[usersService.createUser] Google API Error Details:', JSON.stringify(error.response.data.error, null, 2));
    }
    throw error; 
  }
};

/**
 * Busca un usuario por correo o lo crea si no existe
 * @param {Object} googleUserData - Datos del usuario de Google
 * @returns {Promise<Object>} - Usuario encontrado o creado
 */
exports.findOrCreateUser = async (googleUserData) => {
  try {
    console.log('findOrCreateUser - Buscando email:', googleUserData.email);
    
    // 1. Buscamos primero por email (que es único y consistente)
    const existingUserByEmail = await this.findUserByEmail(googleUserData.email);
    
    if (existingUserByEmail) {
      console.log('findOrCreateUser - Usuario encontrado por email:', existingUserByEmail);
      
      // 2. Obtenemos los detalles completos incluyendo primer_login
      const fullUserDetails = await this.findUserById(existingUserByEmail.id_usuario);
      
      if (fullUserDetails) {
        // 3. Verificamos si el ID de Firebase ha cambiado y lo actualizamos si es necesario
        if (fullUserDetails.firebase_uid !== googleUserData.googleId) {
          console.log(`Actualizando ID de Firebase para usuario ${fullUserDetails.id_usuario}`);
          // Aquí deberíamos tener un método para actualizar el ID, pero como no existe aún,
          // simplemente lo ignoramos por ahora
        }
        
        return fullUserDetails;
      }
    }
    
    // 4. Si no existe, creamos un nuevo usuario
    console.log('findOrCreateUser - Usuario no encontrado, creando nuevo...');
    const newUser = await this.createUser(googleUserData);
    return newUser;
  } catch (error) {
    console.error('Error en findOrCreateUser:', error);
    throw error;
  }
};