cat > /mnt/user-data/outputs/verifysetup.js << 'EOF'
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");
const { ServerConfig } = require("../../../schemas");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verifysetup")
    .setDescription("Podešavanja za verifikacioni sistem")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("set-role")
        .setDescription("Postavi rolu koja se daje nakon verifikacije")
        .addRoleOption((opt) =>
          opt.setName("rola").setDescription("Rola").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("send")
        .setDescription("Pošalji verifikacionu poruku u kanal")
        .addChannelOption((opt) =>
          opt.setName("kanal").setDescription("Kanal").setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    let config = await ServerConfig.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId, guildName: interaction.guild.name } },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: "Opii Bot" });

    if (sub === "set-role") {
      const rola = interaction.options.getRole("rola");
      await ServerConfig.updateOne({ guildId }, { "verify.roleId": rola.id });
      embed.setColor(0x2ecc71).setTitle("✅ Rola postavljena").setDescription(`Rola: <@&${rola.id}>`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "send") {
      const channel = interaction.options.getChannel("kanal");

      config = await ServerConfig.findOne({ guildId });
      if (!config?.verify?.roleId) {
        embed.setColor(0xe74c3c).setTitle("❌ Greška").setDescription("Prvo postavi rolu sa `/verifysetup set-role`");
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      await ServerConfig.updateOne({ guildId }, { "verify.enabled": true, "verify.channelId": channel.id });

      const verifyEmbed = new EmbedBuilder()
        .setColor(config.verify?.color || "#5865F2")
        .setTitle(config.verify?.title || "✅ Verifikacija")
        .setDescription(config.verify?.message || "Klikni dugme ispod da se verifikuješ i otključaš sve kanale!")
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_btn_${guildId}`)
          .setLabel(config.verify?.buttonText || "Verifikacija")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("✅")
      );

      await channel.send({ embeds: [verifyEmbed], components: [row] });

      embed.setColor(0x2ecc71).setTitle("✅ Verifikaciona poruka poslata").setDescription(`Poslato u <#${channel.id}>`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
EOF
