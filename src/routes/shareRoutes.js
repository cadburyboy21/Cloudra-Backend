const express = require('express');
const { getSharedItem } = require('../controllers/shareController');

const router = express.Router();

router.get('/:token', getSharedItem);

module.exports = router;
