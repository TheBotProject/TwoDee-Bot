var pixiv = require('pixiv-api');
var q = require('q');
var postRequest = q.denodeify(require('request').post);

module.exports = function (client) { 
	function uploadAlbum(albumTitle, imageIds) { 
		var uploadRequest = {
			url: 'http://redditbooru.com/images/',
			headers: {
				Referer: 'http://redditbooru.com/',
				//quoted because js variables break on dashes
				'Content-type': 'application/x-www-form-urlencoded'
			},
			body: getBody(albumTitle, imageIds),
		};

		return postRequest(uploadRequest)
			.then(function (response) {
				var jsonResponse = JSON.parse(response[0].body);

				if (jsonResponse && (jsonResponse.redirect || jsonResponse.route)) {
					return jsonResponse.redirect || 'http://redditbooru.com' + jsonResponse.route;
				} 

				throw 'something went wrong while trying to retrieve the album from redditbooru';
			});
	}

	function uploadImage(imageUrl) {
		// We use force=true because otherwise redditbooru doesn't return with a proper imageId to upload.
		var uri = 'http://redditbooru.com/upload/?action=upload&force=true&imageUrl=' + encodeURIComponent(imageUrl);

		return postRequest(uri)
			.then(function (response) {
				var jsonResponse = JSON.parse(response[0].body);

				if (jsonResponse.error || !jsonResponse.imageId) {
					throw 'something went wrong while trying to upload your image(s)';
				}

				return jsonResponse.imageId;
			});
	}

	//We construct the body ourselves because the json in the request form doesn't fancy non-unique keys, which is what's being used in dxprog's http requests
	function getBody(title, images) {
		var body = '';
		if (title) {
			body = 'albumTitle=' + title + '&';
		}

		var imageUris = images.map(function(image) {
			return encodeURIComponent('imageId[]') + '=' + image;
		});
		
		body += imageUris.join('&');

		return body;
	}

	function retrievePixivImages(images) {
		var pixivPromises = [];
		images.forEach(function (item) {
			var match = pixiv.pixivNetRe.exec(item);

			if (match) {
				pixivPromises.push(pixiv.getPixivImage(match[4])
					.then(pixiv.getImageUrlsFromManga));
			}
			
			match = pixiv.pixivComRe.exec(item);
			if (match) {
				pixivPromises.push(pixiv.getPixivImage(match[2])
					.then(pixiv.getImageUrlsFromManga));
			}
		});

		return q.all(pixivPromises);
	}
	
	function split(arr, condition) {		
		var res = [];
		res[0] = [];
		res[1] = [];
		for (var i = 0; i < arr.length; i++) {
			if (condition(i, arr[i])) {
				res[0].push(arr[i]);
			} else {
				res[1].push(arr[i]);
			}
		}
		return res;
	}

	function checkTitle(message, items) {
		if (items > 1) {
			// we match on either single or double quote titles
			var titleMatches = message.match(/"([^"]+)"|'([^']+)'/);
			if(!titleMatches || titleMatches.length === 0) { 
				return false;
			}
		
			var title = titleMatches[0];
			return title.substring(1, title.length - 1);
		}

		return false;
	}

	return {
		commands: {
			rb: function (from, channel, message) {
				var albumTitle;
				// check if the message possibly contains multiple images
				var length = message.split(' ').length;
				if (length > 1 && !(albumTitle = checkTitle(message, length))) {
					client.say(channel, from + ', your album doesn\'t have a title! (Make sure you put quotes around your title.)');
					return;
				}

				// We remove the title from the message to split
				message = message.substring(albumTitle? albumTitle.length + 2 : 0);

				// Filter for empty uploads
				var uploads = message.split(' ').filter(function(element) {
					return !(element === '' || element === null || element === undefined);
				});


				var splitUploads = split(uploads, function(index, item) {
					return pixiv.pixivNetRe.exec(item) || pixiv.pixivComRe.exec(item);
				});

				uploads = splitUploads[1];

				// We do the album size check after retrieving the pixiv images to make sure we don't have giant albums in our uploads
				retrievePixivImages(splitUploads[0])
					.then(function (results) {
						uploads = uploads.concat.apply(uploads, results);

						if (uploads.length === 0) {
							throw 'your upload request did not contain any uploads!';
						}

						var hasCorrectTitle = albumTitle || (albumTitle = checkTitle(message, uploads.length));
						if (uploads.length > 1 && !hasCorrectTitle) {
							throw 'your album doesn\'t have a title! (Make sure you put quotes around your title.)';
						}

						if (uploads.length >= 12) {
							throw 'stop trying to break me with that many images! Most subreddits don\'t allow more than 12 images per album anyway.';
						}
						
						return uploads;	
					}, function (error) {
						console.log(error);

						// Because mentioning missing image count makes zero sense for users
						if (error === pixiv.errors.missingImageCount) {
							error = 'something went wrong while trying to get your images from Pixiv';
						}

						throw error;
					})
					.then(function(uploads) {
						var uploadPromises = [];
						uploads.forEach(function (item) {
							uploadPromises.push(uploadImage(item));
						});

						return q.all(uploadPromises);
					})
					.then(uploadAlbum.bind(null, albumTitle))
					.then(function (albumUrl) {
						client.say(channel, from + ', ' + albumUrl);
					})
					.fail(function (error) {
						client.say(channel, from + ', ' + error);
					});
			}
		}
	};
};
