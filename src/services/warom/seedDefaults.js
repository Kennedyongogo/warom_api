const { EarningsConfig, CoinPackage, Gift, VipPlan } = require("../../models");

const ensureEarningsConfigs = async () => {
  const defaults = [
    { transaction_type: "messaging", chatter_share_percent: 70, platform_share_percent: 30, pending_hold_days: 7 },
    { transaction_type: "photo_unlock", chatter_share_percent: 70, platform_share_percent: 30, pending_hold_days: 7 },
    { transaction_type: "gift", chatter_share_percent: 70, platform_share_percent: 30, pending_hold_days: 7 },
    { transaction_type: "voice_call", chatter_share_percent: 65, platform_share_percent: 35, pending_hold_days: 7 },
    { transaction_type: "video_call", chatter_share_percent: 65, platform_share_percent: 35, pending_hold_days: 7 },
    { transaction_type: "vip_share", chatter_share_percent: 50, platform_share_percent: 50, pending_hold_days: 7 },
  ];
  for (const row of defaults) {
    await EarningsConfig.findOrCreate({
      where: { transaction_type: row.transaction_type },
      defaults: { ...row, is_active: true },
    });
  }
};

const ensureCatalogueSeeds = async () => {
  const packages = [
    { name: "Starter", coins: 100, bonus_coins: 0, price_amount: 4.99, currency: "USD", sort_order: 1 },
    { name: "Plus", coins: 500, bonus_coins: 50, price_amount: 19.99, currency: "USD", sort_order: 2 },
    { name: "Pro", coins: 1200, bonus_coins: 200, price_amount: 39.99, currency: "USD", sort_order: 3 },
  ];
  for (const p of packages) {
    await CoinPackage.findOrCreate({
      where: { name: p.name },
      defaults: { ...p, is_active: true },
    });
  }

  const gifts = [
    { name: "Rose", coin_value: 10, sort_order: 1 },
    { name: "Heart", coin_value: 25, sort_order: 2 },
    { name: "Diamond", coin_value: 100, sort_order: 3 },
  ];
  for (const g of gifts) {
    await Gift.findOrCreate({
      where: { name: g.name },
      defaults: { ...g, is_active: true, image_url: null },
    });
  }

  const plans = [
    {
      name: "VIP Weekly",
      duration_days: 7,
      price_coins: 200,
      sort_order: 1,
      benefits: ["unlimited_likes", "badge", "visibility_boost"],
    },
    {
      name: "VIP Monthly",
      duration_days: 30,
      price_coins: 600,
      sort_order: 2,
      benefits: [
        "unlimited_likes",
        "badge",
        "visibility_boost",
        "exclusive_filters",
        "priority_matching",
      ],
    },
  ];
  for (const plan of plans) {
    await VipPlan.findOrCreate({
      where: { name: plan.name },
      defaults: { ...plan, is_active: true },
    });
  }
};

const seedDefaults = async () => {
  await ensureEarningsConfigs();
  await ensureCatalogueSeeds();
  console.log("✅ WAROM default configs / catalogue seeded");
};

module.exports = { seedDefaults, ensureEarningsConfigs, ensureCatalogueSeeds };
