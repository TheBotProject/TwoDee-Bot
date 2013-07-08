var redwrap = require('redwrap');
var ent = require('ent');
var fs = require('fs');

module.exports = function (client, channelName) {

	var reddits = [];
	var lastSeen = [];

	function searchNew() {
		redwrap.r(reddits.join('+')).new(function (err, data, res) {
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
				client.say(channelName, '[' + post.subreddit + '] [' + post.author + '] ' + ent.decode(post.title) + ' [ http://redd.it/' + post.id + ' ]' + (!post.is_self ? ' [ ' + post.url + ' ]' : '') + (post.over_18 ? ' [NSFW]' : ''));
			}
		});
	}

	function init() {
		if (!lastSeen.length) {
			redwrap.r(reddits.join('+')).new(function (err, data, res) {
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

		setInterval(searchNew, 30 * 1000);
	}

	fs.readFile(__dirname + '/.reddit', { encoding: 'utf8' }, function (err, data) {
		if (err) {
			console.error('Reddit plugin config file missing...');
			return;
		}

		reddits = JSON.parse(data);
		init();
	});


	setInterval(function () {
		console.log('Cleaning memory');
		lastSeen.splice(0, lastSeen.length - 50);
	}, 24 * 3600 * 1000);

	return {};
}