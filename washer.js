'use strict';

// Base class for washers. Washers can accept input from the web, parse it into general-purpose objects,
// and return it to other washers which output those objects to other formats.
var Washer = function(config, job) {
    this._job = job;

    // The user-facing name of the washer. Leave empty to not show it as an option.
    this.name = null;

    // The internal name.
    this.className = Helpers.buildClassName(__filename);

    // An object describing the input function of this washer, if any. It contains a user-facing
    // description of the functionality, and an array of settings required to configure it.
    /*
        description: 'Loads data from an RSS feed.',
        settings: [{
            name: 'url',
            prompt: 'What RSS feed URL do you want to launder?',
            beforeEntry: function(rl, job, prompt, callback(required, prompt, suggest)),
            afterEntry: function(rl, job, oldValue, newValue, callback(err))
        }]
    */
    this.input = null;

    // An object describing the output function of this washer, if any. Format is the same
    // as input.
    this.output = null;

    // Any configuration object passed in is copied as public properties of the class.
    if (config) {
        for (var i in config) {
            this[i] = config[i];
        }
    }
};

Washer.className = Helpers.buildClassName(__filename);

Washer.storageModeSetting = {
    name: 'storageMode',
    prompt: 'How do you want to save the output? Options are "local", "s3", or "none".',
    afterEntry: function(rl, job, oldValue, newValue, callback) {
        newValue = newValue.toLowerCase();
        callback(newValue !== 'local' && newValue !== 's3' && newValue !== 'none');
    }
};

// Remove stuff from the washer that's saved to disk.
Washer.prototype.stringify = function() {
    var c = _.clone(this);
    delete c.input;
    delete c.output;
    delete c.name;
    for (var i in c) {
        if (i.indexOf('_') === 0) {
            delete(c[i]);
        }
    }
    return c;
};

Washer.prototype.doInput = function(callback) {
    callback(null, []);
};

Washer.prototype.doOutput = function(items, callback) {
    callback(null);
};

module.exports = Washer;
