const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLog");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banuje člana sa servera.")
    .addUserOption((opt) =>
      opt.setName("korisnik").setDescription("Korisnik za ban").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("razlog").setDescription("Razlog bana").setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt.setName("brisanje_poruka").setDescription("Briši poruke poslednjih X dana (0-7)")
        .setMinValue(0).setMaxValue(7).setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getMember("korisnik");
    const reason = interaction.options.getString("razlog") || "Nije naveden razlog.";
    const deleteMessageDays = interaction.options.getInteger("brisanje_poruka") ?? 0;

    if (!target.bannable) {
      return interaction.reply({ content: "❌ Ne mogu da banujem ovog korisnika.", ephemeral: true });
    }

    await target.ban({ reason, deleteMessageSeconds: deleteMessageDays * 86400 });

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("🔨 Korisnik Banovan")
      .addFields(
        { name: "Korisnik", value: target.user.tag, inline: true },
        { name: "Moderator", value: interaction.user.tag, inline: true },
        { name: "Razlog", value: reason },
        { name: "Obrisane poruke", value: `${deleteMessageDays} dana`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await sendModLog(interaction.client, interaction.guild, embed);
  },
};
