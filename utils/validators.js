// utils/validators.js
/**
 * Verifica si un correo electrónico es válido
 * @param {string} email - Correo electrónico a validar
 * @returns {boolean} - true si es válido, false si no
 */
const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };
  
  /**
   * Verifica si un correo es institucional (@correounivalle.edu.co)
   * @param {string} email - Correo electrónico a validar
   * @returns {boolean} - true si es institucional, false si no
   */
  const isInstitutionalEmail = (email) => {
    return isValidEmail(email) && email.endsWith('@correounivalle.edu.co');
  };
  
  /**
   * Verifica si una fecha es válida
   * @param {string} dateStr - Fecha en formato string (YYYY-MM-DD)
   * @returns {boolean} - true si es válida, false si no
   */
  const isValidDate = (dateStr) => {
    if (!dateStr) return false;
    
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };
  
  /**
   * Valida un objeto según reglas específicas
   * @param {Object} data - Datos a validar
   * @param {Object} rules - Reglas de validación
   * @returns {Object} - Errores de validación o null si no hay errores
   */
  const validateData = (data, rules) => {
    const errors = {};
    
    Object.keys(rules).forEach(field => {
      const value = data[field];
      const fieldRules = rules[field];
      
      // Validar requerido
      if (fieldRules.required && (value === undefined || value === null || value === '')) {
        errors[field] = `El campo ${field} es requerido`;
        return;
      }
      
      // Si no hay valor y no es requerido, no validar más reglas
      if (value === undefined || value === null || value === '') {
        return;
      }
      
      // Validar tipo
      if (fieldRules.type) {
        switch (fieldRules.type) {
          case 'email':
            if (!isValidEmail(value)) {
              errors[field] = 'El formato de correo electrónico no es válido';
            }
            break;
          case 'institutional_email':
            if (!isInstitutionalEmail(value)) {
              errors[field] = 'Debe ser un correo institucional (@correounivalle.edu.co)';
            }
            break;
          case 'date':
            if (!isValidDate(value)) {
              errors[field] = 'El formato de fecha no es válido (use YYYY-MM-DD)';
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
              errors[field] = 'Debe ser un valor booleano';
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors[field] = 'Debe ser un número';
            }
            break;
        }
      }
      
      // Validar mínimo
      if (fieldRules.min !== undefined && value.length < fieldRules.min) {
        errors[field] = `Debe tener al menos ${fieldRules.min} caracteres`;
      }
      
      // Validar máximo
      if (fieldRules.max !== undefined && value.length > fieldRules.max) {
        errors[field] = `Debe tener como máximo ${fieldRules.max} caracteres`;
      }
      
      // Validar con expresión regular
      if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
        errors[field] = fieldRules.message || 'El formato no es válido';
      }
      
      // Validar con función personalizada
      if (fieldRules.validate && typeof fieldRules.validate === 'function') {
        const validationError = fieldRules.validate(value, data);
        if (validationError) {
          errors[field] = validationError;
        }
      }
    });
    
    return Object.keys(errors).length > 0 ? errors : null;
  };
  
  module.exports = {
    isValidEmail,
    isInstitutionalEmail,
    isValidDate,
    validateData
  };