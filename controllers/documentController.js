const Document = require('../models/Document');
const fs = require('fs');
const path = require('path');

exports.uploadDocument = async (req, res) => {
    try {
        console.log('📤 Tentative d\'upload...');
        if (!req.file) {
            console.log('❌ Aucun fichier reçu');
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier téléchargé'
            });
        }

        console.log('✅ Fichier reçu :', req.file.originalname);
        console.log('📄 Corps de la requête :', req.body);

        const { title, description, documentType, classification } = req.body;

        const document = new Document({
            title,
            description,
            documentType,
            owner: req.user.id,
            classification: classification || 'Private',
            filePath: req.file.path,
            fileType: path.extname(req.file.originalname).substring(1),
            fileSize: req.file.size,
            originalName: req.file.originalname
        });

        await document.save();
        console.log('✅ Document enregistré en base :', document._id);

        res.status(201).json({
            success: true,
            data: {
                id: document._id,
                title: document.title,
                fileType: document.fileType,
                downloadUrl: `/api/documents/${document._id}/download`
            }
        });

    } catch (error) {
        console.error('❌ Erreur uploadDocument:', error.message);
        if (req.file) {
            console.log('🧹 Suppression du fichier suite à l\'erreur...');
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            message: 'Erreur lors du téléchargement',
            error: error.message
        });
    }
};


exports.downloadDocument = async (req, res) => {
    try {
        const docId = req.params.id;
        console.log(`📥 Requête pour télécharger le document : ${docId}`);

        const document = await Document.findById(docId);

        if (!document) {
            console.log('❌ Document non trouvé dans MongoDB');
            return res.status(404).json({
                success: false,
                message: 'Document non trouvé'
            });
        }

        console.log('✅ Document trouvé :', document.originalName);

        // Vérification des permissions
        if (document.owner.toString() !== req.user.id && document.classification === 'Private') {
            console.log('🚫 Accès refusé : document privé');
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé'
            });
        }

        if (!fs.existsSync(document.filePath)) {
            console.log('❌ Fichier manquant sur le disque :', document.filePath);
            return res.status(404).json({
                success: false,
                message: 'Fichier introuvable sur le serveur'
            });
        }

        console.log('📤 Téléchargement en cours depuis :', document.filePath);
        res.download(document.filePath, document.originalName);

    } catch (error) {
        console.error('❌ Erreur downloadDocument:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du téléchargement',
            error: error.message
        });
    }
};


exports.getUserDocuments = async (req, res) => {
    try {
        console.log(`📚 Liste des documents pour l'utilisateur : ${req.user.id}`);

        const documents = await Document.find({ owner: req.user.id })
            .select('-filePath -__v')
            .sort('-uploadDate');

        console.log(`✅ ${documents.length} documents trouvés`);

        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents
        });
    } catch (error) {
        console.error('❌ Erreur getUserDocuments:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
};
