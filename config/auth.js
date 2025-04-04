// configuration JWT
module.exports = {
    secret: process.env.JWT_SECRET || 'votre_cle_secrete_super_securisee',
    expiresIn: '24h' // Durée de validité du token
};