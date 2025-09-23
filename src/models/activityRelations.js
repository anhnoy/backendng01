const Activity = require('./activity');
const ActivityImage = require('./activityImage');

Activity.hasMany(ActivityImage, { foreignKey: 'activityId', as: 'images', onDelete: 'CASCADE' });
ActivityImage.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });

module.exports = { Activity, ActivityImage };
