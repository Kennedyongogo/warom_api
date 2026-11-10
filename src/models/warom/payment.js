const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromPayment",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.UUID, allowNull: false },
      purpose: {
        type: DataTypes.ENUM("coin_purchase", "vip_subscription"),
        allowNull: false,
      },
      package_id: { type: DataTypes.UUID, allowNull: true },
      vip_plan_id: { type: DataTypes.UUID, allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "KES" },
      provider: { type: DataTypes.STRING, allowNull: false, defaultValue: "paystack" },
      provider_reference: { type: DataTypes.STRING, allowNull: true, unique: true },
      status: {
        type: DataTypes.ENUM("pending", "success", "failed", "refunded"),
        allowNull: false,
        defaultValue: "pending",
      },
      raw_payload: { type: DataTypes.JSONB, allowNull: true },
    },
    { tableName: "warom_payments", timestamps: true, underscored: true }
  );
