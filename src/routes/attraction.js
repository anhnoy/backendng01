const express = require('express');
const router = express.Router();
const attractionController = require('../controllers/attractionController');
const multer = require('multer');
const path = require('path');

// กำหนด storage และชื่อไฟล์
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // ต้องสร้างโฟลเดอร์ uploads
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

router.get('/', attractionController.getAttractions);
router.get('/:id', attractionController.getAttractionById);
router.post('/', attractionController.createAttraction);
router.put('/:id', attractionController.updateAttraction);
router.delete('/:id', attractionController.deleteAttraction);
router.post('/:id/images', attractionController.addImage);
router.delete('/:id/images/:imageId', attractionController.deleteImage);
router.post('/:id/upload-image', upload.single('image'), attractionController.uploadImage);

module.exports = router;
