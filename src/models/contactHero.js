const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ContactHero = sequelize.define('ContactHero', {
  title: { type: DataTypes.STRING(120), allowNull: false },
  text: { type: DataTypes.STRING(300), allowNull: true }
}, { tableName: 'contact_hero' });

module.exports = ContactHero;
