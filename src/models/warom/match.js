const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromMatch",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_a_id: { type: DataTypes.UUID, allowNull: false },
      user_b_id: { type: DataTypes.UUID, allowNull: false },
      matched_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "warom_matches", timestamps: true, underscored: true,
      indexes: [{ unique: true, fields: ["user_a_id", "user_b_id"] }] }
  );
