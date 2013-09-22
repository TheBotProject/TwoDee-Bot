var second = 1000,
	minute = second * 60,
	hour = minute * 60,
	day = hour * 24;

module.exports = function (client) {

	function ago(date) {
		var diff = Date.now() - new Date(date).getTime();

		if (diff > 100 * hour) { // > 100 hours
			return Math.round(diff / day) + ' day' + (Math.round(diff / day) > 1 ? 's' : '') + ' ago';
		} else if (diff > hour) {
			return Math.round(diff / hour) + ' hour' + (Math.round(diff / hour) > 1 ? 's' : '') + ' ago';
		} else if (diff > minute) {
			return Math.round(diff / minute) + ' minute' + (Math.round(diff / minute) > 1 ? 's' : '') + ' ago';
		} else {
			return Math.round(diff / second) + ' second' + (Math.round(diff / second) !== 1 ? 's' : '') + ' ago';
		}
	}

	var users = {};
	function refreshUsers(channel) {
		for (var i in client.chans[channel].users) {
			if (users[i.toLowerCase()]) continue;

			users[i.toLowerCase()] = { joined: null, left: null };
		}
	}

	function userJoin(channel, user) {
		if (!users[user.toLowerCase()]) {
			users[user.toLowerCase()] = { joined: new Date(), left: null };
		} else {
			users[user.toLowerCase()].joined = new Date();
		}
	}

	function userLeave(channel, user) {
		if (users[user.toLowerCase()]) {
			users[user.toLowerCase()].left = new Date();
		}
	}

	client.once('names', refreshUsers);


	var userQuit = userLeave.bind(client, null);
	client.on('quit', userQuit);

	var userPart = userLeave;
	client.on('part', userPart);

	client.on('join', userJoin);

	return {
		commands: {
			seen: function (from, channel, message) {
				if (!message) return;
				
				var user = users[message.toLowerCase()];
				if (user) {
					if (user.joined === null && user.left === null) {
						client.say(channel, message + ' is here! I have no idea when he/she came though :(');
					} else if (user.joined !== null) {
						if (user.left !== null && user.joined < user.left) {
							client.say(channel, message + ' last joined ' + ago(user.joined) + ', but left ' + ago(user.left));
						} else {
							client.say(channel, message + ' is here! He/She came ' + ago(user.joined) + '!');
						}
					} else if (user.joined === null && user.left !== null) {
						client.say(channel, 'I have no idea when ' + message + ' last joined, he/she left ' + ago(user.left) + ' though!');
					} else {
						client.say(channel, 'Something\'s wrong with me. Fix meeeh, fix meeeee :((((');
						process.exit(1);
					}
				} else {
					client.say(channel, 'I haven\'t seen ' + message + ' yet :(');
				}
			}
		}
	};
};
