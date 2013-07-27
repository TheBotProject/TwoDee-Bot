var youtube = require('youtube-feeds');
var fs = require('fs');
var readLine = require("readline");

module.exports = function (client, channelName) {

	var savedPets = JSON.parse(fs.readFileSync(__dirname + '/.pets', { encoding: 'utf8' }));

	function random(min, max) {
		return min + Math.floor(Math.random() * ((max - min) + 1));
	}

	var pets = [
		['pets', 'pets'],
		['gives a catgirl to', 'catgirls']
	];

	return {
		commands: {
			pet: function (from, message) {
				if (from.toLowerCase() === message.toLowerCase()) {
					client.say(channelName, 'Only someone else can give me the pet command for you :(');
					return;
				}

				var rnd = random(0, pets.length - 1);
				var pet = pets[rnd][0];

				if (!savedPets[message.toLowerCase()]) {
					savedPets[message.toLowerCase()] = {};
				}

				savedPets[message.toLowerCase()][rnd] = savedPets[message.toLowerCase()][rnd] ? savedPets[message.toLowerCase()][rnd] + 1 : 1;
				client.action(channelName, pet + ' ' + message);
				fs.writeFileSync(__dirname + '/.pets', JSON.stringify(savedPets));
			},

			pets: function (from, message) {
				if (!message) message = from;

				if (!savedPets[message.toLowerCase()]) {
					client.say(channelName, message + ' didn\'t get any pets yet :(');
					return;
				}

				var owns = [];
				for (var key in savedPets[message.toLowerCase()]) {
					owns[owns.length] = savedPets[message.toLowerCase()][key] + ' ' + pets[key][1];
				}

				client.say(channelName, message + ' has ' + owns.join(', '));
			}
		}
	};
};