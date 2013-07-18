var irc = require('irc');
var fs = require('fs');

/*
var channelName = '#TwoDeeTest';
var reddits = 'all';
*/
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json'));

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
}

var client = new irc.Client(config.server, config.nick, {
	userName: config.nick,
	channels: [config.channel],
	floodProtection: true,
	password: config.password
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

client.once('join', function (channel, user) {
	if (channel === config.channel && user === client.nick) {
		console.log('Connected to IRC');

		for (var i = 0; i < config.plugins.length; ++i) {
			registerPlugin('./plugins/' + config.plugins[i]);
		}
	}
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