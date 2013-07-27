var readLine = require("csv");

module.exports = function (client, channelName) {

	function random(min, max) {
		return min + Math.floor(Math.random() * ((max - min) + 1));
	}

	return {
		commands: {
			choice: function (from, message) {
				csv().from.string(message, { delimiter: ' ' }).to.array(function (data) {
					data = data[0];

					client.say(channelName, from + ': ' + data[random(0, data.length - 1)]);
				});
			}
		}
	};
};