const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Provera da li bot radi!'),
    async execute(interaction) {
        await interaction.reply('Pong! Bot radi.');
    },
};