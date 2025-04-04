const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [/.+\@.+\..+/, 'Veuillez entrer un email valide']
    },
    password: { type: String, required: true, select: false },
    role: {
        type: String,
        enum: ['admin', 'reviewer', 'user'],
        default: 'user'
    },
    createdAt: { type: Date, default: Date.now }
});

// Hash du mot de passe avant sauvegarde
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);