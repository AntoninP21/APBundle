const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const axios = require('axios');
const { format, subDays, subMonths, subYears, subHours } = require('date-fns');

// Fonction pour afficher le menu de période de téléchargement
const displayDownloadMenu = async (interaction) => {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('download_365_days')
                .setLabel('365 jours')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('download_6_months')
                .setLabel('6 mois')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('download_1_month')
                .setLabel('1 mois')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('download_1_week')
                .setLabel('1 semaine')
                .setStyle(ButtonStyle.Primary),
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('download_24_hours')
                .setLabel('24 heures')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('choose_period')
                .setLabel('Choisir période')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('cancel_download')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Danger),
        );

    await interaction.update({
        content: 'Choisissez la période des médias à télécharger :',
        components: [row1, row2]
    });
};

// Fonction pour gérer le téléchargement des médias en fonction de la période choisie
const downloadMedia = async (channelId, client, startDate, endDate) => {
    console.log(`Téléchargement des médias du salon avec l'ID ${channelId} entre ${startDate} et ${endDate}...`);

    const channel = await client.channels.fetch(channelId);

    if (channel && channel.isTextBased()) {
        const messages = await channel.messages.fetch({ limit: 100 });

        messages.forEach(message => {
            if (message.createdAt >= new Date(startDate) && message.createdAt <= new Date(endDate)) {
                if (message.attachments.size > 0) {
                    message.attachments.forEach(async (attachment) => {
                        const url = attachment.url;
                        const filename = `./medias/${attachment.name}`;

                        try {
                            const response = await axios({
                                url,
                                method: 'GET',
                                responseType: 'stream',
                            });

                            response.data.pipe(fs.createWriteStream(filename))
                                .on('finish', () => console.log(`${filename} téléchargé avec succès.`))
                                .on('error', (error) => console.error(`Erreur lors du téléchargement de ${filename}: `, error));
                        } catch (error) {
                            console.error(`Erreur lors de la demande de téléchargement de ${filename}: `, error);
                        }
                    });
                }
            }
        });
    } else {
        console.error('Le canal n\'est pas un salon textuel.');
    }
};

// Fonction pour traiter les interactions des boutons
const handleInteraction = async (interaction, client) => {
    if (!interaction.isButton()) return;

    const now = new Date();
    let startDate, endDate;

    switch (interaction.customId) {
        case 'download_365_days':
            startDate = subYears(now, 1);
            endDate = now;
            break;
        case 'download_6_months':
            startDate = subMonths(now, 6);
            endDate = now;
            break;
        case 'download_1_month':
            startDate = subMonths(now, 1);
            endDate = now;
            break;
        case 'download_1_week':
            startDate = subDays(now, 7);
            endDate = now;
            break;
        case 'download_24_hours':
            startDate = subHours(now, 24);
            endDate = now;
            break;
        case 'choose_period':
            await interaction.reply({ content: 'Veuillez répondre avec la période au format "jj/mm/aaaa - jj/mm/aaaa".', ephemeral: true });
            // Ici, tu peux ajouter du code pour traiter le message suivant de l'utilisateur pour obtenir les dates personnalisées
            return;
        case 'cancel_download':
            await interaction.update({ content: 'Téléchargement annulé.', components: [] });
            return;
        default:
            return;
    }

    await interaction.update({ content: 'Téléchargement des médias en cours...', components: [] });
    downloadMedia(interaction.channelId, client, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
};

module.exports = { displayDownloadMenu, handleInteraction };