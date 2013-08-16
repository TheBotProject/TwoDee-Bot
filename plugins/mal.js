var google = require('google');
var request = require('request');
var ent = require('ent');
var Q = require('q');

module.exports = function (client, channelName) {

	function searchAnime(query, limit) {
		google.resultsPerPage = limit;

		google('site:myanimelist.net/anime/ ' + query, function (err, next, links) {
			if (err) return;

			if (!links.length) {
				client.say(channelName, 'Sorry, no results for: ' + query);
				return;
			}

			if (limit === 1) {
				var link = links[0];
				var match = link.link.match(/^https?:\/\/myanimelist\.net\/anime\/(\d+)/);
				if (match) {
					request('http://mal-api.com/anime/' + match[1], function (err, r, data) {
						if (err) return;

						data = JSON.parse(data);
						if (data.error) {
							client.say(channelName, 'Couldn\'t parse anime info, here\'s the link though: http://myanimelist.net/anime/' + data.id);
						} else {
							client.say(channelName, ent.decode(data.title) + ' (' + (data.episodes ? data.episodes : '?') + ' episodes) - http://myanimelist.net/anime/' + data.id);
						}
					});
				} else {
					next();
				}
			} else {
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
			}
		});
	}

	return {
		commands: {
			mal: function (from, message) {
				searchAnime(message, 1);
			},
			mal3: function (from, message) {
				searchAnime(message, 3);
			}
		}
	};
};