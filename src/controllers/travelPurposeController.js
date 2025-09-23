// ดึงข้อมูล travel purpose ตาม id
exports.getTravelPurposeById = async (req, res) => {
  try {
    const purpose = await TravelPurpose.findByPk(req.params.id);
    if (!purpose) return res.status(404).json({ message: 'Not found' });
    res.json(purpose);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
const TravelPurpose = require('../models/travelPurpose');

function validateTravelPurpose({ name }) {
  if (!name || !name.trim()) return 'name ห้ามว่าง';
  return null;
}

exports.getTravelPurposes = async (req, res) => {
  try {
    const purposes = await TravelPurpose.findAll();
    res.json(purposes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.createTravelPurpose = async (req, res) => {
  try {
    const { name, description } = req.body;
    const error = validateTravelPurpose({ name });
    if (error) return res.status(400).json({ message: error });
    // ตรวจสอบชื่อซ้ำ
    const duplicate = await TravelPurpose.findOne({ where: { name } });
    if (duplicate) return res.status(400).json({ message: 'name ซ้ำ' });
    const purpose = await TravelPurpose.create({ name, description });
    res.status(201).json({ message: 'TravelPurpose created', purpose });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateTravelPurpose = async (req, res) => {
  try {
    const purpose = await TravelPurpose.findByPk(req.params.id);
    if (!purpose) return res.status(404).json({ message: 'Not found' });
    const { name, description } = req.body;
    if (name !== undefined) purpose.name = name;
    if (description !== undefined) purpose.description = description;
    await purpose.save();
    res.json({ message: 'TravelPurpose updated', purpose });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTravelPurpose = async (req, res) => {
  try {
    const purpose = await TravelPurpose.findByPk(req.params.id);
    if (!purpose) {
      // คืน 200 แม้ไม่พบข้อมูล
      return res.status(200).json({ message: 'TravelPurpose deleted' });
    }
    await purpose.destroy();
    res.json({ message: 'TravelPurpose deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
