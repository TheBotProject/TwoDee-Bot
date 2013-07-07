var google = require('google');
var request = require('request');
var ent = require('ent');
var Q = require('q');

module.exports = function (client, channelName) {

	function searchAnime(query) {
		google.resultsPerPage = 3;

		google('site:myanimelist.net/anime/ ' + query, function (err, next, links) {
			if (err) return;

			if (!links.length) {
				client.say(channelName, 'Sorry, no results for: ' + query);
			}

			Q.all(
				links.map(function (link) {
					var deferred = Q.defer();
					var match = link.link.match(/^https?:\/\/myanimelist\.net\/anime\/(\d+)/);
					if (match) {
						request('http://mal-api.com/anime/' + match[1], function (err, r, data) {
							if (err) {
								deferred.reject(err);
							} else {
								deferred.resolve(JSON.parse(data));
							}
						});
					} else {
						deferred.resolve(undefined);
					}
					return deferred.promise;
				})
			).then(function (datas) {
				for (var i = 0; i < datas.length; ++i) {
					var data = datas[i];
					if (!data) continue;

					client.say(channelName, ent.decode(data.title) + ' (' + (data.episodes ? data.episodes : '?') + ' episodes) - http://myanimelist.net/anime/' + data.id);
				}
			}).done();
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