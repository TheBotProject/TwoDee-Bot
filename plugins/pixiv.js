var request = require('request');
var csvs = require('csv');

module.exports = function (client, channelName) {

	function postInfo(id) {
		request('http://spapi.pixiv.net/iphone/illust.php?illust_id=' + id, function (err, r, data) {
			if (err) return;

			csv().from.string(data).to.array(function (arr) {
				arr = arr[0];
				client.say(channelName, arr[3] + ' [' + arr[5] + '] - ' + arr[9].replace(/\/mobile|_480mw/g, ''));
			});
		});
	}

	return {
		messageHandler: function (from, message) {
			re = /https?:\/\/(www.)?pixiv.net\/member_illust.php\?((.+)&)?illust_id=([\d]+)/gi;
			while (match = re.exec(message)) {
				if (match[4]) {
					postInfo(match[4]);
				}
			}
		}
	};
}