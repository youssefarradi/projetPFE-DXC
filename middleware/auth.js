const jwt = require('jsonwebtoken');
const config = require('../config/auth');
const User = require('../models/User');

// Middleware pour vérifier le token JWT
exports.verifyToken = async (req, res, next) => {
    const token = req.headers['x-access-token'];

    if (!token) {
        return res.status(403).json({ message: 'Aucun token fourni' });
    }

    try {
        const decoded = jwt.verify(token, config.secret);
        req.userId = decoded.id;

        const user = await User.findById(req.userId, { password: 0 });
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

        next();
    } catch (error) {
        return res.status(401).json({ message: 'Non autorisé' });
    }
};