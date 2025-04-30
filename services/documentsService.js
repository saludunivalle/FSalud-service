// services/documentsService.js
const documentosRepository = require('../repository/documentosRepository');
const documentosUsuariosRepository = require('../repository/documentosUsuariosRepository');
const driveRepository = require('../repository/driveRepository');
const usersRepository = require('../repository/usersRepository');
const { validateData } = require('../utils/validators');
const { generateUUID } = require('../utils/idGenerator');

/**
 * Obtiene todos los tipos de documentos
 * @returns {Promise<Array>} - Lista de tipos de documentos
 */
exports.getTiposDocumentos = async () => {
  try {
    const tiposDocumentos = await documentosRepository.getAll();
    return tiposDocumentos;
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
    // Obtener documentos del usuario
    const documentosUsuario = await documentosUsuariosRepository.findByUsuario(userId);
    
    // Obtener todos los tipos de documentos para cruzar información
    const tiposDocumentos = await documentosRepository.getAll();
    
    // Mapear los documentos para incluir información del tipo de documento
    const documentosCompletos = documentosUsuario.map(docUsuario => {
      const tipoDocumento = tiposDocumentos.find(
        tipo => tipo.id_tipoDoc === docUsuario.id_doc
      ) || { nombre_tipoDoc: 'Desconocido', vence: false, tiempo_vencimiento: 0 };
      
      return {
        ...docUsuario,
        nombre_tipoDoc: tipoDocumento.nombre_tipoDoc,
        vence: tipoDocumento.vence,
        tiempo_vencimiento: tipoDocumento.tiempo_vencimiento
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
    // Obtener documentos sin revisar
    const documentos = await documentosUsuariosRepository.findByEstado('Sin revisar');
    
    // Obtener todos los tipos de documentos para cruzar información
    const tiposDocumentos = await documentosRepository.getAll();
    
    // Mapear los documentos para incluir información del tipo de documento
    const documentosCompletos = documentos.map(docUsuario => {
      const tipoDocumento = tiposDocumentos.find(
        tipo => tipo.id_tipoDoc === docUsuario.id_doc
      ) || { nombre_tipoDoc: 'Desconocido', vence: false, tiempo_vencimiento: 0 };
      
      return {
        ...docUsuario,
        nombre_tipoDoc: tipoDocumento.nombre_tipoDoc,
        vence: tipoDocumento.vence,
        tiempo_vencimiento: tipoDocumento.tiempo_vencimiento
      };
    });
    
    return documentosCompletos;
  } catch (error) {
    console.error('Error al obtener documentos pendientes:', error);
    throw error;
  }
};

/**
 * Sube un documento de usuario
 * @param {string} userId - ID del usuario
 * @param {string} tipoDocId - ID del tipo de documento
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {Promise<Object>} - Información del documento subido
 */
exports.subirDocumento = async (userId, tipoDocId, fileBuffer, fileName, mimeType) => {
  try {
    // Validar tipo de archivo
    const tiposPermitidos = [
      'application/pdf', // PDF
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'image/jpeg', // JPG
      'image/png'  // PNG
    ];
    
    if (!tiposPermitidos.includes(mimeType)) {
      throw new Error('Tipo de archivo no permitido. Solo se aceptan PDF, DOCX, XLSX, JPG y PNG.');
    }
    
    // Verificar si el tipo de documento existe
    const tipoDocumento = await documentosRepository.findOneBy('id_tipoDoc', tipoDocId);
    if (!tipoDocumento) {
      throw new Error(`Tipo de documento con ID ${tipoDocId} no encontrado.`);
    }
    
    // Verificar si el usuario ya tiene un documento de este tipo
    const documentoExistente = await documentosUsuariosRepository.findDocumentoUsuario(userId, tipoDocId);
    
    // Carpeta base para documentos
    const carpetaBase = await driveRepository.findOrCreateFolder('Documentos_Usuarios');
    
    // Carpeta del usuario
    const carpetaUsuario = await driveRepository.findOrCreateFolder(userId, carpetaBase);
    
    let documentoInfo;
    
    // Si ya existe un documento de este tipo, actualizarlo
    if (documentoExistente) {
      // Verificar si el archivo en Drive existe
      const fileIdAnterior = documentoExistente.ruta_archivo.split('/').pop();
      let fileAnteriorExiste = false;
      
      try {
        fileAnteriorExiste = await driveRepository.fileExists(fileIdAnterior);
      } catch (error) {
        console.warn(`No se pudo verificar archivo anterior ${fileIdAnterior}:`, error.message);
      }
      
      // Si el archivo anterior existe, eliminarlo
      if (fileAnteriorExiste) {
        try {
          await driveRepository.deleteFile(fileIdAnterior);
        } catch (error) {
          console.warn(`No se pudo eliminar archivo anterior ${fileIdAnterior}:`, error.message);
        }
      }
      
      // Subir el nuevo archivo
      const fileInfo = await driveRepository.uploadFile(
        fileBuffer,
        `${tipoDocumento.nombre_tipoDoc}_${userId}_${Date.now()}.${fileName.split('.').pop()}`,
        mimeType,
        carpetaUsuario
      );
      
      // Actualizar el registro en la base de datos
      documentoInfo = await documentosUsuariosRepository.update(
        'id_usuarioDoc', 
        documentoExistente.id_usuarioDoc,
        {
          fecha_cargue: new Date().toISOString().split('T')[0],
          revision: '0', // Resetear revisión
          fecha_revision: '',
          estado: 'Sin revisar',
          ruta_archivo: fileInfo.webViewLink || `https://drive.google.com/file/d/${fileInfo.id}/view`
        }
      );
    } else {
      // Si no existe, crear uno nuevo
      
      // Subir archivo a Drive
      const fileInfo = await driveRepository.uploadFile(
        fileBuffer,
        `${tipoDocumento.nombre_tipoDoc}_${userId}_${Date.now()}.${fileName.split('.').pop()}`,
        mimeType,
        carpetaUsuario
      );
      
      // Crear registro en la base de datos
      documentoInfo = await documentosUsuariosRepository.createDocumentoUsuario({
        id_usuarioDoc: generateUUID(),
        id_persona: userId,
        id_doc: tipoDocId,
        fecha_cargue: new Date().toISOString().split('T')[0],
        revision: '0',
        fecha_revision: '',
        estado: 'Sin revisar',
        ruta_archivo: fileInfo.webViewLink || `https://drive.google.com/file/d/${fileInfo.id}/view`
      });
    }
    
    return {
      ...documentoInfo,
      nombre_tipoDoc: tipoDocumento.nombre_tipoDoc,
      vence: tipoDocumento.vence,
      tiempo_vencimiento: tipoDocumento.tiempo_vencimiento
    };
  } catch (error) {
    console.error(`Error al subir documento para usuario ${userId}, tipo ${tipoDocId}:`, error);
    throw error;
  }
};

/**
 * Revisa un documento (cambio de estado)
 * @param {string} documentoId - ID del documento a revisar
 * @param {string} estado - Nuevo estado (Rechazado, Cumplido, etc.)
 * @param {string} comentario - Comentario opcional de la revisión
 * @returns {Promise<Object>} - Documento actualizado
 */
exports.revisarDocumento = async (documentoId, estado, comentario = '') => {
  try {
    // Validar estado
    const estadosValidos = ['Rechazado', 'Cumplido', 'Expirado', 'No aplica'];
    if (!estadosValidos.includes(estado)) {
      throw new Error(`Estado '${estado}' no válido. Estados válidos: ${estadosValidos.join(', ')}`);
    }
    
    // Obtener el documento
    const documento = await documentosUsuariosRepository.findOneBy('id_usuarioDoc', documentoId);
    if (!documento) {
      throw new Error(`Documento con ID ${documentoId} no encontrado.`);
    }
    
    // Actualizar estado y campos de revisión
    const documentoActualizado = await documentosUsuariosRepository.actualizarEstado(
      documentoId,
      estado,
      true // Marcado como revisado
    );
    
    // Si hay comentario, se podría guardar en otra tabla o campo
    // (requeriría modificar la estructura de datos)
    
    return documentoActualizado;
  } catch (error) {
    console.error(`Error al revisar documento ${documentoId}:`, error);
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
        'Cumplido': 0, // Assuming 'Cumplido' is the backend state for 'Aprobado'
        'Expirado': 0,
        'No aplica': 0,
        // 'Sin cargar' is not a state stored in the backend, it's derived in the frontend
      }
    };

    // Contar documentos por estado
    documentosUsuarios.forEach(doc => {
      // Ensure the state exists in our counter object before incrementing
      if (estadisticas.porEstado.hasOwnProperty(doc.estado)) {
        estadisticas.porEstado[doc.estado]++;
      } else {
        // Optional: Log or handle unexpected states
        console.warn(`Estado inesperado encontrado: ${doc.estado} en documento ${doc.id_usuarioDoc}`);
        // You could add it to the stats dynamically if needed:
        // if (!estadisticas.porEstado[doc.estado]) {
        //   estadisticas.porEstado[doc.estado] = 0;
        // }
        // estadisticas.porEstado[doc.estado]++;
      }
    });

    // You could add more statistics here if needed, e.g., count by document type

    return estadisticas;

  } catch (error) {
    console.error('Error al obtener estadísticas de documentos:', error);
    throw error; // Re-throw the error to be handled by the controller
  }
};

// Potentially add other service functions if required, like deleting a document record, etc.