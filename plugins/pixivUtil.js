var q = require('q');
var request = q.denodeify(require('request'));

var getIllustrationFromArray = function (arr) {	
	arr.forEach(function (item, index, arr) {
		arr[index] = item.replace(/\"/g, "");
	});

	return {
		//Below parameters are part of every Pixiv object (illustration, manga, novel)
		id: parseInt(arr[0]),
		authorId: parseInt(arr[1]),
		title: arr[3],
		authorname: arr[5],
		date: arr[12],
		caption: arr[18],
		tags: arr[13].split(' '),
		feedback: parseInt(arr[15]) || 0,
		points: parseInt(arr[16]) || 0,
		views: parseInt(arr[17]) || 0,
		bookmarks: parseInt(arr[22]) || 0,
		//Below parameters are part of every Pixiv Illustration
		extension: arr[2],
		server: arr[4],
		thumburl: arr[6],
		mobileurl: arr[9],
		tool: arr[14]
	};
};

var self = module.exports = {
	errors : {
		missingImageCount: 'failed to retrieve image count for image',
		unableToRetrieveIllust: 'failed while retrieving illustration',
		unableToRetrieveManga: 'failed while retrieving manga',
		unableToRetrieveUgoira: 'there is currently no support for ugoira'
	},

	pixivComRe: /https?:\/\/(www.)?pixiv\.com\/works\/(\d+)/i,
	pixivNetRe: /https?:\/\/(www.)?pixiv.net\/member_illust.php\?(([^&]+)&)?illust_id=([\d]+)/i,

	// Checks whether the requested image is an illustration or a manga and returns the appropriate result.
	// Illustrations get wrapped in an array as to provide consistent behavior for the callback
	getPixivImage: function (id) {
		//manga.php always returns the correct count, unlike illust.php
		var countUrl = 'http://spapi.pixiv.net/iphone/manga.php?illust_id=' + id + '&c_mode=count';
		return request(countUrl)
			.then(function (response) { 
			var count = parseInt(response[0].body);
			if (response[0].statusCode != 200 || isNaN(count)) {
				throw self.errors.missingImageCount;
			}
			
			var apiResult; 
			if(count > 1) {
				return self.getPixivManga(id);
			} else {
				return self.getPixivIllustration(id)
					.then(function (illust) { 
						return [ illust ]; 
					});
			}
		});
	},

	getPixivIllustration: function (id) {
		var apiCall = 'http://spapi.pixiv.net/iphone/illust.php?illust_id=' + id;
		return request(apiCall)
			.then(function (response) {
				if (response[0].statusCode != 200) {
					throw self.errrors.unableToRetrieveIllust;
				}
				var parts = response[0].body.split(',');
				var img = getIllustrationFromArray(parts);
				if (img.tags.length > 0 && img.tags.indexOf('うごイラ') != -1) {
					throw self.errors.unableToRetrieveUgoira;
				}

				return img;
			});
	},

	getPixivManga: function (id) {
		var apiCall = 'http://spapi.pixiv.net/iphone/manga.php?illust_id=' + id;
		return request(apiCall)
			.then(function (response) {
				if (response[0].statusCode != 200) {
					throw self.errors.unableToRetrieveManga;
				}
				var images = [];
				var arr = response[0].body.split(',');
				
				for(var i = 0; i < arr.length - 30; i+=30) {
					var part = arr.slice(i, i + 30);
					var img = getIllustrationFromArray(part);
					if (img.tags.length > 0 && img.tags.indexOf('うごイラ') != -1) {
						throw self.errors.unableToRetrieveUgoira;
					}
					images.push(img);
				}

				return images;
			});
	},

	//The only way to get the correct image from the pixiv illustration is by rewriting the mobileUrl
	getImageUrlFromIllustration: function (illust) {
		var mobileUrl = illust.mobileurl;

		// Single image style 1
		var re = /^(.+)mobile\/(.+)_480mw(_p\d+)?\./i;
		var match = re.exec(mobileUrl);
		if (match) {
			return match[1] + match[2] + (match[3] || "") + '.' + illust.extension;
		}

		// Single image style 2
		re = /^(.+)\/c\/(.+)\/img-master(.+)_480mw\./i;
		match = re.exec(mobileUrl);
		if (match) {
			return match[1] + '/img-original' + match[3] + '_p0.' + illust.extension;
		}
		
		re = /^(.+)\/c\/(.+)\/img-master(.+)_480mw(_p\d+)/i;
		match = re.exec(mobileUrl);
		if (match) {
			return match[1] + '/c/1200x1200/img-master' + match[3] + match[4] + '_master1200.' + illust.extension;
		}
	},
	
	getImageUrlsFromManga: function (manga) {
		var imageUrls = [];
		
		manga.forEach(function(illust) {
			imageUrls.push(self.getImageUrlFromIllustration(illust));
		});
		
		return imageUrls;
	}
};
