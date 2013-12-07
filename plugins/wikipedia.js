var request = require('request');
var google = require('google');
var http = require('http');

var wikipediaRegex = /(?:^|\s)(?:https?:\/\/)?en\.wikipedia\.org\/(.*)/gi;

function getTitle(url) {
	var match, re = wikipediaRegex;

	if (match = re.exec(url)) {
		re.lastIndex = 0;

		var arr = match[0].split('?');
		var path = arr[0];
		var query = arr[1];

		if (match = path.match(/wiki\/(.*)/i)) {
			return match[1];
		} else if (path === '' || path === 'w/index.php') {
			arr = query.split('&');
			for (var i in arr) {
				if (match = arr[i].match(/title=(.*)/i)) {
					return match[1];
				}
			}
		}
	}

	
}

function queryGoogle(query, cb) {
	google.resultsPerPage = 1;

	google('site:en.wikipedia.org ' + query, function (err, next, links) {
		if (err) {
			if (err.status) {
				cb(new Error('Something went wrong while searching on Google: ' + err.status + ': ' + http['STATUS_CODES'][status]), null);
			} else {
				cb(new Error('Something went wrong while searching on Google: ' + err.message), null);
			}

			return;
		}

		if (links.length === 0) {
			cb(new Error('No results for: "' + query + '".'), null);

			return;
		}

		var title = getTitle(links[0].link);

		if (title) {
			cb(null, title);
		} else if (next) {
			next();
		} else {
			cb(new Error('No results for: "' + query + '".'), null);
		}
	});
}

function queryWikipedia(title, cb) {
	var url = 'https://en.wikipedia.org/w/api.php?'
		+ 'format=json&'
		+ 'action=query&'
		+ 'prop=extracts&'
		+ 'explaintext=1&'
		+ 'exsentences=1&'
		+ 'redirects=1&'
		+ 'titles=' + encodeURIComponent(title);

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

module.exports = function (client) {
	return {
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
							var pages = result.query.pages;
							var id = Object.keys(pages)[0];
							var title = pages[id].title;
							var extract = (pages[id].extract || '').trim();

							// if we have a page without (plain) text or without a lead section just post the link
							if (extract.length === 0 || extract.match(/^==.+==$/)) {
								client.say(to, '\x0312' + title + '\x03: ' + link);
							} else {
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

								client.say(to, msg + ' ( ' + link + ' )');
							}
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
