const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, REST, Routes } = require("discord.js");
const { CustomCommand } = require("../../schemas");
require("dotenv").config();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("customcmd")
    .setDescription("Upravljanje custom komandama.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub.setName("dodaj").setDescription("Dodaj novu custom komandu.")
        .addStringOption((o) => o.setName("naziv").setDescription("Naziv (bez /)").setRequired(true))
        .addStringOption((o) => o.setName("opis").setDescription("Opis koji će biti prikazan").setRequired(true))
        .addStringOption((o) => o.setName("link").setDescription("Link (opciono)").setRequired(false))
        .addStringOption((o) => o.setName("slika").setDescription("URL slike (opciono)").setRequired(false))
        .addStringOption((o) => o.setName("boja").setDescription("Hex boja npr. #FF5733").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName("obrisi").setDescription("Obriši custom komandu.")
        .addStringOption((o) => o.setName("naziv").setDescription("Naziv komande").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("lista").setDescription("Lista svih custom komandi.")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: "Opii Custom CMD" });

    if (sub === "dodaj") {
      const naziv = interaction.options.getString("naziv").toLowerCase().trim();
      const opis = interaction.options.getString("opis");
      const link = interaction.options.getString("link");
      const slika = interaction.options.getString("slika");
      const boja = interaction.options.getString("boja") || "#5865F2";

      if (!/^[a-z0-9-]+$/.test(naziv)) {
        return interaction.reply({
          content: "❌ Naziv može sadržati samo mala slova, cifre i crtice.",
          ephemeral: true,
        });
      }

      try {
        await CustomCommand.create({ guildId, name: naziv, description: opis, link, imageUrl: slika, color: boja, createdBy: interaction.user.id });

        const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
        await rest.post(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), {
          body: { name: naziv, description: opis.substring(0, 100) },
        });

        embed.setColor(0x2ecc71).setTitle(`✅ Custom komanda /${naziv} kreirana!`);
      } catch (err) {
        embed.setColor(0xe74c3c).setTitle(
          err.code === 11000 ? `❌ Komanda /${naziv} već postoji.` : "❌ Greška pri kreiranju."
        );
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "obrisi") {
      const naziv = interaction.options.getString("naziv").toLowerCase().trim();
      const deleted = await CustomCommand.findOneAndDelete({ guildId, name: naziv });
      embed.setColor(deleted ? 0x2ecc71 : 0xe74c3c)
        .setTitle(deleted ? `✅ Komanda /${naziv} obrisana.` : `❌ Komanda /${naziv} nije pronađena.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "lista") {
      const cmds = await CustomCommand.find({ guildId }).select("name description");
      const lista = cmds.length > 0
        ? cmds.map((c) => `\`/${c.name}\` — ${c.description.substring(0, 50)}`).join("\n")
        : "Nema custom komandi.";
      embed.setColor(0x3498db).setTitle("📋 Custom Komande").setDescription(lista);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};