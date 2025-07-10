// services/usersService.js
// *** Importar el repositorio en lugar de sheetsService directamente para crear ***
const usersRepository = require('../repository/usersRepository'); 
const sheetsService = require('./sheetsService'); // Aún necesario para findUserByEmail
const { generateUserId } = require('../utils/idGenerator');

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
    
    // Primero buscar en la hoja USUARIOS
    const usersResponse = await client.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'USUARIOS!A2:M', 
    });

    const usersRows = usersResponse.data.values || [];
    const userRow = usersRows.find(row => row[0] === String(userId)); 
    
    if (userRow) {
      const user = {};
      const HEADERS = [ 
        'id_usuario', 'correo_usuario', 'nombre_usuario', 'apellido_usuario',
        'programa_academico', 'sede','documento_usuario', 'tipoDoc', 'telefono', 
        'fecha_nac', 'email', 'rol', 'primer_login'
      ];
      HEADERS.forEach((header, index) => {
        user[header] = userRow[index] || (header === 'primer_login' ? 'no' : '');
      });

      return user;
    }

    // Si no se encuentra en USUARIOS, buscar en ADMINISTRADORES
    const adminsResponse = await client.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'ADMINISTRADORES!A2:F', 
    });

    const adminsRows = adminsResponse.data.values || [];
    const adminRow = adminsRows.find(row => row[0] === String(userId)); 
    
    if (adminRow) {
      const admin = {
        id_usuario: adminRow[0] || '',
        correo_usuario: adminRow[1] || '',
        nombre_usuario: adminRow[2] || '',
        apellido_usuario: adminRow[3] || '',
        programa_academico: '',
        sede: '',
        documento_usuario: '',
        tipoDoc: '',
        telefono: '',
        fecha_nac: '',
        email: '',
        rol: 'admin',
        primer_login: 'si'
      };

      return admin;
    }

    return null;
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
    
    // Preparar datos para actualización en el orden correcto de las columnas
    const updateData = [
      userId,                             // id_usuario
      data.correo_usuario || data.email,  // correo_usuario
      data.nombre_usuario,                // nombre_usuario
      data.apellido_usuario,              // apellido_usuario
      data.programa_academico,            // programa_academico
      data.sede,                          // sede
      data.documento_usuario,             // documento_usuario
      data.tipoDoc,                       // tipoDoc
      data.telefono,                      // telefono
      data.fecha_nac,                     // fecha_nac
      data.email,                         // email
      data.rol || 'estudiante',           // rol
      'si'                                // primer_login
    ];
    
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
 * Verifica si un email está en la lista de admins del Google Sheets
 * @param {string} email - Email a verificar
 * @returns {Promise<boolean>} - true si el email está en la columna admin
 */
exports.isEmailAdmin = async (email) => {
  try {
    console.log(`[isEmailAdmin] Verificando si ${email} es admin...`);
    const client = sheetsService.getClient();
    const response = await client.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'ADMINISTRADORES!F2:F', // Columna correo_admin (F)
    });

    console.log(`[isEmailAdmin] Respuesta de Google Sheets para correos admin:`, JSON.stringify(response.data, null, 2));
    
    const adminEmails = response.data.values || [];
    const isAdmin = adminEmails.some(row => row[0] && row[0].trim().toLowerCase() === email.toLowerCase());
    
    console.log(`[isEmailAdmin] Email ${email} ${isAdmin ? 'SÍ' : 'NO'} está en la lista de admins`);
    
    return isAdmin;
  } catch (error) {
    console.error('[isEmailAdmin] Error verificando si email es admin:', error);
    return false;
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

    // Verificar si el usuario debe ser admin
    const isAdmin = await this.isEmailAdmin(googleUserData.email);
    console.log(`[usersService.createUser] Usuario ${googleUserData.email} ${isAdmin ? 'SÍ' : 'NO'} es admin`);

    if (isAdmin) {
      // Si es admin, crear en la hoja ADMINISTRADORES
      const client = sheetsService.getClient();
      
      // Primero buscar la fila donde está el correo_admin
      const response = await client.spreadsheets.values.get({
        spreadsheetId: sheetsService.spreadsheetId,
        range: 'ADMINISTRADORES!A2:F',
      });

      const rows = response.data.values || [];
      const adminRowIndex = rows.findIndex(row => row[5] && row[5].trim().toLowerCase() === googleUserData.email.toLowerCase());
      
      if (adminRowIndex === -1) {
        throw new Error(`No se encontró el correo admin ${googleUserData.email} en la hoja ADMINISTRADORES`);
      }

      // Preparar los datos del admin
      const adminData = [
        String(googleUserData.googleId), // id_usuario
        googleUserData.email,           // correo_usuario
        nombre,                         // nombre_usuario
        apellido,                       // apellido_usuario
        'admin',                        // rol
        googleUserData.email            // correo_admin (mantener el correo en esta columna)
      ];

      // Actualizar la fila existente
      await client.spreadsheets.values.update({
        spreadsheetId: sheetsService.spreadsheetId,
        range: `ADMINISTRADORES!A${adminRowIndex + 2}:F${adminRowIndex + 2}`,
        valueInputOption: 'RAW',
        resource: { values: [adminData] }
      });

      return {
        id_usuario: String(googleUserData.googleId),
        correo_usuario: googleUserData.email,
        nombre_usuario: nombre,
        apellido_usuario: apellido,
        rol: 'admin',
        primer_login: 'si'
      };
    }

    // Si no es admin, crear en la hoja USUARIOS
    const newUser = [
      String(googleUserData.googleId),    // A - id_usuario
      googleUserData.email,               // B - correo_usuario
      nombre,                             // C - nombre_usuario
      apellido,                           // D - apellido_usuario
      '',                                 // E - programa_academico
      '',                                 // F - sede
      '',                                 // G - documento_usuario
      '',                                 // H - tipoDoc
      '',                                 // I - telefono
      '',                                 // J - fecha_nac
      '',                                 // K - email
      'estudiante',                       // L - rol
      'no'                                // M - primer_login
    ];

    console.log('[usersService.createUser] Datos de usuario para crear:', newUser);

    const createdUser = await usersRepository.createUser(newUser);
    
    console.log('[usersService.createUser] Respuesta del repositorio usersRepository.createUser:', JSON.stringify(createdUser, null, 2));
    
    if (!createdUser || !createdUser.id_usuario) {
      throw new Error('El usuario no fue creado correctamente en el repositorio');
    }
    
    return createdUser;

  } catch (error) {
    console.error('[usersService.createUser] Error detallado:', error.message, error.stack);
    if (error.response && error.response.data && error.response.data.error) {
        console.error('[usersService.createUser] Google API Error Details:', JSON.stringify(error.response.data.error, null, 2));
    }
    throw error; 
  }
};

/**
 * Actualiza automáticamente los datos básicos de un usuario admin
 * @param {string} userId - ID del usuario
 * @param {Object} googleUserData - Datos del usuario de Google
 * @returns {Promise<Object>} - Usuario actualizado
 */
exports.updateAdminUserData = async (userId, googleUserData) => {
  try {
    console.log(`Actualizando datos de admin para usuario ${userId} con datos de Google:`, googleUserData);
    
    const nameParts = googleUserData.name ? googleUserData.name.split(' ') : [''];
    const nombre = nameParts[0] || '';
    const apellido = nameParts.slice(1).join(' ') || '';
    
    const client = sheetsService.getClient();
    
    // Primero buscar la fila del admin
    const response = await client.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'ADMINISTRADORES!A2:E',
    });

    const rows = response.data.values || [];
    const adminRowIndex = rows.findIndex(row => row[0] === String(userId));
    
    if (adminRowIndex === -1) {
      throw new Error(`Usuario admin con ID ${userId} no encontrado para actualizar`);
    }

    // Preparar los datos actualizados
    const adminData = [
      String(googleUserData.googleId), // id_usuario
      googleUserData.email,           // correo_usuario
      nombre,                         // nombre_usuario
      apellido,                       // apellido_usuario
      'admin'                         // rol
    ];

    // Actualizar la fila del admin
    await client.spreadsheets.values.update({
      spreadsheetId: sheetsService.spreadsheetId,
      range: `ADMINISTRADORES!A${adminRowIndex + 2}:E${adminRowIndex + 2}`,
      valueInputOption: 'RAW',
      resource: { values: [adminData] }
    });
    
    const updatedAdmin = {
      id_usuario: String(googleUserData.googleId),
      correo_usuario: googleUserData.email,
      nombre_usuario: nombre,
      apellido_usuario: apellido,
      rol: 'admin',
      primer_login: 'si'
    };
    
    console.log(`Datos de admin actualizados exitosamente para usuario ${userId}`);
    return updatedAdmin;
  } catch (error) {
    console.error(`Error actualizando datos de admin: ${error.message}`);
    throw error;
  }
};

/**
 * Busca la fila que contiene un email en la columna admin pero sin datos de usuario
 * @param {string} email - Email a buscar
 * @returns {Promise<number>} - Índice de la fila (0-based) o -1 si no se encuentra
 */
exports.findAdminRowByEmail = async (email) => {
  try {
    console.log(`[findAdminRowByEmail] Buscando fila vacía con email admin: ${email}`);
    const client = sheetsService.getClient();
    const response = await client.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'USUARIOS!A2:M', // Todas las columnas desde fila 2
    });

    const rows = response.data.values || [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Verificar si la fila tiene el email en columna admin (índice 12) pero no tiene id_usuario (índice 0)
      if (row[12] && row[12].trim() === email && (!row[0] || row[0].trim() === '')) {
        console.log(`[findAdminRowByEmail] Encontrada fila vacía en posición ${i + 2} (fila del sheet) con email admin: ${email}`);
        return i + 2; // +2 porque las filas en sheets empiezan en 1 y saltamos el header
      }
    }
    
    console.log(`[findAdminRowByEmail] No se encontró fila vacía con email admin: ${email}`);
    return -1;
  } catch (error) {
    console.error('[findAdminRowByEmail] Error buscando fila admin:', error);
    return -1;
  }
};

/**
 * Rellena una fila existente que tiene email en columna admin con datos del usuario
 * @param {number} rowIndex - Índice de la fila en el sheet (1-based)
 * @param {Object} googleUserData - Datos del usuario de Google
 * @returns {Promise<Object>} - Usuario actualizado
 */
exports.fillAdminRow = async (rowIndex, googleUserData) => {
  try {
    console.log(`[fillAdminRow] Rellenando fila ${rowIndex} con datos de admin:`, googleUserData);
    
    const nameParts = googleUserData.name ? googleUserData.name.split(' ') : [''];
    const nombre = nameParts[0] || '';
    const apellido = nameParts.slice(1).join(' ') || '';
    
    const client = sheetsService.getClient();
    
    // Preparar los datos para todas las columnas
    const values = [
      String(googleUserData.googleId), // id_usuario
      googleUserData.email,           // correo_usuario  
      nombre,                         // nombre_usuario
      apellido,                       // apellido_usuario
      '',                            // programa_academico
      '',                            // sede
      '',                            // documento_usuario
      '',                            // tipoDoc
      '',                            // telefono
      '',                            // fecha_nac
      '',                            // email
      'admin',                       // rol
      'si'                           // primer_login
    ];
    
    // Actualizar la fila específica
    const response = await client.spreadsheets.values.update({
      spreadsheetId: sheetsService.spreadsheetId,
      range: `USUARIOS!A${rowIndex}:M${rowIndex}`,
      valueInputOption: 'RAW',
      resource: { values: [values] }
    });
    
    console.log(`[fillAdminRow] Fila ${rowIndex} actualizada exitosamente:`, response.data);
    
    // Construir el objeto de usuario para retornar
    const HEADERS = [ 
      'id_usuario', 'correo_usuario', 'nombre_usuario', 'apellido_usuario',
      'programa_academico', 'sede', 'documento_usuario', 'tipoDoc', 'telefono', 
      'fecha_nac', 'email', 'rol', 'primer_login'
    ];
    
    const user = {};
    HEADERS.forEach((header, index) => {
      user[header] = values[index] || '';
    });
    
    console.log(`[fillAdminRow] Usuario admin creado/actualizado en fila existente:`, user);
    return user;
    
  } catch (error) {
    console.error('[fillAdminRow] Error rellenando fila admin:', error);
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
    console.log('[findOrCreateUser] Buscando email:', googleUserData.email);
    
    // Primero verificar si el email está en la lista de admins
    const isEmailInAdminList = await this.isEmailAdmin(googleUserData.email);
    console.log(`[findOrCreateUser] Email ${googleUserData.email} ${isEmailInAdminList ? 'SÍ' : 'NO'} está en lista de admins`);
    
    const existingUserByEmail = await this.findUserByEmail(googleUserData.email);
    console.log(`[findOrCreateUser] Resultado de findUserByEmail:`, existingUserByEmail);
    
    if (existingUserByEmail && existingUserByEmail.id_usuario) {
      console.log('[findOrCreateUser] Usuario encontrado por email, obteniendo detalles completos para ID:', existingUserByEmail.id_usuario);
      
      // Verificar si el usuario es admin (correo en columna admin)
      const isAdmin = existingUserByEmail.admin && existingUserByEmail.admin.trim() === existingUserByEmail.correo_usuario;
      
      if (isAdmin || isEmailInAdminList) {
        console.log('[findOrCreateUser] Usuario detectado como admin, actualizando datos automáticamente...');
        // Actualizar automáticamente los datos del admin con información de Google
        const updatedAdminUser = await this.updateAdminUserData(existingUserByEmail.id_usuario, googleUserData);
        return updatedAdminUser;
      } else {
        // Para usuarios no admin, seguir el flujo normal
        const fullExistingUser = await this.findUserById(existingUserByEmail.id_usuario);
        if (fullExistingUser) {
          console.log('[findOrCreateUser] Detalles completos del usuario existente:', fullExistingUser);
          return fullExistingUser;
        } else {
          console.warn(`[findOrCreateUser] Usuario con ID ${existingUserByEmail.id_usuario} no encontrado por findUserById. Se intentará crear el usuario.`);
        }
      }
    }
    
    // Si no se encontró usuario existente, verificar si debe ser admin antes de crear
    if (isEmailInAdminList) {
      console.log('[findOrCreateUser] Email está en lista de admins, verificando si existe fila vacía con este email...');
      
      // Buscar si hay una fila en el sheets que tenga este email en la columna admin pero sin datos de usuario
      const adminRowIndex = await this.findAdminRowByEmail(googleUserData.email);
      if (adminRowIndex !== -1) {
        console.log(`[findOrCreateUser] Encontrada fila vacía con email admin en posición ${adminRowIndex}, actualizando esa fila...`);
        return await this.fillAdminRow(adminRowIndex, googleUserData);
      } else {
        console.log('[findOrCreateUser] No se encontró fila vacía, creando nueva fila como admin...');
      }
    } else {
      console.log('[findOrCreateUser] Email no está en lista de admins, creando usuario regular...');
    }
    
    const newUser = await this.createUser(googleUserData);
    console.log('[findOrCreateUser] Nuevo usuario creado:', newUser);
    return newUser;

  } catch (error) {
    console.error('[findOrCreateUser] Error en findOrCreateUser:', error);
    throw new Error(`Error procesando usuario ${googleUserData.email}: ${error.message}`);
  }
};

/**
 * Obtiene todos los usuarios de la hoja USUARIOS únicamente
 * @returns {Promise<Array>} - Lista de usuarios (sin administradores)
 */
exports.getAllUsers = async () => {
  try {
    const client = sheetsService.getClient();
    
    // Obtener usuarios de la hoja USUARIOS únicamente
    const usersResponse = await client.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'USUARIOS!A2:M', 
    }); 

    const usersRows = usersResponse.data.values || [];
    const users = usersRows.map(row => {
      const user = {};
      const HEADERS = [ 
        'id_usuario', 'correo_usuario', 'nombre_usuario', 'apellido_usuario',
        'programa_academico', 'sede', 'documento_usuario', 'tipoDoc', 'telefono', 
        'fecha_nac', 'email', 'rol', 'primer_login'
      ];
      
      HEADERS.forEach((header, index) => {
        user[header] = row[index] || (header === 'primer_login' ? 'no' : '');
      });

      return user;
    }).filter(user => user.id_usuario && user.id_usuario.trim() !== ''); // Filtrar filas vacías

    console.log(`[getAllUsers] Encontrados ${users.length} usuarios (solo de hoja USUARIOS)`);
    
    return users;
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    throw error; 
  }
};

/**
 * Crea un usuario manualmente desde el panel de administración
 * @param {Object} userData - Datos del usuario
 * @returns {Promise<Object>} - Usuario creado
 */
exports.createUserFromAdmin = async (userData) => {
  try {
    // Generar ID único usando el mismo sistema que el registro regular
    const id_usuario = generateUserId();
    const {
      nombre,
      apellido,
      tipoDoc,
      documento,
      telefono,
      email,
      rol,
      fecha_nac,
      programa_academico,
      sede
    } = userData;

    // Preparar el array para la hoja USUARIOS (mismo formato que createUser)
    // NOTA: Al ser creado por admin, primer_login = 'si' para evitar FirstLoginForm
    const newUser = [
      id_usuario,           // A - id_usuario
      email,                // B - correo_usuario
      nombre,               // C - nombre_usuario
      apellido,             // D - apellido_usuario
      programa_academico,   // E - programa_academico
      sede,                 // F - sede
      documento,            // G - documento_usuario
      tipoDoc,              // H - tipoDoc
      telefono,             // I - telefono
      fecha_nac,            // J - fecha_nac
      email,                // K - email personal
      rol,                  // L - rol
      'si'                  // M - primer_login (marcado como 'si' porque ya fue completado por admin)
    ];

    console.log('[usersService.createUserFromAdmin] Datos de usuario para crear:', newUser);

    // Usar el mismo repositorio que el registro regular
    const createdUser = await usersRepository.createUser(newUser);
    
    console.log('[usersService.createUserFromAdmin] Usuario creado exitosamente:', createdUser);
    
    return createdUser;
  } catch (error) {
    console.error('Error en createUserFromAdmin:', error);
    throw error;
  }
};