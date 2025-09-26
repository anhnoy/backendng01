const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ContactSocial = sequelize.define('ContactSocial', {
  label: { type: DataTypes.STRING(40), allowNull: false },
  url: { type: DataTypes.STRING(512), allowNull: false },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'contact_socials' });

module.exports = ContactSocial;
