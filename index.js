import Discord from 'discord.js'
import dotenv from 'dotenv'
import { initCommands } from './controllers/commandHandler.js'

dotenv.config()

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildInvites
  ]
})

client.once('ready', () => {
  initCommands(client)
})

client.login(process.env.BOT_TOKEN)
