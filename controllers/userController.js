// controllers/userController.js
const User = require('../models/User');

// Récupérer tous les utilisateurs (Admin seulement)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mettre à jour un utilisateur (Admin seulement)
exports.updateUser = async (req, res) => {
    const { name, email, role } = req.body;

    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role },
            { new: true, select: '-password' }
        );

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json({
            message: 'Utilisateur mis à jour avec succès',
            user
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Supprimer un utilisateur (Admin seulement)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};