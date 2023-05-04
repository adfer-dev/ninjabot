import { SlashCommandBuilder, ChannelType, PermissionsBitField } from 'discord.js'

const TAGGED_USER_ID_PATTERN = /<@(\d{18,19})>/g

const commands = [
  // private room command.
  {
    data: new SlashCommandBuilder()
      .setName('privatechannel')
      .setDescription('Creates a private channel that only this user and the tagged users can see.')
      .addStringOption(nameOption =>
        nameOption.setName('name')
          .setDescription('Name of the room')
          .setRequired(true)
      )
      .addIntegerOption(typeOption =>
        typeOption.setName('type')
          .setDescription('Type of the channel')
          .setRequired(true)
          .addChoices(
            { name: 'voice', value: ChannelType.GuildVoice },
            { name: 'text', value: ChannelType.GuildText }
          )
      )
      .addStringOption(usersOption =>
        usersOption.setName('users')
          .setDescription('Additional users to be added to the private room')
          .setRequired(false)
      ),
    async execute (interaction) {
      const newChannel = await interaction.guild.channels.create({
        name: 'private_' + interaction.options.getString('name'),
        type: interaction.options.getInteger('type')
      })

      // grant access to invoker user
      newChannel.permissionOverwrites.create(interaction.member.id, {
        ViewChannel: true
      })
      // also grant access to bot user
      newChannel.permissionOverwrites.create(interaction.client.user.id, {
        ViewChannel: true,
        CreateInstantInvite: true
      })
      // deny access to the rest of users
      newChannel.permissionOverwrites.create(interaction.guild.roles.cache.find(deniedRoles => deniedRoles.name === '@everyone'), {
        ViewChannel: false,
        CreateInstantInvite: false
      })

      // check if there are additional users and grant them permissions if they are valid
      if (interaction.options.getString('users')) {
        const validTaggedUsers = interaction.options.getString('users').match(TAGGED_USER_ID_PATTERN) // get users´s ids passed by the user that match the format(<@idNumber>)º
        if (validTaggedUsers) {
          const userIds = validTaggedUsers.map(inputUserId => inputUserId.replaceAll(/[^0-9]/g, '')) // get just the id numbers
          for (const id of userIds) {
            newChannel.permissionOverwrites.create(id, {
              ViewChannel: true
            })
          }
          const channelUserCount = validTaggedUsers.length + 1
          await ephemeralInteractionReply(interaction, 'Private channel **' + newChannel.name + '** has been created for ' + channelUserCount + ' users.')
        }
      } else {
        await ephemeralInteractionReply(interaction, 'Private channel **' + newChannel.name + '** has been created for 1 user.')
      }

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
    }
  },

  // get invite codes command
  {
    data: new SlashCommandBuilder()
      .setName('getinvites')
      .setDescription('Gets the codes of the private channels that this user is in.'),
    async execute (interaction) {
      const channels = interaction.guild.channels.cache.filter(channel => (channel.permissionsFor(interaction.member).has(PermissionsBitField.Flags.ViewChannel) && channel.name.startsWith('private_')))
      if (channels.size > 0) {
        let messageContent = '__**Codes of private channels**__'

        for (const channel of channels.values()) {
          const channelInvites = await channel.fetchInvites()
          // check if there are any invites. If none was found, create a new one.
          if (channelInvites.size > 0) {
            for (const invite of channelInvites.values()) {
              messageContent += '\n **' + channel.name + '**: ' + invite.code
            }
          } else {
            const newInvite = await channel.createInvite({
              temporary: false,
              maxAge: 28800,
              unique: true,
              reason: 'No invites in private channel - Creating new invite.'
            })
            messageContent += '\n **' + channel.name + '**: ' + newInvite.code
          }
        }

        await interaction.member.send(messageContent)
        await ephemeralInteractionReply(interaction, 'Invite codes were sent. Check your DMs. ')
      } else {
        await ephemeralInteractionReply(interaction, 'You are not in any private channel. Please, create or join one first. ')
      }
    }
  },

  // reset invite codes command
  {
    data: new SlashCommandBuilder()
      .setName('resetinvites')
      .setDescription('Deletes all the invites of each channel this user is member of.'),
    async execute (interaction) {
      const channels = interaction.guild.channels.cache.filter(channel => (isChannelVisibleByUser(channel, interaction.member) && channel.name.startsWith('private_')))
      if (channels.size > 0) {
        for (const channel of channels.values()) {
          const channelInvites = await channel.fetchInvites()
          if (channelInvites.size > 0) {
            for (const invite of channelInvites.values()) {
              invite.delete('User reset invites -  delete all invites')
            }
            await ephemeralInteractionReply(interaction, 'Invite codes were reset. Now you can use **getinvites** to get the new invite codes.')
          } else {
            await ephemeralInteractionReply(interaction, 'No invites were found. Please, first use **getinvites** to get your invite codes.')
          }
        }
      } else {
        await ephemeralInteractionReply(interaction, 'You are not in any private channel. Please, create or join one first.')
      }
    }
  },

  {
    data: new SlashCommandBuilder()
      .setName('joinchannel')
      .setDescription('Adds this user to the channel whose invite is linked to the input code.')
      .addStringOption(codeOption =>
        codeOption.setName('code')
          .setDescription('the invite code of the room to be joined')
          .setRequired(true)
      ),
    async execute (interaction) {
      const invite = interaction.guild.invites.cache.find(invite => invite.code === interaction.options.getString('code'))
      if (invite) {
        if (!isChannelVisibleByUser(invite.channel, interaction.member)) { // TODO: CAMBIAR A FUNCIÓN checkUserInChannel
          invite.channel.permissionOverwrites.create(interaction.member.id, { ViewChannel: true })
          await ephemeralInteractionReply(interaction, 'Joining ' + invite.channel.name + '...')
        } else {
          await ephemeralInteractionReply(interaction, 'You are already a member of this channel!')
        }
      } else { await ephemeralInteractionReply(interaction, 'Code incorrect. This channel does not exist or has been deleted.') }
    }
  },

  {
    data: new SlashCommandBuilder()
      .setName('help')
      .setDescription('Shows how to use this bot to new users.'),
    async execute (interaction) {
      await ephemeralInteractionReply(interaction, 'Hi there, ' + interaction.member.displayName +
      '! I will be so glad to help you creating a private room.' +
      '\nFirst step is to use the **/privateroom** command. This command requires 2 fields to be filled so it works fine. You have to write the **name** of the room and its **type** (whether it is a voice or text channel). You might want to add more friends to the channel. You can do so filling the **users** option so they can see the channel.' +
      '\nIf you haven\'t done so, don\'t worry, I got you covered. You can use the **/getinvites** command, which will provide you a list of codes for each private room you created. Then any friend can join using the **/joinchannel** command and pasting in the code.' +
      '\nSo that\'s it! You have created your custom private room. Keep in mind that private rooms are **temporal**. This means that if they are empty during 2 hours they will be deleted. Have fun!')
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
          await ephemeralInteractionReply(interaction, 'Server error: There was an error while executing this command!')
        }
      }
    })
  }
}

/**
 * Function that replies an user interaction with an ephemeral message.
 * @param {*} interaction the user interaction to be replied
 * @param {*} content the reply message
 */
async function ephemeralInteractionReply (interaction, content) {
  await interaction.reply({
    content,
    ephemeral: true
  })
}

/**
 * Function that checks if a user has viewing permissions on a channel.
 * @param {*} channel the channel to check user´s permissions
 * @param {*} user the user whose permissions are going to be checked on the channel
 * @returns a boolean representing wether the user has viewing permissions or not
 */
function isChannelVisibleByUser (channel, user) {
  return channel.permissionsFor(user).has(PermissionsBitField.Flags.ViewChannel)
}
