// filepath: c:\Marcela\MONITORIA\FSalud-service\routes\programs.js
const express = require('express');
const router = express.Router();
const programsController = require('../controllers/programsController');

// Ruta para obtener todos los programas
// GET /api/programs
router.get('/programs', programsController.getAllPrograms);

module.exports = router;