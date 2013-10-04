var request = require('request');
var cheerio = require('cheerio');

module.exports = function (client) {

	function searchSauceNao(img, cb) {
		request('http://saucenao.com/search.php?db=999&url=' + encodeURIComponent(img), function (err, r, data) {
			if (err) return;

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

			cb(matchList);
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
				searchSauceNao(message, function (results) {
					if (results.length === 0) {
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
		}
	};
};
