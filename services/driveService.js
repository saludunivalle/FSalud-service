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
   * Sube un archivo a Google Drive
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {string} fileName - Nombre del archivo
   * @param {string} mimeType - Tipo MIME del archivo
   * @param {string} userId - ID del usuario que sube el archivo
   * @returns {Promise<Object>} - Información del archivo subido
   */
  async uploadFile(fileBuffer, fileName, mimeType, userId) {
    try {
      const drive = this.getClient();
      
      // Crear carpeta para el usuario si no existe
      const userFolderId = await this.getUserFolder(userId);
      
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
      
      // Subir el archivo
      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, webContentLink',
      });
      
      // Establecer permisos para que sea accesible por enlace
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      
      // Obtener el link actualizado
      const file = await drive.files.get({
        fileId: response.data.id,
        fields: 'id, name, webViewLink, webContentLink',
      });
      
      return file.data;
    } catch (error) {
      console.error('Error al subir archivo a Drive:', error);
      throw error;
    }
  }

  /**
   * Obtiene o crea una carpeta para el usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<string>} - ID de la carpeta del usuario
   */
  async getUserFolder(userId) {
    try {
      const drive = this.getClient();
      
      // Buscar si ya existe la carpeta del usuario
      const query = `name = '${userId}' and mimeType = 'application/vnd.google-apps.folder' and '${this.folderId}' in parents`;
      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });
      
      // Si existe, devolver el ID
      if (response.data.files.length > 0) {
        return response.data.files[0].id;
      }
      
      // Si no existe, crear la carpeta
      const fileMetadata = {
        name: userId,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.folderId],
      };
      
      const folder = await drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });
      
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