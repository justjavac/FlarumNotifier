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

	document.addEventListener('DOMContentLoaded', function () {
		var username = document.getElementById('username');
		var password = document.getElementById('password');
		var url = document.getElementById('url');
		var btn = document.getElementById('btn');
		var btnCancel = document.getElementById('btn-cancel');
		var logout = document.getElementById('logout');

		function loadSettings() {
			username.value = FlarumNotify.settings.get('username') || '';
			password.value = FlarumNotify.settings.get('password') || '';
			url.value = FlarumNotify.settings.get('rootUrl') || '';
		}

		function loadUserInfo() {
			document.getElementById('token').innerText = FlarumNotify.settings.get('oauthToken');
			getUserInfo(FlarumNotify.settings.get('oauthToken'));
		}

		document.getElementById('btn-check').addEventListener('click', function () {
			getUserInfo(FlarumNotify.settings.get('oauthToken'));
		});

		loadSettings();

		logout.addEventListener('click', function () {
			FlarumNotify.settings.remove('oauthToken');
			FlarumNotify.settings.remove('email');
			FlarumNotify.settings.remove('username');
			FlarumNotify.settings.remove('password');
			FlarumNotify.settings.remove('userId');
			loadUserInfo();
			loadSettings();
		});

		password.addEventListener('keydown', function (event) {
			if (event.keyCode === 13) {
				btn.click();
			}
		});

		var getUserInfo = function(token) {
			var tokenStatus = document.getElementById("token-status");
			tokenStatus.className = "text-reverted";
			tokenStatus.innerText = chrome.i18n.getMessage('extTokenChecking');

			if ( ! token) {
				tokenStatus.className = "text-failure";
				tokenStatus.innerText = chrome.i18n.getMessage('extTokenInvalid');
				FlarumNotify.settings.remove('email');
				document.getElementById('email').innerText = FlarumNotify.settings.get('email');
				return;
			}

			var opts = {
				Authorization: 'Token ' + token
			};
			var userId = FlarumNotify.settings.get('userId');
			var rootUrl = FlarumNotify.settings.get('rootUrl');
			var url = rootUrl + '/api/users/' + userId;

			xhr('GET', url, opts, function (data, status, response) {
				if (status == 0) {
					tokenStatus.className = "text-failure";
					tokenStatus.innerText = chrome.i18n.getMessage('extTokenInvalid')
						+ ": " + chrome.i18n.getMessage('extErrorNetwork');
					FlarumNotify.settings.remove('email');
					document.getElementById('email').innerText = FlarumNotify.settings.get('email');
					return;
				}

				if (status >= 500) {
					tokenStatus.className = "text-failure";
					tokenStatus.innerText = chrome.i18n.getMessage('extTokenInvalid')
						+ ": " + chrome.i18n.getMessage('extErrorServer');
					FlarumNotify.settings.remove('email');
					document.getElementById('email').innerText = FlarumNotify.settings.get('email');
					return;
				}

				if (status >= 400) {
					tokenStatus.className = "text-failure";
					tokenStatus.innerText = chrome.i18n.getMessage('extTokenInvalid');
					FlarumNotify.settings.remove('email');
					document.getElementById('email').innerText = FlarumNotify.settings.get('email');
					return;
				}

				try {
					data = JSON.parse(data);
				} catch (err) {
					tokenStatus.className = "text-failure";
					tokenStatus.innerText = chrome.i18n.getMessage('extTokenInvalid')
						+ ": " + chrome.i18n.getMessage('extErrorParse');
					FlarumNotify.settings.remove('email');
					document.getElementById('email').innerText = FlarumNotify.settings.get('email');
					return;
				}

				if (data && data.data.attributes && data.data.attributes.hasOwnProperty('email')) {
					FlarumNotify.settings.set('email', data.data.attributes.email);
					FlarumNotify.settings.set('unreadNotificationsCount',
						data.data.attributes.unreadNotificationsCount);
					document.getElementById('email').innerText = FlarumNotify.settings.get('email');
					tokenStatus.className = "text-success";
					tokenStatus.innerText = chrome.i18n.getMessage('extTokenValid');
					return;
				}

				tokenStatus.className = "text-failure";
				tokenStatus.innerText = chrome.i18n.getMessage('extTokenInvalid');
				FlarumNotify.settings.remove('email');
				document.getElementById('email').innerText = FlarumNotify.settings.get('email');
				return;
			});
		};

		loadUserInfo();

		function updateBadge() {
			chrome.runtime.sendMessage('update');
		}

		btnCancel.addEventListener('click', function () {
			// document.getElementById("content").style.display = "none";
		});

		btn.addEventListener('click', function () {
			var post_data = "identification=" + username.value + "&password=" + password.value;

			var opts = {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
			};

			xhr('POST', url.value + '/login', opts, function (data, status, response) {
				if (status >= 500) {
					return;
				}

				if (status == 401) {
					alert(chrome.i18n.getMessage('extInvalidLogin'));
					username.focus();
					return;
				}

				if (status >= 400) {
					return;
				}

				try {
					data = JSON.parse(data);
				} catch (err) {
					return;
				}

				if (data && data.hasOwnProperty('token')) {
					window.FlarumNotify.settings.set('oauthToken', data.token);
					window.FlarumNotify.settings.set('userId', data.userId);
					loadUserInfo()
					return;
				}

				return;
			}, post_data);

			FlarumNotify.settings.set('username', username.value);
			FlarumNotify.settings.set('password', password.value);
			FlarumNotify.settings.set('rootUrl', url.value);
			updateBadge();
			loadSettings();
		});
	});
})();
