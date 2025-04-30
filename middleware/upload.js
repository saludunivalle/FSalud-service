// middleware/upload.js
const multer = require('multer');
const util = require('util');

/**
 * Configuración para almacenamiento en memoria de archivos
 * Los archivos se almacenan temporalmente en memoria antes de ser procesados
 */
const storage = multer.memoryStorage();

/**
 * Configuración para procesamiento de archivos
 * @param {Object} options - Opciones de configuración
 * @returns {Function} - Middleware de multer configurado
 */
const createUploadMiddleware = (options = {}) => {
  // Opciones por defecto
  const defaultOptions = {
    limits: { 
      fileSize: 10 * 1024 * 1024, // 10MB por defecto
    },
    fileFilter: function(req, file, cb) {
      // Tipos MIME permitidos
      const allowedMimeTypes = [
        'application/pdf',                                                   // PDF
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
        'image/jpeg',                                                        // JPG/JPEG
        'image/png',                                                         // PNG
        'application/msword',                                                // DOC
        'application/vnd.ms-excel'                                           // XLS
      ];
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Tipo de archivo no permitido (${file.mimetype}). Solo se aceptan PDF, DOCX, XLSX, DOC, XLS, JPG y PNG.`), false);
      }
    }
  };
  
  // Combinar opciones proporcionadas con los valores por defecto
  const config = { ...defaultOptions, ...options };
  
  // Crear instancia de multer con la configuración
  const upload = multer({
    storage: storage,
    limits: config.limits,
    fileFilter: config.fileFilter
  });
  
  return upload;
};

/**
 * Middleware para procesar un único archivo
 * @param {string} fieldName - Nombre del campo en el formulario
 * @param {Object} options - Opciones de configuración
 * @returns {Function} - Middleware asíncrono
 */
const uploadSingleFile = (fieldName = 'file', options = {}) => {
  const upload = createUploadMiddleware(options).single(fieldName);
  
  // Convertir a middleware compatible con async/await
  return util.promisify(upload);
};

/**
 * Middleware para procesar múltiples archivos en un campo
 * @param {string} fieldName - Nombre del campo en el formulario
 * @param {number} maxCount - Número máximo de archivos
 * @param {Object} options - Opciones de configuración
 * @returns {Function} - Middleware asíncrono
 */
const uploadMultipleFiles = (fieldName = 'files', maxCount = 5, options = {}) => {
  const upload = createUploadMiddleware(options).array(fieldName, maxCount);
  
  // Convertir a middleware compatible con async/await
  return util.promisify(upload);
};

/**
 * Middleware para procesar múltiples campos con archivos
 * @param {Array<Object>} fields - Configuración de campos (ver documentación de multer)
 * @param {Object} options - Opciones de configuración
 * @returns {Function} - Middleware asíncrono
 */
const uploadFields = (fields, options = {}) => {
  const upload = createUploadMiddleware(options).fields(fields);
  
  // Convertir a middleware compatible con async/await
  return util.promisify(upload);
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  uploadFields,
  createUploadMiddleware
};