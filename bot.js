var irc = require('irc');
var fs = require('fs');
var module = require('module');

var server = require(__dirname + '/server');
/*
var channelName = '#TwoDeeTest';
var reddits = 'all';
*/
var config = JSON.parse(fs.readFileSync(__dirname + '/config.json', { encoding: 'utf8' }));
var state = JSON.parse(fs.readFileSync(__dirname + '/state.json', { encoding: 'utf8' }));

var plugins = {};

function gracefulExit() {
	fs.writeFileSync(__dirname + '/state.json', JSON.stringify(state));

	for (var i in plugins) {
		if (plugins[i].disable) {
			plugins[i].disable();
		}
	}

	process.exit(0);
}

function checkAbandonChannel(channel) {
	if (client.chans[channel]) { // we're still connected
		client.part(channel);
	}
}

function activatePlugin(plugin) {
	plugins[plugin] = (require(__dirname + '/plugins/' + plugin))(client);
	if (plugins[plugin].enable) {
		plugins[plugin].enable();
	}

	for (var evt in plugins[plugin].customEvents) {
		client.on(evt, function (channel) {
			if (channel[0] === '#' && state[channel].plugins.indexOf(plugin) === -1) return;

			plugins[plugin].customEvents[evt].apply(plugins[plugin].customEvents, arguments);
		});
	}

	if (plugins[plugin].join) {
		for (var chan in client.chans) { // if we're already connected but the plugin got reloaded, refresh it
			plugins[plugin].join(chan);
		}
	}
}

var client = new irc.Client(config.server, config.nick, {
	userName: config.nick,
	autoRejoin: false,
	floodProtection: true,
	password: config.password,
});

client.on('quit', function (nick, reason, channels) {
	if (nick === client.nick) {
		console.error('IRC disconnected us - stopping');
		process.exit(1);
	} else {
		for (var i = 0; i < channels.length; ++i) {
			if (state[channels[i]].active && Object.keys(client.chans[channels[i]].users).length === 1) {
				checkAbandonChannel(channels[i]);
			}
		}
	}
});

client.on('part', function (channel, nick) {
	if (nick === client.nick) {
		state[channel].active = false;

		for (var i in plugins) {
			if (plugins[i].part) {
				plugins[i].part(channel);
			}
		}
	} else if (state[channel].active && Object.keys(client.chans[channel].users).length === 2) {
		checkAbandonChannel(channel);
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
	}
});

client.on('join', function (channel, user) {
	if (user === client.nick && state[channel]) {
		console.log('Connected to ' + channel);

		client.once('names' + channel, function (nicks) {
			if (Object.keys(nicks).length === 1) {
				setTimeout(function () { // irc lib still sends stuff
					client.part(channel);
				}, 1000);
				return;
			}
		});

		var activatedPlugins = config.plugins;
		if (channel[0] === '#') {
			activatedPlugins = state[channel].plugins;
		}
		for (var i = 0; i < activatedPlugins.length; ++i) {
			var plugin = plugins[activatedPlugins[i]];
			if (plugin.join) {
				plugin.join(channel);
			}
		}
	}
});

client.on('part', function (channel, user) {
	for (var i in plugins) {
		if (plugins[i].part) {
			plugins[i].part(channel);
		}
	}
});

client.on('message', function (from, channel, message) {
	var activatedPlugins = config.plugins;
	if (channel[0] === '#') {
		activatedPlugins = state[channel].plugins;
	}

	if (message[0] === '!') {
		var cmd = message.split(' ')[0].substring(1).toLowerCase();

		for (var i = 0; i < activatedPlugins.length; ++i) {
			var plugin = plugins[activatedPlugins[i]];
			if (plugin.commands && plugin.commands[cmd]) {
				plugin.commands[cmd](from, channel, message.substring(cmd.length + 2).trim());
			}
		}
	} else {
		for (var i = 0; i < activatedPlugins.length; ++i) {
			var plugin = plugins[activatedPlugins[i]];
			if (plugin.messageHandler) {
				plugin.messageHandler(from, channel, message);
			}
		}
	}
});

config.plugins.forEach(function (plugin) {
	activatePlugin(plugin);

	var watchTimeout = null;

	fs.watch(__dirname + '/plugins/' + plugin + '.js', { persistent: false }, function (evt) {
		if (watchTimeout !== null) return;

		console.log('changed ' + plugin);
		if (plugins[plugin].disable) {
			plugins[plugin].disable();
		}

		delete require.cache[module._resolveFilename(__dirname + '/plugins/' + plugin)];

		watchTimeout = setTimeout(function () {
			activatePlugin(plugin);
			watchTimeout = null;
		}, 500);
	});
});

(function () {
	var watchTimeout = null;

	fs.watch(__dirname + '/config.json', function () {
		if (watchTimeout !== null) return;

		console.log('changed');
		watchTimeout = setTimeout(function () {
			fs.readFile(__dirname + '/config.json', { encoding: 'utf8' }, function (err, data) {
				console.log('read');
				config = JSON.parse(data);
				for (var i = 0; i < config.plugins.length; ++i) {
					if (!plugins[config.plugins[i]]) {
						activatePlugin(config.plugins[i]);
						console.log('activated ' + config.plugins[i]);
					}
				}
				watchTimeout = null;
			});
		}, 500);
	});
})();

server(client);
process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit);

client.on('registered', function () {
	for (var channel in state) {
		if (!state[channel].active) continue;

		client.join(channel);
	}
});
