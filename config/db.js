// config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
    const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/user-management";

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB connecté avec succès");

        // Création de l'index unique pour les emails
        mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true })
            .then(() => console.log("✔ Index email unique créé"))
            .catch(err => console.error("❌ Erreur création index:", err));
    } catch (err) {
        console.error("❌ Erreur de connexion MongoDB:", err.message);
        process.exit(1); // Quitte l'application en cas d'échec
    }

    // Gestion des événements
    mongoose.connection.on('connected', () => {
        console.log('🔗 Mongoose connecté à la base de données');
    });

    mongoose.connection.on('error', (err) => {
        console.error('❌ Erreur de connexion Mongoose:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('🔌 Mongoose déconnecté');
    });
};

module.exports = connectDB;
