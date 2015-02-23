var request = require("request");

module.exports = function (client) {

	return {
		commands: {
			repost: function (from, to, msg) {
				if (!msg) return;
				
				if (to === client.nick) {
					to = from;
				}
				
				request.get('http://redditbooru.com/images/?imageUri=' + encodeURIComponent(msg), function (err, res) {
					if (err || res.statusCode >= 400) {
						client.say(to, 'Error while retrieving repost information for ' + msg);
						return;
					}
					try {
						var parsed = JSON.parse(res.body).results;
						if (parsed.length !== 0) {
							parsed = parsed.sort(function (a, b) { return a.age - b.age; });
							parsed = parsed.filter(function (v) {
								var distance = parseFloat(v.distance);
								return Math.round(distance * 1000) <= 8;
							});
							
							if (parsed.length > 1) {
								var responseMsg = parsed.length + ' reposts found: ';
								
								for (var i = 0; i < parsed.length; i++) {
									responseMsg += (parsed[i].nsfw ? '[\x0304NSFW\x03] ' : '') +
									'[' + parsed[i].sourceName + '] ' +
									'[ http://reddit.com/' + parsed[i].externalId + ' ] ' +
									(i < parsed.length - 1 ? '| ' : '');
								}
								client.say(to, responseMsg);
							} else if (parsed.length === 1) {
								var found = parsed[0];
								
								client.say(to,
									'Repost found: ' +
									(found.nsfw ? '[\x0304NSFW\x03] ' : '') +
									'[' + found.sourceName + '] ' +
									'[' + found.userName + '] ' +
									found.title + ' [ http://reddit.com/' + found.externalId + ' ]');
							} else {
								client.say(to, 'No reposts found for ' + msg);
							}
						} else {
							client.say(to, 'No reposts found for ' + msg);
						}
					} catch (e) {
						console.log(e);
						client.say(to, 'Error while parsing repost data for ' + msg);
					}
				});
			}
		}
	};
};
