module.exports = {
	port: 5056,
	locales: ['en', 'ko'],
	cookie: {
		path : '/',
		httpOnly : true,
		maxAge: 1000 * 60 * 60 * 24
	},
	static: {
		maxAge: 1000 * 60 * 60 * 24
	},
	hosts_file: __dirname + '/../conf/hosts.json',
	connect_options: { // MongoDB connect options
		auto_reconnect: true,
		socketOptions: {connectTimeoutMS: 1000},
		poolSize: 1
	},
	logger: {
		access: {
			category: 'access',
			type: 'dateFile',
			filename: __dirname+'/../logs/access.log',
			pattern: '-yyyy-MM-dd',
			level: 'DEBUG'
		},
		app: {
			category: 'app',
			type: 'dateFile',
			filename: __dirname+'/../logs/app.log',
			pattern: '-yyyy-MM-dd',
			level: 'DEBUG'
		}
	}
};