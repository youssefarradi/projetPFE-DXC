// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth'); // Import correct du midd

// Routes publiques
router.post('/register', authController.register);
router.post('/login', authController.login);

// Route protégée
router.get('/profile', verifyToken, authController.profile);

module.exports = router;