var redwrap = require('redwrap');
var ent = require('ent');
var fs = require('fs');

module.exports = function (client) {

	var reddits = JSON.parse(fs.readFileSync(__dirname + '/.reddit', { encoding: 'utf8' }));
	var lastUpdate = null;
	var interval;

	return {
		join: function (channel) {
			if (!reddits[channel]) return;

			redwrap.r(Object.keys(reddits[channel]).join('+')).new(function (err, data, res) {
				if (err || data.error) {
					console.error('Couldn\'t retrieve last post! Error: ' + (err || data.error));
					process.exit(1);
				}
				lastUpdate = data.data.children.length ? data.data.children[0].data.created_utc : 0;

				console.log('saved last posts, ts:' + lastUpdate);
			});
		},

		interval: function (channel) {
			if (!reddits[channel]) return;

			redwrap.r(Object.keys(reddits[channel]).join('+')).new(function (err, data, res) {
				if (err || data.error) {
					console.error('Error "' + (err || data.error) + '" when refreshing post list, retrying on next interval');
					return;
				}

				if (data.data.children.length) {
					var newLastUpdate = lastUpdate;
					for (var i = 0; i < data.data.children.length; ++i) {
						var post = data.data.children[i].data;
						if (post.created_utc <= lastUpdate) continue;

						if (post.created_utc > newLastUpdate) {
							newLastUpdate = post.created_utc;
						}

						console.log('annoucing new link: ' + post.title);

						var srData = reddits[channel][post.subreddit.toLowerCase()];
						var color = srData.color ? srData.color : '01,00';
						client.say(channel, '[\x03' + color + post.subreddit + '\x03] [' + post.author + '] ' + ent.decode(post.title) + ' [ http://redd.it/' + post.id + ' ]' + (!post.is_self ? ' [ ' + post.url + ' ]' : '') + (post.over_18 || srData.nsfl ? ' \x0304[NSFW]\x03' : ''));
					}

					lastUpdate = newLastUpdate;
				}
			});
		},
		intervalTimeout: 30 * 1000
	};
};