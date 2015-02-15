var google = require('google');
var request = require('request');
var ent = require('ent');

module.exports = function (client) {

	function searchAnime(query, cb) {
		google.resultsPerPage = 1;

		google('site:myanimelist.net/anime/ ' + query, function (err, next, links) {
			if (err) {
				cb(new Error('Attempt to google "' + query + '" failed with error: ' + (err.errno || err.message) + '.'), null);
				return;
			}

			if (!links.length) {
				cb(new Error('Sorry, no results for "' + query + '".'), null);
				return;
			}

			var link = links[0];
			var match = link.link.match(/^https?:\/\/myanimelist\.net\/anime\/(\d+)/);
			if (match) {
				cb(null, match[1]);
				// TODO: parse html or something similar to get data
			} else if (next) {
				next();
			} else {
				cb(new Error('Sorry, no results for "' + query + '".'), null);
			}
		});
	}

	return {
		commands: {
			mal: function (from, channel, message) {
				if (channel === client.nick) {
					channel = from;
				}

				searchAnime(message, function (err, data) {
					if (err) {
						client.say(channel, err);
					} else if (typeof data === 'object') {
						client.say(channel, ent.decode(data.title) + ' (' + (data.episodes ? data.episodes : '?') + ' episodes) - http://myanimelist.net/anime/' + data.id);
					} else {
						client.say(channel, 'Couldn\'t parse anime info, here\'s the link though: http://myanimelist.net/anime/' + data);
					}
				});
			}
		},
		help: {
			mal: 'Returns the myanimelist.net page for the requested show. Usage: !mal SHOW'
		}
	};
};
