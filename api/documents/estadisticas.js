const documentosController = require('../../controllers/documentosController');
const { verifyJWT, isAdmin } = require('../../middleware/auth');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Verificar JWT y rol de administrador
    // verifyJWT(req, res, () => {
    //   isAdmin(req, res, async () => {
        if (req.method === 'GET') {
          return await documentosController.getEstadisticas(req, res);
        }
        
        return res.status(405).json({ error: 'Método no permitido' });
    //   });
    // });
  } catch (error) {
    console.error('Error en endpoint de estadísticas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};