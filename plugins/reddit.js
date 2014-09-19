var redwrap = require('redwrap');
var ent = require('ent');
var fs = require('fs');
var sauce = require('./sauce')().search;
var shortenURL = require('../utils').shortenURL;

module.exports = function (client) {

	var reddits = JSON.parse(fs.readFileSync(__dirname + '/.reddit', { encoding: 'utf8' }));
	var lastUpdate = {};
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
				lastUpdate[channel] = data.data.children.length ? data.data.children[0].data.created_utc : 0;

				console.log('saved last posts for ' + channel + ', ts:' + lastUpdate[channel]);
			});

			intervals[channel] = setInterval(function () {
				if (!reddits[channel]) return;

				redwrap.r(Object.keys(reddits[channel]).join('+')).new(function (err, data, res) {
					if (err || data.error) {
						console.error('Error "' + (err || data.error) + '" when refreshing post list, retrying on next interval');
						return;
					}

					if (data.data.children.length) {
						var newLastUpdate = lastUpdate[channel];
						data.data.children.forEach(function(value) {
							var post = value.data;
							if (post.created_utc <= lastUpdate[channel]) return;

							if (post.created_utc > newLastUpdate) {
								newLastUpdate = post.created_utc;
							}

							console.log('annoucing new link: ' + post.title);

							var srData = reddits[channel][post.subreddit.toLowerCase()];
							var color = srData.color ? srData.color : '01,00';

							if (post.distinguished === 'moderator') {
								post.author = '\x0303' + post.author + '\x03 [\x0303M\x03]';
								post.title = '\x0303' + post.title + '\x03';
							} else if (post.distinguished === 'admin') {
								post.author = '\x0304' + post.author + '\x03 [\x0304A\x03]';
								post.title = '\x0304' + post.title + '\x03';
							}

							var msg = (post.over_18 || srData.nsfl ? '[\x0304NSFW\x03] ' : '')
							+ '[\x03' + color + post.subreddit + '\x03]'
							+ ' [' + post.author + '] '
							+ ent.decode(post.title)
							+ (post.link_flair_text ? (' [' + ent.decode(post.link_flair_text) + ']') : '')
							+ ' [ https://reddit.com/' + post.id + ' ]'
							+ (!post.is_self ? ' [ ' + post.url + ' ]' : '');

							if (!post.is_self) {
								sauce(post.url, function (err, results) {
									var best;

									if (!err && (best = results[0])) {
										shortenURL(best.link, function(err, url) {
											if (url) {
												msg += ' [S: ' + url + ' ]';
											} // else msg stays as is

											client.say(channel, msg);
										});
									} else {
										client.say(channel, msg);
									}
								});
							} else {
								client.say(channel, msg);
							}
						});

						lastUpdate[channel] = newLastUpdate;
					}
				});
			}, 30 * 1000);
		},

		part: function (channel) {
			channel = channel.toLowerCase();
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

				to = to.toLowerCase();
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
			},
			
			reddits: function (from, to, msg) {
				this.reddit(from, to, msg);
			}
		}
	};
};
