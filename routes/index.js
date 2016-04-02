var _ = require('underscore');
var async = require('async');
var mongodb = require('mongodb');
var os = require('os');
var mongoHosts = require('../lib/mongo-hosts');
var bson = require('../lib/bson');
var utils = require('../lib/utils');
var logger = require('../lib/logger').appLogger;

var moduleName = utils.getFileName(module.filename);

exports.index = function(req, res) {
	logger.debug('['+moduleName+'][index] Response MongoBrowser main page');
	var hostId = req.mongoDB.getId();
	if(!hostId) {
		logger.debug('['+moduleName+'][index] MongoDB server not selected');
		var defHost = mongoHosts.getDefaultHost();
		defHost && (hostId = defHost.id);
		logger.debug('['+moduleName+'][index] Selecting default host; host id:%s', hostId);
	}
	res.render('index', {
		hostId: hostId
	});
};

exports.getTree = function(req, res) {
	var mongoDB = req.mongoDB;
	var dbName = req.query.db;
	if(!dbName || dbName === '#') {
		logger.debug('['+moduleName+'][getTree] Get database list');
		getDbTree(mongoDB, function(err, list) {
			res.json(list);
		});
	} else {
		logger.debug('['+moduleName+'][getTree] Get collection list for %s', dbName);
		getCollTree(mongoDB, dbName, function(err, list) {
			res.json(list);
		});
	}
};

function getDbTree(mongoDB, cb) {
	logger.debug('['+moduleName+'][getDbTree] Get database list');

	var tree = {
		"id": "MongoDB",
		"text": "MongoDB",
		"icon": "glyphicon glyphicon-home",
		"a_attr": { "data-type": "server", "data-value": "MongoDB" },
		"children": []
	};

	var admDb = mongoDB.getAdminDB();
	if(!admDb) {
		logger.warn('['+moduleName+'][getDbTree] Invalid MongoDB admin object!');
		cb(mongoDB.getErr() || 'Invalid MongoDB admin object', [tree]);
		return;
	}

	async.waterfall([
		function(cb) {
			admDb.serverStatus(cb);
		},
		function(status, cb) {
			tree.id = status.host.replace(/[/.,]/g, '__');
			tree.text = status.host;
			tree.a_attr["data-value"] = status.host;
			admDb.listDatabases(cb);
		}
	], function(err, dbs) {
		if(err) {
			logger.error('['+moduleName+'][getDbTree] MongoDB listDatabases select error; ', err);
		} else {
			var list = [];
			dbs.databases.forEach(function(db) {
				var dbName = db.name;
				list.push({
					"id": dbName.replace(/[/.,]/g, '__'),
					"text": dbName,
					"icon": "/img/icon/database.png",
					"a_attr": { "data-type": "database", "data-value": dbName },
					"children": true
				});
			});
			tree.children = _.sortBy(list, 'text');
		}
		cb(err, [tree]);
	});
}

function getCollTree(mongoDB, dbName, cb) {
	var list = [];

	var dbConn =  mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][getCollTree] Invalid MongoDB connection object!');
		cb(mongoDB.getErr() || 'Invalid MongoDB connection object', list);
		return;
	}

	var db = dbConn.db(dbName);
	db.collections(function(err, collections) {
		if(err) {
			logger.error('['+moduleName+'][getCollTree] MongoDB collections select error; ', err);
		} else {
			var coll, icon;
			collections.forEach(function(collection) {
				coll = collection.s.name;
				if(coll === 'system.users') {
					icon = '/img/icon/users.png'
				} else if(coll === 'system.js') {
					icon = '/img/icon/function.png'
				} else {
					icon = '/img/icon/collection.png';
				}
				list.push({
					"id": dbName+'__'+coll.replace(/[/.,]/g, '__'),
					"text": coll,
					"icon": icon,
					"a_attr": { "data-type": "collection", "data-value": dbName+'/'+coll },
					"children": false
				});
			});
			list = _.sortBy(list, 'text');
		}
		cb(err, list);
	});
}

exports.getServerStatus = function(req, res) {
	logger.debug('['+moduleName+'][getServerStatus] View server status');

	var data = {};
	var mongoDB = req.mongoDB;
	var admDb = mongoDB.getAdminDB();
	if(!admDb) {
		logger.warn('['+moduleName+'][getServerStatus] Invalid MongoDB admin object!');
		data.result = utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB admin object';
		res.json(data);
		return;
	}

	admDb.serverStatus(function(err, info) {
		if(err) {
			logger.error('['+moduleName+'][viewServerStatus] MongoDB Database connect error; ', err);
			data.result = utils.getErrMsg(err);
		} else {
			logger.debug('['+moduleName+'][viewServerStatus] Server status; ', info.host);
			data.result = bson.toString(info);
		}
		res.json(data);
	});
};

exports.getDatabaseStats = function(req, res) {
	logger.debug('Response mongodb database stats');
	var dbName = req.params.database;
	logger.debug('['+moduleName+'][getDatabaseStats] dbName:'+dbName);

	var data = {};
	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][getDatabaseStats] Invalid MongoDB connection object!');
		data.result = utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object';
		res.json(data);
		return;
	}

	dbConn.db(dbName).stats(function(err, stats) {
		if (err) {
			logger.error('[' + moduleName + '][getDatabaseStats] database stat error; ', err);
			data.result = utils.getErrMsg(err);
		} else {
			logger.error('[' + moduleName + '][getDatabaseStats] database stat result; ', stats);
			data.result = bson.toString(stats);
		}
		res.json(data);
	});
};

exports.addDatabase = function(req, res) {
	var dbName = req.params.database;

	if(dbName === undefined || dbName.length === 0) {
		logger.error('['+moduleName+'][addDatabase] That database name is invalid.');
		res.json({ status: 403, message: 'That database name is invalid' });
		return;
	}

	//Database names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
	if(!dbName.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
		logger.error('['+moduleName+'][addDatabase] That database name is invalid. [%s]', dbName);
		res.json({ status: 403, message: 'That database name('+dbName+') is invalid.' });
		return;
	}

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][addDatabase] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var db = dbConn.db(dbName);
	db.createCollection('delete_me', function(err) {
		if(err) {
			logger.error('['+moduleName+'][addDatabase] Database create error; ', err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			logger.debug('['+moduleName+'][addDatabase] Database added; ', dbName);
			res.json({ status: 200, message: dbName });
		}
	});
};

exports.renameDatabase = function(req, res) {
	res.json({ status: 403, message: 'Currently not implemented' });
};

exports.deleteDatabase = function(req, res) {
	var dbName = req.params.database;
	logger.error('['+moduleName+'][deleteDatabase] database name: %s', dbName);

	if(dbName === undefined || dbName.length === 0) {
		logger.error('['+moduleName+'][deleteDatabase] That database name is invalid.');
		res.json({ status: 403, message: 'That database name is invalid' });
		return;
	}

	//Database names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
	if(!dbName.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
		logger.error('['+moduleName+'][deleteDatabase] That database name is invalid. [%s]', dbName);
		res.json({ status: 403, message: 'That database name('+dbName+') is invalid.' });
		return;
	}

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][deleteDatabase] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var db = dbConn.db(dbName);
	db.dropDatabase(function(err) {
		if(err) {
			logger.error('['+moduleName+'][deleteDatabase] Database delete error; ', err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			logger.debug('['+moduleName+'][deleteDatabase] Database deleted; ', dbName);
			res.json({ status: 200, message: dbName });
		}
	});
};

exports.getCollectionStats = function(req, res) {
	logger.debug('Response mongodb collection stats');
	var dbName = req.params.database;
	var colName = req.params.collection;
	logger.debug('['+moduleName+'][getCollectionStats] dbName:'+dbName);

	var data = {};
	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][getCollectionStats] Invalid MongoDB connection object!');
		data.result = utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object!';
		res.json(data);
		return;
	}

	var db = dbConn.db(dbName);
	var col = db.collection(colName);
	col.stats(function(err, stats) {
		if (err) {
			logger.error('[' + moduleName + '][getCollectionStats] collection stat error; ', err);
			data.result = utils.getErrMsg(err);

		} else {
			logger.error('[' + moduleName + '][getCollectionStats] collection stat result; ', stats);
			data.result = bson.toString(stats);
		}
		res.json(data);
	});
};

exports.addCollection = function(req, res) {
	var dbName = req.params.database;
	var colName = req.params.collection;
	logger.debug('['+moduleName+'][addCollection] dbName:'+dbName+', colName:'+colName);

	if(colName === undefined || colName.length === 0) {
		logger.warn('['+moduleName+'][addCollection] You forgot to enter a collection name!');
		res.json({ status: 403, message: 'You forgot to enter a collection name!' });
		return;
	}

	//Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
	if(!colName.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
		logger.warn('['+moduleName+'][addCollection] That collection name is invalid.');
		res.json({ status: 403, message: 'That collection name is invalid.' });
		return;
	}

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][addCollection] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var db = dbConn.db(dbName);
	db.createCollection(colName, function(err, collection) {
		if(err) {
			logger.error('['+moduleName+'][addCollection] Something went wrong; ', err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			logger.debug('['+moduleName+'][addCollection] Collection created; ', collection);
			res.json({ status: 200, message: 'OK' });
		}
	});
};

exports.renameCollection = function(req, res) {
	var dbName = req.params.database;
	var colName = req.params.collection;
	var newName = req.body.collection;
	logger.debug('['+moduleName+'][renameCollection] dbName:'+dbName+', colName:'+colName+', newCol:'+newName);

	if(newName == undefined || newName.length == 0) {
		logger.warn('['+moduleName+'][renameCollection] You forgot to enter a collection name!');
		res.json({ status: 403, message: 'You forgot to enter a collection name!' });
		return;
	}

	//Collection names must begin with a letter or underscore, and can contain only letters, underscores, numbers or dots
	if(!newName.match(/^[a-zA-Z_][a-zA-Z0-9\._]*$/)) {
		logger.warn('['+moduleName+'][renameCollection] That collection name is invalid.', newName);
		res.json({ status: 403, message: 'That collection name is invalid. collection: '+newName });
		return;
	}

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][renameCollection] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var db = dbConn.db(dbName);
	var col = db.collection(colName);
	col.rename(newName, function(err, collection) {
		if(err) {
			logger.error('['+moduleName+'][renameCollection]  Something went wrong; ', err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			logger.debug('['+moduleName+'][renameCollection]  Collection renamed; ', collection);
			res.json({ status: 200, message: 'OK' });
		}
	});
};

exports.deleteCollection = function(req, res) {
	var dbName = req.params.database;
	var colName = req.params.collection;
	logger.debug('['+moduleName+'][deleteCollection] dbName:'+dbName+', colName:'+colName);

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][deleteCollection] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var db = dbConn.db(dbName);
	var col = db.collection(colName);
	col.drop(function(err, result) {
		if(err) {
			logger.error('['+moduleName+'][deleteCollection]  Collection delete error; ', err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			logger.debug('['+moduleName+'][deleteCollection]  Collection deleted; ');
			res.json({ status: 200, message: 'OK' });
		}
	});
};

exports.exportCollection = function(req, res) {
	var dbName = req.params.database;
	var colName = req.params.collection;
	logger.debug('['+moduleName+'][exportCollection] dbName:'+dbName+', colName:'+colName);

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][exportCollection] Invalid MongoDB connection object!');
		res.render('error', {
			layout: false,
			message: 'Error',
			error: mongoDB.getErr() || 'Invalid MongoDB Object!'
		});
		return;
	}

	var db = dbConn.db(dbName);
	var col = db.collection(colName);
	col.find({}, {}).toArray(function(err, docs) {
		if(err) {
			logger.error('['+moduleName+'][exportCollection] MongoDB collection export error; ', err);
			res.render('error', {
				layout: false,
				message: 'Error',
				error: err
			});
		} else {
			logger.debug('['+moduleName+'][exportCollection] MongoDB collection export ok; ');
			res.setHeader('Content-disposition', 'attachment; filename=' + dbName + '_' + colName + '.json');
			res.setHeader('Content-type', 'application/json');
			var aItems = [];
			for(var i in docs) {
				var docStr = bson.toJsonString(docs[i]);
				aItems.push(docStr);
			}
			res.write(aItems.join(os.EOL));
			res.end();
		}
	});
};

/**
 * GET /api/mongodb/:database/:collection
 *
 * @param req
 * @param res
 */
exports.listDocument = function(req, res) {
	var dbName = req.params.database;
	var colName = req.params.collection;
	logger.debug('['+moduleName+'][listDocument] dbName:'+dbName+', colName:'+colName);

	var tabId = 'col__' + (dbName+'__'+colName).replace(/[/.,]/g, '__');
	var limit = parseInt(req.query.limit, 10) || 50;
	var skip = parseInt(req.query.skip, 10) || 0;

	var data = {
		dbname: dbName,
		collection: colName,
		tabId: tabId,
		limit: limit,
		skip: skip
	};

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][listDocument] Invalid MongoDB connection object!');
		data.stats = {};
		data.documents = utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB object';
//		res.render('browse', data);
		res.json(data);
		return;
	}

	var db = dbConn.db(dbName);
	var col = db.collection(colName);

	var conds = {};
	var options = {
		limit: limit,
		skip: skip
	};
	async.waterfall([
		function(cb) {
			col.stats(cb);
		},
		function(stats, cb) {
			data.stats = stats;
			//data.convertBytes = require('../lib/utils').convertBytes;
			col.find(conds, options).toArray(cb);
		}
	], function(err, items) {
		if(err) {
			logger.error('['+moduleName+'][listDocument] MongoDB collection documents find error; ', err);
			data.documents = err.toString();
		} else {
			var docs = [], documents = [];
			for(var i in items) {
				docs[i] = items[i];
				documents[i] = bson.toString(items[i]);
			}
			data.documents = documents.join(',\n'); //Docs converted to strings
			//data.docs = docs; //Original docs
		}
		//res.render('browse', data);
		res.json(data);
	});
};

function parseObject(obj) {
	if(obj === null || obj === undefined) {
		return obj;
	} else if(Array.isArray(obj)) {
		var arr = [];
		obj.forEach(function(item) {
			arr.push(parseObject(item));
		});
		return arr;
	} else if(typeof obj === 'object') {
		var res = {};
		var keys = Object.keys(obj);
		keys.forEach(function(key) {
			res[key] = parseObject(obj[key]);
		});
		return res;
	} else if(typeof obj === 'string') {
		return bson.toBSON(obj); //str2obj(obj);
	} else {
		console.log('other:'+obj);
		return obj;
	}
}

function str2obj(val) {
	var m1 = /ObjectId\s*\(\s*"([-:.0-9A-Za-z]+)"\s*\)/i;
	var m2 = /ISODate\s*\(\s*"([-:.0-9A-Za-z]+)"\s*\)/i;
	var m3 = /Code\s*\(\s*"([\n\r\s()*+,-.0-9:;A-Z\[\]a-z{}]+)"\s*\)/i;
	var obj1 = val.match(m1);
	var obj2 = val.match(m2);
	var obj3 = val.match(m3);
	if(obj1) { // ObjectId
		val = new mongodb.ObjectID(val.replace(m1, obj1[1]));
	} else if(obj2) { // ISODate
		val = new Date(val.replace(m2, obj2[1]));
	} else if(obj3) { // Code
		val = new mongodb.Code(val.replace(m3, obj3[1]));
	}
	return val;
}

/**
 * POST /api/mongodb/:database/:collection
 *
 * @param req
 * @param res
 */
exports.searchDocument = function(req, res) {
	var dbName = req.params.database;
	var colName = req.params.collection;
	logger.debug('['+moduleName+'][searchDocument] dbName:'+dbName+', colName:'+colName);

	var VALID_CMD = ['find', 'insert', 'update', 'remove', 'count', 'findOne', 'aggregate' ];
	// find, findOne, count, distinct, findAndModify, insert, update, remove, aggregate, mapReduce
	var cmd = (req.query.cmd || '');
	if(VALID_CMD.indexOf(cmd) === -1) {
		logger.error('['+moduleName+'][searchDocument] MongoDB Invalid command; ', cmd);
		res.json({ status: 400, message: 'Invalid command' });
		return;
	}

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][searchDocument] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var conds = parseObject(req.body.condition || {});
	logger.debug('['+moduleName+'][searchDocument] conds;', conds);

	var document = req.body.document;
	document && (document = parseObject(document));
	logger.debug('['+moduleName+'][searchDocument] document;', document);

	var options = req.body.options || {};
	logger.debug('['+moduleName+'][searchDocument] options;', options);

	async.waterfall([
		function(cb) {
			var db = dbConn.db(dbName);
			var col = db.collection(colName);
			if(cmd === 'find') {
				var limit = parseInt(req.query.limit, 10) || 50;
				var skip = parseInt(req.query.skip, 10) || 0;
				options.limit = limit;
				options.skip = skip;
				col.find(conds, options).toArray(cb);
			} else if(cmd === 'insert') {
				if(document) {
					col.insert(document, options, cb);
				} else {
					cb('Invalid document');
				}
			} else if(cmd === 'update') {
				col.update(conds, document, options, cb);
			} else if(cmd === 'remove') {
				col.remove(conds, options, cb);
			} else if(cmd === 'count') {
				col.count(conds, options, cb);
			} else if(cmd === 'findOne') {
				col.findOne(conds, options, cb);
			} else if(cmd === 'aggregate') {
				col.aggregate(conds, options, cb);
			} else {
				cb('Invalid request');
			}
		}
	], function(err, docs) {
		var results = {	status: 200, message: '' };
		if(err) {
			logger.error('['+moduleName+'][searchDocument] MongoDB command error; ', err);
			results.status = 500;
			results.message = err.toString();
			res.json({ status: 500, message: err.toString() });
		} else if(docs) {
			logger.debug('['+moduleName+'][searchDocument]  command result ok');
			if(Array.isArray(docs)) {
				var orgDocs = [];
				for(var i in docs) {
					orgDocs[i] = docs[i];
					docs[i] = bson.toString(docs[i]);
				}
				results.message = docs.join(',\n');
			} else {
				results.message = bson.toString(docs);
			}
		} else {
			results.message = 'Not found';
		}
		res.json(results);
	});
};

exports.addDocument = function(req, res) {
	var dbName = req.params.database;
	var colName = req.params.collection;
	var doc = req.body.document;

	logger.debug('['+moduleName+'][addDocument] dbName:'+dbName+', colName:'+colName);

	if(doc == undefined || doc.length == 0) {
		logger.warn('['+moduleName+'][addDocument] You forgot to enter a document!');
		res.json({ status: 403, message: 'You forgot to enter a document!' });
		return;
	}

	var docBSON;
	try {
		docBSON = bson.toBSON(doc);
	} catch (err) {
		logger.warn('['+moduleName+'][addDocument] That document is not valid!');
		res.json({ status: 403, message: 'That document is not valid!' });
		return;
	}

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][addDocument] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var db = dbConn.db(dbName);
	var col = db.collection(colName);
	col.insert(docBSON, function(err, result) {
		if(err) {
			logger.error('['+moduleName+'][addDocument] Something went wrong; ', err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			logger.debug('['+moduleName+'][addDocument] result ok; ');
			res.json({ status: 200, message: 'OK' });
		}
	});
};

exports.updateDocument = function(req, res) {
	var dbName = req.params.database;
	var colName = req.params.collection;
	var docId = req.params.document;
	var doc = req.body.document;
	logger.debug('['+moduleName+'][updateDocument] dbName:'+dbName+', colName:'+colName+', docId:'+docId);

	if(doc == undefined || doc.length == 0) {
		logger.warn('['+moduleName+'][updateDocument] You forgot to enter a document!');
		res.json({ status: 403, message: 'You forgot to enter a document!' });
		return;
	}

	if(docId.length == 24) {
		//Convert id string to mongodb object ID
		try {
			docId = new mongodb.ObjectID.createFromHexString(docId);
		} catch (err) {
			logger.error('['+moduleName+'][updateDocument] Document ID convert error; ', err);
		}
	}

	var docBSON;
	try {
		docBSON = bson.toBSON(doc);
	} catch (err) {
		logger.warn('['+moduleName+'][updateDocument] That document is not valid!');
		res.json({ status: 403, message: 'That document is not valid!' });
		return;
	}

	docBSON._id = docId;

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][updateDocument] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var db = dbConn.db(dbName);
	var col = db.collection(colName);
	async.waterfall([
		function(cb) {
			col.findOne({_id : docId}, cb);
		},
		function(doc, cb) {
			col.update(doc, docBSON, {safe: true}, cb);
		}
	], function(err, result) {
		if(err) {
			logger.error('['+moduleName+'][updateDocument] Something went wrong; ', err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			logger.debug('['+moduleName+'][updateDocument] result ok; ');
			res.json({ status: 200, message: 'OK', docString: bson.toString(docBSON) });
		}
	});
};

exports.deleteDocument = function(req, res) {
	var dbName = req.params.database;
	var colName = req.params.collection;
	var docId = req.params.document;
	logger.debug('['+moduleName+'][deleteDocument] dbName:'+dbName+', colName:'+colName+', docId:'+docId);

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][deleteDocument] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var db = dbConn.db(dbName);
	var col = db.collection(colName);

	if(docId === '_all') {
		col.remove({}, {safe: true}, function(err, result) {
			if(err) {
				logger.error('['+moduleName+'][deleteDocument] Something went wrong; ', err);
				res.json({ status: 500, message: utils.getErrMsg(err) });
			} else {
				logger.debug('['+moduleName+'][deleteDocument] All documents deleted; ');
				res.json({ status: 200, message: 'OK' });
			}
		});
	} else {
		if(docId.length == 24) {
			//Convert id string to mongodb object ID
			try {
				docId = new mongodb.ObjectID.createFromHexString(docId);
			} catch (err) {
				logger.error('['+moduleName+'][deleteDocument] Document ID convert error; ', err);
			}
		}

		async.waterfall([
			function(cb) {
				col.findOne({_id : docId}, cb);
			},
			function(doc, cb) {
				col.remove(doc, {safe: true}, cb);
			}
		], function(err, result) {
			if(err) {
				logger.error('['+moduleName+'][deleteDocument] Something went wrong; ', err);
				res.json({ status: 500, message: utils.getErrMsg(err) });
			} else {
				logger.debug('['+moduleName+'][deleteDocument] result ok; ');
				res.json({ status: 200, message: 'OK' });
			}
		});
	}
};

var deleteAllDocuments = function(dbName, colName, cb) {
	logger.debug('['+moduleName+'][deleteAllDocuments] dbName:'+dbName+', colName:'+colName);

	var mongoDB = req.mongoDB;
	var dbConn = mongoDB.getDBConn();
	if(!dbConn) {
		logger.warn('['+moduleName+'][deleteAllDocuments] Invalid MongoDB connection object!');
		res.json({ status: 500, message: utils.getErrMsg(mongoDB.getErr()) || 'Invalid MongoDB connection object' });
		return;
	}

	var db = dbConn.db(dbName);
	var col = db.collection(colName);
	col.remove({}, {safe: true}, function(err, result) {
		if(err) {
			logger.error('['+moduleName+'][deleteAllDocuments] Something went wrong; ', err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			logger.debug('['+moduleName+'][deleteAllDocuments] result ok; ');
			res.json({ status: 200, message: 'OK' });
		}
	});
};
