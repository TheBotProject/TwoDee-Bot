var request = require('request');

module.exports = function (client) { 
	function uploadAlbum(albumTitle, imageIds, callback) { 
		var uploadRequest = {
			url: 'http://redditbooru.com/images/',
			headers: {
				Referer: 'http://redditbooru.com/',
				//quoted because js variables break on dashes
				'Content-type': 'application/x-www-form-urlencoded'
			},
			body: getBody(albumTitle, imageIds)
			
		}

		return request.post(uploadRequest, callback); 
	};

	//We construct the body ourselves because the json in the request form doesn't fancy non-unique keys, which is what's being used in dxprog's http requests
	function getBody(title, images) {
		var body = '';
		if (title) {
			body = 'albumTitle=' + title + '&';
		}

		var imageUris = [], index;
		for (index = 0; index < images.length; index++) {
			imageUris.push(encodeURIComponent('imageId[]') + '=' + images[index]);
		}
		
		body += imageUris.join('&');

		return body;
	}

	return {
		commands: {
			rb: function (from, channel, message) {
				var albumTitle;
				// check if the message possibly contains multiple images
				if (message.split(' ').length > 1) {
					// we match on either single or double quote titles
					var titleMatches = message.match(/"([^"]+)"|'([^']+)'/);
					if(!titleMatches || titleMatches.length === 0) { 
						client.say(channel, from + ', your album doesn\'t have a title (make sure you put quotes around your title!)');
						return;
					}
					
					albumTitle = titleMatches[0];
					albumTitle = albumTitle.substring(1, albumTitle.length - 1);
				}

				// We remove the title from the message to split
				message = message.substring(albumTitle? albumTitle.length + 2 : 0);

				// Filter for empty uploads
				var uploads = message.split(' ').filter(function(element) {
					return !(element === '' || element === null || element === undefined);
				});

				if (uploads.length === 0) {
					client.say(channel, from + ', your upload request did not contain any uploads!');
					return;
				}

				if (uploads.length >= 12) {
					client.say(channel, from + ', stop trying to break me with that many images. Also, most subreddits don\'t allow more than 12 images per album');
					return
				}

				var imageIds = [];
				var index, completed = 0;

				for (index = 0; index < uploads.length; index++) {	
					// We use force=true because otherwise redditbooru doesn't return with a proper imageId to upload.
					var uri = 'http://redditbooru.com/upload/?action=upload&force=true&imageUrl=' + encodeURIComponent(uploads[index]);
					request.post(uri, function(error, response, body) {
						var jsonResponse = JSON.parse(body);
						if (jsonResponse.error) {
							client.say(channel, from + ', ' + jsonResponse.uploadId + ' is not a valid image.');
							return;
						}
					
						imageIds.push(jsonResponse.imageId);
						
						completed++;
						if (completed === uploads.length) {
							uploadAlbum(albumTitle, imageIds, function(error, response, body) { 
								var jsonResponse;
								try {								
									jsonResponse = JSON.parse(body);								
								}
								catch (e) {
									console.log('Failed parsing response: ' + response + '\n error: ' + e);
								}

								if (jsonResponse && (jsonResponse.redirect || jsonResponse.route)) {
									//if it's a single image, redirect is used. Otherwise it uses route
									client.say(channel, from + ', ' + (jsonResponse.redirect || ('http://redditbooru.com' +  jsonResponse.route)));
								} else {
									client.say(channel, from + ', something went wrong while trying to upload your image(s)');
								}
							});

						}
					});	
				}
			}
		}
	}
}
