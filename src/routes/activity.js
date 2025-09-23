const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');

router.post('/', activityController.createActivity);
router.get('/', activityController.getActivities);
router.put('/:id', activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);
router.post('/:id/upload-image', activityController.uploadImage);
// New image management endpoints
router.post('/:id/images', activityController.addImages);
router.delete('/:id/images/:imageId', activityController.deleteImage);

module.exports = router;
