import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js'

const commands = [
  // welcome channel command.
  {
    data: new SlashCommandBuilder()
      .setName('welcome')
      .setDescription('creates a welcome channel on the server.'),
    async execute (interaction) {
      if (!interaction.guild.channels.cache.find(channel => channel.name === 'welcome')) {
        await interaction.guild.channels.create({
          name: 'welcome',
          type: ChannelType.GuildText
        })
        await ephemeralInteractionReply(interaction, 'welcome channel has been created successfully.')
      } else {
        await ephemeralInteractionReply(interaction, 'welcome channel has already been created.')
      }
    }
  },
  // private room command.
  {
    data: new SlashCommandBuilder()
      .setName('privateroom')
      .setDescription('creates a temporal channel that only the tagged users can see.')
      .addStringOption(nameOption =>
        nameOption.setName('name')
          .setDescription('the name of the room')
          .setRequired(true)
      )
      .addIntegerOption(typeOption =>
        typeOption.setName('type')
          .setDescription('the type of the channel. only voice or text are valid inputs.')
          .setRequired(true)
          .addChoices(
            { name: 'voice', value: ChannelType.GuildVoice },
            { name: 'text', value: ChannelType.GuildText }
          )
      )
      .addStringOption(usersOption =>
        usersOption.setName('users')
          .setDescription('the users to be added to the private room.')
          .setRequired(true)
      ),
    async execute (interaction) {
      const userIds = interaction.options.getString('users').replaceAll(/[^\d ^\s]/g, '').split(' ') // get users´s ids passed by the user
      const channelName = interaction.options.getString('name')// the user´s selected channel room

      // check that all tagged users exist.
      if (!userIds.includes('')) {
        const newChannel = await interaction.guild.channels.create({
          name: 'private_' + channelName,
          type: interaction.options.getInteger('type')
        })

        // set channel´s permissions only for the chosen users.
        for (const id of userIds) {
          newChannel.permissionOverwrites.create(id, {
            ViewChannel: true
          })
        }
        // also grant access to bot user
        newChannel.permissionOverwrites.create(interaction.guild.roles.cache.find(botRole => botRole.name === 'adferbot').id, {
          ViewChannel: true
        })
        // deny access to the rest of users
        newChannel.permissionOverwrites.create(interaction.guild.roles.cache.find(deniedRoles => deniedRoles.name === '@everyone'), {
          ViewChannel: false
        })

        await ephemeralInteractionReply(interaction, 'Private channel has been created')

        // set an interval to check every 2 hours if the channel is empty. If it is, delete it.
        const checkUnusedInterval = setInterval(() => {
          if (newChannel.members.size === 0) {
            // first check that the channel has not been manually deleted
            if (interaction.guild.channels.cache.has(newChannel.id)) {
              newChannel.delete('Temporal channel expired - Delete channel')
            }
            clearInterval(checkUnusedInterval)
          }
        }, 7200000)
      } else {
        await ephemeralInteractionReply(interaction, 'Input error: This channel\'s name already exists')
      }
    }
  },

  {
    data: new SlashCommandBuilder()
      .setName('getcodes')
      .setDescription('gets the codes of the private channels that this user is in.'),
    async execute (interaction) {
      const channels = interaction.guild.channels.cache.filter(channel => (channel.permissionsFor(interaction.member).has(PermissionsBitField.Flags.ViewChannel) && channel.name.startsWith('private_')))
      if (channels.size > 0) {
        let messageContent = 'Codes of private channels'
        channels.forEach(channel => {
          messageContent += '\n' + channel.name + ': ' + channel.id
        })
        await ephemeralInteractionReply(interaction, messageContent)
      } else { await ephemeralInteractionReply(interaction, 'You are not in any private channel.') }
    }
  },

  {
    data: new SlashCommandBuilder()
      .setName('joinchannel')
      .setDescription('adds a user to a private channel')
      .addStringOption(codeOption =>
        codeOption.setName('code')
          .setDescription('the code of the room to be joined')
          .setRequired(true)
      ),
    async execute (interaction) {
      const selectedChannel = interaction.guild.channels.cache.find(channel => channel.id === interaction.options.getString('code'))
      if (selectedChannel) {
        console.log(selectedChannel.name)
        selectedChannel.permissionOverwrites.create(interaction.member.id, { ViewChannel: true })
        await ephemeralInteractionReply(interaction, 'joining room...')
      } else { await ephemeralInteractionReply(interaction, 'This channel does not exist.') }
    }
  }
]

/**
 * Function that registers the command and adds a listener to handle its execute function.
 * @param {*} client DiscordAPI´s client
 */
export async function initCommands (client) {
  for (const command of commands) {
    await client.application.commands.create(command.data.toJSON())

    client.on('interactionCreate', async (interaction) => {
      if (interaction.isCommand() && interaction.commandName === command.data.name) {
        try {
          await command.execute(interaction)
        } catch (error) {
          console.error(error)
          await ephemeralInteractionReply(interaction, 'There was an error while executing this command!')
        }
      }
    })
  }
}

/**
 * Function that replies an user interaction with an ephemeral message
 * @param {*} interaction the user interaction to be replied
 * @param {*} content the reply message
 */
async function ephemeralInteractionReply (interaction, content) {
  await interaction.reply({
    content,
    ephemeral: true
  })
}
