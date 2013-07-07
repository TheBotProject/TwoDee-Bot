var google = require('google');
var request = require('request');
var ent = require('ent');

module.exports = function (client, channelName) {

	function searchAnime(query) {
		google.resultsPerPage = 3;

		google('site:myanimelist.net/anime/ ' + query, function (err, next, links) {
			if (err) return;

			if (!links.length) {
				client.say(channelName, 'Sorry, no results for: ' + query);
			}

			for (var i = 0; i < links.length; ++i) {
				var match = links[i].link.match(/^https?:\/\/myanimelist\.net\/anime\/(\d+)/);
				if (match) {
					request('http://mal-api.com/anime/' + match[1], function (err, r, data) {
						if (err) return;

						data = JSON.parse(data);
						client.say(channelName, ent.decode(data.title) + ' (' + (data.episodes ? data.episodes : '?') + ' episodes) - http://myanimelist.net/anime/' + data.id);
					});
				}
			}
		});
	}

	return {
		commands: {
			mal: function (from, message) {
				searchAnime(message);
			}
		}
	};
}