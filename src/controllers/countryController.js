const Country = require('../models/country');

exports.getCountries = async (req, res) => {
  try {
    const countries = await Country.findAll({
      attributes: ['code', 'name'],
      order: [['name', 'ASC']]
    });
    res.json(countries);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.createCountry = async (req, res) => {
  try {
    const { code, name } = req.body;
    const country = await Country.create({ code, name });
    res.status(201).json({ message: 'Country created', country });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateCountry = async (req, res) => {
  try {
    const { name } = req.body;
    const { code } = req.params;
    const country = await Country.findByPk(code);
    if (!country) return res.status(404).json({ message: 'Country not found' });
    country.name = name;
    await country.save();
    res.json({ message: 'Country updated', country });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteCountry = async (req, res) => {
  try {
    const { code } = req.params;
    const country = await Country.findByPk(code);
    if (!country) return res.status(404).json({ message: 'Country not found' });
    await country.destroy();
    res.json({ message: 'Country deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
