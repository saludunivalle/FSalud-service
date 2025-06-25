// Ensure you import necessary modules and middleware
const express = require('express');
const router = express.Router();
const { verifyJWT, isProfesor } = require('../middleware/auth'); // Correct path to your auth middleware
const usersController = require('../controllers/usersController');
// const studentController = require('../controllers/studentController'); // Example controller

// All routes defined after this middleware will first verify JWT, then check if user is admin or profesor
router.use(verifyJWT, isProfesor);

// Example: Route to get specific student data for admin/professor view
// GET /api/admin/student-data/:studentId
router.get('/student-data/:studentId', (req, res) => {
  // Logic to fetch student data for admin/professor
  // req.user is populated by verifyJWT
  // req.params.studentId is available
  // Example: studentController.getStudentDetailsForAdmin(req, res);
  res.json({ success: true, message: `Access granted for user ${req.user.email} to student ${req.params.studentId}` });
});

// Example: Route to update student status by admin/professor
// POST /api/admin/update-student-status/:studentId
router.post('/update-student-status/:studentId', (req, res) => {
  // Logic to update student status
  // Example: studentController.updateStudentStatusByAdmin(req, res);
  res.json({ success: true, message: `Status updated for student ${req.params.studentId} by ${req.user.email}` });
});

// Crear usuario manualmente desde el panel de administración
router.post('/create-user', usersController.createUserFromAdmin);

module.exports = router;