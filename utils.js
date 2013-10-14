var request = require('request');

﻿module.exports = {

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
	},

	waaai: function (u, cb) {
		function retry(times) {
			times--;

			// decode url first to be safe
			var url = decodeURIComponent(u);
			url = encodeURIComponent(url);

			request.get({ url: 'http://api.waa.ai/?url=' + url }, function (err, resp, body) {
				if (err) {
					console.error('Couldn\'t shorten url! (' + (times || 'no') + ' more retries) Error: ' + err);

					if (times) {
						retry(times);
					} else {
						cb(err, null);
					}

					return;
				}

				if (resp.statusCode < 200 || resp.statusCode >= 300) {
					console.error('Error: waa.ai responded with a ' + resp.statusCode + ' status code. (' + (times || 'no') + ' more retries)');

					if (times) {
						retry(times);
					} else {
						cb(new Error('Failed to shorten URL: waa.ai responded with a ' + resp.statusCode + ' status code.'), null);
					}

					return;
				}

				cb(null, body);
			});
		}

		retry(3);
	},
};
