var request = require("request");
var fs = require('fs');

module.exports = function (client) {

	var reddits = JSON.parse(fs.readFileSync(__dirname + '/.reddit', { encoding: 'utf8' }));

	return {
		commands: {
			repost: function (from, channel, message) {
				if (!message) return;

				request.get('http://redditbooru.com/images/?imageUri=' + encodeURIComponent(message), function (err, res) {
					if (err || res.statusCode >= 400) {
						client.say(channel, 'Error while retrieving repost information.');
						return;
					}
					try {
						var parsed = JSON.parse(res.body);
						if (parsed.length !== 0) {
							var found = null;
							parsed = parsed.sort(function (a, b) { a.age - b.age; });

							for (var i = 0; i < parsed.length; ++i) {
								var distance = parseFloat(parsed[i].distance);
								if (Math.round(distance * 100) === 0) {
									found = parsed[i];
									break;
								}
							}

							if (found) {
								var srData = reddits[channel][post.subreddit.toLowerCase()];
								var color = srData.color ? srData.color : '01,00';

								client.say(channel,
									(found.nsfw ? '[\x0304NSFW\x03] ' : '') +
									'Repost found: [' + found.userName + '] ' +
									'[\x03' + color + found.sourceName + '\x03] ' +
									found.title + ' [ http://redd.it/' + found.externalId + ' ]');
							} else {
								client.say(channel, 'No reposts found.');
							}
						} else {
							client.say(channel, 'No reposts found.');
						}
					} catch (e) {
						console.log(e);
						client.say(channel, 'Error while parsing repost data.');
					}
				});
			}
		}
	};
};
