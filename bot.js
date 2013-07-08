var irc = require('irc');
var fs = require('fs');

/*
var channelName = '#TwoDeeTest';
var reddits = 'all';
*/
var botName = 'MoeBot';
var channelName = '#TwoDee';
var client;

var messageHandlers = [];
var commands = {};

function registerPlugin(instance) {
	if (instance instanceof Function) {
		instance = instance(client, channelName);
	} else if (typeof instance === 'string') {
		instance = require(instance)(client, channelName);
	}

	if (instance.messageHandler) {
		messageHandlers.push(instance.messageHandler);
	}

	for (var cmd in instance.commands) {
		commands[cmd] = instance.commands[cmd];
	}
}

function initIRC(pw) {
	client = new irc.Client('irc.snoonet.org', botName, {
		userName: botName,
		channels: [channelName],
		floodProtection: true,
		password: pw
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

	client.on('join', function (channel, user) {
		if (channel === channelName && user === client.nick) {
			console.log('Connected to IRC');

			registerPlugin('./plugins/reddit');
			registerPlugin('./plugins/youtube');
			registerPlugin('./plugins/imgur');
			registerPlugin('./plugins/mal');
			registerPlugin('./plugins/pixiv');
			registerPlugin('./plugins/sauce');
			registerPlugin('./plugins/whattowatch');
			registerPlugin('./plugins/pet');
		}
	});

	client.on('message' + channelName, function (from, message) {
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
}

fs.readFile('.pw', { encoding: 'utf8' }, function (err, data) {
	var pw = null;
	if (!err) {
		pw = data;
	}

	initIRC(pw);
});

setInterval(function () {
	console.log('Cleaning memory');
	lastSeen.splice(0, lastSeen.length - 50);
}, 24 * 3600 * 1000);