import { commands } from './commands.js'

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
            content: 'There was a server error. Please try again.',
            ephemeral: true
          })
        }
      }
    })
  }
}
