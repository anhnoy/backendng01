const { sendError } = require('../utils/errors');
const { toAbsoluteUrl } = require('../utils/url');
const { Op } = require('sequelize');
const Attraction = require('../models/attraction');
const fs = require('fs');
const path = require('path');

// Transform attraction for response (adds imagesAbsolute + coverImage)
function transformAttraction(a, req) {
  if (!a) return a;
  let images = a.images;
  if (typeof images === 'string') {
    try { images = JSON.parse(images); } catch { images = []; }
  }
  images = Array.isArray(images) ? images : [];
  const imagesAbsolute = images.map(img => toAbsoluteUrl(img, req));
  const coverImage = imagesAbsolute[0] || null;
  return { ...a.toJSON(), images, imagesAbsolute, coverImage };
}

// อัปโหลดไฟล์รูปภาพ
exports.uploadImage = async (req, res) => {
  try {
    const { id } = req.params;
    const attraction = await Attraction.findByPk(id);
    if (!attraction) return sendError(res, 404, 'Not found');
    if (!req.file) return sendError(res, 400, 'กรุณาเลือกไฟล์รูปภาพ');
    if (!Array.isArray(attraction.images)) attraction.images = [];
    if (attraction.images.length >= 5) {
      return sendError(res, 400, 'จำนวนรูปสูงสุด 5 รูป');
    }
    const imagePath = `/uploads/${req.file.filename}`;
    attraction.images.push(imagePath);
    await attraction.save();
    const transformed = transformAttraction(attraction, req);
    res.json({ message: 'อัปโหลดรูปสำเร็จ', ...transformed });
  } catch (err) {
    sendError(res, 400, err.message);
  }
};
// ...existing code...

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
// ...existing code...

// Validation helper
function validateAttraction({ name, country, images }) {
  if (!name || !country) return 'name และ country ห้ามว่าง';
  if (images === undefined) return null;
  if (!Array.isArray(images)) return 'images ต้องเป็น array';
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
    const result = attractions.map(a => {
      const base = transformAttraction(a, req);
      let vehicles = a.vehicles;
      if (typeof vehicles === 'string') { try { vehicles = JSON.parse(vehicles); } catch { vehicles = []; } }
      return { ...base, vehicles };
    });
    res.json(result);
  } catch (err) {
    sendError(res, 400, err.message);
  }
};

exports.getAttractionById = async (req, res) => {
  try {
    const attraction = await Attraction.findByPk(req.params.id);
    if (!attraction) return sendError(res, 404, 'Not found');
    res.json(transformAttraction(attraction, req));
  } catch (err) {
    sendError(res, 400, err.message);
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
  if (error) return sendError(res, 400, error);
    // ตรวจสอบชื่อซ้ำในประเทศเดียวกัน
    const duplicate = await Attraction.findOne({ where: { name, country } });
    if (duplicate) {
      return sendError(res, 400, 'ชื่อซ้ำในประเทศเดียวกัน');
    }
    let newAttraction = await Attraction.create({ name, country, images: imgArr, vehicles });
    res.status(201).json({ message: 'Attraction created', attraction: transformAttraction(newAttraction, req) });
  } catch (err) {
    sendError(res, 400, err.message);
  }
};

exports.updateAttraction = async (req, res) => {
  try {
    const { name, country, images, vehicles } = req.body;
    const attraction = await Attraction.findByPk(req.params.id);
  if (!attraction) return sendError(res, 404, 'Not found');
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
  if (error) return sendError(res, 400, error);
    // อนุญาตชื่อซ้ำกันได้
    attraction.name = name || attraction.name;
    attraction.country = country || attraction.country;
    attraction.images = mergedImages;
    attraction.vehicles = vehicles || attraction.vehicles;
    await attraction.save();
    res.json({ message: 'Attraction updated', attraction: transformAttraction(attraction, req) });
  } catch (err) {
    sendError(res, 400, err.message);
  }
};

exports.deleteAttraction = async (req, res) => {
  try {
    const attraction = await Attraction.findByPk(req.params.id);
    if (!attraction) {
      return res.status(200).json({ message: 'Attraction deleted' });
    }
    await attraction.destroy();
    res.json({ message: 'Attraction deleted' });
  } catch (err) {
    sendError(res, 400, err.message);
  }
};

// Add image
exports.addImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;
    const attraction = await Attraction.findByPk(id);
    if (!attraction) return sendError(res, 404, 'Not found');
    if (!image) return sendError(res, 400, 'ต้องระบุ image');
  if (!Array.isArray(attraction.images)) attraction.images = [];
    if (attraction.images.length >= 5) {
      return sendError(res, 400, 'จำนวนรูปสูงสุด 5 รูป');
    }
    attraction.images.push(image);
    await attraction.save();
    res.json({ message: 'Image added', attraction: transformAttraction(attraction, req) });
  } catch (err) {
    sendError(res, 400, err.message);
  }
};

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const attraction = await Attraction.findByPk(id);
    if (!attraction) return sendError(res, 404, 'Not found');
    if (!Array.isArray(attraction.images)) attraction.images = [];
    let idx = parseInt(imageId, 10);
    if (isNaN(idx) || idx < 0 || idx >= attraction.images.length) {
      return sendError(res, 400, 'imageId ไม่ถูกต้อง');
    }
    attraction.images.splice(idx, 1);
    await attraction.save();
    res.json({ message: 'Image deleted', attraction: transformAttraction(attraction, req) });
  } catch (err) {
    sendError(res, 400, err.message);
  }
};
