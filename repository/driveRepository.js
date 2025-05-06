// repository/driveRepository.js
const { google } = require('googleapis');
const { jwtClient } = require('../config/google');
const stream = require('stream');
require('dotenv').config();

// ID de la carpeta base para documentos en Drive - Prioritize ENV var
const BASE_DOCUMENTS_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const FALLBACK_FOLDER_ID = '1Q13hKV3vXlsu-Yy0Ix9G9v_IHVFi-rfj'; // Your hardcoded ID

if (!BASE_DOCUMENTS_FOLDER_ID) {
  console.warn(`⚠️ ADVERTENCIA: La variable de entorno GOOGLE_DRIVE_FOLDER_ID no está configurada o está vacía. Usando ID de fallback: ${FALLBACK_FOLDER_ID}`);
}

const getEffectiveBaseFolderId = () => {
  const id = BASE_DOCUMENTS_FOLDER_ID || FALLBACK_FOLDER_ID;
  if (!id) {
    console.error("❌ ERROR CRÍTICO: No se pudo determinar el ID de la carpeta base de Google Drive.");
    throw new Error("Configuración de Google Drive incompleta: falta el ID de la carpeta base.");
  }
  return id;
};

/**
 * Obtiene el cliente autenticado de Google Drive
 * @returns {Object} Cliente de Google Drive
 */
const getDriveClient = () => {
  try {
    if (!jwtClient) {
      throw new Error('No se ha inicializado correctamente el cliente JWT');
    }
    return google.drive({ version: 'v3', auth: jwtClient });
  } catch (error) {
    console.error('Error al obtener cliente de Drive:', error);
    throw error;
  }
};

/**
 * Busca o crea una carpeta en Drive
 * @param {string} folderName - Nombre de la carpeta
 * @param {string} [parentFolderId] - ID de la carpeta padre. Si no se proporciona, usa la carpeta base.
 * @returns {Promise<string>} - ID de la carpeta
 */
exports.findOrCreateFolder = async (folderName, parentFolderId) => {
  const effectiveParentId = parentFolderId || getEffectiveBaseFolderId();

  if (!effectiveParentId) {
    console.error(`Error Crítico: parentFolderId está vacío o indefinido incluso después del fallback al buscar/crear "${folderName}".`);
    throw new Error(`ID de carpeta padre inválido al procesar la carpeta "${folderName}".`);
  }

  try {
    const drive = getDriveClient();

    console.log(`Buscando/Creando carpeta: "${folderName}" dentro de la carpeta padre ID: "${effectiveParentId}"`);

    const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${effectiveParentId}' in parents and trashed = false`;

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files.length > 0) {
      console.log(`Carpeta "${folderName}" encontrada con ID: ${response.data.files[0].id}`);
      return response.data.files[0].id;
    }

    console.log(`Carpeta "${folderName}" no encontrada. Creando...`);
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [effectiveParentId],
    };

    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, name',
    });

    console.log(`Carpeta "${folderName}" (ID: ${folder.data.id}) creada exitosamente dentro de la carpeta padre ID: ${effectiveParentId}`);
    return folder.data.id;
  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`Error al buscar o crear carpeta "${folderName}" en padre "${effectiveParentId}": ${errorMessage}`, error.errors || error);
    throw error;
  }
};

/**
 * Sube un archivo a Google Drive
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {string} folderId - ID de la carpeta donde subir (DEBE ser la carpeta específica del usuario)
 * @returns {Promise<Object>} - Información del archivo subido
 */
exports.uploadFile = async (fileBuffer, fileName, mimeType, folderId) => {
  try {
    const drive = getDriveClient();

    if (!folderId) {
      console.error(`Error Crítico: Se intentó subir el archivo "${fileName}" pero no se proporcionó un folderId.`);
      throw new Error(`No se especificó la carpeta de destino para el archivo "${fileName}".`);
    }

    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    console.log(`Subiendo archivo "${fileName}" a la carpeta ID: ${folderId}`);

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    console.log(`Archivo "${fileName}" subido con ID: ${response.data.id}`);

    try {
      console.log(`Estableciendo permisos de lectura para archivo ID: ${response.data.id}`);
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log(`Permisos establecidos para archivo ID: ${response.data.id}`);
    } catch (permError) {
      console.warn(`Advertencia: No se pudieron establecer los permisos públicos para el archivo ${response.data.id}. El enlace podría no ser accesible.`, permError.message);
    }

    const file = await drive.files.get({
      fileId: response.data.id,
      fields: 'id, name, webViewLink, webContentLink',
    });

    return file.data;

  } catch (error) {
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`Error al subir archivo "${fileName}" a carpeta ${folderId}: ${errorMessage}`, error.errors || error);
    throw error;
  }
};

/**
 * Elimina un archivo de Google Drive
 * @param {string} fileId - ID del archivo a eliminar
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
exports.deleteFile = async (fileId) => {
  if (!fileId) {
    console.warn("Se intentó eliminar un archivo sin proporcionar fileId.");
    return false;
  }
  try {
    const drive = getDriveClient();
    console.log(`Intentando eliminar archivo con ID: ${fileId}`);
    await drive.files.delete({ fileId: fileId });
    console.log(`Archivo ${fileId} eliminado correctamente.`);
    return true;
  } catch (error) {
    if (error.code === 404) {
      console.log(`Archivo ${fileId} no encontrado para eliminar (probablemente ya fue borrado).`);
      return true;
    }
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`Error al eliminar archivo ${fileId}: ${errorMessage}`, error.errors || error);
    throw error;
  }
};

/**
 * Actualiza un archivo en Google Drive
 * @param {string} fileId - ID del archivo a actualizar
 * @param {Buffer} fileBuffer - Nuevo contenido del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @returns {Promise<Object>} - Información del archivo actualizado
 */
exports.updateFile = async (fileId, fileBuffer, mimeType) => {
  try {
    const drive = getDriveClient();

    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const response = await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: mimeType,
        body: bufferStream,
      },
      fields: 'id, name, webViewLink, webContentLink, mimeType',
    });

    return response.data;
  } catch (error) {
    console.error(`Error al actualizar archivo con ID ${fileId}:`, error);
    throw error;
  }
};

/**
 * Verifica si un archivo existe en Drive
 * @param {string} fileId - ID del archivo a verificar
 * @returns {Promise<boolean>} - true si existe, false si no
 */
exports.fileExists = async (fileId) => {
  if (!fileId) return false;
  try {
    const drive = getDriveClient();
    await drive.files.get({ fileId: fileId, fields: 'id' });
    return true;
  } catch (error) {
    if (error.code === 404) {
      return false;
    }
    console.warn(`Error al verificar existencia del archivo ${fileId}:`, error.message);
    return false;
  }
};

/**
 * Obtiene la información de un archivo
 * @param {string} fileId - ID del archivo
 * @returns {Promise<Object>} - Información del archivo
 */
exports.getFileInfo = async (fileId) => {
  try {
    const drive = getDriveClient();
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, webViewLink, webContentLink, mimeType, createdTime, modifiedTime, size',
    });

    return response.data;
  } catch (error) {
    console.error(`Error al obtener información del archivo ${fileId}:`, error);
    throw error;
  }
};