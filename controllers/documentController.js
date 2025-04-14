const fs = require('fs');
const path = require('path');
const { fromPath } = require('pdf2pic');
const Tesseract = require('tesseract.js');
const Document = require('../models/Document');

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier' });

        const ext = path.extname(req.file.originalname).toLowerCase();
        let extractedContent = '';

        if (ext === '.pdf') {
            const outputPath = req.file.path.replace('.pdf', '');

            // Conversion PDF en PNG avec pdf2pic
            const convert = fromPath(req.file.path, { density: 300, saveFilename: 'page', savePath: './uploads/' });

            convert(1).then(async (resolve) => {
                const firstPage = resolve.path;

                try {
                    // Extraction du texte de l'image via OCR (Tesseract)
                    const resultOCR = await Tesseract.recognize(firstPage, 'fra');
                    extractedContent = resultOCR.data.text;

                    // Supprime l'image après extraction
                    fs.unlinkSync(firstPage);

                    const { title, description, documentType, classification } = req.body;
                    const document = new Document({
                        title,
                        description,
                        documentType,
                        owner: req.user.id,
                        classification: classification || 'Private',
                        filePath: req.file.path,
                        fileType: ext.substring(1),
                        fileSize: req.file.size,
                        originalName: req.file.originalname,
                        extractedContent
                    });

                    await document.save();
                    res.status(201).json({ success: true, data: document });
                } catch (ocrError) {
                    console.error('Erreur OCR:', ocrError);
                    return res.status(500).json({ success: false, message: 'Erreur OCR' });
                }
            }).catch((err) => {
                console.error("Erreur lors de la conversion PDF en PNG:", err);
                return res.status(500).json({ success: false, message: 'Erreur lors de la conversion PDF en PNG' });
            });
        } else {
            const result = await Tesseract.recognize(req.file.path, 'eng');
            extractedContent = result.data.text;

            const { title, description, documentType, classification } = req.body;
            const document = new Document({
                title,
                description,
                documentType,
                owner: req.user.id,
                classification: classification || 'Private',
                filePath: req.file.path,
                fileType: ext.substring(1),
                fileSize: req.file.size,
                originalName: req.file.originalname,
                extractedContent
            });

            await document.save();
            res.status(201).json({ success: true, data: document });
        }
    } catch (err) {
        console.error('❌ Erreur OCR ou upload :', err.message);
        res.status(500).json({ success: false, message: err.message });
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
