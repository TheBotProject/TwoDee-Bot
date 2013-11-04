var readLine = require("csv");
var utils = require('../utils');

module.exports = function (client) {

	var random = utils.random;

	return {
		commands: {
			choice: function (from, channel, message) {
				if (!message) return;

				if (channel === client.nick) {
					client === from;
				}

				// if we have an odd number of "
				// just assume the user missed the final one
				var match;
				if ((match = message.match(/"/g)) && (match.length % 2 === 1)) {
					message += '"';
				}

				csv().from.string(message, { delimiter: ' ' }).to.array(function (data) {
					data = data[0];
					client.say(channel, from + ': ' + data[random(data.length)]);
				});
			}
		}
	};
};
