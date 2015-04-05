var request = require('request');
var fs = require('fs');

try {
	var clientId = fs.readFileSync(__dirname + '/.imgur');

	module.exports = function (client) {

		function upload(url, cb) {

			var options = {
				url: 'https://api.imgur.com/3/image',
				headers: {
					Authorization: 'Client-ID ' + clientId
				},
				form: {
					type: 'URL',
					image: url
				}
			};

			request.post(options, function (e, r, b) {
				cb(e, r, b && JSON.parse(b) || undefined);
			});
		}

		return {
			commands: {
				imgur: function (from, to, message) {
					// if we're asked in a PM respond in a PM
					if (to === client.nick)
						to = from;

					request.head({ url: message, headers: { Referer: message }}, function (err, resp) {

						if (!err && resp.statusCode >= 200 && resp.statusCode < 300) {
							if (resp.headers['content-type'] === 'image/gif' && resp.headers['content-length'] > 2048000) {
								client.say(to, 'Size limit for gifs is 2 MB, ' + from + '. Try http://awwni.me.');
								return;
							}
						} else {
							client.say(to, '"' + message + '"? That doesn\'t seem right.');
							return;
						}

						upload(message, function (e, r, b) {
							if (e) {
								console.error('Error uploading to imgur: ' + e);
								client.say(to, 'Sorry, ' + from + ', something went wrong. Try http://awwni.me.');

							} else if (resp.statusCode >= 200 && resp.statusCode < 300 && b && b.success) {
								client.say(to, from + ': ' + b.data.link);
							} else if (b && b.data && b.data.error) {
								client.say(to, 'I don\'t see anything wrong, but imgur says: ' + b.data.error);
							} else {
								client.say(to, 'Something I don\'t know what went wrong. Try http://awwni.me.');
							}
						});
					});
				}
			},
			help: {
				rehost: 'Rehosts the given url on imgur.com. Usage: !rehost URL'
			}
		};
	};
} catch (e) {
	console.error('Couldn\'t read imgur client id: ' + e);
	module.exports = function () { return {}; };
}
