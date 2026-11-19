const { DataTypes } = require("sequelize");

/** Tracks pending earnings that become available after a hold period. */
module.exports = (sequelize) =>
  sequelize.define(
    "WaromEarningHold",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      chatter_id: { type: DataTypes.UUID, allowNull: false },
      source_type: {
        type: DataTypes.ENUM(
          "messaging",
          "photo_unlock",
          "gift",
          "voice_call",
          "video_call",
          "vip_share"
        ),
        allowNull: false,
      },
      source_id: { type: DataTypes.UUID, allowNull: true },
      amount_coins: { type: DataTypes.INTEGER, allowNull: false },
      ledger_entry_id: { type: DataTypes.UUID, allowNull: true },
      available_at: { type: DataTypes.DATE, allowNull: false },
      released_at: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM("pending", "released", "reversed"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    { tableName: "warom_earning_holds", timestamps: true, underscored: true }
  );
