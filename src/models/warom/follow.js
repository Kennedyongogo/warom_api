const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromFollow",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      follower_id: { type: DataTypes.UUID, allowNull: false },
      following_id: { type: DataTypes.UUID, allowNull: false },
    },
    { tableName: "warom_follows", timestamps: true, underscored: true,
      indexes: [{ unique: true, fields: ["follower_id", "following_id"] }] }
  );
