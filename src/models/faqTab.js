const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const FaqTab = sequelize.define('FaqTab', {
  label: { type: DataTypes.STRING(100), allowNull: false },
  key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'faq_tabs' });

module.exports = FaqTab;
