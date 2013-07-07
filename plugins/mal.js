var request = require('request');

module.exports = function (client, channelName) {

	function searchAnime(query) {
		request.get('http://mal-api.com/anime/search?q=' + encodeURIComponent(query), function (err, r, data) {
			if (err) return;

			var items = JSON.parse(data);
			if (!items.length) return;

			client.say(channelName, items[0].title + ' (' + (items[0].episodes ? items[0].episodes : '?') + ' episodes) - http://myanimelist.net/anime/' + items[0].id);
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