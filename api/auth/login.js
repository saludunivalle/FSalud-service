const authController = require('../../controllers/authController');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      return await authController.login(req, res);
    }
    
    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};