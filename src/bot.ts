import {Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder} from 'discord.js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import * as querystring from "node:querystring";

dotenv.config();

const client = new Client({intents: [GatewayIntentBits.Guilds]});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const PEBBLEHOST_API_USER = process.env.PEBBLEHOST_API_USER;
const MULTICRAFT_API_KEY = process.env.MULTICRAFT_API_KEY;
const MULTICRAFT_SERVER_ID = process.env.MULTICRAFT_SERVER_ID;

if(!DISCORD_BOT_TOKEN || !MULTICRAFT_API_KEY || !PEBBLEHOST_API_USER || !MULTICRAFT_SERVER_ID || !DISCORD_CLIENT_ID){
    console.error('Missing environment variables');
    process.exit(1);
}

interface APIParams {
    _MulticraftAPIMethod?: string;
    _MulticraftAPIUser?: string;
    _MulticraftAPIKey?: string;
    id?: string;
    [key: string]: any;
}

const commands = [
    new SlashCommandBuilder()
        .setName('revive_server')
        .setDescription('Revive the server')
        .toJSON()
];

const rest: REST= new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        // For global commands
        await rest.put(
            Routes.applicationCommands(DISCORD_CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded global (/) commands.');


    } catch (error) {
        console.error(error);
    }
})();


client.once('ready', () => {

    // Print env variables
    console.log(`DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN}`);
    console.log(`DISCORD_CLIENT_ID: ${DISCORD_CLIENT_ID}`);
    console.log(`PEBBLEHOST_API_USER: ${PEBBLEHOST_API_USER}`);
    console.log(`MULTICRAFT_API_KEY: ${MULTICRAFT_API_KEY}`);
    console.log(`MULTICRAFT_SERVER_ID: ${MULTICRAFT_SERVER_ID}`);

    console.log('Bot is ready');
});

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isCommand()) return;


    // If command is revive_server
    if(interaction.commandName === 'revive_server'){
        try{

            // Make request to PebbleHost API
            async function makeRequest(method: string, user: string, key: string) {
                let content = { id: MULTICRAFT_SERVER_ID };
                let keystr: string = '';
                let params: APIParams = content ? content : {};

                params['_MulticraftAPIMethod'] = method;
                params['_MulticraftAPIUser'] = user;

                for (const param in params) {
                    if (!params.hasOwnProperty(param)) continue;
                    keystr += param + params[param].toString();
                }

                const hmac = crypto.createHmac('sha256', key);
                hmac.update(keystr);
                params['_MulticraftAPIKey'] = hmac.digest('hex');

                const encodeParams: string = querystring.stringify(params);

                const { data } = await axios.post('https://panel.pebblehost.com/api.php', encodeParams, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
                        'Referer': 'https://panel.pebblehost.com'
                    }
                });

                return data;
            }

            const commandUserName: string = interaction.user.username;
            console.log(`${interaction.commandName} executed by ${commandUserName}`);

            // First get server status
            let method: string = 'getServerStatus';
            let response = await makeRequest(method, PEBBLEHOST_API_USER, MULTICRAFT_API_KEY);

            console.log(`Server status: ${response.data.status}`);

            if(response.success){

                // If the server is offline, start the server
                if(response.data.status === 'offline') {
                    method = 'startServer';
                    response = await makeRequest(method, PEBBLEHOST_API_USER, MULTICRAFT_API_KEY);

                    console.log(`Server start response: ${response.success}`);

                    await interaction.reply('Server is starting');
                }else{
                    await interaction.reply('Server is already online');
                }
            }else{
                await interaction.reply('Error');
                console.error(`Error: ${response.error}`);
            }

        }catch(error){
            console.error(`Error: ${error}`);
            await interaction.reply('Error');
        }
    }
});

client.login(DISCORD_BOT_TOKEN).then(() => console.log('Logged in')).catch(e => console.error(e));