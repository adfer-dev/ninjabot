import Discord from 'discord.js'
import dotenv from 'dotenv'
import { initCommands } from './controllers/commands.js'

dotenv.config()

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent
  ]
})
client.once('messageCreate', (message) => {
  if (message.content === 'hello') {
    message.reply('hi!')
  }
})

client.on('guildMemberAdd', async (member) => {
  member.guild.channels.cache.find(channel => channel.name === 'welcome')?.send(member.displayName + ' joined the server')
})

client.once('ready', async () => {
  initCommands(client)
})

client.on('channelCreate', (channel) => {
  console.log(`channelCreate: ${channel}`)
})

client.on('interactionCreate', (interaction) => {
  //
})

client.login(process.env.BOT_TOKEN)
