const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Configura el transporter de nodemailer
   */
  async setupTransporter() {
    if (this.transporter) return;

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: process.env.GMAIL_ACCESS_TOKEN
      }
    });
  }

  /**
   * Plantilla HTML para notificaciones de cambio de estado
   * @param {string} userName - Nombre del usuario
   * @param {string} documentName - Nombre del documento
   * @param {string} newStatus - Nuevo estado del documento
   * @param {string|Date} reviewDate - Fecha de revisión
   * @param {string} comments - Comentarios opcionales del revisor
   * @returns {string} - Plantilla HTML del correo
   */
  getStatusChangeTemplate(userName, documentName, newStatus, reviewDate, comments = '') {
    // Validar y sanitizar inputs
    userName = userName || 'Usuario';
    documentName = documentName || 'Documento';
    newStatus = newStatus || 'Procesado';
    reviewDate = reviewDate ? new Date(reviewDate) : new Date();
    comments = comments || '';

    const statusColors = {
      'Aprobado': '#4CAF50',
      'Rechazado': '#F44336',
      'Vencido': '#FF9800',
      'Cumplido': '#4CAF50',
      'Expirado': '#FF9800',
      'No aplica': '#9E9E9E'
    };

    const statusMessages = {
      'Aprobado': 'ha sido aprobado exitosamente',
      'Rechazado': 'ha sido rechazado y requiere corrección',
      'Vencido': 'ha vencido y necesita ser actualizado',
      'Cumplido': 'cumple con todos los requisitos',
      'Expirado': 'ha expirado y necesita ser actualizado',
      'No aplica': 'no aplica para tu caso'
    };

    const actionMessages = {
      'Aprobado': 'No se requiere ninguna acción adicional.',
      'Rechazado': 'Por favor, ingresa al sistema para revisar los comentarios y volver a cargar el documento corregido.',
      'Vencido': 'Es necesario que subas una versión actualizada del documento.',
      'Cumplido': 'Tu documento está al día.',
      'Expirado': 'Es necesario que subas una versión actualizada del documento.',
      'No aplica': 'No se requiere ninguna acción adicional.'
    };

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificación - Estado de Documento</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background-color: #B22222; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
              Facultad de Salud
            </h1>
            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
              Universidad del Valle
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <!-- Saludo -->
            <p style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">
              Estimado/a <strong>${userName}</strong>,
            </p>
            
            <!-- Mensaje principal -->
            <p style="font-size: 16px; color: #555555; line-height: 1.6; margin: 0 0 30px 0;">
              Te informamos que tu documento <strong>"${documentName}"</strong> ${statusMessages[newStatus] || 'ha sido procesado'}.
            </p>
            
            <!-- Estado del documento -->
            <div style="background-color: #f8f9fa; border-left: 4px solid ${statusColors[newStatus] || '#666666'}; padding: 20px; margin: 0 0 30px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333333; font-size: 16px;">Estado del Documento</h3>
              <p style="margin: 0; font-size: 24px; color: ${statusColors[newStatus] || '#666666'}; font-weight: bold;">
                ${newStatus.toUpperCase()}
              </p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666666;">
                Fecha de revisión: ${new Date(reviewDate).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            
            ${comments ? `
            <!-- Comentarios del revisor -->
            <div style="background-color: #fff3e0; border-radius: 8px; padding: 20px; margin: 0 0 30px 0;">
              <h4 style="margin: 0 0 10px 0; color: #f57c00; font-size: 14px; text-transform: uppercase;">
                Comentarios del revisor:
              </h4>
              <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
                ${comments}
              </p>
            </div>
            ` : ''}
            
            <!-- Acción requerida -->
            <div style="background-color: #fafafa; border-radius: 8px; padding: 20px; margin: 0 0 30px 0; text-align: center;">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">
                ${actionMessages[newStatus] || 'Por favor, ingresa al sistema para más información.'}
              </p>
              <a href="${process.env.FRONTEND_URL || 'https://documentosfsalud.vercel.app'}/dashboard" 
                 style="display: inline-block; background-color: #B22222; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                Ingresar al Sistema
              </a>
            </div>
            
            <!-- Footer -->
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 40px 0 20px 0;">
            
            <p style="font-size: 12px; color: #999999; text-align: center; margin: 0;">
              Este es un correo automático del Sistema de Gestión de Documentos de la Facultad de Salud.<br>
              Por favor, no responder a este mensaje.
            </p>
          </div>
          
          <!-- Footer institucional -->
          <div style="background-color: #2C3E50; padding: 20px; text-align: center;">
            <p style="color: #ffffff; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Universidad del Valle - Facultad de Salud<br>
              Gestor de documentos
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Envía notificación de cambio de estado con reintentos
   * @param {string} userEmail - Correo del usuario
   * @param {string} userName - Nombre del usuario
   * @param {string} documentName - Nombre del documento
   * @param {string} newStatus - Nuevo estado del documento
   * @param {string|Date} reviewDate - Fecha de revisión
   * @param {string} comments - Comentarios opcionales
   * @param {number} maxRetries - Número máximo de reintentos
   * @returns {Promise<Object>} - Resultado del envío
   */
  async sendStatusChangeNotification(userEmail, userName, documentName, newStatus, reviewDate, comments = '', maxRetries = 3) {
    // Validar inputs requeridos
    if (!userEmail) {
      throw new Error('El correo del usuario es requerido');
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      throw new Error('El formato del correo electrónico no es válido');
    }

    let lastError;
    let lastAttempt = 0;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      lastAttempt = attempt;
      try {
        if (!this.transporter) {
          await this.setupTransporter();
        }

        // Determinar si se debe incluir emoji en el asunto
        const shouldIncludeEmoji = ['Rechazado', 'Vencido', 'Expirado'].includes(newStatus);
        const subject = `${shouldIncludeEmoji ? '⚠️ ' : ''}Notificación: ${documentName} - ${newStatus}`;
        
        const mailOptions = {
          from: `"Facultad de Salud - Sistema de Documentos" <${process.env.GMAIL_USER}>`,
          to: userEmail,
          cc: 'practicas.medicina@correounivalle.edu.co',
          subject: subject,
          html: this.getStatusChangeTemplate(userName, documentName, newStatus, reviewDate, comments),
          // Versión de texto plano como respaldo
          text: this.getPlainTextVersion(userName, documentName, newStatus, reviewDate, comments)
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log(`Notificación enviada exitosamente a ${userEmail} (intento ${attempt}):`, info.messageId);
        
        return {
          success: true,
          messageId: info.messageId,
          attempt: attempt
        };
        
      } catch (error) {
        lastError = error;
        console.error(`Error enviando notificación (intento ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          // Esperar antes de reintentar (backoff exponencial)
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Esperando ${waitTime}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Reintentar setup del transporter en caso de error de autenticación
          if (error.message.includes('auth')) {
            this.transporter = null;
          }
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    console.error('Todos los intentos de envío fallaron:', lastError);
    return {
      success: false,
      error: lastError.message,
      attempts: lastAttempt,
      lastError: lastError
    };
  }

  /**
   * Genera versión de texto plano del correo
   * @private
   */
  getPlainTextVersion(userName, documentName, newStatus, reviewDate, comments) {
    const formattedDate = new Date(reviewDate).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
Estimado/a ${userName},

Te informamos que tu documento "${documentName}" ha sido marcado como: ${newStatus.toUpperCase()}.

Fecha de revisión: ${formattedDate}
${comments ? `\nComentarios del revisor: ${comments}` : ''}

${['Rechazado', 'Vencido', 'Expirado'].includes(newStatus) ? 
  'Por favor, ingresa al sistema para actualizar tu documento: ' + (process.env.FRONTEND_URL || 'https://documentosfsalud.vercel.app') + '/dashboard' : 
  'No se requiere ninguna acción adicional.'}

Atentamente,
Facultad de Salud - Universidad del Valle
    `.trim();
  }
}

module.exports = new EmailService();