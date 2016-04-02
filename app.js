var express = require('express');
var session = require('express-session');
var i18n = require('i18n');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./conf/routes');
var conf = require('./conf/config');
var i18nConfig = require('./lib/i18n-config');
var mongoHandler = require('./lib/mongo-handler');
var mongoHosts = require('./lib/mongo-hosts');
var accessLogger = require('./lib/logger').accessLogger;
var logger = require('./lib/logger').appLogger;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(i18n.init);
app.use(i18nConfig.init);

app.use(session({
	name : 'mongobrowser.sid',
	secret : 'MongoBrowser',
	resave : false,
	saveUninitialized : false,
	cookie : conf.cookie
}));

app.use(function(req, res, next) {
	accessLogger.info([
		req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || (req.connection.socket && req.connection.socket.remoteAddress),
		req.method,
		req.url,
		res.statusCode,
		req.headers.referer || '-',
		req.headers['user-agent'] || '-'
	].join('\t'));
	next();
});
app.use(express.static(path.join(__dirname, 'public'), conf.static || {"maxAge": 1000 * 60 * 60 * 24}));

var mongoDB;

var middleware = function(req, res, next) {
	var openMongoDB = function(id, cb) {
		mongoDB = new mongoHandler.MongoDB(id);
		mongoDB.open(function(err) {
			if(err) {
				logger.error('MongoDB open error; ', err);
			} else {
				res.cookie('HOSTID', mongoDB.getId(), { path: '/', httpOnly: true });
			}
			req.mongoDB = mongoDB;
			cb();
		});
	};

	var id = req.params.hostId || req.cookies['HOSTID'];
	if(!id) {
		var defHost = mongoHosts.getDefaultHost();
		defHost && (id = defHost.id);
	}
	if(!mongoDB) {
		openMongoDB(id, next);
	} else if(id && mongoHosts.getHost(id) && id != mongoDB.getId()) {
		logger.debug('Change MongoDB host. Current id:'+mongoDB.getId()+', New id:'+id);
		mongoDB.close();
		openMongoDB(id, next);
	} else {
		req.mongoDB = mongoDB;
		next();
	}
};

// Init routes
routes.forEach(function(cfg) {
	var route = require(cfg.path);
	// use configed method
	app[cfg.method](cfg.url, middleware, route[cfg.fn]);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

module.exports = app;
