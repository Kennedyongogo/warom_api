const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromNotification",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      type: {
        type: DataTypes.ENUM(
          "new_match",
          "message",
          "call",
          "coin_purchase",
          "vip_expiry",
          "gift",
          "follow",
          "visit",
          "withdrawal",
          "system",
          "report"
        ),
        allowNull: false,
      },
      title: { type: DataTypes.STRING, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: true },
      data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: "warom_notifications", timestamps: true, underscored: true }
  );
