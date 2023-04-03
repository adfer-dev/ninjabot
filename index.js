import Discord from 'discord.js'
import dotenv from 'dotenv'

dotenv.config()

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent
  ]
})

client.once('messageCreate', (message) => {
  if (message.content === 'hello') {
    message.reply('hi!')
  }
})

client.once('ready', () => {
  console.log('Ready!')
})

client.on('channelCreate', (channel) => {
  console.log(`channelCreate: ${channel}`)
})

client.login(process.env.BOT_TOKEN)
