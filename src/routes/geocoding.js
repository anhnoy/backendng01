const express = require('express');
const router = express.Router();
const geocodingController = require('../controllers/geocodingController');

router.get('/reverse', geocodingController.reverseGeocode);

module.exports = router;
