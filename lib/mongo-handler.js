var mongodb = require('mongodb');
var mongoHosts = require('./mongo-hosts');
var conf = require('../conf/config');
var logger = require('./logger').appLogger;

function MongoDB(id) {
	logger.debug('Create new MongoDB. id:',id);
	var sInfo = mongoHosts.getHost(id);
	var _mongoDB, dbConn, adminDB, _err;

	this.getId = function() {
		return sInfo ? sInfo.id : null;
	};

	this.getServerInfo = function() {
		return sInfo;
	};

	this.open = function(cb) {
		_mongoDB && _mongoDB.close();
		if(sInfo) {
			_mongoDB = new mongodb.Db('local', new mongodb.Server(sInfo.host, sInfo.port, conf.connect_options));
			_mongoDB.open(function(err, db) {
				if(err) {
					_err = err;
					logger.error('mongodb open failed; ', err);
					cb(err);
				} else {
					dbConn = db;
					adminDB = db.admin();
					if(sInfo.user && sInfo.user.length === 0) {
						adminDB.authenticate(sInfo.user, sInfo.password, function (err, result) {
							err && logger.error('admin db authentication failed; ', err);
							_err = err;
							cb(err);
						});
					} else {
						_err = null;
						cb();
					}
				}
			});
		} else {
			_err = 'Invalid connection info: Check mongodb connection config file(conf/hosts.json)';
			cb(_err);
		}
	};

	this.getErr = function() {
		return _err;
	};

	this.getDBConn = function() {
		return dbConn;
	};

	this.getAdminDB = function() {
		return adminDB;
	};

	this.close = function(cb) {
		_mongoDB && _mongoDB.close();
		cb && cb();
	}
}

module.exports.MongoDB = MongoDB;
