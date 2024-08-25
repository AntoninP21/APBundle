const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { zip } = require('zip-a-folder');
const { format, subDays, subMonths, subYears, subHours, parse } = require('date-fns');

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
        content: 'Télécharger les médias présents dans le salon depuis :',
        components: [row1, row2]
    });
};

const collectMediaLinks = async (channelId, client, startDate, endDate) => {
    console.log(`Collecte des liens des médias du salon avec l'ID ${channelId} entre ${startDate} et ${endDate}...`);

    const channel = await client.channels.fetch(channelId);
    let mediaLinks = [];

    if (channel && channel.isTextBased()) {
        const messages = await channel.messages.fetch({ limit: 100 });

        messages.forEach(message => {
            if (message.createdAt >= new Date(startDate) && message.createdAt <= new Date(endDate)) {
                if (message.attachments.size > 0) {
                    message.attachments.forEach((attachment) => {
                        mediaLinks.push(attachment.url);
                    });
                }
            }
        });
    } else {
        console.error('Le canal n\'est pas un salon textuel.');
    }

    return mediaLinks;
};

const createZipWithLinks = async (mediaLinks, interaction, period) => {
    const tempDir = path.join(__dirname, 'temp');
    const zipFileName = `media_links_${period}.zip`;
    const zipFilePath = path.join(__dirname, zipFileName);

    try {
        await fs.mkdir(tempDir, { recursive: true });

        // Créer un fichier texte avec tous les liens
        const allLinksContent = mediaLinks.join('\n');
        await fs.writeFile(path.join(tempDir, 'all_media_links.txt'), allLinksContent);

        // Créer des fichiers HTML individuels pour chaque lien
        for (let i = 0; i < mediaLinks.length; i++) {
            const link = mediaLinks[i];

            // Extraire le titre du lien en enlevant le début de l'URL
            let title = link.replace('https://cdn.discordapp.com/attachments/', '');

            // Nettoyer le titre pour qu'il soit compatible avec les noms de fichiers
            title = title.replace(/[\/\\?%*:|"<>]/g, '_'); // Remplace les caractères spéciaux par des underscores

            const htmlContent = `
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
            </head>
            <body>
                <script>
                    window.location.href = "${link}";
                </script>
            </body>
            </html>`;
            await fs.writeFile(path.join(tempDir, `media_${title}.html`), htmlContent);
        }

        // Créer le zip
        await zip(tempDir, zipFilePath);

        // Envoyer le fichier zip
        await interaction.followUp({
            content: `Voici les liens des médias pour la période : ${period}`,
            files: [{ attachment: zipFilePath, name: zipFileName }]
        });

        // Nettoyer les fichiers temporaires
        await fs.rm(tempDir, { recursive: true, force: true });
        await fs.unlink(zipFilePath);
    } catch (error) {
        console.error('Erreur lors de la création du zip :', error);
        await interaction.followUp('Une erreur est survenue lors de la création du fichier zip.');
    }
};

const handleInteraction = async (interaction, client) => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const now = new Date();
    let startDate, endDate, period;

    if (interaction.customId === 'choose_period') {
        const modal = new ModalBuilder()
            .setCustomId('period_modal')
            .setTitle('Choisir une période');

        const periodInput = new TextInputBuilder()
            .setCustomId('period_input')
            .setLabel('Entrez la période (jj/mm/aaaa - jj/mm/aaaa)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(periodInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
        return;
    }

    if (interaction.customId === 'period_modal') {
        const userInput = interaction.fields.getTextInputValue('period_input');
        const [startString, endString] = userInput.split('-').map(s => s.trim());
        
        startDate = parse(startString, 'dd/MM/yyyy', new Date());
        endDate = parse(endString, 'dd/MM/yyyy', new Date());
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            await interaction.reply('Format de date invalide. Veuillez utiliser le format jj/mm/aaaa - jj/mm/aaaa.');
            return;
        }
        
        period = `${format(startDate, 'dd-MM-yyyy')}_to_${format(endDate, 'dd-MM-yyyy')}`;
    } else {
        switch (interaction.customId) {
            case 'download_365_days':
                startDate = subYears(now, 1);
                endDate = now;
                period = '365_days';
                break;
            case 'download_6_months':
                startDate = subMonths(now, 6);
                endDate = now;
                period = '6_months';
                break;
            case 'download_1_month':
                startDate = subMonths(now, 1);
                endDate = now;
                period = '1_month';
                break;
            case 'download_1_week':
                startDate = subDays(now, 7);
                endDate = now;
                period = '1_week';
                break;
            case 'download_24_hours':
                startDate = subHours(now, 24);
                endDate = now;
                period = '24_hours';
                break;
            case 'cancel_download':
                await interaction.update({ content: 'Téléchargement annulé.', components: [] });
                return;
            default:
                return;
        }
    }

    await interaction.deferReply();
    const mediaLinks = await collectMediaLinks(interaction.channelId, client, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
    await createZipWithLinks(mediaLinks, interaction, period);
};

module.exports = { displayDownloadMenu, handleInteraction };