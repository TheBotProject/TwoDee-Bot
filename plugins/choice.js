var readLine = require("csv");
var utils = require('../utils');

module.exports = function (client) {

	var random = utils.random;

	return {
		commands: {
			choice: function (from, channel, message) {
				if (!message) return;

				csv().from.string(message, { delimiter: ' ' }).to.array(function (data) {
					data = data[0];

					client.say(channel, from + ': ' + data[random(data.length)]);
				});
			}
		}
	};
};
