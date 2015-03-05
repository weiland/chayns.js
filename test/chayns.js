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

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

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

var Promise = _interopRequire(require("./lib/promise_polyfill"));

Promise.polyfill(); // autoload Promise polyfill
// TODO: add Deferred?

require("./lib/fetch_polyfill");

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

},{"./chayns/chayns_api_interface":3,"./chayns/chayns_calls":4,"./chayns/config":5,"./chayns/core":6,"./chayns/environment":7,"./chayns/user":8,"./lib/fetch_polyfill":9,"./lib/promise_polyfill":10,"./utils":11}],2:[function(require,module,exports){
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
      log.debug("invoke callback: ", callbackName, "type:", type);
      var fn = callbacks[callbackName];
      if (isFunction(fn)) {
        fn.apply(null, arguments);
        //delete callbacks[callbackName]; // TODO: cannot be like that, remove array?
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

},{"../utils":11,"../utils/browser":12}],3:[function(require,module,exports){
"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

/**
 * Chayns API Interface
 * API to communicate with the APP and the Chayns Web
 */

var apiCall = require("./chayns_calls").apiCall;

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var isFunction = _utils.isFunction;
var isString = _utils.isString;
var isNumber = _utils.isNumber;
var isBLEAddress = _utils.isBLEAddress;
var isDate = _utils.isDate;
var isObject = _utils.isObject;
var isArray = _utils.isArray;
var trim = _utils.trim;
var DOM = _utils.DOM;

var _utilsBrowser = require("../utils/browser");

var window = _utilsBrowser.window;
var location = _utilsBrowser.location;
// due to window.open and location.href

var log = getLogger("chayns_api_interface");

/**
 * NFC Response Data Storage
 * @type {Object}
 */
var NfcResponseData = {
  RFId: 0,
  PersonId: 0
};

/**
 * Popup Button
 * @class PopupButton
 */

var PopupButton = (function () {
  /**
   * Popup Button Constructor
   * @param {String} name Popup Button name
   */

  function PopupButton(name, callback) {
    _classCallCheck(this, PopupButton);

    this.name = name;
    this.callback = callback;
    var el = DOM.createElement("div");
    el.setAttribute("id", "chayns-popup");
    el.setAttribute("class", "chayns__popup");
    this.element = el;
  }

  _prototypeProperties(PopupButton, null, {
    name: {
      /**
       * Get Popup Button name
       * @returns {name}
       */

      value: function name() {
        return this.name;
      },
      writable: true,
      configurable: true
    },
    callback: {

      /**
       * Callback
       */

      value: function callback() {
        var cb = this.callback;
        var name = cb.name;
        if (isFunction(cb)) {
          cb.call(null, name);
        }
      },
      writable: true,
      configurable: true
    },
    toHTML: {
      /**
       * @name toHTML
       * Returns HTML Node containing the PopupButton.
       * @returns {PopupButton.element|HTMLNode}
       */

      value: function toHTML() {
        return this.element;
      },
      writable: true,
      configurable: true
    }
  });

  return PopupButton;
})();

/**
 * Beacon List
 * @type {Array|null}
 */
var beaconList = null;

/**
 * Global Data Storage
 * @type {boolean|Object}
 */
var globalData = false;

/**
 * All public chayns methods to interact with *Chayns App* or *Chayns Web*
 * @type {Object}
 */
var chaynsApiInterface = exports.chaynsApiInterface = {

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
  // TODO: rename to enablePullToRefresh
  allowRefreshScroll: function allowRefreshScroll() {
    chaynsApiInterface.setPullToRefresh(true);
  },
  disallowRefreshScroll: function disallowRefreshScroll() {
    chaynsApiInterface.setPullToRefresh(false);
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
  showWaitcursor: function showWaitcursor() {
    return chaynsApiInterface.setWaitcursor(true);
  },
  hideWaitcursor: function hideWaitcursor() {
    return chaynsApiInterface.setWaitcursor(false);
  },

  // TODO: rename it to openTapp?
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
   * TODO: rename to open
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
      callbackName: callbackName,
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
   * NOTE: prefer `chayns.login()` over this method to perform a user login.
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
      support: { android: 2402, ios: 1383, wp: 2543 }
    });
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
   * Show Dialog
   *
   * @param {Object} {content:{String} , headline: ,buttons:{Array}, noContentnPadding:, onLoad:}
   * @returns {boolean}
   */
  showDialog: function showDialog(obj) {
    if (!obj || !isObject(obj)) {
      log.warn("showDialog: invalid parameters");
      return false;
    }
    if (isString(obj.content)) {
      obj.content = trim(obj.content.replace(/<br[ /]*?>/g, "\n"));
    }
    if (!isArray(obj.buttons) || obj.buttons.length === 0) {
      obj.buttons = [new PopupButton("OK").toHTML()];
    }

    var callbackName = "ChaynsDialogCallBack()";
    function callbackFn(buttons, id) {
      id = parseInt(id, 10) - 1;
      if (buttons[id]) {
        buttons[id].callback.call(null);
      }
    }

    return apiCall({
      cmd: 16, // TODO: is slitte://
      params: [{ callback: callbackName }, { string: obj.headline }, { string: obj.content }, { string: obj.buttons[0].name } // TODO: needs encodeURI?
      //{'string': obj.buttons[1].name}, // TODO: needs encodeURI?
      //{'string': obj.buttons[2].name} // TODO: needs encodeURI?
      ],
      cb: callbackFn.bind(null, obj.buttons),
      support: { android: 2606 },
      fallbackFn: function fallbackFn() {
        console.log("fallback popup", arguments);
      }
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
      log.warn("getGlobalData: callback is no valid `Function`.");
      return false;
    }
    if (!forceReload && globalData) {
      callback(globalData);
    }
    return apiCall({
      cmd: 18,
      webFn: "getAppInfos",
      params: [{ callback: "getGlobalData()" }], // callback param only on mobile
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
      params: [{ Integer: duration.toString() }],
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
      webFn: function webFn() {},
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
    var cmd = response === nfcResponseData.PersonId ? 37 : 38;
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
        location.href = url; // TODO: make sure it works
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
  getLocationBeacons: function getLocationBeacons(callback, forceReload) {

    if (!isFunction(callback)) {
      log.warn("getLocationBeacons: the callback is no `Function`");
      return false;
    }

    var callbackName = "getBeaconsCallBack()";
    if (beaconList && !forceReload) {
      // TODO: make sure it is good to cache the list
      log.debug("getLocationBeacons: there is already one beaconList");
      return callback.call(null, beaconList);
    }
    var callbackFn = function getLocationBeaconCallback(callback, list) {
      beaconList = list;
      callback.call(null, list);
    };
    return apiCall({
      cmd: 39,
      params: [{ callback: callbackName }],
      support: { android: 4045, ios: 4048 },
      cb: callbackFn.bind(null, callback)
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

    return apiCall({
      cmd: 47,
      params: [{ string: url }],
      support: { ios: 4045 },
      webFn: chaynsApiInterface.openLinkInBrowser.bind(null, url),
      fallbackFn: chaynsApiInterface.openLinkInBrowser.bind(null, url)
    });
  },

  /**
   * Tobit Login
   * With FacebookConnect Fallback
   *
   * @param {String} params Reload Parameter
   * @returns {Boolean}
   */
  login: function login(params) {
    params = "ExecCommand=" + params;
    return apiCall({
      cmd: 54,
      params: [{ string: params }],
      support: { ios: 4240, wp: 4099 },
      fallbackFn: chaynsApiInterface.facebookConnect.bind(null, "user_friends", params),
      webFn: "tobitconnect",
      webParams: params
    });
  }

};
Object.defineProperty(exports, "__esModule", {
  value: true
});

// TODO: implement image upload with window.fetch
//var fd = new FormData();
//fd.append("Image", file[0]);
//window.imageChosen = window.fetch({
//  type: "POST",
//  url: "//chayns1.tobit.com/TappApi/File/Image",
//  contentType: false,
//  processData: false,
//  cache: false,
//  data: fd
//}).then(function(data) {
//  delete window.imageChosen;
//  callback.call(null, data);
//});
//$("#ChaynsImageUpload").click();

},{"../utils":11,"../utils/browser":12,"./chayns_calls":4}],4:[function(require,module,exports){
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
        if (isFunction(chaynsCallObj.fallbackFn)) {
          log.info("executeCall: fallbackFn will be invoked");
          return chaynsCallObj.fallbackFn.call(null);
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
              callArgs.push("'" + callbackPrefix + value + "'");
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

},{"../utils":11,"../utils/browser":12,"./callbacks":2,"./environment":7}],5:[function(require,module,exports){
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

},{"../utils":11}],6:[function(require,module,exports){
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

    // add chayns root element
    var chaynsRoot = DOM.createElement("div");
    chaynsRoot.setAttribute("id", "chayns-root");
    chaynsRoot.setAttribute("class", "chayns__root");
    DOM.appendChild(body, chaynsRoot);

    // dom-ready class
    DOM.addClass(document.body, "dom-ready");

    // get the App Information, has to be done when document ready
    var getAppInformationCall = !chaynsApiInterface.getGlobalData(function (data) {

      // now Chayns is officially ready

      log.debug("appInformation callback", data);

      readyCallbacks.forEach(function (callback) {

        callback.call(null, data);
      });
      readyCallbacks = [];

      DOM.addClass(document.body, "chayns-ready");
      DOM.removeAttribute(DOM.query("[chayns-cloak]"), "chayns-cloak");

      log.info("finished chayns setup");
    });

    if (getAppInformationCall) {
      log.error("The App Information could not be retrieved.");
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

},{"../utils":11,"./callbacks":2,"./chayns_api_interface":3,"./config":5}],7:[function(require,module,exports){
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

// TODO: hide internal parameters from the others
// TODO: offer user an `Object` with URL Parameters
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
// TODO: discuss role of URL params and try to replace them and only use AppData

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

},{"../utils":11}],8:[function(require,module,exports){
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

(function () {
  "use strict";

  if (self.fetch) {
    return;
  }

  function normalizeName(name) {
    if (typeof name !== "string") {
      name = name.toString();
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError("Invalid character in header field name");
    }
    return name.toLowerCase();
  }

  function normalizeValue(value) {
    if (typeof value !== "string") {
      value = value.toString();
    }
    return value;
  }

  function Headers(headers) {
    this.map = {};

    var self = this;
    if (headers instanceof Headers) {
      headers.forEach(function (name, values) {
        values.forEach(function (value) {
          self.append(name, value);
        });
      });
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function (name) {
        self.append(name, headers[name]);
      });
    }
  }

  Headers.prototype.append = function (name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var list = this.map[name];
    if (!list) {
      list = [];
      this.map[name] = list;
    }
    list.push(value);
  };

  Headers.prototype["delete"] = function (name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function (name) {
    var values = this.map[normalizeName(name)];
    return values ? values[0] : null;
  };

  Headers.prototype.getAll = function (name) {
    return this.map[normalizeName(name)] || [];
  };

  Headers.prototype.has = function (name) {
    return this.map.hasOwnProperty(normalizeName(name));
  };

  Headers.prototype.set = function (name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)];
  };

  // Instead of iterable for now.
  Headers.prototype.forEach = function (callback) {
    var self = this;
    Object.getOwnPropertyNames(this.map).forEach(function (name) {
      callback(name, self.map[name]);
    });
  };

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError("Already read"));
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function (resolve, reject) {
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(reader.error);
      };
    });
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    reader.readAsArrayBuffer(blob);
    return fileReaderReady(reader);
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    reader.readAsText(blob);
    return fileReaderReady(reader);
  }

  var support = {
    blob: "FileReader" in self && "Blob" in self && (function () {
      try {
        new Blob();
        return true;
      } catch (e) {
        return false;
      }
    })(),
    formData: "FormData" in self
  };

  function Body() {
    this.bodyUsed = false;

    if (support.blob) {
      this._initBody = function (body) {
        this._bodyInit = body;
        if (typeof body === "string") {
          this._bodyText = body;
        } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
          this._bodyBlob = body;
        } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
          this._bodyFormData = body;
        } else if (!body) {
          this._bodyText = "";
        } else {
          throw new Error("unsupported BodyInit type");
        }
      };

      this.blob = function () {
        var rejected = consumed(this);
        if (rejected) {
          return rejected;
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob);
        } else if (this._bodyFormData) {
          throw new Error("could not read FormData body as blob");
        } else {
          return Promise.resolve(new Blob([this._bodyText]));
        }
      };

      this.arrayBuffer = function () {
        return this.blob().then(readBlobAsArrayBuffer);
      };

      this.text = function () {
        var rejected = consumed(this);
        if (rejected) {
          return rejected;
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob);
        } else if (this._bodyFormData) {
          throw new Error("could not read FormData body as text");
        } else {
          return Promise.resolve(this._bodyText);
        }
      };
    } else {
      this._initBody = function (body) {
        this._bodyInit = body;
        if (typeof body === "string") {
          this._bodyText = body;
        } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
          this._bodyFormData = body;
        } else if (!body) {
          this._bodyText = "";
        } else {
          throw new Error("unsupported BodyInit type");
        }
      };

      this.text = function () {
        var rejected = consumed(this);
        return rejected ? rejected : Promise.resolve(this._bodyText);
      };
    }

    if (support.formData) {
      this.formData = function () {
        return this.text().then(decode);
      };
    }

    this.json = function () {
      return this.text().then(JSON.parse);
    };

    return this;
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method;
  }

  function Request(url, options) {
    options = options || {};
    this.url = url;

    this.credentials = options.credentials || "omit";
    this.headers = new Headers(options.headers);
    this.method = normalizeMethod(options.method || "GET");
    this.mode = options.mode || null;
    this.referrer = null;

    if ((this.method === "GET" || this.method === "HEAD") && options.body) {
      throw new TypeError("Body not allowed for GET or HEAD requests");
    }
    this._initBody(options.body);
  }

  function decode(body) {
    var form = new FormData();
    body.trim().split("&").forEach(function (bytes) {
      if (bytes) {
        var split = bytes.split("=");
        var name = split.shift().replace(/\+/g, " ");
        var value = split.join("=").replace(/\+/g, " ");
        form.append(decodeURIComponent(name), decodeURIComponent(value));
      }
    });
    return form;
  }

  function headers(xhr) {
    var head = new Headers();
    var pairs = xhr.getAllResponseHeaders().trim().split("\n");
    pairs.forEach(function (header) {
      var split = header.trim().split(":");
      var key = split.shift().trim();
      var value = split.join(":").trim();
      head.append(key, value);
    });
    return head;
  }

  Request.prototype.fetch = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      if (self.credentials === "cors") {
        xhr.withCredentials = true;
      }

      function responseURL() {
        if ("responseURL" in xhr) {
          return xhr.responseURL;
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader("X-Request-URL");
        }

        return;
      }

      xhr.onload = function () {
        var status = xhr.status === 1223 ? 204 : xhr.status;
        if (status < 100 || status > 599) {
          reject(new TypeError("Network request failed"));
          return;
        }
        var options = {
          status: status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        };
        var body = "response" in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options));
      };

      xhr.onerror = function () {
        reject(new TypeError("Network request failed"));
      };

      xhr.open(self.method, self.url, true);

      if ("responseType" in xhr && support.blob) {
        xhr.responseType = "blob";
      }

      self.headers.forEach(function (name, values) {
        values.forEach(function (value) {
          xhr.setRequestHeader(name, value);
        });
      });

      xhr.send(typeof self._bodyInit === "undefined" ? null : self._bodyInit);
    });
  };

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this._initBody(bodyInit);
    this.type = "default";
    this.url = null;
    this.status = options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = options.statusText;
    this.headers = options.headers;
    this.url = options.url || "";
  }

  Body.call(Response.prototype);

  self.Headers = Headers;
  self.Request = Request;
  self.Response = Response;

  self.fetch = function (url, options) {
    return new Request(url, options).fetch();
  };
  self.fetch.polyfill = true;
})();

},{}],10:[function(require,module,exports){
(function (process,global){
"use strict";

/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.0.0
 */

(function () {
  function r(a, b) {
    n[l] = a;n[l + 1] = b;l += 2;2 === l && A();
  }function s(a) {
    return "function" === typeof a;
  }function F() {
    return function () {
      process.nextTick(t);
    };
  }function G() {
    var a = 0,
        b = new B(t),
        c = document.createTextNode("");b.observe(c, { characterData: !0 });return function () {
      c.data = a = ++a % 2;
    };
  }function H() {
    var a = new MessageChannel();a.port1.onmessage = t;return function () {
      a.port2.postMessage(0);
    };
  }function I() {
    return function () {
      setTimeout(t, 1);
    };
  }function t() {
    for (var a = 0; a < l; a += 2) (0, n[a])(n[a + 1]), n[a] = void 0, n[a + 1] = void 0;
    l = 0;
  }function p() {}function J(a, b, c, d) {
    try {
      a.call(b, c, d);
    } catch (e) {
      return e;
    }
  }function K(a, b, c) {
    r(function (a) {
      var e = !1,
          f = J(c, b, function (c) {
        e || (e = !0, b !== c ? q(a, c) : m(a, c));
      }, function (b) {
        e || (e = !0, g(a, b));
      });!e && f && (e = !0, g(a, f));
    }, a);
  }function L(a, b) {
    1 === b.a ? m(a, b.b) : 2 === a.a ? g(a, b.b) : u(b, void 0, function (b) {
      q(a, b);
    }, function (b) {
      g(a, b);
    });
  }function q(a, b) {
    if (a === b) g(a, new TypeError("You cannot resolve a promise with itself"));else if ("function" === typeof b || "object" === typeof b && null !== b) if (b.constructor === a.constructor) L(a, b);else {
      var c;try {
        c = b.then;
      } catch (d) {
        v.error = d, c = v;
      }c === v ? g(a, v.error) : void 0 === c ? m(a, b) : s(c) ? K(a, b, c) : m(a, b);
    } else m(a, b);
  }function M(a) {
    a.f && a.f(a.b);x(a);
  }function m(a, b) {
    void 0 === a.a && (a.b = b, a.a = 1, 0 !== a.e.length && r(x, a));
  }function g(a, b) {
    void 0 === a.a && (a.a = 2, a.b = b, r(M, a));
  }function u(a, b, c, d) {
    var e = a.e,
        f = e.length;a.f = null;e[f] = b;e[f + 1] = c;e[f + 2] = d;0 === f && a.a && r(x, a);
  }function x(a) {
    var b = a.e,
        c = a.a;if (0 !== b.length) {
      for (var d, e, f = a.b, g = 0; g < b.length; g += 3) d = b[g], e = b[g + c], d ? C(c, d, e, f) : e(f);a.e.length = 0;
    }
  }function D() {
    this.error = null;
  }function C(a, b, c, d) {
    var e = s(c),
        f,
        k,
        h,
        l;if (e) {
      try {
        f = c(d);
      } catch (n) {
        y.error = n, f = y;
      }f === y ? (l = !0, k = f.error, f = null) : h = !0;if (b === f) {
        g(b, new TypeError("A promises callback cannot return that same promise."));return;
      }
    } else f = d, h = !0;void 0 === b.a && (e && h ? q(b, f) : l ? g(b, k) : 1 === a ? m(b, f) : 2 === a && g(b, f));
  }function N(a, b) {
    try {
      b(function (b) {
        q(a, b);
      }, function (b) {
        g(a, b);
      });
    } catch (c) {
      g(a, c);
    }
  }function k(a, b, c, d) {
    this.n = a;this.c = new a(p, d);this.i = c;this.o(b) ? (this.m = b, this.d = this.length = b.length, this.l(), 0 === this.length ? m(this.c, this.b) : (this.length = this.length || 0, this.k(), 0 === this.d && m(this.c, this.b))) : g(this.c, this.p());
  }function h(a) {
    O++;this.b = this.a = void 0;this.e = [];if (p !== a) {
      if (!s(a)) throw new TypeError("You must pass a resolver function as the first argument to the promise constructor");if (!(this instanceof h)) throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");N(this, a);
    }
  }var E = Array.isArray ? Array.isArray : function (a) {
    return "[object Array]" === Object.prototype.toString.call(a);
  },
      l = 0,
      w = "undefined" !== typeof window ? window : {},
      B = w.MutationObserver || w.WebKitMutationObserver,
      w = "undefined" !== typeof Uint8ClampedArray && "undefined" !== typeof importScripts && "undefined" !== typeof MessageChannel,
      n = Array(1000),
      A;A = "undefined" !== typeof process && "[object process]" === ({}).toString.call(process) ? F() : B ? G() : w ? H() : I();var v = new D(),
      y = new D();k.prototype.o = function (a) {
    return E(a);
  };k.prototype.p = function () {
    return Error("Array Methods must be provided an Array");
  };k.prototype.l = function () {
    this.b = Array(this.length);
  };k.prototype.k = function () {
    for (var a = this.length, b = this.c, c = this.m, d = 0; void 0 === b.a && d < a; d++) this.j(c[d], d);
  };k.prototype.j = function (a, b) {
    var c = this.n;"object" === typeof a && null !== a ? a.constructor === c && void 0 !== a.a ? (a.f = null, this.g(a.a, b, a.b)) : this.q(c.resolve(a), b) : (this.d--, this.b[b] = this.h(a));
  };k.prototype.g = function (a, b, c) {
    var d = this.c;void 0 === d.a && (this.d--, this.i && 2 === a ? g(d, c) : this.b[b] = this.h(c));0 === this.d && m(d, this.b);
  };k.prototype.h = function (a) {
    return a;
  };
  k.prototype.q = function (a, b) {
    var c = this;u(a, void 0, function (a) {
      c.g(1, b, a);
    }, function (a) {
      c.g(2, b, a);
    });
  };var O = 0;h.all = function (a, b) {
    return new k(this, a, !0, b).c;
  };h.race = function (a, b) {
    function c(a) {
      q(e, a);
    }function d(a) {
      g(e, a);
    }var e = new this(p, b);if (!E(a)) return (g(e, new TypeError("You must pass an array to race.")), e);for (var f = a.length, h = 0; void 0 === e.a && h < f; h++) u(this.resolve(a[h]), void 0, c, d);return e;
  };h.resolve = function (a, b) {
    if (a && "object" === typeof a && a.constructor === this) return a;var c = new this(p, b);
    q(c, a);return c;
  };h.reject = function (a, b) {
    var c = new this(p, b);g(c, a);return c;
  };h.prototype = { constructor: h, then: function then(a, b) {
      var c = this.a;if (1 === c && !a || 2 === c && !b) {
        return this;
      }var d = new this.constructor(p),
          e = this.b;if (c) {
        var f = arguments[c - 1];r(function () {
          C(c, d, f, e);
        });
      } else u(this, d, a, b);return d;
    }, "catch": function (a) {
      return this.then(null, a);
    } };var z = { Promise: h, polyfill: function polyfill() {
      var a;a = "undefined" !== typeof global ? global : "undefined" !== typeof window && window.document ? window : self;"Promise" in a && "resolve" in a.Promise && "reject" in a.Promise && "all" in a.Promise && "race" in a.Promise && (function () {
        var b;new a.Promise(function (a) {
          b = a;
        });return s(b);
      })() || (a.Promise = h);
    } };"function" === typeof define && define.amd ? define(function () {
    return z;
  }) : "undefined" !== typeof module && module.exports ? module.exports = z : "undefined" !== typeof this && (this.ES6Promise = z);
}).call(undefined);

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":22}],11:[function(require,module,exports){
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

_defaults(exports, _interopRequireWildcard(require("./utils/http")));

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

},{"./utils/browser":12,"./utils/dom":13,"./utils/error":14,"./utils/events":15,"./utils/extend":16,"./utils/http":17,"./utils/is":18,"./utils/is_permitted":19,"./utils/logger":20}],12:[function(require,module,exports){
(function (global){
"use strict";

/**
 * This module contains the Browser APIs
 *
 */
// TODO: move out of utils
var win = window;

// using node global (mainly for testing, dependency management)
var _global = typeof window === "undefined" ? global : window;
exports.global = _global;
exports.window = win;
var document = exports.document = window.document;
var location = exports.location = window.location;
var navigator = exports.navigator = window.navigator;
var chayns = exports.chayns = window.chayns;
var chaynsCallbacks = exports.chaynsCallbacks = window._chaynsCallbacks;
var chaynsRoot = exports.chaynsRoot = document.getElementById("chayns-root");
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
},{}],13:[function(require,module,exports){
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

},{"./browser":12,"./is":18}],14:[function(require,module,exports){
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

},{"../chayns/config":5,"./browser":12,"./logger":20}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{"./is":18}],17:[function(require,module,exports){
"use strict";

exports.fetch = fetch;
exports.fetchJSON = fetchJSON;
exports.post = post;
exports.upload = upload;

var window = require("./browser").window;

var _promise = require("./promise");

var promise = _promise.promise;
var deferred = _promise.deferred;
function fetch() {}

function fetchJSON() {}

function post() {}

function upload() {}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"./browser":12,"./promise":21}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{"../utils":11}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
"use strict";

// TODO: impelemnt RVSP (or bluebird) Promise Fallbakc
// TODO: implement Deferred

},{}],22:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],"chayns":[function(require,module,exports){
"use strict";

var chayns = require("./chayns").chayns;

module.exports = chayns;

},{"./chayns":1}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdXNlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9saWIvZmV0Y2hfcG9seWZpbGwuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvbGliL3Byb21pc2VfcG9seWZpbGwuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9kb20uanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXJyb3IuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXZlbnRzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2V4dGVuZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9odHRwLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzX3Blcm1pdHRlZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9sb2dnZXIuanMiLCJzcmMvdXRpbHMvcHJvbWlzZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMtdW1kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7SUNPWSxLQUFLLG1DQUFvQixTQUFTOztBQUM5QyxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDOzs7QUFHMUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7OztJQUdWLE1BQU0sV0FBdUIsaUJBQWlCLEVBQTlDLE1BQU07Ozs7SUFHTixX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QUFFO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBQyxFQUFDLGFBQWEsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxZQUFVO0FBQUMsT0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxjQUFjLEVBQUEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsT0FBTyxZQUFVO0FBQUMsT0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFPLFlBQVU7QUFBQyxnQkFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUM7QUFDM2YsS0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRztBQUFDLE9BQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxTQUFTLENBQUMsMENBQTBDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRyxVQUFVLEtBQUcsT0FBTyxDQUFDLElBQUUsUUFBUSxLQUFHLE9BQU8sQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLEVBQUMsSUFBRyxDQUFDLENBQUMsV0FBVyxLQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFDOWYsQ0FBQyxDQUFDLENBQUMsS0FBSTtBQUFDLFVBQUksQ0FBQyxDQUFDLElBQUc7QUFBQyxTQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtPQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE1BQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FDemdCLElBQUksQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFHO0FBQUMsU0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQSxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksU0FBUyxDQUFDLHNEQUFzRCxDQUFDLENBQUMsQ0FBQyxPQUFNO09BQUM7S0FBQyxNQUFLLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUc7QUFBQyxPQUFDLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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QUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUcsT0FBTyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQztBQUN0ZixHQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQUFBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLENBQUUsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBRSxRQUFRLEtBQUcsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLFdBQVcsS0FBRyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pmLEtBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsRUFBQyxXQUFXLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQztBQUFDLGVBQU8sSUFBSSxDQUFDO09BQUEsSUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBVTtBQUFDLFdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsQ0FBQTtPQUFDLE1BQUssQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUMsT0FBTyxFQUFDLENBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxVQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxHQUFDLE1BQU0sR0FBQyxXQUFXLEtBQUcsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLFFBQVEsR0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRyxDQUFDLElBQUUsU0FBUyxJQUNyZixD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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0lDckZRLE1BQU0sV0FBTyxVQUFVLEVBQXZCLE1BQU07O2lCQUNDLE1BQU0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAbmFtZSBjaGF5bnMgQVBJXG4gKiBAbW9kdWxlIGNoYXluc1xuICovXG5cbi8vIGhlbHBlclxuLy8gVE9ETzogZWl0aGVyIGluZGV4LmpzLCB1dGlscy5qcyBvciBqdXN0IHRoZSBzaW5nbGUgZmlsZXNcbmltcG9ydCAqIGFzIHV0aWxzICAgICAgICAgICAgICAgZnJvbSAnLi91dGlscyc7XG52YXIgZXh0ZW5kID0gdXRpbHMuZXh0ZW5kO1xuXG4vLyBzZXQgbG9nTGV2ZWwgdG8gaW5mb1xudXRpbHMuc2V0TGV2ZWwoNCk7IC8vIFRPRE86IGRvbid0IHNldCB0aGUgbGV2ZWwgaGVyZVxuXG4vLyBiYXNpYyBjb25maWdcbmltcG9ydCB7Y29uZmlnfSAgICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY29uZmlnJztcblxuLy8gZW52aXJvbm1lbnRcbmltcG9ydCB7ZW52aXJvbm1lbnR9ICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvZW52aXJvbm1lbnQnO1xuXG4vLyAoY3VycmVudCkgdXNlclxuaW1wb3J0IHt1c2VyfSAgICAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy91c2VyJztcblxuaW1wb3J0IFByb21pc2UgZnJvbSAgJy4vbGliL3Byb21pc2VfcG9seWZpbGwnO1xuUHJvbWlzZS5wb2x5ZmlsbCgpOyAvLyBhdXRvbG9hZCBQcm9taXNlIHBvbHlmaWxsXG4vLyBUT0RPOiBhZGQgRGVmZXJyZWQ/XG5cbmltcG9ydCAnLi9saWIvZmV0Y2hfcG9seWZpbGwnO1xuXG4vLyBjb3JlIGZ1bmN0aW9uc1xuaW1wb3J0IHtyZWFkeSwgcmVnaXN0ZXIsIHNldHVwfSBmcm9tICcuL2NoYXlucy9jb3JlJztcblxuLy8gY2hheW5zIGNhbGxzXG5cbmltcG9ydCB7YXBpQ2FsbH0gICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY2hheW5zX2NhbGxzJztcblxuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9ICAgICBmcm9tICcuL2NoYXlucy9jaGF5bnNfYXBpX2ludGVyZmFjZSc7XG5cblxuLy8gcHVibGljIGNoYXlucyBvYmplY3RcbmV4cG9ydCB2YXIgY2hheW5zID0ge307XG5cbmV4dGVuZChjaGF5bnMsIHtnZXRMb2dnZXI6IHV0aWxzLmdldExvZ2dlcn0pOyAvLyBqc2hpbnQgaWdub3JlOiBsaW5lXG5leHRlbmQoY2hheW5zLCB7dXRpbHN9KTtcbmV4dGVuZChjaGF5bnMsIHtWRVJTSU9OOiAnMC4xLjAnfSk7XG4vL2V4dGVuZChjaGF5bnMsIHtjb25maWd9KTsgLy8gVE9ETzogdGhlIGNvbmZpZyBgT2JqZWN0YCBzaG91bGQgbm90IGJlIGV4cG9zZWRcblxuZXh0ZW5kKGNoYXlucywge2VudjogZW52aXJvbm1lbnR9KTsgLy8gVE9ETzogZ2VuZXJhbGx5IHJlbmFtZVxuZXh0ZW5kKGNoYXlucywge3VzZXJ9KTtcblxuZXh0ZW5kKGNoYXlucywge3JlZ2lzdGVyfSk7XG5leHRlbmQoY2hheW5zLCB7cmVhZHl9KTtcblxuZXh0ZW5kKGNoYXlucywge2FwaUNhbGx9KTtcblxuLy8gYWRkIGFsbCBjaGF5bnNBcGlJbnRlcmZhY2UgbWV0aG9kcyBkaXJlY3RseSB0byB0aGUgYGNoYXluc2AgT2JqZWN0XG5leHRlbmQoY2hheW5zLCBjaGF5bnNBcGlJbnRlcmZhY2UpO1xuXG4vLyBzZXR1cCBjaGF5bnNcbnNldHVwKCk7XG5cblxuLy8gY2hheW5zIHB1Ymxpc2ggbm8gVU1EXG4vL3dpbmRvdy5jaGF5bnMgPSBjaGF5bnM7XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNGdW5jdGlvbiwgaXNVbmRlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93fSBmcm9tICcuLi91dGlscy9icm93c2VyJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jYWxsYmFja3MnKTtcblxubGV0IG5vb3AgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbmxldCBjYWxsYmFja3MgPSB7fTtcbi8qKlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBGdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzQ2hheW5zQ2FsbCBJZiB0cnVlIHRoZW4gdGhlIGNhbGwgd2lsbCBiZSBhc3NpZ25lZCB0byBgY2hheW5zLl9jYWxsYmFja3NgXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBwYXJhbWV0ZXJzIGFyZSB2YWxpZCBhbmQgdGhlIGNhbGxiYWNrIHdhcyBzYXZlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Q2FsbGJhY2sobmFtZSwgZm4sIGlzQ2hheW5zQ2FsbCkge1xuXG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogbmFtZSBpcyB1bmRlZmluZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFpc0Z1bmN0aW9uKGZuKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogZm4gaXMgbm8gRnVuY3Rpb24nKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAobmFtZS5pbmRleE9mKCcoKScpICE9PSAtMSkgeyAvLyBzdHJpcCAnKCknXG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgnKCknLCAnJyk7XG4gIH1cblxuICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiBzZXQgQ2FsbGJhY2s6ICcgKyBuYW1lKTtcbiAgLy9pZiAobmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgLy8gIGNhbGxiYWNrc1tuYW1lXS5wdXNoKGZuKTsgLy8gVE9ETzogcmVjb25zaWRlciBBcnJheSBzdXBwb3J0XG4gIC8vfSBlbHNlIHtcbiAgICBjYWxsYmFja3NbbmFtZV0gPSBmbjsgLy8gQXR0ZW50aW9uOiB3ZSBzYXZlIGFuIEFycmF5XG4gIC8vfVxuXG4gIGlmIChpc0NoYXluc0NhbGwpIHtcbiAgICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiByZWdpc3RlciBmbiBhcyBnbG9iYWwgY2FsbGJhY2snKTtcbiAgICB3aW5kb3cuX2NoYXluc0NhbGxiYWNrc1tuYW1lXSA9IGNhbGxiYWNrKG5hbWUsICdDaGF5bnNDYWxsJyk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZWdpc3RlciBjYWxsYmFja3MgZm9yIENoYXluc0NhbGxzIGFuZCBDaGF5bnNXZWJDYWxsc1xuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gY2FsbGJhY2tOYW1lIE5hbWUgb2YgdGhlIEZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBFaXRoZXIgJ0NoYXluc1dlYkNhbGwnIG9yICdDaGF5bnNDYWxsJ1xuICogQHJldHVybnMge0Z1bmN0aW9ufSBoYW5kbGVEYXRhIFJlY2VpdmVzIGNhbGxiYWNrIGRhdGFcbiAqL1xuZnVuY3Rpb24gY2FsbGJhY2soY2FsbGJhY2tOYW1lLCB0eXBlKSB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZURhdGEoKSB7XG5cbiAgICBpZiAoY2FsbGJhY2tOYW1lIGluIGNhbGxiYWNrcykge1xuICAgICAgbG9nLmRlYnVnKCdpbnZva2UgY2FsbGJhY2s6ICcsIGNhbGxiYWNrTmFtZSwgJ3R5cGU6JywgdHlwZSk7XG4gICAgICB2YXIgZm4gPSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICBmbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAvL2RlbGV0ZSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTsgLy8gVE9ETzogY2Fubm90IGJlIGxpa2UgdGhhdCwgcmVtb3ZlIGFycmF5P1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLndhcm4oJ2NhbGxiYWNrIGlzIG5vIGZ1bmN0aW9uJywgY2FsbGJhY2tOYW1lLCBmbik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5pbmZvKCdjYWxsYmFjayAnICsgY2FsbGJhY2tOYW1lICsgJyBkaWQgbm90IGV4aXN0IGluIGNhbGxiYWNrcyBhcnJheScpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMuX2NhbGxiYWNrc1xuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIENoYXlucyBDYWxsIENhbGxiYWNrc1xuICogd2lsbCBiZSBhc3NpZ25lZCB0byB0aGUgYGNoYXlucy5fY2FsbGJhY2tzYCBvYmplY3RcbiAqXG4gKiBAdHlwZSB7T2JqZWN0fSBjaGF5bnNDYWxsc0NhbGxiYWNrc1xuICovXG53aW5kb3cuX2NoYXluc0NhbGxiYWNrcyA9IHtcbiAgLy8vLyBUT0RPOiB3cmFwIGNhbGxiYWNrIGZ1bmN0aW9uIChEUlkpXG4gIC8vZ2V0R2xvYmFsRGF0YTogY2FsbGJhY2soJ2dldEdsb2JhbERhdGEnLCAnQ2hheW5zQ2FsbCcpIC8vIGV4YW1wbGVcbiAgZ2V0R2VvTG9jYXRpb25DYWxsYmFjazogbm9vcFxufTtcblxuXG4vLyBUT0RPOiBtb3ZlIHRvIGFub3RoZXIgZmlsZT8gY29yZSwgY2hheW5zX2NhbGxzXG52YXIgbWVzc2FnZUxpc3RlbmluZyA9IGZhbHNlO1xuZXhwb3J0IGZ1bmN0aW9uIG1lc3NhZ2VMaXN0ZW5lcigpIHtcbiAgaWYgKG1lc3NhZ2VMaXN0ZW5pbmcpIHtcbiAgICBsb2cuaW5mbygndGhlcmUgaXMgYWxyZWFkeSBvbmUgbWVzc2FnZSBsaXN0ZW5lciBvbiB3aW5kb3cnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgbWVzc2FnZUxpc3RlbmluZyA9IHRydWU7XG4gIGxvZy5kZWJ1ZygnbWVzc2FnZSBsaXN0ZW5lciBpcyBzdGFydGVkJyk7XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiBvbk1lc3NhZ2UoZSkge1xuXG4gICAgbG9nLmRlYnVnKCduZXcgbWVzc2FnZSAnKTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSAnY2hheW5zLmN1c3RvbVRhYi4nLFxuICAgICAgZGF0YSA9IGUuZGF0YTtcblxuICAgIGlmICh0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gc3RyaXAgbmFtZXNwYWNlIGZyb20gZGF0YVxuICAgIGRhdGEgPSBkYXRhLnN1YnN0cihuYW1lc3BhY2UubGVuZ3RoLCBkYXRhLmxlbmd0aCAtIG5hbWVzcGFjZS5sZW5ndGgpO1xuICAgIHZhciBtZXRob2QgPSBkYXRhLm1hdGNoKC9bXjpdKjovKTsgLy8gZGV0ZWN0IG1ldGhvZFxuICAgIGlmIChtZXRob2QgJiYgbWV0aG9kLmxlbmd0aCA+IDApIHtcbiAgICAgIG1ldGhvZCA9IG1ldGhvZFswXTtcblxuICAgICAgdmFyIHBhcmFtcyA9IGRhdGEuc3Vic3RyKG1ldGhvZC5sZW5ndGgsIGRhdGEubGVuZ3RoIC0gbWV0aG9kLmxlbmd0aCk7XG4gICAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFyYW1zID0gSlNPTi5wYXJzZShwYXJhbXMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgdGhlIGxhc3QgJyknXG4gICAgICBtZXRob2QgPSBtZXRob2Quc3Vic3RyKDAsIG1ldGhvZC5sZW5ndGggLSAxKTtcblxuICAgICAgLy8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGNhbiBiZSBpbnZva2VkIGRpcmVjdGx5XG4gICAgICBjYWxsYmFjayhtZXRob2QsICdDaGF5bnNXZWJDYWxsJykocGFyYW1zKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiLyoqXG4gKiBDaGF5bnMgQVBJIEludGVyZmFjZVxuICogQVBJIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIEFQUCBhbmQgdGhlIENoYXlucyBXZWJcbiAqL1xuXG5pbXBvcnQge2FwaUNhbGx9IGZyb20gJy4vY2hheW5zX2NhbGxzJztcbmltcG9ydCB7Z2V0TG9nZ2VyLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzQkxFQWRkcmVzcyxcbiAgaXNEYXRlLCBpc09iamVjdCwgaXNBcnJheSwgdHJpbSwgRE9NfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvdywgbG9jYXRpb259IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInOyAvLyBkdWUgdG8gd2luZG93Lm9wZW4gYW5kIGxvY2F0aW9uLmhyZWZcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zX2FwaV9pbnRlcmZhY2UnKTtcblxuLyoqXG4gKiBORkMgUmVzcG9uc2UgRGF0YSBTdG9yYWdlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5sZXQgTmZjUmVzcG9uc2VEYXRhID0ge1xuICBSRklkOiAwLFxuICBQZXJzb25JZDogMFxufTtcblxuLyoqXG4gKiBQb3B1cCBCdXR0b25cbiAqIEBjbGFzcyBQb3B1cEJ1dHRvblxuICovXG5jbGFzcyBQb3B1cEJ1dHRvbiB7XG4gIC8qKlxuICAgKiBQb3B1cCBCdXR0b24gQ29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgUG9wdXAgQnV0dG9uIG5hbWVcbiAgICovXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgbGV0IGVsID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGVsLnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLXBvcHVwJyk7XG4gICAgZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3BvcHVwJyk7XG4gICAgdGhpcy5lbGVtZW50ID0gZWw7XG4gIH1cbiAgLyoqXG4gICAqIEdldCBQb3B1cCBCdXR0b24gbmFtZVxuICAgKiBAcmV0dXJucyB7bmFtZX1cbiAgICovXG4gIG5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsYmFja1xuICAgKi9cbiAgY2FsbGJhY2soKSB7XG4gICAgbGV0IGNiID0gdGhpcy5jYWxsYmFjaztcbiAgICBsZXQgbmFtZSA9IGNiLm5hbWU7XG4gICAgaWYgKGlzRnVuY3Rpb24oY2IpKSB7XG4gICAgICBjYi5jYWxsKG51bGwsIG5hbWUpO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogQG5hbWUgdG9IVE1MXG4gICAqIFJldHVybnMgSFRNTCBOb2RlIGNvbnRhaW5pbmcgdGhlIFBvcHVwQnV0dG9uLlxuICAgKiBAcmV0dXJucyB7UG9wdXBCdXR0b24uZWxlbWVudHxIVE1MTm9kZX1cbiAgICovXG4gIHRvSFRNTCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbGVtZW50O1xuICB9XG59XG5cbi8qKlxuICogQmVhY29uIExpc3RcbiAqIEB0eXBlIHtBcnJheXxudWxsfVxuICovXG5sZXQgYmVhY29uTGlzdCA9IG51bGw7XG5cbi8qKlxuICogR2xvYmFsIERhdGEgU3RvcmFnZVxuICogQHR5cGUge2Jvb2xlYW58T2JqZWN0fVxuICovXG5sZXQgZ2xvYmFsRGF0YSA9IGZhbHNlO1xuXG4vKipcbiAqIEFsbCBwdWJsaWMgY2hheW5zIG1ldGhvZHMgdG8gaW50ZXJhY3Qgd2l0aCAqQ2hheW5zIEFwcCogb3IgKkNoYXlucyBXZWIqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5leHBvcnQgdmFyIGNoYXluc0FwaUludGVyZmFjZSA9IHtcblxuXG4gIC8qKlxuICAgKiBFbmFibGUgb3IgZGlzYWJsZSBQdWxsVG9SZWZyZXNoXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWxsb3dQdWxsIEFsbG93IFB1bGxUb1JlZnJlc2hcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjZWVkZWRcbiAgICovXG4gIHNldFB1bGxUb1JlZnJlc2g6IGZ1bmN0aW9uKGFsbG93UHVsbCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMCxcbiAgICAgIHdlYkZuOiBmYWxzZSwgLy8gY291bGQgYmUgb21pdHRlZFxuICAgICAgcGFyYW1zOiBbeydib29sJzogYWxsb3dQdWxsfV1cbiAgICB9KTtcbiAgfSxcbiAgLy8gVE9ETzogcmVuYW1lIHRvIGVuYWJsZVB1bGxUb1JlZnJlc2hcbiAgYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaCh0cnVlKTtcbiAgfSxcbiAgZGlzYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaChmYWxzZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3Nob3dDdXJzb3JdIElmIHRydWUgdGhlIHdhaXRjdXJzb3Igd2lsbCBiZSBzaG93blxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgaXQgd2lsbCBiZSBoaWRkZW5cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZXRXYWl0Y3Vyc29yOiBmdW5jdGlvbihzaG93Q3Vyc29yKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxLFxuICAgICAgd2ViRm46IChzaG93Q3Vyc29yID8gJ3Nob3cnIDogJ2hpZGUnKSArICdMb2FkaW5nQ3Vyc29yJyxcbiAgICAgIHBhcmFtczogW3snYm9vbCc6IHNob3dDdXJzb3J9XVxuICAgIH0pO1xuICB9LFxuICBzaG93V2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKHRydWUpO1xuICB9LFxuICBoaWRlV2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKGZhbHNlKTtcbiAgfSxcblxuICAvLyBUT0RPOiByZW5hbWUgaXQgdG8gb3BlblRhcHA/XG4gIC8qKlxuICAgKiBTZWxlY3QgZGlmZmVyZW50IFRhcHAgaWRlbnRpZmllZCBieSBUYXBwSUQgb3IgSW50ZXJuYWxUYXBwTmFtZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGFiIFRhcHAgTmFtZSBvciBUYXBwIElEXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAob3B0aW9uYWwpIHBhcmFtIFVSTCBQYXJhbWV0ZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZWxlY3RUYWI6IGZ1bmN0aW9uKHRhYiwgcGFyYW0pIHtcblxuICAgIGxldCBjbWQgPSAxMzsgLy8gc2VsZWN0VGFiIHdpdGggcGFyYW0gQ2hheW5zQ2FsbFxuXG4gICAgLy8gdXBkYXRlIHBhcmFtOiBzdHJpcCA/IGFuZCBlbnN1cmUgJiBhdCB0aGUgYmVnaW5cbiAgICBpZiAocGFyYW0gJiYgIXBhcmFtLm1hdGNoKC9eWyZ8XFw/XS8pKSB7IC8vIG5vICYgYW5kIG5vID9cbiAgICAgIHBhcmFtID0gJyYnICsgcGFyYW07XG4gICAgfSBlbHNlIGlmIChwYXJhbSkge1xuICAgICAgcGFyYW0gPSBwYXJhbS5yZXBsYWNlKCc/JywgJyYnKTtcbiAgICB9IGVsc2UgeyAvLyBubyBwYXJhbXMsIGRpZmZlcmVudCBDaGF5bnNDYWxsXG4gICAgICBjbWQgPSAyO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgd2ViRm46ICdzZWxlY3RvdGhlcnRhYicsXG4gICAgICBwYXJhbXM6IGNtZCA9PT0gMTNcbiAgICAgICAgPyBbeydzdHJpbmcnOiB0YWJ9LCB7J3N0cmluZyc6IHBhcmFtfV1cbiAgICAgICAgOiBbeydzdHJpbmcnOiB0YWJ9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBUYWI6IHRhYixcbiAgICAgICAgUGFyYW1ldGVyOiBwYXJhbVxuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwMiwgaW9zOiAxMzgzLCB3cDogMjQ2OSB9IC8vIGZvciBuYXRpdmUgYXBwcyBvbmx5XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBBbGJ1bVxuICAgKiBUT0RPOiByZW5hbWUgdG8gb3BlblxuICAgKlxuICAgKiBAcGFyYW0ge2lkfHN0cmluZ30gaWQgQWxidW0gSUQgKEFsYnVtIE5hbWUgd2lsbCB3b3JrIGFzIHdlbGwsIGJ1dCBkbyBwcmVmZXIgSURzKVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNlbGVjdEFsYnVtOiBmdW5jdGlvbihpZCkge1xuICAgIGlmICghaXNTdHJpbmcoaWQpICYmICFpc051bWJlcihpZCkpIHtcbiAgICAgIGxvZy5lcnJvcignc2VsZWN0QWxidW06IGludmFsaWQgYWxidW0gbmFtZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMsXG4gICAgICB3ZWJGbjogJ3NlbGVjdEFsYnVtJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogaWR9XSxcbiAgICAgIHdlYlBhcmFtczogaWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBQaWN0dXJlXG4gICAqIChvbGQgU2hvd1BpY3R1cmUpXG4gICAqIEFuZHJvaWQgZG9lcyBub3Qgc3VwcG9ydCBnaWZzIDooXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgSW1hZ2UgVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuUGljdHVyZTogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goL2pwZyR8cG5nJHxnaWYkL2kpKSB7IC8vIFRPRE86IG1vcmUgaW1hZ2UgdHlwZXM/XG4gICAgICBsb2cuZXJyb3IoJ29wZW5QaWN0dXJlOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQsXG4gICAgICB3ZWJGbjogJ3Nob3dQaWN0dXJlJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybCxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNjM2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICogVE9ETzogaW1wbGVtZW50IGludG8gQ2hheW5zIFdlYj9cbiAgICogVE9ETzogcmVuYW1lIHRvIHNldD9cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHQgVGhlIEJ1dHRvbidzIHRleHRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgY2FwdGlvbiBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbih0ZXh0LCBjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy9sb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIHZhbGlkIGNhbGxiYWNrIEZ1bmN0aW9uLicpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpcyBubyB2YWxpZCBjYWxsYmFjayBGdW5jdGlvbi4nKTtcbiAgICAgIC8vcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NhcHRpb25CdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNSxcbiAgICAgIHBhcmFtczogW3tzdHJpbmc6IHRleHR9LCB7Y2FsbGJhY2s6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIGEgQ2FwdGlvbiBCdXR0b24uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqIFRoZSBjYXB0aW9uIGJ1dHRvbiBpcyB0aGUgdGV4dCBhdCB0aGUgdG9wIHJpZ2h0IG9mIHRoZSBhcHAuXG4gICAqIChtYWlubHkgdXNlZCBmb3IgbG9naW4gb3IgdGhlIHVzZXJuYW1lKVxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhpZGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDYsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTgsIGlvczogMTM2Niwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBGYWNlYm9vayBDb25uZWN0XG4gICAqIE5PVEU6IHByZWZlciBgY2hheW5zLmxvZ2luKClgIG92ZXIgdGhpcyBtZXRob2QgdG8gcGVyZm9ybSBhIHVzZXIgbG9naW4uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJ10gRmFjZWJvb2sgUGVybWlzc2lvbnMsIHNlcGFyYXRlZCBieSBjb21tYVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3JlbG9hZFBhcmFtID0gJ2NvbW1lbnQnXSBSZWxvYWQgUGFyYW1cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAvLyBUT0RPOiB0ZXN0IHBlcm1pc3Npb25zXG4gIGZhY2Vib29rQ29ubmVjdDogZnVuY3Rpb24ocGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJywgcmVsb2FkUGFyYW0gPSAnY29tbWVudCcpIHtcbiAgICByZWxvYWRQYXJhbSA9IHJlbG9hZFBhcmFtO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNyxcbiAgICAgIHdlYkZuOiAnZmFjZWJvb2tDb25uZWN0JyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogcGVybWlzc2lvbnN9LCB7J0Z1bmN0aW9uJzogJ0V4ZWNDb21tYW5kPVwiJyArIHJlbG9hZFBhcmFtICsgJ1wiJ31dLFxuICAgICAgd2ViUGFyYW1zOiB7XG4gICAgICAgIFJlbG9hZFBhcmFtZXRlcjogJ0V4ZWNDb21tYW5kPScgKyByZWxvYWRQYXJhbSxcbiAgICAgICAgUGVybWlzc2lvbnM6IHBlcm1pc3Npb25zXG4gICAgICB9LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU5LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBmYWxsYmFja0NtZDogOCAvLyBpbiBjYXNlIHRoZSBhYm92ZSBpcyBub3Qgc3VwcG9ydCB0aGUgZmFsbGJhY2tDbWQgd2lsbCByZXBsYWNlIHRoZSBjbWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBMaW5rIGluIEJyb3dzZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBVUkxcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuTGlua0luQnJvd3NlcjogZnVuY3Rpb24odXJsKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA5LFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodXJsLmluZGV4T2YoJzovLycpID09PSAtMSkge1xuICAgICAgICAgIHVybCA9ICcvLycgKyB1cmw7IC8vIG9yIGFkZCBsb2NhdGlvbi5wcm90b2NvbCBwcmVmaXggYW5kIC8vIFRPRE86IHRlc3RcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cub3Blbih1cmwsICdfYmxhbmsnKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNDY2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNob3cgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgYmFjayBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzaG93QmFja0J1dHRvbjogZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgICBjaGF5bnNBcGlJbnRlcmZhY2UuaGlkZUJhY2tCdXR0b24oKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmFja0J1dHRvbkNhbGxiYWNrKCknO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhpZGUgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBoaWRlQmFja0J1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogT3BlbiBJbnRlckNvbS5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBvcGVuSW50ZXJDb206IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTIsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDIsIGlvczogMTM4Mywgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgR2VvbG9jYXRpb24uXG4gICAqIG5hdGl2ZSBhcHBzIG9ubHkgKGJ1dCBjb3VsZCB3b3JrIGluIHdlYiBhcyB3ZWxsLCBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pXG4gICAqXG4gICAqIFRPRE86IGNvbnRpbnVvdXNUcmFja2luZyB3YXMgcmVtb3ZlZFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB3aGVuIHRoZSBiYWNrIGJ1dHRvbiB3YXMgY2xpY2tlZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGdldEdlb0xvY2F0aW9uOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdnZXRHZW9Mb2NhdGlvbkNhbGxiYWNrKCknO1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy8gVE9ETzogcmVtb3ZlIGNvbnNvbGVcbiAgICAgIC8vIFRPRE86IGFsbG93IGVtcHR5IGNhbGxiYWNrcyB3aGVuIGl0IGlzIGFscmVhZHkgc2V0XG4gICAgICBjb25zb2xlLndhcm4oJ25vIGNhbGxiYWNrIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNDY2LCB3cDogMjQ2OSB9LFxuICAgICAgLy93ZWJGbjogZnVuY3Rpb24oKSB7IG5hdmlnYXRvci5nZW9sb2NhdGlvbjsgfVxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gVmlkZW9cbiAgICogKG9sZCBTaG93VmlkZW8pXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVmlkZW8gVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuVmlkZW86IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSB8fCAhdXJsLm1hdGNoKC8uKlxcLi57Mix9LykpIHsgLy8gVE9ETzogV1RGIFJlZ2V4XG4gICAgICBsb2cuZXJyb3IoJ29wZW5WaWRlbzogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNSxcbiAgICAgIHdlYkZuOiAnc2hvd1ZpZGVvJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybFxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaG93IERpYWxvZ1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0ge2NvbnRlbnQ6e1N0cmluZ30gLCBoZWFkbGluZTogLGJ1dHRvbnM6e0FycmF5fSwgbm9Db250ZW50blBhZGRpbmc6LCBvbkxvYWQ6fVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHNob3dEaWFsb2c6IGZ1bmN0aW9uIHNob3dEaWFsb2cob2JqKSB7XG4gICAgaWYgKCFvYmogfHwgIWlzT2JqZWN0KG9iaikpIHtcbiAgICAgIGxvZy53YXJuKCdzaG93RGlhbG9nOiBpbnZhbGlkIHBhcmFtZXRlcnMnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKG9iai5jb250ZW50KSkge1xuICAgICAgb2JqLmNvbnRlbnQgPSB0cmltKG9iai5jb250ZW50LnJlcGxhY2UoLzxiclsgL10qPz4vZywgJ1xcbicpKTtcbiAgICB9XG4gICAgaWYgKCFpc0FycmF5KG9iai5idXR0b25zKSB8fCBvYmouYnV0dG9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9iai5idXR0b25zID0gWyhuZXcgUG9wdXBCdXR0b24oJ09LJykpLnRvSFRNTCgpXTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ0NoYXluc0RpYWxvZ0NhbGxCYWNrKCknO1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm4oYnV0dG9ucywgaWQpIHtcbiAgICAgIGlkID0gcGFyc2VJbnQoaWQsIDEwKSAtIDE7XG4gICAgICBpZiAoYnV0dG9uc1tpZF0pIHtcbiAgICAgICAgYnV0dG9uc1tpZF0uY2FsbGJhY2suY2FsbChudWxsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE2LCAvLyBUT0RPOiBpcyBzbGl0dGU6Ly9cbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouaGVhZGxpbmV9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5jb250ZW50fSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouYnV0dG9uc1swXS5uYW1lfSAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICAgIC8veydzdHJpbmcnOiBvYmouYnV0dG9uc1sxXS5uYW1lfSwgLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgICAvL3snc3RyaW5nJzogb2JqLmJ1dHRvbnNbMl0ubmFtZX0gLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgXSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgb2JqLmJ1dHRvbnMpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2MDZ9LFxuICAgICAgZmFsbGJhY2tGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYWxsYmFjayBwb3B1cCcsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogRm9ybWVybHkga25vd24gYXMgZ2V0QXBwSW5mb3NcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aXRoIHRoZSBBcHBEYXRhXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gICAgLy8gVE9ETzogdXNlIGZvcmNlUmVsb2FkIGFuZCBjYWNoZSBBcHBEYXRhXG4gIGdldEdsb2JhbERhdGE6IGZ1bmN0aW9uKGNhbGxiYWNrLCBmb3JjZVJlbG9hZCkge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRHbG9iYWxEYXRhOiBjYWxsYmFjayBpcyBubyB2YWxpZCBgRnVuY3Rpb25gLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWZvcmNlUmVsb2FkICYmIGdsb2JhbERhdGEpIHtcbiAgICAgIGNhbGxiYWNrKGdsb2JhbERhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE4LFxuICAgICAgd2ViRm46ICdnZXRBcHBJbmZvcycsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogJ2dldEdsb2JhbERhdGEoKSd9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWJyYXRlXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gZHVyYXRpb24gVGltZSBpbiBtaWxsaXNlY29uZHNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgdmlicmF0ZTogZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICBpZiAoIWlzTnVtYmVyKGR1cmF0aW9uKSB8fCBkdXJhdGlvbiA8IDIpIHtcbiAgICAgIGR1cmF0aW9uID0gMTUwO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE5LFxuICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogZHVyYXRpb24udG9TdHJpbmcoKX1dLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uIG5hdmlnYXRvclZpYnJhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmF2aWdhdG9yLnZpYnJhdGUoMTAwKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5pbmZvKCd2aWJyYXRlOiB0aGUgZGV2aWNlIGRvZXMgbm90IHN1cHBvcnQgdmlicmF0ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2OTUsIGlvczogMjU5Niwgd3A6IDI1MTV9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIEJhY2suXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgbmF2aWdhdGVCYWNrOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDIwLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjY5NiwgaW9zOiAyNjAwLCB3cDogMjUxNX1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW1hZ2UgVXBsb2FkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2l0aCBpbWFnZSB1cmwgYWZ0ZXIgdXBsb2FkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHVwbG9hZEltYWdlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCd1cGxvYWRJbWFnZTogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdpbWFnZVVwbG9hZENhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjEsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFRPRE86IGltcGxlbWVudCBpbWFnZSB1cGxvYWQgd2l0aCB3aW5kb3cuZmV0Y2hcbiAgICAgICAgLy92YXIgZmQgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgLy9mZC5hcHBlbmQoXCJJbWFnZVwiLCBmaWxlWzBdKTtcbiAgICAgICAgLy93aW5kb3cuaW1hZ2VDaG9zZW4gPSB3aW5kb3cuZmV0Y2goe1xuICAgICAgICAvLyAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIC8vICB1cmw6IFwiLy9jaGF5bnMxLnRvYml0LmNvbS9UYXBwQXBpL0ZpbGUvSW1hZ2VcIixcbiAgICAgICAgLy8gIGNvbnRlbnRUeXBlOiBmYWxzZSxcbiAgICAgICAgLy8gIHByb2Nlc3NEYXRhOiBmYWxzZSxcbiAgICAgICAgLy8gIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgLy8gIGRhdGE6IGZkXG4gICAgICAgIC8vfSkudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vICBkZWxldGUgd2luZG93LmltYWdlQ2hvc2VuO1xuICAgICAgICAvLyAgY2FsbGJhY2suY2FsbChudWxsLCBkYXRhKTtcbiAgICAgICAgLy99KTtcbiAgICAgICAgLy8kKFwiI0NoYXluc0ltYWdlVXBsb2FkXCIpLmNsaWNrKCk7XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3MDUsIHdwOiAyNTM4LCBpb3M6IDI2NDJ9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBORkMgQ2FsbGJhY2tcbiAgICogVE9ETzogcmVmYWN0b3IgYW5kIHRlc3RcbiAgICogVE9ETzogd2h5IHR3byBjYWxscz9cbiAgICogQ2FuIHdlIGltcHJvdmUgdGhpcyBzaGl0PyBzcGxpdCBpbnRvIHR3byBtZXRob2RzXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIGZvciBORkNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgc2V0TmZjQ2FsbGJhY2s6IGZ1bmN0aW9uKGNhbGxiYWNrLCByZXNwb25zZSkge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAzNyxcbiAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICB9KSAmJiBhcGlDYWxsKHtcbiAgICAgICAgICBjbWQ6IDM3LFxuICAgICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2YXIgY21kID0gKHJlc3BvbnNlID09PSBuZmNSZXNwb25zZURhdGEuUGVyc29uSWQpID8gMzcgOiAzODtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogY21kID09PSAzNyA/IDM4IDogMzcsXG4gICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgfSkgJiYgYXBpQ2FsbCh7XG4gICAgICBjbWQ6IGNtZCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiAnTmZjQ2FsbGJhY2snfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVmlkZW8gUGxheWVyIENvbnRyb2xzXG4gICAqIEFjdXRhbGx5IG5hdGl2ZSBvbmx5XG4gICAqIFRPRE86IGNvdWxkIHRoZW9yZXRpY2FsbHkgd29yayBpbiBDaGF5bnMgV2ViXG4gICAqIFRPRE86IGV4YW1wbGU/IHdoZXJlIGRvZXMgdGhpcyB3b3JrP1xuICAgKi9cbiAgcGxheWVyOiB7XG4gICAgdXNlRGVmYXVsdFVybDogZnVuY3Rpb24gdXNlRGVmYXVsdFVybCgpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMixcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgY2hhbmdlVXJsOiBmdW5jdGlvbiBjaGFuZ2VVcmwodXJsKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjIsXG4gICAgICAgIHBhcmFtczogW3snU3RyaW5nJzogdXJsfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBoaWRlQnV0dG9uOiBmdW5jdGlvbiBoaWRlQnV0dG9uKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIzLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBzaG93QnV0dG9uOiBmdW5jdGlvbiBzaG93QnV0dG9uKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIzLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAxfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwYXVzZTogZnVuY3Rpb24gcGF1c2VWaWRlbygpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNCxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGxheTogZnVuY3Rpb24gcGxheVZpZGVvKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI0LFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAxfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwbGF5YmFja1N0YXR1czogZnVuY3Rpb24gcGxheWJhY2tTdGF0dXMoY2FsbGJhY2spIHtcblxuICAgICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5nZXRHbG9iYWxEYXRhKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwobnVsbCwge1xuICAgICAgICAgIEFwcENvbnRyb2xWaXNpYmxlOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLklzQXBwQ29udHJvbFZpc2libGUsXG4gICAgICAgICAgU3RhdHVzOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLlBsYXliYWNrU3RhdHVzLFxuICAgICAgICAgIFVybDogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5TdHJlYW1VcmxcbiAgICAgICAgfSk7XG4gICAgICB9LCB0cnVlKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEJsdWV0b290aFxuICAgKiBPbmx5IGluIG5hdGl2ZSBBcHBzIChpb3MgYW5kIGFuZHJvaWQpXG4gICAqL1xuICBibHVldG9vdGg6IHtcbiAgICBMRVNlbmRTdHJlbmd0aDogeyAvLyBUT0RPOiB3aGF0IGlzIHRoYXQ/XG4gICAgICBBZGphY2VudDogMCxcbiAgICAgIE5lYXJieTogMSxcbiAgICAgIERlZmF1bHQ6IDIsXG4gICAgICBGYXI6IDNcbiAgICB9LFxuICAgIExFU2NhbjogZnVuY3Rpb24gTEVTY2FuKGNhbGxiYWNrKSB7XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRVNjYW46IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjayc7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjYsXG4gICAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBMRUNvbm5lY3Q6IGZ1bmN0aW9uIExFQ29ubmVjdChhZGRyZXNzLCBjYWxsYmFjaywgcGFzc3dvcmQpIHtcbiAgICAgIGlmICghaXNTdHJpbmcoYWRkcmVzcykgfHwgIWlzQkxFQWRkcmVzcyhhZGRyZXNzKSkge1xuICAgICAgICBsb2cud2FybignTEVDb25uZWN0OiBubyB2YWxpZCBhZGRyZXNzIHBhcmFtZXRlcicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRUNvbm5lY3Q6IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNTdHJpbmcocGFzc3dvcmQpIHx8ICFwYXNzd29yZC5tYXRjaCgvXlswLTlhLWZdezYsMTJ9JC9pKSkge1xuICAgICAgICBwYXNzd29yZCA9ICcnO1xuICAgICAgfVxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJztcblxuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI3LFxuICAgICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGFkZHJlc3N9LCB7J3N0cmluZyc6IHBhc3N3b3JkfV0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRPRE86IGNvbnNpZGVyIE9iamVjdCBhcyBwYXJhbWV0ZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRkcmVzc1xuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc3ViSWRcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG1lYXN1cmVQb3dlclxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc2VuZFN0cmVuZ3RoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBMRVdyaXRlOiBmdW5jdGlvbiBMRVdyaXRlKGFkZHJlc3MsIHN1YklkLCBtZWFzdXJlUG93ZXIsIHNlbmRTdHJlbmd0aCwgY2FsbGJhY2spIHtcbiAgICAgIGlmICghaXNTdHJpbmcoYWRkcmVzcykgfHwgIWlzQkxFQWRkcmVzcyhhZGRyZXNzKSkge1xuICAgICAgICBsb2cud2FybignTEVXcml0ZTogbm8gdmFsaWQgYWRkcmVzcyBwYXJhbWV0ZXInKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihzdWJJZCkgfHwgc3ViSWQgPCAwIHx8IHN1YklkID4gNDA5NSkge1xuICAgICAgICBzdWJJZCA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIobWVhc3VyZVBvd2VyKSB8fCBtZWFzdXJlUG93ZXIgPCAtMTAwIHx8IG1lYXN1cmVQb3dlciA+IDApIHtcbiAgICAgICAgbWVhc3VyZVBvd2VyID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihzZW5kU3RyZW5ndGgpIHx8IHNlbmRTdHJlbmd0aCA8IDAgfHwgc2VuZFN0cmVuZ3RoID4gMykge1xuICAgICAgICBzZW5kU3RyZW5ndGggPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJyxcbiAgICAgICAgdWlkID0gJzdBMDdFMTdBLUExODgtNDE2RS1CN0EwLTVBMzYwNjUxM0U1Nyc7XG5cbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyOCxcbiAgICAgICAgcGFyYW1zOiBbXG4gICAgICAgICAgeydzdHJpbmcnOiBhZGRyZXNzfSxcbiAgICAgICAgICB7J3N0cmluZyc6IHVpZH0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogc3ViSWR9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IG1lYXN1cmVQb3dlcn0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogc2VuZFN0cmVuZ3RofVxuICAgICAgICBdLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFRPRE87IHVzZSBgT2JqZWN0YCBhcyBwYXJhbXNcbiAgLy8gVE9ETzogd2hhdCBhcmUgb3B0aW9uYWwgcGFyYW1zPyB2YWxpZGF0ZSBuYW1lIGFuZCBsb2NhdGlvbj9cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIEFwcG9pbnRtZW50J3MgbmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbG9jYXRpb24gQXBwb2ludG1lbnQncyBsb2NhdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2Rlc2NyaXB0aW9uXSBBcHBvaW50bWVudCdzIGRlc2NyaXB0aW9uXG4gICAqIEBwYXJhbSB7RGF0ZX0gc3RhcnQgQXBwb2ludG1lbnRzJ3MgU3RhcnREYXRlXG4gICAqIEBwYXJhbSB7RGF0ZX0gZW5kIEFwcG9pbnRtZW50cydzIEVuZERhdGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzYXZlQXBwb2ludG1lbnQ6IGZ1bmN0aW9uIHNhdmVBcHBvaW50bWVudChuYW1lLCBsb2NhdGlvbiwgZGVzY3JpcHRpb24sIHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoIWlzU3RyaW5nKG5hbWUpIHx8ICFpc1N0cmluZyhsb2NhdGlvbikpIHtcbiAgICAgIGxvZy53YXJuKCdzYXZlQXBwb2ludG1lbnQ6IG5vIHZhbGlkIG5hbWUgYW5kL29yIGxvY2F0aW9uJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghaXNEYXRlKHN0YXJ0KSB8fCAhaXNEYXRlKGVuZCkpIHtcbiAgICAgIGxvZy53YXJuKCdzYXZlQXBwb2ludG1lbnQ6IHN0YXJ0IGFuZC9vciBlbmREYXRlIGlzIG5vIHZhbGlkIERhdGUgYE9iamVjdGAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHN0YXJ0ID0gcGFyc2VJbnQoc3RhcnQuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuICAgIGVuZCA9IHBhcnNlSW50KGVuZC5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDI5LFxuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnc3RyaW5nJzogbmFtZX0sXG4gICAgICAgIHsnc3RyaW5nJzogbG9jYXRpb259LFxuICAgICAgICB7J3N0cmluZyc6IGRlc2NyaXB0aW9ufSxcbiAgICAgICAgeydJbnRlZ2VyJzogc3RhcnR9LFxuICAgICAgICB7J0ludGVnZXInOiBlbmR9XG4gICAgICBdLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMwNTQsIGlvczogMzA2Nywgd3A6IDMwMzB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERhdGVUeXBlcyBFbnVtXG4gICAqIHN0YXJ0cyBhdCAxXG4gICAqL1xuICBkYXRlVHlwZToge1xuICAgIGRhdGU6IDEsXG4gICAgdGltZTogMixcbiAgICBkYXRlVGltZTogM1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZWxlY3QgRGF0ZVxuICAgKiBPbGQ6IERhdGVTZWxlY3RcbiAgICogTmF0aXZlIEFwcHMgb25seS4gVE9ETzogYWxzbyBpbiBDaGF5bnMgV2ViPyBIVE1MNSBEYXRlcGlja2VyIGV0Y1xuICAgKiBUT0RPOyByZWNvbnNpZGVyIG9yZGVyIGV0Y1xuICAgKiBAcGFyYW0ge2RhdGVUeXBlfE51bWJlcn0gZGF0ZVR5cGUgRW51bSAxLTI6IHRpbWUsIGRhdGUsIGRhdGV0aW1lLiB1c2UgY2hheW5zLmRhdGVUeXBlXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IHByZVNlbGVjdCBQcmVzZXQgdGhlIERhdGUgKGUuZy4gY3VycmVudCBEYXRlKVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB0aGF0IHJlY2VpdmVzIHRoZSBjaG9zZW4gRGF0ZSBhcyBUaW1lc3RhbXBcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gbWluRGF0ZSBNaW5pbXVtIFN0YXJ0RGF0ZVxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBtYXhEYXRlIE1heGltdW0gRW5kRGF0ZVxuICAgKi9cbiAgc2VsZWN0RGF0ZTogZnVuY3Rpb24gc2VsZWN0RGF0ZShkYXRlVHlwZSwgcHJlU2VsZWN0LCBjYWxsYmFjaywgbWluRGF0ZSwgbWF4RGF0ZSkge1xuXG4gICAgaWYgKCFpc051bWJlcihkYXRlVHlwZSkgfHwgZGF0ZVR5cGUgPD0gMCkge1xuICAgICAgbG9nLndhcm4oJ3NlbGVjdERhdGU6IHdyb25nIGRhdGVUeXBlJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdzZWxlY3REYXRlOiBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZVZhbHVlKHZhbHVlKSB7XG4gICAgICBpZiAoIWlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBwYXJzZUludCh2YWx1ZS5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBwcmVTZWxlY3QgPSB2YWxpZGF0ZVZhbHVlKHByZVNlbGVjdCk7XG4gICAgbWluRGF0ZSA9IHZhbGlkYXRlVmFsdWUobWluRGF0ZSk7XG4gICAgbWF4RGF0ZSA9IHZhbGlkYXRlVmFsdWUobWF4RGF0ZSk7XG5cbiAgICBsZXQgZGF0ZVJhbmdlID0gJyc7XG4gICAgaWYgKG1pbkRhdGUgPiAtMSAmJiBtYXhEYXRlID4gLTEpIHtcbiAgICAgIGRhdGVSYW5nZSA9ICcsJyArIG1pbkRhdGUgKyAnLCcgKyBtYXhEYXRlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnc2VsZWN0RGF0ZUNhbGxiYWNrJztcbiAgICBmdW5jdGlvbiBjYWxsYmFja0ZuKGNhbGxiYWNrLCBkYXRlVHlwZSwgcHJlU2VsZWN0LCB0aW1lKSB7XG4gICAgICAvLyBUT0RPOiBpbXBvcnRhbnQgdmFsaWRhdGUgRGF0ZVxuICAgICAgLy8gVE9ETzogY2hvb3NlIHJpZ2h0IGRhdGUgYnkgZGF0ZVR5cGVFbnVtXG4gICAgICBsb2cuZGVidWcoZGF0ZVR5cGUsIHByZVNlbGVjdCk7XG4gICAgICBjYWxsYmFjay5jYWxsKG51bGwsIHRpbWUgPyBuZXcgRGF0ZSh0aW1lKSA6IC0xKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMwLFxuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9LFxuICAgICAgICB7J0ludGVnZXInOiBkYXRlVHlwZX0sXG4gICAgICAgIHsnSW50ZWdlcic6IHByZVNlbGVjdCArIGRhdGVSYW5nZX1cbiAgICAgIF0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIGNhbGxiYWNrLCBkYXRlVHlwZSwgcHJlU2VsZWN0KSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMDcyLCBpb3M6IDMwNjIsIHdwOiAzMDMwfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFVSTCBpbiBBcHBcbiAgICogKG9sZCBTaG93VVJMSW5BcHApXG4gICAqIG5vdCB0byBjb25mdXNlIHdpdGggb3BlbkxpbmtJbkJyb3dzZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBWaWRlbyBVUkwgc2hvdWxkIGNvbnRhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAgIC8vIFRPRE86IGltcGxlbWVudCBDaGF5bnMgV2ViIE1ldGhvZCBhcyB3ZWxsIChuYXZpZ2F0ZSBiYWNrIHN1cHBvcnQpXG4gIG9wZW5Vcmw6IGZ1bmN0aW9uIG9wZW5VcmwodXJsLCB0aXRsZSkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSkge1xuICAgICAgbG9nLmVycm9yKCdvcGVuVXJsOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzEsXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvY2F0aW9uLmhyZWYgPSB1cmw7IC8vIFRPRE86IG1ha2Ugc3VyZSBpdCB3b3Jrc1xuICAgICAgfSxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfSwgeydzdHJpbmcnOiB0aXRsZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMxMTAsIGlvczogMzA3NCwgd3A6IDMwNjN9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIGNyZWF0ZSBRUiBDb2RlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gZGF0YSBRUiBDb2RlIGRhdGFcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIGJhc2U2NCBlbmNvZGVkIElNRyBUT0RPOiB3aGljaCB0eXBlP1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGNyZWF0ZVFSQ29kZTogZnVuY3Rpb24gY3JlYXRlUVJDb2RlKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFpc1N0cmluZyhkYXRhKSkge1xuICAgICAgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgIH1cblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdjcmVhdGVRUkNvZGU6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdjcmVhdGVRUkNvZGVDYWxsYmFjaygpJztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMzLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBkYXRhfSwgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6ICAzMjIwLCBpb3M6IDEzNzIsIHdwOiAzMTA2fSxcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHNjYW4gUVIgQ29kZVxuICAgKiBTY2FucyBRUiBDb2RlIGFuZCByZWFkIGl0XG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSByZXN1bHRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzY2FuUVJDb2RlOiBmdW5jdGlvbiBzY2FuUVJDb2RlKGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2Fybignc2NhblFSQ29kZTogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ3NjYW5RUkNvZGVDYWxsYmFjaygpJztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDM0LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6ICAzMjIwLCBpb3M6IDEzNzIsIHdwOiAzMTA2fSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBzY2FuIFFSIENvZGVcbiAgICogU2NhbnMgUVIgQ29kZSBhbmQgcmVhZCBpdFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgcmVzdWx0XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgZ2V0TG9jYXRpb25CZWFjb25zOiBmdW5jdGlvbiBnZXRMb2NhdGlvbkJlYWNvbnMoY2FsbGJhY2ssIGZvcmNlUmVsb2FkKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignZ2V0TG9jYXRpb25CZWFjb25zOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnZ2V0QmVhY29uc0NhbGxCYWNrKCknO1xuICAgIGlmIChiZWFjb25MaXN0ICYmICFmb3JjZVJlbG9hZCkgeyAvLyBUT0RPOiBtYWtlIHN1cmUgaXQgaXMgZ29vZCB0byBjYWNoZSB0aGUgbGlzdFxuICAgICAgbG9nLmRlYnVnKCdnZXRMb2NhdGlvbkJlYWNvbnM6IHRoZXJlIGlzIGFscmVhZHkgb25lIGJlYWNvbkxpc3QnKTtcbiAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKG51bGwsIGJlYWNvbkxpc3QpO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tGbiA9IGZ1bmN0aW9uIGdldExvY2F0aW9uQmVhY29uQ2FsbGJhY2soY2FsbGJhY2ssIGxpc3QpIHtcbiAgICAgIGJlYWNvbkxpc3QgPSBsaXN0O1xuICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBsaXN0KTtcbiAgICB9O1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzksXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDQwNDUsIGlvczogNDA0OH0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIGNhbGxiYWNrKVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGQgdG8gUGFzc2Jvb2tcbiAgICogaU9TIG9ubHlcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVybCBQYXRoIHRvIFBhc3Nib29rIGZpbGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBhZGRUb1Bhc3Nib29rOiBmdW5jdGlvbiBhZGRUb1Bhc3Nib29rKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSkge1xuICAgICAgbG9nLndhcm4oJ2FkZFRvUGFzc2Jvb2s6IHVybCBpcyBpbnZhbGlkLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNDcsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgc3VwcG9ydDoge2lvczogNDA0NX0sXG4gICAgICB3ZWJGbjogY2hheW5zQXBpSW50ZXJmYWNlLm9wZW5MaW5rSW5Ccm93c2VyLmJpbmQobnVsbCwgdXJsKSxcbiAgICAgIGZhbGxiYWNrRm46IGNoYXluc0FwaUludGVyZmFjZS5vcGVuTGlua0luQnJvd3Nlci5iaW5kKG51bGwsIHVybClcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVG9iaXQgTG9naW5cbiAgICogV2l0aCBGYWNlYm9va0Nvbm5lY3QgRmFsbGJhY2tcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhcmFtcyBSZWxvYWQgUGFyYW1ldGVyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgbG9naW46IGZ1bmN0aW9uIGxvZ2luKHBhcmFtcykge1xuICAgIHBhcmFtcyA9ICdFeGVjQ29tbWFuZD0nICsgcGFyYW1zO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNTQsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHBhcmFtc31dLFxuICAgICAgc3VwcG9ydDoge2lvczogNDI0MCwgd3A6IDQwOTl9LFxuICAgICAgZmFsbGJhY2tGbjogY2hheW5zQXBpSW50ZXJmYWNlLmZhY2Vib29rQ29ubmVjdC5iaW5kKG51bGwsICd1c2VyX2ZyaWVuZHMnLCBwYXJhbXMpLFxuICAgICAgd2ViRm46ICd0b2JpdGNvbm5lY3QnLFxuICAgICAgd2ViUGFyYW1zOiBwYXJhbXNcbiAgICB9KTtcbiAgfVxuXG59O1xuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzUGVybWl0dGVkLCBpc0Z1bmN0aW9uLCBpc0JsYW5rLCBpc0FycmF5LCBpc09iamVjdCwgaXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvdywgcGFyZW50fSBmcm9tICcuLi91dGlscy9icm93c2VyJztcbmltcG9ydCB7ZW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtzZXRDYWxsYmFja30gZnJvbSAnLi9jYWxsYmFja3MnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNvcmUuY2hheW5zX2NhbGxzJyk7XG5cblxuZnVuY3Rpb24gY2FuKHZlcnNpb25zKSB7XG4gIHJldHVybiBpc1Blcm1pdHRlZCh2ZXJzaW9ucywgZW52aXJvbm1lbnQub3MsIGVudmlyb25tZW50LmFwcFZlcnNpb24pO1xufVxuXG4vLyBPUyBBcHAgVmVyc2lvbiBNYXAgZm9yIENoYXlucyBDYWxscyBTdXBwb3J0XG4vLyBUT0RPOiBtb3ZlIGludG8gZW52aXJvbm1lbnQ/IChvciBqdXN0IHJlbW92ZSBjYXVzZSBpdCBpcyBvbmx5IHVzZWQgb25lIHRpbWUgaW4gaGVyZSlcbmxldCBvc01hcCA9IHtcbiAgY2hheW5zQ2FsbDogeyBhbmRyb2lkOiAyNTEwLCBpb3M6IDI0ODMsIHdwOiAyNDY5LCBiYjogMTE4IH1cbn07XG5cbi8qKlxuICogUHVibGljIENoYXlucyBJbnRlcmZhY2VcbiAqIEV4ZWN1dGUgQVBJIENhbGxcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gcGFyYW1zXG4gKiBAcGFyYW0gZGVib3VuY2VcbiAqIC8vIFRPRE86IGxlZnQgb2YgY2FsbGJhY2sgYXMgcHJvbWlzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBpQ2FsbChvYmopIHtcblxuICBsZXQgZGVib3VuY2UgPSBvYmouZGVib3VuY2UgfHwgZmFsc2U7XG5cbiAgLy8gVE9ETzogY2hlY2sgb2JqLm9zIFZFUlNJT05cblxuICBmdW5jdGlvbiBleGVjdXRlQ2FsbChjaGF5bnNDYWxsT2JqKSB7XG5cbiAgICBpZiAoZW52aXJvbm1lbnQuY2FuQ2hheW5zQ2FsbCAmJiBjYW4ob3NNYXAuY2hheW5zQ2FsbCkpIHtcbiAgICAgIC8vIFRPRE86IGNvbnNpZGVyIGNhbGxRdWV1ZSBhbmQgSW50ZXJ2YWwgdG8gcHJldmVudCBlcnJvcnNcbiAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZUNhbGw6IGNoYXlucyBjYWxsICcsIGNoYXluc0NhbGxPYmouY21kKTtcblxuICAgICAgaWYgKCdjYicgaW4gY2hheW5zQ2FsbE9iaiAmJiBpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouY2IpKSB7XG4gICAgICAgIHNldENhbGxiYWNrKGNoYXluc0NhbGxPYmouY2FsbGJhY2tOYW1lIHx8IGNoYXluc0NhbGxPYmoucGFyYW1zWzBdLmNhbGxiYWNrLCBjaGF5bnNDYWxsT2JqLmNiLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc09iamVjdChjaGF5bnNDYWxsT2JqLnN1cHBvcnQpICYmICFjYW4oY2hheW5zQ2FsbE9iai5zdXBwb3J0KSkge1xuICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IHRoZSBjaGF5bnMgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICAgIGlmIChjaGF5bnNDYWxsT2JqLmZhbGxiYWNrQ21kKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBmYWxsYmFjayBjaGF5bnMgY2FsbCB3aWxsIGJlIGludm9rZWQnKTtcbiAgICAgICAgICByZXR1cm4gY2hheW5zQ2FsbChjaGF5bnNDYWxsT2JqLmZhbGxiYWNrQ21kKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihjaGF5bnNDYWxsT2JqLmZhbGxiYWNrRm4pKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBmYWxsYmFja0ZuIHdpbGwgYmUgaW52b2tlZCcpO1xuICAgICAgICAgIHJldHVybiBjaGF5bnNDYWxsT2JqLmZhbGxiYWNrRm4uY2FsbChudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gY2hheW5zQ2FsbChjaGF5bnNDYWxsT2JqLmNtZCwgY2hheW5zQ2FsbE9iai5wYXJhbXMpO1xuXG4gICAgfSBlbHNlIGlmIChlbnZpcm9ubWVudC5jYW5DaGF5bnNXZWJDYWxsKSB7XG5cbiAgICAgIGlmICgnY2InIGluIGNoYXluc0NhbGxPYmogJiYgaXNGdW5jdGlvbihjaGF5bnNDYWxsT2JqLmNiKSkge1xuICAgICAgICBzZXRDYWxsYmFjayhjaGF5bnNDYWxsT2JqLndlYkZuLCBjaGF5bnNDYWxsT2JqLmNiKTtcbiAgICAgIH1cbiAgICAgIGlmICghY2hheW5zQ2FsbE9iai53ZWJGbikge1xuICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IFRoaXMgQ2FsbCBoYXMgbm8gd2ViRm4nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBsb2cuZGVidWcoJ2V4ZWN1dGVDYWxsOiBjaGF5bnMgd2ViIGNhbGwgJywgY2hheW5zQ2FsbE9iai53ZWJGbi5uYW1lIHx8IGNoYXluc0NhbGxPYmoud2ViRm4pO1xuXG4gICAgICByZXR1cm4gY2hheW5zV2ViQ2FsbChjaGF5bnNDYWxsT2JqLndlYkZuLCBjaGF5bnNDYWxsT2JqLndlYlBhcmFtcyB8fCBjaGF5bnNDYWxsT2JqLnBhcmFtcyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBuZWl0aGVyIGNoYXlucyB3ZWIgY2FsbCBub3IgY2hheW5zIHdlYicpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChkZWJvdW5jZSkge1xuICAgIHNldFRpbWVvdXQoZXhlY3V0ZUNhbGwuYmluZChudWxsLCBvYmopLCAxMDApOyAvLyBUT0RPOiBlcnJvcj9cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZXhlY3V0ZUNhbGwob2JqKTtcbiAgfVxufVxuXG4vKipcbiAqIEJ1aWxkIENoYXlucyBDYWxsIChvbmx5IGZvciBuYXRpdmUgQXBwcylcbiAqIEBwcml2YXRlXG5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIGNoYXlucyBjYWxsIHN1Y2NlZWRlZCwgZmFsc2Ugb24gZXJyb3IgKG5vIHVybCBldGMpXG4gKi9cbmZ1bmN0aW9uIGNoYXluc0NhbGwoY21kLCBwYXJhbXMpIHtcblxuICBpZiAoaXNCbGFuayhjbWQpKSB7IC8vIDAgaXMgYSB2YWxpZCBjYWxsLCB1bmRlZmluZWQgYW5kIG51bGwgYXJlIG5vdFxuICAgIGxvZy53YXJuKCdjaGF5bnNDYWxsOiBtaXNzaW5nIGNtZCBmb3IgY2hheW5zQ2FsbCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBsZXQgdXJsID0gbnVsbDtcblxuICAvLyBpZiB0aGVyZSBpcyBubyBwYXJhbSBvciAnbm9uZScgd2hpY2ggbWVhbnMgbm8gY2FsbGJhY2tcbiAgaWYgKCFwYXJhbXMpIHtcblxuICAgIHVybCA9ICdjaGF5bnM6Ly9jaGF5bnNDYWxsKCcgKyBjbWQgKyAnKSc7XG5cbiAgfSBlbHNlIHtcblxuICAgIC8vIHBhcmFtcyBleGlzdCBob3dldmVyLCBpdCBpcyBubyBhcnJheVxuICAgIGlmICghaXNBcnJheShwYXJhbXMpKSB7XG4gICAgICBsb2cuZXJyb3IoJ2NoYXluc0NhbGw6IHBhcmFtcyBhcmUgbm8gQXJyYXknKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdGhlIHBhcmFtcyB0byB0aGUgY2hheW5zIGNhbGxcbiAgICBsZXQgY2FsbGJhY2tQcmVmaXggPSAnX2NoYXluc0NhbGxiYWNrcy4nO1xuICAgIGxldCBjYWxsU3RyaW5nID0gJyc7XG4gICAgaWYgKHBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICBsZXQgY2FsbEFyZ3MgPSBbXTtcbiAgICAgIHBhcmFtcy5mb3JFYWNoKGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgICAgIGxldCBuYW1lID0gT2JqZWN0LmtleXMocGFyYW0pWzBdO1xuICAgICAgICBsZXQgdmFsdWUgPSBwYXJhbVtuYW1lXTtcbiAgICAgICAgaWYgKG5hbWUgPT09ICdjYWxsYmFjaycpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKCdcXCcnICsgY2FsbGJhY2tQcmVmaXggKyB2YWx1ZSArICdcXCcnKTtcbiAgICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnYm9vbCcgfHwgbmFtZSA9PT0gJ0Z1bmN0aW9uJyB8fCBuYW1lID09PSAnSW50ZWdlcicpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0RlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgY2FsbEFyZ3MucHVzaCgnXFwnJyArIHZhbHVlICsgJ1xcJycpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNhbGxTdHJpbmcgPSAnLCcgKyBjYWxsQXJncy5qb2luKCcsJyk7XG4gICAgfVxuXG4gICAgLy8gYWRkIGNoYXlucyBwcm90b2NvbCBhbmQgaG9zdCBhbmQgam9pbiBhcnJheVxuICAgIHVybCA9ICdjaGF5bnM6Ly9jaGF5bnNDYWxsKCcgKyBjbWQgKyBjYWxsU3RyaW5nICsgJyknO1xuICB9XG5cbiAgbG9nLmRlYnVnKCdjaGF5bnNDYWxsOiB1cmw6ICcsIHVybCk7XG5cbiAgdHJ5IHtcbiAgICAvLyBUT0RPOiBjcmVhdGUgYW4gZWFzaWVyIGlkZW50aWZpY2F0aW9uIG9mIHRoZSByaWdodCBlbnZpcm9ubWVudFxuICAgIC8vIFRPRE86IGNvbnNpZGVyIHRvIGV4ZWN1dGUgdGhlIGJyb3dzZXIgZmFsbGJhY2sgaW4gaGVyZSBhcyB3ZWxsXG4gICAgaWYgKCdjaGF5bnNDYWxsJyBpbiB3aW5kb3cgJiYgaXNGdW5jdGlvbih3aW5kb3cuY2hheW5zQ2FsbC5ocmVmKSkge1xuICAgICAgd2luZG93LmNoYXluc0NhbGwuaHJlZih1cmwpO1xuICAgIH0gZWxzZSBpZiAoJ3dlYmtpdCcgaW4gd2luZG93XG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVyc1xuICAgICAgJiYgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMuY2hheW5zQ2FsbFxuICAgICAgJiYgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMuY2hheW5zQ2FsbC5wb3N0TWVzc2FnZSkge1xuICAgICAgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMuY2hheW5zQ2FsbC5wb3N0TWVzc2FnZSh1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHVybDtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cud2FybignY2hheW5zQ2FsbDogRXJyb3I6IGNvdWxkIG5vdCBleGVjdXRlIENoYXluc0NhbGw6ICcsIGUpO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogRXhlY3V0ZSBhIENoYXluc1dlYiBDYWxsIGluIHRoZSBwYXJlbnQgd2luZG93LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmbiBGdW5jdGlvbiBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1zIEFkZGl0aW9uYWxcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNoYXluc1dlYmJDYWxsIHN1Y2NlZWRlZFxuICovXG5mdW5jdGlvbiBjaGF5bnNXZWJDYWxsKGZuLCBwYXJhbXMpIHtcbiAgaWYgKCFmbikge1xuICAgIGxvZy5pbmZvKCdjaGF5bnNXZWJDYWxsOiBubyBDaGF5bnNXZWJDYWxsIGZuJyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKCFwYXJhbXMgfHwgaXNBcnJheShwYXJhbXMpKSB7IC8vIEFycmF5IGluZGljYXRlcyB0aGF0IHRoZXNlIGFyZSBjaGF5bnNDYWxscyBwYXJhbXMgVE9ETzogcmVmYWN0b3JcbiAgICBwYXJhbXMgPSAnJztcbiAgfVxuICBpZiAoaXNPYmplY3QocGFyYW1zKSkgeyAvLyBhbiBBcnJheSBpcyBhbHNvIHNlZW4gYXMgT2JqZWN0LCBob3dldmVyIGl0IHdpbGwgYmUgcmVzZXQgYmVmb3JlXG4gICAgcGFyYW1zID0gSlNPTi5zdHJpbmdpZnkocGFyYW1zKTtcbiAgfVxuXG4gIGlmIChpc0Z1bmN0aW9uKGZuKSkge1xuICAgIHJldHVybiBmbi5jYWxsKG51bGwpO1xuICB9XG5cbiAgdmFyIG5hbWVzcGFjZSA9ICdjaGF5bnMuY3VzdG9tVGFiLic7XG4gIHZhciB1cmwgPSBuYW1lc3BhY2UgKyBmbiArICc6JyArIHBhcmFtcztcblxuICBsb2cuZGVidWcoJ2NoYXluc1dhYkNhbGw6ICcgKyB1cmwpO1xuXG4gIHRyeSB7XG4gICAgcGFyZW50LnBvc3RNZXNzYWdlKHVybCwgJyonKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy53YXJuKCdjaGF5bnNXZWJDYWxsOiBwb3N0TWVzc2dhZSBmYWlsZWQnKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG4iLCIvKipcbiAqIEBtb2R1bGUgY29uZmlnXG4gKiBAcHJpdmF0ZVxuICovXG5cbmltcG9ydCB7aXNQcmVzZW50LCBpc0JsYW5rLCBpc1VuZGVmaW5lZCwgaXNBcnJheSwgZXh0ZW5kfSBmcm9tICcuLi91dGlscyc7XG5cbi8qKlxuICogU3RvcmUgaW50ZXJuYWwgY2hheW5zIGNvbmZpZ3VyYXRpb25cbiAqIEB0eXBlIHt7YXBwTmFtZTogc3RyaW5nLCBhcHBWZXJzaW9uOiBudW1iZXIsIGxvYWRNb2Rlcm5pemVyOiBib29sZWFuLCBsb2FkUG9seWZpbGxzOiBib29sZWFuLCB1c2VGZXRjaDogYm9vbGVhbiwgcHJvbWlzZXM6IHN0cmluZywgdXNlT2ZmbGluZUNhY2hpbmc6IGJvb2xlYW4sIHVzZUxvY2FsU3RvcmFnZTogYm9vbGVhbiwgaGFzQWRtaW46IGJvb2xlYW4sIG11bHRpTGluZ3VhbDogYm9vbGVhbiwgaXNQdWJsaXNoZWQ6IGJvb2xlYW4sIGRlYnVnTW9kZTogYm9vbGVhbiwgdXNlQWpheDogYm9vbGVhbn19XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgX2NvbmZpZyA9IHtcbiAgYXBwTmFtZTogJ0NoYXlucyBBcHAnLCAgIC8vIGFwcCBOYW1lXG4gIGFwcFZlcnNpb246IDEsICAgICAgICAgICAvLyBhcHAgVmVyc2lvblxuICBwcmV2ZW50RXJyb3JzOiB0cnVlLCAgICAgICAgLy8gZXJyb3IgaGFuZGxlciBjYW4gaGlkZSBlcnJvcnMgKGNhbiBiZSBvdmVyd3RpdHRlbiBieSBpc1Byb2R1Y3Rpb24pXG4gIGlzUHJvZHVjdGlvbjogdHJ1ZSwgICAgICAvLyBwcm9kdWN0aW9uLCBkZXZlbG9wbWVudCBhbmQgdGVzdCBFTlZcbiAgbG9hZE1vZGVybml6ZXI6IHRydWUsICAgIC8vIGxvYWQgbW9kZXJuaXplclxuICBsb2FkUG9seWZpbGxzOiB0cnVlLCAgICAgLy8gbG9hZCBwb2x5ZmlsbHNcbiAgdXNlRmV0Y2g6IHRydWUsICAgICAgICAgIC8vIHVzZSB3aW5kb3cuZmV0Y2ggYW5kIGl0J3MgcG9seWZpbGxzXG4gIHByb21pc2VzOiAncScsICAgICAgICAgICAvLyBwcm9taXNlIFNlcnZpY2U6IFEgaXMgc3RhbmRhcmRcbiAgdXNlT2ZmbGluZUNhY2hpbmc6IGZhbHNlLC8vIGlzIG9mZmxpbmUgY2FjaGluZyB1c2VkPyBpbmxjdWRlIG9mZmxpbmUgaGVscGVyXG4gIHVzZUxvY2FsU3RvcmFnZTogZmFsc2UsICAvLyBpcyBsb2NhbFN0b3JhZ2UgdXNlZD8gaW5jbHVkZSBoZWxwZXJcbiAgaGFzQWRtaW46IGZhbHNlLCAgICAgICAgIC8vIGRvZXMgdGhpcyBhcHAvcGFnZSBoYXZlIGFuIGFkbWluP1xuICBtdWx0aUxpbmd1YWw6IHRydWUsICAgICAgLy8gZW5hYmxlIGkxOG4/XG4gIGlzUHVibGlzaGVkOiB0cnVlLCAgICAgICAvLyBvbmx5IGluIGludGVybmFsIHRvYml0IGF2YWlsYWJsZVxuICBkZWJ1Z01vZGU6IHRydWUsICAgICAgICAgLy8gc2hvdyBjb25zb2xlIG91dHB1dCwgZGVidWcgcGFyYW0gZm9yIGxvZ2dpbmdcbiAgdXNlQWpheDogZmFsc2UsXG4gIGlzSW50ZXJuYWw6IGZhbHNlICAgICAgICAvLyB1c2UgaW50ZXJuYWwgcm91dGluZ1xuICAvL2ZyYW1ld29yazogWydFbWJlcicsICdBbmd1bGFyJywgJ0JhY2tib25lJywgJ0FtcGVyc2FuZCcsICdSZWFjdCcsICdqUXVlcnknXVxufTtcblxuLy8gVE9ETzogcmVtb3ZlXG4vKmV4cG9ydCBmdW5jdGlvbiBjb25maWcoKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIENvbmZpZy5zZXQoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pOyAvLyBUT0RPOiByZWZhY3RvciB0aGlzXG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBDb25maWcuZ2V0KGFyZ3VtZW50cyk7XG4gIH1cbiAgcmV0dXJuIENvbmZpZy5nZXQoKTtcbn0qL1xuXG4vLyBUT0RPOiByZWZhY3RvciB0byBNYXBcbmV4cG9ydCBjbGFzcyBDb25maWcge1xuXG4gIC8qKlxuICAgKiBAbWV0aG9kIGdldFxuICAgKiBAY2xhc3MgQ29uZmlnXG4gICAqIEBtb2R1bGUgY2hheW5zLmNvbmZpZ1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFJlZmVyZW5jZSB0aGUgYGtleWAgaW4gdGhlIGNvbmZpZyBgT2JqZWN0YFxuICAgKiBAcmV0dXJucyB7bnVsbH0gVmFsdWUgb2YgdGhlIGBrZXlgIGluIHRoZSBjb25maWcgYE9iamVjdGBcbiAgICogICAgICAgICAgICAgICAgIGB1bmRlZmluZWRgIGlmIHRoZSBga2V5YCB3YXMgbm90IGZvdW5kXG4gICAqL1xuICBzdGF0aWMgZ2V0KGtleSkge1xuICAgIGlmIChpc1ByZXNlbnQoa2V5KSkge1xuICAgICAgcmV0dXJuIF9jb25maWdba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEBwYXJhbSB2YWx1ZVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHN0YXRpYyBzZXQoa2V5LCB2YWx1ZSkge1xuICAgIGlmIChpc0JsYW5rKGtleSkgfHwgaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIFRPRE86IGdvb2QgaWRlYT8gb25lIHNob3VsZCBiZSBjYXJlZnVsIGkgc3VwcG9zZVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgZXh0ZW5kKF9jb25maWcsIHZhbHVlKTtcbiAgICB9XG4gICAgX2NvbmZpZ1trZXldID0gdmFsdWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHN0YXRpYyBoYXMoa2V5KSB7XG4gICAgcmV0dXJuICEha2V5ICYmIChrZXkgaW4gX2NvbmZpZyk7XG4gIH1cbn1cbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc09iamVjdCwgRE9NfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge0NvbmZpZ30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHttZXNzYWdlTGlzdGVuZXJ9IGZyb20gJy4vY2FsbGJhY2tzJztcbmltcG9ydCB7Y2hheW5zQXBpSW50ZXJmYWNlfSBmcm9tICcuL2NoYXluc19hcGlfaW50ZXJmYWNlJztcblxuLy8gY3JlYXRlIG5ldyBMb2dnZXIgaW5zdGFuY2VcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jb3JlJyk7XG5cbi8vIGRpc2FibGUgSlMgRXJyb3JzIGluIHRoZSBjb25zb2xlXG5Db25maWcuc2V0KCdwcmV2ZW50RXJyb3JzJywgZmFsc2UpO1xuXG4vKipcbiAqXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICpcbiAqIEB0eXBlIHtib29sZWFufSBUcnVlIGlmIHRoZSBET00gaXMgbG9hZGVkXG4gKiBAcHJpdmF0ZVxuICovXG52YXIgZG9tUmVhZHkgPSBmYWxzZTtcblxuLyoqXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICpcbiAqIEB0eXBlIHthcnJheX0gQ29udGFpbnMgY2FsbGJhY2tzIGZvciB0aGUgRE9NIHJlYWR5IGV2ZW50XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgcmVhZHlDYWxsYmFja3MgPSBbXTtcblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMucHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyKHVzZXJDb25maWcpIHtcbiAgbG9nLmluZm8oJ2NoYXlucy5yZWdpc3RlcicpO1xuICBDb25maWcuc2V0KHVzZXJDb25maWcpOyAvLyB0aGlzIHJlZmVyZW5jZSB0byB0aGUgY2hheW5zIG9ialxuICByZXR1cm4gdGhpcztcbn1cblxuLy8gVE9ETzogcmVnaXN0ZXIgYEZ1bmN0aW9uYCBvciBwcmVDaGF5bnMgYE9iamVjdGA/XG5leHBvcnQgZnVuY3Rpb24gcHJlQ2hheW5zKCkge1xuICBpZiAoJ3ByZUNoYXlucycgaW4gd2luZG93ICYmIGlzT2JqZWN0KHdpbmRvdy5wcmVDaGF5bnMpKSB7XG4gICAgLy8gZmlsbCBjb25maWdcbiAgfVxufVxuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5wcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZHkoY2IpIHtcbiAgbG9nLmluZm8oJ2NoYXlucy5yZWFkeScpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoZG9tUmVhZHkpIHtcbiAgICAvLyBUT0RPOiByZXR1cm4gYSBjdXN0b20gTW9kZWwgT2JqZWN0IGluc3RlYWQgb2YgYGNvbmZpZ2BcbiAgICBjYih7XG4gICAgICBhcHBOYW1lOkNvbmZpZy5nZXQoJ2FwcE5hbWUnKSxcbiAgICAgIGFwcFZlcnNpb246IENvbmZpZy5nZXQoJ2FwcFZlcnNpb24nKVxuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuICByZWFkeUNhbGxiYWNrcy5wdXNoKGFyZ3VtZW50c1swXSk7XG59XG5cbi8qKlxuICogQG5hbWUgcHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIG9iaiBSZWZlcmVuY2UgdG8gY2hheW5zIE9iamVjdFxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cCgpIHtcbiAgbG9nLmluZm8oJ3N0YXJ0IGNoYXlucyBzZXR1cCcpO1xuXG4gIC8vIGVuYWJsZSBgY2hheW5zLmNzc2AgYnkgYWRkaW5nIGBjaGF5bnNgIGNsYXNzXG4gIC8vIHJlbW92ZSBgbm8tanNgIGNsYXNzIGFuZCBhZGQgYGpzYCBjbGFzc1xuICBsZXQgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gIERPTS5hZGRDbGFzcyhib2R5LCAnY2hheW5zJyk7XG4gIERPTS5hZGRDbGFzcyhib2R5LCAnanMnKTtcbiAgRE9NLnJlbW92ZUNsYXNzKGJvZHksICduby1qcycpO1xuXG5cbiAgLy8gcnVuIHBvbHlmaWxsIChpZiByZXF1aXJlZClcblxuICAvLyBydW4gbW9kZXJuaXplciAoZmVhdHVyZSBkZXRlY3Rpb24pXG5cbiAgLy8gcnVuIGZhc3RjbGlja1xuXG4gIC8vICh2aWV3cG9ydCBzZXR1cClcblxuICAvLyBjcmF0ZSBtZXRhIHRhZ3MgKGNvbG9ycywgbW9iaWxlIGljb25zIGV0YylcblxuICAvLyBkbyBzb21lIFNFTyBzdHVmZiAoY2Fub25pY2FsIGV0YylcblxuICAvLyBkZXRlY3QgdXNlciAobG9nZ2VkIGluPylcblxuICAvLyBydW4gY2hheW5zIHNldHVwIChjb2xvcnMgYmFzZWQgb24gZW52aXJvbm1lbnQpXG5cblxuXG4gIC8vIHNldCBET00gcmVhZHkgZXZlbnRcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpIHtcblxuICAgIGRvbVJlYWR5ID0gdHJ1ZTtcbiAgICBsb2cuZGVidWcoJ0RPTSByZWFkeScpO1xuXG4gICAgLy8gYWRkIGNoYXlucyByb290IGVsZW1lbnRcbiAgICBsZXQgY2hheW5zUm9vdCA9IERPTS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjaGF5bnNSb290LnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLXJvb3QnKTtcbiAgICBjaGF5bnNSb290LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2hheW5zX19yb290Jyk7XG4gICAgRE9NLmFwcGVuZENoaWxkKGJvZHksIGNoYXluc1Jvb3QpO1xuXG4gICAgLy8gZG9tLXJlYWR5IGNsYXNzXG4gICAgRE9NLmFkZENsYXNzKGRvY3VtZW50LmJvZHksICdkb20tcmVhZHknKTtcblxuICAgIC8vIGdldCB0aGUgQXBwIEluZm9ybWF0aW9uLCBoYXMgdG8gYmUgZG9uZSB3aGVuIGRvY3VtZW50IHJlYWR5XG4gICAgbGV0IGdldEFwcEluZm9ybWF0aW9uQ2FsbCA9ICFjaGF5bnNBcGlJbnRlcmZhY2UuZ2V0R2xvYmFsRGF0YShmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgIC8vIG5vdyBDaGF5bnMgaXMgb2ZmaWNpYWxseSByZWFkeVxuXG4gICAgICBsb2cuZGVidWcoJ2FwcEluZm9ybWF0aW9uIGNhbGxiYWNrJywgZGF0YSk7XG5cbiAgICAgIHJlYWR5Q2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgICByZWFkeUNhbGxiYWNrcyA9IFtdO1xuXG4gICAgICBET00uYWRkQ2xhc3MoZG9jdW1lbnQuYm9keSwgJ2NoYXlucy1yZWFkeScpO1xuICAgICAgRE9NLnJlbW92ZUF0dHJpYnV0ZShET00ucXVlcnkoJ1tjaGF5bnMtY2xvYWtdJyksICdjaGF5bnMtY2xvYWsnKTtcblxuICAgICAgbG9nLmluZm8oJ2ZpbmlzaGVkIGNoYXlucyBzZXR1cCcpO1xuICAgIH0pO1xuXG4gICAgaWYgKGdldEFwcEluZm9ybWF0aW9uQ2FsbCkge1xuICAgICAgbG9nLmVycm9yKCdUaGUgQXBwIEluZm9ybWF0aW9uIGNvdWxkIG5vdCBiZSByZXRyaWV2ZWQuJyk7XG4gICAgfVxuICB9KTtcblxuICAvLyBzdGFydCB3aW5kb3cub24oJ21lc3NhZ2UnKSBsaXN0ZW5lciBmb3IgRnJhbWUgQ29tbXVuaWNhdGlvblxuICBtZXNzYWdlTGlzdGVuZXIoKTtcblxuXG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlY3QgYEJyb3dzZXJgLCBgT1NgIGFuZCAnRGV2aWNlYFxuICogYXMgd2VsbCBhcyBgQ2hheW5zIEVudmlyb25tZW50YCwgYENoYXlucyBVc2VyYCBhbmQgYENoYXlucyBTaXRlYFxuICogYW5kIGFzc2lnbiB0aGUgZGF0YSBpbnRvIHRoZSBlbnZpcm9ubWVudCBvYmplY3RcbiAqL1xuZnVuY3Rpb24gc2V0RW52aXJvbm1lbnQoKSB7XG5cbn1cbiIsIi8qKlxuICogQG1vZHVsZSBjaGF5bnMuZW52aXJvbm1lbnRcbiAqIEBkZXNjcmlwdGlvblxuICogQ2hheW5zIEVudmlyb25tZW50XG4gKi9cblxuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5lbnZpcm9ubWVudCcpO1xuXG4vLyBUT0RPOiBpbXBvcnQgZGVwZW5kZW5jaWVzXG5leHBvcnQgdmFyIHR5cGVzID0ge307XG5cbnR5cGVzLmJyb3dzZXIgPSBbXG4gICdjaHJvbWUnLFxuICAnZmlyZWZveCcsXG4gICdzYWZhcmknLFxuICAnb3BlcmEnLFxuICAnY2hyb21lIG1vYmlsZScsXG4gICdzYWZhcmkgbW9iaWxlJyxcbiAgJ2ZpcmVmb3ggbW9iaWxlJ1xuXTtcblxudHlwZXMub3MgPSBbXG4gICd3aW5kb3dzJyxcbiAgJ21hY09TJyxcbiAgJ2FuZHJvaWQnLFxuICAnaW9zJyxcbiAgJ3dwJ1xuXTtcblxudHlwZXMuY2hheW5zT1MgPSB7XG4gIHdlYjogJ3dlYnNoYWRvdycsXG4gIHdlYk1vYmlsZTogJ3dlYnNoYWRvd21vYmlsZScsXG4gIGFwcDogJ3dlYnNoYWRvd21vYmlsZSdcbn07XG5cbi8vIFRPRE86IGhpZGUgaW50ZXJuYWwgcGFyYW1ldGVycyBmcm9tIHRoZSBvdGhlcnNcbi8vIFRPRE86IG9mZmVyIHVzZXIgYW4gYE9iamVjdGAgd2l0aCBVUkwgUGFyYW1ldGVyc1xuLy8gbG9jYXRpb24gcXVlcnkgc3RyaW5nXG52YXIgcXVlcnkgPSBsb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpO1xudmFyIHBhcmFtZXRlcnMgPSB7fTtcbnF1ZXJ5LnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihwYXJ0KSB7XG4gIHZhciBpdGVtID0gcGFydC5zcGxpdCgnPScpO1xuICBwYXJhbWV0ZXJzW2l0ZW1bMF0udG9Mb3dlckNhc2UoKV0gPSBkZWNvZGVVUklDb21wb25lbnQoaXRlbVsxXSkudG9Mb3dlckNhc2UoKTtcbn0pO1xuXG4vLyB2ZXJpZnkgYnkgY2hheW5zIHJlcXVpcmVkIHBhcmFtZXRlcnMgZXhpc3RcbmlmICghcGFyYW1ldGVycy5hcHB2ZXJzaW9uKSB7XG4gIGxvZy53YXJuKCdubyBhcHAgdmVyc2lvbiBwYXJhbWV0ZXInKTtcbn1cbmlmICghcGFyYW1ldGVycy5vcykge1xuICBsb2cud2Fybignbm8gb3MgcGFyYW1ldGVyJyk7XG59XG5pZiAocGFyYW1ldGVycy5kZWJ1Zykge1xuICAvLyBUT0RPOiBlbmFibGUgZGVidWcgbW9kZVxufVxuXG4vLyBUT0RPOiBmdXJ0aGVyIHBhcmFtcyBhbmQgY29sb3JzY2hlbWVcbi8vIFRPRE86IGRpc2N1c3Mgcm9sZSBvZiBVUkwgcGFyYW1zIGFuZCB0cnkgdG8gcmVwbGFjZSB0aGVtIGFuZCBvbmx5IHVzZSBBcHBEYXRhXG5cblxuZnVuY3Rpb24gZ2V0Rmlyc3RNYXRjaChyZWdleCkge1xuICB2YXIgbWF0Y2ggPSB1YS5tYXRjaChyZWdleCk7XG4gIHJldHVybiAobWF0Y2ggJiYgbWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaFsxXSkgfHwgJyc7XG59XG5cbi8vIHVzZXIgYWdlbnQgZGV0ZWN0aW9uXG52YXIgdXNlckFnZW50ID0gKHdpbmRvdy5uYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCkgfHwgJyc7XG5cbnZhciBpcyA9IHtcbiAgaW9zOiAvaVBob25lfGlQYWR8aVBvZC9pLnRlc3QodXNlckFnZW50KSxcbiAgYW5kcm9pZDogL0FuZHJvaWQvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHdwOiAvd2luZG93cyBwaG9uZS9pLnRlc3QodXNlckFnZW50KSxcbiAgYmI6IC9CbGFja0JlcnJ5fEJCMTB8UklNL2kudGVzdCh1c2VyQWdlbnQpLFxuXG4gIG9wZXJhOiAoISF3aW5kb3cub3BlcmEgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCcgT1BSLycpID49IDApLFxuICBmaXJlZm94OiAodHlwZW9mIEluc3RhbGxUcmlnZ2VyICE9PSAndW5kZWZpbmVkJyksXG4gIHNhZmFyaTogKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cuSFRNTEVsZW1lbnQpLmluZGV4T2YoJ0NvbnN0cnVjdG9yJykgPiAwKSxcbiAgY2hyb21lOiAoISF3aW5kb3cuY2hyb21lICYmICEoISF3aW5kb3cub3BlcmEgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCcgT1BSLycpID49IDApKSxcbiAgaWU6IGZhbHNlIHx8ICEhZG9jdW1lbnQuZG9jdW1lbnRNb2RlLFxuICBpZTExOiAvbXNpZSAxMS9pLnRlc3QodXNlckFnZW50KSxcbiAgaWUxMDogL21zaWUgMTAvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllOTogL21zaWUgOS9pLnRlc3QodXNlckFnZW50KSxcbiAgaWU4OiAvbXNpZSA4L2kudGVzdCh1c2VyQWdlbnQpLFxuXG4gIG1vYmlsZTogLyhpcGhvbmV8aXBvZHwoKD86YW5kcm9pZCk/Lio/bW9iaWxlKXxibGFja2JlcnJ5fG5va2lhKS9pLnRlc3QodXNlckFnZW50KSxcbiAgdGFibGV0OiAvKGlwYWR8YW5kcm9pZCg/IS4qbW9iaWxlKXx0YWJsZXQpL2kudGVzdCh1c2VyQWdlbnQpLFxuICBraW5kbGU6IC9cXFcoa2luZGxlfHNpbGspXFxXL2kudGVzdCh1c2VyQWdlbnQpLFxuICB0djogL2dvb2dsZXR2fHNvbnlkdHYvaS50ZXN0KHVzZXJBZ2VudClcbn07XG5cbi8vIFRPRE86IEJyb3dzZXIgVmVyc2lvbiBhbmQgT1MgVmVyc2lvbiBkZXRlY3Rpb25cblxuLy8gVE9ETzogYWRkIGZhbGxiYWNrXG52YXIgb3JpZW50YXRpb24gPSBNYXRoLmFicyh3aW5kb3cub3JpZW50YXRpb24gJSAxODApID09PSAwID8gJ3BvcnRyYWl0JyA6ICdsYW5kc2NhcGUnO1xudmFyIHZpZXdwb3J0ID0gd2luZG93LmlubmVyV2lkdGggKyAneCcgKyB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbmV4cG9ydCB2YXIgZW52aXJvbm1lbnQgPSB7XG5cbiAgLy9vczogcGFyYW1ldGVycy5vcyxcbiAgb3NWZXJzaW9uOiAxLFxuXG4gIGJyb3dzZXI6ICcnLFxuICBicm93c2VyVmVyc2lvbjogMSxcblxuICAvL2FwcFZlcnNpb246IHBhcmFtZXRlcnMuYXBwdmVyc2lvbixcblxuICAvL29yaWVudGF0aW9uOiBvcmllbnRhdGlvbixcblxuICAvL3ZpZXdwb3J0OiB2aWV3cG9ydCwgLy8gaW4gMXgxIGluIHB4XG5cbiAgLy9yYXRpbzogMSwgLy8gcGl4ZWwgcmF0aW9cblxuICAvL2lzSW5GcmFtZTogZmFsc2UsXG5cbiAgLy9pc0NoYXluc1dlYjogbnVsbCwgLy8gZGVza3RvcCBicm93c2VyLCBubyBBcHAsIG5vIG1vYmlsZVxuICAvL2lzQ2hheW5zV2ViTW9iaWxlOiBudWxsLCAvLyBtb2JpbGUgYnJvd3Nlciwgbm8gQXBwLCBubyBkZXNrdG9wXG4gIC8vaXNBcHA6IGZhbHNlLCAvLyBvdGhlcndpc2UgQnJvd3NlclxuICAvL2lzTW9iaWxlOiBudWxsLCAvLyBubyBkZXNrdG9wLCBidXQgbW9iaWxlIGJyb3dzZXIgYW5kIGFwcFxuICAvL2lzVGFibGV0OiBudWxsLCAvLyBubyBkZXNrdG9wLCBraW5kYSBtb2JpbGUsIG1vc3QgbGlrZWx5IG5vIGFwcFxuICAvL2lzRGVza3RvcDogbnVsbCwgLy8gbm8gYXBwLCBubyBtb2JpbGVcbiAgLy9pc0Jyb3dzZXI6IG51bGwsIC8vIG90aGVyd2lzZSBBcHBcblxuICAvL2lzSU9TOiBpcy5pb3MsXG4gIC8vaXNBbmRyb2lkOiBpcy5hbmRyb2lkLFxuICAvL2lzV1A6IGlzLndwLFxuICAvL2lzQkI6IGlzLmJiLFxuXG4gIC8vcGFyYW1ldGVyczogcGFyYW1ldGVycyxcbiAgLy9oYXNoOiBsb2NhdGlvbi5oYXNoLnN1YnN0cigxKSxcblxuICBzaXRlOiB7XG4gICAgc2l0ZUlkOiAxLFxuICAgIG5hbWU6ICdUb2JpdCcsXG4gICAgbG9jYXRpb25JZDogMSxcbiAgICB1cmw6ICdodHRwczovL3RvYml0LmNvbS8nLFxuICAgIHVzZVNTTDogdHJ1ZSxcbiAgICBjb2xvcnNjaGVtZTogMVxuICAgIC8vZWRpdE1vZGU6IGZhbHNlLCAvLyBmdXR1cmUgZWRpdCBtb2RlIGZvciBjb250ZW50XG4gICAgLy9pc0FkbWluTW9kZTogdHJ1ZVxuICB9LFxuXG4gIC8vIFRPRE86IGNvbnNpZGVyIFRhcHBcbiAgYXBwOiB7XG4gICAgYXBwSWQ6IDEsXG4gICAgY29uZmlnOiB7fSxcbiAgICAvL2RlZmF1bHRDb250aWY6IHt9LFxuICAgIGRvbVJlYWR5OiBmYWxzZSxcbiAgICBsb2dzOiB7XG4gICAgICBsb2c6IFtdLFxuICAgICAgZGVidWc6IFtdLFxuICAgICAgd2FybjogW11cbiAgICB9LFxuICAgIGVycm9yczogW11cbiAgfVxufTtcblxuZW52aXJvbm1lbnQucGFyYW1ldGVycyA9IHBhcmFtZXRlcnM7XG5lbnZpcm9ubWVudC5oYXNoID0gbG9jYXRpb24uaGFzaC5zdWJzdHIoMSk7XG5cbi8vIFdBVENIIE9VVCB0aGUgT1MgaXMgc2V0IGJ5IHBhcmFtZXRlciAodW5mb3J0dW5hdGVseSlcbmVudmlyb25tZW50Lm9zID0gcGFyYW1ldGVycy5vcyB8fCAnbm9PUyc7IC8vIFRPRE86IHJlZmFjdG9yIE9TXG5pZiAoaXMubW9iaWxlICYmIFsnYW5kcm9pZCcsICdpb3MnLCAnd3AnXS5pbmRleE9mKHBhcmFtZXRlcnMub3MpICE9PSAtMSkge1xuICBwYXJhbWV0ZXJzLm9zID0gdHlwZXMuY2hheW5zT1MuYXBwO1xufVxuXG4vLyBkZXRlY3Rpb24gYnkgdXNlciBhZ2VudFxuZW52aXJvbm1lbnQuaXNJT1MgPSBpcy5pb3M7XG5lbnZpcm9ubWVudC5pc0FuZHJvaWQgPSBpcy5hbmRyb2lkO1xuZW52aXJvbm1lbnQuaXNXUCA9IGlzLndwO1xuZW52aXJvbm1lbnQuaXNCQiA9IGlzLmJiO1xuXG4vLyBUT0RPOiBtYWtlIHN1cmUgdGhhdCB0aGlzIGFsd2F5cyB3b3JrcyEgKFRTUE4sIGNyZWF0ZSBpZnJhbWUgdGVzdCBwYWdlKVxuZW52aXJvbm1lbnQuaXNJbkZyYW1lID0gKHdpbmRvdyAhPT0gd2luZG93LnRvcCk7XG5cbmVudmlyb25tZW50LmlzQXBwID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLmFwcCAmJiBpcy5tb2JpbGUgJiYgIWVudmlyb25tZW50LmlzSW5GcmFtZSk7IC8vIFRPRE86IGRvZXMgdGhpcyBhbHdheXMgd29yaz9cbmVudmlyb25tZW50LmFwcFZlcnNpb24gPSBwYXJhbWV0ZXJzLmFwcHZlcnNpb247XG5cbmVudmlyb25tZW50LmlzQnJvd3NlciA9ICFlbnZpcm9ubWVudC5pc0FwcDtcblxuZW52aXJvbm1lbnQuaXNEZXNrdG9wID0gKCFpcy5tb2JpbGUgJiYgIWlzLnRhYmxldCk7XG5cbmVudmlyb25tZW50LmlzTW9iaWxlID0gaXMubW9iaWxlO1xuZW52aXJvbm1lbnQuaXNUYWJsZXQgPSBpcy50YWJsZXQ7XG5cbmVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYk1vYmlsZSkgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYikgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWIgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3AgfHwgZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGU7XG5cbi8vIGludGVybmFsIFRPRE86IG1ha2UgaXQgcHJpdmF0ZT9cbmVudmlyb25tZW50LmNhbkNoYXluc0NhbGwgPSBlbnZpcm9ubWVudC5pc0FwcDtcbmVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYjtcblxuZW52aXJvbm1lbnQudmlld3BvcnQgPSB2aWV3cG9ydDsgLy8gVE9ETzogdXBkYXRlIG9uIHJlc2l6ZT8gbm8sIGR1ZSBwZXJmb3JtYW5jZVxuZW52aXJvbm1lbnQub3JpZW50YXRpb24gPSBvcmllbnRhdGlvbjtcbmVudmlyb25tZW50LnJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4iLCJleHBvcnQgdmFyIHVzZXIgPSB7XG4gIG5hbWU6ICdQYWNhbCBXZWlsYW5kJyxcbiAgZmlyc3ROYW1lOiAnUGFzY2FsJyxcbiAgbGFzdE5hbWU6ICdXZWlsYW5kJyxcbiAgdXNlcklkOiAxMjM0LFxuICBmYWNlYm9va0lkOiAxMjM0NSxcbiAgaXNBZG1pbjogdHJ1ZSxcbiAgdWFjR3JvdXBzOiBbXSxcbiAgbGFuZ3VhZ2U6ICdkZV9ERScsXG4gIHRva2VuOiAndG9rZW4nIC8vIFRPRE8gaW5jbHVkZSB0b2tlbiBoZXJlP1xufTtcbiIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmIChzZWxmLmZldGNoKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gbmFtZS50b1N0cmluZygpO1xuICAgIH1cbiAgICBpZiAoL1teYS16MC05XFwtIyQlJicqKy5cXF5fYHx+XS9pLnRlc3QobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2hhcmFjdGVyIGluIGhlYWRlciBmaWVsZCBuYW1lJylcbiAgICB9XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge31cblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUsIHZhbHVlcykge1xuICAgICAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHNlbGYuYXBwZW5kKG5hbWUsIHZhbHVlKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgIH0gZWxzZSBpZiAoaGVhZGVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaGVhZGVycykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHNlbGYuYXBwZW5kKG5hbWUsIGhlYWRlcnNbbmFtZV0pXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICAgIHZhciBsaXN0ID0gdGhpcy5tYXBbbmFtZV1cbiAgICBpZiAoIWxpc3QpIHtcbiAgICAgIGxpc3QgPSBbXVxuICAgICAgdGhpcy5tYXBbbmFtZV0gPSBsaXN0XG4gICAgfVxuICAgIGxpc3QucHVzaCh2YWx1ZSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgICByZXR1cm4gdmFsdWVzID8gdmFsdWVzWzBdIDogbnVsbFxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0QWxsID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSB8fCBbXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSA9IFtub3JtYWxpemVWYWx1ZSh2YWx1ZSldXG4gIH1cblxuICAvLyBJbnN0ZWFkIG9mIGl0ZXJhYmxlIGZvciBub3cuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMubWFwKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGNhbGxiYWNrKG5hbWUsIHNlbGYubWFwW25hbWVdKVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpO1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZlxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKCFib2R5KSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIHJldHVybiByZWplY3RlZCA/IHJlamVjdGVkIDogUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmZvcm1EYXRhKSB7XG4gICAgICB0aGlzLmZvcm1EYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKGRlY29kZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldGhvZChtZXRob2QpIHtcbiAgICB2YXIgdXBjYXNlZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgcmV0dXJuIChtZXRob2RzLmluZGV4T2YodXBjYXNlZCkgPiAtMSkgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KHVybCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdGhpcy51cmwgPSB1cmxcblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBvcHRpb25zLmJvZHkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvZHkgbm90IGFsbG93ZWQgZm9yIEdFVCBvciBIRUFEIHJlcXVlc3RzJylcbiAgICB9XG4gICAgdGhpcy5faW5pdEJvZHkob3B0aW9ucy5ib2R5KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBoZWFkZXJzKHhocikge1xuICAgIHZhciBoZWFkID0gbmV3IEhlYWRlcnMoKVxuICAgIHZhciBwYWlycyA9IHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKS50cmltKCkuc3BsaXQoJ1xcbicpXG4gICAgcGFpcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgIHZhciBzcGxpdCA9IGhlYWRlci50cmltKCkuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHNwbGl0LnNoaWZ0KCkudHJpbSgpXG4gICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc6JykudHJpbSgpXG4gICAgICBoZWFkLmFwcGVuZChrZXksIHZhbHVlKVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRcbiAgfVxuXG4gIFJlcXVlc3QucHJvdG90eXBlLmZldGNoID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICAgIGlmIChzZWxmLmNyZWRlbnRpYWxzID09PSAnY29ycycpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHJlc3BvbnNlVVJMKCkge1xuICAgICAgICBpZiAoJ3Jlc3BvbnNlVVJMJyBpbiB4aHIpIHtcbiAgICAgICAgICByZXR1cm4geGhyLnJlc3BvbnNlVVJMXG4gICAgICAgIH1cblxuICAgICAgICAvLyBBdm9pZCBzZWN1cml0eSB3YXJuaW5ncyBvbiBnZXRSZXNwb25zZUhlYWRlciB3aGVuIG5vdCBhbGxvd2VkIGJ5IENPUlNcbiAgICAgICAgaWYgKC9eWC1SZXF1ZXN0LVVSTDovbS50ZXN0KHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSkpIHtcbiAgICAgICAgICByZXR1cm4geGhyLmdldFJlc3BvbnNlSGVhZGVyKCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc3RhdHVzID0gKHhoci5zdGF0dXMgPT09IDEyMjMpID8gMjA0IDogeGhyLnN0YXR1c1xuICAgICAgICBpZiAoc3RhdHVzIDwgMTAwIHx8IHN0YXR1cyA+IDU5OSkge1xuICAgICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiBzdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogaGVhZGVycyh4aHIpLFxuICAgICAgICAgIHVybDogcmVzcG9uc2VVUkwoKVxuICAgICAgICB9XG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0O1xuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4oc2VsZi5tZXRob2QsIHNlbGYudXJsLCB0cnVlKVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgICB9XG5cbiAgICAgIHNlbGYuaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUsIHZhbHVlcykge1xuICAgICAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQodHlwZW9mIHNlbGYuX2JvZHlJbml0ID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiBzZWxmLl9ib2R5SW5pdClcbiAgICB9KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnVybCA9IG51bGxcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9IG9wdGlvbnMuc3RhdHVzVGV4dFxuICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVyc1xuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVycztcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdDtcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0KHVybCwgb3B0aW9ucykuZmV0Y2goKVxuICB9XG4gIHNlbGYuZmV0Y2gucG9seWZpbGwgPSB0cnVlXG59KSgpO1xuIiwiLyohXG4gKiBAb3ZlcnZpZXcgZXM2LXByb21pc2UgLSBhIHRpbnkgaW1wbGVtZW50YXRpb24gb2YgUHJvbWlzZXMvQSsuXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCAoYykgMjAxNCBZZWh1ZGEgS2F0eiwgVG9tIERhbGUsIFN0ZWZhbiBQZW5uZXIgYW5kIGNvbnRyaWJ1dG9ycyAoQ29udmVyc2lvbiB0byBFUzYgQVBJIGJ5IEpha2UgQXJjaGliYWxkKVxuICogQGxpY2Vuc2UgICBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogICAgICAgICAgICBTZWUgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2pha2VhcmNoaWJhbGQvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgMi4wLjBcbiAqL1xuXG4oZnVuY3Rpb24oKXtmdW5jdGlvbiByKGEsYil7bltsXT1hO25bbCsxXT1iO2wrPTI7Mj09PWwmJkEoKX1mdW5jdGlvbiBzKGEpe3JldHVyblwiZnVuY3Rpb25cIj09PXR5cGVvZiBhfWZ1bmN0aW9uIEYoKXtyZXR1cm4gZnVuY3Rpb24oKXtwcm9jZXNzLm5leHRUaWNrKHQpfX1mdW5jdGlvbiBHKCl7dmFyIGE9MCxiPW5ldyBCKHQpLGM9ZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJcIik7Yi5vYnNlcnZlKGMse2NoYXJhY3RlckRhdGE6ITB9KTtyZXR1cm4gZnVuY3Rpb24oKXtjLmRhdGE9YT0rK2ElMn19ZnVuY3Rpb24gSCgpe3ZhciBhPW5ldyBNZXNzYWdlQ2hhbm5lbDthLnBvcnQxLm9ubWVzc2FnZT10O3JldHVybiBmdW5jdGlvbigpe2EucG9ydDIucG9zdE1lc3NhZ2UoMCl9fWZ1bmN0aW9uIEkoKXtyZXR1cm4gZnVuY3Rpb24oKXtzZXRUaW1lb3V0KHQsMSl9fWZ1bmN0aW9uIHQoKXtmb3IodmFyIGE9MDthPGw7YSs9MikoMCxuW2FdKShuW2ErMV0pLG5bYV09dm9pZCAwLG5bYSsxXT12b2lkIDA7XG5sPTB9ZnVuY3Rpb24gcCgpe31mdW5jdGlvbiBKKGEsYixjLGQpe3RyeXthLmNhbGwoYixjLGQpfWNhdGNoKGUpe3JldHVybiBlfX1mdW5jdGlvbiBLKGEsYixjKXtyKGZ1bmN0aW9uKGEpe3ZhciBlPSExLGY9SihjLGIsZnVuY3Rpb24oYyl7ZXx8KGU9ITAsYiE9PWM/cShhLGMpOm0oYSxjKSl9LGZ1bmN0aW9uKGIpe2V8fChlPSEwLGcoYSxiKSl9KTshZSYmZiYmKGU9ITAsZyhhLGYpKX0sYSl9ZnVuY3Rpb24gTChhLGIpezE9PT1iLmE/bShhLGIuYik6Mj09PWEuYT9nKGEsYi5iKTp1KGIsdm9pZCAwLGZ1bmN0aW9uKGIpe3EoYSxiKX0sZnVuY3Rpb24oYil7ZyhhLGIpfSl9ZnVuY3Rpb24gcShhLGIpe2lmKGE9PT1iKWcoYSxuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKSk7ZWxzZSBpZihcImZ1bmN0aW9uXCI9PT10eXBlb2YgYnx8XCJvYmplY3RcIj09PXR5cGVvZiBiJiZudWxsIT09YilpZihiLmNvbnN0cnVjdG9yPT09YS5jb25zdHJ1Y3RvcilMKGEsXG5iKTtlbHNle3ZhciBjO3RyeXtjPWIudGhlbn1jYXRjaChkKXt2LmVycm9yPWQsYz12fWM9PT12P2coYSx2LmVycm9yKTp2b2lkIDA9PT1jP20oYSxiKTpzKGMpP0soYSxiLGMpOm0oYSxiKX1lbHNlIG0oYSxiKX1mdW5jdGlvbiBNKGEpe2EuZiYmYS5mKGEuYik7eChhKX1mdW5jdGlvbiBtKGEsYil7dm9pZCAwPT09YS5hJiYoYS5iPWIsYS5hPTEsMCE9PWEuZS5sZW5ndGgmJnIoeCxhKSl9ZnVuY3Rpb24gZyhhLGIpe3ZvaWQgMD09PWEuYSYmKGEuYT0yLGEuYj1iLHIoTSxhKSl9ZnVuY3Rpb24gdShhLGIsYyxkKXt2YXIgZT1hLmUsZj1lLmxlbmd0aDthLmY9bnVsbDtlW2ZdPWI7ZVtmKzFdPWM7ZVtmKzJdPWQ7MD09PWYmJmEuYSYmcih4LGEpfWZ1bmN0aW9uIHgoYSl7dmFyIGI9YS5lLGM9YS5hO2lmKDAhPT1iLmxlbmd0aCl7Zm9yKHZhciBkLGUsZj1hLmIsZz0wO2c8Yi5sZW5ndGg7Zys9MylkPWJbZ10sZT1iW2crY10sZD9DKGMsZCxlLGYpOmUoZik7YS5lLmxlbmd0aD0wfX1mdW5jdGlvbiBEKCl7dGhpcy5lcnJvcj1cbm51bGx9ZnVuY3Rpb24gQyhhLGIsYyxkKXt2YXIgZT1zKGMpLGYsayxoLGw7aWYoZSl7dHJ5e2Y9YyhkKX1jYXRjaChuKXt5LmVycm9yPW4sZj15fWY9PT15PyhsPSEwLGs9Zi5lcnJvcixmPW51bGwpOmg9ITA7aWYoYj09PWYpe2coYixuZXcgVHlwZUVycm9yKFwiQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLlwiKSk7cmV0dXJufX1lbHNlIGY9ZCxoPSEwO3ZvaWQgMD09PWIuYSYmKGUmJmg/cShiLGYpOmw/ZyhiLGspOjE9PT1hP20oYixmKToyPT09YSYmZyhiLGYpKX1mdW5jdGlvbiBOKGEsYil7dHJ5e2IoZnVuY3Rpb24oYil7cShhLGIpfSxmdW5jdGlvbihiKXtnKGEsYil9KX1jYXRjaChjKXtnKGEsYyl9fWZ1bmN0aW9uIGsoYSxiLGMsZCl7dGhpcy5uPWE7dGhpcy5jPW5ldyBhKHAsZCk7dGhpcy5pPWM7dGhpcy5vKGIpPyh0aGlzLm09Yix0aGlzLmQ9dGhpcy5sZW5ndGg9Yi5sZW5ndGgsdGhpcy5sKCksMD09PXRoaXMubGVuZ3RoP20odGhpcy5jLFxudGhpcy5iKToodGhpcy5sZW5ndGg9dGhpcy5sZW5ndGh8fDAsdGhpcy5rKCksMD09PXRoaXMuZCYmbSh0aGlzLmMsdGhpcy5iKSkpOmcodGhpcy5jLHRoaXMucCgpKX1mdW5jdGlvbiBoKGEpe08rKzt0aGlzLmI9dGhpcy5hPXZvaWQgMDt0aGlzLmU9W107aWYocCE9PWEpe2lmKCFzKGEpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yXCIpO2lmKCEodGhpcyBpbnN0YW5jZW9mIGgpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7Tih0aGlzLGEpfX12YXIgRT1BcnJheS5pc0FycmF5P0FycmF5LmlzQXJyYXk6ZnVuY3Rpb24oYSl7cmV0dXJuXCJbb2JqZWN0IEFycmF5XVwiPT09XG5PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYSl9LGw9MCx3PVwidW5kZWZpbmVkXCIhPT10eXBlb2Ygd2luZG93P3dpbmRvdzp7fSxCPXcuTXV0YXRpb25PYnNlcnZlcnx8dy5XZWJLaXRNdXRhdGlvbk9ic2VydmVyLHc9XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBVaW50OENsYW1wZWRBcnJheSYmXCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBpbXBvcnRTY3JpcHRzJiZcInVuZGVmaW5lZFwiIT09dHlwZW9mIE1lc3NhZ2VDaGFubmVsLG49QXJyYXkoMUUzKSxBO0E9XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBwcm9jZXNzJiZcIltvYmplY3QgcHJvY2Vzc11cIj09PXt9LnRvU3RyaW5nLmNhbGwocHJvY2Vzcyk/RigpOkI/RygpOnc/SCgpOkkoKTt2YXIgdj1uZXcgRCx5PW5ldyBEO2sucHJvdG90eXBlLm89ZnVuY3Rpb24oYSl7cmV0dXJuIEUoYSl9O2sucHJvdG90eXBlLnA9ZnVuY3Rpb24oKXtyZXR1cm4gRXJyb3IoXCJBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXlcIil9O2sucHJvdG90eXBlLmw9XG5mdW5jdGlvbigpe3RoaXMuYj1BcnJheSh0aGlzLmxlbmd0aCl9O2sucHJvdG90eXBlLms9ZnVuY3Rpb24oKXtmb3IodmFyIGE9dGhpcy5sZW5ndGgsYj10aGlzLmMsYz10aGlzLm0sZD0wO3ZvaWQgMD09PWIuYSYmZDxhO2QrKyl0aGlzLmooY1tkXSxkKX07ay5wcm90b3R5cGUuaj1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMubjtcIm9iamVjdFwiPT09dHlwZW9mIGEmJm51bGwhPT1hP2EuY29uc3RydWN0b3I9PT1jJiZ2b2lkIDAhPT1hLmE/KGEuZj1udWxsLHRoaXMuZyhhLmEsYixhLmIpKTp0aGlzLnEoYy5yZXNvbHZlKGEpLGIpOih0aGlzLmQtLSx0aGlzLmJbYl09dGhpcy5oKGEpKX07ay5wcm90b3R5cGUuZz1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5jO3ZvaWQgMD09PWQuYSYmKHRoaXMuZC0tLHRoaXMuaSYmMj09PWE/ZyhkLGMpOnRoaXMuYltiXT10aGlzLmgoYykpOzA9PT10aGlzLmQmJm0oZCx0aGlzLmIpfTtrLnByb3RvdHlwZS5oPWZ1bmN0aW9uKGEpe3JldHVybiBhfTtcbmsucHJvdG90eXBlLnE9ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzO3UoYSx2b2lkIDAsZnVuY3Rpb24oYSl7Yy5nKDEsYixhKX0sZnVuY3Rpb24oYSl7Yy5nKDIsYixhKX0pfTt2YXIgTz0wO2guYWxsPWZ1bmN0aW9uKGEsYil7cmV0dXJuKG5ldyBrKHRoaXMsYSwhMCxiKSkuY307aC5yYWNlPWZ1bmN0aW9uKGEsYil7ZnVuY3Rpb24gYyhhKXtxKGUsYSl9ZnVuY3Rpb24gZChhKXtnKGUsYSl9dmFyIGU9bmV3IHRoaXMocCxiKTtpZighRShhKSlyZXR1cm4gKGcoZSxuZXcgVHlwZUVycm9yKFwiWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLlwiKSksIGUpO2Zvcih2YXIgZj1hLmxlbmd0aCxoPTA7dm9pZCAwPT09ZS5hJiZoPGY7aCsrKXUodGhpcy5yZXNvbHZlKGFbaF0pLHZvaWQgMCxjLGQpO3JldHVybiBlfTtoLnJlc29sdmU9ZnVuY3Rpb24oYSxiKXtpZihhJiZcIm9iamVjdFwiPT09dHlwZW9mIGEmJmEuY29uc3RydWN0b3I9PT10aGlzKXJldHVybiBhO3ZhciBjPW5ldyB0aGlzKHAsYik7XG5xKGMsYSk7cmV0dXJuIGN9O2gucmVqZWN0PWZ1bmN0aW9uKGEsYil7dmFyIGM9bmV3IHRoaXMocCxiKTtnKGMsYSk7cmV0dXJuIGN9O2gucHJvdG90eXBlPXtjb25zdHJ1Y3RvcjpoLHRoZW46ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLmE7aWYoMT09PWMmJiFhfHwyPT09YyYmIWIpcmV0dXJuIHRoaXM7dmFyIGQ9bmV3IHRoaXMuY29uc3RydWN0b3IocCksZT10aGlzLmI7aWYoYyl7dmFyIGY9YXJndW1lbnRzW2MtMV07cihmdW5jdGlvbigpe0MoYyxkLGYsZSl9KX1lbHNlIHUodGhpcyxkLGEsYik7cmV0dXJuIGR9LFwiY2F0Y2hcIjpmdW5jdGlvbihhKXtyZXR1cm4gdGhpcy50aGVuKG51bGwsYSl9fTt2YXIgej17UHJvbWlzZTpoLHBvbHlmaWxsOmZ1bmN0aW9uKCl7dmFyIGE7YT1cInVuZGVmaW5lZFwiIT09dHlwZW9mIGdsb2JhbD9nbG9iYWw6XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiB3aW5kb3cmJndpbmRvdy5kb2N1bWVudD93aW5kb3c6c2VsZjtcIlByb21pc2VcImluIGEmJlwicmVzb2x2ZVwiaW5cbmEuUHJvbWlzZSYmXCJyZWplY3RcImluIGEuUHJvbWlzZSYmXCJhbGxcImluIGEuUHJvbWlzZSYmXCJyYWNlXCJpbiBhLlByb21pc2UmJmZ1bmN0aW9uKCl7dmFyIGI7bmV3IGEuUHJvbWlzZShmdW5jdGlvbihhKXtiPWF9KTtyZXR1cm4gcyhiKX0oKXx8KGEuUHJvbWlzZT1oKX19O1wiZnVuY3Rpb25cIj09PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIHp9KTpcInVuZGVmaW5lZFwiIT09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ejpcInVuZGVmaW5lZFwiIT09dHlwZW9mIHRoaXMmJih0aGlzLkVTNlByb21pc2U9eil9KS5jYWxsKHRoaXMpO1xuIiwiLyoqXG4gKiBAbmFtZSBqYW1lcyBvciB0b2JpXG4gKiBAbW9kdWxlIGphbWVzXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGphbWVzIC0gdG9iaXQgaGVscGVyIGxpYnJhcnlcbiAqIEhlbHBlciBsaWJyYXJ5IHN1cHBvcnRpbmcgdGhlIENoYXlucyBBUElcbiAqL1xuXG4vLyBUT0RPOiBtb3ZlIGFsbCB0byBoZWxwZXIuanMgb3IgdG9iaS9qYW1zXG4vLyBUT0RPOiBoZWxwZXIuanMgd2l0aCBFUzYgYW5kIGphc21pbmUgKGFuZCBvciB0YXBlKVxuLy8gaW5jbHVkZSBoZWxwZXIgYXMgbWFpbiBtb2R1bGVcblxuLy8gaW1wb3J0YW50IGlzKiBmdW5jdGlvbnNcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvaXMnO1xuXG4vLyBleHRlbmQgb2JqZWN0IGZ1bmN0aW9uXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2V4dGVuZCc7XG5cbi8vIG1vZGVybml6ZXJcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9tb2Rlcm5pemVyJztcblxuLy8gcHJvbWlzZSBRXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvcHJvbWlzZSc7XG5cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvaHR0cCc7XG5cbi8vIEJyb3dzZXIgQVBJcyAod2luZG93LCBkb2N1bWVudCwgbG9jYXRpb24pXG4vLyBUT0RPOiBjb25zaWRlciB0byBub3QgYmluZCBicm93c2VyIHRvIHRoZSB1dGlscyBgT2JqZWN0YFxuLyoganNoaW50IC1XMTE2ICovXG4vKiBqc2hpbnQgLVcwMzMgKi9cbi8vIGpzY3M6ZGlzYWJsZSBwYXJzZUVycm9yXG5pbXBvcnQgKiBhcyBicm93c2VyIGZyb20gJy4vdXRpbHMvYnJvd3Nlcic7IC8vbm9pbnNwZWN0aW9uIEJhZEV4cHJlc3Npb25TdGF0ZW1lbnRKUyBqc2hpbnQgaWdub3JlOiBsaW5lXG4vLyBqc2NzOmVuYWJsZSBwYXJzZUVycm9yXG4vKiBqc2hpbnQgK1cwMzMgKi9cbi8qIGpzaGludCArVzExNiAqL1xuZXhwb3J0IHticm93c2VyfTtcblxuLy8gRE9NXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2RvbSc7XG5cbi8vIExvZ2dlclxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9sb2dnZXInO1xuXG4vLyBBbmFseXRpY3Ncbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9hbmFseXRpY3MnO1xuXG4vLyBSZW1vdGVcbi8vIHJlbW90ZSBkZWJ1Z2dpbmcgYW5kIGFuYWx5c2lzXG5cbi8vIGZyb250LWVuZCBFcnJvciBIYW5kbGVyIChjYXRjaGVzIGVycm9ycywgaWRlbnRpZnkgYW5kIGFuYWx5c2VzIHRoZW0pXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Vycm9yJztcblxuLy8gYXV0aCAmIEpXVCBoYW5kbGVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvand0JztcblxuLy8gY29va2llIGhhbmRsZXIgKHdpbGwgYmUgdXNlZCBpbiB0aGUgbG9jYWxfc3RvcmFnZSBhcyBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9jb29raWVfaGFuZGxlcic7XG5cbi8vIGxvY2FsU3RvcmFnZSBoZWxwZXIgKHdoaWNoIGNvb2tpZSBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sb2NhbF9zdG9yYWdlJztcblxuLy8gbWljcm8gZXZlbnQgbGlicmFyeVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9ldmVudHMnO1xuXG4vLyBvZmZsaW5lIGNhY2hlIGhlbHBlclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL29mZmxpbmVfY2FjaGUnO1xuXG4vLyBub3RpZmljYXRpb25zOiB0b2FzdHMsIGFsZXJ0cywgbW9kYWwgcG9wdXBzLCBuYXRpdmUgcHVzaFxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL25vdGlmaWNhdGlvbnMnO1xuXG4vLyBpZnJhbWUgY29tbXVuaWNhdGlvbiBhbmQgaGVscGVyIChDT1JTKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lmcmFtZSc7XG5cbi8vIHBhZ2UgdmlzaWJpbGl0eSBBUElcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9wYWdlX3Zpc2liaWxpdHknO1xuXG4vLyBEYXRlVGltZSBoZWxwZXIgKGNvbnZlcnRzIGRhdGVzLCBDIyBkYXRlLCB0aW1lc3RhbXBzLCBpMThuLCB0aW1lIGFnbylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9kYXRldGltZSc7XG5cblxuLy8gbGFuZ3VhZ2UgQVBJIGkxOG5cbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sYW5ndWFnZSc7XG5cbi8vIGNyaXRpY2FsIGNzc1xuXG4vLyBsb2FkQ1NTXG5cbi8vIGxhenkgbG9hZGluZ1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xhenlfbG9hZGluZyc7XG5cbi8vIChpbWFnZSkgcHJlbG9hZGVyXG4vL2V4cG9ydCAqIGZyb20gJy91dGlscy9wcmVsb2FkZXInO1xuXG4vLyBpc1BlbWl0dGVkIEFwcCBWZXJzaW9uIGNoZWNrXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lzX3Blcm1pdHRlZCc7XG5cblxuLy8gaW4gRnV0dXJlXG4vLyBpbW11dGFibGVcbi8vIHdlYWsgbWFwc1xuLy8gb2JzZXJ2ZXJcbi8vIHdlYiBzb2NrZXRzICh3cywgU2lnbmFsUilcbi8vIHdvcmtlciAoc2hhcmVkIHdvcmtlciwgbGF0ZXIgc2VydmljZSB3b3JrZXIgYXMgd2VsbClcbi8vIGxvY2F0aW9uLCBwdXNoU3RhdGUsIGhpc3RvcnkgaGFuZGxlclxuLy8gY2hheW5zIHNpdGUgYW5kIGNvZGUgYW5hbHlzZXI6IGZpbmQgZGVwcmVjYXRlZCBtZXRob2RzLCBiYWQgY29kZSwgaXNzdWVzIGFuZCBib3R0bGVuZWNrc1xuXG4iLCIvKipcbiAqIFRoaXMgbW9kdWxlIGNvbnRhaW5zIHRoZSBCcm93c2VyIEFQSXNcbiAqXG4gKi9cbi8vIFRPRE86IG1vdmUgb3V0IG9mIHV0aWxzXG52YXIgd2luID0gd2luZG93O1xuXG4vLyB1c2luZyBub2RlIGdsb2JhbCAobWFpbmx5IGZvciB0ZXN0aW5nLCBkZXBlbmRlbmN5IG1hbmFnZW1lbnQpXG52YXIgX2dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93O1xuZXhwb3J0IHtfZ2xvYmFsIGFzIGdsb2JhbH07XG5cbmV4cG9ydCB7d2luIGFzIHdpbmRvd307XG5leHBvcnQgdmFyIGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xuZXhwb3J0IHZhciBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcbmV4cG9ydCB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbmV4cG9ydCB2YXIgY2hheW5zID0gd2luZG93LmNoYXlucztcbmV4cG9ydCB2YXIgY2hheW5zQ2FsbGJhY2tzID0gd2luZG93Ll9jaGF5bnNDYWxsYmFja3M7XG5leHBvcnQgdmFyIGNoYXluc1Jvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hheW5zLXJvb3QnKTtcbmV4cG9ydCB2YXIgcGFyZW50ID0gd2luZG93LnBhcmVudDtcbmV4cG9ydCB2YXIgY29uc29sZSA9IHdpbmRvdy5jb25zb2xlOyAvLyBOT1RFOiBzaG91bGQgbm90IGJlIHVzZWQuIHVzZSBsb2dnZXIgaW5zdGVhZFxuZXhwb3J0IHZhciBnYyA9IHdpbmRvdy5nYyA/ICgpID0+IHdpbmRvdy5nYygpIDogKCkgPT4gbnVsbDtcblxuIiwiLy8gaW5zcGlyZWQgYnkgQW5ndWxhcjIncyBET01cblxuaW1wb3J0IHtkb2N1bWVudH0gZnJvbSAnLi9icm93c2VyJztcbmltcG9ydCB7aXNVbmRlZmluZWR9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgY2xhc3MgRE9NIHtcblxuICAvLyBOT1RFOiBhbHdheXMgcmV0dXJucyBhbiBhcnJheVxuICBzdGF0aWMgJChzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsLmJpbmQoZG9jdW1lbnQpO1xuICB9XG5cbiAgLy8gc2VsZWN0b3JzXG4gIHN0YXRpYyBxdWVyeShzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvcihlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5U2VsZWN0b3JBbGwoZWwsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBvbihlbCwgZXZ0LCBsaXN0ZW5lcikge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZ0LCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY2xvbmUobm9kZSkge1xuICAgIHJldHVybiBub2RlLmNsb25lTm9kZSh0cnVlKTtcbiAgfVxuICBzdGF0aWMgaGFzUHJvcGVydHkoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBuYW1lIGluIGVsZW1lbnQ7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlDbGFzc05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUobmFtZSk7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlUYWdOYW1lKGVsZW1lbnQsIG5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShuYW1lKTtcbiAgfVxuXG4gIC8vIGlucHV0XG4gIHN0YXRpYyBnZXRJbm5lckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwuaW5uZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBnZXRPdXRlckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwub3V0ZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBzZXRIVE1MKGVsLCB2YWx1ZSkge1xuICAgIGVsLmlubmVySFRNTCA9IHZhbHVlO1xuICB9XG4gIHN0YXRpYyBnZXRUZXh0KGVsKSB7XG4gICAgcmV0dXJuIGVsLnRleHRDb250ZW50O1xuICB9XG4gIHN0YXRpYyBzZXRUZXh0KGVsLCB2YWx1ZSkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH1cblxuICAvLyBpbnB1dCB2YWx1ZVxuICBzdGF0aWMgZ2V0VmFsdWUoZWwpIHtcbiAgICByZXR1cm4gZWwudmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldFZhbHVlKGVsLCB2YWx1ZSkge1xuICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gIH1cblxuICAvLyBjaGVja2JveGVzXG4gIHN0YXRpYyBnZXRDaGVja2VkKGVsKSB7XG4gICAgcmV0dXJuIGVsLmNoZWNrZWQ7XG4gIH1cbiAgc3RhdGljIHNldENoZWNrZWQoZWwsIHZhbHVlKSB7XG4gICAgZWwuY2hlY2tlZCA9IHZhbHVlO1xuICB9XG5cbiAgLy8gY2xhc3NcbiAgc3RhdGljIGNsYXNzTGlzdChlbGVtZW50KSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsZW1lbnQuY2xhc3NMaXN0LCAwKTtcbiAgfVxuICBzdGF0aWMgYWRkQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUNsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICB9XG4gIHN0YXRpYyBoYXNDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgfVxuXG4gIC8vIGNzc1xuICBzdGF0aWMgY3NzKGVsZW1lbnQsIHN0eWxlTmFtZSwgc3R5bGVWaGFzYWx1ZSkge1xuICAgIGlmKGlzVW5kZWZpbmVkKHN0eWxlVmFsdWUpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICAgIH1cbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyBzZXRDU1MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZhbHVlKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gc3R5bGVWYWx1ZTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IG51bGw7XG4gIH1cbiAgc3RhdGljIGdldENTUyhlbGVtZW50LCBzdHlsZU5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBkb2M9ZG9jdW1lbnQpIHtcbiAgICByZXR1cm4gZG9jLmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIH1cblxuICBzdGF0aWMgcmVtb3ZlKGVsKSB7XG4gICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudE5vZGU7XG4gICAgcGFyZW50LnJlbW92ZUNoaWxkKGVsKTtcbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICBzdGF0aWMgYXBwZW5kQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5hcHBlbmRDaGlsZChub2RlKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5yZW1vdmVDaGlsZChub2RlKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRCZWZvcmUoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbCk7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0QWZ0ZXIoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbC5uZXh0U2libGluZyk7XG4gIH1cblxuICBzdGF0aWMgdGFnTmFtZShlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIGF0dHJpYnV0ZXNcbiAgc3RhdGljIGdldEF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxuICBzdGF0aWMgc2V0QXR0cmlidXRlKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVBdHRyaWJ1dGUoZWxlbWVudCwgYXR0cmlidXRlKSB7XG4gICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gIH1cbn1cbiIsIi8qKlxuICogRXJyb3IgSGFuZGxlciBNb2R1bGVcbiAqL1xuXG4vLyBUT0RPOiBjb25zaWRlciBpbXBvcnRpbmcgZnJvbSAnLi91dGlscycgb25seVxuaW1wb3J0IHt3aW5kb3cgYXMgd2lufSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuLi9jaGF5bnMvY29uZmlnJztcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVycm9yJyk7XG5cbndpbi5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICBsZXQgbGluZUFuZENvbHVtbkluZm8gPVxuICAgIGVyci5jb2xub1xuICAgICAgPyAnIGxpbmU6JyArIGVyci5saW5lbm8gKyAnLCBjb2x1bW46JyArIGVyci5jb2xub1xuICAgICAgOiAnIGxpbmU6JyArIGVyci5saW5lbm87XG5cbiAgbGV0IGZpbmFsRXJyb3IgPSBbXG4gICAgICAnSmF2YVNjcmlwdCBFcnJvcicsXG4gICAgICBlcnIubWVzc2FnZSxcbiAgICAgIGVyci5maWxlbmFtZSArIGxpbmVBbmRDb2x1bW5JbmZvICsgJyAtPiAnICsgIG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAwLFxuICAgICAgdHJ1ZVxuICBdO1xuXG4gIC8vIFRPRE86IGFkZCBwcm9wZXIgRXJyb3IgSGFuZGxlclxuICBsb2cud2FybihmaW5hbEVycm9yKTtcbiAgaWYoQ29uZmlnLmdldCgncHJldmVudEVycm9ycycpKSB7XG4gICAgZXJyLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufSk7XG4iLCIvLyBUT0RPOiByZWZhY3RvciBhbmQgd3JpdGUgdGVzdHNcbi8vIFRPRE86IGFkZCBleGFtcGxlXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuIGBgYGpzXG4gLy8gRGVtb1xuXG4gZXZlbnRzLnB1Ymxpc2goJy9wYWdlL2xvYWQnLCB7XG5cdHVybDogJy9zb21lL3VybC9wYXRoJyAvLyBhbnkgYXJndW1lbnRcbn0pO1xuXG4gdmFyIHN1YnNjcmlwdGlvbiA9IGV2ZW50cy5zdWJzY3JpYmUoJy9wYWdlL2xvYWQnLCBmdW5jdGlvbihvYmopIHtcblx0Ly8gRG8gc29tZXRoaW5nIG5vdyB0aGF0IHRoZSBldmVudCBoYXMgb2NjdXJyZWRcbn0pO1xuXG4gLy8gLi4uc29tZXRpbWUgbGF0ZXIgd2hlcmUgSSBubyBsb25nZXIgd2FudCBzdWJzY3JpcHRpb24uLi5cbiBzdWJzY3JpcHRpb24ucmVtb3ZlKCk7XG5cbiAvLyAgdmFyIHRhcmdldCA9IHdpbmRvdy5ldmVudCA/IHdpbmRvdy5ldmVudC5zcmNFbGVtZW50IDogZSA/IGUudGFyZ2V0IDogbnVsbDtcbiBgYGBcbiAqL1xuZXhwb3J0IHZhciBldmVudHMgPSAoZnVuY3Rpb24oKSB7XG4gIGxldCB0b3BpY3MgPSB7fTtcbiAgbGV0IG93blByb3BlcnR5ID0gdG9waWNzLmhhc093blByb3BlcnR5O1xuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlOiBmdW5jdGlvbih0b3BpYywgbGlzdGVuZXIpIHtcbiAgICAgIC8vIENyZWF0ZSB0aGUgdG9waWMncyBvYmplY3QgaWYgbm90IHlldCBjcmVhdGVkXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgdG9waWNzW3RvcGljXSA9IFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICBsZXQgaW5kZXggPSB0b3BpY3NbdG9waWNdLnB1c2gobGlzdGVuZXIpIC0xO1xuXG4gICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICByZXR1cm4ge1xuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlbGV0ZSB0b3BpY3NbdG9waWNdW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9LFxuXG4gICAgcHVibGlzaDogZnVuY3Rpb24odG9waWMsIGluZm8pIHtcbiAgICAgIC8vIElmIHRoZSB0b3BpYyBkb2Vzbid0IGV4aXN0LCBvciB0aGVyZSdzIG5vIGxpc3RlbmVycyBpbiBxdWV1ZSwganVzdCBsZWF2ZVxuICAgICAgaWYgKCFvd25Qcm9wZXJ0eS5jYWxsKHRvcGljcywgdG9waWMpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3ljbGUgdGhyb3VnaCB0b3BpY3MgcXVldWUsIGZpcmUhXG4gICAgICB0b3BpY3NbdG9waWNdLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpdGVtKGluZm8gIT09IHVuZGVmaW5lZCA/IGluZm8gOiB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbn0pKCk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmV4dGVuZFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRXh0ZW5kcyB0aGUgZGVzdGluYXRpb24gb2JqZWN0IGJ5IGNvcHlpbmcgcHJvcGVydGllcyBmcm9tIHRoZSBzcmMgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5cbmltcG9ydCB7aXNPYmplY3R9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKG9iaikge1xuICBpZiAoIWlzT2JqZWN0KG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIHZhciBzb3VyY2UsIHByb3A7XG4gIGZvciAodmFyIGkgPSAxLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgZm9yIChwcm9wIGluIHNvdXJjZSkge1xuICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufVxuIiwiaW1wb3J0IHt3aW5kb3d9IGZyb20gJy4vYnJvd3Nlcic7XG5pbXBvcnQge3Byb21pc2UsIGRlZmVycmVkfSBmcm9tICcuL3Byb21pc2UnO1xuXG5leHBvcnQgZnVuY3Rpb24gZmV0Y2goKSB7XG5cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZldGNoSlNPTigpIHtcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gcG9zdCgpIHtcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gdXBsb2FkKCkge1xuXG59XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmlzVW5kZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyB1bmRlZmluZWQuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHVuZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzRGVmaW5lZFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGVmaW5lZCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc1ByZXNlbnRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIG5laXRoZXIgdW5kZWZpbmVkIG5vciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBwcmVzZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmVzZW50KG9iaikge1xuICByZXR1cm4gb2JqICE9PSB1bmRlZmluZWQgJiYgb2JqICE9PSBudWxsO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQmxhbmtcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGVpdGhlciB1bmRlZmluZWQgb3IgbnVsbC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYmxhbmsuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JsYW5rKG9iaikge1xuICByZXR1cm4gb2JqID09PSB1bmRlZmluZWQgfHwgb2JqID09PSBudWxsO1xufVxuXG5cbi8qKlxuKiBAbmFtZSBqYW1lcy5pc1N0cmluZ1xuKiBAbW9kdWxlIGphbWVzXG4qIEBraW5kIGZ1bmN0aW9uXG4qXG4qIEBkZXNjcmlwdGlvblxuKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFN0cmluZ2AuXG4qXG4qIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYFN0cmluZ2AuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzTnVtYmVyXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBOdW1iZXJgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBOdW1iZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNPYmplY3RcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYE9iamVjdGAuXG4gKiBudWxsIGlzIG5vdCB0cmVhdGVkIGFzIGFuIG9iamVjdC5cbiAqIEluIEpTIGFycmF5cyBhcmUgb2JqZWN0c1xuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYE9iamVjdGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0FycmF5XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGFuIGBBcnJheWAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGFuIGBBcnJheWAuXG4gKi9cbmV4cG9ydCB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNGdW5jdGlvblxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgRnVuY3Rpb25gLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBGdW5jdGlvbmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEYXRlXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHZhbHVlIGlzIGEgZGF0ZS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgRGF0ZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RhdGUodmFsdWUpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5cbi8vIFRPRE86IGRvZXMgbm90IGJlbG9uZyBpbiBoZXJlXG4vKipcbiAqIEBuYW1lIHV0aWxzLnRyaW1cbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUmVtb3ZlcyB3aGl0ZXNwYWNlcy5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtTdHJpbmd8Kn0gVHJpbW1lZCAgdmFsdWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyaW0odmFsdWUpIHtcbiAgcmV0dXJuIGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKSA6IHZhbHVlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzVVVJRFxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFVVSURgIChPU0YpLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBVVUlEYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVVVJRCh2YWx1ZSkge1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB0cmltKHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWUubWF0Y2goL15bMC05YS1mXXs0fShbMC05YS1mXXs0fS0pezR9WzAtOWEtel17MTJ9JC9pKSAhPT0gbnVsbDtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNHVUlEXG4gKiBAYWxpYXMgdXRpbHMuaXNVVUlEXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgR1VJRGAgKE1pY3Jvc29mdCBTdGFuZGFyZCkuXG4gKiBJcyBhbiBhbGlhcyB0byBpc1VVSURcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgR1VJRGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0dVSUQodmFsdWUpIHtcbiAgcmV0dXJuIGlzVVVJRCh2YWx1ZSk7XG59XG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzTWFjQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE1BQyBBZGRyZXNzYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNYWNBZGRyZXNzKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXihbMC05YS1mXXsyfVstOl0pezV9WzAtOWEtZl17Mn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0JMRUFkZHJlc3NcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBCTEUgQWRkcmVzc2BcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgQkxFIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCTEVBZGRyZXNzKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpIHx8IGlzTWFjQWRkcmVzcyh2YWx1ZSk7XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3R9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5pc19wZXJtaXR0ZWQnKTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBjdXJyZW50IHVzZXIncyBPUyBhbmQgT1MgVmVyc2lvbiBpcyBoaWdoZXJcbiAqIG9yIGVxdWFsIHRvIHRoZSBwYXNzZWQgcmVmZXJlbmNlIGBPYmplY3RgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJzaW9ucyBWZXJzaW9ucyBgT2JqZWN0YCB3aXRoIHBlcm1pdHRlZCBPU3MgYW5kIHRoZWlyIHZlcnNpb24uXG4gKiBAcGFyYW0ge3N0cmluZ30gb3MgT1MgTmFtZSBhcyBsb3dlcmNhc2Ugc3RyaW5nLlxuICogQHBhcmFtIHtJbnRlZ2VyfSBhcHBWZXJzaW9uIEFwcCBWZXJzaW9uIE51bWJlciBhcyBJbnRlZ2VyICBUT0RPOiBmb3JtYXQgUkZDP1xuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGN1cnJlbnQgT1MgJiBWZXJzaW9uIGFyZSBkZWZpbmVkIGluIHRoZSB2ZXJzaW9ucyBgT2JqZWN0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIG9zLCBhcHBWZXJzaW9uKSB7XG5cbiAgaWYgKCF2ZXJzaW9ucyB8fCAhaXNPYmplY3QodmVyc2lvbnMpKSB7XG4gICAgbG9nLndhcm4oJ25vIHZlcnNpb25zIGBPYmplY3RgIHdhcyBwYXNzZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbnNbb3NdICYmIGFwcFZlcnNpb24gPj0gdmVyc2lvbnNbb3NdO1xufVxuIiwiLyoqXG4gKiBMb2dMZXZlbCBFbnVtXG4gKiBub25lIGlzIDBcbiAqIGRlYnVnIGlzIDRcbiAqIEB0eXBlIEVudW1cbiAqL1xuZXhwb3J0IHZhciBsZXZlbHMgPSB7XG4gIG5vbmU6IDAsXG4gIGVycm9yOjEsXG4gIHdhcm46MixcbiAgaW5mbzozLFxuICBkZWJ1Zzo0XG59O1xuXG4vKipcbiAqIENhbiBzdG9yZSBtdWx0aXBsZSBsb2dnZXJzXG4gKiBAdHlwZSB7YE9iamVjdGB9IGxvZ2dlcnNcbiAqL1xubGV0IGxvZ2dlcnMgPSB7fTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEFzc2lnbiB0aGUgbG9nZ2VyIG1ldGhvZC5cbiAqIEJ5IGRlZmF1bHQgdGhlIHdpbmRvdy5jb25zb2xlIGBPYmplY3RgXG4gKiBAdHlwZSBgd2luZG93LmNvbnNvbGVgXG4gKi9cbmxldCBsb2dnZXIgPSB3aW5kb3cuY29uc29sZTtcblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nIExldmVsXG4gKiB1c2UgYHNldExldmVsKG5ld0xvZ0xldmVsKWAgdG8gb3ZlcndyaXRlIHRoaXMgdmFsdWUuXG4gKiBUT0RPOiBlYWNoIGxvZ2dlciBnZXRzIGFuIG93biBsb2dMZXZlbFxuICovXG5sZXQgbG9nTGV2ZWwgPSBsZXZlbHMubm9uZTtcblxuLyoqXG4gKlxuICogQHBhcmFtIGxldmVsXG4gKiBAcGFyYW0gYXJnc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gbG9nKGxldmVsLCBhcmdzLCBwcmVmaXgpIHtcbiAgbGV0IHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICBpZiAocHJlZml4KSB7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJncyk7XG4gICAgLy9hcmdzLnVuc2hpZnQodGltZSk7IC8vIFRPRE86IGNvbnNpZGVyIHRvZ2dsZWFibGUgdGltZVxuICAgIGFyZ3MudW5zaGlmdChwcmVmaXgpO1xuICB9XG4gIGxvZ2dlcltsZXZlbCB8fCAnbG9nJ10uYXBwbHkoY29uc29sZSwgYXJncyk7XG59XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IGxvZ0xldmVsXG4gKiBpbiBvcmRlciB0byBzaG93IG9yIG5vdCBzaG93IGxvZ3NcbiAqIEBwYXJhbSBsZXZlbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TGV2ZWwobGV2ZWwpIHtcbiAgbG9nTGV2ZWwgPSBsZXZlbDtcbn1cblxuLyoqXG4gKiBHZXQgTG9nZ2VyIFNpbmdsZXRvbiBJbnN0YW5jZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIFRoZSBMb2dnZXIncyBuYW1lXG4gKiBAcmV0dXJucyB7TG9nZ2VyfSBMb2dnZXIgaW5zdGFuY2UsIGVpdGhlciBleGlzdGluZyBvbmUgb3IgY3JlYXRlcyBhIG5ldyBvbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XG4gIHJldHVybiBsb2dnZXJzW25hbWVdIHx8IChsb2dnZXJzW25hbWVdID0gbmV3IExvZ2dlcihuYW1lKSk7XG59XG5cbi8qKlxuICogTG9nZ2VyIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuXG4gIC8qKlxuICAgKiBFYWNoIGxvZ2dlciBpcyBpZGVudGlmaWVkIGJ5IGl0J3MgbmFtZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbG9nZ2VyIChlLmcuIGBjaGF5bnMuY29yZWApXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gJ1snICsgbmFtZSArICddOiAnO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlYnVnXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZGVidWcoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2RlYnVnJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgaW5mby5cbiAgICpcbiAgICogQG1ldGhvZCBpbmZvXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgaW5mbygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnaW5mbycsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nLlxuICAgKlxuICAgKiBAbWV0aG9kIHdhcm5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICB3YXJuKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2coJ3dhcm4nLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvci5cbiAgICpcbiAgICogQG1ldGhvZCBlcnJvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGVycm9yKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdlcnJvcicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIFRPRE86IGltcGVsZW1udCBSVlNQIChvciBibHVlYmlyZCkgUHJvbWlzZSBGYWxsYmFrY1xuLy8gVE9ETzogaW1wbGVtZW50IERlZmVycmVkXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJaUlzSW1acGJHVWlPaUl2VlhObGNuTXZjSGN2VUhKdmFtVmpkSE12ZEc5aWFYUXZZMmhoZVc1ekwyTm9ZWGx1Y3k1cWN5OXpjbU12ZFhScGJITXZjSEp2YldselpTNXFjeUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiWFgwPSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhbk11dGF0aW9uT2JzZXJ2ZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuXG4gICAgaWYgKGNhbk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgdmFyIGhpZGRlbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxdWV1ZUxpc3QgPSBxdWV1ZS5zbGljZSgpO1xuICAgICAgICAgICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHF1ZXVlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShoaWRkZW5EaXYsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaGlkZGVuRGl2LnNldEF0dHJpYnV0ZSgneWVzJywgJ25vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJcbmltcG9ydCB7Y2hheW5zfSBmcm9tICcuL2NoYXlucyc7XG5leHBvcnQgZGVmYXVsdCBjaGF5bnM7XG4iXX0=
  return require('chayns');

});
