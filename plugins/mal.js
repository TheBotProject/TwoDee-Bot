var google = require('google');
var request = require('request');
var ent = require('ent');
var Q = require('q');

module.exports = function (client) {

	function searchAnime(query, limit, cb) {
		google.resultsPerPage = limit;

		google('site:myanimelist.net/anime/ ' + query, function (err, next, links) {
			if (err) return;

			if (!links.length) {
				cb(null);
				return;
			}

			if (limit === 1) {
				var link = links[0];
				var match = link.link.match(/^https?:\/\/myanimelist\.net\/anime\/(\d+)/);
				if (match) {
					request('http://mal-api.com/anime/' + match[1], function (err, r, data) {
						if (err) return;

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

						cb(data);
					}

				}).done();
			}
		});
	}

	return {
		commands: {
			mal: function (from, channel, message) {
				searchAnime(message, 1, function (data) {
					if (data === null) {
						client.say(channel, 'Sorry, no results for: ' + message);
					} else if (typeof data === 'object') {
						client.say(channel, ent.decode(data.title) + ' (' + (data.episodes ? data.episodes : '?') + ' episodes) - http://myanimelist.net/anime/' + data.id);
					} else {
						client.say(channel, 'Couldn\'t parse anime info, here\'s the link though: http://myanimelist.net/anime/' + data);
					}
				});
			},
			mal3: function (from, channel, message) {
				searchAnime(message, 3, function (data) {
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