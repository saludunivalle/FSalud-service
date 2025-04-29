// repository/documentosRepository.js
const { BaseRepository } = require('./baseRepository');

const HEADERS = [
  'id_tipoDoc', 'nombre_tipoDoc', 'vence', 'tiempo_vencimiento'
];

class DocumentosRepository extends BaseRepository {
  constructor() {
    super('DOCUMENTOS', HEADERS);
  }
  
  /**
   * Encuentra un documento por su nombre
   * @param {string} nombre - Nombre del tipo de documento
   * @returns {Promise<Object|null>} - Documento encontrado o null
   */
  async findByNombre(nombre) {
    return this.findOneBy('nombre_tipoDoc', nombre);
  }
}

module.exports = new DocumentosRepository();