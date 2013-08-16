var xml2js = require('xml2js');
var request = require('request');

module.exports = function (client, channelName) {

	function random(min, max) {
		return min + Math.floor(Math.random() * ((max - min) + 1));
	}

	function getBooru(channel, host, tags, broadcast) {
		requestAndParse(host + '/index.php?page=dapi&s=post&q=index&tags=' + encodeURIComponent(tags) + '&limit=0', function (err, res) {
			if (err || !res.posts) {
				console.error('Booru error: ' + err + ', response');
				console.log(res);
				return;
			}

			if (res.posts.$.count == 0) {
				client.say(channel, 'Sorry, nothing found for ' + tags);
				return;
			}

			function retry(times) {
				var rand = random(0, res.posts.$.count - 1);
				requestAndParse(host + '/index.php?page=dapi&s=post&q=index&tags=' + encodeURIComponent(tags) + '&limit=1&pid=' + rand, function (err, res) {
					if (!res.posts.post.length) return;

					client.emit('commands:image', { channel: channel, image: res.posts.post[0].$.file_url });
					if (broadcast) {
						request.head({ url: res.posts.post[0].$.file_url, headers: { Referer: res.posts.post[0].$.file_url } }, function (err, resp) {
							if (!err && resp.statusCode >= 200 && resp.statusCode < 300) {
								client.say(channel, (res.posts.post[0].$.rating && res.posts.post[0].$.rating !== 's' ? '\x0304NSFW\x03 - ' : '') + res.posts.post[0].$.file_url);
							} else if (times) {
								retry(times - 1);
							} else {
								client.say(channel, 'No valid link after 3 tries :(');
							}
						});
					}
				});
			}

			retry(2);
		});
	}

	function requestAndParse(url, cb) {
		request(url, function (err, res, body) {
			if (err) {
				cb(err);
				return;
			}

			var parser = new xml2js.Parser();
			parser.parseString(body, cb);
		});
	}

	return {
		commands: {
			catgirl: function (from, channel, message) {
				this.sb(from, channel, 'cat_tail');
			},

			sb: function (from, channel, message) {
				getBooru(channel, 'http://safebooru.org', message, true);
			},

			gb: function (from, channel, message) {
				getBooru(channel, 'http://gelbooru.com', message + ' -rating:explicit', true);
			}
		},

		messageHandler: function (from, channel, message) {
			var re, match;

			re = /http:\/\/safebooru\.org\/+?images\/\S+/gi;
			while (match = re.exec(message)) {
				client.emit('commands:image', { channel: channel, image: match[0] });
			}

			re = /http:\/\/safebooru.org\/index.php\?page=post&s=view&id=(\d+)/gi;
			while (match = re.exec(message)) {
				getBooru(channel, 'http://safebooru.org', 'id:' + match[1], false);
			}
		}
	};
};