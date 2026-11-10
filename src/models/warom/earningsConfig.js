const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromEarningsConfig",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      transaction_type: {
        type: DataTypes.ENUM(
          "messaging",
          "photo_unlock",
          "gift",
          "voice_call",
          "video_call",
          "vip_share"
        ),
        allowNull: false,
        unique: true,
      },
      chatter_share_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 70 },
      platform_share_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 30 },
      pending_hold_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 7 },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      updated_by: { type: DataTypes.UUID, allowNull: true },
    },
    { tableName: "warom_earnings_configs", timestamps: true, underscored: true }
  );
