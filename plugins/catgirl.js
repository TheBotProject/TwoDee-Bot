var xml2js = require('xml2js');
var request = require('request');

module.exports = function (client, channelName) {

	function random(min, max) {
		return min + Math.floor(Math.random() * ((max - min) + 1));
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
				requestAndParse('http://safebooru.org/index.php?page=dapi&s=post&q=index&tags=' + encodeURIComponent(message) + '&limit=0', function (err, res) {
					if (err) {
						console.error('Catgirl error: ' + err);
						return;
					}

					var rand = random(0, res.posts.$.count - 1);
					requestAndParse('http://safebooru.org/index.php?page=dapi&s=post&q=index&tags=' + encodeURIComponent(message) + '&limit=1&pid=' + rand, function (err, res) {
						client.say(channelName, res.posts.post[0].$.file_url);
					});
				});
			}
		}
	};
}