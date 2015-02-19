var request = require('request');
var google = require('google');
var http = require('http');

var wikipediaRegex = /(?:^|\s)(?:https?:\/\/)?en\.wikipedia\.org\/(\S+)/gi;

function parseLinks(str) {
	var match, re = wikipediaRegex;
	var matches = [];
	while (match = re.exec(str)) {
		var link = match[0].trim();
		var arr = match[1].split('?');
		var path = arr[0];
		var query = arr[1];

		if (match = path.match(/wiki\/(.*)/i)) {
			try {
				matches.push([ link, decodeURIComponent(match[1]) ]);
			} catch (e) {}
		} else if (query && (path === '' || path === 'w/index.php')) {
			arr = query.split('&');
			for (var i in arr) {
				if (match = arr[i].match(/title=(.*)/i)) {
					try {
						matches.push([ link, decodeURIComponent(match[1]) ]);
					} catch (e) {}
				}
			}
		}
	}

	return matches;
}

function queryGoogle(query, cb) {
	google.resultsPerPage = 1;
	var url='site:en.wikipedia.org ' + query;
	google(url, function (err, next, links) {
		if (err) {
			if (err.status) {
				cb(new Error('Something went wrong while searching on Google: ' + err.status + ': ' + http['STATUS_CODES'][err.status]), null);
			} else {
				cb(new Error('Something went wrong while searching on Google: ' + err.message), null);
			}

			return;
		}

		if (links.length === 0) {
			cb(new Error('No results for: "' + query + '".'), null);

			return;
		}

		var match = parseLinks(links[0].link)[0];

		if (match && match[1]) {
			cb(null, match[1]);
		} else if (next) {
			next();
		} else {
			cb(new Error('No results for: "' + query + '".'), null);
		}
	});
}

function queryWikipedia(title, cb) {
	// see https://en.wikipedia.org/w/api.php for detailed usage information
	var url = 'https://en.wikipedia.org/w/api.php?'
		+ 'format=json&'							// The format of the output
		+ 'action=query&'							// What action you would like to perform
		+ 'prop=extracts&'							// Which properties to get for the titles/revisions/pageids
		+ 'redirects=1&'							// Automatically resolve redirects
		+ 'exintro=1&'								// Return only content before the first section (get just the lead)
		+ 'explaintext=1&'							// Return extracts as plaintext instead of limited HTML
		+ 'titles=' + encodeURIComponent(title);	// A list of titles to work on; Separate values with '|'

	console.log('Querying ' + url);

	request.get(url, function(err, resp, body) {
		if (err) {
			cb(new Error('Something went wrong while querying Wikipedia: ' + err.message), null);

			return;
		}

		if (resp.statusCode < 200 || resp.statusCode >= 300) {
			cb(new Error('Something went wrong while querying Wikipedia: ' + resp.statusCode + ': ' + http['STATUS_CODES'][resp.statusCode]), null);

			return;
		}

		try {
			body = JSON.parse(body);
			cb(null, body);
		} catch (e) {
			cb(new Error('Got bad data from Wikipedia.'), null);
		}
	});
}

function format(data, titleIfEmpty) {
	var iw = data.query.interwiki;
	if (iw !== undefined) {
		return titleIfEmpty ? '\x0312' + iw[0].title + '\x03' : '';
	}

	var pages = data.query.pages;
	var id = Object.keys(pages)[0];
	var title = pages[id].title;
	var extract = (pages[id].extract || '').trim();

	// if we have a page without (plain) text or without a lead section do nothing
	if (extract.length === 0 || extract.match(/^==.+==$/)) {
		return titleIfEmpty ? '\x0312' + title + '\x03' : '';
	}
	
	// replace newlines with `; `, unless preceded by punctuation
	extract = extract.replace(/([^.,;:!?\n])\n+/g, '$1; ');
	extract = extract.replace(/\n+/g, ' ');

	// if over 200 characters, truncate and add elipsis
	if (extract.length > 200) {
		extract = extract.substring(0, 200) + '...';
	}

	// if the title is contained within the extract, we want to color it

	// drop any disambiguation (e.g. "Bleach (manga)" -> "Bleach")
	var reStr = title.replace(/\s\([^\)]+\)$/, '');

	// escape special characters
	reStr = reStr.replace(/([\.\\\+\*\?\[\^\]\$\(\)])/g, '\\$1');

	var re = new RegExp('\\b(' + reStr + ')\\b', 'gi');
	var msg = extract.replace(re, '\x0312\$1\x03');

	// if we didn't color anything just prepend the title
	if (msg === extract) {
		msg = '\x0312' + title + '\x03: ' + extract;
	}

	return msg;
}

module.exports = function (client) {
	return {
		messageHandler: function (from, to, msg) {
			if (to === client.nick) {
				return;
			}

			parseLinks(msg).forEach(function (val) {
				var link = val[0];
				var title = val[1];
				queryWikipedia(title, function (err, result) {
					if (err) {
						return;
					}

					var msg = format(result, false);
					if (msg) {
						client.say(to, msg + ' ( ' + link + ' )');
					}
				});
			});
		},

		commands: {
			wikipedia: function (from, to, msg) {
				if (to === client.nick) {
					to = from;
				}

				queryGoogle(msg, function (err, title) {
					if (err) {
						client.say(to, err.message);

						return;
					}

					// chicks dig guys who percent-encode their parenthesis
					var link = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title).replace(/\(/g, '%28').replace(/\)/g, '%29');

					queryWikipedia(title, function (err, result) {
						if (err) {
							client.say(to, err.message);

							return;
						}

						// just in the case we get json we didn't account for
						try {
							client.say(to, format(result, true) + ' ( ' + link + ' )');
						} catch (e) {
							console.error(e.stack);

							console.error();
							console.error('link:   ' + link);
							console.error('result: ' + JSON.stringify(result));

							client.say(to, 'Something went terribly wrong. The authorities have been contacted.');
						}
					});
				});
			},

			wiki: function (from, to, msg) {
				this.wikipedia(from, to, msg);
			},

			wp: function (from, to, msg) {
				this.wikipedia(from, to, msg);
			}
		}
	};
};
