const express = require('express');
const router = express.Router();
const destinationController = require('../controllers/destinationController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', destinationController.createDestination);
router.get('/', destinationController.listDestinations);
router.get('/:id', destinationController.getDestination);
router.put('/:id', destinationController.updateDestination);
router.delete('/:id', destinationController.deleteDestination);
router.patch('/:id/restore', destinationController.restoreDestination);
router.post('/:id/images', upload.array('files', 5), destinationController.addImages);
router.delete('/:id/images/:imageId', destinationController.deleteImage);

module.exports = router;
