var irc = require('irc');
var fs = require('fs');

var server = require('./server');
/*
var channelName = '#TwoDeeTest';
var reddits = 'all';
*/
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', { encoding: 'utf8' }));
var state = JSON.parse(fs.readFileSync(__dirname + '/state.json', { encoding: 'utf8' }));

var saves = [];
var messageHandlers = {};
var commands = {};
var plugins = {};

function registerPlugin(instance, channel) {
	if (!channel) throw new Error('Invalid plugin registration params');

	if (instance instanceof Function) {
		instance = instance(client, channel);
	} else if (typeof instance === 'string') {
		instance = require(instance)(client, channel);
	}

	if (instance.messageHandler) {
		messageHandlers[channel].push(instance.messageHandler);
	}

	for (var cmd in instance.commands) {
		commands[channel][cmd] = instance.commands[cmd];
	}

	if (instance.save) {
		saves[saves.length] = instance.save;
	}

	plugins[channel].push(instance);
}

function gracefulExit() {
	fs.writeFileSync(__dirname + '/state.json', JSON.stringify(state));

	for (var i = 0; i < saves.length; ++i) {
		saves[i]();
	}

	process.exit(0);
}

function removePlugins(channel) {
	delete commands[channel];
	delete messageHandlers[channel];

	for (var i = 0; i < plugins[channel].length; ++i) {
		if (plugins[channel][i].disable) {
			plugins[channel][i].disable();
		}
	}
	delete plugins[channel];
}

function checkAbandonChannel(channel) {
	if (client.chans[channel]) { // we're still connected
		client.part(channel);
	}
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

client.on('part', function (channel, nick) {
	if (nick === client.nick) {
		state[channel].active = false;

		removePlugins(channel);
	} else if (state[channel].active && Object.keys(client.chans[channel].users).length === 2) {
		checkAbandonChannel(channel);
	}
});

client.on('quit', function (nick, reason, channels) {
	for (var i = 0; i < channels.length; ++i) {
		if (state[channels[i]].active && Object.keys(client.chans[channels[i]].users).length === 1) {
			checkAbandonChannel(channels[i]);
		}
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
		state[channel].plugins = [];
		for (var i = 0; i < config.plugins.length; ++i) {
			state[channel].plugins.push(config.plugins[i]);
		}
		client.join(channel);
	});
});

client.on('kick', function (channel, user) {
	if (user === client.nick && state[channel]) {
		state[channel].active = false;

		removePlugins(channel);
	}
});

client.on('join', function (channel, user) {
	if (user === client.nick && state[channel]) {
		console.log('Connected to ' + channel);

		if (!messageHandlers[channel]) messageHandlers[channel] = [];
		if (!commands[channel]) commands[channel] = {};
		if (!plugins[channel]) plugins[channel] = [];

		for (var i = 0; i < state[channel].plugins.length; ++i) {
			registerPlugin('./plugins/' + state[channel].plugins[i], channel);
		}

		client.once('names' + channel, function (nicks) {
			if (Object.keys(nicks).length === 1) {
				setTimeout(function () { // irc lib still sends stuff
					client.part(channel);
				}, 1000);
				return;
			}
		});
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

server(client);
process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit);

client.on('registered', function () {
	for (var channel in state) {
		if (!state[channel].active) continue;

		client.join(channel);
	}
});