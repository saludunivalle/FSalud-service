// models/Usuario.js
const { generateUserId } = require('../utils/idGenerator');

class Usuario {
  constructor(data = {}) {
    this.id_usuario = data.id_usuario || generateUserId();
    this.correo_usuario = data.correo_usuario || '';
    this.nombre_usuario = data.nombre_usuario || '';
    this.apellido_usuario = data.apellido_usuario || '';
    this.documento_usuario = data.documento_usuario || '';
    this.tipoDoc = data.tipoDoc || '';
    this.telefono = data.telefono || '';
    this.direccion = data.direccion || '';
    this.observaciones = data.observaciones || '';
    this.fecha_nac = data.fecha_nac || '';
    this.email = data.email || '';
    this.rol = data.rol || 'estudiante';
  }
  
  /**
   * Valida que el objeto tenga todos los campos requeridos
   * @returns {boolean} - true si es válido, false si no
   */
  isValid() {
    return (
      this.correo_usuario && 
      this.correo_usuario.endsWith('@correounivalle.edu.co') &&
      this.nombre_usuario && 
      this.apellido_usuario
    );
  }
  
  /**
   * Obtiene errores de validación
   * @returns {Object} - Objeto con errores por campo
   */
  getValidationErrors() {
    const errors = {};
    
    if (!this.correo_usuario) {
      errors.correo_usuario = 'El correo es requerido';
    } else if (!this.correo_usuario.endsWith('@correounivalle.edu.co')) {
      errors.correo_usuario = 'Debe ser un correo institucional (@correounivalle.edu.co)';
    }
    
    if (!this.nombre_usuario) {
      errors.nombre_usuario = 'El nombre es requerido';
    }
    
    if (!this.apellido_usuario) {
      errors.apellido_usuario = 'El apellido es requerido';
    }
    
    return errors;
  }
  
  /**
   * Obtiene datos para guardar en la hoja de cálculo
   * @returns {Object} - Datos para guardar
   */
  toSheetData() {
    return {
      id_usuario: this.id_usuario,
      correo_usuario: this.correo_usuario,
      nombre_usuario: this.nombre_usuario,
      apellido_usuario: this.apellido_usuario,
      documento_usuario: this.documento_usuario,
      tipoDoc: this.tipoDoc,
      telefono: this.telefono,
      direccion: this.direccion,
      observaciones: this.observaciones,
      fecha_nac: this.fecha_nac,
      email: this.email,
      rol: this.rol
    };
  }
}

module.exports = Usuario;