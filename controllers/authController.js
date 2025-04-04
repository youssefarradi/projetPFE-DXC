const jwt = require('jsonwebtoken');
const config = require('../config/auth');
const User = require('../models/User');

// Inscription
exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        // Vérification si l'email existe déjà
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }

        // Création du nouvel utilisateur
        const user = new User({ name, email, password, role: role || 'user' });
        await user.save();

        // Génération du token JWT
        const token = jwt.sign({ id: user._id }, config.secret, {
            expiresIn: config.expiresIn
        });

        res.status(201).json({
            message: 'Utilisateur enregistré avec succès',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Connexion
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Recherche de l'utilisateur
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérification du mot de passe
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mot de passe incorrect' });
        }

        // Génération du token JWT
        const token = jwt.sign({ id: user._id }, config.secret, {
            expiresIn: config.expiresIn
        });

        res.status(200).json({
            message: 'Connexion réussie',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Profil utilisateur
exports.profile = async (req, res) => {
    try {
        const user = await User.findById(req.userId, { password: 0 });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};