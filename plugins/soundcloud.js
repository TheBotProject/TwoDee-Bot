var durationFormat = require('../utils.js').durationFormat;
var request = require('request');
var http = require('http');
var fs = require('fs');

try {
	var clientId = fs.readFileSync(__dirname + '/.soundcloud', { encoding: 'utf8' }).trim();
} catch (err) {
	console.error('Couldn\'t read soundcloud client id: ' + err);
	module.exports = function () { return {}; };

	return;
}

function querySoundcloud(link, cb) {
	var url = 'https://api.soundcloud.com/resolve.json?'
		+ 'client_id=' + clientId + '&'
		+ 'url=' + link;

	request.get(url, function(err, resp, body) {
		if (err) {
			cb(new Error('Something went wrong while querying Soundcloud: ' + err.message), null);

			return;
		}

		if (resp.statusCode < 200 || resp.statusCode >= 300) {
			cb(new Error('Something went wrong while querying Soundcloud: ' + resp.statusCode + ': ' + http['STATUS_CODES'][resp.statusCode]), null);

			return;
		}

		try {
			body = JSON.parse(body);
		} catch (e) {
			cb(new Error('Got bad data from Soundcloud for', url, ':', body), null);

			return;
		}

		cb(null, body);
	});
}

function format(data) {
	var duration = data.duration;
	var genre = data.genre;
	var title = data.title;
	var artist = data.user.username;
	var link = data.permalink_url;

	return '[' + artist + '] ' + title + (genre ? ' [' + genre + ']' : '') + ' [' + durationFormat(Math.ceil(duration / 1000)) + '] [ ' + link + ' ]';
}

module.exports = function (client) {
	return {
		messageHandler: function (from, to, msg) {
			if (to === client.nick) {
				return;
			}

			var match, re = /(:?^|\s)(?:https?:\/\/)?(?!=api\.)soundcloud\.com\/\S*/gi;
			while (match = re.exec(msg)) {
				(function (link) {
					querySoundcloud(link, function (err, result) {
						if (err) {
							console.error('Error while processing ' + link);
							console.error(err);

							return;
						} else if (result.errors) {
							console.error('Error while processing ' + link);
							console.error(JSON.stringify(results.errors));

							return;
						} else if (result.kind !== 'track') {
							console.error(link + ' is not a track; it\'s a ' + result.kind);

							return;
						}

						var msg = format(result);
						client.say(to, msg);
					});
				})(match[0].trim());
			}
		}
	};
};
