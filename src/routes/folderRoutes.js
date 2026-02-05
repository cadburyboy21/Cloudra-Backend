const express = require('express');
const {
    createFolder,
    getFolders,
    getFolder,
    deleteFolder,
    renameFolder,
    toggleFavoriteFolder,
} = require('../controllers/folderController');
const { shareFolder, addUserToShare, removeUserFromShare, getShareSettings } = require('../controllers/shareController');

const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.route('/')
    .post(createFolder)
    .get(getFolders);

router.route('/:id')
    .get(getFolder)
    .patch(renameFolder)
    .delete(deleteFolder);

router.get('/:id/share', getShareSettings);
router.post('/:id/share', shareFolder);
router.post('/:id/share/user', addUserToShare);
router.delete('/:id/share/user/:userId', removeUserFromShare);
router.patch('/:id/favorite', toggleFavoriteFolder);

module.exports = router;
