const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

// Single row table to store FAQ Hero content
const FaqHero = sequelize.define('FaqHero', {
  title: { type: DataTypes.STRING(200), allowNull: false },
  subtitle: { type: DataTypes.STRING(500), allowNull: true }
}, { tableName: 'faq_hero' });

module.exports = FaqHero;
