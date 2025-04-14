const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Chargement des variables d'environnement
dotenv.config();

// Connexion MongoDB (modularisée)
const connectDB = require("./config/db");

// Import des routes
const usersRouter = require("./routes/userRoutes");
const authRouter = require("./routes/authRoutes");
const documentsRouter = require("./routes/documentRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// Configuration CORS
const corsOptions = {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connexion à MongoDB
connectDB();

// Routes API
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/documents", documentsRouter);

// Route de test
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Middleware d'erreur global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Middleware pour les routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint non trouvé'
    });
});

// Gestion propre de la fermeture du serveur
process.on('SIGINT', () => {
    const mongoose = require("mongoose");
    mongoose.connection.close(() => {
        console.log("🔌 Mongoose déconnecté suite à l'arrêt de l'application");
        process.exit(0);
    });
});

// Lancement du serveur
const server = app.listen(PORT, () => {
    console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
    console.error('🚨 Rejet non géré:', err);
    server.close(() => process.exit(1));
});
