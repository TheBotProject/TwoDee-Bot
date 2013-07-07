var irc = require('irc');
var redwrap = require('redwrap');
var fs = require('fs');

/*
var channelName = '#TwoDeeTest';
var reddits = 'all';
*/
var botName = 'MoeBot';
var channelName = '#TwoDee';
var reddits = 'awwnime+pantsu+melanime+luckyyuri+kyoaniyuri+patchuu+moescape+imouto+ZettaiRyouiki';
var client;

var messageHandlers = [];
var commands = {};

var lastSeen = [];

function registerPlugin(instance) {
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
			console.log('Connected to IRC - starting requests');
			setInterval(searchNew, 30 * 1000);
		}
	});

	client.on('message' + channelName, function (from, message) {
		for (var i = 0; i < messageHandlers.length; ++i) {
			messageHandlers[i](from, message);
		}
	});

	registerPlugin(require('./ytSearch')(client, channelName));
}

function searchNew() {
	redwrap.r(reddits).new(function (err, data, res) {
		if (err || data.error) {
			console.error('Error "' + (err || data.error) + '" when refreshing post list, retrying on next interval');
			return;
		}

		for (var i = 0; i < data.data.children.length; ++i) {
			var post = data.data.children[i].data;
			if (lastSeen.indexOf(post.id) !== -1) {
				console.log('found last post - stopping');
				break; // already processed these posts
			}
			lastSeen.push(post.id);

			console.log('annoucing new link: ' + post.title);
			client.say(channelName, '[' + post.subreddit + '] [' + post.author + '] ' + post.title + ' [ http://redd.it/' + post.id + ' ]' + (!post.is_self ? ' [ ' + post.url + ' ]' : '') + (post.over_18 ? ' [NSFW]' : ''));
		}
	});

}


if (!lastSeen.length) {
	redwrap.r(reddits).new(function (err, data, res) {
		if (err || data.error) {
			console.error('Couldn\'t retrieve last post! Error: ' + (err || data.error));
			process.exit(1);
		}

		for (var i = 0; i < data.data.children.length; ++i) {
			var post = data.data.children[i].data;
			lastSeen.push(post.id);
		}

		console.log('saved last posts');
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
}, 24 * 3600);