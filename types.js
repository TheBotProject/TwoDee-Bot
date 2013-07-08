var fs = require('fs');

function Configuration() {
    this.channel = ''; // TODO: Multi-channel support
    this.reddits = [];
    this.nick = '';
    this.password = '';
    this.server = '';
    this.plugins = [];
    return this;
};

function saveConfiguration(path, config, callback) {
    fs.writeFile(path, JSON.stringify(config, null, 2), callback);
};

function loadConfiguration(path, callback) {
    fs.readFile(path, function(err, data) {
        if (err) throw err;
        callback(JSON.parse(data));
    });
};

exports.Configuration = Configuration;
exports.saveConfiguration = saveConfiguration;
exports.loadConfiguration = loadConfiguration;
