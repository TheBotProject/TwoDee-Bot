var redwrap = require('redwrap');
var ent = require('ent');
var fs = require('fs');
var sauce = require('./sauce')().search;
var shortenURL = require('../utils').shortenURL;

// TODO: reimplement colors with the irc-colors module
var IRC_COLOR_CHAR = '\u0003';
var ZERO_WIDTH_SPACE = '\u200b';

var colors = {
	green : '03',
	red   : '04',
	brown : '05',
};

// TODO: move this to an external config and defaults files
var default_subreddit_color = colors.brown;

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
							var sub_color = srData.color ? srData.color : default_subreddit_color;
							
							if (post.distinguished === 'moderator') {
								post.author += ' [' + IRC_COLOR_CHAR + colors.green + 'M' + IRC_COLOR_CHAR + ']';
								post.title = IRC_COLOR_CHAR + colors.green + ZERO_WIDTH_SPACE + post.title + IRC_COLOR_CHAR;
							} else if (post.distinguished === 'admin') {
								post.author += ' [' + IRC_COLOR_CHAR + colors.red + 'A' + IRC_COLOR_CHAR + ']';
								post.title = IRC_COLOR_CHAR + colors.red + ZERO_WIDTH_SPACE + post.title + IRC_COLOR_CHAR;
							}

							var msg = (post.over_18 || srData.nsfl ? '[' + IRC_COLOR_CHAR + colors.red + 'NSFW' + IRC_COLOR_CHAR + '] ' : '')
							+ '[' + IRC_COLOR_CHAR + sub_color + post.subreddit + IRC_COLOR_CHAR + ']'
							+ ' [' + post.author + '] '
							// TODO: strip any irc formatting characters from the title since reddit doesn't
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
		},
		help: {
			reddit: 'Returns a list of subreddits that are monitored for new posts. Usage: !reddit'
		}
	};
};
