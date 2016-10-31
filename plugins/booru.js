var xml2js = require('xml2js');
var utils = require('../utils');
var request = require('request');

module.exports = function (client) {

	var random = utils.random;

	function getBooru(channel, host, tags, broadcast) {
		requestAndParse(host + '/index.php?page=dapi&s=post&q=index&tags=' + encodeURIComponent(tags) + '&limit=0', function (err, res) {
			if (err || !res.posts) {
				console.error('Booru error: ' + err + ', response');
				console.log(res);
				client.say(channel, 'Error while parsing booru response.');
				return;
			}

			if (res.posts.$.count === '0') {
				client.say(channel, 'Sorry, nothing found for ' + tags);
				return;
			}

			function retry(times) {
				var rand = random(res.posts.$.count);
				requestAndParse(host + '/index.php?page=dapi&s=post&q=index&tags=' + encodeURIComponent(tags) + '&limit=1&pid=' + rand, function (err, res) {
				    if (err) {
				        client.say(channel, 'Error while trying to reach booru.');
				        return;
				    }

					if (!res.posts || !res.posts.post || !res.posts.post.length) {
						console.log(res);
						client.say(channel, 'Invalid booru reply');
						return;
					}

					if (broadcast) {
						request.head({ url: res.posts.post[0].$.file_url, headers: { Referer: res.posts.post[0].$.file_url } }, function (err, resp) {
							if (!err && resp.statusCode >= 200 && resp.statusCode < 300) {
								client.say(channel, (res.posts.post[0].$.rating && res.posts.post[0].$.rating !== 's' ? '\x0304NSFW\x03 - ' : '') + res.posts.post[0].$.file_url);
								client.emit('commands:image', channel, { image: res.posts.post[0].$.file_url });
							} else if (times) {
								retry(times - 1);
							} else {
								client.say(channel, 'No valid link after 3 tries :(');
							}
						});
					} else {
						client.emit('commands:image', channel, { image: res.posts.post[0].$.file_url });
					}
				});
			}

			retry(2);
		});
	}

	function requestAndParse(url, cb) {
		request.get(url, function (err, res, body) {
			if (err) {
				cb(err);
				return;
			}

			var parser = new xml2js.Parser();
			try {
				parser.parseString(body.toString('utf8'), cb);
			} catch (e) {
				cb(e);
			}
		});
	}

	return {
		commands: {
			catgirl: function (from, channel, message) {
				this.sb(from, channel, 'cat_ears ' + message);
			},
			
			doggirl: function (from, channel, message) {
				this.sb(from, channel, 'dog_ears ' + message);
			},

			bunnygirl: function (from, channel, message) {
				this.sb(from, channel, 'bunny_ears ' + message);
			},
			
			sb: function (from, channel, message) {
				getBooru(channel, 'http://safebooru.org', 'rating:safe ' + message, true);
			},

			gb: function (from, channel, message) {
				getBooru(channel, 'http://gelbooru.com', message, true);
			}
		},

		messageHandler: function (from, channel, message) {
			var re, match;

			re = /http:\/\/safebooru\.org\/+?images\/\S+/gi;
			while (match = re.exec(message)) {
				client.emit('commands:image', channel, { image: match[0] });
			}

			re = /http:\/\/safebooru.org\/index.php\?page=post&s=view&id=(\d+)/gi;
			while (match = re.exec(message)) {
				getBooru(channel, 'http://safebooru.org', 'id:' + match[1], false);
			}
		},

		help: {
			catgirl: 'return a random catgirl (tagged \'cat_ears\') from safebooru.org. Extra tags are optional. Usage: !catgirl [TAGS...]',
			sb: 'return a random image from safebooru.org. Extra tags are optional. Usage: !sb [TAGS...]',
			gb: 'return a random image from gelbooru.com. Extra tags are optional. Usage: !gb [TAGS...]'
		}
	};
};
