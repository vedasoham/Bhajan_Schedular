const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserPresence = sequelize.define(
  "UserPresence",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    session_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Guest User"
    },
    user_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "user" // "admin", "super_admin", "user"
    },
    current_page: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_section: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: "user_presence",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

module.exports = UserPresence;
