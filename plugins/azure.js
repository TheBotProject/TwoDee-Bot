var fs = require('fs');
var request = require('request');
var azure = require('azure');
var url = require('url');
var csv = require('csv');
var spawn = require('child_process').spawn;
var BufferStream = require('../BufferStream');
var config = JSON.parse(fs.readFileSync(__dirname + '/../config.json', { encoding: 'utf8' }));
var Q = require('q');

module.exports = function (client, channelName) {

	if (!process.env.AZURE_STORAGE_ACCOUNT || !process.env.AZURE_STORAGE_ACCESS_KEY) {
		var userData = JSON.parse(fs.readFileSync(__dirname + '/.azure', { encoding: 'utf8' }));

		if (!userData.name) {
			return {};
		}
		process.env.AZURE_STORAGE_ACCOUNT = userData.name;
		process.env.AZURE_STORAGE_ACCESS_KEY = userData.key;
	}

	var tableService = azure.createTableService();
	tableService.createTableIfNotExists('images', function () { });
	var blobService = azure.createBlobService();
	blobService.createContainerIfNotExists('images', { publicAccessLevel: 'blob' }, function () { });
	blobService.createContainerIfNotExists('thumbnails', { publicAccessLevel: 'blob' }, function () { });

	function checkLink(url, fn) {
		request.head({ url: url, headers: { Referer: url } }, function (err, resp) {
			if (err) return fn(err);

			fn(null, resp.statusCode === 200);
		});
	}

	function saveLink(url) {
		checkLink(url, function (err, success) {
			if (err || !success) return;

			var query = azure.TableQuery
				.select('RowKey')
				.from('images')
				.where('Url eq ?', url);

			tableService.queryEntities(query, function (error, entities) {
				if (error || entities.length) return;

				var date = new Date();
				var partKey = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()).toString();
				var blobId = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()).toString();

				var req = request.get({ url: url, headers: { Referer: url } });

				req.on('response', function (resp) {
					var imgDeferred = Q.defer();
					blobService.createBlockBlobFromStream('images', blobId.toString(), req, resp.headers['content-length'], { contentType: resp.headers['content-type'], cacheControl: 'max-age=31536000, public' }, function (err) {
						if (err) {
							imgDeferred.reject(err);
						} else {
							imgDeferred.resolve();
						}
					});

					var conv = spawn(config.convertPath, ['-', '-thumbnail', '200x200', 'jpg:-']);
					req.pipe(conv.stdin);

					var thumbDeferred = Q.defer();
					var thumbnail = new Buffer(0);
					conv.stdout.on('data', function (data) {
						thumbnail = Buffer.concat([thumbnail, data]);
					});
					conv.stdout.on('end', function () {
						blobService.createBlockBlobFromStream('thumbnails', blobId.toString(), new BufferStream(thumbnail), thumbnail.length, { contentType: 'image/jpeg', cacheControl: 'max-age=31536000, public' }, function (err) {
							if (err) {
								thumbDeferred.reject(err);
							} else {
								thumbDeferred.resolve();
							}
						});
					});

					Q.all([imgDeferred.promise, thumbDeferred.promise]).then(function () {
						tableService.insertEntity('images', {
							PartitionKey: partKey,
							RowKey: blobId,
							Url: url
						}, function (err) {
							if (err) return console.error(err);

							client.emit('azure:image', blobId, partKey);
						});
					});
				});
			});
		});
	}

	function savePixiv(id) {
		request('http://spapi.pixiv.net/iphone/illust.php?illust_id=' + id, function (err, r, data) {
			if (err) return;

			csv().from.string(data).to.array(function (arr) {
				arr = arr[0];
				if (arr[4].length === 1) arr[4] = '0' + arr[4];

				saveLink('http://i1.pixiv.net/img' + arr[4] + '/img/' + arr[24] + '/' + arr[0] + '.' + arr[2]);
			});
		});
	}

	function parseLinks(message) {
		var re, match;

		re = /http:\/\/e-shuushuu.net\/images\/\S+/gi;
		while (match = re.exec(message)) {
			saveLink(match[0]);
		}

		re = /https?:\/\/(www\.|i\.)?imgur.com\/(\w+)/gi;
		while (match = re.exec(message)) {
			saveLink('http://i.imgur.com/' + match[2] + '.jpg');
		}

		re = /https?:\/\/(www.)?pixiv.net\/member_illust.php\?((.+)&)?illust_id=([\d]+)/gi;
		while (match = re.exec(message)) {
			if (match[4]) {
				savePixiv(match[4]);
			}
		}
	}

	client.on('commands:message' + channelName, function (image) {
		parseLinks(image);
	});

	client.on('commands:image' + channelName, function (image) {
		saveLink(image);
	});

	return {
		messageHandler: function (from, message) {
			parseLinks(message);
		}
	};
};