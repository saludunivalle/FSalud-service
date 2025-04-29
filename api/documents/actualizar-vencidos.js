const documentosController = require('../../controllers/documentosController');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    if (req.method === 'POST') {
      return await documentosController.actualizarEstadosVencidos(req, res);
    }
    
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en endpoint de actualización de vencidos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};