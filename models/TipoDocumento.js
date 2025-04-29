// models/TipoDocumento.js
const { generateSequentialId } = require('../utils/idGenerator');

class TipoDocumento {
  constructor(data = {}) {
    this.id_tipoDoc = data.id_tipoDoc || generateSequentialId(data.lastId);
    this.nombre_tipoDoc = data.nombre_tipoDoc || '';
    this.vence = data.vence || false;
    this.tiempo_vencimiento = data.tiempo_vencimiento || 0;
  }
  
  isValid() {
    return this.nombre_tipoDoc && (typeof this.vence === 'boolean');
  }
  
  getValidationErrors() {
    const errors = {};
    
    if (!this.nombre_tipoDoc) {
      errors.nombre_tipoDoc = 'El nombre del tipo de documento es requerido';
    }
    
    if (typeof this.vence !== 'boolean') {
      errors.vence = 'El campo vence debe ser booleano';
    }
    
    return errors;
  }
  
  toSheetData() {
    return {
      id_tipoDoc: this.id_tipoDoc,
      nombre_tipoDoc: this.nombre_tipoDoc,
      vence: this.vence,
      tiempo_vencimiento: this.tiempo_vencimiento
    };
  }
}

module.exports = TipoDocumento;