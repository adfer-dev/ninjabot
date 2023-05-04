import Discord from 'discord.js'
import dotenv from 'dotenv'
import { initCommands } from './controllers/commands.js'

dotenv.config()

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildInvites
  ]
})

client.once('ready', async () => {
  initCommands(client)
})

client.login(process.env.BOT_TOKEN)
