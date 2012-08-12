#!/usr/bin/env node

var vows = require('vows'),
    assert = require('assert'),
    request = require('request'),
    async = require('async'),
    baseurl = 'http://127.0.0.1:32773/server-slim',
    j1 = request.jar(),
    j2 = request.jar(),
    userdata1 = {},
    userdata2 = {},
    cid1 = 'cid_1',
    cid2 = 'cid_2';

vows.describe('Channels system messages').addBatch({

  'when a user1 join a channel': {
    topic: function () {
      var self = this;

      // auth
      request({
        method: 'GET',
        url: baseurl+'/auth',
        headers: { 'Pfc-Authorization': 'Basic '+new Buffer("testchms:testchpassword").toString('base64') }, 
        jar: j1,
      }, function (err, res, body) {
        userdata1 = JSON.parse(body);

        // join the channel cid1
        request({
          method: 'PUT',
          url: baseurl+'/channels/'+cid1+'/users/'+userdata1.id,
          jar: j1,
        }, function (err, res, body) {

          // user1 read his pending messages
          request({
            method: 'GET',
            url: baseurl+'/users/'+userdata1.id+'/msg/',
            jar: j1,
          }, self.callback);

        });

      });
    },
    'server does not return any system message': function (error, res, body) {
      user1msg = JSON.parse(body);
      assert.lengthOf(user1msg, 0);
    },

    'and user2 joins': {
      topic: function () {
        var self = this;
        var user1msg = [];
        var user2msg = [];
        var requests = [
          // [0] auth u2
          function USER2LOGIN(callback) {
            request({
              method: 'GET',
              url: baseurl+'/auth',
              headers: { 'Pfc-Authorization': 'Basic '+new Buffer("testchmsg2:password").toString('base64') }, 
              jar: j2,
            }, function (err, res, body) {
              userdata2 = JSON.parse(body); 
              callback(err, res, body);
            });
          },
          // [1] u2 join cid1
          function USER2JOIN(callback) {
            request({
              method: 'PUT',
              url: baseurl+'/channels/'+cid1+'/users/'+userdata2.id,
              jar: j2,
            }, callback);
          },
          // [2] u1 read pending msg
          function USER1READMSG(callback) {
            request({
              method: 'GET',
              url: baseurl+'/users/'+userdata1.id+'/msg/',
              jar: j1,
            }, function (err, res, body) {
              user1msg = JSON.parse(body);
              callback(err, res, body);
            });
          },
          // [3] u2 read pending msg
          function USER2READMSG(callback) {
            request({
              method: 'GET',
              url: baseurl+'/users/'+userdata2.id+'/msg/',
              jar: j2,
            }, function (err, res, body) {
              user2msg = JSON.parse(body);
              callback(err, res, body);
            });
          },
        ];

        // store function names in the steps array
        // so following asserts are easier to read
        var steps = {};
        requests.forEach(function (fn, i) {
          steps[fn.name] = i;
        });

        // run the function array in a sequential order
        // each function result is stored in the 'results' array
        async.series(requests, function (error, results) {
          self.callback(null, user1msg, user2msg);
        });

      },

      'server does not return any system message to user2': function (err, user1msg, user2msg) {
        assert.lengthOf(user2msg, 0);
      },
      'server returns a join system message to user1': function (err, user1msg, user2msg) {
        assert.lengthOf(user1msg, 1);
      },
      
      'and user1 leave the channel': {
        topic: function () {
          var self = this;
          var user1msg = user2msg = [];

          var requests = [
            // [0] u1 leave cid1
            function USER1LEAVE(callback) {
              request({
                method: 'DELETE',
                url: baseurl+'/channels/'+cid1+'/users/'+userdata1.id,
                jar: j1,
              }, callback);
            },
            // [1] u1 read pending msg
            function USER1READMSG(callback) {
              request({
                method: 'GET',
                url: baseurl+'/users/'+userdata1.id+'/msg/',
                jar: j1,
              }, function (err, res, body) {
                user1msg = []; // todo <- body
                callback(err, res, body);
              });
            },
            // [2] u2 read pending msg
            function USER2READMSG(callback) {
              request({
                method: 'GET',
                url: baseurl+'/users/'+userdata2.id+'/msg/',
                jar: j2,
              }, function (err, res, body) {
                user2msg = []; // todo <- body
                callback(err, res, body);
              });
            },
          ];

          // store function names in the steps array
          // so following asserts are easier to read
          var steps = {};
          requests.forEach(function (fn, i) {
            steps[fn.name] = i;
          });

          // run the function array in a sequential order
          // each function result is stored in the 'results' array
          async.series(requests, function (error, results) {
            self.callback(error, user1msg, user2msg);
          });

        },
        'server does not return any system message to user1': function (err, user1msg, user2msg) {
          assert.ok(false);
        },
        'server returns a leave system message to user2': function (err, user1msg, user2msg) {
          assert.ok(false);
        },
      },

    },
  },

}).export(module);
