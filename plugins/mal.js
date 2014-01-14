var google = require('google');
var request = require('request');
var url = require('url');
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
				var options = { uri: url.parse('http://mal-api.com/anime/' + match[1]) };

				options.timeout = 1000;

				request(options, function (err, r, data) {
					if (err) {
						cb(match[1]);
						return;
					}

					if (r.statusCode < 200 || r.statusCode >= 300) {
						cb(match[1]);
						return;
					}

					data = JSON.parse(data);
					if (data.error) {
						cb(match[1]);
					} else {
						cb(data);
					}
				});
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
