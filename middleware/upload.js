// 📁 middlewares/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// Dossier où seront stockés les fichiers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // crée ce dossier manuellement si nécessaire
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtrer les extensions autorisées
const fileFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé'), false);
    }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
