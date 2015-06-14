#!/usr/bin/env node

'use strict';

var start = Date.now();
global.log = require('winston'); // https://github.com/winstonjs/winston
global._ = require('lodash'); // https://lodash.com/docs
global.ns = require('simple-namespace'); // https://www.npmjs.com/package/simple-namespace
global.fs = require('fs-extra'); // https://www.npmjs.com/package/fs.extra
global.path = require('path'); // https://nodejs.org/api/path.html
global.async = require('async'); // https://www.npmjs.com/package/async
global.moment = require('moment'); // http://momentjs.com/docs/
global.util = require('util'); // https://nodejs.org/api/util.html

// Load internal classes into the global namespace. (Is this totally bad form?)
global.Job = require('./job');

// Washer class files specified in order of inheritance
global.Washer = require('./washer');
var washerFiles = [
    'rss.js',
    'google.js',
    'google.youtube.js',
    'google.youtube.subscriptions.js',
    'google.youtube.channel.js',
    'instagram.js',
    'instagram.timeline.js'
];
global.allWashers = {};
washerFiles.forEach(function(file) {
    allWashers[file.replace('.js', '')] = require(path.join(__dirname, 'washers', file));
});

// Item class files specified in order of inheritance
global.Item = require('./item');
var itemFiles = [
    'rss.js',
    'google.youtube.video.js',
    'instagram.media.js'
];
global.allItems = {};
itemFiles.forEach(function(file) {
    allItems[file.replace('.js', '')] = require(path.join(__dirname, 'items', file));
});

// Make config folder
var home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
var configFolder = path.join(home, '.laundry');
if (!fs.existsSync(configFolder)) {
    fs.mkdirSync(configFolder);
    fs.mkdirSync(path.join(configFolder, 'logs'));
}
global.configFolder = configFolder;

// Configure logging
log.remove(log.transports.Console);
log.add(log.transports.Console, {
    colorize: true
});
log.add(log.transports.DailyRotateFile, {
    filename: path.join(configFolder, 'logs', 'laundry'),
    json: false,
    datePattern: '.yyyy-MM-dd.log',
    maxFiles: 90
});
log.level = 'debug';

// Utility methods
_.oldMerge = _.merge;
_.merge = function(object, sources, customizer, thisArg) {
    return _.oldMerge(object, sources, function(a, b) {
        if (_.isArray(a)) {
            return a.concat(b);
        }
    }, thisArg);
};

// Parse arguments
var args = process.argv.slice(2);

var command = '';
if (args.length > 0) {
    command = args.shift().trim().toLowerCase();
}

var job = '';
if (args.length > 0) {
    job = args.shift().trim().toLowerCase();
}

// Do stuff
var laundry = require('./laundry');

if (laundry.isCommand(command)) {
    laundry.doCommand(command, job, onComplete);
} else {
    laundry.help(onComplete);
}

function onComplete() {
    log.debug(Date.now() - start + 'ms');
}