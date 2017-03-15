var request = require('request');
var utils = require('../utils');
var fs = require('fs');

var authConfig = JSON.parse(fs.readFileSync(__dirname + '/.danbooru', {encoding : 'utf8'}));

var host = 'https://danbooru.donmai.us';
var authPart = authConfig.login && authConfig.api_key ? 'login=' + authConfig.login + '&api_key=' + authConfig.api_key + '&' : '';
var randomUri = 'https://danbooru.donmai.us/posts.json?' + authPart + 'limit=1&random=true&tags=';
var pageUri = 'https://danbooru.donmai.us/posts/';

module.exports = function (client) {
	//Even though DB supports 'random', they actually do return empty arrays from time to time, hence the retry logic
	function requestDanbooru(channel, tags) {
		var uri = randomUri + encodeURIComponent(tags);

		function retry(times) {
			request({uri : uri, json : true}, function (err, res, body) {
				if(err) {
					client.say(channel, 'Error while trying to reach Danbooru.');
					return;
				}

				if(res.statusCode === 200 && body && body.length) {
					var post = body[0];

					var postUri = pageUri + post.id;
					var imageUri = host + post.file_url;
					var prefix = post.rating && body[0].rating !== 's' ? '[\x0304NSFW\x03] ' : '';
					client.say(channel, '! ' + prefix + postUri + ' | ' + imageUri);
					client.emit('commands:image', channel, {image : imageUri});
				}
				else if (times) {
					retry(times - 1);
				} else {
					client.say(channel, 'No valid link after 3 tries :(');
				}
			})
		}

		retry(2);
	}


	return {
		commands: {
			db: function (from, channel, message) {
				requestDanbooru(channel, message);
			}
		}
	}
};
