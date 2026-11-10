const { sequelize } = require("../config/database");

const AdminUser = require("./warom/adminUser")(sequelize);
const User = require("./warom/user")(sequelize);
const Verification = require("./warom/verification")(sequelize);
const Follow = require("./warom/follow")(sequelize);
const Block = require("./warom/block")(sequelize);
const Swipe = require("./warom/swipe")(sequelize);
const Match = require("./warom/match")(sequelize);
const ProfileVisit = require("./warom/profileVisit")(sequelize);
const Conversation = require("./warom/conversation")(sequelize);
const Message = require("./warom/message")(sequelize);
const Call = require("./warom/call")(sequelize);
const CoinPackage = require("./warom/coinPackage")(sequelize);
const VipPlan = require("./warom/vipPlan")(sequelize);
const Gift = require("./warom/gift")(sequelize);
const EarningsConfig = require("./warom/earningsConfig")(sequelize);
const LedgerAccount = require("./warom/ledgerAccount")(sequelize);
const LedgerEntry = require("./warom/ledgerEntry")(sequelize);
const LedgerLine = require("./warom/ledgerLine")(sequelize);
const Payment = require("./warom/payment")(sequelize);
const Subscription = require("./warom/subscription")(sequelize);
const GiftTransaction = require("./warom/giftTransaction")(sequelize);
const Withdrawal = require("./warom/withdrawal")(sequelize);
const Notification = require("./warom/notification")(sequelize);
const Report = require("./warom/report")(sequelize);
const LiveStream = require("./warom/liveStream")(sequelize);
const Inquiry = require("./warom/inquiry")(sequelize);
const Policy = require("./warom/policy")(sequelize);

const models = {
  AdminUser,
  User,
  Verification,
  Follow,
  Block,
  Swipe,
  Match,
  ProfileVisit,
  Conversation,
  Message,
  Call,
  CoinPackage,
  VipPlan,
  Gift,
  EarningsConfig,
  LedgerAccount,
  LedgerEntry,
  LedgerLine,
  Payment,
  Subscription,
  GiftTransaction,
  Withdrawal,
  Notification,
  Report,
  LiveStream,
  Inquiry,
  Policy,
};

const syncOrder = [
  AdminUser,
  User,
  Verification,
  Follow,
  Block,
  Swipe,
  Match,
  ProfileVisit,
  Conversation,
  Message,
  Call,
  CoinPackage,
  VipPlan,
  Gift,
  EarningsConfig,
  LedgerAccount,
  LedgerEntry,
  LedgerLine,
  Payment,
  Subscription,
  GiftTransaction,
  Withdrawal,
  Notification,
  Report,
  LiveStream,
  Inquiry,
  Policy,
];

const initializeModels = async () => {
  console.log("🔄 Syncing WAROM tables...");
  for (const model of syncOrder) {
    await model.sync({ force: false, alter: false });
  }
  console.log("✅ WAROM models synced");
};

const setupAssociations = () => {
  // Identity
  User.hasMany(Verification, { foreignKey: "user_id", as: "verifications" });
  Verification.belongsTo(User, { foreignKey: "user_id", as: "user" });
  Verification.belongsTo(AdminUser, { foreignKey: "reviewed_by", as: "reviewer" });

  // Social graph
  User.hasMany(Follow, { foreignKey: "follower_id", as: "following" });
  User.hasMany(Follow, { foreignKey: "following_id", as: "followers" });
  Follow.belongsTo(User, { foreignKey: "follower_id", as: "follower" });
  Follow.belongsTo(User, { foreignKey: "following_id", as: "followed" });

  User.hasMany(Block, { foreignKey: "blocker_id", as: "blocksIssued" });
  User.hasMany(Block, { foreignKey: "blocked_id", as: "blocksReceived" });
  Block.belongsTo(User, { foreignKey: "blocker_id", as: "blocker" });
  Block.belongsTo(User, { foreignKey: "blocked_id", as: "blocked" });

  User.hasMany(Swipe, { foreignKey: "swiper_id", as: "swipesGiven" });
  User.hasMany(Swipe, { foreignKey: "target_id", as: "swipesReceived" });
  Swipe.belongsTo(User, { foreignKey: "swiper_id", as: "swiper" });
  Swipe.belongsTo(User, { foreignKey: "target_id", as: "target" });

  User.hasMany(Match, { foreignKey: "user_a_id", as: "matchesAsA" });
  User.hasMany(Match, { foreignKey: "user_b_id", as: "matchesAsB" });
  Match.belongsTo(User, { foreignKey: "user_a_id", as: "userA" });
  Match.belongsTo(User, { foreignKey: "user_b_id", as: "userB" });

  User.hasMany(ProfileVisit, { foreignKey: "visitor_id", as: "visitsGiven" });
  User.hasMany(ProfileVisit, { foreignKey: "visited_id", as: "visitsReceived" });
  ProfileVisit.belongsTo(User, { foreignKey: "visitor_id", as: "visitor" });
  ProfileVisit.belongsTo(User, { foreignKey: "visited_id", as: "visited" });

  // Communication
  User.hasMany(Conversation, { foreignKey: "participant_a_id", as: "conversationsAsA" });
  User.hasMany(Conversation, { foreignKey: "participant_b_id", as: "conversationsAsB" });
  Conversation.belongsTo(User, { foreignKey: "participant_a_id", as: "participantA" });
  Conversation.belongsTo(User, { foreignKey: "participant_b_id", as: "participantB" });
  Conversation.hasMany(Message, { foreignKey: "conversation_id", as: "messages" });
  Message.belongsTo(Conversation, { foreignKey: "conversation_id", as: "conversation" });
  Message.belongsTo(User, { foreignKey: "sender_id", as: "sender" });
  Message.belongsTo(Gift, { foreignKey: "gift_id", as: "gift" });

  User.hasMany(Call, { foreignKey: "caller_id", as: "callsMade" });
  User.hasMany(Call, { foreignKey: "callee_id", as: "callsReceived" });
  Call.belongsTo(User, { foreignKey: "caller_id", as: "caller" });
  Call.belongsTo(User, { foreignKey: "callee_id", as: "callee" });

  // Catalogue / money
  User.hasMany(LedgerAccount, { foreignKey: "owner_id", as: "ledgerAccounts" });
  LedgerAccount.belongsTo(User, { foreignKey: "owner_id", as: "owner" });
  LedgerEntry.hasMany(LedgerLine, { foreignKey: "entry_id", as: "lines" });
  LedgerLine.belongsTo(LedgerEntry, { foreignKey: "entry_id", as: "entry" });
  LedgerLine.belongsTo(LedgerAccount, { foreignKey: "account_id", as: "account" });
  LedgerEntry.belongsTo(User, { foreignKey: "actor_user_id", as: "actor" });

  User.hasMany(Payment, { foreignKey: "user_id", as: "payments" });
  Payment.belongsTo(User, { foreignKey: "user_id", as: "payer" });
  Payment.belongsTo(CoinPackage, { foreignKey: "package_id", as: "coinPackage" });
  Payment.belongsTo(VipPlan, { foreignKey: "vip_plan_id", as: "vipPlan" });

  User.hasMany(Subscription, { foreignKey: "user_id", as: "subscriptions" });
  Subscription.belongsTo(User, { foreignKey: "user_id", as: "subscriber" });
  Subscription.belongsTo(VipPlan, { foreignKey: "vip_plan_id", as: "plan" });
  Subscription.belongsTo(Payment, { foreignKey: "payment_id", as: "payment" });

  Gift.hasMany(GiftTransaction, { foreignKey: "gift_id", as: "transactions" });
  GiftTransaction.belongsTo(Gift, { foreignKey: "gift_id", as: "gift" });
  GiftTransaction.belongsTo(User, { foreignKey: "sender_id", as: "sender" });
  GiftTransaction.belongsTo(User, { foreignKey: "receiver_id", as: "receiver" });

  User.hasMany(Withdrawal, { foreignKey: "chatter_id", as: "withdrawals" });
  Withdrawal.belongsTo(User, { foreignKey: "chatter_id", as: "chatter" });
  Withdrawal.belongsTo(AdminUser, { foreignKey: "reviewed_by", as: "reviewer" });

  EarningsConfig.belongsTo(AdminUser, { foreignKey: "updated_by", as: "updatedByAdmin" });

  // Trust / ops
  User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });
  Notification.belongsTo(User, { foreignKey: "user_id", as: "recipient" });

  User.hasMany(Report, { foreignKey: "reporter_id", as: "reportsFiled" });
  User.hasMany(Report, { foreignKey: "reported_user_id", as: "reportsAgainst" });
  Report.belongsTo(User, { foreignKey: "reporter_id", as: "reporter" });
  Report.belongsTo(User, { foreignKey: "reported_user_id", as: "reportedUser" });
  Report.belongsTo(AdminUser, { foreignKey: "handled_by", as: "handler" });

  User.hasMany(LiveStream, { foreignKey: "host_id", as: "liveStreams" });
  LiveStream.belongsTo(User, { foreignKey: "host_id", as: "host" });

  Inquiry.belongsTo(AdminUser, { foreignKey: "handled_by", as: "handler" });
  Policy.belongsTo(AdminUser, { foreignKey: "updated_by", as: "updatedByAdmin" });

  console.log("✅ WAROM associations configured");
};

module.exports = {
  ...models,
  initializeModels,
  setupAssociations,
  sequelize,
};
