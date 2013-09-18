var url = require('url');
var http = require('http');

module.exports = {
	request: function (method, uri, headers, cb) {
		if (typeof headers === 'function') {
			cb = headers;
			headers = null;
		}

		var options = url.parse(uri);
		options.method = method;
		options.headers = headers;

		var req = http.request(options, function (res) {
			var body = new Buffer(0);
			res.on('data', function (data) {
				body = Buffer.concat([body, data]);
			});

			res.on('end', function () {
				cb(null, res, body);
			});
		});
		req.on('error', function (e) {
			cb(e);
		});

		var normalizedMethod = method.toUpperCase();
		if (normalizedMethod === 'GET' || normalizedMethod === 'HEAD') {
			req.end();
		}
		return req;
	},

	// returns an integer in the [min, max) range
	// if only min is given, the [0, min) range
	random: function(min, max) {
		if (max === undefined) {
			max = min;
			min = 0;
		}

		return min + Math.floor(Math.random() * (max - min));
	},

	// replaces {0}, {1}, ..., {n}, ... etc. in str with
	// the n-th argument after str
	format: function(str) {
		var args = Array.prototype.slice.call(arguments, 1);
		return str.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] !== 'undefined' ? args[number] : match;
		});
	}
};
