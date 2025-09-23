const express = require('express');
const router = express.Router();
const travelPurposeController = require('../controllers/travelPurposeController');

router.get('/', travelPurposeController.getTravelPurposes);
router.post('/', travelPurposeController.createTravelPurpose);
router.put('/:id', travelPurposeController.updateTravelPurpose);
router.get('/:id', travelPurposeController.getTravelPurposeById);
router.delete('/:id', travelPurposeController.deleteTravelPurpose);

module.exports = router;
