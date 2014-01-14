var google = require('google');
var request = require('request');
var ent = require('ent');

module.exports = function (client) {

	function searchAnime(query, cb) {
		google.resultsPerPage = 1;

		google('site:myanimelist.net/anime/ ' + query, function (err, next, links) {
			if (err) return;

			if (!links.length) {
				cb(null);
				return;
			}

			var link = links[0];
			var match = link.link.match(/^https?:\/\/myanimelist\.net\/anime\/(\d+)/);
			if (match) {
				cb(match[1]);
				// TODO: parse html or something similar to get data
			} else if (next) {
				next();
			} else {
				cb(null);
			}
		});
	}

	return {
		commands: {
			mal: function (from, channel, message) {
				searchAnime(message, function (data) {
					if (data === null) {
						client.say(channel, 'Sorry, no results for: ' + message);
					} else if (typeof data === 'object') {
						client.say(channel, ent.decode(data.title) + ' (' + (data.episodes ? data.episodes : '?') + ' episodes) - http://myanimelist.net/anime/' + data.id);
					} else {
						client.say(channel, 'Couldn\'t parse anime info, here\'s the link though: http://myanimelist.net/anime/' + data);
					}
				});
			}
		}
	};
};
