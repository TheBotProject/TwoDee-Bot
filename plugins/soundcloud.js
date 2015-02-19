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

// song URLs look like this: https://soundcloud.com/<artist name>/<song name>
var songRegex = /^(?:https?:\/\/)?soundcloud\.com\/([^/ ]+)\/([^/ ]+)\/?$/gi;
// set URLs look like this: https://soundcloud.com/<artist name>/sets/<set name>
var setRegex = /^(?:https?:\/\/)?soundcloud\.com\/([^/ ]+)\/sets\/([^/ ]+)\/?$/gi;

function parseLinks(str) {
	var strArr = str.trim().split(/\s+/);
	var match;
	var matches = [];
	for (var i = 0; i < strArr.length; i++) {
		// song URLs may have a query string like this:
		// https://soundcloud.com/<artist name>/<song name>?in=<artist name>/<set name>
		// we don't care about it, so we just drop it
		strArr[i] = strArr[i].split('?')[0];
		
		if (match = songRegex.exec(strArr[i])) {
			matches.push({
				type: 'track',
				url: match[0],
				artist: match[1],
				title: match[2]
			});
		} else if (match = setRegex.exec(strArr[i])) {
			matches.push({
				type: 'playlist',
				url: match[0],
				artist: match[1],
				title: match[2]
			});
		}
	}

	return matches;
}


function querySoundcloud(url, cb) {
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
	var count = data.track_count;

	return '[' + artist + '] ' + title + (genre ? ' \x0302#' + genre + '\x03' : '') + (count ? ' (' + count + ' tracks)' : '') + ' [' + durationFormat(Math.ceil(duration / 1000)) + '] [ ' + link + ' ]';
}

module.exports = function (client) {
	return {
		messageHandler: function (from, to, msg) {
			if (to === client.nick) {
				return;
			}
			
			var matches = parseLinks(msg);
			for (var i = 0; i < matches.length; i++) {				
				(function (match) {
					var requestURL = 'https://api.soundcloud.com/resolve.json?'
							+ 'client_id=' + clientId + '&'
							+ 'url=' + encodeURIComponent(match.url);
					
					querySoundcloud(requestURL, function (err, result) {
						if (err) {
							console.error('Error while processing ' + requestURL);
							console.error(err);

							return;
						} else if (result.errors) {
							console.error('Error while processing ' + requestURL);
							console.error(JSON.stringify(result.errors));
							
							return;
						} else  {
							var msg = format(result);
							client.say(to, msg);
						}
					});
				})(matches[i]);
			}
		}
	};
};
