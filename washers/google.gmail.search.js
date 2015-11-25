'use strict';

/*
Gmail Search washer
input: converts mails from a Gmail search into items
output: null
*/
ns('Washers.Google.Gmail', global);
Washers.Google.Gmail.Search = function(config, job) {
    Washers.Google.Gmail.call(this, config, job);

    this.name = 'Gmail/Search';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads mails from a Gmail search query.',
        settings: [{
            name: 'query',
            prompt: 'What is the Gmail search query?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Google.Gmail.Search.prototype = Object.create(Washers.Google.Gmail.prototype);
Washers.Google.Gmail.Search.className = Helpers.buildClassName(__filename);

Washers.Google.Gmail.Search.prototype.doInput = function(callback) {
    var that = this;
    var items = [];

    async.waterfall([
        // Update access token
        function(callback) {
            that.refreshAccessToken(callback);
        },

        function(callback) {
            // https://developers.google.com/gmail/api/v1/reference/users/messages/list
            log.debug('Getting messages for query ' + that.query);
            var messages = [];

            // Request messages matching the query -- seems to return 100 by default, fine for now.
            Helpers.jsonRequest(
                extend({
                    url: '/users/me/messages',
                    qs: {
                        q: that.query
                    }
                }, that._requestOptions),
                function(result) {

                    // Request each actual message.
                    async.eachLimit(result.messages, 10, function(message, callback) {
                        Helpers.jsonRequest(
                            extend({
                                url: '/users/me/messages/' + message.id,
                                qs: {
                                    format: 'full'
                                }
                            }, that._requestOptions),
                            function(result) {
                                messages.push(result);
                                callback();
                            },
                            callback);
                    }, function(err) {
                        callback(err, messages);
                    });
                },
                callback);
        }
    ], function(err, messages) {
        if (err) {
            callback(err);
            return;
        }

        Item.download(Items.Google.Gmail.Message, that, messages, callback);
    });
};

module.exports = Washers.Google.Gmail.Search;