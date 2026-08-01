const { Sequelize } = require("sequelize");
const path = require("path");

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.DB_PATH || path.join(__dirname, "..", "bhajans.db"),
    logging: false
});

module.exports = sequelize;