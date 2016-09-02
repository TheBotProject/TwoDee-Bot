var utils = require('../utils');

module.exports = function (client) {

	var random = utils.random;

	return {
		commands: {
			choice: function (from, channel, message) {
				if (!message) return;

				if (channel === client.nick) {
					channel = from;
				}

				// if we have an odd number of "
				// we tell the user something went wrong
				var match;
				if ((match = message.match(/"/g)) && (match.length % 2 === 1)) {
					client.say(channel, from + ', you seem to be missing a " in your choices.');
					return;
				}
				
				// This regex matches for words between spaces or all words between quotations
				// Original solution: http://stackoverflow.com/a/366532
				var choices = message.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g);
				
				if (choices.length === 0) {
					client.say(channel, 'Sorry ' + from + ', something went wrong while trying to parse your choices.');
					return;
				}
				
				client.say(channel, from + ': ' + choices[random(choices.length)]);
			}
		},
		help: {
			choice: 'Returns a randomly selected element from the provided choices. Splitting happens between spaces, or single and double quotes. Usage: !choice OPTIONS...'
		}
	};
};
