const Destination = require('./destination');
const DestinationImage = require('./destinationImage');
const FaqTab = require('./faqTab');
const FaqCategory = require('./faqCategory');
const FaqQuestion = require('./faqQuestion');

Destination.hasMany(DestinationImage, { foreignKey: 'destinationId', as: 'images', onDelete: 'CASCADE' });
DestinationImage.belongsTo(Destination, { foreignKey: 'destinationId', as: 'destination' });

// FAQ relations
FaqTab.hasMany(FaqCategory, { foreignKey: 'tabId', as: 'categories', onDelete: 'CASCADE', hooks: true });
FaqCategory.belongsTo(FaqTab, { foreignKey: 'tabId', as: 'tab' });

FaqCategory.hasMany(FaqQuestion, { foreignKey: 'categoryId', as: 'questions', onDelete: 'CASCADE', hooks: true });
FaqQuestion.belongsTo(FaqCategory, { foreignKey: 'categoryId', as: 'category' });

module.exports = { Destination, DestinationImage, FaqTab, FaqCategory, FaqQuestion };
