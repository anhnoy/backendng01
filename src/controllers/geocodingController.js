const axios = require('axios');

exports.reverseGeocode = async (req, res) => {
  const { latitude, longitude, language = 'en', format = 'json' } = req.query;
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing latitude or longitude' });
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=${language}&format=${format}`;
    const response = await axios.get(url);
    if (response.status === 200 && response.data) {
      return res.json(response.data);
    }
  } catch (err) {
    // Fallback to Nominatim
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${language}`;
      const response = await axios.get(nominatimUrl, { headers: { 'User-Agent': 'BNG-Backend/1.0' } });
      if (response.status === 200 && response.data) {
        return res.json(response.data);
      }
    } catch (e) {
      return res.status(404).json({ error: 'No geocoding result found', details: e.message });
    }
  }
  return res.status(404).json({ error: 'No geocoding result found' });
};
