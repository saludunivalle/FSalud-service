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
      range: 'USUARIOS!A2:N', 
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row => row[0] === String(userId)); 
    
    if (!userRow) return null;

    const user = {};
    const HEADERS = [ 
      'id_usuario', 'correo_usuario', 'nombre_usuario', 'apellido_usuario',
      'programa_academico', 'documento_usuario', 'tipoDoc', 'telefono', 
      'observaciones', 'fecha_nac', 'email', 'rol', 'admin', 'primer_login'
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
    
    // Preparar datos para actualización con todos los campos relevantes
    const updateData = {
      // Asegurarse de que todos los campos necesarios estén presentes
      programa_academico: data.programa_academico,
      documento_usuario: data.documento_usuario,
      tipoDoc: data.tipoDoc,
      telefono: data.telefono,
      fecha_nac: data.fecha_nac,
      email: data.email,
      correo_usuario: data.correo_usuario || data.email,
      rol: data.rol || 'estudiante',
      primer_login: 'si'  // Han completado el formulario, así que se establece en 'si'
    };
    
    // Incluir campos de nombre si están proporcionados
    if (data.nombre_usuario) updateData.nombre_usuario = data.nombre_usuario;
    if (data.apellido_usuario) updateData.apellido_usuario = data.apellido_usuario;
    
    console.log(`Datos finales de actualización para el usuario ${userId}:`, updateData);
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
 * Busca un usuario por correo, si no existe lo crea
 * @param {Object} googleUserData - Datos del usuario de Google { googleId, email, name }
 * @returns {Promise<Object>} - Usuario encontrado o creado
 */
exports.findOrCreateUser = async (googleUserData) => {
  try {
    console.log('findOrCreateUser - Buscando email:', googleUserData.email);
    const existingUserByEmail = await this.findUserByEmail(googleUserData.email); // This returns partial data {id_usuario, correo_usuario, nombre_usuario}
    
    if (existingUserByEmail && existingUserByEmail.id_usuario) {
      console.log('findOrCreateUser - Usuario encontrado por email, obteniendo detalles completos para ID:', existingUserByEmail.id_usuario);
      // Fetch the full user details to ensure all fields, including primer_login, are present
      const fullExistingUser = await this.findUserById(existingUserByEmail.id_usuario);
      if (fullExistingUser) {
        console.log('findOrCreateUser - Detalles completos del usuario existente:', fullExistingUser);
        return fullExistingUser;
      } else {
        // This case implies an inconsistency if an ID was found by email but not by ID.
        // Log a warning and proceed to create, though this might indicate a deeper issue.
        console.warn(`findOrCreateUser - Usuario con ID ${existingUserByEmail.id_usuario} no encontrado por findUserById. Se intentará crear el usuario.`);
        // Fall through to create the user.
      }
    }
    
    console.log('findOrCreateUser - Usuario no encontrado por email o detalles completos no recuperados, creando nuevo usuario...');
    const newUser = await this.createUser(googleUserData); // createUser sets primer_login: 'no'
    console.log('findOrCreateUser - Nuevo usuario creado:', newUser);
    return newUser;

  } catch (error) {
    console.error('Error en findOrCreateUser:', error);
    throw new Error(`Error procesando usuario ${googleUserData.email}: ${error.message}`);
  }
};