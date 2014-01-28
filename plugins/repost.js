var request = require("request");

module.exports = function (client) {

	return {
		commands: {
			repost: function (from, channel, message) {
				if (!message) return;

				request.get('http://redditbooru.com/images/?imageUri=' + encodeURIComponent(message), function (err, res) {
					if (err || res.statusCode >= 400) {
						client.say('Error while retrieving repost information.');
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
								client.say(channel, 'Repost found: [' + found.userName + '] ' + found.title + ' [ http://redd.it/' + found.externalId + ' ]');
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
