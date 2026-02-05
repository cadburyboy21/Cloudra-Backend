const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Folder',
            default: null, // Root folder
        },
        path: {
            type: Array, // Array of ancestor objects [{id, name}]
            default: [],
        },
        isPublic: {
            type: Boolean,
            default: false,
        },
        shareToken: {
            type: String,
            unique: true,
            sparse: true,
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
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Folder', FolderSchema);
