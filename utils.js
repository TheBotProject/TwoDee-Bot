var request = require('request');

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

  // a URL shortener function, using google's goo.gl service
  // see https://developers.google.com/url-shortener/v1/getting_started
  shortenURL: function(url, cb) {
    function retry(times) {
      times--;

      request.post(
        {
          url: 'https://www.googleapis.com/urlshortener/v1/url',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ longUrl: url }),
        },
        function(err, resp, body) {
          if (err) {
            console.error(
              "Couldn't shorten url! (" +
                (times || 'no') +
                ' more retries) Error: ' +
                err
            );

            if (times) {
              retry(times);
            } else {
              cb(err, null);
            }

            return;
          }

          if (resp.statusCode < 200 || resp.statusCode >= 300) {
            console.error(
              'Error: Google responded with a ' +
                resp.statusCode +
                ' status code. (' +
                (times || 'no') +
                ' more retries)'
            );

            if (times) {
              retry(times);
            } else {
              cb(
                new Error(
                  'Failed to shorten URL: Google responded with a ' +
                    resp.statusCode +
                    ' status code.'
                ),
                null
              );
            }

            return;
          }

          cb(null, JSON.parse(body).id);
        }
      );
    }

    retry(3);
  },

  // converts a positive integer in seconds to a HH:MM:SS format string
  // (HH: omitted if < 1 hour; leading zero in seconds and minutes (if >= 1 h))
  durationFormat: function(time) {
    var s = time % 60;
    time = Math.floor(time / 60);
    var m = time % 60;
    time = Math.floor(time / 60);
    var h = time % 60;

    var str = '';
    if (h > 0) {
      // if hours - [h]h:mm:ss
      // otherwise - just [m]m:ss
      str = h + ':';
      if (m < 10) {
        str += 0;
      }
    }

    str += m + ':';

    if (s < 10) {
      str += '0';
    }

    str += s;

    return str;
  },
};
