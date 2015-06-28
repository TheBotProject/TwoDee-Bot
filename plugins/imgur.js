var request = require('request');
var fs = require('fs');

try {
	var clientId = fs.readFileSync(__dirname + '/.imgur');

	module.exports = function (client, channelName) {

		function postAlbumInfo(id, cb) {
			request.get({ url: 'https://api.imgur.com/3/album/' + encodeURIComponent(id), headers: { Authorization: 'Client-ID ' + clientId } }, function (err, r, data) {
				if (err) return;

				data = JSON.parse(data).data;
				if (!data) return;

				cb(data);
			});
		}

		return {
			messageHandler: function (from, channel, message) {
				var re, match;

				re = /https?:\/\/(www.)?imgur.com\/a\/(.*?)($|[^\w-])/gi;
				while (match = re.exec(message)) {
					if (match[2]) {
						postAlbumInfo(match[2], function (details) {
							client.say(channel, details.title + ' (' + details.images_count + ' images)' + (details.account_url ? ' [' + details.account_url + ']' : '') + (details.nsfw ? ' [NSFW]' : '') + ' - ' + details.link);
						});
					}
				}
			}
		};
	};
} catch (e) {
	console.error('Couldn\'t read imgur client id: ' + e);
	module.exports = function () { return {}; };
}
