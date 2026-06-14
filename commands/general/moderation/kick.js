const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../../utils/modLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kickuje člana sa servera.")
    .addUserOption((opt) =>
      opt.setName("korisnik").setDescription("Korisnik za kick").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("razlog").setDescription("Razlog kicka").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getMember("korisnik");
    const reason = interaction.options.getString("razlog") || "Nije naveden razlog.";

    if (!target.kickable) {
      return interaction.reply({ content: "❌ Ne mogu da kickujem ovog korisnika.", ephemeral: true });
    }

    await target.kick(reason);

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle("👢 Korisnik Kickovan")
      .addFields(
        { name: "Korisnik", value: target.user.tag, inline: true },
        { name: "Moderator", value: interaction.user.tag, inline: true },
        { name: "Razlog", value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await sendModLog(interaction.client, interaction.guild, embed);
  },
};