const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

// Food model: basic info + images (array stored as JSON text) + tags
const Food = sequelize.define('Food', {
  name: { type: DataTypes.STRING, allowNull: false },
  country: { type: DataTypes.STRING(2), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING, allowNull: true }, // e.g. street, dessert, drink
  images: {
    type: DataTypes.TEXT, // store JSON array
    allowNull: true,
    get() {
      const raw = this.getDataValue('images');
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      if (!val) return this.setDataValue('images', null);
      if (Array.isArray(val)) this.setDataValue('images', JSON.stringify(val.slice(0,5)));
      else this.setDataValue('images', JSON.stringify([]));
    }
  },
  tags: {
    type: DataTypes.TEXT, // JSON array of strings
    allowNull: true,
    get() {
      const raw = this.getDataValue('tags');
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      if (!val) return this.setDataValue('tags', null);
      if (Array.isArray(val)) this.setDataValue('tags', JSON.stringify(val.slice(0,15)));
      else this.setDataValue('tags', JSON.stringify([]));
    }
  },
  isPopular: { type: DataTypes.BOOLEAN, defaultValue: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // ราคา
  currency: { type: DataTypes.STRING(3), allowNull: true, defaultValue: 'THB' }, // สกุลเงิน
  unit: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'ต่อจาน' } // หน่วย
}, { tableName: 'foods' });

module.exports = Food;
