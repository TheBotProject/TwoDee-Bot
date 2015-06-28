var request = require("request");

function humanize(age) {
	// redditbooru gives age in seconds
	if (age < 60) {
		return 'posted just now';
	}
	
	var minutes = Math.floor(age / 60);
	if (minutes < 60) {
		return minutes + (minutes === 1 ? ' minute' : ' minutes') + ' old';
	}
	
	var hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return hours + (hours === 1 ? ' hour' : ' hours') + ' old';
	}
	
	var days = Math.floor(hours / 24);
	if (days < 30) {
		return days + (days === 1 ? ' day' : ' days') + ' old';
	}
	
	var months = Math.floor(days / 30.42);
	if (months < 12) {
		return months + (months === 1 ? ' month' : ' months') + ' old';
	}
	
	var years = Math.floor(months / 12);
	return years + (years === 1 ? ' year' : ' years') + ' old';
}

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
						if (parsed.length === 0) {
							client.say(to, 'No reposts found for ' + msg);
							
							return;
						}
						
						parsed = parsed.filter(function (v) {
							var distance = parseFloat(v.distance);
							return Math.round(distance * 1000) <= 8;
						});
						parsed = parsed.sort(function (a, b) { return a.age - b.age; });
						
						if (parsed.length > 1) {
							var responseMsg = parsed.length + ' posts found: ' +
							parsed.map(function (result) {
								return (result.nsfw ? '[\x0304NSFW\x03] ' : '') +
								'[' + result.sourceName + '] ' +
								'[ http://reddit.com/' + result.externalId + ' ] ' +
								'(' + humanize(result.age) + ')';
							}).join(' | ');
							
							client.say(to, responseMsg);
						} else if (parsed.length === 1) {
							var found = parsed[0];
							
							client.say(to,
								'Post found: ' +
								(found.nsfw ? '[\x0304NSFW\x03] ' : '') +
								'[' + found.sourceName + '] ' +
								'[' + found.userName + '] ' +
								found.title + ' [ http://reddit.com/' + found.externalId + ' ] ' +
								'(' + humanize(found.age) + ')');
						} else {
							client.say(to, 'No reposts found for ' + msg);
						}
					} catch (e) {
						console.log(e);
						client.say(to, 'Error while parsing repost data for ' + msg);
					}
				});
			}
		},
		help: {
			repost: 'Searches redditbooru.com for possible reposts of the given image on reddit. Usage: !repost URL'
		}
	};
};
