const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require('dotenv').config();

// Import des routes
const usersRouter = require("./routes/userRoutes");
const authRouter = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/user-management";

// Configuration CORS
const corsOptions = {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connexion à MongoDB (version simplifiée pour Mongoose 6+)
mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB connecté avec succès");

        // Création des index (alternative moderne)
        mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true })
            .then(() => console.log("✔ Index email unique créé"))
            .catch(err => console.error("❌ Erreur création index:", err));
    })
    .catch((err) => {
        console.error("❌ Erreur de connexion MongoDB:", err.message);
        process.exit(1);
    });

// Gestion des événements de connexion MongoDB
mongoose.connection.on('connected', () => {
    console.log('Mongoose connecté à la base de données');
});

mongoose.connection.on('error', (err) => {
    console.error('Erreur de connexion Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose déconnecté');
});

// Routes API
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

// Route de test serveur
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Gestion des erreurs centralisée
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Gestion des routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint non trouvé'
    });
});

// Gestion propre de la fermeture
process.on('SIGINT', () => {
    mongoose.connection.close(() => {
        console.log('Mongoose déconnecté suite à l\'arrêt de l\'application');
        process.exit(0);
    });
});

// Lancer le serveur
const server = app.listen(PORT, () => {
    console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
    console.error('Rejet non géré:', err);
    server.close(() => process.exit(1));
});