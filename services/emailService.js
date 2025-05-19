const nodemailer = require('nodemailer');
const { google } = require('googleapis');
require('dotenv').config();

// Configuración de OAuth2
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Servicio para envío de emails usando Gmail con OAuth2
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  async setupTransporter() {
    try {
      // Configurar el cliente OAuth con el refresh token
      oAuth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN
      });

      // Obtener un access token nuevo (se renovará automáticamente)
      const accessToken = await oAuth2Client.getAccessToken();

      // Crear el transportador
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.GMAIL_USER,
          clientId: process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN,
          accessToken: accessToken.token
        }
      });

      console.log('Servicio de correo OAuth2 configurado correctamente');
    } catch (error) {
      console.error('Error al configurar el servicio de correo:', error);
      this.setupDevTransporter();
    }
  }

  setupDevTransporter() {
    // Transportador de respaldo para desarrollo
    console.log('Usando transportador de desarrollo (simula envío de correos)');
    this.transporter = {
      sendMail: (options) => {
        console.log('SIMULANDO ENVÍO DE CORREO:');
        console.log('Para:', options.to);
        console.log('Asunto:', options.subject);
        console.log('Código:', options.html.match(/(\d{6})/)?.[0] || 'No encontrado');
        return Promise.resolve({ success: true });
      }
    };
  }

  /**
   * Envía un correo con código de verificación
   * @param {string} email - Correo electrónico del destinatario
   * @param {string} code - Código de verificación
   * @returns {Promise<boolean>} - True si el envío fue exitoso
   */
  async sendVerificationCode(email, code) {
    try {
      if (!this.transporter) {
        await this.setupTransporter();
      }

      // Plantilla HTML del correo
      const mailOptions = {
        from: `"Facultad de Salud" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Código de Verificación - Facultad de Salud',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 5px;">
            <h2 style="color: #B22222; text-align: center;">Facultad de Salud</h2>
            <h3 style="text-align: center;">Código de Verificación</h3>
            <p>Hemos recibido una solicitud para ingresar a la plataforma de la Facultad de Salud.</p>
            <div style="text-align: center; padding: 15px; background-color: #f8f8f8; font-size: 24px; letter-spacing: 5px; margin: 20px 0; font-weight: bold;">
              ${code}
            </div>
            <p>Este código es válido por 15 minutos. Si no has solicitado este código, puedes ignorar este correo.</p>
            <p style="font-size: 12px; color: #777; margin-top: 30px; text-align: center;">
              Universidad del Valle - Facultad de Salud<br>
              Gestor documentos profesionales en escenarios de práctica
            </p>
          </div>
        `
      };

      // Enviar el correo
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo enviado:', info);
      return true;
    } catch (error) {
      console.error('Error al enviar correo:', error);
      
      // Si estamos en desarrollo, registrar el código para pruebas
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CÓDIGO] Verificación para ${email}: ${code}`);
        return true; // Devolver éxito en desarrollo para facilitar pruebas
      }
      
      return false;
    }
  }
}

module.exports = new EmailService();