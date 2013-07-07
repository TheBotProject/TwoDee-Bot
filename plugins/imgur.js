var request = require('request');
var fs = require('fs');

try {
	var clientId = fs.readFileSync(__dirname + '/.imgur');

	module.exports = function (client, channelName) {

		function postAlbum(details) {
			client.say(channelName, details.title + ' (' + details.images_count + ' images)' + (details.account_url ? ' [' + details.account_url + ']' : '') + (details.nsfw ? ' [NSFW]' : '') + ' - ' + details.link);
		}

		function postImage(details) {
			client.say(channelName, details.title + (details.account_url ? ' [' + details.account_url + ']' : '') + (details.nsfw ? ' [NSFW]' : '') + ' - ' + details.link);
		}

		function postGallerySearch(query) {
			request.get({ url: 'https://api.imgur.com/3/gallery/search?q=' + encodeURIComponent(query), headers: { Authorization: 'Client-ID ' + clientId } }, function(err, r, data) {
				if (err) return;

				data = JSON.parse(data).data;
				if (!data) return;

				if (!data.length) {
					client.say(channelName, 'Sorry, no results for: ' + query);
					return;
				}

				if (data[0].is_album) {
					postAlbum(data[0]);
				} else {
					postImage(data[0]);
				}
			});
		}

		function postAlbumInfo(id) {
			request.get({ url: 'https://api.imgur.com/3/album/' + encodeURIComponent(id), headers: { Authorization: 'Client-ID ' + clientId } }, function (err, r, data) {
				if (err) return;

				data = JSON.parse(data).data;
				if (!data) return;

				postAlbum(data);
			});
		}

		return {
			messageHandler: function (from, message) {
				re = /https?:\/\/(www.)?imgur.com\/a\/(.*?)($|[^\w-])/gi;
				while (match = re.exec(message)) {
					if (match[2]) {
						postAlbumInfo(match[2]);
					}
				}
			},

			commands: {
				imgur: function (from, message) {
					postGallerySearch(message);
				}
			}
		};
	}
} catch (e) {
	console.error('Couldn\'t read imgur client id: ' + e);
	module.exports = function () { return {}; };
}