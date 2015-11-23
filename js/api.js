(function () {
	'use strict';

	var xhr = (function () {
		var xhr = new XMLHttpRequest();

		return function (method, url, headers, cb, data) {
			if (!cb && typeof headers === 'function') {
				cb = headers;
				headers = null;
			}

			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4) {
					cb(xhr.responseText, xhr.status, xhr);
					return;
				}
			};

			xhr.open(method, url);

			if (headers) {
				Object.keys(headers).forEach(function (k) {
					xhr.setRequestHeader(k, headers[k]);
				});
			}

			xhr.send(data);
		};
	})();

	window.FlarumNotify = (function () {
		var defaults = {
            rootUrl: chrome.i18n.getMessage('extDefaultUrl'),
			useParticipatingCount: false,
			interval: 60
		};

		var api = {
			settings: {
				get: function (name) {
					var item = localStorage.getItem(name);
					if (item === null) {
						return {}.hasOwnProperty.call(defaults, name) ? defaults[name] : undefined;
					} else if (item === 'true' || item === 'false') {
						return item === 'true';
					}
					return item;
				},
				set: localStorage.setItem.bind(localStorage),
				remove: localStorage.removeItem.bind(localStorage),
				reset: localStorage.clear.bind(localStorage)
			}
		};

		return api;
	})();

	window.flarumUnreadCount = function (cb) {
		var token = window.FlarumNotify.settings.get('oauthToken');
		var opts = {
			Authorization: 'Token ' + token
		};
		var rootUrl = window.FlarumNotify.settings.get('rootUrl');
		var url = rootUrl + '/api/discussions';

		if (!token) {
			cb(new Error('missing token'), null, 60);
			return;
		}

		// 关注特定的话题、节点、分类、标签
        // var participating = window.FlarumNotify.settings.get('participating');

		xhr('GET', url, opts, function (data, status, response) {
			if (status == 0) {
				cb(new Error('network error'), null);
				return;
			}

			if (status >= 500) {
				cb(new Error('server error'), null);
				return;
			}

			if (status >= 400) {
				cb(new Error('client error: ' + data), null);
				return;
			}

			try {
				data = JSON.parse(data);
			} catch (err) {
				cb(new Error('parse error'), null);
				return;
			}

            if (data && data.hasOwnProperty('errors')) {
                cb(new Error('client error'), null);
                return;
            }

			if (data && data.hasOwnProperty('data')) {
				var sum = 0;
				for (var i=0; i<data.data.length;i++) {
                    if (data.data[i].attributes.hasOwnProperty('isHidden') && data.data[i].attributes.hasOwnProperty('isHidden')) {
                        continue;
                    }

                    var readTime = FlarumNotify.settings.get('readTime');
                    if (data.data[i].attributes.hasOwnProperty('readTime')) {
                        if (readTime < new Date(data.data[i].attributes.readTime).getTime()) {
                            readTime = new Date(data.data[i].attributes.readTime).getTime();
                        }
                    }

                    if (data.data[i].attributes.hasOwnProperty('lastTime')) {
                        if (readTime > new Date(data.data[i].attributes.lastTime).getTime()) {
                            continue;
                        }
                    }

					if (data.data[i].attributes.hasOwnProperty('readNumber')) {
						sum += parseInt(data.data[i].attributes.lastPostNumber) - parseInt(data.data[i].attributes.readNumber);
					} else {
						sum += parseInt(data.data[i].attributes.lastPostNumber);
					}
				}

				cb(null, sum);
				return;
			}

			cb(new Error('data format error'), null);
			return;
		});
	};

    window.NotificationsCount = function (cb) {
        var token = window.FlarumNotify.settings.get('oauthToken');
        var opts = {
            Authorization: 'Token ' + token
        };
        var userId = FlarumNotify.settings.get('userId');
        var rootUrl = FlarumNotify.settings.get('rootUrl');
        var url = rootUrl + '/api/users/' + userId;

        if (!token) {
            cb(new Error('missing token'), null, 60);
            return;
        }

        xhr('GET', url, opts, function (data, status, response) {
            if (status >= 500) {
                cb(new Error('server error'), null);
                return;
            }

            if (status >= 400) {
                cb(new Error('client error: ' + data), null);
                return;
            }

            try {
                data = JSON.parse(data);
            } catch (err) {
                cb(new Error('parse error'), null);
                return;
            }

            if (data && data.hasOwnProperty('errors')) {
                cb(new Error('client error'), null);
                return;
            }

            if (data && data.hasOwnProperty('data') && data.data.attributes.hasOwnProperty('readTime')) {
                cb(null, data.data.attributes.readTime);
                return;
            } else if (data && data.hasOwnProperty('data') && data.data.attributes.hasOwnProperty('joinTime')) {
                cb(null, data.data.attributes.joinTime);
                return;
            }

            cb(new Error('data format error'), null);
            return;
        });
    };
})();
