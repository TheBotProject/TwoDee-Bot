var request = require('request');
var csvs = require('csv');
var utils = require('../utils');

module.exports = function (client) {

	var random = utils.random;

	function searchPixiv(term, cb) {
		//login disabled for now
		var authJar = request.jar();
		//request({ url: 'http://spapi.pixiv.net/iphone/login.php?mode=login&pixiv_id=' + PIXIV_ID + '&pass=' + PIXIV_PASSWORD + '&skip=0', jar: authJar }, function (err, r, body) {
		request({ url: 'http://spapi.pixiv.net/iphone/search.php?s_mode=s_tag&word=' + encodeURIComponent(term) + '&PHPSESSID=0', jar: authJar }, function (err, r, body) {
			csv().from.string(body).to.array(function (arr) {
				if (!arr.length || !arr[0].length) {
					cb(null);
					return;
				}

				arr = arr[random(arr.length)];
				if (arr[4].length === 1) arr[4] = '0' + arr[4];

				cb(arr);
			});
		});
		//});
	}

	function postInfo(id, cb) {
		request('http://spapi.pixiv.net/iphone/illust.php?illust_id=' + id, function (err, r, data) {
			if (err) return;

			csv().from.string(data).to.array(function (arr) {
				if (arr[0]) {
					arr[0][0] = id;
				}

				cb(arr[0]);
			});
		});
	}

	function postPixiv(channel, term, arr) {
		if (arr === null && term) {
			client.say(channel, 'Sorry, nothing found for ' + term);
		} else {
			client.emit('commands:image', channel, { image: 'http://i1.pixiv.net/img' + arr[4] + '/img/' + arr[24] + '/' + arr[0] + '.' + arr[2] });
			client.say(channel, (arr[26] === '1' ? '\x0304NSFW\x03 - ' : '') + arr[3] + ' [' + arr[5] + '] - http://pixiv.net/member_illust.php?mode=medium&illust_id=' + arr[0]);
		}
	}

	return {
		commands: {
			pixiv: function (from, channel, message) {
				if (message.trim() === '') return;
				searchPixiv(message, postPixiv.bind(null, channel, message));
			}
		},

		messageHandler: function (from, channel, message) {
			var re, match;

			re = /https?:\/\/(www.)?pixiv.net\/member_illust.php\?((.+)&)?illust_id=([\d]+)/gi;
			while (match = re.exec(message)) {
				if (match[4]) {
					postInfo(match[4], postPixiv.bind(null, channel, null));
				}
			}
		}
	};
};
