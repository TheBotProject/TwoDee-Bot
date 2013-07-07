var request = require('request');
var fs = require('fs');

try {
	var clientId = fs.readFileSync(__dirname + '/.imgur');

	module.exports = function (client, channelName) {

		function postAlbum(id) {
			request.get({ url: 'https://api.imgur.com/3/album/' + id, headers: { Authorization: 'Client-ID ' + clientId } }, function (err, r, data) {
				if (err) return;

				data = JSON.parse(data).data;
				if (!data) return;

				client.say(channelName, data.title + ' (' + data.images_count + ' images)' + (data.account_url ? ' [' + data.account_url + ']' : '') + (data.nsfw ? ' [NSFW]' : '') + ' - ' + data.link);
			});
		}

		return {
			messageHandler: function (from, message) {
				re = /https?:\/\/(www.)?imgur.com\/a\/(.*?)($|[^\w-])/gi;
				while (match = re.exec(message)) {
					if (match[2]) {
						postAlbum(match[2]);
					}
				}
			}
		};
	}
} catch (e) {
	console.error('Couldn\'t read imgur client id: ' + e);
	module.exports = function () { return {}; };
}