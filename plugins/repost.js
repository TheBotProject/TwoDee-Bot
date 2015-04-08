var request = require("request");

module.exports = function (client) {

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
						var parsed = JSON.parse(res.body).results;
						if (parsed.length !== 0) {
							parsed = parsed.sort(function (a, b) { a.age - b.age; });
							parsed = parsed.filter(function (v) {
								var distance = parseFloat(v.distance);
								return Math.round(distance * 1000) <= 8;
							});
														
							if (parsed.length > 1) {
								var msg = parsed.length + ' reposts found: ';
								
								for (var i = 0; i < parsed.length; i++) {
									msg += (parsed[i].nsfw ? '[\x0304NSFW\x03] ' : '') +
									'[' + parsed[i].sourceName + '] ' +
									'[ http://reddit.com/' + parsed[i].externalId + ' ] ' +
									(i < parsed.length - 1 ? '| ' : '');
								}
								client.say(channel, msg);
							} else if (parsed.length === 1) {
								var found = parsed[0];
								
								client.say(channel,
									'Repost found: ' +
									(found.nsfw ? '[\x0304NSFW\x03] ' : '') +
									'[' + found.sourceName + '] ' +
									'[' + found.userName + '] ' +
									found.title + ' [ http://reddit.com/' + found.externalId + ' ]');
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
		},
		help: {
			repost: 'Searches redditbooru.com for possible reposts of the given image on reddit. Usage: !repost URL'
		}
	};
};
