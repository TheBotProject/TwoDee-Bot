module.exports = function (client, channelName) {

	function random(min, max) {
		return min + Math.floor(Math.random() * ((max - min) + 1));
	}

	var bestAnime = [
		{
			title: 'Pico x CoCo x Chico',
			description: ' A wonderful romance between 3 humans.',
			url: 'http://myanimelist.net/anime/4866/Pico_x_CoCo_x_Chico'
		},
		{
			title: 'Angel Beats!',
			description: 'Fights, Comedy and Romance what can go wrong right? It got a bit short, but definitely',
			url: 'http://myanimelist.net/anime/6547/Angel_Beats!'
		},
		{
			title: 'Angel Beats!',
			description: 'Fights, Comedy and Romance what can go wrong right? It got a bit short, but definitely',
			url: 'http://myanimelist.net/anime/6547/Angel_Beats!'
		},
		{
			title: 'Rec',
			description: 'A cute romance between a salaryman and an upcoming seiyuu, whose house burnt down. He takes her in and it goes from there -',
			url: 'http://myanimelist.net/anime/710/Rec'
		}
	];

	return {
		commands: {
			whattowatch: function (from, message) {
				var best = bestAnime[random(0, bestAnime.length - 1)];
				client.say(from, 'Currently best aired anime: ' + best.title + ' - ' + best.description + ' a must watch! - ' + best.url);
			}
		}
	};
}