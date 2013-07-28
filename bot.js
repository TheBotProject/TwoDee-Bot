var irc = require('irc');
var fs = require('fs');

/*
var channelName = '#TwoDeeTest';
var reddits = 'all';
*/
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', { encoding: 'utf8' }));
var state = JSON.parse(fs.readFileSync(__dirname + '/state.json', { encoding: 'utf8' }));

var saves = [];
var messageHandlers = [];
var commands = {};

function registerPlugin(instance) {
	if (instance instanceof Function) {
		instance = instance(client, config.channel);
	} else if (typeof instance === 'string') {
		instance = require(instance)(client, config.channel);
	}

	if (instance.messageHandler) {
		messageHandlers.push(instance.messageHandler);
	}

	for (var cmd in instance.commands) {
		commands[cmd] = instance.commands[cmd];
	}

	if (instance.save) {
		saves[saves.length] = instance.save;
	}
}

function gracefulExit() {
	fs.writeFileSync(__dirname + '/state.json', JSON.stringify(state));

	for (var i = 0; i < saves.length; ++i) {
		saves[i]();
	}

	process.exit(0);
}

var client = new irc.Client(config.server, config.nick, {
	userName: config.nick,
	autoRejoin: false,
	floodProtection: true,
	password: config.password,
});

client.on('quit', function (nick) {
	if (nick === client.nick) {
		console.error('IRC disconnected us - stopping');
		process.exit(1);
	}
});

client.on('error', function (e) {
	console.error('IRC error');
	console.log(e);
});

client.on('invite', function (channel, inviteUser) {
	client.whois(inviteUser, function (info) {
		if (info.channels.indexOf('@' + channel) === -1) return;

		if (!state[channel]) {
			state[channel] = {};
		}

		state[channel].active = true;
		client.join(channel);
	});
});

client.on('kick', function (channel) {
	state[channel].active = false;
});


client.on('join', function (channel, user) {
	/*if (channel === config.channel && user === client.nick) {
		console.log('Connected to IRC');

		for (var i = 0; i < config.plugins.length; ++i) {
			registerPlugin('./plugins/' + config.plugins[i]);
		}

	}*/
});

client.on('message#', function (nick, to, text, message) {
	console.log(nick);
	console.log(to);
	console.log(text);
});

client.on('message' + config.channel, function (from, message) {
	if (message[0] === '!') {
		var cmd = message.split(' ')[0].substring(1);
		if (commands[cmd]) {
			commands[cmd](from, message.substring(cmd.length + 2));
		}
	} else {
		for (var i = 0; i < messageHandlers.length; ++i) {
			messageHandlers[i](from, message);
		}
	}
});

process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit);

client.on('registered', function () {
	for (var channel in state) {
		if (!state[channel].active) continue;

		client.join(channel);
	}
});