(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function() {
      return factory(root);
    });
  } else if (typeof exports === 'object') {
    module.exports = factory;
  } else {
    root.chayns = factory(root);
  }
  // TODO: consider;  (typeof exports !== "undefined" && exports !== null ? exports : window).moduleName = moduleName;
})(this, function (root) {
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

/**
 * @name chayns API
 * @module chayns
 */

// helper
// TODO: either index.js, utils.js or just the single files

var utils = _interopRequireWildcard(require("./utils"));

var extend = utils.extend;

// set logLevel to info
utils.setLevel(4); // TODO: don't set the level here

// basic config

var config = require("./chayns/config").config;

// environment

var environment = require("./chayns/environment").environment;

// (current) user

var user = require("./chayns/user").user;

// core functions

var _chaynsCore = require("./chayns/core");

var ready = _chaynsCore.ready;
var register = _chaynsCore.register;
var setup = _chaynsCore.setup;

// chayns calls

var apiCall = require("./chayns/chayns_calls").apiCall;

var chaynsApiInterface = require("./chayns/chayns_api_interface").chaynsApiInterface;

// public chayns object
var chayns = exports.chayns = {};

extend(chayns, { getLogger: utils.getLogger }); // jshint ignore: line
extend(chayns, { utils: utils });
extend(chayns, { VERSION: "0.1.0" });
//extend(chayns, {config}); // TODO: the config `Object` should not be exposed

extend(chayns, { env: environment }); // TODO: generally rename
extend(chayns, { user: user });

extend(chayns, { register: register });
extend(chayns, { ready: ready });

extend(chayns, { apiCall: apiCall });

// add all chaynsApiInterface methods directly to the `chayns` Object
extend(chayns, chaynsApiInterface);

// setup chayns
setup();

// chayns publish no UMD
//window.chayns = chayns;
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"./chayns/chayns_api_interface":3,"./chayns/chayns_calls":4,"./chayns/config":5,"./chayns/core":6,"./chayns/environment":7,"./chayns/user":8,"./utils":9}],2:[function(require,module,exports){
"use strict";

/**
 *
 * @param {String} name
 * @param {Function} fn Callback Function to be invoked
 * @param {Boolean} isChaynsCall If true then the call will be assigned to `chayns._callbacks`
 * @returns {Boolean} True if parameters are valid and the callback was saved
 */
exports.setCallback = setCallback;
exports.messageListener = messageListener;

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var isFunction = _utils.isFunction;
var isUndefined = _utils.isUndefined;

var window = require("../utils/browser").window;

var log = getLogger("chayns.callbacks");

var noop = Function.prototype;

var callbacks = {};function setCallback(name, fn, isChaynsCall) {

  if (isUndefined(name)) {
    log.warn("setCallback: name is undefined");
    return false;
  }
  if (!isFunction(fn)) {
    log.warn("setCallback: fn is no Function");
    return false;
  }

  if (name.indexOf("()") !== -1) {
    // strip '()'
    name = name.replace("()", "");
  }

  log.debug("setCallback: set Callback: " + name);
  //if (name in callbacks) {
  //  callbacks[name].push(fn); // TODO: reconsider Array support
  //} else {
  callbacks[name] = fn; // Attention: we save an Array
  //}

  if (isChaynsCall) {
    log.debug("setCallback: register fn as global callback");
    window._chaynsCallbacks[name] = callback(name, "ChaynsCall");
  }
  return true;
}

/**
 * @description
 * Register callbacks for ChaynsCalls and ChaynsWebCalls
 *
 * @private
 * @param {string} callbackName Name of the Function
 * @param {string} type Either 'ChaynsWebCall' or 'ChaynsCall'
 * @returns {Function} handleData Receives callback data
 */
function callback(callbackName, type) {

  return function handleData() {

    if (callbackName in callbacks) {
      log.debug("invoke callback: ", callbackName);
      var fn = callbacks[callbackName];
      if (isFunction(fn)) {
        fn.apply(null, arguments);
        delete callbacks[callbackName]; // TODO: cannot be like that, remove array?
      } else {
        log.warn("callback is no function", callbackName, fn);
      }
    } else {
      log.info("callback " + callbackName + " did not exist in callbacks array");
    }
  };
}

/**
 * @name chayns._callbacks
 * @module chayns
 *
 * @description
 * Chayns Call Callbacks
 * will be assigned to the `chayns._callbacks` object
 *
 * @type {Object} chaynsCallsCallbacks
 */
window._chaynsCallbacks = {
  //// TODO: wrap callback function (DRY)
  //getGlobalData: callback('getGlobalData', 'ChaynsCall') // example
  getGeoLocationCallback: noop
};

// TODO: move to another file? core, chayns_calls
var messageListening = false;
function messageListener() {
  if (messageListening) {
    log.info("there is already one message listener on window");
    return;
  }
  messageListening = true;
  log.debug("message listener is started");

  window.addEventListener("message", function onMessage(e) {

    log.debug("new message ");

    var namespace = "chayns.customTab.",
        data = e.data;

    if (typeof data !== "string") {
      return;
    }
    // strip namespace from data
    data = data.substr(namespace.length, data.length - namespace.length);
    var method = data.match(/[^:]*:/); // detect method
    if (method && method.length > 0) {
      method = method[0];

      var params = data.substr(method.length, data.length - method.length);
      if (params) {
        try {
          params = JSON.parse(params);
        } catch (e) {}
      }

      // remove the last ')'
      method = method.substr(0, method.length - 1);

      // the callback function can be invoked directly
      callback(method, "ChaynsWebCall")(params);
    }
  });
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":9,"../utils/browser":10}],3:[function(require,module,exports){
"use strict";

var apiCall = require("./chayns_calls").apiCall;

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var isFunction = _utils.isFunction;
var isString = _utils.isString;
var isNumber = _utils.isNumber;
var isBLEAddress = _utils.isBLEAddress;
var isDate = _utils.isDate;
var isPresent = _utils.isPresent;

var log = getLogger("chayns_api_interface");
/**
 * All public chayns methods to interact with *Chayns App* or *Chayns Web*
 * @type {Object}
 */
var chaynsApiInterface = exports.chaynsApiInterface = {

  // TODO: rename to enablePullToRefresh
  allowRefreshScroll: function allowRefreshScroll() {
    chaynsApiInterface.setPullToRefresh(true);
  },
  disallowRefreshScroll: function disallowRefreshScroll() {
    chaynsApiInterface.setPullToRefresh(false);
  },
  /**
   * Enable or disable PullToRefresh
   *
   * @param {Boolean} allowPull Allow PullToRefresh
   * @returns {Boolean} True if the call suceeded
   */
  setPullToRefresh: function setPullToRefresh(allowPull) {
    return apiCall({
      cmd: 0,
      webFn: false, // could be omitted
      params: [{ bool: allowPull }]
    });
  },

  showWaitcursor: function showWaitcursor() {
    return chaynsApiInterface.setWaitcursor(true);
  },
  hideWaitcursor: function hideWaitcursor() {
    return chaynsApiInterface.setWaitcursor(false);
  },
  /**
   *
   * @param {Boolean} [showCursor] If true the waitcursor will be shown
   *                               otherwise it will be hidden
   * @returns {Boolean}
   */
  setWaitcursor: function setWaitcursor(showCursor) {
    return apiCall({
      cmd: 1,
      webFn: (showCursor ? "show" : "hide") + "LoadingCursor",
      params: [{ bool: showCursor }]
    });
  },

  // TODO: name it Tapp?
  /**
   * Select different Tapp identified by TappID or InternalTappName
   *
   * @param {String} tab Tapp Name or Tapp ID
   * @param {String} (optional) param URL Parameter
   * @returns {Boolean}
   */
  selectTab: function selectTab(tab, param) {

    var cmd = 13; // selectTab with param ChaynsCall

    // update param: strip ? and ensure & at the begin
    if (param && !param.match(/^[&|\?]/)) {
      // no & and no ?
      param = "&" + param;
    } else if (param) {
      param = param.replace("?", "&");
    } else {
      // no params, different ChaynsCall
      cmd = 2;
    }

    return apiCall({
      cmd: cmd,
      webFn: "selectothertab",
      params: cmd === 13 ? [{ string: tab }, { string: param }] : [{ string: tab }],
      webParams: {
        Tab: tab,
        Parameter: param
      },
      support: { android: 2402, ios: 1383, wp: 2469 } // for native apps only
    });
  },

  /**
   * Select Album
   *
   * @param {id|string} id Album ID (Album Name will work as well, but do prefer IDs)
   * @returns {Boolean}
   */
  selectAlbum: function selectAlbum(id) {
    if (!isString(id) && !isNumber(id)) {
      log.error("selectAlbum: invalid album name");
      return false;
    }
    return apiCall({
      cmd: 3,
      webFn: "selectAlbum",
      params: [{ string: id }],
      webParams: id
    });
  },

  /**
   * Open Picture
   * (old ShowPicture)
   * Android does not support gifs :(
   *
   * @param {string} url Image URL should cotain jpg,png or gif
   * @returns {Boolean}
   */
  openPicture: function openPicture(url) {
    if (!isString(url) || !url.match(/jpg$|png$|gif$/i)) {
      // TODO: more image types?
      log.error("openPicture: invalid url");
      return false;
    }
    return apiCall({
      cmd: 4,
      webFn: "showPicture",
      params: [{ string: url }],
      webParams: url,
      support: { android: 2501, ios: 2636, wp: 2543 }
    });
  },

  /**
   * Create a Caption Button.
   * Works only in native apps.
   * The caption button is the text at the top right of the app.
   * (mainly used for login or the username)
   * TODO: implement into Chayns Web?
   * TODO: rename to set?
   *
   * @param {String} text The Button's text
   * @param {Function} callback Callback Function when the caption button was clicked
   * @returns {Boolean}
   */
  createCaptionButton: function createCaptionButton(text, callback) {

    if (!isFunction(callback)) {
      //log.error('There is no valid callback Function.');
      throw new Error("There is no valid callback Function.");
      //return false;
    }
    var callbackName = "captionButtonCallback()";

    return apiCall({
      cmd: 5,
      params: [{ string: text }, { callback: callbackName }],
      support: { android: 1358, ios: 1366, wp: 2469 },
      cb: callback
    });
  },

  /**
   * Hide a Caption Button.
   * Works only in native apps.
   * The caption button is the text at the top right of the app.
   * (mainly used for login or the username)
   *
   * @returns {Boolean}
   */
  hideCaptionButton: function hideCaptionButton() {
    return apiCall({
      cmd: 6,
      support: { android: 1358, ios: 1366, wp: 2469 }
    });
  },

  /**
   * Facebook Connect
   *
   * @param {string} [permissions = 'user_friends'] Facebook Permissions, separated by comma
   * @param {string} [reloadParam = 'comment'] Reload Param
   * @returns {Boolean}
   */
  // TODO: test permissions
  facebookConnect: function facebookConnect() {
    var permissions = arguments[0] === undefined ? "user_friends" : arguments[0];
    var reloadParam = arguments[1] === undefined ? "comment" : arguments[1];

    reloadParam = reloadParam;
    return apiCall({
      cmd: 7,
      webFn: "facebookConnect",
      params: [{ string: permissions }, { Function: "ExecCommand=\"" + reloadParam + "\"" }],
      webParams: {
        ReloadParameter: "ExecCommand=" + reloadParam,
        Permissions: permissions
      },
      support: { android: 1359, ios: 1366, wp: 2469 },
      fallbackCmd: 8 // in case the above is not support the fallbackCmd will replace the cmd
    });
  },

  /**
   * Open Link in Browser
   *
   * @param {string} url URL
   * @returns {Boolean}
   */
  openLinkInBrowser: function openLinkInBrowser(url) {
    return apiCall({
      cmd: 9,
      webFn: function webFn() {
        if (url.indexOf("://") === -1) {
          url = "//" + url; // or add location.protocol prefix and // TODO: test
        }
        window.open(url, "_blank");
        return true;
      },
      params: [{ string: url }],
      support: { android: 2405, ios: 2466, wp: 2543 }
    });
  },

  /**
   * Show BackButton.
   *
   * @param {Function} callback Callback Function when the back button was clicked
   * @returns {Boolean}
   */
  showBackButton: function showBackButton(callback) {

    if (!isFunction(callback)) {
      callback = function () {
        history.back();
        chaynsApiInterface.hideBackButton();
      };
    }
    var callbackName = "backButtonCallback()";

    return apiCall({
      cmd: 10,
      params: [{ callback: callbackName }],
      support: { android: 2405, ios: 2636, wp: 2469 },
      cb: callback
    });
  },

  /**
   * Hide BackButton.
   *
   * @returns {Boolean} False on error, true if call succeeded
   */
  hideBackButton: function hideBackButton() {
    return apiCall({
      cmd: 11,
      support: { android: 2405, ios: 2636, wp: 2469 }
    });
  },

  /**
   * Open InterCom.
   * Works only in native apps.
   *
   * @returns {Boolean} False on error, true if call succeeded
   */
  openInterCom: function openInterCom() {
    return apiCall({
      cmd: 12,
      support: { android: 2402, ios: 1383, wp: 2543 } });
  },

  /**
   * Get Geolocation.
   * native apps only (but could work in web as well, navigator.geolocation)
   *
   * TODO: continuousTracking was removed
   *
   * @param {Function} callback Callback Function when the back button was clicked
   * @returns {Boolean}
   */
  getGeoLocation: function getGeoLocation(callback) {

    var callbackName = "getGeoLocationCallback()";

    if (!isFunction(callback)) {
      // TODO: remove console
      // TODO: allow empty callbacks when it is already set
      console.warn("no callback function");
    }

    return apiCall({
      cmd: 14,
      params: [{ callback: callbackName }],
      support: { android: 2501, ios: 2466, wp: 2469 },
      //webFn: function() { navigator.geolocation; }
      cb: callback
    });
  },

  /**
   * Open Video
   * (old ShowVideo)
   *
   * @param {string} url Video URL should cotain jpg,png or gif
   * @returns {Boolean}
   */
  openVideo: function openVideo(url) {
    if (!isString(url) || !url.match(/.*\..{2,}/)) {
      // TODO: WTF Regex
      log.error("openVideo: invalid url");
      return false;
    }
    return apiCall({
      cmd: 15,
      webFn: "showVideo",
      params: [{ string: url }],
      webParams: url
    });
  },

  /**
   * Formerly known as getAppInfos
   *
   * @param {Function} callback Callback function to be invoked with the AppData
   * @returns {Boolean} True if the call succeeded or is async, false on error
   */
  // TODO: use forceReload and cache AppData
  getGlobalData: function getGlobalData(callback, forceReload) {
    if (!isFunction(callback)) {
      log.warn("getGlobalData: no valid callback");
      return false;
    }
    var globalData = false; // TODO: fix
    if (!forceReload && globalData) {
      callback(globalData);
    }
    return apiCall({
      cmd: 18,
      webFn: "getAppInfos",
      params: [{ callback: "getGlobalData" }], // callback param only on mobile
      cb: callback
    });
  },

  /**
   * Vibrate
   * @param {Integer} duration Time in milliseconds
   * @returns {Boolean} True if the call succeeded or is async, false on error
   */
  vibrate: function vibrate(duration) {
    if (!isNumber(duration) || duration < 2) {
      duration = 150;
    }
    return apiCall({
      cmd: 19,
      params: [{ string: duration.toString() }],
      webFn: function navigatorVibrate() {
        try {
          navigator.vibrate(100);
        } catch (e) {
          log.info("vibrate: the device does not support vibrate");
        }
      },
      support: { android: 2695, ios: 2596, wp: 2515 }
    });
  },

  /**
   * Navigate Back.
   * Works only in native apps.
   *
   * @returns {Boolean} False on error, true if call succeeded
   */
  navigateBack: function navigateBack() {
    return apiCall({
      cmd: 20,
      webFn: function webFn() {
        history.back();
      },
      support: { android: 2696, ios: 2600, wp: 2515 }
    });
  },

  /**
   * Image Upload
   *
   * @param {Function} callback Callback Function to be invoked with image url after upload
   * @returns {Boolean} True if the call succeeded or is async, false on error
   */
  uploadImage: function uploadImage(callback) {
    if (!isFunction(callback)) {
      log.warn("uploadImage: no valid callback");
      return false;
    }
    var callbackName = "imageUploadCallback()";
    return apiCall({
      cmd: 21,
      params: [{ callback: callbackName }], // callback param only on mobile
      cb: callback,
      support: { android: 2705, wp: 2538, ios: 2642 }
    });
  },

  /**
   * Set NFC Callback
   * TODO: refactor and test
   * TODO: why two calls?
   * Can we improve this shit? split into two methods
   * @param {Function} callback Callback Function for NFC
   * @returns {Boolean} True if the call succeeded or is async, false on error
   */
  setNfcCallback: function setNfcCallback(callback, response) {
    if (!isFunction(callback)) {
      return apiCall({
        cmd: 37,
        params: [{ Function: "null" }],
        support: { android: 3234, wp: 3121 }
      }) && apiCall({
        cmd: 37,
        params: [{ Function: "null" }],
        support: { android: 3234, wp: 3121 }
      });
    }
    var cmd = response === window.NfcResponseData.PersonId ? 37 : 38;
    return apiCall({
      cmd: cmd === 37 ? 38 : 37,
      params: [{ Function: "null" }],
      support: { android: 3234, wp: 3121 }
    }) && apiCall({
      cmd: cmd,
      params: [{ callback: "NfcCallback" }], // callback param only on mobile
      cb: callback,
      support: { android: 3234, wp: 3121 }
    });
  },

  /**
   * Video Player Controls
   * Acutally native only
   * TODO: could theoretically work in Chayns Web
   * TODO: example? where does this work?
   */
  player: {
    useDefaultUrl: function useDefaultUrl() {
      return apiCall({
        cmd: 22,
        params: [{ Integer: 0 }],
        support: { android: 2752, ios: 2644, wp: 2543 }
      });
    },
    changeUrl: function changeUrl(url) {
      return apiCall({
        cmd: 22,
        params: [{ String: url }],
        support: { android: 2752, ios: 2644, wp: 2543 }
      });
    },
    hideButton: function hideButton() {
      return apiCall({
        cmd: 23,
        params: [{ Integer: 0 }],
        support: { android: 2752, ios: 2644, wp: 2543 }
      });
    },
    showButton: function showButton() {
      return apiCall({
        cmd: 23,
        params: [{ Integer: 1 }],
        support: { android: 2752, ios: 2644, wp: 2543 }
      });
    },
    pause: function pauseVideo() {
      return apiCall({
        cmd: 24,
        params: [{ Integer: 0 }],
        support: { android: 2752, ios: 2644, wp: 2543 }
      });
    },
    play: function playVideo() {
      return apiCall({
        cmd: 24,
        params: [{ Integer: 1 }],
        support: { android: 2752, ios: 2644, wp: 2543 }
      });
    },
    playbackStatus: function playbackStatus(callback) {

      return chaynsApiInterface.getGlobalData(function (data) {
        return callback.call(null, {
          AppControlVisible: data.AppInfo.PlaybackInfo.IsAppControlVisible,
          Status: data.AppInfo.PlaybackInfo.PlaybackStatus,
          Url: data.AppInfo.PlaybackInfo.StreamUrl
        });
      }, true);
    }
  },

  /**
   * Bluetooth
   * Only in native Apps (ios and android)
   */
  bluetooth: {
    LESendStrength: { // TODO: what is that?
      Adjacent: 0,
      Nearby: 1,
      Default: 2,
      Far: 3
    },
    LEScan: function LEScan(callback) {
      if (!isFunction(callback)) {
        log.warn("LEScan: no valid callback");
        return false;
      }
      var callbackName = "bleResponseCallback";
      return apiCall({
        cmd: 26,
        params: [{ callback: callbackName }],
        cb: callback,
        support: { android: 2771, ios: 2651 }
      });
    },
    LEConnect: function LEConnect(address, callback, password) {
      if (!isString(address) || !isBLEAddress(address)) {
        log.warn("LEConnect: no valid address parameter");
        return false;
      }
      if (!isFunction(callback)) {
        log.warn("LEConnect: no valid callback");
        return false;
      }
      if (!isString(password) || !password.match(/^[0-9a-f]{6,12}$/i)) {
        password = "";
      }
      var callbackName = "bleResponseCallback";

      return apiCall({
        cmd: 27,
        params: [{ string: address }, { string: password }],
        cb: callback,
        callbackName: callbackName,
        support: { android: 2771, ios: 2651 }
      });
    },
    /**
     * TODO: consider Object as parameter
     * @param {string} address
     * @param {Integer} subId
     * @param {Integer} measurePower
     * @param {Integer} sendStrength
     * @param {Function} callback
     * @constructor
     */
    LEWrite: function LEWrite(address, subId, measurePower, sendStrength, callback) {
      if (!isString(address) || !isBLEAddress(address)) {
        log.warn("LEWrite: no valid address parameter");
        return false;
      }
      if (!isNumber(subId) || subId < 0 || subId > 4095) {
        subId = "null";
      }
      if (!isNumber(measurePower) || measurePower < -100 || measurePower > 0) {
        measurePower = "null";
      }
      if (!isNumber(sendStrength) || sendStrength < 0 || sendStrength > 3) {
        sendStrength = "null";
      }
      if (!isFunction(callback)) {
        callback = null;
      }

      var callbackName = "bleResponseCallback",
          uid = "7A07E17A-A188-416E-B7A0-5A3606513E57";

      return apiCall({
        cmd: 28,
        params: [{ string: address }, { string: uid }, { Integer: subId }, { Integer: measurePower }, { Integer: sendStrength }],
        cb: callback,
        callbackName: callbackName,
        support: { android: 2771, ios: 2651 }
      });
    }
  },

  // TODO; use `Object` as params
  // TODO: what are optional params? validate name and location?
  /**
   *
   * @param {String} name Appointment's name
   * @param {String} location Appointment's location
   * @param {String} [description] Appointment's description
   * @param {Date} start Appointments's StartDate
   * @param {Date} end Appointments's EndDate
   * @returns {Boolean}
   */
  saveAppointment: function saveAppointment(name, location, description, start, end) {
    if (!isString(name) || !isString(location)) {
      log.warn("saveAppointment: no valid name and/or location");
      return false;
    }
    if (!isDate(start) || !isDate(end)) {
      log.warn("saveAppointment: start and/or endDate is no valid Date `Object`.");
      return false;
    }
    start = parseInt(start.getTime() / 1000, 10);
    end = parseInt(end.getTime() / 1000, 10);

    return apiCall({
      cmd: 29,
      params: [{ string: name }, { string: location }, { string: description }, { Integer: start }, { Integer: end }],
      support: { android: 3054, ios: 3067, wp: 3030 }
    });
  },

  /**
   * DateTypes Enum
   * starts at 1
   */
  dateType: {
    date: 1,
    time: 2,
    dateTime: 3
  },

  /**
   * Select Date
   * Old: DateSelect
   * Native Apps only. TODO: also in Chayns Web? HTML5 Datepicker etc
   * TODO; reconsider order etc
   * @param {dateType|Number} dateType Enum 1-2: time, date, datetime. use chayns.dateType
   * @param {Number|Date} preSelect Preset the Date (e.g. current Date)
   * @param {Function} callback Function that receives the chosen Date as Timestamp
   * @param {Number|Date} minDate Minimum StartDate
   * @param {Number|Date} maxDate Maximum EndDate
   */
  selectDate: function selectDate(dateType, preSelect, callback, minDate, maxDate) {

    if (!isNumber(dateType) || dateType <= 0) {
      log.warn("selectDate: wrong dateType");
      return false;
    }
    if (!isFunction(callback)) {
      log.warn("selectDate: callback is no `Function`.");
      return false;
    }
    function validateValue(value) {
      if (!isNumber(value)) {
        if (isDate(value)) {
          return parseInt(value.getTime() / 1000, 10);
        }
        return -1;
      }
      return value;
    }
    preSelect = validateValue(preSelect);
    minDate = validateValue(minDate);
    maxDate = validateValue(maxDate);

    var dateRange = "";
    if (minDate > -1 && maxDate > -1) {
      dateRange = "," + minDate + "," + maxDate;
    }

    var callbackName = "selectDateCallback";
    function callbackFn(callback, dateType, preSelect, time) {
      // TODO: important validate Date
      // TODO: choose right date by dateTypeEnum
      log.debug(dateType, preSelect);
      callback.call(null, time ? new Date(time) : -1);
    }

    return apiCall({
      cmd: 30,
      params: [{ callback: callbackName }, { Integer: dateType }, { Integer: preSelect + dateRange }],
      cb: callbackFn.bind(null, callback, dateType, preSelect),
      support: { android: 3072, ios: 3062, wp: 3030 }
    });
  },

  /**
   * Open URL in App
   * (old ShowURLInApp)
   * not to confuse with openLinkInBrowser
   *
   * @param {string} url Video URL should contain jpg,png or gif
   * @returns {Boolean}
   */
  // TODO: implement Chayns Web Method as well (navigate back support)
  openUrl: function openUrl(url, title) {
    if (!isString(url)) {
      log.error("openUrl: invalid url");
      return false;
    }

    return apiCall({
      cmd: 31,
      webFn: function webFn() {
        window.location.href = url; // TODO: make sure it works
      },
      params: [{ string: url }, { string: title }],
      support: { android: 3110, ios: 3074, wp: 3063 }
    });
  },

  /**
   * create QR Code
   *
   * @param {String|Object} data QR Code data
   * @param {Function} callback Function which receives the base64 encoded IMG TODO: which type?
   * @returns {Boolean}
   */
  createQRCode: function createQRCode(data, callback) {
    if (!isString(data)) {
      data = JSON.stringify(data);
    }

    if (!isFunction(callback)) {
      log.warn("createQRCode: the callback is no `Function`");
      return false;
    }

    var callbackName = "createQRCodeCallback()";
    return apiCall({
      cmd: 33,
      params: [{ string: data }, { callback: callbackName }],
      support: { android: 3220, ios: 1372, wp: 3106 },
      cb: callback,
      callbackName: callbackName
    });
  },

  /**
   * scan QR Code
   * Scans QR Code and read it
   *
   * @param {Function} callback Function which receives the result
   * @returns {Boolean}
   */
  scanQRCode: function scanQRCode(callback) {

    if (!isFunction(callback)) {
      log.warn("scanQRCode: the callback is no `Function`");
      return false;
    }

    var callbackName = "scanQRCodeCallback()";
    return apiCall({
      cmd: 34,
      params: [{ callback: callbackName }],
      support: { android: 3220, ios: 1372, wp: 3106 },
      cb: callback
    });
  },

  /**
   * scan QR Code
   * Scans QR Code and read it
   *
   * @param {Function} callback Function which receives the result
   * @returns {Boolean}
   */
  beaconList: null, // TODO: dont place it here, obove is better (but not global i suppose)
  getLocationBeacons: function getLocationBeacons(callback, forceReload) {

    if (!isFunction(callback)) {
      log.warn("getLocationBeacons: the callback is no `Function`");
      return false;
    }

    var callbackName = "getBeaconsCallBack()";
    if (chaynsApiInterface.beaconList && !forceReload) {
      return callback.call(null, chaynsApiInterface.beaconList);
    }
    return apiCall({
      cmd: 39,
      params: [{ callback: callbackName }],
      support: { android: 4045, ios: 4048 },
      cb: callback
    });
  },

  /**
   * Add to Passbook
   * iOS only
   *
   * @param {String} url Path to Passbook file
   * @returns {Boolean}
   */
  addToPassbook: function addToPassbook(url) {
    if (!isString(url)) {
      log.warn("addToPassbook: url is invalid.");
      return false;
    }

    // TODO important Add Fallback openLinkInBrowser(url) (but only on ios)

    return apiCall({
      cmd: 47,
      params: [{ string: url }],
      support: { ios: 4045 }
    });
  }

};

// for NFC
// TODO: refactor: move at the top as private object
// TODO: import window
window.NfcResponseData = {
  RFId: 0,
  PersonId: 0
};
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":9,"./chayns_calls":4}],4:[function(require,module,exports){
"use strict";

/**
 * Public Chayns Interface
 * Execute API Call
 *
 * @param url
 * @param params
 * @param debounce
 * // TODO: left of callback as promise
 */
exports.apiCall = apiCall;

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var isPermitted = _utils.isPermitted;
var isFunction = _utils.isFunction;
var isBlank = _utils.isBlank;
var isArray = _utils.isArray;
var isObject = _utils.isObject;
var isDefined = _utils.isDefined;

var _utilsBrowser = require("../utils/browser");

var window = _utilsBrowser.window;
var parent = _utilsBrowser.parent;

var environment = require("./environment").environment;

var setCallback = require("./callbacks").setCallback;

var log = getLogger("chayns.core.chayns_calls");

function can(versions) {
  return isPermitted(versions, environment.os, environment.appVersion);
}

// OS App Version Map for Chayns Calls Support
// TODO: move into environment? (or just remove cause it is only used one time in here)
var osMap = {
  chaynsCall: { android: 2510, ios: 2483, wp: 2469, bb: 118 }
};function apiCall(obj) {

  var debounce = obj.debounce || false;

  // TODO: check obj.os VERSION

  function executeCall(chaynsCallObj) {

    if (environment.canChaynsCall && can(osMap.chaynsCall)) {
      // TODO: consider callQueue and Interval to prevent errors
      log.debug("executeCall: chayns call ", chaynsCallObj.cmd);

      if ("cb" in chaynsCallObj && isFunction(chaynsCallObj.cb)) {
        setCallback(chaynsCallObj.callbackName || chaynsCallObj.params[0].callback, chaynsCallObj.cb, true);
      }
      if (isObject(chaynsCallObj.support) && !can(chaynsCallObj.support)) {
        log.info("executeCall: the chayns version is not supported");
        if (chaynsCallObj.fallbackCmd) {
          log.info("executeCall: fallback chayns call will be invoked");
          return chaynsCall(chaynsCallObj.fallbackCmd);
        }
        return false;
      }
      return chaynsCall(chaynsCallObj.cmd, chaynsCallObj.params);
    } else if (environment.canChaynsWebCall) {

      if ("cb" in chaynsCallObj && isFunction(chaynsCallObj.cb)) {
        setCallback(chaynsCallObj.webFn, chaynsCallObj.cb);
      }
      if (!chaynsCallObj.webFn) {
        log.info("executeCall: This Call has no webFn");
        return false;
      }

      log.debug("executeCall: chayns web call ", chaynsCallObj.webFn.name || chaynsCallObj.webFn);

      return chaynsWebCall(chaynsCallObj.webFn, chaynsCallObj.webParams || chaynsCallObj.params);
    } else {
      log.info("executeCall: neither chayns web call nor chayns web");
    }
  }

  if (debounce) {
    setTimeout(executeCall.bind(null, obj), 100); // TODO: error?
  } else {
    return executeCall(obj);
  }
}

/**
 * Build Chayns Call (only for native Apps)
 * @private

 * @returns {Boolean} True if chayns call succeeded, false on error (no url etc)
 */
function chaynsCall(cmd, params) {

  if (isBlank(cmd)) {
    // 0 is a valid call, undefined and null are not
    log.warn("chaynsCall: missing cmd for chaynsCall");
    return false;
  }
  var url = null;

  // if there is no param or 'none' which means no callback
  if (!params) {

    url = "chayns://chaynsCall(" + cmd + ")";
  } else {
    var _ret = (function () {

      // params exist however, it is no array
      if (!isArray(params)) {
        log.error("chaynsCall: params are no Array");
        return {
          v: false
        };
      }

      // add the params to the chayns call
      var callbackPrefix = "_chaynsCallbacks.";
      var callString = "";
      if (params.length > 0) {
        (function () {
          var callArgs = [];
          params.forEach(function (param) {
            var name = Object.keys(param)[0];
            var value = param[name];
            if (name === "callback") {
              callArgs.push("\"" + callbackPrefix + value + "\"");
            } else if (name === "bool" || name === "Function" || name === "Integer") {
              callArgs.push(value);
            } else if (isDefined(value)) {
              callArgs.push("'" + value + "'");
            }
          });
          callString = "," + callArgs.join(",");
        })();
      }

      // add chayns protocol and host and join array
      url = "chayns://chaynsCall(" + cmd + callString + ")";
    })();

    if (typeof _ret === "object") {
      return _ret.v;
    }
  }

  log.debug("chaynsCall: url: ", url);

  try {
    // TODO: create an easier identification of the right environment
    // TODO: consider to execute the browser fallback in here as well
    if ("chaynsCall" in window && isFunction(window.chaynsCall.href)) {
      window.chaynsCall.href(url);
    } else if ("webkit" in window && window.webkit.messageHandlers && window.webkit.messageHandlers.chaynsCall && window.webkit.messageHandlers.chaynsCall.postMessage) {
      window.webkit.messageHandlers.chaynsCall.postMessage(url);
    } else {
      window.location.href = url;
    }
    return true;
  } catch (e) {
    log.warn("chaynsCall: Error: could not execute ChaynsCall: ", e);
  }

  return false;
}

/**
 * @description
 * Execute a ChaynsWeb Call in the parent window.
 *
 * @param {String} fn Function name
 * @param {String} params Additional
 * @returns {boolean} True if chaynsWebbCall succeeded
 */
function chaynsWebCall(fn, params) {
  if (!fn) {
    log.info("chaynsWebCall: no ChaynsWebCall fn");
    return null;
  }
  if (!params || isArray(params)) {
    // Array indicates that these are chaynsCalls params TODO: refactor
    params = "";
  }
  if (isObject(params)) {
    // an Array is also seen as Object, however it will be reset before
    params = JSON.stringify(params);
  }

  if (isFunction(fn)) {
    return fn.call(null);
  }

  var namespace = "chayns.customTab.";
  var url = namespace + fn + ":" + params;

  log.debug("chaynsWabCall: " + url);

  try {
    parent.postMessage(url, "*");
    return true;
  } catch (e) {
    log.warn("chaynsWebCall: postMessgae failed");
  }
  return false;
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":9,"../utils/browser":10,"./callbacks":2,"./environment":7}],5:[function(require,module,exports){
"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

/**
 * @module config
 * @private
 */

var _utils = require("../utils");

var isPresent = _utils.isPresent;
var isBlank = _utils.isBlank;
var isUndefined = _utils.isUndefined;
var isArray = _utils.isArray;
var extend = _utils.extend;

/**
 * Store internal chayns configuration
 * @type {{appName: string, appVersion: number, loadModernizer: boolean, loadPolyfills: boolean, useFetch: boolean, promises: string, useOfflineCaching: boolean, useLocalStorage: boolean, hasAdmin: boolean, multiLingual: boolean, isPublished: boolean, debugMode: boolean, useAjax: boolean}}
 * @private
 */
var _config = {
  appName: "Chayns App", // app Name
  appVersion: 1, // app Version
  preventErrors: true, // error handler can hide errors (can be overwtitten by isProduction)
  isProduction: true, // production, development and test ENV
  loadModernizer: true, // load modernizer
  loadPolyfills: true, // load polyfills
  useFetch: true, // use window.fetch and it's polyfills
  promises: "q", // promise Service: Q is standard
  useOfflineCaching: false, // is offline caching used? inlcude offline helper
  useLocalStorage: false, // is localStorage used? include helper
  hasAdmin: false, // does this app/page have an admin?
  multiLingual: true, // enable i18n?
  isPublished: true, // only in internal tobit available
  debugMode: true, // show console output, debug param for logging
  useAjax: false,
  isInternal: false // use internal routing
  //framework: ['Ember', 'Angular', 'Backbone', 'Ampersand', 'React', 'jQuery']
};

// TODO: remove
/*export function config() {
  if (arguments.length === 2) {
    return Config.set(arguments[0], arguments[1]); // TODO: refactor this
  } else if (arguments.length === 1) {
    return Config.get(arguments);
  }
  return Config.get();
}*/

// TODO: refactor to Map

var Config = exports.Config = (function () {
  function Config() {
    _classCallCheck(this, Config);
  }

  _prototypeProperties(Config, {
    get: {

      /**
       * @method get
       * @class Config
       * @module chayns.config
       *
       * @param {string} key Reference the `key` in the config `Object`
       * @returns {null} Value of the `key` in the config `Object`
       *                 `undefined` if the `key` was not found
       */

      value: function get(key) {
        if (isPresent(key)) {
          return _config[key];
        }
        return undefined;
      },
      writable: true,
      configurable: true
    },
    set: {

      /**
       *
       * @param key
       * @param value
       * @returns {boolean}
       */

      value: function set(key, value) {
        if (isBlank(key) || isUndefined(value)) {
          return false;
        }
        // TODO: good idea? one should be careful i suppose
        if (isArray(value)) {
          extend(_config, value);
        }
        _config[key] = value;
        return true;
      },
      writable: true,
      configurable: true
    },
    has: {

      /**
       *
       * @param key
       * @returns {boolean}
       */

      value: function has(key) {
        return !!key && key in _config;
      },
      writable: true,
      configurable: true
    }
  });

  return Config;
})();

Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":9}],6:[function(require,module,exports){
"use strict";

/**
 * @name chayns.prepare
 * @module chayns
 *
 * @description
 * Run necessary operations to prepare chayns.
 *
 * @param obj
 * @returns {*}
 */
exports.register = register;

// TODO: register `Function` or preChayns `Object`?
exports.preChayns = preChayns;

/**
 * @name chayns.prepare
 * @module chayns
 *
 * @description
 * Run necessary operations to prepare chayns.
 *
 * @param obj
 * @returns {*}
 */
exports.ready = ready;

/**
 * @name prepare
 * @module chayns
 *
 * @description
 * Run necessary operations to prepare chayns.
 *
 * @private
 * @param obj Reference to chayns Object
 * @returns {*}
 */
exports.setup = setup;

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var isObject = _utils.isObject;
var DOM = _utils.DOM;

var Config = require("./config").Config;

var messageListener = require("./callbacks").messageListener;

var chaynsApiInterface = require("./chayns_api_interface").chaynsApiInterface;

// create new Logger instance
var log = getLogger("chayns.core");

// disable JS Errors in the console
Config.set("preventErrors", false);

/**
 *
 *
 * @description
 *
 *
 * @type {boolean} True if the DOM is loaded
 * @private
 */
var domReady = false;

/**
 *
 * @description
 *
 *
 * @type {array} Contains callbacks for the DOM ready event
 * @private
 */
var readyCallbacks = [];function register(userConfig) {
  log.info("chayns.register");
  Config.set(userConfig); // this reference to the chayns obj
  return this;
}function preChayns() {
  if ("preChayns" in window && isObject(window.preChayns)) {}
}function ready(cb) {
  log.info("chayns.ready");
  if (arguments.length === 0) {
    return;
  }
  if (domReady) {
    // TODO: return a custom Model Object instead of `config`
    cb({
      appName: Config.get("appName"),
      appVersion: Config.get("appVersion")
    });
    return;
  }
  readyCallbacks.push(arguments[0]);
}function setup() {
  log.info("start chayns setup");

  // enable `chayns.css` by adding `chayns` class
  // remove `no-js` class and add `js` class
  var body = document.body;
  DOM.addClass(body, "chayns");
  DOM.addClass(body, "js");
  DOM.removeClass(body, "no-js");

  // add chayns root
  var chaynsRoot = DOM.createElement("div");
  DOM.addClass(chaynsRoot, "chayns-root");
  DOM.appendChild(body, chaynsRoot);

  // run polyfill (if required)

  // run modernizer (feature detection)

  // run fastclick

  // (viewport setup)

  // crate meta tags (colors, mobile icons etc)

  // do some SEO stuff (canonical etc)

  // detect user (logged in?)

  // run chayns setup (colors based on environment)

  // set DOM ready event
  window.addEventListener("DOMContentLoaded", function () {

    domReady = true;
    log.debug("DOM ready");

    DOM.addClass(document.body, "dom-ready");

    // get the App Infos, has to be done when document ready
    var getAppInfosCall = !chaynsApiInterface.getGlobalData(function (data) {

      // now Chayns is officially ready

      log.debug("appInfos callback", data);

      readyCallbacks.forEach(function (callback) {

        callback.call(null, data);
      });
      readyCallbacks = [];

      DOM.addClass(document.body, "chayns-ready");
      DOM.removeAttribute(DOM.query("[chayns-cloak]"), "chayns-cloak");

      log.info("finished chayns setup");
    });

    if (getAppInfosCall) {
      log.error("The AppInfos could not be retrieved.");
    }
  });

  // start window.on('message') listener for Frame Communication
  messageListener();
}

/**
 * @description
 * Detect `Browser`, `OS` and 'Device`
 * as well as `Chayns Environment`, `Chayns User` and `Chayns Site`
 * and assign the data into the environment object
 */
function setEnvironment() {}
Object.defineProperty(exports, "__esModule", {
  value: true
});

// fill config

},{"../utils":9,"./callbacks":2,"./chayns_api_interface":3,"./config":5}],7:[function(require,module,exports){
"use strict";

/**
 * @module chayns.environment
 * @description
 * Chayns Environment
 */

var getLogger = require("../utils").getLogger;

var log = getLogger("chayns.environment");

// TODO: import dependencies
var types = exports.types = {};

types.browser = ["chrome", "firefox", "safari", "opera", "chrome mobile", "safari mobile", "firefox mobile"];

types.os = ["windows", "macOS", "android", "ios", "wp"];

types.chaynsOS = {
  web: "webshadow",
  webMobile: "webshadowmobile",
  app: "webshadowmobile"
};

// location query string
var query = location.search.substr(1);
var parameters = {};
query.split("&").forEach(function (part) {
  var item = part.split("=");
  parameters[item[0].toLowerCase()] = decodeURIComponent(item[1]).toLowerCase();
});

// verify by chayns required parameters exist
if (!parameters.appversion) {
  log.warn("no app version parameter");
}
if (!parameters.os) {
  log.warn("no os parameter");
}
if (parameters.debug) {}

// TODO: further params and colorscheme

function getFirstMatch(regex) {
  var match = ua.match(regex);
  return match && match.length > 1 && match[1] || "";
}

// user agent detection
var userAgent = window.navigator && navigator.userAgent || "";

var is = {
  ios: /iPhone|iPad|iPod/i.test(userAgent),
  android: /Android/i.test(userAgent),
  wp: /windows phone/i.test(userAgent),
  bb: /BlackBerry|BB10|RIM/i.test(userAgent),

  opera: !!window.opera || navigator.userAgent.indexOf(" OPR/") >= 0,
  firefox: typeof InstallTrigger !== "undefined",
  safari: Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor") > 0,
  chrome: !!window.chrome && !(!!window.opera || navigator.userAgent.indexOf(" OPR/") >= 0),
  ie: false || !!document.documentMode,
  ie11: /msie 11/i.test(userAgent),
  ie10: /msie 10/i.test(userAgent),
  ie9: /msie 9/i.test(userAgent),
  ie8: /msie 8/i.test(userAgent),

  mobile: /(iphone|ipod|((?:android)?.*?mobile)|blackberry|nokia)/i.test(userAgent),
  tablet: /(ipad|android(?!.*mobile)|tablet)/i.test(userAgent),
  kindle: /\W(kindle|silk)\W/i.test(userAgent),
  tv: /googletv|sonydtv/i.test(userAgent)
};

// TODO: Browser Version and OS Version detection

// TODO: add fallback
var orientation = Math.abs(window.orientation % 180) === 0 ? "portrait" : "landscape";
var viewport = window.innerWidth + "x" + window.innerHeight;

var environment = exports.environment = {

  //os: parameters.os,
  osVersion: 1,

  browser: "",
  browserVersion: 1,

  //appVersion: parameters.appversion,

  //orientation: orientation,

  //viewport: viewport, // in 1x1 in px

  //ratio: 1, // pixel ratio

  //isInFrame: false,

  //isChaynsWeb: null, // desktop browser, no App, no mobile
  //isChaynsWebMobile: null, // mobile browser, no App, no desktop
  //isApp: false, // otherwise Browser
  //isMobile: null, // no desktop, but mobile browser and app
  //isTablet: null, // no desktop, kinda mobile, most likely no app
  //isDesktop: null, // no app, no mobile
  //isBrowser: null, // otherwise App

  //isIOS: is.ios,
  //isAndroid: is.android,
  //isWP: is.wp,
  //isBB: is.bb,

  //parameters: parameters,
  //hash: location.hash.substr(1),

  site: {
    siteId: 1,
    name: "Tobit",
    locationId: 1,
    url: "https://tobit.com/",
    useSSL: true,
    colorscheme: 1
    //editMode: false, // future edit mode for content
    //isAdminMode: true
  },

  // TODO: consider Tapp
  app: {
    appId: 1,
    config: {},
    //defaultContif: {},
    domReady: false,
    logs: {
      log: [],
      debug: [],
      warn: []
    },
    errors: []
  }
};

environment.parameters = parameters;
environment.hash = location.hash.substr(1);

// WATCH OUT the OS is set by parameter (unfortunately)
environment.os = parameters.os || "noOS"; // TODO: refactor OS
if (is.mobile && ["android", "ios", "wp"].indexOf(parameters.os) !== -1) {
  parameters.os = types.chaynsOS.app;
}

// detection by user agent
environment.isIOS = is.ios;
environment.isAndroid = is.android;
environment.isWP = is.wp;
environment.isBB = is.bb;

// TODO: make sure that this always works! (TSPN, create iframe test page)
environment.isInFrame = window !== window.top;

environment.isApp = parameters.os === types.chaynsOS.app && is.mobile && !environment.isInFrame; // TODO: does this always work?
environment.appVersion = parameters.appversion;

environment.isBrowser = !environment.isApp;

environment.isDesktop = !is.mobile && !is.tablet;

environment.isMobile = is.mobile;
environment.isTablet = is.tablet;

environment.isChaynsWebMobile = parameters.os === types.chaynsOS.webMobile && environment.isInFrame;
environment.isChaynsWebDesktop = parameters.os === types.chaynsOS.web && environment.isInFrame;
environment.isChaynsWeb = environment.isChaynsWebDesktop || environment.isChaynsWebMobile;

// internal TODO: make it private?
environment.canChaynsCall = environment.isApp;
environment.canChaynsWebCall = environment.isChaynsWeb;

environment.viewport = viewport; // TODO: update on resize? no, due performance
environment.orientation = orientation;
environment.ratio = window.devicePixelRatio;
Object.defineProperty(exports, "__esModule", {
  value: true
});

// TODO: enable debug mode

},{"../utils":9}],8:[function(require,module,exports){
"use strict";

var user = exports.user = {
  name: "Pacal Weiland",
  firstName: "Pascal",
  lastName: "Weiland",
  userId: 1234,
  facebookId: 12345,
  isAdmin: true,
  uacGroups: [],
  language: "de_DE",
  token: "token" // TODO include token here?
};
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{}],9:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

var _defaults = function (obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; };

/**
 * @name james or tobi
 * @module james
 *
 * @description
 * # james - tobit helper library
 * Helper library supporting the Chayns API
 */

// TODO: move all to helper.js or tobi/jams
// TODO: helper.js with ES6 and jasmine (and or tape)
// include helper as main module

// important is* functions

_defaults(exports, _interopRequireWildcard(require("./utils/is")));

// extend object function

_defaults(exports, _interopRequireWildcard(require("./utils/extend")));

// modernizer
//export * from './utils/modernizer';

// promise Q
//export * from './utils/promise';

// polyfill & ajax wrapper window.fetch (instead of $.ajax, $.get, $.getJSON, $http)
// offers fetch, fetchJSON (json is standard), uploads {get, post, put, delete}, fetchCSS, fetchJS
//export * from './utils/fetch';

// Browser APIs (window, document, location)
// TODO: consider to not bind browser to the utils `Object`
/* jshint -W116 */
/* jshint -W033 */
// jscs:disable parseError

var browser = _interopRequireWildcard(require("./utils/browser"));

//noinspection BadExpressionStatementJS jshint ignore: line
// jscs:enable parseError
/* jshint +W033 */
/* jshint +W116 */
exports.browser = browser;

// DOM

_defaults(exports, _interopRequireWildcard(require("./utils/dom")));

// Logger

_defaults(exports, _interopRequireWildcard(require("./utils/logger")));

// Analytics
//export * from './utils/analytics';

// Remote
// remote debugging and analysis

// front-end Error Handler (catches errors, identify and analyses them)

_defaults(exports, _interopRequireWildcard(require("./utils/error")));

// auth & JWT handler
//export * from './utils/jwt';

// cookie handler (will be used in the local_storage as fallback)
//export * from './utils/cookie_handler';

// localStorage helper (which cookie fallback)
//export * from './utils/local_storage';

// micro event library

_defaults(exports, _interopRequireWildcard(require("./utils/events")));

// offline cache helper
//export * from './utils/offline_cache';

// notifications: toasts, alerts, modal popups, native push
//export * from './utils/notifications';

// iframe communication and helper (CORS)
//export * from './utils/iframe';

// page visibility API
//export * from './utils/page_visibility';

// DateTime helper (converts dates, C# date, timestamps, i18n, time ago)
//export * from './utils/datetime';

// language API i18n
//export * from './utils/language';

// critical css

// loadCSS

// lazy loading
//export * from './utils/lazy_loading';

// (image) preloader
//export * from '/utils/preloader';

// isPemitted App Version check

_defaults(exports, _interopRequireWildcard(require("./utils/is_permitted")));

// in Future
// immutable
// weak maps
// observer
// web sockets (ws, SignalR)
// worker (shared worker, later service worker as well)
// location, pushState, history handler
// chayns site and code analyser: find deprecated methods, bad code, issues and bottlenecks
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"./utils/browser":10,"./utils/dom":11,"./utils/error":12,"./utils/events":13,"./utils/extend":14,"./utils/is":15,"./utils/is_permitted":16,"./utils/logger":17}],10:[function(require,module,exports){
(function (global){
"use strict";

/**
 * This module contains the Browser APIs
 *
 */

var win = window;

// using node global (mainly for testing, dependency management)
var _global = typeof window === "undefined" ? global : window;
exports.global = _global;
exports.window = win;
var document = exports.document = window.document;
var location = exports.location = window.location;
var navigator = exports.navigator = window.navigator;
var parent = exports.parent = window.parent;
var console = exports.console = window.console; // NOTE: should not be used. use logger instead
var gc = exports.gc = window.gc ? function () {
  return window.gc();
} : function () {
  return null;
};
Object.defineProperty(exports, "__esModule", {
  value: true
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(require,module,exports){
"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

// inspired by Angular2's DOM

var document = require("./browser").document;

var isUndefined = require("./is").isUndefined;

var DOM = exports.DOM = (function () {
  function DOM() {
    _classCallCheck(this, DOM);
  }

  _prototypeProperties(DOM, {
    $: {

      // NOTE: always returns an array

      value: function $(selector) {
        return document.querySelectorAll.bind(document);
      },
      writable: true,
      configurable: true
    },
    query: {

      // selectors

      value: function query(selector) {
        return document.querySelector(selector);
      },
      writable: true,
      configurable: true
    },
    querySelector: {
      value: function querySelector(el, selector) {
        return el.querySelector(selector);
      },
      writable: true,
      configurable: true
    },
    querySelectorAll: {
      value: function querySelectorAll(el, selector) {
        return el.querySelectorAll(selector);
      },
      writable: true,
      configurable: true
    },
    on: {
      value: function on(el, evt, listener) {
        el.addEventListener(evt, listener, false);
      },
      writable: true,
      configurable: true
    },
    clone: {

      // nodes & elements

      value: function clone(node) {
        return node.cloneNode(true);
      },
      writable: true,
      configurable: true
    },
    hasProperty: {
      value: function hasProperty(element, name) {
        return name in element;
      },
      writable: true,
      configurable: true
    },
    getElementsByClassName: {
      value: function getElementsByClassName(element, name) {
        return element.getElementsByClassName(name);
      },
      writable: true,
      configurable: true
    },
    getElementsByTagName: {
      value: function getElementsByTagName(element, name) {
        return element.getElementsByTagName(name);
      },
      writable: true,
      configurable: true
    },
    getInnerHTML: {

      // input

      value: function getInnerHTML(el) {
        return el.innerHTML;
      },
      writable: true,
      configurable: true
    },
    getOuterHTML: {
      value: function getOuterHTML(el) {
        return el.outerHTML;
      },
      writable: true,
      configurable: true
    },
    setHTML: {
      value: function setHTML(el, value) {
        el.innerHTML = value;
      },
      writable: true,
      configurable: true
    },
    getText: {
      value: function getText(el) {
        return el.textContent;
      },
      writable: true,
      configurable: true
    },
    setText: {
      value: function setText(el, value) {
        el.textContent = value;
      },
      writable: true,
      configurable: true
    },
    getValue: {

      // input value

      value: function getValue(el) {
        return el.value;
      },
      writable: true,
      configurable: true
    },
    setValue: {
      value: function setValue(el, value) {
        el.value = value;
      },
      writable: true,
      configurable: true
    },
    getChecked: {

      // checkboxes

      value: function getChecked(el) {
        return el.checked;
      },
      writable: true,
      configurable: true
    },
    setChecked: {
      value: function setChecked(el, value) {
        el.checked = value;
      },
      writable: true,
      configurable: true
    },
    classList: {

      // class

      value: function classList(element) {
        return Array.prototype.slice.call(element.classList, 0);
      },
      writable: true,
      configurable: true
    },
    addClass: {
      value: function addClass(element, className) {
        element.classList.add(className);
      },
      writable: true,
      configurable: true
    },
    removeClass: {
      value: function removeClass(element, className) {
        element.classList.remove(className);
      },
      writable: true,
      configurable: true
    },
    hasClass: {
      value: function hasClass(element, className) {
        return element.classList.contains(className);
      },
      writable: true,
      configurable: true
    },
    css: {

      // css

      value: function css(element, styleName, styleVhasalue) {
        if (isUndefined(styleValue)) {
          return element.style[styleName];
        }
        element.style[styleName] = styleValue;
      },
      writable: true,
      configurable: true
    },
    setCSS: {
      value: function setCSS(element, styleName, styleValue) {
        element.style[styleName] = styleValue;
      },
      writable: true,
      configurable: true
    },
    removeCSS: {
      value: function removeCSS(element, styleName) {
        element.style[styleName] = null;
      },
      writable: true,
      configurable: true
    },
    getCSS: {
      value: function getCSS(element, styleName) {
        return element.style[styleName];
      },
      writable: true,
      configurable: true
    },
    createElement: {

      // nodes & elements

      value: function createElement(tagName) {
        var doc = arguments[1] === undefined ? document : arguments[1];

        return doc.createElement(tagName);
      },
      writable: true,
      configurable: true
    },
    remove: {
      value: function remove(el) {
        var parent = el.parentNode;
        parent.removeChild(el);
        return el;
      },
      writable: true,
      configurable: true
    },
    appendChild: {
      value: function appendChild(el, node) {
        el.appendChild(node);
      },
      writable: true,
      configurable: true
    },
    removeChild: {
      value: function removeChild(el, node) {
        el.removeChild(node);
      },
      writable: true,
      configurable: true
    },
    insertBefore: {
      value: function insertBefore(el, node) {
        el.parentNode.insertBefore(node, el);
      },
      writable: true,
      configurable: true
    },
    insertAfter: {
      value: function insertAfter(el, node) {
        el.parentNode.insertBefore(node, el.nextSibling);
      },
      writable: true,
      configurable: true
    },
    tagName: {
      value: function tagName(element) {
        return element.tagName;
      },
      writable: true,
      configurable: true
    },
    getAttribute: {

      // attributes

      value: function getAttribute(element, attribute) {
        return element.getAttribute(attribute);
      },
      writable: true,
      configurable: true
    },
    setAttribute: {
      value: function setAttribute(element, name, value) {
        element.setAttribute(name, value);
      },
      writable: true,
      configurable: true
    },
    removeAttribute: {
      value: function removeAttribute(element, attribute) {
        if (!element) {
          return element;
        }
        return element.removeAttribute(attribute);
      },
      writable: true,
      configurable: true
    }
  });

  return DOM;
})();

Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"./browser":10,"./is":15}],12:[function(require,module,exports){
"use strict";

/**
 * Error Handler Module
 */

// TODO: consider importing from './utils' only

var win = require("./browser").window;

var getLogger = require("./logger").getLogger;

var Config = require("../chayns/config").Config;

var log = getLogger("chayns.error");

win.addEventListener("error", function (err) {
  var lineAndColumnInfo = err.colno ? " line:" + err.lineno + ", column:" + err.colno : " line:" + err.lineno;

  var finalError = ["JavaScript Error", err.message, err.filename + lineAndColumnInfo + " -> " + navigator.userAgent, 0, true];

  // TODO: add proper Error Handler
  log.warn(finalError);
  if (Config.get("preventErrors")) {
    err.preventDefault();
  }
  return false;
});

},{"../chayns/config":5,"./browser":10,"./logger":17}],13:[function(require,module,exports){
"use strict";

// TODO: refactor and write tests
// TODO: add example
/**
 * @description
 ```js
 // Demo

 events.publish('/page/load', {
	url: '/some/url/path' // any argument
});

 var subscription = events.subscribe('/page/load', function(obj) {
	// Do something now that the event has occurred
});

 // ...sometime later where I no longer want subscription...
 subscription.remove();

 //  var target = window.event ? window.event.srcElement : e ? e.target : null;
 ```
 */
var events = exports.events = (function () {
  var topics = {};
  var ownProperty = topics.hasOwnProperty;

  return {
    subscribe: function subscribe(topic, listener) {
      // Create the topic's object if not yet created
      if (!ownProperty.call(topics, topic)) {
        topics[topic] = [];
      }

      // Add the listener to queue
      var index = topics[topic].push(listener) - 1;

      // Provide handle back for removal of topic
      return {
        remove: function remove() {
          delete topics[topic][index];
        }
      };
    },

    publish: function publish(topic, info) {
      // If the topic doesn't exist, or there's no listeners in queue, just leave
      if (!ownProperty.call(topics, topic)) {
        return;
      }

      // Cycle through topics queue, fire!
      topics[topic].forEach(function (item) {
        item(info !== undefined ? info : {});
      });
    }
  };
})();
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{}],14:[function(require,module,exports){
"use strict";

exports.extend = extend;
/**
 * @name james.extend
 *
 * @description
 * Extends the destination object by copying properties from the src object.
 *
 * @param obj
 * @returns {*}
 */

var isObject = require("./is").isObject;

function extend(obj) {
  if (!isObject(obj)) {
    return obj;
  }
  var source, prop;
  for (var i = 1, length = arguments.length; i < length; i++) {
    source = arguments[i];
    for (prop in source) {
      obj[prop] = source[prop];
    }
  }
  return obj;
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"./is":15}],15:[function(require,module,exports){
"use strict";

/**
 * @name james.isUndefined
 * @module james
 * @kind function
 *
 * @description
 * Determines if a reference is undefined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is undefined.
 */
exports.isUndefined = isUndefined;

/**
 * @name james.isDefined
 * @module james
 * @kind function
 *
 * @description
 * Determines if a reference is defined.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is defined.
 */
exports.isDefined = isDefined;

/**
 * @name james.isPresent
 * @module james
 * @kind function
 *
 * @description
 * Determines if a reference is neither undefined nor null.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is present.
 */
exports.isPresent = isPresent;

/**
 * @name james.isBlank
 * @module james
 * @kind function
 *
 * @description
 * Determines if a reference is either undefined or null.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is blank.
 */
exports.isBlank = isBlank;

/**
* @name james.isString
* @module james
* @kind function
*
* @description
* Determines if a reference is a `String`.
*
* @param {*} value Reference to check.
* @returns {boolean} True if `value` is a `String`.
*/
exports.isString = isString;

/**
 * @name james.isNumber
 * @module james
 * @kind function
 *
 * @description
 * Determines if a reference is a `Number`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Number`.
 */
exports.isNumber = isNumber;

/**
 * @name james.isObject
 *
 * @description
 * Determines if a reference is an `Object`.
 * null is not treated as an object.
 * In JS arrays are objects
 *
 * @param obj
 * @returns {boolean} True if `value` is an `Object`.
 */
exports.isObject = isObject;

/**
 * @name james.isFunction
 * @module james
 * @kind function
 *
 * @description
 * Determines if a reference is a `Function`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Function`.
 */
exports.isFunction = isFunction;

/**
 * @name james.isDate
 * @module james
 * @kind function
 *
 * @description
 * Determines if a value is a date.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `Date`.
 */
exports.isDate = isDate;

// TODO: does not belong in here
/**
 * @name utils.trim
 * @module chayns.utils
 * @kind function
 *
 * @description
 * Removes whitespaces.
 *
 * @param {*} value Reference to check.
 * @returns {String|*} Trimmed  value
 */
exports.trim = trim;

/**
 * @name utils.isUUID
 * @module chayns.utils
 * @kind function
 *
 * @description
 * Determines if a reference is a `UUID` (OSF).
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `UUID`.
 */
exports.isUUID = isUUID;

/**
 * @name utils.isGUID
 * @alias utils.isUUID
 * @module chayns.utils
 * @kind function
 *
 * @description
 * Determines if a reference is a `GUID` (Microsoft Standard).
 * Is an alias to isUUID
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `GUID`.
 */
exports.isGUID = isGUID;

/**
 * @name utils.isMacAddress
 * @module chayns.utils
 * @kind function
 *
 * @description
 * Determines if a reference is a `MAC Address`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `MAC Address`.
 */
exports.isMacAddress = isMacAddress;

/**
 * @name utils.isBLEAddress
 * @module chayns.utils
 * @kind function
 *
 * @description
 * Determines if a reference is a `BLE Address`
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is a `BLE Address`.
 */
exports.isBLEAddress = isBLEAddress;
function isUndefined(value) {
  return typeof value === "undefined";
}function isDefined(value) {
  return typeof value !== "undefined";
}function isPresent(obj) {
  return obj !== undefined && obj !== null;
}function isBlank(obj) {
  return obj === undefined || obj === null;
}function isString(value) {
  return typeof value === "string";
}function isNumber(value) {
  return typeof value === "number";
}function isObject(value) {
  return value !== null && typeof value === "object";
}

/**
 * @name james.isArray
 *
 * @description
 * Determines if a reference is an `Array`.
 *
 * @param {*} value Reference to check.
 * @returns {boolean} True if `value` is an `Array`.
 */
var isArray = exports.isArray = Array.isArray;function isFunction(value) {
  return typeof value === "function";
}function isDate(value) {
  return toString.call(value) === "[object Date]";
}function trim(value) {
  return isString(value) ? value.replace(/^\s+|\s+$/g, "") : value;
}function isUUID(value) {
  if (isString(value)) {
    value = trim(value);
    return value.match(/^[0-9a-f]{4}([0-9a-f]{4}-){4}[0-9a-z]{12}$/i) !== null;
  }
  return false;
}function isGUID(value) {
  return isUUID(value);
}function isMacAddress(value) {
  if (isString(value)) {
    value = trim(value);
    return value.match(/^([0-9a-f]{2}[-:]){5}[0-9a-f]{2}$/i) !== null;
  }
  return false;
}function isBLEAddress(value) {
  return isUUID(value) || isMacAddress(value);
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{}],16:[function(require,module,exports){
"use strict";

/**
 * @description
 * Determine whether the current user's OS and OS Version is higher
 * or equal to the passed reference `Object`.
 *
 * @param {Object} versions Versions `Object` with permitted OSs and their version.
 * @param {string} os OS Name as lowercase string.
 * @param {Integer} appVersion App Version Number as Integer  TODO: format RFC?
 * @returns {Boolean} True if the current OS & Version are defined in the versions `Object`
 */
exports.isPermitted = isPermitted;

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var isObject = _utils.isObject;

var log = getLogger("chayns.utils.is_permitted");function isPermitted(versions, os, appVersion) {

  if (!versions || !isObject(versions)) {
    log.warn("no versions `Object` was passed");
    return false;
  }

  return versions[os] && appVersion >= versions[os];
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":9}],17:[function(require,module,exports){
"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

/**
 * Set the current logLevel
 * in order to show or not show logs
 * @param level
 */
exports.setLevel = setLevel;

/**
 * Get Logger Singleton Instance
 * @param  {string} name The Logger's name
 * @returns {Logger} Logger instance, either existing one or creates a new one
 */
exports.getLogger = getLogger;
/**
 * LogLevel Enum
 * none is 0
 * debug is 4
 * @type Enum
 */
var levels = exports.levels = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

/**
 * Can store multiple loggers
 * @type {`Object`} loggers
 */
var loggers = {};

/**
 * @description
 * Assign the logger method.
 * By default the window.console `Object`
 * @type `window.console`
 */
var logger = window.console;

/**
 * Set the current log Level
 * use `setLevel(newLogLevel)` to overwrite this value.
 * TODO: each logger gets an own logLevel
 */
var logLevel = levels.none;

/**
 *
 * @param level
 * @param args
 * @private
 */
function log(level, args, prefix) {
  var slice = Array.prototype.slice;
  if (prefix) {
    args = slice.call(args);
    //args.unshift(time); // TODO: consider toggleable time
    args.unshift(prefix);
  }
  logger[level || "log"].apply(console, args);
}function setLevel(level) {
  logLevel = level;
}function getLogger(name) {
  return loggers[name] || (loggers[name] = new Logger(name));
}

/**
 * Logger class
 */

var Logger = exports.Logger = (function () {

  /**
   * Each logger is identified by it's name.
   * @param {string} name Name of the logger (e.g. `chayns.core`)
   */

  function Logger(name) {
    _classCallCheck(this, Logger);

    this.name = "[" + name + "]: ";
  }

  _prototypeProperties(Logger, null, {
    debug: {

      /**
       * Logs a debug message.
       *
       * @method debug
       * @param {string} message The message to log
       */

      value: function debug() {
        if (logLevel < 4) {
          return;
        }
        log("debug", arguments, this.name);
      },
      writable: true,
      configurable: true
    },
    info: {

      /**
       * Logs info.
       *
       * @method info
       * @param {string} message The message to log
       */

      value: function info() {
        if (logLevel < 3) {
          return;
        }
        log("info", arguments, this.name);
      },
      writable: true,
      configurable: true
    },
    warn: {

      /**
       * Logs a warning.
       *
       * @method warn
       * @param {string} message The message to log
       */

      value: function warn() {
        if (logLevel < 2) {
          return;
        }

        log("warn", arguments, this.name);
      },
      writable: true,
      configurable: true
    },
    error: {

      /**
       * Logs an error.
       *
       * @method error
       * @param {string} message The message to log
       */

      value: function error() {
        if (logLevel < 1) {
          return;
        }
        log("error", arguments, this.name);
      },
      writable: true,
      configurable: true
    }
  });

  return Logger;
})();

Object.defineProperty(exports, "__esModule", {
  value: true
});

},{}],"chayns":[function(require,module,exports){
"use strict";

var chayns = require("./chayns").chayns;

module.exports = chayns;

},{"./chayns":1}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdXNlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9icm93c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9lcnJvci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9ldmVudHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXh0ZW5kLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzX3Blcm1pdHRlZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9sb2dnZXIuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zLXVtZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7OztJQ09ZLEtBQUssbUNBQW9CLFNBQVM7O0FBQzlDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7OztBQUcxQixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7O0lBR1YsTUFBTSxXQUF1QixpQkFBaUIsRUFBOUMsTUFBTTs7OztJQUdOLFdBQVcsV0FBa0Isc0JBQXNCLEVBQW5ELFdBQVc7Ozs7SUFHWCxJQUFJLFdBQXlCLGVBQWUsRUFBNUMsSUFBSTs7OzswQkFHeUIsZUFBZTs7SUFBNUMsS0FBSyxlQUFMLEtBQUs7SUFBRSxRQUFRLGVBQVIsUUFBUTtJQUFFLEtBQUssZUFBTCxLQUFLOzs7O0lBSXRCLE9BQU8sV0FBc0IsdUJBQXVCLEVBQXBELE9BQU87O0lBRVAsa0JBQWtCLFdBQVcsK0JBQStCLEVBQTVELGtCQUFrQjs7O0FBSW5CLElBQUksTUFBTSxXQUFOLE1BQU0sR0FBRyxFQUFFLENBQUM7O0FBRXZCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFB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QUs7Ozs7Ozs7OzthQUFBLGlCQUFHO0FBQ04sWUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFO0FBQ2hCLGlCQUFPO1NBQ1I7QUFDRCxXQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDcEM7Ozs7OztTQTlEVSxNQUFNOzs7Ozs7Ozs7O0lDdkVYLE1BQU0sV0FBTyxVQUFVLEVBQXZCLE1BQU07O2lCQUNDLE1BQU0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAbmFtZSBjaGF5bnMgQVBJXG4gKiBAbW9kdWxlIGNoYXluc1xuICovXG5cbi8vIGhlbHBlclxuLy8gVE9ETzogZWl0aGVyIGluZGV4LmpzLCB1dGlscy5qcyBvciBqdXN0IHRoZSBzaW5nbGUgZmlsZXNcbmltcG9ydCAqIGFzIHV0aWxzICAgICAgICAgICAgICAgZnJvbSAnLi91dGlscyc7XG52YXIgZXh0ZW5kID0gdXRpbHMuZXh0ZW5kO1xuXG4vLyBzZXQgbG9nTGV2ZWwgdG8gaW5mb1xudXRpbHMuc2V0TGV2ZWwoNCk7IC8vIFRPRE86IGRvbid0IHNldCB0aGUgbGV2ZWwgaGVyZVxuXG4vLyBiYXNpYyBjb25maWdcbmltcG9ydCB7Y29uZmlnfSAgICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY29uZmlnJztcblxuLy8gZW52aXJvbm1lbnRcbmltcG9ydCB7ZW52aXJvbm1lbnR9ICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvZW52aXJvbm1lbnQnO1xuXG4vLyAoY3VycmVudCkgdXNlclxuaW1wb3J0IHt1c2VyfSAgICAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy91c2VyJztcblxuLy8gY29yZSBmdW5jdGlvbnNcbmltcG9ydCB7cmVhZHksIHJlZ2lzdGVyLCBzZXR1cH0gZnJvbSAnLi9jaGF5bnMvY29yZSc7XG5cbi8vIGNoYXlucyBjYWxsc1xuXG5pbXBvcnQge2FwaUNhbGx9ICAgICAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2NoYXluc19jYWxscyc7XG5cbmltcG9ydCB7Y2hheW5zQXBpSW50ZXJmYWNlfSAgICAgZnJvbSAnLi9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuXG5cbi8vIHB1YmxpYyBjaGF5bnMgb2JqZWN0XG5leHBvcnQgdmFyIGNoYXlucyA9IHt9O1xuXG5leHRlbmQoY2hheW5zLCB7Z2V0TG9nZ2VyOiB1dGlscy5nZXRMb2dnZXJ9KTsgLy8ganNoaW50IGlnbm9yZTogbGluZVxuZXh0ZW5kKGNoYXlucywge3V0aWxzfSk7XG5leHRlbmQoY2hheW5zLCB7VkVSU0lPTjogJzAuMS4wJ30pO1xuLy9leHRlbmQoY2hheW5zLCB7Y29uZmlnfSk7IC8vIFRPRE86IHRoZSBjb25maWcgYE9iamVjdGAgc2hvdWxkIG5vdCBiZSBleHBvc2VkXG5cbmV4dGVuZChjaGF5bnMsIHtlbnY6IGVudmlyb25tZW50fSk7IC8vIFRPRE86IGdlbmVyYWxseSByZW5hbWVcbmV4dGVuZChjaGF5bnMsIHt1c2VyfSk7XG5cbmV4dGVuZChjaGF5bnMsIHtyZWdpc3Rlcn0pO1xuZXh0ZW5kKGNoYXlucywge3JlYWR5fSk7XG5cbmV4dGVuZChjaGF5bnMsIHthcGlDYWxsfSk7XG5cbi8vIGFkZCBhbGwgY2hheW5zQXBpSW50ZXJmYWNlIG1ldGhvZHMgZGlyZWN0bHkgdG8gdGhlIGBjaGF5bnNgIE9iamVjdFxuZXh0ZW5kKGNoYXlucywgY2hheW5zQXBpSW50ZXJmYWNlKTtcblxuLy8gc2V0dXAgY2hheW5zXG5zZXR1cCgpO1xuXG5cbi8vIGNoYXlucyBwdWJsaXNoIG5vIFVNRFxuLy93aW5kb3cuY2hheW5zID0gY2hheW5zO1xuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzRnVuY3Rpb24sIGlzVW5kZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvd30gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY2FsbGJhY2tzJyk7XG5cbmxldCBub29wID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG5sZXQgY2FsbGJhY2tzID0ge307XG4vKipcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgRnVuY3Rpb24gdG8gYmUgaW52b2tlZFxuICogQHBhcmFtIHtCb29sZWFufSBpc0NoYXluc0NhbGwgSWYgdHJ1ZSB0aGVuIHRoZSBjYWxsIHdpbGwgYmUgYXNzaWduZWQgdG8gYGNoYXlucy5fY2FsbGJhY2tzYFxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgcGFyYW1ldGVycyBhcmUgdmFsaWQgYW5kIHRoZSBjYWxsYmFjayB3YXMgc2F2ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldENhbGxiYWNrKG5hbWUsIGZuLCBpc0NoYXluc0NhbGwpIHtcblxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBsb2cud2Fybignc2V0Q2FsbGJhY2s6IG5hbWUgaXMgdW5kZWZpbmVkJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghaXNGdW5jdGlvbihmbikpIHtcbiAgICBsb2cud2Fybignc2V0Q2FsbGJhY2s6IGZuIGlzIG5vIEZ1bmN0aW9uJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKG5hbWUuaW5kZXhPZignKCknKSAhPT0gLTEpIHsgLy8gc3RyaXAgJygpJ1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoJygpJywgJycpO1xuICB9XG5cbiAgbG9nLmRlYnVnKCdzZXRDYWxsYmFjazogc2V0IENhbGxiYWNrOiAnICsgbmFtZSk7XG4gIC8vaWYgKG5hbWUgaW4gY2FsbGJhY2tzKSB7XG4gIC8vICBjYWxsYmFja3NbbmFtZV0ucHVzaChmbik7IC8vIFRPRE86IHJlY29uc2lkZXIgQXJyYXkgc3VwcG9ydFxuICAvL30gZWxzZSB7XG4gICAgY2FsbGJhY2tzW25hbWVdID0gZm47IC8vIEF0dGVudGlvbjogd2Ugc2F2ZSBhbiBBcnJheVxuICAvL31cblxuICBpZiAoaXNDaGF5bnNDYWxsKSB7XG4gICAgbG9nLmRlYnVnKCdzZXRDYWxsYmFjazogcmVnaXN0ZXIgZm4gYXMgZ2xvYmFsIGNhbGxiYWNrJyk7XG4gICAgd2luZG93Ll9jaGF5bnNDYWxsYmFja3NbbmFtZV0gPSBjYWxsYmFjayhuYW1lLCAnQ2hheW5zQ2FsbCcpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogUmVnaXN0ZXIgY2FsbGJhY2tzIGZvciBDaGF5bnNDYWxscyBhbmQgQ2hheW5zV2ViQ2FsbHNcbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGNhbGxiYWNrTmFtZSBOYW1lIG9mIHRoZSBGdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgRWl0aGVyICdDaGF5bnNXZWJDYWxsJyBvciAnQ2hheW5zQ2FsbCdcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gaGFuZGxlRGF0YSBSZWNlaXZlcyBjYWxsYmFjayBkYXRhXG4gKi9cbmZ1bmN0aW9uIGNhbGxiYWNrKGNhbGxiYWNrTmFtZSwgdHlwZSkge1xuXG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVEYXRhKCkge1xuXG4gICAgaWYgKGNhbGxiYWNrTmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgICAgIGxvZy5kZWJ1ZygnaW52b2tlIGNhbGxiYWNrOiAnLCBjYWxsYmFja05hbWUpO1xuICAgICAgdmFyIGZuID0gY2FsbGJhY2tzW2NhbGxiYWNrTmFtZV07XG4gICAgICBpZiAoaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgZGVsZXRlIGNhbGxiYWNrc1tjYWxsYmFja05hbWVdOyAvLyBUT0RPOiBjYW5ub3QgYmUgbGlrZSB0aGF0LCByZW1vdmUgYXJyYXk/XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cud2FybignY2FsbGJhY2sgaXMgbm8gZnVuY3Rpb24nLCBjYWxsYmFja05hbWUsIGZuKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmluZm8oJ2NhbGxiYWNrICcgKyBjYWxsYmFja05hbWUgKyAnIGRpZCBub3QgZXhpc3QgaW4gY2FsbGJhY2tzIGFycmF5Jyk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5fY2FsbGJhY2tzXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQ2hheW5zIENhbGwgQ2FsbGJhY2tzXG4gKiB3aWxsIGJlIGFzc2lnbmVkIHRvIHRoZSBgY2hheW5zLl9jYWxsYmFja3NgIG9iamVjdFxuICpcbiAqIEB0eXBlIHtPYmplY3R9IGNoYXluc0NhbGxzQ2FsbGJhY2tzXG4gKi9cbndpbmRvdy5fY2hheW5zQ2FsbGJhY2tzID0ge1xuICAvLy8vIFRPRE86IHdyYXAgY2FsbGJhY2sgZnVuY3Rpb24gKERSWSlcbiAgLy9nZXRHbG9iYWxEYXRhOiBjYWxsYmFjaygnZ2V0R2xvYmFsRGF0YScsICdDaGF5bnNDYWxsJykgLy8gZXhhbXBsZVxuICBnZXRHZW9Mb2NhdGlvbkNhbGxiYWNrOiBub29wXG59O1xuXG5cbi8vIFRPRE86IG1vdmUgdG8gYW5vdGhlciBmaWxlPyBjb3JlLCBjaGF5bnNfY2FsbHNcbnZhciBtZXNzYWdlTGlzdGVuaW5nID0gZmFsc2U7XG5leHBvcnQgZnVuY3Rpb24gbWVzc2FnZUxpc3RlbmVyKCkge1xuICBpZiAobWVzc2FnZUxpc3RlbmluZykge1xuICAgIGxvZy5pbmZvKCd0aGVyZSBpcyBhbHJlYWR5IG9uZSBtZXNzYWdlIGxpc3RlbmVyIG9uIHdpbmRvdycpO1xuICAgIHJldHVybjtcbiAgfVxuICBtZXNzYWdlTGlzdGVuaW5nID0gdHJ1ZTtcbiAgbG9nLmRlYnVnKCdtZXNzYWdlIGxpc3RlbmVyIGlzIHN0YXJ0ZWQnKTtcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIG9uTWVzc2FnZShlKSB7XG5cbiAgICBsb2cuZGVidWcoJ25ldyBtZXNzYWdlICcpO1xuXG4gICAgdmFyIG5hbWVzcGFjZSA9ICdjaGF5bnMuY3VzdG9tVGFiLicsXG4gICAgICBkYXRhID0gZS5kYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBkYXRhICE9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBzdHJpcCBuYW1lc3BhY2UgZnJvbSBkYXRhXG4gICAgZGF0YSA9IGRhdGEuc3Vic3RyKG5hbWVzcGFjZS5sZW5ndGgsIGRhdGEubGVuZ3RoIC0gbmFtZXNwYWNlLmxlbmd0aCk7XG4gICAgdmFyIG1ldGhvZCA9IGRhdGEubWF0Y2goL1teOl0qOi8pOyAvLyBkZXRlY3QgbWV0aG9kXG4gICAgaWYgKG1ldGhvZCAmJiBtZXRob2QubGVuZ3RoID4gMCkge1xuICAgICAgbWV0aG9kID0gbWV0aG9kWzBdO1xuXG4gICAgICB2YXIgcGFyYW1zID0gZGF0YS5zdWJzdHIobWV0aG9kLmxlbmd0aCwgZGF0YS5sZW5ndGggLSBtZXRob2QubGVuZ3RoKTtcbiAgICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwYXJhbXMgPSBKU09OLnBhcnNlKHBhcmFtcyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICB9XG5cbiAgICAgIC8vIHJlbW92ZSB0aGUgbGFzdCAnKSdcbiAgICAgIG1ldGhvZCA9IG1ldGhvZC5zdWJzdHIoMCwgbWV0aG9kLmxlbmd0aCAtIDEpO1xuXG4gICAgICAvLyB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gY2FuIGJlIGludm9rZWQgZGlyZWN0bHlcbiAgICAgIGNhbGxiYWNrKG1ldGhvZCwgJ0NoYXluc1dlYkNhbGwnKShwYXJhbXMpO1xuICAgIH1cbiAgfSk7XG59XG4iLCJpbXBvcnQge2FwaUNhbGx9IGZyb20gJy4vY2hheW5zX2NhbGxzJztcbmltcG9ydCB7Z2V0TG9nZ2VyLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzQkxFQWRkcmVzcywgaXNEYXRlLCBpc1ByZXNlbnR9IGZyb20gJy4uL3V0aWxzJztcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zX2FwaV9pbnRlcmZhY2UnKTtcbi8qKlxuICogQWxsIHB1YmxpYyBjaGF5bnMgbWV0aG9kcyB0byBpbnRlcmFjdCB3aXRoICpDaGF5bnMgQXBwKiBvciAqQ2hheW5zIFdlYipcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmV4cG9ydCB2YXIgY2hheW5zQXBpSW50ZXJmYWNlID0ge1xuXG4gIC8vIFRPRE86IHJlbmFtZSB0byBlbmFibGVQdWxsVG9SZWZyZXNoXG4gIGFsbG93UmVmcmVzaFNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLnNldFB1bGxUb1JlZnJlc2godHJ1ZSk7XG4gIH0sXG4gIGRpc2FsbG93UmVmcmVzaFNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLnNldFB1bGxUb1JlZnJlc2goZmFsc2UpO1xuICB9LFxuICAvKipcbiAgICogRW5hYmxlIG9yIGRpc2FibGUgUHVsbFRvUmVmcmVzaFxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFsbG93UHVsbCBBbGxvdyBQdWxsVG9SZWZyZXNoXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2VlZGVkXG4gICAqL1xuICBzZXRQdWxsVG9SZWZyZXNoOiBmdW5jdGlvbihhbGxvd1B1bGwpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDAsXG4gICAgICB3ZWJGbjogZmFsc2UsIC8vIGNvdWxkIGJlIG9taXR0ZWRcbiAgICAgIHBhcmFtczogW3snYm9vbCc6IGFsbG93UHVsbH1dXG4gICAgfSk7XG4gIH0sXG5cbiAgc2hvd1dhaXRjdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0V2FpdGN1cnNvcih0cnVlKTtcbiAgfSxcbiAgaGlkZVdhaXRjdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0V2FpdGN1cnNvcihmYWxzZSk7XG4gIH0sXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtzaG93Q3Vyc29yXSBJZiB0cnVlIHRoZSB3YWl0Y3Vyc29yIHdpbGwgYmUgc2hvd25cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJ3aXNlIGl0IHdpbGwgYmUgaGlkZGVuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2V0V2FpdGN1cnNvcjogZnVuY3Rpb24oc2hvd0N1cnNvcikge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMSxcbiAgICAgIHdlYkZuOiAoc2hvd0N1cnNvciA/ICdzaG93JyA6ICdoaWRlJykgKyAnTG9hZGluZ0N1cnNvcicsXG4gICAgICBwYXJhbXM6IFt7J2Jvb2wnOiBzaG93Q3Vyc29yfV1cbiAgICB9KTtcbiAgfSxcblxuICAvLyBUT0RPOiBuYW1lIGl0IFRhcHA/XG4gIC8qKlxuICAgKiBTZWxlY3QgZGlmZmVyZW50IFRhcHAgaWRlbnRpZmllZCBieSBUYXBwSUQgb3IgSW50ZXJuYWxUYXBwTmFtZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGFiIFRhcHAgTmFtZSBvciBUYXBwIElEXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAob3B0aW9uYWwpIHBhcmFtIFVSTCBQYXJhbWV0ZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZWxlY3RUYWI6IGZ1bmN0aW9uKHRhYiwgcGFyYW0pIHtcblxuICAgIGxldCBjbWQgPSAxMzsgLy8gc2VsZWN0VGFiIHdpdGggcGFyYW0gQ2hheW5zQ2FsbFxuXG4gICAgLy8gdXBkYXRlIHBhcmFtOiBzdHJpcCA/IGFuZCBlbnN1cmUgJiBhdCB0aGUgYmVnaW5cbiAgICBpZiAocGFyYW0gJiYgIXBhcmFtLm1hdGNoKC9eWyZ8XFw/XS8pKSB7IC8vIG5vICYgYW5kIG5vID9cbiAgICAgIHBhcmFtID0gJyYnICsgcGFyYW07XG4gICAgfSBlbHNlIGlmIChwYXJhbSkge1xuICAgICAgcGFyYW0gPSBwYXJhbS5yZXBsYWNlKCc/JywgJyYnKTtcbiAgICB9IGVsc2UgeyAvLyBubyBwYXJhbXMsIGRpZmZlcmVudCBDaGF5bnNDYWxsXG4gICAgICBjbWQgPSAyO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgd2ViRm46ICdzZWxlY3RvdGhlcnRhYicsXG4gICAgICBwYXJhbXM6IGNtZCA9PT0gMTNcbiAgICAgICAgPyBbeydzdHJpbmcnOiB0YWJ9LCB7J3N0cmluZyc6IHBhcmFtfV1cbiAgICAgICAgOiBbeydzdHJpbmcnOiB0YWJ9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBUYWI6IHRhYixcbiAgICAgICAgUGFyYW1ldGVyOiBwYXJhbVxuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwMiwgaW9zOiAxMzgzLCB3cDogMjQ2OSB9IC8vIGZvciBuYXRpdmUgYXBwcyBvbmx5XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBBbGJ1bVxuICAgKlxuICAgKiBAcGFyYW0ge2lkfHN0cmluZ30gaWQgQWxidW0gSUQgKEFsYnVtIE5hbWUgd2lsbCB3b3JrIGFzIHdlbGwsIGJ1dCBkbyBwcmVmZXIgSURzKVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNlbGVjdEFsYnVtOiBmdW5jdGlvbihpZCkge1xuICAgIGlmICghaXNTdHJpbmcoaWQpICYmICFpc051bWJlcihpZCkpIHtcbiAgICAgIGxvZy5lcnJvcignc2VsZWN0QWxidW06IGludmFsaWQgYWxidW0gbmFtZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMsXG4gICAgICB3ZWJGbjogJ3NlbGVjdEFsYnVtJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogaWR9XSxcbiAgICAgIHdlYlBhcmFtczogaWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBQaWN0dXJlXG4gICAqIChvbGQgU2hvd1BpY3R1cmUpXG4gICAqIEFuZHJvaWQgZG9lcyBub3Qgc3VwcG9ydCBnaWZzIDooXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgSW1hZ2UgVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuUGljdHVyZTogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goL2pwZyR8cG5nJHxnaWYkL2kpKSB7IC8vIFRPRE86IG1vcmUgaW1hZ2UgdHlwZXM/XG4gICAgICBsb2cuZXJyb3IoJ29wZW5QaWN0dXJlOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQsXG4gICAgICB3ZWJGbjogJ3Nob3dQaWN0dXJlJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybCxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNjM2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICogVE9ETzogaW1wbGVtZW50IGludG8gQ2hheW5zIFdlYj9cbiAgICogVE9ETzogcmVuYW1lIHRvIHNldD9cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHQgVGhlIEJ1dHRvbidzIHRleHRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgY2FwdGlvbiBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbih0ZXh0LCBjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy9sb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIHZhbGlkIGNhbGxiYWNrIEZ1bmN0aW9uLicpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpcyBubyB2YWxpZCBjYWxsYmFjayBGdW5jdGlvbi4nKTtcbiAgICAgIC8vcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NhcHRpb25CdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNSxcbiAgICAgIHBhcmFtczogW3tzdHJpbmc6IHRleHR9LCB7Y2FsbGJhY2s6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSGlkZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBoaWRlQ2FwdGlvbkJ1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA2LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRmFjZWJvb2sgQ29ubmVjdFxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3Blcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcyddIEZhY2Vib29rIFBlcm1pc3Npb25zLCBzZXBhcmF0ZWQgYnkgY29tbWFcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtyZWxvYWRQYXJhbSA9ICdjb21tZW50J10gUmVsb2FkIFBhcmFtXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgLy8gVE9ETzogdGVzdCBwZXJtaXNzaW9uc1xuICBmYWNlYm9va0Nvbm5lY3Q6IGZ1bmN0aW9uKHBlcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcycsIHJlbG9hZFBhcmFtID0gJ2NvbW1lbnQnKSB7XG4gICAgcmVsb2FkUGFyYW0gPSByZWxvYWRQYXJhbTtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDcsXG4gICAgICB3ZWJGbjogJ2ZhY2Vib29rQ29ubmVjdCcsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHBlcm1pc3Npb25zfSwgeydGdW5jdGlvbic6ICdFeGVjQ29tbWFuZD1cIicgKyByZWxvYWRQYXJhbSArICdcIid9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBSZWxvYWRQYXJhbWV0ZXI6ICdFeGVjQ29tbWFuZD0nICsgcmVsb2FkUGFyYW0sXG4gICAgICAgIFBlcm1pc3Npb25zOiBwZXJtaXNzaW9uc1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OSwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9LFxuICAgICAgZmFsbGJhY2tDbWQ6IDggLy8gaW4gY2FzZSB0aGUgYWJvdmUgaXMgbm90IHN1cHBvcnQgdGhlIGZhbGxiYWNrQ21kIHdpbGwgcmVwbGFjZSB0aGUgY21kXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gTGluayBpbiBCcm93c2VyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVVJMXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlbkxpbmtJbkJyb3dzZXI6IGZ1bmN0aW9uKHVybCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogOSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKCc6Ly8nKSA9PT0gLTEpIHtcbiAgICAgICAgICB1cmwgPSAnLy8nICsgdXJsOyAvLyBvciBhZGQgbG9jYXRpb24ucHJvdG9jb2wgcHJlZml4IGFuZCAvLyBUT0RPOiB0ZXN0XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjQ2Niwgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaG93IEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGJhY2sgYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2hvd0JhY2tCdXR0b246IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgY2hheW5zQXBpSW50ZXJmYWNlLmhpZGVCYWNrQnV0dG9uKCk7XG4gICAgICB9O1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JhY2tCdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTAsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgaGlkZUJhY2tCdXR0b246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTEsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIE9wZW4gSW50ZXJDb20uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgb3BlbkludGVyQ29tOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEyLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDAyLCBpb3M6IDEzODMsIHdwOiAyNTQzIH0sXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBHZW9sb2NhdGlvbi5cbiAgICogbmF0aXZlIGFwcHMgb25seSAoYnV0IGNvdWxkIHdvcmsgaW4gd2ViIGFzIHdlbGwsIG5hdmlnYXRvci5nZW9sb2NhdGlvbilcbiAgICpcbiAgICogVE9ETzogY29udGludW91c1RyYWNraW5nIHdhcyByZW1vdmVkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGJhY2sgYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgZ2V0R2VvTG9jYXRpb246IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2dldEdlb0xvY2F0aW9uQ2FsbGJhY2soKSc7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAvLyBUT0RPOiByZW1vdmUgY29uc29sZVxuICAgICAgLy8gVE9ETzogYWxsb3cgZW1wdHkgY2FsbGJhY2tzIHdoZW4gaXQgaXMgYWxyZWFkeSBzZXRcbiAgICAgIGNvbnNvbGUud2Fybignbm8gY2FsbGJhY2sgZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE0LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNTAxLCBpb3M6IDI0NjYsIHdwOiAyNDY5IH0sXG4gICAgICAvL3dlYkZuOiBmdW5jdGlvbigpIHsgbmF2aWdhdG9yLmdlb2xvY2F0aW9uOyB9XG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBWaWRlb1xuICAgKiAob2xkIFNob3dWaWRlbylcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBWaWRlbyBVUkwgc2hvdWxkIGNvdGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9wZW5WaWRlbzogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goLy4qXFwuLnsyLH0vKSkgeyAvLyBUT0RPOiBXVEYgUmVnZXhcbiAgICAgIGxvZy5lcnJvcignb3BlblZpZGVvOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE1LFxuICAgICAgd2ViRm46ICdzaG93VmlkZW8nLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHdlYlBhcmFtczogdXJsXG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogRm9ybWVybHkga25vd24gYXMgZ2V0QXBwSW5mb3NcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aXRoIHRoZSBBcHBEYXRhXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gICAgLy8gVE9ETzogdXNlIGZvcmNlUmVsb2FkIGFuZCBjYWNoZSBBcHBEYXRhXG4gIGdldEdsb2JhbERhdGE6IGZ1bmN0aW9uKGNhbGxiYWNrLCBmb3JjZVJlbG9hZCkge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRHbG9iYWxEYXRhOiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgZ2xvYmFsRGF0YSA9IGZhbHNlOyAvLyBUT0RPOiBmaXhcbiAgICBpZiAoIWZvcmNlUmVsb2FkICYmIGdsb2JhbERhdGEpIHtcbiAgICAgIGNhbGxiYWNrKGdsb2JhbERhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE4LFxuICAgICAgd2ViRm46ICdnZXRBcHBJbmZvcycsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogJ2dldEdsb2JhbERhdGEnfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVmlicmF0ZVxuICAgKiBAcGFyYW0ge0ludGVnZXJ9IGR1cmF0aW9uIFRpbWUgaW4gbWlsbGlzZWNvbmRzXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHZpYnJhdGU6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG4gICAgaWYgKCFpc051bWJlcihkdXJhdGlvbikgfHwgZHVyYXRpb24gPCAyKSB7XG4gICAgICBkdXJhdGlvbiA9IDE1MDtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxOSxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogZHVyYXRpb24udG9TdHJpbmcoKX1dLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uIG5hdmlnYXRvclZpYnJhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmF2aWdhdG9yLnZpYnJhdGUoMTAwKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5pbmZvKCd2aWJyYXRlOiB0aGUgZGV2aWNlIGRvZXMgbm90IHN1cHBvcnQgdmlicmF0ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2OTUsIGlvczogMjU5Niwgd3A6IDI1MTV9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIEJhY2suXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgbmF2aWdhdGVCYWNrOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDIwLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjY5NiwgaW9zOiAyNjAwLCB3cDogMjUxNX1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW1hZ2UgVXBsb2FkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2l0aCBpbWFnZSB1cmwgYWZ0ZXIgdXBsb2FkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHVwbG9hZEltYWdlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCd1cGxvYWRJbWFnZTogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdpbWFnZVVwbG9hZENhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjEsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjcwNSwgd3A6IDI1MzgsIGlvczogMjY0Mn1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IE5GQyBDYWxsYmFja1xuICAgKiBUT0RPOiByZWZhY3RvciBhbmQgdGVzdFxuICAgKiBUT0RPOiB3aHkgdHdvIGNhbGxzP1xuICAgKiBDYW4gd2UgaW1wcm92ZSB0aGlzIHNoaXQ/IHNwbGl0IGludG8gdHdvIG1ldGhvZHNcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gZm9yIE5GQ1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICBzZXROZmNDYWxsYmFjazogZnVuY3Rpb24oY2FsbGJhY2ssIHJlc3BvbnNlKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDM3LFxuICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgIH0pICYmIGFwaUNhbGwoe1xuICAgICAgICAgIGNtZDogMzcsXG4gICAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciBjbWQgPSAocmVzcG9uc2UgPT09IHdpbmRvdy5OZmNSZXNwb25zZURhdGEuUGVyc29uSWQpID8gMzcgOiAzODtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogY21kID09PSAzNyA/IDM4IDogMzcsXG4gICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgfSkgJiYgYXBpQ2FsbCh7XG4gICAgICBjbWQ6IGNtZCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiAnTmZjQ2FsbGJhY2snfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVmlkZW8gUGxheWVyIENvbnRyb2xzXG4gICAqIEFjdXRhbGx5IG5hdGl2ZSBvbmx5XG4gICAqIFRPRE86IGNvdWxkIHRoZW9yZXRpY2FsbHkgd29yayBpbiBDaGF5bnMgV2ViXG4gICAqIFRPRE86IGV4YW1wbGU/IHdoZXJlIGRvZXMgdGhpcyB3b3JrP1xuICAgKi9cbiAgcGxheWVyOiB7XG4gICAgdXNlRGVmYXVsdFVybDogZnVuY3Rpb24gdXNlRGVmYXVsdFVybCgpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMixcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgY2hhbmdlVXJsOiBmdW5jdGlvbiBjaGFuZ2VVcmwodXJsKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjIsXG4gICAgICAgIHBhcmFtczogW3snU3RyaW5nJzogdXJsfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBoaWRlQnV0dG9uOiBmdW5jdGlvbiBoaWRlQnV0dG9uKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIzLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBzaG93QnV0dG9uOiBmdW5jdGlvbiBzaG93QnV0dG9uKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIzLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAxfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwYXVzZTogZnVuY3Rpb24gcGF1c2VWaWRlbygpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNCxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGxheTogZnVuY3Rpb24gcGxheVZpZGVvKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI0LFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAxfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwbGF5YmFja1N0YXR1czogZnVuY3Rpb24gcGxheWJhY2tTdGF0dXMoY2FsbGJhY2spIHtcblxuICAgICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5nZXRHbG9iYWxEYXRhKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwobnVsbCwge1xuICAgICAgICAgIEFwcENvbnRyb2xWaXNpYmxlOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLklzQXBwQ29udHJvbFZpc2libGUsXG4gICAgICAgICAgU3RhdHVzOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLlBsYXliYWNrU3RhdHVzLFxuICAgICAgICAgIFVybDogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5TdHJlYW1VcmxcbiAgICAgICAgfSk7XG4gICAgICB9LCB0cnVlKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEJsdWV0b290aFxuICAgKiBPbmx5IGluIG5hdGl2ZSBBcHBzIChpb3MgYW5kIGFuZHJvaWQpXG4gICAqL1xuICBibHVldG9vdGg6IHtcbiAgICBMRVNlbmRTdHJlbmd0aDogeyAvLyBUT0RPOiB3aGF0IGlzIHRoYXQ/XG4gICAgICBBZGphY2VudDogMCxcbiAgICAgIE5lYXJieTogMSxcbiAgICAgIERlZmF1bHQ6IDIsXG4gICAgICBGYXI6IDNcbiAgICB9LFxuICAgIExFU2NhbjogZnVuY3Rpb24gTEVTY2FuKGNhbGxiYWNrKSB7XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRVNjYW46IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjayc7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjYsXG4gICAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBMRUNvbm5lY3Q6IGZ1bmN0aW9uIExFQ29ubmVjdChhZGRyZXNzLCBjYWxsYmFjaywgcGFzc3dvcmQpIHtcbiAgICAgIGlmICghaXNTdHJpbmcoYWRkcmVzcykgfHwgIWlzQkxFQWRkcmVzcyhhZGRyZXNzKSkge1xuICAgICAgICBsb2cud2FybignTEVDb25uZWN0OiBubyB2YWxpZCBhZGRyZXNzIHBhcmFtZXRlcicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRUNvbm5lY3Q6IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNTdHJpbmcocGFzc3dvcmQpIHx8ICFwYXNzd29yZC5tYXRjaCgvXlswLTlhLWZdezYsMTJ9JC9pKSkge1xuICAgICAgICBwYXNzd29yZCA9ICcnO1xuICAgICAgfVxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJztcblxuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI3LFxuICAgICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGFkZHJlc3N9LCB7J3N0cmluZyc6IHBhc3N3b3JkfV0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRPRE86IGNvbnNpZGVyIE9iamVjdCBhcyBwYXJhbWV0ZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRkcmVzc1xuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc3ViSWRcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG1lYXN1cmVQb3dlclxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc2VuZFN0cmVuZ3RoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBMRVdyaXRlOiBmdW5jdGlvbiBMRVdyaXRlKGFkZHJlc3MsIHN1YklkLCBtZWFzdXJlUG93ZXIsIHNlbmRTdHJlbmd0aCwgY2FsbGJhY2spIHtcbiAgICAgIGlmICghaXNTdHJpbmcoYWRkcmVzcykgfHwgIWlzQkxFQWRkcmVzcyhhZGRyZXNzKSkge1xuICAgICAgICBsb2cud2FybignTEVXcml0ZTogbm8gdmFsaWQgYWRkcmVzcyBwYXJhbWV0ZXInKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihzdWJJZCkgfHwgc3ViSWQgPCAwIHx8IHN1YklkID4gNDA5NSkge1xuICAgICAgICBzdWJJZCA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIobWVhc3VyZVBvd2VyKSB8fCBtZWFzdXJlUG93ZXIgPCAtMTAwIHx8IG1lYXN1cmVQb3dlciA+IDApIHtcbiAgICAgICAgbWVhc3VyZVBvd2VyID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihzZW5kU3RyZW5ndGgpIHx8IHNlbmRTdHJlbmd0aCA8IDAgfHwgc2VuZFN0cmVuZ3RoID4gMykge1xuICAgICAgICBzZW5kU3RyZW5ndGggPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJyxcbiAgICAgICAgdWlkID0gJzdBMDdFMTdBLUExODgtNDE2RS1CN0EwLTVBMzYwNjUxM0U1Nyc7XG5cbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyOCxcbiAgICAgICAgcGFyYW1zOiBbXG4gICAgICAgICAgeydzdHJpbmcnOiBhZGRyZXNzfSxcbiAgICAgICAgICB7J3N0cmluZyc6IHVpZH0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogc3ViSWR9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IG1lYXN1cmVQb3dlcn0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogc2VuZFN0cmVuZ3RofVxuICAgICAgICBdLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFRPRE87IHVzZSBgT2JqZWN0YCBhcyBwYXJhbXNcbiAgLy8gVE9ETzogd2hhdCBhcmUgb3B0aW9uYWwgcGFyYW1zPyB2YWxpZGF0ZSBuYW1lIGFuZCBsb2NhdGlvbj9cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIEFwcG9pbnRtZW50J3MgbmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbG9jYXRpb24gQXBwb2ludG1lbnQncyBsb2NhdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2Rlc2NyaXB0aW9uXSBBcHBvaW50bWVudCdzIGRlc2NyaXB0aW9uXG4gICAqIEBwYXJhbSB7RGF0ZX0gc3RhcnQgQXBwb2ludG1lbnRzJ3MgU3RhcnREYXRlXG4gICAqIEBwYXJhbSB7RGF0ZX0gZW5kIEFwcG9pbnRtZW50cydzIEVuZERhdGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzYXZlQXBwb2ludG1lbnQ6IGZ1bmN0aW9uIHNhdmVBcHBvaW50bWVudChuYW1lLCBsb2NhdGlvbiwgZGVzY3JpcHRpb24sIHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoIWlzU3RyaW5nKG5hbWUpIHx8ICFpc1N0cmluZyhsb2NhdGlvbikpIHtcbiAgICAgIGxvZy53YXJuKCdzYXZlQXBwb2ludG1lbnQ6IG5vIHZhbGlkIG5hbWUgYW5kL29yIGxvY2F0aW9uJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghaXNEYXRlKHN0YXJ0KSB8fCAhaXNEYXRlKGVuZCkpIHtcbiAgICAgIGxvZy53YXJuKCdzYXZlQXBwb2ludG1lbnQ6IHN0YXJ0IGFuZC9vciBlbmREYXRlIGlzIG5vIHZhbGlkIERhdGUgYE9iamVjdGAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHN0YXJ0ID0gcGFyc2VJbnQoc3RhcnQuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuICAgIGVuZCA9IHBhcnNlSW50KGVuZC5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDI5LFxuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnc3RyaW5nJzogbmFtZX0sXG4gICAgICAgIHsnc3RyaW5nJzogbG9jYXRpb259LFxuICAgICAgICB7J3N0cmluZyc6IGRlc2NyaXB0aW9ufSxcbiAgICAgICAgeydJbnRlZ2VyJzogc3RhcnR9LFxuICAgICAgICB7J0ludGVnZXInOiBlbmR9XG4gICAgICBdLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMwNTQsIGlvczogMzA2Nywgd3A6IDMwMzB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERhdGVUeXBlcyBFbnVtXG4gICAqIHN0YXJ0cyBhdCAxXG4gICAqL1xuICBkYXRlVHlwZToge1xuICAgIGRhdGU6IDEsXG4gICAgdGltZTogMixcbiAgICBkYXRlVGltZTogM1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZWxlY3QgRGF0ZVxuICAgKiBPbGQ6IERhdGVTZWxlY3RcbiAgICogTmF0aXZlIEFwcHMgb25seS4gVE9ETzogYWxzbyBpbiBDaGF5bnMgV2ViPyBIVE1MNSBEYXRlcGlja2VyIGV0Y1xuICAgKiBUT0RPOyByZWNvbnNpZGVyIG9yZGVyIGV0Y1xuICAgKiBAcGFyYW0ge2RhdGVUeXBlfE51bWJlcn0gZGF0ZVR5cGUgRW51bSAxLTI6IHRpbWUsIGRhdGUsIGRhdGV0aW1lLiB1c2UgY2hheW5zLmRhdGVUeXBlXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IHByZVNlbGVjdCBQcmVzZXQgdGhlIERhdGUgKGUuZy4gY3VycmVudCBEYXRlKVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB0aGF0IHJlY2VpdmVzIHRoZSBjaG9zZW4gRGF0ZSBhcyBUaW1lc3RhbXBcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gbWluRGF0ZSBNaW5pbXVtIFN0YXJ0RGF0ZVxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBtYXhEYXRlIE1heGltdW0gRW5kRGF0ZVxuICAgKi9cbiAgc2VsZWN0RGF0ZTogZnVuY3Rpb24gc2VsZWN0RGF0ZShkYXRlVHlwZSwgcHJlU2VsZWN0LCBjYWxsYmFjaywgbWluRGF0ZSwgbWF4RGF0ZSkge1xuXG4gICAgaWYgKCFpc051bWJlcihkYXRlVHlwZSkgfHwgZGF0ZVR5cGUgPD0gMCkge1xuICAgICAgbG9nLndhcm4oJ3NlbGVjdERhdGU6IHdyb25nIGRhdGVUeXBlJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdzZWxlY3REYXRlOiBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZVZhbHVlKHZhbHVlKSB7XG4gICAgICBpZiAoIWlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBwYXJzZUludCh2YWx1ZS5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBwcmVTZWxlY3QgPSB2YWxpZGF0ZVZhbHVlKHByZVNlbGVjdCk7XG4gICAgbWluRGF0ZSA9IHZhbGlkYXRlVmFsdWUobWluRGF0ZSk7XG4gICAgbWF4RGF0ZSA9IHZhbGlkYXRlVmFsdWUobWF4RGF0ZSk7XG5cbiAgICBsZXQgZGF0ZVJhbmdlID0gJyc7XG4gICAgaWYgKG1pbkRhdGUgPiAtMSAmJiBtYXhEYXRlID4gLTEpIHtcbiAgICAgIGRhdGVSYW5nZSA9ICcsJyArIG1pbkRhdGUgKyAnLCcgKyBtYXhEYXRlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnc2VsZWN0RGF0ZUNhbGxiYWNrJztcbiAgICBmdW5jdGlvbiBjYWxsYmFja0ZuKGNhbGxiYWNrLCBkYXRlVHlwZSwgcHJlU2VsZWN0LCB0aW1lKSB7XG4gICAgICAvLyBUT0RPOiBpbXBvcnRhbnQgdmFsaWRhdGUgRGF0ZVxuICAgICAgLy8gVE9ETzogY2hvb3NlIHJpZ2h0IGRhdGUgYnkgZGF0ZVR5cGVFbnVtXG4gICAgICBsb2cuZGVidWcoZGF0ZVR5cGUsIHByZVNlbGVjdCk7XG4gICAgICBjYWxsYmFjay5jYWxsKG51bGwsIHRpbWUgPyBuZXcgRGF0ZSh0aW1lKSA6IC0xKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMwLFxuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9LFxuICAgICAgICB7J0ludGVnZXInOiBkYXRlVHlwZX0sXG4gICAgICAgIHsnSW50ZWdlcic6IHByZVNlbGVjdCArIGRhdGVSYW5nZX1cbiAgICAgIF0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIGNhbGxiYWNrLCBkYXRlVHlwZSwgcHJlU2VsZWN0KSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMDcyLCBpb3M6IDMwNjIsIHdwOiAzMDMwfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFVSTCBpbiBBcHBcbiAgICogKG9sZCBTaG93VVJMSW5BcHApXG4gICAqIG5vdCB0byBjb25mdXNlIHdpdGggb3BlbkxpbmtJbkJyb3dzZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBWaWRlbyBVUkwgc2hvdWxkIGNvbnRhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAgIC8vIFRPRE86IGltcGxlbWVudCBDaGF5bnMgV2ViIE1ldGhvZCBhcyB3ZWxsIChuYXZpZ2F0ZSBiYWNrIHN1cHBvcnQpXG4gIG9wZW5Vcmw6IGZ1bmN0aW9uIG9wZW5VcmwodXJsLCB0aXRsZSkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSkge1xuICAgICAgbG9nLmVycm9yKCdvcGVuVXJsOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzEsXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdXJsOyAvLyBUT0RPOiBtYWtlIHN1cmUgaXQgd29ya3NcbiAgICAgIH0sXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH0sIHsnc3RyaW5nJzogdGl0bGV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMTEwLCBpb3M6IDMwNzQsIHdwOiAzMDYzfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBjcmVhdGUgUVIgQ29kZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGRhdGEgUVIgQ29kZSBkYXRhXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSBiYXNlNjQgZW5jb2RlZCBJTUcgVE9ETzogd2hpY2ggdHlwZT9cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVRUkNvZGU6IGZ1bmN0aW9uIGNyZWF0ZVFSQ29kZShkYXRhLCBjYWxsYmFjaykge1xuICAgIGlmICghaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgIGRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignY3JlYXRlUVJDb2RlOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnY3JlYXRlUVJDb2RlQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogZGF0YX0sIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgMzIyMCwgaW9zOiAxMzcyLCB3cDogMzEwNn0sXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBzY2FuIFFSIENvZGVcbiAgICogU2NhbnMgUVIgQ29kZSBhbmQgcmVhZCBpdFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgcmVzdWx0XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2NhblFSQ29kZTogZnVuY3Rpb24gc2NhblFSQ29kZShjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3NjYW5RUkNvZGU6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdzY2FuUVJDb2RlQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzNCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgMzIyMCwgaW9zOiAxMzcyLCB3cDogMzEwNn0sXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogc2NhbiBRUiBDb2RlXG4gICAqIFNjYW5zIFFSIENvZGUgYW5kIHJlYWQgaXRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gICAgYmVhY29uTGlzdDogbnVsbCwgLy8gVE9ETzogZG9udCBwbGFjZSBpdCBoZXJlLCBvYm92ZSBpcyBiZXR0ZXIgKGJ1dCBub3QgZ2xvYmFsIGkgc3VwcG9zZSlcbiAgZ2V0TG9jYXRpb25CZWFjb25zOiBmdW5jdGlvbiBnZXRMb2NhdGlvbkJlYWNvbnMoY2FsbGJhY2ssIGZvcmNlUmVsb2FkKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignZ2V0TG9jYXRpb25CZWFjb25zOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnZ2V0QmVhY29uc0NhbGxCYWNrKCknO1xuICAgIGlmIChjaGF5bnNBcGlJbnRlcmZhY2UuYmVhY29uTGlzdCAmJiAhZm9yY2VSZWxvYWQpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKG51bGwsIGNoYXluc0FwaUludGVyZmFjZS5iZWFjb25MaXN0KTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzOSxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgNDA0NSwgaW9zOiA0MDQ4fSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGQgdG8gUGFzc2Jvb2tcbiAgICogaU9TIG9ubHlcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVybCBQYXRoIHRvIFBhc3Nib29rIGZpbGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBhZGRUb1Bhc3Nib29rOiBmdW5jdGlvbiBhZGRUb1Bhc3Nib29rKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSkge1xuICAgICAgbG9nLndhcm4oJ2FkZFRvUGFzc2Jvb2s6IHVybCBpcyBpbnZhbGlkLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFRPRE8gaW1wb3J0YW50IEFkZCBGYWxsYmFjayBvcGVuTGlua0luQnJvd3Nlcih1cmwpIChidXQgb25seSBvbiBpb3MpXG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQ3LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHN1cHBvcnQ6IHtpb3M6IDQwNDV9XG4gICAgfSk7XG4gIH1cblxufTtcblxuLy8gZm9yIE5GQ1xuLy8gVE9ETzogcmVmYWN0b3I6IG1vdmUgYXQgdGhlIHRvcCBhcyBwcml2YXRlIG9iamVjdFxuLy8gVE9ETzogaW1wb3J0IHdpbmRvd1xud2luZG93Lk5mY1Jlc3BvbnNlRGF0YSA9IHtcbiAgUkZJZDogMCxcbiAgUGVyc29uSWQ6IDBcbn07XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNQZXJtaXR0ZWQsIGlzRnVuY3Rpb24sIGlzQmxhbmssIGlzQXJyYXksIGlzT2JqZWN0LCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93LCBwYXJlbnR9IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInO1xuaW1wb3J0IHtlbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge3NldENhbGxiYWNrfSBmcm9tICcuL2NhbGxiYWNrcyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY29yZS5jaGF5bnNfY2FsbHMnKTtcblxuXG5mdW5jdGlvbiBjYW4odmVyc2lvbnMpIHtcbiAgcmV0dXJuIGlzUGVybWl0dGVkKHZlcnNpb25zLCBlbnZpcm9ubWVudC5vcywgZW52aXJvbm1lbnQuYXBwVmVyc2lvbik7XG59XG5cbi8vIE9TIEFwcCBWZXJzaW9uIE1hcCBmb3IgQ2hheW5zIENhbGxzIFN1cHBvcnRcbi8vIFRPRE86IG1vdmUgaW50byBlbnZpcm9ubWVudD8gKG9yIGp1c3QgcmVtb3ZlIGNhdXNlIGl0IGlzIG9ubHkgdXNlZCBvbmUgdGltZSBpbiBoZXJlKVxubGV0IG9zTWFwID0ge1xuICBjaGF5bnNDYWxsOiB7IGFuZHJvaWQ6IDI1MTAsIGlvczogMjQ4Mywgd3A6IDI0NjksIGJiOiAxMTggfVxufTtcblxuLyoqXG4gKiBQdWJsaWMgQ2hheW5zIEludGVyZmFjZVxuICogRXhlY3V0ZSBBUEkgQ2FsbFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqIEBwYXJhbSBkZWJvdW5jZVxuICogLy8gVE9ETzogbGVmdCBvZiBjYWxsYmFjayBhcyBwcm9taXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcGlDYWxsKG9iaikge1xuXG4gIGxldCBkZWJvdW5jZSA9IG9iai5kZWJvdW5jZSB8fCBmYWxzZTtcblxuICAvLyBUT0RPOiBjaGVjayBvYmoub3MgVkVSU0lPTlxuXG4gIGZ1bmN0aW9uIGV4ZWN1dGVDYWxsKGNoYXluc0NhbGxPYmopIHtcblxuICAgIGlmIChlbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsICYmIGNhbihvc01hcC5jaGF5bnNDYWxsKSkge1xuICAgICAgLy8gVE9ETzogY29uc2lkZXIgY2FsbFF1ZXVlIGFuZCBJbnRlcnZhbCB0byBwcmV2ZW50IGVycm9yc1xuICAgICAgbG9nLmRlYnVnKCdleGVjdXRlQ2FsbDogY2hheW5zIGNhbGwgJywgY2hheW5zQ2FsbE9iai5jbWQpO1xuXG4gICAgICBpZiAoJ2NiJyBpbiBjaGF5bnNDYWxsT2JqICYmIGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5jYikpIHtcbiAgICAgICAgc2V0Q2FsbGJhY2soY2hheW5zQ2FsbE9iai5jYWxsYmFja05hbWUgfHwgY2hheW5zQ2FsbE9iai5wYXJhbXNbMF0uY2FsbGJhY2ssIGNoYXluc0NhbGxPYmouY2IsIHRydWUpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGNoYXluc0NhbGxPYmouc3VwcG9ydCkgJiYgIWNhbihjaGF5bnNDYWxsT2JqLnN1cHBvcnQpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogdGhlIGNoYXlucyB2ZXJzaW9uIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgaWYgKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrIGNoYXlucyBjYWxsIHdpbGwgYmUgaW52b2tlZCcpO1xuICAgICAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouY21kLCBjaGF5bnNDYWxsT2JqLnBhcmFtcyk7XG5cbiAgICB9IGVsc2UgaWYgKGVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwpIHtcblxuICAgICAgaWYgKCdjYicgaW4gY2hheW5zQ2FsbE9iaiAmJiBpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouY2IpKSB7XG4gICAgICAgIHNldENhbGxiYWNrKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmouY2IpO1xuICAgICAgfVxuICAgICAgaWYgKCFjaGF5bnNDYWxsT2JqLndlYkZuKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogVGhpcyBDYWxsIGhhcyBubyB3ZWJGbicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZUNhbGw6IGNoYXlucyB3ZWIgY2FsbCAnLCBjaGF5bnNDYWxsT2JqLndlYkZuLm5hbWUgfHwgY2hheW5zQ2FsbE9iai53ZWJGbik7XG5cbiAgICAgIHJldHVybiBjaGF5bnNXZWJDYWxsKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmoud2ViUGFyYW1zIHx8IGNoYXluc0NhbGxPYmoucGFyYW1zKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IG5laXRoZXIgY2hheW5zIHdlYiBjYWxsIG5vciBjaGF5bnMgd2ViJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRlYm91bmNlKSB7XG4gICAgc2V0VGltZW91dChleGVjdXRlQ2FsbC5iaW5kKG51bGwsIG9iaiksIDEwMCk7IC8vIFRPRE86IGVycm9yP1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleGVjdXRlQ2FsbChvYmopO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGQgQ2hheW5zIENhbGwgKG9ubHkgZm9yIG5hdGl2ZSBBcHBzKVxuICogQHByaXZhdGVcblxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgY2hheW5zIGNhbGwgc3VjY2VlZGVkLCBmYWxzZSBvbiBlcnJvciAobm8gdXJsIGV0YylcbiAqL1xuZnVuY3Rpb24gY2hheW5zQ2FsbChjbWQsIHBhcmFtcykge1xuXG4gIGlmIChpc0JsYW5rKGNtZCkpIHsgLy8gMCBpcyBhIHZhbGlkIGNhbGwsIHVuZGVmaW5lZCBhbmQgbnVsbCBhcmUgbm90XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IG1pc3NpbmcgY21kIGZvciBjaGF5bnNDYWxsJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxldCB1cmwgPSBudWxsO1xuXG4gIC8vIGlmIHRoZXJlIGlzIG5vIHBhcmFtIG9yICdub25lJyB3aGljaCBtZWFucyBubyBjYWxsYmFja1xuICBpZiAoIXBhcmFtcykge1xuXG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArICcpJztcblxuICB9IGVsc2Uge1xuXG4gICAgLy8gcGFyYW1zIGV4aXN0IGhvd2V2ZXIsIGl0IGlzIG5vIGFycmF5XG4gICAgaWYgKCFpc0FycmF5KHBhcmFtcykpIHtcbiAgICAgIGxvZy5lcnJvcignY2hheW5zQ2FsbDogcGFyYW1zIGFyZSBubyBBcnJheScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcGFyYW1zIHRvIHRoZSBjaGF5bnMgY2FsbFxuICAgIGxldCBjYWxsYmFja1ByZWZpeCA9ICdfY2hheW5zQ2FsbGJhY2tzLic7XG4gICAgbGV0IGNhbGxTdHJpbmcgPSAnJztcbiAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBjYWxsQXJncyA9IFtdO1xuICAgICAgcGFyYW1zLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgbGV0IG5hbWUgPSBPYmplY3Qua2V5cyhwYXJhbSlbMF07XG4gICAgICAgIGxldCB2YWx1ZSA9IHBhcmFtW25hbWVdO1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2NhbGxiYWNrJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1wiJyArIGNhbGxiYWNrUHJlZml4ICsgdmFsdWUgKyAnXCInKTtcbiAgICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnYm9vbCcgfHwgbmFtZSA9PT0gJ0Z1bmN0aW9uJyB8fCBuYW1lID09PSAnSW50ZWdlcicpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0RlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgY2FsbEFyZ3MucHVzaCgnXFwnJyArIHZhbHVlICsgJ1xcJycpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNhbGxTdHJpbmcgPSAnLCcgKyBjYWxsQXJncy5qb2luKCcsJyk7XG4gICAgfVxuXG4gICAgLy8gYWRkIGNoYXlucyBwcm90b2NvbCBhbmQgaG9zdCBhbmQgam9pbiBhcnJheVxuICAgIHVybCA9ICdjaGF5bnM6Ly9jaGF5bnNDYWxsKCcgKyBjbWQgKyBjYWxsU3RyaW5nICsgJyknO1xuICB9XG5cbiAgbG9nLmRlYnVnKCdjaGF5bnNDYWxsOiB1cmw6ICcsIHVybCk7XG5cbiAgdHJ5IHtcbiAgICAvLyBUT0RPOiBjcmVhdGUgYW4gZWFzaWVyIGlkZW50aWZpY2F0aW9uIG9mIHRoZSByaWdodCBlbnZpcm9ubWVudFxuICAgIC8vIFRPRE86IGNvbnNpZGVyIHRvIGV4ZWN1dGUgdGhlIGJyb3dzZXIgZmFsbGJhY2sgaW4gaGVyZSBhcyB3ZWxsXG4gICAgaWYgKCdjaGF5bnNDYWxsJyBpbiB3aW5kb3cgJiYgaXNGdW5jdGlvbih3aW5kb3cuY2hheW5zQ2FsbC5ocmVmKSkge1xuICAgICAgd2luZG93LmNoYXluc0NhbGwuaHJlZih1cmwpO1xuICAgIH0gZWxzZSBpZiAoJ3dlYmtpdCcgaW4gd2luZG93XG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVyc1xuICAgICAgJiYgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMuY2hheW5zQ2FsbFxuICAgICAgJiYgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMuY2hheW5zQ2FsbC5wb3N0TWVzc2FnZSkge1xuICAgICAgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMuY2hheW5zQ2FsbC5wb3N0TWVzc2FnZSh1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHVybDtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cud2FybignY2hheW5zQ2FsbDogRXJyb3I6IGNvdWxkIG5vdCBleGVjdXRlIENoYXluc0NhbGw6ICcsIGUpO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogRXhlY3V0ZSBhIENoYXluc1dlYiBDYWxsIGluIHRoZSBwYXJlbnQgd2luZG93LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmbiBGdW5jdGlvbiBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1zIEFkZGl0aW9uYWxcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNoYXluc1dlYmJDYWxsIHN1Y2NlZWRlZFxuICovXG5mdW5jdGlvbiBjaGF5bnNXZWJDYWxsKGZuLCBwYXJhbXMpIHtcbiAgaWYgKCFmbikge1xuICAgIGxvZy5pbmZvKCdjaGF5bnNXZWJDYWxsOiBubyBDaGF5bnNXZWJDYWxsIGZuJyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKCFwYXJhbXMgfHwgaXNBcnJheShwYXJhbXMpKSB7IC8vIEFycmF5IGluZGljYXRlcyB0aGF0IHRoZXNlIGFyZSBjaGF5bnNDYWxscyBwYXJhbXMgVE9ETzogcmVmYWN0b3JcbiAgICBwYXJhbXMgPSAnJztcbiAgfVxuICBpZiAoaXNPYmplY3QocGFyYW1zKSkgeyAvLyBhbiBBcnJheSBpcyBhbHNvIHNlZW4gYXMgT2JqZWN0LCBob3dldmVyIGl0IHdpbGwgYmUgcmVzZXQgYmVmb3JlXG4gICAgcGFyYW1zID0gSlNPTi5zdHJpbmdpZnkocGFyYW1zKTtcbiAgfVxuXG4gIGlmIChpc0Z1bmN0aW9uKGZuKSkge1xuICAgIHJldHVybiBmbi5jYWxsKG51bGwpO1xuICB9XG5cbiAgdmFyIG5hbWVzcGFjZSA9ICdjaGF5bnMuY3VzdG9tVGFiLic7XG4gIHZhciB1cmwgPSBuYW1lc3BhY2UgKyBmbiArICc6JyArIHBhcmFtcztcblxuICBsb2cuZGVidWcoJ2NoYXluc1dhYkNhbGw6ICcgKyB1cmwpO1xuXG4gIHRyeSB7XG4gICAgcGFyZW50LnBvc3RNZXNzYWdlKHVybCwgJyonKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy53YXJuKCdjaGF5bnNXZWJDYWxsOiBwb3N0TWVzc2dhZSBmYWlsZWQnKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG4iLCIvKipcbiAqIEBtb2R1bGUgY29uZmlnXG4gKiBAcHJpdmF0ZVxuICovXG5cbmltcG9ydCB7aXNQcmVzZW50LCBpc0JsYW5rLCBpc1VuZGVmaW5lZCwgaXNBcnJheSwgZXh0ZW5kfSBmcm9tICcuLi91dGlscyc7XG5cbi8qKlxuICogU3RvcmUgaW50ZXJuYWwgY2hheW5zIGNvbmZpZ3VyYXRpb25cbiAqIEB0eXBlIHt7YXBwTmFtZTogc3RyaW5nLCBhcHBWZXJzaW9uOiBudW1iZXIsIGxvYWRNb2Rlcm5pemVyOiBib29sZWFuLCBsb2FkUG9seWZpbGxzOiBib29sZWFuLCB1c2VGZXRjaDogYm9vbGVhbiwgcHJvbWlzZXM6IHN0cmluZywgdXNlT2ZmbGluZUNhY2hpbmc6IGJvb2xlYW4sIHVzZUxvY2FsU3RvcmFnZTogYm9vbGVhbiwgaGFzQWRtaW46IGJvb2xlYW4sIG11bHRpTGluZ3VhbDogYm9vbGVhbiwgaXNQdWJsaXNoZWQ6IGJvb2xlYW4sIGRlYnVnTW9kZTogYm9vbGVhbiwgdXNlQWpheDogYm9vbGVhbn19XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgX2NvbmZpZyA9IHtcbiAgYXBwTmFtZTogJ0NoYXlucyBBcHAnLCAgIC8vIGFwcCBOYW1lXG4gIGFwcFZlcnNpb246IDEsICAgICAgICAgICAvLyBhcHAgVmVyc2lvblxuICBwcmV2ZW50RXJyb3JzOiB0cnVlLCAgICAgICAgLy8gZXJyb3IgaGFuZGxlciBjYW4gaGlkZSBlcnJvcnMgKGNhbiBiZSBvdmVyd3RpdHRlbiBieSBpc1Byb2R1Y3Rpb24pXG4gIGlzUHJvZHVjdGlvbjogdHJ1ZSwgICAgICAvLyBwcm9kdWN0aW9uLCBkZXZlbG9wbWVudCBhbmQgdGVzdCBFTlZcbiAgbG9hZE1vZGVybml6ZXI6IHRydWUsICAgIC8vIGxvYWQgbW9kZXJuaXplclxuICBsb2FkUG9seWZpbGxzOiB0cnVlLCAgICAgLy8gbG9hZCBwb2x5ZmlsbHNcbiAgdXNlRmV0Y2g6IHRydWUsICAgICAgICAgIC8vIHVzZSB3aW5kb3cuZmV0Y2ggYW5kIGl0J3MgcG9seWZpbGxzXG4gIHByb21pc2VzOiAncScsICAgICAgICAgICAvLyBwcm9taXNlIFNlcnZpY2U6IFEgaXMgc3RhbmRhcmRcbiAgdXNlT2ZmbGluZUNhY2hpbmc6IGZhbHNlLC8vIGlzIG9mZmxpbmUgY2FjaGluZyB1c2VkPyBpbmxjdWRlIG9mZmxpbmUgaGVscGVyXG4gIHVzZUxvY2FsU3RvcmFnZTogZmFsc2UsICAvLyBpcyBsb2NhbFN0b3JhZ2UgdXNlZD8gaW5jbHVkZSBoZWxwZXJcbiAgaGFzQWRtaW46IGZhbHNlLCAgICAgICAgIC8vIGRvZXMgdGhpcyBhcHAvcGFnZSBoYXZlIGFuIGFkbWluP1xuICBtdWx0aUxpbmd1YWw6IHRydWUsICAgICAgLy8gZW5hYmxlIGkxOG4/XG4gIGlzUHVibGlzaGVkOiB0cnVlLCAgICAgICAvLyBvbmx5IGluIGludGVybmFsIHRvYml0IGF2YWlsYWJsZVxuICBkZWJ1Z01vZGU6IHRydWUsICAgICAgICAgLy8gc2hvdyBjb25zb2xlIG91dHB1dCwgZGVidWcgcGFyYW0gZm9yIGxvZ2dpbmdcbiAgdXNlQWpheDogZmFsc2UsXG4gIGlzSW50ZXJuYWw6IGZhbHNlICAgICAgICAvLyB1c2UgaW50ZXJuYWwgcm91dGluZ1xuICAvL2ZyYW1ld29yazogWydFbWJlcicsICdBbmd1bGFyJywgJ0JhY2tib25lJywgJ0FtcGVyc2FuZCcsICdSZWFjdCcsICdqUXVlcnknXVxufTtcblxuLy8gVE9ETzogcmVtb3ZlXG4vKmV4cG9ydCBmdW5jdGlvbiBjb25maWcoKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIENvbmZpZy5zZXQoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pOyAvLyBUT0RPOiByZWZhY3RvciB0aGlzXG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBDb25maWcuZ2V0KGFyZ3VtZW50cyk7XG4gIH1cbiAgcmV0dXJuIENvbmZpZy5nZXQoKTtcbn0qL1xuXG4vLyBUT0RPOiByZWZhY3RvciB0byBNYXBcbmV4cG9ydCBjbGFzcyBDb25maWcge1xuXG4gIC8qKlxuICAgKiBAbWV0aG9kIGdldFxuICAgKiBAY2xhc3MgQ29uZmlnXG4gICAqIEBtb2R1bGUgY2hheW5zLmNvbmZpZ1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFJlZmVyZW5jZSB0aGUgYGtleWAgaW4gdGhlIGNvbmZpZyBgT2JqZWN0YFxuICAgKiBAcmV0dXJucyB7bnVsbH0gVmFsdWUgb2YgdGhlIGBrZXlgIGluIHRoZSBjb25maWcgYE9iamVjdGBcbiAgICogICAgICAgICAgICAgICAgIGB1bmRlZmluZWRgIGlmIHRoZSBga2V5YCB3YXMgbm90IGZvdW5kXG4gICAqL1xuICBzdGF0aWMgZ2V0KGtleSkge1xuICAgIGlmIChpc1ByZXNlbnQoa2V5KSkge1xuICAgICAgcmV0dXJuIF9jb25maWdba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEBwYXJhbSB2YWx1ZVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHN0YXRpYyBzZXQoa2V5LCB2YWx1ZSkge1xuICAgIGlmIChpc0JsYW5rKGtleSkgfHwgaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIFRPRE86IGdvb2QgaWRlYT8gb25lIHNob3VsZCBiZSBjYXJlZnVsIGkgc3VwcG9zZVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgZXh0ZW5kKF9jb25maWcsIHZhbHVlKTtcbiAgICB9XG4gICAgX2NvbmZpZ1trZXldID0gdmFsdWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHN0YXRpYyBoYXMoa2V5KSB7XG4gICAgcmV0dXJuICEha2V5ICYmIChrZXkgaW4gX2NvbmZpZyk7XG4gIH1cbn1cbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc09iamVjdCwgRE9NfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge0NvbmZpZ30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHttZXNzYWdlTGlzdGVuZXJ9IGZyb20gJy4vY2FsbGJhY2tzJztcbmltcG9ydCB7Y2hheW5zQXBpSW50ZXJmYWNlfSBmcm9tICcuL2NoYXluc19hcGlfaW50ZXJmYWNlJztcblxuLy8gY3JlYXRlIG5ldyBMb2dnZXIgaW5zdGFuY2VcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jb3JlJyk7XG5cbi8vIGRpc2FibGUgSlMgRXJyb3JzIGluIHRoZSBjb25zb2xlXG5Db25maWcuc2V0KCdwcmV2ZW50RXJyb3JzJywgZmFsc2UpO1xuXG4vKipcbiAqXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICpcbiAqIEB0eXBlIHtib29sZWFufSBUcnVlIGlmIHRoZSBET00gaXMgbG9hZGVkXG4gKiBAcHJpdmF0ZVxuICovXG52YXIgZG9tUmVhZHkgPSBmYWxzZTtcblxuLyoqXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICpcbiAqIEB0eXBlIHthcnJheX0gQ29udGFpbnMgY2FsbGJhY2tzIGZvciB0aGUgRE9NIHJlYWR5IGV2ZW50XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgcmVhZHlDYWxsYmFja3MgPSBbXTtcblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMucHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyKHVzZXJDb25maWcpIHtcbiAgbG9nLmluZm8oJ2NoYXlucy5yZWdpc3RlcicpO1xuICBDb25maWcuc2V0KHVzZXJDb25maWcpOyAvLyB0aGlzIHJlZmVyZW5jZSB0byB0aGUgY2hheW5zIG9ialxuICByZXR1cm4gdGhpcztcbn1cblxuLy8gVE9ETzogcmVnaXN0ZXIgYEZ1bmN0aW9uYCBvciBwcmVDaGF5bnMgYE9iamVjdGA/XG5leHBvcnQgZnVuY3Rpb24gcHJlQ2hheW5zKCkge1xuICBpZiAoJ3ByZUNoYXlucycgaW4gd2luZG93ICYmIGlzT2JqZWN0KHdpbmRvdy5wcmVDaGF5bnMpKSB7XG4gICAgLy8gZmlsbCBjb25maWdcbiAgfVxufVxuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5wcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZHkoY2IpIHtcbiAgbG9nLmluZm8oJ2NoYXlucy5yZWFkeScpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoZG9tUmVhZHkpIHtcbiAgICAvLyBUT0RPOiByZXR1cm4gYSBjdXN0b20gTW9kZWwgT2JqZWN0IGluc3RlYWQgb2YgYGNvbmZpZ2BcbiAgICBjYih7XG4gICAgICBhcHBOYW1lOkNvbmZpZy5nZXQoJ2FwcE5hbWUnKSxcbiAgICAgIGFwcFZlcnNpb246IENvbmZpZy5nZXQoJ2FwcFZlcnNpb24nKVxuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuICByZWFkeUNhbGxiYWNrcy5wdXNoKGFyZ3VtZW50c1swXSk7XG59XG5cbi8qKlxuICogQG5hbWUgcHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIG9iaiBSZWZlcmVuY2UgdG8gY2hheW5zIE9iamVjdFxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cCgpIHtcbiAgbG9nLmluZm8oJ3N0YXJ0IGNoYXlucyBzZXR1cCcpO1xuXG4gIC8vIGVuYWJsZSBgY2hheW5zLmNzc2AgYnkgYWRkaW5nIGBjaGF5bnNgIGNsYXNzXG4gIC8vIHJlbW92ZSBgbm8tanNgIGNsYXNzIGFuZCBhZGQgYGpzYCBjbGFzc1xuICBsZXQgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gIERPTS5hZGRDbGFzcyhib2R5LCAnY2hheW5zJyk7XG4gIERPTS5hZGRDbGFzcyhib2R5LCAnanMnKTtcbiAgRE9NLnJlbW92ZUNsYXNzKGJvZHksICduby1qcycpO1xuXG4gIC8vIGFkZCBjaGF5bnMgcm9vdFxuICBsZXQgY2hheW5zUm9vdCA9IERPTS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgRE9NLmFkZENsYXNzKGNoYXluc1Jvb3QsICdjaGF5bnMtcm9vdCcpO1xuICBET00uYXBwZW5kQ2hpbGQoYm9keSwgY2hheW5zUm9vdCk7XG5cbiAgLy8gcnVuIHBvbHlmaWxsIChpZiByZXF1aXJlZClcblxuICAvLyBydW4gbW9kZXJuaXplciAoZmVhdHVyZSBkZXRlY3Rpb24pXG5cbiAgLy8gcnVuIGZhc3RjbGlja1xuXG4gIC8vICh2aWV3cG9ydCBzZXR1cClcblxuICAvLyBjcmF0ZSBtZXRhIHRhZ3MgKGNvbG9ycywgbW9iaWxlIGljb25zIGV0YylcblxuICAvLyBkbyBzb21lIFNFTyBzdHVmZiAoY2Fub25pY2FsIGV0YylcblxuICAvLyBkZXRlY3QgdXNlciAobG9nZ2VkIGluPylcblxuICAvLyBydW4gY2hheW5zIHNldHVwIChjb2xvcnMgYmFzZWQgb24gZW52aXJvbm1lbnQpXG5cblxuXG4gIC8vIHNldCBET00gcmVhZHkgZXZlbnRcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpIHtcblxuICAgIGRvbVJlYWR5ID0gdHJ1ZTtcbiAgICBsb2cuZGVidWcoJ0RPTSByZWFkeScpO1xuXG4gICAgRE9NLmFkZENsYXNzKGRvY3VtZW50LmJvZHksICdkb20tcmVhZHknKTtcblxuICAgIC8vIGdldCB0aGUgQXBwIEluZm9zLCBoYXMgdG8gYmUgZG9uZSB3aGVuIGRvY3VtZW50IHJlYWR5XG4gICAgbGV0IGdldEFwcEluZm9zQ2FsbCA9ICFjaGF5bnNBcGlJbnRlcmZhY2UuZ2V0R2xvYmFsRGF0YShmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgIC8vIG5vdyBDaGF5bnMgaXMgb2ZmaWNpYWxseSByZWFkeVxuXG4gICAgICBsb2cuZGVidWcoJ2FwcEluZm9zIGNhbGxiYWNrJywgZGF0YSk7XG5cbiAgICAgIHJlYWR5Q2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgICByZWFkeUNhbGxiYWNrcyA9IFtdO1xuXG4gICAgICBET00uYWRkQ2xhc3MoZG9jdW1lbnQuYm9keSwgJ2NoYXlucy1yZWFkeScpO1xuICAgICAgRE9NLnJlbW92ZUF0dHJpYnV0ZShET00ucXVlcnkoJ1tjaGF5bnMtY2xvYWtdJyksICdjaGF5bnMtY2xvYWsnKTtcblxuICAgICAgbG9nLmluZm8oJ2ZpbmlzaGVkIGNoYXlucyBzZXR1cCcpO1xuICAgIH0pO1xuXG4gICAgaWYgKGdldEFwcEluZm9zQ2FsbCkge1xuICAgICAgbG9nLmVycm9yKCdUaGUgQXBwSW5mb3MgY291bGQgbm90IGJlIHJldHJpZXZlZC4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHN0YXJ0IHdpbmRvdy5vbignbWVzc2FnZScpIGxpc3RlbmVyIGZvciBGcmFtZSBDb21tdW5pY2F0aW9uXG4gIG1lc3NhZ2VMaXN0ZW5lcigpO1xuXG5cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVjdCBgQnJvd3NlcmAsIGBPU2AgYW5kICdEZXZpY2VgXG4gKiBhcyB3ZWxsIGFzIGBDaGF5bnMgRW52aXJvbm1lbnRgLCBgQ2hheW5zIFVzZXJgIGFuZCBgQ2hheW5zIFNpdGVgXG4gKiBhbmQgYXNzaWduIHRoZSBkYXRhIGludG8gdGhlIGVudmlyb25tZW50IG9iamVjdFxuICovXG5mdW5jdGlvbiBzZXRFbnZpcm9ubWVudCgpIHtcblxufVxuIiwiLyoqXG4gKiBAbW9kdWxlIGNoYXlucy5lbnZpcm9ubWVudFxuICogQGRlc2NyaXB0aW9uXG4gKiBDaGF5bnMgRW52aXJvbm1lbnRcbiAqL1xuXG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnLi4vdXRpbHMnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVudmlyb25tZW50Jyk7XG5cbi8vIFRPRE86IGltcG9ydCBkZXBlbmRlbmNpZXNcbmV4cG9ydCB2YXIgdHlwZXMgPSB7fTtcblxudHlwZXMuYnJvd3NlciA9IFtcbiAgJ2Nocm9tZScsXG4gICdmaXJlZm94JyxcbiAgJ3NhZmFyaScsXG4gICdvcGVyYScsXG4gICdjaHJvbWUgbW9iaWxlJyxcbiAgJ3NhZmFyaSBtb2JpbGUnLFxuICAnZmlyZWZveCBtb2JpbGUnXG5dO1xuXG50eXBlcy5vcyA9IFtcbiAgJ3dpbmRvd3MnLFxuICAnbWFjT1MnLFxuICAnYW5kcm9pZCcsXG4gICdpb3MnLFxuICAnd3AnXG5dO1xuXG50eXBlcy5jaGF5bnNPUyA9IHtcbiAgd2ViOiAnd2Vic2hhZG93JyxcbiAgd2ViTW9iaWxlOiAnd2Vic2hhZG93bW9iaWxlJyxcbiAgYXBwOiAnd2Vic2hhZG93bW9iaWxlJ1xufTtcblxuLy8gbG9jYXRpb24gcXVlcnkgc3RyaW5nXG52YXIgcXVlcnkgPSBsb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpO1xudmFyIHBhcmFtZXRlcnMgPSB7fTtcbnF1ZXJ5LnNwbGl0KFwiJlwiKS5mb3JFYWNoKGZ1bmN0aW9uKHBhcnQpIHtcbiAgdmFyIGl0ZW0gPSBwYXJ0LnNwbGl0KFwiPVwiKTtcbiAgcGFyYW1ldGVyc1tpdGVtWzBdLnRvTG93ZXJDYXNlKCldID0gZGVjb2RlVVJJQ29tcG9uZW50KGl0ZW1bMV0pLnRvTG93ZXJDYXNlKCk7XG59KTtcblxuLy8gdmVyaWZ5IGJ5IGNoYXlucyByZXF1aXJlZCBwYXJhbWV0ZXJzIGV4aXN0XG5pZiAoIXBhcmFtZXRlcnMuYXBwdmVyc2lvbikge1xuICBsb2cud2Fybignbm8gYXBwIHZlcnNpb24gcGFyYW1ldGVyJyk7XG59XG5pZiAoIXBhcmFtZXRlcnMub3MpIHtcbiAgbG9nLndhcm4oJ25vIG9zIHBhcmFtZXRlcicpO1xufVxuaWYgKHBhcmFtZXRlcnMuZGVidWcpIHtcbiAgLy8gVE9ETzogZW5hYmxlIGRlYnVnIG1vZGVcbn1cblxuLy8gVE9ETzogZnVydGhlciBwYXJhbXMgYW5kIGNvbG9yc2NoZW1lXG5cblxuZnVuY3Rpb24gZ2V0Rmlyc3RNYXRjaChyZWdleCkge1xuICB2YXIgbWF0Y2ggPSB1YS5tYXRjaChyZWdleCk7XG4gIHJldHVybiAobWF0Y2ggJiYgbWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaFsxXSkgfHwgJyc7XG59XG5cbi8vIHVzZXIgYWdlbnQgZGV0ZWN0aW9uXG52YXIgdXNlckFnZW50ID0gKHdpbmRvdy5uYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCkgfHwgJyc7XG5cbnZhciBpcyA9IHtcbiAgaW9zOiAvaVBob25lfGlQYWR8aVBvZC9pLnRlc3QodXNlckFnZW50KSxcbiAgYW5kcm9pZDogL0FuZHJvaWQvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHdwOiAvd2luZG93cyBwaG9uZS9pLnRlc3QodXNlckFnZW50KSxcbiAgYmI6IC9CbGFja0JlcnJ5fEJCMTB8UklNL2kudGVzdCh1c2VyQWdlbnQpLFxuXG4gIG9wZXJhOiAoISF3aW5kb3cub3BlcmEgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCcgT1BSLycpID49IDApLFxuICBmaXJlZm94OiAodHlwZW9mIEluc3RhbGxUcmlnZ2VyICE9PSAndW5kZWZpbmVkJyksXG4gIHNhZmFyaTogKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cuSFRNTEVsZW1lbnQpLmluZGV4T2YoJ0NvbnN0cnVjdG9yJykgPiAwKSxcbiAgY2hyb21lOiAoISF3aW5kb3cuY2hyb21lICYmICEoISF3aW5kb3cub3BlcmEgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCcgT1BSLycpID49IDApKSxcbiAgaWU6IGZhbHNlIHx8ICEhZG9jdW1lbnQuZG9jdW1lbnRNb2RlLFxuICBpZTExOiAvbXNpZSAxMS9pLnRlc3QodXNlckFnZW50KSxcbiAgaWUxMDogL21zaWUgMTAvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllOTogL21zaWUgOS9pLnRlc3QodXNlckFnZW50KSxcbiAgaWU4OiAvbXNpZSA4L2kudGVzdCh1c2VyQWdlbnQpLFxuXG4gIG1vYmlsZTogLyhpcGhvbmV8aXBvZHwoKD86YW5kcm9pZCk/Lio/bW9iaWxlKXxibGFja2JlcnJ5fG5va2lhKS9pLnRlc3QodXNlckFnZW50KSxcbiAgdGFibGV0OiAvKGlwYWR8YW5kcm9pZCg/IS4qbW9iaWxlKXx0YWJsZXQpL2kudGVzdCh1c2VyQWdlbnQpLFxuICBraW5kbGU6IC9cXFcoa2luZGxlfHNpbGspXFxXL2kudGVzdCh1c2VyQWdlbnQpLFxuICB0djogL2dvb2dsZXR2fHNvbnlkdHYvaS50ZXN0KHVzZXJBZ2VudClcbn07XG5cbi8vIFRPRE86IEJyb3dzZXIgVmVyc2lvbiBhbmQgT1MgVmVyc2lvbiBkZXRlY3Rpb25cblxuLy8gVE9ETzogYWRkIGZhbGxiYWNrXG52YXIgb3JpZW50YXRpb24gPSBNYXRoLmFicyh3aW5kb3cub3JpZW50YXRpb24gJSAxODApID09PSAwID8gJ3BvcnRyYWl0JyA6ICdsYW5kc2NhcGUnO1xudmFyIHZpZXdwb3J0ID0gd2luZG93LmlubmVyV2lkdGggKyAneCcgKyB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbmV4cG9ydCB2YXIgZW52aXJvbm1lbnQgPSB7XG5cbiAgLy9vczogcGFyYW1ldGVycy5vcyxcbiAgb3NWZXJzaW9uOiAxLFxuXG4gIGJyb3dzZXI6ICcnLFxuICBicm93c2VyVmVyc2lvbjogMSxcblxuICAvL2FwcFZlcnNpb246IHBhcmFtZXRlcnMuYXBwdmVyc2lvbixcblxuICAvL29yaWVudGF0aW9uOiBvcmllbnRhdGlvbixcblxuICAvL3ZpZXdwb3J0OiB2aWV3cG9ydCwgLy8gaW4gMXgxIGluIHB4XG5cbiAgLy9yYXRpbzogMSwgLy8gcGl4ZWwgcmF0aW9cblxuICAvL2lzSW5GcmFtZTogZmFsc2UsXG5cbiAgLy9pc0NoYXluc1dlYjogbnVsbCwgLy8gZGVza3RvcCBicm93c2VyLCBubyBBcHAsIG5vIG1vYmlsZVxuICAvL2lzQ2hheW5zV2ViTW9iaWxlOiBudWxsLCAvLyBtb2JpbGUgYnJvd3Nlciwgbm8gQXBwLCBubyBkZXNrdG9wXG4gIC8vaXNBcHA6IGZhbHNlLCAvLyBvdGhlcndpc2UgQnJvd3NlclxuICAvL2lzTW9iaWxlOiBudWxsLCAvLyBubyBkZXNrdG9wLCBidXQgbW9iaWxlIGJyb3dzZXIgYW5kIGFwcFxuICAvL2lzVGFibGV0OiBudWxsLCAvLyBubyBkZXNrdG9wLCBraW5kYSBtb2JpbGUsIG1vc3QgbGlrZWx5IG5vIGFwcFxuICAvL2lzRGVza3RvcDogbnVsbCwgLy8gbm8gYXBwLCBubyBtb2JpbGVcbiAgLy9pc0Jyb3dzZXI6IG51bGwsIC8vIG90aGVyd2lzZSBBcHBcblxuICAvL2lzSU9TOiBpcy5pb3MsXG4gIC8vaXNBbmRyb2lkOiBpcy5hbmRyb2lkLFxuICAvL2lzV1A6IGlzLndwLFxuICAvL2lzQkI6IGlzLmJiLFxuXG4gIC8vcGFyYW1ldGVyczogcGFyYW1ldGVycyxcbiAgLy9oYXNoOiBsb2NhdGlvbi5oYXNoLnN1YnN0cigxKSxcblxuICBzaXRlOiB7XG4gICAgc2l0ZUlkOiAxLFxuICAgIG5hbWU6ICdUb2JpdCcsXG4gICAgbG9jYXRpb25JZDogMSxcbiAgICB1cmw6ICdodHRwczovL3RvYml0LmNvbS8nLFxuICAgIHVzZVNTTDogdHJ1ZSxcbiAgICBjb2xvcnNjaGVtZTogMVxuICAgIC8vZWRpdE1vZGU6IGZhbHNlLCAvLyBmdXR1cmUgZWRpdCBtb2RlIGZvciBjb250ZW50XG4gICAgLy9pc0FkbWluTW9kZTogdHJ1ZVxuICB9LFxuXG4gIC8vIFRPRE86IGNvbnNpZGVyIFRhcHBcbiAgYXBwOiB7XG4gICAgYXBwSWQ6IDEsXG4gICAgY29uZmlnOiB7fSxcbiAgICAvL2RlZmF1bHRDb250aWY6IHt9LFxuICAgIGRvbVJlYWR5OiBmYWxzZSxcbiAgICBsb2dzOiB7XG4gICAgICBsb2c6IFtdLFxuICAgICAgZGVidWc6IFtdLFxuICAgICAgd2FybjogW11cbiAgICB9LFxuICAgIGVycm9yczogW11cbiAgfVxufTtcblxuZW52aXJvbm1lbnQucGFyYW1ldGVycyA9IHBhcmFtZXRlcnM7XG5lbnZpcm9ubWVudC5oYXNoID0gbG9jYXRpb24uaGFzaC5zdWJzdHIoMSk7XG5cbi8vIFdBVENIIE9VVCB0aGUgT1MgaXMgc2V0IGJ5IHBhcmFtZXRlciAodW5mb3J0dW5hdGVseSlcbmVudmlyb25tZW50Lm9zID0gcGFyYW1ldGVycy5vcyB8fCAnbm9PUyc7IC8vIFRPRE86IHJlZmFjdG9yIE9TXG5pZiAoaXMubW9iaWxlICYmIFsnYW5kcm9pZCcsICdpb3MnLCAnd3AnXS5pbmRleE9mKHBhcmFtZXRlcnMub3MpICE9PSAtMSkge1xuICBwYXJhbWV0ZXJzLm9zID0gdHlwZXMuY2hheW5zT1MuYXBwO1xufVxuXG4vLyBkZXRlY3Rpb24gYnkgdXNlciBhZ2VudFxuZW52aXJvbm1lbnQuaXNJT1MgPSBpcy5pb3M7XG5lbnZpcm9ubWVudC5pc0FuZHJvaWQgPSBpcy5hbmRyb2lkO1xuZW52aXJvbm1lbnQuaXNXUCA9IGlzLndwO1xuZW52aXJvbm1lbnQuaXNCQiA9IGlzLmJiO1xuXG4vLyBUT0RPOiBtYWtlIHN1cmUgdGhhdCB0aGlzIGFsd2F5cyB3b3JrcyEgKFRTUE4sIGNyZWF0ZSBpZnJhbWUgdGVzdCBwYWdlKVxuZW52aXJvbm1lbnQuaXNJbkZyYW1lID0gKHdpbmRvdyAhPT0gd2luZG93LnRvcCk7XG5cbmVudmlyb25tZW50LmlzQXBwID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLmFwcCAmJiBpcy5tb2JpbGUgJiYgIWVudmlyb25tZW50LmlzSW5GcmFtZSk7IC8vIFRPRE86IGRvZXMgdGhpcyBhbHdheXMgd29yaz9cbmVudmlyb25tZW50LmFwcFZlcnNpb24gPSBwYXJhbWV0ZXJzLmFwcHZlcnNpb247XG5cbmVudmlyb25tZW50LmlzQnJvd3NlciA9ICFlbnZpcm9ubWVudC5pc0FwcDtcblxuZW52aXJvbm1lbnQuaXNEZXNrdG9wID0gKCFpcy5tb2JpbGUgJiYgIWlzLnRhYmxldCk7XG5cbmVudmlyb25tZW50LmlzTW9iaWxlID0gaXMubW9iaWxlO1xuZW52aXJvbm1lbnQuaXNUYWJsZXQgPSBpcy50YWJsZXQ7XG5cbmVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYk1vYmlsZSkgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYikgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWIgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3AgfHwgZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGU7XG5cbi8vIGludGVybmFsIFRPRE86IG1ha2UgaXQgcHJpdmF0ZT9cbmVudmlyb25tZW50LmNhbkNoYXluc0NhbGwgPSBlbnZpcm9ubWVudC5pc0FwcDtcbmVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYjtcblxuZW52aXJvbm1lbnQudmlld3BvcnQgPSB2aWV3cG9ydDsgLy8gVE9ETzogdXBkYXRlIG9uIHJlc2l6ZT8gbm8sIGR1ZSBwZXJmb3JtYW5jZVxuZW52aXJvbm1lbnQub3JpZW50YXRpb24gPSBvcmllbnRhdGlvbjtcbmVudmlyb25tZW50LnJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4iLCJleHBvcnQgdmFyIHVzZXIgPSB7XG4gIG5hbWU6ICdQYWNhbCBXZWlsYW5kJyxcbiAgZmlyc3ROYW1lOiAnUGFzY2FsJyxcbiAgbGFzdE5hbWU6ICdXZWlsYW5kJyxcbiAgdXNlcklkOiAxMjM0LFxuICBmYWNlYm9va0lkOiAxMjM0NSxcbiAgaXNBZG1pbjogdHJ1ZSxcbiAgdWFjR3JvdXBzOiBbXSxcbiAgbGFuZ3VhZ2U6ICdkZV9ERScsXG4gIHRva2VuOiAndG9rZW4nIC8vIFRPRE8gaW5jbHVkZSB0b2tlbiBoZXJlP1xufTtcbiIsIi8qKlxuICogQG5hbWUgamFtZXMgb3IgdG9iaVxuICogQG1vZHVsZSBqYW1lc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogIyBqYW1lcyAtIHRvYml0IGhlbHBlciBsaWJyYXJ5XG4gKiBIZWxwZXIgbGlicmFyeSBzdXBwb3J0aW5nIHRoZSBDaGF5bnMgQVBJXG4gKi9cblxuLy8gVE9ETzogbW92ZSBhbGwgdG8gaGVscGVyLmpzIG9yIHRvYmkvamFtc1xuLy8gVE9ETzogaGVscGVyLmpzIHdpdGggRVM2IGFuZCBqYXNtaW5lIChhbmQgb3IgdGFwZSlcbi8vIGluY2x1ZGUgaGVscGVyIGFzIG1haW4gbW9kdWxlXG5cbi8vIGltcG9ydGFudCBpcyogZnVuY3Rpb25zXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lzJztcblxuLy8gZXh0ZW5kIG9iamVjdCBmdW5jdGlvblxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9leHRlbmQnO1xuXG4vLyBtb2Rlcm5pemVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbW9kZXJuaXplcic7XG5cbi8vIHByb21pc2UgUVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL3Byb21pc2UnO1xuXG4vLyBwb2x5ZmlsbCAmIGFqYXggd3JhcHBlciB3aW5kb3cuZmV0Y2ggKGluc3RlYWQgb2YgJC5hamF4LCAkLmdldCwgJC5nZXRKU09OLCAkaHR0cClcbi8vIG9mZmVycyBmZXRjaCwgZmV0Y2hKU09OIChqc29uIGlzIHN0YW5kYXJkKSwgdXBsb2FkcyB7Z2V0LCBwb3N0LCBwdXQsIGRlbGV0ZX0sIGZldGNoQ1NTLCBmZXRjaEpTXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvZmV0Y2gnO1xuXG4vLyBCcm93c2VyIEFQSXMgKHdpbmRvdywgZG9jdW1lbnQsIGxvY2F0aW9uKVxuLy8gVE9ETzogY29uc2lkZXIgdG8gbm90IGJpbmQgYnJvd3NlciB0byB0aGUgdXRpbHMgYE9iamVjdGBcbi8qIGpzaGludCAtVzExNiAqL1xuLyoganNoaW50IC1XMDMzICovXG4vLyBqc2NzOmRpc2FibGUgcGFyc2VFcnJvclxuaW1wb3J0ICogYXMgYnJvd3NlciBmcm9tICcuL3V0aWxzL2Jyb3dzZXInOyAvL25vaW5zcGVjdGlvbiBCYWRFeHByZXNzaW9uU3RhdGVtZW50SlMganNoaW50IGlnbm9yZTogbGluZVxuLy8ganNjczplbmFibGUgcGFyc2VFcnJvclxuLyoganNoaW50ICtXMDMzICovXG4vKiBqc2hpbnQgK1cxMTYgKi9cbmV4cG9ydCB7YnJvd3Nlcn07XG5cbi8vIERPTVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9kb20nO1xuXG4vLyBMb2dnZXJcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvbG9nZ2VyJztcblxuLy8gQW5hbHl0aWNzXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvYW5hbHl0aWNzJztcblxuLy8gUmVtb3RlXG4vLyByZW1vdGUgZGVidWdnaW5nIGFuZCBhbmFseXNpc1xuXG4vLyBmcm9udC1lbmQgRXJyb3IgSGFuZGxlciAoY2F0Y2hlcyBlcnJvcnMsIGlkZW50aWZ5IGFuZCBhbmFseXNlcyB0aGVtKVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9lcnJvcic7XG5cbi8vIGF1dGggJiBKV1QgaGFuZGxlclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2p3dCc7XG5cbi8vIGNvb2tpZSBoYW5kbGVyICh3aWxsIGJlIHVzZWQgaW4gdGhlIGxvY2FsX3N0b3JhZ2UgYXMgZmFsbGJhY2spXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvY29va2llX2hhbmRsZXInO1xuXG4vLyBsb2NhbFN0b3JhZ2UgaGVscGVyICh3aGljaCBjb29raWUgZmFsbGJhY2spXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbG9jYWxfc3RvcmFnZSc7XG5cbi8vIG1pY3JvIGV2ZW50IGxpYnJhcnlcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXZlbnRzJztcblxuLy8gb2ZmbGluZSBjYWNoZSBoZWxwZXJcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9vZmZsaW5lX2NhY2hlJztcblxuLy8gbm90aWZpY2F0aW9uczogdG9hc3RzLCBhbGVydHMsIG1vZGFsIHBvcHVwcywgbmF0aXZlIHB1c2hcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9ub3RpZmljYXRpb25zJztcblxuLy8gaWZyYW1lIGNvbW11bmljYXRpb24gYW5kIGhlbHBlciAoQ09SUylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9pZnJhbWUnO1xuXG4vLyBwYWdlIHZpc2liaWxpdHkgQVBJXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvcGFnZV92aXNpYmlsaXR5JztcblxuLy8gRGF0ZVRpbWUgaGVscGVyIChjb252ZXJ0cyBkYXRlcywgQyMgZGF0ZSwgdGltZXN0YW1wcywgaTE4biwgdGltZSBhZ28pXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvZGF0ZXRpbWUnO1xuXG5cbi8vIGxhbmd1YWdlIEFQSSBpMThuXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbGFuZ3VhZ2UnO1xuXG4vLyBjcml0aWNhbCBjc3NcblxuLy8gbG9hZENTU1xuXG4vLyBsYXp5IGxvYWRpbmdcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sYXp5X2xvYWRpbmcnO1xuXG4vLyAoaW1hZ2UpIHByZWxvYWRlclxuLy9leHBvcnQgKiBmcm9tICcvdXRpbHMvcHJlbG9hZGVyJztcblxuLy8gaXNQZW1pdHRlZCBBcHAgVmVyc2lvbiBjaGVja1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9pc19wZXJtaXR0ZWQnO1xuXG5cbi8vIGluIEZ1dHVyZVxuLy8gaW1tdXRhYmxlXG4vLyB3ZWFrIG1hcHNcbi8vIG9ic2VydmVyXG4vLyB3ZWIgc29ja2V0cyAod3MsIFNpZ25hbFIpXG4vLyB3b3JrZXIgKHNoYXJlZCB3b3JrZXIsIGxhdGVyIHNlcnZpY2Ugd29ya2VyIGFzIHdlbGwpXG4vLyBsb2NhdGlvbiwgcHVzaFN0YXRlLCBoaXN0b3J5IGhhbmRsZXJcbi8vIGNoYXlucyBzaXRlIGFuZCBjb2RlIGFuYWx5c2VyOiBmaW5kIGRlcHJlY2F0ZWQgbWV0aG9kcywgYmFkIGNvZGUsIGlzc3VlcyBhbmQgYm90dGxlbmVja3NcblxuIiwiLyoqXG4gKiBUaGlzIG1vZHVsZSBjb250YWlucyB0aGUgQnJvd3NlciBBUElzXG4gKlxuICovXG5cbnZhciB3aW4gPSB3aW5kb3c7XG5cbi8vIHVzaW5nIG5vZGUgZ2xvYmFsIChtYWlubHkgZm9yIHRlc3RpbmcsIGRlcGVuZGVuY3kgbWFuYWdlbWVudClcbnZhciBfZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3c7XG5leHBvcnQge19nbG9iYWwgYXMgZ2xvYmFsfTtcblxuZXhwb3J0IHt3aW4gYXMgd2luZG93fTtcbmV4cG9ydCB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQ7XG5leHBvcnQgdmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuZXhwb3J0IHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuZXhwb3J0IHZhciBwYXJlbnQgPSB3aW5kb3cucGFyZW50O1xuZXhwb3J0IHZhciBjb25zb2xlID0gd2luZG93LmNvbnNvbGU7IC8vIE5PVEU6IHNob3VsZCBub3QgYmUgdXNlZC4gdXNlIGxvZ2dlciBpbnN0ZWFkXG5leHBvcnQgdmFyIGdjID0gd2luZG93LmdjID8gKCkgPT4gd2luZG93LmdjKCkgOiAoKSA9PiBudWxsO1xuXG4iLCIvLyBpbnNwaXJlZCBieSBBbmd1bGFyMidzIERPTVxuXG5pbXBvcnQge2RvY3VtZW50fSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtpc1VuZGVmaW5lZH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBjbGFzcyBET00ge1xuXG4gIC8vIE5PVEU6IGFsd2F5cyByZXR1cm5zIGFuIGFycmF5XG4gIHN0YXRpYyAkKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwuYmluZChkb2N1bWVudCk7XG4gIH1cblxuICAvLyBzZWxlY3RvcnNcbiAgc3RhdGljIHF1ZXJ5KHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBxdWVyeVNlbGVjdG9yKGVsLCBzZWxlY3Rvcikge1xuICAgIHJldHVybiBlbC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvckFsbChlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIG9uKGVsLCBldnQsIGxpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldnQsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjbG9uZShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuY2xvbmVOb2RlKHRydWUpO1xuICB9XG4gIHN0YXRpYyBoYXNQcm9wZXJ0eShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIG5hbWUgaW4gZWxlbWVudDtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShuYW1lKTtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeVRhZ05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKG5hbWUpO1xuICB9XG5cbiAgLy8gaW5wdXRcbiAgc3RhdGljIGdldElubmVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5pbm5lckhUTUw7XG4gIH1cbiAgc3RhdGljIGdldE91dGVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5vdXRlckhUTUw7XG4gIH1cbiAgc3RhdGljIHNldEhUTUwoZWwsIHZhbHVlKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH1cbiAgc3RhdGljIGdldFRleHQoZWwpIHtcbiAgICByZXR1cm4gZWwudGV4dENvbnRlbnQ7XG4gIH1cbiAgc3RhdGljIHNldFRleHQoZWwsIHZhbHVlKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGlucHV0IHZhbHVlXG4gIHN0YXRpYyBnZXRWYWx1ZShlbCkge1xuICAgIHJldHVybiBlbC52YWx1ZTtcbiAgfVxuICBzdGF0aWMgc2V0VmFsdWUoZWwsIHZhbHVlKSB7XG4gICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGNoZWNrYm94ZXNcbiAgc3RhdGljIGdldENoZWNrZWQoZWwpIHtcbiAgICByZXR1cm4gZWwuY2hlY2tlZDtcbiAgfVxuICBzdGF0aWMgc2V0Q2hlY2tlZChlbCwgdmFsdWUpIHtcbiAgICBlbC5jaGVja2VkID0gdmFsdWU7XG4gIH1cblxuICAvLyBjbGFzc1xuICBzdGF0aWMgY2xhc3NMaXN0KGVsZW1lbnQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWxlbWVudC5jbGFzc0xpc3QsIDApO1xuICB9XG4gIHN0YXRpYyBhZGRDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIGhhc0NsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICB9XG5cbiAgLy8gY3NzXG4gIHN0YXRpYyBjc3MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZoYXNhbHVlKSB7XG4gICAgaWYoaXNVbmRlZmluZWQoc3R5bGVWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gICAgfVxuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IHN0eWxlVmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldENTUyhlbGVtZW50LCBzdHlsZU5hbWUsIHN0eWxlVmFsdWUpIHtcbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDU1MoZWxlbWVudCwgc3R5bGVOYW1lKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gbnVsbDtcbiAgfVxuICBzdGF0aWMgZ2V0Q1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjcmVhdGVFbGVtZW50KHRhZ05hbWUsIGRvYz1kb2N1bWVudCkge1xuICAgIHJldHVybiBkb2MuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgfVxuXG4gIHN0YXRpYyByZW1vdmUoZWwpIHtcbiAgICB2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZTtcbiAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIHJldHVybiBlbDtcbiAgfVxuXG4gIHN0YXRpYyBhcHBlbmRDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLmFwcGVuZENoaWxkKG5vZGUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICB9XG5cbiAgc3RhdGljIGluc2VydEJlZm9yZShlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRBZnRlcihlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHN0YXRpYyB0YWdOYW1lKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lO1xuICB9XG5cbiAgLy8gYXR0cmlidXRlc1xuICBzdGF0aWMgZ2V0QXR0cmlidXRlKGVsZW1lbnQsIGF0dHJpYnV0ZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICB9XG4gIHN0YXRpYyBzZXRBdHRyaWJ1dGUoZWxlbWVudCwgbmFtZSwgdmFsdWUpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBFcnJvciBIYW5kbGVyIE1vZHVsZVxuICovXG5cbi8vIFRPRE86IGNvbnNpZGVyIGltcG9ydGluZyBmcm9tICcuL3V0aWxzJyBvbmx5XG5pbXBvcnQge3dpbmRvdyBhcyB3aW59IGZyb20gJy4vYnJvd3Nlcic7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHtDb25maWd9IGZyb20gJy4uL2NoYXlucy9jb25maWcnO1xuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuZXJyb3InKTtcblxud2luLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxldCBsaW5lQW5kQ29sdW1uSW5mbyA9XG4gICAgZXJyLmNvbG5vXG4gICAgICA/ICcgbGluZTonICsgZXJyLmxpbmVubyArICcsIGNvbHVtbjonICsgZXJyLmNvbG5vXG4gICAgICA6ICcgbGluZTonICsgZXJyLmxpbmVubztcblxuICBsZXQgZmluYWxFcnJvciA9IFtcbiAgICAgICdKYXZhU2NyaXB0IEVycm9yJyxcbiAgICAgIGVyci5tZXNzYWdlLFxuICAgICAgZXJyLmZpbGVuYW1lICsgbGluZUFuZENvbHVtbkluZm8gKyAnIC0+ICcgKyAgbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgICAgIDAsXG4gICAgICB0cnVlXG4gIF07XG5cbiAgLy8gVE9ETzogYWRkIHByb3BlciBFcnJvciBIYW5kbGVyXG4gIGxvZy53YXJuKGZpbmFsRXJyb3IpO1xuICBpZihDb25maWcuZ2V0KCdwcmV2ZW50RXJyb3JzJykpIHtcbiAgICBlcnIucHJldmVudERlZmF1bHQoKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KTtcbiIsIi8vIFRPRE86IHJlZmFjdG9yIGFuZCB3cml0ZSB0ZXN0c1xuLy8gVE9ETzogYWRkIGV4YW1wbGVcbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gYGBganNcbiAvLyBEZW1vXG5cbiBldmVudHMucHVibGlzaCgnL3BhZ2UvbG9hZCcsIHtcblx0dXJsOiAnL3NvbWUvdXJsL3BhdGgnIC8vIGFueSBhcmd1bWVudFxufSk7XG5cbiB2YXIgc3Vic2NyaXB0aW9uID0gZXZlbnRzLnN1YnNjcmliZSgnL3BhZ2UvbG9hZCcsIGZ1bmN0aW9uKG9iaikge1xuXHQvLyBEbyBzb21ldGhpbmcgbm93IHRoYXQgdGhlIGV2ZW50IGhhcyBvY2N1cnJlZFxufSk7XG5cbiAvLyAuLi5zb21ldGltZSBsYXRlciB3aGVyZSBJIG5vIGxvbmdlciB3YW50IHN1YnNjcmlwdGlvbi4uLlxuIHN1YnNjcmlwdGlvbi5yZW1vdmUoKTtcblxuIC8vICB2YXIgdGFyZ2V0ID0gd2luZG93LmV2ZW50ID8gd2luZG93LmV2ZW50LnNyY0VsZW1lbnQgOiBlID8gZS50YXJnZXQgOiBudWxsO1xuIGBgYFxuICovXG5leHBvcnQgdmFyIGV2ZW50cyA9IChmdW5jdGlvbigpIHtcbiAgbGV0IHRvcGljcyA9IHt9O1xuICBsZXQgb3duUHJvcGVydHkgPSB0b3BpY3MuaGFzT3duUHJvcGVydHk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uKHRvcGljLCBsaXN0ZW5lcikge1xuICAgICAgLy8gQ3JlYXRlIHRoZSB0b3BpYydzIG9iamVjdCBpZiBub3QgeWV0IGNyZWF0ZWRcbiAgICAgIGlmICghb3duUHJvcGVydHkuY2FsbCh0b3BpY3MsIHRvcGljKSkge1xuICAgICAgICB0b3BpY3NbdG9waWNdID0gW107XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCB0aGUgbGlzdGVuZXIgdG8gcXVldWVcbiAgICAgIGxldCBpbmRleCA9IHRvcGljc1t0b3BpY10ucHVzaChsaXN0ZW5lcikgLTE7XG5cbiAgICAgIC8vIFByb3ZpZGUgaGFuZGxlIGJhY2sgZm9yIHJlbW92YWwgb2YgdG9waWNcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZGVsZXRlIHRvcGljc1t0b3BpY11baW5kZXhdO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBwdWJsaXNoOiBmdW5jdGlvbih0b3BpYywgaW5mbykge1xuICAgICAgLy8gSWYgdGhlIHRvcGljIGRvZXNuJ3QgZXhpc3QsIG9yIHRoZXJlJ3Mgbm8gbGlzdGVuZXJzIGluIHF1ZXVlLCBqdXN0IGxlYXZlXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBDeWNsZSB0aHJvdWdoIHRvcGljcyBxdWV1ZSwgZmlyZSFcbiAgICAgIHRvcGljc1t0b3BpY10uZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGl0ZW0oaW5mbyAhPT0gdW5kZWZpbmVkID8gaW5mbyA6IHt9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxufSkoKTtcbiIsIi8qKlxuICogQG5hbWUgamFtZXMuZXh0ZW5kXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeHRlbmRzIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QgYnkgY29weWluZyBwcm9wZXJ0aWVzIGZyb20gdGhlIHNyYyBvYmplY3QuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cblxuaW1wb3J0IHtpc09iamVjdH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gIGlmICghaXNPYmplY3Qob2JqKSkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cbiAgdmFyIHNvdXJjZSwgcHJvcDtcbiAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICBmb3IgKHByb3AgaW4gc291cmNlKSB7XG4gICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmlzVW5kZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyB1bmRlZmluZWQuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHVuZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzRGVmaW5lZFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGVmaW5lZCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc1ByZXNlbnRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIG5laXRoZXIgdW5kZWZpbmVkIG5vciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBwcmVzZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmVzZW50KG9iaikge1xuICByZXR1cm4gb2JqICE9PSB1bmRlZmluZWQgJiYgb2JqICE9PSBudWxsO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQmxhbmtcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGVpdGhlciB1bmRlZmluZWQgb3IgbnVsbC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYmxhbmsuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JsYW5rKG9iaikge1xuICByZXR1cm4gb2JqID09PSB1bmRlZmluZWQgfHwgb2JqID09PSBudWxsO1xufVxuXG5cbi8qKlxuKiBAbmFtZSBqYW1lcy5pc1N0cmluZ1xuKiBAbW9kdWxlIGphbWVzXG4qIEBraW5kIGZ1bmN0aW9uXG4qXG4qIEBkZXNjcmlwdGlvblxuKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFN0cmluZ2AuXG4qXG4qIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYFN0cmluZ2AuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzTnVtYmVyXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBOdW1iZXJgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBOdW1iZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNPYmplY3RcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYE9iamVjdGAuXG4gKiBudWxsIGlzIG5vdCB0cmVhdGVkIGFzIGFuIG9iamVjdC5cbiAqIEluIEpTIGFycmF5cyBhcmUgb2JqZWN0c1xuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYE9iamVjdGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0FycmF5XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGFuIGBBcnJheWAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGFuIGBBcnJheWAuXG4gKi9cbmV4cG9ydCB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNGdW5jdGlvblxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgRnVuY3Rpb25gLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBGdW5jdGlvbmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEYXRlXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHZhbHVlIGlzIGEgZGF0ZS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgRGF0ZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RhdGUodmFsdWUpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5cbi8vIFRPRE86IGRvZXMgbm90IGJlbG9uZyBpbiBoZXJlXG4vKipcbiAqIEBuYW1lIHV0aWxzLnRyaW1cbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUmVtb3ZlcyB3aGl0ZXNwYWNlcy5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtTdHJpbmd8Kn0gVHJpbW1lZCAgdmFsdWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyaW0odmFsdWUpIHtcbiAgcmV0dXJuIGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKSA6IHZhbHVlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzVVVJRFxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFVVSURgIChPU0YpLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBVVUlEYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVVVJRCh2YWx1ZSkge1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB0cmltKHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWUubWF0Y2goL15bMC05YS1mXXs0fShbMC05YS1mXXs0fS0pezR9WzAtOWEtel17MTJ9JC9pKSAhPT0gbnVsbDtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNHVUlEXG4gKiBAYWxpYXMgdXRpbHMuaXNVVUlEXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgR1VJRGAgKE1pY3Jvc29mdCBTdGFuZGFyZCkuXG4gKiBJcyBhbiBhbGlhcyB0byBpc1VVSURcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgR1VJRGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0dVSUQodmFsdWUpIHtcbiAgcmV0dXJuIGlzVVVJRCh2YWx1ZSk7XG59XG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzTWFjQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE1BQyBBZGRyZXNzYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNYWNBZGRyZXNzKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXihbMC05YS1mXXsyfVstOl0pezV9WzAtOWEtZl17Mn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0JMRUFkZHJlc3NcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBCTEUgQWRkcmVzc2BcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgQkxFIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCTEVBZGRyZXNzKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpIHx8IGlzTWFjQWRkcmVzcyh2YWx1ZSk7XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3R9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5pc19wZXJtaXR0ZWQnKTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBjdXJyZW50IHVzZXIncyBPUyBhbmQgT1MgVmVyc2lvbiBpcyBoaWdoZXJcbiAqIG9yIGVxdWFsIHRvIHRoZSBwYXNzZWQgcmVmZXJlbmNlIGBPYmplY3RgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJzaW9ucyBWZXJzaW9ucyBgT2JqZWN0YCB3aXRoIHBlcm1pdHRlZCBPU3MgYW5kIHRoZWlyIHZlcnNpb24uXG4gKiBAcGFyYW0ge3N0cmluZ30gb3MgT1MgTmFtZSBhcyBsb3dlcmNhc2Ugc3RyaW5nLlxuICogQHBhcmFtIHtJbnRlZ2VyfSBhcHBWZXJzaW9uIEFwcCBWZXJzaW9uIE51bWJlciBhcyBJbnRlZ2VyICBUT0RPOiBmb3JtYXQgUkZDP1xuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGN1cnJlbnQgT1MgJiBWZXJzaW9uIGFyZSBkZWZpbmVkIGluIHRoZSB2ZXJzaW9ucyBgT2JqZWN0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIG9zLCBhcHBWZXJzaW9uKSB7XG5cbiAgaWYgKCF2ZXJzaW9ucyB8fCAhaXNPYmplY3QodmVyc2lvbnMpKSB7XG4gICAgbG9nLndhcm4oJ25vIHZlcnNpb25zIGBPYmplY3RgIHdhcyBwYXNzZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbnNbb3NdICYmIGFwcFZlcnNpb24gPj0gdmVyc2lvbnNbb3NdO1xufVxuIiwiLyoqXG4gKiBMb2dMZXZlbCBFbnVtXG4gKiBub25lIGlzIDBcbiAqIGRlYnVnIGlzIDRcbiAqIEB0eXBlIEVudW1cbiAqL1xuZXhwb3J0IHZhciBsZXZlbHMgPSB7XG4gIG5vbmU6IDAsXG4gIGVycm9yOjEsXG4gIHdhcm46MixcbiAgaW5mbzozLFxuICBkZWJ1Zzo0XG59O1xuXG4vKipcbiAqIENhbiBzdG9yZSBtdWx0aXBsZSBsb2dnZXJzXG4gKiBAdHlwZSB7YE9iamVjdGB9IGxvZ2dlcnNcbiAqL1xubGV0IGxvZ2dlcnMgPSB7fTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEFzc2lnbiB0aGUgbG9nZ2VyIG1ldGhvZC5cbiAqIEJ5IGRlZmF1bHQgdGhlIHdpbmRvdy5jb25zb2xlIGBPYmplY3RgXG4gKiBAdHlwZSBgd2luZG93LmNvbnNvbGVgXG4gKi9cbmxldCBsb2dnZXIgPSB3aW5kb3cuY29uc29sZTtcblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nIExldmVsXG4gKiB1c2UgYHNldExldmVsKG5ld0xvZ0xldmVsKWAgdG8gb3ZlcndyaXRlIHRoaXMgdmFsdWUuXG4gKiBUT0RPOiBlYWNoIGxvZ2dlciBnZXRzIGFuIG93biBsb2dMZXZlbFxuICovXG5sZXQgbG9nTGV2ZWwgPSBsZXZlbHMubm9uZTtcblxuLyoqXG4gKlxuICogQHBhcmFtIGxldmVsXG4gKiBAcGFyYW0gYXJnc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gbG9nKGxldmVsLCBhcmdzLCBwcmVmaXgpIHtcbiAgbGV0IHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICBpZiAocHJlZml4KSB7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJncyk7XG4gICAgLy9hcmdzLnVuc2hpZnQodGltZSk7IC8vIFRPRE86IGNvbnNpZGVyIHRvZ2dsZWFibGUgdGltZVxuICAgIGFyZ3MudW5zaGlmdChwcmVmaXgpO1xuICB9XG4gIGxvZ2dlcltsZXZlbCB8fCAnbG9nJ10uYXBwbHkoY29uc29sZSwgYXJncyk7XG59XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IGxvZ0xldmVsXG4gKiBpbiBvcmRlciB0byBzaG93IG9yIG5vdCBzaG93IGxvZ3NcbiAqIEBwYXJhbSBsZXZlbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TGV2ZWwobGV2ZWwpIHtcbiAgbG9nTGV2ZWwgPSBsZXZlbDtcbn1cblxuLyoqXG4gKiBHZXQgTG9nZ2VyIFNpbmdsZXRvbiBJbnN0YW5jZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIFRoZSBMb2dnZXIncyBuYW1lXG4gKiBAcmV0dXJucyB7TG9nZ2VyfSBMb2dnZXIgaW5zdGFuY2UsIGVpdGhlciBleGlzdGluZyBvbmUgb3IgY3JlYXRlcyBhIG5ldyBvbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XG4gIHJldHVybiBsb2dnZXJzW25hbWVdIHx8IChsb2dnZXJzW25hbWVdID0gbmV3IExvZ2dlcihuYW1lKSk7XG59XG5cbi8qKlxuICogTG9nZ2VyIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuXG4gIC8qKlxuICAgKiBFYWNoIGxvZ2dlciBpcyBpZGVudGlmaWVkIGJ5IGl0J3MgbmFtZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbG9nZ2VyIChlLmcuIGBjaGF5bnMuY29yZWApXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gJ1snICsgbmFtZSArICddOiAnO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlYnVnXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZGVidWcoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2RlYnVnJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgaW5mby5cbiAgICpcbiAgICogQG1ldGhvZCBpbmZvXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgaW5mbygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnaW5mbycsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nLlxuICAgKlxuICAgKiBAbWV0aG9kIHdhcm5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICB3YXJuKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2coJ3dhcm4nLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvci5cbiAgICpcbiAgICogQG1ldGhvZCBlcnJvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGVycm9yKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdlcnJvcicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxufVxuIiwiXG5pbXBvcnQge2NoYXluc30gZnJvbSAnLi9jaGF5bnMnO1xuZXhwb3J0IGRlZmF1bHQgY2hheW5zO1xuIl19
  return require('chayns');

});
