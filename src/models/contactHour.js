const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ContactHour = sequelize.define('ContactHour', {
  label: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.STRING(100), allowNull: true },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'contact_hours' });

module.exports = ContactHour;
