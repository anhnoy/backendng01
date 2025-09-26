const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ContactPhone = sequelize.define('ContactPhone', {
  branch: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(32), allowNull: false },
  normalizedDigits: { type: DataTypes.STRING(32), allowNull: true },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'contact_phones' });

module.exports = ContactPhone;
