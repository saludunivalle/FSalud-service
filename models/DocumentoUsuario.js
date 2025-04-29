const { generateUUID } = require('../utils/idGenerator');

class DocumentoUsuario {
  constructor(data = {}) {
    this.id_usuarioDoc = data.id_usuarioDoc || generateUUID();
    this.id_persona = data.id_persona || '';
    this.id_doc = data.id_doc || '';
    this.fecha_cargue = data.fecha_cargue || new Date().toISOString().split('T')[0];
    this.revision = data.revision || '0';
    this.fecha_revision = data.fecha_revision || '';
    this.estado = data.estado || 'Sin revisar';
    this.ruta_archivo = data.ruta_archivo || '';
  }
  
  /**
   * Valida que el objeto tenga todos los campos requeridos
   * @returns {boolean} - true si es válido, false si no
   */
  isValid() {
    return (
      this.id_persona && 
      this.id_doc && 
      this.fecha_cargue && 
      this.estado && 
      this.ruta_archivo
    );
  }
  
  /**
   * Obtiene errores de validación
   * @returns {Object} - Objeto con errores por campo
   */
  getValidationErrors() {
    const errors = {};
    
    if (!this.id_persona) {
      errors.id_persona = 'El ID de persona es requerido';
    }
    
    if (!this.id_doc) {
      errors.id_doc = 'El ID del tipo de documento es requerido';
    }
    
    if (!this.fecha_cargue) {
      errors.fecha_cargue = 'La fecha de cargue es requerida';
    }
    
    if (!this.estado) {
      errors.estado = 'El estado es requerido';
    }
    
    if (!this.ruta_archivo) {
      errors.ruta_archivo = 'La ruta del archivo es requerida';
    }
    
    return errors;
  }
  
  /**
   * Obtiene datos para guardar en la hoja de cálculo
   * @returns {Object} - Datos para guardar
   */
  toSheetData() {
    return {
      id_usuarioDoc: this.id_usuarioDoc,
      id_persona: this.id_persona,
      id_doc: this.id_doc,
      fecha_cargue: this.fecha_cargue,
      revision: this.revision,
      fecha_revision: this.fecha_revision,
      estado: this.estado,
      ruta_archivo: this.ruta_archivo
    };
  }
}

module.exports = DocumentoUsuario;