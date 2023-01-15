import 'reflect-metadata';
import 'dotenv/config';
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  REST,
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';
import { handleChatInputCommand } from './handlers/chatinputCommand';
import { AppDataSource } from './typeorm';
import { handleButtonInteraction } from './handlers/buttonInteraction';

const CLIENT_ID = '1064278423175970918';
const GUILD_ID = '934780014434594816';
const TOKEN = process.env.BOT_TOKEN!;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST({ version: '10' }).setToken(TOKEN);

const commands: RESTPostAPIApplicationCommandsJSONBody[] = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription(
      'Sendet die Nachricht fürs Ticket Systen'
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Der CHannel für die nachricht')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Bearbeite rollen fürs ticket system')
    .setDefaultMemberPermissions('0')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Fügt eine Rolle zur Configuration hinzu')
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Die rolle zum hinzufpgen')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Entfernt eine Rolle von der Configuration')
        .addRoleOption((option) =>
          option
            .setName('role')
            .setDescription('Die Rolle zum entfernen')
            .setRequired(true)
        )
    )
    .toJSON(),
];

client.on('ready', () => console.log(`${client.user?.tag} logged in`));

client.on('interactionCreate', (interaction) => {
  if (interaction.isChatInputCommand())
    client.emit('chatInputCommand', client, interaction);
  else if (interaction.isButton())
    client.emit('buttonInteraction', client, interaction);
});

client.on('chatInputCommand', handleChatInputCommand);
client.on('buttonInteraction', handleButtonInteraction);

async function main() {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
      body: commands,
    });
    await AppDataSource.initialize();
    client.login(TOKEN);
  } catch (err) {
    console.log(err);
  }
}

main();