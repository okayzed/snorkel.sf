"use strict";

var config = require('./config');
var host = "localhost";
var server_options = {
  auto_reconnect: true
};

var db_options = {
  journal: 1
};

var context = require_core("server/context");
var mongodb = require("mongodb"),
    port = mongodb.Connection.DEFAULT_PORT;

var EventEmitter = require("events").EventEmitter;

var separator = "/";
function collection_builder(db_name, before_create) {
  var db_url = config.backend && config.backend.db_url;
  var _db;
  var _created = {};
  var arbiter = new EventEmitter();

  if (db_url) {
    var options = {
      uri_decode_auth: true,
      server: server_options,
      db: db_options
    };
    mongodb.connect(db_url, options, onOpened);
  } else {
    var mongoserver = new mongodb.Server(host, port, server_options);
    var db_connector = new mongodb.Db(db_name, mongoserver, db_options);
    db_connector.open(onOpened);
  }
  
  function onOpened(err, db) {
    // TODO: report errors somewhere?
    if (err) return;
    _db = db;
    arbiter.emit("db_open", db);
  }

  return {
    get: function() {
      var cb;
      var args = _.toArray(arguments);
      var last = args.pop();

      if (_.isFunction(last)) {
        cb = last;
      } else {
        args.push(last);
      }

      var db_name = args.join(separator);

      if (!_db && !cb) {
        throw("Trying to access DB before its been initialized");
      } else if (!_db) {
        return arbiter.once("db_open", function(db) {
          if (!_created[db_name] && before_create) {
            before_create(_db, db_name);
          }
          _created[db_name] = true;

          var collection = db.collection(db_name);
          cb(collection);
        });
      }


      if (!_created[db_name] && before_create) {
        before_create(_db, db_name);
      }

      var collection = _db.collection(db_name);
      _created[db_name] = true;
      if (cb) {
        cb(collection);
      }

      return collection;
    },
    raw: function() {
      return _db;
    }
  };
}

var jank_db = collection_builder("jank");
module.exports = {
  get: jank_db.get,
  raw: jank_db.raw,
  db: collection_builder
};
