const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromVipPlan",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING, allowNull: false },
      duration_days: { type: DataTypes.INTEGER, allowNull: false },
      price_coins: { type: DataTypes.INTEGER, allowNull: true },
      price_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "KES" },
      benefits: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: "warom_vip_plans", timestamps: true, underscored: true }
  );
