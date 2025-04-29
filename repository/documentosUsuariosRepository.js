const { BaseRepository } = require('./baseRepository');
const { generateUUID } = require('../utils/idGenerator');

const HEADERS = [
  'id_usuarioDoc', 'id_persona', 'id_doc', 'fecha_cargue', 
  'revision', 'fecha_revision', 'estado', 'ruta_archivo'
];

class DocumentosUsuariosRepository extends BaseRepository {
  constructor() {
    super('DOCUMENTOS_USUARIOS', HEADERS);
  }
  
  /**
   * Crea un nuevo registro de documento de usuario
   * @param {Object} data - Datos del documento de usuario
   * @returns {Promise<Object>} - Documento creado
   */
  async createDocumentoUsuario(data) {
    // Generar ID único si no viene
    if (!data.id_usuarioDoc) {
      data.id_usuarioDoc = generateUUID();
    }
    
    // Establecer fecha de carga actual si no viene
    if (!data.fecha_cargue) {
      data.fecha_cargue = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    }
    
    // Estado inicial "Sin revisar" si no se especifica
    if (!data.estado) {
      data.estado = 'Sin revisar';
    }
    
    return this.create(data);
  }
  
  /**
   * Encuentra documentos por ID de persona (usuario)
   * @param {string} idPersona - ID del usuario
   * @returns {Promise<Array>} - Documentos del usuario
   */
  async findByUsuario(idPersona) {
    return this.findBy('id_persona', idPersona);
  }
  
  /**
   * Encuentra documentos por tipo de documento
   * @param {string} idDoc - ID del tipo de documento
   * @returns {Promise<Array>} - Documentos de ese tipo
   */
  async findByTipoDocumento(idDoc) {
    return this.findBy('id_doc', idDoc);
  }
  
  /**
   * Encuentra documentos por estado
   * @param {string} estado - Estado del documento
   * @returns {Promise<Array>} - Documentos con ese estado
   */
  async findByEstado(estado) {
    return this.findBy('estado', estado);
  }
  
  /**
   * Encuentra un documento específico de un usuario
   * @param {string} idPersona - ID del usuario
   * @param {string} idDoc - ID del tipo de documento
   * @returns {Promise<Object|null>} - Documento encontrado o null
   */
  async findDocumentoUsuario(idPersona, idDoc) {
    const documentos = await this.getAll();
    return documentos.find(doc => 
      doc.id_persona === idPersona && doc.id_doc === idDoc
    ) || null;
  }
  
  /**
   * Actualiza el estado de un documento
   * @param {string} idUsuarioDoc - ID del documento de usuario
   * @param {string} estado - Nuevo estado
   * @param {boolean} revisado - Si fue revisado
   * @returns {Promise<Object|null>} - Documento actualizado o null
   */
  async actualizarEstado(idUsuarioDoc, estado, revisado = true) {
    const updates = {
      estado,
      revision: revisado ? '1' : '0',
      fecha_revision: revisado ? new Date().toISOString().split('T')[0] : ''
    };
    
    return this.update('id_usuarioDoc', idUsuarioDoc, updates);
  }
}

module.exports = new DocumentosUsuariosRepository();