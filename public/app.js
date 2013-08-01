var app = angular.module('MoeBot', []);
app.factory('socket', function ($rootScope) {
	var socket = io.connect();
	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		emit: function (eventName, data, callback) {
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			})
		}
	};
});

app.controller('PictureCtrl', ['$scope', 'socket', function ($scope, socket) {
	$scope.pictures = [];

	var date = new Date();
	var partKey = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()).toString();
	socket.emit('images', partKey, function (images) {
		$scope.pictures = images;
	});
	socket.on('image', function(image) {
		$scope.pictures.push(image.blob);
	});
}]);