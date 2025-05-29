const express = require('express');
const router = express.Router();
const reportsService = require('../services/reportsService');
const { authenticateToken } = require('../middleware/auth');

// Generate Excel report
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un usuario para generar el reporte' });
    }

    const buffer = await reportsService.generateExcelReport(userIds);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_estudiantes.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Error in report generation endpoint:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
});

module.exports = router; 