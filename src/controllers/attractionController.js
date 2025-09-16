// อัปโหลดไฟล์รูปภาพ
exports.uploadImage = async (req, res) => {
  try {
    const { id } = req.params;
    const attraction = await Attraction.findByPk(id);
    if (!attraction) return res.status(404).json({ message: 'Not found' });
    if (!req.file) return res.status(400).json({ message: 'กรุณาเลือกไฟล์รูปภาพ' });
    if (!Array.isArray(attraction.images)) attraction.images = [];
    if (attraction.images.length >= 5) {
      return res.status(400).json({ message: 'จำนวนรูปสูงสุด 5 รูป' });
    }
    // เพิ่ม path ของไฟล์ที่อัปโหลดลง images
    const imagePath = `/uploads/${req.file.filename}`;
    attraction.images.push(imagePath);
    await attraction.save();
    res.json({ message: 'อัปโหลดรูปสำเร็จ', images: attraction.images });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
const Attraction = require('../models/attraction');
const fs = require('fs');
const path = require('path');

function saveBase64Image(base64String) {
  // รองรับ data:image/png;base64,...
  const matches = base64String.match(/^data:(image\/(png|jpg|jpeg));base64,(.+)$/);
  if (!matches) return null;
  const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
  const buffer = Buffer.from(matches[3], 'base64');
  const filename = `img_${Date.now()}_${Math.round(Math.random()*1e6)}.${ext}`;
  const filePath = path.join('uploads', filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}
const { Op } = require('sequelize');

// Validation helper
function validateAttraction({ name, country, images }) {
  if (!name || !country) return 'name และ country ห้ามว่าง';
  if (!images || !Array.isArray(images) || images.length === 0) return 'ต้องมีรูปอย่างน้อย 1 รูป';
  if (images.length > 5) return 'จำนวนรูปสูงสุด 5 รูป';
  return null;
}

exports.getAttractions = async (req, res) => {
  try {
    const { country, search } = req.query;
    let where = {};
    if (country) where.country = country;
    if (search) where.name = { [Op.like]: `%${search}%` };
    const attractions = await Attraction.findAll({ where });
    // แปลง images/vehicles เป็น array ถ้าเป็น string
    const result = attractions.map(a => {
      let images = a.images;
      let vehicles = a.vehicles;
      if (typeof images === 'string') {
        try { images = JSON.parse(images); } catch { images = []; }
      }
      if (typeof vehicles === 'string') {
        try { vehicles = JSON.parse(vehicles); } catch { vehicles = []; }
      }
      return { ...a.toJSON(), images, vehicles };
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAttractionById = async (req, res) => {
  try {
    const attraction = await Attraction.findByPk(req.params.id);
    if (!attraction) return res.status(404).json({ message: 'Not found' });
    res.json(attraction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.createAttraction = async (req, res) => {
  try {
    const { name, country, images, vehicles } = req.body;
    let imgArr = Array.isArray(images) ? images : [];
    // ถ้าเป็น base64 ให้ decode และบันทึกไฟล์
    imgArr = imgArr.map(img => {
      if (typeof img === 'string' && img.startsWith('data:image/')) {
        const filePath = saveBase64Image(img);
        return filePath || img;
      }
      return img;
    });
    const error = validateAttraction({ name, country, images: imgArr });
    if (error) return res.status(400).json({ message: error });
  let newAttraction = await Attraction.create({ name, country, images: imgArr, vehicles });
  res.status(201).json({ message: 'Attraction created', attraction: newAttraction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAttraction = async (req, res) => {
  try {
    const { name, country, images, vehicles } = req.body;
    const attraction = await Attraction.findByPk(req.params.id);
    if (!attraction) return res.status(404).json({ message: 'Not found' });
    let mergedImages = attraction.images;
    if (Array.isArray(images)) {
      // ถ้าเป็น base64 ให้ decode และบันทึกไฟล์
      const newImages = images.map(img => {
        if (typeof img === 'string' && img.startsWith('data:image/')) {
          const filePath = saveBase64Image(img);
          return filePath || img;
        }
        return img;
      });
      // merge ไม่ซ้ำ (union)
      mergedImages = Array.from(new Set([...(Array.isArray(attraction.images) ? attraction.images : []), ...newImages]));
    } else if (images === undefined) {
      mergedImages = attraction.images;
    }
    const error = validateAttraction({ name: name || attraction.name, country: country || attraction.country, images: mergedImages });
    if (error) return res.status(400).json({ message: error });
    // อนุญาตชื่อซ้ำกันได้
    attraction.name = name || attraction.name;
    attraction.country = country || attraction.country;
    attraction.images = mergedImages;
    attraction.vehicles = vehicles || attraction.vehicles;
    await attraction.save();
    res.json({ message: 'Attraction updated', attraction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteAttraction = async (req, res) => {
  try {
    const attraction = await Attraction.findByPk(req.params.id);
    if (!attraction) return res.status(404).json({ message: 'Not found' });
    await attraction.destroy();
    res.json({ message: 'Attraction deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Add image
exports.addImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;
    const attraction = await Attraction.findByPk(id);
    if (!attraction) return res.status(404).json({ message: 'Not found' });
    if (!image) return res.status(400).json({ message: 'ต้องระบุ image' });
  if (!Array.isArray(attraction.images)) attraction.images = [];
    if (attraction.images.length >= 5) {
      return res.status(400).json({ message: 'จำนวนรูปสูงสุด 5 รูป' });
    }
    attraction.images.push(image);
    await attraction.save();
    res.json({ message: 'Image added', images: attraction.images });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const attraction = await Attraction.findByPk(id);
    if (!attraction) return res.status(404).json({ message: 'Not found' });
    if (!Array.isArray(attraction.images)) attraction.images = [];
    let idx = parseInt(imageId, 10);
    if (isNaN(idx) || idx < 0 || idx >= attraction.images.length) {
      return res.status(400).json({ message: 'imageId ไม่ถูกต้อง' });
    }
    attraction.images.splice(idx, 1);
    await attraction.save();
    res.json({ message: 'Image deleted', images: attraction.images });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
