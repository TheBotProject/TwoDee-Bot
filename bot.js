var irc = require('irc');
var redwrap = require('redwrap');
var fs = require('fs');
var ent = require('ent');
var types = require('./types.js');

var messageHandlers = [];
var commands = {};
var client;
var lastSeen = [];
var configuration = new types.Configuration();

function registerPlugin(instance) {
	if (instance instanceof Function) {
		instance = instance(client, configuration.channel);
	} else if (typeof instance === 'string') {
		instance = require(instance)(client, configuration.channel);
	}

	if (instance.messageHandler) {
		messageHandlers.push(instance.messageHandler);
	}

	for (var cmd in instance.commands) {
		commands[cmd] = instance.commands[cmd];
	}
}

function initIRC() {
	client = new irc.Client(configuration.server, configuration.nick, {
		userName: configuration.nick,
		channels: [ configuration.channel ],
		floodProtection: true,
		password: configuration.password
	});

	client.on('quit', function (nick) {
		if (nick === client.nick) {
			console.error('IRC disconnected us - stopping');
			process.exit(1);
		}
	});

	client.on('error', function (e) {
		console.error('IRC error');
		console.log(e);
	});

	client.on('join', function (channel, user) {
		if (channel === configuration.channel && user === client.nick) {
			console.log('Connected to IRC - starting requests');
			setInterval(searchNew, 30 * 1000);
		}
	});

	client.on('message' + configuration.channel, function (from, message) {
		if (message[0] === '!') {
			var cmd = message.split(' ')[0].substring(1);
			if (commands[cmd]) {
				commands[cmd](from, message.substring(cmd.length + 2));
			}
		} else {
			for (var i = 0; i < messageHandlers.length; ++i) {
				messageHandlers[i](from, message);
			}
		}
	});

    for (var i = 0; i < configuration.plugins.length; i++) {
	    registerPlugin('./plugins/' + configuration.plugins[i] + '.js');
    }
}

function searchNew() {
	redwrap.r(configuration.reddits.join('+')).new(function (err, data, res) {
		if (err || data.error) {
			console.error('Error "' + (err || data.error) + '" when refreshing post list, retrying on next interval');
			return;
		}

		for (var i = 0; i < data.data.children.length; ++i) {
			var post = data.data.children[i].data;
			if (lastSeen.indexOf(post.id) !== -1) {
				console.log('found last post - stopping');
				break; // already processed these posts
			}
			lastSeen.push(post.id);

			console.log('annoucing new link: ' + post.title);
			client.say(configuration.channel, '[' + post.subreddit + '] [' + post.author + '] '
                + ent.decode(post.title) + ' [ http://redd.it/' + post.id + ' ]' 
                + (!post.is_self ? ' [ ' + post.url + ' ]' : '') + (post.over_18 ? ' [NSFW]' : ''));
		}
	});

}

function initReddit() {
    if (!lastSeen.length) {
    	redwrap.r(configuration.reddits.join('+')).new(function (err, data, res) {
    		if (err || data.error) {
    			console.error('Couldn\'t retrieve last post! Error: ' + (err || data.error));
    			process.exit(1);
    		}
    
    		for (var i = 0; i < data.data.children.length; ++i) {
    			var post = data.data.children[i].data;
    			lastSeen.push(post.id);
    		}
    
    		console.log('saved last posts');
    	});
    }
}

if (fs.existsSync('config.json')) {
    types.loadConfiguration('config.json', function(c) {
        configuration = c;
        initIRC();
        initReddit();
        types.saveConfiguration('config.json', configuration);
    });
} else {
    types.saveConfiguration('config.json', configuration, function(error) {
        console.log('Empty configuration generated in config.json');
        console.log('Populate it and restart bot');
        process.exit(0);
    });
}

setInterval(function () {
	console.log('Cleaning memory');
	lastSeen.splice(0, lastSeen.length - 50);
}, 24 * 3600);
