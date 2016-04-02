/**
 * Created by Renman on 2016-04-02.
 */
(function(factory) {
	var root = (typeof self == 'object' && self.self === self && self) ||
		(typeof global == 'object' && global.global === global && global);
	define([
		'jquery', 'handlebars', 'templates', 'underscore', 'Backbone', 'jstree', 'bootstrap',
		'bootstrap_select', 'bootstrap_table', 'i18n', 'i18n_en', 'i18n_ko', 'jquery_codemirror'
	], function($, Handlebars, Templates) {
		root.App = factory($, Handlebars, Templates);
	});
})(function($, Handlebars, Templates) {

	var HostMgr = {
		init: function (hostId) {
			HostMgr.hostId = hostId;
			!HostMgr.collection && (HostMgr.collection = HostMgr.getCollection());

			$('#hostid').selectpicker({
				style: 'btn-info',
				width: 294
			});
			$('.host-select').show();

			var hostListView = new HostMgr.HostListView({
				el: '#hostid',
				template: Templates.templates.HostOptionTemplate
			});
			hostListView.setHostId(hostId);
			hostListView.fetchResult = function (_self) {
				var data = _self.collection.toJSON();
				_self.$el.html(_self.template(data));
				_self.$el.selectpicker('refresh');
				_self.$el.selectpicker('val', _self.hostId);
				_self.$el.on('change', function () {
					console.log('change host:' + $(this).val());
					HostMgr.changeHost($(this).val());
				});
			};
			hostListView.render();

			$('#show-hosts-btn').on('click', HostMgr.showHosts);
			$('#host-mgr-save').on('click', HostMgr.saveHost);
			$('#host-mgr-cls').on('click', function (e) {
				$('#conn-list').show();
				$('#conn-settings').hide();
			});
		},
		hostId: null,
		collection: null,
		getCollection: function () {
			var HostList = Backbone.Collection.extend({
				url: '/mongodb/hosts',
				model: Backbone.Model.extend({})
			});
			return new HostList();
		},
		HostListView: Backbone.View.extend({
			render: function () {
				var _self = this;
				_self.collection.fetch({
					success: function () {
						_self.fetchResult(_self);
					}
				});
				return this;
			},
			initialize: function (opt) {
				this.template = opt.template;
				this.collection = HostMgr.collection;
			},
			setHostId: function (id) {
				this.hostId = id;
			}
		}),
		rebindEvent: function () {
			$('.anc-host-name').unbind('click');
			$('.anc-host-name').bind('click', function (e) {
				HostMgr.editHost($(this).attr('data-value'));
				e.stopImmediatePropagation();
				e.preventDefault();
			});
			$('.rm-host').unbind('click');
			$('.rm-host').on('click', function (e) {
				HostMgr.removeHost($(this).parent().parent().attr('id'));
			});
		},
		changeHost: function (hostId) {
			HostMgr.hostId = hostId;
			Tree.reloadTree(hostId);
		},
		showHosts: function () {
			var hostListView = new HostMgr.HostListView({
				el: '#host-list',
				template: Templates.templates.HostListTemplate
			});
			hostListView.fetchResult = function (_self) {
				var data = _self.collection.toJSON();
				_self.$el.html(_self.template(data));
				HostMgr.rebindEvent();
			};
			hostListView.render();

			$('#conn-list').show();
			$('#conn-settings').hide();
			$('#host-mgr').modal('show').on('shown.bs.modal', function () {
				$('#content').css('position', 'absolute');
			}).on('hidden.bs.modal', function () {
				$('#content').css('position', 'fixed');
			});
		},
		editHost: function (data) {
			$('#conn-list').hide();
			$('#conn-settings').show();
			if (data && data.length) {
				var val = data.split(',');
				$('#host-mgr-id').val(val[0]);
				$('#host-mgr-name').val(val[1]);
				$('#host-mgr-host').val(val[2]);
				$('#host-mgr-port').val(val[3]);
				$('#host-mgr-user').val(val[4] || '');
				$('#host-mgr-pass').val('');
			} else {
				$('#host-mgr-id').val('');
				$('#host-mgr-name').val('');
				$('#host-mgr-host').val('');
				$('#host-mgr-port').val('');
				$('#host-mgr-user').val('');
				$('#host-mgr-pass').val('');
			}
		},
		saveHost: function () {
			var data = {
				name: $.trim($('#host-mgr-name').val()),
				host: $.trim($('#host-mgr-host').val()),
				port: parseInt($.trim($('#host-mgr-port').val()), 10),
				user: $.trim($('#host-mgr-user').val()),
				password: $('#host-mgr-pass').val()
			};
			var id = $('#host-mgr-id').val();
			if (id && id.length) data.id = id;

			if (data.name.length === 0) {
				Modal.showAlert($.i18n._('You must enter a connection name'));
				return;
			}
			if (data.host.length === 0) {
				Modal.showAlert($.i18n._('You must enter a host address'));
				return;
			}
			if (isNaN(data.port)) {
				Modal.showAlert($.i18n._('Invalid connection port'));
				return;
			}

			$.ajax({
				type: 'post',
				url: '/mongodb/hosts',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function (result) {
					if (result.status === 200) {
						if (data.id) {
							$('#' + data.id).empty();
							var name = $('select[name=hostid] option[value="' + data.id + '"]').text();
							(name !== data.name) && $('select[name=hostid] option[value="' + data.id + '"]').text(data.name);
							$('#hostid').selectpicker('refresh');
						} else {
							data = result.host;
							$('#host-list').append('<tr id="' + data.id + '"></tr>');
							$('#hostid').append('<option value="' + data.id + '">' + data.name + '</option>');
							$('#hostid').selectpicker('refresh');
						}
						$('#' + data.id).append(Templates.templates.HostItemTemplate(data));
						HostMgr.rebindEvent();

						$('#conn-list').show();
						$('#conn-settings').hide();
					} else {
						Modal.bsAlert('danger', result.message, '#alert-div');
					}
				},
				error: function (result) {
					console.error(result);
					if (result.message) {
						Modal.bsAlert('danger', result.message, '#alert-div');
					}
				}
			});
		},
		removeHost: function (id) {
			$.ajax({
				type: 'delete',
				url: '/mongodb/hosts/' + id,
				contentType: 'application/json',
				success: function (result) {
					if (result.status === 200) {
						$('#' + id).remove();
						$('select[name=hostid] option[value="' + id + '"]').remove();
						if (id === HostMgr.hostId) {
							var val = $('select[name=hostid] option:first').val();
							$('select[name=hostid]').val(val);
							HostMgr.changeHost(val);
						}
						$('#hostid').selectpicker('refresh');
					} else {
						Modal.bsAlert('danger', result.message, '#alert-div');
					}
				},
				error: function (result) {
					console.error(result);
					if (result.message) {
						Modal.bsAlert('danger', result.message, '#alert-div');
					}
				}
			});
		}
	};

	var Tree = {
		treeId: '#dbTree',
		hostId: null,
		nodeSrchTid: false,
		init: function (hostId) {
			Tree.hostId = hostId;
			$('#refresh-btn').on('click', Tree.reloadTree);
			$(Tree.treeId).jstree({
				core: {
					data: {
						url: '/mongodb/tree/' + hostId,
						dataType: 'json',
						data: function (node) {
							return {db: node.text};
						}
					},
					multiple: false,
					check_callback: true,
					themes: {name: 'proton', responsive: true}
				},
				contextmenu: {
					items: Tree.context_menu
				},
				plugins: ['search', 'contextmenu']
			}).bind('loaded.jstree', function (e, data) {
				MongoAction.showServerStatus(Tree.hostId);
				$('#search_path').on('keydown', Tree.checkSearchAct);
				$('#search-btn').on('click', Tree.searchNode);
				Util.resizeApp();
			}).bind('refresh.jstree', function (e, data) {
				if (HostMgr.hostId !== Tree.hostId) {
					ContentTab.closeAllTab();
					Tree.hostId = HostMgr.hostId;
					MongoAction.showServerStatus(Tree.hostId);
				}
			}).bind("select_node.jstree", function (e, data) {
				var node = data.node;
				if (node && (!data.event || data.event.button !== 2)) {
					var attr = node.a_attr;
					var data_type = attr && attr["data-type"];
					if (data_type === 'server') {
						//Tree.getDbTree().toggle_node(node);
					} else if (data_type === 'database') {
						//Tree.getDbTree().toggle_node(node);
					} else if (data_type === 'collection') {
						MongoAction.loadDocument(node.parent, node.text);
					}
				}
			}).bind('rename_node.jstree', function (e, data) {
				var dbName = data.node.parent;
				var colName = data.text;
				(dbName === '#') && (dbName = colName);

				var oldName = data.old;
				if (colName !== oldName) {
					if (dbName === colName) {
						MongoAction.renameDatabase(oldName, dbName);
					} else {
						MongoAction.renameCollection(dbName, oldName, colName);
					}
				}
			});
		},
		reloadTree: function (hostId) {
			var tree = Tree.getDbTree();
			('string' === typeof hostId) && (tree.settings.core.data.url = '/mongodb/tree/' + hostId);
			tree.refresh();
		},
		getDbTree: function () {
			return $(Tree.treeId).jstree(true);
		},
		checkSearchAct: function (e) {
			if (e.charCode == 13 || e.keyCode == 13) {
				e.preventDefault();
				Tree.searchNode(e);
			}
		},
		searchNode: function (e) {
			var val = $.trim($('#search_path').val());
			if (val.length) {
				if (Tree.nodeSrchTid) {
					clearTimeout(Tree.nodeSrchTid);
				}

				val = $.trim(val);
				if (val.length < 2) return;

				Tree.nodeSrchTid = setTimeout(function () {
					$('.jstree-anchor').removeClass('jstree-search');
					Tree.getDbTree().search(val);
				}, 250);
			} else {
				Tree.getDbTree().clear_search();
			}
		},
		context_menu: function (node) {
			var CtxMenu = {
				"server": {
					"CreateDatabase": {
						"separator_before": false,
						"separator_after": false,
						"label": $.i18n._("Create Database"),
						"action": function (obj) {
							MongoAction.createDatabase();
						}
					},
					"ServerStatus": {
						"separator_before": false,
						"separator_after": false,
						"label": $.i18n._("Server Status"),
						"action": function (obj) {
							MongoAction.showServerStatus(Tree.hostId);
						}
					}
				},
				"database": {
					"CreateCollection": {
						"separator_before": false,
						"separator_after": true,
						"label": $.i18n._("Create Collection"),
						"action": function (obj) {
							MongoAction.createCollection(node.text);
						}
					},
					"DatabaseStatistics": {
						"separator_before": false,
						"separator_after": true,
						"label": $.i18n._("Database Statistics"),
						"action": function (obj) {
							MongoAction.showStats(node.text);
						}
					},
					"DropDatabase": {
						"separator_before": false,
						"separator_after": false,
						"label": $.i18n._("Drop Database"),
						"action": function (obj) {
							var title = $.i18n._('Drop Database') + ' :: ' + node.text;
							var msg = $.i18n._('Are you sure you want to delete this database?');
							MongoAction.dropConfirm(node, title, msg);
						}
					}
				},
				"collection": {
					"ViewDocuments": {
						"separator_before": false,
						"separator_after": true,
						"label": $.i18n._("View Documents"),
						"action": function (obj) {
							MongoAction.loadDocument(node.parent, node.text);
						}
					},
					"InsertDocument": {
						"separator_before": false,
						"separator_after": false,
						"label": $.i18n._("Insert Document"),
						"action": function (obj) {
							MongoAction.addDocument(node.parent, node.text);
						}
					},
					"UpdateDocuments": {
						"separator_before": false,
						"separator_after": false,
						"label": $.i18n._("Update Documents"),
						"action": function (obj) {
							MongoAction.updateDocument(node.parent, node.text);
						}
					},
					"RemoveAllDocuments": {
						"separator_before": false,
						"separator_after": true,
						"label": $.i18n._("Remove All Documents"),
						"action": function (obj) {
							var title = $.i18n._('Remove Documents') + ' :: ' + node.text;
							var msg = $.i18n._('Are you sure you want to delete all the documents in this collection?');
							MongoAction.removeAllDocuments(node, title, msg);
						}
					},
					"ExportCollection": {
						"separator_before": false,
						"separator_after": false,
						"label": $.i18n._("Export Collection"),
						"action": function (obj) {
							MongoAction.exportCollection(node.parent, node.text);
						}
					},
					"RenameCollection": {
						"separator_before": false,
						"separator_after": false,
						"label": $.i18n._("Rename Collection"),
						"action": function (obj) {
							Tree.getDbTree().edit(node);
						}
					},
					"DropCollection": {
						"separator_before": false,
						"separator_after": true,
						"label": $.i18n._("Drop Collection"),
						"action": function (obj) {
							var title = $.i18n._('Drop Collection') + ' :: ' + node.text;
							var msg = $.i18n._('Are you sure you want to delete this collection? All documents will be deleted.');
							MongoAction.dropConfirm(node, title, msg);
						}
					},
					"CollectionStatistics": {
						"separator_before": false,
						"separator_after": false,
						"label": $.i18n._("Collection Statistics"),
						"action": function (obj) {
							MongoAction.showStats(node.parent, node.text);
						}
					}
				}
			};
			var type = node.a_attr["data-type"];
			return CtxMenu[type];
		}
	};

	var MongoAction = {
		docCodeMirror: null,
		showServerStatus: function (hostId) {
			if (!hostId) return;
			var tabId = 'serverinfo';
			ContentTab.clearTab();
			if ($('#' + tabId).length === 0) {
				$.get('/mongodb/status/' + hostId, function (data) {
					ContentTab.renderInfoTab({tabId: tabId, title: 'Overview', icon: 'home'}, data);
				});
			} else {
				$.get('/mongodb/status/' + hostId, function (data) {
					ContentTab.resultBox[tabId].getDoc().setValue(data.result);
					ContentTab.resultBox[tabId].refresh();
					$('#' + tabId + '__anc').click();
					ContentTab.selectTab(tabId);
				});
			}
		},
		showStats: function (dbName, colName) {
			var path = dbName;
			(colName) && (path += '/' + colName);
			var tabId = 'stats__' + path.replace(/[/.,]/g, '__');

			ContentTab.clearTab();
			if ($('#' + tabId).length === 0) {
				$.get('/mongodb/stats/' + path, function (data) {
					ContentTab.renderInfoTab({
						tabId: tabId,
						title: 'Stats',
						icon: 'stats',
						dbName: dbName,
						colName: colName
					}, data);
				});
			} else {
				$('#' + tabId + '__anc').click();
				ContentTab.selectTab(tabId);
			}
		},
		createDatabase: function () {
			$('#add-db-btn').unbind('click');
			$('#add-db-btn').bind('click', MongoAction.createDatabaseProc);

			$('#add-db-label').text($.i18n._('Create Database'));
			$('#add-db-name').removeAttr('readonly').val('');
			$('#add-db-name').val('');
			$('#add-col-div').hide();

			Modal.showModal('add-db', 'add-db-name');
		},
		createDatabaseProc: function () {
			var dbName = $.trim($('#add-db-name').val());
			if (dbName.length === 0) {
				Modal.showAlert($.i18n._('You must enter a database name'));
				return;
			}

			$.ajax({
				type: 'post',
				url: '/mongodb/db/' + dbName,
				success: function (result) {
					Modal.hideModal('add-db');
					Tree.reloadTree();
					if (result.status === 200) {
						$('#add-db-name').val('');
					} else {
						Modal.showAlert(result.message);
					}
				},
				error: function (result) {
					console.error(result);
					Modal.hideModal('add-db');
					Tree.reloadTree();
					if (result.message) {
						Modal.showAlert(result.message);
					}
				}
			});
		},
		renameDatabase: function (oldName, dbName) {
			$.ajax({
				type: 'put',
				url: '/mongodb/db/' + dbName,
				data: {collection: oldName},
				success: function (result) {
					Tree.reloadTree();
					if (result.status === 200) {
					} else {
						Modal.showAlert(result.message);
					}
				},
				error: function (result) {
					console.error(result);
					Tree.reloadTree();
					if (result.message) {
						Modal.showAlert(result.message);
					}
				}
			});
		},
		createCollection: function (dbName) {
			$('#add-db-btn').unbind('click');
			$('#add-db-btn').bind('click', MongoAction.createCollectionProc);

			$('#add-db-label').text($.i18n._('Create Collection'));
			$('#add-db-name').attr('readonly', 'readonly').val(dbName);
			$('#add-col-div').show();

			Modal.showModal('add-db', 'add-col-name');
		},
		createCollectionProc: function () {
			var dbName = $.trim($('#add-db-name').val());
			var colName = $.trim($('#add-col-name').val());
			if (dbName.length === 0 || colName.length === 0) {
				Modal.showAlert($.i18n._('You must enter a collection name'));
				return;
			}

			$.ajax({
				type: 'post',
				url: '/mongodb/db/' + dbName + '/' + colName,
				success: function (result) {
					Modal.hideModal('add-db');
					Tree.reloadTree();
					if (result.status === 200) {
						$('#add-col-name').val('');
						MongoAction.loadDocument(dbName, colName);
					} else {
						Modal.showAlert(result.message);
					}
				},
				error: function (result) {
					console.error(result);
					Modal.hideModal('add-db');
					Tree.reloadTree();
					if (result.message) {
						Modal.showAlert(result.message);
					}
				}
			});
		},
		renameCollection: function (dbName, oldName, colName) {
			$.ajax({
				type: 'put',
				url: '/mongodb/db/' + dbName + '/' + oldName,
				data: {collection: colName},
				success: function (result) {
					Tree.reloadTree();
					if (result.status === 200) {
						ContentTab.closeTab(dbName, oldName);
						MongoAction.loadDocument(dbName, colName);
						$('#dbTree').jstree(true).search(colName);
					} else {
						Modal.showAlert(result.message);
					}
				},
				error: function (result) {
					console.error(result);
					Tree.reloadTree();
					if (result.message) {
						Modal.showAlert(result.message);
					}
				}
			});
		},
		exportCollection: function (dbName, colName) {
			location.href = '/mongodb/export/' + dbName + '/' + colName;
		},
		addDocument: function (dbName, colName) {
			if (!MongoAction.docCodeMirror) {
				MongoAction.docCodeMirror = $('#document').codemirror({
					mode: {name: 'javascript', json: true},
					lineNumbers: true,
					styleActiveLine: true,
					autoClearEmptyLines: true,
					matchBrackets: true,
					theme: 'rubyblue'
				});
			} else {
				MongoAction.docCodeMirror.getDoc().setValue($('#document').val());
				MongoAction.docCodeMirror.refresh();
			}
			$('#dbName').val(dbName);
			$('#colName').val(colName);

			$('#add-doc-btn').unbind('click');
			$('#add-doc-btn').bind('click', MongoAction.addDocProc);

			Modal.showModal('add-doc', function () {
				MongoAction.docCodeMirror.refresh();
			});
		},
		addDocProc: function () {
			var dbName = $.trim($('#dbName').val());
			var colName = $.trim($('#colName').val());
			if (dbName.length === 0 || colName.length === 0) {
				Modal.showAlert($.i18n._('You must select target collection to add a document!'));
				return;
			}

			var data = MongoAction.docCodeMirror && MongoAction.docCodeMirror.getDoc().getValue();
			if (!data || data.length === 0) {
				Modal.showAlert($.i18n._('You forgot to enter a document!'));
				return;
			}

			$('#document').val(data);
			$.ajax({
				type: 'post',
				url: '/mongodb/db/' + dbName + '/' + colName + '/_new',
				data: $('#add-doc-form').serialize(),
				success: function (result) {
					Modal.hideModal('add-doc');
					if (result.status === 200) {
						Tree.reloadTree();
						MongoAction.loadDocument(dbName, colName, true);
					} else {
						Modal.showAlert(result.message);
					}
				},
				error: function (result) {
					console.error(result);
					Modal.hideModal('add-doc');
					if (result.message) {
						Modal.showAlert(result.message);
					}
				}
			});
		},
		updateDocument: function (dbName, colName) {
			var tabId = 'col__' + (dbName + '__' + colName).replace(/[/.,]/g, '__');
			if ($('#' + tabId).length === 0) {
				MongoAction.loadDocument(dbName, colName, false, function () {
					ContentTab.changeCommand(tabId, 'update');
				});
			} else {
				$('#' + tabId + '__anc').click();
				ContentTab.changeCommand(tabId, 'update');
				ContentTab.curTabId = tabId;
			}
		},
		removeAllDocuments: function (node, title, msg) {
			var tree = $('#dbTree').jstree(true);
			$('#del-btn').unbind('click');
			$('#del-btn').bind('click', function (e) {
				MongoAction.deleteContents(node.parent, node.text, '_all');
			});
			Modal.showConfirmModal(title, msg);
		},
		loadDocument: function (dbName, colName, refresh, cb) {
			if (!colName) return;

			var tabId = 'col__' + (dbName + '__' + colName).replace(/[/.,]/g, '__');
			refresh && ContentTab.closeTab(dbName, colName);

			ContentTab.clearTab();
			if ($('#' + tabId).length === 0) {
				$.get('/mongodb/search/' + dbName + '/' + colName, function (data) {
					ContentTab.renderDocument(tabId, dbName, colName, data, cb);
				});
			} else {
				$('#' + tabId + '__anc').click();
				ContentTab.curTabId = tabId;
				if (cb) cb();
			}
		},
		dropConfirm: function (node, title, msg) {
			$('#del-btn').unbind('click');
			var tree = Tree.getDbTree();
			var type = node.a_attr["data-type"];
			$('#del-btn').bind('click', function (e) {
				if (type === 'database') {
					MongoAction.deleteContents(node.text, function (success) {
						success && tree.delete_node(node);
					});
				} else if (type === 'collection') {
					MongoAction.deleteContents(node.parent, node.text, function (success) {
						success && tree.delete_node(node);
					});
				}
			});
			Modal.showConfirmModal(title, msg);
		},
		deleteContents: function (dbName, colName, docId, cb) {
			var url = '/mongodb/db/' + dbName;
			var callback = cb;
			var cName;
			if (colName) {
				if ('function' == typeof colName) {
					callback = colName;
				} else {
					cName = colName;
					url += '/' + colName;
					if (docId) {
						if ('function' == typeof docId) {
							callback = docId;
						} else {
							url += '/' + docId;
						}
					}
				}
			}

			$.ajax({
				type: 'delete',
				url: url,
				contentType: 'application/json',
				success: function (result) {
					Modal.hideModal('del-confirm');
					Tree.reloadTree();
					var _success = false;
					if (result.status === 200) {
						ContentTab.closeTab(dbName, cName);
						_success = true;
					} else {
						Modal.showAlert(result.message);
					}
					callback && callback(_success);
				},
				error: function (result) {
					console.error(result);
					Modal.hideModal('del-confirm');
					Tree.reloadTree();
					if (result.message) {
						Modal.showAlert(result.message);
					}
					callback && callback(false);
				}
			});
		},
		execQuery: function (tabId, dbName, colName, skip, limit) {
			(skip === undefined) && (skip = parseInt($('#' + tabId + '__skip').val() || 0, 10));
			(limit === undefined) && (limit = parseInt($('#' + tabId + '__limit').val() || 50, 10));

			var cmd = $('#' + tabId + '__cmd').val() || 'find';
			var qstr;
			var data = {};
			if (cmd !== 'insert') {
				qstr = ContentTab.queryBox[tabId].getDoc().getValue();
				if (qstr && qstr.length) {
					try {
						data.condition = JSON.parse(Util.replaceQstr(qstr));
					} catch (err) {
						Modal.bsAlert('danger', err.toString(), '#alert-div');
						return;
					}
				}
			}
			if (cmd === 'insert' || cmd === 'update') {
				qstr = ContentTab.docBox[tabId].getDoc().getValue();
				if (qstr && qstr.length) {
					try {
						data.document = JSON.parse(Util.replaceQstr(qstr));
					} catch (err) {
						Modal.bsAlert('danger', err.toString(), '#alert-div');
						return;
					}
				}
			}
			qstr = ContentTab.optionBox[tabId].getDoc().getValue();
			if (qstr && qstr.length) {
				try {
					data.options = JSON.parse(qstr);
				} catch (err) {
					Modal.bsAlert('danger', err.toString(), '#alert-div');
					return;
				}
			}
			$.ajax({
				type: 'post',
				url: '/mongodb/search/' + dbName + '/' + colName + '?cmd=' + cmd + '&skip=' + skip + '&limit=' + limit,
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function (result) {
					var docs = result.message;
					ContentTab.resultBox[tabId].getDoc().setValue(docs);
					$('#' + tabId + '__skip').val(skip);
					$('#' + tabId + '__limit').val(limit);
				},
				error: function (result) {
					console.error(result);
					if (result.message) {
						Modal.bsAlert('danger', result.message, '#alert-div');
					}
				}
			});
		},
		execQueryPrev: function (tabId, dbName, colName) {
			var limit = parseInt($('#' + tabId + '__limit').val() || 50, 10);
			var skip = parseInt($('#' + tabId + '__skip').val() || 0, 10) - limit;
			(skip < 0) && (skip = 0);
			MongoAction.execQuery(tabId, dbName, colName, skip, limit);
		},
		execQueryNext: function (tabId, dbName, colName) {
			var limit = parseInt($('#' + tabId + '__limit').val() || 50, 10);
			var skip = parseInt($('#' + tabId + '__skip').val() || 0, 10) + limit;
			MongoAction.execQuery(tabId, dbName, colName, skip, limit);
		}
	};

	var ContentTab = {
		curTabId: null,
		queryBox: {},
		docBox: {},
		optionBox: {},
		resultBox: {},
		init: function (hostId) {
			Handlebars.registerHelper('i18n', function (input) {
				return $.i18n._(input);
			});
			Handlebars.registerHelper('convertBytes', Util.convertBytes);
			$('.nav-tabs').on('click', 'a', function (e) {
				e.preventDefault();
				if (!$(this).hasClass('add-contact')) {
					$(this).tab('show');
				}
			}).on('click', '.close-tab', function () {
				ContentTab.closeTab($(this).parents('a'));
			});
		},
		clearTab: function () {
			$('.nav-tabs li').removeClass('active');
			$('.tab-pane').removeClass('active');
		},
		selectTab: function (tabId) {
			ContentTab.curTabId = tabId;
			ContentTab.resizeResultBox(tabId);
		},
		closeTab: function (dbName, colName) {
			if (!dbName) return;

			var anchor;
			if ('string' == typeof dbName) {
				var _d = dbName.replace(/[/.,]/g, '__');
				anchor = colName ? $('.' + _d + '__' + colName.replace(/[/.,]/g, '__')) : $('.' + _d);
			} else if (dbName && dbName.length) {
				anchor = dbName;
			}

			if (anchor) {
				$(anchor.attr('href')).remove();
				anchor.parent().remove();
				$(".nav-tabs li").children('a').last().click();
			}
		},
		closeAllTab: function () {
			$('.nav-tabs').children().remove();
			$('.tab-content').children().remove();
		},
		hidePop: function (e) {
			if ($(e.target).attr('data-toggle') !== 'popover' && !$(e.target).closest('.popover').length) {
				$('[data-toggle="popover"]').popover('hide');
			}
		},
		changeCommand: function (tabId, value) {
			$('#' + tabId + '__cmd').selectpicker('val', value);
			var selected = $('#' + tabId + '__cmd').find("option:selected").val();
			ContentTab.commandChanged(tabId, selected);
		},
		commandChanged: function (tabId, selected) {
			if (selected === 'find') {
				$('#' + tabId + '__exbtn').addClass('left');
				$('#' + tabId + '__pg').show();
				$('#' + tabId + '__query_btn').parent().show();
				$('#' + tabId + '__doc_btn').parent().hide();
			} else {
				$('#' + tabId + '__exbtn').removeClass('left');
				$('#' + tabId + '__pg').hide();
				if (selected === 'insert') {
					$('#' + tabId + '__query_btn').parent().hide();
					$('#' + tabId + '__doc_btn').parent().show();
				} else if (selected === 'update') {
					$('#' + tabId + '__query_btn').parent().show();
					$('#' + tabId + '__doc_btn').parent().show();
				} else {
					$('#' + tabId + '__query_btn').parent().show();
					$('#' + tabId + '__doc_btn').parent().hide();
				}
			}
		},
		renderInfoTab: function (opts, data) {
			var tabId = opts.tabId;
			ContentTab.curTabId = tabId;
			var title = opts.title;
			var _class = '';
			if (opts.dbName || opts.colName) {
				title = 'stats: ' + (opts.colName || opts.dbName);
				if (title.length > 30) title = title.substring(0, 27) + '...';
				_class = opts.dbName.replace(/[/.,]/g, '__');
				opts.colName && (_class += ' ' + _class + '__' + opts.colName.replace(/[/.,]/g, '__'));
			}

			var navTmp = Templates.templates.NavTabTemplate;
			$('.nav-tabs').append(navTmp({tabId: tabId, title: title, icon: opts.icon, _class: _class}));

			var infoTmp = Templates.templates.InfoTemplate;
			$('.tab-content').append(infoTmp({tabId: tabId}));

			$('#' + tabId + '__anc').on('click', function () {
				$(this).tab('show');
				ContentTab.curTabId = $(this).attr('aria-controls');
				ContentTab.resizeResultBox(ContentTab.curTabId);
			});

			ContentTab.resultBox[tabId] = $('#' + tabId + '__res').codemirror({
				mode: {name: 'javascript', json: true},
				lineNumbers: true,
				styleActiveLine: true,
				autoClearEmptyLines: true,
				matchBrackets: true,
				readOnly: true,
				theme: 'rubyblue'
			});
			ContentTab.resultBox[tabId].getDoc().setValue(data.result);
			ContentTab.selectTab(tabId);
		},
		i18n: function () {
			return {
				"Documents": $.i18n._('Documents'),
				"Total_doc_size": $.i18n._('Total doc size'),
				"Average_doc_size": $.i18n._('Average doc size'),
				"Pre_allocated_size": $.i18n._('Pre-allocated size'),
				"Indexes": $.i18n._('Indexes'),
				"Total_index_size": $.i18n._('Total index size'),
				"Padding_factor": $.i18n._('Padding factor'),
				"Extents": $.i18n._('Extents')
			};
		},
		renderDocument: function (tabId, dbName, colName, data, cb) {
			ContentTab.curTabId = tabId;
			var title = colName;
			if (title.length > 30) title = title.substring(0, 27) + '...';
			var _d = dbName.replace(/[/.,]/g, '__');
			var _class = _d + ' ' + _d + '__' + colName.replace(/[/.,]/g, '__');

			var navTmp = Templates.templates.NavTabTemplate;
			$('.nav-tabs').append(navTmp({tabId: tabId, title: title, icon: 'file', _class: _class}));

			var browseTmp = Templates.templates.BrowseTemplate;
			$('.tab-content').append(browseTmp(data));

			$('#' + tabId + '__anc').on('click', function () {
				$(this).tab('show');
				ContentTab.curTabId = $(this).attr('aria-controls');
				ContentTab.resizeResultBox(ContentTab.curTabId);
			});

			$('#' + tabId + '__pop').popover({
				html: true,
				content: function () {
					return $('#' + tabId + '__pop_content').html();
				}
			});

			$('#' + tabId + '__cmd').selectpicker({style: 'btn-default', size: 7});
			$('#' + tabId + '__cmd').on('change', function (e) {
				var selected = $(this).find("option:selected").val();
				ContentTab.commandChanged(tabId, selected);
			});

			$('#' + tabId + '__exec').on('click', function (e) {
				MongoAction.execQuery(tabId, dbName, colName, 0, 50);
			});
			$('#' + tabId + '__prev').on('click', function (e) {
				MongoAction.execQueryPrev(tabId, dbName, colName);
			});
			$('#' + tabId + '__next').on('click', function (e) {
				MongoAction.execQueryNext(tabId, dbName, colName);
			});
			$('#' + tabId + '__skip').on('change', function (e) {
				MongoAction.execQuery(tabId, dbName, colName);
			});

			ContentTab.queryBox[tabId] = $('#' + tabId + '__query').codemirror({
				mode: {name: 'javascript', json: true},
				lineNumbers: false,
				styleActiveLine: true,
				autoClearEmptyLines: true,
				matchBrackets: true,
				theme: 'xq-light'
			});
			ContentTab.queryBox[tabId].on('changes', function (instance, changes) {
				ContentTab.resizeResultBox(ContentTab.curTabId);
			});
			ContentTab.docBox[tabId] = $('#' + tabId + '__doc').codemirror({
				mode: {name: 'javascript', json: true},
				lineNumbers: false,
				styleActiveLine: true,
				autoClearEmptyLines: true,
				matchBrackets: true,
				theme: 'xq-light'
			});
			ContentTab.docBox[tabId].on('changes', function (instance, changes) {
				ContentTab.resizeResultBox(ContentTab.curTabId);
			});
			ContentTab.optionBox[tabId] = $('#' + tabId + '__option').codemirror({
				mode: {name: 'javascript', json: true},
				lineNumbers: false,
				styleActiveLine: true,
				autoClearEmptyLines: true,
				matchBrackets: true,
				theme: 'xq-light'
			});
			ContentTab.optionBox[tabId].on('changes', function (instance, changes) {
				ContentTab.resizeResultBox(ContentTab.curTabId);
			});
			ContentTab.resultBox[tabId] = $('#' + tabId + '__res').codemirror({
				mode: {name: 'javascript', json: true},
				lineNumbers: true,
				styleActiveLine: true,
				autoClearEmptyLines: true,
				matchBrackets: true,
				readOnly: true,
				theme: 'rubyblue'
			});
			ContentTab.resizeResultBox(tabId);

			$('#' + tabId + '__query_btn').on('click', function (e) {
				$(this).parent().find('.CodeMirror').toggle();
				var id = $(this).attr('id');
				ContentTab.resizeResultBox(id.substring(0, id.indexOf('__query_btn')));
			});
			$('#' + tabId + '__doc_btn').on('click', function (e) {
				$(this).parent().find('.CodeMirror').toggle();
				var id = $(this).attr('id');
				ContentTab.resizeResultBox(id.substring(0, id.indexOf('__doc_btn')));
			});
			$('#' + tabId + '__opt_btn').on('click', function (e) {
				$(this).parent().find('.CodeMirror').toggle();
				var id = $(this).attr('id');
				ContentTab.resizeResultBox(id.substring(0, id.indexOf('__opt_btn')));
			});

			$('#' + tabId + '__anc').click();

			if (cb) cb();
		},
		resizeResultBox: function (tabId) {
			if (!tabId) return;

			var hh = 40;
			var box_list = ['title-box', 'query-cmd', 'query-box', 'doc-box', 'opt-box', 'exec-box'];
			var box_h;
			box_list.forEach(function (box) {
				if ($('#' + tabId + ' .' + box).css('display') !== 'none') {
					box_h = $('#' + tabId + ' .' + box).outerHeight(true);
					box_h && (hh += box_h);
				}
			});

			var height = $(window).height() - $('.tab-content').offset().top - hh;
			(height < 300) && (height = 300);
			ContentTab.resultBox[tabId] && ContentTab.resultBox[tabId].setSize('100%', height);
		}
	};

	var Modal = {
		bsAlert: function (type, msg, target, keep) {
			$('#bs-alert').remove();
			var title = $.i18n._(type);
			var temp = Templates.templates.BsAlertTemplate;
			var elm = temp({title: title, type: type, msg: msg});

			!target && (target = 'body');
			$(target).append(elm);

			$('#bs-alert').slideDown(500, function () {
				$(this).alert();
			});
			if (!keep) {
				$('#bs-alert').delay(4000).slideUp(500, function () {
					$(this).alert('close');
				});
			}
		},
		showAlert: function (msg) {
			$('#alert-modal-body').html(msg);
			$('#alert-modal').modal('show');
		},
		hideAlert: function () {
			$('#alert-modal').modal('hide');
		},
		showModal: function (id, fid) {
			$('#' + id).modal('show');
			$('#' + id).on('shown.bs.modal', function () {
				if ('string' === typeof fid) {
					fid && $('#' + fid).focus();
				} else if ('function' === typeof fid) {
					fid();
				}
				$('#content').css('position', 'absolute');
			}).on('hidden.bs.modal', function () {
				$('#content').css('position', 'fixed');
			});
		},
		showConfirmModal: function (title, msg) {
			$('#del-model-label').text(title);
			$('#del-model-body').text(msg);
			$('#del-confirm').modal('show').on('shown.bs.modal', function () {
				$('#content').css('position', 'absolute');
			}).on('hidden.bs.modal', function () {
				$('#content').css('position', 'fixed');
			});
		},
		hideModal: function (id) {
			$('#' + id).modal('hide').data('bs.modal', null);
			$('.modal-backdrop').remove();
		}
	};

	var Util = {
		setLocale: function() {
			var locale = (navigator.language || navigator.browserLanguage || navigator.systemLanguage || navigator.userLanguage).substring(0, 2).toLowerCase();
			$.i18n.load($.i18n[locale]);
		},
		resizeApp: function() {
			var barWidth = $('#dbTree').outerWidth(true);
			var bodyMargin = parseInt($('#content').css('margin-left'), 10);
			var newBodyWidth = $(window).width() - barWidth - bodyMargin;
			$('#content').css('left', barWidth);
			$('#content').css('width', newBodyWidth);

			$('#dbTree').height($(window).height() - $('#dbTree').offset().top);
			var contentHeight = $(window).height() - $('#content').offset().top;
			$('#content').css('height', contentHeight);
			$('#sidebarResize').css('height', $('#tree').css('height'));

			ContentTab.resizeResultBox(ContentTab.curTabId);
		},
		setupResizeEvents: function() {
			var sidebarResizing = false;
			var sidebarFrame = $("#tree").width();

			$('#dbTree').bind('resize', Util.resizeApp);
			$(window).bind('resize', Util.resizeApp);

			$(document).on('mouseup', function (e) {
				sidebarResizing = false;
				sidebarFrame = $('#tree').width();
				$('body').removeClass('select-disabled');
			});

			$('#sidebarResize').on('mousedown', function (e) {
				sidebarResizing = e.pageX;
				$('body').addClass('select-disabled');
			});

			$(document).on('mousemove', function (e) {
				if (sidebarResizing) {
					var w = sidebarFrame - (sidebarResizing - e.pageX);
					if (w > 240) {
						$('#tree').width(w);
						Util.resizeApp();
					}
				}
			});
		},
		replaceQstr: function (qstr) {
			var _m, _o;
			_m = /ISODate\s*\(\s*"([-:.0-9A-Za-z]+)"\s*\)/i;
			_o = qstr.match(_m);
			while (_o) {
				qstr = qstr.replace(_m, '"ISODate(\\"' + _o[1] + '\\")"');
				_o = qstr.match(_m);
			}

			_m = /ObjectId\s*\(\s*"([-:.0-9A-Za-z]+)"\s*\)/i;
			_o = qstr.match(_m);
			while (_o) {
				qstr = qstr.replace(_m, '"ObjectId(\\"' + _o[1] + '\\")"');
				_o = qstr.match(_m);
			}

			_m = /Code\s*\(\s*"([\n\r\s()*+,-.0-9:;A-Z\[\]a-z{}]+)"\s*\)/i;
			_o = qstr.match(_m);
			while (_o) {
				qstr = qstr.replace(_m, '"Code(\\"' + _o[1] + '\\")"');
				_o = qstr.match(_m);
			}
			return qstr;
		},
		convertBytes: function (input) {
			input = parseInt(input, 10);
			if (input < 1024) {
				return input.toString() + ' Bytes';
			} else if (input < 1024 * 1024) {
				//Convert to KB and keep 2 decimal values
				input = Math.round((input / 1024) * 100) / 100;
				return input.toString() + ' KB';
			} else if (input < 1024 * 1024 * 1024) {
				input = Math.round((input / (1024 * 1024)) * 100) / 100;
				return input.toString() + ' MB';
			} else {
				return input.toString() + ' Bytes';
			}
		}
	};

	function App() {
	}
	App.prototype.start = function(hostId) {
		!hostId && (hostId = 'unknown');
		Util.setLocale();
		HostMgr.init(hostId);
		Tree.init(hostId);
		ContentTab.init(hostId);
		Util.setupResizeEvents();
	};
	return App;
});