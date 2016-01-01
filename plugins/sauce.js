var request = require('request');
var cheerio = require('cheerio');
var http = require('http');
var fs = require('fs');
var util = require('util');

var api_key;
try {
	api_key = fs.readFileSync(__dirname + '/.sauce', { encoding: 'utf8' });
} catch (e) {
	console.error('Couldn\'t read saucenao api key: ' + e + '. Proceeding with anonymous account.');
	api_key = '';
}

var sauceTxt = 'Looks on pixiv.net for the source of the given image. Usage: !%s URL';
var help = {};
help.sauce = util.format(sauceTxt, 'sauce');
help.source = util.format(sauceTxt, 'source');

module.exports = function (client) {

	function searchSauceNao(img, cb) {
		if (!img) {
			cb('You must provide a valid URL to search the source for.');
			return;
		}
		// check before querying saucenao
		request.head({ url: img, headers: { Referer: img }}, function (err, resp) {
			if (err) {
				cb(err, null);
			} else if (resp.statusCode < 200 || resp.statusCode >= 300) {
				cb(img + ' responded with ' + resp.statusCode + ': ' + http['STATUS_CODES'][resp.statusCode], null);
			} else if (!resp.headers['content-type'].match(/^image\//)) {
				cb(img + ' doesn\'t appear to be an image.', null);
			} else {
				request('http://saucenao.com/search.php?db=999&url=' + encodeURIComponent(img) + '&api_key=' + api_key, function (err, r, data) {
					if (err) {
						cb('Error while fetching source: ' + err, null);
						return;
					}
										
					if (data.match('Search Rate Too High.') || data.match('Daily Search Limit Exceeded.')) {
						cb('Error: too many requests to saucenao.com.', null);
						return;
					}

					var $ = cheerio.load(data);
					var results = $('.resulttablecontent');
					var repeatList = [];
					var matchList =[];

					for (var i = 0; i < results.length && i < 3; ++i) {
						var result = results.eq(i);

						var similarity = parseInt($('.resultsimilarityinfo', result).text(), 10);
						if (similarity < 80) continue;

						var title = $('.resulttitle', result).text();

						var link = $('.resultcontentcolumn a', result).eq(0).attr('href');
						if (!link || repeatList.indexOf(link) !== -1) continue;

						repeatList.push(link);
						matchList.push({
							title: title,
							similarity: similarity,
							link: link
						});
					}

					cb(null, matchList);
				});
			}
		});
	}

	if (!client) {
		// we're importing from another plugin
		return { search: searchSauceNao };
	}
	// else
	return {
		commands: {
			sauce: function (from, channel, message) {
				if (channel === client.nick) {
					channel = from;
				}
								
				searchSauceNao(message, function (err, results) {
					if (err) {
						client.say(channel, err);
					} else if (results.length === 0) {
						client.say(channel, 'Sorry, ' + from + ', no image source found.');
					} else {
						for (var i = 0; i < results.length; i++) {
							var details = results[i];
							client.say(channel, details.title + ' [' + details.similarity + '%] - ' + details.link);
						}
					}
				});
			},
			source: function (from, channel, message) {
				this.sauce(from, channel, message);
			}
		},
		help: help
	};
};
