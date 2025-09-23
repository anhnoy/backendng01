const Destination = require('./destination');
const DestinationImage = require('./destinationImage');

Destination.hasMany(DestinationImage, { foreignKey: 'destinationId', as: 'images', onDelete: 'CASCADE' });
DestinationImage.belongsTo(Destination, { foreignKey: 'destinationId', as: 'destination' });

module.exports = { Destination, DestinationImage };
