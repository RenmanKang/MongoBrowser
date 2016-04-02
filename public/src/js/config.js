if (!Function.prototype.bind) {
	Function.prototype.bind = function (oThis) {
		if (typeof this !== "function") {
			// closest thing possible to the ECMAScript 5 internal IsCallable function
			throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
		}

		var aArgs = Array.prototype.slice.call(arguments, 1),
				fToBind = this,
				fNOP = function () {},
				fBound = function () {
					return fToBind.apply(this instanceof fNOP && oThis
									? this
									: oThis,
							aArgs.concat(Array.prototype.slice.call(arguments)));
				};

		fNOP.prototype = this.prototype;
		fBound.prototype = new fNOP();

		return fBound;
	};
}

if (!String.prototype.trim) {
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, '');
	};
}

var require = {
	baseUrl: '/dist/lib',
	//urlArgs: "bust=" + (new Date()).getTime(),
	urlArgs: "v=0.0.1",
	paths: {
		jquery: 'jquery/dist/jquery.min',
		underscore: 'underscore/underscore-min',
		Backbone: 'backbone/backbone-min',
		handlebars: 'handlebars/handlebars.min',
		bootstrap: 'bootstrap/dist/js/bootstrap.min',
		bootstrap_select: 'bootstrap-select/dist/js/bootstrap-select.min',
		bootstrap_table: 'bootstrap-table/dist/bootstrap-table.min',
		jstree: 'jstree/dist/jstree.min',
		i18n: 'jquery-i18n/jquery.i18n.min',
		i18n_en: '../js/locales/jquery-i18n-en.min',
		i18n_ko: '../js/locales/jquery-i18n-ko.min',
		templates: '../js/templates.min',
		jquery_codemirror: '../js/jquery.codemirror.min',
		app: '../js/app.min'
		//app: '../../src/js/app'
	},
	packages: [
		{name: 'codemirror', location : 'codemirror'}
	],
	shim: {
		bootstrap: {
			deps: ['jquery']
		},
		bootstrap_select: {
			deps: ['jquery']
		},
		bootstrap_table: {
			deps: ['jquery']
		},
		handlebars: {
			exports: 'Handlebars'
		},
		i18n: {
			deps: ['jquery']
		},
		i18n_en: {
			deps: ['i18n']
		},
		i18n_ko: {
			deps: ['i18n']
		},
		jstree: {
			deps: ['jquery']
		},
		app: {
			deps: ['jquery']
		}
	},
	map: {
		'*': {
			'backbone': 'Backbone',
			'jQuery': 'jquery'
		}
	}
};
