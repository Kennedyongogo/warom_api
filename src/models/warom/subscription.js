const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromSubscription",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      vip_plan_id: { type: DataTypes.UUID, allowNull: false },
      status: {
        type: DataTypes.ENUM("active", "expired", "cancelled"),
        allowNull: false,
        defaultValue: "active",
      },
      starts_at: { type: DataTypes.DATE, allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      payment_id: { type: DataTypes.UUID, allowNull: true },
      ledger_entry_id: { type: DataTypes.UUID, allowNull: true },
    },
    { tableName: "warom_subscriptions", timestamps: true, underscored: true }
  );
