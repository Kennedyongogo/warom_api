const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromLedgerEntry",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      reference_type: {
        type: DataTypes.ENUM(
          "coin_purchase",
          "gift",
          "message_unlock",
          "photo_unlock",
          "voice_call",
          "video_call",
          "vip_subscription",
          "earnings_release",
          "withdrawal",
          "adjustment",
          "refund"
        ),
        allowNull: false,
      },
      reference_id: { type: DataTypes.UUID, allowNull: true },
      description: { type: DataTypes.STRING, allowNull: true },
      actor_user_id: { type: DataTypes.UUID, allowNull: true },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      posted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: "warom_ledger_entries", timestamps: true, underscored: true }
  );
