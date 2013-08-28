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
	}
};