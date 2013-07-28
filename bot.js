var irc = require('irc');
var fs = require('fs');

/*
var channelName = '#TwoDeeTest';
var reddits = 'all';
*/
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', { encoding: 'utf8' }));
var state = JSON.parse(fs.readFileSync(__dirname + '/state.json', { encoding: 'utf8' }));

var saves = [];
var messageHandlers = {};
var commands = {};

function registerPlugin(instance, channel) {
	if (!channel) throw new Error('Invalid plugin registration params');

	if (instance instanceof Function) {
		instance = instance(client, channel);
	} else if (typeof instance === 'string') {
		instance = require(instance)(client, channel);
	}

	if (!messageHandlers[channel]) messageHandlers[channel] = [];
	if (instance.messageHandler) {
		messageHandlers[channel].push(instance.messageHandler);
	}

	if (!commands[channel]) commands[channel] = {};
	for (var cmd in instance.commands) {
		commands[channel][cmd] = instance.commands[cmd];
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
	if (user === client.nick && state[channel]) {
		console.log('Connected to ' + channel);

		for (var i = 0; i < config.plugins.length; ++i) {
			registerPlugin('./plugins/' + config.plugins[i], channel);
		}
	}
});

client.on('message#', function (from, channel, message) {
	if (message[0] === '!') {
		var cmd = message.split(' ')[0].substring(1);
		if (commands[channel][cmd]) {
			commands[channel][cmd](from, message.substring(cmd.length + 2));
		}
	} else {
		for (var i = 0; i < messageHandlers[channel].length; ++i) {
			messageHandlers[channel][i](from, message);
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