var filesize = require('filesize');
var nyaa = require("nyaatorrents");

module.exports = function (client) {

	var n = new nyaa('http://www.nyaa.eu');

	function getData(id, cb) {
		n.get(id, function (err, data) {
			if (err) return;

			cb(data);
		});
	}

	return {
		messageHandler: function (from, channel, message) {
			var re = /http:\/\/www\.nyaa\.eu\/\?page=view&tid=(\d+)/gi;
			var match;

			while (match = re.exec(message)) {
				getData(match[1], function (data) {
					client.say(channel, data.name + ' - ' + filesize(data.size) + ' | S: ' + data.seeders + ' | L: ' + data.leechers + ' | http://www.nyaa.eu/?page=download&tid=' + data.id);
				});
			}
		}
	};
};