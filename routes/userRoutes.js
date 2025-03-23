const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 📌 1. Créer un utilisateur
router.post("/", async (req, res) => {
    const { name, email, age } = req.body;

    // Vérifier si les données nécessaires sont présentes
    if (!name || !email || !age) {
        return res.status(400).json({ message: "Tous les champs (name, email, age) sont requis." });
    }

    try {
        const newUser = new User({ name, email, age });
        await newUser.save();
        res.status(201).json(newUser); // Utilisateur créé avec succès
    } catch (error) {
        console.error("Erreur lors de la création de l'utilisateur:", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 2. Obtenir tous les utilisateurs
router.get("/", async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users); // Liste des utilisateurs
    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs:", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 3. Obtenir un utilisateur par ID
router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
        res.status(200).json(user); // Utilisateur trouvé
    } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        res.status(500).json({ error: error.message });
    }
});

// 📌 4. Mettre à jour un utilisateur
router.put("/:id", async (req, res) => {
    const { name, email, age } = req.body;

    if (!name || !email || !age) {
        return res.status(400).json({ message: "Tous les champs (name, email, age) sont requis pour la mise à jour." });
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, age },
            { new: true } // Retourne le document mis à jour
        );
        if (!updatedUser) {
            return res.status(404).json({ message: "Utilisateur non trouvé pour la mise à jour." });
        }
        res.status(200).json(updatedUser); // Utilisateur mis à jour
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
