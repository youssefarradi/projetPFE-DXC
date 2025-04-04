const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config/auth');
const User = require('../models/User');

// Fonction utilitaire pour générer des tokens
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId.toString() }, // Conversion explicite en string
        config.secret,
        { expiresIn: config.expiresIn }
    );
};

exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Validation de l'email
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'Email invalide'
            });
        }

        // Vérification de l'unicité de l'email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Cet email est déjà utilisé'
            });
        }

        // Création de l'utilisateur
        const user = new User({
            name,
            email,
            password,
            role: role || 'user'
        });

        await user.save();

        // Réponse avec token
        res.status(201).json({
            success: true,
            message: 'Utilisateur enregistré avec succès',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token: generateToken(user._id)
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'inscription',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Validation des champs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email et mot de passe requis'
            });
        }

        // Recherche de l'utilisateur
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Vérification du mot de passe
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Mot de passe incorrect'
            });
        }

        // Réponse avec token
        res.status(200).json({
            success: true,
            message: 'Connexion réussie',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token: generateToken(user._id)
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la connexion',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.profile = async (req, res) => {
    try {
        // Vérification ultra-robuste
        if (!req.user || !req.user.id) {
            console.error('Données manquantes dans req.user:', req.user);
            return res.status(403).json({
                success: false,
                message: 'Données de session manquantes',
                solution: 'Vérifiez le middleware verifyToken'
            });
        }

        // Récupération fraîche des données (sécurité supplémentaire)
        const currentUser = await User.findById(req.user.id)
            .select('-password -__v')
            .lean();

        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur introuvable en base'
            });
        }

        // Réponse standardisée
        res.status(200).json({
            success: true,
            user: {
                id: currentUser._id,
                name: currentUser.name,
                email: currentUser.email,
                role: currentUser.role
                // Ajoutez d'autres champs au besoin
            }
        });

    } catch (error) {
        console.error('Erreur profile:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur technique',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }

};