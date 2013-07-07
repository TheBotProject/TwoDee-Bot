var youtube = require('youtube-feeds');

module.exports = function (client, channelName) {
	function postYT(id) {
		youtube.video(id, function (err, details) {
			if (err) return;

			client.say(channelName, details.title + ' [' + Math.floor(details.duration / 60) + ':' + ((details.duration % 60 < 10 ? '0' : '') + (details.duration % 60)) + '] - https://youtu.be/' + details.id);
		});
	}

	return {
		messageHandler: function (from, message) {
			var id = null;

			var re = /https?:\/\/(www.)?youtube.com\/watch\?((.+)&)?v=(.*?)($|[^\w-])/g;
			var match;

			while (match = re.exec(message)) {
				if (match[4]) {
					postYT(match[4]);
				}
			}

			re = /https?:\/\/(www.)?youtu.be\/(.*?)($|[^\w-])/g;
			while (match = re.exec(message)) {
				if (match[2]) {
					postYT(match[2]);
				}
			}
		}
	};
}