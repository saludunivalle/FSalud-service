const authService = require('../services/authService');

exports.login = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'Token requerido' });
    }
    
    const userData = await authService.verifyGoogleToken(idToken);
    return res.status(200).json(userData);
  } catch (error) {
    console.error('Error en login controller:', error);
    return res.status(401).json({ error: 'Autenticación fallida' });
  }
};