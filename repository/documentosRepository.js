// repository/documentosRepository.js
const { BaseRepository } = require('./baseRepository');

const HEADERS = [
  'id_doc', 'nombre_doc', 'vence', 'tiempo_vencimiento', 'dosis'
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
    return this.findOneBy('nombre_doc', nombre);
  }
  
  /**
   * Encuentra documentos que son de múltiples dosis
   * @returns {Promise<Array>} - Lista de documentos de múltiples dosis
   */
  async findMultiDoseDocuments() {
    const allDocs = await this.getAll();
    return allDocs.filter(doc => {
      const dosis = parseInt(doc.dosis);
      return !isNaN(dosis) && dosis > 1;
    });
  }
  
  /**
   * Verifica si un documento tiene múltiples dosis
   * @param {string} docId - ID del documento
   * @returns {Promise<boolean>} - true si tiene múltiples dosis
   */
  async isMultiDoseDocument(docId) {
    const doc = await this.findOneBy('id_doc', docId);
    if (!doc) return false;
    const dosis = parseInt(doc.dosis);
    return !isNaN(dosis) && dosis > 1;
  }

  async getAll() {
    const documentos = await super.getAll();
    console.log('Documentos obtenidos de la base de datos:', documentos);
    return documentos;
  }
}

module.exports = new DocumentosRepository();