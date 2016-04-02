var routes = [
	{
		url: '/',
		method: 'get',
		path: './routes/index',
		fn: 'index'
	},
	{
		url: '/mongodb/hosts',
		method: 'get',
		path: './routes/hosts',
		fn: 'getHosts'
	},
	{
		url: '/mongodb/hosts',
		method: 'post',
		path: './routes/hosts',
		fn: 'addHost'
	},
	{
		url: '/mongodb/hosts/:id',
		method: 'put',
		path: './routes/hosts',
		fn: 'updateHost'
	},
	{
		url: '/mongodb/hosts/:id',
		method: 'delete',
		path: './routes/hosts',
		fn: 'deleteHost'
	},
	{
		url: '/mongodb/tree/:hostId',
		method: 'get',
		path: './routes/index',
		fn: 'getTree'
	},
	{
		url: '/mongodb/status/:hostId',
		method: 'get',
		path: './routes/index',
		fn: 'getServerStatus'
	},
	{
		url: '/mongodb/stats/:database',
		method: 'get',
		path: './routes/index',
		fn: 'getDatabaseStats'
	},
	{
		url: '/mongodb/stats/:database/:collection',
		method: 'get',
		path: './routes/index',
		fn: 'getCollectionStats'
	},
	{
		url: '/mongodb/search/:database/:collection',
		method: 'get',
		path: './routes/index',
		fn: 'listDocument'
	},
	{
		url: '/mongodb/search/:database/:collection',
		method: 'post',
		path: './routes/index',
		fn: 'searchDocument'
	},
	{
		url: '/mongodb/db/:database',
		method: 'post',
		path: './routes/index',
		fn: 'addDatabase'
	},
	{
		url: '/mongodb/db/:database',
		method: 'put',
		path: './routes/index',
		fn: 'renameDatabase'
	},
	{
		url: '/mongodb/db/:database',
		method: 'delete',
		path: './routes/index',
		fn: 'deleteDatabase'
	},
	{
		url: '/mongodb/db/:database/:collection',
		method: 'post',
		path: './routes/index',
		fn: 'addCollection'
	},
	{
		url: '/mongodb/db/:database/:collection',
		method: 'put',
		path: './routes/index',
		fn: 'renameCollection'
	},
	{
		url: '/mongodb/db/:database/:collection',
		method: 'delete',
		path: './routes/index',
		fn: 'deleteCollection'
	},
	{
		url: '/mongodb/export/:database/:collection',
		method: 'get',
		path: './routes/index',
		fn: 'exportCollection'
	},
	{
		url: '/mongodb/db/:database/:collection/_new',
		method: 'post',
		path: './routes/index',
		fn: 'addDocument'
	},
	{
		url: '/mongodb/db/:database/:collection/:document',
		method: 'put',
		path: './routes/index',
		fn: 'updateDocument'
	},
	{
		url: '/mongodb/db/:database/:collection/:document',
		method: 'delete',
		path: './routes/index',
		fn: 'deleteDocument'
	}
];

module.exports = routes;
