const express = require('express');
const {
    generateUploadUrl,
    saveFileMetadata,
    getFiles,
    getFile,
    getDownloadUrl,
    deleteFile,
    renameFile,
    toggleFavoriteFile,
    restoreVersion,
    bulkDelete,
    bulkMove,
    bulkDownload,
} = require('../controllers/fileController');
const { shareFile, addUserToShare, removeUserFromShare, getShareSettings } = require('../controllers/shareController');

const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/upload-url', generateUploadUrl);
router.route('/')
    .post(saveFileMetadata)
    .get(getFiles);

router.route('/:id')
    .get(getFile)
    .patch(renameFile)
    .delete(deleteFile);
router.get('/:id/download', getDownloadUrl);
router.get('/:id/share', getShareSettings);
router.post('/:id/share', shareFile);
router.post('/:id/share/user', addUserToShare);
router.delete('/:id/share/user/:userId', removeUserFromShare);

router.patch('/:id/favorite', toggleFavoriteFile);
router.post('/:id/versions/:versionId/restore', restoreVersion);

router.post('/bulk/delete', bulkDelete);
router.post('/bulk/move', bulkMove);
router.post('/bulk/download', bulkDownload);

module.exports = router;
