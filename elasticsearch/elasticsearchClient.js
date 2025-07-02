const { Client } = require('@elastic/elasticsearch');

const client = new Client({
    node: 'http://localhost:9200',
    requestTimeout:  120000 // 30 secondes

    // ✅ Ne PAS ajouter de headers ici
});

module.exports = client;
