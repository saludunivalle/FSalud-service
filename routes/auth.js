// routes/auth.js
const express = require('express');
const router = express.Router();
const { googleAuth } = require('../controllers/authController');

// Ruta para autenticación con Google
router.post('/google', googleAuth);

module.exports = router;