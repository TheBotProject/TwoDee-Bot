var request = require('request');
var cheerio = require('cheerio');

module.exports = function (client, channelName) {

	function searchSauceNao(img) {
		request('http://saucenao.com/search.php?db=999&url=' + encodeURIComponent(img), function (err, r, data) {
			if (err) return;

			var $ = cheerio.load(data);
			var results = $('.resulttablecontent');
			if (results.length) {
				for (var i = 0; i < results.length && i < 3; ++i) {
					var result = results.eq(i);

					var similarity = parseInt($('.resultsimilarityinfo', result).text(), 10);
					if (similarity < 80) continue;

					var title = $('.resulttitle', result).text();

					var link = $('.resultcontentcolumn a', result).eq(0).attr('href');
					if (!link) continue;

					client.say(channelName, title + ' [' + similarity + '%] - ' + link);
				}
			} else {
				client.say(channelName, 'Sorry, no image source found');
			}
		});
	}

	return {
		commands: {
			sauce: function (from, message) {
				searchSauceNao(message);
			}
		}
	};
}