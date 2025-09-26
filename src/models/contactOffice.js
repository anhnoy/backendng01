const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ContactOffice = sequelize.define('ContactOffice', {
  title: { type: DataTypes.STRING(120), allowNull: false },
  desc: { type: DataTypes.STRING(1000), allowNull: true },
  mapUrl: { type: DataTypes.STRING(1024), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'contact_offices' });

module.exports = ContactOffice;
