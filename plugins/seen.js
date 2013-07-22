var timeAgo = require('time-ago').timeago;

module.exports = function (client, channelName) {

	var users = {};
	setTimeout(function () {
		for (var i in client.chans[channelName.toLowerCase()].users) {
			users[i.toLowerCase()] = { joined: null, left: null };
		}
	}, 1000);

	client.on('quit', function (user) {
		if (users[user.toLowerCase()]) {
			users[user.toLowerCase()].left = new Date();
		}
	});

	client.on('part', function (channel, user) {
		if (users[user.toLowerCase()]) {
			users[user.toLowerCase()].left = new Date();
		}
	});

	client.on('join', function (channel, user) {
		if (!users[user.toLowerCase()]) {
			users[user.toLowerCase()] = { joined: new Date(), left: null };
		} else {
			users[user.toLowerCase()].joined = new Date();
		}
	});

	return {
		commands: {
			seen: function (from, message) {
				var user = users[message.toLowerCase()];
				if (user) {
					if (user.joined === null && user.left === null) {
						client.say(channelName, message + ' is here! I have no idea when he/she came though :(');
					} else if (user.joined !== null) {
						if (user.left !== null && user.joined < user.left) {
							client.say(channelName, message + ' last joined ' + timeAgo(user.joined) + ', but left ' + timeAgo(user.left));
						} else {
							client.say(channelName, message + ' is here! He/She came ' + timeAgo(user.joined) + '!');
						}
					} else if (user.joined === null && user.left !== null) {
						client.say(channelName, 'I have no idea when ' + message + ' last joined, he/she left ' + timeAgo(user.left) + ' though!');
					} else {
						client.say(channelName, 'Something\'s wrong with me. Fix meeeh, fix meeeee :((((');
						process.exit(1);
					}
				} else {
					client.say(channelName, 'I haven\'t seen ' + message + ' yet :(');
				}
			}
		}
	};
};