const User = require('../models/User');

// Vérifie si l'utilisateur a le rôle requis
exports.checkRole = (roles) => async (req, res, next) => {
    try {
        console.log("ID utilisateur :", req.userId); // debug ici

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        if (!roles.includes(user.role)) {
            return res.status(403).json({ message: 'Accès refusé' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
