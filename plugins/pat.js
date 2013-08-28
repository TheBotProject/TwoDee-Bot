var fs = require('fs');

module.exports = function (client) {

	var savedPats = JSON.parse(fs.readFileSync(__dirname + '/.pats', { encoding: 'utf8' }));

	var pats = [
		// the first column is probability weights
		// the second column is the pat message
		//  must contain '{0}' - the patted
		// the third column is the text for the 'pats' command

		[20, 'pats {0}\'s head.', 'regular pat'],
		[10, 'gently pats {0}.', 'gentle pat'],
		[ 4, 'sensually pats {0}.', 'sensual pat'],
		[ 1, 'gropes {0}\'s firm buttocks.', 'grope']
	];


	// adapted from http://stackoverflow.com/a/4673436/297766
	// v----------------------------v
	function format (msg) {
		var args = Array.prototype.slice.call(arguments, 1);
		return msg.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] != 'undefined' ? args[number] : match;
		});
	}
	// ^----------------------------^


	function random(min, max) {
		// min and max are integers
		// output is a random integer in the [min, max) range

		return min + Math.floor(Math.random() * ((max - min) + 1));
	}

	function isValidName(msg) {
		// msg is a string and expected to be the name of the target of the pat
		// TODO: output is true iff msg is a valid IRC name
		// maybe also check if the target is online ATM

		return true;
	}

	var totalWeight = 0;
	for (i = 0; i < pats.length; i++)
		totalWeight += pats[i][0];

	return {
		commands: {
			pat: function (from, channel, message) {
				message = message.trim();
				if (!message) {
					client.say(channel, 'Pat who?');
					return;
				}

				if (!isValidName(message)) {
					//this should never happen until 'isValidName' is implemented
					client.say(channel, '"' + message + '" doesn\'t seem to be a valid name.');
					return;
				}


				var target = message.toLowerCase();

				var rnd = random(0, totalWeight - 1);
				for (i = 0; rnd >= pats[i][0]; i++)
					rnd -= pats[i][0];

				var pat = pats[i][1];

				if (!savedPats[target])
					savedPats[target] = {};

				if (savedPats[target][i])
					savedPats[target][i]++;
				else
					savedPats[target][i] = 1;

				client.action(channel, format(pat, message));
			},

			pats: function (from, channel, message) {
				message = message.trim();

				if (!message) message = from;

				if (!isValidName(message)) {
					//this should never happen until 'isValidName' is implemented
					client.say(channel, '"' + message + '" doesn\'t seem to be a valid name.');
					return;
				}

				if (!savedPats[message.toLowerCase()]) {
					client.say(channel, message + ' hasn\'t received any pats yet ;___;');
					return;
				}

				var rec = [];
				for (var key in savedPats[message.toLowerCase()]) {
					rec[rec.length] = savedPats[message.toLowerCase()][key] + ' ' + pats[key][2] + (savedPats[message.toLowerCase()][key] > 1 ? 's' : '');
				}

				client.say(channel, message + ' has received ' + rec.join(', ') + '.');
			}
		},

		save: function () {
			fs.writeFileSync(__dirname + '/.pats', JSON.stringify(savedPats));
		}
	};
};
