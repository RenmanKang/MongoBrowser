var fs = require('fs-extra');
var conf = require('../conf/config');

var hosts_file = conf.hosts_file;
var hosts_cache = loadHosts();

function loadHosts() {
	try {
		return fs.readJsonSync(hosts_file, 'utf8');
	} catch(err) {
		return [];
	}
}

function saveHosts(hosts, cb) {
	fs.writeJson(hosts_file, hosts, {'spaces':'\t'}, cb);
}

exports.getHosts = function() {
	return hosts_cache;
};

exports.getHost = function(id) {
	var host = null;
	hosts_cache.some(function(h, idx) {
		if(h.id === id) {
			host = h;
			return true;
		} else {
			return false;
		}
	});
	return host;
};

exports.getDefaultHost = function() {
	return (hosts_cache.length) ? hosts_cache[0] : null;
};

exports.updateHost = function(host, cb) {
	var exist = hosts_cache.some(function(c, idx) {
		if(c.id === host.id) {
			c.name = host.name;
			c.host = host.host;
			c.port = host.port;
			c.user = host.user;
			c.password = host.password;
			return true;
		} else {
			return false;
		}
	});
	!exist && hosts_cache.push(host);
	saveHosts(hosts_cache, function(err) {
		cb(err, host)
	});
};

exports.deleteHost = function(id, cb) {
	var hosts = [];
	hosts_cache.forEach(function(h) {
		(h.id !== id) && hosts.push(h);
	});
	saveHosts(hosts, function(err) {
		if(!err) {
			hosts_cache = loadHosts();
		}
		cb && cb(err);
	});
};
