var irc = require('irc');
var redwrap = require('redwrap');
var fs = require('fs');

/*
var channelName = '#TwoDeeTest';
var reddits = 'all';
*/
var botName = 'MoeBot';
var channelName = '#TwoDee';
var reddits = 'awwnime+pantsu+melanime+luckyyuri+kyoaniyuri+patchuu+moescape+imouto';
var client;

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
			setInterval(searchNew, 10 * 1000);
		}
	});
}

var lastPost = null;

function searchNew() {
	redwrap.r(reddits).new(function (err, data, res) {
		if (err || data.error) {
			console.error('Error "' + (err || data.error) + '" when refreshing post list, retrying on next interval');
			return;
		}

		if (data.data.children.length) {
			for (var i = 0; i < data.data.children.length; ++i) {
				var post = data.data.children[i].data;
				if (post.id === lastPost) {
					console.log('found last post - stopping');
					break; // already processed these posts
				}

				console.log('annoucing new link: ' + post.title);
				client.say(channelName, '[' + post.subreddit + '] [' + post.author + '] ' + post.title + ' [ http://redd.it/' + post.id + ' ]' + (!post.is_self ? ' [ ' + post.url + ' ]' : '') + (post.over_18 ? ' [NSFW]' : ''));
			}

			lastPost = data.data.children[0].data.id;
		}
	});

}


if (!lastPost) {
	redwrap.r(reddits).new(function (err, data, res) {
		if (err || data.error) {
			console.error('Couldn\'t retrieve last post! Error: ' + (err || data.error));
			process.exit(1);
		}

		lastPost = data.data.children[0].data.id;
		console.log('last post id: ' + lastPost);
	});
}

fs.readFile('.pw', { encoding: 'utf8' }, function (err, data) {
	var pw = null;
	if (!err) {
		pw = data;
	}

	initIRC(pw);
});