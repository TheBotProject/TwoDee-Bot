var utils = require('../utils');

module.exports = function(client) {
  var random = utils.random;

  var bestAnime = [
    {
      title: 'Pico x CoCo x Chico',
      description: ' A wonderful romance between 3 people.',
      url: 'http://myanimelist.net/anime/4866/Pico_x_CoCo_x_Chico',
    },
    {
      title: 'Angel Beats!',
      description:
        'Fights, Comedy and Romance what can go wrong right? It got a bit short, but definitely',
      url: 'http://myanimelist.net/anime/6547/Angel_Beats!',
    },
    {
      title: 'Angel Beats!',
      description:
        'Fights, Comedy and Romance what can go wrong right? It got a bit short, but definitely',
      url: 'http://myanimelist.net/anime/6547/Angel_Beats!',
    },
    {
      title: 'Rec',
      description:
        'A cute romance between a salaryman and an upcoming seiyuu, whose house burnt down. He takes her in and it goes from there -',
      url: 'http://myanimelist.net/anime/710/Rec',
    },
  ];

  return {
    commands: {
      whattowatch: function(from, channel, message) {
        var best = bestAnime[random(bestAnime.length)];
        client.say(
          from,
          'Currently best aired anime: ' +
            best.title +
            ' - ' +
            best.description +
            ' a must watch! - ' +
            best.url
        );
      },
    },
    help: {
      whattowatch:
        'Recommends an anime based on your observed preferences. Usage: !whattowatch',
    },
  };
};
