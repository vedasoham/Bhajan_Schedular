const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "bhajans.db",
    logging: false
});

module.exports = sequelize;