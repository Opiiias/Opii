const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("Prikazuje informacije o ovom serveru."),

  async execute(interaction) {
    await interaction.deferReply();
    const { guild } = interaction;
    const owner = await guild.fetchOwner();
    const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;
    const roles = guild.roles.cache.filter((r) => r.id !== guild.id).size;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: "🆔 ID Servera", value: guild.id, inline: true },
        { name: "👑 Vlasnik", value: owner.user.tag, inline: true },
        { name: "📅 Kreiran", value: createdAt },
        { name: "👥 Ukupno članova", value: String(guild.memberCount), inline: true },
        { name: "🎭 Uloge", value: String(roles), inline: true },
        { name: "💬 Kanali", value: String(guild.channels.cache.size), inline: true }
      )
      .setFooter({ text: "Opii Bot" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};