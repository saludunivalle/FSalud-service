// utils/formatters.js

/**
 * Formatea una fecha en formato ISO a formato DD/MM/YYYY
 * @param {string} isoDate - Fecha en formato ISO o YYYY-MM-DD
 * @returns {string} - Fecha formateada como DD/MM/YYYY
 */
const formatDate = (isoDate) => {
    if (!isoDate) return '';
    
    try {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return isoDate; // Devolver original si no es válida
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return isoDate; // Devolver original en caso de error
    }
  };
  
  /**
   * Formatea un estado de documento para mostrar en UI
   * @param {string} estado - Estado del documento
   * @returns {Object} - Objeto con texto y clase CSS para el estado
   */
  const formatEstadoDocumento = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'sin revisar':
        return { text: 'Sin revisar', class: 'pending' };
      case 'rechazado':
        return { text: 'Rechazado', class: 'rejected' };
      case 'cumplido':
        return { text: 'Cumplido', class: 'approved' };
      case 'expirado':
        return { text: 'Expirado', class: 'expired' };
      case 'no aplica':
        return { text: 'No aplica', class: 'not-applicable' };
      case 'sin cargar':
        return { text: 'Sin cargar', class: 'not-loaded' };
      default:
        return { text: estado || 'Desconocido', class: 'unknown' };
    }
  };
  
  /**
   * Convierte un valor booleano o string a un formato legible
   * @param {boolean|string} value - Valor booleano o string ('true', 'false', '1', '0', etc.)
   * @returns {string} - 'Sí' o 'No'
   */
  const formatBoolean = (value) => {
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    
    if (typeof value === 'string') {
      const lowercaseValue = value.toLowerCase();
      return (lowercaseValue === 'true' || lowercaseValue === '1' || lowercaseValue === 'si' || lowercaseValue === 'sí') 
        ? 'Sí' 
        : 'No';
    }
    
    return value ? 'Sí' : 'No';
  };
  
  /**
   * Formatea tiempo de vencimiento en días a un formato legible
   * @param {number|string} dias - Días para vencimiento
   * @returns {string} - Texto formateado
   */
  const formatTiempoVencimiento = (dias) => {
    if (!dias || dias === '0') return 'No vence';
    
    const diasNum = parseInt(dias);
    if (isNaN(diasNum) || diasNum <= 0) return 'No vence';
    
    if (diasNum === 1) return '1 día';
    if (diasNum < 30) return `${diasNum} días`;
    
    const meses = Math.floor(diasNum / 30);
    const diasRestantes = diasNum % 30;
    
    if (meses === 1) {
      return diasRestantes > 0 
        ? `1 mes y ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}` 
        : '1 mes';
    }
    
    return diasRestantes > 0 
      ? `${meses} meses y ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}` 
      : `${meses} meses`;
  };
  
  /**
   * Formatea el nombre de un tipo de documento
   * @param {string} nombre - Nombre del tipo de documento
   * @returns {string} - Nombre formateado
   */
  const formatNombreDocumento = (nombre) => {
    if (!nombre) return '';
    
    // Capitalizar primera letra y resto en minúsculas
    return nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();
  };
  
  /**
   * Formatea una URL para mostrar en UI
   * @param {string} url - URL completa
   * @returns {string} - URL formateada o texto para mostrar
   */
  const formatUrl = (url) => {
    if (!url) return 'No disponible';
    
    // Si es una URL de Google Drive, mostrar texto amigable
    if (url.includes('drive.google.com')) {
      return 'Ver documento en Drive';
    }
    
    // Acortar URLs largas
    if (url.length > 30) {
      return url.substring(0, 27) + '...';
    }
    
    return url;
  };
  
  module.exports = {
    formatDate,
    formatEstadoDocumento,
    formatBoolean,
    formatTiempoVencimiento,
    formatNombreDocumento,
    formatUrl
  };