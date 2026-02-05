const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema(
    {
        fileName: {
            type: String,
            required: true,
        },
        fileType: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number,
            required: true,
        },
        cloudinaryPublicId: {
            type: String,
            required: true,
        },
        cloudinaryUrl: {
            type: String,
            required: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        folder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Folder',
            default: null, // Null means root directory
        },
        isPublic: {
            type: Boolean,
            default: false,
        },
        shareToken: {
            type: String,
            unique: true,
            sparse: true, // Allows null/missing values while maintaining uniqueness for existing ones
        },
        shareExpiresAt: {
            type: Date,
            default: null,
        },
        sharedWith: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        isFavorite: {
            type: Boolean,
            default: false,
        },
        fileHash: {
            type: String,
            index: true,
        },
        versions: [
            {
                cloudinaryPublicId: String,
                cloudinaryUrl: String,
                fileSize: Number,
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('File', FileSchema);
