var url = require('url');
var request = require('request');
var http = require('http');

var head = function (uri, cb) {
	var options = { uri: url.parse(uri) };
	if (!options.uri.protocol) {
		options.uri = url.parse('http://' + uri);
	}

	options.timeout = 3000;

	request.head(options, function (err, resp) {
		if (err) {
			cb(err, null);
		} else {
			cb(null, resp);
		}
	});
}

module.exports = function (client) {
	return {
		commands: {
			isup: function (from, to, url) {
				if (to === client.nick) {
					to = from;
				}

				if (!url) {
					client.say(to, 'Usage: !isup <url>.');
					return;
				}

				head(url, function (err, resp) {
					if (err) {
						if (err.message === 'Invalid protocol') {
							client.say(to, 'Invalid protocol.');
						} else switch (err.code) {
						case 'ETIMEDOUT':
							client.say(to, 'Request to ' + url + ' timed out.');
							break;
						case 'ENOTFOUND':
							client.say(to, 'DNS lookup failed for ' + url + ' .');
							break;
						default:
							console.error('Error checking ' + url + ': ' + err.code);
							client.say(to, 'Error checking ' + url + ': ' + err.code);
						}

						return;
					}

					if (resp.statusCode < 200 || resp.statusCode >= 300) {
						client.say(to, url + ' responded with ' + resp.statusCode + ': ' + http['STATUS_CODES'][resp.statusCode]);

						return;
					}

					client.say(to, url + ' is up.');
				});
			}
		},
		help: {
			isup: 'Returns whether the given site could be accessed. Usage !isup URL'
		}
	};
};
