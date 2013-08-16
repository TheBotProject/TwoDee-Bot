var request = require('request');
var cheerio = require('cheerio');

module.exports = function (client) {

	function searchSauceNao(img, cb) {
		request('http://saucenao.com/search.php?db=999&url=' + encodeURIComponent(img), function (err, r, data) {
			if (err) return;

			var $ = cheerio.load(data);
			var results = $('.resulttablecontent');
			var found = false;
			for (var i = 0; i < results.length && i < 3; ++i) {
				var result = results.eq(i);

				var similarity = parseInt($('.resultsimilarityinfo', result).text(), 10);
				if (similarity < 80) continue;

				var title = $('.resulttitle', result).text();

				var link = $('.resultcontentcolumn a', result).eq(0).attr('href');
				if (!link) continue;

				found = true;
				cb({
					title: title,
					similarity: similarity,
					link: link
				});
			}

			if (!found) {
				cb(null);
			}
		});
	}

	return {
		commands: {
			sauce: function (from, channel, message) {
				searchSauceNao(message, function (details) {
					if (details === null) {
						client.say(channel, 'Sorry, no image source found');
					} else {
						client.say(channel, details.title + ' [' + details.similarity + '%] - ' + details.link);
					}
				});
			}
		}
	};
};