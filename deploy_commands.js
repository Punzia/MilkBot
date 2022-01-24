const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./config.json');

const commands = [
	new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play music <title> or <youtube url>')
		.addStringOption(option =>
			option.setName('query')
				.setDescription('Title or Youtube URL')
				.setRequired(true)),

	new SlashCommandBuilder().setName('skip').setDescription('Skip the current playing song'),
	new SlashCommandBuilder().setName('queue').setDescription('Shows the current queue!'),
	new SlashCommandBuilder().setName('stop').setDescription('Stops the current playing music'),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
