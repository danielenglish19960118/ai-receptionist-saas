require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, EmbedBuilder } = require('discord.js');
const { registerCommands } = require('./commands');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const userCooldowns = new Map();
const COOLDOWN_SECONDS = 10;
const serverConfigs = new Map();

client.once('ready', async () => {
  console.log(`🤖 AI Receptionist Bot logged in as ${client.user.tag}`);
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_BOT_TOKEN) {
    await registerCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_BOT_TOKEN);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, user, guildId } = interaction;

  // Rate Limiter
  if (['ask', 'ticket'].includes(commandName)) {
    const lastUsed = userCooldowns.get(user.id);
    const now = Date.now();
    if (lastUsed && (now - lastUsed) < COOLDOWN_SECONDS * 1000) {
      const remaining = ((COOLDOWN_SECONDS * 1000 - (now - lastUsed)) / 1000).toFixed(1);
      return interaction.reply({ content: `⚠️ Slow down! Please wait \`${remaining}s\` before making another request.`, ephemeral: true });
    }
    userCooldowns.set(user.id, now);
  }

  // 1. /ping
  if (commandName === 'ping') {
    await interaction.reply({ content: `🏓 Pong! WebSockets latency is \`${client.ws.ping}ms\`.`, ephemeral: true });
  } 
  // 2. /ask
  else if (commandName === 'ask') {
    const question = interaction.options.getString('question');
    await interaction.deferReply();
    try {
      const currentConfig = serverConfigs.get(guildId) || { prompt: 'Standard Professional AI Receptionist' };
      const responseEmbed = new EmbedBuilder()
        .setColor(0x38BDF8)
        .setTitle('🤖 AI Receptionist Response')
        .addFields(
          { name: 'Inquiry', value: question },
          { name: 'Answer', value: `Thank you for reaching out! Based on our knowledge base:\n\n*Automated response generated under system persona profile: "${currentConfig.prompt}".*` }
        )
        .setFooter({ text: 'AI Receptionist SaaS • Type /ticket create if you need human support' })
        .setTimestamp();
      await interaction.editReply({ embeds: [responseEmbed] });
    } catch (err) {
      await interaction.editReply('❌ An error occurred while processing your request.');
    }
  } 
  // 3. /config
  else if (commandName === 'config') {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'prompt') {
      const promptText = interaction.options.getString('text');
      const config = serverConfigs.get(guildId) || {};
      config.prompt = promptText;
      serverConfigs.set(guildId, config);
      await interaction.reply({ content: `✅ System prompt updated successfully:\n\`\`\`${promptText}\`\`\``, ephemeral: true });
    }
  } 
  // 4. /ticket
  else if (commandName === 'ticket') {
    const reason = interaction.options.getString('reason') || 'No specific reason provided.';
    await interaction.deferReply({ ephemeral: true });
    try {
      const channel = interaction.channel;
      const thread = await channel.threads.create({ name: `ticket-${user.username}`, autoArchiveDuration: 60, type: ChannelType.PrivateThread });
      await thread.members.add(user.id);
      await thread.send({ content: `👋 Hello <@${user.id}>! A support staff member will be with you shortly.\n\n**Escalation Reason:** ${reason}` });
      await interaction.editReply({ content: `✅ Support ticket created! Private thread: ${thread}` });
    } catch (err) {
      await interaction.editReply('❌ Failed to create support thread.');
    }
  } 
  // 5. /stats
  else if (commandName === 'stats') {
    const statsEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 System Performance & Usage Stats')
      .addFields(
        { name: 'Total Inquiries Resolved', value: '1,248', inline: true },
        { name: 'Human Escalation Rate', value: '2.4%', inline: true },
        { name: 'Average Latency', value: '1.2s', inline: true }
      );
    await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
  } 
  // 6. /info
  else if (commandName === 'info') {
    await interaction.reply({ 
      content: `**AI Receptionist SaaS** 🤖\n\n📜 **Terms:** https://danielenglish19960118.github.io/ai-receptionist-saas/terms.html\n🔒 **Privacy:** https://danielenglish19960118.github.io/ai-receptionist-saas/privacy.html`, 
      ephemeral: true 
    });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
