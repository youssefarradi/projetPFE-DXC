const axios = require("axios");
const fs = require('fs');
const path = require('path');
const { fromPath } = require('pdf2pic');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const Document = require('../models/Document');
const client = require('../elasticsearch/elasticsearchClient');
const { indexDocumentInES } = require('../elasticsearch/lasticUtils');

// Fonction pour appeler le LLM pour la classification
const classifyWithLLM = async (extractedContent) => {
    try {
        const prompt = `
        Voici le contenu OCR ou du PDF :

        "${extractedContent.substring(0, 2000)}" [tronqué]

        Quelle est la catégorie de ce document ? Choisissez parmi les options suivantes : Facture, Contrat, Rapport, Lettre, Autre.
        Répondez uniquement par le nom de la catégorie.
        `;

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama3-70b-8192",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                max_tokens: 50
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 10000 // 10 secondes timeout
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (err) {
        console.error('❌ Erreur LLM :', err.response?.data || err.message);
        return 'Autre';
    }
};

exports.uploadDocument = async (req, res) => {
    try {
        console.log("📥 Nouvelle tentative d'upload de document");

        if (!req.file) {
            console.warn('⚠️ Aucun fichier détecté');
            return res.status(400).json({
                success: false,
                message: 'Aucun fichier téléchargé'
            });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        console.log("📁 Extension du fichier:", ext);

        let extractedContent = '';

        if (ext === '.pdf') {
            try {
                console.log("📖 Lecture du PDF...");
                const dataBuffer = fs.readFileSync(req.file.path);
                const parsed = await pdfParse(dataBuffer);
                extractedContent = parsed.text;
                console.log("📄 Contenu extrait du PDF (début):", extractedContent.substring(0, 200));
            } catch (err) {
                console.error('❌ Erreur lors du traitement du PDF:', err);
                throw new Error('Erreur lors du traitement du PDF');
            }
        } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
            try {
                console.log("🧠 Lancement de l'OCR via Tesseract...");
                const { data } = await Tesseract.recognize(req.file.path, 'fra');
                extractedContent = data.text;
                console.log("📄 Texte OCR extrait (début):", extractedContent.substring(0, 200));
            } catch (err) {
                console.error('❌ Erreur lors de l\'OCR:', err);
                throw new Error('Erreur lors de l\'OCR');
            }
        } else {
            throw new Error('Format de fichier non supporté');
        }

        if (!req.body.documentType || !req.body.classification) {
            console.warn("⚠️ Champs manquants: documentType ou classification");
            return res.status(400).json({
                success: false,
                message: 'Le type de document et la classification sont obligatoires'
            });
        }

        const document = new Document({
            title: req.body.title || path.parse(req.file.originalname).name,
            description: req.body.description || '',
            documentType: req.body.documentType,
            classification: req.body.classification,
            owner: req.user.id,
            filePath: req.file.path,
            fileType: ext.substring(1),
            fileSize: req.file.size,
            originalName: req.file.originalname,
            extractedContent
        });

        await document.save();
        console.log("💾 Document sauvegardé dans MongoDB, ID:", document._id);

        await indexDocumentInES(document); // << le problème vient probablement ici

        return res.status(201).json({
            success: true,
            data: document
        });

    } catch (err) {
        console.error('❌ Erreur uploadDocument:', err.message || err);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log("🧹 Fichier temporaire supprimé du disque");
        }

        return res.status(500).json({
            success: false,
            message: err.message || 'Erreur lors du traitement du document'
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

exports.deleteDocument = async (req, res) => {
    try {
        const docId = req.params.id;
        console.log(`🗑 Requête de suppression du document : ${docId}`);

        const document = await Document.findById(docId);

        if (!document) {
            console.log('❌ Document non trouvé dans MongoDB');
            return res.status(404).json({
                success: false,
                message: 'Document non trouvé'
            });
        }

        // ✅ Vérification que seul l'admin peut supprimer
        if (req.user.role !== 'admin') {
            console.log('🚫 Accès refusé : seul un administrateur peut supprimer des documents');
            return res.status(403).json({
                success: false,
                message: 'Seul un administrateur peut supprimer des documents'
            });
        }

        // Suppression du fichier du disque
        if (fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
            console.log('🗑 Fichier supprimé du disque :', document.filePath);
        } else {
            console.log('⚠ Fichier déjà inexistant sur le disque :', document.filePath);
        }

        // Suppression dans MongoDB
        await Document.findByIdAndDelete(docId);
        console.log('✅ Document supprimé de MongoDB');

        res.status(200).json({
            success: true,
            message: 'Document supprimé avec succès'
        });

    } catch (error) {
        console.error('❌ Erreur deleteDocument:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression',
            error: error.message
        });
    }
};
exports.searchDocuments = async (req, res) => {
    try {
        const { query } = req.query;
        console.log(`🔍 Recherche de documents avec le mot-clé : "${query}"`);

        if (!query || query.trim() === '') {
            console.warn('⚠️ Requête de recherche vide');
            return res.status(400).json({
                success: false,
                message: 'Le terme de recherche est requis'
            });
        }

        // Recherche dans Elasticsearch si disponible
        if (client) {
            try {
                console.log('🔎 Recherche dans Elasticsearch...');
                const { body } = await client.search({
                    index: 'documents',
                    body: {
                        query: {
                            multi_match: {
                                query: query,
                                fields: ['title^3', 'description^2', 'extractedContent', 'documentType', 'classification'],
                                fuzziness: 'AUTO'
                            }
                        }
                    }
                });

                const hits = body.hits.hits;
                console.log(`✅ ${hits.length} résultats trouvés dans Elasticsearch`);

                return res.status(200).json({
                    success: true,
                    count: hits.length,
                    data: hits.map(hit => hit._source)
                });
            } catch (esError) {
                console.error('❌ Erreur Elasticsearch, basculement vers MongoDB:', esError.message);
                // Continue avec la recherche MongoDB en cas d'erreur ES
            }
        }

        // Recherche dans MongoDB si Elasticsearch n'est pas disponible ou en erreur
        console.log('🔎 Recherche dans MongoDB...');
        const documents = await Document.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { extractedContent: { $regex: query, $options: 'i' } },
                { documentType: { $regex: query, $options: 'i' } },
                { classification: { $regex: query, $options: 'i' } }
            ]
        })
            .select('-filePath -__v')
            .sort('-uploadDate');

        console.log(`✅ ${documents.length} résultats trouvés dans MongoDB`);

        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents
        });

    } catch (error) {
        console.error('❌ Erreur searchDocuments:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la recherche',
            error: error.message
        });
    }
};


