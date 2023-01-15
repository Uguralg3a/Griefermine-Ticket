import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    CacheType,
    CategoryChannel,
    ChannelType,
    Client,
    EmbedBuilder,
    GuildChannel,
    GuildTextBasedChannel,
    OverwriteResolvable,
    TextChannel,
  } from 'discord.js';
  import { AppDataSource } from '../typeorm';
  import { Ticket } from '../typeorm/entities/Ticket';
  import { TicketConfig } from '../typeorm/entities/TicketConfig';
  
  const ticketConfigRepository = AppDataSource.getRepository(TicketConfig);
  const ticketRepository = AppDataSource.getRepository(Ticket);
  
  export async function handleButtonInteraction(
    client: Client,
    interaction: ButtonInteraction<CacheType>
  ) {
    const { guild, guildId, channelId } = interaction;
    const ticketConfig = await ticketConfigRepository.findOne({
      where: {
        guildId: guildId || '',
      },
      relations: ['roles'],
    });
    if (!ticketConfig) {
      console.log('No ticket config exists');
      return;
    }
    switch (interaction.customId) {
      case 'createTicket': {
        try {
          if (!guild) {
            console.log('Guild is Null');
            return;
          }
          // Check if user has an existing ticket.
          const ticket = await ticketRepository.findOneBy({
            createdBy: interaction.user.id,
            status: 'opened',
          });
          if (ticket) {
            await interaction.reply({
              content: 'Du hast bereits ein Offenes Ticket!',
              ephemeral: true,
            });
            return;
          }
          if (ticketConfig.messageId === interaction.message.id) {
            const newTicket = ticketRepository.create({
              createdBy: interaction.user.id,
            });
            const savedTicket = await ticketRepository.save(newTicket);
  
            const rolePermissions: OverwriteResolvable[] = ticketConfig.roles.map(
              (role) => ({
                allow: ['ViewChannel', 'SendMessages'],
                id: role.roleId,
              })
            );
  
  
            const newTicketChannel = await guild.channels.create({
              name: `ticket-${savedTicket.id.toString().padStart(6, '0')}`,
              type: ChannelType.GuildText,
              parent: '934795175564300348',
              permissionOverwrites: [
                {
                  allow: ['ViewChannel', 'SendMessages'],
                  id: interaction.user.id,
                },
                {
                  allow: ['ViewChannel', 'SendMessages'],
                  id: client.user!.id,
                },
                {
                  deny: ['ViewChannel', 'SendMessages'],
                  id: guildId!,
                },
                ...rolePermissions,
              ],
            });
            const ticketmenuembed = new EmbedBuilder()
            .setTitle("Ticket Support")
            .setDescription(`Hey <@${interaction.user.id}>, \n \n:flag_de:Willkommen im Ticket Support! Bitte schildere uns schonmal dein Anliegen, ein Team Mitglied wird sich gleich um dich kümmern.\n \n:flag_gb:Welcome to the Ticket Support! Please Tell us your Problem, a Team Member will take care of you soon.`)
            const newTicketMessage = await newTicketChannel.send({
              embeds: [ticketmenuembed],
              components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents(
                  new ButtonBuilder()
                    .setCustomId('closeTicket')
                    .setStyle(ButtonStyle.Danger)
                    .setLabel('Close Ticket')
                ),
              ],
            });
            await ticketRepository.update(
              { id: savedTicket.id },
              {
                messageId: newTicketMessage.id,
                channelId: newTicketChannel.id,
                status: 'opened',
              }
            );
            console.log('Updated Ticket Values');
          }
        } catch (err) {
          console.log(err);
        }
        break;
      }
      case 'closeTicketChannel':
        const channel = interaction.channel as GuildChannel;
        const ticket = await ticketRepository.findOneBy({ channelId });
        if (!ticket) return console.log('Ticket Not Found');
        channel.setParent(`${process.env.CLOSEDTICKETS}`)

      case 'closeTicket': {
        const user = interaction.user;
        const channel = interaction.channel as GuildTextBasedChannel;
        const ticket = await ticketRepository.findOneBy({ channelId });
        if (!ticket) return console.log('Ticket Not Found');
  
        const rolePermissions: OverwriteResolvable[] = ticketConfig.roles.map(
          (role) => ({
            allow: ['ViewChannel', 'SendMessages'],
            id: role.roleId,
          })
        );
  
  
        if (user.id === ticket.createdBy) {
          await ticketRepository.update({ id: ticket.id }, { status: 'closed' });
          await channel.edit({
            permissionOverwrites: [
              {
                deny: ['ViewChannel', 'SendMessages'],
                id: interaction.user.id,
              },
              {
                allow: ['ViewChannel', 'SendMessages'],
                id: client.user!.id,
              },
              {
                deny: ['ViewChannel', 'SendMessages'],
                id: guildId!,
              },
              ...rolePermissions,
            ],
          });
          await interaction.update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().setComponents(
                // new ButtonBuilder()
                //   .setCustomId('createTranscript')
                //   .setStyle(ButtonStyle.Secondary)
                //   .setLabel('Create Transcript'),
                new ButtonBuilder()
                  .setCustomId('closeTicketChannel')
                  .setStyle(ButtonStyle.Secondary)
                  .setLabel('Close Channel')
              ),
            ],
          });
          const embed = new EmbedBuilder()
          .setTitle("Ticket Geschlossen")
          .setDescription("\n:flag_de:Das Ticket wurde geschlossen! \n \n :flag_gb: The Ticket is closed!")
          await interaction.editReply({ embeds: [embed] });
        }
        break;
      }
    }
}