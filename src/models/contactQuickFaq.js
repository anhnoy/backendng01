const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const ContactQuickFaq = sequelize.define('ContactQuickFaq', {
  question: { type: DataTypes.STRING(300), allowNull: true },
  answer: { type: DataTypes.STRING(2000), allowNull: true },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'contact_quick_faq' });

module.exports = ContactQuickFaq;
