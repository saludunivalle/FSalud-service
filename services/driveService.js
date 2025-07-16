// services/driveService.js
const { google } = require('googleapis');
const { jwtClient } = require('../config/google');
const stream = require('stream');
require('dotenv').config();

/**
 * Servicio para manejar operaciones con Google Drive
 */
class DriveService {
  constructor() {
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID; // ID de la carpeta base en Drive
  }

  /**
   * Obtiene el cliente autenticado de Google Drive
   * @returns {Object} Cliente de Google Drive
   */
  getClient() {
    try {
      return google.drive({ version: 'v3', auth: jwtClient });
    } catch (error) {
      console.error('Error al obtener cliente de Drive:', error);
      throw error;
    }
  }

  /**
   * Sube un archivo a Google Drive usando Shared Drive
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {string} fileName - Nombre del archivo
   * @param {string} mimeType - Tipo MIME del archivo
   * @param {string} userId - ID del usuario que sube el archivo
   * @returns {Promise<Object>} - Información del archivo subido
   */
  async uploadFile(fileBuffer, fileName, mimeType, userId) {
    try {
      const drive = this.getClient();
      
      // Usar Shared Drive ID si está configurado, sino usar folder normal
      const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;
      const targetFolderId = sharedDriveId || this.folderId;
      
      // Crear carpeta para el usuario si no existe
      const userFolderId = await this.getUserFolder(userId, targetFolderId);
      
      // Preparar el buffer como un stream legible
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);
      
      // Metadata del archivo
      const fileMetadata = {
        name: fileName,
        parents: [userFolderId], // Guardar en la carpeta del usuario
      };
      
      // Configuración de media
      const media = {
        mimeType: mimeType,
        body: bufferStream,
      };
      
      // Subir el archivo con soporte para Shared Drive
      const createOptions = {
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink',
      };
      
      // Si estamos usando Shared Drive, agregar el parámetro
      if (sharedDriveId) {
        createOptions.supportsAllDrives = true;
        createOptions.supportsTeamDrives = true;
      }
      
      const response = await drive.files.create(createOptions);
      
      // Establecer permisos para que sea accesible por enlace
      const permissionOptions = {
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      };
      
      // Si estamos usando Shared Drive, agregar los parámetros
      if (sharedDriveId) {
        permissionOptions.supportsAllDrives = true;
        permissionOptions.supportsTeamDrives = true;
      }
      
      await drive.permissions.create(permissionOptions);
      
      // Obtener el link actualizado
      const getOptions = {
        fileId: response.data.id,
        fields: 'id, name, webViewLink, webContentLink',
      };
      
      if (sharedDriveId) {
        getOptions.supportsAllDrives = true;
        getOptions.supportsTeamDrives = true;
      }
      
      const file = await drive.files.get(getOptions);
      
      return file.data;
    } catch (error) {
      console.error('Error al subir archivo a Drive:', error);
      
      // Si el error es específico de Service Account, proporcionar información útil
      if (error.message && error.message.includes('Service Accounts do not have storage quota')) {
        throw new Error('Error de configuración de Google Drive. Las Service Accounts no tienen cuota de almacenamiento. Se requiere configurar un Shared Drive o usar OAuth delegation.');
      }
      
      throw error;
    }
  }

  /**
   * Obtiene o crea una carpeta para el usuario
   * @param {string} userId - ID del usuario
   * @param {string} parentFolderId - ID de la carpeta padre (Shared Drive o normal)
   * @returns {Promise<string>} - ID de la carpeta del usuario
   */
  async getUserFolder(userId, parentFolderId = this.folderId) {
    try {
      const drive = this.getClient();
      
      // Buscar si ya existe la carpeta del usuario
      const query = `name = '${userId}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents`;
      const listOptions = {
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      };
      
      // Si estamos usando Shared Drive, agregar los parámetros
      const sharedDriveId = process.env.GOOGLE_SHARED_DRIVE_ID;
      if (sharedDriveId) {
        listOptions.supportsAllDrives = true;
        listOptions.supportsTeamDrives = true;
        listOptions.includeItemsFromAllDrives = true;
        listOptions.corpora = 'allDrives';
      }
      
      const response = await drive.files.list(listOptions);
      
      // Si existe, devolver el ID
      if (response.data.files.length > 0) {
        return response.data.files[0].id;
      }
      
      // Si no existe, crear la carpeta
      const fileMetadata = {
        name: userId,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      };
      
      const createOptions = {
        resource: fileMetadata,
        fields: 'id',
      };
      
      // Si estamos usando Shared Drive, agregar los parámetros
      if (sharedDriveId) {
        createOptions.supportsAllDrives = true;
        createOptions.supportsTeamDrives = true;
      }
      
      const folder = await drive.files.create(createOptions);
      
      return folder.data.id;
    } catch (error) {
      console.error('Error al obtener/crear carpeta de usuario:', error);
      throw error;
    }
  }

  /**
   * Elimina un archivo de Google Drive
   * @param {string} fileId - ID del archivo a eliminar
   * @returns {Promise<boolean>} - true si se eliminó correctamente
   */
  async deleteFile(fileId) {
    try {
      const drive = this.getClient();
      await drive.files.delete({ fileId });
      return true;
    } catch (error) {
      console.error('Error al eliminar archivo de Drive:', error);
      throw error;
    }
  }

  /**
   * Verifica si el tipo de archivo es válido
   * @param {string} mimeType - Tipo MIME del archivo
   * @returns {boolean} - true si es válido, false si no
   */
  isValidFileType(mimeType) {
    const allowedTypes = [
      'application/pdf', // PDF
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'image/jpeg', // JPG
      'image/png', // PNG
    ];
    
    return allowedTypes.includes(mimeType);
  }

  /**
   * Obtiene información de un archivo por su ID
   * @param {string} fileId - ID del archivo
   * @returns {Promise<Object>} - Información del archivo
   */
  async getFileInfo(fileId) {
    try {
      const drive = this.getClient();
      const response = await drive.files.get({
        fileId,
        fields: 'id, name, webViewLink, webContentLink, mimeType, createdTime',
      });
      
      return response.data;
    } catch (error) {
      console.error('Error al obtener información del archivo:', error);
      throw error;
    }
  }
}

// Exportar una instancia del servicio
const driveService = new DriveService();
module.exports = driveService;