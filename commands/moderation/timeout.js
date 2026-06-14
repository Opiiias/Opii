const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { sendModLog } = require("../../utils/modLog");

const TRAJANJA = [
  { name: "60 sekundi", value: 60 },
  { name: "5 minuta", value: 300 },
  { name: "10 minuta", value: 600 },
  { name: "1 sat", value: 3600 },
  { name: "1 dan", value: 86400 },
  { name: "1 nedelja", value: 604800 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Stavlja timeout na člana.")
    .addUserOption((opt) =>
      opt.setName("korisnik").setDescription("Korisnik za timeout").setRequired(true)
    )
    .addStringOption((opt) => {
      opt.setName("trajanje").setDescription("Trajanje timeout-a").setRequired(true);
      TRAJANJA.forEach((t) => opt.addChoices({ name: t.name, value: String(t.value) }));
      return opt;
    })
    .addStringOption((opt) =>
      opt.setName("razlog").setDescription("Razlog timeout-a").setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember("korisnik");
    const seconds = parseInt(interaction.options.getString("trajanje"));
    const reason = interaction.options.getString("razlog") || "Nije naveden razlog.";

    if (!target.moderatable) {
      return interaction.reply({ content: "❌ Ne mogu da stavim timeout ovom korisniku.", ephemeral: true });
    }

    await target.timeout(seconds * 1000, reason);
    const trajanjeName = TRAJANJA.find((t) => t.value === seconds)?.name || `${seconds}s`;

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle("⏱️ Timeout")
      .addFields(
        { name: "Korisnik", value: target.user.tag, inline: true },
        { name: "Moderator", value: interaction.user.tag, inline: true },
        { name: "Trajanje", value: trajanjeName, inline: true },
        { name: "Razlog", value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    await sendModLog(interaction.client, interaction.guild, embed);
  },
};
