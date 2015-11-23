(function () {
	'use strict';

	function render(badge, color, title) {
		chrome.browserAction.setBadgeText({
			text: badge
		});

		chrome.browserAction.setBadgeBackgroundColor({
			color: color
		});

		chrome.browserAction.setTitle({
			title: title
		});
	}

	function update() {
		window.NotificationsCount(function (err, readTime) {
			var interval = window.FlarumNotify.settings.get('interval');
			
			var text;

			// unconditionally schedule alarm
			chrome.alarms.create({when: Date.now() + 2000 + (interval * 1000)});

			if (err) {
				switch (err.message) {
					case 'missing token':
						text = chrome.i18n.getMessage('extErrorMissingToken');
						break;
					case 'server error':
						text = chrome.i18n.getMessage('extErrorServer');
						break;
					case 'data format error':
					case 'parse error':
						text = chrome.i18n.getMessage('extErrorParse');
						break;
					default:
						text = chrome.i18n.getMessage('extErrorUnknown');
						break;
				}

				render('?', [166, 41, 41, 255], text);
				return;
			}

			window.FlarumNotify.settings.set('readTime', new Date(readTime).getTime());

			window.flarumUnreadCount(function (err, count) {
				
				var text;

				if (err) {
					switch (err.message) {
						case 'missing token':
							text = chrome.i18n.getMessage('extErrorMissingToken');
							break;
						case 'server error':
							text = chrome.i18n.getMessage('extErrorServer');
							break;
						case 'data format error':
						case 'parse error':
							text = chrome.i18n.getMessage('extErrorParse');
							break;
						default:
							text = chrome.i18n.getMessage('extErrorUnknown');
							break;
					}

					render('?', [166, 41, 41, 255], text);
					return;
				}

				window.FlarumNotify.settings.set('count', count);

				if (count === 'cached') {
					return;
				}

				if (count === 0) {
					count = '';
				} else if (count > 999) {
					count = '1k+';
				}

				render(String(count), [65, 131, 196, 255], 'Flarum Notifier');
			});


		});
	}

	chrome.alarms.create({when: Date.now() + 2000});
	chrome.alarms.onAlarm.addListener(update);
	chrome.runtime.onMessage.addListener(update);

	chrome.browserAction.onClicked.addListener(function () {
		var rootUrl = window.FlarumNotify.settings.get('rootUrl');

		function isFlarumUrl(url) {
		 	return url.indexOf(rootUrl) == 0;
		}

		chrome.tabs.getAllInWindow(undefined, function(tabs) {
			for (var i = 0, tab; tab = tabs[i]; i++) {
				if (tab.url && isFlarumUrl(tab.url)) {
					chrome.tabs.update(tab.id, {selected: true});
					return;
				}
			}
			chrome.tabs.create({url: rootUrl});
		});
	});

	update();
})();
