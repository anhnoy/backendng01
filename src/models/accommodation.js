const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Accommodation = sequelize.define('Accommodation', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING(2),
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  },
  images: {
    // Use TEXT + manual JSON parse for better cross-dialect compatibility (SQLite tests, MySQL prod)
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const raw = this.getDataValue('images');
      if (!raw) return [];
      if (Array.isArray(raw)) return raw; // in case dialect already parsed JSON
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      if (!val || !Array.isArray(val)) return this.setDataValue('images', JSON.stringify([]));
      this.setDataValue('images', JSON.stringify(val.slice(0,5)));
    }
  },
}, {
  tableName: 'accommodations',
});

module.exports = Accommodation;
