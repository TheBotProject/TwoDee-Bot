var filesize = require('filesize');
var nyaa = require("nyaatorrents");

module.exports = function (client) {

	var n = new nyaa('http://www.nyaa.se');

	function getData(id, cb) {
		n.get(id, function (err, data) {
			if (err) return;

			cb(data);
		});
	}

	function postData(channel, data) {
		client.say(channel, data.name + ' - ' + filesize(data.size) + ' | S: ' + (isNaN(data.seeders) ? '?' : data.seeders) + ' | L: ' + (isNaN(data.leechers) ? '?' : data.leechers) + ' | http://www.nyaa.se/?page=view&tid=' + data.id + ' | http://www.nyaa.se/?page=download&tid=' + data.id);
	}

	return {
		messageHandler: function (from, channel, message) {
			var re = /http:\/\/www\.nyaa\.(eu|se)\/\?page=(view|download)&tid=(\d+)/gi;
			var match;

			while (match = re.exec(message)) {
				getData(match[3], postData.bind(undefined, channel));
			}
		}
	};
};