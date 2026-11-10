const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromProfileVisit",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      visitor_id: { type: DataTypes.UUID, allowNull: false },
      visited_id: { type: DataTypes.UUID, allowNull: false },
      visited_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: "warom_profile_visits", timestamps: true, underscored: true }
  );
