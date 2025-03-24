const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../models/User");

// 📌 1. Créer un utilisateur (avec hachage du mot de passe)
router.post("/", async (req, res) => {
    const { name, email, password, role } = req.body;

    // Vérifier si tous les champs sont fournis
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "Tous les champs (name, email, password, role) sont requis." });
    }

    try {
        // Vérifier si l'email existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Cet email est déjà utilisé." });
        }

        // Hachage du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ name, email, password: hashedPassword, role });
        await newUser.save();
        res.status(201).json({ message: "Utilisateur créé avec succès", user: newUser });
    } catch (error) {
        console.error("Erreur lors de la création de l'utilisateur:", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 2. Obtenir tous les utilisateurs (sans afficher les mots de passe)
router.get("/", async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json(users);
    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs:", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 3. Obtenir un utilisateur par ID (sans afficher le mot de passe)
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
        res.status(200).json(user);
    } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 4. Mettre à jour un utilisateur (avec hachage du nouveau mot de passe)
router.put("/:id", async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !role) {
        return res.status(400).json({ message: "Les champs (name, email, role) sont requis pour la mise à jour." });
    }

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé pour la mise à jour." });
        }

        // Vérifier si un nouvel email est fourni et déjà utilisé par un autre utilisateur
        if (email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "Cet email est déjà utilisé par un autre utilisateur." });
            }
        }

        // Hachage du nouveau mot de passe si fourni
        let hashedPassword = user.password;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        user.name = name;
        user.email = email;
        user.password = hashedPassword;
        user.role = role;

        await user.save();
        res.status(200).json({ message: "Utilisateur mis à jour avec succès", user });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 5. Supprimer un utilisateur
router.delete("/:id", async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).json({ message: "Utilisateur non trouvé pour suppression." });
        }
        res.status(200).json({ message: "Utilisateur supprimé avec succès." });
    } catch (error) {
        console.error("Erreur lors de la suppression de l'utilisateur:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
