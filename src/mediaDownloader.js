const { Client, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const token = process.env.TOKEN; // Remplace par le token de ton bot

// Fonction de téléchargement des médias
const downloadMedia = async (channelId) => {
    client.once(Events.ClientReady, async () => {
        console.log(`Connecté en tant que ${client.user.tag}`);

        // Récupère le salon à partir de l'ID fourni
        const channel = await client.channels.fetch(channelId);

        if (channel && channel.isTextBased()) {
            const messages = await channel.messages.fetch({ limit: 100 });

            messages.forEach(message => {
                if (message.attachments.size > 0) {
                    message.attachments.forEach(async (attachment) => {
                        const url = attachment.url;
                        const filename = `./medias/${attachment.name}`;

                        // Télécharge le fichier
                        const response = await axios({
                            url,
                            method: 'GET',
                            responseType: 'stream',
                        });

                        // Sauvegarde le fichier dans le dossier 'medias'
                        response.data.pipe(fs.createWriteStream(filename))
                            .on('finish', () => console.log(`${filename} téléchargé avec succès.`))
                            .on('error', (error) => console.log(`Erreur lors du téléchargement de ${filename}: `, error));
                    });
                }
            });
        }
    });

    client.login(token);
};

module.exports = { downloadMedia };