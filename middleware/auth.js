const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const config = require('../config/auth');
const User = require('../models/User');

exports.verifyToken = async (req, res, next) => {
    // 1. Extraction robuste du token
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    console.log('Token extrait:', token); // Debug important

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token manquant dans les headers'
        });
    }

    try {
        // 2. Décodage vérifié
        const decoded = jwt.verify(token, config.secret);
        console.log('ID décodé:', decoded.id); // Debug

        // 3. Validation MongoDB
        if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
            return res.status(400).json({
                success: false,
                message: 'ID utilisateur invalide'
            });
        }

        // 4. Récupération utilisateur
        const user = await User.findById(decoded.id).select('-password').lean();
        console.log('Utilisateur trouvé:', user ? 'OUI' : 'NON'); // Debug

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé en base'
            });
        }

        // 5. Attachement des données (méthode garantie)
        req.user = {
            ...user,
            id: user._id
        };

        req.userId = user._id; // ✅ Ajout nécessaire pour les middlewares comme checkRole

        console.log('Données attachées:', req.user); // Debug final
        next();

    } catch (error) {
        console.error('Erreur middleware:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Token invalide ou expiré'
        });
    }
};
