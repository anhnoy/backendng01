const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const FaqQuestion = sequelize.define('FaqQuestion', {
  categoryId: { type: DataTypes.INTEGER, allowNull: false },
  question: { type: DataTypes.STRING(300), allowNull: true },
  answer: { type: DataTypes.STRING(2000), allowNull: true },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'faq_questions' });

module.exports = FaqQuestion;
