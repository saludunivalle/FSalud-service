const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');
const destroyer = require('server-destroy');
const fs = require('fs');
require('dotenv').config();

// Credenciales de tu proyecto
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

// Ámbitos necesarios para enviar correo
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

/**
 * Obtiene un refresh token de Google para Gmail
 */
async function getRefreshToken() {
  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  );

  // Genera la URL de autorización
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Forzar a que siempre devuelva un refresh token
  });

  // Abre un servidor para recibir la redirección de OAuth2
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url.indexOf('/oauth2callback') > -1) {
        // Obtener el código de la URL
        const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
        const code = qs.get('code');
        
        // Obtener el token usando el código
        const { tokens } = await oauth2Client.getToken(code);
        
        // Guardar el token en un archivo
        fs.writeFileSync('./gmail_token.json', JSON.stringify(tokens, null, 2));
        
        // Responder al navegador
        res.end('Autenticación exitosa! Puedes cerrar esta ventana.');
        
        // Mostrar el token en consola
        console.log('Tokens obtenidos:');
        console.log(tokens);
        console.log('\nPara usar en .env:');
        console.log(`GMAIL_USER=${process.env.GOOGLE_CLIENT_EMAIL}`);
        console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log(`GMAIL_ACCESS_TOKEN=${tokens.access_token}`);
        
        // Cerrar el servidor
        server.close();
      }
    } catch (e) {
      console.error('Error al procesar la solicitud:', e);
      res.end('Error: ' + e.message);
    }
  }).listen(3000, () => {
    // Abrir el navegador para autorizar
    open(authorizeUrl, { wait: false });
    console.log('Abriendo navegador para autorización...');
  });
  
  destroyer(server);
}

getRefreshToken();