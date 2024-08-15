"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const crypto = __importStar(require("crypto"));
const querystring = __importStar(require("node:querystring"));
dotenv.config();
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const PEBBLEHOST_API_USER = process.env.PEBBLEHOST_API_USER;
const MULTICRAFT_API_KEY = process.env.MULTICRAFT_API_KEY;
const MULTICRAFT_SERVER_ID = process.env.PEBBLEHOST_SERVER_ID;
if (!DISCORD_BOT_TOKEN || !MULTICRAFT_API_KEY || !PEBBLEHOST_API_USER || !MULTICRAFT_SERVER_ID || !DISCORD_CLIENT_ID) {
    console.error('Missing environment variables');
    process.exit(1);
}
const commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('revive_server')
        .setDescription('Revive the server')
        .toJSON()
];
const rest = new discord_js_1.REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Started refreshing application (/) commands.');
        // For global commands
        yield rest.put(discord_js_1.Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
        console.log('Successfully reloaded global (/) commands.');
    }
    catch (error) {
        console.error(error);
    }
}))();
client.once('ready', () => {
    console.log('Bot is ready');
});
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    if (!interaction.isCommand())
        return;
    const { commandName } = interaction;
    if (commandName === 'revive_server') {
        try {
            const content = { id: MULTICRAFT_SERVER_ID };
            function makeRequest(method, content, user, key) {
                return __awaiter(this, void 0, void 0, function* () {
                    let keystr = '';
                    let params = content ? content : {};
                    params['_MulticraftAPIMethod'] = method;
                    params['_MulticraftAPIUser'] = user;
                    for (const param in params) {
                        if (!params.hasOwnProperty(param))
                            continue;
                        keystr += param + params[param].toString();
                    }
                    const hmac = crypto.createHmac('sha256', key);
                    hmac.update(keystr);
                    const digest = hmac.digest('hex');
                    params['_MulticraftAPIKey'] = digest;
                    const encodeParams = querystring.stringify(params);
                    const { data } = yield axios_1.default.post('https://panel.pebblehost.com/api.php', encodeParams, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0',
                            'Referer': 'https://panel.pebblehost.com'
                        }
                    });
                    return data;
                });
            }
            let method = 'getServerStatus';
            let response = yield makeRequest(method, content, PEBBLEHOST_API_USER, MULTICRAFT_API_KEY);
            console.log(response);
            if (response.success) {
                if (response.data.status === 'offline') {
                    method = 'startServer';
                    response = yield makeRequest(method, content, PEBBLEHOST_API_USER, MULTICRAFT_API_KEY);
                    yield interaction.reply('Server is starting');
                }
                else {
                    yield interaction.reply('Server is already online');
                }
            }
            else {
                yield interaction.reply('Error');
                console.log(response);
            }
        }
        catch (error) {
            console.error('Error:', error);
            yield interaction.reply('Error');
        }
    }
}));
client.login(DISCORD_BOT_TOKEN);
