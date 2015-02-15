var util = require('util');

var durationFormat = require('../utils.js').durationFormat;
var youtube = require('youtube-feeds');

var ytText = 'Searches youtube for the specified terms and returns a video. Usage: !%s SEARCH';
var help = {};
help.yt = util.format(ytText, 'yt');
help.youtube = util.format(ytText, 'youtube');

module.exports = function (client) {
	function postDetails(channel, details) {
		client.say(channel, details.title + ' [' + durationFormat(details.duration) + '] - https://youtu.be/' + details.id); 
	}

	function postVideo(id, cb) {
		youtube.video(id, function (err, details) {
			if (err) {
				try {
					var msg = err.details.message;
					cb('Error while trying to look up https://youtu.be/' + id + ' : ' + msg, null);
				} catch (e) {
					cb('Unknown error ocurred while trying to look up https://youtu.be/' + id, null);
				}
			} else {
				cb(null, details);
			}
		});
	}

	function searchYoutube(term, cb) {
		youtube.feeds.videos({
				q: term,
				'max-results': 1
			},
			function (err, videos) {
				if (err && err.toString() === 'Error: not found' || !videos.items.length) {
					cb('No results for "' + term + '".', null);
				} else if (err) {
					cb('Error while trying to look up "' + term + '": ' + err, null);
				} else {
					cb(null, videos.items[0]);
				}
			}
		);
	}

	return {
		messageHandler: function (from, channel, message) {
			var re = /https?:\/\/(www.)?youtube.com\/watch\?((.+)&)?v=(.*?)($|[^\w-])/gi;
			var match;
			
			var post = function (channel, err, details) {
				if (err) {
					// keep quiet because this is a requested response;
					return;
				} else {
					postDetails(channel, details);
				}
			};

			while (match = re.exec(message)) {
				if (match[4]) {
					postVideo(match[4], post.bind(undefined, channel));
				}
			}

			re = /https?:\/\/(www.)?youtu.be\/(.*?)($|[^\w-])/gi;
			while (match = re.exec(message)) {
				if (match[2]) {
					postVideo(match[2], post.bind(undefined, channel));
				}
			}
		},

		commands: {
			yt: function (from, channel, message) {
				if (channel === client.nick) {
					channel = from;
				}
				
				searchYoutube(message, function (err, details) {
					if (err) {
						client.say(channel, err);
					} else {
						postDetails(channel, details);
					}
				});
			},
			
			youtube: function (from, channel, message) {
				this.yt(from, channel, message);
			}
		},
		help: help
	};
};
