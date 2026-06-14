const mongoose = require("mongoose");
const { Schema } = mongoose;

const ServerConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  guildName: { type: String },
  modLogChannelId: { type: String, default: null },
  announcementChannelId: { type: String, default: null },
  trustedDomains: { type: [String], default: [] },
  welcome: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    color: { type: String, default: "#5865F2" },
    message: { type: String, default: "👋 Zdravo {user}, dobrodošao/la na **{server}**!" },
  },
  leave: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    color: { type: String, default: "#E74C3C" },
    message: { type: String, default: "👋 **{username}** je napustio/la server **{server}**." },
  },
  autoMod: {
    enabled: { type: Boolean, default: false },
    bannedWords: {
      enabled: { type: Boolean, default: true },
      action: {
        type: String,
        enum: ["delete", "warn", "timeout", "kick", "ban"],
        default: "delete",
      },
      timeoutDuration: { type: Number, default: 10 },
    },
    antiSpam: {
      enabled: { type: Boolean, default: true },
      maxMessages: { type: Number, default: 5 },
      interval: { type: Number, default: 5000 },
      action: {
        type: String,
        enum: ["delete", "warn", "timeout", "kick", "ban"],
        default: "timeout",
      },
      timeoutDuration: { type: Number, default: 5 },
    },
  },
}, { timestamps: true });

const BannedWordSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  word: { type: String, required: true },
  addedBy: { type: String },
}, { timestamps: true });
BannedWordSchema.index({ guildId: 1, word: 1 }, { unique: true });

const WarningSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, default: "Nije naveden razlog." },
  source: { type: String, enum: ["manual", "automod"], default: "manual" },
}, { timestamps: true });

const CustomCommandSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String, default: null },
  imageUrl: { type: String, default: null },
  color: { type: String, default: "#5865F2" },
  createdBy: { type: String },
}, { timestamps: true });
CustomCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });

const SpamLogSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  channelId: { type: String },
  messageCount: { type: Number },
  action: { type: String },
}, { timestamps: true });

const WebNotificationSchema = new Schema({
  postId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  authorName: { type: String },
  imageUrl: { type: String, default: null },
  postUrl: { type: String, required: true },
  sentToGuildId: { type: String },
  sentToChannelId: { type: String },
  discordMessageId: { type: String, default: null },
  status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
}, { timestamps: true });

const LogConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  logs: {
    memberJoin: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#2ecc71" },
    },
    memberLeave: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#e74c3c" },
    },
    messagDelete: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#e67e22" },
    },
    messageEdit: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#f39c12" },
    },
    memberBan: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#c0392b" },
    },
    memberUnban: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#27ae60" },
    },
    roleUpdate: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#9b59b6" },
    },
    timeout: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#e74c3c" },
    },
    channelCreate: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#3498db" },
    },
    channelDelete: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null },
      color: { type: String, default: "#e74c3c" },
    },
  },
}, { timestamps: true });

module.exports = {
  ServerConfig: mongoose.model("ServerConfig", ServerConfigSchema),
  BannedWord: mongoose.model("BannedWord", BannedWordSchema),
  Warning: mongoose.model("Warning", WarningSchema),
  LogConfig: mongoose.model("LogConfig", LogConfigSchema),
  CustomCommand: mongoose.model("CustomCommand", CustomCommandSchema),
  SpamLog: mongoose.model("SpamLog", SpamLogSchema),
  WebNotification: mongoose.model("WebNotification", WebNotificationSchema),
};