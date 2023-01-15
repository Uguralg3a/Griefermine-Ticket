import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    CacheType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildTextBasedChannel,
  } from 'discord.js';
  import { AppDataSource } from '../typeorm';
  import { TicketConfig } from '../typeorm/entities/TicketConfig';
  import { handleRolesCommand } from './rolesCommandHandler';
  
  const ticketConfigRepository = AppDataSource.getRepository(TicketConfig);
  
  export async function handleChatInputCommand(
    client: Client,
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    console.log('HandleChatInputCommand');
    console.log(interaction.commandName);
    switch (interaction.commandName) {
      case 'setup': {
        const guildId = interaction.guildId || '';
        const channel = interaction.options.getChannel(
          'channel'
        ) as GuildTextBasedChannel;
        const ticketConfig = await ticketConfigRepository.findOneBy({ guildId });
        const embed = new EmbedBuilder()
        .setTitle("**__Griefermine TicketSupport__**")
        .setDescription(':flag_de: Wenn Fragen oder Probleme aufkommen, öffne bitte ein Ticket, indem du auf "Open" unter dieser Nachricht klickst. \n \n[Supportausnutzung wird bestraft]\n \n \n :flag_gb: If questions or issues arise, please open a ticket by clicking "Open" below this message. \n \n [Abusing this will be punished]')
        const messageOptions = {
          embeds: [embed],
          components: [
            new ActionRowBuilder<ButtonBuilder>().setComponents(
              new ButtonBuilder()
                .setCustomId('createTicket')
                .setLabel('Open')
                .setStyle(ButtonStyle.Primary)
            ),
          ],
        };
        try {
          if (!ticketConfig) {
            const msg = await channel.send(messageOptions);
            const newTicketConfig = ticketConfigRepository.create({
              guildId,
              messageId: msg.id,
              channelId: channel.id,
            });
            await ticketConfigRepository.save(newTicketConfig);
            console.log('Saved new Configuration to Database');
            await interaction.reply({
              content: `Ticket Bot Initialisiert!`,
              ephemeral: true,
            });
          } else {
            console.log('Ticket Config exists... Updating Values');
            const msg = await channel.send(messageOptions);
            ticketConfig.channelId = channel.id;
            ticketConfig.messageId = msg.id;
            await ticketConfigRepository.save(ticketConfig);
            await interaction.reply({
              content: `Neue Nachricht wurde in ${channel} gesendet. Datenbank wird geupdated.`,
              ephemeral: true,
            });
          }
        } catch (err) {
          console.log(err);
          await interaction.reply({
            content: `Something went wrong...`,
            ephemeral: true,
          });
        }
      }
      case 'roles': {
        return handleRolesCommand(client, interaction);
      }
    }
  }