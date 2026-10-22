const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency and API status.'),
  new SlashCommandBuilder().setName('ask').setDescription('Submit an inquiry to the AI Receptionist.').addStringOption(o => o.setName('question').setDescription('Your inquiry').setRequired(true)),
  new SlashCommandBuilder().setName('info').setDescription('View system information and compliance links.'),
  new SlashCommandBuilder().setName('config').setDescription('Configure AI behavior (Admin only)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addSubcommand(s => s.setName('prompt').setDescription('Set system prompt').addStringOption(o => o.setName('text').setDescription('Prompt context').setRequired(true))),
  new SlashCommandBuilder().setName('ticket').setDescription('Manage support tickets.').addSubcommand(s => s.setName('create').setDescription('Escalate inquiry to human agent').addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false))),
  new SlashCommandBuilder().setName('stats').setDescription('Display usage statistics.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c => c.toJSON());

async function registerCommands(clientId, token) {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    console.log('? Registering slash commands...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('? Slash commands successfully registered!');
  } catch (error) {
    console.error('? Failed to register slash commands:', error);
  }
}

module.exports = { registerCommands };
