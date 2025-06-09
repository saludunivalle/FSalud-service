// services/documentsService.js
const documentosRepository = require('../repository/documentosRepository');
const documentosUsuariosRepository = require('../repository/documentosUsuariosRepository');
const driveRepository = require('../repository/driveRepository'); // Usar el repositorio
const usersRepository = require('../repository/usersRepository');
const { validateData } = require('../utils/validators');
const { generateUUID } = require('../utils/idGenerator');
const emailService = require('./emailService');

/**
 * Obtiene todos los tipos de documentos
 * @returns {Promise<Array>} - Lista de tipos de documentos
 */
exports.getTiposDocumentos = async () => {
  try {
    const tiposDocumentos = await documentosRepository.getAll();
    
    // Agregar log para debugging
    console.log('Documentos obtenidos del repositorio:', tiposDocumentos);
    
    // Verificar que tenemos los campos necesarios - CORREGIDO PARA INCLUIR TODOS LOS DOCUMENTOS
    const documentosValidos = tiposDocumentos.map(doc => {
      // Asegurar que el documento tenga nombre_doc
      if (!doc.nombre_doc) {
        console.warn('Documento sin nombre_doc encontrado:', doc);
        return null;
      }
      
      // Tratar dosis vacía como dosis 1 (documento de dosis única)
      if (doc.dosis === '' || doc.dosis === null || doc.dosis === undefined) {
        doc.dosis = '1';
      }
      
      return doc;
    }).filter(doc => doc !== null); // Filtrar solo los documentos nulos (sin nombre_doc)
    
    console.log('Documentos válidos después del filtro:', documentosValidos.length);
    
    return documentosValidos;
  } catch (error) {
    console.error('Error al obtener tipos de documentos:', error);
    throw error;
  }
};

/**
 * Obtiene un tipo de documento por su ID
 * @param {string} id - ID del tipo de documento
 * @returns {Promise<Object|null>} - Tipo de documento o null si no existe
 */
exports.getTipoDocumentoById = async (id) => {
  try {
    return await documentosRepository.findOneBy('id_tipoDoc', id);
  } catch (error) {
    console.error(`Error al obtener tipo de documento ${id}:`, error);
    throw error;
  }
};

/**
 * Obtiene documentos de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array>} - Lista de documentos del usuario con información completa
 */
exports.getDocumentosUsuario = async (userId) => {
  try {
    // Obtener documentos del usuario - ahora incluyen nombre_doc y dosis directamente
    const documentosUsuario = await documentosUsuariosRepository.findByUsuario(userId);
    
    // Obtener todos los tipos de documentos para información adicional (vence, tiempo_vencimiento)
    const tiposDocumentos = await documentosRepository.getAll();
    
    // Mapear los documentos para incluir información adicional del tipo de documento
    const documentosCompletos = documentosUsuario.map(docUsuario => {
      const tipoDocumento = tiposDocumentos.find(
        tipo => tipo.id_doc === docUsuario.id_doc
      ) || { 
        vence: false, 
        tiempo_vencimiento: 0
      };
      
      return {
        ...docUsuario,
        // Usar nombre_doc y dosis de la hoja DOCUMENTOS_USUARIOS
        nombre_doc: docUsuario.nombre_doc || tipoDocumento.nombre_doc || 'Desconocido',
        dosis: docUsuario.dosis || tipoDocumento.dosis || 1,
        // Información adicional del tipo de documento
        vence: tipoDocumento.vence,
        tiempo_vencimiento: tipoDocumento.tiempo_vencimiento,
        // Mantener compatibilidad con numero_dosis para el frontend
        numero_dosis: docUsuario.dosis
      };
    });
    
    return documentosCompletos;
  } catch (error) {
    console.error(`Error al obtener documentos del usuario ${userId}:`, error);
    throw error;
  }
};

/**
 * Verifica si un documento está vencido
 * @param {Object} documento - Documento con información de vencimiento
 * @returns {boolean} - true si está vencido, false si no
 */
const isDocumentoVencido = (documento) => {
  // Si el documento no vence, nunca está vencido
  if (!documento.vence || documento.vence === 'false' || documento.vence === '0') {
    return false;
  }
  
  // Si no hay fecha de carga, no puede estar vencido
  if (!documento.fecha_cargue) {
    return false;
  }
  
  // Calcular fecha de vencimiento basada en tiempo_vencimiento (en días)
  const fechaCargue = new Date(documento.fecha_cargue);
  const tiempoVencimiento = parseInt(documento.tiempo_vencimiento || 0);
  
  if (isNaN(tiempoVencimiento) || tiempoVencimiento <= 0) {
    return false; // Si no hay tiempo válido, no vence
  }
  
  const fechaVencimiento = new Date(fechaCargue);
  fechaVencimiento.setDate(fechaVencimiento.getDate() + tiempoVencimiento);
  
  const hoy = new Date();
  
  return hoy > fechaVencimiento;
};

/**
 * Obtiene documentos pendientes (sin revisar) para administradores
 * @returns {Promise<Array>} - Lista de documentos pendientes con información completa
 */
exports.getDocumentosPendientes = async () => {
  try {
    // Obtener documentos sin revisar - ahora incluyen nombre_doc y dosis directamente
    const documentos = await documentosUsuariosRepository.findByEstado('Sin revisar');
    
    // Obtener todos los tipos de documentos para información adicional (vence, tiempo_vencimiento)
    const tiposDocumentos = await documentosRepository.getAll();
    
    // Mapear los documentos para incluir información adicional del tipo de documento
    const documentosCompletos = documentos.map(docUsuario => {
      const tipoDocumento = tiposDocumentos.find(
        tipo => tipo.id_doc === docUsuario.id_doc
      ) || { 
        vence: false, 
        tiempo_vencimiento: 0
      };
      
      return {
        ...docUsuario,
        // Usar nombre_doc y dosis de la hoja DOCUMENTOS_USUARIOS
        nombre_doc: docUsuario.nombre_doc || tipoDocumento.nombre_doc || 'Desconocido',
        dosis: docUsuario.dosis || tipoDocumento.dosis || 1,
        // Información adicional del tipo de documento
        vence: tipoDocumento.vence,
        tiempo_vencimiento: tipoDocumento.tiempo_vencimiento,
        // Mantener compatibilidad con numero_dosis para el frontend
        numero_dosis: docUsuario.dosis
      };
    });
    
    return documentosCompletos;
  } catch (error) {
    console.error('Error al obtener documentos pendientes:', error);
    throw error;
  }
};

/**
 * Obtiene información de dosis de un documento específico
 * @param {string} docId - ID del documento
 * @returns {Promise<Object>} - Información de dosis del documento
 */
exports.getDocumentDoses = async (docId) => {
  try {
    // Obtener información del tipo de documento
    const tipoDocumento = await documentosRepository.findOneBy('id_doc', docId);
    if (!tipoDocumento) {
      throw new Error(`Documento con ID ${docId} no encontrado.`);
    }
    
    const dosis = parseInt(tipoDocumento.dosis) || 1;
    const isMultiDose = dosis > 1;
    
    return {
      id_doc: docId,
      nombre_doc: tipoDocumento.nombre_doc,
      total_dosis: dosis,
      es_multidosis: isMultiDose,
      vence: tipoDocumento.vence,
      tiempo_vencimiento: tipoDocumento.tiempo_vencimiento
    };
  } catch (error) {
    console.error(`Error al obtener información de dosis para documento ${docId}:`, error);
    throw error;
  }
};

/**
 * Sube o actualiza un documento de usuario
 * @param {string} userId - ID del usuario
 * @param {string} tipoDocId - ID del tipo de documento
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre original del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {object} metadata - Metadatos adicionales { expeditionDate, expirationDate?, userName?, userEmail? }
 * @returns {Promise<Object>} - Información del documento subido/actualizado
 */
exports.subirDocumento = async (userId, tipoDocId, fileBuffer, fileName, mimeType, metadata, numeroDosis = null) => {
  try {
    console.log(`Iniciando subida para User: ${userId}, DocType: ${tipoDocId}, File: ${fileName}`);
    // Validar tipo de archivo (ya se hace en middleware, pero doble check no hace daño)
    const tiposPermitidos = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/msword', // DOC
      'application/vnd.ms-excel' // XLS
    ];
    if (!tiposPermitidos.includes(mimeType)) {
      throw new Error(`Tipo de archivo no permitido (${mimeType}). Solo se aceptan: PDF, JPG, PNG, DOC(X), XLS(X).`);
    }

    // Verificar si el tipo de documento existe
    const tipoDocumento = await documentosRepository.findOneBy('id_doc', tipoDocId);
    if (!tipoDocumento) {
      throw new Error(`Tipo de documento con ID ${tipoDocId} no encontrado.`);
    }
    console.log(`Tipo de documento "${tipoDocumento.nombre_doc}" encontrado.`);

    // Verificar si el usuario existe (opcional pero recomendado)
    const userExists = await usersRepository.findOneBy('id_usuario', userId);
    if (!userExists) {
        console.warn(`Usuario con ID ${userId} no encontrado al subir documento.`);
        throw new Error(`Usuario con ID ${userId} no existe en el sistema.`);
    }

    // --- Gestión de Carpetas en Drive ---
    const carpetaBaseId = await driveRepository.findOrCreateFolder('Documentos_Usuarios');
    console.log(`Carpeta base ID: ${carpetaBaseId}`);

    const carpetaUsuarioId = await driveRepository.findOrCreateFolder(userId, carpetaBaseId);
    console.log(`Carpeta de usuario ID: ${carpetaUsuarioId}`);
    // --- Fin Gestión de Carpetas ---

    const documentoExistente = await documentosUsuariosRepository.findDocumentoUsuario(userId, tipoDocId, numeroDosis);

    let documentoInfoDb;

    const fileExtension = fileName.split('.').pop() || 'file';
    const driveFileName = `${tipoDocumento.nombre_doc}_${userId}_${Date.now()}.${fileExtension}`;

    if (documentoExistente) {
      console.log(`Documento existente encontrado (ID: ${documentoExistente.id_usuarioDoc}). Actualizando...`);

      if (documentoExistente.ruta_archivo) {
        const urlParts = documentoExistente.ruta_archivo.split('/');
        const fileIdAnterior = urlParts[urlParts.length - 2];

        if (fileIdAnterior && fileIdAnterior !== 'view') {
          try {
            console.log(`Intentando eliminar archivo anterior de Drive: ${fileIdAnterior}`);
            await driveRepository.deleteFile(fileIdAnterior);
          } catch (deleteError) {
            console.warn(`No se pudo eliminar el archivo anterior ${fileIdAnterior} de Drive:`, deleteError.message);
          }
        } else {
          console.log("No se pudo extraer un ID de archivo válido de la ruta anterior:", documentoExistente.ruta_archivo);
        }
      }

      const fileInfoDrive = await driveRepository.uploadFile(
        fileBuffer,
        driveFileName,
        mimeType,
        carpetaUsuarioId
      );
      console.log("Nuevo archivo subido a Drive:", fileInfoDrive);

      const updateData = {
        nombre_doc: tipoDocumento.nombre_doc,
        dosis: numeroDosis || documentoExistente.dosis || 1,
        fecha_cargue: new Date().toISOString().split('T')[0],
        revision: '0',
        fecha_revision: '',
        estado: 'Sin revisar',
        ruta_archivo: fileInfoDrive.webViewLink || `https://drive.google.com/file/d/${fileInfoDrive.id}/view`,
        fecha_expedicion: metadata.expeditionDate,
        fecha_vencimiento: (tipoDocumento.vence === 'si' && metadata.expirationDate) ? metadata.expirationDate : '',
      };
      documentoInfoDb = await documentosUsuariosRepository.update(
        'id_usuarioDoc',
        documentoExistente.id_usuarioDoc,
        updateData
      );
      console.log("Registro de documento actualizado en DB:", documentoInfoDb);

    } else {
      console.log("Documento no existente para este usuario y tipo. Creando nuevo registro...");

      const fileInfoDrive = await driveRepository.uploadFile(
        fileBuffer,
        driveFileName,
        mimeType,
        carpetaUsuarioId
      );
      console.log("Archivo subido a Drive:", fileInfoDrive);

      const createData = {
        id_usuarioDoc: generateUUID(),
        id_persona: userId,
        id_doc: tipoDocId,
        nombre_doc: tipoDocumento.nombre_doc,
        dosis: numeroDosis || 1, // Por defecto dosis 1 si no se especifica
        fecha_cargue: new Date().toISOString().split('T')[0],
        revision: '0',
        fecha_revision: '',
        estado: 'Sin revisar',
        ruta_archivo: fileInfoDrive.webViewLink || `https://drive.google.com/file/d/${fileInfoDrive.id}/view`,
        fecha_expedicion: metadata.expeditionDate,
        fecha_vencimiento: (tipoDocumento.vence === 'si' && metadata.expirationDate) ? metadata.expirationDate : '',
      };
      documentoInfoDb = await documentosUsuariosRepository.createDocumentoUsuario(createData);
      console.log("Nuevo registro de documento creado en DB:", documentoInfoDb);
    }

    return {
      ...documentoInfoDb,
      nombre_tipoDoc: tipoDocumento.nombre_tipoDoc,
      vence: tipoDocumento.vence,
      tiempo_vencimiento: tipoDocumento.tiempo_vencimiento
    };

  } catch (error) {
    console.error(`Error en service subirDocumento para User ${userId}, DocType ${tipoDocId}:`, error);
    throw error;
  }
};

/**
 * Revisa un documento (cambio de estado) y envía notificación
 * @param {string} documentoId - ID del documento a revisar
 * @param {string} estado - Nuevo estado (Rechazado, Cumplido, etc.)
 * @param {string} comentario - Comentario opcional de la revisión
 * @returns {Promise<Object>} - Documento actualizado
 */
exports.revisarDocumento = async (documentoId, estado, comentario = '') => {
  try {
    // Validar estado
    const estadosValidos = ['Aprobado', 'Rechazado', 'Vencido', 'Pendiente', 'Sin cargar'];
    if (!estadosValidos.includes(estado)) {
      throw new Error(`Estado '${estado}' no válido. Estados válidos: ${estadosValidos.join(', ')}`);
    }
    
    // Mapear estados del frontend a estados del backend
    const estadoBackend = {
      'Aprobado': 'Cumplido',
      'Rechazado': 'Rechazado',
      'Vencido': 'Expirado',
      'Pendiente': 'Pendiente',
      'Sin cargar': 'Sin cargar'
    }[estado] || estado;
    
    // Obtener el documento con información del usuario
    const documento = await documentosUsuariosRepository.findOneBy('id_usuarioDoc', documentoId);
    if (!documento) {
      throw new Error(`Documento con ID ${documentoId} no encontrado.`);
    }
    
    // Obtener información del usuario propietario del documento
    const usuario = await usersRepository.findOneBy('id_usuario', documento.id_persona);
    if (!usuario) {
      console.error(`Usuario con ID ${documento.id_persona} no encontrado para notificación`);
    }
    
    // Actualizar estado y campos de revisión
    const documentoActualizado = await documentosUsuariosRepository.actualizarEstado(
      documentoId,
      estadoBackend,
      true, // Marcado como revisado
      comentario // Incluir comentario en la actualización
    );
    
    // Si tenemos información del usuario, enviar notificación por email
    if (usuario && usuario.correo_usuario) {
      // Ejecutar envío de email de forma asíncrona para no bloquear la respuesta
      setImmediate(async () => {
        try {
          const nombreCompleto = `${usuario.nombre_usuario || ''} ${usuario.apellido_usuario || ''}`.trim() || 'Usuario';
          
          const resultado = await emailService.sendStatusChangeNotification(
            usuario.correo_usuario,
            nombreCompleto,
            documento.nombre_doc || 'Documento',
            estadoBackend,
            new Date().toISOString(),
            comentario
          );
          
          if (resultado.success) {
            console.log(`Notificación enviada exitosamente para documento ${documentoId}`);
          } else {
            console.error(`Error enviando notificación para documento ${documentoId}:`, resultado.error);
          }
        } catch (emailError) {
          console.error(`Error en envío de notificación para documento ${documentoId}:`, emailError);
        }
      });
    }
    
    return documentoActualizado;
  } catch (error) {
    console.error(`Error revisando documento ${documentoId}:`, error);
    throw error;
  }
};

/**
 * Actualiza estados de documentos vencidos
 * @returns {Promise<{total: number, actualizados: number}>} - Estadísticas de actualización
 */
exports.actualizarEstadosVencidos = async () => {
  try {
    // Obtener todos los documentos
    const documentosUsuarios = await documentosUsuariosRepository.getAll();
    const tiposDocumentos = await documentosRepository.getAll();
    
    let actualizados = 0;
    
    // Verificar cada documento
    for (const docUsuario of documentosUsuarios) {
      // Si ya está marcado como Expirado, continuar
      if (docUsuario.estado === 'Expirado') {
        continue;
      }
      
      // Si está en estado Cumplido, comprobar vencimiento
      if (docUsuario.estado === 'Cumplido') {
        const tipoDocumento = tiposDocumentos.find(
          tipo => tipo.id_tipoDoc === docUsuario.id_doc
        );
        
        // Si no se encuentra el tipo o no vence, continuar
        if (!tipoDocumento || !tipoDocumento.vence || tipoDocumento.vence === 'false') {
          continue;
        }
        
        // Verificar si está vencido
        const documentoCompleto = {
          ...docUsuario,
          vence: tipoDocumento.vence,
          tiempo_vencimiento: tipoDocumento.tiempo_vencimiento
        };
        
        if (isDocumentoVencido(documentoCompleto)) {
          // Actualizar a estado Expirado
          await documentosUsuariosRepository.actualizarEstado(
            docUsuario.id_usuarioDoc,
            'Expirado',
            true // Marcado como revisado
          );
          actualizados++;
        }
      }
    }
    
    return {
      total: documentosUsuarios.length,
      actualizados: actualizados
    };
  } catch (error) {
    console.error('Error al actualizar estados de documentos vencidos:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de documentos
 * @returns {Promise<Object>} - Estadísticas de documentos
 */
exports.getEstadisticas = async () => {
  try {
    // Obtener todos los documentos de usuarios
    const documentosUsuarios = await documentosUsuariosRepository.getAll();

    // Inicializar contador de estadísticas
    const estadisticas = {
      total: documentosUsuarios.length,
      porEstado: {
        'Sin revisar': 0,
        'Rechazado': 0,
        'Cumplido': 0,
        'Expirado': 0,
        'No aplica': 0,
      }
    };

    // Contar documentos por estado
    documentosUsuarios.forEach(doc => {
      if (estadisticas.porEstado.hasOwnProperty(doc.estado)) {
        estadisticas.porEstado[doc.estado]++;
      } else {
        console.warn(`Estado inesperado encontrado: ${doc.estado} en documento ${doc.id_usuarioDoc}`);
      }
    });

    return estadisticas;

  } catch (error) {
    console.error('Error al obtener estadísticas de documentos:', error);
    throw error;
  }
};