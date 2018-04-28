var fs = require('fs');
var { random } = require('../utils');

var savedEmotes = JSON.parse(
  fs.readFileSync(__dirname + '/.emotes', { encoding: 'utf8' })
);

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
  // The second column is a function generating the emote message string. It receives two args:
  //  - the target of the emote
  //  - the initiator
  // The third column is a string used text for the count report command
  //  omit it or give it a value that evaluates to false to not record it

  pat: [
    [20, nick => `pats ${nick}'s head.`, 'regular pats'],
    [10, nick => `gently pats ${nick}.`, 'gentle pats'],
    [4, nick => `sensually pats ${nick}.`, 'sensual pats'],
    [1, nick => `gropes ${nick}'s firm buttocks.`, 'gropes'],
  ],
  pet: [
    [2, nick => `pets ${nick}.`, 'pets'],
    [1, nick => `gives a catgirl to ${nick}.`, 'catgirls'],
    [1, nick => `gives a doggirl to ${nick}.`, 'doggirls'],
  ],

  hug: [
    [50, nick => `hugs ${nick}.`, 'hugs'],
    [10, nick => `glomps ${nick} with victorious "Nyaaa!".`, 'glomps'],
    [1, nick => `hugs ${nick} and tries to cop a feel.`],
  ],

  thank: [
    [1, (nick, from) => `thanks ${nick} on behalf of ${from}.`, 'thanks'],
    // Refactor so that we can get custom messages?
    // For example: "${nick} has been thanked {1} times."
  ],

  highfive: [
    [400, nick => `highfives ${nick}!`, 'highfives'],
    [
      20,
      nick =>
        `swings her hand energetically and decks ${nick} squarely in the face! (It was an accident!)`,
      'slaps',
    ],
    [
      1,
      (nick, from) =>
        `jumps in the air, does a triple fucking somersault and sticks the landing, highfiving both ${nick} and ${from} in the process!`,
      'higherfives',
    ],
  ],
  scarf: [[1, nick => `shares her scarf with ${nick}.`, 'scarf snuggles']],

  nuzzle: [
    [2, nick => `nuzzles ${nick}.`, 'nuzzles'],
    [1, nick => `nuzzles ${nick} and purrs into their ear.`, 'gentle nuzzles'],
  ],

  applaud: [
    [5, nick => `gives a standing ovation for ${nick}!`, 'standing ovations'],
    [20, nick => `enthusiastically applauds ${nick}.`, 'applause'],
    [
      1,
      () =>
        `moves her left hand in a clapping motion as she yawns into the other.`,
      'golfclaps',
    ],
  ],
};

// Christmas mode
var today = new Date();
var month = today.getUTCMonth();
var day = today.getUTCDate();
// only do if date is between Dec 24 and Jan 2
if ((month === 11 && day >= 24) || (month === 0 && today.getUTCDate() < 2)) {
  emotes.pat = [
    [20, nick => `pats ${nick}'s head.`, 'regular pats'],
    [10, nick => `festively pats ${nick}.`, 'festive pats'],
    [4, nick => `gives ${nick} a pat of Christmas cheer.`, 'Christmas pats'],
    [1, nick => `pinches ${nick}'s cheeks.`, 'pinches'],
  ];

  emotes.pet = [
    [2, nick => `pets ${nick}.`, 'pets'],
    [1, nick => `gives a pet reindeer to ${nick}.`, 'reindeer'],
    [1, nick => `gives a pet polar bear to ${nick}.`, 'polar bears'],
  ];

  emotes.hug = [
    [5, nick => `hugs ${nick}.`, 'hugs'],
    [1, nick => `glomps ${nick} with victorious "Nyaaa!".`, 'glomps'],
    [
      2,
      nick => `hugs ${nick} and hands them a Christmas present.`,
      'Christmas presents',
    ],
  ];

  emotes.highfive = [
    [400, nick => `highfives ${nick}!`, 'highfives'],
    [
      20,
      nick => `highfives ${nick} with the force of a thousand Santas!`,
      'Santa fives',
    ],
    [
      1,
      nick =>
        `jumps on the roof, does a triple fucking somersault and slides down the chimney, highfiving ${nick} and handing them a Christmas present in the process!`,
      'Christmas fives',
    ],
  ];
}

for (var p in emotes) {
  savedEmotes[p] = savedEmotes[p] || {};
}

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

module.exports = function(client) {
  var commands = {};

  for (var p in emotes) {
    (commands[p] = (function(p) {
      return function(from, channel, message) {
        if (channel === client.nick) return; // don't care about PMs
        if (message === client.nick) return; // don't let the bot touch herself (at least not until we refactor the system and make it possible to have these messages make sense in English.)

        if (!message) return;

        if (!isValidName(message)) {
          client.say(
            channel,
            '"' + message + '" doesn\'t seem to be a valid name.'
          );
          return;
        }

        if (message === from) {
          client.say(channel, `W-Who'd want to ${p} you!? Baka ${from}!`);
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

          if (!savedEmotes[p][tar]) savedEmotes[p][tar] = {};

          if (savedEmotes[p][tar][i]) savedEmotes[p][tar][i]++;
          else savedEmotes[p][tar][i] = 1;
        }

        client.action(channel, emote[1](message, from));
      };
    })(p)),
      (commands[p + 's'] = (function(p) {
        return function(from, channel, message) {
          if (channel === client.nick) {
            // respond to PMs because why not
            channel = from;
          }

          if (!message) {
            message = from;
          }

          if (!isValidName(message)) {
            client.say(
              channel,
              '"' + message + '" doesn\'t seem to be a valid name.'
            );
            return;
          }

          var tar = message.toLowerCase();
          if (!savedEmotes[p][tar]) {
            client.say(
              channel,
              message + " hasn't received any " + p + 's yet ;___;'
            );
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

          client.say(
            channel,
            message + ' has received ' + rec.join(', ') + '.'
          );
        };
      })(p));
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
    scarf:
      'Shares a scarf with the other user for some warmth. Usage: !scarf USER',
  };

  help.clap = help.applaud;

  for (var entry in help) {
    help[entry + 's'] =
      'Number of !' +
      entry +
      ' you or another user have received. Usage: !' +
      entry +
      's [USER]';
  }

  return {
    commands: commands,
    disable: function() {
      fs.writeFileSync(__dirname + '/.emotes', JSON.stringify(savedEmotes));
    },
    help: help,
  };
};
