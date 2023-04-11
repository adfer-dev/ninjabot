import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js'

const commands = [
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
  {
    data: new SlashCommandBuilder()
      .setName('private')
      .setDescription('creates a voice or text channel that only the tagged users can see.')
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
      const userIds = interaction.options.getString('users').replaceAll(/[^\d ^\s]/g, '').split(' ')
      const channelName = interaction.options.getString('name')
      if (!interaction.guild.channels.cache.find(channel => channel.name === channelName)) {
        const newRole = await interaction.guild.roles.create({ name: channelName })

        for (const id of userIds) {
          const user = interaction.guild.members.cache.get(id)
          user.roles.add(newRole)
        }

        await interaction.guild.channels.create(
          {
            name: channelName,
            type: interaction.options.getInteger('type'),
            permissionOverwrites: [
              {
                id: newRole.id,
                allow: [PermissionsBitField.Flags.ViewChannel]
              },
              {
                id: interaction.guild.roles.cache.find(role => role.name === '@everyone').id,
                deny: [PermissionsBitField.Flags.ViewChannel]
              }
            ]
          })
        interaction.reply('Private channel has been created')
      } else {
        interaction.reply('This channel\'s name already exists. Please choose another name.')
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
