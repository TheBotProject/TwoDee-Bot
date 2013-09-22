var fs = require('fs');
var utils = require('../utils');

module.exports = function (client) {

	var savedPets = JSON.parse(fs.readFileSync(__dirname + '/.pets', { encoding: 'utf8' }));

	var pets = [
		['pets', 'pets'],
		['gives a catgirl to', 'catgirls']
	];

	var random = utils.random;

	return {
		commands: {
			pet: function (from, channel, message) {
				if (!message) return;

				if (from.toLowerCase() === message.toLowerCase()) {
					client.say(channel, 'Only someone else can give me the pet command for you :(');
					return;
				}

				var rnd = random(pets.length);
				var pet = pets[rnd][0];

				if (!savedPets[message.toLowerCase()]) {
					savedPets[message.toLowerCase()] = {};
				}

				savedPets[message.toLowerCase()][rnd] = savedPets[message.toLowerCase()][rnd] ? savedPets[message.toLowerCase()][rnd] + 1 : 1;
				client.action(channel, pet + ' ' + message);
			},

			pets: function (from, channel, message) {
				if (!message) message = from;

				if (!savedPets[message.toLowerCase()]) {
					client.say(channel, message + ' didn\'t get any pets yet :(');
					return;
				}

				var owns = [];
				for (var key in savedPets[message.toLowerCase()]) {
					owns[owns.length] = savedPets[message.toLowerCase()][key] + ' ' + pets[key][1];
				}

				client.say(channel, message + ' has ' + owns.join(', '));
			}
		},

		save: function () {
			fs.writeFileSync(__dirname + '/.pets', JSON.stringify(savedPets));
		}
	};
};
