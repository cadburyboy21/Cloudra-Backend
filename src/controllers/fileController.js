const cloudinary = require('../config/cloudinary');
const File = require('../models/File');
const Folder = require('../models/Folder');
const crypto = require('crypto');
const archiver = require('archiver');
const axios = require('axios');

// @desc      Get Cloudinary Upload Signature (Step 1 of Upload)
// @route     POST /api/files/upload-url
// @access    Private
exports.generateUploadUrl = async (req, res, next) => {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = `cloudra/${req.user.id}`;

        // Extract credentials from cloudinary config
        const config = cloudinary.config();
        if (!config.api_key || !config.api_secret || !config.cloud_name) {
            return res.status(500).json({ success: false, error: 'Cloudinary configuration is incomplete' });
        }

        // Use folder and timestamp to generate signature
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                folder: folder,
            },
            config.api_secret
        );

        res.status(200).json({
            success: true,
            data: {
                signature,
                timestamp,
                cloudName: config.cloud_name,
                apiKey: config.api_key,
                folder,
            },
        });
    } catch (err) {
        next(err);
    }
};

// @desc      Save file metadata (Step 2 of Upload)
// @route     POST /api/files
// @access    Private
exports.saveFileMetadata = async (req, res, next) => {
    try {
        const { fileName, fileType, fileSize, cloudinaryPublicId, cloudinaryUrl, folderId, fileHash } = req.body;

        // 1. Check for Deduplication (Hash-based)
        // If file with same hash exists for user, don't create new cloudinary entry (handled by frontend typically)
        // but let's check if we should just reference existing one or if it's a new upload.
        // For simplicity, if hash matches, we check if it's already there to prevent meta-duplication
        const existingByHash = await File.findOne({ owner: req.user.id, fileHash });
        if (existingByHash && existingByHash.fileName === fileName) {
            // If exactly same file exists, just return it or handle as duplicate
            return res.status(200).json({ success: true, data: existingByHash, isDuplicate: true });
        }

        // 2. Check for Versioning
        // If file with same name exists in same folder, move current state to versions
        const existingFile = await File.findOne({
            owner: req.user.id,
            fileName,
            folder: folderId || null
        });

        if (existingFile) {
            // Push current state to versions
            existingFile.versions.push({
                cloudinaryPublicId: existingFile.cloudinaryPublicId,
                cloudinaryUrl: existingFile.cloudinaryUrl,
                fileSize: existingFile.fileSize,
                createdAt: existingFile.updatedAt
            });

            // Update main state
            existingFile.cloudinaryPublicId = cloudinaryPublicId;
            existingFile.cloudinaryUrl = cloudinaryUrl;
            existingFile.fileSize = fileSize;
            existingFile.fileType = fileType;
            existingFile.fileHash = fileHash;

            await existingFile.save();
            return res.status(200).json({ success: true, data: existingFile, isNewVersion: true });
        }

        // Create new file if no existing one matches
        const file = await File.create({
            fileName,
            fileType,
            fileSize,
            cloudinaryPublicId,
            cloudinaryUrl,
            owner: req.user.id,
            folder: folderId || null,
            fileHash
        });

        res.status(201).json({ success: true, data: file });
    } catch (err) {
        next(err);
    }
};

// @desc      Toggle favorite status for file
// @route     PATCH /api/files/:id/favorite
// @access    Private
exports.toggleFavoriteFile = async (req, res, next) => {
    try {
        const file = await File.findOne({ _id: req.params.id, owner: req.user.id });

        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        file.isFavorite = !file.isFavorite;
        await file.save();

        res.status(200).json({ success: true, data: file });
    } catch (err) {
        next(err);
    }
};

// @desc      Get list of files (in folder)
// @route     GET /api/files
// @access    Private
exports.getFiles = async (req, res, next) => {
    try {
        const parentId = req.query.parentId || null;

        const files = await File.find({
            owner: req.user.id,
            folder: parentId,
        });

        res.status(200).json({ success: true, data: files });
    } catch (err) {
        next(err);
    }
};

// @desc      Get download/preview URL
// @route     GET /api/files/:id/download
// @access    Private
exports.getDownloadUrl = async (req, res, next) => {
    try {
        const file = await File.findOne({ _id: req.params.id, owner: req.user.id });

        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // Cloudinary URLs are usually permanent or can be signed, 
        // but for now we use the secure_url stored in DB.
        res.status(200).json({ success: true, data: { url: file.cloudinaryUrl, file } });
    } catch (err) {
        next(err);
    }
};

// @desc      Delete file
// @route     DELETE /api/files/:id
// @access    Private
exports.deleteFile = async (req, res, next) => {
    try {
        const file = await File.findOne({ _id: req.params.id, owner: req.user.id });

        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        // Delete from Cloudinary
        if (file.cloudinaryPublicId) {
            await cloudinary.uploader.destroy(file.cloudinaryPublicId);
        }

        // Delete from DB
        await File.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// @desc      Rename file or move file to another folder
// @route     PATCH /api/files/:id
// @access    Private
exports.renameFile = async (req, res, next) => {
    try {
        const { fileName, folderId } = req.body;

        const updateData = {};
        if (fileName !== undefined) updateData.fileName = fileName;
        if (folderId !== undefined) updateData.folder = folderId;

        const file = await File.findOneAndUpdate(
            { _id: req.params.id, owner: req.user.id },
            updateData,
            { new: true, runValidators: true }
        );

        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        res.status(200).json({ success: true, data: file });
    } catch (err) {
        next(err);
    }
};

// @desc      Get file details
// @route     GET /api/files/:id
// @access    Private
exports.getFile = async (req, res, next) => {
    try {
        const file = await File.findOne({ _id: req.params.id, owner: req.user.id });

        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        res.status(200).json({ success: true, data: file });
    } catch (err) {
        next(err);
    }
};

// @desc      Restore previous version of a file
// @route     POST /api/files/:id/versions/:versionId/restore
// @access    Private
exports.restoreVersion = async (req, res, next) => {
    try {
        const file = await File.findOne({ _id: req.params.id, owner: req.user.id });

        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        const version = file.versions.id(req.params.versionId);
        if (!version) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }

        // Swap current state with this version
        const currentData = {
            cloudinaryPublicId: file.cloudinaryPublicId,
            cloudinaryUrl: file.cloudinaryUrl,
            fileSize: file.fileSize,
            createdAt: file.updatedAt
        };

        file.cloudinaryPublicId = version.cloudinaryPublicId;
        file.cloudinaryUrl = version.cloudinaryUrl;
        file.fileSize = version.fileSize;

        // Remove this version from history and add the (previously) current one
        file.versions.pull(version._id);
        file.versions.push(currentData);

        await file.save();

        res.status(200).json({ success: true, data: file });
    } catch (err) {
        next(err);
    }
};

// @desc      Bulk delete files and folders
// @route     POST /api/files/bulk/delete
// @access    Private
exports.bulkDelete = async (req, res, next) => {
    try {
        const { fileIds, folderIds } = req.body;

        if (fileIds && fileIds.length > 0) {
            const files = await File.find({ _id: { $in: fileIds }, owner: req.user.id });
            for (const file of files) {
                if (file.cloudinaryPublicId) {
                    await cloudinary.uploader.destroy(file.cloudinaryPublicId);
                }
            }
            await File.deleteMany({ _id: { $in: fileIds }, owner: req.user.id });
        }

        if (folderIds && folderIds.length > 0) {
            await Folder.deleteMany({ _id: { $in: folderIds }, owner: req.user.id });
            await File.deleteMany({ folder: { $in: folderIds }, owner: req.user.id });
        }

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// @desc      Bulk move files and folders
// @route     POST /api/files/bulk/move
// @access    Private
exports.bulkMove = async (req, res, next) => {
    try {
        const { fileIds, folderIds, destinationFolderId } = req.body;

        if (fileIds && fileIds.length > 0) {
            await File.updateMany(
                { _id: { $in: fileIds }, owner: req.user.id },
                { folder: destinationFolderId || null }
            );
        }

        if (folderIds && folderIds.length > 0) {
            await Folder.updateMany(
                { _id: { $in: folderIds }, owner: req.user.id },
                { parent: destinationFolderId || null }
            );
        }

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        next(err);
    }
};

// @desc      Bulk ZIP download
// @route     POST /api/files/bulk/download
// @access    Private
exports.bulkDownload = async (req, res, next) => {
    try {
        const { fileIds } = req.body;
        const files = await File.find({ _id: { $in: fileIds }, owner: req.user.id });

        if (!files || files.length === 0) {
            return res.status(404).json({ success: false, error: 'No files selected' });
        }

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        res.attachment('cloudra-files.zip');
        archive.pipe(res);

        for (const file of files) {
            try {
                const response = await axios.get(file.cloudinaryUrl, { responseType: 'stream' });
                archive.append(response.data, { name: file.fileName });
            } catch (e) {
                console.error(`Failed to add file ${file.fileName} to ZIP`, e);
            }
        }

        archive.finalize();
    } catch (err) {
        next(err);
    }
};
