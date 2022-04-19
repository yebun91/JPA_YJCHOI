// CloudSDK.debug.js
// version: 2.0.63
// date-of-build: 190718
// copyright (c) VXG Inc


window.Log = function(elid){
	var self = this;
	self.mElementID = elid;
	self.el = document.getElementById(elid);
	if(self.el){
		self.el.innerHTML = '<div class="logger-line">Start</div>'; // cleanup
	}

	self.escape = function(msg){
		if(typeof(msg) === 'undefined'){
			return 'undefined';
		}
		if(typeof(msg) === 'object'){
			msg = JSON.stringify(msg);
		}
		var escaped = msg;
		var findReplace = [[/&/g, "&amp;"], [/</g, "&lt;"], [/>/g, "&gt;"], [/"/g, "&quot;"]]
		for(var item in findReplace)
			escaped = escaped.replace(findReplace[item][0], findReplace[item][1]);
		return escaped;
	}

	self.info = function(msg){
		console.log(msg);
		if(self.el){
			self.el.innerHTML += '<div class="logger-line info">' + self.escape(msg) + '</div>';
		}
	}
	
	self.error = function(msg){
		console.error(msg);
		if(self.el){
			self.el.innerHTML += '<div class="logger-line error">' + self.escape(msg) + '</div>';
		}
	}
	
	self.warn = function(msg){
		console.warn(msg);
		if(self.el){
			self.el.innerHTML += '<div class="logger-line warn">' + self.escape(msg) + '</div>';
		}
	}
}

window.CloudHelpers = window.CloudHelpers || {};

// helper function for parsing urls
CloudHelpers.parseUri = function(str) {
	var result = {}
	result.source = str;
	var arr = str.split("/");
	// parse protocol
	result.protocol = arr[0];
	result.protocol = result.protocol.slice(0, result.protocol.length-1);
	result.protocol = result.protocol.toLowerCase();
	str = str.slice(result.protocol.length + 3);

	if (result.protocol == 'http') {
		result.port = 80;
	}

	if (result.protocol == 'https') {
		result.port = 443;
	}

	// parse user/password/host/port
	var end1_of_hp = str.indexOf("/");
	end1_of_hp = end1_of_hp != -1 ? end1_of_hp : str.length;
	var end2_of_hp = str.indexOf("?");
	end2_of_hp = end2_of_hp != -1 ? end2_of_hp : str.length;
	var end_of_hp = Math.min(end1_of_hp, end2_of_hp);
	var uphp = str.substring(0, end_of_hp);
	str = str.slice(end_of_hp); // host
	var uspass = "";
	while(uphp.indexOf("@") != -1){
		uspass += uphp.substring(0, uphp.indexOf("@") + 1);
		uphp = uphp.slice(uphp.indexOf("@") + 1);
	}
	if(uspass != ""){
		if(uspass.indexOf(":") != -1){
			var a = uspass.split(":");
			result.user = a[0];
			result.password = a[1];
			result.password = result.password.substring(0,result.password.length -1);
		}else{
			result.user = uspass;
		}
	}

	if(uphp.indexOf(":") != -1){
		var reg_port = new RegExp(".*:(\\d+)$", "g");
		var port = reg_port.exec(uphp);
		if(port && port.length > 1){
			result.port = parseInt(port[1],10);
			uphp = uphp.slice(0, uphp.length - port[1].length - 1);
		}
	}
	result.host = uphp;

	// parse path/query
	if(str.indexOf("?") != -1){
		result.query = str.substring(str.indexOf("?"), str.length);
		result.path = str.substring(0, str.indexOf("?"));
	}else{
		result.query = "";
		result.path = str;
	}
	if(!result.path || result.path == ""){
		result.path = "/";
	}
	return result;
}

// Helper object (for replace jquery)
CloudHelpers.promise = function(){
	var d = {};
	d.completed = false;
	d.failed = false;
	d.successed = false;
	d.done = function(callback){
		d.done_callback = callback;
		if(d.completed && typeof d.done_callback === "function" && d.successed){
			d.done_callback.apply(this, d.result_arguments);
		}
		return d;
	}
	
	d.fail = function(callback){
		d.fail_callback = callback;
		if(d.completed && typeof d.fail_callback === "function" && d.failed){
			d.fail_callback.apply(this,d.error_arguments);
		}
		return d;
	}
	
	d.resolve = function() {
		if(!d.completed){
			d.result_arguments = arguments; // [];
			if(typeof d.done_callback === "function"){
				d.done_callback.apply(this, d.result_arguments);
			}
		}
		d.successed = true;
		d.completed = true;
	}
	d.reject = function() {
		if(!d.completed){
			d.error_arguments = arguments;
			if(typeof d.fail_callback === "function"){
				d.fail_callback.apply(this, d.error_arguments);
			}
		}
		d.failed = true;
		d.completed = true;
	}
	return d;
};

CloudHelpers.waitPromises = function(arr_promise){
	var p = CloudHelpers.promise();
	var max_len = arr_promise.length;
	var result = [];
	function cmpl(r){
		result.push(r);
		if(result.length == max_len){
			p.resolve(result);
		}
	};
	for(var i in arr_promise){
		arr_promise[i].done(cmpl).fail(cmpl);
	}
	return p;
}

// Helper object (for replace jquery request)
CloudHelpers.request = function(obj){
	var p = CloudHelpers.promise();
	var xhr = ("onload" in new XMLHttpRequest()) ? new XMLHttpRequest : new XDomainRequest;
	xhr.open(obj.type, obj.url, true);
	// Fix for CNVR-1134 CloudSDK Web: need processing cookies in sdk
	// But server can has some problems with sessions
	xhr.withCredentials = true;
	if(obj.contentType){
		xhr.setRequestHeader('Content-Type', obj.contentType);
	}
	if(obj.token){
		xhr.setRequestHeader('Authorization', "SkyVR " + obj.token);
	}
	xhr.onload = function() {
		var r = "";
		if(this.responseText != ""){
			try{
				r = JSON.parse(this.responseText);
			}catch(e){
				console.error(e);
				p.reject(CloudReturnCode.ERROR_WRONG_RESPONSE);
				return;
			}
		}
		var st = this.status;
		// console.log("Status: " + st);
		// console.log("responseText: " + this.responseText);
		if(st >= 200 && st < 300){
			p.resolve(r);
		}else{
			p.reject(r);
		}
		delete xhr;
	}
	xhr.onerror = function(){
		p.reject(xhr);
		delete xhr;
	}
	if(obj.data){
		xhr.send(obj.data);
	}else{
		xhr.send();
	}
	return p;
}

// Helper object (for replace jquery request)
CloudHelpers.request2 = function(obj){
	var p = CloudHelpers.promise();
	var xhr = ("onload" in new XMLHttpRequest()) ? new XMLHttpRequest : new XDomainRequest;
	xhr.open(obj.type, obj.url, true);
	// Fix for CNVR-1134 CloudSDK Web: need processing cookies in sdk
	// But server can has some problems with sessions
	xhr.withCredentials = true;
	if(obj.contentType){
		xhr.setRequestHeader('Content-Type', obj.contentType);
	}
	if(obj.token){
		xhr.setRequestHeader('Authorization', "SkyVR " + obj.token);
	}
	if(obj.access_token){
		xhr.setRequestHeader('Authorization', "Acc " + obj.access_token);
	}
	if(obj.license_key){
		xhr.setRequestHeader('Authorization', "Lic " + obj.license_key);
	}

	xhr.onload = function() {
		var r = "";
		if(this.responseText != ""){
			try{
				r = JSON.parse(this.responseText);
			}catch(e){
				console.error(e);
				p.reject(CloudReturnCode.ERROR_WRONG_RESPONSE);
				return;
			}
		}
		var st = this.status;
		// console.log("Status: " + st);
		// console.log("responseText: " + this.responseText);
		if(st >= 200 && st < 300){
			p.resolve(r);
		}else{
			p.reject(r);
		}
		delete xhr;
	}
	xhr.onerror = function(){
		p.reject(xhr);
		delete xhr;
	}
	if(obj.data){
		xhr.send(obj.data);
	}else{
		xhr.send();
	}
	return p;
}

// Helper object (for replace jquery request)
CloudHelpers.requestJS = function(url, beforeEval){
	var p = CloudHelpers.promise();
	var xhr = ("onload" in new XMLHttpRequest()) ? new XMLHttpRequest : new XDomainRequest;
	xhr.open("GET", url, true);
	// Fix for CNVR-1134 CloudSDK Web: need processing cookies in sdk
	// But server can has some problems with sessions
	// xhr.withCredentials = true;
	xhr.onload = function() {
		var r = "";
		if(this.responseText != ""){
			try{
				r = this.responseText;
			}catch(e){
				console.error(e);
				p.reject(CloudReturnCode.ERROR_WRONG_RESPONSE);
				return;
			}
		}
		var st = this.status;
		// console.log("Status: " + st);
		// console.log("responseText: " + this.responseText);
		if(st >= 200 && st < 300){
			if (beforeEval) {
				r = beforeEval(r);
			}
			eval(r);
			p.resolve(r);
		}else{
			p.reject(r);
		}
		delete xhr;
	}
	xhr.onerror = function(){
		p.reject(xhr);
		delete xhr;
	}
	xhr.send();
	return p;
}

CloudHelpers.handleError = function(err, p, callback){
	if(err.errorDetail && err.status == 404){
		p.reject(CloudReturnCode.ERROR_NOT_FOUND);
	}else if(err.errorDetail && err.status == 401){
		p.reject(CloudReturnCode.ERROR_NOT_AUTHORIZED);
	}else{
		if(callback){
			callback(err, p);
		}else{
			p.reject(err);
		}
	}
}

CloudHelpers.requestAsyncList = function(getData, request_data, p){
	var result = {
		meta: {
			limit: 1000,
			offset: 0,
			total_count: -1
		},
		objects: []
	};
	request_data.limit = result.meta.limit;
	request_data.offset = result.meta.offset;
		
	getData(request_data).fail(function(err){
		p.reject(err);
	}).done(function(r){
		result.meta.total_count = r.meta.total_count;
		// result.meta.expire = r.meta.expire;
		result.objects = result.objects.concat(r.objects);
		if(r.meta.offset + r.objects.length >= r.meta.total_count){
			p.resolve(result);
		}else{
			var p_all = [];
			for(var i = result.meta.limit; i < result.meta.total_count; i = i + result.meta.limit){
				request_data.offset = i;
				p_all.push(getData(request_data));
			}
			CloudHelpers.waitPromises(p_all).done(function(p_results){
				for (var i=0; i < p_results.length; i++) {
					result.objects = result.objects.concat(p_results[i].objects);
				}
				p.resolve(result);
			}).fail(function(err){
				p.reject(err);
			});
		}
	});
}

CloudHelpers.flashVersion = undefined;

CloudHelpers.getFlashVersion = function(){
  // ie
  try {
    try {
      // avoid fp6 minor version lookup issues
      // see: http://blog.deconcept.com/2006/01/11/getvariable-setvariable-crash-internet-explorer-flash-6/
      var axo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash.6');
      try { axo.AllowScriptAccess = 'always'; }
      catch(e) { return '6,0,0'; }
    } catch(e) {}
    return new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version').replace(/\D+/g, ',').match(/^,?(.+),?$/)[1];
  // other browsers
  } catch(e) {
    try {
      if(navigator.mimeTypes["application/x-shockwave-flash"].enabledPlugin){
        return (navigator.plugins["Shockwave Flash 2.0"] || navigator.plugins["Shockwave Flash"]).description.replace(/\D+/g, ",").match(/^,?(.+),?$/)[1];
      }
    } catch(e) {}
  }
  return '0,0,0';
}

CloudHelpers.supportFlash = function(){
	if(!CloudHelpers.flashVersion){
		CloudHelpers.flashVersion = CloudHelpers.getFlashVersion();
	}
	return CloudHelpers.flashVersion != "0,0,0";
}

CloudHelpers.useHls = function(){
	return CloudHelpers.isMobile() || !CloudHelpers.supportFlash() || CloudHelpers.containsPageParam("hls");
}

CloudHelpers.supportWebRTC = function(){
	/*var MediaStream =  $window.webkitMediaStream || $window.MediaStream;
	var IceCandidate = $window.mozRTCIceCandidate || $window.webkitRTCIceCandidate || $window.RTCIceCandidate;
	var SessionDescription = $window.mozRTCSessionDescription || $window.webkitRTCSessionDescription || $window.RTCSessionDescription;*/
	// var PeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;
	return !!(window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection);
}

CloudHelpers.mapToUrlQuery = function(params){
	if(!params) return "";
	var res = [];
	for(var i in params){
		res.push(encodeURIComponent(i) + "=" + encodeURIComponent(params[i]));
	}
	return res.join("&");
}

// detect lang on page

CloudHelpers.lang = function(){
	return CloudHelpers.sLang || CloudHelpers.locale();
};

CloudHelpers.locale = function() {
	langs = ['en', 'ko', 'ru']
	CloudHelpers.sLang = 'en';
	if(CloudHelpers.containsPageParam('lang') && langs.indexOf(CloudHelpers.pageParams['lang']) >= -1){
		CloudHelpers.sLang = CloudHelpers.pageParams['lang'];
	} else if (navigator) {
		var navLang = 'en';
		navLang = navigator.language ? navigator.language.substring(0,2) : navLang;
		navLang = navigator.browserLanguage ? navigator.browserLanguage.substring(0,2) : navLang;
		navLang = navigator.systemLanguage ? navigator.systemLanguage.substring(0,2) : navLang;
		navLang = navigator.userLanguage ? navigator.userLanguage.substring(0,2) : navLang;
		if(langs.indexOf(navLang) >= -1){
			CloudHelpers.sLang = navLang;
		}else{
			console.warn("Unsupported lang " + navLang + ", will be used default lang: " + CloudHelpers.sLang)
		}
		
		CloudHelpers.sLang =  langs.indexOf(navLang) >= -1 ? navLang : CloudHelpers.sLang;
	} else {
		CloudHelpers.sLang = 'en';
	}
	return CloudHelpers.sLang;
};

// parse param of page
CloudHelpers.parsePageParams = function() {
	var loc = window.location.search.slice(1);
	var arr = loc.split("&");
	var result = {};
	var regex = new RegExp("(.*)=([^&#]*)");
	for(var i = 0; i < arr.length; i++){
		if(arr[i].trim() != ""){
			p = regex.exec(arr[i].trim());
			// console.log("results: " + JSON.stringify(p));
			if(p == null){
				result[decodeURIComponent(arr[i].trim().replace(/\+/g, " "))] = '';
			}else{
				result[decodeURIComponent(p[1].replace(/\+/g, " "))] = decodeURIComponent(p[2].replace(/\+/g, " "));
			};
		};
	};
	return result;
};
CloudHelpers.pageParams = CloudHelpers.parsePageParams();
CloudHelpers.containsPageParam = function(name){
	return (typeof CloudHelpers.pageParams[name] !== "undefined");
};

CloudHelpers.keepParams = ["lang", "url", "fcno", "vendor", "demo",
"messaging", "hls", "svcp_host", "backwardDeactivateAfter", "mobile",
"experimental_hls", "page_id", "preview", "customswf"
];

CloudHelpers.changeLocationState = function(newPageParams){
	var url = '';
	var params = [];
	for(var i in CloudHelpers.keepParams){
		var name = CloudHelpers.keepParams[i];
		if(CloudHelpers.containsPageParam(name))
			params.push(name + '=' + encodeURIComponent(CloudHelpers.pageParams[name]))
	}

	for(var p in newPageParams){
		params.push(encodeURIComponent(p) + "=" + encodeURIComponent(newPageParams[p]));
	}
	var new_url = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + params.join("&");
	try{
		if(window.history.pushState)
			window.history.pushState(newPageParams, document.title, new_url);
		else
			console.error("window.history.pushState - function not found");
	}catch(e){
		console.error("changeLocationState: Could not change location to " + new_url);
	}
	CloudHelpers.pagePwindow.btoa('Hello, world');arams = CloudHelpers.parsePageParams();
}

CloudHelpers.osname = function(){
	var os="unknown";
	if (navigator.appVersion.indexOf("Win")!=-1) os="win";
	if (navigator.appVersion.indexOf("Mac")!=-1) os="mac";
	if (navigator.appVersion.indexOf("X11")!=-1) os="unix";
	if (navigator.appVersion.indexOf("Linux")!=-1) os="linux";
	return os;
};

CloudHelpers.isSafari = function(){
	var chr = window.navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
	var sfri = window.navigator.userAgent.toLowerCase().indexOf("safari") > -1;
	return !chr && sfri;
}

CloudHelpers.isEdge = function(){
	return window.navigator.userAgent.indexOf("Edge") > -1;
}

CloudHelpers.isChrome = function(){
	var bIsChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
	return bIsChrome;
}

CloudHelpers.isMobile = function() { 
	if(navigator.userAgent.match(/Android/i)
		|| navigator.userAgent.match(/webOS/i)
		|| navigator.userAgent.match(/iPhone/i)
		|| navigator.userAgent.match(/iPad/i)
		|| navigator.userAgent.match(/iPod/i)
		|| navigator.userAgent.match(/BlackBerry/i)
		|| navigator.userAgent.match(/Windows Phone/i)
	){
		return true;
	};
	return false;
}

CloudHelpers.isIpV4 = function(ip){
	return (ip.match(/^([0-9]{1,3}\.){3}[0-9]{1,3}/)!=null);
}

CloudHelpers.parseUTCTime = function(str){
	str = str.replace(new RegExp('-', 'g'), ' ');
	str = str.replace(new RegExp('T', 'g'), ' ');
	str = str.replace(new RegExp(':', 'g'), ' ');
	var arr = str.split(' ');
	var d = new Date();
	d.setUTCFullYear(parseInt(arr[0],10));
	d.setUTCMonth(parseInt(arr[1],10)-1);
	d.setUTCDate(parseInt(arr[2],10));
	d.setUTCHours(parseInt(arr[3],10));
	d.setUTCMinutes(parseInt(arr[4],10));
	d.setUTCSeconds(parseInt(arr[5],10));
	var t = d.getTime(); 
	t = t - t % 1000;
	return t;
}

CloudHelpers.formatUTCTime = function(t){
	var d = new Date();
	d.setTime(t);
	var str = d.getUTCFullYear() + "-"
		+ ("00" + (d.getUTCMonth()+1)).slice(-2) + "-"
		+ ("00" + d.getUTCDate()).slice(-2) + "T"
		+ ("00" + d.getUTCHours()).slice(-2) + ":"
		+ ("00" + d.getUTCMinutes()).slice(-2) + ":"
		+ ("00" + d.getUTCSeconds()).slice(-2);
	return str;
};

CloudHelpers.ONE_SECOND = 1000;
CloudHelpers.ONE_MINUTE = 60*1000;
CloudHelpers.ONE_HOUR = 60*60*1000;

CloudHelpers.getCurrentTimeUTC = function(){
	return Date.now();
};

CloudHelpers.isLocalFile = function() {
	return window.location.protocol != "https:" && window.location.protocol != "http:";
}

CloudHelpers.combineURL = function(url, login, password){
	if(login == "") login = undefined;
	if(password == "") password = undefined;
	var a = CloudHelpers.parseUri(url);
	var result = a.protocol + "://";
	if(login || password){
		result += login;
		if(password){
			result += ":" + password;
		}
		result += "@";
	}
	result += a.host + (a.port != "" ? ":" + a.port : '') + a.path;
	return result;
}

CloudHelpers.validIpV4 = function(ip){
	var cur_a = ip.split(".");
	for(var i = 0; i < 4; i++){
		var t = parseInt(cur_a[i],10);
		if(t < 0 || t > 255){
			return false;
		}
	}
	return true;
}

CloudHelpers.convertIpV4ToInt = function(ip){
	var cur_a = ip.split(".");
	var result = 0;
	var k = 1;
	for(var i = 3; i >= 0; i--){
		result += parseInt(cur_a[i],10)*k;
		k = k*256;
	}
	return result;
}

CloudHelpers.isValidHostID = function(url){
	var a = CloudHelpers.parseUri(url);
	if(a.host == "localhost") return true;
	if(CloudHelpers.isIpV4(a.host)){
		if(!CloudHelpers.validIpV4(a.host)){
			console.error("Address " + a.host + " - invalid address");
			return false;
		}
	}
	return true;
}

CloudHelpers.isLocalUrlOrIP = function(url){
	var a = CloudHelpers.parseUri(url);
	if(a.host == "localhost") return true;
	if(CloudHelpers.isIpV4(a.host)){
		if(!CloudHelpers.validIpV4(a.host)){
			console.error("Address " + a.host + " - invalid address");
			return true;
		}

		var cur_a = CloudHelpers.convertIpV4ToInt(a.host);
		var local_addresses = [];
		local_addresses.push({'from': '127.0.0.0', 'to': '127.255.255.255', 'comment': 'localhost addresses'});
		for(var i in local_addresses){
			var range_from = CloudHelpers.convertIpV4ToInt(local_addresses[i].from);
			var range_to = CloudHelpers.convertIpV4ToInt(local_addresses[i].to);
			var comment = local_addresses[i].comment;
			if(cur_a >= range_from && cur_a <= range_to){
				console.error(comment);
				return true;
			}
		}
	}
	return false;
}

CloudHelpers.isPublicUrl = function(url){
	var a = CloudHelpers.parseUri(url);
	if(a.host == "localhost") return false;
	if(CloudHelpers.isIpV4(a.host)){
		if(!CloudHelpers.validIpV4(a.host)){
			console.error("Address " + a.host + " - invalid address");
			return false;
		}

		var cur_a = CloudHelpers.convertIpV4ToInt(a.host);
		var local_addresses = [];
		local_addresses.push({'from': '10.0.0.0', 'to': '10.255.255.255', 'comment': 'single class A network'});
		local_addresses.push({'from': '172.16.0.0', 'to': '172.31.255.255', 'comment': '16 contiguous class B network'});
		local_addresses.push({'from': '192.168.0.0', 'to': '192.168.255.255', 'comment': '256 contiguous class C network'});
		local_addresses.push({'from': '169.254.0.0', 'to': '169.254.255.255', 'comment': 'Link-local address also refered to as Automatic Private IP Addressing'});
		local_addresses.push({'from': '127.0.0.0', 'to': '127.255.255.255', 'comment': 'localhost addresses'});		
		for(var i in local_addresses){
			var range_from = CloudHelpers.convertIpV4ToInt(local_addresses[i].from);
			var range_to = CloudHelpers.convertIpV4ToInt(local_addresses[i].to);
			var comment = local_addresses[i].comment;
			if(cur_a >= range_from && cur_a <= range_to){
				console.error(comment);
				return false;
			}
		}
	}
	return true;
}
CloudHelpers.isFrame = function(){
	try {
		return window.self !== window.top;
	} catch (e) {
		return true;
	}
}

CloudHelpers.isFireFox = function(){
	return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}

CloudHelpers.isAndroid = function() { 
	if(navigator.userAgent.match(/Android/i)){
		return true;
	};
	return false;
}

CloudHelpers.isIOS = function() { 
	if(navigator.userAgent.match(/iPhone/i)
		|| navigator.userAgent.match(/iPad/i)
		|| navigator.userAgent.match(/iPod/i)
	){
		return true;
	};
	return false;
}

CloudHelpers.isWindowsPhone = function() { 
	if(navigator.userAgent.match(/Windows Phone/i)){
		return true;
	};
	return false;
}

CloudHelpers.isBlackBerry = function() { 
	if(navigator.userAgent.match(/BlackBerry/i)){
		return true;
	};
	return false;
}

CloudHelpers.splitUserInfoFromURL = function(url){
	var a = CloudHelpers.parseUri(url);
	var result = a.protocol + "://" + a.host + (a.port ? ":" + a.port : '') + a.path;
	// console.log(a);
	var login = a.user;
	var password = a.password;
	return {url: result, login: login, password: password};
}

CloudHelpers.getAbsolutePosition = function(element){
	var r = { x: element.offsetLeft, y: element.offsetTop };
	if (element.offsetParent) {
	var tmp = CloudHelpers.getAbsolutePosition(element.offsetParent);
		r.x += tmp.x;
		r.y += tmp.y;
	}
	return r;
};

CloudHelpers.cache = CloudHelpers.cache || {};
CloudHelpers.cache.timezones = CloudHelpers.cache.timezones || {};

// helper function
CloudHelpers.getOffsetTimezone = function(timezone) {
	if(!moment) {
		console.warn("Requrired moment.js library");
		return 0;
	}
	if(CloudHelpers.cache.timezones[timezone] == undefined){
		var n = new Date();
		if(timezone && timezone != ""){
			var offset = moment(n).tz(timezone).format("Z");
			var c = offset[0];
			if(c < '0' || c > '9'){
				offset = offset.substring(1);
			};
			var ts_sig = (c == '-') ? -1 : 1;
			var hs = offset.split(":");
			offset = ts_sig *(parseInt(hs[0],10)*60 + parseInt(hs[1],10));
			CloudHelpers.cache.timezones[timezone] = offset*60000;
		}else{
			CloudHelpers.cache.timezones[timezone] = 0;
		}
	}
	return CloudHelpers.cache.timezones[timezone];
}


// polyfill for ie11
Number.isInteger = Number.isInteger || function(value) {
    return typeof value === "number" && 
           isFinite(value) && 
           Math.floor(value) === value;
};


CloudHelpers.autoPlayAllowed = true;
CloudHelpers.checkAutoplay = function(ch_auto_callback){
	ch_auto_callback = ch_auto_callback || function() {};
	var d = new CloudHelpers.promise();
	d.done(function(){
		console.log("checkAutoplay: done")
		ch_auto_callback(CloudHelpers.autoPlayAllowed);
	})
	d.fail(function(){
		console.log("checkAutoplay: waiting")
		ch_auto_callback(CloudHelpers.autoPlayAllowed);
	})
	var _result = null;
	var tmp_video_el = document.createElement("div");
	tmp_video_el.innerHTML = "<video muted></video>";
	tmp_video_el = tmp_video_el.children[0];
	tmp_video_el.addEventListener('waiting', function() {
		console.log("checkAutoplay: waiting, ", _result)
		if (_result == null) {
			CloudHelpers.autoPlayAllowed = true;
			d.resolve(); // it's ok autoplay for Chrome
			tmp_video_el.remove();
		}
	}, false);
	
	var p = tmp_video_el.play();
	var s = '';
	if (window['Promise']) {
		s = window['Promise'].toString();
	}

	if (s.indexOf('function Promise()') !== -1
		|| s.indexOf('function ZoneAwarePromise()') !== -1) {

		p.catch(function(error) {
			// console.error("checkAutoplay, error:", error)
			// Check if it is the right error
			if(error.name == "NotAllowedError") {
				console.error("error.name:", "NotAllowedError")
				// CloudHelpers.autoPlayAllowed = false;
				_result = false;
				CloudHelpers.autoPlayAllowed = _result;
				d.reject();
			} else {
				console.error("checkAutoplay: happened something else");
				d.reject();
				throw error; // happened something else
			}
			tmp_video_el.remove();
		})
	} else {
		console.error("checkAutoplay could not work in your browser");
		d.reject();
		ch_auto_callback(CloudHelpers.autoPlayAllowed);
	}
}

if (typeof document !== 'undefined') {
	CloudHelpers.checkAutoplay(function(d){ console.log("checkautoplay: autoplay2 ", d); });
}

// http://jsbin.com/otecul/1/edit
CloudHelpers.humanFileSize = function(bytes) {
    var thresh = 1024;
    if(bytes < thresh) return bytes + ' B';
    var units = ['kB','MB','GB','TB','PB','EB','ZB','YB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(bytes >= thresh);
    return bytes.toFixed(1)+' '+units[u];
};


CloudHelpers.base64_encode = function(str){
	return window.btoa(str);
}

CloudHelpers.base64_decode = function(b64){
	return window.atob(b64);
}

CloudHelpers.copy = function(obj){
	if (null == obj || "object" != typeof obj) {
		console.error("Expected object");
		return obj;
	}
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

CloudHelpers.unpackAccessToken = function(access_token) {
	var result = {
		host: 'web.skyvr.videoexpertsgroup.com'
	};
	var camid = 0;
	try {
		var obj = atob(access_token);
		obj = JSON.parse(obj);
		console.log("Token: ", obj);
		if (!obj.token) {
			console.error('Invalid access token format (missing "token")');
			return null;
		}

		if (!obj.access) {
			console.error('Invalid access token format (missing "access")');
			return null;
		}

		if (obj.token && obj.camid && obj.access && obj.token !== '' && obj.camid !== '' && obj.access !== ''){
			result.share_token = obj.token;
			result.camid = obj.camid;
			result.access = obj.access;
		}

		if (obj.api) {
			result.host = obj.api;
			// console.log('self.host: ', result.host);
		}

		if (obj.api_p) {
			result.api_port = obj.api_p;
			// console.log('self.api_port: ', result.api_port);
		}

		if (obj.api_security_port) {
			result.api_security_port = obj.api_security_port;
			// console.log('self.api_security_port: ', result.api_security_port);
		}

	} catch (err) {
		console.error('Invalid access token format');
		return null;
	}
	
	result.base_url = result.host;
	if (result.host == 'web.skyvr.videoexpertsgroup.com') {
		result.base_url = 'https://' + result.host;
	} else if (location.protocol === 'https:') {
		result.base_url = 'https://' + result.host;
		if (result.api_secutiry_port != null) {
			result.base_url += ':' + result.api_secutiry_port;
			result.port = result.api_secutiry_port;
		} else {
			result.port = 443;
		}
	} else if (location.protocol === 'http:') {
		result.base_url = 'http://' + result.host;
		if (self.api_port != null) {
			result.base_url += ':' + result.api_port;
			result.port = result.api_port;
		} else {
			result.port = 80;
		}
	} else {
		console.error('Invalid protocol');
		return null;
	}

	return result;
}

CloudHelpers.createCallbacks = function() {
	return new function() {
		var mCallbacks = {};
		console.log(this);
		var self = this;
		self.executeCallbacks = function(evnt, args){
			function execCB(n, evnt_, args_){
				setTimeout(function(){
					mCallbacks[n](evnt_, args_);
				},1);
			}
			for(var n in mCallbacks){
				execCB(n, evnt, args);
			}
		}
		self.removeCallback = function(uniqname){
			delete mCallbacks[uniqname];
		}
		self.addCallback = function(uniqname, func){
			if(typeof(func) !== "function"){
				console.error("Second parameter expected function");
				return;
			}
			if(mCallbacks[uniqname]){
				console.warn(uniqname + " - already registered callback, will be removed before add");
				self.removeCallback(uniqname);
			}
			mCallbacks[uniqname] = func;
		}
	};
}

CloudHelpers.compareVersions = function(v1,v2) {
		v1 = v1 || "0.0.0";
		v2 = v2 || "0.0.0";
		var _v1 = v1.split(".");
		var _v2 = v2.split(".");
		if (_v1.length != 3 || _v2.length != 3) {
				console.error("[CloudHelpers.compareVersions] could not compare versions ", v1, v2);
				return
		}
		for (var i = 0; i < 3; i++) {
				_v1[i] = parseInt(_v1[i], 10);
				_v2[i] = parseInt(_v2[i], 10);
				if (_v1[i] != _v2[i]) {
						return _v2[i] - _v1[i];
				}
		}
		return 0;
}
// Cloud API Library.
// Network Layer Between FrontEnd And BackEnd.
// Part of CloudSDK

window.CloudAPI = function(cloud_token, svcp_url){
	var self = this;
	self.token = cloud_token.token;
	self.token_expire = cloud_token.expire;
	self.token_expireUTC = Date.parse(cloud_token.expire + "Z");
	self.host = svcp_url;
	self.token_type = cloud_token.type;

	self.isShareToken = function(){
		return self.token_type == 'share';
	}

	self.endpoints = {
		api: self.host + "api/v2/",
		cameras: self.host+"api/v2/cameras/",
		admin_cameras: self.host+"api/v2/admin/cameras/",
		camsess: self.host+"api/v2/camsess/",
		server: self.host+"api/v2/server/",
		account: self.host+"api/v2/account/",
		cmngrs: self.host+"api/v2/cmngrs/",
		storage: self.host+"api/v2/storage/",
		clips: self.host+"api/v2/storage/clips/",
		channels: self.host+"api/v3/channels/"
	};

	self.endpoints_v4 = {
		api: self.host + "api/v4/",
		live_watch: self.host + "api/v4/live/watch/",
	};

	self._getCloudToken = function(){
		return self.token;
	};

	self.updateApiToken = function(){
		return CloudHelpers.request({
			url: self.endpoints.account + 'token/api/',
			type: 'GET',
			token: self._getCloudToken()
		});
	}

	// get fresh token
	if(!self.isShareToken()){
		self.updateApiToken().done(function(new_token){
			console.warn("[CloudConnection] Cloud Token Api refreshed");
			self.token = new_token.token;
			self.token_expire = new_token.expire;
			self.token_expireUTC = Date.parse(new_token.expire + "Z");
			// start poling token thread 
			clearInterval(self.updateTokenInterval);
			self.updateTokenInterval = setInterval(function(){
				if(self.token_expireUTC - new Date().getTime() < 20*60000){ // less then 20 minutes
					self.updateApiToken().done(function(new_token){
						console.warn("[CloudConnection] Cloud Token api refreshed");
						self.token = new_token.token;
						self.token_expire = new_token.expire;
						self.token_expireUTC = Date.parse(new_token.expire + "Z");
					});
				}else{
					console.log("[CloudConnection] Cloud Token is live");
				}
			}, 5*60000); // every 5 minutes
		});
	}

	self.dispose = function(){
		self.token = null;
		clearInterval(self.updateTokenInterval);
	}
	
	self.createCamera = function(data){
		return CloudHelpers.request({
			url: self.endpoints.cameras + '?detail=detail',
			type: 'POST',
			token: self._getCloudToken(),
			data: JSON.stringify(data),
			contentType: 'application/json'
		});
	}

	self.camerasList = function(data){
		data = data || {};
		if(self.isShareToken()){
			data.token = self._getCloudToken();	
		}
		var query = CloudHelpers.mapToUrlQuery(data);
		return CloudHelpers.request({
			url: self.endpoints.cameras + "?" + query,
			type: 'GET',
			token: self._getCloudToken(),
			// data: JSON.stringify(data),
			contentType: 'application/json'
		});
	}
	
	self.getCameraList = self.camerasList;
	
	self.deleteCamera = function(camid){
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + '/',
			type: 'DELETE',
			token: self._getCloudToken()
		});
	}

	self.getCamera = function(camid, data){ // deprecated
		data = data || {};
		data['detail'] = 'detail';
		if(self.isShareToken()){
			data.token = self._getCloudToken();	
		}
		var query = CloudHelpers.mapToUrlQuery(data);
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + '/?' + query,
			type: 'GET',
			token: self._getCloudToken()
		});
	}

	self.getCamera2 = function(camid, data){ // new
		data = data || {};
		if(self.isShareToken()){
			data.token = self._getCloudToken();	
		}
		var query = CloudHelpers.mapToUrlQuery(data);
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + '/?' + query,
			type: 'GET',
			token: self._getCloudToken()
		});
	}
	
	self.cameraUsage = function(camid){
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + '/usage/',
			type: 'GET',
			token: self._getCloudToken()
		});
	}
	
	self.updateCamera = function(camid, data){
		data = data || {};
		if(self.isShareToken()){
			data.token = self._getCloudToken();	
		}
		var query = CloudHelpers.mapToUrlQuery(data);
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + '/?' + query,
			type: 'PUT',
			token: self._getCloudToken(),
			data: JSON.stringify(data),
			contentType: 'application/json'
		});
	}
	
	self.cameraLiveUrls = function(camid){
		var data = {};
		var r_url = self.endpoints.cameras + camid + '/live_urls/?media_urls=webrtc&';
		if(self.isShareToken()){
			data.token = self._getCloudToken();
			data.media_urls = 'webrtc';
			r_url = self.endpoints_v4.live_watch + '?';
		}
		var query = CloudHelpers.mapToUrlQuery(data);
		return CloudHelpers.request({
			url: r_url + query,
			type: 'GET',
			token: self._getCloudToken(),
			data: JSON.stringify(data),
		});
	}

	self.cameraStreamUrls_webrtc = function(camid){
		var data = {};
		var r_url = self.endpoints.cameras + camid + '/stream_urls/?';
		data.proto = 'webrtc';

		if(self.isShareToken()){
			data.token = self._getCloudToken();
		}
		var query = CloudHelpers.mapToUrlQuery(data);
		return CloudHelpers.request({
			url: r_url + query,
			type: 'GET',
			token: self._getCloudToken(),
			data: JSON.stringify(data),
		});
	}
	
	self.getServerTime = function(){
		var p = CloudHelpers.promise();
		
		CloudHelpers.request({
			url: self.endpoints.api + 'server/time/',
			type: 'GET'
		}).done(function(r){
			var current_utc = CloudHelpers.getCurrentTimeUTC();
			self.diffServerTime = Date.parse(r.utc + "Z") - current_utc;
			p.resolve(r);
		}).fail(function(err){
			p.reject(err);
		})
		return p;
	}
	
	self.getAccountInfo = function(){
		return CloudHelpers.request({
			url: self.endpoints.account,
			type: 'GET',
			token: self._getCloudToken()
		});
	}
	
	self.getAccountCapabilities = function(){
		return CloudHelpers.request({
			url: self.endpoints.account + "capabilities/",
			type: 'GET',
			token: self._getCloudToken()
		});
	}

	self.cameraMediaStreams = function(camid){
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/media_streams/",
			type: 'GET',
			token: self._getCloudToken()
		});
	};

	self.updateCameraMediaStreams = function(camid, data){
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/media_streams/",
			type: 'PUT',
			data: JSON.stringify(data),
			contentType: 'application/json',
			token: self._getCloudToken()
		});
	};

	self.cameraPreview = function(camid){
		var data = {};
		if(self.isShareToken()){
			data.token = self._getCloudToken();	
		}
		var query = CloudHelpers.mapToUrlQuery(data);
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/preview/?" + query,
			type: 'GET',
			token: self._getCloudToken()
		});
	};

	self.cameraUpdatePreview = function(camid){
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/preview/update/",
			type: 'POST',
			token: self._getCloudToken()
		});
	};
	
	self.cameraSendPtz = function(camid, data){
		data = data || {};
		var get_params = {};
		if(self.isShareToken()){
			get_params.token = self._getCloudToken();	
		}
		var query = CloudHelpers.mapToUrlQuery(get_params);
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/send_ptz/?" + query,
			type: 'POST',
			token: self._getCloudToken(),
			data: JSON.stringify(data),
			contentType: 'application/json'
		});
	}
	
	self.cameraPtzExecute = function(camid, data){
		data = data || {};
		var get_params = {};
		if(self.isShareToken()){
			get_params.token = self._getCloudToken();	
		}
		var query = CloudHelpers.mapToUrlQuery(get_params);
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/ptz/execute/?" + query,
			type: 'POST',
			token: self._getCloudToken(),
			data: JSON.stringify(data),
			contentType: 'application/json'
		});
	}
	
	self.cameraPtz = function(camid){
		var data = {};
		if(self.isShareToken()){
			data.token = self._getCloudToken();	
		}
		var query = CloudHelpers.mapToUrlQuery(data);
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/ptz/?" + query,
			type: 'GET',
			token: self._getCloudToken(),
		});
	}

	self.storageRecords = function(camid, startDT, endDt){
		var p = CloudHelpers.promise();
		var request_data = {
			camid: camid,
			limit: 1000,
			offset: 0,
			start: startDT
		};
		if(endDt)
			request_data.end = endDt;
		
		if(self.isShareToken()){
			request_data.token = self._getCloudToken();
		}
		
		function getData(req_data){
			var query = CloudHelpers.mapToUrlQuery(req_data);
			return CloudHelpers.request({
				url: self.endpoints.storage + "data/?" + query,
				type: 'GET',
				token: self._getCloudToken()
			});
		};
		
		CloudHelpers.requestAsyncList(getData, request_data, p);
		return p;
	};
	
	self.storageRecordsFirst = function(camid, startDT, nLimit){
		// console.log("storageRecordsFirst, nLimit: " + nLimit);

		var p = CloudHelpers.promise();
		var request_data = {
			camid: camid,
			limit: nLimit,
			offset: 0,
			start: startDT
		};
		request_data.limit = nLimit;
		if(self.isShareToken()){
			request_data.token = self._getCloudToken();
		}
			
		/*function getData(req_data){
			console.log("req_data: ", query);
			var query = CloudHelpers.mapToUrlQuery(req_data);
			console.log(query);
			return CloudHelpers.request({
				url: self.endpoints.storage + "data/?" + query,
				type: 'GET',
				token: self._getCloudToken()
			});
		};*/
		
		// CloudHelpers.requestAsyncList(getData, request_data_st, p);
		// return p;

		var query = CloudHelpers.mapToUrlQuery(request_data);
		return CloudHelpers.request({
			url: self.endpoints.storage + "data/?" + query,
			type: 'GET',
			token: self._getCloudToken()
		});
	};
	
	self.storageTimeline = function(camid, start_dt, end_dt, slice){
		var request_data = {
			start: start_dt,
			end: end_dt,
			slices: slice
		};
		if(self.isShareToken()){
			request_data.token = self._getCloudToken();
		}

		var query = CloudHelpers.mapToUrlQuery(request_data);
		return CloudHelpers.request({
			url: self.endpoints.storage + "timeline/" + camid + "/?" + query,
			type: 'GET',
			token: self._getCloudToken()
		});
	};
	
	self.storageActivity = function(camid, use_timezone){

		var request_data = {
			camid: camid
		};

		if(use_timezone){
			request_data.daysincamtz = '';
		}

		if(self.isShareToken()){
			request_data.token = self._getCloudToken();
		}

		var query = CloudHelpers.mapToUrlQuery(request_data);
		return CloudHelpers.request({
			url: self.endpoints.storage + "activity/?" + query,
			type: 'GET',
			token: self._getCloudToken()
		});
	};
	
	/* cameramanager */

	self.resetCameraManager = function(cmid, data){
		if(self.isShareToken()){
			data = data || {};
			return CloudHelpers.request({
				url: self.endpoints.cmngrs + cmid + "/reset/?token=" + self._getCloudToken(),
				type: 'POST',
				// token: self._getCloudToken(),
				data: JSON.stringify(data),
				contentType: 'application/json'
			});
		}else{
			data = data || {};
			return CloudHelpers.request({
				url: self.endpoints.cmngrs + cmid + "/reset/",
				type: 'POST',
				token: self._getCloudToken(),
				data: JSON.stringify(data),
				contentType: 'application/json'
			});
		}
	};
	
	self.updateCameraManager = function(cmid, data){
		data = data || {};
		return CloudHelpers.request({
			url: self.endpoints.cmngrs + cmid + "/",
			type: 'PUT',
			token: self._getCloudToken(),
			data: JSON.stringify(data),
			contentType: 'application/json'
		});
	};
	
	/* camsess */
	
	self.getCamsessList = function(data){
		var query = CloudHelpers.mapToUrlQuery(data);
		return CloudHelpers.request({
			url: self.endpoints.camsess + "?" + query,
			type: 'GET',
			token: self._getCloudToken(),
			// data: JSON.stringify(data),
			contentType: 'application/json'
		});
	}

	self.getCamsess = function(id){
		return CloudHelpers.request({
			url: self.endpoints.camsess + id + "/?detail=detail",
			type: 'GET',
			token: self._getCloudToken(),
			// data: JSON.stringify(data),
			contentType: 'application/json'
		});
	}
	
	self.getCamsessRecords = function(sessid){
		return CloudHelpers.request({
			url: self.endpoints.camsess + sessid + "/records/",
			type: 'GET',
			token: self._getCloudToken(),
			// data: JSON.stringify(data),
			contentType: 'application/json'
		});
	}
	
	self.deleteCamsess = function(sessid){
		return CloudHelpers.request({
			url: self.endpoints.camsess + sessid + "/",
			type: 'DELETE',
			token: self._getCloudToken(),
		});
	}

	// sharing
	self.creareCameraSharingToken = function(camid, share_name, acls){
		share_name = share_name || '';
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/sharings/",
			type: 'POST',
			data: JSON.stringify({camid: camid, name: share_name, access: acls}),
			contentType: 'application/json',
			token: self._getCloudToken(),
		});
	}

	self.updateCameraSharingToken = function(camid, shid, obj){
		obj = obj || {};
		obj.camid = camid;
		obj.shid = shid;
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/sharings/" + shid + "/",
			type: 'PUT',
			data: JSON.stringify(obj),
			contentType: 'application/json',
			token: self._getCloudToken(),
		});
	}

	self.getCameraSharingTokensList = function(camid){
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/sharings/?detail=detail",
			type: 'GET',
			token: self._getCloudToken(),
		});
	}

	self.deleteCameraSharingToken = function(camid, sharing_token){
		return CloudHelpers.request({
			url: self.endpoints.cameras + camid + "/sharings/" + sharing_token + '/',
			type: 'DELETE',
			token: self._getCloudToken(),
		});
	}

	self.getChannels = function(){
		return CloudHelpers.request({
			url: self.endpoints.channels,
			type: 'GET',
			token: self._getCloudToken(),
		});
	}

    self.getCameraStreamingURLs = function(camid){
        return CloudHelpers.request({
            url: self.endpoints.cameras + camid + "/stream_urls/",
            type: 'GET',
            token: self._getCloudToken()
        });
    };

};

window.SkyVR = window.CloudAPI;

CloudAPI.config = {
	url: "",
	url_cameras: "",
	url_api: "",
	cameraID: "",
	user_name: "",
	vendor: ""
};

CloudAPI.setToCookie = function(name, value) {
	var date = new Date( new Date().getTime() + (7 * 24 * 60 * 60 * 1000) ); // cookie on week
	document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + "; path=/; expires="+date.toUTCString();
}

CloudAPI.getFromCookie = function(name) {
	var matches = document.cookie.match(new RegExp(
		"(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
	));
	return matches ? decodeURIComponent(matches[1]) : '';
}

CloudAPI.removeFromCookie = function(name) {
	document.cookie = encodeURIComponent(name) + "=; path=/;";
}

CloudAPI.cache = {
	cameras: {},
	timezones: {}
};

CloudAPI.cache.cameraInfo = function(camid){
	if(camid)
		return CloudAPI.cache.cameras[camid];
	else if(CloudAPI.isCameraID())
		return CloudAPI.cache.cameras[CloudAPI.cameraID()];
};

// symlink
CloudAPI.cache.getCameraInfo = CloudAPI.cache.cameraInfo;

CloudAPI.cache.mergeObjects = function(obj1, obj2){
	// rewrite options
	for(var k in obj2){
		var t = typeof obj2[k];
		if(t == "boolean" || t == "string" || t == "number"){
			if(obj1[k] != obj2[k]){
				if(obj1[k]){
					console.log("Changed " + k);
					CloudAPI.events.trigger('CAMERA_INFO_CHANGED', {'name':k, 'new_value':obj2[k]});
				}
				obj1[k] = obj2[k];
			}
		}else if(Array.isArray(obj2[k])){
			obj1[k] = obj2[k];
		}else if(t == "object"){
			if(!obj1[k]) obj1[k] = {};
			obj1[k] = CloudAPI.cache.mergeObjects(obj1[k], obj2[k]);
		}
	}
	return obj1;
}

CloudAPI.cache.updateCameraInfo = function(cam){
	var camid = cam.id;
	if(!CloudAPI.cache.cameras[camid]){
		CloudAPI.cache.cameras[camid] = {};
	};
	CloudAPI.cache.cameras[camid] = CloudAPI.cache.mergeObjects(CloudAPI.cache.cameras[camid], cam);
}

CloudAPI.cache.setCameraInfo = function(cam){
	var camid = cam.id;
	if(CloudAPI.cache.cameras[camid] == undefined){
		CloudAPI.cache.cameras[camid] = {};
	};
	var changed_p2p_settings = cam['p2p_streaming'] && cam['p2p_streaming'] == true ? true : false; // need request
	
	var prev_cam = CloudAPI.cache.cameras[camid];
	CloudAPI.cache.cameras[camid] = CloudAPI.cache.mergeObjects(prev_cam, cam);

	// TODO clean rewrite options (exclude p2p and p2p_settings and video and audio struct)
	CloudAPI.cache.cameras[camid]['lastTimeUpdated'] = Date.now();
	// console.log("[CLOUDAPI] CloudAPI.cache.cameras[" + camid + "]: ", CloudAPI.cache.cameras[camid]);
	return changed_p2p_settings;
};
CloudAPI.cache.setP2PSettings = function(cameraID, p2p_settings){
	if(CloudAPI.cache.cameras[cameraID] == undefined){
		CloudAPI.cache.cameras[cameraID] = {};
	}
	/*for(var k in cam){
	var t = typeof cam[k];
	// console.log("Type: " + t);
	if(t == "boolean" || t == "string" || t == "number"){
		if(CloudAPI.cache.cameras[camid][k] != cam[k]){
			if(CloudAPI.cache.cameras[camid][k])
				console.log("Changed " + k);
			CloudAPI.cache.cameras[camid][k] = cam[k];
		}*/
	CloudAPI.cache.cameras[cameraID].p2p = p2p_settings;
	CloudAPI.cache.cameras[cameraID].p2p_settings = CloudAPI.cache.cameras[cameraID].p2p;
	// console.log("[CLOUDAPI] setP2PSettings. CloudAPI.cache.cameras[" + cameraID + "]: ", CloudAPI.cache.cameras[cameraID]);
};

CloudAPI.cache.setMemoryCard = function(cameraID, memory_card){
	if(CloudAPI.cache.cameras[cameraID] == undefined){
		CloudAPI.cache.cameras[cameraID] = {};
	}
	CloudAPI.cache.cameras[cameraID].memory_card = memory_card;
};

CloudAPI.cache.setPtzCaps = function(cameraID, ptz_caps){
	if(CloudAPI.cache.cameras[cameraID] == undefined){
		CloudAPI.cache.cameras[cameraID] = {};
	}
	CloudAPI.cache.cameras[cameraID].ptz = ptz_caps;
};

CloudAPI.cache.updateCameraAudio = function(cameraID, audio_struct){
	if(!CloudAPI.cache.cameras[cameraID]){
		CloudAPI.cache.cameras[cameraID] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]["audio"]){
		CloudAPI.cache.cameras[cameraID]["audio"] = {};
	}
	CloudAPI.cache.cameras[cameraID].audio = CloudAPI.cache.mergeObjects(CloudAPI.cache.cameras[cameraID].audio, audio_struct);
};
CloudAPI.cache.cameraAudio = function(cameraID){
	cameraID = cameraID || CloudAPI.cameraID();
	if(!CloudAPI.cache.cameras[cameraID]){
		return {};
	};
	return CloudAPI.cache.cameras[cameraID].audio;
};
CloudAPI.cache.updateCameraVideo = function(cameraID, video_struct){
	if(!CloudAPI.cache.cameras[cameraID]){
		CloudAPI.cache.cameras[cameraID] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]["video"]){
		CloudAPI.cache.cameras[cameraID]["video"] = {};
	}
	var video = CloudAPI.cache.cameras[cameraID]["video"];
	CloudAPI.cache.cameras[cameraID]["video"] = CloudAPI.cache.mergeObjects(video, video_struct);
};
CloudAPI.cache.cameraVideo = function(cameraID){
	cameraID = cameraID || CloudAPI.cameraID();
	if(!CloudAPI.cache.cameras[cameraID]){
		return {};
	};
	return CloudAPI.cache.cameras[cameraID].video;
}
CloudAPI.cache.cameraVideoStreamName = function(cameraID){
	cameraID = cameraID || CloudAPI.cameraID();
	if(!CloudAPI.cache.cameras[cameraID]){
		return {};
	};
	var video = CloudAPI.cache.cameras[cameraID].video;
	if(video.streams){
		for(var v in video.streams){
			return v;
		}
	}
	return;
};
CloudAPI.cache.cameraVideoStreams = function(cameraID){
	cameraID = cameraID || CloudAPI.cameraID();
	if(!CloudAPI.cache.cameras[cameraID]){
		return {};
	};
	var video = CloudAPI.cache.cameras[cameraID].video;
	if(video.streams){
		return video.streams;
	}
	return;
};
CloudAPI.cache.setLimits = function(cameraID, struct_limits){
	if(!CloudAPI.cache.cameras[cameraID]){
		CloudAPI.cache.cameras[cameraID] = {};
	};
	CloudAPI.cache.cameras[cameraID].limits = struct_limits;
};
CloudAPI.cache.updateCameraVideoStream = function(cameraID, vs_id, struct){
	if(!CloudAPI.cache.cameras[cameraID]){
		CloudAPI.cache.cameras[cameraID] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['video']){
		CloudAPI.cache.cameras[cameraID]['video'] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['video']['streams']){
		CloudAPI.cache.cameras[cameraID]['video']['streams'] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['video']['streams'][vs_id]){
		CloudAPI.cache.cameras[cameraID]['video']['streams'][vs_id] = {};
	};
	var prev = CloudAPI.cache.cameras[cameraID]['video']['streams'][vs_id];
	CloudAPI.cache.cameras[cameraID]['video']['streams'][vs_id] = CloudAPI.cache.mergeObjects(prev, struct);
}
CloudAPI.cache.setAudioStream = function(cameraID, as_id, struct){
	if(!CloudAPI.cache.cameras[cameraID]){
		CloudAPI.cache.cameras[cameraID] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['audio']){
		CloudAPI.cache.cameras[cameraID]['audio'] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['audio']['streams']){
		CloudAPI.cache.cameras[cameraID]['audio']['streams'] = {};
	};
	CloudAPI.cache.cameras[cameraID]['audio']['streams'][as_id] = struct;
}
CloudAPI.cache.setMediaStreams = function(cameraID, media_streams_struct){
	if(!CloudAPI.cache.cameras[cameraID]){
		CloudAPI.cache.cameras[cameraID] = {};
	};
	CloudAPI.cache.cameras[cameraID]['media_streams'] = media_streams_struct;
};
CloudAPI.cache.updateEventProcessingEventsMotion = function(cameraID, struct){
	if(!CloudAPI.cache.cameras[cameraID]){
		CloudAPI.cache.cameras[cameraID] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['event_processing']){
		CloudAPI.cache.cameras[cameraID]['event_processing'] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['event_processing']['events']){
		CloudAPI.cache.cameras[cameraID]['event_processing']['events'] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['event_processing']['events']['motion']){
		CloudAPI.cache.cameras[cameraID]['event_processing']['events']['motion'] = {};
	};
	var prev = CloudAPI.cache.cameras[cameraID]['event_processing']['events']['motion'];
	CloudAPI.cache.cameras[cameraID]['event_processing']['events']['motion'] = CloudAPI.cache.mergeObjects(prev, struct);
};
CloudAPI.cache.updateCameraEventProcessingEventsSound = function(cameraID, struct){
	if(!CloudAPI.cache.cameras[cameraID]){
		CloudAPI.cache.cameras[cameraID] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['event_processing']){
		CloudAPI.cache.cameras[cameraID]['event_processing'] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['event_processing']['events']){
		CloudAPI.cache.cameras[cameraID]['event_processing']['events'] = {};
	};
	if(!CloudAPI.cache.cameras[cameraID]['event_processing']['events']['sound']){
		CloudAPI.cache.cameras[cameraID]['event_processing']['events']['sound'] = {};
	};
	var prev = CloudAPI.cache.cameras[cameraID]['event_processing']['events']['sound'];
	CloudAPI.cache.cameras[cameraID]['event_processing']['events']['sound'] = CloudAPI.cache.mergeObjects(prev, struct);
};

CloudAPI.generateNewLocation = function(page){
	var params = [];
	if(CloudHelpers.containsPageParam("lang"))
		params.push("lang=" +encodeURIComponent(CloudAPI.pageParams["lang"]));
	if(CloudHelpers.containsPageParam("vendor"))
		params.push("vendor=" +encodeURIComponent(CloudAPI.pageParams["vendor"]));
	if(CloudHelpers.containsPageParam("mobile"))
		params.push('mobile=' + encodeURIComponent(CloudAPI.pageParams['mobile']))
	params.push("p=" +encodeURIComponent(page));
	return "?" + params.join("&");
}

CloudAPI.setURL = function(url){
	if(CloudAPI.config.url != url){
		CloudAPI.config.url = url;
		CloudAPI.config.url_api = url+"api/v2/";
		CloudAPI.config.url_cameras = url+"api/v2/cameras/";
		CloudAPI.config.url_admin_cameras = url+"api/v2/admin/cameras/";
		CloudAPI.config.url_camsess = url+"api/v2/camsess/";
		CloudAPI.config.url_server = url+"api/v2/server/";
		CloudAPI.config.url_account = url+"api/v2/account/";
		CloudAPI.config.url_cmngrs = url+"api/v2/cmngrs/";
		CloudAPI.config.url_storage = url+"api/v2/storage/";
		CloudAPI.config.url_clips = url+"api/v2/storage/clips/";
		CloudAPI.config.anonToken = {
			token: '',
			type: 'anon',
			expire: '',
			expireTimeUTC: 0
		};
		// console.log(localStorage);
		if(localStorage.getItem('SkyVR_anonToken'))
			CloudAPI.config.anonToken = JSON.parse(localStorage.getItem('SkyVR_anonToken'));
		CloudAPI.config.apiToken = {
			token: '',
			type: 'api',
			expire: '',
			expireTimeUTC: 0
		};
		CloudAPI.config.shareToken = {};
		var old_token = CloudAPI.getFromStorage('SkyVR_apiToken');
		if(old_token){
			var apiToken = JSON.parse(old_token)
			if(apiToken.expireTimeUTC > Date.now()){
				CloudAPI.config.apiToken = apiToken;
			}
		}
		CloudAPI.setToStorage('CloudAPI_svcp_host', url);
	};
};


CloudAPI.isExpiredApiToken = function(){
	if(CloudAPI.config.apiToken.expireTimeUTC){
		if(CloudAPI.config.apiToken.expireTimeUTC > Date.now()){
			return false;
		}else{
			return true;
		}
	}else{
		return true;
	}
}

CloudAPI.applyApiToken = function(){
	$.ajaxSetup({
		crossDomain: true,
		cache: false,
		beforeSend: function(xhr,settings) {
			if(CloudAPI.config.apiToken && CloudAPI.config.apiToken.token) {
				xhr.setRequestHeader('Authorization', 'SkyVR ' + CloudAPI.config.apiToken.token);
			}
		}
	});
}
// $.support.cors = true;
/*
CloudAPI.updatePageProgressCaption = function(){
	
	var loading_translate = {
		'en' : 'Loading...',
		'ru' : 'Загрузка...',
		'ko' : '카메라 정보 가져오는 중...',
		'it' : 'Caricamento in corso...'
	}
	
	try{
		if(document.getElementById('progress-caption')){
			if(loading_translate[CloudAPI.lang()]){
				document.getElementById('progress-caption').innerHTML = loading_translate[CloudAPI.lang()];
			}else{
				document.getElementById('progress-caption').innerHTML = loading_translate["en"];
			}
		}
	}catch(e){
	}
}

CloudAPI.loadVendorScripts = function(vendor, path){
	if(vendor != ''){
		var js = document.createElement("script");
		js.type = "text/javascript";
		js.src = (path ? path : './') + 'vendor/' + vendor + "/cc.js";
		document.head.appendChild(js);
		
		js.onload = function(){
			CloudAPI.updatePageProgressCaption(); // TODO move to CloudUI
			if(CloudHelpers.containsPageParam("customswf")){
				cc.custom_videojs_swf = "swf/video-js-custom-vxg.swf";
			}

			if(CloudAPI.onLoadedVendorScript){
				CloudAPI.onLoadedVendorScript();
			}
		}

		js.onerror = function(){
			console.error("Not found vendor use default");
			CloudAPI.config.vendor = 'VXG';
			CloudAPI.loadVendorScripts(CloudAPI.config.vendor, path);
		}

		var cc_css = document.createElement("link");
		cc_css.rel = "stylesheet";
		cc_css.href = (path ? path : './') + "vendor/" + vendor + "/cc.min.css";
		document.head.appendChild(cc_css);
		
		var cc_css2 = document.createElement("link");
		cc_css2.rel = "stylesheet";
		cc_css2.href = (path ? path : './') + "vendor/" + vendor + "/pageloader.min.css";
		document.head.appendChild(cc_css2);
	}else{
		// Load default scripts
		console.log('Not found vendor');
		CloudAPI.loadVendorScripts('VXG', path);
	}
};

CloudAPI.url = function() {
	return CloudAPI.config.url;
};

CloudAPI.setCameraID = function(id){
	if(CloudAPI.config.cameraID != id && id){
		CloudAPI.config.cameraID = id;
		console.log("[CLOUDAPI] new cam id: " + id);
		if(!CloudAPI.cache.camera){
			CloudAPI.cameraInfo().done(function(cam){
				CloudAPI.cache.camera = cam;
			});
		}
	} else if (!id){
		CloudAPI.config.cameraID = undefined;
		CloudAPI.cache.camera = undefined;
	}
};
CloudAPI.cameraID = function(){
	return CloudAPI.config.cameraID;
};
CloudAPI.cameraManagerID = function(){
	return CloudAPI.cache.cameras[CloudAPI.config.cameraID]['cmngrid'];
};
CloudAPI.isCameraID = function(){
	if(CloudAPI.config.cameraID == undefined){
		console.error("[CLOUDAPI] cameraID is undefined");
		return false;
	};
	return true;
};
CloudAPI.isP2PStreaming_byId = function(camid){
	var cam = CloudAPI.cache.cameras[camid];
	if(cam && cam['p2p_streaming'] && cam.p2p_streaming == true){
		return true;
	}
	return false;
};
CloudAPI.isP2PStreaming = function(){
	if(CloudAPI.cache.cameraInfo() == undefined){
		console.error("[CLOUDAPI] cameraID is undefined");
		return false;
	};
	return CloudAPI.isP2PStreaming_byId(CloudAPI.cache.cameraInfo().id);
};

CloudAPI.hasMemoryCard_byId = function(camid){
	var cam = CloudAPI.cache.cameras[camid];
	if(cam && cam['memory_card'] && cam.memory_card.status != "none"){
		return true;
	}
	return false;
}

CloudAPI.hasMemoryCard = function(){
	if(CloudAPI.cache.cameraInfo() == undefined){
		console.error("[CLOUDAPI] cameraID is undefined");
		return false;
	};
	return CloudAPI.hasMemoryCard_byId(CloudAPI.cache.cameraInfo().id);
}

CloudAPI.convertUTCTimeToStr = function(t){
	var d = new Date();
	d.setTime(t);
	var monthesTrans = ["short_Jan", "short_Feb", "short_Mar",
		"short_Apr", "short_May", "short_June",
		"short_July", "short_Aug", "short_Sep",
		"short_Oct", "short_Nov", "short_Dec"
	];
	var str = d.getUTCDate() + CloudUI.tr(monthesTrans[d.getUTCMonth()]) + " " + d.getUTCFullYear() + " "
		+ ("00" + d.getUTCHours()).slice(-2) + ":" + ("00" + d.getUTCMinutes()).slice(-2) + ":" + ("00" + d.getUTCSeconds()).slice(-2);
	if(CloudAPI.lang() == 'ko'){
		str = ("00" + (d.getUTCMonth() + 1)).slice(-2) + '/' + ("00" + d.getUTCDate()).slice(-2) + "/" + d.getUTCFullYear() + " "
			+ ("00" + d.getUTCHours()).slice(-2) + ":" + ("00" + d.getUTCMinutes()).slice(-2) + ":" + ("00" + d.getUTCSeconds()).slice(-2);
	}
	return str;
};

CloudAPI.convertUTCTimeToSimpleStr = function(t){
	var d = new Date();
	d.setTime(t);
	var str = d.getUTCFullYear() + "-"
		+ ("00" + (d.getUTCMonth()+1)).slice(-2) + "-"
		+ ("00" + d.getUTCDate()).slice(-2) + " "
		+ ("00" + d.getUTCHours()).slice(-2) + ":"
		+ ("00" + d.getUTCMinutes()).slice(-2) + ":"
		+ ("00" + d.getUTCSeconds()).slice(-2);
	return str;
}

// helper function
CloudAPI.getOffsetTimezone = function() {
	var cam = CloudAPI.cache.cameraInfo();
	if(!cam) return 0;
	if(CloudAPI.cache.timezones[cam.timezone] == undefined){
		var n = new Date();
		if(cam.timezone && cam.timezone != ""){
			var cameraOffset = moment(n).tz(cam.timezone).format("Z");
			var c = cameraOffset[0];
			if(c < '0' || c > '9'){
				cameraOffset = cameraOffset.substring(1);
			};
			var ts_sig = (c == '-') ? -1 : 1;
			var hs = cameraOffset.split(":");
			cameraOffset = ts_sig *(parseInt(hs[0],10)*60 + parseInt(hs[1],10));
			CloudAPI.cache.timezones[cam.timezone] = cameraOffset*60000;
		}else{
			CloudAPI.cache.timezones[cam.timezone] = 0;
		}
	}
	return CloudAPI.cache.timezones[cam.timezone];
}
CloudAPI.getCurrentTimeUTC = function(){
	return Date.now();
};
CloudAPI.getCurrentTimeByCameraTimezone = function(){
	return Date.now() + CloudAPI.getOffsetTimezone();
};
*/

CloudAPI.enable401handler = function() {
	/*$.ajaxSetup({
		error : function(jqXHR, textStatus, errorThrown) {
			if (jqXHR.status == 401 && jqXHR.statusText == "UNAUTHORIZED") {
				
				var uri = CloudAPI.parseUri(CloudAPI.url);
				var uri2 = CloudAPI.parseUri(CloudAPI.config.url);
				if(uri.host == "" || uri.host == uri2.host){
					CloudAPI.disable401handler();

					if(application.apiToken) {
						application.apiToken.destroy();
					}
					application.cleanupHeader();
					try{ application.player.disposeVideo(); }catch(e) { console.error(e); }
					try{ application.timeline.dispose(); }catch(e) { console.error(e); }

					event.trigger(event.UNAUTHORIZED_REQUEST);
					// application.trigger('showSignIn');
					// window.location = "?";
				}
			}
		}
	});*/
};
CloudAPI.disable401handler = function() {
	$.ajaxSetup({
		error : function(jqXHR, textStatus, errorThrown) {
		}
	});
};
CloudAPI.printStack = function(){
	var err = new Error();
	console.error(err.stack);
};
// constants for pages
CloudAPI.PAGE_SIGNIN = "signin";

/*	CloudAPI.getUTC = function(camtimezone){
	var now = new Date();
	var now_utc = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
	var d = new Date.now();
	var t = d.getTimezoneOffset();
};*/

CloudAPI.hasAccess = function(caminfo, rule){
	if(SkyUI.isDemo()) return true;
	if(!caminfo) return false;
	if(!caminfo['access']) return true;
	var bResult = false;
	for(var s in caminfo['access']){
		if(caminfo['access'][s] == rule)
			bResult = true;
	}
	return bResult;
}

CloudAPI.hasAccessSettings = function(caminfo){
	if(SkyUI.isDemo()) return true;
	caminfo = caminfo || CloudAPI.cache.cameraInfo();
	return CloudAPI.hasAccess(caminfo, "all");
}

CloudAPI.hasAccessMotionDetection = function(caminfo){
	if(SkyUI.isDemo())return true;
	caminfo = caminfo || CloudAPI.cache.cameraInfo();
	return CloudAPI.hasAccess(caminfo, 'all') || CloudAPI.hasAccess(caminfo, 'ptz');
};

CloudAPI.hasAccessClips = function(caminfo){
	if(SkyUI.isDemo())return true;
	caminfo = caminfo || CloudAPI.cache.cameraInfo();
	return CloudAPI.hasAccess(caminfo, "clipping") || CloudAPI.hasAccess(caminfo, "clipplay") || CloudAPI.hasAccess(caminfo, "watch") || CloudAPI.hasAccess(caminfo, "cplay") || CloudAPI.hasAccess(caminfo, "all");
}

CloudAPI.hasAccessLive = function(caminfo){
	if(SkyUI.isDemo())return true;
	caminfo = caminfo || CloudAPI.cache.cameraInfo();
	return CloudAPI.hasAccess(caminfo, "ptz") || CloudAPI.hasAccess(caminfo, "live") || CloudAPI.hasAccess(caminfo, "watch") || CloudAPI.hasAccess(caminfo, "all");
}

CloudAPI.hasAccessPlayback = function(caminfo){
	if(SkyUI.isDemo())return true;
	caminfo = caminfo || CloudAPI.cache.cameraInfo();
	return CloudAPI.hasAccess(caminfo, "clipping") || CloudAPI.hasAccess(caminfo, "play") || CloudAPI.hasAccess(caminfo, "watch") || CloudAPI.hasAccess(caminfo, "splay") || CloudAPI.hasAccess(caminfo, "all");
}

CloudAPI.hasAccessMakeClip = function(caminfo){
	if(SkyUI.isDemo())return true;
	caminfo = caminfo || CloudAPI.cache.cameraInfo();
	return CloudAPI.hasAccess(caminfo, "clipping") || CloudAPI.hasAccess(caminfo, "all");
}

CloudAPI.hasAccessBackAudio = function(caminfo){
	if(SkyUI.isDemo())return true;
	caminfo = caminfo || CloudAPI.cache.cameraInfo();
	return CloudAPI.hasAccess(caminfo, "all") || CloudAPI.hasAccess(caminfo, "backaudio");
}

CloudAPI.handleNothing = function(response){
	// nothing
};

CloudAPI.handleNothingError = function(xhr, ajaxOptions, thrownError){
	// nothing
};
CloudAPI.handleError = function(xhr, ajaxOptions, thrownError){
	console.error(thrownError);
};

CloudAPI.parseUri = function(str) {
	// parseUri 1.2.2
	// (c) Steven Levithan <stevenlevithan.com>
	// MIT License
	function parseUri(str) {
		var	o   = parseUri.options,
			m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
			uri = {},
			i   = 14;

		while (i--) uri[o.key[i]] = m[i] || "";

		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});

		return uri;
	};
	parseUri.options = {
		strictMode: false,
		key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
		q:   {
			name:   "queryKey",
			parser: /(?:^|&)([^&=]*)=?([^&]*)/g
		},
		parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
		}
	};
	return parseUri(str)
};

CloudAPI.logout = function(callback){
	$.ajax({
		url: CloudAPI.config.url_account + "logout/",
		type: 'POST',
		success: callback,
		error: CloudAPI.handleError
	});
};
CloudAPI.cameraVideoStream = function(vs_id){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.config.cameraID;
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/video/streams/" + vs_id + "/",
		type : "GET"
	}).done(function(response){
		CloudAPI.cache.updateCameraVideoStream(camid, vs_id, response);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.cameraLimits = function(){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.config.cameraID;
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/limits/",
		type : "GET"
	}).done(function(response){
		CloudAPI.cache.setLimits(CloudAPI.cameraID(), response);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.cameraEventProcessingEventsMotion = function(){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.config.cameraID;
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/event_processing/events/motion/",
		type : "GET"
	}).done(function(response){
		CloudAPI.cache.updateEventProcessingEventsMotion(camid, response);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
}
CloudAPI.updateCameraEventProcessingEventsMotion = function(data){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/event_processing/events/motion/",
		type : 'PUT',
		data:  JSON.stringify(data),
		contentType: 'application/json'
	}).done(function(){
		CloudAPI.cache.updateEventProcessingEventsMotion(camid, data);
		d.resolve();
	}).fail(function(){
		d.reject();
	});
	return d;
}

CloudAPI.cameraEventProcessingEventsSound = function(){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.config.cameraID;
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/event_processing/events/sound/",
		type : "GET"
	}).done(function(response){
		CloudAPI.cache.updateCameraEventProcessingEventsSound(camid, response);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
}

/*
CloudAPI.cameraSendPtz = function(data){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/send_ptz/",
		type : 'POST',
		data:  JSON.stringify(data),
		contentType: 'application/json'
	}).done(function(response){
		console.log(response);
		d.resolve();
	}).fail(function(){
		d.reject();
	});
	return d;
}

CloudAPI.cameraPtzExecute = function(data){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/ptz/execute/",
		type : 'POST',
		data:  JSON.stringify(data),
		contentType: 'application/json'
	}).done(function(response){
		console.log(response);
		d.resolve();
	}).fail(function(){
		d.reject();
	});
	return d;
}

CloudAPI.cameraPtz = function(camid){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = camid || CloudAPI.cameraID();
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/ptz/",
		type : 'GET'
	}).done(function(r){
		CloudAPI.cache.setPtzCaps(camid, r);
		d.resolve(r);
	}).fail(function(r){
		d.reject(r);
	});
	return d;
}
*/

CloudAPI.updateCameraEventProcessingEventsSound = function(data){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/event_processing/events/sound/",
		type : 'PUT',
		data:  JSON.stringify(data),
		contentType: 'application/json'
	}).done(function(){
		// console.log("");
		CloudAPI.cache.updateCameraEventProcessingEventsSound(camid, data);
		d.resolve();
	}).fail(function(){
		d.reject();
	});
	return d;
}

CloudAPI.updateCameraVideoStream = function(vs_id, data){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url : CloudAPI.config.url_cameras + camid + "/video/streams/" + vs_id + "/",
		type : "PUT",
		data:  JSON.stringify(data),
		contentType: 'application/json'
	}).done(function(){
		console.log("[CLOUDAPI] [CLOUDAPI] Updated video/streams/" + vs_id + " in cache for " + camid);
		CloudAPI.cache.updateCameraVideoStream(camid, vs_id, data);
		d.resolve();
	}).fail(function(){
		d.reject();
	})
	return d;
};
// depreacted please use updateCameraVideoStream
CloudAPI.setVBRQuality = function(newValue, vs_id, cb_success, cb_error){
	if(!CloudAPI.isCameraID()) return;
	cb_success = (cb_success == undefined) ? CloudAPI.handleNothing : cb_success;
	cb_error = (cb_error == undefined) ? CloudAPI.handleError : cb_error;
	var data = {};
	data.vbr_quality = newValue;
	data.vbr = true;
	$.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.config.cameraID + "/video/streams/" + vs_id + "/",
		type: 'PUT',
		success: cb_success,
		error: cb_success,
		data:  JSON.stringify(data),
		contentType: 'application/json'
	});
};
CloudAPI.formatMemoryCard = function(){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()){
		d.reject();
		return d;
	}
	var camid = CloudAPI.config.cameraID;
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/format_memory_card/",
		type: 'POST'
	}).done(function(response){
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.cameraMemoryCard = function(camid){
	var d = $.Deferred();
	var camid = camid || CloudAPI.config.cameraID;
	if(!camid){
		d.reject();
		return d;
	}
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/memory_card/",
		type: 'GET'
	}).done(function(response){
		CloudAPI.cache.setMemoryCard(camid, response)
		d.resolve(response);
	}).fail(function(){
		CloudAPI.cache.setMemoryCard(camid, { "status" : "none" });
		d.reject();
	});
	return d;
};

CloudAPI.cameraWifi = function(){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()){
		d.reject();
		return d;
	}
	$.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.config.cameraID + "/wifi/",
		type: 'GET'
	}).done(function(response){
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.cameraFirmwares = function(){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()){
		d.reject();
		return d;
	}
	$.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.config.cameraID + "/firmwares/?limit=1000",
		type: 'GET',
		contentType: 'application/json'
	}).done(function(response){
		d.resolve(response.objects);
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.cameraFirmwaresUpgrade = function(version){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()){
		d.reject();
		return d;
	}
	console.log("[CLOUDAPI] upgrade firmware to version: " + version);
	var data = {};
	data.version = version;
	$.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.config.cameraID + "/firmwares/upgrade/",
		type: 'POST',
		data:  JSON.stringify(data),
		contentType: 'application/json'
	}).done(function(){
		d.resolve();
	}).fail(function(jqXHR, textStatus){
		console.error("[CLOUDAPI] cameraFirmwaresUpgrade, " + textStatus, jqXHR);
		d.reject();
	});
	return d;
};

CloudAPI.accountInfo = function(){
	var d = $.Deferred();
	$.ajax({
		url: CloudAPI.config.url_account,
		type: 'GET',
		cache : false
	}).done(function(r){
		CloudAPI.cache.account = r;
		d.resolve(r);
	}).fail(function(r){
		console.log("Fail " + CloudAPI.config.url_account);
		console.error(r);
		d.reject(r);
	});
	return d;
}

CloudAPI.anonToken = function(){
	var d = $.Deferred();
	var now = Date.now();
	var min = CloudAPI.config.anonToken.expireTimeUTC - 10*60*1000; // 10 min
	var max = CloudAPI.config.anonToken.expireTimeUTC - 5*60*1000; // 5 min
	if(now > min && now < max){
		$.ajaxSetup({
			crossDomain: true,
			cache: false,
			headers:{
				'Authorization': 'SkyVR ' + CloudAPI.config.anonToken.token
			}
		});
		d.resolve(CloudAPI.config.anonToken);
	}else{
		$.ajax({
			url: CloudAPI.config.url_account + "token/anon/",
			type: 'GET'
		}).done(function(tk){
			CloudAPI.config.anonToken.token = tk.token;
			CloudAPI.config.anonToken.type = tk.type;
			CloudAPI.config.anonToken.expire = tk.expire;
			CloudAPI.config.anonToken.expireTimeUTC = Date.parse(tk.expire+'Z');
			CloudAPI.setToStorage('SkyVR_anonToken', JSON.stringify(CloudAPI.config.anonToken));
			$.ajaxSetup({
				crossDomain: true,
				cache: false,
				headers:{
					'Authorization': 'SkyVR ' + tk.token
				}
			});
			d.resolve(CloudAPI.config.anonToken);
		}).fail(function(){
			d.reject();
		});
	}
	return d;
};

CloudAPI.accountShare = function(data){
	var params = {};
	params.camid = CloudAPI.cameraID();
	return $.ajax({
		url: CloudAPI.config.url_account + 'share/',
		type: 'POST',
		data:  JSON.stringify(data),
		contentType: 'application/json',
		cache : false
	});
};
CloudAPI.capabilities = function(cb_success, cb_error){
	cb_success = (cb_success == undefined) ? CloudAPI.handleNothing : cb_success;
	cb_error = (cb_error == undefined) ? CloudAPI.handleError : cb_error;
	$.ajax({
		url: CloudAPI.config.url_api + "capabilities/",
		type: 'GET',
		success: cb_success,
		error: cb_error
	});
};

CloudAPI.cameraInfo = function(camid){
	var d = $.Deferred();
	camid = camid || CloudAPI.cameraID();
	if(camid == undefined){
		d.reject();
		return d;
	}
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/",
		type: 'GET'
	}).done(function(response){
		
		if(CloudAPI.cache.cameras[response.id] && !CloudAPI.cache.cameras[response.id]["memory_card"]){
			console.log("cameraInfo cahce has not memory card info for camid=" + response.id);
			CloudAPI.cameraMemoryCard(response.id);
		}else if(!CloudAPI.cache.cameras[response.id]){
			console.log("cameraInfo has not in cache for camid=" + response.id);
			CloudAPI.cameraMemoryCard(response.id);	
		}
		
		
		// SET to cache
		if(CloudAPI.cache.setCameraInfo(response)){
			CloudAPI.cameraP2PSettings(camid).done(function(p2p_settings){
				d.resolve(CloudAPI.cache.cameras[camid]);
			}).fail(function() {
				d.resolve(CloudAPI.cache.cameras[camid]);
			});
		}else{
			d.resolve(CloudAPI.cache.cameras[camid]);
		}
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.updateCamera = function(data){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	$.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/",
		type: 'PUT',
		data:  JSON.stringify(data),
		contentType: 'application/json'
	}).done(function(response){
		console.log("[CLOUDAPI] Updated camera in cache for " + CloudAPI.cameraID());
		data.id = CloudAPI.cameraID();
		CloudAPI.cache.updateCameraInfo(data);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.cameraMesaging = function(camid){
	var d = $.Deferred();
	camid = camid || CloudAPI.cameraID();
	if(camid == undefined){
		d.reject();
		return d;
	}
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/raw_messaging/",
		type: 'GET'
	}).done(function(r){
		d.resolve(r);
	}).fail(function(r){
		d.reject(r);
	});
	return d;
};

CloudAPI.updateCameraAudio = function(data){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/audio/",
		type: 'PUT',
		data:  JSON.stringify(data),
		contentType: 'application/json'
	}).done(function(response){
		console.log("[CLOUDAPI] Updated audio in cache for " + camid);
		CloudAPI.cache.updateCameraAudio(camid, data);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};
CloudAPI.cameraAudio = function(){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/audio/",
		type: 'GET'
	}).done(function(response){
		CloudAPI.cache.updateCameraAudio(camid, response);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};
CloudAPI.cameraVideo = function(){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/video/",
		type: 'GET'
	}).done(function(response){
		CloudAPI.cache.updateCameraVideo(camid, response);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};
CloudAPI.updateCameraVideo = function(data){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/video/",
		type: 'PUT',
		contentType: 'application/json',
		data:  JSON.stringify(data)
	}).done(function(response){
		CloudAPI.cache.updateCameraVideo(camid, data);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};

// TODO deprecated
CloudAPI.setCameraVideo = function(new_values, cb_success, cb_error){
	if(!CloudAPI.isCameraID()) return;
	cb_success = cb_success || CloudAPI.handleNothing;
	cb_error = cb_error || CloudAPI.handleError;
	return $.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/video/",
		type: 'PUT',
		success: cb_success,
		error: cb_error,
		contentType: 'application/json',
		data:  JSON.stringify(new_values)
	});
};
CloudAPI.cameraMediaStreams = function(){
	var d = $.Deferred();
	if(!CloudAPI.isCameraID()) {
		d.reject();
		return d;
	}
	var camid = CloudAPI.cameraID();
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/media_streams/",
		type: 'GET'
	}).done(function(response){
		CloudAPI.cache.setMediaStreams(camid, response);
		d.resolve(response);
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.updateCameraMediaStreams = function(params, camid){
	var d = $.Deferred();
	camid = camid || CloudAPI.cameraID()
	if(!camid) {
		d.reject();
		return d;
	}
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/media_streams/",
		type: 'PUT',
		data:  JSON.stringify(params),
		contentType: 'application/json'
	}).done(function(r){
		d.resolve(r);
	}).fail(function(r){
		d.reject(r);
	});
	return d;
};

CloudAPI.cameraLiveUrls = function(camid){
	var d = $.Deferred();
	camid = camid || CloudAPI.cameraID();
	if(!camid){
		d.reject();
		return d;
	}

	$.ajax({
		url: CloudAPI.config.url_cameras + camid + "/live_urls/",
		type: 'GET'
	}).done(function(liveurls){
		d.resolve(liveurls);
	}).fail(function(r){
		d.reject(r);
	});
	return d;
};

CloudAPI.cameraBackwardStart = function(){
	if(!CloudAPI.isCameraID()) return;
	var data = {};
	if(!CloudAPI.config.backwardURL) return;
	data.url = CloudAPI.config.backwardURL;
	if(CloudAPI.config.tmpBackwardURL == CloudAPI.config.backwardURL)
		CloudAPI.config.tmpBackwardURLCount++;
	else{
		CloudAPI.config.tmpBackwardURLCount = 1;
		CloudAPI.config.tmpBackwardURL = CloudAPI.config.backwardURL;
	}
	
	if(CloudAPI.isP2PStreaming()){
		console.log("[CLOUDAPI] Send (audio streaming) backward start: " + CloudAPI.config.backwardURL);
		$.ajax({
			url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/audio/backward/start/",
			type: 'POST',
			success: CloudAPI.handleNothing,
			data:  JSON.stringify(data),
			contentType: 'application/json'
		});
	}
};

CloudAPI.cameraBackwardStop = function(){
	if(!CloudAPI.isCameraID()) return;
	var data = {}
	if(!CloudAPI.config.backwardURL) return;
	data.url = CloudAPI.config.backwardURL;
	// CloudAPI.config.backwardURL = undefined;
	if(CloudAPI.config.tmpBackwardURL == CloudAPI.config.backwardURL){
		if(CloudAPI.config.tmpBackwardURLCount == 0)
			return;
		else
			CloudAPI.config.tmpBackwardURLCount--;
	}

	if(CloudAPI.isP2PStreaming()){
		console.log("[CLOUDAPI] Send (audio streaming) backward stop: " + CloudAPI.config.backwardURL);
		$.ajax({
			url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/audio/backward/stop/",
			type: 'POST',
			success: CloudAPI.handleNothing,
			data:  JSON.stringify(data),
			contentType: 'application/json'
		});
	}
};
CloudAPI.cameraSchedule = function(){
	if(!CloudAPI.isCameraID()) return;
	return $.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/schedule/",
		type: 'GET',
		cache : false
	});
};
CloudAPI.updateCameraSchedule = function(data){
	return $.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/schedule/",
		type: 'PUT',
		data: JSON.stringify(data),
		cache : false,
		contentType: 'application/json'
	});
};
CloudAPI.hasAccessCameraPreview = function(camid){
	var caminfo = CloudAPI.cache.cameraInfo(camid);
	if(!caminfo) return false;
	return CloudAPI.hasAccess(caminfo, 'live') || CloudAPI.hasAccess(caminfo, 'all') || CloudAPI.hasAccess(caminfo, 'ptz');
};
CloudAPI.cameraPreview = function(cameraID, cb_success, cb_error){
	cb_success = (cb_success == undefined) ? CloudAPI.handleNothing : cb_success;
	cb_error = (cb_error == undefined) ? CloudAPI.handleError : cb_error;
	return $.ajax({
		url: CloudAPI.config.url_cameras + cameraID + "/preview/",
		type: 'GET',
		success: cb_success,
		error: cb_error
	});
};
CloudAPI.hasAccessCameraUpdatePreview = function(camid){
	var caminfo = CloudAPI.cache.cameraInfo(camid);
	if(!caminfo) return false;
	return CloudAPI.hasAccess(caminfo, 'live') || CloudAPI.hasAccess(caminfo, 'all') || CloudAPI.hasAccess(caminfo, 'ptz');
};
CloudAPI.cameraUpdatePreview = function(cameraID){
	return $.ajax({
		url: CloudAPI.config.url_cameras + cameraID + "/preview/update/",
		type: 'POST'
	});
};	
CloudAPI.storageDataFirstRecord = function(startDT){
	var d = $.Deferred();
	var request_data = {
		camid: CloudAPI.cameraID(),
		limit: 1,
		offset: 0
	};
	if(startDT){
		request_data.start = startDT;
	}
	$.ajax({
		url: CloudAPI.config.url_storage + "data/",
		data: request_data,
		cache : false,
		type: 'GET'
	}).done(function(data){
		if(data.objects.length > 0){
			d.resolve(data.objects[0]);
		}else{
			d.reject();
		}
	}).fail(function(){
		d.reject();
	})
	return d;
};
CloudAPI.storageEventsFirstRecord = function(){
	var d = $.Deferred();
	var request_data = {
		camid: CloudAPI.cameraID(),
		limit: 1,
		offset: 0
	};
	$.ajax({
		url: CloudAPI.config.url_storage + "events/",
		data: request_data,
		cache : false,
		type: 'GET'
	}).done(function(data){
		if(data.objects.length > 0){
			d.resolve(data.objects[0]);
		}else{
			d.reject();
		}
	}).fail(function(){
		d.reject();
	})
	return d;
};
CloudAPI.storageThumbnailsFirstRecord = function(){
	var d = $.Deferred();
	var request_data = {
		camid: CloudAPI.cameraID(),
		limit: 1,
		offset: 0
	};
	$.ajax({
		url: CloudAPI.config.url_storage + "thumbnails/",
		data: request_data,
		cache : false,
		type: 'GET'
	}).done(function(data){
		if(data.objects.length > 0){
			d.resolve(data.objects[0]);
		}else{
			d.reject();
		}
	}).fail(function(){
		d.reject();
	})
	return d;
};

CloudAPI.getAllData = function(url, req_data){
	// TODO
}


CloudAPI.storageThumbnails = function(startDT, endDt){
	var d = $.Deferred();
	var result = {
		meta: {
			limit: 1000,
			offset: 0,
			total_count: -1
		},
		objects: []
	};
	// TODO if not selected camera
	var request_data = {
		camid: CloudAPI.cameraID(),
		limit: result.meta.limit,
		offset: result.meta.offset,
		start: startDT
	};
	if(endDt)
		request_data.end = endDt;
	
	function getData(req_data){
		var req_d = $.Deferred();
		$.ajax({
			url: CloudAPI.config.url_storage + "thumbnails/",
			data: req_data,
			cache : false,
			async: true,
			type: 'GET'
		}).done(function(data){
			req_d.resolve(data);
		}).fail(function(){
			req_d.reject();
		});
		return req_d;
	};

	getData(request_data).fail(function(){
		d.reject();
	}).done(function(data){
		result.meta.total_count = data.meta.total_count;
		result.meta.expire = data.meta.expire;
		$.merge(result.objects,data.objects);
		if(data.meta.offset + data.objects.length >= data.meta.total_count){
			d.resolve(result);
		}else{
			var d_all = [];
			for(var i = result.meta.limit; i < data.meta.total_count; i = i + result.meta.limit){
				request_data.offset = i;
				d_all.push(getData(request_data));
			}
			// wait all response
			$.when.apply($, d_all).done(function(){
				for (var i=0; i < arguments.length; i++) {
					$.merge(result.objects,arguments[i].objects);
				}
				d.resolve(result);
			}).fail(function(){
				d.reject();
			});
		}
	});
	return d;
};

CloudAPI.storageTimeline = function(startDT, endDt){
	var d = $.Deferred();
	var result = {
		meta: {
			limit: 1000,
			offset: 0,
			total_count: -1
		},
		objects: []
	};
	// TODO if not selected camera
	var request_data = {
		slices: 1,
		camid: CloudAPI.cameraID(),
		limit: result.meta.limit,
		offset: result.meta.offset,
		start: startDT
	};
	if(endDt)
		request_data.end = endDt;
		
	function getData(req_data){
		var req_d = $.Deferred();
		$.ajax({
			url: CloudAPI.config.url_storage + "timeline/" + CloudAPI.cameraID() + "/",
			data: req_data,
			cache : false,
			async: true,
			type: 'GET'
		}).done(function(data){
			req_d.resolve(data);
		}).fail(function(){
			req_d.reject();
		});
		return req_d;
	};

	getData(request_data).fail(function(){
		d.reject();
	}).done(function(data){
		result.meta.total_count = data.meta.total_count;
		result.meta.expire = data.meta.expire;
		$.merge(result.objects,data.objects);
		if(data.meta.offset + data.objects.length >= data.meta.total_count){
			d.resolve(result);
		}else{
			var d_all = [];
			for(var i = result.meta.limit; i < data.meta.total_count; i = i + result.meta.limit){
				request_data.offset = i;
				d_all.push(getData(request_data));
			}
			// wait all response
			$.when.apply($, d_all).done(function(){
				for (var i=0; i < arguments.length; i++) {
					$.merge(result.objects,arguments[i].objects);
				}
				d.resolve(result);
			}).fail(function(){
				d.reject();
			});
		}
	});
	return d;
};

CloudAPI.storageEvents = function(startDT, endDt){
	var d = $.Deferred();
	var result = {
		meta: {
			limit: 1000,
			offset: 0,
			total_count: -1
		},
		objects: []
	};
	// TODO if not selected camera
	var request_data = {
		camid: CloudAPI.cameraID(),
		limit: result.meta.limit,
		offset: result.meta.offset,
		start: startDT
	};
	if(endDt)
		request_data.end = endDt;
	function getData(req_data){
		var req_d = $.Deferred();
		$.ajax({
			url: CloudAPI.config.url_storage + "events/",
			data: req_data,
			cache : false,
			async: true,
			type: 'GET'
		}).done(function(data){
			req_d.resolve(data);
		}).fail(function(){
			req_d.reject();
		});
		return req_d;
	};

	getData(request_data).fail(function(){
		d.reject();
	}).done(function(data){
		result.meta.total_count = data.meta.total_count;
		result.meta.expire = data.meta.expire;
		$.merge(result.objects,data.objects);
		if(data.meta.offset + data.objects.length >= data.meta.total_count){
			d.resolve(result);
		}else{
			var d_all = [];
			for(var i = result.meta.limit; i < data.meta.total_count; i = i + result.meta.limit){
				request_data.offset = i;
				d_all.push(getData(request_data));
			}
			// wait all response
			$.when.apply($, d_all).done(function(){
				for (var i=0; i < arguments.length; i++) {
					$.merge(result.objects,arguments[i].objects);
				}
				d.resolve(result);
			}).fail(function(){
				d.reject();
			});
		}
	});
	return d;
};

CloudAPI.cameraMotionDetectionDemo=function(){
	var data=JSON.parse('{"caps": {"columns": 23, "max_regions": 8, "region_shape": "rect", "rows": 15, "sensitivity": "region"}}');
	return data;
};

CloudAPI.cameraMotionDetection = function(){
	return $.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/motion_detection/",
		type: 'GET'
	});
};
CloudAPI.cameraMotionDetectionRegionsDemo=function(){
	var data_regions=JSON.parse('{"meta": {"limit": 20, "next": null, "offset": 0, "previous": null, "total_count": 8}, "objects": [{"enabled": true, "id": 2686, "map": "ZmQwMDBjM2ZjMDAwN2Y4MDAwZmYwMDAxZmUwMDAzZmNlNjAw", "name": "motion1", "sensitivity": 5}, {"enabled": true, "id": 2687, "map": "ZjYwMDBmMGZmODAwMWZmMDAwM2ZlMDAwN2ZjMDAwZmY4MDAxZmZmMDAw", "name": "motion2", "sensitivity": 5}, {"enabled": true, "id": 2688, "map": "ZjQwMDBmM2ZlMDAwN2ZjMDAwZmY4MDAxZmYwMDAzZmUwMDA3ZmNmMjAw", "name": "motion3", "sensitivity": 5}, {"enabled": true, "id": 2689, "map": "ZWMwMDBjMWZlMDAwM2ZjMDAwN2Y4MDAwZmYwMDAxZmVmNzAw", "name": "motion4", "sensitivity": 5}, {"enabled": true, "id": 2690, "map": "ZTQwMDA2ZTAwMDAxYzAwMDAzODBmOTAw", "name": "motion5", "sensitivity": 5}, {"enabled": true, "id": 2691, "map": "MmIwMWZmMDAwM2ZlMDAwN2ZjMDAwZmY4MDAxZmYwMDAzZmUwMDA3ZmMwMDBmZjgwMDFmZjAwMDNmZTAwMDdmYzAwMGZmODAwMWZmMDAwM2ZlMDAwN2ZjMDAw", "name": "motion6", "sensitivity": 5}, {"enabled": true, "id": 2692, "map": "MTJmZjgwMDFmZjAwMDNmZTAwMDdmYzAwMGZmODAwMWZmMDAwM2ZlMGU4MDA=", "name": "motion7", "sensitivity": 5}, {"enabled": false, "id": 2693, "map": "", "name": "motion8", "sensitivity": 5}]}');
	return data_regions;
};
CloudAPI.cameraMotionDetectionRegions = function(){
	return $.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/motion_detection/regions/",
		type: 'GET'
	});
};

CloudAPI.cameraP2PSettings = function(cameraID, cb_success, cb_error, cb_always){
	cameraID = cameraID || CloudAPI.cameraID();
	cb_success = (cb_success == undefined) ? CloudAPI.handleNothing : cb_success;
	cb_error = (cb_error == undefined) ? CloudAPI.handleError : cb_error;
	cb_always = (cb_always == undefined) ? CloudAPI.handleNothing : cb_always;
	return $.ajax({
		url: CloudAPI.config.url_cameras + cameraID + "/p2p_settings/",
		type: 'GET',
		success: function(response){
			CloudAPI.cache.setP2PSettings(cameraID, response);
			cb_success(response);
		},
		error: cb_error,
		complete: cb_always
	});
};
CloudAPI.cameraSetP2PSettings = function(data){
	return $.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/p2p_settings/",
		type: 'PUT',
		data: JSON.stringify(data),
		cache : false,
		contentType: 'application/json'
	});
};
CloudAPI.cameraLog = function(){
	return $.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/log/",
		type: 'GET'
	});
};
CloudAPI.cameraLogDownload = function(url){
	var d = $.Deferred();
	var xmlhttp = null;
	if (window.XMLHttpRequest){// code for IE7+, Firefox, Chrome, Opera, Safari
		xmlhttp=new XMLHttpRequest();
	}else{// code for IE6, IE5
		xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
	}
	xmlhttp.onreadystatechange=function(){
		if (xmlhttp.readyState == XMLHttpRequest.DONE){
			if(xmlhttp.status==200)
				d.resolve(xmlhttp.responseText);
			else
				d.reject();
		}
	}
	xmlhttp.open("GET", url, true);
	xmlhttp.send();
	return d.promise();
};
CloudAPI.cameraLogUpdate = function(){
	return $.ajax({
		url: CloudAPI.config.url_cameras + CloudAPI.cameraID() + "/log/update/",
		type: 'POST'
	});
};
CloudAPI.cameraManagersList = function(cb_success, cb_error){
	cb_success = cb_success || CloudAPI.handleNothing
	cb_error = cb_error || CloudAPI.handleError;
	$.ajax({
		url: CloudAPI.config.url_cmngrs,
		type: 'GET',
		success: cb_success,
		error: cb_error
	});
}

CloudAPI.cameraManagerReset = function(cmnr_id){
	var params = {};
	return $.ajax({
		url: CloudAPI.config.url_cmngrs + cmnr_id + '/reset/',
		type: 'POST'
	});
}

CloudAPI.camerasList = function(params){
	params = params || {};
	var d = $.Deferred();
	var result = {
		meta: {
			limit: 20,
			offset: 0,
			total_count: -1
		},
		objects: []
	};
	var request_data = {
		limit: result.meta.limit,
		offset: result.meta.offset
	};
	for(var t in params){
		request_data[t] = params[t];
	}
	function getData(req_data){
		var req_d = $.Deferred();
		$.ajax({
			url: CloudAPI.config.url_cameras,
			data: req_data,
			cache : false,
			type: 'GET'
		}).done(function(data){
			req_d.resolve(data);
		}).fail(function(){
			req_d.reject();
		});
		return req_d;
	};

	function p2pUpdateAndResolve(result){
		var count = 0;
		var len = result.objects.length;
		if(count == len) d.resolve(result);
		for(var i = 0; i < len; i++){
			cam = result.objects[i];
			// SET to cache
			if(CloudAPI.cache.setCameraInfo(cam)){
				console.log("update p2p_settings: ", cam.id);
				CloudAPI.cameraP2PSettings(cam.id).done(function(p2p_settings){
					// update memory cardinfo
					CloudAPI.cameraMemoryCard(cam.id).done(function(){
						count = count + 1;
						if(count == len) d.resolve(result);
					}).fail(function(){
						count = count + 1;
						if(count == len) d.resolve(result);
					});
					// count = count + 1;
					// if(count == len) d.resolve(result);
				}).fail(function(){
					count = count + 1;
					if(count == len) d.resolve(result);
				});
			}else{
				// console.log("p2p_settings updated: ", i, len);
				count = count + 1;
				if(count == len) d.resolve(result);
			}
		}
	}
	getData(request_data).fail(function(){
		d.reject();
	}).done(function(data){
		result.meta.total_count = data.meta.total_count;
		$.merge(result.objects, data.objects);
		if(data.meta.offset + data.objects.length >= data.meta.total_count){
			p2pUpdateAndResolve(result)
		}else{
			var d_all = [];
			for(var i = result.meta.limit; i < data.meta.total_count; i = i + result.meta.limit){
				request_data.offset = i;
				d_all.push(getData(request_data));
			}
			// wait all response
			$.when.apply($, d_all).done(function(){
				for (var i=0; i < arguments.length; i++) {
					$.merge(result.objects,arguments[i].objects);
				}
				p2pUpdateAndResolve(result)
			}).fail(function(){
				d.reject();
			});
		}
	});
	return d;
}
CloudAPI.camerasListByCriterions = function(criterions, cb_success, cb_error){
	cb_success = cb_success || CloudAPI.handleNothing
	cb_error = cb_error || CloudAPI.handleError;
	
	$.ajax({
		url: CloudAPI.config.url_cameras,
		data: criterions,
		type: 'GET',
		success: cb_success,
		error: cb_error
	});
}

CloudAPI.cameraManagerInfo = function(cameraManagerID, cb_success, cb_error){
	cb_success = cb_success || CloudAPI.handleNothing
	cb_error = cb_error || CloudAPI.handleError;
	$.ajax({
		url: CloudAPI.config.url_cmngrs + cameraManagerID + "/",
		type: 'GET',
		success: cb_success,
		error: cb_error
	});
}
CloudAPI.cameraManagerSetTimezone = function(cameraManagerID, newTimeZone, cb_success, cb_error){
	cb_success = cb_success || CloudAPI.handleNothing
	cb_error = cb_error || CloudAPI.handleError;
	var obj = {};
	obj.timezone = newTimeZone;
	$.ajax({
		url: CloudAPI.config.url_cmngrs + cameraManagerID + "/",
		type: 'PUT',
		success: cb_success,
		error: cb_error,
		data:  JSON.stringify(obj),
		contentType: 'application/json'
	});
}

CloudAPI.storageClipList = function(){
	var d = $.Deferred();
	var result = {
		meta: {
			limit: 100,
			offset: 0,
			total_count: -1
		},
		objects: []
	};
	var request_data = {
		limit: result.meta.limit,
		offset: result.meta.offset,
		camid: CloudAPI.cameraID(),
		usecamtz: ''
	};
	
	function getData(req_data){
		var req_d = $.Deferred();
		$.ajax({
			url: CloudAPI.config.url_clips,
			data: req_data,
			cache : false,
			type: 'GET'
		}).done(function(data){
			req_d.resolve(data);
		}).fail(function(){
			req_d.reject();
		});
		return req_d;
	};

	getData(request_data).fail(function(){
		d.reject();
	}).done(function(data){
		result.meta.total_count = data.meta.total_count;
		result.meta.expire = data.meta.expire;
		$.merge(result.objects,data.objects);
		if(data.meta.offset + data.objects.length >= data.meta.total_count){
			d.resolve(result);
		}else{
			var d_all = [];
			for(var i = result.meta.limit; i < data.meta.total_count; i = i + result.meta.limit){
				request_data.offset = i;
				d_all.push(getData(request_data));
			}
			// wait all response
			$.when.apply($, d_all).done(function(){
				for (var i=0; i < arguments.length; i++) {
					$.merge(result.objects,arguments[i].objects);
				}
				d.resolve(result);
			}).fail(function(){
				d.reject();
			});
		}
	});
	return d;
};

// deprecated
CloudAPI.storageClipListAnon = function(token){
	var d = $.Deferred();
	CloudAPI.anonToken().done(function(tk){
		var result = {
			meta: {
				limit: 100,
				offset: 0,
				total_count: -1
			},
			objects: []
		};
		var request_data = {
			limit: result.meta.limit,
			offset: result.meta.offset,
			usecamtz: ''
		};
		if(token) request_data.token = token;
		function getData(req_data){
			var req_d = $.Deferred();
			$.ajax({
				url: CloudAPI.config.url_clips,
				data: req_data,
				cache : false,
				type: 'GET',
				headers: {
					'Authorization':'SkyVR ' + tk.token
				}
			}).done(function(data){
				req_d.resolve(data);
			}).fail(function(){
				req_d.reject();
			});
			return req_d;
		};
		
		getData(request_data).fail(function(){
			d.reject();
		}).done(function(data){
			result.meta.total_count = data.meta.total_count;
			result.meta.expire = data.meta.expire;
			$.merge(result.objects,data.objects);
			if(data.meta.offset + data.objects.length >= data.meta.total_count){
				d.resolve(result);
			}else{
				var d_all = [];
				for(var i = result.meta.limit; i < data.meta.total_count; i = i + result.meta.limit){
					request_data.offset = i;
					d_all.push(getData(request_data));
				}
				// wait all response
				$.when.apply($, d_all).done(function(){
					for (var i=0; i < arguments.length; i++) {
						$.merge(result.objects,arguments[i].objects);
					}
					d.resolve(result);
				}).fail(function(){
					d.reject();
				});
			}
		});
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.storageClipCreate = function(title, group, start, end, delete_at){
	var data = {};
	data.camid = CloudAPI.cameraID();
	data.title = title;
	data.group = group;
	data.start = start;
	data.end = end;
	data.delete_at = delete_at;
	return $.ajax({
		url: CloudAPI.config.url_clips,
		type: 'POST',
		data: JSON.stringify(data),
		cache : false,
		contentType: 'application/json'
	});
}
CloudAPI.storageClip = function(clipid){
	return $.ajax({
		url: CloudAPI.config.url_clips + clipid + "/",
		type: 'GET',
		cache : false
	});
};

CloudAPI.serverTime = function(){
	return $.ajax({
		url: CloudAPI.config.url_server + "time/",
		type: 'GET',
		cache : false
	});
};

CloudAPI.storageClipAnon = function(clipid, token){
	var d = $.Deferred();
	var params = {};
	if(token) params.token = token;
	CloudAPI.anonToken().done(function(tk){
		$.ajax({
			url: CloudAPI.config.url_clips + clipid + "/",
			type: 'GET',
			data: params,
			cache : false,
			headers: {
				'Authorization':'SkyVR ' + tk.token
			}
		}).done(function(data){
			d.resolve(data);
		}).fail(function(){
			d.reject();
		});
	}).fail(function(){
		d.reject();
	});
	return d;
};

CloudAPI.storageClipDelete = function(clipid){
	return $.ajax({
		url: CloudAPI.config.url_clips + clipid + "/",
		type: 'DELETE',
		cache : false
	});
};

CloudAPI.storageClipUpdate = function(clipid, data){
	return $.ajax({
		url: CloudAPI.config.url_clips + clipid + "/",
		data: JSON.stringify(data),
		type: 'PUT',
		cache : false,
		contentType: 'application/json'
	});
};

CloudAPI.cameraSettings = function(){
	var d = $.Deferred();
	var d_all = [];
	function anyway(d){
		var d2 = $.Deferred();
		d.always(function(){ d2.resolve();});
		return d2;
	}
	
	function mediaStreams(){
		var d2 = $.Deferred();
		CloudAPI.cameraMediaStreams().done(function(media_streams){
			console.log("MediaStreams: ", media_streams);
			var ms_arr = media_streams['mstreams_supported'];
			var current_ms = media_streams['live_ms_id'];
			if(ms_arr.length > 0 && current_ms != ''){
				var vs_id = '';
				for(var i = 0; i < ms_arr.length; i++){
					if(ms_arr[i]['id'] == current_ms){
						vs_id = ms_arr[i]['vs_id'];
						break;
					}
				}
				if(vs_id != ''){
					CloudAPI.cameraVideoStream(vs_id).done(function(){
						d2.resolve();
					}).fail(function(){
						d2.reject();
					});
				}else{
					d2.reject();
				}
			}else{
				d2.resolve();
			}
		}).fail(function(){
			d2.reject();
		});
		return d2;
	}

	d_all.push(anyway(mediaStreams()));

	if(!CloudAPI.cache.cameraInfo().url){
		d_all.push(anyway(CloudAPI.cameraVideo()));
		d_all.push(anyway(CloudAPI.cameraAudio()));
		d_all.push(anyway(CloudAPI.cameraLimits()));
		d_all.push(anyway(CloudAPI.cameraEventProcessingEventsMotion()));
		d_all.push(anyway(CloudAPI.cameraEventProcessingEventsSound()));
		d_all.push(anyway(CloudAPI.cameraMemoryCard()));
		// d_all.push(anyway(CloudAPI.cameraWifi()));
	}

	$.when.apply($, d_all).done(function(){
		d.resolve(CloudAPI.cache.cameraInfo());
	}).fail(function(){
		d.reject();
	});
	return d;
}

CloudAPI.createCamsess = function(data){
	data = data || {};
	return $.ajax({
		url: CloudAPI.config.url_camsess,
		data: JSON.stringify(data),
		type: 'POST',
		contentType: 'application/json',
		cache : false,
	});
}

CloudAPI.updateCamsess = function(id, data){
	data = data || {};
	return $.ajax({
		url: CloudAPI.config.url_camsess + id + '/',
		data: JSON.stringify(data),
		type: 'PUT',
		contentType: 'application/json',
		cache : false,
	});
}

CloudAPI.cameraCreate = function(data){
	var d = $.Deferred();
	data = data || {};
	$.ajax({
		url: CloudAPI.config.url_cameras,
		type: 'POST',
		data: JSON.stringify(data),
		cache : false,
		contentType: 'application/json'
	}).done(function(r){
		d.resolve(r);
	}).fail(function(r){
		d.reject(r);
	});
	return d;
}

CloudAPI.cameraDelete = function(camid){
	var d = $.Deferred();
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + '/',
		type: 'DELETE',
		cache : false
	}).done(function(r){
		d.resolve(r);
	}).fail(function(r){
		d.reject(r);
	});
	return d;
}

CloudAPI.cameraUpdate = function(camid, data){
	var d = $.Deferred();
	data = data || {};
	$.ajax({
		url: CloudAPI.config.url_cameras + camid + '/',
		type: 'PUT',
		data: JSON.stringify(data),
		cache : false,
		contentType: 'application/json'
	}).done(function(r){
		d.resolve(r);
	}).fail(function(r){
		d.reject(r);
	});
	return d;
}

CloudAPI.adminCameras = function(params){
	params = params || {};
	return $.ajax({
		url: CloudAPI.config.url_admin_cameras,
		data: params,
		type: 'GET',
		cache : false,
	});
}

CloudAPI.adminCameraInfo = function(camid){
	return $.ajax({
		url: CloudAPI.config.url_admin_cameras + camid + '/',
		type: 'GET',
		cache : false
	});
}

CloudAPI.updateAdminCamera = function(camid, params){
	params = params || {};
	return $.ajax({
		url: CloudAPI.config.url_admin_cameras + camid + '/',
		type: 'PUT',
		data: JSON.stringify(params),
		contentType: 'application/json',
		cache : false
	});
}

CloudAPI.store = {};
CloudAPI.store.volume = function(v){ if(v) CloudAPI.setToStorage('volume', v); return CloudAPI.getFromStorage('volume'); }
CloudAPI.store.prev_volume = function(v){ if(v) CloudAPI.setToStorage('prev_volume', v); return CloudAPI.getFromStorage('prev_volume'); }
CloudAPI.store.zoom = function(v){ if(v != undefined) CloudAPI.setToStorage('zoom', v); return CloudAPI.getFromStorage('zoom'); }
CloudAPI.store.zoom_left = function(v){ if(v != undefined) CloudAPI.setToStorage('zoom_left', v); return CloudAPI.getFromStorage('zoom_left'); }
CloudAPI.store.zoom_top = function(v){ if(v != undefined) CloudAPI.setToStorage('zoom_top', v); return CloudAPI.getFromStorage('zoom_top'); }
CloudAPI.store.user_profile = function(v){ if(v != undefined) CloudAPI.setToStorage('user_profile', v); return CloudAPI.getFromStorage('user_profile'); }
CloudAPI.store.svcp_host = function(v){ if(v != undefined) CloudAPI.setToStorage('svcp_host', v); return CloudAPI.getFromStorage('svcp_host'); }

CloudAPI.storageTemp = {};
CloudAPI.storageMode = 'local';

CloudAPI.detectStorageMode = function(){
	try{
		localStorage.setItem('detectStorageMode','yes');
	}catch(e){
		CloudAPI.storageMode = 'temp';
	}
}
CloudAPI.detectStorageMode();

CloudAPI.setToStorage = function(k,v){
	if(CloudAPI.storageMode == 'local'){
		localStorage.setItem(k,v);
	}else{
		CloudAPI.storageTemp[k] = v;
	}
}

CloudAPI.getFromStorage = function(k){
	if(CloudAPI.storageMode == 'local'){
		return localStorage.getItem(k);
	}else{
		return CloudAPI.storageTemp[k];
	}
}

CloudAPI.removeFromStorage = function(k){
	if(CloudAPI.storageMode == 'local'){
		localStorage.removeItem(k);
	}else{
		CloudAPI.storageTemp[k] = undefined;
	}
}

CloudAPI.loadApiTokenFromHref = function(){
	var prms = window.location.href.split("#");
	var token = prms[prms.length - 1];
	token = token.split("&");
	
	for(var i in token){
		var name = token[i].split("=")[0];
		var param = decodeURIComponent(token[i].split("=")[1]);
		if(name == "token"){
			CloudAPI.config.apiToken = CloudAPI.config.apiToken || {};
			CloudAPI.config.apiToken.token = param;
			CloudAPI.config.apiToken.type = "api";
		}else if(name == "expire"){
			CloudAPI.config.apiToken = CloudAPI.config.apiToken || {};
			CloudAPI.config.apiToken.expire = param;
			CloudAPI.config.apiToken.expireTimeUTC = Date.parse(param + "Z");
		}
	}
	console.log("Href token: ", CloudAPI.config.apiToken);
	CloudAPI.setToStorage('SkyVR_apiToken', JSON.stringify(CloudAPI.config.apiToken));
}

CloudAPI.cleanupApiToken = function(){
	CloudAPI.removeFromStorage('SkyVR_apiToken');
	CloudAPI.config.apiToken = null;
	$.ajaxSetup({
		crossDomain: true,
		cache: false,
		beforeSend: function(xhr,settings) {
			xhr.setRequestHeader('Authorization', '');
		}
	});
}

// set url

if(CloudHelpers.containsPageParam("svcp_host")){
	CloudAPI.setURL(CloudAPI.pageParams["svcp_host"]);
}else if(CloudAPI.getFromStorage('CloudAPI_svcp_host')){
	CloudAPI.setURL(CloudAPI.getFromStorage('CloudAPI_svcp_host'));
}else{
	CloudAPI.setURL(window.location.protocol + "//" + window.location.host.toString() + "/");
}

/* events */
CloudAPI.events = {};
CloudAPI.events.listeners = {};
CloudAPI.events.names = ['CAMERA_INFO_CHANGED']; // todo define events name
CloudAPI.events.on = function(eventname, eventid, func){
	if(CloudAPI.events.names.indexOf(eventname) == -1){
		console.error("[CLOUDAPI] Could not find event with name " + eventname);
		return;
	}
	if(!CloudAPI.events.listeners[eventname]){
		CloudAPI.events.listeners[eventname] = {};
	}
	CloudAPI.events.listeners[eventname][eventid] = func;
}

CloudAPI.events.off = function(eventname, eventid){
	if(CloudAPI.events.names.indexOf(eventname) == -1){
		console.error("[CLOUDAPI] Could not find event with name " + eventname);
		return;
	}
	if(!CloudAPI.events.listeners[eventname]){
		console.error("[CLOUDAPI] Could not find event with name " + eventname);
		return;
	}
	if(!CloudAPI.events.listeners[eventname][eventid]){
		console.error("[CLOUDAPI] Could not find event with name " + eventname + " by id " + eventid);
		return;
	}
	delete CloudAPI.events.listeners[eventname][eventid];
}

CloudAPI.events.trigger = function(eventname, data){ // app, event - temporary variables
	if(CloudAPI.events.names.indexOf(eventname) == -1){
		console.error("[CLOUDAPI] Could not find event with name " + eventname);
		return;
	}
	if(CloudAPI.events.listeners[eventname]){
		var elist = CloudAPI.events.listeners[eventname];
		setTimeout(function(){
			for(var id in elist){
				try{elist[id](data);}catch(e){console.error("[CLOUDAPI] error on execute callback event (" + id + ")", e)};
			}
		},1);
	}
}

window.CloudReturnCode = {};

CloudReturnCode.OK = {
	name: 'OK',
	code: -5049,
	text: 'Success'
};

CloudReturnCode.OK_COMPLETIONPENDING = {
	name: 'OK_COMPLETIONPENDING',
	code: 1,
	text: 'Operation Pending'
};

CloudReturnCode.ERROR_NOT_CONFIGURED = {
	name: 'ERROR_NOT_CONFIGURED',
	code: -2,
	text: 'Object not configured'
};

CloudReturnCode.ERROR_NOT_IMPLEMENTED = {
	name: 'ERROR_NOT_IMPLEMENTED',
	code: -1,
	text: 'Function not implemented'
};

CloudReturnCode.ERROR_NO_MEMORY = {
	name: 'ERROR_NO_MEMORY',
	code: -12,
	text: 'Out of memory'
};
   
CloudReturnCode.ERROR_ACCESS_DENIED = {
	name: 'ERROR_ACCESS_DENIED',
	code: -13,
	text: 'Access denied'
};

CloudReturnCode.ERROR_BADARGUMENT = {
	name: 'ERROR_BADARGUMENT',
	code: -22,
	text: 'Invalid argument'
};

CloudReturnCode.ERROR_STREAM_UNREACHABLE = {
	name: 'ERROR_STREAM_UNREACHABLE',
	code: -5049,
	text: 'The stream specified is not reachable. Please check source URL or restart the stream'
};

CloudReturnCode.ERROR_EXPECTED_FILTER = {
	name: 'ERROR_EXPECTED_FILTER',
	code: -5050,
	text: 'Expected filter'
};

CloudReturnCode.ERROR_NO_CLOUD_CONNECTION = {
	name: 'ERROR_NO_CLOUD_CONNECTION',
	code: -5051,
	text: 'No cloud connection (has not conenction object or token is invalid)'
};

CloudReturnCode.ERROR_WRONG_RESPONSE = {
	name: 'ERROR_WRONG_RESPONSE',
	code: -5052,
	text: 'Response from cloud expected in json, but got something else'
}

CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED = {
	name: 'ERROR_SOURCE_NOT_CONFIGURED',
	code: -5053,
	text: 'Source not configured'
}

CloudReturnCode.ERROR_INVALID_SOURCE = {
	name: 'ERROR_INVALID_SOURCE',
	code: -5054,
	text: 'Invalid source'
}

CloudReturnCode.ERROR_RECORDS_NOT_FOUND = {
	name: 'ERROR_RECORDS_NOT_FOUND',
	code: -5055,
	text: 'Records are not found'
}

CloudReturnCode.ERROR_STREAM_UNREACHABLE_HLS = {
	name: 'ERROR_STREAM_UNREACHABLE_HLS',
	code: -5056,
	text: 'The stream specified is not reachable (HLS).'
};

CloudReturnCode.ERROR_NOT_FOUND_HLS_PLUGIN = {
	name: 'ERROR_NOT_FOUND_HLS_PLUGIN',
	code: -5057,
	text: 'HLS plugin not found.'
};

CloudReturnCode.ERROR_COULD_NOT_DECODE_STREAM_OR_COULD_NOT_SET_COOKIE_HLS = {
	name: 'ERROR_COULD_NOT_DECODE_STREAM_OR_COULD_NOT_SET_COOKIE_HLS',
	code: -5058,
	text: 'Could not decode stream or could not set cookie for streaming server (please allow cookie).'
};

CloudReturnCode.ERROR_WEBRTC_SERVER_ERROR = {
	name: 'ERROR_WEBRTC_SERVER_ERROR',
	code: -5059,
	text: 'Unable to connect to server. Please check that you added an exception for the certificate, and that the port is available.'
};

CloudReturnCode.ERROR_CAMERA_OFFLINE = {
	name: 'ERROR_CAMERA_OFFLINE',
	code: -5060,
	text: 'Video source is offline'
};

CloudReturnCode.PLAYER_NOT_SUPPORTED = {
	name: 'PLAYER_NOT_SUPPORTED',
	code: -5061,
	text: 'Player not supported'
};

CloudReturnCode.NOT_SUPPORTED_FORMAT = {
	name: 'NOT_SUPPORTED_FORMAT',
	code: -5062,
	text: 'Not supported format'
}

CloudReturnCode.ERROR_HLS_ENDED = {
	name: 'ERROR_HLS_ENDED',
	code: -5063,
	text: 'The stream is ended (HLS).'
};

CloudReturnCode.ERROR_NOT_AUTHORIZED = {
	name: 'ERROR_NOT_AUTHORIZED',
	code: -5401,
	text: 'Failed authorization on cloud (wrong credentials)'
}

CloudReturnCode.ERROR_NOT_FOUND = {
	name: 'ERROR_NOT_FOUND',
	code: -5404,
	text: 'Not found object'
}



window.CloudCameraPrivacyFilter = {};

CloudCameraPrivacyFilter.PS_OWNER_NOT_PUBLIC = {
	name: 'PS_OWNER_NOT_PUBLIC',
	code: 0,
	text: 'My cameras which not public'
};

CloudCameraPrivacyFilter.PS_OWNER = {
	name: 'PS_OWNER',
	code: 1,
	text: 'Only my cameras'
};

CloudCameraPrivacyFilter.PS_PUBLIC_NOT_OWNERS = {
	name: 'PS_PUBLIC_NOT_OWNERS',
	code: 2,
	text: 'Public cameras exclude my'
};

CloudCameraPrivacyFilter.PS_PUBLIC = {
	name: 'PS_PUBLIC',
	code: 3,
	text: 'All public cameras'
};

CloudCameraPrivacyFilter.PS_OWNERS_PUBLIC = {
	name: 'PS_OWNERS_PUBLIC',
	code: 4,
	text: 'My public cameras'
};

CloudCameraPrivacyFilter.PS_ALL = {
	name: 'PS_ALL',
	code: 5,
	text: 'All cameras'
};

window.CloudCameraRecordingMode = {};

CloudCameraRecordingMode.CONTINUES = {
	name: 'CONTINUES',
	code: 0
};

CloudCameraRecordingMode.BY_EVENT = {
	name: 'BY_EVENT',
	code: 1
};

CloudCameraRecordingMode.NO_RECORDING = {
	name: 'NO_RECORDING',
	code: 2
};

window.CloudCameraStatus = {};

CloudCameraStatus.ACTIVE = {
	name: 'ACTIVE',
	code: 0
};

CloudCameraStatus.UNAUTHORIZED = {
	name: 'UNAUTHORIZED',
	code: 1
};

CloudCameraStatus.INACTIVE = {
	name: 'INACTIVE',
	code: 2
};

CloudCameraStatus.INACTIVE_BY_SCHEDULER = {
	name: 'INACTIVE_BY_SCHEDULER',
	code: 3
};

CloudCameraStatus.OFFLINE = {
	name: 'OFFLINE',
	code: 4
};

// construct
window.CloudTrialConnection = function(){
	var self = this;
	self.mAPI = null;
	self.AccountProviderUrl = window.location.protocol + "//cnvrclient2.videoexpertsgroup.com/";
	
	self.setAccpUrl = function(new_accp_url){
		self.AccountProviderUrl = new_accp_url; 
	};
	
	self.setSvcpUrlBase = function(new_svcp_url){
		self.ServiceProviderUrl = new_svcp_url; 
	};

	self.setApiConfig = function(api_host, api_port, api_secure_port){
		self.ApiHost = api_host; 
		self.ApiPort = api_port;
		self.ApiSecurePort = api_secure_port;
	};

	self.setCamConfig = function(cam_host, cam_port, cam_secure_port){
		self.CamHost = cam_host; 
		self.CamPort = cam_port;
		self.CamSecurePort = cam_secure_port;
	};
	
	// Open without redirects
	self.open = function(license_key){
		var p = CloudHelpers.promise();
		self.TrialKey = license_key;
		self.RequestData = {
			username: self.TrialKey,
			password: self.TrialKey,
			cloud_token:  true
		};
		self._asyncLogin(p);
		return p;
	}

	self.isOpened = function(){
		return self.mAPI != null;
	}
	self.close = function(){
		self.mAPI = null;
	}
	
	self._getAPI = function(){
		return self.mAPI;
	}
	
	self.getUserInfo = function(){
		var p = CloudHelpers.promise();
		if(!self.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		self.mAPI.getAccountInfo().done(function(accInfo){
			self.mAPI.getAccountCapabilities().done(function(caps){
				var info = new CloudUserInfo(self, accInfo, caps);
				p.resolve(info);
			}).fail(function(err){
				CloudHelpers.handleError(err, p);
			});
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
	
	self.getServerTimeDiff = function(){
		return self.mAPI.diffServerTime;
	}

	self._asyncLogin = function(p){
		CloudHelpers.request({
			url: self.AccountProviderUrl + "api/v1/account/login/",
			type: 'POST',
			data: JSON.stringify(self.RequestData),
			contentType: 'application/json'
		}).done(function(r){
			if(r.cloud_token && r.cloud_token.token){
				var scvp_host = CloudHelpers.parseUri(r.svcp_auth_app_url).host;
				scvp_host = window.location.protocol + "//" + scvp_host + "/";
				self.mAPI = new CloudAPI(r.cloud_token, self.ServiceProviderUrl || scvp_host);
				self.mAPI.getServerTime().done(function(){
					p.resolve();
				}).fail(function(err){
					p.reject(err);
				})
			}else{
				console.warn("Try again after 1 sec");
				setTimeout(function(){
					self._asyncLogin(p);
				},1000);
			}
		}).fail(function(err){
			console.error(err);
			p.reject(err);
		});
	}
}

// construct
window.CloudTokenConnection = function(){
	var self = this;
	self.mAPI = null;
	// self.AccountProviderUrl = window.location.protocol + "//cnvrclient2.videoexpertsgroup.com/";
	self.ServiceProviderUrl = window.location.protocol + "//web.skyvr.videoexpertsgroup.com/";

	// Open without redirects
	self.open = function(token, expire, svcp_host){
		var cloud_token = {
			token: token,
			expire: expire,
			type: 'api'
		};
		if(svcp_host){
			self.ServiceProviderUrl = svcp_host;
		}
		var p = CloudHelpers.promise();
		self.mAPI = new CloudAPI(cloud_token, self.ServiceProviderUrl);
		self.mAPI.getServerTime().done(function(){
			p.resolve();
		}).fail(function(err){
			p.reject(err);
		});
		return p;
	}

	self.isOpened = function(){
		return self.mAPI != null;
	}
	self.close = function(){
		self.mAPI = null;
	}
	
	self._getAPI = function(){
		return self.mAPI;
	}
	
	self.getUserInfo = function(){
		var p = CloudHelpers.promise();
		if(!self.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		self.mAPI.getAccountInfo().done(function(accInfo){
			self.mAPI.getAccountCapabilities().done(function(caps){
				console.warn("caps:", caps)
				var info = new CloudUserInfo(self, accInfo, caps);
				p.resolve(info);
			}).fail(function(err){
				CloudHelpers.handleError(err, p);
			});
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
	
	self.getServerTimeDiff = function(){
		return self.mAPI.diffServerTime;
	}
}

// construct
window.CloudShareConnection = function(){
	var self = this;
	self.mAPI = null;
	self.ServiceProviderUrl = window.location.protocol + "//web.skyvr.videoexpertsgroup.com/";

	// Open without redirects
	self.open = function(token){
		var cloud_token = {
			token: token,
			expire: "",
			type: "share"
		};
		var p = CloudHelpers.promise();
		self.mAPI = new CloudAPI(cloud_token, self.ServiceProviderUrl);
		
		self.mAPI.getServerTime().done(function(){
			p.resolve();
		}).fail(function(err){
			p.reject(err);
		});
		return p;
	}

	self.isOpened = function(){
		return self.mAPI != null;
	}
	self.close = function(){
		self.mAPI = null;
	}
	
	self._getAPI = function(){
		return self.mAPI;
	}
	
	self.getUserInfo = function(){
		var p = CloudHelpers.promise();
		if(!self.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		self.mAPI.getAccountInfo().done(function(accInfo){
			self.mAPI.getAccountCapabilities().done(function(caps){
				console.warn("caps:", caps)
				var info = new CloudUserInfo(self, accInfo, caps);
				p.resolve(info);
			}).fail(function(err){
				CloudHelpers.handleError(err, p);
			});
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
	
	self.getServerTimeDiff = function(){
		return self.mAPI.diffServerTime;
	}
}

// construct
window.CloudUserConnection = function(){
	var self = this;
	self.mAPI = null;
	self.AccountProviderUrl = window.location.protocol + "//cnvrclient2.videoexpertsgroup.com/";
	var mUsername, mPassword;
	// Open without redirects
	self.open = function(username,password){
		mUsername = username;
		mPassword = password;
		var p = CloudHelpers.promise();
		self.RequestData = {
			username: mUsername,
			password: mPassword,
			cloud_token:  true
		};
		self._asyncLogin(p);
		return p;
	}

	self.isOpened = function(){
		return self.mAPI != null;
	}
	self.close = function(){
		self.mAPI = null;
	}
	
	self._getAPI = function(){
		return self.mAPI;
	}
	
	self.getUserInfo = function(){
		var p = CloudHelpers.promise();
		if(!self.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		self.mAPI.getAccountInfo().done(function(accInfo){
			// console.warn("info:", accInfo)
			self.mAPI.getAccountCapabilities().done(function(caps){
				console.warn("caps:", caps)
				var info = new CloudUserInfo(self, accInfo, caps);
				p.resolve(info);
			}).fail(function(err){
				if(err.status == 500){
					var info = new CloudUserInfo(self, accInfo);
					p.resolve(info);
				}else{
					CloudHelpers.handleError(err, p);
				}
			});
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
	
	self.getServerTimeDiff = function(){
		return self.mAPI.diffServerTime;
	}

	self._asyncLogin = function(p){
		CloudHelpers.request({
			url: self.AccountProviderUrl + "api/v1/account/login/",
			type: 'POST',
			data: JSON.stringify(self.RequestData),
			contentType: 'application/json'
		}).done(function(r){
			if(r.cloud_token && r.cloud_token.token){
				var scvp_host = CloudHelpers.parseUri(r.svcp_auth_app_url).host;
				scvp_host = window.location.protocol + "//" + scvp_host + "/";
				self.mAPI = new CloudAPI(r.cloud_token, scvp_host);
				self.mAPI.getServerTime().done(function(){
					p.resolve();
				}).fail(function(err){
					p.reject(err);
				})
			}else{
				console.warn("Try again after 1 sec");
				setTimeout(function(){
					self._asyncLogin(p);
				},1000);
			}
		}).fail(function(err){
			console.error(err);
			p.reject(err);
		});
	}
}

// construct
window.CloudUserInfo = function(conn, jsonUser, jsonCapabilities){
	var self = this;
	var mConn = conn;
	var mOrigJsonAccount;
	var mOrigJsonCapabilities;

	var mID, mEmail, mFirstName, mLastName, mPreferredName;
	var mHostedCamerasLimit, mTotalCamerasLimit;
	var mHostedCamerasCreated, mTotalCamerasCreated;
	
	function _parseJson(data_user, data_caps){
		mOrigJsonAccount = data_user;
		mOrigJsonCapabilities = data_caps;
		mID = data_user['id'];
		mEmail = data_user['email'];
		mFirstName = data_user['first_name'];
		mLastName = data_user['last_name'];
		mPreferredName = data_user['preferred_name'];
		if(data_caps){
			mTotalCamerasLimit = data_caps['cameras_creation']['limits']['total_cameras'];
			mHostedCamerasLimit = data_caps['cameras_creation']['limits']['hosted_cameras'];
			mTotalCamerasCreated = data_caps['cameras_creation']['created']['total_cameras'];
			mHostedCamerasCreated = data_caps['cameras_creation']['created']['hosted_cameras'];
		}else{
			mTotalCamerasLimit = 0;
			mHostedCamerasLimit = 0;
			mTotalCamerasCreated = 0;
			mHostedCamerasCreated = 0;
		}
	}
	var mUpdateData = {};
	
	_parseJson(jsonUser, jsonCapabilities);

	self._getConn = function(){
		return mConn;
	}
	
	self._origJsonAccount = function(){
		return mOrigJsonAccount;
	}
	
	self._origJsonCapabilities = function(){
		return mOrigJsonCapabilities;
	}
	
	self.getID = function(){
		return mID;
	}
	
	self.getEmail = function(){
		return mEmail;
	}
	
	self.getFirstName = function(){
		return mFirstName;
	}
	
	self.getLastName = function(){
		return mLastName;
	}
	
	self.getPreferredName = function(){
		return mPreferredName;
	}
	
	self.getCameraLimit = function(){
		return mTotalCamerasLimit;
	}

	self.getCameraCreated = function(){
		return mTotalCamerasCreated;
	}
	
	self.refresh = function(){
		var p = CloudHelpers.promise();
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		mConn._getAPI().getAccountInfo().done(function(accInfo){
			mConn._getAPI().getAccountCapabilities().done(function(caps){
				_parseJson(accInfo,caps);
				p.resolve();
			}).fail(function(err){
				if(err.status == 500){
					_parseJson(accInfo);
				}else{
					CloudHelpers.handleError(err, p);
				}
			});
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
}

// construct
window.CloudCamera = function(conn, jsonData){
	var self = this;
	self.type = 'camera';
	var mConn = conn;
	var mOrigJson;
	var mID = jsonData.id;
	var mCameraManagerID = jsonData.cmngrid;
	var mURL, mURLLogin, mURLPassword;
	var mStatus, mTZ, mLatitude, mLongitude;
	var mDeleteAt, mName, mRecMode, mRecStatus;
	var mBrand, mGroupName, mFirmwareVersion;
	var mLed, mModel, mUUID, mSerialNumber;
	var mPublic;
	
	function _parseJsonData(data){
		mOrigJson = data;
		mURLLogin = data.login;
		mURLPassword = data.password;
		mURL = data.url;
		mName = data.name;
		mTZ = data.timezone;
		mStatus = data.status;
		mLatitude = data.latitude;
		mLongitude = data.longitude;
		mRecMode = data.rec_mode;
		mRecStatus = data.rec_status == 'on';
		mDeleteAt = data.delete_at;
		mBrand = data.brand;
		mGroupName = data.group_name;
		mFirmwareVersion = data.fw_version;
		mModel = data.model;
		mSerialNumber = data.serial_number;
		mUUID = data.uuid;
		mLed = data.led;
		mPublic = data.public ? data.public : false;
	}
	var mUpdateData = {};
	
	_parseJsonData(jsonData);

	self._getConn = function(){
		console.log("mConn = " + mConn)
		return mConn;
	}
	
	self._origJson = function(){
		return mOrigJson;
	}
	
	self.getID = function(){
		return mID;
	}
	self.getRecStatus = function(){
		console.warn("TODO");
	}
	self.hasPTZ = function(){
		console.warn("TODO");
	}
	self.getURL = function(){
		return mURL;
	}
	self.setURL = function(url){
		mURL = url;
		mUpdateData['url'] = url;
	}
    self.getURLLogin = function(){
		return mURLLogin;
	}
	
	self.setURLLogin = function(val){
		mURLLogin = val;
		mUpdateData['login'] = val;
	}
	
    self.getURLPassword = function(){
		return mURLPassword;
	}

    self.setURLPassword = function(val){
		mURLPassword = val;
		mUpdateData['password'] = val;
	}

	self.getDeleteAt = function(){
		return mDeleteAt;
	}

    self.getTimezone = function(){
		return mTZ;
	}

    self.setTimezone = function(timezone){
		mTZ = timezone;
		mUpdateData["timezone"] = timezone;
	}
	
	self.isPublic = function(){
		return mPublic;
	}
    self.setPublic = function(bValue){
		mPublic = bValue;
		mUpdateData["public"] = bValue;
	}
	
	self.getStatus = function(){
		var st = mStatus.toUpperCase();
		if(CloudCameraStatus[st]){
			return CloudHelpers.copy(CloudCameraStatus[st]);
		}else{
			console.error("Unknown camera status");
		}
		return null;
	}
	
	self.getName = function(){
		return mName;
	}

	self.setName = function(name){
		mName = name;
		mUpdateData["name"] = name;
	}
	
	self.getLatitude = function(){
		return mLatitude;
	}
	
	self.setLatitude = function(latitude){
		mLatitude = latitude;
		mUpdateData['latitude'] = latitude;
	}
	
	self.getLongitude = function(){
		return mLongitude;
	}
	
	self.setLongitude = function(longitude){
		mLongitude = longitude;
		mUpdateData['longitude'] = longitude;
	}
	
	self.isRecording = function(){
		return mRecStatus;
	}

	self.getCameraManagerID = function(){
		return mCameraManagerID;
	}

	self.getBrand = function(){
		return mBrand;
	}
	
	self.getGroupName = function(){
		return mGroupName;
	}
	
	self.getFirmwareVersion = function(){
		return mFirmwareVersion;
	}
	
	self.getModel = function(){
		return mModel;
	}
	
	self.getUUID = function(){
		return mUUID;
	}

	self.getLed = function(){
		return mLed;
	}

	self.setRecordingMode = function(mode){
		if(mode.name == CloudCameraRecordingMode.CONTINUES.name){
			mUpdateData['rec_mode'] = "on";
		}else if(mode.name == CloudCameraRecordingMode.BY_EVENT.name){
			mUpdateData['rec_mode'] = "by_event";
		}else if(mode.name == CloudCameraRecordingMode.NO_RECORDING.name){
			mUpdateData['rec_mode'] = "off";
		}else{
			console.error("[CloudCamera] Unknown mode of recording");
		}
	}
	
	self.getRecordingMode = function(){
		if(mRecMode == "on"){
			return CloudHelpers.copy(CloudCameraRecordingMode.CONTINUES);
		}else if(mRecMode == "by_event"){
			return CloudHelpers.copy(CloudCameraRecordingMode.BY_EVENT);
		}else if(mRecMode == "off"){
			return CloudHelpers.copy(CloudCameraRecordingMode.NO_RECORDING);
		}else{
			console.error("[CloudCamera] Unknown mode of recording");
		}
	}
	
	self.save = function(){
		var p = CloudHelpers.promise();
		
		mConn._getAPI().updateCamera(mID, mUpdateData).done(function(r){
			_parseJsonData(r);
			if(mUpdateData['timezone']){ // timezone need change in cameramanager
				mConn._getAPI().updateCameraManager(mCameraManagerID, {timezone: mUpdateData['timezone']}).done(function(){
					mTZ = mUpdateData['timezone'];
					mUpdateData = {};
					p.resolve();
				}).fail(function(err){
					CloudHelpers.handleError(err, p);
				});
			}else{
				mUpdateData = {};
				p.resolve();
			}
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}
	
	self.getPreview = function(){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		var diffTime = mConn._getAPI().diffServerTime;
		mConn._getAPI().cameraPreview(mID).done(function(r){
			console.log(r);
			var preview_time = CloudHelpers.parseUTCTime(r.time);
			curr_time = CloudHelpers.getCurrentTimeUTC() + diffTime;
			if((curr_time - preview_time)/1000 > 60){
				mConn._getAPI().cameraUpdatePreview(mID).done(function(up_r){
					p.resolve(r.url);
				}).fail(function(up_err){
					CloudHelpers.handleError(up_err, p);
				});
			}else{
				p.resolve(r.url);
			}
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}

	self.getTimeline = function(start,end){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		var start_dt = CloudHelpers.formatUTCTime(start);
		var end_dt = CloudHelpers.formatUTCTime(end);
		var slice = 4;
		mConn._getAPI().storageTimeline(mID,start_dt,end_dt,slice).done(function(r){
			var res = {};
			res.start = start;
			res.end = end;
			res.periods = []
			var list = r.objects[0][slice];
			for(var i in list){
				var period = {}
				period.start = CloudHelpers.parseUTCTime(list[i][0]);
				period.end = period.start + list[i][1]*1000;
				res.periods.push(period);
			}
			p.resolve(res);
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}
	
	self.getTimelineDays = function(use_timezone){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		mConn._getAPI().storageActivity(mID,use_timezone).done(function(r){
			var res = [];
			for(var i in r.objects){
				res.push(CloudHelpers.parseUTCTime(r.objects[i] + 'T00:00:00'));
			}
			p.resolve(res);
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}
	
	self.getCameraUsage = function(){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		mConn._getAPI().cameraUsage(mID).done(function(r){
			p.resolve(r);
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}

	var sharing_token_name = 'COMMON_SHARING_TOKEN';
	
	function channelCode(share_token){
		var channel = {};
		channel.token = share_token;
		channel.camid = mID;
		channel.access = 'watch';
		if(mConn.ServiceProviderUrl){
			channel.svcp = mConn.ServiceProviderUrl;
		}

		if(mConn.ApiHost){
			channel.api = mConn.ApiHost;
		}

		if(mConn.ApiPort && mConn.ApiPort != 80){
			channel.api_p = mConn.ApiPort;
		}

		if(mConn.ApiSecurePort && mConn.ApiSecurePort != 443){
			channel.api_sp = mConn.ApiSecurePort; 
		}

		// console.log("js: " + JSON.stringify(channel));
		// console.log("js2: " + btoa(JSON.stringify(channel)));
		return CloudHelpers.base64_encode(JSON.stringify(channel));
	}
	
	self.enableSharing = function(){
		var p = CloudHelpers.promise();
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		mConn._getAPI().getCameraSharingTokensList(mID).done(function(r){
			var bFound = false;
			for(var i in r.objects){
				var sh_tkn = r.objects[i];
				if(sh_tkn.name == sharing_token_name){
					bFound = true;
					if(sh_tkn.enabled == true){
						p.resolve(channelCode(sh_tkn.token, mID, 'watch'));
					}else{
						mConn._getAPI().updateCameraSharingToken(mID, sh_tkn.id, {enabled: true}).done(function(r2){
							// console.log(r2);
							p.resolve(channelCode(sh_tkn.token, mID, 'watch'));
						}).fail(function(err){
							CloudHelpers.handleError(err, p);
						})
					}
					// mConn._getAPI().
					return;
				}
			}
			if(!bFound){
				mConn._getAPI().creareCameraSharingToken(mID, sharing_token_name, ['live', 'play', 'clipsplay']).done(function(r){
					p.resolve(channelCode(r.token, mID, 'watch'));
				}).fail(function(err){
					CloudHelpers.handleError(err, p);
				});	
			}
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}
	
	self.disableSharing = function(sharing_token){
		var p = CloudHelpers.promise();
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		mConn._getAPI().getCameraSharingTokensList(mID).done(function(r){
			var bFound = false
			for(var i in r.objects){
				var sh_tkn = r.objects[i];
				if(sh_tkn.name == sharing_token_name){
					bFound = true;
					mConn._getAPI().updateCameraSharingToken(mID, sh_tkn.id, {enabled: false}).done(function(r2){
						console.log(r2);
						p.resolve();
					}).fail(function(err){
						CloudHelpers.handleError(err, p);
					})
					return;
				}
			}
			p.reject();
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}
	
	var sharing_token_name_for_stream = 'COMMON_SHARING_TOKEN_FOR_STREAM';

	function channelCodeForStream(share_token){
		var channel = {};
		channel.token = share_token;
		channel.camid = mID;
		channel.cmngrid = mCameraManagerID;
		channel.access = 'all';
		channel.api_p = 80;
		channel.api_sp = 443;
		channel.cam = "cam.skyvr.videoexpertsgroup.com";
		channel.cam_p = 8888; // default port
		channel.cam_sp = 8883; // default port

		if(mConn.ServiceProviderUrl){
			channel.svcp = mConn.ServiceProviderUrl;
			// channel.api = mConn.ServiceProviderUrl;
		}
		if(mConn.ApiHost){
			channel.api = mConn.ApiHost;
		}

		if(mConn.ApiPort && mConn.ApiPort != 80){
			channel.api_p = mConn.ApiPort;
		}

		if(mConn.ApiSecurePort && mConn.ApiSecurePort != 443){
			channel.api_sp = mConn.ApiSecurePort; 
		}

		if(mConn.CamHost){
			channel.cam = mConn.CamHost;
		}

		if(mConn.CamPort){
			channel.cam_p = mConn.CamPort;
		}

		if(mConn.CamSecurePort){
			channel.cam_sp = mConn.CamSecurePort; 
		}

		// console.log("js: " + JSON.stringify(channel));
		// console.log("js2: " + btoa(JSON.stringify(channel)));
		return CloudHelpers.base64_encode(JSON.stringify(channel));
	}
	
	self.enableSharingForStream = function(){
		var p = CloudHelpers.promise();
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		mConn._getAPI().getCameraSharingTokensList(mID).done(function(r){
			var bFound = false;
			for(var i in r.objects){
				var sh_tkn = r.objects[i];
				if(sh_tkn.name == sharing_token_name_for_stream){
					bFound = true;
					if(sh_tkn.enabled == true){
						p.resolve(channelCodeForStream(sh_tkn.token));
					}else{
						mConn._getAPI().updateCameraSharingToken(mID, sh_tkn.id, {enabled: true}).done(function(r2){
							// console.log(r2);
							p.resolve(channelCodeForStream(sh_tkn.token));
						}).fail(function(err){
							CloudHelpers.handleError(err, p);
						})
					}
					// mConn._getAPI().
					return;
				}
			}
			if(!bFound){
				mConn._getAPI().creareCameraSharingToken(mID, sharing_token_name_for_stream, ['all']).done(function(r){
					p.resolve(channelCodeForStream(r.token));
				}).fail(function(err){
					CloudHelpers.handleError(err, p);
				});	
			}
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}

    self.getStreamingURL = function(){
        var p = CloudHelpers.promise();
        if(!mConn || !mConn.isOpened()){
            p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
            return p;
        }
        mConn._getAPI().getCameraStreamingURLs(mID).done(function(r){
            p.resolve(r);
        }).fail(function(err){
            CloudHelpers.handleError(err, p);
        });
        return p;
    };

    self.setPublishPassword = function(val){
        mUpdateData['publish_password'] = val;
    };

}

window.CloudCameraListFilter = function(){
	var self = this;
	self.filterParams = {
		'detail': 'detail',
		'limit': 50
	};

	self.setLimit = function(limit){
		self.filterParams['limit'] = limit;
	}

	self.setOffset = function(offset){
		self.filterParams['offset'] = offset;
	}

	self.setName = function(name){
		if(name !== undefined){
			self.filterParams['name'] = name;
		}else{
			delete self.filterParams['name'];
		}
	}
	
	self.setPartOfName = function(name){
		if(name !== undefined){
			self.filterParams['name__icontains'] = name;
		}else{
			delete self.filterParams['name__icontains'];
		}
	}

	self.sortByName = function(asc){
		self.filterParams['order_by'] = (asc ? '-' : '') + 'name';
	}

	self.sortByDate = function(asc){
		self.filterParams['order_by'] = (asc ? '-' : '') + 'created';
	}

	self.setOwner = function(val){
		console.warn("setPublic is deprecated");
		if(val !== undefined){
			self.filterParams['is_owner'] = val;
		}else{
			delete self.filterParams['is_owner'];
		}
	}

	self.setPublic = function(val){
		console.warn("setPublic is deprecated");
		if(val !== undefined){
			self.filterParams['public'] = val;
		}else{
			delete self.filterParams['public'];
		}
	}

	self.setForStream = function(val){
		if(val !== undefined){
			if(val !== undefined){
				self.filterParams['url__isnull'] = val;
			}else{
				delete self.filterParams['url__isnull'];
			}
		}else{
			delete self.filterParams['url__isnull'];
		}
	}

	self.setPrivacy = function(val){
		if(val !== undefined && val.name){
			if(val.name == "PS_OWNER_NOT_PUBLIC"){
				self.filterParams['public'] = false;
				self.filterParams['is_owner'] = true;
			}else if(val.name == "PS_OWNER"){
				delete self.filterParams['public'];
				self.filterParams['is_owner'] = true;
			}else if(val.name == "PS_PUBLIC_NOT_OWNERS"){
				self.filterParams['public'] = true;
				self.filterParams['is_owner'] = false;
			}else if(val.name == "PS_PUBLIC"){
				self.filterParams['public'] = true;
				delete self.filterParams['is_owner'];
			}else if(val.name == "PS_OWNERS_PUBLIC"){
				self.filterParams['public'] = true;
				self.filterParams['is_owner'] = true;
			}else if(val.name == "PS_ALL"){
				delete self.filterParams['public'];
				delete self.filterParams['is_owner'];
			}else{
				console.error("Unknown privacy filter");
				delete self.filterParams['public'];
				delete self.filterParams['is_owner'];
			}
		}else{
			console.error("Unknown privacy filter");
			delete self.filterParams['public'];
			delete self.filterParams['is_owner'];
		}
	}

	self.setURL = function(url){
		if(url !== undefined){
			self.filterParams['url'] = url;
		}else{
			delete self.filterParams['url'];
		}
	}

	self.setLatLngBounds = function(latitude_min, latitude_max, longitude_min, longitude_max){
		 console.warn("[CloudCamerasListFilter] SetLatLngBounds, TODO test -1 < lat,lang < 1");
		 // TODO: don't forget check situation when MAX < MIN (if it possible, of course)!!!!
		 if(latitude_min <= latitude_max){
			self.filterParams['latitude__gte'] = latitude_min;
			self.filterParams['latitude__lte'] = latitude_max;
        }

        if(longitude_min <= longitude_max){
			self.filterParams['longitude__gte'] = longitude_min;
			self.filterParams['longitude__lte'] = longitude_max;
        }
	}

	self._values = function(){
		return self.filterParams;
	}
}

// construct
window.CloudCameraList = function(conn){
	var self = this;
	var mConn = conn;
	
	self.getCamera = function(camid){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		
		mConn._getAPI().getCamera(camid).done(function(r){
			p.resolve(new CloudCamera(mConn, r));
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}

	self.createCamera = function(url, login, password){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}

		var data = {
			url: url,
			login: login,
			password: password
		};
		mConn._getAPI().createCamera(data).done(function(r){
			p.resolve(new CloudCamera(mConn, r));
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}
	
	self.createCameraForStream = function(){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}

		var data = {};
		mConn._getAPI().createCamera(data).done(function(r){
			p.resolve(new CloudCamera(mConn, r));
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}

	self.findOrCreateCamera = function(url){
		var p = CloudHelpers.promise();
		var camFilter = new CloudCameraListFilter();
		camFilter.setOwner(true);
		var u = CloudHelpers.splitUserInfoFromURL(url);
		camFilter.setURL(u.url);
		u.login = u.login || "";
		mConn._getAPI().camerasList(camFilter._values()).done(function(r){
			var bFound = false;
			for(var i in r.objects){
				var cam = r.objects[i];
				cam['login'] = cam['login'] || "";
				if(cam['login'] == u.login){
					bFound = true;
					p.resolve(new CloudCamera(mConn, cam));
					break;
				}
			}
			if(!bFound){
				self.createCamera(u.url, u.login, u.password).done(function(r){
					p.resolve(r);
				}).fail(function(err){
					CloudHelpers.handleError(err, p);
				})
			}
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
	

	self.getCameraList = function(camFilter){
		var p = CloudHelpers.promise();
		
		camFilter = camFilter || new CloudCameraListFilter();
		if(!camFilter['_values']){
			console.error(CloudReturnCode.ERROR_EXPECTED_FILTER);
			p.reject(CloudReturnCode.ERROR_EXPECTED_FILTER);
			return p;
		}
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		
		mConn._getAPI().camerasList(camFilter._values()).done(function(r){
			var arr = [];
			for(var i in r.objects){
				arr.push(new CloudCamera(mConn, r.objects[i]));
			}
			p.resolve(arr);
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
	
	self.getCameraListLight = function(camFilter){
		var p = CloudHelpers.promise();
		
		camFilter = camFilter || new CloudCameraListFilter();
		if(!camFilter['_values']){
			console.error(CloudReturnCode.ERROR_EXPECTED_FILTER);
			p.reject(CloudReturnCode.ERROR_EXPECTED_FILTER);
			return p;
		}
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		var filter = camFilter._values();
		delete filterMap['detail'];
		mConn._getAPI().camerasList(filter).done(function(r){
			p.resolve(r.objects);
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
	
	self.deleteCamera = function(camid){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		
		mConn._getAPI().deleteCamera(camid).done(function(){
			p.resolve();
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}
}

// construct
window.CloudSession = function(conn, jsonData){
	var self = this;
	self.type = 'session';
	var mConn = conn;
	var mOrigJson;
	var mID = jsonData.id;
	
	// TODO
	
	var mActive, mTitle, mPreviewURL, mAuthor;
	var mStreaming, mPublic, mLatitude, mLongitude;
	var mStart, mEnd, mHasRecords;
	var mHasAccessAll;
	var mHasAccessWatch;
	var mStatisticsLive = 0, mStatisticsPeakLive = 0, mStatisticsPlayback = 0;
	var mAuthorPreferredName;
	var mLiveURL_rtmp, mLiveURL_hls, mLiveURL_expire;
	 
	mPreviewURL = "";
	
	function _parseJsonData(data){
		mOrigJson = data;
		mActive = data.active;
		mTitle = data.title;
		if(data.preview){
			mPreviewURL = data.preview.url;
		}

		if(data.live_urls){
			mLiveURL_rtmp = data.live_urls.rtmp;
			mLiveURL_hls = data.live_urls.hls;
			mLiveURL_expire = data.live_urls.expire;
		}

		mLatitude = data.latitude;
		mLongitude = data.longitude;
		mStreaming = data.streaming;
		mPublic = data.public;
		mStart = data.start;
		mEnd = data.end;
		mHasRecords = data.has_records;
		if(data.statistics){
			mStatisticsPeakLive = data.statistics.peak_live || 0;
			mStatisticsPlayback = data.statistics.playback || 0;
			mStatisticsLive = data.statistics.live || 0;
		}

		if(data.author){
			// TODO: author:{first_name: "Evgenii", id: "user5", last_name: "Sopov", name: "Evgenii Sopov", preferred_name: "evgenii"}
			mAuthorPreferredName = data.author.preferred_name;
		}else{
			mAuthorPreferredName = "unknown";
		}
		
		if(data.access){
			mHasAccessAll = data.access.indexOf("all") != -1;
			mHasAccessWatch = data.access.indexOf("watch") != -1;
		}
	}
	var mUpdateData = {};
	
	_parseJsonData(jsonData);

	self._getConn = function(){
		return mConn;
	}

	self._origJson = function(){
		return mOrigJson;
	}
	
	self.hasAccessAll = function(){
		return mHasAccessAll;
	}
	
	self.hasAccessWatch = function(){
		return mHasAccessAll || mHasAccessWatch;
	}
	
	self.getID = function(){
		return mID;
	}
	
	self.isOnline = function(){
		return mActive;
	}
	
	self.getTitle = function(){
		return mTitle;
	}

	self.getAuthorPreferredName = function(){
		return mAuthorPreferredName;
	}
	
	self.getStatisticsLive = function(){
		return mStatisticsLive;
	}
	
	self.getStatisticsPeakLive = function(){
		return mStatisticsPeakLive;
	}
	
	self.getStatisticsPlayback = function(){
		return mStatisticsPlayback;
	}
	
	self.getStartTime = function(){
		if(mStart == null){
			console.error("[CloudSession] #" + mID + " Start time is null");
			return 0;
		}
		return CloudHelpers.parseUTCTime(mStart);
	}
	
	self.getEndTime = function(){
		if(mStart == null){
			console.error("[CloudSession] #" + mID + " End time is null but session is mActive: " + mActive);
			return 0;
		}
		return CloudHelpers.parseUTCTime(mEnd);
	}

	self.getPreview = function(){
		return mPreviewURL;
	}
	
	self.getLatitude = function(){
		return mLatitude;
	}
	
	self.getLongitude = function(){
		return mLongitude;
	}
	
	self.isStreaming = function(){
		return mStreaming;
	}
	
	self.isPublic = function(){
		return mPublic;
	}
	
	self.hasRecords = function(){
		return mHasRecords;
	}
	
	self.getLiveUrl_Rtmp = function(){
		return mLiveURL_rtmp;
	}
	
	self.getLiveUrl_HLS = function(){
		return mLiveURL_hls;
	}
	
	self.getLiveUrl_Expire = function(){
		return mLiveURL_expire;
	}

	self.refresh = function(){
		var p = CloudHelpers.promise();
		mConn._getAPI().getCamsess(mID).done(function(r){
			_parseJsonData(r);
			p.resolve();
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}
}

window.CloudSessionListFilter = function(){
	var self = this;
	self.filterParams = {
		'limit': 50,
		'order_by': '-start' // default
	};

	self.setLimit = function(limit){
		self.filterParams['limit'] = limit;
	}
	
	self.setOffset = function(offset){
		self.filterParams['offset'] = offset;
	}

	self.setTitle = function(s){
		self.filterParams["title__icontains"] = s; // ignore case
	}
	
	self.setStartLessThen = function(s){
		self.filterParams['start__lte'] = s;
	}
	
	self.setHasRecords = function(s){
		if(s == 'any'){
			// all
        }else if(s == 'yes'){
			self.filterParams['has_records'] = true;
			self.filterParams['active'] = false;
		}else if(s == 'no'){
			self.filterParams['has_records'] = false;
			self.filterParams['active'] = false;
		}else{
			console.error("[CloudSessionListFilter] setHasRecords, expected 'any', 'yes' or 'no'")
		}
	}
	
	self.setStreaming = function(s){
		if(s == 'any'){
			// all
        }else if(s == 'yes'){
			self.filterParams['streaming'] = true;
			self.filterParams['camera_online'] = true;
			self.filterParams['active'] = true;
		}else if(s == 'no'){
			self.filterParams['streaming'] = false;
			delete self.filterParams['camera_online'];
			self.filterParams['active'] = false;
		}else{
			console.error("[CloudSessionListFilter] setStreaming, expected 'any', 'yes' or 'no'")
		}
	}

	self.setAuthorName = function(s){
		self.filterParams['author_name__icontains'] = s;
	}
	
	self.setAuthorID = function(n){
		if(n){
			self.filterParams['author_id'] = n;
		}else{
			delete self.filterParams['author_id'];
		}
	}
	
	self.setAuthorPreferredName = function(s){
		if(s){
			self.filterParams['author_preferred_name__icontains'] = s;
		}else{
			delete self.filterParams['author_preferred_name__icontains'];
		}
	}
	
	self.setWithDetails = function(){
		console.warn("[CloudSessionListFilter] 'setWithDetails' not supported anymore. Please use getSessionList or getSessionListLight")
	}
	
	self.setOnline = function(s){
		console.warn("[CloudSessionListFilter] 'setOnline' not supported anymore")
	}
	
	self.setPublic = function(s){
		if(s == 'any'){
			// any
        }else if(s == 'yes'){
			self.filterParams['public'] = true;
		}else if(s == 'no'){
			self.filterParams['public'] = false;
		}else{
			console.error("[CloudSessionListFilter] setOnline, expected 'any', 'yes' or 'no'")
		}
	}
	
	self.setLatLngBounds = function(latitude_min, latitude_max, longitude_min, longitude_max){
		if(latitude_min <= latitude_max){
			self.filterParams['latitude__gte'] = latitude_min;
			self.filterParams['latitude__lte'] = latitude_max;
		}else{
			console.error("[CloudCamerasListFilter] latitude_max must be greater or equal to latitude_min");
		}

		if(longitude_min <= longitude_max){
			self.filterParams['longitude__gte'] = longitude_min;
			self.filterParams['longitude__lte'] = longitude_max;
		}else{
			console.error("[CloudCamerasListFilter] longitude_max must be greater or equal to longitude_min");
		}
	}

	self._values = function(){
		var filterMapCopy = {};
		for(var p in self.filterParams){
			filterMapCopy[p] = self.filterParams[p];
		}
		return filterMapCopy;
	}
}

// construct
window.CloudSessionList = function(conn){
	var self = this;
	var mConn = conn;
	
	self.getSession = function(sessid){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		
		mConn._getAPI().getCamsess(sessid).done(function(r){
			p.resolve(new CloudSession(mConn, r));
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}

	self.getSessionList = function(sessionFilter){
		var p = CloudHelpers.promise();
		
		sessionFilter = sessionFilter || new CloudSessionListFilter();
		if(!sessionFilter['_values']){
			console.error(CloudReturnCode.ERROR_EXPECTED_FILTER);
			p.reject(CloudReturnCode.ERROR_EXPECTED_FILTER);
			return p;
		}
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		var filterMap = sessionFilter._values();
		filterMap['detail'] = 'detail';
		mConn._getAPI().getCamsessList(filterMap).done(function(r){
			var arr = [];
			for(var i in r.objects){
				arr.push(new CloudSession(mConn, r.objects[i]));
			}
			p.resolve(arr);
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
	
	self.getSessionListLight = function(sessionFilter){
		var p = CloudHelpers.promise();
		
		sessionFilter = sessionFilter || new CloudSessionListFilter();
		if(!sessionFilter['_values']){
			console.error(CloudReturnCode.ERROR_EXPECTED_FILTER);
			p.reject(CloudReturnCode.ERROR_EXPECTED_FILTER);
			return p;
		}
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		var filterMap = sessionFilter._values();
		delete filterMap['detail'];
		mConn._getAPI().getCamsessList(filterMap).done(function(r){
			p.resolve(r.objects);
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		})
		return p;
	}
	
	self.deleteSession = function(sessid){
		var p = CloudHelpers.promise();
		
		if(!mConn || !mConn.isOpened()){
			p.reject(CloudReturnCode.ERROR_NO_CLOUD_CONNECTION);
			return p;
		}
		
		mConn._getAPI().deleteCamsess(sessid).done(function(){
			p.resolve();
		}).fail(function(err){
			CloudHelpers.handleError(err, p);
		});
		return p;
	}
}

window.CloudPlayerEvent = {};

CloudPlayerEvent.CONNECTING = {
	name: 'CONNECTING',
	code: 0,
	text: 'Connection is establishing'
};

CloudPlayerEvent.CONNECTED = {
	name: 'CONNECTED',
	code: 1,
	text: 'Connection is established'
};

CloudPlayerEvent.PLAYED = {
	name: 'PLAYED',
	code: 2,
	text: 'Player changes state to PLAY.'
};

CloudPlayerEvent.PAUSED = {
	name: 'PAUSED',
	code: 3,
	text: 'Player state is PAUSE.'
};

CloudPlayerEvent.CLOSED = {
	name: 'CLOSED',
	code: 6,
	text: 'Player state is CLOSED.'
};
   
CloudPlayerEvent.SEEK_COMPLETED = {
	name: 'SEEK_COMPLETED',
	code: 17,
	text: 'setPosition() is successfully finished.'
};

CloudPlayerEvent.ERROR = {
	name: 'ERROR',
	code: 105,
	text: 'Player is disconnected from media stream due to an error'
};

CloudPlayerEvent.SOURCE_CHANGED = {
	name: 'SOURCE_CHANGED',
	code: 3000,
	text: 'setSource() is successfully finished.'
};

CloudPlayerEvent.POSITION_JUMPED = {
	name: 'POSITION_JUMPED',
	code: 3001,
	text: 'Position was changed by player (possible that player did not found records).'
};

CloudPlayerEvent.RANGE_ENDED = {
	name: 'RANGE_ENDED',
	code: 4455,
	text: 'The player reached the end of the range when playing'
}

CloudPlayerEvent.CHANNEL_STATUS = {
	name: 'CHANNEL_STATUS',
	code: 4456,
	text: 'When channel status'
}

CloudPlayerEvent.USER_CLICKED_ON_TIMELINE = {
	name: 'USER_CLICKED_ON_TIMELINE',
	code: 4457,
	text: 'When user click on timeline.'
};

CloudPlayerEvent.CHANGED_CONTROLS = {
	name: 'CHANGED_CONTROLS',
	code: 4458,
	text: 'Event when controls changes'
};

CloudPlayerEvent.TIMELINE_END_UPDATED = {
	name: 'TIMELINE_END_UPDATED',
	code: 4459,
	text: 'Event when timeline end updated'
};




// construct
window._cloudPlayers = window._cloudPlayers || {};

window.CloudPlayer = function(elid, options){
	var self = this;
	options = options || {};
	self.elid = elid;
	var mConn = null;
	var mEvent = null;
	var mShowedBigPlayButton = false;
	var mShowedLoading = true;
	var mTimeWaitStartStream = 0;
	var mStopped = true;
	var mPlaying = false;
	var mHLSLinkExpire = 0;
	var mSafariAndHlsNotStarted = false;
	var mCallbacks = CloudHelpers.createCallbacks();
	var mUsedPlayer = '';
	var mWebRTC_el = null;
	var mWebRTC0_Player = null;
	var mWebRTC2_Player = null;
	var mNativeHLS_el = null;
	var mNativeHLS_Player = null;
	var mNativeVideo1_el = null;
	var mNativeVideo2_el = null;
	var mLiveModeAutoStart = false;
	var mPolingCameraStatus = null;
	var mCallback_onError = null; // deprecated
	var mCallback_onChannelStatus = null; // deprecated
	var mPlayerFormatForced = null;
	var mElementCalendar = null;
	var mCurrentTimeInterval = null;
	var mExpireHLSTimeInterval = null;
	var mEnablePlaybackNative = true;
	var mTrasholdPlayback = 0; // default in ms for playback

	self.timePolingLiveUrls = 15000;
	self.player = document.getElementById(elid);
	
	if (_cloudPlayers[elid]) {
		return _cloudPlayers[elid];
	}
	
	var mCurrentRecord_vjs = null;
	var mNextRecord_vjs = null;
	
	var mRangeMin = -1;
	var mRangeMax = -1;
	var mVideoSizeLive = {w: 0, h: 0};

	// configure hls plugin
	if (CloudHelpers.isChrome() && !CloudHelpers.isMobile()) {
		videojs.options.hls = videojs.options.hls || {};
		videojs.options.html5.nativeAudioTracks = true;
		videojs.options.html5.nativeVideoTracks = true;
		videojs.options.hls.overrideNative = false;
	} else {
		videojs.options.hls = videojs.options.hls || {};
		videojs.options.html5.nativeAudioTracks = false;
		videojs.options.html5.nativeVideoTracks = false;
		videojs.options.hls.overrideNative = true;
	}
	// videojs.options.hls.withCredentials = false;
	videojs.options.hls.enableLowInitialPlaylist = true;
	// videojs.options.hls.blacklistDuration = 0;
	// videojs.options.hls.handleManifestRedirects = false;

	// videojs.options.hls.bandwidth

	if (self.player == null) {
		console.error("[CloudPlayer] Not found element");
		return null;
	}
	
	if (self.player.tagName != 'DIV') {
		console.error("[CloudPlayer] Expected DIV tag but got " + self.player.tagName);
		return null;
	}
	
	var mPosition = -1;
	
	var mWaitSourceActivationCounter = 0;
	var mTimePolingCameraStatus_inactive = 2000;
	var mTimePolingCameraStatus_active = 5000;

	var mCurrentPlayRecord = null;
	var mNextPlayRecord = null;
	self.m = {};
	self.m.mute = false;
	self.m.waitSourceActivation = options.waitSourceActivation || 0;
	/*if (self.m.waitSourceActivation > 60000) {
		console.warn("[CloudPlayer] option waitSourceActivation must be less than 30");
		self.m.waitSourceActivation = 30;
	}*/
	self.m.useTimezone = options.useTimezone;
	if (self.m.useTimezone) {
		console.warn("[CloudPlayer] useTimezone: " + self.m.useTimezone);
	}
	
	if (self.m.waitSourceActivation < 0) {
		console.warn("[CloudPlayer] option waitSourceActivation must be greater than -1");
		self.m.waitSourceActivation = 0;
	}

	self.m.useNativeHLS = options.useNativeHLS || false;

	self.m.backwardAudio = false;
	self.m.backwardAudio = options.backwardAudio || self.player.getAttribute('backward-audio') != null || self.m.backwardAudio; 
	self.defualtAutohide = CloudHelpers.isMobile() ? 0 : 3000;
	if (options["autohide"] !== undefined) {
		self.m.autohide = options.autohide	
	} else {
		self.m.autohide = self.defualtAutohide;	
	}

	if (options.trasholdPlaybackInMs) {
		mTrasholdPlayback = options.trasholdPlaybackInMs;
		console.log("[CloudPlayer] applied option trasholdPlaybackInMs " + options.trasholdPlaybackInMs);
	}
	
	self.mPlayerFormat = 'html5';

	// load format from storage
	
	var tmp_plr_frmt = '';
	if (options.preferredPlayerFormat) {
		tmp_plr_frmt = options.preferredPlayerFormat;
	} else {
		try{
			tmp_plr_frmt = localStorage.getItem("preferred_player_format");
		} catch (e) {
			console.error("[CloudPlayer] error load format: ", e)
		}
	}

	if (tmp_plr_frmt == 'webrtc' || tmp_plr_frmt == 'html5' || tmp_plr_frmt == 'flash') {
		self.mPlayerFormat = tmp_plr_frmt;
	}else{
		if(tmp_plr_frmt != null){
		}
		console.error("[CloudPlayer] Unknown player format: ", tmp_plr_frmt);
	}

	if (options.useOnlyPlayerFormat) {
		var use_plr_frmt = options.useOnlyPlayerFormat;
		if (use_plr_frmt !== 'webrtc' && use_plr_frmt !== 'html5' && use_plr_frmt !== 'flash') {
			console.error("Wrong value of useOnlyPlayerFormat, expected 'webrtc' or 'html5' or 'flash'")
		} else {
			self.mPlayerFormat = use_plr_frmt;
			mPlayerFormatForced = use_plr_frmt;
			try { localStorage.setItem("preferred_player_format", use_plr_frmt); } catch(e) {}
		}
	}

	if (options.mute !== undefined) {
		self.m.mute = options.mute === true ? true : false
	}

	self.swf_backwardaudio = '';

	// default
	self.player.classList.add("cloudplayer");
	self.player.classList.add("green");
	self.player.classList.add("black");
	
	self.player.innerHTML = ''
		+ '<div class="cloudplayer-loader" style="display: inline-block"></div>'
		+ '<div class="cloudplayer-screenshot-loading" style="display: none">'
		+ '		<div class="cloudplayer-screenshot-loading">'
		+ '     </div>'
		+ '</div>'
		+ '<div class="cloudplayer-error" style="display: none">'
		+ '	<div class="cloudplayer-error-text" style="display: none"></div>'
		+ '</div>'
		+ '<div class="cloudplayer-controls-zoom-position">'
		+ '		<div class="cloudplayer-zoom-position-cursor"></div>'
		+ '</div>'
		+ '<div class="cloudplayer-info" style="display: none">'
		+ '		<div class="cloudplayer-info-title">Settings</div>'
		+ '		<div class="cloudplayer-info-close">X</div>'
		+ '		<div class="cloudplayer-info-playerversion">Version: ' + CloudSDK.version + ' (' + CloudSDK.datebuild + ')</div>'
		+ '		<div class="cloudplayer-info-playertype">Used player:</div>'
		+ '		<div class="cloudplayer-info-player-mode" style="' + (mPlayerFormatForced !== null ? 'display: none' : '' ) + '">Preferred format: '
		+ '			<div class="cloudplayer-player-mode cloudplayer-webrtc-mode" style="display: none">WebRTC</div>'
		+ ' 		<div class="cloudplayer-player-mode cloudplayer-flash-mode selected">RTMP</div>'
		+ ' 		<div class="cloudplayer-player-mode cloudplayer-html5-mode">HLS</div>'
		+ '		</div>'
		+ '		<!-- div class="cloudplayer-info-latency">Player Latency: '
		+ '			<div class="cloudplayer-info-latency-minimal">Minimal Latency</div>'
		+ '			/ '
		+ ' 		<div class="cloudplayer-info-latency-smoothless">Maximum Smoothness</div>'
		+ '		</div -->'
		+ '		<!-- div class="cloudplayer-info-latency-not-supported">Player Latency: Setting is not available for HTML5 player</div -->'
		+ '		<div class="cloudplayer-info-bufferlength"></div>'
		+ '		<div class="cloudplayer-info-audio-stream">Audio stream: '
		+'			<div class="cloudplayer-info-audio-stream-on">On</div>'
		+ '			/ '
		+ ' 		<div class="cloudplayer-info-audio-stream-off">Off</div>'
		+'		</div>'
		+ '</div>'
		+ '<div class="cloudplayer-backwardaudio-container">'
		+ (self.m.backwardAudio ? ''
		+ '<object data="' + self.swf_backwardaudio + '" type="application/x-shockwave-flash" id="backwardaudio_swf_single" align="top">'
		+ '		<param name="movie" value="' + self.swf_backwardaudio + '" />'
		+ '		<embed type="application/x-shockwave-flash" src="' + self.swf_backwardaudio + '">'
		+ '		<param name="allowScriptAccess" value="always"/>'
		+ '		<param value="allowNetworking" value="all"/>'
		+ '		<param name="menu" value="true" />'
		+ '		<param name="wmode" value="transparent"/>'
		+ '		<!-- param name="bgcolor" value="#ffffff" / -->'
		+ '		<param name="menu" value="false" />'
		+ '</object>'
		: '')
		+ '</div>'
		+ '<div class="cloudplayer-controls-zoom">'
		+ '	<div class="cloudplayer-zoom-up"></div>'
		+ '	<div class="cloudplayer-zoom-progress zoom10x"></div>'
		+ '	<div class="cloudplayer-zoom-down"></div>'
		+ '</div>'
		+ '<div class="cloudplayer-controls">'
		+ '	<div class="cloudplayer-settings"></div>'
		+ '	<div class="cloudplayer-volume-mute"></div>'
		+ '	<div class="cloudplayer-volume-down"></div>'
		+ '	<div class="cloudplayer-volume-progress vol7"></div>'
		+ '	<div class="cloudplayer-volume-up"></div>'
		+ '	<div class="cloudplayer-play" style="display: none"></div>'
		+ '	<div class="cloudplayer-stop" style="display: none"></div>'
		+ '	<div class="cloudplayer-microphone"></div>'
		+ '	<div class="cloudplayer-time"></div>'
		+ '	<div class="cloudplayer-fullscreen"></div>'
		+ '</div>'
		+ '<div class="cloudcameracalendar-content">'
		+ '</div>'
		+ '<div class="cloudplayer-big-play-button" style="display: none"></div>'
		+ '<video crossorigin="anonymous" id="' + elid + '_vjs" class="video-js" preload="auto" class="video-js vjs-default-skin vjs-live"'
		+ ' muted=' + self.m.mute + ' autoplay=true preload playsinline="true"></video>'
		+ '<video crossorigin="anonymous" id="' + elid + '_vjs2" class="video-js" preload="auto" class="video-js vjs-default-skin vjs-live"'
		+ ' muted=' + self.m.mute + ' autoplay=true preload playsinline="true" ></video>'
		+ '<video crossorigin="anonymous" id="' + elid + '_nv1" class="cloudplayer-native-video"'
		+ ' autoplay=true preload  playsinline="true" ></video>'
		+ '<video crossorigin="anonymous" id="' + elid + '_nv2" class="cloudplayer-native-video"'
		+ ' autoplay=true preload  playsinline="true" ></video>'
		+ '<video crossorigin="anonymous" id="' + elid + '_native_hls" class="cloudplayer-native-hls"'
		+ ' muted=' + self.m.mute + ' autoplay=true preload  playsinline="true" ></video>'
		+ '<video crossorigin="anonymous" id="' + elid + '_webrtc" class="cloudplayer-webrtc"'
		+ ' muted=' + self.m.mute + ' preload  playsinline="true" ></video>'
		+ '<div class="cloudplayer-black-screen" style="display: none">'
		+ '		<div class="cloudplayer-watermark"></div>'
		+ '		<div class="cloudplayer-sdkversion">SDK ' + CloudSDK.version + '</div>'
		+ '</div>'
	;

	self.vjs = videojs(elid + '_vjs', {
		"controls": false
	});
	
	self.vjs2 = videojs(elid + '_vjs2', {
		"controls": false
	}).ready(function(){
		self.vjs2.el().style.display = "none";
	});

	self.vjs.on('error',function(error){
		_hideloading();
		if(self.vjs.error() != null){
			var e = self.vjs.error();
			if (self.isLive()) {
				if (e.code == 4 && !CloudHelpers.supportFlash() && !CloudHelpers.isMobile() && self.mPlayerFormat == "flash") {
					_showerror({name: "REQUIRE_FLASH", text: "Please install and enable <a target='_black' href='https://get.adobe.com/flashplayer/'>Adobe Flash Player</a> and try again", code: -6001});
				} else if(e.code == 3 && CloudHelpers.isMobile()) {
					_showerror(CloudReturnCode.ERROR_COULD_NOT_DECODE_STREAM_OR_COULD_NOT_SET_COOKIE_HLS);
				} else {
					_showerror({name: "VIDEOJS_ERROR", text: "Code " + e.code + ": " + e.message, code: -6000});
				}
			} else {
				_showerror({name: "VIDEOJS_ERROR", text: "Code " + e.code + ": " + e.message, code: -6000});
			}
		}
		self.stop("by_vjs_error");
	});

	var mPlaybackPlayer1 = null;
	var mPlaybackPlayer2 = null;

	if (mEnablePlaybackNative) {
		mPlaybackPlayer1 = new CloudPlayerNativeVideo(elid + '_nv1');
		mPlaybackPlayer2 = new CloudPlayerNativeVideo(elid + '_nv2');
	} else {
		mPlaybackPlayer1 = self.vjs;
		mPlaybackPlayer2 = self.vjs2;
	}

	var mUniqPlay = null;
	// poling time
	self.time = 0;

	var el_controls = self.player.getElementsByClassName('cloudplayer-controls')[0];
	var el_controls_zoom = self.player.getElementsByClassName('cloudplayer-controls-zoom')[0];
	var el_controls_zoom_position = self.player.getElementsByClassName('cloudplayer-controls-zoom-position')[0];
	var mElementPlay = self.player.getElementsByClassName('cloudplayer-play')[0];
	var el_info = self.player.getElementsByClassName('cloudplayer-info')[0];
	var el_stop = self.player.getElementsByClassName('cloudplayer-stop')[0];
	var el_loader = self.player.getElementsByClassName('cloudplayer-loader')[0];
	var mElError = self.player.getElementsByClassName('cloudplayer-error')[0];
	var mElErrorText = self.player.getElementsByClassName('cloudplayer-error-text')[0];
	var el_player_time = self.player.getElementsByClassName('cloudplayer-time')[0];
	var mElBigPlayButton = self.player.getElementsByClassName('cloudplayer-big-play-button')[0];
	mWebRTC_el = self.player.getElementsByClassName('cloudplayer-webrtc')[0];
	mNativeHLS_el = self.player.getElementsByClassName('cloudplayer-native-hls')[0];
	mNativeVideo1_el = document.getElementById(elid + '_nv1');
	mNativeVideo2_el = document.getElementById(elid + '_nv2');
	var mElPlrType = self.player.getElementsByClassName('cloudplayer-info-playertype')[0];
	var mElSettingsOpen = self.player.getElementsByClassName('cloudplayer-settings')[0];
	var mElSettingsClose = self.player.getElementsByClassName('cloudplayer-info-close')[0];

	var mElSettings_wantWebRTC = self.player.getElementsByClassName('cloudplayer-webrtc-mode')[0];
	var mElSettings_wantFlash = self.player.getElementsByClassName('cloudplayer-flash-mode')[0];
	var mElSettings_wantHTML5 = self.player.getElementsByClassName('cloudplayer-html5-mode')[0];
	mElementCalendar = self.player.getElementsByClassName('cloudcameracalendar-content')[0];

	function _hideerror(){
		mElError.style.display = "none";
		mElErrorText.style.display = "none";
	}

	function _isShowedError() {
		return mElError.style.display == "inline-block";
	}

	function _showloading(){
		if(self.mShowedBigPlayButton == true){
			_hideloading();
		} else if(!mShowedLoading){
			el_loader.style.display = "inline-block";
			mShowedLoading = true;
		}
	}

	function _hideloading(){
		if(mShowedLoading){
			el_loader.style.display = "none";
			mShowedLoading = false;
		}
	}
	
	/* settings */
	
	mElSettingsOpen.onclick = function(){
		if(el_info.style.display != ''){
			el_info.style.display = '';
		}else{
			el_info.style.display = 'none';
		}
		
	}
	
	mElSettingsClose.onclick = function(){
		el_info.style.display = 'none';
	}

	mElSettings_wantWebRTC.onclick = function(){
		self.setPlayerFormat('webrtc');
		self.play();
	}
	mElSettings_wantFlash.onclick = function(){
		self.setPlayerFormat('flash');
		self.play();
	}
	mElSettings_wantHTML5.onclick = function(){
		self.setPlayerFormat('html5');
		self.play();
	}

	if(CloudHelpers.isMobile()){
		mElSettings_wantFlash.style.display = 'none';
	}

	function _updatePlayerFormatUI(live_urls) {
		live_urls = live_urls || {};
		mElSettings_wantWebRTC.style.display = (live_urls.rtc || live_urls.webrtc) ? '' : 'none';
		mElSettings_wantFlash.style.display = (!CloudHelpers.isMobile() && live_urls.rtmp) ? '' : 'none';
		mElSettings_wantHTML5.style.display = (live_urls.hls) ? '' : 'none';

		// UI
		mElSettings_wantWebRTC.classList.remove('selected');
		mElSettings_wantFlash.classList.remove('selected');
		mElSettings_wantHTML5.classList.remove('selected');

		if(self.mPlayerFormat == 'webrtc'){
			mElSettings_wantWebRTC.classList.add('selected');
		}else if(self.mPlayerFormat == 'flash'){
			mElSettings_wantFlash.classList.add('selected');
		}else if(self.mPlayerFormat == 'html5'){
			mElSettings_wantHTML5.classList.add('selected');
		}
	}
	
	_updatePlayerFormatUI();

	/* element for black screen */
	
	var mElementPlayerBlackScreen = self.player.getElementsByClassName('cloudplayer-black-screen')[0];
	function _showBlackScreen(){
		if(CloudHelpers.isFireFox()){
			console.warn("in firefox not good solution for a hiding adobe flash player");
		}else{
			mElementPlayerBlackScreen.style.display = "block";
		}
	}
	
	function _hideBlackScreen(){
		mElementPlayerBlackScreen.style.display = "";
	}

	_hideloading();

	function _showerror(err){
		console.error(err);
		self._setError(err);
		self.showErrorText(err.text);
		console.error(err.text);
		mCallbacks.executeCallbacks(CloudPlayerEvent.ERROR, err);
	}
	
	/*
	 * Poling time Start/Stop 
	 * */
	
	var _timeWaitStartStreamMax = 60;
	var _timeWaitStreamMax = 15; // if video stopped and wait for restart
	
	var _source_type = null;
	
	function _formatTimeMS(t){
		var t_ = t;
		var sec = t % 60;
		t = (t - sec)/60;
		var min = t % 60;
		// t = (t - min)/60;
		return ("00" + min).slice(-2) + ":" + ("00" + sec).slice(-2);
	}
	
	function _formatTimeLive(){
		var offset = 0;
		if (self.mSrc.type == 'camera' && self.m.useTimezone) {
			offset = CloudHelpers.getOffsetTimezone(self.m.useTimezone);
		} else if(self.mSrc.type == 'camera'){
			offset = CloudHelpers.getOffsetTimezone(self.mSrc.getTimezone());
		}

		var now = new Date();
		now.setTime(now.getTime() + offset);
		var res = ""
			+ " " + ("0000" + now.getUTCFullYear()).slice(-4)
			+ "-" + ("00" + (now.getUTCMonth() + 1)).slice(-2)
			+ "-" + ("00" + now.getUTCDate()).slice(-2)
			+ " " + ("00" + now.getUTCHours()).slice(-2)
			+ ":" + ("00" + now.getUTCMinutes()).slice(-2)
			+ ":" + ("00" + now.getUTCSeconds()).slice(-2);
		return res;
	}
	
	function _formatTimeCameraRecords(t){
		var offset = 0;
		if (self.mSrc.type == 'camera' && self.m.useTimezone) {
			offset = CloudHelpers.getOffsetTimezone(self.m.useTimezone);
		} else if(self.mSrc.type == 'camera'){
			offset = CloudHelpers.getOffsetTimezone(self.mSrc.getTimezone());
		}
		var now = new Date();
		now.setTime(t + offset);
		var res = ""
			+ " " + ("0000" + now.getUTCFullYear()).slice(-4)
			+ "-" + ("00" + (now.getUTCMonth() + 1)).slice(-2)
			+ "-" + ("00" + now.getUTCDate()).slice(-2)
			+ " " + ("00" + now.getUTCHours()).slice(-2)
			+ ":" + ("00" + now.getUTCMinutes()).slice(-2)
			+ ":" + ("00" + now.getUTCSeconds()).slice(-2);
		return res;
	}
	
	function _calculateTime(){
		if(mPosition != -1){
			if (mEnablePlaybackNative) {
				return Math.floor(mCurrentPlayRecord.startUTC + mPlaybackPlayer1.currentTime()*1000);
			}
			return mCurrentPlayRecord.startUTC + self.vjs.currentTime()*1000;
		}
		return Math.floor(self.vjs.currentTime());
	}
	
	function _checkAndFixVideoSize(){
		
		var h = self.vjs.videoHeight();
		var w = self.vjs.videoWidth();
		
		if(mVideoSizeLive.w != w || mVideoSizeLive.h != h){
			// console.log("_checkAndFixVideoSize");
			// console.log("video h = " + h + ", w = " + w);

			// fix resizing
			setTimeout(function(){
				var o = self.vjs.el().getElementsByTagName('object')[0];
				if(o){
					o.style['width'] = "calc(100% - 5px)";
					setTimeout(function(){
						o.style['width'] = "";
					},1000);
				}
			},1000);

			mVideoSizeLive.w = w;
			mVideoSizeLive.h = h;
		}
	}
	
	function _stopPolingTime(){
		clearInterval(mCurrentTimeInterval);
		el_player_time.innerHTML = "";
	}
	
	function _startPolingTime(){
		console.warn("[PLAYER] Start poling player time");
		clearInterval(mCurrentTimeInterval);

		mCurrentTimeInterval = setInterval(function(){
			if(mPlaying && !mStopped){
				var curr_time = 0;
				if(_source_type == 'camera_records') {
					curr_time = mCurrentPlayRecord.startUTC + mCurrentRecord_vjs.currentTime()*1000;
				} else if(_source_type == 'camera_live') {
					// TODO webrtc
					if (mUsedPlayer == 'webrtc0' || mUsedPlayer == 'webrtc2') {
						curr_time = mWebRTC_el ? mWebRTC_el.currentTime : 0;
					} else if (mUsedPlayer == 'native-hls') {
						curr_time = mNativeHLS_el ? mNativeHLS_el.currentTime : 0;
					} else {
						try {
							curr_time = self.vjs.currentTime()*1000 
						} catch (e) {
							console.error("Ignore: ", e);
						}
						try {
							_checkAndFixVideoSize();
						} catch(e) { 
							// silent exception
						}
					}
				} else {
					try {
						curr_time = self.vjs.currentTime()*1000;
					} catch (e) {
						console.error("Ignore: ", e);
					}
				}
				if (curr_time == self.time) {
					_showloading();
					mTimeWaitStartStream++;
					if (self.time == 0 && mTimeWaitStartStream > _timeWaitStartStreamMax) {
						self.stop("by_poling_time_1");
						_showerror(CloudReturnCode.ERROR_STREAM_UNREACHABLE);
						// self.callOnStateChange(vxgcloudplayer.states.PLAYER_STOPPED);
					} else if(self.time != 0 && mTimeWaitStartStream > _timeWaitStreamMax) {
						// restart player
						console.warn("Restart player");
						self.stop("by_poling_time_2");
						// fix if need start in current position
						if (mPosition != -1 && self.time > mPosition) {
							mPosition = Math.floor(self.time);
						}
						self.play();
					} else {
						console.warn("[PLAYER] Wait stream " + mTimeWaitStartStream);
					}
				} else {
					mTimeWaitStartStream = 0;
					self.mShowedBigPlayButton == false;
					mElBigPlayButton.style.display = "none";
					
					if (_source_type == 'camera_records') {
						self.time = curr_time;
						mPosition = self.time; // remember last success position
						el_player_time.innerHTML = _formatTimeCameraRecords(self.time);
					} else if (_source_type == 'camera_live') {
						self.time = curr_time;
						el_player_time.innerHTML = _formatTimeLive();
						if(self.isRange() && CloudHelpers.getCurrentTimeUTC() > mRangeMax){
							_stopPolingTime();
							self.stop("by_ended_timerange2");
							mCallbacks.executeCallbacks(CloudPlayerEvent.RANGE_ENDED, {});
						}
					} else {
						if(mPosition == -1){
							self.time = self.vjs.currentTime()*1000;
						}else{
							self.time = mCurrentPlayRecord.startUTC + self.vjs.currentTime()*1000;
						}
						el_player_time.innerHTML = _formatTimeLive();
						// self.callOnStateChange(vxgcloudplayer.states.PLAYER_PLAYING);
					}

					_hideloading();
					_hideerror();
				}
				if(self.isRange() && self.time > mRangeMax){
					mPosition = mRangeMin;
					_stopPolingTime();
					self.stop("by_ended_timerange");
					mCallbacks.executeCallbacks(CloudPlayerEvent.RANGE_ENDED, {});
				}
				// el_player_time.innerHTML = _calculateTime();
			}else{
				_hideloading();
				el_player_time.innerHTML = "";
			}
		},1000);
	}

	function _prepareNextCameraRecord(){
		if(mCurrentPlayRecord != null){
			var _currEnd = mCurrentPlayRecord.endUTC;
			var start = CloudHelpers.formatUTCTime(_currEnd - CloudHelpers.ONE_SECOND*5);
			mNextPlayRecord = null;
			if(self.isRange() && start > mRangeMax){
				return;
			}
			if (mConn._getAPI() == null) {
				return;
			}
			mConn._getAPI().storageRecordsFirst(self.mSrc.getID(), start, 3).done(function(r){
				if (r.meta.total_count == 0) {
					mNextPlayRecord = null;
				} else {
					// console.log(r.objects);
					var len = r.objects.length;
					for (var i = 0; i < len; i++) {
						var nextRec = r.objects[i];
						if (nextRec.size < 500) {
							console.error("mNextPlayRecord less than 500 bytes, skip ", nextRec)
							continue;
						}

						nextRec.startUTC = CloudHelpers.parseUTCTime(nextRec.start);
						nextRec.endUTC = CloudHelpers.parseUTCTime(nextRec.end);
						if (nextRec.endUTC > _currEnd && nextRec.startUTC < _currEnd) {
							console.warn("[CloudPlayer] found trashold segment in " + (nextRec.startUTC - _currEnd) + " ms, segment", nextRec);
						}

						if (nextRec.startUTC >= (_currEnd - mTrasholdPlayback) && mNextPlayRecord == null) {
							mNextPlayRecord = r.objects[i];
							// console.log("mNextPlayRecord: ", mNextPlayRecord);
							var _url = mNextPlayRecord.url;
							if (_url.indexOf('http://') == 0) {
								_url = _url.replace("http://", location.protocol + "//");
							}
							mNextRecord_vjs.reset()
							mNextRecord_vjs.src([{src: _url, type: 'video/mp4'}])
							mNextRecord_vjs.off('loadeddata');
							mNextRecord_vjs.on('loadeddata', function(){
								mNextRecord_vjs.pause();
							});
							break;
						}
					}
				}
			});
		}else{
			mNextPlayRecord = null;
		}
	}

	function _loadCameraRecords(_uniqPlay){
		if(self.mSrc.type != 'camera'){
			_showerror(CloudReturnCode.ERROR_INVALID_SOURCE);
			return;
		}
		if(self.updateAudioCaps){
			self.updateAudioCaps(self.mSrc.getID());
		}
		_updatePlayerFormatUI();
		_source_type = 'camera_records';
		var pos = mPosition;
		var start = CloudHelpers.formatUTCTime(pos - CloudHelpers.ONE_MINUTE*2);
		var nLimit = 25;
		if (mConn._getAPI() == null) {
			return;
		}
		mConn._getAPI().storageRecordsFirst(self.mSrc.getID(), start, nLimit).done(function(r){
			if(_uniqPlay != mUniqPlay) {
				console.warn("_uniqPlay not current [[_loadCameraRecords fail]]");
				return;
			}
			// console.log(r);
			var len = r.objects.length;
			mCurrentPlayRecord = null;
			var firstRecordAfterT = null;
			// console.log("pos = " + pos);
			// console.log("start - 2 min = " + start);
			_hideBlackScreen();
			var nCountAfterT = 0;
			for(var i = 0; i < len; i++){
				rec = r.objects[i];
				if (rec.size < 500) {
					console.error("Record less than 500 bytes will be skip ", rec);
					continue;
				}

				rec.startUTC = CloudHelpers.parseUTCTime(rec.start);
				rec.endUTC = CloudHelpers.parseUTCTime(rec.end);
				// console.log("rec = ", rec);
				// console.log("pos = ", pos);
				// console.log("pos = ", pos);

				if (firstRecordAfterT == null && rec.startUTC > pos) {
					firstRecordAfterT = rec;
					console.log("firstRecordAfterT selected ", firstRecordAfterT);
				}

				if (rec.startUTC > pos) {
					nCountAfterT++;
				}
				if (pos > rec.endUTC || pos < rec.startUTC) {
					continue;
				}
				// console.log("rec2: ", rec);
				
				if(mCurrentPlayRecord == null && pos >= rec.startUTC && pos <= rec.endUTC){
					mCurrentPlayRecord = rec;
                    // console.log("mCurrentPlayRecord selected ", mCurrentPlayRecord);
					break;
				}

				if (self.isRange()) {
					if (rec.startUTC > mRangeMax) {
						break;
					}
					// console.log("rec2: ", rec);
					if (mCurrentPlayRecord == null && pos < rec.startUTC && rec.startUTC < mRangeMax) {
						mCurrentPlayRecord = rec;
						pos = rec.startUTC;
						break;
					}
				}
			}

			// move to first close record
			var bSendEventPositionJumped = false;
			if(mCurrentPlayRecord == null && firstRecordAfterT != null){
				// need callback to timeline moveto
				if (!self.isRange() || (self.isRange() && firstRecordAfterT.startUTC < mRangeMax)) {
					mCurrentPlayRecord = firstRecordAfterT;
					pos = firstRecordAfterT.startUTC;
					bSendEventPositionJumped = true;	
				}
			}

			// console.log("mCurrentPlayRecord selected2 ", mCurrentPlayRecord);

			/*if(self.isRange() && mCurrentPlayRecord == null){
				for(var i = 0; i < len; i++){
					rec = r.objects[i];
					rec.startUTC = CloudHelpers.parseUTCTime(rec.start);
					rec.endUTC = CloudHelpers.parseUTCTime(rec.end);
					if (rec.startUTC > mRangeMax) {
						break;
					}
					// console.log("rec2: ", rec);
					if(mCurrentPlayRecord == null && pos < rec.startUTC && rec.startUTC < mRangeMax){
						mCurrentPlayRecord = rec;
						pos = rec.startUTC;
						break;
					}
				}
			}*/

			// move to live if records not found
			if (!self.isRange() && mCurrentPlayRecord == null && nCountAfterT == 0) {
				setTimeout( function() {
					self.setPosition(CloudPlayer.POSITION_LIVE);
					self.play();
					mCallbacks.executeCallbacks(CloudPlayerEvent.POSITION_JUMPED, { new_pos: CloudHelpers.getCurrentTimeUTC() });
				},10);
				return;
			}

			if (mCurrentPlayRecord == null) {
				_hideloading();
				_showerror(CloudReturnCode.ERROR_RECORDS_NOT_FOUND);
				_stopPolingTime();
				return;
			}
			
			if (_uniqPlay != mUniqPlay) {
				console.warn("_uniqPlay not current [[_loadCameraRecords fail]]");
				return;
			}

			if (self.isRange() && pos > mRangeMax) {
				_hideloading();
				_stopPolingTime();
				self.stop("by_ended_time_range_2");
				mCallbacks.executeCallbacks(CloudPlayerEvent.RANGE_ENDED, {});
				return;
			}

			if (bSendEventPositionJumped) {
				self.time = pos;
				mCallbacks.executeCallbacks(CloudPlayerEvent.POSITION_JUMPED, {new_pos: pos});
			}

			// 
			mCurrentRecord_vjs = mPlaybackPlayer1;
			mNextRecord_vjs = mPlaybackPlayer2;
		
			if (mEnablePlaybackNative) {
				mCurrentRecord_vjs.el().style.display = "block";
				mNextRecord_vjs.el().style.display = "none";
				self.vjs.el().style.display = "none";
				mCurrentRecord_vjs.onAutoplayBlocked = self.playbackAutoplayBlocked;
			} else {
				mCurrentRecord_vjs.el().style.display = "";
				mNextRecord_vjs.el().style.display = "none";
			}

			// console.log("mCurrentPlayRecord: ", mCurrentPlayRecord);
			_prepareNextCameraRecord();

			mCurrentRecord_vjs.off('loadeddata');
			mCurrentRecord_vjs.ready(function() {
				var _url = mCurrentPlayRecord.url;
				if (_url.indexOf('http://') == 0) {
					_url = _url.replace("http://", location.protocol + "//");
				}
				mCurrentRecord_vjs.src([{src: _url, type: 'video/mp4'}]);
				var stime =  pos - mCurrentPlayRecord.startUTC;
				var len_time = mCurrentPlayRecord.endUTC - mCurrentPlayRecord.startUTC;
				console.log("mCurrentRecord_vjs: " +  stime + " / " + len_time);
				mCurrentRecord_vjs.currentTime(Math.floor(stime/1000));
				mCurrentRecord_vjs.play();
			});

			// vxgcloudplayer.vjs_play(vcp);
			mCurrentRecord_vjs.off('ended');
			mNextRecord_vjs.off('ended');
			function swithPlayers() {
				console.warn("ended");
				// stop records
				if(self.isRange() && mNextPlayRecord == null){
					console.warn("stop player");
					_hideloading();
					_stopPolingTime();
					self.stop("by_ended_time_range_3");
					mCallbacks.executeCallbacks(CloudPlayerEvent.RANGE_ENDED, {});
					return;
				}
				
				if (mNextPlayRecord != null) {
					var t = mCurrentRecord_vjs;
					mCurrentRecord_vjs = mNextRecord_vjs;
					mNextRecord_vjs = t;
					
					if (mEnablePlaybackNative) {
						mCurrentRecord_vjs.el().style.display = "block";
						mNextRecord_vjs.el().style.display = "none";
						self.vjs.el().style.display = "none";
					} else {
						mCurrentRecord_vjs.el().style.display = "";
						mNextRecord_vjs.el().style.display = "none";
					}

					mCurrentPlayRecord = mNextPlayRecord;
					mNextPlayRecord = null;
					// console.warn("url: " + mCurrentPlayRecord.url);
					mCurrentRecord_vjs.ready(function(){ mCurrentRecord_vjs.play(); });
					_prepareNextCameraRecord();
				}
			}

			mCurrentRecord_vjs.on('ended', swithPlayers);
			mNextRecord_vjs.on('ended', swithPlayers);

			_startPolingTime();
		});
	}

	function _loadRecords(_uniqPlay){
		if(!self.mSrc){
			_showerror(CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED);
			return;
		}
		mTimeWaitStartStream = 0;
		if(self.mSrc.type == 'camera'){
			_loadCameraRecords(_uniqPlay);
		}else{
			_showerror(CloudReturnCode.ERROR_INVALID_SOURCE);
		}
	}

	// function _loadCameraStatus(_uniqPlay){
	// }

	function _loadLiveUrl(_uniqPlay){
		if(_uniqPlay != mUniqPlay) {
			console.warn("_uniqPlay not current [cameraLiveUrls fail]");
			return;
		}

		if(!self.mSrc){
			console.error("[CloudPlayer] source not set");
			self.setError(100);
			return;
		}

		if(self.mSrc._origJson()['status'] != 'active'){
			if (self.m.waitSourceActivation == 0){
				_showerror(CloudReturnCode.ERROR_CAMERA_OFFLINE);
				mCallbacks.executeCallbacks(CloudPlayerEvent.CHANNEL_STATUS, {status: "offline"});
			}
			_startPolingCameraStatus(_uniqPlay);
			return;
		}

		mTimeWaitStartStream = 0;
		if(self.mSrc.type == 'camera'){
			// start 
			_startPolingCameraStatus(_uniqPlay);
			self._polingLoadCameraLiveUrl(_uniqPlay);
		} else {
			console.error("[CloudPlayer] invalid source");
			self.setError(100);
		}
	}

	/*
	 * Public functions
	 * */
	self.showErrorText = function(text){
		_hideloading();
		mElError.style.display = "inline-block";
		mElErrorText.style.display = "inline-block";
		mElErrorText.innerHTML = text;
		_hideBlackScreen();
	}

	self.getCalendarContent = function() {
		return mElementCalendar;
	}

	self.setSource = function(src){
		_hideerror();
		clearInterval(mPolingCameraStatus);
		self.mSrc = src;
		if (self.mSrc == null) {
			mElementPlay.style.display = "none";
			mConn = null;
		} else {
			mElementPlay.style.display = "inline-block";
			mConn = src._getConn();
		}
		if(self.isRange()){
			var cur_time = CloudHelpers.getCurrentTimeUTC();
			if (mRangeMin < cur_time && cur_time < mRangeMax) {
				self.setPosition(CloudPlayer.POSITION_LIVE);
			} else {
				self.setPosition(mRangeMin);
			}
		}else{
			self.setPosition(CloudPlayer.POSITION_LIVE);
		}
		mCallbacks.executeCallbacks(CloudPlayerEvent.SOURCE_CHANGED);
	}

	self.getSource = function(){
		return self.mSrc
	}

	self.removeCallback = function(uniqname){
		mCallbacks.removeCallback(uniqname);
	}
	
	self.addCallback = function(uniqname, func){
		mCallbacks.addCallback(uniqname, func);
	}

	self.onTimelineEndUpdate = function () {
		if (mPosition == -1 && mStopped && _isShowedError()) {
			console.warn("TODO Restart live if some errors happends");
			self.play();
		}
	}

	self.playbackAutoplayBlocked = function() {
		if (mPosition == -1)  {
			console.warn("Skip error player already in live mode");
			return;
		}
		_stopPolingTime();
		try{mPlaybackPlayer1.pause();}catch(e){console.warn("_vjs_play: skip error", e);}
		mTimeWaitStartStream = 0;
		// TODO show PlayButton
		console.warn('_vjs_play. is mobile or autoplay not allowed. show big button');
		mShowedBigPlayButton = true;
		mElBigPlayButton.style.display = "block";
		mElBigPlayButton.onclick = function(event){
			mEvent = event;
			mElBigPlayButton.style.display = "none";
			var v = mCurrentRecord_vjs.el().getElementsByTagName('video')[0];
			if(v){
				v.setAttribute('webkit-playsinline', true);
				v.setAttribute('playsinline', true);
			}
			mShowedBigPlayButton = false;
			mTimeWaitStartStream = 0;
			mCurrentRecord_vjs.play();
			_stopPolingTime();
			_startPolingTime();
		}
	}

	function _vjs_play_live() {
		console.log("[PLAYER] _vjs_play_live, mEvent: ", mEvent);
		// if(!mEvent && !CloudHelpers.autoPlayAllowed){
		mElBigPlayButton.style.display = "none";
		
		function startVideo() {
			var safari_and_hls = mSafariAndHlsNotStarted == 'pause'; // mUsedPlayer == 'hls' && CloudHelpers.isSafari();
			var is_mobile = CloudHelpers.isIOS() || CloudHelpers.isAndroid();
			var bFrameAndHLS = CloudHelpers.isFrame() && CloudHelpers.useHls();
			var bChromeAndHLS = CloudHelpers.isChrome() && !CloudHelpers.autoPlayAllowed && self.mPlayerFormat == 'html5';
			// CloudHelpers.useHls();
			// console.warn('_vjs_play bFrameAndHLS', bFrameAndHLS);
			// console.warn('_vjs_play CloudHelpers.useHls()', CloudHelpers.useHls());
			// console.warn('_vjs_play CloudHelpers.isFrame()', CloudHelpers.isFrame());
			// console.warn('_vjs_play mEvent', mEvent);

			if (!mEvent && (is_mobile || safari_and_hls || bFrameAndHLS || bChromeAndHLS)) {
				_stopPolingTime();
				try{self.vjs.pause();}catch(e){console.warn("_vjs_play_live: skip error", e);}
				mTimeWaitStartStream = 0;
				// TODO show PlayButton
				console.warn('_vjs_play. is mobile or autoplay not allowed. show big button');
				mShowedBigPlayButton = true;
				mElBigPlayButton.style.display = "block";
				mElBigPlayButton.onclick = function(event){
					mEvent = event;
					mElBigPlayButton.style.display = "none";
					if(document.getElementById('player1_vjs_Html5_api')){
						document.getElementById('player1_vjs_Html5_api').setAttribute('webkit-playsinline', true);
						document.getElementById('player1_vjs_Html5_api').setAttribute('playsinline', true);
					}
					mShowedBigPlayButton = false;
					mTimeWaitStartStream = 0;
					self.vjs.play();
					_stopPolingTime();
					_startPolingTime();
				}
				console.log('vjs_play ');
			}else{
				self.vjs.play();
				_stopPolingTime();
				_startPolingTime();
			}
		}

		if (CloudHelpers.isChrome() && !CloudHelpers.autoPlayAllowed && self.mPlayerFormat == 'html5') {
			// refresh status autoPlayAllowed
			CloudHelpers.checkAutoplay(startVideo);
		} else {
			startVideo();
		}
	}

	self.setPlayerFormat = function(sMode){
		sMode = sMode.toLowerCase();
		if(sMode != 'webrtc' && sMode != 'flash' && sMode != 'html5'){
			console.error("Player format expected 'webrtc' or 'flash' or 'html5'");
			return;
		}
		self.mPlayerFormat = sMode;
		try{localStorage.setItem("preferred_player_format", self.mPlayerFormat);}catch(e){console.error("[CloudPlayer] error save format: ", e)}

		_updatePlayerFormatUI();
	}

	self.getPlayerFormat = function(){
		return sMode;
	}

	self.play = function(event){
		if(mPlaying){
			self.stop("by_play");
		}
		if (self.mSrc.type != 'camera') {
			_showerror(CloudReturnCode.ERROR_INVALID_SOURCE);
			return;
		}
		mUniqPlay = Math.random();
		mEvent = event;
		console.warn("[PLAYER] mUniqPlay: " + mUniqPlay);
		el_stop.style.display = "inline-block";
		mElementPlay.style.display = "none";
		mStopped = false;
		mPlaying = true;
		_stopPolingTime();
		_startPolingTime();
		self._reset_players();
		_hideerror();
		
		// reset position to start of range
		if (self.isRange() && mPosition == -1 && CloudHelpers.getCurrentTimeUTC() > mRangeMax) {
			mPosition = mRangeMin;
		}

		// reset position to start of range
		if (self.isRange() && mPosition > mRangeMax) {
			mPosition = mRangeMin;
		}

		if(mPosition == -1){
			_loadLiveUrl(mUniqPlay);
			mCallbacks.executeCallbacks(CloudPlayerEvent.POSITION_JUMPED, {new_pos: CloudHelpers.getCurrentTimeUTC()});
		}else{
			console.warn("Try load records from " + CloudHelpers.formatUTCTime(mPosition));
			_loadRecords(mUniqPlay);
		}
		_showloading();
	}
	
	self.setPosition = function(t){
		mPosition = t;
		if(mPosition == CloudHelpers.POSITION_LIVE){
			mLiveModeAutoStart = true;
		} else {
			self.time = t;
		}
	}
	
	// apply option position
	if(options["position"] !== undefined){
		self.setPosition(mPosition);
	}

	self.getPosition = function(){
		if (mPlaying) {
			if (mPosition == -1) {
				if ((mUsedPlayer == 'webrtc0' || mUsedPlayer == 'webrtc2')
					&& mWebRTC_el && mWebRTC_el.currentTime != 0){
					return CloudHelpers.getCurrentTimeUTC() + (mConn ? mConn.getServerTimeDiff() : 0);
				} else if(mUsedPlayer == 'native-hls' && mNativeHLS_el && mNativeHLS_el.currentTime != 0){
					return CloudHelpers.getCurrentTimeUTC() + (mConn ? mConn.getServerTimeDiff() : 0);
				} else if( (mUsedPlayer != 'webrtc0' && mUsedPlayer != 'webrtc2')
					&& self.vjs && self.vjs.currentTime() != 0){
					return CloudHelpers.getCurrentTimeUTC() + (mConn ? mConn.getServerTimeDiff() : 0);
				}
				return 0;
			} else if(self.time == 0) {
				return mPosition;
			}
			return Math.floor(self.time);
		} else {
			// TODO
		}
		return 0;
	}

	self.isLive = function(){
		return mPosition == -1 && !mStopped;
	}

	self.stop = function(who_call_stop){
		console.log("[PLAYER] stop called " + who_call_stop);
		mUniqPlay = null; // stop any async requests or ignore results
		mStopped = true;
		mPlaying = false;
		mLiveModeAutoStart = false;
		console.log("[PLAYER] self.stop: somebody call");
		self._reset_players();

		if (mNativeVideo1_el != null) {
			mNativeVideo1_el.style.display = 'none';
		}

		if (mNativeVideo2_el != null) {
			mNativeVideo2_el.style.display = 'none';
		}

		if(mWebRTC0_Player != null){
			mWebRTC0_Player.stopWS();
			mWebRTC_el.style.display = 'none';
		};

		if(mWebRTC2_Player != null){
			mWebRTC2_Player.stopWS();
			mWebRTC_el.style.display = 'none';
		};

		if (mNativeHLS_Player != null) {
			mNativeHLS_Player.stop();
			mNativeHLS_el.style.display = 'none';
		}	

		el_stop.style.display = "none";
		mElementPlay.style.display = "inline-block";
		_stopPolingTime();
		clearInterval(mExpireHLSTimeInterval);
		self._stopPolingMediaTicket();
		_hideloading();
		// vxgcloudplayer.stopPolingCameraLife();
		// self.stopPolingFlashStats();
		// self.currentRecordsList = undefined;
		// self.currentCamID = 0;
	}

	self.close = function(){
		self.stop("by_close");
		clearInterval(self.currentTime);
		clearInterval(mPolingCameraStatus);
		// TODO stop any context
	}

	self.destroy = function(){
		self.stop("by_destroy");
		clearInterval(self.currentTime);
		clearInterval(mPolingCameraStatus);
		self.vjs.dispose();
		self.vjs2.dispose();
		delete window._cloudPlayers[self.elid];
		// TODO destroy timeline
	}
	
	self.error = function(){
		return self.mLastError || -1;
	}
	
	self.onError = function(callback){
		mCallback_onError = callback;
	}

	self.onChannelStatus = function(callback){
		mCallback_onChannelStatus = callback;
	}

	self._setError = function(error){
		setTimeout(function(){self.stop("by_setError")},10);
		self.mLastError = error;
		if(mCallback_onError){
			mCallbacks.executeCallbacks(CloudPlayerEvent.ERROR, error)
			setTimeout(function(){ mCallback_onError(self, error); },10);
		}
		// vxgcloudplayer.trigger('error', [self, error]);
	}
	
	self.setRange = function(startPos,endPos){
		console.warn("[PLAYER] setRange");
		mRangeMin = startPos;
		mRangeMax = endPos;
		// TODO check
	}

	// apply options
	if (options["range"] !== undefined) {
		var rangeMin = parseInt(options["range"]["min"], 10);
		var rangeMax = parseInt(options["range"]["max"], 10);
		self.setRange(rangeMin, rangeMax);
	}
	
	self.isRange = function(){
		return mRangeMin != -1 && mRangeMax != -1;
	}
	
	self.resetRange = function(){
		console.warn("[PLAYER] resetRange");
		mRangeMin = -1;
		mRangeMax = -1;
	}
	
	/* end public functions */
	function _applyFuncTo(arr, val, func) {
		for (var i in arr) {
			func(arr[i], val);
		}
	}
	function _initZoomControls(){
		self.currentZoom = 0;

		var el_controls_zoom = self.player.getElementsByClassName('cloudplayer-controls-zoom')[0];
		var el_controls_zoom_position = self.player.getElementsByClassName('cloudplayer-controls-zoom-position')[0];
		var el_zoomUp = self.player.getElementsByClassName('cloudplayer-zoom-up')[0];
		var el_zoomDown = self.player.getElementsByClassName('cloudplayer-zoom-down')[0];
		var el_zoomProgress = self.player.getElementsByClassName('cloudplayer-zoom-progress')[0];
		var el_zoomPositionCursor = self.player.getElementsByClassName('cloudplayer-zoom-position-cursor')[0];
		
		var _players = [];
		_players.push(document.getElementById(elid + '_vjs'));
		_players.push(document.getElementById(elid + '_vjs2'));
		_players.push(mNativeVideo1_el);
		_players.push(mNativeVideo2_el);
		_players.push(self.player.getElementsByClassName('cloudplayer-webrtc')[0]);

		if(CloudHelpers.isMobile()){
			el_controls_zoom.style.display = 'none';
		}

		self.zoomCursorDownBool = false;
		self.zoomCursorX = 0;
		self.zoomCursorY = 0;
		self.zoomCursorWidth = 160;
		self.zoomCursorHeight = 120;
		self.zoomControlsWidth = 0;
		self.zoomControlsHeight = 0;

		self.setNewZoom = function(v) {
			if(v >= 30){ v = 30; }
			if(v <= 10){ v = 10; }
			
			if (self.currentZoom != v) {
				self.currentZoom = v;
				var _scale_transform = "scale(" + (self.currentZoom/10) + ")";
				_applyFuncTo(_players, _scale_transform, function(plr_el, val) {
					plr_el.style.transform = val;
				});
				el_zoomPositionCursor.style.transform = "scale(" + (10/self.currentZoom) + ")";
				el_zoomProgress.className = el_zoomProgress.className.replace(/zoom\d+x/g,'zoom' + Math.ceil(self.currentZoom) + 'x');
				el_controls_zoom_position.style.display = self.currentZoom == 10 ? "none" : "";
				el_zoomPositionCursor.style.left = '';
				el_zoomPositionCursor.style.top = '';

				_applyFuncTo(_players, '', function(plr_el, val) {
					plr_el.style.left = val;
					plr_el.style.top = val;
				});
			}
		}

		self.setNewZoom(10);
		
		self.zoomUp = function() {
			self.setNewZoom(self.currentZoom + 5)
		}
		self.zoomDown = function() {
			self.setNewZoom(self.currentZoom - 5);
		}
		self.zoomProgressDownBool = false;
		self.zoomProgressDown = function(e) {
			self.zoomProgressDownBool = true;
		}

		self.zoomProgressMove = function(e){
			if(self.zoomProgressDownBool == true){
				var y = e.pageY - CloudHelpers.getAbsolutePosition(e.currentTarget).y;
				var height = el_zoomProgress.offsetHeight;
				var steps = height/5;
				y = 10*(Math.floor((height-y)/steps)/2 + 1);
				self.setNewZoom(y);				
			}
		}
		self.zoomProgressLeave = function(e){
			self.zoomProgressDownBool = false;
		}
		self.zoomProgressUp = function(e){
			if(self.zoomProgressDownBool == true){
				var y = e.pageY - CloudHelpers.getAbsolutePosition(e.currentTarget).y;
				var height = el_zoomProgress.offsetHeight;
				var steps = height/5;
				y = 10*(Math.floor((height-y)/steps)/2 + 1);
				self.setNewZoom(y);	
			}
			self.zoomProgressDownBool = false;
		}

		self.zoomCursorDown = function(e){
			self.zoomCursorX = e.pageX;
			self.zoomCursorY = e.pageY;
			self.zoomCursorWidth = el_zoomPositionCursor.offsetWidth;
			self.zoomCursorHeight = el_zoomPositionCursor.offsetHeight;
			self.zoomControlsWidth = el_controls_zoom_position.offsetWidth;
			self.zoomControlsHeight = el_controls_zoom_position.offsetHeight;
			self.zoomCursorDownBool = true;
		}
		
		self.zoomCursorUp = function(e){
			console.log("zoomCursorUp");
			self.zoomCursorDownBool = false;
		}
		
		self.zoomCursorMove = function(e){
			if(self.zoomCursorDownBool == true){
				var diffX = self.zoomCursorX - e.pageX;
				var diffY = self.zoomCursorY - e.pageY;
				self.zoomCursorX = e.pageX;
				self.zoomCursorY = e.pageY;
				var newx = el_zoomPositionCursor.offsetLeft - diffX;
				var newy = el_zoomPositionCursor.offsetTop - diffY;
				var d2x = (self.zoomControlsWidth - self.zoomCursorWidth*(10/self.currentZoom));
				var d2y = (self.zoomControlsHeight - self.zoomCursorHeight*(10/self.currentZoom));
				var minX = -1*d2x/2;
				var maxX = d2x/2;
				var minY = -1*d2y/2;
				var maxY = d2y/2;
				if (newx < minX) newx = minX;
				if (newy < minY) newy = minY;
				if (newx >= maxX) newx = maxX;
				if (newy >= maxY) newy = maxY;
				el_zoomPositionCursor.style.left = newx + "px";
				el_zoomPositionCursor.style.top = newy + "px";
				var zoom = self.currentZoom/10 - 1;
				var left = Math.floor(-100*((newx/d2x)*zoom));
				var top = Math.floor(-100*((newy/d2y)*zoom));
				_applyFuncTo(_players, left + '%', function(plr_el, val) {
					plr_el.style.left = val;
				});

				_applyFuncTo(_players, top + '%', function(plr_el, val) {
					plr_el.style.top = val;
				});
			}
		}

		el_zoomUp.onclick = self.zoomUp;
		el_zoomDown.onclick = self.zoomDown;
		el_zoomPositionCursor.addEventListener('mousedown',self.zoomCursorDown,false);
		el_zoomPositionCursor.addEventListener('mousemove',self.zoomCursorMove,false);
		el_zoomPositionCursor.addEventListener('mouseleave',self.zoomCursorUp,false);
		el_zoomPositionCursor.addEventListener('mouseup',self.zoomCursorUp,false);
		el_zoomProgress.addEventListener('mousedown',self.zoomProgressDown,false);
		el_zoomProgress.addEventListener('mousemove',self.zoomProgressMove,false);
		el_zoomProgress.addEventListener('mouseleave',self.zoomProgressLeave,false);
		el_zoomProgress.addEventListener('mouseup',self.zoomProgressUp,false);
	}
	_initZoomControls();
	
	/* 
	 * check audio channels
	 * */
	
	self.isAudioChannelExists = function(){
		// console.log("self.mstreams.current = " + self.mstreams.current);
		// console.log("self.mstreams.audio_on = " + self.mstreams.audio_on);
		// return self.mstreams && self.mstreams.current == self.mstreams.audio_on;
		// TODO
		return true;
	}

	self.updateAudioStream = function(){
		el_info_audio_stream.style.display = "none";
		// console.log("api: ", mConn._getAPI());
		mConn._getAPI().cameraMediaStreams(self.currentCamID).done(function(r){
			// console.log("cameraMediaStreams: ", r);
			if(r.mstreams_supported && r.mstreams_supported.length > 1){
				el_info_audio_stream.style.display = "block";
				self.mstreams.audio_on = '';
				self.mstreams.audio_off = '';
				self.mstreams.current = r.live_ms_id;
				for(var i in r.mstreams_supported){
					if(r.mstreams_supported[i].as_id && r.mstreams_supported[i].vs_id){
						self.mstreams.audio_on = r.mstreams_supported[i].id;
					}else if(r.mstreams_supported[i].vs_id){
						self.mstreams.audio_off = r.mstreams_supported[i].id;
					}
				}
				if(self.mstreams.audio_on == self.mstreams.current){
					el_info_audio_stream_on.classList.add("selected");
				}else if(self.mstreams.audio_off == self.mstreams.current){
					el_info_audio_stream_off.classList.add("selected");
				}
			}else{
				el_info_audio_stream.style.display = "none";
			}

			if(!self.isAudioChannelExists()){
				
			}
		}).fail(function(r){
			console.error(r);
			el_info_audio_stream.style.display = "none";
		})
	}
	
	/*
	 * volume controls begin
	 * */

	function _initVolumeControls(){
		var el_volumeMute = self.player.getElementsByClassName('cloudplayer-volume-mute')[0];
		var el_volumeDown = self.player.getElementsByClassName('cloudplayer-volume-down')[0];
		var el_volumeProgress = self.player.getElementsByClassName('cloudplayer-volume-progress')[0];
		var el_volumeUp = self.player.getElementsByClassName('cloudplayer-volume-up')[0];

		self.m = self.m || {};
		self.m.volume = 0.5;
		el_volumeMute.style.display='inline-block';
		if (self.m.mute) {
			el_volumeDown.style.display='none';
			el_volumeProgress.style.display='none';
			el_volumeUp.style.display='none';
			el_volumeMute.classList.add("unmute");
		} else {
			el_volumeDown.style.display='inline-block';
			el_volumeProgress.style.display='inline-block';
			el_volumeUp.style.display='inline-block';
			el_volumeMute.classList.remove("unmute");
		}

		function applyVolumeToPlayers(v) {

		        var muted = (v == 0)? true : false;
			if(player1_native_hls) player1_native_hls.muted = muted;
			if(player1_vjs2) player1_vjs2.muted = muted;
			if(player1_vjs) player1_vjs.muted = muted;
			if(player1_nv1) player1_nv1.muted = muted;
			if(player1_nv2) player1_nv2.muted = muted;

			self.vjs.muted(muted);
			self.vjs2.muted(muted);
			self.vjs.volume(v);
			self.vjs2.volume(v);

			mPlaybackPlayer1.volume(v);
			mPlaybackPlayer2.volume(v);
			if (mWebRTC_el != null) {
				player1_webrtc.muted = muted;
				mWebRTC_el.volume = v;
			}
		}

		self.mute = function(){
			if (!self.isAudioChannelExists()) {
				return;
			}
			self.m.mute = !self.m.mute;
			if (self.m.mute) {
				el_volumeDown.style.display='none';
				el_volumeProgress.style.display='none';
				el_volumeUp.style.display='none';
				el_volumeMute.style.display='inline-block';
				el_volumeProgress.className = el_volumeProgress.className.replace(/vol\d+/g,'vol0')
				el_volumeMute.classList.add("unmute");
			} else {
				el_volumeDown.style.display='inline-block';
				el_volumeProgress.style.display='inline-block';
				el_volumeUp.style.display='inline-block';
				el_volumeMute.style.display='inline-block';
				el_volumeMute.classList.remove("unmute");
				el_volumeProgress.className = el_volumeProgress.className.replace(/vol\d+/g,'vol' + Math.floor(self.m.volume*10));
			}
			var v = self.m.mute? 0: '' + self.m.volume.toFixed(1);
			applyVolumeToPlayers(v);
		}

		self.volume = function(val){
			if (!self.isAudioChannelExists()) {
				return;
			}
			if (val != undefined) {
				val = val > 1 ? 1 : val;
				val = val < 0 ? 0 : val;
				self.m.volume = Math.ceil(val*10)/10;
				var v = self.m.mute ? 0 : self.m.volume.toFixed(1);
				applyVolumeToPlayers(v);
				el_volumeProgress.className = el_volumeProgress.className.replace(/vol\d+/g,'vol' + Math.ceil(self.m.volume*10));
			} else {
				return self.m.volume;
			}
		}

		self.volup = function(){
			if (!self.isAudioChannelExists()) {
				return;
			}
			
			if (Math.round(self.m.volume*10) < 10) {
				self.m.volume = self.m.volume + 0.1;
				var v = self.m.mute ? 0 : self.m.volume.toFixed(1);
				applyVolumeToPlayers(v);
				el_volumeProgress.className = el_volumeProgress.className.replace(/vol\d+/g,'vol' + Math.ceil(self.m.volume*10));
			}
		};

		self.voldown = function(){
			if (!self.isAudioChannelExists()) {
				return;
			}
			if (Math.round(self.m.volume*10) > 0) {
				self.m.volume = self.m.volume - 0.1;
				var v = self.m.mute ? 0 : self.m.volume.toFixed(1)
				applyVolumeToPlayers(v);
				el_volumeProgress.className = el_volumeProgress.className.replace(/vol\d+/g,'vol' + Math.floor(self.m.volume*10));
			}
		};
		
		el_volumeMute.onclick = self.mute;
		el_volumeDown.onclick = self.voldown;
		el_volumeUp.onclick = self.volup;
		
		// init volume
		self.vjs.ready(function(){
			if (!self.isAudioChannelExists()) {
				return
			}

			self.vjs.muted(true);
			self.volume(self.m.volume);	
		});
		
		if (!self.isAudioChannelExists()) {
			el_volumeDown.style.display='none';
			el_volumeProgress.style.display='none';
			el_volumeUp.style.display='none';
			el_volumeMute.style.display='none';
		}
	}
	_initVolumeControls();
	
	// ---- volume controls end ---- 

	function _polingCameraHLSList(live_urls, _uniqPlay){
		if(_uniqPlay != mUniqPlay) {
			console.warn("_uniqPlay not current [_polingCameraHLSList]");
			return;
		}

		var xhr = new XMLHttpRequest();
		xhr.open('GET', live_urls.hls);
		// xhr.withCredentials = false;
		xhr.onload = function() {
			if(_uniqPlay != mUniqPlay) {
				console.warn("_uniqPlay not current [_polingCameraHLSList 2]");
				return;
			}
			if(xhr.status === 200){
				if(_uniqPlay != mUniqPlay) return;
				self._applyMediaTiket(live_urls.hls, live_urls.expire);
				// self._startPolingMediaTicket(_uniqPlay);
				// For debug
				// live_urls.hls = live_urls.hls.replace("/hls/", "/hls1/");
				self.vjs.src([{
					src: live_urls.hls,
					type: 'application/x-mpegURL'
				}]);
				xhr = null;
			}else if(xhr.status === 404){
				if(_uniqPlay != mUniqPlay){
					console.warn("[VXGCLOUDPLAYER] polingHLSList, camid was changed stop poling hls list, currentCmaID=" + self.mSrc.getID());
					return;
				}
				mTimeWaitStartStream++;
				if(mTimeWaitStartStream > _timeWaitStartStreamMax){
					_showerror(CloudReturnCode.ERROR_STREAM_UNREACHABLE_HLS);
					return;
				}
				setTimeout(function(){
					console.warn("Wait one sec " + live_urls.hls);
					xhr = null;
					_polingCameraHLSList(live_urls, _uniqPlay);
				},1000);
			}else{
				console.error("Unhandled");
			}
		};
		xhr.send();
	}

	self.WebRTC0_autoplayBlocked = function() {
		_stopPolingTime();
		try{mWebRTC0_Player.stopWS();}catch(e){console.warn("WebRTC0_autoplayBlocked: skip error", e);}
		mTimeWaitStartStream = 0;
		// TODO show PlayButton
		console.warn('_vjs_play. is mobile or autoplay not allowed. show big button');
		mShowedBigPlayButton = true;
		mElBigPlayButton.style.display = "block";
		mElBigPlayButton.onclick = function(event){
			mEvent = event;
			mElBigPlayButton.style.display = "none";
			mShowedBigPlayButton = false;
			mTimeWaitStartStream = 0;
			self.play();
		}
	}

	function _polingLoadCameraLiveUrl_WebRTC0(_uniqPlay, live_urls){
		if (!live_urls.rtc) {
			_showerror(CloudReturnCode.NOT_SUPPORTED_FORMAT);
			return;
		}

		console.warn("webrtc0 - depracated");
		mUsedPlayer = 'webrtc0';
		// WebRTC
		mElPlrType.innerHTML = "Used player: WebRTC (v0)";
		if(window.location.protocol.startsWith ("file")){
			self.player.showErrorText("Please open from browser");
			return;
		}
		var ws_protocol = (location.protocol == "https:" ? "wss://" : "ws://");
		var ws_host = location.hostname;
		var ws_port = 8080;
		var svcp_url = mConn.ServiceProviderUrl;
		if(live_urls.rtc){
			var p_rtc = CloudHelpers.parseUri(live_urls.rtc);
			var prt = p_rtc.protocol;
			if(prt == 'http' || prt == 'ws') {
				ws_protocol = "ws://";
			}else if(prt == 'https' || prt == 'wss'){
				ws_protocol = "wss://";
			}else{
				console.warn("Unknown protocol in '" + live_urls + "'");
			}
			ws_host = CloudHelpers.parseUri(live_urls.rtc).host;
			ws_port = CloudHelpers.parseUri(live_urls.rtc).port;
		}
		var ws_srv = ws_protocol + ws_host + ':' + ws_port + '/';

		// TODO keep player element
		self.vjs.el().style.display = "none";
		self.vjs2.el().style.display = "none";
		mNativeHLS_el.style.display = "none";
		mWebRTC_el.style.display = "block";
		if(!window['CloudPlayerWebRTC0']){
			console.error("Not found module CloudPlayerWebRTC0");
			return;
		}
		mWebRTC0_Player = new CloudPlayerWebRTC0(mWebRTC_el, ws_srv, live_urls.rtmp);
		mWebRTC0_Player.onAutoplayBlocked = self.WebRTC2_autoplayBlocked;
		mWebRTC0_Player.onServerError = function(event){
			console.error("[WebRTC0] Event error ", event);
			_showerror(CloudReturnCode.ERROR_WEBRTC_SERVER_ERROR);
			self.stop("by_webrtc0_error");
		}
		mWebRTC0_Player.startWS();
		_startPolingTime();
	}

	self.WebRTC2_autoplayBlocked = function() {
		_stopPolingTime();
		try{mWebRTC2_Player.stopWS();}catch(e){console.warn("WebRTC2_autoplayBlocked: skip error", e);}
		mTimeWaitStartStream = 0;
		// TODO show PlayButton
		console.warn('_vjs_play. is mobile or autoplay not allowed. show big button');
		mShowedBigPlayButton = true;
		mElBigPlayButton.style.display = "block";
		mElBigPlayButton.onclick = function(event){
			mEvent = event;
			mElBigPlayButton.style.display = "none";
			mShowedBigPlayButton = false;
			mTimeWaitStartStream = 0;
			self.play();
		}
	}

	function _polingLoadCameraLiveUrl_WebRTC2(_uniqPlay, live_urls){
		if (!live_urls.webrtc) {
			_showerror(CloudReturnCode.NOT_SUPPORTED_FORMAT);
			return;
		}

		mUsedPlayer = 'webrtc2';
		// WebRTC
		mElPlrType.innerHTML = "Used player: WebRTC (v2)";
		if(window.location.protocol.startsWith ("file")){
			self.player.showErrorText("Please open from browser");
			return;
		}

		// TODO keep player element
		self.vjs.el().style.display = "none";
		self.vjs2.el().style.display = "none";
		mNativeHLS_el.style.display = "none";
		mWebRTC_el.style.display = "block";
		if(!window['CloudPlayerWebRTC2']){ // webrtc2
			console.error("Not found module CloudPlayerWebRTC2");
			return;
		}

		var p = CloudHelpers.promise();
		if (CloudHelpers.compareVersions(CloudPlayerWebRTC2.version, live_urls.webrtc.version) > 0) {
			console.warn("Expected version webrtc.version (v" + live_urls.webrtc.version + ") "
			+ " mismatch with included CloudPlayerWebRTC (v" + CloudPlayerWebRTC2.version + ")");
			p = CloudHelpers.requestJS(live_urls.webrtc.scripts.player, function(r) { 
				r = r.replace("CloudPlayerWebRTC =", "CloudPlayerWebRTC2 =");
				while (r.indexOf("CloudPlayerWebRTC.") !== -1) {
					r = r.replace("CloudPlayerWebRTC.", "CloudPlayerWebRTC2.");
				}
				return r;
			});
		} else {
			p.resolve();
		}

		p.done(function(){
			console.log("[PLAYER] ", live_urls.webrtc.connection_url)
			mWebRTC2_Player = new CloudPlayerWebRTC2(mWebRTC_el,
				live_urls.webrtc.connection_url,
				live_urls.webrtc.ice_servers, {
					send_video: false,
					send_audio: false,
				}
			);
			mWebRTC2_Player.onAutoplayBlocked = self.WebRTC2_autoplayBlocked;
			mWebRTC2_Player.onServerError = function(event){
				console.error("[WebRTC2] Event error ", event);
				_showerror(CloudReturnCode.ERROR_WEBRTC_SERVER_ERROR);
				self.stop("by_webrtc2_error");
			}
			mWebRTC2_Player.startWS();
			_startPolingTime();
		})
	}

	function _polingLoadCameraLiveUrl_RTMP (_uniqPlay, live_urls){
		if (!live_urls.rtmp) {
			_showerror(CloudReturnCode.NOT_SUPPORTED_FORMAT);
			return;
		}

		mElPlrType.innerHTML = "Used player: Flash";
		self.vjs.ready(function(){
			console.log("[PLAYER] Set url (rtmp): " + live_urls.rtmp);
			self.vjs.options().flash.swf = CloudSDK.flashswf || 'swf/video-js-by-vxg-buff200.swf';
			self.vjs.src([{src: live_urls.rtmp, type: 'rtmp/mp4'}]);
			_showBlackScreen();
		});
	
		// vxgcloudplayer.vjs_play(vcp);
		self.vjs.off('ended');
		self.vjs.on('ended', function() {
			self.stop("by_rtmp_ended");
		});
		var bLoadedData = false;
		self.vjs.off('loadeddata');
		self.vjs.on('loadeddata', function() {
			console.warn("loadeddata");
			bLoadedData = true;
			_hideBlackScreen();
			if(_uniqPlay != mUniqPlay) {
				console.warn("[PLAYER]  _uniqPlay not current [loadeddata]");
				return;
			}
			_hideloading();
			_initZoomControls();
			_initVolumeControls();
			_vjs_play_live();
		});

		self.vjs.off('loadedmetadata');
		self.vjs.on('loadedmetadata', function() {
			console.warn("loadedmetadata");
		});

		// ad-hoc for network encoder
		setTimeout(function(){
			console.log("[PLAYER] Set url (rtmp) 2: " + live_urls.rtmp);
			if(!bLoadedData){
				self.vjs.src([{src: live_urls.rtmp, type: 'rtmp/mp4'}]);
			}
		},5000)

		_stopPolingTime();
		_startPolingTime();
		if (CloudHelpers.isChrome() && !CloudHelpers.autoPlayAllowed) {
			_vjs_play_live();
		} else {
			self.vjs.play();
		}
	}

	function _polingLoadCameraLiveUrl_NativeHLS(_uniqPlay, live_urls){
		if (!live_urls.hls) {
			_showerror(CloudReturnCode.NOT_SUPPORTED_FORMAT);
			return;
		}

		mUsedPlayer = 'native-hls';
		// No work
		mElPlrType.innerHTML = "Used player: NativeHLS";
		if(window.location.protocol.startsWith ("file")){
			self.player.showErrorText("Please open from browser");
			return;
		}

		// TODO keep player element
		self.vjs.el().style.display = "none";
		self.vjs2.el().style.display = "none";
		mWebRTC_el.style.display = "none";
		mNativeHLS_el.style.display = "block";
		if(!window['CloudPlayerNativeHLS']){
			console.error("[PLAYER]  Not found module CloudPlayerNativeHLS");
			return;
		}

		mNativeHLS_Player = new CloudPlayerNativeHLS(mNativeHLS_el, live_urls.hls);
		mNativeHLS_Player.play();
		_startPolingTime();
	}

	function _polingLoadCameraLiveUrl_HLS (_uniqPlay, live_urls){
		if (!live_urls.hls) {
			_showerror(CloudReturnCode.NOT_SUPPORTED_FORMAT);
			return;
		}

		if (self.m.useNativeHLS) {
			_polingLoadCameraLiveUrl_NativeHLS(_uniqPlay, live_urls);
			return;
		}
		mElPlrType.innerHTML = "Used player: HTML5 (hls)";
		mUsedPlayer = 'hls';

		console.log("[PLAYER] Set url (hls): " + live_urls.hls);

		clearInterval(mExpireHLSTimeInterval);
		/*if (live_urls.expire_hls) {
			var _expire_hls = live_urls.expire_hls;
			mExpireHLSTimeInterval = setInterval(function() {
				if(_source_type == 'camera_live' && mUsedPlayer == 'hls') {
					var nDiff = CloudHelpers.parseUTCTime(_expire_hls) - CloudHelpers.getCurrentTimeUTC();
					// console.warn("[PLAYER] hls, check the expire hls (at " + Math.floor(nDiff/1000) + " seconds)");
					if (nDiff < 0) {
						console.warn("[PLAYER] hls, reload new urls");
						self._polingLoadCameraLiveUrl(_uniqPlay);
					}
					// request again live urls
				}
			},10000);
		}*/

		_polingCameraHLSList(live_urls, _uniqPlay);

		self.vjs.off('ended');
		self.vjs.on('ended', function() {
			self.stop("by_hls_ended");
			_showerror(CloudReturnCode.ERROR_HLS_ENDED);
		});
		mSafariAndHlsNotStarted = '';

		self.vjs.off('loadeddata');
		self.vjs.on('loadeddata', function() {
			console.warn("loadeddata");
			_hideBlackScreen();
			if(_uniqPlay != mUniqPlay) {
				console.warn("_uniqPlay not current [loadeddata]");
				return;
			}
			_hideloading();
			_initZoomControls();
			_initVolumeControls();
			_vjs_play_live();
			if (CloudHelpers.isSafari()) {
				mSafariAndHlsNotStarted = 'loadeddata';
			}
		});

		self.vjs.off('loadedmetadata');
		self.vjs.on('loadedmetadata', function() {
			// console.warn("loadedmetadata");
		});

		self.vjs.off('playing');
		self.vjs.on('playing', function() {
			if (CloudHelpers.isSafari() && mSafariAndHlsNotStarted === 'loadeddata') {
				mSafariAndHlsNotStarted = 'playing';
			}
		});

		self.vjs.off('pause');
		self.vjs.on('pause', function() {
			// console.warn("pause");
			if (CloudHelpers.isSafari() && mSafariAndHlsNotStarted === 'playing') {
				mSafariAndHlsNotStarted = 'pause';
				_vjs_play_live();
			}
		});

		_stopPolingTime();
		_startPolingTime();
		if (CloudHelpers.isChrome() && !CloudHelpers.autoPlayAllowed) {
			_vjs_play_live();
		} else {
			self.vjs.play();
		}
	}

	function _polingCameraStatus(_uniqPlay){
		if(mUniqPlay != null && _uniqPlay != mUniqPlay) {
			console.warn("[_polingCameraStatus] _uniqPlay not current 1");
			clearInterval(mPolingCameraStatus);
			return;
		}
		if(!self.mSrc){
			console.warn("[_polingCameraStatus] no source");
			clearInterval(mPolingCameraStatus);
			return;
		}
		if(self.mSrc.type != 'camera'){
			console.warn("[_polingCameraStatus] no type camera");
			clearInterval(mPolingCameraStatus);
			return;
		}
		var camId = self.mSrc.getID();
		var prev_status = self.mSrc._origJson()['status'];
		mConn._getAPI().getCamera2(camId, {}).done(function(r){
			// console.log("[_polingCameraStatus] ",r);
			var new_status = r['status'];
			if(mUniqPlay != null && _uniqPlay != mUniqPlay) {
				console.warn("[_polingCameraStatus] _uniqPlay not current (2) " + _uniqPlay + "!=" + mUniqPlay);
				clearInterval(mPolingCameraStatus);
				return;
			}

			if(new_status !== 'active'
				&& self.m.waitSourceActivation != 0
				&& mWaitSourceActivationCounter > self.m.waitSourceActivation) {
				_showerror(CloudReturnCode.ERROR_CAMERA_OFFLINE);
				mWaitSourceActivationCounter = 0;
			}

			if(prev_status != new_status){
				console.warn("switched camera status: from " + prev_status + " to " + new_status + ' mLiveModeAutoStart: ' + mLiveModeAutoStart);
				self.mSrc._origJson()['status'] = new_status;
				if(mLiveModeAutoStart){
					if(new_status == 'active'){
						self.play();
					}else{
						self.stop("by_poling_camera_status");
						_showerror(CloudReturnCode.ERROR_CAMERA_OFFLINE);
						_startPolingCameraStatus(_uniqPlay);
					}
				}
				mCallbacks.executeCallbacks(CloudPlayerEvent.CHANNEL_STATUS, {status: new_status});
				if (mCallback_onChannelStatus) {
					setTimeout(function(){ mCallback_onChannelStatus(self, new_status); },10);
				}
			}
		}).fail(function(err){
			console.error("[_polingCameraStatus] ",err);
		});
		// 
	}

	function _startPolingCameraStatus(_uniqPlay){
		setTimeout(function(){
			mLiveModeAutoStart = true;
			clearInterval(mPolingCameraStatus);
			_polingCameraStatus(_uniqPlay);
			mWaitSourceActivationCounter = 100;
			var timePolingStart = 3000;

			if (self.mSrc._origJson()['status'] == 'active'){
				timePolingStart = mTimePolingCameraStatus_active;
			}else{
				timePolingStart = mTimePolingCameraStatus_inactive;
			}

			mPolingCameraStatus = setInterval(function(){
				if (mWaitSourceActivationCounter > 0) {
					mWaitSourceActivationCounter += timePolingStart;
				}
				_polingCameraStatus(_uniqPlay);
			}, timePolingStart);
		},100); // if called self.stop()
	}

	self._polingLoadCameraLiveUrl = function(_uniqPlay){
		if(_uniqPlay != mUniqPlay) {
			console.warn("_uniqPlay not current [_polingLoadCameraLiveUrl]");
			return;
		}
		
		if(self.mSrc.type != 'camera'){
			_showerror(CloudReturnCode.ERROR_INVALID_SOURCE);
			return;
		}

		if(self.updateAudioCaps){
			self.updateAudioCaps(self.mSrc.getID());
		}
		_source_type = 'camera_live';
		mUsedPlayer = '';
		mConn._getAPI().cameraLiveUrls(self.mSrc.getID()).done(function(live_urls){
			if(_uniqPlay != mUniqPlay) {
				console.warn("_uniqPlay not current [_polingLoadCameraLiveUrl.done]");
				return;
			}

			_updatePlayerFormatUI(live_urls);

			var webrtc_major_version = 1;
			if (live_urls.webrtc) {
				webrtc_major_version = live_urls.webrtc.version.split(".")[0];
				webrtc_major_version = parseInt(webrtc_major_version, 10);
			}

			if (!live_urls.hls && !live_urls.rtmp) {
				mPlayerFormatForced = 'webrtc';
			}

			if (mPlayerFormatForced !== null) {
				if (mPlayerFormatForced === 'flash') {
					_polingLoadCameraLiveUrl_RTMP(_uniqPlay, live_urls);
				} else if (mPlayerFormatForced === 'html5') {
					_polingLoadCameraLiveUrl_HLS(_uniqPlay, live_urls);
				} else if (live_urls.rtc && mPlayerFormatForced === 'webrtc') {
					_polingLoadCameraLiveUrl_WebRTC0(_uniqPlay, live_urls);
				} else if (live_urls.webrtc && webrtc_major_version === 2 && mPlayerFormatForced === 'webrtc') {
					_polingLoadCameraLiveUrl_WebRTC2(_uniqPlay, live_urls);
				} else {
					_showerror(CloudReturnCode.NOT_SUPPORTED_FORMAT);
				}
				return;
			}

			if(self.mPlayerFormat == 'webrtc'){
				if(live_urls.rtc && CloudHelpers.supportWebRTC()){
					_polingLoadCameraLiveUrl_WebRTC0(_uniqPlay, live_urls);
				} else if (live_urls.webrtc && webrtc_major_version === 2 && CloudHelpers.supportWebRTC()){
					_polingLoadCameraLiveUrl_WebRTC2(_uniqPlay, live_urls);
				}else{
					_polingLoadCameraLiveUrl_HLS(_uniqPlay, live_urls);
				}
			}
			
			if(self.mPlayerFormat == 'flash'){
				if(!CloudHelpers.useHls()){
					_polingLoadCameraLiveUrl_RTMP(_uniqPlay, live_urls);
				}else{
					_polingLoadCameraLiveUrl_HLS(_uniqPlay, live_urls);
				}
			}

			if(self.mPlayerFormat == 'html5'){
				_polingLoadCameraLiveUrl_HLS(_uniqPlay, live_urls);
			}
		}).fail(function(r){
			console.error(r);
			if(_uniqPlay != mUniqPlay) {
				console.warn("_uniqPlay not current [_polingLoadCameraLiveUrl.fail]");
				return;
			}
			if(r.status && r.status == 503){
				// try load urls
				mTimeWaitStartStream++;
				if(mTimeWaitStartStream < self.timePolingLiveUrls){
					setTimeout(function(){
						self._polingLoadCameraLiveUrl(_uniqPlay);
					}, 1000);
				}else{
					console.error(r);
				}
				return;
			}
			console.error(r);
		});
	}

	self._reset_players = function() {
		console.log("_reset_players");
		self.vjs.reset();
		self.vjs.controls(false);
		self.vjs.muted(true);
		self.vjs.autoplay(true);
		self.vjs.volume(0);
		self.vjs.el().style.display = "";
		
		self.vjs2.reset();
		self.vjs2.controls(false);
		self.vjs2.muted(true);
		self.vjs2.autoplay(true);
		self.vjs2.volume(0);
		self.vjs2.el().style.display = "none";

		mPlaybackPlayer1.reset();
		mPlaybackPlayer1.el().style.display = "none";

		mPlaybackPlayer2.reset();
		mPlaybackPlayer2.el().style.display = "none";

		self.volume(self.m.volume);
		_stopPolingTime();
		self._stopPolingMediaTicket();
		// vxgcloudplayer.stopPolingCameraLife();
		// self.updatePlayerType("");
	}

	self.isPlaying = function(){
		return mPlaying;
	}

	self.set_controls_opacity = function(val){
		if (el_controls.style.opacity != val) {
			mCallbacks.executeCallbacks(CloudPlayerEvent.CHANGED_CONTROLS, {opacity: val});
		}
		el_controls.style.opacity = val;
		el_controls_zoom.style.opacity = val;
		el_controls_zoom_position.style.opacity = val;
		el_info.style.opacity = val;
	}
			
	self.restartTimeout = function(){
		if(self.m.autohide < 0){
			self.set_controls_opacity("0");
			return;
		}
		if(self.m.autohide == 0){
			self.set_controls_opacity("0.7");
			return;
		}
		self.set_controls_opacity("0.7");
		clearTimeout(self.timeout);
		self.timeout = setTimeout(function(){
			self.set_controls_opacity("0");
		},self.m.autohide);
	};

	self.player.addEventListener('mousemove', self.restartTimeout, true);
	self.player.addEventListener('touchmove', self.restartTimeout, true);
	self.player.addEventListener('touchstart', self.restartTimeout, true);
	
	self.restartTimeout();

	mElementPlay.onclick = self.play;
	el_stop.onclick = self.stop;
	
	self.size = function(width, height){
		// redesign
		console.error("[CloudPlayer] size not support");
		/*if(width && height){
			if(Number.isInteger(width) && Number.isInteger(height)){
				var w = parseInt(width,10);
				var h = parseInt(height,10);
				self.playerWidth = self.playerWidth != w ? w : self.playerWidth;
				self.playerHeight = self.playerHeight != h ? h : self.playerHeight;
				self.player.style.width = width + 'px';
				self.player.style.height = height + 'px';
			}else{
				self.player.style.width = width;
				self.player.style.height = height;
			}
		}else{
			return  { width: self.playerWidth, height: self.playerHeight };
		}*/
	};
	
	self.initFullscreenControls = function(){
		var el_fullscreen = self.player.getElementsByClassName('cloudplayer-fullscreen')[0];
		var _prevHeight, _prevWidth;
		self.changedFullscreen = function(){
			console.log('changedFullscreen');
			if (document.webkitIsFullScreen){
				_prevHeight = self.player.style.height;
				_prevWidth = self.player.style.width;
				self.player.style.height = '100%';
				self.player.style.width = '100%';
				// self.size('100%', '100%');
				console.log('changedFullscreen -> fullscreen');
			}else{
				_prevHeight
				self.player.style.height = _prevHeight;
				self.player.style.width = _prevWidth;
				// self.size(self.playerWidth + 'px', self.playerHeight + 'px');
				console.log('changedFullscreen -> NOT fullscreen');
			}
		};

		if (document.addEventListener){
			document.addEventListener('webkitfullscreenchange', self.changedFullscreen, false);
			document.addEventListener('mozfullscreenchange', self.changedFullscreen, false);
			document.addEventListener('fullscreenchange', self.changedFullscreen, false);
			document.addEventListener('MSFullscreenChange', self.changedFullscreen, false);
		}

		self.fullscreen = function(){
			console.log("fullscreen: clicked");
			if(document.webkitIsFullScreen == true){
				document.webkitCancelFullScreen();
			} else if(document.mozFullScreen){
				document.mozCancelFullScreen();
			} else if(document.msFullscreenElement && document.msFullscreenElement != null){
				document.msExitFullscreen();
			}else{
				if(self.player.mozRequestFullScreen) {
					self.player.mozRequestFullScreen();
				} else if(self.player.requestFullscreen) {
					self.player.requestFullscreen();
				} else if(self.player.webkitRequestFullscreen) {
					self.player.webkitRequestFullscreen();
				} else if(self.player.msRequestFullscreen) {
					self.player.msRequestFullscreen();
				}
			}
		};
		
		el_fullscreen.onclick = self.fullscreen;
	}
	self.initFullscreenControls();
	
	self.initHLSMechanism = function(){

		self._applyMediaTiket = function(url_hls, expire){
			console.log("media-tiсket: old = " + self.hls_mediaticket_value);
			if(url_hls.indexOf('?') != -1){
				self.hls_mediaticket_value = '?' + url_hls.split('?')[1];
			}
			mHLSLinkExpire = Date.parse(expire + 'Z');
			console.log("media-tiсket: new = " + self.hls_mediaticket_value);
		}

		self._stopPolingMediaTicket = function(){
			clearInterval(self._polingMediaTicketInterval);
		}
	}
	self.initHLSMechanism();
	window._cloudPlayers[elid] = self;
}

CloudPlayer.POSITION_LIVE = -1;

window.CloudPlayerNativeHLS = function(videoEl, hlsUrl){
	var mVideoEl = videoEl;
	var mHLSUrl = hlsUrl;
	var self = this;

	console.warn("[NativeHLS] canPlay: application/vnd.apple.mpegurl => ", mVideoEl.canPlayType('application/vnd.apple.mpegurl'))
	console.warn("[NativeHLS] canPlay: application/x-mpegURL => ", mVideoEl.canPlayType('application/x-mpegURL'))
	console.warn("[NativeHLS] canPlay: video/mp4 => ", mVideoEl.canPlayType('video/mp4'))

	self.play = function() {
		if (mVideoEl.children.length > 0) {
			mVideoEl.removeChild(mVideoEl.children[0]);
		}
		
		var source = document.createElement('source');
		source.src = mHLSUrl;
		source.type="video/mp4";

		mVideoEl.append(source);
		mVideoEl.load();
	}

	self.stop = function() {
		if (mVideoEl.children.length > 0) {
			mVideoEl.removeChild(mVideoEl.children[0]);
		}
	}


	mVideoEl.addEventListener("abort", function() {
		console.warn("[NativeHLS] abort");
	}, true);
	mVideoEl.addEventListener("canplay", function() {
		console.warn("[NativeHLS] canplay");
	}, true);
	mVideoEl.addEventListener("canplaythrough", function() {
		console.warn("[NativeHLS] canplaythrough");
	}, true);
	mVideoEl.addEventListener("durationchange", function() {
		console.warn("[NativeHLS] durationchange");
	}, true);
	mVideoEl.addEventListener("emptied", function() {
		console.warn("[NativeHLS] emptied");
	}, true);
	mVideoEl.addEventListener("encrypted", function() {
		console.warn("[NativeHLS] encrypted");
	}, true);
	mVideoEl.addEventListener("ended", function() {
		console.warn("[NativeHLS] ended");
	}, true);
	mVideoEl.addEventListener("error", function(err, err1) {
		console.error("[NativeHLS] error ", err);
		console.error("[NativeHLS] error ", err1);
	}, true);
	mVideoEl.addEventListener("interruptbegin", function() {
		console.warn("[NativeHLS] interruptbegin");
	}, true);
	mVideoEl.addEventListener("interruptend", function() {
		console.warn("[NativeHLS] interruptend");
	}, true);
	mVideoEl.addEventListener("loadeddata", function() {
		console.warn("[NativeHLS] loadeddata");
		mVideoEl.play();
	}, true);
	mVideoEl.addEventListener("loadedmetadata", function() {
		console.warn("[NativeHLS] loadedmetadata");
	}, true);
	mVideoEl.addEventListener("loadstart", function() {
		console.warn("[NativeHLS] loadstart");
	}, true);
	mVideoEl.addEventListener("mozaudioavailable", function() {
		console.warn("[NativeHLS] mozaudioavailable");
	}, true);
	mVideoEl.addEventListener("pause", function() {
		console.warn("[NativeHLS] pause");
	}, true);
	mVideoEl.addEventListener("play", function() {
		console.warn("[NativeHLS] play");
	}, true);
	mVideoEl.addEventListener("playing", function() {
		console.warn("[NativeHLS] playing");
	}, true);
	mVideoEl.addEventListener("progress", function() {
		console.warn("[NativeHLS] progress");
	}, true);
	mVideoEl.addEventListener("ratechange", function() {
		console.warn("[NativeHLS] ratechange");
	}, true);
	mVideoEl.addEventListener("seeked", function() {
		console.warn("[NativeHLS] seeked");
	}, true);
	mVideoEl.addEventListener("seeking", function() {
		console.warn("[NativeHLS] seeking");
	}, true);
	mVideoEl.addEventListener("stalled", function() {
		console.warn("[NativeHLS] stalled");
	}, true);
	mVideoEl.addEventListener("suspend", function() {
		console.warn("[NativeHLS] suspend");
	}, true);
	mVideoEl.addEventListener("timeupdate", function() {
		console.warn("[NativeHLS] timeupdate");
	}, true);
	mVideoEl.addEventListener("volumechange", function() {
		console.warn("[NativeHLS] volumechange");
	}, true);
	mVideoEl.addEventListener("waiting", function() {
		console.warn("[NativeHLS] waiting");
	}, true);
	
};



window.CloudPlayerNativeVideo = function(elId){
	var mVideoEl = document.getElementById(elId);
	var mSourceEl = null;
	var self = this;
	var _TAG = "[NativeVideo] ";
	var mAutoplayBlocked = null;
	var mResetCalled = false;
	var mCurrentTime = 0;
	var mCallbackError = null;

	function _checkAutoPlay(p) {
		var s = '';
		if (window['Promise']) {
			s = window['Promise'].toString();
		}

		if (s.indexOf('function Promise()') !== -1
			|| s.indexOf('function ZoneAwarePromise()') !== -1) {

			p.catch(function(error) {
				console.error(_TAG + "checkAutoplay, error:", error)
				// Check if it is the right error
				if(error.name == "NotAllowedError") {
					console.error(_TAG + "_checkAutoPlay: error.name:", "NotAllowedError")
					self.onAutoplayBlocked();
				} else if (error.name == "AbortError" && CloudHelpers.isSafari()) {
					console.error(_TAG + "_checkAutoPlay: AbortError (Safari)")
					self.onAutoplayBlocked();
				} else {
					console.error(error);
					console.error(_TAG + "checkAutoplay: happened something else");
					// throw error; // happened something else
				}
			}).then(function(){
				console.log(_TAG + "checkAutoplay: then");
				// Auto-play started
			});
		} else {
			console.error(_TAG + "checkAutoplay: could not work in your browser ", p);
		}
	}

	self.onAutoplayBlocked = function() {
		// nothing
	}

	self.on = function(event_t, func) {
		if (event_t == 'error') {
			mCallbackError = func;
			// mVideoEl.onerror = func;
		} else if (event_t == 'loadeddata') {
			mVideoEl.onloadeddata = func;
		} else if (event_t == 'ended') {
			mVideoEl.onended = func;
		} else if (event_t == 'autoplay_blocked') {
			mAutoplayBlocked = func;
		} else {
			console.error(_TAG + "ON Unknown " + event_t);
		}
	}

	self.off = function(event_t) {
		if (event_t == 'loadeddata') {
			mVideoEl.onloadeddata = null;
		} else if (event_t == 'ended') {
			mVideoEl.onended = null;
		} else {
			console.error(_TAG + "OFF Unknown " + event_t);
		}
	}

	self.ready = function(ready) {
		ready();
		console.error(_TAG + "TODO ready");
	}

	self.muted = function(b) {
		mVideoEl.muted = b;
		console.error(_TAG + "TODO muted");
	}

	self.volume = function(v) {
		if (v !== undefined) {
			mVideoEl.volume = v;
			return;
		}
		return mVideoEl.volume;
	}

	self.reset = function() {
		console.warn(_TAG, "reset");
		mResetCalled = true;
		mCurrentTime = 0;
		mVideoEl.pause();
		if (mSourceEl != null) {
			mSourceEl.removeAttribute('src');
		}
		mVideoEl.load();
	}

	self.controls = function(b) {
		console.error(_TAG + "TODO controls");
	}

	self.autoplay = function(b) {
		if (b == true) {
			console.error(_TAG + "Not supported autoplay");
		}
	}

	self.el = function() {
		return mVideoEl;
	}

	self.src = function(s) {
		// console.log(s);
		if (mSourceEl == null) {
			mSourceEl = document.createElement('source');
			mVideoEl.appendChild(mSourceEl);
		}
		mVideoEl.pause();
		mVideoEl.currentTime = 0;
		mSourceEl.setAttribute('src', s[0].src);
		mVideoEl.load();
		// self.play();
		// mVideoEl.play();
	}

	self.currentTime = function(v) {
		if (v !== undefined) {
			mCurrentTime = v;
			mVideoEl.currentTime = v;
			return;
		}
		return mVideoEl.currentTime || mCurrentTime;
	}
	
	self.play = function() {
		_checkAutoPlay(mVideoEl.play());
	}

	self.pause = function() {
		mVideoEl.pause();
	}

	mVideoEl.addEventListener("abort", function() {
		// console.warn(_TAG + "abort");
	}, true);
	mVideoEl.addEventListener("canplay", function() {
		// console.warn(_TAG + "canplay");
	}, true);
	mVideoEl.addEventListener("canplaythrough", function() {
		// console.warn(_TAG + "canplaythrough");
	}, true);
	mVideoEl.addEventListener("durationchange", function() {
		// console.warn(_TAG + "durationchange");
	}, true);
	mVideoEl.addEventListener("emptied", function() {
		// console.warn(_TAG + "emptied");
	}, true);
	mVideoEl.addEventListener("encrypted", function() {
		// console.warn(_TAG + "encrypted");
	}, true);
	mVideoEl.addEventListener("ended", function() {
		console.warn(_TAG + "ended");
	}, true);
	mVideoEl.addEventListener("error", function(err0, err1) {
		console.error(_TAG + "err0 ", err0);	
		/*if (mResetCalled == true) {
			console.warn(_TAG + "Skip error after reset");
			mResetCalled = false;
			return;
		}*/
		if (mCallbackError != null) {
			mCallbackError(err0);
		}
		// console.error(_TAG + " err1 ", err1);
	}, true);
	mVideoEl.addEventListener("interruptbegin", function() {
		// console.warn(_TAG + "interruptbegin");
	}, true);
	mVideoEl.addEventListener("interruptend", function() {
		// console.warn(_TAG + "interruptend");
	}, true);
	mVideoEl.addEventListener("loadeddata", function() {
		// console.warn(_TAG + "loadeddata");
		mVideoEl.currentTime = mCurrentTime;
		// console.warn(_TAG + "currentTime = " + mCurrentTime);
	}, true);
	mVideoEl.addEventListener("loadedmetadata", function() {
		// console.warn(_TAG + "loadedmetadata");
	}, true);
	mVideoEl.addEventListener("loadstart", function() {
		// console.warn(_TAG + "loadstart");
	}, true);
	mVideoEl.addEventListener("mozaudioavailable", function() {
		// console.warn(_TAG + "mozaudioavailable");
	}, true);
	mVideoEl.addEventListener("pause", function() {
		// console.warn(_TAG + "pause");
	}, true);
	mVideoEl.addEventListener("play", function() {
		// console.warn(_TAG + "play");
	}, true);
	mVideoEl.addEventListener("playing", function() {
		// console.warn(_TAG + "playing");
	}, true);
	mVideoEl.addEventListener("progress", function() {
		// console.warn(_TAG + "progress");
	}, true);
	mVideoEl.addEventListener("ratechange", function() {
		// console.warn(_TAG + "ratechange");
	}, true);
	mVideoEl.addEventListener("seeked", function() {
		// console.warn(_TAG + "seeked");
	}, true);
	mVideoEl.addEventListener("seeking", function() {
		// console.warn(_TAG + "seeking");
	}, true);
	mVideoEl.addEventListener("stalled", function() {
		// console.warn(_TAG + "stalled");
	}, true);
	mVideoEl.addEventListener("suspend", function() {
		// console.warn(_TAG + "suspend");
	}, true);
	mVideoEl.addEventListener("timeupdate", function() {
		// console.warn(_TAG + "timeupdate");
	}, true);
	mVideoEl.addEventListener("volumechange", function() {
		// console.warn(_TAG + "volumechange");
	}, true);
	mVideoEl.addEventListener("waiting", function() {
		// console.warn(_TAG + "waiting");
	}, true);
	
};



window.CloudPlayerWebRTC0 = function(videoEl, srv, rtmpUrl){
	// for VXG Server
	var mVideoEl = videoEl;
	var mWSServer = srv;
	var mRtmpUrl = rtmpUrl;
	var peer_connection = null;
	var _TAG = "[WEBRTC0] ";
	/*var rtc_configuration = {iceServers: [{urls: "stun:stun.services.mozilla.com"},
										  {urls: "stun:stun.l.google.com:19302"}]};*/

	var rtc_configuration = {iceServers: [{
			urls: "stun:stun.l.google.com:19302"
		}, {
			"urls": ["turn:turn.vxg.io:3478?transport=udp"],
			"username": "vxgturn",
			"credential": "vxgturn"
		}
	]};

	var self = this;
	
	var ws_conn;
	var mPeerId = Math.floor(Math.random() * (9000 - 10) + 10).toString();
	self.onWsError = function(msg){
		console.error(msg);
	}
	
	self.onAutoplayBlocked = function() {
        // nothing
        console.error(_TAG + "onAutoplayBlocked");
    }
    
    function _checkAutoPlay(p) {
		var s = '';
		if (window['Promise']) {
			s = window['Promise'].toString();
		}

		if (s.indexOf('function Promise()') !== -1
			|| s.indexOf('function ZoneAwarePromise()') !== -1) {

			p.catch(function(error) {
				console.error(_TAG + "_checkAutoplay, error:", error)
				// Check if it is the right error
				if(error.name == "NotAllowedError") {
					console.error(_TAG + "_checkAutoPlay: error.name:", "NotAllowedError")
					self.onAutoplayBlocked();
				} else if (error.name == "AbortError" && CloudHelpers.isSafari()) {
					console.error(_TAG + "_checkAutoPlay: AbortError (Safari)")
					self.onAutoplayBlocked();
				} else {
					console.error(error);
					console.error(_TAG + "checkAutoplay: happened something else");
					// throw error; // happened something else
				}
			}).then(function(){
				console.log(_TAG + "checkAutoplay: then");
				// Auto-play started
			});
		} else {
			console.error(_TAG + "_checkAutoplay: could not work in your browser ", p);
		}
	}
	
	if (CloudHelpers.isSafari() ) {
        navigator.mediaDevices.getUserMedia({ "audio": false, "video": true}).then(function (stream) {
            console.log(_TAG + "Camera permission granted");
        }).catch(function(a1, a2){
			console.error(a1, a2)
		});
    }

	self.resetState = function() {
		// This will call onServerClose()
		ws_conn.close();
	}

	self.handleIncomingError = function(error) {
		console.error(_TAG + "IncomingError: ", error);
		resetState();
	}

	self.resetVideoElement = function() {
		mVideoEl.pause();
		mVideoEl.src = "";
		mVideoEl.load();
	}

	// SDP offer received from peer, set remote description and create an answer
	self.onIncomingSDP = function(sdp) {
		sdp.sdp = sdp.sdp.replace(/profile-level-id=[^;]+/, 'profile-level-id=42e01f');
		console.log(_TAG + 'Incoming SDP is ' + JSON.stringify(sdp));
		peer_connection.setRemoteDescription(sdp).then(function(){
			console.log("Remote SDP set");
			if (sdp.type != "offer")
				return;
			console.log(_TAG + "Got SDP offer, creating answer");
			peer_connection.createAnswer().then(self.onLocalDescription).catch(function(t){
				console.error('[WEBRTC0] createAnswer: ', t);
			});
		}).catch(function(t){
			console.error(_TAG + 'setRemoteDescription: ', t);
		});
	}

	// Local description was set, send it to peer
	self.onLocalDescription = function(desc) {
		console.log(_TAG + 'Got local description: ' + JSON.stringify(desc));
		peer_connection.setLocalDescription(desc).then(function() {
			console.log(_TAG + 'Sending SDP answer');
			sdp = {'sdp': peer_connection.localDescription}
			ws_conn.send(JSON.stringify(sdp));
			console.warn(_TAG + 'Streaming (1)');
			_checkAutoPlay(mVideoEl.play());
		});
	}

	// ICE candidate received from peer, add it to the peer connection
	self.onIncomingICE = function(ice) {
		console.log(_TAG + 'Incoming ICE: ' + JSON.stringify(ice));
		var candidate = new RTCIceCandidate(ice);
		peer_connection.addIceCandidate(candidate).catch(function(t){
			console.error(_TAG + 'addIceCandidate ', t);
		});
	}

	self.onServerMessage = function(event) {
		console.log(_TAG + "Received " + event.data);
		switch (event.data) {
			case "HELLO":
				console.log(_TAG + "Registered with server, waiting for stream");
				return;
			default:
				if (event.data.startsWith("ERROR")) {
					self.handleIncomingError(event.data);
					return;
				}
				// Handle incoming JSON SDP and ICE messages
				try {
					msg = JSON.parse(event.data);
				} catch (e) {
					if (e instanceof SyntaxError) {
						handleIncomingError("Error parsing incoming JSON: " + event.data);
					} else {
						handleIncomingError("Unknown error parsing response: " + event.data);
					}
					return;
				}

				// Incoming JSON signals the beginning of a call
				if (peer_connection == null)
					self.createCall(msg);

				if (msg.sdp != null) {
					self.onIncomingSDP(msg.sdp);
				} else if (msg.ice != null) {
					self.onIncomingICE(msg.ice);
				} else {
					self.handleIncomingError("Unknown incoming JSON: " + msg);
				}
		}
	}

	// window.onload = websocketServerConnect;

	self.stopWS = function(){
		ws_conn.close();
		// self.onServerClose();
		// delete self;
	}

	self.onServerClose = function(event) {
		self.resetVideoElement();

		if (peer_connection != null) {
			peer_connection.close();
			peer_connection = null;
		}

		// Reset after a second
		// window.setTimeout(websocketServerConnect, 1000);
	}

	self.onServerError = function(event) {
		console.error("[WEBRTC0] Unable to connect to server, did you add an exception for the certificate?")
	}

	self.onRemoteStreamAdded = function(event) {
		videoTracks = event.stream.getVideoTracks();
		audioTracks = event.stream.getAudioTracks();

		if (videoTracks.length > 0) {
			console.log('[WEBRTC0] Incoming stream: ' + videoTracks.length + ' video tracks and ' + audioTracks.length + ' audio tracks');
			mVideoEl.srcObject = event.stream;
		} else {
			self.handleIncomingError('[WEBRTC0] Stream with unknown tracks added, resetting');
		}
	}

	self.errorUserMediaHandler = function() {
		console.error("[WEBRTC0] Browser doesn't support getUserMedia!");
	}

	self.createCall = function(msg) {
		// Reset connection attempts because we connected successfully
		connect_attempts = 0;

		peer_connection = new RTCPeerConnection(rtc_configuration);
		peer_connection.onaddstream = self.onRemoteStreamAdded;
		/* Send our video/audio to the other peer */

		if (!msg.sdp) {
			console.log("[WEBRTC0] WARNING: First message wasn't an SDP message!?");
		}

        peer_connection.onicecandidate = function(event) {
			// We have a candidate, send it to the remote party with the
			// same uuid
			if (event.candidate == null) {
				console.error("[WEBRTC0] ICE Candidate was null, done"); // why log error ?
				return;
			}
			ws_conn.send(JSON.stringify({'ice': event.candidate}));
		};

		console.log("[WEBRTC0] Created peer connection for call, waiting for SDP");
	}
	
	self.startWS = function() {
		self.connect_attempts++;
		if (self.connect_attempts > 3) {
			console.error("[WEBRTC0] Too many connection attempts, aborting. Refresh page to try again");
			return;
		}
		console.log("[WEBRTC0] Connecting to server...");
		loc = null;
		
		ws_conn = new WebSocket(mWSServer);
		/* When connected, immediately register with the server */
		ws_conn.addEventListener('open', function(event) {
			ws_conn.send('HELLO ' + mPeerId);
			console.log(_TAG + "Registering with server");
			ws_conn.send('SPAWN ' + mRtmpUrl)
		});
		ws_conn.addEventListener('error', self.onServerError);
		ws_conn.addEventListener('message', self.onServerMessage);
		ws_conn.addEventListener('close', self.onServerClose);

		var constraints = {video: true, audio: true};
	}
	
};



window.CloudPlayerWebRTC2 = function(objVideoEl, strConnectionUrl, arrIceServers, options) {
    options = options || {};
    var self = this;
    var _TAG = "[WEBRTC2] ";

    console.log(_TAG, options);

    var m_objVideoEl = objVideoEl;
	var m_strPeerOnVideoEl = "";
	var m_strConnectionUrl = strConnectionUrl || "";
	var m_bSendVideo = options.send_video || false;
	var m_bSendAudio = options.send_audio || false;
	var m_mapPeers = {};
	var m_objRTCConfiguration = {iceServers: arrIceServers || []};
	var m_bIsPublisher = false;
	var m_objWS = null;
    // console.log("m_bSendVideo: ", m_bSendVideo);
    // console.log("m_bSendAudio: ", m_bSendAudio);
	self.onWsError = function(msg) {
		console.error("[WEBRTC2] onWsError, ", msg);
	}
	
	/*if (CloudHelpers.isSafari()) {
        navigator.mediaDevices.getUserMedia({ "audio": true, "video": true}).then(function (stream) {
            console.log("[WEBRTC2] Camera permission granted");
        }).catch(function(a1, a2){
            console.error("[WEBRTC2] error on getUserMedia (1) a1 = ", a1);
            console.error("[WEBRTC2] error on getUserMedia (1) a2 = ", a2);
		});
    }*/

	self.resetState = function() {
		m_objWS.close();    // It will call onServerClose()
	}

	self.handleIncomingError = function(error) {
		console.error("[WEBRTC2] ERROR: ", error);
		self.resetState();
	}

    self.reset = function() {
        if (m_objVideoEl && m_objVideoEl.srcObject) {
            m_objVideoEl.pause();
            m_objVideoEl.srcObject = null;
            m_strPeerOnVideoEl = "";
            m_objVideoEl.load();
            // m_objVideoEl.onl
	    }
    }

    self.el = function() {
		return m_objVideoEl;
    }

    self.onAutoplayBlocked = function() {
        // nothing
        console.error(_TAG + "onAutoplayBlocked");
    }
    
    function _checkAutoPlay(p) {
		var s = '';
		if (window['Promise']) {
			s = window['Promise'].toString();
		}

		if (s.indexOf('function Promise()') !== -1
			|| s.indexOf('function ZoneAwarePromise()') !== -1) {

			p.catch(function(error) {
				console.error(_TAG + "_checkAutoplay, error:", error)
				// Check if it is the right error
				if(error.name == "NotAllowedError") {
					console.error(_TAG + "_checkAutoPlay: error.name:", "NotAllowedError")
					self.onAutoplayBlocked();
				} else if (error.name == "AbortError" && CloudHelpers.isSafari()) {
					console.error(_TAG + "_checkAutoPlay: AbortError (Safari)")
					self.onAutoplayBlocked();
				} else {
					console.error(error);
					console.error(_TAG + "checkAutoplay: happened something else");
					// throw error; // happened something else
				}
			}).then(function(){
				console.log(_TAG + "checkAutoplay: then");
				// Auto-play started
			});
		} else {
			console.error(_TAG + "_checkAutoplay: could not work in your browser ", p);
		}
    }
    
    function _videoOnLoadedData() {
        console.warn(_TAG + "loadeddata");
        console.warn(_TAG + "currentTime = " + m_objVideoEl.currentTime);
    }

    self.initCalbacks = function () {
        if (m_objVideoEl) {
            m_objVideoEl.addEventListener("loadeddata", _videoOnLoadedData, true);
        }
    }

    self.removeCalbacks = function () {
        if (m_objVideoEl) {
            m_objVideoEl.removeEventListener("loadeddata", _videoOnLoadedData, true);
        }
    }

    self.createWatchingConnection = function(strSessionPartnerPeerUID) {
		// Reset connection attempts because we connected successfully
		connect_attempts = 0;
        console.assert( !(strSessionPartnerPeerUID in m_mapPeers) );
		objPeer = new RTCPeerConnection(m_objRTCConfiguration);
		objPeer.strPeerUID = strSessionPartnerPeerUID;
        m_mapPeers[strSessionPartnerPeerUID] = objPeer;
		objPeer.onaddstream = self.onRemoteStreamAdded;
		objPeer.onicecandidate = function(event) {
            if (event.candidate == null) {
                console.error("[WEBRTC2] ICE Candidate was null, done");
                return;
            }
            m_objWS.send(JSON.stringify({'to': strSessionPartnerPeerUID, 'ice': event.candidate}));
		};
		console.log("[WEBRTC2] Created peer connection for call, waiting for SDP");
	}

    self.getUserMediaConstraints = function() {
        var constraints = {};
        // this must be configurable
        constraints.audio = m_bSendAudio;
        constraints.video = m_bSendVideo;
        try {
            console.warn(_TAG + "getSupportedConstraints: ", navigator.mediaDevices.getSupportedConstraints());
        } catch(e) {
            console.error(_TAG + "error on getSupportedConstraints", e);
        }
        return constraints;
    }

    self.createPublishingConnection = function(strSessionPartnerPeerUID) {
		connect_attempts = 0;   // Reset connection attempts because we connected successfully
        console.assert( !(strSessionPartnerPeerUID in m_mapPeers) );

        m_bIsPublisher = true;
        if (!m_bSendAudio && !m_bSendVideo) {
            console.error("[WEBRTC2] Publisher must send audio or video stream");
            return;
        }
        navigator.mediaDevices.getUserMedia(self.getUserMediaConstraints()).then(function (objLocalStream) {
            console.log("[WEBRTC2] Local stream successfully received");
            var objPeer = new RTCPeerConnection(m_objRTCConfiguration);
            objPeer.strPeerUID = strSessionPartnerPeerUID;
            m_mapPeers[strSessionPartnerPeerUID] = objPeer;
            objPeer.onaddstream = self.onRemoteStreamAdded; // Required when a watcher is sending a stream
            objPeer.onicecandidate = function(event) {
                // We have a candidate, send it to the remote party with the same uuid
                if (event.candidate == null) {
                    console.error("[WEBRTC2] ICE Candidate was null, done");
                    return;
                }
                m_objWS.send(JSON.stringify({'to': strSessionPartnerPeerUID, 'ice': event.candidate}));
            };
            objPeer.onconnectionstatechange = function(event) {
                console.error("[WEBRTC2] Connection state changed " + objPeer.connectionState);
            };
            console.log("[WEBRTC2] Created peer connection for publishing");
            objPeer.addStream(objLocalStream);
            console.log("[WEBRTC2] Local SDP set");
            objPeer.createOffer().then(function(offer) {
                objPeer.setLocalDescription(offer)
                console.log("[WEBRTC2] Sending SDP offer");
                sdp = {'to': strSessionPartnerPeerUID, 'sdp': offer}
                m_objWS.send(JSON.stringify(sdp));
                console.warn("[WEBRTC2] Streaming (1)");
            }).catch(function(t){
                console.error('[WEBRTC2] error on createOffer ', t);
            });
        }).catch(function(a1, a2){
            console.error("[WEBRTC2] error on getUserMedia a1 = ", a1);
            console.error("[WEBRTC2] error on getUserMedia a2 = ", a2);
        });
	}

	// SDP received from peer, set remote description and create an answer when necessary
	self.onIncomingSDP = function(strSessionPartnerPeerUID, objSessionPartnerPeer, sdp) {
		sdp.sdp = sdp.sdp.replace(/profile-level-id=[^;]+/, 'profile-level-id=42e01f');
		console.log("[WEBRTC2] Incoming SDP from " + strSessionPartnerPeerUID + ": " + JSON.stringify(sdp));

		objSessionPartnerPeer.setRemoteDescription(sdp).then(function() {
			console.log("[WEBRTC2] Remote SDP set");
            if (m_bIsPublisher) {
                console.assert(sdp.type === "answer");
                console.log("[WEBRTC2] Got SDP answer from " + strSessionPartnerPeerUID);
            } else {
                console.assert(sdp.type === "offer");
                console.log("[WEBRTC2] Got SDP offer from " + strSessionPartnerPeerUID);

                // Local description was set, send it to peer
                onLocalDescription = function(desc) {
                    console.log("[WEBRTC2] Got local description: " + JSON.stringify(desc));
                    objSessionPartnerPeer.setLocalDescription(desc).then(function() {
                        console.log("[WEBRTC2] Sending SDP answer to " + strSessionPartnerPeerUID);
                        sdp = {'to': strSessionPartnerPeerUID, 'sdp': objSessionPartnerPeer.localDescription}
                        m_objWS.send(JSON.stringify(sdp));
                        console.warn("[WEBRTC2] Streaming (2)");
                        _checkAutoPlay(m_objVideoEl.play());
                    });
                }

                // Are watcher going to send its streams to publisher?
                if (m_bSendVideo || m_bSendAudio) {
                    console.log("[WEBRTC2] Watcher is configured to send stream");
                    navigator.mediaDevices.getUserMedia({audio: m_bSendAudio, video: m_bSendVideo}).then(function(objLocalStream) {
                        objSessionPartnerPeer.addStream(objLocalStream);
                        console.log("[WEBRTC2] Local SDP set, creating answer");
                        objSessionPartnerPeer.createAnswer().then(onLocalDescription).catch(function(t){
                            console.error('[WEBRTC2] error on createAnswer (1) ', t);
                        });
                    });
                } else {
                    console.log("[WEBRTC2] Creating answer without stream sending");
                    objSessionPartnerPeer.createAnswer().then(onLocalDescription).catch(function(t){
                        console.error('[WEBRTC2] error on createAnswer (2) ', t);
                    });
                }
            }
		}).catch(function(t){
			console.error('[WEBRTC2] error on setRemoteDescription ', t);
		});
	}

	// ICE candidate received from peer, add it to the peer connection
	self.onIncomingICE = function(strSessionPartnerPeerUID, objSessionPartnerPeer, ice) {
		console.log("[WEBRTC2] Incoming ICE from " + strSessionPartnerPeerUID + ": " + JSON.stringify(ice));
		var candidate = new RTCIceCandidate(ice);
		objSessionPartnerPeer.addIceCandidate(candidate).catch(function(t){
			console.error('[WEBRTC2] error on addIceCandidate ', t);
		});
	}

	self.onServerMessage = function(event) {
        console.log("[WEBRTC2] Received " + event.data);
        if (event.data.startsWith("HELLO")) {
            console.log("[WEBRTC2] Registered with server, waiting for stream");
            return;
        } else if (event.data.startsWith("SESSION_STARTED")) {
            var strSessionPartnerPeerUID = event.data.split(" ")[1];
            console.log("[WEBRTC2] Publisher " + strSessionPartnerPeerUID + " is going to start session");
            self.createWatchingConnection(strSessionPartnerPeerUID);
            return;
        } else if (event.data.startsWith("SESSION_STOPPED")) {
            var strSessionPartnerPeerUID = event.data.split(" ")[1];
            console.log("[WEBRTC2] Session of publisher " + strSessionPartnerPeerUID + " is terminated");
            if (strSessionPartnerPeerUID in m_mapPeers) {
                if (!!m_mapPeers[strSessionPartnerPeerUID]) {
                    m_mapPeers[strSessionPartnerPeerUID].close();
                    m_mapPeers[strSessionPartnerPeerUID] = null;
                }
                delete m_mapPeers[strSessionPartnerPeerUID];
                if (m_objVideoEl && m_strPeerOnVideoEl === strSessionPartnerPeerUID) {
                    self.reset();
                }
            }
            return;
        } else if (event.data.startsWith("START_SESSION")) {
            var strSessionPartnerPeerUID = event.data.split(" ")[1];
            console.log("[WEBRTC2] Watcher " + strSessionPartnerPeerUID + " has come and awaiting for publishing");
            self.createPublishingConnection(strSessionPartnerPeerUID);
            return;
        } else if (event.data.startsWith("ERROR")) {
            self.handleIncomingError(event.data);
            return;
        } else {
            // Handle incoming JSON SDP and ICE messages
            var objMsg = null, strPeerUID = "", objPeer = null;
            try {
                objMsg = JSON.parse(event.data);
                strPeerUID = objMsg.from
                objPeer = m_mapPeers[strPeerUID]
            } catch (e) {
                if (e instanceof SyntaxError) {
                    self.handleIncomingError("Error parsing incoming JSON: " + event.data);
                } else {
                    self.handleIncomingError("Unknown error parsing response: " + event.data);
                }
                return;
            }

            if (objMsg.sdp != null) {
                self.onIncomingSDP(strPeerUID, objPeer, objMsg.sdp);
            } else if (objMsg.ice != null) {
                self.onIncomingICE(strPeerUID, objPeer, objMsg.ice);
            } else {
                self.handleIncomingError("Unknown incoming JSON: " + objMsg);
            }
		}
	}

	// window.onload = websocketServerConnect;

	self.stopWS = function(){
        m_objWS.close();
        self.removeCalbacks();
		// self.onServerClose();
		// delete self;
	}

	self.onServerClose = function(event) {
		console.error("[WEBRTC2] Closed WebRTC ", event);
		self.reset();

        for (strSessionPartnerPeerUID in m_mapPeers) {
            if (!!m_mapPeers[strSessionPartnerPeerUID]) {
                m_mapPeers[strSessionPartnerPeerUID].close();
                m_mapPeers[strSessionPartnerPeerUID] = null;
            }
        }

        m_mapPeers = {};
	}

	self.onServerError = function(event) {
		console.error("[WEBRTC2] Unable to connect to server, did you add an exception for the certificate?", event)
	}

	self.onRemoteStreamAdded = function(event) {
		videoTracks = event.stream.getVideoTracks();
		audioTracks = event.stream.getAudioTracks();

		if (videoTracks.length > 0 || audioTracks.length > 0) {
			console.log('[WEBRTC2] Incoming stream: ' + videoTracks.length + ' video tracks and ' + audioTracks.length + ' audio tracks');
			if (m_objVideoEl && m_strPeerOnVideoEl === "") {
			    m_objVideoEl.srcObject = event.stream;
			    m_strPeerOnVideoEl = event.currentTarget.strPeerUID;
            }
        }
        else {
			self.handleIncomingError('[WEBRTC2] Stream with unknown tracks added, resetting');
		}
	}

	self.errorUserMediaHandler = function() {
		console.error("[WEBRTC2] Browser doesn't support getUserMedia!");
	}

	self.startWS = function() {
		self.connect_attempts++;
		if (self.connect_attempts > 3) {
			console.error("[WEBRTC2] Too many connection attempts, aborting. Refresh page to try again");
			return;
		}
		console.log("[WEBRTC2] Connecting to server...");
		
		m_objWS = new WebSocket(m_strConnectionUrl);

		/* When connected, immediately register with the server */
		m_objWS.addEventListener('open', function(event) {
			m_objWS.send('HELLO ' + window.CloudPlayerWebRTC2.version);
			console.log("[WEBRTC2] Registering with server");
		});
		m_objWS.addEventListener('error', self.onServerError);
		m_objWS.addEventListener('message', self.onServerMessage);
		m_objWS.addEventListener('close', self.onServerClose);

		var constraints = {video: true, audio: true};
	}
};

window.CloudPlayerWebRTC2.version = "2.0.1";
window.CloudCameraTimelineMode = {};

CloudCameraTimelineMode.MINUTES_MODE = {
	name: 'MINUTES_MODE',
	code: 0,
};

CloudCameraTimelineMode.HOUR_MODE = {
	name: 'HOUR_MODE',
	code: 1,
};

CloudCameraTimelineMode.HOURS_12_MODE = {
	name: 'HOURS_12_MODE',
	code: 2,
};

window.CloudCameraTimelineView = function(viewid, options){
	options = options || {};
	var self = this;
	var mSource = null;
	var mTimezoneOffset = 0;
	var mConn = null;

	// cache by every 3 hours
	var mCacheDurationGrid = 10800000;
	var mCacheRecords = {};
	var mCursorPosition = 0;
	var mTimelineDrawing = false;
	var mContainerWidth = 0;
	var mDistPx = 0;
	var mDistSec = 0;
	var mViewID = viewid;
	var mIntervalPolingData = null;
	var mPolingDataMax = 0;
	var mPlayer = null;
	var mRangeMin = -1;
	var mRangeMax = -1;
	var mNavArrowsHided = false;
	var mStartMove = false;
	var mFirstMoveX = 0;
	var mLastMoveX = 0;
	var mAnimationToProgress = false;
	var mLeftDataPadding = 0;
	var mRightDataPadding = 0;
	var mOptionCalendar = false;
	var mUseTimezone = null;
	var mRangePolingDataEveryInSec = null;
	var mPolingRangeDataInterval = null;
	var mCallbacks = CloudHelpers.createCallbacks();

	if (options.useTimezone) {
		mUseTimezone = options.useTimezone;
		console.warn("[CloudTimeline] useTimezone: " + mUseTimezone);
	}

	if(options["calendar"] !== undefined){
		mOptionCalendar = options["calendar"] == true;
	}

	if(options["polingRangeDataEveryInSec"] !== undefined) {
		mRangePolingDataEveryInSec = parseInt(options["polingRangeDataEveryInSec"]);
	}

	function clone(obj) {
		if (null == obj || "object" != typeof obj) return obj;
		var copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
		}
		return copy;
	}

	var mModes = {};
	mModes["HOURS_12_MODE"] = {
		len_ms: 9*60*60*1000, // 9 hours
		step_short: 30*60*1000, // 30 minutes
		step_long: 150*60*1000 // 2 hours and 30 minutes
	};
	mModes["HOUR_MODE"] = {
		len_ms: 90*60*1000, // 1 hour and 30 minutes
		step_short: 5*60*1000, // 5 minutes
		step_long: 30*60*1000 // 30 minutes
	};
	mModes["MINUTES_MODE"] = {
		len_ms: 15*60*1000,  // 15 minutes
		step_short: 1*60*1000,  // 1 minute
		step_long: 5*60*1000  // 5 minutes
	};
	var mRangeLenModeMs = 3*60*60*1000 + 60*1000; // 3 hours

	var mDefaultMode = clone(mModes["MINUTES_MODE"]);
	
	self.elem = document.getElementById(viewid);
	
	if(self.elem == null){
		console.error("[CloudCameraTimeline] Not found element");
		return null;
	}
	
	if(self.elem.tagName != 'DIV'){
		console.error("[CloudCameraTimeline] Expected DIV tag but got " + self.elem.tagName);
		return null;
	}
	
	// default
	self.elem.classList.add("cloudcameratimeline");
	self.elem.classList.add("green");
	self.elem.classList.add("black");
	
	self.elem.innerHTML = ''
		+ '<div class="cloudcameratimeline-calendar" style="display: none"></div>'
		+ '<div class="cloudcameratimeline-left"></div>'
		+ '<div class="cloudcameratimeline-content">'
		+ '		<div class="cloudcameratimeline-scale"></div>'
		+ '		<div class="cloudcameratimeline-data"></div>'
		+ '		<div class="cloudcameratimeline-cursor"></div>'
		+ '</div>'
		+ '</div>'
		+ '<div class="cloudcameratimeline-right"></div>'
		+ '<div class="cloudcameratimeline-goto-live disabled"></div>'
		+ '';
		
	self.left_border = Math.floor(CloudHelpers.getCurrentTimeUTC() - mDefaultMode.len_ms/2);
	self.right_border = Math.floor(self.left_border + mDefaultMode.len_ms);
	var mElementContent = self.elem.getElementsByClassName('cloudcameratimeline-content')[0];
	var mElementData = self.elem.getElementsByClassName('cloudcameratimeline-data')[0];
	var mElementCalendar = self.elem.getElementsByClassName('cloudcameratimeline-calendar')[0];
	var mElementCursor = self.elem.getElementsByClassName('cloudcameratimeline-cursor')[0];
	var mElementScale = self.elem.getElementsByClassName('cloudcameratimeline-scale')[0];
	var mElementGotoLive = self.elem.getElementsByClassName('cloudcameratimeline-goto-live')[0];
	var mLeftArrow = self.elem.getElementsByClassName('cloudcameratimeline-left')[0];
	var mRightArrow = self.elem.getElementsByClassName('cloudcameratimeline-right')[0];

	var mCalendar = null;

	function _initCalendar() {
		if (mPlayer == null) {
			console.error("[TIMELINE] player is null") ;
			return;
		}

		if (mOptionCalendar) {
			mCalendar = new CloudCameraCalendarView(mPlayer.getCalendarContent(), options);
			mCalendar.onChangeDate = function(t, e) {
				if (mPlayer == null) {
					console.error("[TIMELINE] player is null") ;
					return;
				}
				mPlayer.setPosition(t - mTimezoneOffset);
				self.moveToPosition(t - mTimezoneOffset);
				mPlayer.play(e);
			}
		}
	}

	mElementCalendar.onclick = function() {
		if (mCalendar != null) {
			mCalendar.toggleCalendar();
		}
	}

	function _gotoLive(e){
		if(mPlayer != null && mPlayer.getSource() != null){
			var sClasses = mElementGotoLive.classList.value;
			if(sClasses.indexOf('now') == -1 && sClasses.indexOf('disabled') == -1){
				mPlayer.setPosition(CloudPlayer.POSITION_LIVE);
				mPlayer.play(e);
				self.moveToPosition(CloudHelpers.getCurrentTimeUTC());
			}
			if(sClasses.indexOf('now') != -1){
				self.moveToPosition(CloudHelpers.getCurrentTimeUTC());
			}
		}
	}
	mElementGotoLive.onclick = _gotoLive;

	function _updateScale(){
		if(mContainerWidth != mElementScale.offsetWidth){
			mContainerWidth = mElementScale.offsetWidth
		}
		mDistPx = mContainerWidth / (self.right_border - self.left_border); // TODO on init mode or resize
		mDistSec = (self.right_border - self.left_border) / mContainerWidth; // TODO on init mode or resize
	}
	_updateScale();

	function _normalizeT(t){
		var tmp = t;
		tmp = tmp - tmp%1000;
		tmp = tmp - tmp % mCacheDurationGrid;
		return tmp;
	}
	
	function _stopPolingCursor(){
		clearInterval(self._polingCursor);
		mElementGotoLive.classList.remove("now");
		mElementGotoLive.classList.add("disabled");
	}

	function _polingUpdateData(){
		if(mSource != null && mSource.type == 'camera'){
			var camid = mSource.getID();
			var startDT = CloudHelpers.formatUTCTime(mPolingDataMax);
			if (mConn._getAPI() == null) {
				return;
			}
			mConn._getAPI().storageRecordsFirst(camid, startDT, 1).done(function(r){
				var bNeedExecuteCallback = false;
				for (var i in r.objects) {
					var record = r.objects[i];
					var startUTCTime = CloudHelpers.parseUTCTime(record.start);
					var endUTCTime = CloudHelpers.parseUTCTime(record.end);
					
					var nsta = _normalizeT(startUTCTime);
					var nend = _normalizeT(endUTCTime);
					if (!mCacheRecords[nsta]) {
						mCacheRecords[nsta] = { status: 1, data: [] };
					}
					var nUpdated = 0;
					var maxVal = 0;
					var minVal = 0;
					for(var pr in mCacheRecords[nsta].data){
						var period = mCacheRecords[nsta].data[pr];
						if (period.end > maxVal) {
							maxVal = period.end;
						}
						if (period.start < startUTCTime && startUTCTime - 2000 < period.end) {
							if (endUTCTime > period.end) {
								mCacheRecords[nsta].data[pr].end = endUTCTime;
								nUpdated = 1;
								// console.log("Updated end period2 ", mCacheRecords[nsta].data[pr]);
								self._eventRedrawTimeline();
								bNeedExecuteCallback = true;
							} else {
								nUpdated = 2;
								// console.log("Skip");
							}
						}
					}
					if (nUpdated == 0) {
						if (maxVal < endUTCTime) {
							var period = {start: startUTCTime, end: endUTCTime};
							mCacheRecords[nsta].data.push(period);
							// console.warn("Added period: ", period);
							self._eventRedrawTimeline();
							bNeedExecuteCallback = true;
						}
					}

					if(endUTCTime > mPolingDataMax){
						mPolingDataMax = endUTCTime + CloudHelpers.ONE_SECOND;
					}
				}
				if (bNeedExecuteCallback) {
					mCallbacks.executeCallbacks(CloudPlayerEvent.TIMELINE_END_UPDATED, {});
					if (mPlayer != null) {
						setTimeout(mPlayer.onTimelineEndUpdate, 1);
					}
				}
			});
		}
	}

	function _stopPolingData(){
		clearInterval(mIntervalPolingData);
	}
	
	function _startPolingData(){
		clearInterval(mIntervalPolingData);
		mPolingDataMax = CloudHelpers.getCurrentTimeUTC() - CloudHelpers.ONE_MINUTE;
		mIntervalPolingData = setInterval(_polingUpdateData, 30000); // every 30 sec
	}

	function _calcPosition(t){
		return Math.floor((t - self.left_border) * mDistPx);
	}

	self.removeCallback = function(uniqname){
		mCallbacks.removeCallback(uniqname);
	}
	
	self.addCallback = function(uniqname, func){
		mCallbacks.addCallback(uniqname, func);
	}

	function _updateCursorPosition(opt){
		opt = opt || {};
		// console.log("self.left_border: " + self.left_border);
		// console.log("mCursorPosition: " + mCursorPosition);
		if(mPlayer != null && mPlayer.getSource() != null){
			if(mPlayer.isLive()){
				mElementGotoLive.classList.remove("disabled");
				mElementGotoLive.classList.add("now");
			}else{
				mElementGotoLive.classList.remove("disabled");
				mElementGotoLive.classList.remove("now");
			}
		}else{
			mElementGotoLive.classList.remove("now");
			mElementGotoLive.classList.add("disabled");
		}

		if(mCursorPosition < (self.left_border - 1000) || mCursorPosition > (self.right_border + 1000)){
			if(mElementCursor.style.display != 'none'){
				mElementCursor.style.display = 'none'
			}
			return;
		}
		if(mElementCursor.style.display != 'inline-block'){
			mElementCursor.style.display = 'inline-block';
		}
		if(mCursorPosition != 0){
			var le = _calcPosition(mCursorPosition);
			if(le > -5 && le < mContainerWidth){
				mElementCursor.style.left = (le + mLeftDataPadding) + 'px';
				
				// automove if near to ritght border
				var diff = mContainerWidth - le;
				var ritgh_diff_procents = (diff*100/mContainerWidth);
				if(ritgh_diff_procents < 3){
					if(opt.sender == "poling" || opt.sender == "click"){
						if(!self.isRange() && !mStartMove && !mAnimationToProgress){
							console.log("[TIMELINE] Auto move if not user drag");
							setTimeout(function(){
								console.log("[TIMELINE] mCursorPosition: " + mCursorPosition);
								self.moveToPosition(mCursorPosition);
							},100);
						}
					}
				}
			}else{
				if(mElementCursor.style.display != 'none'){
					mElementCursor.style.display = 'none'
				}
			}
		}else{
			if(mElementCursor.style.display != 'none'){
				mElementCursor.style.display = 'none'
			}
		}
	}

	function _startPolingCursor(){
		_stopPolingCursor();
		self._polingCursor = setInterval(function(){
			if(mPlayer != null){
				var currPos = mPlayer.getPosition();
				if (currPos != 0) {
					mCursorPosition = mPlayer.getPosition();
				}
				// console.log("mCursorPosition1: " + mCursorPosition);
			}else{
				// console.log("mCursorPosition2: " + mCursorPosition);
				mCursorPosition = 0;
			}
			_updateCursorPosition({sender: "poling"});
		},1000);
	}

	function _isLoadedData(left,right){
		var start = _normalizeT(left);
		var end = _normalizeT(right) + mCacheDurationGrid;
		if(end < start){
			console.error("[ERROR] start must be more than end");
			return false;
		}
		var bLoaded = true;
		for(var i = start; i <= end; i = i + mCacheDurationGrid){
			if(!mCacheRecords[i]){
				bLoaded = false;
			}else if (mCacheRecords[i].status != 1){
				bLoaded = false;
			}
		}
		return bLoaded;
	}

	function _updatedRecords(){
		var calltime = new Date().getTime();
		// console.log("_updatedRecords() start ");
		// self.el_data.innerHTML = '';
		var start = _normalizeT(self.left_border);
		var end = _normalizeT(self.right_border) + mCacheDurationGrid;
		if(end < start){
			console.error("[ERROR] start must be more than end");
			return false;
		}
		if(self.isRange()){
			if(start < mRangeMin_Normalize){
				console.error("[ERROR] Going beyond the range (start)");
				return false;
			}
			
			if(end > mRangeMax_Normalize){
				console.error("[ERROR] Going beyond the range (end)");
				return false;
			}
		}
		
		// document.getElementsByClassName("cloudcameratimeline-data")[0].getElementsByClassName("crect")
		// var crectList = document.getElementsByClassName("cloudcameratimeline-data")[0].getElementsByTagName("crect");
		var crectList = mElementData.getElementsByTagName("crect");
		var crect_i = 0;
		// console.log("Before: " + crectList.length);
		for(var i = start; i <= end; i = i + mCacheDurationGrid){
			var c = mCacheRecords[i];
			if(c && c.status == 1){
				for(var di = 0; di < c.data.length; di++){
					if(c.data[di].end < self.left_border)
						continue;
					if(c.data[di].start > self.right_border)
						continue;
					var start_rec_px_ = _calcPosition(c.data[di].start);
					var end_rec_px_ = _calcPosition(c.data[di].end);
					var sLeft = start_rec_px_ + "px";
					var sWidth = (end_rec_px_ - start_rec_px_) + "px";
					if(crect_i < crectList.length){
						crectList[crect_i].style.display = "";
						crectList[crect_i].style.left = sLeft;
						crectList[crect_i].style.width = sWidth;
						crect_i++;
					}else{
						var el = '<crect style="left: ' + sLeft + '; width: ' + sWidth + '"></crect>';
						mElementData.innerHTML += el;
						crect_i++;
					}
				}
			}
		}
		// console.log("After: " + crectList.length);
		for(var i = crect_i; i < crectList.length; i++){
			if(crectList[i].style.display != "none"){
				crectList[i].style.display = "none";
			}
		}
		// console.log("_updatedRecords() end " + (new Date().getTime() - calltime) + " ms, count elements: " + mElementData.childElementCount);
	}
	
	function _loadRecordsPortion(i){
		// console.log("_loadRecordsPortion(" + i + ")");
		var p = CloudHelpers.promise();
		var ca = mCacheRecords[i];
		if(ca && ca.status == 1) {
			p.resolve();
			return p;
		}
		
		if(mSource != null){
			mCacheRecords[i] = {};
			mCacheRecords[i].status = 0;
			mCacheRecords[i].data = [];

			mSource.getTimeline(i, i + mCacheDurationGrid).done(function(timeline){
				// console.warn(timeline);
				if(mCacheRecords[i]){
					mCacheRecords[i].status = 1;
					mCacheRecords[i].data = timeline.periods;
				}
				_updatedRecords();
			}).fail(function(){
				if(mCacheRecords[i]){
					mCacheRecords[i].status = -1;
				}
				p.reject();
			})
		}else{
			p.reject();
		}
		return p;
	}
	
	function _loadData(left,right){
		// console.log("_loadData(" + left + "," + right + ")");
		var start = _normalizeT(left);
		var end = _normalizeT(right) + mCacheDurationGrid;
		if(end < start){
			console.error("[ERROR] start must be more than end");
			return false;
		}
		
		if(self.isRange()){
			if(left < mRangeMin_Normalize){
				console.error("[ERROR] Going beyond the range (left)");
				return false;
			}
			
			if(end > mRangeMax_Normalize){
				console.error("[ERROR] Going beyond the range (right)");
				return false;
			}
		}

		if (mSource != null) {
			// console.warn("TODO load data");
			for(var i = start; i <= end; i = i + mCacheDurationGrid){
				var c = mCacheRecords[i];
				if(!c || (c && c.status == -1)){
					_loadRecordsPortion(i);
				}
			}
		}
	}
	
	function _isDifferentTimelinePeriods(data1, data2) {
		if (data1.length == 0 && data2.length == 0) {
			return false;
		}
		// check the data
		for (var i1 = 0; i1 < data1.length; i1++) {
			var p1 = data1[i1];
			var bFound = false;
			for (var i2 = 0; i2 < data2.length; i2++) {
				var p2 = data2[i2];
				if (p1.start == p2.start && p1.end == p2.end) {
					bFound = true;
				}
			}
			if (!bFound) {
				return true;
			}
		}
		// check the data
		for (var i2 = 0; i2 < data2.length; i2++) {
			var p2 = data2[i2];
			var bFound = false;
			for (var i1 = 0; i1 < data1.length; i1++) {
				var p1 = data1[i1];
				if (p1.start == p2.start && p1.end == p2.end) {
					bFound = true;
				}
			}
			if (!bFound) {
				return true;
			}
		}
		return false;
	}
	
	function _reloadData(i) {
		mSource.getTimeline(i, i + mCacheDurationGrid).done(function(timeline){
			if (_isDifferentTimelinePeriods(mCacheRecords[i].data, timeline.periods)) {
				mCacheRecords[i].data = timeline.periods;
				_updatedRecords();
			}
		})
	}

	function _reloadRangeData() {
		console.log("_reloadRangeData");
		var start = _normalizeT(mRangeMin);
		var end = _normalizeT(mRangeMax) + mCacheDurationGrid;
		if (mSource != null) {
			for(var i = start; i <= end; i = i + mCacheDurationGrid){
				var c = mCacheRecords[i];
				if (c && c.status == 1) { 
					_reloadData(i);
				}
			}
		}
	}

	function _stopPolingRangeData() {
		console.log("_stopPolingRangeData");
		clearInterval(mPolingRangeDataInterval);
	}

	function _startPolingRangeData() {
		_stopPolingRangeData();
		// console.log("_startPolingRangeData ", mRangePolingDataEveryInSec);
		if (mRangePolingDataEveryInSec != null && self.isRange()) {
			// console.log("_startPolingRangeData start");
			mPolingRangeDataInterval = setInterval(function () {
				if (mSource != null) {
					_reloadRangeData();
				}
			}, mRangePolingDataEveryInSec*1000);
		}
	}

	self.reloadRangeData = function() {
		_reloadRangeData();
	}

	function _disposeTimeline(){
		console.warn("_disposeTimeline");
		mPolingDataMax = 0;
		mCacheRecords = {};
		mElementData.innerHTML = "";
		_stopPolingCursor();
		_stopPolingData();
		_stopPolingRangeData();
		if (mCalendar != null) {
			mCalendar.dispose();
		}
	}
	
	function _changedSource(){
		console.warn("_changedSource");
		_disposeTimeline();
		if(mPlayer != null){
			mSource = mPlayer.getSource();
			if(mSource){
				if (mUseTimezone) {
					mTimezoneOffset = CloudHelpers.getOffsetTimezone(mUseTimezone);
				} else {
					mTimezoneOffset = CloudHelpers.getOffsetTimezone(mSource.getTimezone());
				}
				mConn = mSource._getConn();	
				if (mCalendar != null) {
					mCalendar.setSource(mSource);
				}
				_startPolingCursor();
				_startPolingData();
				_startPolingRangeData();
			}else{
				mConn = null;
				mSource = null;
				mTimezoneOffset = 0;
			}
		}else{
			mSource = null;
		}
		self.redrawTimeline({sender: "changed_source"});
	}
	
	function _playerEvent(evnt, args){
		console.warn("_playerEvent ", evnt);
		if(evnt.name == "SOURCE_CHANGED"){
			_changedSource();
			// mCalendar./
		}else if(evnt.name == "POSITION_JUMPED"){
			console.warn("POSITION_JUMPED", mPlayer)
			mCursorPosition = args.new_pos;
			_updateCursorPosition({sender: "pos jumped"});
			self.moveToPosition(args.new_pos);
			
		}
	}

	function _recalculateDataPaddings(){
		mLeftDataPadding = 0;
		if(mLeftArrow.style.display != "none"){
			mLeftDataPadding += 50;
		}
		if(mElementCalendar.style.display != "none"){
			mLeftDataPadding += 50;
		}
		mRightDataPadding = 0;
		if(mRightArrow.style.display != "none"){
			mRightDataPadding += 50;
		}
		if(mElementGotoLive.style.display != "none"){
			mRightDataPadding += 50;
		}
		if(mLeftDataPadding == 0){
			mLeftDataPadding = 2
		}
		if(mRightDataPadding == 0){
			mRightDataPadding = 2;
		}

		mElementContent.style.width = "calc(100% - " + (mLeftDataPadding + mRightDataPadding) + "px)";
		mElementContent.style.left = mLeftDataPadding + "px";
		mElementData.style.width = "calc(100% - " + (mLeftDataPadding + mRightDataPadding) + "px)";
		mElementData.style.left = mLeftDataPadding + "px";
		mElementScale.style.width = "calc(100% - " + (mLeftDataPadding + mRightDataPadding) + "px)";
		mElementScale.style.left = mLeftDataPadding + "px";
	}

	self.hideCalendarButton = function(){
		if(mElementCalendar.style.display != "none"){
			mElementCalendar.style.display = "none";
		}
		_recalculateDataPaddings();
		self.redrawTimeline();
	}

	self.showCalendarButton = function(){
		if(mElementCalendar.style.display == "none"){
			mElementCalendar.style.display = "";
		}
		_recalculateDataPaddings();
		self.redrawTimeline();
	}

	self.hideArrowsButtons = function(){
		if(mLeftArrow.style.display != "none"){
			mLeftArrow.style.display = "none";
		}

		if(mRightArrow.style.display != "none"){
			mRightArrow.style.display = "none";
		}
		_recalculateDataPaddings();

		self.redrawTimeline();
	}

	self.showArrowsButtons = function(){
		if(mLeftArrow.style.display == "none"){
			mLeftArrow.style.display = "";
		}
		if(mRightArrow.style.display == "none"){
			mRightArrow.style.display = "";
		}
		_recalculateDataPaddings();
		self.redrawTimeline();
	}

	self.hideGotoLiveButton = function(){
		if(mElementGotoLive.style.display != "none"){
			mElementGotoLive.style.display = "none";
		}
		_recalculateDataPaddings();
		self.redrawTimeline();
	}

	self.showGotoLiveButton = function(){
		if(mElementGotoLive.style.display == "none"){
			mElementGotoLive.style.display = "";
		}
		_recalculateDataPaddings();
		self.redrawTimeline();
	}

	self.setPlayer = function(player){
		_disposeTimeline();
		if (mPlayer) {
			mPlayer.removeCallback(mViewID);
		}
		if (player) {
			mPlayer = player;
			_initCalendar();
			_changedSource();
			mPlayer.addCallback(mViewID, _playerEvent);
		} else {
			mPlayer = null;
			_changedSource();
		}
	}

	self.setRange = function(startPos,endPos){
		console.warn("[TIMELINE] setRange todo");
		mRangeMin = startPos;
		mRangeMax = endPos;
		mRangeMin_Normalize = _normalizeT(startPos);
		mRangeMax_Normalize = _normalizeT(endPos) + mCacheDurationGrid;
		self.elem.classList.add("range");
		_updateScale();
		var range_len = mRangeMax - mRangeMin;
		var start_t = mRangeMin;
		var end_t = mRangeMax;
		
		if (range_len <= mRangeLenModeMs) {
			self.hideArrowsButtons();
			mDefaultMode.len_ms = range_len;
			self.left_border = Math.floor(start_t);
			self.right_border = Math.floor(end_t);
		} else {
			end_t = mRangeMin + mRangeLenModeMs;
			mDefaultMode.len_ms = mRangeLenModeMs;

			// correct if current time
			var t = CloudHelpers.getCurrentTimeUTC();
			if(t < mRangeMax && t > mRangeMin){
				if(t > end_t){
					end_t = t + Math.floor(mRangeLenModeMs/2);
					if(end_t > mRangeMax){
						end_t = mRangeMax;
					}
					start_t = end_t - mRangeLenModeMs;
				}
			}
			self.left_border = Math.floor(start_t);
			self.right_border = Math.floor(end_t);
		}

		// self.animationTo(start_t, end_t, newmode);
		self.redrawTimeline({sender: "animation"});
	}

	self.isRange = function(){
		return mRangeMin != -1 && mRangeMax != -1;
	}
	
	self.resetRange = function(){
		console.warn("[TIMELINE] resetRange");
		mRangeMin = -1;
		mRangeMax = -1;
		self.elem.classList.remove("range");
		self.showArrowsButtons();
		_updateScale();
	}

	self.months = ['Jan','Feb','Mar','Apr','May','Jun', 'Jul', 'Aug', 'Spt', 'Oct', 'Nov', 'Dec'];

	self.dateFormat = function(t, bMonth){
		var str = "";
		if(self.isRange()){
			var t = Math.floor((t - mRangeMin)/1000);
			var nSeconds = t % 60;
			t = (t - nSeconds) / 60;
			var nMinutes = t % 60;
			var nHours = (t - nMinutes) / 60;
			var str = ("00" + nHours).slice(-2) + ":"
				+ ("00" + nMinutes).slice(-2);
		}else{
			var d = new Date();
			d.setTime(t + mTimezoneOffset);

			var str = ("00" + d.getUTCHours()).slice(-2) + ":"
				+ ("00" + d.getUTCMinutes()).slice(-2);
			if(bMonth){
				str += " (" + d.getUTCDate() + " " + self.months[d.getUTCMonth()] + ")";
			}
		}
		return str;
	}

	self._eventRedrawTimeline = function(){
		setTimeout(self.redrawTimeline,10);
	}
	
	self.redrawTimeline = function(opt){
		// console.log("redrawTimeline");
		opt = opt || {};
		if(mTimelineDrawing) {
			console.warn("redrawTimeline busy");
			return;
		}
		mTimelineDrawing = true;
		_updateScale();
		
		var left_border_short = Math.floor(self.left_border / mDefaultMode.step_short);
		var right_border_short = Math.floor(self.right_border / mDefaultMode.step_short) + 1;
		
		// left and right arrows
		if(self.isRange()){
			if(self.left_border <= mRangeMin){
				mLeftArrow.classList.add("disabled");
			}else{
				mLeftArrow.classList.remove("disabled");
			}
				
			if(self.right_border >= mRangeMax){
				mRightArrow.classList.add("disabled");
			}else{
				mRightArrow.classList.remove("disabled");
			}
		}
		
		// mElementData.innerHTML = '';
		mElementScale.innerHTML = '<vtext id="texttimelinetest"><vtext>';
		var test_text = document.getElementById('texttimelinetest');
		test_text.innerHTML = self.dateFormat(self.left_border, false);
		var textWidth = test_text.clientWidth;
		test_text.innerHTML = self.dateFormat(self.left_border, true);
		var textWidthWithMonth = test_text.clientWidth;

		// correct step long (if text was biggest)
		var step_long = mDefaultMode.step_long;
		while((textWidth)*mDistSec > step_long){
			step_long += mDefaultMode.step_long;
		};
		
		var nTextWithMonth = step_long*2;
		
		mElementScale.innerHTML += '<hline></hline>';
		for(var i = left_border_short; i < right_border_short; i++){
			var t = i*mDefaultMode.step_short;
			var pos = _calcPosition(t);
			if(t % mDefaultMode.step_long == 0){
				var bTextWithMonth = t % nTextWithMonth == 0;
				var tw = (bTextWithMonth ? textWidthWithMonth : textWidth);
				var tpos = pos - tw/2;
				
				mElementScale.innerHTML += '<vline style="left: ' + pos + 'px"></vline>';

				if(t % step_long == 0){
					mElementScale.innerHTML += '<vtext style="left: ' + tpos + 'px">' + self.dateFormat(t,bTextWithMonth) + '</vtext>';	
				}
			}else{
				mElementScale.innerHTML += '<vlineshort style="left: ' + pos + 'px"></vline>';
			}
		}

		// mElementData.innerHTML = '';
		_updateCursorPosition(opt);
		if(mSource != null){
			if(_isLoadedData(self.left_border, self.right_border)){
				_updatedRecords();
			}else{
	
				if(self.isRange()){
					if(self.left_border < mRangeMin_Normalize || self.right_border > mRangeMax_Normalize){
						// console.log("skip");
						mTimelineDrawing = false;
						return;
					}
				}
				// console.log("don't skip");
				_loadData(self.left_border, self.right_border);
			}
		}
		mTimelineDrawing = false;
	}
	self.redrawTimeline();
	
	window.addEventListener("resize", function(){
		console.warn("resize");
		self.redrawTimeline();
	});

	self.animationTo = function(l,r, mode_new){
		// console.log("animationTo");
		mAnimationToProgress = true;
		mode_new = mode_new || mDefaultMode;
		// TODO lock timeline
		var steps = 25; // for ~1 sec
		var len_left = l - self.left_border;
		var len_right = r - self.right_border;
		if(len_left == 0 && len_right == 0){
			console.warn("Already in current position");
			self.redrawTimeline({sender: "animation"});
			mAnimationToProgress = false;
			return;
		}
		var len_step_short = mode_new.step_short - mDefaultMode.step_short;
		var len_step_long = mode_new.step_long - mDefaultMode.step_long;
		var bChangedSteps = (len_step_short != 0 && len_step_long != 0);
		var lb = self.left_border;
		var rb = self.right_border;
		var st = [];
		var p = 3.14/steps;
		var sum = 0;
		for(var i = 0; i < steps; i++){
			var k = Math.sin(i*p);
			sum += k;
			st.push({k: k});
		}
		var step_sl = len_left/sum;
		var step_sr = len_right/sum;
		var short_s = len_step_short/sum;
		var long_s = len_step_long/sum;

		// init first value
		var k0 = st[0].k;
		st[0].left = self.left_border + k0 * step_sl;
		st[0].right = self.right_border + k0 * step_sr;
		if(bChangedSteps){
			st[0].step_short = mDefaultMode.step_short + k0 * short_s;
			st[0].step_long = mDefaultMode.step_long + k0 * long_s;
		}

		for(var i = 1; i < steps; i++){
			var k = st[i].k;
			st[i].left = st[i-1].left + k*step_sl;
			st[i].right = st[i-1].right +  k*step_sr;
			if(bChangedSteps){
				st[i].step_short = st[i-1].step_short + k * short_s;
				st[i].step_long = st[i-1].step_short + k * long_s;
			}
		}
		// correction last value
		st[steps - 1].left = l;
		st[steps - 1].right = r;

		var counter = 0;
		function anumation_timeline_(){
			self.left_border = Math.floor(st[counter].left);
			self.right_border = Math.floor(st[counter].right);
			
			if(bChangedSteps){
				mDefaultMode.step_short = Math.floor(st[counter].step_short);
				mDefaultMode.step_long = Math.floor(st[counter].step_long);
			}
			// _updateScale();
			self.redrawTimeline({sender: "animation"});
			counter++;
			if(counter < steps){
				setTimeout(anumation_timeline_, 10);
			}else{
				if(bChangedSteps){
					mDefaultMode = clone(mode_new);
				}
				self.left_border = l;
				self.right_border = r;
				self.redrawTimeline({sender: "animation"});
				mAnimationToProgress = false;
			}
		}
		setTimeout(anumation_timeline_, 15);
	}

	self.fixBorderLimit = function(left_b,right_b){
		var res = {};
		res.left = left_b;
		res.right = right_b;
		
		if(self.isRange()){
			if(res.right > mRangeMax){
				res.right = mRangeMax;
				res.left = res.right - mDefaultMode.len_ms;
			}
			if(res.left < mRangeMin){
				res.left = mRangeMin;
				res.right = res.left + mDefaultMode.len_ms;
			}
		}else{
			var max = CloudHelpers.getCurrentTimeUTC() + mDefaultMode.len_ms/2;
			if(res.right > max){
				var d = res.right - max;
				res.left = res.left - d;
				res.right = res.right - d;
			}
		}
		return res;
	}

	self.moveToRight = function(){
		var diff = self.right_border - self.left_border;
		diff = Math.floor(0.75*diff);
		var l = self.left_border + diff;
		var r = self.right_border + diff;
		var f = self.fixBorderLimit(l,r);
		self.animationTo(f.left,f.right);
	}
	mRightArrow.onclick = self.moveToRight;

	self.moveToLeft = function(){
		var diff = self.right_border - self.left_border;
		diff = Math.floor(0.75*diff);
		var l = self.left_border - diff;
		var r = self.right_border - diff;
		var f = self.fixBorderLimit(l,r);
		self.animationTo(f.left,f.right);
	}
	mLeftArrow.onclick = self.moveToLeft;

	self.moveToPosition = function(t){
		console.log("moveToPosition");
		var diff2 = Math.floor((self.right_border - self.left_border)/2);
		var newLeft = t - diff2;
		var newRight = t + diff2;
		if(self.isRange()){
			if(newLeft < mRangeMin || newRight > mRangeMax){
				console.error("Can not move beyond range")
				return;
			}
		}
		self.animationTo(newLeft, newRight);
	}

	self.mousedown = function(event){
		if(!mStartMove){
			// console.log("mousedown", event);
			mFirstMoveX = event.offsetX;
			mLastMoveX =  event.offsetX;
			mStartMove = true;
			mElementContent.style.cursor = "move";
			try{
				if (window.getSelection) {
					window.getSelection().removeAllRanges();
				} else if (document.selection) {
					document.selection.empty();
				}
			}catch(e){
				console.error(e)
			}
			
		}
	}

	self.mousemove = function(event){
		if(mStartMove && !self.isRange()){
			// console.log("mousemove", event);
			var nDiff = event.offsetX - mLastMoveX;
			if(event.movementX !== undefined){ // not supported in safari & ie
				nDiff = event.movementX;
			}
			if(nDiff != 0){
				var diff_t = Math.floor(nDiff*mDistSec);
				mLastMoveX += nDiff;
				var f = self.fixBorderLimit(self.left_border - diff_t, self.right_border - diff_t);
				self.left_border = f.left;
				self.right_border = f.right;
				self.redrawTimeline({sender: "mousemove"});
			}
		}
	}

	self.mouseup = function(event){
		if(mStartMove){
			// console.log("mouseup", event);
			mElementContent.style.cursor = "default";
			mStartMove = false;	
		}
	}

	self.mouseout = function(event){
		if(mStartMove){
			// console.log("mouseout", event);
			if(event.relatedTarget && event.relatedTarget.nodeName == "CRECT"
		      || event.target && event.target.nodeName == "CRECT"){
				return; // skip
			}

			if(event.relatedTarget && event.relatedTarget.className == "cloudcameratimeline-cursor"
				|| event.target && event.target.className == "cloudcameratimeline-cursor"){
				return; // skip
			}

			mElementContent.style.cursor = "default";
			mStartMove = false;
		}
	}

	mElementContent.addEventListener('mousedown', self.mousedown);
	mElementContent.addEventListener('mousemove', self.mousemove);
	mElementContent.addEventListener('mouseup', self.mouseup);
	mElementContent.addEventListener('mouseout', self.mouseout);

	function _clickOnData(event){
		if (mPlayer == null) {
			console.log("[CloudCameraTimeline] player is null");
			return;
		}
		
		if (mSource == null) {
			console.log("[CloudCameraTimeline] source is null");
			return;
		}

		if(mFirstMoveX == mLastMoveX){
			var rect = event.currentTarget.getBoundingClientRect();
			var offsetX = event.clientX - rect.left;
			var t = Math.floor(offsetX*mDistSec);
			t = t + self.left_border;
			if(t >= CloudHelpers.getCurrentTimeUTC() && mPlayer){
				mCursorPosition = CloudHelpers.getCurrentTimeUTC();
				_updateCursorPosition({sender: "click"});
				mPlayer.stop("by_timeline_1");
				mPlayer.setPosition(CloudPlayer.POSITION_LIVE);
				mPlayer.play();
				mCallbacks.executeCallbacks(CloudPlayerEvent.USER_CLICKED_ON_TIMELINE, {pos: CloudPlayer.POSITION_LIVE});
			} else if(t && mPlayer){
				mCursorPosition = t;
				_updateCursorPosition({sender: "click"});
				mPlayer.stop("by_timeline_2");
				mPlayer.setPosition(t);
				mPlayer.play();
				mCallbacks.executeCallbacks(CloudPlayerEvent.USER_CLICKED_ON_TIMELINE, {pos: t});
			}else{
				_updateCursorPosition({sender: "click"});
			}
		}
	}
	mElementData.onclick = _clickOnData;

	self.setMode = function(mode){
		var mode_new = null;
		if(mModes[mode.name]){
			mode_new = mModes[mode.name];
		}else{
			console.error('Unknown timeline mode')
			return -1;
		}
		var _center = (self.right_border - self.left_border)/2 + self.left_border;
		var mode_new_copy = clone(mode_new);
		var diff = mode_new.len_ms / 2;
		self.animationTo(_center - diff, _center + diff, mode_new_copy);
		return 0;
	}

	self.getMode = function(){
		return mDefaultMode;
	}

	self.destroy = function() {
		clearInterval(mIntervalPolingData);
	}
	
	// apply options
	if(options["arrows"] !== undefined){
		if(options["arrows"] == true){
			self.showArrowsButtons();
		}else{
			self.hideArrowsButtons();
		}
	}

	if(options["gotoLive"] !== undefined){
		if(options["gotoLive"] == true){
			self.showGotoLiveButton();
		}else{
			self.hideGotoLiveButton();
		}
	}

	if(options["range"] !== undefined){
		var rangeMin = options["range"]["min"];
		var rangeMax = options["range"]["max"];
		self.setRange(rangeMin, rangeMax);
	}

	if(mOptionCalendar){
		self.showCalendarButton();
	}else{
		self.hideCalendarButton();
	}
	console.log("options: ", options);
};

window.CloudCameraCalendarView = function(elem, options){
	var mElementContent = elem;
	options = options || {};
	var self = this;
	var mConn = null;
	var mActivity = {};
	var mCamID = null;
	var mLastUpdated = null;
	var mSelectedMonth = new Date().getMonth();
	var mSelectedYear = new Date().getFullYear();
	var mMinMonth = mSelectedYear * 100 + mSelectedMonth;
	var mMaxMonth = mSelectedYear * 100 + mSelectedMonth;
	var mTimezoneOffset = 0;

	function _generateMonthName(nYear, nMonth) {
		var name_month = ['January','February','March','April','May','June','July','August','September','October','November','December'];
		return name_month[nMonth%12] + ' ' + nYear;
	}

	function _formatId(nYear, nMonth, nDay) {
		return nYear + "-" + ("00" + (nMonth+1)).slice(-2) + "-" + ("00" + nDay).slice(-2);
	}

	function _generateMonthDays(nYear, nMonth) {
		var dt = new Date();
		var startDate = 1;
		dt.setFullYear(nYear);
		dt.setMonth(nMonth);
		dt.setDate(1);
		var startDay = dt.getDay();
		var prevMonth = (nMonth-1 + 12) % 12;
		var prevYear = nMonth == 0 ? nYear - 1 : nYear;
		var nextMonth = (nMonth+1 + 12) % 12;
		var nextYear = nMonth == 11 ? nYear + 1 : nYear;

		// 0 - Sunday, 1 - Moday, 2 - Thuesday...
		var lastDay = new Date(nextYear, nextMonth, 0);
		var endDate = lastDay.getDate();
		var endDay = lastDay.getDay();

		var prevEndDay = new Date(prevYear, prevMonth+1, 0).getDate();
		var name_days = ['Su', 'Mo', 'To', 'We', 'Th', 'Fr', 'Sa'];
		var days = [];
		prevEndDay = prevEndDay - startDay + 1;
		for (var i = 0; i < startDay; i++) {
			days.push({d: prevEndDay, cl: 'disabled', dt: _formatId(nextYear, nextMonth, prevEndDay)});
			prevEndDay++;
		}

		for (var i = startDate; i <= endDate; i++) {
			days.push({d: i, cl: '', dt: _formatId(nYear, nMonth, i)});
		}
		var d = 0;
		for (var i = endDay+1; i < 7; i++) {
			d++;
			days.push({d: d, cl: 'disabled', dt: _formatId(nextYear, nextMonth, d)});
		}

		for (var i = 0; i < mActivity.length; i++) {
			var activeDay = mActivity[i];
			for (var dai = 0; dai < days.length; dai++) {
				if (days[dai].dt === activeDay) {
					days[dai].cl += "active-day";
				}
			}
		}

		var html = '<div class="cal-row">';
		for (var i = 0; i < name_days.length; i++) {
			html += '<div class="cal-day name">' + name_days[i] + '</div>';
		}
		html += '</div>';
		html += '<div class="cal-row">';
		for (var i = 0; i < days.length; i++) {
			if (i % 7 == 0 && i > 0) {
				html += '</div><div class="cal-row">'
			}
			html += '<div class="cal-day ' + days[i].cl + '" dt="' + days[i].dt + '">' + days[i].d + '</div>';
		}
		html += '</div>';
		return html;
	}

	mElementContent.innerHTML = ''
		+ '	<div class="cloudcameracalendar-header">'
		+ '		<div class="cloudcameracalendar-prev-month">&#9664;</div>'
		+ '		<div class="cloudcameracalendar-title">' + _generateMonthName(mSelectedYear, mSelectedMonth) + '</div>'
		+ '		<div class="cloudcameracalendar-next-month">&#9654;</div>'
		+ '		<div class="cloudcameracalendar-close"></div>'
		+ "	</div>"
		+ "	<div class='cloudcameracalendar-table'>"
		+ _generateMonthDays(mSelectedYear, mSelectedMonth)
		+ "	</div>";

	var mElementClose = mElementContent.getElementsByClassName('cloudcameracalendar-close')[0];
	var mElementPrev = mElementContent.getElementsByClassName('cloudcameracalendar-prev-month')[0];
	var mElementNext = mElementContent.getElementsByClassName('cloudcameracalendar-next-month')[0];
	var mElementTable = mElementContent.getElementsByClassName('cloudcameracalendar-table')[0];
	var mElementTitle = mElementContent.getElementsByClassName('cloudcameracalendar-title')[0];

	mElementClose.onclick = function(e){
		// console.log("[CALENDAR] close ");
		e.preventDefault();
		e.stopPropagation();
		mElementContent.style.display = "";
		return true;
	}
	
	self.renderContent = function() {
		// console.log("[CALENDAR] ", mActivity);
		mElementTitle.innerHTML = _generateMonthName(mSelectedYear, mSelectedMonth);
		mElementTable.innerHTML = _generateMonthDays(mSelectedYear, mSelectedMonth);

		var active_days = mElementContent.getElementsByClassName('active-day');
		for (var i = 0; i < active_days.length; i++) {
			active_days[i].onclick = function(ev){
				var _dt = this.getAttribute('dt');
				if (self.onChangeDate) {
					self.onChangeDate(Date.parse(_dt), ev);
				}
			}
		}
		var _currMonth = mSelectedYear*100 + mSelectedMonth;
		if (_currMonth <= mMinMonth) {
			mElementPrev.style.display = 'none';
		} else {
			mElementPrev.style.display = '';
		}

		if (_currMonth >= mMaxMonth) {
			mElementNext.style.display = 'none';
		} else {
			mElementNext.style.display = '';
		}
	}
	self.renderContent();

	self.updateActivity = function() {
		if (mConn == null) {
			console.log("[CALENDAR] mConn is null");
			mActivity = [];
			self.renderContent();
			return;
		}
		mConn._getAPI().storageActivity(mCamID, true).done(function(r){
			mLastUpdated = new Date();
			mActivity = r.objects;
			for (var i = 0; i < mActivity.length; i++) {
				var s = mActivity[i].split("-");
				var _month = parseInt(s[1],10)-1;
				var val = parseInt(s[0],10)*100 + _month;
				if (i == 0) {
					mMinMonth = val;
					mMaxMonth = val;
				} else {
					mMinMonth = Math.min(val, mMinMonth);
					mMaxMonth = Math.max(val, mMaxMonth);
				}
			}
			self.renderContent();
		})
	}

	self.setSource = function(mSource) {
		mSelectedMonth = new Date().getMonth();
		mSelectedYear = new Date().getFullYear();
		mLastUpdated = null;

		if (mSource != null) {
			mConn = mSource._getConn();	
			mCamID = mSource.getID();
			// reset month and year
			mTimezoneOffset = CloudHelpers.getOffsetTimezone(mSource.getTimezone());
			self.updateActivity();
		} else {
			mConn = null;
			mTimezoneOffset = 0;
			mActivity = [];
			self.renderContent();
		}
	}

	self.dispose = function() {
		mConn = null;
	}

	mElementPrev.onclick = function() {
		mSelectedMonth = mSelectedMonth - 1;
		if (mSelectedMonth < 0) {
			mSelectedMonth = 11;
			mSelectedYear = mSelectedYear - 1;
		}
		self.renderContent();
	}

	mElementNext.onclick = function() {
		mSelectedMonth =  mSelectedMonth + 1;
		if (mSelectedMonth > 11) {
			mSelectedMonth = 0;
			mSelectedYear = mSelectedYear + 1;
		}
		self.renderContent();
	}
	
	self.isVisible = function() {
		return mElementContent.style.display !== '';
	}

	self.showCalendar = function() {
		console.log("[CALENDAR] show");
		mElementContent.style.display = "block";
		if (mConn == null) {
			self.renderContent();
			return;
		}
		if (mLastUpdated == null) {
			self.updateActivity();
			return;
		}
		var dt = new Date();
		dt.setUTCHours(24);
		dt.setUTCMinutes(0);
		dt.setUTCSeconds(0);

		if (new Date().getTime() > dt.getTime() && mLastUpdated.getTime() < dt.getTime()) {
			self.updateActivity();
		}
	}

	self.hideCalendar = function() {
		console.log("[CALENDAR] hide");
		mElementContent.style.display = '';
	}

	self.toggleCalendar = function() {
		console.log("[CALENDAR] toggle");
		if (self.isVisible()) {
			self.hideCalendar();
		} else {
			self.showCalendar();
		}
	}
};

window.CloudSessionTimeline = function(viewid){
	var self = this;
	var mSource = null;
	var mModes = {};
	mModes["h12"] = { to: "min", len_ms: 9*60*60*1000, step_short: 30*60*1000, step_long: 150*60*1000 }; // 2,5 hr, step 30 min
	mModes["hr"] = { to: "h12", len_ms: 90*60*1000, step_short: 5*60*1000, step_long: 30*60*1000 }; // 30 min, step 5 min
	mModes["min"] = { to: "hr", len_ms: 15*60*1000, step_short: 1*60*1000, step_long: 5*60*1000 }; // 5 min, step 1 min
	
	function clone(obj) {
		if (null == obj || "object" != typeof obj) return obj;
		var copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
		}
		return copy;
	}

	var mDefaultMode = clone(mModes["min"]);
	
	self.elem = document.getElementById(viewid);
	
	if(self.elem == null){
		console.error("[CloudPlayerTimeline] Not found element");
		return null;
	}
	
	if(self.elem.tagName != 'DIV'){
		console.error("[CloudPlayerTimeline] Expected DIV tag but got " + self.elem.tagName);
		return null;
	}
	
	// default
	self.elem.classList.add("cloudplayertimeline");
	self.elem.classList.add("green");
	self.elem.classList.add("black");
	
	self.elem.innerHTML = ''
		+ '<div class="cloudplayertimeline-content">'
		+ '		<div class="cloudplayertimeline-scale session"></div>'
		+ '		<div class="cloudplayertimeline-data session"></div>'
		+ '		<div class="cloudplayertimeline-cursor"></div>'
		+ '</div>';
		
	self.left_border = CloudHelpers.getCurrentTimeUTC() - mDefaultMode.len_ms/2;
	self.right_border = self.left_border + mDefaultMode.len_ms;
	
	self.el_data = self.elem.getElementsByClassName('cloudplayertimeline-data')[0];
	var el_cursor = self.elem.getElementsByClassName('cloudplayertimeline-cursor')[0];
	self.el_scale = self.elem.getElementsByClassName('cloudplayertimeline-scale')[0];

	function _stopPolingCursor(){
		clearInterval(self._polingCursor);
	}
	
	function _startPolingCursor(){
		_stopPolingCursor();
		self._polingCursor = setInterval(function(){
			var t = self.plr.getPosition();
			if(t < self.left_border || t > self.right_border){
				if(el_cursor.style.display != 'none'){
					el_cursor.style.display = 'none'
				}
			}
			if(el_cursor.style.display != 'inline-block'){
				el_cursor.style.display = 'inline-block';
			}
			if(t != 0){
				var le = self.calcPosition(t) + 50 + 'px';
				el_cursor.style.left = le;
			}
		},1000);
	}
	
	self.setPlayer = function(player){
		_stopPolingCursor();
		self.plr = player;
		if(self.plr){
			_startPolingCursor();
		}
	}

	self.calcPosition = function(t){
		return Math.floor((t - self.left_border) * self.distPx);
	}

	self.months = ['Jan','Feb','Mar','Apr','May','Jun', 'Jul', 'Aug', 'Spt', 'Oct', 'Nov', 'Dec'];
	
	self.dateFormat = function(t, bMonth){
		var d = new Date();
		d.setTime(t);
		var str = ("00" + d.getUTCHours()).slice(-2) + ":"
			+ ("00" + d.getUTCMinutes()).slice(-2);
		if(bMonth)
			str += " (" + d.getUTCDate() + " " + self.months[d.getUTCMonth()] + ")";
		return str;
	}
	
	self.redrawTimeline = function(){
		if(self.plr != null){
			mSource = self.plr.getSource();
		}else{
			mSource = null;
		}
		if(mSource != null){
			self.left_border = mSource.getStartTime();
			self.right_border = mSource.getEndTime();
			mDefaultMode.step_short = (self.right_border - self.left_border)/20;
			// TODO 
			// 120000
		}
		el_cursor.style.display = 'none'; // hide
		
		self.containerWidth = self.el_scale.offsetWidth;
		self.distPx = self.containerWidth / (self.right_border - self.left_border); // TODO on init mode
		self.distSec = (self.right_border - self.left_border) / self.containerWidth; // TODO on init mode
		
		var left_border_short = Math.floor(self.left_border / mDefaultMode.step_short);
		var right_border_short = Math.floor(self.right_border / mDefaultMode.step_short) + 1;
		
		self.el_data.innerHTML = '';
		self.el_scale.innerHTML = '<vtext id="texttimelinetest"><vtext>';
		var test_text = document.getElementById('texttimelinetest');
		test_text.innerHTML = self.dateFormat(self.left_border, false);
		var textWidth = test_text.clientWidth;
		test_text.innerHTML = self.dateFormat(self.left_border, true);
		var textWidthWithMonth = test_text.clientWidth;

		// correct step long (if text was biggest)
		var step_long = mDefaultMode.step_long;
		while((textWidth)*self.distSec > step_long){
			step_long += mDefaultMode.step_long;
		};

		var nTextWithMonth = step_long*2;

		self.el_scale.innerHTML += '<hline></hline>';
		for(var i = left_border_short; i < right_border_short; i++){
			var t = i*mDefaultMode.step_short;
			var pos = self.calcPosition(t);
			if(t % mDefaultMode.step_long == 0){
				var bTextWithMonth = t % nTextWithMonth == 0;
				var tw = (bTextWithMonth ? textWidthWithMonth : textWidth);
				var tpos = pos - tw/2;

				self.el_scale.innerHTML += '<vline style="left: ' + pos + 'px"></vline>';

				if(t % step_long == 0){
					self.el_scale.innerHTML += '<vtext style="left: ' + tpos + 'px">' + self.dateFormat(t,bTextWithMonth) + '</vtext>';	
				}
			}else{
				self.el_scale.innerHTML += '<vlineshort style="left: ' + pos + 'px"></vline>';
			}
		}
		
		self.el_data.innerHTML = '';
			if(mSource != null){
				
				// mSource._getAPI().getCamsessRecords();
				
				mSource.getTimeline(self.left_border, self.right_border).done(function(timeline){
				
				var per = timeline.periods;
				self.el_data.innerHTML = '';
				for(var i = 0; i < per.length; i++){
					var start = self.calcPosition(per[i].start);
					var end = self.calcPosition(per[i].end);
					var el = '<crect style="left: ' + start + 'px; width: ' + (end - start) + 'px"></crect>';
					self.el_data.innerHTML += el;
				}
			}).fail(function(err){
				console.error(err);
			});
		}
	}
	self.redrawTimeline();
	
	window.addEventListener("resize", self.redrawTimeline);
	
	self.animationTo = function(l,r, mode_new){
		mode_new = mode_new || mDefaultMode;
		// TODO lock timeline
		var steps = 25; // for ~1 sec
		var len_left = l - self.left_border;
		var len_right = r - self.right_border;
		var len_step_short = mode_new.step_short - mDefaultMode.step_short;
		var len_step_long = mode_new.step_long - mDefaultMode.step_long;
		var bChangedSteps = (len_step_short != 0 && len_step_long != 0);
		var steps_left = [];
		var steps_right = [];
		var steps_step_short = [];
		var steps_step_long = [];
		var p = 3.14/steps;
		var sum = 0;
		for(var i = 0; i < steps; i++){
			var k = Math.sin(i*p);
			sum += k;
		}

		for(var i = 0; i < steps; i++){
			var k = Math.sin(i*(3.14/steps));
			steps_left.push(k*(len_left/sum));
			steps_right.push(k*(len_right/sum));
			if(bChangedSteps){
				steps_step_short.push(k*(len_step_short/sum));
				steps_step_long.push(k*(len_step_long/sum));
			}
		}
		
		var counter = 0;
		function anumation_timeline_(){
			self.left_border += steps_left[counter];
			self.right_border += steps_right[counter];
			
			if(bChangedSteps){
				mDefaultMode.step_short += steps_step_short[counter];
				mDefaultMode.step_long += steps_step_long[counter];
			}

			self.redrawTimeline();
			counter++;
			if(counter < steps){
				setTimeout(anumation_timeline_, 10);
			}else{
				if(bChangedSteps){
					mDefaultMode = clone(mode_new);
				}
				self.redrawTimeline();
			}
		}
		setTimeout(anumation_timeline_, 15);
	}
	
	self.fixBorderLimit = function(left_b,right_b){
		var res = {};
		res.left = left_b;
		res.right = right_b;
		var max = CloudHelpers.getCurrentTimeUTC() + mDefaultMode.len_ms/2;
		if(res.right > max){
			var d = res.right - max;
			res.left = res.left - d;
			res.right = res.right - d;
		}
		return res;
	}
	
	self._clickOnData = function(e){
		if(self.plr == null){
			console.log("[CloudCameraTimeline] player is null");
			return;
		}
		
		if(mSource == null){
			console.log("[CloudCameraTimeline] source is null");
			return;
		}

		var t = Math.floor(e.offsetX*self.distSec);
		t = t + self.left_border;
		if(t && self.plr){
			self.plr.stop("by_session_timeline_1");
			self.plr.setPosition(t);
			self.plr.play();
		}
	}
	self.el_data.onclick = self._clickOnData;

	self._startMove = false;
	self._lastMoveX = 0;

	self.mousedown = function(event){
		// console.log("down", event);
		self._lastMoveX =  event.offsetX;
		self._startMove = true;
		self.el_data.style.cursor = "move";
		
		// console.log("down", self._lastMoveX);
	}

	self.mousemove = function(event){
		if(self._startMove){
			// console.log("move", event);
			var diff = event.offsetX - self._lastMoveX;
			// console.log("move " + diff);
			if(diff != 0){
				var diff_t = Math.floor(diff*self.distSec);
				self._lastMoveX = event.offsetX;
				var f = self.fixBorderLimit(self.left_border - diff_t, self.right_border - diff_t);
				self.left_border = f.left;
				self.right_border = f.right;
				self.redrawTimeline();
			}
		}
	}

	self.mouseup = function(event){
		// console.log("up", event);
		// console.log("up/out " + self._lastMoveX + " , new: " + event.offsetX);
		self._startMove = false;
		self.el_data.style.cursor = "default";
	}

	self.el_data.addEventListener('mousedown', self.mousedown);
	self.el_data.addEventListener('mousemove', self.mousemove);
	self.el_data.addEventListener('mouseup', self.mouseup);
	self.el_data.addEventListener('mouseout', self.mouseup);
};

// init base options of sdk
window.CloudSDK = window.CloudSDK || {};

// Automaticlly generated
CloudSDK.version = '2.0.63';
CloudSDK.datebuild = '190718';
console.log('CloudSDK.version='+CloudSDK.version + '_' + CloudSDK.datebuild);

// Wrapper for VXGCloudPlayer & CloudSDK

window.CloudPlayerSDK = function(playerElementID, o) {
	console.log(o);

    var self = this;
    self.options = o || {};
    self.player = null;
    self.conn = null;
    self.filter = null;
    self.cm = null;
    self.mCameraID = null;
    var mPosition = CloudPlayer.POSITION_LIVE;
    self.camera = null;
    self.svcp_url = null;
    self.sharedKey = null;
    self.playerElementID = null;
    window['_CloudPlayerSDK'] = window['_CloudPlayerSDK'] || {};

    if (!playerElementID || playerElementID === '') throw 'Player container element ID is required.';
    self.playerElementID = playerElementID;
    if (self.playerElementID.indexOf('%') === -1)
        self.playerElementID = encodeURIComponent(self.playerElementID);

    self.conn = new CloudShareConnection();

    if (window['_CloudPlayerSDK'][playerElementID]){
        throw 'Oops! CloudPlayerSDK instance with player element ID: ' + playerElementID + ' already exist. Try use another ID.';
	}

    window['_CloudPlayerSDK'][playerElementID] = {};
    self.player = new CloudPlayer(playerElementID, self.options);
    console.log("self.options: ", self.options);
    if(self.options.timeline){
		self.timeline = new CloudCameraTimelineView(self.options.timeline, self.options);
		self.timeline.setPlayer(self.player);
	}

    self.setSource = function (key) {
        if (!key || key === '') {
            var msg = 'Access token required';
            console.error(msg);
            self.player.showErrorText(msg);
            return CloudReturnCode.ERROR_INVALID_SOURCE;
        }
        var camid = 0;
        try {
            var obj = atob(key);
            obj = JSON.parse(obj);
            console.log("[CloudPlayerSDK] access_token: ", obj);
            if (obj.token && obj.camid && obj.access && obj.token !== '' && obj.camid !== '' && obj.access !== ''){
                self.sharedKey = obj.token;
                self.mCameraID = obj.camid;
            }

			if(obj.svcp && obj.svcp != ''){
				self.svcp_url = obj.svcp;
            }
            
            // obj.api = obj.api || "web.skyvr.videoexpertsgroup.com";
            // TODO move to CloudHelpers function and create tests
            if(obj.api && obj.api != ''){
                self.svcp_url = location.protocol + "//" + obj.api;
                if(location.protocol == "http:"){
                    self.svcp_url += (obj.api_p ? ":" + obj.api_p : "");
                }else if(location.protocol == "https:"){
                    self.svcp_url += (obj.api_sp ? ":" + obj.api_sp : "");
                }
                self.svcp_url += "/";
            }
        } catch (err) {
            var msg = 'Invalid access token format';
            console.error(msg);
            self.player.showErrorText(msg);
            return CloudReturnCode.ERROR_INVALID_SOURCE;
        }

        self.player.stop("by_plrsdk_3");
		if(self.svcp_url != null){ // if server is custom
			self.conn.ServiceProviderUrl = self.svcp_url;
		}
        self.conn.open(self.sharedKey);
        if (self.conn) {
            self.cm = new CloudCameraList(self.conn);
            self.cm.getCamera(self.mCameraID).done(function (cam) {
				self.camera = cam;
                self.player.setSource(self.camera);
                console.log(self.camera)
                console.log(self.camera._origJson())
                self.player.setPosition(mPosition);
                if (self.timeline && mPosition != -1) {
                    self.timeline.moveToPosition(mPosition);
                }
                if (self.options.autoPlayAllowed) {
					self.player.play();
				}
            }).fail(function (err) {
                console.log(err);
                self.player.showErrorText("Channel not found");
                // TODO callback error
            });
            return CloudReturnCode.OK;
        }
        self.player.showErrorText("Access token invalid");
        return CloudReturnCode.ERROR_NO_CLOUD_CONNECTION;
    };

    self.getSource = function () {
        if (!self.sharedKey)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        return self.sharedKey;
    };
	
	self.play = function(){
        if (!self.camera)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        self.player.play();
	};
	
	self.stop = function(){
        if (!self.camera)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        self.player.stop("by_plrsdk_1");
	};
	
    self.pause = function(){
        if (!self.camera)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        // TODO: what to do here ...
    };

	self.close = function(){
        self.player.stop("by_plrsdk_2");
        self.player.close();
        self.player.player.innerHTML = '';
        self.conn.close();
        if(window['_CloudPlayerSDK'][playerElementID]){
			delete window['_CloudPlayerSDK'][playerElementID];
		}
    };

    self.destroy = function(){
        self.player.stop("by_plrsdk_2");
        self.player.player.innerHTML = '';
        self.player.destroy();
        self.conn.close();
        if (self.timeline) {
            self.timeline.destroy();
        }
        if(window['_CloudPlayerSDK'][self.playerElementID]){
			delete window['_CloudPlayerSDK'][self.playerElementID];
		}
    }
    
    self.isPlaying = function(){
        if (!self.camera)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        return self.player.isPlaying();
    };

	self.setPosition = function(time){
        mPosition = time;
        if (!self.camera) {
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        }
        self.player.stop("by_plrsdk_2");
        self.player.setPosition(time);
        self.player.play();
    };
    
    self.getPosition = function(){
        if (!self.camera)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        return self.player.getPosition();
    };

    self.showTimeline = function(show){
        if (!self.camera) {
            console.error(CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED.text);
            return null;
        }
        if(!self.timeline){
            console.error(CloudReturnCode.ERROR_NOT_CONFIGURED.text);
            return null;
        }
        document.getElementById(self.options.timeline).style.display = show ? 'block' : 'hide';
        return true;
    };
    
    self.getChannelName = function () {
        if (!self.camera)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        return self.camera.getName();
    };
    
    self.setRange = function(startPos,endPos){
        self.player.setRange(startPos,endPos);
		if(self.timeline){
			self.timeline.setRange(startPos,endPos);
		}
	}

	self.resetRange = function(){
		self.player.resetRange();
		if(self.timeline){
			self.timeline.resetRange();
		}
    }
    self.mOnError_callback = null;
    self.onError = function(callback) {
        if (!callback) {
            self.player.onError(null);
            return;
        }
        self.mOnError_callback = callback;
		self.player.onError(function(plr, error) {
            self.mOnError_callback(self, error);
        });
    }
    self.mOnChannelStatus_callback = null;
    self.onChannelStatus = function(callback) {
        if(!callback) {
            self.mOnChannelStatus_callback = null;
            self.player.onChannelStatus(null);
            return;
        }
        self.mOnChannelStatus_callback = callback;
		self.player.onChannelStatus(function(plr, status){
            self.mOnChannelStatus_callback(self, status);
        });
    }
    
    self.addCallback = function(uniqname, func) {
        self.player.addCallback(uniqname, func);
        if (self.timeline) {
            self.timeline.addCallback(uniqname, func);
        }
    }

    self.removeCallback = function(uniqname) {
        self.player.removeCallback(uniqname);
        if (self.timeline) {
            self.timeline.removeCallback(uniqname, func);
        }
    }
};

window.StreamerSWF = window.StreamerSWF || {};
StreamerSWF.elemId = "streamer_swf";
StreamerSWF.obj = undefined;
StreamerSWF.log = function(s){
	console.log("[StreamerSWF] " + s);
}

StreamerSWF.warn = function(s){
	console.warn("[StreamerSWF] " + s);
}
	
StreamerSWF.error = function(s){
	console.error("[StreamerSWF] " + s);
}

/* override functions */
StreamerSWF.startedPublish = function(){ /* you can override */ }
StreamerSWF.stoppedPublish = function(){ /* you can override */ }
StreamerSWF.showSecuritySettings = function(){ /* you can override */ }
StreamerSWF.hideSecuritySettings = function(){ /* you can override */ }

StreamerSWF.activityLevel = function(lvl){
	console.log("audio lvl " + lvl);
}

StreamerSWF.flash = function(){
	if(!StreamerSWF.obj){
		StreamerSWF.obj = document.getElementById(StreamerSWF.elemId);
		if(!StreamerSWF.obj){
			StreamerSWF.error("Element '" + StreamerSWF.elemId + "' not found");
		}
		StreamerSWF.log("Init");
	}else if(!StreamerSWF.obj.vjs_activate){
		// try again
		StreamerSWF.obj = document.getElementById(StreamerSWF.elemId);
		if(!StreamerSWF.obj){
			StreamerSWF.error("Element '" + StreamerSWF.elemId + "' not found");
		}
		StreamerSWF.log("reinit");
	}
	return StreamerSWF.obj;
};
	
StreamerSWF.activate = function(rtmpUrl, codec){

	var f = StreamerSWF.flash();
	if(!f) return;
	if(f.vjs_activate){
		var is_private = StreamerSWF.private.is() || false;
		f.vjs_activate(rtmpUrl, is_private, codec);
	}else{
		StreamerSWF.error("Function vjs_activate not found");
		StreamerSWF.obj = undefined;
	}
};

StreamerSWF.support = function(){
	var f = StreamerSWF.flash();
	if(!f) return;
	if(f.vjs_support)
		return f.vjs_support();
	else{
		StreamerSWF.error("Function vjs_support not found");
		StreamerSWF.obj = undefined;
	}
};

StreamerSWF.status = function(){
	var f = StreamerSWF.flash();
	if(!f) return;
	if(f.vjs_status)
		return f.vjs_status();
	else{
		StreamerSWF.error("Function vjs_status not found");
		StreamerSWF.obj = undefined;
	}
};
	
StreamerSWF.deactivate = function(){
	var f = StreamerSWF.flash();
	if(!f) return;
	if(f.vjs_deactivate)
		f.vjs_deactivate();
	else{
		console.error("Function vjs_deactivate not found");
		StreamerSWF.obj = undefined;
	}
};

StreamerSWF.isActivated = function(){
	return (StreamerSWF.status() == "activated");
};

StreamerSWF.isDeactivated = function(){
	return (StreamerSWF.status() == "deactivated");
};

StreamerSWF.isTransitive = function(){
	return (StreamerSWF.status() == "transitive");
};

/* private mode opened */
StreamerSWF.private = {};
StreamerSWF.private.retry = function(isDone, next) {
    var current_trial = 0, max_retry = 50, interval = 10, is_timeout = false;
    var id = window.setInterval(
        function() {
            if (isDone()) {
                window.clearInterval(id);
                next(is_timeout);
            }
            if (current_trial++ > max_retry) {
                window.clearInterval(id);
                is_timeout = true;
                next(is_timeout);
            }
        },
        10
    );
}

StreamerSWF.private.isIE10OrLater = function(user_agent) {
    var ua = user_agent.toLowerCase();
    if (ua.indexOf('msie') === 0 && ua.indexOf('trident') === 0) {
        return false;
    }
    var match = /(?:msie|rv:)\s?([\d\.]+)/.exec(ua);
    if (match && parseInt(match[1], 10) >= 10) {
        return true;
    }
    var edge = /edge/.exec(ua);
	if(edge && edge[0] == "edge"){
		return true;
	}
    return false;
}

StreamerSWF.private.detectPrivateMode = function(callback) {
    var is_private;

    if (window.webkitRequestFileSystem) {
        window.webkitRequestFileSystem(
            window.TEMPORARY, 1,
            function() {
                is_private = false;
            },
            function(e) {
                console.log(e);
                is_private = true;
            }
        );
    } else if (window.indexedDB && /Firefox/.test(window.navigator.userAgent)) {
        var db;
        try {
            db = window.indexedDB.open('test');
        } catch(e) {
            is_private = true;
        }

        if (typeof is_private === 'undefined') {
            StreamerSWF.private.retry(
                function isDone() {
                    return db.readyState === 'done' ? true : false;
                },
                function next(is_timeout) {
                    if (!is_timeout) {
                        is_private = db.result ? false : true;
                    }
                }
            );
        }
    } else if (StreamerSWF.private.isIE10OrLater(window.navigator.userAgent)) {
        is_private = false;
        try {
            if (!window.indexedDB) {
                is_private = true;
            }                 
        } catch (e) {
            is_private = true;
        }
    } else if (window.localStorage && /Safari/.test(window.navigator.userAgent)) {
        try {
            window.localStorage.setItem('test', 1);
        } catch(e) {
            is_private = true;
        }

        if (typeof is_private === 'undefined') {
            is_private = false;
            window.localStorage.removeItem('test');
        }
    }

    StreamerSWF.private.retry(
        function isDone() {
			return typeof is_private !== 'undefined' ? true : false;
        },
        function next(is_timeout) {
            callback(is_private);
        }
    );
}

StreamerSWF.private.is = function(){
	if(typeof StreamerSWF.private.is_ === 'undefined'){
		console.error('[StreamerSWF.private] cannot detect');
	}
	return StreamerSWF.private.is_;
}

StreamerSWF.private.detectPrivateMode(
	function(is_private) {
		StreamerSWF.private.is_ = is_private;
		
		if(typeof is_private === 'undefined'){
			console.error('[StreamerSWF.private] cannot detect');
		}else{
			StreamerSWF.private.is_ = is_private;
			console.log(is_private ? '[StreamerSWF.private] private' : '[StreamerSWF.private] not private')
		}
	}
);

// Wrapper for VXGCloudPlayer & CloudSDK

window.CloudStreamerSDK = function(elid, o) {
	console.log(o);

    var self = this;
    self.options = o || {};
    self.conn = null;
    self.cm = null;
    self.mCameraID = null;
    self.camera = null;
    self.sharedKey = null;
    self.mAccessToken = null;
    self.streamer = document.getElementById(elid);
	self.m = {};
	self.conn = new CloudShareConnection();
	self.config = {};
	self.config.ws_port = 8888;
	self.config.wss_port = 8883;
	self.config.host = "cam.skyvr.videoexpertsgroup.com";
	self.api_host = 'web.skyvr.videoexpertsgroup.com';
	self.api_port = null;
	self.api_security_port = null;
	var mWebRTC_Streamer = null;

	self.streamer.classList.add("cloudstreamer");
	self.streamer.classList.add("green");
	self.streamer.classList.add("black");
	
	self.streamer.innerHTML = ''
		+ '<div class="cloudstreamer-loader" style="display: none"></div>'
		+ '<div class="cloudstreamer-error" style="display: none">'
		+ '	<div class="cloudstreamer-error-text" style="display: none"></div>'
		+ '</div>'
		+ '<div class="cloudstreamer-watermark">'
		+ '</div>'
		+ '<div class="cloudstreamer-sdkversion">SDK ' + CloudSDK.version + '</div>'
		+ '<div class="cloudstreamer-black-screen" style="display: none">'
		+ '		<div class="cloudstreamer-watermark"></div>'
		+ '		<div class="cloudstreamer-sdkversion">SDK ' + CloudSDK.version + '</div>'
		+ '</div>'
		+ '<div class="cloudplayer-controls">'
		+ '	<div class="cloudplayer-stop" style="display: none"></div>'
		+ '	<div class="cloudplayer-play" style="display: none"></div>'
		+ '	<div class="cloudplayer-time"></div>'
		+ '	<div class="cloudplayer-fullscreen"></div>'
		+ '</div>'
		+ '<video class="cloudstreamer-webcam-video" autoplay="true">'
		+ '</video>'
	;
	var el_loader = self.streamer.getElementsByClassName('cloudstreamer-loader')[0];
	var el_error = self.streamer.getElementsByClassName('cloudstreamer-error')[0];
	var el_error_text = self.streamer.getElementsByClassName('cloudstreamer-error-text')[0];
	var mElVideo = self.streamer.getElementsByClassName('cloudstreamer-webcam-video')[0];
	var mElStop = self.streamer.getElementsByClassName('cloudplayer-stop')[0];
	var mElPlay = self.streamer.getElementsByClassName('cloudplayer-play')[0];
	
	var mShowedLoading = false;
	
	function _hideerror(){
		el_error.style.display = "none";
		el_error_text.style.display = "none";
	}

	function _showloading(){
		if(self.mShowedBigPlayButton == true){
			_hideloading();
		} else if(!mShowedLoading){
			el_loader.style.display = "inline-block";
			mShowedLoading = true;
		}
	}

	function _hideloading(){
		if(mShowedLoading){
			el_loader.style.display = "none";
			mShowedLoading = false;
		}
	}
	
	self._setError = function(error){
		setTimeout(self.stop,10);
		self.mLastError = error;
		if(self.mCallback_onError){
			self.mCallback_onError(self, error);
		}
	}
	
	function _showerror(err){
		console.error(err);
		self._setError(err);
		self.showErrorText(err.text);
		console.error(err.text);
	}
	
	/*
	 * Public functions
	 * */
	self.showErrorText = function(text){
		_hideloading();
		el_error.style.display = "inline-block";
		el_error_text.style.display = "inline-block";
		el_error_text.innerHTML = text;
		mElStop.style.display = 'none';
		mElPlay.style.display = 'none';
		mElVideo.srcObject = null;

		// _hideBlackScreen();
	}
	
    self.setSource = function (key) {
		_hideerror();
		mElPlay.style.display = 'none';

        if (!key || key === '') {
            var msg = 'Access token required';
            console.error(msg);
            self.showErrorText(msg);
            return CloudReturnCode.ERROR_INVALID_SOURCE;
		}

		if (location.protocol != 'https:') {
			self.showErrorText("Streamer is not available when page not secure.");
			return;
		}

		var camid = 0;
        try {
            var obj = atob(key);
            obj = JSON.parse(obj);
            console.log(obj);
            if (obj.token && obj.camid && obj.access && obj.token !== '' && obj.camid !== '' && obj.access !== ''){
                self.sharedKey = obj.token;
                self.mCameraID = obj.camid;
			}

			if (obj.api) {
				self.api_host = obj.api;
				console.log('self.api_host: ', self.api_host);
			}

			if (obj.api_p) {
				self.api_port = obj.api_p;
				console.log('self.api_port: ', self.api_port);
			}

			if (obj.api_security_port) {
				self.api_security_port = obj.api_security_port;
				console.log('self.api_security_port: ', self.api_security_port);
			}

        } catch (err) {
            var msg = 'Invalid access token format';
            console.error(msg);
            return CloudReturnCode.ERROR_INVALID_SOURCE;
		}
		
		var base_url = self.api_host;

		if (self.api_host == 'web.skyvr.videoexpertsgroup.com') {
			base_url = 'https://' + self.api_host;
		} else if (location.protocol === 'https:') {
			base_url = 'https://' + self.api_host;
			if (self.api_secutiry_port != null) {
				base_url += ':' + self.api_secutiry_port;
			}
		} else if (location.protocol === 'http:') {
			base_url = 'http://' + self.api_host;
			if (self.api_secutiry_port != null) {
				base_url += ':' + self.api_secutiry_port;
			}
		}

		self.conn.ServiceProviderUrl = base_url + '/';
		self.conn.open(self.sharedKey);
		self.mAccessToken = key;
		mElPlay.style.display = '';
		
		/*if(CloudHelpers.isMobile()){
			self.showErrorText("Mobile streamer is not available yet");
			return;
		}
		
		if(CloudHelpers.isChrome()){
			self.showErrorText("Streamer is not available yet for Chrome. But you can open this page in Edge or Firefox to start streaming from your web camera.");
			return;
		}
		
		if(!CloudHelpers.supportFlash() && CloudHelpers.isFireFox()){
			self.showErrorText("In Firefox Streamer available using by flash now.<br>"
				+ "Please install flash <a href='https://get.adobe.com/flashplayer' target='_blank'>https://get.adobe.com/flashplayer</a><br>"
				+ " or maybe enable Plugin 'Shockwave Flash' in your browser <a href='about:addons' target='_blank'>about:addons</a>.");
			return;
		}
		*/
    };

    self.getSource = function () {
        if (!self.mAccessToken)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        return self.mAccessToken;
    };

	self.start = function(){
        if (!self.sharedKey){
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
		}
		console.warn("[CloudStreamerSDK] Start");

		self.stop("by_strm_sdk_1");
		if (navigator.mediaDevices.getUserMedia) {
			navigator.mediaDevices.getUserMedia({video: true}).then(function(stream) {
				mElVideo.srcObject = stream;

				if (self.conn) {
					// self.cm = new CloudCameraList(self.conn);
					self.conn._getAPI().cameraStreamUrls_webrtc(self.mCameraID).done(function (stream_urls) {
						console.log("stream_urls: ", stream_urls);
						if (!stream_urls.webrtc) {
							self.showErrorText("Channel not support webrtc streamer");
							return;
						}

						var p = CloudHelpers.promise();

						if (CloudHelpers.compareVersions(CloudPlayerWebRTC2.version, stream_urls.webrtc.version) > 0) {
							console.warn("Expected version webrtc.version (v" + stream_urls.webrtc.version + ") "
							+ " mismatch with included CloudPlayerWebRTC (v" + CloudPlayerWebRTC2.version + ")");
							p = CloudHelpers.requestJS(stream_urls.webrtc.scripts.player, function(r) { 
								r = r.replace("CloudPlayerWebRTC =", "CloudPlayerWebRTC2 =");
								while (r.indexOf("CloudPlayerWebRTC.") !== -1) {
									r = r.replace("CloudPlayerWebRTC.", "CloudPlayerWebRTC2.");
								}
								return r;
							});
						} else {
							p.resolve();
						}
						p.done(function(){
							// self.mCamera = ;
							mWebRTC_Streamer = new CloudPlayerWebRTC2(null,
								stream_urls.webrtc.connection_url, 
								stream_urls.webrtc.ice_servers, {
									send_video: true,
									send_audio: true,
								}
							);

							mWebRTC_Streamer.startWS();
							mElStop.style.display = '';
							mElPlay.style.display = 'none';
						}).fail(function(err){
							console.error("err: ", err);
							self.showErrorText("Problem with protocol of streaming");
						})
						// self.start();
					}).fail(function (err) {
						console.error("err: ", err);
						self.showErrorText("Channel for streaming not found");
						return;
					});
				}
			}).catch(function(err) {
				self.sharedKey = null;
				console.error(err);
				console.error("Something went wrong! ", err);
				if (("" + err).indexOf("Requested device not found") != -1) {
					self.showErrorText("Not found camera");
				}
			});
		}
        // self.player.play();
	};

	mElPlay.onclick = self.start;
	
	self.stop = function(){
		mElStop.style.display = 'none';
		mElPlay.style.display = self.mAccessToken ? '' : 'none';
		mElVideo.srcObject = null;

		if (!self.sharedKey)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;

		try{ if (mWebRTC_Streamer) { mWebRTC_Streamer.stopWS(); } }catch(err){console.error(err)};
	};

	mElStop.onclick = self.stop;

	self.initFullscreenControls = function(){
		var el_fullscreen = self.streamer.getElementsByClassName('cloudplayer-fullscreen')[0];
		var _prevHeight, _prevWidth;
		self.changedFullscreen = function(){
			console.log('changedFullscreen');
			if (document.webkitIsFullScreen){
				_prevHeight = self.player.style.height;
				_prevWidth = self.player.style.width;
				self.streamer.style.height = '100%';
				self.streamer.style.width = '100%';
				// self.size('100%', '100%');
				console.log('changedFullscreen -> fullscreen');
			}else{
				_prevHeight
				self.streamer.style.height = _prevHeight;
				self.streamer.style.width = _prevWidth;
				// self.size(self.playerWidth + 'px', self.playerHeight + 'px');
				console.log('changedFullscreen -> NOT fullscreen');
			}
		};

		if (document.addEventListener){
			document.addEventListener('webkitfullscreenchange', self.changedFullscreen, false);
			document.addEventListener('mozfullscreenchange', self.changedFullscreen, false);
			document.addEventListener('fullscreenchange', self.changedFullscreen, false);
			document.addEventListener('MSFullscreenChange', self.changedFullscreen, false);
		}

		self.fullscreen = function(){
			console.log("fullscreen: clicked");
			if(document.webkitIsFullScreen == true){
				document.webkitCancelFullScreen();
			} else if(document.mozFullScreen){
				document.mozCancelFullScreen();
			} else if(document.msFullscreenElement && document.msFullscreenElement != null){
				document.msExitFullscreen();
			}else{
				if(self.streamer.mozRequestFullScreen) {
					self.streamer.mozRequestFullScreen();
				} else if(self.streamer.requestFullscreen) {
					self.streamer.requestFullscreen();
				} else if(self.streamer.webkitRequestFullscreen) {
					self.streamer.webkitRequestFullscreen();
				} else if(self.streamer.msRequestFullscreen) {
					self.streamer.msRequestFullscreen();
				}
			}
		};
		
		el_fullscreen.onclick = self.fullscreen;
	}
	self.initFullscreenControls();
};

// Wrapper for VXGCloudPlayer & CloudSDK

window.CloudStreamerFlash = function(elid, o) {
	console.log(o);

    var self = this;
    self.options = o || {};
    self.conn = null;
    self.cm = null;
    self.mCameraID = null;
    self.camera = null;
    self.sharedKey = null;
    self.mAccessToken = "";
    self.streamer = document.getElementById(elid);
	self.m = {};
	self.conn = new CloudShareConnection();
	self.config = {};
	self.config.ws_port = 8888;
	self.config.wss_port = 8883;
	self.config.host = "cam.skyvr.videoexpertsgroup.com";

	self.streamer.classList.add("cloudstreamer");
	self.streamer.classList.add("green");
	self.streamer.classList.add("black");
	
	StreamerSWF.log = function(s){
		console.log("[CloudStreamerFlash]", s);
	}

	StreamerSWF.error = function(s){
		console.error("[CloudStreamerFlash]", s);
	}

	StreamerSWF.warn = function(s){
		console.warn("[CloudStreamerFlash]", s);
	}

	StreamerSWF.startedPublish = function(){
		console.log("[CloudStreamerFlash] publishing started");
	}

	StreamerSWF.stoppedPublish = function(){
		console.log("[CloudStreamerFlash] publishing stopped");
	}

	StreamerSWF.activityLevel = function(lvl){
		// sound
	}
	
	self.streamer.innerHTML = ''
		+ '<div class="cloudstreamer-loader" style="display: none"></div>'
		+ '<div class="cloudstreamer-error" style="display: none">'
		+ '	<div class="cloudstreamer-error-text" style="display: none"></div>'
		+ '</div>'
		+ '<div class="cloudstreamer-watermark">'
		+ '</div>'
		+ '<div class="cloudstreamer-sdkversion">SDK ' + CloudSDK.version + '</div>'
		+ '<div class="cloudstreamer-black-screen" style="display: none">'
		+ '		<div class="cloudstreamer-watermark"></div>'
		+ '		<div class="cloudstreamer-sdkversion">SDK ' + CloudSDK.version + '</div>'
		+ '</div>'
		+ '<object class="streamer-swf" id="streamer_swf" type="application/x-shockwave-flash" data="' + CloudSDK.streamer_swf + '" width="100%" height="100%" >'
		+ '<param name="movie" value="' + CloudSDK.streamer_swf + '" />'
		+ '<embed src="' + CloudSDK.streamer_swf + '">'
		+ '<param name="allowScriptAccess" value="always"/>'
		+ '<param value="allowNetworking" value="all"/>'
		+ '<param name="wmode" value="transparent"/>'
		+ '<param name="menu" value="false" />'
		+ '</object>'
	;
	var el_loader = self.streamer.getElementsByClassName('cloudstreamer-loader')[0];
	var el_error = self.streamer.getElementsByClassName('cloudstreamer-error')[0];
	var el_error_text = self.streamer.getElementsByClassName('cloudstreamer-error-text')[0];
	var el_streamer_swf = self.streamer.getElementsByClassName('streamer-swf')[0];
	console.log(StreamerSWF.flash());

	self.onStarted = function(rtmp_url){
		console.log("[CloudStreamerFlash] activate streaming to rtmp_url: ", rtmp_url);
		StreamerSWF.activate(rtmp_url, "PCMU");
		
		/*var strm = rtmp_url.split("/").slice(4).join("/");
		var srv = rtmp_url.split("/").slice(0,4).join("/");
		if(!el_streamer_swf){
			self.streamer.innerHTML += '<embed src="' + CloudSDK.webcamswf + '"'
					+ ' flashvars="server=' + encodeURIComponent(srv) + '&stream=' + encodeURIComponent(strm) + '" '
					+ ' bgcolor="#000000" '
					+ ' width="100%" '
					+ ' height="100%" '
					+ ' name="haxe" '
					+ ' quality="high" '
					+ ' align="center" '
					+ ' allowScriptAccess="always" '
					+ ' type="application/x-shockwave-flash" '
					+ ' pluginspage="http://www.macromedia.com/go/getflashplayer" />';
		}else{
			console.warn("TODO already defined streamer_swf element");
		}*/
	}
	
	self.onStopped = function(){
		console.log("[CloudStreamerFlash] deactivate");
		StreamerSWF.deactivate();
	}
	var mShowedLoading = false;
	
	function _hideerror(){
		el_error.style.display = "none";
		el_error_text.style.display = "none";
	}

	function _showloading(){
		if(self.mShowedBigPlayButton == true){
			_hideloading();
		} else if(!mShowedLoading){
			el_loader.style.display = "inline-block";
			mShowedLoading = true;
		}
	}

	function _hideloading(){
		if(mShowedLoading){
			el_loader.style.display = "none";
			mShowedLoading = false;
		}
	}
	
	self._setError = function(error){
		setTimeout(self.stop,10);
		self.mLastError = error;
		if(self.mCallback_onError){
			self.mCallback_onError(self, error);
		}
	}
	
	function _showerror(err){
		console.error(err);
		self._setError(err);
		self.showErrorText(err.text);
		console.error(err.text);
	}

	/*
	 * Public functions
	 * */
	self.showErrorText = function(text){
		_hideloading();
		el_error.style.display = "inline-block";
		el_error_text.style.display = "inline-block";
		el_error_text.innerHTML = text;
		// _hideBlackScreen();
	}
	
    self.setSource = function (key) {
		_hideerror();

        if (!key || key === '') {
            var msg = 'Access token required';
            console.error(msg);
            self.showErrorText(msg);
            return CloudReturnCode.ERROR_INVALID_SOURCE;
		}

		if(CloudHelpers.isMobile()){
			self.showErrorText("Mobile streamer is not available yet");
			return;
		}
		
		if(CloudHelpers.isChrome()){
			self.showErrorText("Streamer is not available yet for Chrome. But you can open this page in Edge or Firefox to start streaming from your web camera.");
			return;
		}
		
		if(!CloudHelpers.supportFlash() && CloudHelpers.isFireFox()){
			self.showErrorText("In Firefox Streamer available using by flash now.<br>"
				+ "Please install flash <a href='https://get.adobe.com/flashplayer' target='_blank'>https://get.adobe.com/flashplayer</a><br>"
				+ " or maybe enable Plugin 'Shockwave Flash' in your browser <a href='about:addons' target='_blank'>about:addons</a>.");
			return;
		}

		if(window.location.protocol == "https:"){
			self.showErrorText("Streamer are not available yet with https");
			return;
		}
        
        var camid = 0;
        try {
            var obj = atob(key);
            obj = JSON.parse(obj);
            console.log(obj);
            if (obj.token && obj.camid && obj.access && obj.token !== '' && obj.camid !== '' && obj.access !== ''){
                self.sharedKey = obj.token;
                self.mCameraID = obj.camid;
			}

			if(obj.svcp && obj.svcp != ''){
				self.svcp_url = obj.svcp;
				console.log('self.svcp_url: ', self.svcp_url);
			}
        } catch (err) {
            var msg = 'Invalid access token format';
            console.error(msg);
            return CloudReturnCode.ERROR_INVALID_SOURCE;
        }
		
		self.mAccessToken = key;
		
		if(self.svcp_url != null){ // if server is custom
			self.conn.ServiceProviderUrl = self.svcp_url;
			var uri = CloudHelpers.parseUri(self.svcp_url);
			self.config.host = uri.host;
		}
        self.conn.open(self.sharedKey);
        if (self.conn) {
            self.cm = new CloudCameraList(self.conn);
            self.cm.getCamera(self.mCameraID).done(function (cam) {
				self.mCamera = cam;
				console.log("camera: ", self.mCamera._origJson());
				/*if(self.mCamera._origJson().rec_mode != 'on'){
					console.error("Please enable channel recording");
					self.showErrorText("Please enable channel recording");
				}*/
				self.start();
            }).fail(function (err) {
                self.showErrorText("Channel for streaming not found");
				return;
            });
            return CloudReturnCode.OK;
        }
        return CloudReturnCode.ERROR_NO_CLOUD_CONNECTION;
    };

    self.getSource = function () {
        if (!self.sharedKey)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        return self.mAccessToken;
    };
	var mPolingPreStartFlash = null;

	function _stopPolingPREStart(){
		clearInterval(mPolingPreStartFlash);
	}

	function _startPolingPREStart(){
		_stopPolingPREStart();
		mPolingPreStartFlash = setInterval(function(){
			if(StreamerSWF.flash().vjs_activate){
				self.start();
				_stopPolingPREStart();
			}
		},1000);
	}

	self.start = function(){
        if (!self.mCamera){
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
		}
		
		if(!StreamerSWF.flash().vjs_activate){
			_startPolingPREStart();
			return;
		}
		
        console.warn("[CloudStreamerFlash] Start");	
        self.stop("by_strm_sdk_1");
		var cmngrid = self.mCamera.getCameraManagerID();
		self.mCamera._getConn()._getAPI().resetCameraManager(cmngrid, {}).done(function(r){
			console.log(r);
			self.config.token = r.token;
			self.config.camid = self.mCamera.getID();
			self.initWebSocket();
		}).fail(function(err){
			console.error(err);
		})
        // self.player.play();
	};
	
	self.stop = function(){
		_stopPolingPREStart();
		
        if (!self.camera)
            return CloudReturnCode.ERROR_SOURCE_NOT_CONFIGURED;
        console.warn("Stop");
        if(self.ws && self.ws.socket){
			try{self.ws.socket.close();}catch(err){console.error(err)};
		}
		
		
		// TODO if started
		try{StreamerSWF.deactivate();}catch(err){console.error(err)};
		
	};

	/* *************************************
	**** Camera Manager Protocol
	* ************************************ */

	self.initWebSocket = function(){

		var connection_url = self.config.srv || self.config.host;
		self.ws = {};

		console.log("self.config.host: " + self.config.host);
		console.log("self.config.srv: " + self.config.srv);

		
		// dirty hack begin
		/*var bBaseURL = false;
		if(connection_url == self.config.host){
			connection_url = window.location.hostname;
			bBaseURL = true;
		}else{
			connection_url = window.location.hostname;
		}*/
		// dirty hack end
		
		// protocol
		if(window.location.protocol == "http:"){
			connection_url = "ws://" + connection_url + ":" + self.config.ws_port;
		}else if(window.location.protocol == "https:"){
			// connection_url = "wss://" + connection_url + ":" + self.config.wss_port;
			console.error("Not supported https yet");
			return;
		}else{
			console.error("Expected protocol http or https");
			return;
		}
		
		// dirty hack begin
		/*if(!bBaseURL){
			connection_url += '/' + self.config.srv;
		}*/
		// dirty hack end

		// append regtoken
		connection_url +=  "/ctl/NEW/" + self.config.token + "/";

		self.ws.socket = new WebSocket(connection_url);
		self.ws.socket.onopen = function() {
			console.log('WS Opened');
			self._register();
		};
		self.ws.socket.onclose = function(event) {
			console.log('Closed');
		};
		self.ws.socket.onmessage = function(event) {
			console.log('Received: ' + event.data);
			try{
				var response = JSON.parse(event.data);
				var cmd = response['cmd'];
				if(self.handlers[cmd]){
					self.handlers[cmd](response);
				}else{
					console.warn("Not found handler " + cmd);
				}
			}catch(e){
				console.error(e);
			}
		};
		self.ws.socket.onerror = function(error) {
			console.error('Error: ' + error.message);
		};
	}

	self.m_nMessageID = 0;

	self.makeCommand = function(cmd){
		self.m_nMessageID++;
		return {
			cmd: cmd,
			msgid: self.m_nMessageID
		};
	}
	
	self.makeCommandDone = function(orig_cmd, refid, status){
		var response = self.makeCommand("done");
		response["orig_cmd"] = orig_cmd;
		response["refid"] = refid;
		response["status"] = status;
		return response;
	}

	self._register = function(){
		var request = self.makeCommand("register");
		request['pwd'] = '';
		request['reg_token'] = self.config.token;
		request["ver"] = '0.1';
		request["tz"] = 'UTC';
		request["vendor"] = 'web';
		self.sendMessage(request);
	}

	self.sendMessage = function(r){
		self.ws.socket.send(JSON.stringify(r));
	}

	self.handlers = {};
	self.handlers['configure'] = function(response){
		if(response["server"]){
			self.config.srv = response["server"];
		}
		if(response["uuid"]){
			self.config.uuid = response["uuid"];
		}
	}

	self.handlers['bye'] = function(response){
		if(response["reason"] && response["reason"] == "RECONNECT"){
			setTimeout(function(){
				self.initWebSocket();
			},1200);
		}
	}
	
	self.handlers['hello'] = function(response){
		if(response['media_server']){  // deprecated
			self.config.media_server = response['media_server'];
		}
		if(response['sid']){
			self.config.sid = response['sid'];
		}
		if(response['upload_url']){ 
			self.config.upload_url = response['upload_url'];
		}
		
		self.sendMessage(self.makeCommandDone('hello', response["msgid"], "OK"));
		
		var data = self.makeCommand("cam_register");
		data["ip"] = '127.0.0.1';
		data["uuid"] = self.config.uuid;
		data["brand"] = 'None';
		data["model"] = 'Unknown';
		data["sn"] = 'nope';
		data["type"] = "cm";
		data["version"] = '0';
		data["initial_mode"] = 'cloud';
	
		self.sendMessage(data);
	}
	
	self.handlers['cam_hello'] = function(response){
		self.sendMessage(self.makeCommandDone('cam_hello', response["msgid"], "OK"));
		self.config.camid = response["cam_id"];
		if(response["media_url"]){ // deprecated
			self.config.media_url = response["media_url"];
		}
		if(response["media_uri"]){ // new
			self.config.media_server = response["media_uri"];
		}
		if(response["path"]){ // new
			self.config.media_url = response["path"];
		}
	}
	
	self.handlers['get_cam_status'] = function(response){
		var data = self.makeCommand('cam_status');
		data['cam_id'] = self.config.camid;
		data["ip"] = '127.0.0.1';
		data["activity"] = true;
		data["streaming"] = true;
		data["status_led"] = false;
		self.sendMessage(data);
	}
	
	
	self.handlers['get_supported_streams'] = function(response){
		var data = self.makeCommand('supported_streams');
		data['cam_id'] = self.config.camid;
		data["audio_es"] = ['Aud'];
		data["video_es"] = ['Vid'];
		data["streams"] = [{
			id: "Main",
			"video": "Vid",
			"audio": "Aud"
		}]
		self.sendMessage(data);
	}

	self.stream_start_counter = 0;
	self.handlers['stream_start'] = function(response){
		var stream_url = "rtmp://" + self.config.media_server + "/" + self.config.media_url + "Main";
		stream_url += "?sid=" + self.config.sid;
		console.log(stream_url);
		if(self.stream_start_counter == 0){
			self.stream_start_counter++;
			if(self.options.onStarted){
				self.options.onStarted(stream_url);
			}else if(!self.options.onStarted){
				self.onStarted(stream_url);
			}	
		}
		self.sendMessage(self.makeCommandDone('stream_start', response["msgid"], "OK"));
	}
	self.handlers['stream_stop'] = function(response){
		self.stream_start_counter--;
		self.sendMessage(self.makeCommandDone('stream_start', response["msgid"], "OK"));
		if(self.stream_start_counter == 0){
			if(self.options.onStopped){
				self.options.onStarted(stream_url);
			}else if(!self.options.onStarted){
				self.onStopped();
			}	
		}
	}
	
};
