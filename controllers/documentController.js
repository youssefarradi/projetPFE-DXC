const axios = require("axios"); // Pour appeler l'API du LLM
const fs = require('fs');
const path = require('path');
const { fromPath } = require('pdf2pic');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const Document = require('../models/Document');

// Fonction pour appeler le LLM pour la classification
const classifyWithLLM = async (extractedContent) => {
    try {
        const prompt = `
        Voici le contenu OCR ou du PDF :

        "${extractedContent}"

        Quelle est la catégorie de ce document ? Choisissez parmi les options suivantes : Facture, Contrat, Rapport, Lettre, Autre.
        Répondez uniquement par le nom de la catégorie.
        `;

        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
            model: "llama3-70b-8192",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2
        }, {
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content.trim(); // Renvoie la catégorie
    } catch (err) {
        console.error('❌ Erreur LLM :', err.message);
        return 'Autre'; // En cas d'erreur, on retourne 'Autre'
    }
};

exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier' });

        const ext = path.extname(req.file.originalname).toLowerCase();
        let extractedContent = '';

        // === PDF ===
        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(req.file.path);
            const parsed = await pdfParse(dataBuffer);

            if (parsed.text.trim().length > 20) {
                console.log('✅ Texte détecté dans le PDF, extraction avec pdf-parse');
                extractedContent = parsed.text;
            } else {
                console.log('⚠ Aucun texte détecté dans le PDF, OCR requis');

                // Convertir la 1ère page du PDF en image PNG
                const convert = fromPath(req.file.path, {
                    density: 200,
                    saveFilename: 'page',
                    savePath: './uploads/temp',
                    format: 'png',
                    width: 1200,
                    height: 1600
                });

                const result = await convert(1); // page 1
                const imagePath = result.path;

                const resultOCR = await Tesseract.recognize(imagePath, 'fra', {
                    logger: m => console.log(m)
                });

                extractedContent = resultOCR.data.text;
                fs.unlinkSync(imagePath); // Supprime l’image temporaire
            }

            // === Image (jpg, png, etc.) ===
        } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            console.log('🖼 Image détectée, OCR en cours...');
            const result = await Tesseract.recognize(req.file.path, 'fra');
            extractedContent = result.data.text;
        } else {
            extractedContent = '❌ Format non pris en charge pour l\'extraction.';
        }

        // === 2. Classification avec LLM ===
        const documentType = await classifyWithLLM(extractedContent);

        // Enregistrement en BDD
        const { title, description, classification } = req.body;

        const document = new Document({
            title,
            description,
            documentType, // Utilisation de la classification LLM
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

    } catch (err) {
        console.error('❌ Erreur extraction :', err.message);
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
exports.getAllDocuments = async (req, res) => {
    try {
        console.log('📚 Liste de tous les documents');

        const documents = await Document.find()
            .select('-filePath -__v') // Exclut filePath et __v de la réponse
            .sort('-uploadDate'); // Trie les documents par date de téléchargement décroissante

        console.log(`✅ ${documents.length} documents trouvés`);

        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents
        });
    } catch (error) {
        console.error('❌ Erreur getAllDocuments:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: error.message
        });
    }
};

