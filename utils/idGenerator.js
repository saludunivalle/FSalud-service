// utils/idGenerator.js
const { v4: uuidv4 } = require('uuid');

/**
 * Genera un ID de usuario al estilo Google (21 dígitos)
 * @returns {string} - ID de usuario
 */
const generateUserId = () => {
    // Asegurar que generamos exactamente 21 dígitos
    const timestamp = Date.now().toString();
    // Calculamos cuántos dígitos aleatorios necesitamos para llegar a 21
    const remainingDigits = 21 - timestamp.length;
    // Generamos un número aleatorio con los dígitos restantes
    const randomPart = Math.floor(Math.random() * Math.pow(10, remainingDigits))
      .toString().padStart(remainingDigits, '0');
    
    return timestamp + randomPart;
  };
  

/**
 * Genera un ID secuencial basado en un contador
 * @param {number} lastId - Último ID utilizado
 * @returns {number} - Nuevo ID secuencial
 */
const generateSequentialId = (lastId) => {
  return parseInt(lastId || 0) + 1;
};

/**
 * Genera un ID UUID
 * @returns {string} - UUID generado
 */
const generateUUID = () => {
  return uuidv4();
};

/**
 * Genera un ID prefijado para una entidad específica
 * @param {string} prefix - Prefijo para el ID (ej: "DOC", "ESC")
 * @param {number} lastId - Último ID numérico utilizado
 * @returns {string} - ID con prefijo (ej: "DOC001")
 */
const generatePrefixedId = (prefix, lastId) => {
  const numericPart = parseInt(lastId || 0) + 1;
  const paddedNumeric = numericPart.toString().padStart(3, '0');
  return `${prefix}${paddedNumeric}`;
};

module.exports = {
  generateUserId,
  generateSequentialId,
  generateUUID,
  generatePrefixedId
};