const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const {
  getKonfiguracija,
  setKonfiguracija,
  popuniPoruku,
} = require("../../utils/welcomeConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Podesi poruke za dolazak i odlazak članova")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("kanal")
        .setDescription("Postavi kanal u koji se šalju poruke")
        .addStringOption((opt) =>
          opt
            .setName("tip")
            .setDescription("Dolazak ili odlazak")
            .setRequired(true)
            .addChoices(
              { name: "Dolazak", value: "welcome" },
              { name: "Odlazak", value: "leave" }
            )
        )
        .addChannelOption((opt) =>
          opt
            .setName("kanal")
            .setDescription("Kanal u koji se šalju poruke")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("boja")
        .setDescription("Postavi boju (sa strane) embed poruke")
        .addStringOption((opt) =>
          opt
            .setName("tip")
            .setDescription("Dolazak ili odlazak")
            .setRequired(true)
            .addChoices(
              { name: "Dolazak", value: "welcome" },
              { name: "Odlazak", value: "leave" }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName("boja")
            .setDescription("Hex kod boje, npr. #5865F2")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("poruka")
        .setDescription("Postavi tekst poruke")
        .addStringOption((opt) =>
          opt
            .setName("tip")
            .setDescription("Dolazak ili odlazak")
            .setRequired(true)
            .addChoices(
              { name: "Dolazak", value: "welcome" },
              { name: "Odlazak", value: "leave" }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName("tekst")
            .setDescription(
              "Koristi {user}, {username}, {server}, {membercount}"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Uključi ili isključi poruke")
        .addStringOption((opt) =>
          opt
            .setName("tip")
            .setDescription("Dolazak ili odlazak")
            .setRequired(true)
            .addChoices(
              { name: "Dolazak", value: "welcome" },
              { name: "Odlazak", value: "leave" }
            )
        )
        .addBooleanOption((opt) =>
          opt
            .setName("uključeno")
            .setDescription("Da li su poruke uključene")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("test")
        .setDescription("Pošalji probnu poruku da vidiš kako izgleda")
        .addStringOption((opt) =>
          opt
            .setName("tip")
            .setDescription("Dolazak ili odlazak")
            .setRequired(true)
            .addChoices(
              { name: "Dolazak", value: "welcome" },
              { name: "Odlazak", value: "leave" }
            )
        )
    ),

  async execute(interaction) {
    const tip = interaction.options.getString("tip");
    const naziv = tip === "welcome" ? "Dolazak" : "Odlazak";

    switch (interaction.options.getSubcommand()) {
      case "kanal": {
        const kanal = interaction.options.getChannel("kanal");
        setKonfiguracija(interaction.guild.id, tip, { channelId: kanal.id });

        return interaction.reply({
          content: `✅ Kanal za **${naziv}** poruke je postavljen na ${kanal}.`,
          ephemeral: true,
        });
      }

      case "boja": {
        const boja = interaction.options.getString("boja");

        if (!/^#[0-9A-Fa-f]{6}$/.test(boja)) {
          return interaction.reply({
            content: "❌ Boja mora biti u hex formatu, npr. `#5865F2`.",
            ephemeral: true,
          });
        }

        setKonfiguracija(interaction.guild.id, tip, { color: boja });

        return interaction.reply({
          content: `✅ Boja za **${naziv}** poruke je promenjena na \`${boja}\`.`,
          ephemeral: true,
        });
      }

      case "poruka": {
        const tekst = interaction.options.getString("tekst");
        setKonfiguracija(interaction.guild.id, tip, { message: tekst });

        return interaction.reply({
          content: `✅ Tekst za **${naziv}** poruke je sačuvan.\n\n**Pregled:**\n${popuniPoruku(
            tekst,
            interaction.member
          )}`,
          ephemeral: true,
        });
      }

      case "status": {
        const uključeno = interaction.options.getBoolean("uključeno");
        setKonfiguracija(interaction.guild.id, tip, { enabled: uključeno });

        return interaction.reply({
          content: `✅ **${naziv}** poruke su sada **${
            uključeno ? "uključene ✅" : "isključene ❌"
          }**.`,
          ephemeral: true,
        });
      }

      case "test": {
        const config = getKonfiguracija(interaction.guild.id, tip);

        if (!config.channelId) {
          return interaction.reply({
            content: "❌ Prvo postavi kanal koristeći `/welcome kanal`.",
            ephemeral: true,
          });
        }

        const poruka = popuniPoruku(config.message, interaction.member);

        const embed = new EmbedBuilder()
          .setColor(config.color)
          .setTitle(
            tip === "welcome"
              ? "🎉 Novi član na serveru!"
              : "👋 Član je napustio server"
          )
          .setDescription(poruka)
          .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: `Trenutno članova: ${interaction.guild.memberCount}` })
          .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  },
};