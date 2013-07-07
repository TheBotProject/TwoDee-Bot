var youtube = require('youtube-feeds');

module.exports = function (client, channelName) {
	function postDetails(details) {
		client.say(channelName, details.title + ' [' + Math.floor(details.duration / 60) + ':' + ((details.duration % 60 < 10 ? '0' : '') + (details.duration % 60)) + '] - https://youtu.be/' + details.id);
	}

	function postVideo(id) {
		youtube.video(id, function (err, details) {
			if (err) return;

			postDetails(details);
		});
	}

	function searchYoutube(term) {
		youtube.feeds.videos({
				q: term,
				'max-results': 1
			},
			function (err, videos) {
				if (err || !videos.items.length) return;

				postDetails(videos.items[0]);
			}
		);
	}

	return {
		messageHandler: function (from, message) {
			var id = null;

			var re = /https?:\/\/(www.)?youtube.com\/watch\?((.+)&)?v=(.*?)($|[^\w-])/gi;
			var match;

			while (match = re.exec(message)) {
				if (match[4]) {
					postVideo(match[4]);
				}
			}

			re = /https?:\/\/(www.)?youtu.be\/(.*?)($|[^\w-])/gi;
			while (match = re.exec(message)) {
				if (match[2]) {
					postVideo(match[2]);
				}
			}
		},

		commands: {
			yt: function (from, message) {
				searchYoutube(message);
			},
			youtube: function (from, message) {
				searchYoutube(message);
			}
		}
	};
}