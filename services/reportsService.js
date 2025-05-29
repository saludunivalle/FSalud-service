const xlsx = require('xlsx');
const { Usuario } = require('../models/Usuario');
const { DocumentoUsuario } = require('../models/DocumentoUsuario');
const { TipoDocumento } = require('../models/TipoDocumento');

class ReportsService {
  async generateExcelReport(userIds) {
    try {
      // Fetch users with their documents
      const users = await Usuario.findAll({
        where: { id: userIds },
        include: [{
          model: DocumentoUsuario,
          include: [{
            model: TipoDocumento
          }]
        }]
      });

      // Prepare data for Excel
      const data = users.map(user => {
        const documents = user.DocumentoUsuarios.map(doc => {
          const status = doc.estado || 'PENDIENTE';
          const reviewDate = doc.fecha_revision ? new Date(doc.fecha_revision).toLocaleDateString() : 'N/A';
          return `${doc.TipoDocumento.nombre} - ${status} - ${reviewDate}`;
        }).join('; ');

          return {
          NOMBRE: user.nombre,
          CEDULA: user.cedula,
          CORREO: user.correo,
          NOMBRE_DOC: documents
        };
      });

      // Create workbook and worksheet
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(data);

      // Set column widths
      const colWidths = [
        { wch: 30 }, // NOMBRE
        { wch: 15 }, // CEDULA
        { wch: 30 }, // CORREO
        { wch: 50 }  // NOMBRE_DOC
      ];
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Reporte Estudiantes');

      // Generate buffer
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return buffer;
    } catch (error) {
      console.error('Error generating Excel report:', error);
      throw error;
    }
  }
}

module.exports = new ReportsService(); 