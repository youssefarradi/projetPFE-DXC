// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { checkRole } = require('../middleware/roles');

// Routes protégées pour Admin seulement
router.get('/', verifyToken, checkRole(['admin']), userController.getAllUsers);
router.put('/:id', verifyToken, checkRole(['admin']), userController.updateUser);
router.delete('/:id', verifyToken, checkRole(['admin']), userController.deleteUser);
// Exemple en Express
router.get('/auth/me', verifyToken, (req, res) => {
    // req.user est rempli par le middleware d'authentification
    res.json({
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
    });
});

module.exports = router;