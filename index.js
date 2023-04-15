import Discord from 'discord.js'
import dotenv from 'dotenv'
import { initCommands } from './controllers/commands.js'

dotenv.config()

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildVoiceStates
  ]
})

client.on('guildMemberAdd', async (member) => {
  member.guild.channels.cache.find(channel => channel.name === 'welcome')?.send(member.displayName + ' joined the server')
})

client.once('ready', async () => {
  initCommands(client)
})

client.on('channelCreate', (channel) => {
  console.log('channelCreate:' + channel.name + channel.id)
})

client.on('interactionCreate', async (interaction) => {
  //
})

client.login(process.env.BOT_TOKEN)
