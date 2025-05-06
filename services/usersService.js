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
 * Busca un usuario por su ID (Implementación actual parece correcta)
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>} - Datos del usuario o null si no existe
 */
exports.findUserById = async (userId) => {
  try {
    // Esta implementación busca directamente en las primeras columnas, podría ser suficiente
    // o podrías cambiarla para usar usersRepository.findOneBy('id_usuario', userId);
    const client = sheetsService.getClient();
    const response = await client.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      // Ajustar el rango si necesitas más columnas al buscar por ID
      range: 'USUARIOS!A2:L', // Leer todas las columnas definidas
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row => row[0] === String(userId)); // Asegurar comparación de strings
    
    if (!userRow) return null;

    // Mapear la fila completa al objeto usuario basado en HEADERS
    const user = {};
    const HEADERS = [ // Replicar o importar HEADERS de usersRepository
      'id_usuario', 'correo_usuario', 'nombre_usuario', 'apellido_usuario',
      'documento_usuario', 'tipoDoc', 'telefono', 'direccion', 
      'observaciones', 'fecha_nac', 'email', 'rol'
    ];
    HEADERS.forEach((header, index) => {
      user[header] = userRow[index] || '';
    });
    return user;

  } catch (error) {
    console.error('Error buscando usuario por ID:', error);
    throw error; // Re-lanzar para que el controlador lo maneje
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
      email: '', // Este es el campo 'email' de tu hoja, no el correo_usuario. Se deja vacío por defecto.
      rol: 'estudiante'
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
    // Buscar si el usuario ya existe por correo electrónico
    const existingUser = await this.findUserByEmail(googleUserData.email);
    
    // Si existe, devolver el usuario existente (asegurándose de que tenga id_usuario)
    if (existingUser && existingUser.id_usuario) {
      console.log('findOrCreateUser - Usuario encontrado:', existingUser);
      // Podríamos querer actualizar algún dato si cambió en Google? Por ahora no.
      // Asegurarse de devolver el objeto completo si findUserByEmail no lo hace
       if (!existingUser.rol) { // Ejemplo: si falta el rol
           const fullExistingUser = await this.findUserById(existingUser.id_usuario);
           return fullExistingUser || existingUser; // Devolver el completo si se encontró, si no, el original
       }
      return existingUser;
    }
    
    console.log('findOrCreateUser - Usuario no encontrado, creando...');
    // Si no existe, crear nuevo usuario
    const newUser = await this.createUser(googleUserData);
    console.log('findOrCreateUser - Nuevo usuario creado:', newUser);
    return newUser;

  } catch (error) {
    console.error('Error en findOrCreateUser:', error);
    // Podrías devolver un objeto de error específico o lanzar el error
    throw new Error(`Error procesando usuario ${googleUserData.email}: ${error.message}`);
  }
};