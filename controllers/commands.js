import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js'
import { v4 as uuid } from 'uuid'

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
        await interaction.reply('welcome channel has been created successfully.')
      } else {
        await interaction.reply('welcome channel has already been created.')
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
        const newRole = await interaction.guild.roles.create({ name: uuid() })// create the role for the private channel

        // set the role for every chosen user
        for (const id of userIds) {
          const user = interaction.guild.members.cache.get(id)
          user.roles.add(newRole)
        }

        // create the channel with visualization permissions only for the chosen users.
        const newChannel = await interaction.guild.channels.create(
          {
            name: channelName,
            type: interaction.options.getInteger('type'),
            permissionOverwrites: [
              {
                id: interaction.guild.roles.cache.find(allowedRoles => (allowedRoles.name === newRole.name || allowedRoles.name === 'adferbot')).id,
                allow: [PermissionsBitField.Flags.ViewChannel]
              },
              {
                id: interaction.guild.roles.cache.find(deniedRoles => deniedRoles.name === '@everyone').id,
                deny: [PermissionsBitField.Flags.ViewChannel]
              }
            ]
          })
        interaction.reply('Private channel has been created')

        // set an interval to check every 2 hours if the channel is empty. If it is, delete it.
        const checkUnusedInterval = setInterval(() => {
          if (interaction.guild.channels.cache.has(newChannel.id) && newChannel.members.size === 0) {
            newChannel.delete('Temporal channel expired - Delete channel')
            newRole.delete('Temporal channel expired - Delete channel role')
            clearInterval(checkUnusedInterval)
          }
        }, 10000)// 7200000
      } else {
        interaction.reply('Input error: This channel\'s name already exists')
      }
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
          await interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true
          })
        }
      }
    })
  }
}
