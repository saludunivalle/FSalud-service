// repository/driveRepository.js
const { google } = require('googleapis');
const { jwtClient } = require('../config/google');
const stream = require('stream');
require('dotenv').config();

// ID de la carpeta base para documentos en Drive
const DOCUMENTS_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

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
 * @param {string} parentFolderId - ID de la carpeta padre
 * @returns {Promise<string>} - ID de la carpeta
 */
exports.findOrCreateFolder = async (folderName, parentFolderId = DOCUMENTS_FOLDER_ID) => {
  try {
    const drive = getDriveClient();
    
    // Buscar si la carpeta ya existe
    const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`;
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    
    // Si la carpeta existe, devolver su ID
    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }
    
    // Si no existe, crear la carpeta
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };
    
    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, name',
    });
    
    console.log(`Carpeta "${folderName}" creada con ID: ${folder.data.id}`);
    return folder.data.id;
  } catch (error) {
    console.error(`Error al buscar o crear carpeta "${folderName}":`, error);
    throw error;
  }
};

/**
 * Sube un archivo a Google Drive
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} mimeType - Tipo MIME del archivo
 * @param {string} folderId - ID de la carpeta donde subir
 * @returns {Promise<Object>} - Información del archivo subido
 */
exports.uploadFile = async (fileBuffer, fileName, mimeType, folderId) => {
  try {
    const drive = getDriveClient();
    
    // Crear stream desde buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);
    
    // Metadata del archivo
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };
    
    // Configuración de media
    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };
    
    // Subir archivo
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, mimeType',
    });
    
    // Establecer permisos de lectura para cualquiera con el enlace
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    // Obtener enlaces actualizados
    const updatedFileInfo = await drive.files.get({
      fileId: response.data.id,
      fields: 'id, name, webViewLink, webContentLink, mimeType',
    });
    
    return updatedFileInfo.data;
  } catch (error) {
    console.error(`Error al subir archivo "${fileName}":`, error);
    throw error;
  }
};

/**
 * Elimina un archivo de Google Drive
 * @param {string} fileId - ID del archivo a eliminar
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
exports.deleteFile = async (fileId) => {
  try {
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
    console.log(`Archivo con ID ${fileId} eliminado correctamente`);
    return true;
  } catch (error) {
    console.error(`Error al eliminar archivo con ID ${fileId}:`, error);
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
    
    // Crear stream desde buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);
    
    // Actualizar archivo
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
  try {
    const drive = getDriveClient();
    await drive.files.get({ fileId, fields: 'id' });
    return true;
  } catch (error) {
    if (error.code === 404) {
      return false;
    }
    throw error;
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