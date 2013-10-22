var redwrap = require('redwrap');
var ent = require('ent');
var fs = require('fs');
var sauce = require('./sauce')().search;
var waaai = require('../utils').waaai;

module.exports = function (client) {

	var reddits = JSON.parse(fs.readFileSync(__dirname + '/.reddit', { encoding: 'utf8' }));
	var lastUpdate = null;
	var intervals = {};

	return {
		join: function (channel) {
			channel = channel.toLowerCase();
			if (!reddits[channel]) return;

			redwrap.r(Object.keys(reddits[channel]).join('+')).new(function (err, data, res) {
				if (err || data.error) {
					console.error('Couldn\'t retrieve last post! Error: ' + (err || data.error));
					process.exit(1);
				}
				lastUpdate = data.data.children.length ? data.data.children[0].data.created_utc : 0;

				console.log('saved last posts, ts:' + lastUpdate);
			});

			intervals[channel] = setInterval(function () {
				if (!reddits[channel]) return;

				redwrap.r(Object.keys(reddits[channel]).join('+')).new(function (err, data, res) {
					if (err || data.error) {
						console.error('Error "' + (err || data.error) + '" when refreshing post list, retrying on next interval');
						return;
					}

					if (data.data.children.length) {
						var newLastUpdate = lastUpdate;
						data.data.children.forEach(function(value) {
							var post = value.data;
							if (post.created_utc <= lastUpdate) return;

							if (post.created_utc > newLastUpdate) {
								newLastUpdate = post.created_utc;
							}

							console.log('annoucing new link: ' + post.title);

							var srData = reddits[channel][post.subreddit.toLowerCase()];
							var color = srData.color ? srData.color : '01,00';

							var msg = '[\x03' + color + post.subreddit + '\x03] [' + post.author + '] ' + ent.decode(post.title) + ' [ http://redd.it/' + post.id + ' ]' + (post.over_18 || srData.nsfl ? ' \x0304[NSFW]\x03' : '') + (!post.is_self ? ' [ ' + post.url + ' ]' : '');

							sauce(post.url, function (err, results) {
								var best;

								if (!err && (best = results[0])) {
									waaai(best.link, function(err, url) {
										if (url) {
											msg += ' [S: ' + url + ' ]';
										} // else msg stays as is

										client.say(channel, msg);
									});
								} else {
									client.say(channel, msg);
								}
							});

						});

						lastUpdate = newLastUpdate;
					}
				});
			}, 30 * 1000);
		},

		part: function (channel) {
			clearInterval(intervals[channel]);
			delete intervals[channel];
		},

		disable: function () {
			for (var i in intervals) {
				clearInterval(intervals[i]);
				delete intervals[i];
			}
		},

		commands: {
			// outputs a list of the subreddits that get checked
			reddit: function (from, to, message) {
				if (to === client.nick) {
					to = from;
				}

				if (!message) {
					message = to;
				}

				message = message.toLowerCase();

				if (!reddits[message]) {
					client.say(to, 'I don\'t report anything posted on reddit ' + (to === message ? 'here' : 'in ' + message) + '.');
					return;
				}

				var msg = 'I report ' + (to === message ? 'here' : 'in ' + message) + ' everything posted to the following subreddits: ';
				var subs = Object.keys(reddits[message]);

				msg += subs.map(function (a) { return '/r/' + a; }).join(', ');

				msg += '.';

				client.say(to, msg);
			}
		}
	};
};
