# MongoBrowser

=========

## 1. Introduction

MongoBrowser is a web-based MongoDB management tool.

## 2. Prerequisite

- Node.js
	- [https://nodejs.org](https://nodejs.org)
- npm(JavaScript package manager) 
	- [https://github.com/npm/npm](https://github.com/npm/npm)
- Grunt
    - npm install -g grunt-cli
- Bower
    - npm install -g bower

## 3. Installation

- Download MongoBrowser
	- [https://github.com/RenmanKang/MongoBrowser](https://github.com/RenmanKang/MongoBrowser)

- Install modules
```sh
$ cd MongoBrowser
$ npm install
$ bower install
$ grunt build
```

## 4. Setting up

- Change the `port`, `hosts_file`, `logger filename` path, and other settings.

```sh
$ cd MongoBrowser/conf
$ vi config.js
-----
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
			filename: __dirname+'/../logs/mongobrowser-access.log',
			pattern: '-yyyy-MM-dd',
			level: 'DEBUG'
		},
		app: {
			category: 'app',
			type: 'dateFile',
			filename: __dirname+'/../logs/mongobrowser-app.log',
			pattern: '-yyyy-MM-dd',
			level: 'DEBUG'
		}
	}
-----
```

## 5. Running It

```sh
$ cd MongoBrowser
$ node ./bin/www
or
$ pm2 start app.json
```

## 6. Screenshot

![Main page](/img/main.png)

***

## 7. Reference

- mongo-express
	- [https://github.com/mongo-express/mongo-express](https://github.com/mongo-express/mongo-express)
	
- Robomongo
	- [https://robomongo.org/](https://robomongo.org/)
	- [https://github.com/paralect/robomongo](https://github.com/paralect/robomongo)
