var xml2js = require('xml2js');
var request = require('request');

module.exports = function (client, channelName) {

	function random(min, max) {
		return min + Math.floor(Math.random() * ((max - min) + 1));
	}

	function getBooru(host, tags, broadcast) {
		requestAndParse(host + '/index.php?page=dapi&s=post&q=index&tags=' + encodeURIComponent(tags) + '&limit=0', function (err, res) {
			if (err) {
				console.error('Booru error: ' + err);
				return;
			}

			if (res.posts.$.count == 0) {
				client.say(channelName, 'Sorry, nothing found for ' + tags);
				return;
			}

			var rand = random(0, res.posts.$.count - 1);
			requestAndParse(host + '/index.php?page=dapi&s=post&q=index&tags=' + encodeURIComponent(tags) + '&limit=1&pid=' + rand, function (err, res) {
				if (!res.posts.post.length) return;

				client.emit('commands:image', res.posts.post[0].$.file_url);
				if (broadcast) {
					client.say(channelName, (res.posts.post[0].$.rating && res.posts.post[0].$.rating !== 's' ? 'NSFW - ' : '') + res.posts.post[0].$.file_url);
				}
			});
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
			catgirl: function (from, message) {
				this.sb(from, 'cat_tail');
			},

			sb: function (from, message) {
				getBooru('http://safebooru.org', message, true);
			},

			gb: function (from, message) {
				getBooru('http://gelbooru.com', message, true);
			}
		},

		messageHandler: function (from, message) {
			var re, match;

			re = /http:\/\/safebooru\.org\/+?images\/\S+/gi;
			while (match = re.exec(message)) {
				client.emit('commands:image', match[0]);
			}

			re = /http:\/\/safebooru.org\/index.php\?page=post&s=view&id=(\d+)/gi;
			while (match = re.exec(message)) {
				getBooru('http://safebooru.org', 'id:' + match[1], false);
			}
		}
	};
};