var youtube = require('youtube-feeds');

module.exports = function (client, channelName) {

	function random(min, max) {
		return min + Math.floor(Math.random() * ((max - min) + 1));
	}

	var pets = [
		'pets',
		'gives a catgirl to'
	];

	return {
		commands: {
			pet: function (from, message) {
				var pet = pets[random(0, pets.length - 1)];
				client.action(channelName, pet + ' ' + message);
			}
		}
	};
}