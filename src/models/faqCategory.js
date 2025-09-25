const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const FaqCategory = sequelize.define('FaqCategory', {
  tabId: { type: DataTypes.INTEGER, allowNull: false },
  category: { type: DataTypes.STRING(100), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'faq_categories' });

module.exports = FaqCategory;
