require('dotenv').config();
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { downloadMedia } = require('./mediaDownloader'); 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const token = process.env.TOKEN;

client.once(Events.ClientReady, () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content === '!menu') {
        // Créer les boutons pour l'interaction
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('download')
                    .setLabel('Télécharger médias du salon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('quit')
                    .setLabel('Quitter')
                    .setStyle(ButtonStyle.Danger),
            );

        // Envoyer un message avec les boutons
        await message.channel.send({
            content: 'Que souhaitez-vous faire ?',
            components: [row]
        });
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'download') {
        await interaction.reply('Téléchargement des médias en cours...');
        downloadMedia(interaction.channelId);  // Lance le téléchargement des médias
    } else if (interaction.customId === 'quit') {
        await interaction.reply('Action annulée.');
    }
});

client.login(token);