window.CleverJump = (function() {
	'use strict';
	
	var user, userInfo, unloadInfo;
	var id = getRandomString(30);
	var maxScrollPercent = 0;
	var uid;
	
	function hit(event, data) {
		var ab;
		if (event && typeof event === 'object') {
			var opts = event;
			event = opts.event;
			data = opts.data;
			ab = opts.ab;
		}
		
		var obj = {};
		obj.z = new Date().getTimezoneOffset();
		if (window.screen) {
			obj.s = screen.width + '*' + screen.height + '*' + (screen.colorDepth ? screen.colorDepth : screen.pixelDepth);
		}
		if (event !== void 0) {
			obj.e = event
		} else {
			obj.f = id;
		}
		if (data !== void 0) {
			obj.d = data;
		}
		if (user !== void 0) {
			obj.i = user;
		}
		if (userInfo !== void 0) {
			obj.q = userInfo;
		}
		if (window.CJSource) {
			obj.c = window.CJSource;
		}
		if (ab) {
			obj.b = ab;
		}
		obj.r = document.referrer;
		obj.u = document.URL;
		obj.h = document.title.substring(0, 80);
		
		var url = 'https://cleverjump.org/hit?';
		for (var i in obj) {
			url += i + enc(obj[i]) + ';';
		}
		url += Math.random();
		
		new Image().src = url;
	}
	
	function initCookie(callback, attempt) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'https://cleverjump.org/hit/get-uid.php');
		xhr.withCredentials = true;
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				uid = xhr.responseText;
				if (!uid && !attempt) {
					setTimeout(function() {
						initCookie(callback, 1);
					}, 100);
				}
				
				document.cookie = 'cj_uid=' + uid + '; path=/;';
				
				callback && callback(uid);
			}
		}
		xhr.send();
	}
	
	function enc(raw) {
		return encodeURIComponent(raw);
	}
	
	function setUser(u) {
		user = u;
	}
	
	function setUserInfo(i) {
		userInfo = i;
	}
	
	function setUnloadInfo(i) {
		unloadInfo = i;

	}
	
	function getRandomString(len) {
		var abc = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var str = '';
		for (var i = 0; i < len; i++) {
			var idx = Math.floor(Math.random() * abc.length);
			var ch = abc.charAt(idx);
			str += ch;
		}
		return str;
	}
	
	function calcScrollPercent() {
		try {
			var winHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight
			var docHeight = document.documentElement.scrollHeight;
			var scrollTop = window.pageYOffset;
			
			var percent = Math.round(scrollTop / (docHeight - winHeight) * 100)
			if (percent > 100) return;
			
			maxScrollPercent = Math.max(percent, maxScrollPercent);
		} catch (err) {
			return;
		}
	}

	function getScrollPercentage() {
		var winHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
		var docHeight = document.documentElement.scrollHeight;
		var scrollTop = window.pageYOffset;

		return Math.round(scrollTop / (docHeight - winHeight) * 100)
	}
	
	function onUnload() {
		var data = 'id=' + id + '&scroll=' + maxScrollPercent + '&data=' + enc(unloadInfo || '');
		navigator.sendBeacon('https://cleverjump.org/unload', data);
	}
	
	function addAb(abTest) {
		var variant = null;
		var resolved = false;
		var origId = null;
		
		function act(action) {
			if (resolved) return;
			resolved = true;
			
			new Image().src = 'https://cleverjump.org/ab_act?id=' + origId + '&action=' + enc(action);
			
			rememberAbState(abTest.key, variant.key, action);
		}
		
		var variants = abTest.variants;
		
		var state = retrieveAbState(abTest.key);
		if (state && state.variantKey) {
			for (var i = 0; i < variants.length; i++) {
				if (variants[i].key === state.variantKey) {
					variant = variants[i];
				}
			}
			if (variant) {
				variant.fn && variant.fn(variant);
				if (state.action != null) {
					resolved = true;
				}
				origId = state.id;
				return {act: act};
			}
		}
		
		origId = id;
		
		var totalWeight = 0;
		for (var i = 0; i < variants.length; i++) {
			var vr = variants[i];
			vr.weight = parseFloat(vr.weight) || 0;
			totalWeight += vr.weight;
		}
		
		var r = Math.random() * totalWeight;
		var idx = null;
		var curWeight = 0;
		for (var i = 0; i < variants.length; i++) {
			curWeight += variants[i].weight;
			if (r < curWeight) {
				idx = i;
				break;
			}
		}
		
		variant = variants[idx];
		variant.fn && variant.fn(variant);
		
		var ab = JSON.stringify({
			test: abTest.key,
			variant: variant.key
		});
		hit({ab: ab});
		
		rememberAbState(abTest.key, variant.key);
		
		return {act: act};
	}
	
	function retrieveAbState(testKey) {
		var json = localStorage.getItem('cjab_' + testKey);
		if (!json) return;
		
		var data = JSON.parse(json);
		return data;
	}
	
	function rememberAbState(testKey, variantKey, action) {
		var data = {
			variantKey: variantKey,
			id: id
		};
		if (action != null) {
			data.action = action;
		}
		var json = JSON.stringify(data);
		localStorage.setItem('cjab_' + testKey, json);
	}
	
	if (!window.CJNoAutoHit) {
		setTimeout(function() {
			hit();
		}, 10);
	}
	
	setTimeout(function() {
		initCookie();
	}, 200);
	
	try {
		window.addEventListener('scroll', calcScrollPercent);
		if (navigator.sendBeacon) {
			window.addEventListener('unload', onUnload);
		}
	} catch (err) {}

	return {
		hit: hit,
		initCookie: initCookie,
		setUser: setUser,
		setUserInfo: setUserInfo,
		setUnloadInfo: setUnloadInfo,
		getScrollPercentage: getScrollPercentage,
		addAb: addAb
	};
})();