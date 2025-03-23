const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const usersRouter = require("./routes/userRoutes"); // Assurez-vous que le chemin est correct

require('dotenv').config(); // Charger les variables d'environnement

const app = express();
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

// Connexion à MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB connecté"))
    .catch((err) => {
        console.error("❌ Erreur de connexion MongoDB:", err);
        process.exit(1);
    });

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/users", usersRouter); // Routes des utilisateurs

// Lancer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
});
