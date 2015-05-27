var fs = require('fs');
var utils = require('../utils');

var savedEmotes = JSON.parse(fs.readFileSync(__dirname + '/.emotes', { encoding: 'utf8' }));

// Emote command definitions
// TODO: move these to a defaults file and add mechanics to manage network or channel setting such as adding/removing/enabling/disabling emotes
var emotes = {
	// Each property defines one emote command, and one statistics-report command.
	// The property name defines the trigger for the command (e.g. !pet, or !pat).
	// The corresponding stats command is triggered by adding an 's' at the end (e.g. !pets, or !pats).
	//
	// The value of each property is an array, the elements of which are possible responses. Every time an emote is triggered, one of these is picked at random.
	//
	// The first column contains numbers denoting probability weights.
	//  The chance for each line to be picked is its weigth divided by the sum of all weights in that emote.
	// The second column is the emote message string
	//  can contain '{0}' - the target of the emote
	//  and '{1}' - the initiator
	// The third column is a string used text for the count report command
	//  omit it or give it a value that evaluates to false to not record it

	pat: [
		[20, 'pats {0}\'s head.', 'regular pats'],
		[10, 'gently pats {0}.', 'gentle pats'],
		[ 4, 'sensually pats {0}.', 'sensual pats'],
		[ 1, 'gropes {0}\'s firm buttocks.', 'gropes']
	],
	pet: [
		[2, 'pets {0}.', 'pets'],
		[1, 'gives a catgirl to {0}.', 'catgirls'],
		[1, 'gives a doggirl to {0}.', 'doggirls']
	],

	hug: [
		[50, 'hugs {0}.', 'hugs'],
		[10, 'glomps {0} with victorious "Nyaaa!".', 'glomps'],
		[ 1, 'hugs {0} and tries to cop a feel.'],
	],

	thank: [
		[1, 'thanks {0} on behalf of {1}.', 'thanks'],
		// Refactor so that we can get custom messages?
		// For example: "{0} has been thanked {1} times."
	],

	highfive: [
		[400, 'highfives {0}!', 'highfives'],
		[ 20, 'swings her hand energetically and decks {0} squarely in the face! (It was an accident!)', 'slaps'],
		[  1, 'jumps in the air, does a triple fucking somersault and sticks the landing, highfiving both {0} and {1} in the process!', 'higherfives'],
	],
	scarf: [
		[1, 'shares her scarf with {0}.', 'scarf snuggles'],
	],
	
	nuzzle: [
		[20, 'nuzzles {0}.', 'nuzzles'],
		[10, 'gently nuzzles {0} and softly purrs into {0}\'s ear', 'gentle nuzzles'],
	],

	applaud: [
		[5,  'gives a standing ovation for {0}!', 'standing ovations'],
		[20, 'enthusiastically applauds {0}.', 'applause'],
		[1,  'moves her left hand in a clapping motion as she yawns into the other.', 'golfclaps'],
	],
};


// Christmas mode
var today = new Date();
var month = today.getUTCMonth();
var day = today.getUTCDate();
// only do if date is between Dec 24 and Jan 2
if ((month === 11 && day >= 24) || (month === 0 && today.getUTCDate() < 2)) {
	emotes.pat = [
		[20, 'pats {0}\'s head.', 'regular pats'],
		[10, 'festively pats {0}.', 'festive pats'],
		[ 4, 'gives {0} a pat of Christmas cheer.', 'Christmas pats'],
		[ 1, 'pinches {0}\'s cheeks.', 'pinches']
	];
	
	emotes.pet = [
		[2, 'pets {0}.', 'pets'],
		[1, 'gives a pet reindeer to {0}.', 'reindeer'],
		[1, 'gives a pet polar bear to {0}.', 'polar bears']
	];
	
	emotes.hug = [
		[5, 'hugs {0}.', 'hugs'],
		[1, 'glomps {0} with victorious "Nyaaa!".', 'glomps'],
		[2, 'hugs {0} and hands them a Christmas present.', 'Christmas presents'],
	];
	
	emotes.highfive = [
		[400, 'highfives {0}!', 'highfives'],
		[ 20, 'highfives {0} with the force of a thousand Santas!', 'Santa fives'],
		[  1, 'jumps on the roof, does a triple fucking somersault and slides down the chimney, highfiving {0} and handing them a Christmas present in the process!', 'Christmas fives'],
	];
}


for (var p in emotes) {
	savedEmotes[p] = savedEmotes[p] || {};
}

var format = utils.format;
var random = utils.random;

function isValidName(msg) {
	// msg is a string and expected to be the name of the target of the pat
	// TODO: output is true iff msg is a valid IRC name
	// maybe also check if the target is online ATM

	return true;
}

var totalWeight = {};
for (var p in emotes) {
	totalWeight[p] = 0;
	for (i = 0; i < emotes[p].length; i++) {
		totalWeight[p] += emotes[p][i][0];
	}
}

module.exports = function (client) {

	var commands = {};

	for (var p in emotes) {
		commands[p] = (function (p) {
			return function (from, channel, message) {
				if (channel === client.nick) return; // don't care about PMs
				if (message === client.nick) return; // don't let the bot touch herself (at least not until we refactor the system and make it possible to have these messages make sense in English.)

				if (!message) return;

				if (!isValidName(message)) {
					client.say(channel, '"' + message + '" doesn\'t seem to be a valid name.');
					return;
				}

				if (message === from) {
					client.say(channel, format('W-Who\'d want to {0} you!? Baka {1}!', p, from));
					return;
				}

				var rnd = random(totalWeight[p]);
				var i;
				for (i = 0; rnd >= emotes[p][i][0]; i++) {
					rnd -= emotes[p][i][0];
				}

				var emote = emotes[p][i];
				if (emote[2]) {
					var tar = message.toLowerCase();

					if (!savedEmotes[p][tar])
						savedEmotes[p][tar] = {};

					if (savedEmotes[p][tar][i])
						savedEmotes[p][tar][i]++;
					else
						savedEmotes[p][tar][i] = 1;
				}

				client.action(channel, format(emote[1], message, from));
			};
		})(p),

		commands[p + 's'] = (function (p) {
			return function (from, channel, message) {
				if (channel === client.nick) { // respond to PMs because why not
					channel = from;
				}

				if (!message) {
					message = from;
				}

				if (!isValidName(message)) {
					client.say(channel, '"' + message + '" doesn\'t seem to be a valid name.');
					return;
				}

				var tar = message.toLowerCase();
				if (!savedEmotes[p][tar]) {
					client.say(channel, message + ' hasn\'t received any ' + p + 's yet ;___;');
					return;
				}

				var rec = [];
				for (var k in savedEmotes[p][tar]) {
					var count = savedEmotes[p][tar][k];
					var noun = emotes[p][k][2];
					if (noun) {
						rec.push(count + ' ' + noun);
					}
				}

				client.say(channel, message + ' has received ' + rec.join(', ') + '.');
			}
		})(p)
	}

	// aliases
	commands['clap'] = commands['applaud'];
	commands['claps'] = commands['applauds'];

	var help = {
		pat: 'Gives the other user a gentle pat on the head. Usage: !pat USER',			
		pet: 'Gives an animal girl to the other user. Usage: !pet USER',
		hug: 'Hugs the other user. Usage: !hug USER',
		nuzzle: 'Nuzzles the other user. Usage: !nuzzle USER',
		thank: 'Thanks the other user on your behalf. Usage: !thank USER',
		highfive: 'Highfives the other user. Usage: !highfive USER',
		applaud: 'Give the other user an applause. Usage: !applaud USER',
		scarf: 'Shares a scarf with the other user for some warmth. Usage: !scarf USER'
	}

	help.clap = help.applaud;

	for (var entry in help) {
		help[entry + 's'] = 'Number of !' + entry + ' you or another user have received. Usage: !' + entry + 's [USER]';
	}

	return {
		commands: commands,
		disable: function () {
			fs.writeFileSync(__dirname + '/.emotes', JSON.stringify(savedEmotes));
		},
		help: help 
	};
};
