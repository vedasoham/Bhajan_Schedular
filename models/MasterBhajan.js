const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const MasterBhajan = sequelize.define('MasterBhajan', {
  title: { type: DataTypes.STRING, allowNull: false },
  deity: { type: DataTypes.STRING, allowNull: false },
  level: { type: DataTypes.STRING, allowNull: true },
  tempo: { type: DataTypes.STRING, allowNull: true },
  language: { type: DataTypes.STRING, allowNull: true },
  raga: { type: DataTypes.STRING, allowNull: true },
  shruti: { type: DataTypes.STRING, allowNull: true },
  shruti_female: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'master_bhajans',
  timestamps: false
});
module.exports = MasterBhajan;