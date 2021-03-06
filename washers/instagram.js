'use strict';

var crypto = require('crypto');

/*
Base class for Instagram washers containing common methods.
input: none
output: none

On June 1 2016 Instagram changed their API and terms to prevent things like Laundry from working.
Switched to the private API by porting this PHP implementation.
https://github.com/mgp25/Instagram-API

*/
ns('Washers', global);
Washers.Instagram = function(config, job) {
    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);

    var that = this;

    // https://github.com/mgp25/Instagram-API/blob/master/src/Constants.php
    this._igApi = 'https://i.instagram.com/api/v1/';
    this._igUserAgent = 'Instagram 10.33.0 Android (18/4.3; 320dpi; 720x1280; Xiaomi; HM 1SW; armani; qcom; en_US)';
    this._igKey = '0443b39a54b05f064a4917a3d1da4d6524a3fb0878eacabf1424515051674daa';
    this._igKeyVersion = '4';

    this._jar = request.jar();

    this._requestOptions = {
        baseUrl: this._igApi,
        headers: {
            'User-Agent': this._igUserAgent
        }
    };

    this.input = _.merge({
        prompts: [{
            name: 'username',
            message: 'Your username'
        }, {
            name: 'password',
            message: 'Your password',
            type: 'password'
        }]
    }, this.input);
};

Washers.Instagram.prototype = Object.create(Washer.prototype);
Washers.Instagram.className = Helpers.buildClassName(__filename);

// https://github.com/mgp25/Instagram-API/blob/01687b861cf328cef9fa5e36c6b9446fd0908a7a/src/Instagram.php#L80
Washers.Instagram.prototype.login = function(callback) {
    var that = this;

    this._igUuid = this._igUuid || this.generateUUID(true);
    this._igDeviceId = this._igDeviceId || this.generateDeviceID(this.username, this.password);

    Helpers.jsonRequest(
        that.job.log,
        extend({
            method: 'POST',
            url: 'si/fetch_headers/?challenge_type=signup&guid=' + this.generateUUID(false),
            jar: that._jar,
        }, that._requestOptions),
        function(result, response) {
            var data = {
                'phone_id': that.generateUUID(true),
                'username': that.username,
                'guid': that._igUuid,
                'device_id': that._igDeviceId,
                'password': that.password,
                'login_attempt_count': '0'
            };

            Helpers.jsonRequest(that.job.log,
                extend({
                    method: 'POST',
                    url: 'accounts/login/',
                    jar: that._jar,
                    form: that.generateSignature(JSON.stringify(data))
                }, that._requestOptions),
                function(result, response) {
                    that._igUsernameId = result.logged_in_user.pk;
                    that._igRankToken = that._igUsernameId + '_' + that._igUuid;
                    that.job.log.info(util.format('Logged in as %s', result.logged_in_user.username));
                    callback();
                },
                callback);
        },
        callback);
    return;
};

// https://github.com/mgp25/Instagram-API/blob/01687b861cf328cef9fa5e36c6b9446fd0908a7a/src/Instagram.php#L1607
Washers.Instagram.prototype.generateUUID = function(dashes) {
    return util.format(dashes ? '%s%s-%s-%s-%s-%s%s%s' : '%s%s%s%s%s%s%s%s',
        Math.round(Math.random() * 65535).toString(16),
        Math.round(Math.random() * 65535).toString(16),
        Math.round(Math.random() * 65535).toString(16), (Math.round(Math.random() * 4095) | 0x4000).toString(16), (Math.round(Math.random() * 16383) | 0x8000).toString(16),
        Math.round(Math.random() * 65535).toString(16),
        Math.round(Math.random() * 65535).toString(16),
        Math.round(Math.random() * 65535).toString(16)
    );
};

// https://github.com/mgp25/Instagram-API/blob/01687b861cf328cef9fa5e36c6b9446fd0908a7a/src/Instagram.php#L1599
Washers.Instagram.prototype.generateDeviceID = function(username, password) {
    var shasum = crypto.createHash('md5');
    shasum.update(username + password, 'utf8');
    var seed = shasum.digest('hex');

    var volatile_seed = fs.statSync(__dirname).mtime.getTime();
    shasum = crypto.createHash('md5');
    shasum.update(seed + volatile_seed, 'utf8');

    var id = shasum.digest('hex');
    id = 'android-' + id.substr(0, 16);

    return id;
};

// https://github.com/mgp25/Instagram-API/blob/01687b861cf328cef9fa5e36c6b9446fd0908a7a/src/Instagram.php#L1592
Washers.Instagram.prototype.generateSignature = function(data) {
    var hash = crypto.createHmac('sha256', this._igKey);
    hash.update(data);
    var signature = hash.digest('hex');
    return {
        ig_sig_key_version: this._igKeyVersion,
        signed_body: signature + '.' + (data)
    };
};


// Helper method for API endpoints which return a list of posts.
Washers.Instagram.prototype.requestMedia = function(method, quantity, callback) {
    var that = this;
    var posts = [];
    var nextMax = null;
    async.doWhilst(function(callback) {
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    jar: that._jar,
                    url: method,
                    qs: {
                        max_id: nextMax ? nextMax : ''
                    }
                }, that._requestOptions),
                function(response) {
                    posts = posts.concat(response.items);
                    that.job.log.debug(util.format('Got %d/%d posts', posts.length, quantity));
                    nextMax = response.next_max_id ? response.next_max_id.toString() : null;
                    callback();
                },
                callback);
        },
        function() {
            return posts.length < quantity && nextMax;
        },
        function(err) {
            posts = posts.slice(0, quantity);
            callback(err, posts);
        });
};


module.exports = Washers.Instagram;
