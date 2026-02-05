const User = require('../models/User');

// @desc      Search for users by email
// @route     GET /api/users/search
// @access    Private
exports.searchUsers = async (req, res, next) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Please provide an email to search' });
        }

        // Search for active users with exact email match or starting with (for autocomplete)
        const users = await User.find({
            email: { $regex: `^${email}`, $options: 'i' },
            isActive: true,
            _id: { $ne: req.user.id } // Don't include self
        }).select('firstName lastName email').limit(5);

        res.status(200).json({
            success: true,
            data: users
        });
    } catch (err) {
        next(err);
    }
};
