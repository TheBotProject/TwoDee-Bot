var filesize = require('filesize');
var nyaa = require("nyaatorrents");

module.exports = function (client, channelName) {

	var n = new nyaa('http://www.nyaa.eu');

	function post(id) {
		n.get(id, function (err, data) {
			if (err) return;

			client.say(channelName, data.name + ' - ' + filesize(data.size) + ' | S: ' + data.seeders + ' | L: ' + data.leechers + ' | http://www.nyaa.eu/?page=download&tid=' + data.id);
		});
	}

	return {
		messageHandler: function (from, message) {
			var re = /http:\/\/www\.nyaa\.eu\/\?page=view&tid=(\d+)/gi;
			var match;

			while (match = re.exec(message)) {
				post(match[1]);
			}
		}
	};
}