const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { LevelConfig, MemberLevel } = require("../../schemas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Podešavanja za level sistem")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName("set-channel")
      .setDescription("Postavi kanal za čestitke")
      .addChannelOption(opt => opt.setName("kanal").setDescription("Kanal").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("set-messages")
      .setDescription("Na koliko poruka = 1 level")
      .addIntegerOption(opt => opt.setName("broj").setDescription("Broj poruka").setRequired(true).setMinValue(1)))
    .addSubcommand(sub => sub
      .setName("set-congratulations")
      .setDescription("Tekst čestitke ({user}, {level})")
      .addStringOption(opt => opt.setName("poruka").setDescription("Poruka").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("toggle")
      .setDescription("Uključi/isključi level sistem")
      .addBooleanOption(opt => opt.setName("stanje").setDescription("true/false").setRequired(true)))
    .addSubcommand(sub => sub
      .setName("check")
      .setDescription("Proveri level sebe ili nekog člana")
      .addUserOption(opt => opt.setName("member").setDescription("Član (opciono)")))
    .addSubcommand(sub => sub
      .setName("leaderboard")
      .setDescription("Top 15 članova po levelima")),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: "Opii Bot" });

    if (sub === "set-channel") {
      const ch = interaction.options.getChannel("kanal");
      await LevelConfig.findOneAndUpdate({ guildId }, { channelId: ch.id }, { upsert: true, new: true });
      embed.setColor(0x3498db).setTitle("✅ Level kanal postavljen").setDescription(`<#${ch.id}>`);

    } else if (sub === "set-messages") {
      const broj = interaction.options.getInteger("broj");
      await LevelConfig.findOneAndUpdate({ guildId }, { messagesPerLevel: broj }, { upsert: true, new: true });
      embed.setColor(0x3498db).setTitle("✅ Postavljeno").setDescription(`Novi level na svakih **${broj}** poruka`);

    } else if (sub === "set-congratulations") {
      const poruka = interaction.options.getString("poruka");
      await LevelConfig.findOneAndUpdate({ guildId }, { congratsMessage: poruka }, { upsert: true, new: true });
      embed.setColor(0x3498db).setTitle("✅ Čestitka postavljena").setDescription(`\`${poruka}\``);

    } else if (sub === "toggle") {
      const stanje = interaction.options.getBoolean("stanje");
      await LevelConfig.findOneAndUpdate({ guildId }, { enabled: stanje }, { upsert: true, new: true });
      embed.setColor(stanje ? 0x2ecc71 : 0xe74c3c).setTitle(`Level sistem ${stanje ? "✅ UKLJUČEN" : "❌ ISKLJUČEN"}`);

    } else if (sub === "check") {
      const target = interaction.options.getUser("member") || interaction.user;
      const data = await MemberLevel.findOne({ guildId, userId: target.id });
      const config = await LevelConfig.findOne({ guildId });
      const mpl = config?.messagesPerLevel || 50;
      const level = data?.level || 0;
      const poruke = data?.messageCount || 0;
      const doSledeceg = mpl - (poruke % mpl);
      embed.setColor(0x5865f2)
        .setTitle(`📊 Level — ${target.username}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          { name: "Level", value: `**${level}**`, inline: true },
          { name: "Poruke", value: `**${poruke}**`, inline: true },
          { name: "Do sledećeg levela", value: `**${doSledeceg}** poruka`, inline: true },
        );

    } else if (sub === "leaderboard") {
      const top = await MemberLevel.find({ guildId }).sort({ level: -1, messageCount: -1 }).limit(15);
      if (top.length === 0) {
        embed.setColor(0xe74c3c).setTitle("❌ Nema podataka").setDescription("Niko još nije zaradio level.");
      } else {
        const medals = ["🥇", "🥈", "🥉"];
        const opis = top.map((m, i) => {
          const medal = medals[i] || `**${i + 1}.**`;
          return `${medal} <@${m.userId}> — Level **${m.level}** | **${m.messageCount}** poruka`;
        }).join("\n");
        embed.setColor(0xf1c40f).setTitle("🏆 Top 15 — Leaderboard").setDescription(opis);
      }
    }

    return interaction.reply({ embeds: [embed], ephemeral: sub !== "leaderboard" });
  },
};