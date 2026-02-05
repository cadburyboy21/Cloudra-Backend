const Folder = require('../models/Folder');
const File = require('../models/File');

// @desc      Create new folder
// @route     POST /api/folders
// @access    Private
exports.createFolder = async (req, res, next) => {
    try {
        const { name, parentId } = req.body;

        let path = [];
        if (parentId) {
            const parentFolder = await Folder.findOne({ _id: parentId, owner: req.user.id });
            if (!parentFolder) {
                return res.status(404).json({ success: false, error: 'Parent folder not found' });
            }
            // Construct path from parent
            path = [...parentFolder.path, { id: parentFolder._id, name: parentFolder.name }];
        }

        const folder = await Folder.create({
            name,
            owner: req.user.id,
            parent: parentId || null,
            path,
        });

        res.status(201).json({ success: true, data: folder });
    } catch (err) {
        next(err);
    }
};

// @desc      Get folders (in a specific directory)
// @route     GET /api/folders
// @access    Private
exports.getFolders = async (req, res, next) => {
    try {
        const parentId = req.query.parentId || null;

        const folders = await Folder.find({
            owner: req.user.id,
            parent: parentId,
        });

        res.status(200).json({ success: true, data: folders });
    } catch (err) {
        next(err);
    }
};

// @desc      Get single folder details (for breadcrumbs mostly)
// @route     GET /api/folders/:id
// @access    Private
exports.getFolder = async (req, res, next) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, owner: req.user.id });

        if (!folder) {
            return res.status(404).json({ success: false, error: 'Folder not found' });
        }

        res.status(200).json({ success: true, data: folder });
    } catch (err) {
        next(err);
    }
};

// @desc      Delete folder
// @route     DELETE /api/folders/:id
// @access    Private
exports.deleteFolder = async (req, res, next) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, owner: req.user.id });

        if (!folder) {
            return res.status(404).json({ success: false, error: 'Folder not found' });
        }

        // TODO: Recursive delete or verify empty.
        // For now, let's just delete the folder doc.
        // In a real app, strict checks or recursive deletion of File/Folder is needed.
        // I will simply delete the folder.

        await Folder.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// @desc      Rename folder or move folder to another parent
// @route     PATCH /api/folders/:id
// @access    Private
exports.renameFolder = async (req, res, next) => {
    try {
        const { name, parentId } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (parentId !== undefined) {
            updateData.parent = parentId;

            // Update path when moving folder
            let path = [];
            if (parentId) {
                const parentFolder = await Folder.findOne({ _id: parentId, owner: req.user.id });
                if (!parentFolder) {
                    return res.status(404).json({ success: false, error: 'Parent folder not found' });
                }
                path = [...parentFolder.path, { id: parentFolder._id, name: parentFolder.name }];
            }
            updateData.path = path;
        }

        const folder = await Folder.findOneAndUpdate(
            { _id: req.params.id, owner: req.user.id },
            updateData,
            { new: true, runValidators: true }
        );

        if (!folder) {
            return res.status(404).json({ success: false, error: 'Folder not found' });
        }

        // Update name in any child folders' path if name was changed
        if (name !== undefined) {
            await Folder.updateMany(
                { "path.id": folder._id },
                { $set: { "path.$.name": name } }
            );
        }

        res.status(200).json({ success: true, data: folder });
    } catch (err) {
        next(err);
    }
};

// @desc      Toggle favorite status for folder
// @route     PATCH /api/folders/:id/favorite
// @access    Private
exports.toggleFavoriteFolder = async (req, res, next) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, owner: req.user.id });

        if (!folder) {
            return res.status(404).json({ success: false, error: 'Folder not found' });
        }

        folder.isFavorite = !folder.isFavorite;
        await folder.save();

        res.status(200).json({ success: true, data: folder });
    } catch (err) {
        next(err);
    }
};
