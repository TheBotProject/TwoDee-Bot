var util = require('util');
var Readable = require('stream').Readable;

function BufferStream(str, options) {
  if (!(this instanceof BufferStream)) return new BufferStream(str, options);

  Readable.call(this, options);

  this.data = str;
}

util.inherits(BufferStream, Readable);

module.exports = BufferStream;

BufferStream.prototype._read = function() {
  this.push(this.data);
  this.data = null;
};
