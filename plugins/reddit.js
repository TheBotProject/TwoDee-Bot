var redwrap = require('redwrap');
var ent = require('ent');
var fs = require('fs');

module.exports = function (client, channelName) {

	var reddits = {};
	var lastUpdate = null;
	var interval;

	function searchNew() {
		redwrap.r(Object.keys(reddits).join('+')).new(function (err, data, res) {
			if (err || data.error) {
				console.error('Error "' + (err || data.error) + '" when refreshing post list, retrying on next interval');
				return;
			}

			if (data.data.children.length) {
				var newLastUpdate = lastUpdate;
				for (var i = 0; i < data.data.children.length; ++i) {
					var post = data.data.children[i].data;
					if (post.created_utc <= lastUpdate) break;

					if (post.created_utc > newLastUpdate) {
						newLastUpdate = post.created_utc;
					}

					console.log('annoucing new link: ' + post.title);

					var srData = reddits[post.subreddit.toLowerCase()];
					var color = srData.color ? srData.color : '01,00';
					client.say(channelName, '[\x03' + color + post.subreddit + '\x03] [' + post.author + '] ' + ent.decode(post.title) + ' [ http://redd.it/' + post.id + ' ]' + (!post.is_self ? ' [ ' + post.url + ' ]' : '') + (post.over_18 || srData.nsfl ? ' [NSFW]' : ''));
				}

				lastUpdate = newLastUpdate;
			}
		});
	}

	function init() {
		if (!lastUpdate) {
			redwrap.r(Object.keys(reddits).join('+')).new(function (err, data, res) {
				if (err || data.error) {
					console.error('Couldn\'t retrieve last post! Error: ' + (err || data.error));
					process.exit(1);
				}

				if (data.data.children.length) {
					lastUpdate = data.data.children[0].data.created_utc;
				}

				console.log('saved last posts');
			});
		}

		interval = setInterval(searchNew, 30 * 1000);
	}

	fs.readFile(__dirname + '/.reddit', { encoding: 'utf8' }, function (err, data) {
		if (err) {
			console.error('Reddit plugin config file missing...');
			return;
		}

		reddits = JSON.parse(data);
		init();
	});

	return {
		disable: function () {
			clearInterval(interval);
		}
	};
};