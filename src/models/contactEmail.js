const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ContactEmail = sequelize.define('ContactEmail', {
  label: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.STRING(120), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'contact_emails' });

module.exports = ContactEmail;
