var node_uuid = require('node-uuid');
var mongoHosts = require('../lib/mongo-hosts');
var utils = require('../lib/utils');
var logger = require('../lib/logger').appLogger;

var moduleName = utils.getFileName(module.filename);

exports.getHosts = function(req, res) {
	var hosts = mongoHosts.getHosts();
	res.json(hosts);
};

exports.addHost = function(req, res) {
	var host = req.body;
	!host.id && (host.id = node_uuid.v4());
	saveHost(host, function(err, result) {
		if(err) {
			logger.error('['+moduleName+'][addHost] Failed to add host; ', err);
			res.json(err);
		} else {
			res.json({ status: 200, message: 'OK', host: result });
		}
	});
};

exports.updateHost = function(req, res) {
	var host = req.body;
	host.id = req.params.id;
	saveHost(host, function(err, result) {
		if(err) {
			logger.error('['+moduleName+'][updateHost] Failed to update host; ', err);
			res.json(err);
		} else {
			res.json({ status: 200, message: 'OK', host: result });
		}
	});
};

function saveHost(host, cb) {
	if(!host.host) {
		cb({status: 400, message: 'Mongodb host input required'});
		return;
	}

	var port = parseInt(host.port, 10);
	logger.debug('['+moduleName+'][updateHost] MongoDB port; ', port);
	if(isNaN(port)) {
		cb({status: 400, message: 'Invalid Mongodb port; '+host.port});
		return;
	}

	!host.name && (host.name = host.host+':'+host.port);

	mongoHosts.updateHost(host, function(err, result) {
		if(err) {
			logger.error('['+moduleName+'][updateHost] Host setting update error; ', err);
			cb({status: 500, message: utils.getErrMsg(err)});
		} else {
			cb(null, result);
		}
	});
}

exports.deleteHost = function(req, res) {
	var id = req.params.id;
	mongoHosts.deleteHost(id, function(err) {
		if(err) {
			logger.error('['+moduleName+'][deleteHost] Failed to delete host; ', err);
			res.json({ status: 500, message: utils.getErrMsg(err) });
		} else {
			res.json({ status: 200, message: 'OK' });
		}
	});
};
