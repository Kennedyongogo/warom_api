const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "WaromLedgerLine",
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      entry_id: { type: DataTypes.UUID, allowNull: false },
      account_id: { type: DataTypes.UUID, allowNull: false },
      direction: { type: DataTypes.ENUM("debit", "credit"), allowNull: false },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    },
    { tableName: "warom_ledger_lines", timestamps: true, underscored: true }
  );
