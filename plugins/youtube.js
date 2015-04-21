var util = require('util');
var durationFormat = require('../utils.js').durationFormat;
var youtube = require('youtube-api');
var fs = require('fs');

var ytText = 'Searches youtube for the specified terms and returns a video. Usage: !%s SEARCH';
var help = {};
help.yt = util.format(ytText, 'yt');
help.youtube = util.format(ytText, 'youtube');


var file = __dirname + '/.youtube';
try {
	var apiKey = fs.readFileSync(file, { encoding: 'utf8' });
	if (!apiKey) {
		throw new Error('No API key found in ' + file);
	}
} catch (e) {
	console.error(e.message);
	
	module.exports = function () { return {}; };
	
	return;
}

youtube.authenticate({
	type: 'key',
	key: apiKey
});


	
// Query the Youtube API and if successful, give the video object to the callback
function getVideoData(id, cb) {
	// https://developers.google.com/youtube/v3/docs/search/list
	youtube.videos.list({
			part: 'snippet,contentDetails', // a comma-separated list of resource properties that the API response will include
			                                // we need snippet to get title, and contentDetails to get duration
			id: id                          // the ID of the video we need; can also be multiple comma-separated IDs
		},
		function (err, videoListResponse) {
			if (err) {
				cb(new Error('Error while trying to get data for https://youtu.be/' + id + ': ' + err.message), null);
			} else if (videoListResponse && videoListResponse.items) {
				if (videoListResponse.items.length === 0) {
					cb(new Error('A video by that id does not exist.'), null);
				} else {
					cb(null, videoListResponse.items[0]);
				}
			} else { // we should never reach this point
				console.error('Bad response from Youtube: ' + JSON.stringify(videoListResponse));
				cb(new Error('Got a bad response from Youtube, while trying get data for https://youtu.be/"' + id + '".'), null);
			}
		}
	);
}

// Query the Youtube search API and if successful, give the first result object to the callback
function searchYoutube(term, cb) {
	// https://developers.google.com/youtube/v3/docs/search/list
	youtube.search.list({
			part: 'snippet', // required by the specification
			maxResults: 1,   // we only ask for one since that's all we'll use
			q: term,         // the search query term
			type: 'video'    // restrict results to videos only (no playlists or channels)
		},
		function (err, searchListResponse) {
			if (err) {
				cb(new Error('Error while trying to look up "' + term + '": ' + err.message), null);
			} else if (searchListResponse && searchListResponse.items) {
				if (searchListResponse.items.length === 0) {
					cb(new Error('No results for "' + term + '".'), null);
				} else {
					cb(null, searchListResponse.items[0]);
				}
			} else { // we should never reach this point
				console.error('Bad response from Youtube: ' + JSON.stringify(searchListResponse));
				cb(new Error('Got a bad response from Youtube, while trying search for "' + term + '".'), null);
			}
		}
	);
}


// Convert a video object to a formatted string
function stringifyVideo(video) {
	var url = 'https://youtu.be/' + video.id;
	var title = video.snippet.title;
	var duration = parseIso8601Duration(video.contentDetails.duration);
	
	return title + ' [' + durationFormat(duration) + '] - ' + url;
}

function parseIso8601Duration(str) {
	// format: PT#D#H#M#S, where # is a number and each of #D, #H, #M, and #S are optional
	var re = /PT(?:(\d+)D)?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
	var match = str.match(re);
	
	var days = parseInt(match[1]) || 0;
	var hours = parseInt(match[2]) || 0;
	var minutes = parseInt(match[3]) || 0;
	var seconds = parseInt(match[4]) || 0;
	
	var time = seconds + 60 * (minutes + 60 * (hours + 24 * days));
	
	return time;
}


function search(term, cb) {
	searchYoutube(term, function (err, video) {
		if (err) {
			cb(err, null);
			return;
		}
		
		// Since the search API does not provide a duration, we make a second request
		var id = video.id.videoId;
		getVideoData(id, function (err, video){
			if (err) {
				cb(err, null);
				return;
			}
			
			cb(null, stringifyVideo(video));
		});
	});
}

module.exports = function (client) {

	return {
		messageHandler: function (from, to, msg) {
			var re = /(?:https?:\/\/)?(www\.|m\.)?youtube\.com\/watch\?((.+)&)?v=(.*?)($|[^\w-])/gi;
			var match;
			
			var post = function (to, id) {
				getVideoData(id, function (err, video){
					if (err) {
						// keep quiet because this is not a requested response
						return;
					}
					
					client.say(to, stringifyVideo(video));
				});
			};

			while (match = re.exec(msg)) {
				if (match[4]) {
					post(to, match[4]);
				}
			}

			re = /(?:https?)?:\/\/youtu\.be\/(.*?)($|[^\w-])/gi;
			while (match = re.exec(msg)) {
				if (match[1]) {
					post(to, match[1]);
				}
			}
		},

		commands: {
			yt: function (from, to, msg) {
				if (to === client.nick) {
					to = from;
				}
				
				search(msg, function (err, message) {
					if (err) {
						client.say(to, err.message);
					} else {
						client.say(to, message);
					}
				});
			},
			
			youtube: function (from, to, msg) {
				this.yt(from, to, msg);
			}
		},
		help: help
	};
};
