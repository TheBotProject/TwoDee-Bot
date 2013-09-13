var filesize = require('filesize');
var nyaa = require("nyaatorrents");

module.exports = function (client) {

	var nyaaDefault = new nyaa('http://www.nyaa.se');
	var nyaaSukebei = new nyaa('http://sukebei.nyaa.se');

	function rnd(min, max) {
		if (max === undefined) {
			max = min;
			min = 0;
		}

		return min + Math.floor(Math.random() * (max - min));
	}

	function getData(nyu, id, cb) {
		nyu.get(id, function (err, data) {
			if (err) return;

			cb(data);
		});
	}

	function postData(channel, data) {
		var str = data.nsfw ? '\x0304[NSFW]\x03 ' : '';
		str += data.name + ' - ' + filesize(data.size);
		str += ' | S: ' + (isNaN(data.seeders) ? '?' : data.seeders);
		str += ' | L: ' + (isNaN(data.leechers) ? '?' : data.leechers);
		str += ' | http://' + (data.nsfw ? 'sukebei' : 'www') + '.nyaa.se/?page=view&tid=' + data.id;
		str += ' | http://' + (data.nsfw ? 'sukebei' : 'www') + '.nyaa.se/?page=download&tid=' + data.id;

		client.say(channel, str);
	}

	return {
		commands: {
			nyaa: function (from, channel, msg) {
				nyaaDefault.search({cats: '1_37'/* English-translated anime */, term: msg}, function (err, entries) {
					if (err) return;

					if (entries.length === 0) {
						client.say(channel, 'No results for "' + msg + '". Try !nyaan or !nyaall?');
						return;
					}

					getData(nyaaDefault, entries[rnd(entries.length)].id, postData.bind(undefined, channel));
				});
			},

			nyaall: function (from, channel, msg) {
				nyaaDefault.search({term: msg}, function (err, entries) {
					if (err) return;

					if (entries.length === 0) {
						client.say(channel, 'No results for "' + msg + '". Try !nyaan?');
						return;
					}
					
					getData(nyaaDefault, entries[rnd(entries.length)].id, postData.bind(undefined, channel));
				});
			},

			nyaan: function (from, channel, msg) {
				nyaaSukebei.search({term: msg}, function (err, entries) {
					if (err) return;

					if (entries.length === 0) {
						client.say(channel, 'No results for "' + msg + '". Try !nyaan?');
						return;
					}

					getData(nyaaSukebei, entries[rnd(entries.length)].id, function (data) {
						data.nsfw = true;
						postData(channel, data);
					});
				});
			}
		},

		messageHandler: function (from, channel, message) {
			var re = /http:\/\/(sukebei|www)\.nyaa\.(eu|se)\/\?page=(view|download)&tid=(\d+)/gi;
			var match;

			while (match = re.exec(message)) {
				getData(match[1] === 'sukebei' ? nyaaSukebei : nyaaDefault, match[4], function (nsfw, data) {
					data.nsfw = nsfw;
					postData(channel, data);
				}.bind(undefined, match[1] === 'sukebei'));
			}
		}
	};
};
