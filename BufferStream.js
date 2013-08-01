var util = require('util');
var Readable = require('stream').Readable;

function BufferStream(str, options) {
	if (!(this instanceof BufferStream))
		return new BufferStream(str, options);

	Readable.call(this, options);

	this._finished = false;
	this.data = str;
}

util.inherits(BufferStream, Readable);

module.exports = BufferStream;

BufferStream.prototype._read = function () {
	if (this._finished) {
		this.push(null);
	} else {
		this.push(this.data);
		this._finished = true;
	}
};

BufferStream.prototype.destroy = function () {
	delete this.data;
};