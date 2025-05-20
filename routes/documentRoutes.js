const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { checkRole } = require('../middleware/roles');

// Upload avec vérification du token et middleware multer
router.post('/', verifyToken,checkRole(['admin','user']), upload.single('file'), documentController.uploadDocument);

// Téléchargement sécurisé
router.get('/:id/download', verifyToken, documentController.downloadDocument);

// Liste des documents utilisateur
router.get('/', verifyToken, documentController.getUserDocuments);
router.get('/all', verifyToken, documentController.getAllDocuments);

module.exports = router;