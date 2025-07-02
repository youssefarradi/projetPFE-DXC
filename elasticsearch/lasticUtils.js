const client = require('./elasticsearchClient');

// 📌 Indexation d'un document
async function indexDocumentInES(document) {
    try {
        console.log("⏳ Tentative d'indexation du document dans Elasticsearch...");
        console.log("📄 ID:", document._id.toString());
        console.log("📄 Titre:", document.title);
        console.log("📄 Classification:", document.classification);

        const res = await client.index({
            index: 'documents',
            id: document._id.toString(),
            body: {
                title: document.title,
                description: document.description,
                documentType: document.documentType,
                classification: document.classification,
                extractedContent: document.extractedContent,
                uploadDate: document.uploadDate,
                owner: document.owner.toString()
            }
        });

        console.log("✅ Document indexé avec succès !");
        console.log("📥 Réponse Elasticsearch:", res);
    } catch (err) {
        console.error("❌ Échec de l'indexation du document dans Elasticsearch !");
        console.error("💥 Erreur Elasticsearch:", err.meta?.body || err.message);
        throw err;
    }
}

async function updateDocumentInES(id, fields) {
    try {
        console.log(`🔄 Mise à jour du document ${id} dans Elasticsearch...`);
        await client.update({
            index: 'documents',
            id,
            body: {
                doc: fields
            }
        });
        console.log("✅ Mise à jour réussie !");
    } catch (err) {
        console.error("❌ Erreur lors de la mise à jour du document:", err.message);
        throw err;
    }
}

async function deleteDocumentFromES(id) {
    try {
        console.log(`🗑 Suppression du document ${id} de l'index Elasticsearch...`);
        await client.delete({
            index: 'documents',
            id
        });
        console.log("✅ Suppression réussie !");
    } catch (err) {
        console.error("❌ Erreur lors de la suppression du document:", err.message);
        throw err;
    }
}

module.exports = {
    indexDocumentInES,
    updateDocumentInES,
    deleteDocumentFromES
};
