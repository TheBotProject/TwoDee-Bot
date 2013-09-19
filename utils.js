module.exports = {

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
