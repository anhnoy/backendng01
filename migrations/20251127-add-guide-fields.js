module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'experience', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 });
    await queryInterface.addColumn('users', 'workArea', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addColumn('users', 'rating', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('users', 'availability', { type: Sequelize.ENUM('available', 'busy', 'offline', 'Available', 'Unavailable', 'Offline'), allowNull: true, defaultValue: 'offline' });
    await queryInterface.addColumn('users', 'completedTrips', { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'experience');
    await queryInterface.removeColumn('users', 'workArea');
    await queryInterface.removeColumn('users', 'rating');
    await queryInterface.removeColumn('users', 'availability');
    await queryInterface.removeColumn('users', 'completedTrips');
  }
};
