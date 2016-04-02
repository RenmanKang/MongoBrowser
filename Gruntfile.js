module.exports = function (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		copy: {
			bower_components: {
				expand: true, cwd: 'bower_components', src: '**', dest: 'public/dist/lib'
			},
			jstree_themes: {
				expand: true, cwd: 'resources/jstree/themes', src: '**', dest: 'public/dist/lib/jstree/dist/themes'
			}
		},
		cssshrink: {
			options: {
				log: true
			},
			dist: {
				files: {
					'public/dist/css/': [
						'public/src/css/style.css'
					]
				}
			}
		},
		concat: {
			options: {
				separator: ';'
			},
			require: {
				src: ['public/src/js/config.js', 'public/dist/lib/requirejs/require.js'],
				dest: 'public/dist/js/require.js'
			}
		},
		handlebars: {
			compile: {
				options: {
					amd: true,
					namespace: 'Handlebars.templates',
					processContent: function (content, filepath) {
						content = content.replace(/^[\x20\t]+/mg, '').replace(/[\x20\t]+$/mg, '');
						content = content.replace(/^[\r\n]+/, '').replace(/[\r\n]*$/, '\n');
						return content;
					},
					processName: function (filePath) {
						return filePath.replace(/(.+\/)*(.*)\.hbs?/, '$2');
					}
				},
				files: {
					'public/dist/js/templates.js': ['public/src/js/templates/*.hbs']
				}
			}
		},
		uglify: {
			app: {
				files: {
					'public/dist/js/app.min.js': 'public/src/js/app.js'
				}
			},
			i18n: {
				files: {
					'public/dist/js/locales/jquery-i18n-en.min.js': 'public/src/js/locales/jquery-i18n-en.js',
					'public/dist/js/locales/jquery-i18n-ko.min.js': 'public/src/js/locales/jquery-i18n-ko.js'
				}
			},
			codemirror: {
				files: {
					'public/dist/js/jquery.codemirror.min.js': 'public/src/js/jquery.codemirror.js'
				}
			},
			requirejs: {
				files: {
					'public/dist/js/require.min.js': 'public/dist/js/require.js'
				}
			},
			templates: {
				files: {
					'public/dist/js/templates.min.js': 'public/dist/js/templates.js'
				}
			}
		},
		watch: {
			concat: {
				files: ['public/src/js/config.js'],
				tasks: ['concat', 'uglify']
			},
			cssshrink: {
				files: ['public/src/css/**.css'],
				tasks: ['cssshrink']
			},
			handlebars: {
				files: ['public/src/js/*.hbs'],
				tasks: ['handlebars', 'uglify']
			},
			uglify: {
				files: ['public/src/js/app.js', 'public/src/js/locales/*.js', 'public/dest/js/templates.js', 'public/dest/js/jquery.codemirror.js'],
				tasks: ['uglify']
			},
			grunt: {
				files: ['Gruntfile.js'],
				tasks: ['build']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-handlebars');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-cssshrink');

	grunt.registerTask('build', ['copy', 'cssshrink', 'concat', 'handlebars', 'uglify']);
	grunt.registerTask('default', ['build', 'watch']);
};
