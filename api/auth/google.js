// api/auth/google.js
const authController = require('../../controllers/authController');

module.exports = async (req, res) => {
  // Configurar CORS para desarrollo local
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Responder inmediatamente a las solicitudes OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    console.log('Recibida solicitud POST a /api/auth/google');
    if (req.method === 'POST') {
      return await authController.googleAuth(req, res);
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en endpoint Google Auth:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};