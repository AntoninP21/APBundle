require('dotenv').config();
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { displayDownloadMenu, handleInteraction } = require('./mediaDownloader');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const token = process.env.token;

client.once(Events.ClientReady, () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === '!menu') {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('download_menu')
                    .setLabel('Télécharger médias')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quit')
                    .setLabel('Quitter')
                    .setStyle(ButtonStyle.Danger),
            );

        await message.channel.send({
            content: 'Que souhaitez-vous faire ?',
            components: [row]
        });
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    if (interaction.customId === 'download_menu') {
        displayDownloadMenu(interaction);
    } else {
        handleInteraction(interaction, client);
    }
});

client.login(token);