var filesize = require('humanize').filesize;
var nyaa = require("nyaatorrents");
var xml2js = require('xml2js');
var request = require('request');
var utils = require('../utils');

module.exports = function (client) {

	var defaultBaseURL = 'http://www.nyaa.se/';
	var sukebeiBaseURL = 'http://sukebei.nyaa.se/';

	function requestAndParse(url, cb) {
		request.get({ url: url }, function (err, res, body) {
			if (err) {
				cb(err);
				return;
			}

			var parser = new xml2js.Parser();
			parser.parseString(body.toString('utf8'), cb);
		});
	}

	function editEntryFormat(entry) {
		var re = /(\d+) seeder\(s\), (\d+) leecher\(s\), (\d+) download\(s\) - (\d+\.?\d* \S+)/
		var match = re.exec(entry.description);
		if (!match) return null;

		entry.seeders = match[1];
		entry.leechers = match[2];
		entry.downloads = match[3];
		entry.size = match[4];

		entry.age = Date.now() - new Date(entry.pubDate).getTime();

		return entry;
	}

	function formatData(data, searchURL) {
		return utils.format('{0} - {1} | S: {2} | L: {3} | {4} | {5}', data.title, data.size, data.seeders, data.leechers, data.guid, data.link);
	}

	function getBest(entries) {
		var seedersWeight = 1;
		var leechersWeight = .5;
		var ageWeight = -1 / 1000 / 60 / 60;
		// score is # of seeders + half of # leechers - age in hours
		var bestScore = entries[0].seeders * seedersWeight + entries[0].leechers * leechersWeight + entries[0].age * ageWeight;
		var bestEntry = entries[0];

		for (var i = 1; i < entries.length; i++) {
			var score = entries[i].seeders * seedersWeight + entries[i].age * ageWeight;
			if (score > bestScore) {
				bestScore = score;
				bestEntry = entries[i];
			}
		}

		return bestEntry;
	}

	return {
		commands: {
			nyaa: function (from, channel, msg) {
				if (channel === client.nick) { // if PM
					channel = from;
				}

				requestAndParse(defaultBaseURL + '?page=rss&cats=1_37&term=' + encodeURIComponent(msg), function (err, data) {
					if (err || !data.rss) {
						client.say(channel, 'No response. Please try again.');
						return console.error('Error getting data: ' + err);
					}

					var entries = data.rss.channel[0].item;
					if (!entries || entries.length === 0) {
						client.say(channel, 'No results for \'' + msg + '\'. Try !nyaan or !nyaall?');
						return;
					}

					entries.map(editEntryFormat);

					// if the regex in editEntryFormat doesn't match
					// (although it always should)
					// we'll get null entries
					for (var i = 0; i < entries.length; i++) {
						if (entries[i] === null) {
							entries.splice(i, 1);
							i--;
						}
					}

					if (entries.length === 0) {
						client.say(channel, 'Something went wrong... Uhh... try again?');
						return;
					}

					var dataString = formatData(getBest(entries));

					client.say(channel, dataString);

					client.notice(from, defaultBaseURL + '?page=search&cats=1_37&term=' + encodeURIComponent(msg));
				});
			},

			nyaall: function (from, channel, msg) {
				if (channel === client.nick) { // if PM
					channel = from;
				}

				requestAndParse(defaultBaseURL + '?page=rss&term=' + encodeURIComponent(msg), function (err, data) {
					if (err) {
						client.say(channel, 'No response. Please try again.');
						return console.error('Error getting data: ' + err);
					}

					var entries = data.rss.channel[0].item;
					if (!entries || entries.length === 0) {
						client.say(channel, 'No results for \'' + msg + '\'. Try !nyaan?');
						return;
					}

					entries.map(editEntryFormat);

					// if the regex in editEntryFormat doesn't match
					// (although it always should)
					// we'll get null entries
					for (var i = 0; i < entries.length; i++) {
						if (entries[i] === null) {
							entries.splice(i, 1);
							i--;
						}
					}

					if (entries.length === 0) {
						client.say(channel, 'Something went wrong... Uhh... try again?');
						return;
					}

					var dataString = formatData(getBest(entries));

					client.say(channel, dataString);

					client.notice(from, defaultBaseURL + '?page=search&term=' + encodeURIComponent(msg));
				});
			},

			nyaan: function (from, channel, msg) {
				if (channel === client.nick) { // if PM
					channel = from;
				}

				requestAndParse(sukebeiBaseURL + '?page=rss&term=' + encodeURIComponent(msg), function (err, data) {
					if (err) {
						client.say(channel, 'No response. Please try again.');
						return console.error('Error getting data: ' + err);
					}

					var entries = data.rss.channel[0].item;
					if (!entries || entries.length === 0) {
						client.say(channel, 'No results for \'' + msg + '\'. Try !nyaa or !nyaall?');
						return;
					}

					entries.map(editEntryFormat);

					// if the regex in editEntryFormat doesn't match
					// (although it always should)
					// we'll get null entries
					for (var i = 0; i < entries.length; i++) {
						if (entries[i] === null) {
							entries.splice(i, 1);
							i--;
						}
					}

					if (entries.length === 0) {
						client.say(channel, 'Something went wrong... Uhh... try again?');
						return;
					}

					var dataString = '\x0304[NSFW]\x03 ' + formatData(getBest(entries));

					client.say(channel, dataString);

					client.notice(from, sukebeiBaseURL + '?page=search&term=' + encodeURIComponent(msg));
				});
			}
		},

		messageHandler: function (from, channel, message) {
			if (channel[0] !== '#') return; // we don't care about PMs

			var re = /http:\/\/(sukebei|www)\.nyaa\.(eu|se)\/\?page=(view|download)&tid=(\d+)/gi;
			var match;
			var getData = function(nyu, id, cb) {
				new nyaa(nyu).get(id, function (err, data) {
					if (err) return;

					cb(data);
				});
			};

			while (match = re.exec(message)) {
				getData(match[1] === 'sukebei' ? sukebeiBaseURL : defaultBaseURL, match[4], function (nsfw, data) {
					var dataString = (nsfw ? '\x0304[NSFW]\x03 ' : '') + formatData({
						title: data.name,
						size: filesize(data.size),
						seeders: isNaN(data.seeders) ? '?' : data.seeders,
						leechers: isNaN(data.leechers) ? '?' : data.leechers,
						guid: (nsfw ? sukebeiBaseURL : defaultBaseURL) + '?page=view&tid=' + data.id,
						link: (nsfw ? sukebeiBaseURL : defaultBaseURL) + '?page=download&tid=' + data.id,
					});

					client.say(channel, dataString);
				}.bind(undefined, match[1] === 'sukebei'));
			}
		}
	};
};
