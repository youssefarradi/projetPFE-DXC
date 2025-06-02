const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Le titre est obligatoire'],
        trim: true,
        maxlength: [100, 'Le titre ne peut excéder 100 caractères']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'La description ne peut excéder 500 caractères']
    },
    documentType: {
        type: String,
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    classification: {
        type: String,
        enum: ['Public', 'Private', 'Confidential'],
        default: 'Private'
    },
    filePath: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    extractedContent: { type: String, default: '' }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index pour améliorer les performances
documentSchema.index({ owner: 1, uploadDate: -1 });

module.exports = mongoose.model('Document', documentSchema);