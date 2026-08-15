import { REST, Routes, SlashCommandBuilder } from 'discord.js'

export * from './ping'
export * from './summon'

export async function registerCommands(token: string, clientId: string) {
  const rest = new REST()

  rest.setToken(token)
  await rest.put(
    Routes.applicationCommands(clientId),
    { body: [
      new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
      new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Send a message to AIRI')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Message for AIRI')
            .setRequired(true),
        ),
      new SlashCommandBuilder().setName('summon').setDescription('Summons the bot to your voice channel'),
    ] },
  )
}
