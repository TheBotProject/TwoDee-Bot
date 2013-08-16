var youtube = require('youtube-feeds');

module.exports = function (client) {
	function postDetails(channel, details) {
		client.say(channel, details.title + ' [' + Math.floor(details.duration / 60) + ':' + ((details.duration % 60 < 10 ? '0' : '') + (details.duration % 60)) + '] - https://youtu.be/' + details.id);
	}

	function postVideo(id, cb) {
		youtube.video(id, function (err, details) {
			if (err) return;

			cb(details);
		});
	}

	function searchYoutube(term, cb) {
		youtube.feeds.videos({
				q: term,
				'max-results': 1
			},
			function (err, videos) {
				if (err || !videos.items.length) return;

				cb(videos.items[0]);
			}
		);
	}

	return {
		messageHandler: function (from, channel, message) {
			var re = /https?:\/\/(www.)?youtube.com\/watch\?((.+)&)?v=(.*?)($|[^\w-])/gi;
			var match;

			while (match = re.exec(message)) {
				if (match[4]) {
					postVideo(match[4], postDetails.bind(undefined, channel));
				}
			}

			re = /https?:\/\/(www.)?youtu.be\/(.*?)($|[^\w-])/gi;
			while (match = re.exec(message)) {
				if (match[2]) {
					postVideo(match[2], postDetails.bind(undefined, channel));
				}
			}
		},

		commands: {
			yt: function (from, channel, message) {
				searchYoutube(message, postDetails.bind(undefined, channel));
			},
			youtube: function (from, channel, message) {
				searchYoutube(message, postDetails.bind(undefined, channel));
			}
		}
	};
};