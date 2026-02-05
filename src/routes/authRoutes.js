const express = require('express');
const {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword,
    activateAccount
} = require('../controllers/authController');

const router = express.Router();

const { protect } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/activate/:token', activateAccount);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:token', resetPassword);

module.exports = router;
