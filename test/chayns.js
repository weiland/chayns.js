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

},{"./chayns/chayns_api_interface":3,"./chayns/chayns_calls":4,"./chayns/config":5,"./chayns/core":6,"./chayns/environment":7,"./chayns/user":8,"./lib/fetch_polyfill":9,"./utils":10}],2:[function(require,module,exports){
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

},{"../utils":10,"../utils/browser":11}],3:[function(require,module,exports){
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

},{"../utils":10,"../utils/browser":11,"./chayns_calls":4}],4:[function(require,module,exports){
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

},{"../utils":10,"../utils/browser":11,"./callbacks":2,"./environment":7}],5:[function(require,module,exports){
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

},{"../utils":10}],6:[function(require,module,exports){
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

},{"../utils":10,"./callbacks":2,"./chayns_api_interface":3,"./config":5}],7:[function(require,module,exports){
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

},{"../utils":10}],8:[function(require,module,exports){
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

},{"./utils/browser":11,"./utils/dom":12,"./utils/error":13,"./utils/events":14,"./utils/extend":15,"./utils/http":16,"./utils/is":17,"./utils/is_permitted":18,"./utils/logger":19}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
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

},{"./browser":11,"./is":17}],13:[function(require,module,exports){
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

},{"../chayns/config":5,"./browser":11,"./logger":19}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"./is":17}],16:[function(require,module,exports){
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

},{"./browser":11,"./promise":20}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"../utils":10}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
"use strict";

// TODO: impelemnt RVSP (or bluebird) Promise Fallbakc
// TODO: implement Deferred

},{}],"chayns":[function(require,module,exports){
"use strict";

var chayns = require("./chayns").chayns;

module.exports = chayns;

},{"./chayns":1}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdXNlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9saWIvZmV0Y2hfcG9seWZpbGwuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9kb20uanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXJyb3IuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXZlbnRzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2V4dGVuZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9odHRwLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzX3Blcm1pdHRlZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9sb2dnZXIuanMiLCJzcmMvdXRpbHMvcHJvbWlzZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMtdW1kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7O0lDT1ksS0FBSyxtQ0FBb0IsU0FBUzs7QUFDOUMsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQzs7O0FBRzFCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Ozs7SUFHVixNQUFNLFdBQXVCLGlCQUFpQixFQUE5QyxNQUFNOzs7O0lBR04sV0FBVyxXQUFrQixzQkFBc0IsRUFBbkQsV0FBVzs7OztJQUdYLElBQUksV0FBeUIsZUFBZSxFQUE1QyxJQUFJOztRQUVMLHNCQUFzQjs7OzswQkFHUSxlQUFlOztJQUE1QyxLQUFLLGVBQUwsS0FBSztJQUFFLFFBQVEsZUFBUixRQUFRO0lBQUUsS0FBSyxlQUFMLEtBQUs7Ozs7SUFJdEIsT0FB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LENBQUM7T0FDbkM7Ozs7QUFTRCxRQUFJOzs7Ozs7Ozs7YUFBQSxnQkFBRztBQUNMLFlBQUksUUFBUSxHQUFHLENBQUMsRUFBRTtBQUNoQixpQkFBTztTQUNSOztBQUVELFdBQUcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNuQzs7OztBQVFELFNBQUs7Ozs7Ozs7OzthQUFBLGlCQUFHO0FBQ04sWUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFO0FBQ2hCLGlCQUFPO1NBQ1I7QUFDRCxXQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDcEM7Ozs7OztTQTlEVSxNQUFNOzs7Ozs7OztBQ3hFbkI7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztJQ0hRLE1BQU0sV0FBTyxVQUFVLEVBQXZCLE1BQU07O2lCQUNDLE1BQU0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAbmFtZSBjaGF5bnMgQVBJXG4gKiBAbW9kdWxlIGNoYXluc1xuICovXG5cbi8vIGhlbHBlclxuLy8gVE9ETzogZWl0aGVyIGluZGV4LmpzLCB1dGlscy5qcyBvciBqdXN0IHRoZSBzaW5nbGUgZmlsZXNcbmltcG9ydCAqIGFzIHV0aWxzICAgICAgICAgICAgICAgZnJvbSAnLi91dGlscyc7XG52YXIgZXh0ZW5kID0gdXRpbHMuZXh0ZW5kO1xuXG4vLyBzZXQgbG9nTGV2ZWwgdG8gaW5mb1xudXRpbHMuc2V0TGV2ZWwoNCk7IC8vIFRPRE86IGRvbid0IHNldCB0aGUgbGV2ZWwgaGVyZVxuXG4vLyBiYXNpYyBjb25maWdcbmltcG9ydCB7Y29uZmlnfSAgICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY29uZmlnJztcblxuLy8gZW52aXJvbm1lbnRcbmltcG9ydCB7ZW52aXJvbm1lbnR9ICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvZW52aXJvbm1lbnQnO1xuXG4vLyAoY3VycmVudCkgdXNlclxuaW1wb3J0IHt1c2VyfSAgICAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy91c2VyJztcblxuaW1wb3J0ICcuL2xpYi9mZXRjaF9wb2x5ZmlsbCc7XG5cbi8vIGNvcmUgZnVuY3Rpb25zXG5pbXBvcnQge3JlYWR5LCByZWdpc3Rlciwgc2V0dXB9IGZyb20gJy4vY2hheW5zL2NvcmUnO1xuXG4vLyBjaGF5bnMgY2FsbHNcblxuaW1wb3J0IHthcGlDYWxsfSAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy9jaGF5bnNfY2FsbHMnO1xuXG5pbXBvcnQge2NoYXluc0FwaUludGVyZmFjZX0gICAgIGZyb20gJy4vY2hheW5zL2NoYXluc19hcGlfaW50ZXJmYWNlJztcblxuXG4vLyBwdWJsaWMgY2hheW5zIG9iamVjdFxuZXhwb3J0IHZhciBjaGF5bnMgPSB7fTtcblxuZXh0ZW5kKGNoYXlucywge2dldExvZ2dlcjogdXRpbHMuZ2V0TG9nZ2VyfSk7IC8vIGpzaGludCBpZ25vcmU6IGxpbmVcbmV4dGVuZChjaGF5bnMsIHt1dGlsc30pO1xuZXh0ZW5kKGNoYXlucywge1ZFUlNJT046ICcwLjEuMCd9KTtcbi8vZXh0ZW5kKGNoYXlucywge2NvbmZpZ30pOyAvLyBUT0RPOiB0aGUgY29uZmlnIGBPYmplY3RgIHNob3VsZCBub3QgYmUgZXhwb3NlZFxuXG5leHRlbmQoY2hheW5zLCB7ZW52OiBlbnZpcm9ubWVudH0pOyAvLyBUT0RPOiBnZW5lcmFsbHkgcmVuYW1lXG5leHRlbmQoY2hheW5zLCB7dXNlcn0pO1xuXG5leHRlbmQoY2hheW5zLCB7cmVnaXN0ZXJ9KTtcbmV4dGVuZChjaGF5bnMsIHtyZWFkeX0pO1xuXG5leHRlbmQoY2hheW5zLCB7YXBpQ2FsbH0pO1xuXG4vLyBhZGQgYWxsIGNoYXluc0FwaUludGVyZmFjZSBtZXRob2RzIGRpcmVjdGx5IHRvIHRoZSBgY2hheW5zYCBPYmplY3RcbmV4dGVuZChjaGF5bnMsIGNoYXluc0FwaUludGVyZmFjZSk7XG5cbi8vIHNldHVwIGNoYXluc1xuc2V0dXAoKTtcblxuXG4vLyBjaGF5bnMgcHVibGlzaCBubyBVTURcbi8vd2luZG93LmNoYXlucyA9IGNoYXlucztcbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc0Z1bmN0aW9uLCBpc1VuZGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHt3aW5kb3d9IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNhbGxiYWNrcycpO1xuXG5sZXQgbm9vcCA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxubGV0IGNhbGxiYWNrcyA9IHt9O1xuLyoqXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGludm9rZWRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNDaGF5bnNDYWxsIElmIHRydWUgdGhlbiB0aGUgY2FsbCB3aWxsIGJlIGFzc2lnbmVkIHRvIGBjaGF5bnMuX2NhbGxiYWNrc2BcbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHBhcmFtZXRlcnMgYXJlIHZhbGlkIGFuZCB0aGUgY2FsbGJhY2sgd2FzIHNhdmVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRDYWxsYmFjayhuYW1lLCBmbiwgaXNDaGF5bnNDYWxsKSB7XG5cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgbG9nLndhcm4oJ3NldENhbGxiYWNrOiBuYW1lIGlzIHVuZGVmaW5lZCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzRnVuY3Rpb24oZm4pKSB7XG4gICAgbG9nLndhcm4oJ3NldENhbGxiYWNrOiBmbiBpcyBubyBGdW5jdGlvbicpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChuYW1lLmluZGV4T2YoJygpJykgIT09IC0xKSB7IC8vIHN0cmlwICcoKSdcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKCcoKScsICcnKTtcbiAgfVxuXG4gIGxvZy5kZWJ1Zygnc2V0Q2FsbGJhY2s6IHNldCBDYWxsYmFjazogJyArIG5hbWUpO1xuICAvL2lmIChuYW1lIGluIGNhbGxiYWNrcykge1xuICAvLyAgY2FsbGJhY2tzW25hbWVdLnB1c2goZm4pOyAvLyBUT0RPOiByZWNvbnNpZGVyIEFycmF5IHN1cHBvcnRcbiAgLy99IGVsc2Uge1xuICAgIGNhbGxiYWNrc1tuYW1lXSA9IGZuOyAvLyBBdHRlbnRpb246IHdlIHNhdmUgYW4gQXJyYXlcbiAgLy99XG5cbiAgaWYgKGlzQ2hheW5zQ2FsbCkge1xuICAgIGxvZy5kZWJ1Zygnc2V0Q2FsbGJhY2s6IHJlZ2lzdGVyIGZuIGFzIGdsb2JhbCBjYWxsYmFjaycpO1xuICAgIHdpbmRvdy5fY2hheW5zQ2FsbGJhY2tzW25hbWVdID0gY2FsbGJhY2sobmFtZSwgJ0NoYXluc0NhbGwnKTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJlZ2lzdGVyIGNhbGxiYWNrcyBmb3IgQ2hheW5zQ2FsbHMgYW5kIENoYXluc1dlYkNhbGxzXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsYmFja05hbWUgTmFtZSBvZiB0aGUgRnVuY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIEVpdGhlciAnQ2hheW5zV2ViQ2FsbCcgb3IgJ0NoYXluc0NhbGwnXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IGhhbmRsZURhdGEgUmVjZWl2ZXMgY2FsbGJhY2sgZGF0YVxuICovXG5mdW5jdGlvbiBjYWxsYmFjayhjYWxsYmFja05hbWUsIHR5cGUpIHtcblxuICByZXR1cm4gZnVuY3Rpb24gaGFuZGxlRGF0YSgpIHtcblxuICAgIGlmIChjYWxsYmFja05hbWUgaW4gY2FsbGJhY2tzKSB7XG4gICAgICBsb2cuZGVidWcoJ2ludm9rZSBjYWxsYmFjazogJywgY2FsbGJhY2tOYW1lLCAndHlwZTonLCB0eXBlKTtcbiAgICAgIHZhciBmbiA9IGNhbGxiYWNrc1tjYWxsYmFja05hbWVdO1xuICAgICAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIC8vZGVsZXRlIGNhbGxiYWNrc1tjYWxsYmFja05hbWVdOyAvLyBUT0RPOiBjYW5ub3QgYmUgbGlrZSB0aGF0LCByZW1vdmUgYXJyYXk/XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cud2FybignY2FsbGJhY2sgaXMgbm8gZnVuY3Rpb24nLCBjYWxsYmFja05hbWUsIGZuKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmluZm8oJ2NhbGxiYWNrICcgKyBjYWxsYmFja05hbWUgKyAnIGRpZCBub3QgZXhpc3QgaW4gY2FsbGJhY2tzIGFycmF5Jyk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5fY2FsbGJhY2tzXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQ2hheW5zIENhbGwgQ2FsbGJhY2tzXG4gKiB3aWxsIGJlIGFzc2lnbmVkIHRvIHRoZSBgY2hheW5zLl9jYWxsYmFja3NgIG9iamVjdFxuICpcbiAqIEB0eXBlIHtPYmplY3R9IGNoYXluc0NhbGxzQ2FsbGJhY2tzXG4gKi9cbndpbmRvdy5fY2hheW5zQ2FsbGJhY2tzID0ge1xuICAvLy8vIFRPRE86IHdyYXAgY2FsbGJhY2sgZnVuY3Rpb24gKERSWSlcbiAgLy9nZXRHbG9iYWxEYXRhOiBjYWxsYmFjaygnZ2V0R2xvYmFsRGF0YScsICdDaGF5bnNDYWxsJykgLy8gZXhhbXBsZVxuICBnZXRHZW9Mb2NhdGlvbkNhbGxiYWNrOiBub29wXG59O1xuXG5cbi8vIFRPRE86IG1vdmUgdG8gYW5vdGhlciBmaWxlPyBjb3JlLCBjaGF5bnNfY2FsbHNcbnZhciBtZXNzYWdlTGlzdGVuaW5nID0gZmFsc2U7XG5leHBvcnQgZnVuY3Rpb24gbWVzc2FnZUxpc3RlbmVyKCkge1xuICBpZiAobWVzc2FnZUxpc3RlbmluZykge1xuICAgIGxvZy5pbmZvKCd0aGVyZSBpcyBhbHJlYWR5IG9uZSBtZXNzYWdlIGxpc3RlbmVyIG9uIHdpbmRvdycpO1xuICAgIHJldHVybjtcbiAgfVxuICBtZXNzYWdlTGlzdGVuaW5nID0gdHJ1ZTtcbiAgbG9nLmRlYnVnKCdtZXNzYWdlIGxpc3RlbmVyIGlzIHN0YXJ0ZWQnKTtcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIG9uTWVzc2FnZShlKSB7XG5cbiAgICBsb2cuZGVidWcoJ25ldyBtZXNzYWdlICcpO1xuXG4gICAgdmFyIG5hbWVzcGFjZSA9ICdjaGF5bnMuY3VzdG9tVGFiLicsXG4gICAgICBkYXRhID0gZS5kYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBkYXRhICE9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBzdHJpcCBuYW1lc3BhY2UgZnJvbSBkYXRhXG4gICAgZGF0YSA9IGRhdGEuc3Vic3RyKG5hbWVzcGFjZS5sZW5ndGgsIGRhdGEubGVuZ3RoIC0gbmFtZXNwYWNlLmxlbmd0aCk7XG4gICAgdmFyIG1ldGhvZCA9IGRhdGEubWF0Y2goL1teOl0qOi8pOyAvLyBkZXRlY3QgbWV0aG9kXG4gICAgaWYgKG1ldGhvZCAmJiBtZXRob2QubGVuZ3RoID4gMCkge1xuICAgICAgbWV0aG9kID0gbWV0aG9kWzBdO1xuXG4gICAgICB2YXIgcGFyYW1zID0gZGF0YS5zdWJzdHIobWV0aG9kLmxlbmd0aCwgZGF0YS5sZW5ndGggLSBtZXRob2QubGVuZ3RoKTtcbiAgICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwYXJhbXMgPSBKU09OLnBhcnNlKHBhcmFtcyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICB9XG5cbiAgICAgIC8vIHJlbW92ZSB0aGUgbGFzdCAnKSdcbiAgICAgIG1ldGhvZCA9IG1ldGhvZC5zdWJzdHIoMCwgbWV0aG9kLmxlbmd0aCAtIDEpO1xuXG4gICAgICAvLyB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gY2FuIGJlIGludm9rZWQgZGlyZWN0bHlcbiAgICAgIGNhbGxiYWNrKG1ldGhvZCwgJ0NoYXluc1dlYkNhbGwnKShwYXJhbXMpO1xuICAgIH1cbiAgfSk7XG59XG4iLCIvKipcbiAqIENoYXlucyBBUEkgSW50ZXJmYWNlXG4gKiBBUEkgdG8gY29tbXVuaWNhdGUgd2l0aCB0aGUgQVBQIGFuZCB0aGUgQ2hheW5zIFdlYlxuICovXG5cbmltcG9ydCB7YXBpQ2FsbH0gZnJvbSAnLi9jaGF5bnNfY2FsbHMnO1xuaW1wb3J0IHtnZXRMb2dnZXIsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNCTEVBZGRyZXNzLFxuICBpc0RhdGUsIGlzT2JqZWN0LCBpc0FycmF5LCB0cmltLCBET019IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93LCBsb2NhdGlvbn0gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7IC8vIGR1ZSB0byB3aW5kb3cub3BlbiBhbmQgbG9jYXRpb24uaHJlZlxuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnNfYXBpX2ludGVyZmFjZScpO1xuXG4vKipcbiAqIE5GQyBSZXNwb25zZSBEYXRhIFN0b3JhZ2VcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmxldCBOZmNSZXNwb25zZURhdGEgPSB7XG4gIFJGSWQ6IDAsXG4gIFBlcnNvbklkOiAwXG59O1xuXG4vKipcbiAqIFBvcHVwIEJ1dHRvblxuICogQGNsYXNzIFBvcHVwQnV0dG9uXG4gKi9cbmNsYXNzIFBvcHVwQnV0dG9uIHtcbiAgLyoqXG4gICAqIFBvcHVwIEJ1dHRvbiBDb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBQb3B1cCBCdXR0b24gbmFtZVxuICAgKi9cbiAgY29uc3RydWN0b3IobmFtZSwgY2FsbGJhY2spIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBsZXQgZWwgPSBET00uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZWwuc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtcG9wdXAnKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NoYXluc19fcG9wdXAnKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbDtcbiAgfVxuICAvKipcbiAgICogR2V0IFBvcHVwIEJ1dHRvbiBuYW1lXG4gICAqIEByZXR1cm5zIHtuYW1lfVxuICAgKi9cbiAgbmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5uYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrXG4gICAqL1xuICBjYWxsYmFjaygpIHtcbiAgICBsZXQgY2IgPSB0aGlzLmNhbGxiYWNrO1xuICAgIGxldCBuYW1lID0gY2IubmFtZTtcbiAgICBpZiAoaXNGdW5jdGlvbihjYikpIHtcbiAgICAgIGNiLmNhbGwobnVsbCwgbmFtZSk7XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBAbmFtZSB0b0hUTUxcbiAgICogUmV0dXJucyBIVE1MIE5vZGUgY29udGFpbmluZyB0aGUgUG9wdXBCdXR0b24uXG4gICAqIEByZXR1cm5zIHtQb3B1cEJ1dHRvbi5lbGVtZW50fEhUTUxOb2RlfVxuICAgKi9cbiAgdG9IVE1MKCkge1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQ7XG4gIH1cbn1cblxuLyoqXG4gKiBCZWFjb24gTGlzdFxuICogQHR5cGUge0FycmF5fG51bGx9XG4gKi9cbmxldCBiZWFjb25MaXN0ID0gbnVsbDtcblxuLyoqXG4gKiBHbG9iYWwgRGF0YSBTdG9yYWdlXG4gKiBAdHlwZSB7Ym9vbGVhbnxPYmplY3R9XG4gKi9cbmxldCBnbG9iYWxEYXRhID0gZmFsc2U7XG5cbi8qKlxuICogQWxsIHB1YmxpYyBjaGF5bnMgbWV0aG9kcyB0byBpbnRlcmFjdCB3aXRoICpDaGF5bnMgQXBwKiBvciAqQ2hheW5zIFdlYipcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmV4cG9ydCB2YXIgY2hheW5zQXBpSW50ZXJmYWNlID0ge1xuXG5cbiAgLyoqXG4gICAqIEVuYWJsZSBvciBkaXNhYmxlIFB1bGxUb1JlZnJlc2hcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBhbGxvd1B1bGwgQWxsb3cgUHVsbFRvUmVmcmVzaFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNlZWRlZFxuICAgKi9cbiAgc2V0UHVsbFRvUmVmcmVzaDogZnVuY3Rpb24oYWxsb3dQdWxsKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAwLFxuICAgICAgd2ViRm46IGZhbHNlLCAvLyBjb3VsZCBiZSBvbWl0dGVkXG4gICAgICBwYXJhbXM6IFt7J2Jvb2wnOiBhbGxvd1B1bGx9XVxuICAgIH0pO1xuICB9LFxuICAvLyBUT0RPOiByZW5hbWUgdG8gZW5hYmxlUHVsbFRvUmVmcmVzaFxuICBhbGxvd1JlZnJlc2hTY3JvbGw6IGZ1bmN0aW9uKCkge1xuICAgIGNoYXluc0FwaUludGVyZmFjZS5zZXRQdWxsVG9SZWZyZXNoKHRydWUpO1xuICB9LFxuICBkaXNhbGxvd1JlZnJlc2hTY3JvbGw6IGZ1bmN0aW9uKCkge1xuICAgIGNoYXluc0FwaUludGVyZmFjZS5zZXRQdWxsVG9SZWZyZXNoKGZhbHNlKTtcbiAgfSxcblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBbc2hvd0N1cnNvcl0gSWYgdHJ1ZSB0aGUgd2FpdGN1cnNvciB3aWxsIGJlIHNob3duXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG90aGVyd2lzZSBpdCB3aWxsIGJlIGhpZGRlblxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNldFdhaXRjdXJzb3I6IGZ1bmN0aW9uKHNob3dDdXJzb3IpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEsXG4gICAgICB3ZWJGbjogKHNob3dDdXJzb3IgPyAnc2hvdycgOiAnaGlkZScpICsgJ0xvYWRpbmdDdXJzb3InLFxuICAgICAgcGFyYW1zOiBbeydib29sJzogc2hvd0N1cnNvcn1dXG4gICAgfSk7XG4gIH0sXG4gIHNob3dXYWl0Y3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLnNldFdhaXRjdXJzb3IodHJ1ZSk7XG4gIH0sXG4gIGhpZGVXYWl0Y3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLnNldFdhaXRjdXJzb3IoZmFsc2UpO1xuICB9LFxuXG4gIC8vIFRPRE86IHJlbmFtZSBpdCB0byBvcGVuVGFwcD9cbiAgLyoqXG4gICAqIFNlbGVjdCBkaWZmZXJlbnQgVGFwcCBpZGVudGlmaWVkIGJ5IFRhcHBJRCBvciBJbnRlcm5hbFRhcHBOYW1lXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0YWIgVGFwcCBOYW1lIG9yIFRhcHAgSURcbiAgICogQHBhcmFtIHtTdHJpbmd9IChvcHRpb25hbCkgcGFyYW0gVVJMIFBhcmFtZXRlclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNlbGVjdFRhYjogZnVuY3Rpb24odGFiLCBwYXJhbSkge1xuXG4gICAgbGV0IGNtZCA9IDEzOyAvLyBzZWxlY3RUYWIgd2l0aCBwYXJhbSBDaGF5bnNDYWxsXG5cbiAgICAvLyB1cGRhdGUgcGFyYW06IHN0cmlwID8gYW5kIGVuc3VyZSAmIGF0IHRoZSBiZWdpblxuICAgIGlmIChwYXJhbSAmJiAhcGFyYW0ubWF0Y2goL15bJnxcXD9dLykpIHsgLy8gbm8gJiBhbmQgbm8gP1xuICAgICAgcGFyYW0gPSAnJicgKyBwYXJhbTtcbiAgICB9IGVsc2UgaWYgKHBhcmFtKSB7XG4gICAgICBwYXJhbSA9IHBhcmFtLnJlcGxhY2UoJz8nLCAnJicpO1xuICAgIH0gZWxzZSB7IC8vIG5vIHBhcmFtcywgZGlmZmVyZW50IENoYXluc0NhbGxcbiAgICAgIGNtZCA9IDI7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiBjbWQsXG4gICAgICB3ZWJGbjogJ3NlbGVjdG90aGVydGFiJyxcbiAgICAgIHBhcmFtczogY21kID09PSAxM1xuICAgICAgICA/IFt7J3N0cmluZyc6IHRhYn0sIHsnc3RyaW5nJzogcGFyYW19XVxuICAgICAgICA6IFt7J3N0cmluZyc6IHRhYn1dLFxuICAgICAgd2ViUGFyYW1zOiB7XG4gICAgICAgIFRhYjogdGFiLFxuICAgICAgICBQYXJhbWV0ZXI6IHBhcmFtXG4gICAgICB9LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDAyLCBpb3M6IDEzODMsIHdwOiAyNDY5IH0gLy8gZm9yIG5hdGl2ZSBhcHBzIG9ubHlcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2VsZWN0IEFsYnVtXG4gICAqIFRPRE86IHJlbmFtZSB0byBvcGVuXG4gICAqXG4gICAqIEBwYXJhbSB7aWR8c3RyaW5nfSBpZCBBbGJ1bSBJRCAoQWxidW0gTmFtZSB3aWxsIHdvcmsgYXMgd2VsbCwgYnV0IGRvIHByZWZlciBJRHMpXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2VsZWN0QWxidW06IGZ1bmN0aW9uKGlkKSB7XG4gICAgaWYgKCFpc1N0cmluZyhpZCkgJiYgIWlzTnVtYmVyKGlkKSkge1xuICAgICAgbG9nLmVycm9yKCdzZWxlY3RBbGJ1bTogaW52YWxpZCBhbGJ1bSBuYW1lJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMyxcbiAgICAgIHdlYkZuOiAnc2VsZWN0QWxidW0nLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBpZH1dLFxuICAgICAgd2ViUGFyYW1zOiBpZFxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFBpY3R1cmVcbiAgICogKG9sZCBTaG93UGljdHVyZSlcbiAgICogQW5kcm9pZCBkb2VzIG5vdCBzdXBwb3J0IGdpZnMgOihcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBJbWFnZSBVUkwgc2hvdWxkIGNvdGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9wZW5QaWN0dXJlOiBmdW5jdGlvbih1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkgfHwgIXVybC5tYXRjaCgvanBnJHxwbmckfGdpZiQvaSkpIHsgLy8gVE9ETzogbW9yZSBpbWFnZSB0eXBlcz9cbiAgICAgIGxvZy5lcnJvcignb3BlblBpY3R1cmU6IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNCxcbiAgICAgIHdlYkZuOiAnc2hvd1BpY3R1cmUnLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHdlYlBhcmFtczogdXJsLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNTAxLCBpb3M6IDI2MzYsIHdwOiAyNTQzIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGEgQ2FwdGlvbiBCdXR0b24uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqIFRoZSBjYXB0aW9uIGJ1dHRvbiBpcyB0aGUgdGV4dCBhdCB0aGUgdG9wIHJpZ2h0IG9mIHRoZSBhcHAuXG4gICAqIChtYWlubHkgdXNlZCBmb3IgbG9naW4gb3IgdGhlIHVzZXJuYW1lKVxuICAgKiBUT0RPOiBpbXBsZW1lbnQgaW50byBDaGF5bnMgV2ViP1xuICAgKiBUT0RPOiByZW5hbWUgdG8gc2V0P1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dCBUaGUgQnV0dG9uJ3MgdGV4dFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB3aGVuIHRoZSBjYXB0aW9uIGJ1dHRvbiB3YXMgY2xpY2tlZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGNyZWF0ZUNhcHRpb25CdXR0b246IGZ1bmN0aW9uKHRleHQsIGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAvL2xvZy5lcnJvcignVGhlcmUgaXMgbm8gdmFsaWQgY2FsbGJhY2sgRnVuY3Rpb24uJyk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzIG5vIHZhbGlkIGNhbGxiYWNrIEZ1bmN0aW9uLicpO1xuICAgICAgLy9yZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnY2FwdGlvbkJ1dHRvbkNhbGxiYWNrKCknO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA1LFxuICAgICAgcGFyYW1zOiBbe3N0cmluZzogdGV4dH0sIHtjYWxsYmFjazogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTgsIGlvczogMTM2Niwgd3A6IDI0NjkgfSxcbiAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhpZGUgYSBDYXB0aW9uIEJ1dHRvbi5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICogVGhlIGNhcHRpb24gYnV0dG9uIGlzIHRoZSB0ZXh0IGF0IHRoZSB0b3AgcmlnaHQgb2YgdGhlIGFwcC5cbiAgICogKG1haW5seSB1c2VkIGZvciBsb2dpbiBvciB0aGUgdXNlcm5hbWUpXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaGlkZUNhcHRpb25CdXR0b246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNixcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OCwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEZhY2Vib29rIENvbm5lY3RcbiAgICogTk9URTogcHJlZmVyIGBjaGF5bnMubG9naW4oKWAgb3ZlciB0aGlzIG1ldGhvZCB0byBwZXJmb3JtIGEgdXNlciBsb2dpbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtwZXJtaXNzaW9ucyA9ICd1c2VyX2ZyaWVuZHMnXSBGYWNlYm9vayBQZXJtaXNzaW9ucywgc2VwYXJhdGVkIGJ5IGNvbW1hXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcmVsb2FkUGFyYW0gPSAnY29tbWVudCddIFJlbG9hZCBQYXJhbVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIC8vIFRPRE86IHRlc3QgcGVybWlzc2lvbnNcbiAgZmFjZWJvb2tDb25uZWN0OiBmdW5jdGlvbihwZXJtaXNzaW9ucyA9ICd1c2VyX2ZyaWVuZHMnLCByZWxvYWRQYXJhbSA9ICdjb21tZW50Jykge1xuICAgIHJlbG9hZFBhcmFtID0gcmVsb2FkUGFyYW07XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA3LFxuICAgICAgd2ViRm46ICdmYWNlYm9va0Nvbm5lY3QnLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBwZXJtaXNzaW9uc30sIHsnRnVuY3Rpb24nOiAnRXhlY0NvbW1hbmQ9XCInICsgcmVsb2FkUGFyYW0gKyAnXCInfV0sXG4gICAgICB3ZWJQYXJhbXM6IHtcbiAgICAgICAgUmVsb2FkUGFyYW1ldGVyOiAnRXhlY0NvbW1hbmQ9JyArIHJlbG9hZFBhcmFtLFxuICAgICAgICBQZXJtaXNzaW9uczogcGVybWlzc2lvbnNcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTksIGlvczogMTM2Niwgd3A6IDI0NjkgfSxcbiAgICAgIGZhbGxiYWNrQ21kOiA4IC8vIGluIGNhc2UgdGhlIGFib3ZlIGlzIG5vdCBzdXBwb3J0IHRoZSBmYWxsYmFja0NtZCB3aWxsIHJlcGxhY2UgdGhlIGNtZFxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIExpbmsgaW4gQnJvd3NlclxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFVSTFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9wZW5MaW5rSW5Ccm93c2VyOiBmdW5jdGlvbih1cmwpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDksXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh1cmwuaW5kZXhPZignOi8vJykgPT09IC0xKSB7XG4gICAgICAgICAgdXJsID0gJy8vJyArIHVybDsgLy8gb3IgYWRkIGxvY2F0aW9uLnByb3RvY29sIHByZWZpeCBhbmQgLy8gVE9ETzogdGVzdFxuICAgICAgICB9XG4gICAgICAgIHdpbmRvdy5vcGVuKHVybCwgJ19ibGFuaycpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDA1LCBpb3M6IDI0NjYsIHdwOiAyNTQzIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2hvdyBCYWNrQnV0dG9uLlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB3aGVuIHRoZSBiYWNrIGJ1dHRvbiB3YXMgY2xpY2tlZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNob3dCYWNrQnV0dG9uOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICAgIGNoYXluc0FwaUludGVyZmFjZS5oaWRlQmFja0J1dHRvbigpO1xuICAgICAgfTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdiYWNrQnV0dG9uQ2FsbGJhY2soKSc7XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEwLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDA1LCBpb3M6IDI2MzYsIHdwOiAyNDY5IH0sXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSGlkZSBCYWNrQnV0dG9uLlxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gRmFsc2Ugb24gZXJyb3IsIHRydWUgaWYgY2FsbCBzdWNjZWVkZWRcbiAgICovXG4gIGhpZGVCYWNrQnV0dG9uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDExLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDA1LCBpb3M6IDI2MzYsIHdwOiAyNDY5IH1cbiAgICB9KTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBPcGVuIEludGVyQ29tLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gRmFsc2Ugb24gZXJyb3IsIHRydWUgaWYgY2FsbCBzdWNjZWVkZWRcbiAgICovXG4gIG9wZW5JbnRlckNvbTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMixcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwMiwgaW9zOiAxMzgzLCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBHZW9sb2NhdGlvbi5cbiAgICogbmF0aXZlIGFwcHMgb25seSAoYnV0IGNvdWxkIHdvcmsgaW4gd2ViIGFzIHdlbGwsIG5hdmlnYXRvci5nZW9sb2NhdGlvbilcbiAgICpcbiAgICogVE9ETzogY29udGludW91c1RyYWNraW5nIHdhcyByZW1vdmVkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGJhY2sgYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgZ2V0R2VvTG9jYXRpb246IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2dldEdlb0xvY2F0aW9uQ2FsbGJhY2soKSc7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAvLyBUT0RPOiByZW1vdmUgY29uc29sZVxuICAgICAgLy8gVE9ETzogYWxsb3cgZW1wdHkgY2FsbGJhY2tzIHdoZW4gaXQgaXMgYWxyZWFkeSBzZXRcbiAgICAgIGNvbnNvbGUud2Fybignbm8gY2FsbGJhY2sgZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE0LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNTAxLCBpb3M6IDI0NjYsIHdwOiAyNDY5IH0sXG4gICAgICAvL3dlYkZuOiBmdW5jdGlvbigpIHsgbmF2aWdhdG9yLmdlb2xvY2F0aW9uOyB9XG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBWaWRlb1xuICAgKiAob2xkIFNob3dWaWRlbylcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBWaWRlbyBVUkwgc2hvdWxkIGNvdGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9wZW5WaWRlbzogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goLy4qXFwuLnsyLH0vKSkgeyAvLyBUT0RPOiBXVEYgUmVnZXhcbiAgICAgIGxvZy5lcnJvcignb3BlblZpZGVvOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE1LFxuICAgICAgd2ViRm46ICdzaG93VmlkZW8nLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHdlYlBhcmFtczogdXJsXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNob3cgRGlhbG9nXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB7Y29udGVudDp7U3RyaW5nfSAsIGhlYWRsaW5lOiAsYnV0dG9uczp7QXJyYXl9LCBub0NvbnRlbnRuUGFkZGluZzosIG9uTG9hZDp9XG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc2hvd0RpYWxvZzogZnVuY3Rpb24gc2hvd0RpYWxvZyhvYmopIHtcbiAgICBpZiAoIW9iaiB8fCAhaXNPYmplY3Qob2JqKSkge1xuICAgICAgbG9nLndhcm4oJ3Nob3dEaWFsb2c6IGludmFsaWQgcGFyYW1ldGVycycpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoaXNTdHJpbmcob2JqLmNvbnRlbnQpKSB7XG4gICAgICBvYmouY29udGVudCA9IHRyaW0ob2JqLmNvbnRlbnQucmVwbGFjZSgvPGJyWyAvXSo/Pi9nLCAnXFxuJykpO1xuICAgIH1cbiAgICBpZiAoIWlzQXJyYXkob2JqLmJ1dHRvbnMpIHx8IG9iai5idXR0b25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgb2JqLmJ1dHRvbnMgPSBbKG5ldyBQb3B1cEJ1dHRvbignT0snKSkudG9IVE1MKCldO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnQ2hheW5zRGlhbG9nQ2FsbEJhY2soKSc7XG4gICAgZnVuY3Rpb24gY2FsbGJhY2tGbihidXR0b25zLCBpZCkge1xuICAgICAgaWQgPSBwYXJzZUludChpZCwgMTApIC0gMTtcbiAgICAgIGlmIChidXR0b25zW2lkXSkge1xuICAgICAgICBidXR0b25zW2lkXS5jYWxsYmFjay5jYWxsKG51bGwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTYsIC8vIFRPRE86IGlzIHNsaXR0ZTovL1xuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5oZWFkbGluZX0sXG4gICAgICAgIHsnc3RyaW5nJzogb2JqLmNvbnRlbnR9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5idXR0b25zWzBdLm5hbWV9IC8vIFRPRE86IG5lZWRzIGVuY29kZVVSST9cbiAgICAgICAgLy97J3N0cmluZyc6IG9iai5idXR0b25zWzFdLm5hbWV9LCAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICAgIC8veydzdHJpbmcnOiBvYmouYnV0dG9uc1syXS5uYW1lfSAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICBdLFxuICAgICAgY2I6IGNhbGxiYWNrRm4uYmluZChudWxsLCBvYmouYnV0dG9ucyksXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjYwNn0sXG4gICAgICBmYWxsYmFja0ZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2ZhbGxiYWNrIHBvcHVwJywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBGb3JtZXJseSBrbm93biBhcyBnZXRBcHBJbmZvc1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBpbnZva2VkIHdpdGggdGhlIEFwcERhdGFcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgICAvLyBUT0RPOiB1c2UgZm9yY2VSZWxvYWQgYW5kIGNhY2hlIEFwcERhdGFcbiAgZ2V0R2xvYmFsRGF0YTogZnVuY3Rpb24oY2FsbGJhY2ssIGZvcmNlUmVsb2FkKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ2dldEdsb2JhbERhdGE6IGNhbGxiYWNrIGlzIG5vIHZhbGlkIGBGdW5jdGlvbmAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghZm9yY2VSZWxvYWQgJiYgZ2xvYmFsRGF0YSkge1xuICAgICAgY2FsbGJhY2soZ2xvYmFsRGF0YSk7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTgsXG4gICAgICB3ZWJGbjogJ2dldEFwcEluZm9zJyxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiAnZ2V0R2xvYmFsRGF0YSgpJ31dLCAvLyBjYWxsYmFjayBwYXJhbSBvbmx5IG9uIG1vYmlsZVxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFZpYnJhdGVcbiAgICogQHBhcmFtIHtJbnRlZ2VyfSBkdXJhdGlvbiBUaW1lIGluIG1pbGxpc2Vjb25kc1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICB2aWJyYXRlOiBmdW5jdGlvbihkdXJhdGlvbikge1xuICAgIGlmICghaXNOdW1iZXIoZHVyYXRpb24pIHx8IGR1cmF0aW9uIDwgMikge1xuICAgICAgZHVyYXRpb24gPSAxNTA7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTksXG4gICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiBkdXJhdGlvbi50b1N0cmluZygpfV0sXG4gICAgICB3ZWJGbjogZnVuY3Rpb24gbmF2aWdhdG9yVmlicmF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBuYXZpZ2F0b3IudmlicmF0ZSgxMDApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ3ZpYnJhdGU6IHRoZSBkZXZpY2UgZG9lcyBub3Qgc3VwcG9ydCB2aWJyYXRlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjY5NSwgaW9zOiAyNTk2LCB3cDogMjUxNX1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogTmF2aWdhdGUgQmFjay5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBuYXZpZ2F0ZUJhY2s6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjAsXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNjk2LCBpb3M6IDI2MDAsIHdwOiAyNTE1fVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbWFnZSBVcGxvYWRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aXRoIGltYWdlIHVybCBhZnRlciB1cGxvYWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgdXBsb2FkSW1hZ2U6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3VwbG9hZEltYWdlOiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2ltYWdlVXBsb2FkQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAyMSxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gVE9ETzogaW1wbGVtZW50IGltYWdlIHVwbG9hZCB3aXRoIHdpbmRvdy5mZXRjaFxuICAgICAgICAvL3ZhciBmZCA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICAvL2ZkLmFwcGVuZChcIkltYWdlXCIsIGZpbGVbMF0pO1xuICAgICAgICAvL3dpbmRvdy5pbWFnZUNob3NlbiA9IHdpbmRvdy5mZXRjaCh7XG4gICAgICAgIC8vICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgLy8gIHVybDogXCIvL2NoYXluczEudG9iaXQuY29tL1RhcHBBcGkvRmlsZS9JbWFnZVwiLFxuICAgICAgICAvLyAgY29udGVudFR5cGU6IGZhbHNlLFxuICAgICAgICAvLyAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxuICAgICAgICAvLyAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAvLyAgZGF0YTogZmRcbiAgICAgICAgLy99KS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gIGRlbGV0ZSB3aW5kb3cuaW1hZ2VDaG9zZW47XG4gICAgICAgIC8vICBjYWxsYmFjay5jYWxsKG51bGwsIGRhdGEpO1xuICAgICAgICAvL30pO1xuICAgICAgICAvLyQoXCIjQ2hheW5zSW1hZ2VVcGxvYWRcIikuY2xpY2soKTtcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjcwNSwgd3A6IDI1MzgsIGlvczogMjY0Mn1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IE5GQyBDYWxsYmFja1xuICAgKiBUT0RPOiByZWZhY3RvciBhbmQgdGVzdFxuICAgKiBUT0RPOiB3aHkgdHdvIGNhbGxzP1xuICAgKiBDYW4gd2UgaW1wcm92ZSB0aGlzIHNoaXQ/IHNwbGl0IGludG8gdHdvIG1ldGhvZHNcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gZm9yIE5GQ1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICBzZXROZmNDYWxsYmFjazogZnVuY3Rpb24oY2FsbGJhY2ssIHJlc3BvbnNlKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDM3LFxuICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgIH0pICYmIGFwaUNhbGwoe1xuICAgICAgICAgIGNtZDogMzcsXG4gICAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciBjbWQgPSAocmVzcG9uc2UgPT09IG5mY1Jlc3BvbnNlRGF0YS5QZXJzb25JZCkgPyAzNyA6IDM4O1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiBjbWQgPT09IDM3ID8gMzggOiAzNyxcbiAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICB9KSAmJiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdOZmNDYWxsYmFjayd9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMzIzNCwgd3A6IDMxMjEgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWRlbyBQbGF5ZXIgQ29udHJvbHNcbiAgICogQWN1dGFsbHkgbmF0aXZlIG9ubHlcbiAgICogVE9ETzogY291bGQgdGhlb3JldGljYWxseSB3b3JrIGluIENoYXlucyBXZWJcbiAgICogVE9ETzogZXhhbXBsZT8gd2hlcmUgZG9lcyB0aGlzIHdvcms/XG4gICAqL1xuICBwbGF5ZXI6IHtcbiAgICB1c2VEZWZhdWx0VXJsOiBmdW5jdGlvbiB1c2VEZWZhdWx0VXJsKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIyLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBjaGFuZ2VVcmw6IGZ1bmN0aW9uIGNoYW5nZVVybCh1cmwpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMixcbiAgICAgICAgcGFyYW1zOiBbeydTdHJpbmcnOiB1cmx9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGhpZGVCdXR0b246IGZ1bmN0aW9uIGhpZGVCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHNob3dCdXR0b246IGZ1bmN0aW9uIHNob3dCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBhdXNlOiBmdW5jdGlvbiBwYXVzZVZpZGVvKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI0LFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwbGF5OiBmdW5jdGlvbiBwbGF5VmlkZW8oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjQsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBsYXliYWNrU3RhdHVzOiBmdW5jdGlvbiBwbGF5YmFja1N0YXR1cyhjYWxsYmFjaykge1xuXG4gICAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChudWxsLCB7XG4gICAgICAgICAgQXBwQ29udHJvbFZpc2libGU6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uSXNBcHBDb250cm9sVmlzaWJsZSxcbiAgICAgICAgICBTdGF0dXM6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uUGxheWJhY2tTdGF0dXMsXG4gICAgICAgICAgVXJsOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLlN0cmVhbVVybFxuICAgICAgICB9KTtcbiAgICAgIH0sIHRydWUpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQmx1ZXRvb3RoXG4gICAqIE9ubHkgaW4gbmF0aXZlIEFwcHMgKGlvcyBhbmQgYW5kcm9pZClcbiAgICovXG4gIGJsdWV0b290aDoge1xuICAgIExFU2VuZFN0cmVuZ3RoOiB7IC8vIFRPRE86IHdoYXQgaXMgdGhhdD9cbiAgICAgIEFkamFjZW50OiAwLFxuICAgICAgTmVhcmJ5OiAxLFxuICAgICAgRGVmYXVsdDogMixcbiAgICAgIEZhcjogM1xuICAgIH0sXG4gICAgTEVTY2FuOiBmdW5jdGlvbiBMRVNjYW4oY2FsbGJhY2spIHtcbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFU2Nhbjogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJztcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNixcbiAgICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIExFQ29ubmVjdDogZnVuY3Rpb24gTEVDb25uZWN0KGFkZHJlc3MsIGNhbGxiYWNrLCBwYXNzd29yZCkge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRUNvbm5lY3Q6IG5vIHZhbGlkIGFkZHJlc3MgcGFyYW1ldGVyJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFQ29ubmVjdDogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc1N0cmluZyhwYXNzd29yZCkgfHwgIXBhc3N3b3JkLm1hdGNoKC9eWzAtOWEtZl17NiwxMn0kL2kpKSB7XG4gICAgICAgIHBhc3N3b3JkID0gJyc7XG4gICAgICB9XG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snO1xuXG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjcsXG4gICAgICAgIHBhcmFtczogW3snc3RyaW5nJzogYWRkcmVzc30sIHsnc3RyaW5nJzogcGFzc3dvcmR9XSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogVE9ETzogY29uc2lkZXIgT2JqZWN0IGFzIHBhcmFtZXRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZGRyZXNzXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzdWJJZFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbWVhc3VyZVBvd2VyXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzZW5kU3RyZW5ndGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIExFV3JpdGU6IGZ1bmN0aW9uIExFV3JpdGUoYWRkcmVzcywgc3ViSWQsIG1lYXN1cmVQb3dlciwgc2VuZFN0cmVuZ3RoLCBjYWxsYmFjaykge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRVdyaXRlOiBubyB2YWxpZCBhZGRyZXNzIHBhcmFtZXRlcicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHN1YklkKSB8fCBzdWJJZCA8IDAgfHwgc3ViSWQgPiA0MDk1KSB7XG4gICAgICAgIHN1YklkID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihtZWFzdXJlUG93ZXIpIHx8IG1lYXN1cmVQb3dlciA8IC0xMDAgfHwgbWVhc3VyZVBvd2VyID4gMCkge1xuICAgICAgICBtZWFzdXJlUG93ZXIgPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHNlbmRTdHJlbmd0aCkgfHwgc2VuZFN0cmVuZ3RoIDwgMCB8fCBzZW5kU3RyZW5ndGggPiAzKSB7XG4gICAgICAgIHNlbmRTdHJlbmd0aCA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snLFxuICAgICAgICB1aWQgPSAnN0EwN0UxN0EtQTE4OC00MTZFLUI3QTAtNUEzNjA2NTEzRTU3JztcblxuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI4LFxuICAgICAgICBwYXJhbXM6IFtcbiAgICAgICAgICB7J3N0cmluZyc6IGFkZHJlc3N9LFxuICAgICAgICAgIHsnc3RyaW5nJzogdWlkfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzdWJJZH0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogbWVhc3VyZVBvd2VyfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzZW5kU3RyZW5ndGh9XG4gICAgICAgIF0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVE9ETzsgdXNlIGBPYmplY3RgIGFzIHBhcmFtc1xuICAvLyBUT0RPOiB3aGF0IGFyZSBvcHRpb25hbCBwYXJhbXM/IHZhbGlkYXRlIG5hbWUgYW5kIGxvY2F0aW9uP1xuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQXBwb2ludG1lbnQncyBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsb2NhdGlvbiBBcHBvaW50bWVudCdzIGxvY2F0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbZGVzY3JpcHRpb25dIEFwcG9pbnRtZW50J3MgZGVzY3JpcHRpb25cbiAgICogQHBhcmFtIHtEYXRlfSBzdGFydCBBcHBvaW50bWVudHMncyBTdGFydERhdGVcbiAgICogQHBhcmFtIHtEYXRlfSBlbmQgQXBwb2ludG1lbnRzJ3MgRW5kRGF0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNhdmVBcHBvaW50bWVudDogZnVuY3Rpb24gc2F2ZUFwcG9pbnRtZW50KG5hbWUsIGxvY2F0aW9uLCBkZXNjcmlwdGlvbiwgc3RhcnQsIGVuZCkge1xuICAgIGlmICghaXNTdHJpbmcobmFtZSkgfHwgIWlzU3RyaW5nKGxvY2F0aW9uKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogbm8gdmFsaWQgbmFtZSBhbmQvb3IgbG9jYXRpb24nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0RhdGUoc3RhcnQpIHx8ICFpc0RhdGUoZW5kKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogc3RhcnQgYW5kL29yIGVuZERhdGUgaXMgbm8gdmFsaWQgRGF0ZSBgT2JqZWN0YC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgc3RhcnQgPSBwYXJzZUludChzdGFydC5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG4gICAgZW5kID0gcGFyc2VJbnQoZW5kLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjksXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydzdHJpbmcnOiBuYW1lfSxcbiAgICAgICAgeydzdHJpbmcnOiBsb2NhdGlvbn0sXG4gICAgICAgIHsnc3RyaW5nJzogZGVzY3JpcHRpb259LFxuICAgICAgICB7J0ludGVnZXInOiBzdGFydH0sXG4gICAgICAgIHsnSW50ZWdlcic6IGVuZH1cbiAgICAgIF0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzA1NCwgaW9zOiAzMDY3LCB3cDogMzAzMH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRGF0ZVR5cGVzIEVudW1cbiAgICogc3RhcnRzIGF0IDFcbiAgICovXG4gIGRhdGVUeXBlOiB7XG4gICAgZGF0ZTogMSxcbiAgICB0aW1lOiAyLFxuICAgIGRhdGVUaW1lOiAzXG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBEYXRlXG4gICAqIE9sZDogRGF0ZVNlbGVjdFxuICAgKiBOYXRpdmUgQXBwcyBvbmx5LiBUT0RPOiBhbHNvIGluIENoYXlucyBXZWI/IEhUTUw1IERhdGVwaWNrZXIgZXRjXG4gICAqIFRPRE87IHJlY29uc2lkZXIgb3JkZXIgZXRjXG4gICAqIEBwYXJhbSB7ZGF0ZVR5cGV8TnVtYmVyfSBkYXRlVHlwZSBFbnVtIDEtMjogdGltZSwgZGF0ZSwgZGF0ZXRpbWUuIHVzZSBjaGF5bnMuZGF0ZVR5cGVcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gcHJlU2VsZWN0IFByZXNldCB0aGUgRGF0ZSAoZS5nLiBjdXJyZW50IERhdGUpXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdGhlIGNob3NlbiBEYXRlIGFzIFRpbWVzdGFtcFxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBtaW5EYXRlIE1pbmltdW0gU3RhcnREYXRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IG1heERhdGUgTWF4aW11bSBFbmREYXRlXG4gICAqL1xuICBzZWxlY3REYXRlOiBmdW5jdGlvbiBzZWxlY3REYXRlKGRhdGVUeXBlLCBwcmVTZWxlY3QsIGNhbGxiYWNrLCBtaW5EYXRlLCBtYXhEYXRlKSB7XG5cbiAgICBpZiAoIWlzTnVtYmVyKGRhdGVUeXBlKSB8fCBkYXRlVHlwZSA8PSAwKSB7XG4gICAgICBsb2cud2Fybignc2VsZWN0RGF0ZTogd3JvbmcgZGF0ZVR5cGUnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3NlbGVjdERhdGU6IGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlVmFsdWUodmFsdWUpIHtcbiAgICAgIGlmICghaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbHVlLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHByZVNlbGVjdCA9IHZhbGlkYXRlVmFsdWUocHJlU2VsZWN0KTtcbiAgICBtaW5EYXRlID0gdmFsaWRhdGVWYWx1ZShtaW5EYXRlKTtcbiAgICBtYXhEYXRlID0gdmFsaWRhdGVWYWx1ZShtYXhEYXRlKTtcblxuICAgIGxldCBkYXRlUmFuZ2UgPSAnJztcbiAgICBpZiAobWluRGF0ZSA+IC0xICYmIG1heERhdGUgPiAtMSkge1xuICAgICAgZGF0ZVJhbmdlID0gJywnICsgbWluRGF0ZSArICcsJyArIG1heERhdGU7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdzZWxlY3REYXRlQ2FsbGJhY2snO1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm4oY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QsIHRpbWUpIHtcbiAgICAgIC8vIFRPRE86IGltcG9ydGFudCB2YWxpZGF0ZSBEYXRlXG4gICAgICAvLyBUT0RPOiBjaG9vc2UgcmlnaHQgZGF0ZSBieSBkYXRlVHlwZUVudW1cbiAgICAgIGxvZy5kZWJ1ZyhkYXRlVHlwZSwgcHJlU2VsZWN0KTtcbiAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgdGltZSA/IG5ldyBEYXRlKHRpbWUpIDogLTEpO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzAsXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX0sXG4gICAgICAgIHsnSW50ZWdlcic6IGRhdGVUeXBlfSxcbiAgICAgICAgeydJbnRlZ2VyJzogcHJlU2VsZWN0ICsgZGF0ZVJhbmdlfVxuICAgICAgXSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMwNzIsIGlvczogMzA2Miwgd3A6IDMwMzB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gVVJMIGluIEFwcFxuICAgKiAob2xkIFNob3dVUkxJbkFwcClcbiAgICogbm90IHRvIGNvbmZ1c2Ugd2l0aCBvcGVuTGlua0luQnJvd3NlclxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFZpZGVvIFVSTCBzaG91bGQgY29udGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gICAgLy8gVE9ETzogaW1wbGVtZW50IENoYXlucyBXZWIgTWV0aG9kIGFzIHdlbGwgKG5hdmlnYXRlIGJhY2sgc3VwcG9ydClcbiAgb3BlblVybDogZnVuY3Rpb24gb3BlblVybCh1cmwsIHRpdGxlKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cuZXJyb3IoJ29wZW5Vcmw6IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jYXRpb24uaHJlZiA9IHVybDsgLy8gVE9ETzogbWFrZSBzdXJlIGl0IHdvcmtzXG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9LCB7J3N0cmluZyc6IHRpdGxlfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzExMCwgaW9zOiAzMDc0LCB3cDogMzA2M31cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogY3JlYXRlIFFSIENvZGVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhIFFSIENvZGUgZGF0YVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgYmFzZTY0IGVuY29kZWQgSU1HIFRPRE86IHdoaWNoIHR5cGU/XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgY3JlYXRlUVJDb2RlOiBmdW5jdGlvbiBjcmVhdGVRUkNvZGUoZGF0YSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWlzU3RyaW5nKGRhdGEpKSB7XG4gICAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ2NyZWF0ZVFSQ29kZTogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NyZWF0ZVFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzMsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGRhdGF9LCB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWVcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogc2NhbiBRUiBDb2RlXG4gICAqIFNjYW5zIFFSIENvZGUgYW5kIHJlYWQgaXRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNjYW5RUkNvZGU6IGZ1bmN0aW9uIHNjYW5RUkNvZGUoY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdzY2FuUVJDb2RlOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnc2NhblFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHNjYW4gUVIgQ29kZVxuICAgKiBTY2FucyBRUiBDb2RlIGFuZCByZWFkIGl0XG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSByZXN1bHRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBnZXRMb2NhdGlvbkJlYWNvbnM6IGZ1bmN0aW9uIGdldExvY2F0aW9uQmVhY29ucyhjYWxsYmFjaywgZm9yY2VSZWxvYWQpIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRMb2NhdGlvbkJlYWNvbnM6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdnZXRCZWFjb25zQ2FsbEJhY2soKSc7XG4gICAgaWYgKGJlYWNvbkxpc3QgJiYgIWZvcmNlUmVsb2FkKSB7IC8vIFRPRE86IG1ha2Ugc3VyZSBpdCBpcyBnb29kIHRvIGNhY2hlIHRoZSBsaXN0XG4gICAgICBsb2cuZGVidWcoJ2dldExvY2F0aW9uQmVhY29uczogdGhlcmUgaXMgYWxyZWFkeSBvbmUgYmVhY29uTGlzdCcpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwobnVsbCwgYmVhY29uTGlzdCk7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja0ZuID0gZnVuY3Rpb24gZ2V0TG9jYXRpb25CZWFjb25DYWxsYmFjayhjYWxsYmFjaywgbGlzdCkge1xuICAgICAgYmVhY29uTGlzdCA9IGxpc3Q7XG4gICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGxpc3QpO1xuICAgIH07XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzOSxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgNDA0NSwgaW9zOiA0MDQ4fSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2spXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCB0byBQYXNzYm9va1xuICAgKiBpT1Mgb25seVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFBhdGggdG8gUGFzc2Jvb2sgZmlsZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGFkZFRvUGFzc2Jvb2s6IGZ1bmN0aW9uIGFkZFRvUGFzc2Jvb2sodXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cud2FybignYWRkVG9QYXNzYm9vazogdXJsIGlzIGludmFsaWQuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA0NyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7aW9zOiA0MDQ1fSxcbiAgICAgIHdlYkZuOiBjaGF5bnNBcGlJbnRlcmZhY2Uub3BlbkxpbmtJbkJyb3dzZXIuYmluZChudWxsLCB1cmwpLFxuICAgICAgZmFsbGJhY2tGbjogY2hheW5zQXBpSW50ZXJmYWNlLm9wZW5MaW5rSW5Ccm93c2VyLmJpbmQobnVsbCwgdXJsKVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUb2JpdCBMb2dpblxuICAgKiBXaXRoIEZhY2Vib29rQ29ubmVjdCBGYWxsYmFja1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1zIFJlbG9hZCBQYXJhbWV0ZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBsb2dpbjogZnVuY3Rpb24gbG9naW4ocGFyYW1zKSB7XG4gICAgcGFyYW1zID0gJ0V4ZWNDb21tYW5kPScgKyBwYXJhbXM7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA1NCxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogcGFyYW1zfV0sXG4gICAgICBzdXBwb3J0OiB7aW9zOiA0MjQwLCB3cDogNDA5OX0sXG4gICAgICBmYWxsYmFja0ZuOiBjaGF5bnNBcGlJbnRlcmZhY2UuZmFjZWJvb2tDb25uZWN0LmJpbmQobnVsbCwgJ3VzZXJfZnJpZW5kcycsIHBhcmFtcyksXG4gICAgICB3ZWJGbjogJ3RvYml0Y29ubmVjdCcsXG4gICAgICB3ZWJQYXJhbXM6IHBhcmFtc1xuICAgIH0pO1xuICB9XG5cbn07XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNQZXJtaXR0ZWQsIGlzRnVuY3Rpb24sIGlzQmxhbmssIGlzQXJyYXksIGlzT2JqZWN0LCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93LCBwYXJlbnR9IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInO1xuaW1wb3J0IHtlbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge3NldENhbGxiYWNrfSBmcm9tICcuL2NhbGxiYWNrcyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY29yZS5jaGF5bnNfY2FsbHMnKTtcblxuXG5mdW5jdGlvbiBjYW4odmVyc2lvbnMpIHtcbiAgcmV0dXJuIGlzUGVybWl0dGVkKHZlcnNpb25zLCBlbnZpcm9ubWVudC5vcywgZW52aXJvbm1lbnQuYXBwVmVyc2lvbik7XG59XG5cbi8vIE9TIEFwcCBWZXJzaW9uIE1hcCBmb3IgQ2hheW5zIENhbGxzIFN1cHBvcnRcbi8vIFRPRE86IG1vdmUgaW50byBlbnZpcm9ubWVudD8gKG9yIGp1c3QgcmVtb3ZlIGNhdXNlIGl0IGlzIG9ubHkgdXNlZCBvbmUgdGltZSBpbiBoZXJlKVxubGV0IG9zTWFwID0ge1xuICBjaGF5bnNDYWxsOiB7IGFuZHJvaWQ6IDI1MTAsIGlvczogMjQ4Mywgd3A6IDI0NjksIGJiOiAxMTggfVxufTtcblxuLyoqXG4gKiBQdWJsaWMgQ2hheW5zIEludGVyZmFjZVxuICogRXhlY3V0ZSBBUEkgQ2FsbFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqIEBwYXJhbSBkZWJvdW5jZVxuICogLy8gVE9ETzogbGVmdCBvZiBjYWxsYmFjayBhcyBwcm9taXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcGlDYWxsKG9iaikge1xuXG4gIGxldCBkZWJvdW5jZSA9IG9iai5kZWJvdW5jZSB8fCBmYWxzZTtcblxuICAvLyBUT0RPOiBjaGVjayBvYmoub3MgVkVSU0lPTlxuXG4gIGZ1bmN0aW9uIGV4ZWN1dGVDYWxsKGNoYXluc0NhbGxPYmopIHtcblxuICAgIGlmIChlbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsICYmIGNhbihvc01hcC5jaGF5bnNDYWxsKSkge1xuICAgICAgLy8gVE9ETzogY29uc2lkZXIgY2FsbFF1ZXVlIGFuZCBJbnRlcnZhbCB0byBwcmV2ZW50IGVycm9yc1xuICAgICAgbG9nLmRlYnVnKCdleGVjdXRlQ2FsbDogY2hheW5zIGNhbGwgJywgY2hheW5zQ2FsbE9iai5jbWQpO1xuXG4gICAgICBpZiAoJ2NiJyBpbiBjaGF5bnNDYWxsT2JqICYmIGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5jYikpIHtcbiAgICAgICAgc2V0Q2FsbGJhY2soY2hheW5zQ2FsbE9iai5jYWxsYmFja05hbWUgfHwgY2hheW5zQ2FsbE9iai5wYXJhbXNbMF0uY2FsbGJhY2ssIGNoYXluc0NhbGxPYmouY2IsIHRydWUpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGNoYXluc0NhbGxPYmouc3VwcG9ydCkgJiYgIWNhbihjaGF5bnNDYWxsT2JqLnN1cHBvcnQpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogdGhlIGNoYXlucyB2ZXJzaW9uIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgaWYgKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrIGNoYXlucyBjYWxsIHdpbGwgYmUgaW52b2tlZCcpO1xuICAgICAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbikpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrRm4gd2lsbCBiZSBpbnZva2VkJyk7XG4gICAgICAgICAgcmV0dXJuIGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbi5jYWxsKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouY21kLCBjaGF5bnNDYWxsT2JqLnBhcmFtcyk7XG5cbiAgICB9IGVsc2UgaWYgKGVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwpIHtcblxuICAgICAgaWYgKCdjYicgaW4gY2hheW5zQ2FsbE9iaiAmJiBpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouY2IpKSB7XG4gICAgICAgIHNldENhbGxiYWNrKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmouY2IpO1xuICAgICAgfVxuICAgICAgaWYgKCFjaGF5bnNDYWxsT2JqLndlYkZuKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogVGhpcyBDYWxsIGhhcyBubyB3ZWJGbicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZUNhbGw6IGNoYXlucyB3ZWIgY2FsbCAnLCBjaGF5bnNDYWxsT2JqLndlYkZuLm5hbWUgfHwgY2hheW5zQ2FsbE9iai53ZWJGbik7XG5cbiAgICAgIHJldHVybiBjaGF5bnNXZWJDYWxsKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmoud2ViUGFyYW1zIHx8IGNoYXluc0NhbGxPYmoucGFyYW1zKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IG5laXRoZXIgY2hheW5zIHdlYiBjYWxsIG5vciBjaGF5bnMgd2ViJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRlYm91bmNlKSB7XG4gICAgc2V0VGltZW91dChleGVjdXRlQ2FsbC5iaW5kKG51bGwsIG9iaiksIDEwMCk7IC8vIFRPRE86IGVycm9yP1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleGVjdXRlQ2FsbChvYmopO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGQgQ2hheW5zIENhbGwgKG9ubHkgZm9yIG5hdGl2ZSBBcHBzKVxuICogQHByaXZhdGVcblxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgY2hheW5zIGNhbGwgc3VjY2VlZGVkLCBmYWxzZSBvbiBlcnJvciAobm8gdXJsIGV0YylcbiAqL1xuZnVuY3Rpb24gY2hheW5zQ2FsbChjbWQsIHBhcmFtcykge1xuXG4gIGlmIChpc0JsYW5rKGNtZCkpIHsgLy8gMCBpcyBhIHZhbGlkIGNhbGwsIHVuZGVmaW5lZCBhbmQgbnVsbCBhcmUgbm90XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IG1pc3NpbmcgY21kIGZvciBjaGF5bnNDYWxsJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxldCB1cmwgPSBudWxsO1xuXG4gIC8vIGlmIHRoZXJlIGlzIG5vIHBhcmFtIG9yICdub25lJyB3aGljaCBtZWFucyBubyBjYWxsYmFja1xuICBpZiAoIXBhcmFtcykge1xuXG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArICcpJztcblxuICB9IGVsc2Uge1xuXG4gICAgLy8gcGFyYW1zIGV4aXN0IGhvd2V2ZXIsIGl0IGlzIG5vIGFycmF5XG4gICAgaWYgKCFpc0FycmF5KHBhcmFtcykpIHtcbiAgICAgIGxvZy5lcnJvcignY2hheW5zQ2FsbDogcGFyYW1zIGFyZSBubyBBcnJheScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcGFyYW1zIHRvIHRoZSBjaGF5bnMgY2FsbFxuICAgIGxldCBjYWxsYmFja1ByZWZpeCA9ICdfY2hheW5zQ2FsbGJhY2tzLic7XG4gICAgbGV0IGNhbGxTdHJpbmcgPSAnJztcbiAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBjYWxsQXJncyA9IFtdO1xuICAgICAgcGFyYW1zLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgbGV0IG5hbWUgPSBPYmplY3Qua2V5cyhwYXJhbSlbMF07XG4gICAgICAgIGxldCB2YWx1ZSA9IHBhcmFtW25hbWVdO1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2NhbGxiYWNrJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1xcJycgKyBjYWxsYmFja1ByZWZpeCArIHZhbHVlICsgJ1xcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdib29sJyB8fCBuYW1lID09PSAnRnVuY3Rpb24nIHx8IG5hbWUgPT09ICdJbnRlZ2VyJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2godmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKCdcXCcnICsgdmFsdWUgKyAnXFwnJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY2FsbFN0cmluZyA9ICcsJyArIGNhbGxBcmdzLmpvaW4oJywnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgY2hheW5zIHByb3RvY29sIGFuZCBob3N0IGFuZCBqb2luIGFycmF5XG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArIGNhbGxTdHJpbmcgKyAnKSc7XG4gIH1cblxuICBsb2cuZGVidWcoJ2NoYXluc0NhbGw6IHVybDogJywgdXJsKTtcblxuICB0cnkge1xuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBlYXNpZXIgaWRlbnRpZmljYXRpb24gb2YgdGhlIHJpZ2h0IGVudmlyb25tZW50XG4gICAgLy8gVE9ETzogY29uc2lkZXIgdG8gZXhlY3V0ZSB0aGUgYnJvd3NlciBmYWxsYmFjayBpbiBoZXJlIGFzIHdlbGxcbiAgICBpZiAoJ2NoYXluc0NhbGwnIGluIHdpbmRvdyAmJiBpc0Z1bmN0aW9uKHdpbmRvdy5jaGF5bnNDYWxsLmhyZWYpKSB7XG4gICAgICB3aW5kb3cuY2hheW5zQ2FsbC5ocmVmKHVybCk7XG4gICAgfSBlbHNlIGlmICgnd2Via2l0JyBpbiB3aW5kb3dcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKSB7XG4gICAgICB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKHVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy53YXJuKCdjaGF5bnNDYWxsOiBFcnJvcjogY291bGQgbm90IGV4ZWN1dGUgQ2hheW5zQ2FsbDogJywgZSk7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeGVjdXRlIGEgQ2hheW5zV2ViIENhbGwgaW4gdGhlIHBhcmVudCB3aW5kb3cuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZuIEZ1bmN0aW9uIG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbXMgQWRkaXRpb25hbFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY2hheW5zV2ViYkNhbGwgc3VjY2VlZGVkXG4gKi9cbmZ1bmN0aW9uIGNoYXluc1dlYkNhbGwoZm4sIHBhcmFtcykge1xuICBpZiAoIWZuKSB7XG4gICAgbG9nLmluZm8oJ2NoYXluc1dlYkNhbGw6IG5vIENoYXluc1dlYkNhbGwgZm4nKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAoIXBhcmFtcyB8fCBpc0FycmF5KHBhcmFtcykpIHsgLy8gQXJyYXkgaW5kaWNhdGVzIHRoYXQgdGhlc2UgYXJlIGNoYXluc0NhbGxzIHBhcmFtcyBUT0RPOiByZWZhY3RvclxuICAgIHBhcmFtcyA9ICcnO1xuICB9XG4gIGlmIChpc09iamVjdChwYXJhbXMpKSB7IC8vIGFuIEFycmF5IGlzIGFsc28gc2VlbiBhcyBPYmplY3QsIGhvd2V2ZXIgaXQgd2lsbCBiZSByZXNldCBiZWZvcmVcbiAgICBwYXJhbXMgPSBKU09OLnN0cmluZ2lmeShwYXJhbXMpO1xuICB9XG5cbiAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgcmV0dXJuIGZuLmNhbGwobnVsbCk7XG4gIH1cblxuICB2YXIgbmFtZXNwYWNlID0gJ2NoYXlucy5jdXN0b21UYWIuJztcbiAgdmFyIHVybCA9IG5hbWVzcGFjZSArIGZuICsgJzonICsgcGFyYW1zO1xuXG4gIGxvZy5kZWJ1ZygnY2hheW5zV2FiQ2FsbDogJyArIHVybCk7XG5cbiAgdHJ5IHtcbiAgICBwYXJlbnQucG9zdE1lc3NhZ2UodXJsLCAnKicpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLndhcm4oJ2NoYXluc1dlYkNhbGw6IHBvc3RNZXNzZ2FlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBjb25maWdcbiAqIEBwcml2YXRlXG4gKi9cblxuaW1wb3J0IHtpc1ByZXNlbnQsIGlzQmxhbmssIGlzVW5kZWZpbmVkLCBpc0FycmF5LCBleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBTdG9yZSBpbnRlcm5hbCBjaGF5bnMgY29uZmlndXJhdGlvblxuICogQHR5cGUge3thcHBOYW1lOiBzdHJpbmcsIGFwcFZlcnNpb246IG51bWJlciwgbG9hZE1vZGVybml6ZXI6IGJvb2xlYW4sIGxvYWRQb2x5ZmlsbHM6IGJvb2xlYW4sIHVzZUZldGNoOiBib29sZWFuLCBwcm9taXNlczogc3RyaW5nLCB1c2VPZmZsaW5lQ2FjaGluZzogYm9vbGVhbiwgdXNlTG9jYWxTdG9yYWdlOiBib29sZWFuLCBoYXNBZG1pbjogYm9vbGVhbiwgbXVsdGlMaW5ndWFsOiBib29sZWFuLCBpc1B1Ymxpc2hlZDogYm9vbGVhbiwgZGVidWdNb2RlOiBib29sZWFuLCB1c2VBamF4OiBib29sZWFufX1cbiAqIEBwcml2YXRlXG4gKi9cbnZhciBfY29uZmlnID0ge1xuICBhcHBOYW1lOiAnQ2hheW5zIEFwcCcsICAgLy8gYXBwIE5hbWVcbiAgYXBwVmVyc2lvbjogMSwgICAgICAgICAgIC8vIGFwcCBWZXJzaW9uXG4gIHByZXZlbnRFcnJvcnM6IHRydWUsICAgICAgICAvLyBlcnJvciBoYW5kbGVyIGNhbiBoaWRlIGVycm9ycyAoY2FuIGJlIG92ZXJ3dGl0dGVuIGJ5IGlzUHJvZHVjdGlvbilcbiAgaXNQcm9kdWN0aW9uOiB0cnVlLCAgICAgIC8vIHByb2R1Y3Rpb24sIGRldmVsb3BtZW50IGFuZCB0ZXN0IEVOVlxuICBsb2FkTW9kZXJuaXplcjogdHJ1ZSwgICAgLy8gbG9hZCBtb2Rlcm5pemVyXG4gIGxvYWRQb2x5ZmlsbHM6IHRydWUsICAgICAvLyBsb2FkIHBvbHlmaWxsc1xuICB1c2VGZXRjaDogdHJ1ZSwgICAgICAgICAgLy8gdXNlIHdpbmRvdy5mZXRjaCBhbmQgaXQncyBwb2x5ZmlsbHNcbiAgcHJvbWlzZXM6ICdxJywgICAgICAgICAgIC8vIHByb21pc2UgU2VydmljZTogUSBpcyBzdGFuZGFyZFxuICB1c2VPZmZsaW5lQ2FjaGluZzogZmFsc2UsLy8gaXMgb2ZmbGluZSBjYWNoaW5nIHVzZWQ/IGlubGN1ZGUgb2ZmbGluZSBoZWxwZXJcbiAgdXNlTG9jYWxTdG9yYWdlOiBmYWxzZSwgIC8vIGlzIGxvY2FsU3RvcmFnZSB1c2VkPyBpbmNsdWRlIGhlbHBlclxuICBoYXNBZG1pbjogZmFsc2UsICAgICAgICAgLy8gZG9lcyB0aGlzIGFwcC9wYWdlIGhhdmUgYW4gYWRtaW4/XG4gIG11bHRpTGluZ3VhbDogdHJ1ZSwgICAgICAvLyBlbmFibGUgaTE4bj9cbiAgaXNQdWJsaXNoZWQ6IHRydWUsICAgICAgIC8vIG9ubHkgaW4gaW50ZXJuYWwgdG9iaXQgYXZhaWxhYmxlXG4gIGRlYnVnTW9kZTogdHJ1ZSwgICAgICAgICAvLyBzaG93IGNvbnNvbGUgb3V0cHV0LCBkZWJ1ZyBwYXJhbSBmb3IgbG9nZ2luZ1xuICB1c2VBamF4OiBmYWxzZSxcbiAgaXNJbnRlcm5hbDogZmFsc2UgICAgICAgIC8vIHVzZSBpbnRlcm5hbCByb3V0aW5nXG4gIC8vZnJhbWV3b3JrOiBbJ0VtYmVyJywgJ0FuZ3VsYXInLCAnQmFja2JvbmUnLCAnQW1wZXJzYW5kJywgJ1JlYWN0JywgJ2pRdWVyeSddXG59O1xuXG4vLyBUT0RPOiByZW1vdmVcbi8qZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZygpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gQ29uZmlnLnNldChhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7IC8vIFRPRE86IHJlZmFjdG9yIHRoaXNcbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIENvbmZpZy5nZXQoYXJndW1lbnRzKTtcbiAgfVxuICByZXR1cm4gQ29uZmlnLmdldCgpO1xufSovXG5cbi8vIFRPRE86IHJlZmFjdG9yIHRvIE1hcFxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XG5cbiAgLyoqXG4gICAqIEBtZXRob2QgZ2V0XG4gICAqIEBjbGFzcyBDb25maWdcbiAgICogQG1vZHVsZSBjaGF5bnMuY29uZmlnXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgUmVmZXJlbmNlIHRoZSBga2V5YCBpbiB0aGUgY29uZmlnIGBPYmplY3RgXG4gICAqIEByZXR1cm5zIHtudWxsfSBWYWx1ZSBvZiB0aGUgYGtleWAgaW4gdGhlIGNvbmZpZyBgT2JqZWN0YFxuICAgKiAgICAgICAgICAgICAgICAgYHVuZGVmaW5lZGAgaWYgdGhlIGBrZXlgIHdhcyBub3QgZm91bmRcbiAgICovXG4gIHN0YXRpYyBnZXQoa2V5KSB7XG4gICAgaWYgKGlzUHJlc2VudChrZXkpKSB7XG4gICAgICByZXR1cm4gX2NvbmZpZ1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHBhcmFtIHZhbHVlXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIHNldChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGlzQmxhbmsoa2V5KSB8fCBpc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gVE9ETzogZ29vZCBpZGVhPyBvbmUgc2hvdWxkIGJlIGNhcmVmdWwgaSBzdXBwb3NlXG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBleHRlbmQoX2NvbmZpZywgdmFsdWUpO1xuICAgIH1cbiAgICBfY29uZmlnW2tleV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gISFrZXkgJiYgKGtleSBpbiBfY29uZmlnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzT2JqZWN0LCBET019IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge21lc3NhZ2VMaXN0ZW5lcn0gZnJvbSAnLi9jYWxsYmFja3MnO1xuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9IGZyb20gJy4vY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuXG4vLyBjcmVhdGUgbmV3IExvZ2dlciBpbnN0YW5jZVxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNvcmUnKTtcblxuLy8gZGlzYWJsZSBKUyBFcnJvcnMgaW4gdGhlIGNvbnNvbGVcbkNvbmZpZy5zZXQoJ3ByZXZlbnRFcnJvcnMnLCBmYWxzZSk7XG5cbi8qKlxuICpcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKlxuICogQHR5cGUge2Jvb2xlYW59IFRydWUgaWYgdGhlIERPTSBpcyBsb2FkZWRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciBkb21SZWFkeSA9IGZhbHNlO1xuXG4vKipcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKlxuICogQHR5cGUge2FycmF5fSBDb250YWlucyBjYWxsYmFja3MgZm9yIHRoZSBET00gcmVhZHkgZXZlbnRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciByZWFkeUNhbGxiYWNrcyA9IFtdO1xuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5wcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIodXNlckNvbmZpZykge1xuICBsb2cuaW5mbygnY2hheW5zLnJlZ2lzdGVyJyk7XG4gIENvbmZpZy5zZXQodXNlckNvbmZpZyk7IC8vIHRoaXMgcmVmZXJlbmNlIHRvIHRoZSBjaGF5bnMgb2JqXG4gIHJldHVybiB0aGlzO1xufVxuXG4vLyBUT0RPOiByZWdpc3RlciBgRnVuY3Rpb25gIG9yIHByZUNoYXlucyBgT2JqZWN0YD9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDaGF5bnMoKSB7XG4gIGlmICgncHJlQ2hheW5zJyBpbiB3aW5kb3cgJiYgaXNPYmplY3Qod2luZG93LnByZUNoYXlucykpIHtcbiAgICAvLyBmaWxsIGNvbmZpZ1xuICB9XG59XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLnByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkeShjYikge1xuICBsb2cuaW5mbygnY2hheW5zLnJlYWR5Jyk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChkb21SZWFkeSkge1xuICAgIC8vIFRPRE86IHJldHVybiBhIGN1c3RvbSBNb2RlbCBPYmplY3QgaW5zdGVhZCBvZiBgY29uZmlnYFxuICAgIGNiKHtcbiAgICAgIGFwcE5hbWU6Q29uZmlnLmdldCgnYXBwTmFtZScpLFxuICAgICAgYXBwVmVyc2lvbjogQ29uZmlnLmdldCgnYXBwVmVyc2lvbicpXG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHJlYWR5Q2FsbGJhY2tzLnB1c2goYXJndW1lbnRzWzBdKTtcbn1cblxuLyoqXG4gKiBAbmFtZSBwcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0gb2JqIFJlZmVyZW5jZSB0byBjaGF5bnMgT2JqZWN0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwKCkge1xuICBsb2cuaW5mbygnc3RhcnQgY2hheW5zIHNldHVwJyk7XG5cbiAgLy8gZW5hYmxlIGBjaGF5bnMuY3NzYCBieSBhZGRpbmcgYGNoYXluc2AgY2xhc3NcbiAgLy8gcmVtb3ZlIGBuby1qc2AgY2xhc3MgYW5kIGFkZCBganNgIGNsYXNzXG4gIGxldCBib2R5ID0gZG9jdW1lbnQuYm9keTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdjaGF5bnMnKTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdqcycpO1xuICBET00ucmVtb3ZlQ2xhc3MoYm9keSwgJ25vLWpzJyk7XG5cblxuICAvLyBydW4gcG9seWZpbGwgKGlmIHJlcXVpcmVkKVxuXG4gIC8vIHJ1biBtb2Rlcm5pemVyIChmZWF0dXJlIGRldGVjdGlvbilcblxuICAvLyBydW4gZmFzdGNsaWNrXG5cbiAgLy8gKHZpZXdwb3J0IHNldHVwKVxuXG4gIC8vIGNyYXRlIG1ldGEgdGFncyAoY29sb3JzLCBtb2JpbGUgaWNvbnMgZXRjKVxuXG4gIC8vIGRvIHNvbWUgU0VPIHN0dWZmIChjYW5vbmljYWwgZXRjKVxuXG4gIC8vIGRldGVjdCB1c2VyIChsb2dnZWQgaW4/KVxuXG4gIC8vIHJ1biBjaGF5bnMgc2V0dXAgKGNvbG9ycyBiYXNlZCBvbiBlbnZpcm9ubWVudClcblxuXG5cbiAgLy8gc2V0IERPTSByZWFkeSBldmVudFxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuXG4gICAgZG9tUmVhZHkgPSB0cnVlO1xuICAgIGxvZy5kZWJ1ZygnRE9NIHJlYWR5Jyk7XG5cbiAgICAvLyBhZGQgY2hheW5zIHJvb3QgZWxlbWVudFxuICAgIGxldCBjaGF5bnNSb290ID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtcm9vdCcpO1xuICAgIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3Jvb3QnKTtcbiAgICBET00uYXBwZW5kQ2hpbGQoYm9keSwgY2hheW5zUm9vdCk7XG5cbiAgICAvLyBkb20tcmVhZHkgY2xhc3NcbiAgICBET00uYWRkQ2xhc3MoZG9jdW1lbnQuYm9keSwgJ2RvbS1yZWFkeScpO1xuXG4gICAgLy8gZ2V0IHRoZSBBcHAgSW5mb3JtYXRpb24sIGhhcyB0byBiZSBkb25lIHdoZW4gZG9jdW1lbnQgcmVhZHlcbiAgICBsZXQgZ2V0QXBwSW5mb3JtYXRpb25DYWxsID0gIWNoYXluc0FwaUludGVyZmFjZS5nZXRHbG9iYWxEYXRhKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgLy8gbm93IENoYXlucyBpcyBvZmZpY2lhbGx5IHJlYWR5XG5cbiAgICAgIGxvZy5kZWJ1ZygnYXBwSW5mb3JtYXRpb24gY2FsbGJhY2snLCBkYXRhKTtcblxuICAgICAgcmVhZHlDYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgZGF0YSk7XG4gICAgICB9KTtcbiAgICAgIHJlYWR5Q2FsbGJhY2tzID0gW107XG5cbiAgICAgIERPTS5hZGRDbGFzcyhkb2N1bWVudC5ib2R5LCAnY2hheW5zLXJlYWR5Jyk7XG4gICAgICBET00ucmVtb3ZlQXR0cmlidXRlKERPTS5xdWVyeSgnW2NoYXlucy1jbG9ha10nKSwgJ2NoYXlucy1jbG9haycpO1xuXG4gICAgICBsb2cuaW5mbygnZmluaXNoZWQgY2hheW5zIHNldHVwJyk7XG4gICAgfSk7XG5cbiAgICBpZiAoZ2V0QXBwSW5mb3JtYXRpb25DYWxsKSB7XG4gICAgICBsb2cuZXJyb3IoJ1RoZSBBcHAgSW5mb3JtYXRpb24gY291bGQgbm90IGJlIHJldHJpZXZlZC4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHN0YXJ0IHdpbmRvdy5vbignbWVzc2FnZScpIGxpc3RlbmVyIGZvciBGcmFtZSBDb21tdW5pY2F0aW9uXG4gIG1lc3NhZ2VMaXN0ZW5lcigpO1xuXG5cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVjdCBgQnJvd3NlcmAsIGBPU2AgYW5kICdEZXZpY2VgXG4gKiBhcyB3ZWxsIGFzIGBDaGF5bnMgRW52aXJvbm1lbnRgLCBgQ2hheW5zIFVzZXJgIGFuZCBgQ2hheW5zIFNpdGVgXG4gKiBhbmQgYXNzaWduIHRoZSBkYXRhIGludG8gdGhlIGVudmlyb25tZW50IG9iamVjdFxuICovXG5mdW5jdGlvbiBzZXRFbnZpcm9ubWVudCgpIHtcblxufVxuIiwiLyoqXG4gKiBAbW9kdWxlIGNoYXlucy5lbnZpcm9ubWVudFxuICogQGRlc2NyaXB0aW9uXG4gKiBDaGF5bnMgRW52aXJvbm1lbnRcbiAqL1xuXG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnLi4vdXRpbHMnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVudmlyb25tZW50Jyk7XG5cbi8vIFRPRE86IGltcG9ydCBkZXBlbmRlbmNpZXNcbmV4cG9ydCB2YXIgdHlwZXMgPSB7fTtcblxudHlwZXMuYnJvd3NlciA9IFtcbiAgJ2Nocm9tZScsXG4gICdmaXJlZm94JyxcbiAgJ3NhZmFyaScsXG4gICdvcGVyYScsXG4gICdjaHJvbWUgbW9iaWxlJyxcbiAgJ3NhZmFyaSBtb2JpbGUnLFxuICAnZmlyZWZveCBtb2JpbGUnXG5dO1xuXG50eXBlcy5vcyA9IFtcbiAgJ3dpbmRvd3MnLFxuICAnbWFjT1MnLFxuICAnYW5kcm9pZCcsXG4gICdpb3MnLFxuICAnd3AnXG5dO1xuXG50eXBlcy5jaGF5bnNPUyA9IHtcbiAgd2ViOiAnd2Vic2hhZG93JyxcbiAgd2ViTW9iaWxlOiAnd2Vic2hhZG93bW9iaWxlJyxcbiAgYXBwOiAnd2Vic2hhZG93bW9iaWxlJ1xufTtcblxuLy8gVE9ETzogaGlkZSBpbnRlcm5hbCBwYXJhbWV0ZXJzIGZyb20gdGhlIG90aGVyc1xuLy8gVE9ETzogb2ZmZXIgdXNlciBhbiBgT2JqZWN0YCB3aXRoIFVSTCBQYXJhbWV0ZXJzXG4vLyBsb2NhdGlvbiBxdWVyeSBzdHJpbmdcbnZhciBxdWVyeSA9IGxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSk7XG52YXIgcGFyYW1ldGVycyA9IHt9O1xucXVlcnkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKHBhcnQpIHtcbiAgdmFyIGl0ZW0gPSBwYXJ0LnNwbGl0KCc9Jyk7XG4gIHBhcmFtZXRlcnNbaXRlbVswXS50b0xvd2VyQ2FzZSgpXSA9IGRlY29kZVVSSUNvbXBvbmVudChpdGVtWzFdKS50b0xvd2VyQ2FzZSgpO1xufSk7XG5cbi8vIHZlcmlmeSBieSBjaGF5bnMgcmVxdWlyZWQgcGFyYW1ldGVycyBleGlzdFxuaWYgKCFwYXJhbWV0ZXJzLmFwcHZlcnNpb24pIHtcbiAgbG9nLndhcm4oJ25vIGFwcCB2ZXJzaW9uIHBhcmFtZXRlcicpO1xufVxuaWYgKCFwYXJhbWV0ZXJzLm9zKSB7XG4gIGxvZy53YXJuKCdubyBvcyBwYXJhbWV0ZXInKTtcbn1cbmlmIChwYXJhbWV0ZXJzLmRlYnVnKSB7XG4gIC8vIFRPRE86IGVuYWJsZSBkZWJ1ZyBtb2RlXG59XG5cbi8vIFRPRE86IGZ1cnRoZXIgcGFyYW1zIGFuZCBjb2xvcnNjaGVtZVxuLy8gVE9ETzogZGlzY3VzcyByb2xlIG9mIFVSTCBwYXJhbXMgYW5kIHRyeSB0byByZXBsYWNlIHRoZW0gYW5kIG9ubHkgdXNlIEFwcERhdGFcblxuXG5mdW5jdGlvbiBnZXRGaXJzdE1hdGNoKHJlZ2V4KSB7XG4gIHZhciBtYXRjaCA9IHVhLm1hdGNoKHJlZ2V4KTtcbiAgcmV0dXJuIChtYXRjaCAmJiBtYXRjaC5sZW5ndGggPiAxICYmIG1hdGNoWzFdKSB8fCAnJztcbn1cblxuLy8gdXNlciBhZ2VudCBkZXRlY3Rpb25cbnZhciB1c2VyQWdlbnQgPSAod2luZG93Lm5hdmlnYXRvciAmJiBuYXZpZ2F0b3IudXNlckFnZW50KSB8fCAnJztcblxudmFyIGlzID0ge1xuICBpb3M6IC9pUGhvbmV8aVBhZHxpUG9kL2kudGVzdCh1c2VyQWdlbnQpLFxuICBhbmRyb2lkOiAvQW5kcm9pZC9pLnRlc3QodXNlckFnZW50KSxcbiAgd3A6IC93aW5kb3dzIHBob25lL2kudGVzdCh1c2VyQWdlbnQpLFxuICBiYjogL0JsYWNrQmVycnl8QkIxMHxSSU0vaS50ZXN0KHVzZXJBZ2VudCksXG5cbiAgb3BlcmE6ICghIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMCksXG4gIGZpcmVmb3g6ICh0eXBlb2YgSW5zdGFsbFRyaWdnZXIgIT09ICd1bmRlZmluZWQnKSxcbiAgc2FmYXJpOiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5IVE1MRWxlbWVudCkuaW5kZXhPZignQ29uc3RydWN0b3InKSA+IDApLFxuICBjaHJvbWU6ICghIXdpbmRvdy5jaHJvbWUgJiYgISghIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMCkpLFxuICBpZTogZmFsc2UgfHwgISFkb2N1bWVudC5kb2N1bWVudE1vZGUsXG4gIGllMTE6IC9tc2llIDExL2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTEwOiAvbXNpZSAxMC9pLnRlc3QodXNlckFnZW50KSxcbiAgaWU5OiAvbXNpZSA5L2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTg6IC9tc2llIDgvaS50ZXN0KHVzZXJBZ2VudCksXG5cbiAgbW9iaWxlOiAvKGlwaG9uZXxpcG9kfCgoPzphbmRyb2lkKT8uKj9tb2JpbGUpfGJsYWNrYmVycnl8bm9raWEpL2kudGVzdCh1c2VyQWdlbnQpLFxuICB0YWJsZXQ6IC8oaXBhZHxhbmRyb2lkKD8hLiptb2JpbGUpfHRhYmxldCkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGtpbmRsZTogL1xcVyhraW5kbGV8c2lsaylcXFcvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHR2OiAvZ29vZ2xldHZ8c29ueWR0di9pLnRlc3QodXNlckFnZW50KVxufTtcblxuLy8gVE9ETzogQnJvd3NlciBWZXJzaW9uIGFuZCBPUyBWZXJzaW9uIGRldGVjdGlvblxuXG4vLyBUT0RPOiBhZGQgZmFsbGJhY2tcbnZhciBvcmllbnRhdGlvbiA9IE1hdGguYWJzKHdpbmRvdy5vcmllbnRhdGlvbiAlIDE4MCkgPT09IDAgPyAncG9ydHJhaXQnIDogJ2xhbmRzY2FwZSc7XG52YXIgdmlld3BvcnQgPSB3aW5kb3cuaW5uZXJXaWR0aCArICd4JyArIHdpbmRvdy5pbm5lckhlaWdodDtcblxuZXhwb3J0IHZhciBlbnZpcm9ubWVudCA9IHtcblxuICAvL29zOiBwYXJhbWV0ZXJzLm9zLFxuICBvc1ZlcnNpb246IDEsXG5cbiAgYnJvd3NlcjogJycsXG4gIGJyb3dzZXJWZXJzaW9uOiAxLFxuXG4gIC8vYXBwVmVyc2lvbjogcGFyYW1ldGVycy5hcHB2ZXJzaW9uLFxuXG4gIC8vb3JpZW50YXRpb246IG9yaWVudGF0aW9uLFxuXG4gIC8vdmlld3BvcnQ6IHZpZXdwb3J0LCAvLyBpbiAxeDEgaW4gcHhcblxuICAvL3JhdGlvOiAxLCAvLyBwaXhlbCByYXRpb1xuXG4gIC8vaXNJbkZyYW1lOiBmYWxzZSxcblxuICAvL2lzQ2hheW5zV2ViOiBudWxsLCAvLyBkZXNrdG9wIGJyb3dzZXIsIG5vIEFwcCwgbm8gbW9iaWxlXG4gIC8vaXNDaGF5bnNXZWJNb2JpbGU6IG51bGwsIC8vIG1vYmlsZSBicm93c2VyLCBubyBBcHAsIG5vIGRlc2t0b3BcbiAgLy9pc0FwcDogZmFsc2UsIC8vIG90aGVyd2lzZSBCcm93c2VyXG4gIC8vaXNNb2JpbGU6IG51bGwsIC8vIG5vIGRlc2t0b3AsIGJ1dCBtb2JpbGUgYnJvd3NlciBhbmQgYXBwXG4gIC8vaXNUYWJsZXQ6IG51bGwsIC8vIG5vIGRlc2t0b3AsIGtpbmRhIG1vYmlsZSwgbW9zdCBsaWtlbHkgbm8gYXBwXG4gIC8vaXNEZXNrdG9wOiBudWxsLCAvLyBubyBhcHAsIG5vIG1vYmlsZVxuICAvL2lzQnJvd3NlcjogbnVsbCwgLy8gb3RoZXJ3aXNlIEFwcFxuXG4gIC8vaXNJT1M6IGlzLmlvcyxcbiAgLy9pc0FuZHJvaWQ6IGlzLmFuZHJvaWQsXG4gIC8vaXNXUDogaXMud3AsXG4gIC8vaXNCQjogaXMuYmIsXG5cbiAgLy9wYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzLFxuICAvL2hhc2g6IGxvY2F0aW9uLmhhc2guc3Vic3RyKDEpLFxuXG4gIHNpdGU6IHtcbiAgICBzaXRlSWQ6IDEsXG4gICAgbmFtZTogJ1RvYml0JyxcbiAgICBsb2NhdGlvbklkOiAxLFxuICAgIHVybDogJ2h0dHBzOi8vdG9iaXQuY29tLycsXG4gICAgdXNlU1NMOiB0cnVlLFxuICAgIGNvbG9yc2NoZW1lOiAxXG4gICAgLy9lZGl0TW9kZTogZmFsc2UsIC8vIGZ1dHVyZSBlZGl0IG1vZGUgZm9yIGNvbnRlbnRcbiAgICAvL2lzQWRtaW5Nb2RlOiB0cnVlXG4gIH0sXG5cbiAgLy8gVE9ETzogY29uc2lkZXIgVGFwcFxuICBhcHA6IHtcbiAgICBhcHBJZDogMSxcbiAgICBjb25maWc6IHt9LFxuICAgIC8vZGVmYXVsdENvbnRpZjoge30sXG4gICAgZG9tUmVhZHk6IGZhbHNlLFxuICAgIGxvZ3M6IHtcbiAgICAgIGxvZzogW10sXG4gICAgICBkZWJ1ZzogW10sXG4gICAgICB3YXJuOiBbXVxuICAgIH0sXG4gICAgZXJyb3JzOiBbXVxuICB9XG59O1xuXG5lbnZpcm9ubWVudC5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcbmVudmlyb25tZW50Lmhhc2ggPSBsb2NhdGlvbi5oYXNoLnN1YnN0cigxKTtcblxuLy8gV0FUQ0ggT1VUIHRoZSBPUyBpcyBzZXQgYnkgcGFyYW1ldGVyICh1bmZvcnR1bmF0ZWx5KVxuZW52aXJvbm1lbnQub3MgPSBwYXJhbWV0ZXJzLm9zIHx8ICdub09TJzsgLy8gVE9ETzogcmVmYWN0b3IgT1NcbmlmIChpcy5tb2JpbGUgJiYgWydhbmRyb2lkJywgJ2lvcycsICd3cCddLmluZGV4T2YocGFyYW1ldGVycy5vcykgIT09IC0xKSB7XG4gIHBhcmFtZXRlcnMub3MgPSB0eXBlcy5jaGF5bnNPUy5hcHA7XG59XG5cbi8vIGRldGVjdGlvbiBieSB1c2VyIGFnZW50XG5lbnZpcm9ubWVudC5pc0lPUyA9IGlzLmlvcztcbmVudmlyb25tZW50LmlzQW5kcm9pZCA9IGlzLmFuZHJvaWQ7XG5lbnZpcm9ubWVudC5pc1dQID0gaXMud3A7XG5lbnZpcm9ubWVudC5pc0JCID0gaXMuYmI7XG5cbi8vIFRPRE86IG1ha2Ugc3VyZSB0aGF0IHRoaXMgYWx3YXlzIHdvcmtzISAoVFNQTiwgY3JlYXRlIGlmcmFtZSB0ZXN0IHBhZ2UpXG5lbnZpcm9ubWVudC5pc0luRnJhbWUgPSAod2luZG93ICE9PSB3aW5kb3cudG9wKTtcblxuZW52aXJvbm1lbnQuaXNBcHAgPSAocGFyYW1ldGVycy5vcyA9PT0gdHlwZXMuY2hheW5zT1MuYXBwICYmIGlzLm1vYmlsZSAmJiAhZW52aXJvbm1lbnQuaXNJbkZyYW1lKTsgLy8gVE9ETzogZG9lcyB0aGlzIGFsd2F5cyB3b3JrP1xuZW52aXJvbm1lbnQuYXBwVmVyc2lvbiA9IHBhcmFtZXRlcnMuYXBwdmVyc2lvbjtcblxuZW52aXJvbm1lbnQuaXNCcm93c2VyID0gIWVudmlyb25tZW50LmlzQXBwO1xuXG5lbnZpcm9ubWVudC5pc0Rlc2t0b3AgPSAoIWlzLm1vYmlsZSAmJiAhaXMudGFibGV0KTtcblxuZW52aXJvbm1lbnQuaXNNb2JpbGUgPSBpcy5tb2JpbGU7XG5lbnZpcm9ubWVudC5pc1RhYmxldCA9IGlzLnRhYmxldDtcblxuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGUgPSAocGFyYW1ldGVycy5vcyA9PT0gdHlwZXMuY2hheW5zT1Mud2ViTW9iaWxlKSAmJiBlbnZpcm9ubWVudC5pc0luRnJhbWU7XG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3AgPSAocGFyYW1ldGVycy5vcyA9PT0gdHlwZXMuY2hheW5zT1Mud2ViKSAmJiBlbnZpcm9ubWVudC5pc0luRnJhbWU7XG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYiA9IGVudmlyb25tZW50LmlzQ2hheW5zV2ViRGVza3RvcCB8fCBlbnZpcm9ubWVudC5pc0NoYXluc1dlYk1vYmlsZTtcblxuLy8gaW50ZXJuYWwgVE9ETzogbWFrZSBpdCBwcml2YXRlP1xuZW52aXJvbm1lbnQuY2FuQ2hheW5zQ2FsbCA9IGVudmlyb25tZW50LmlzQXBwO1xuZW52aXJvbm1lbnQuY2FuQ2hheW5zV2ViQ2FsbCA9IGVudmlyb25tZW50LmlzQ2hheW5zV2ViO1xuXG5lbnZpcm9ubWVudC52aWV3cG9ydCA9IHZpZXdwb3J0OyAvLyBUT0RPOiB1cGRhdGUgb24gcmVzaXplPyBubywgZHVlIHBlcmZvcm1hbmNlXG5lbnZpcm9ubWVudC5vcmllbnRhdGlvbiA9IG9yaWVudGF0aW9uO1xuZW52aXJvbm1lbnQucmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiIsImV4cG9ydCB2YXIgdXNlciA9IHtcbiAgbmFtZTogJ1BhY2FsIFdlaWxhbmQnLFxuICBmaXJzdE5hbWU6ICdQYXNjYWwnLFxuICBsYXN0TmFtZTogJ1dlaWxhbmQnLFxuICB1c2VySWQ6IDEyMzQsXG4gIGZhY2Vib29rSWQ6IDEyMzQ1LFxuICBpc0FkbWluOiB0cnVlLFxuICB1YWNHcm91cHM6IFtdLFxuICBsYW5ndWFnZTogJ2RlX0RFJyxcbiAgdG9rZW46ICd0b2tlbicgLy8gVE9ETyBpbmNsdWRlIHRva2VuIGhlcmU/XG59O1xuIiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIC8vIEluc3RlYWQgb2YgaXRlcmFibGUgZm9yIG5vdy5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5tYXApLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgY2FsbGJhY2sobmFtZSwgc2VsZi5tYXBbbmFtZV0pXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKCk7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKCFib2R5KSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgIH1cblxuICAgICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoIWJvZHkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QodXJsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB0aGlzLnVybCA9IHVybFxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIG9wdGlvbnMuYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShvcHRpb25zLmJvZHkpXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhlYWRlcnMoeGhyKSB7XG4gICAgdmFyIGhlYWQgPSBuZXcgSGVhZGVycygpXG4gICAgdmFyIHBhaXJzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuZmV0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgaWYgKHNlbGYuY3JlZGVudGlhbHMgPT09ICdjb3JzJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVzcG9uc2VVUkwoKSB7XG4gICAgICAgIGlmICgncmVzcG9uc2VVUkwnIGluIHhocikge1xuICAgICAgICAgIHJldHVybiB4aHIucmVzcG9uc2VVUkxcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF2b2lkIHNlY3VyaXR5IHdhcm5pbmdzIG9uIGdldFJlc3BvbnNlSGVhZGVyIHdoZW4gbm90IGFsbG93ZWQgYnkgQ09SU1xuICAgICAgICBpZiAoL15YLVJlcXVlc3QtVVJMOi9tLnRlc3QoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSkge1xuICAgICAgICAgIHJldHVybiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0dXMgPSAoeGhyLnN0YXR1cyA9PT0gMTIyMykgPyAyMDQgOiB4aHIuc3RhdHVzXG4gICAgICAgIGlmIChzdGF0dXMgPCAxMDAgfHwgc3RhdHVzID4gNTk5KSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBoZWFkZXJzKHhociksXG4gICAgICAgICAgdXJsOiByZXNwb25zZVVSTCgpXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHQ7XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihzZWxmLm1ldGhvZCwgc2VsZi51cmwsIHRydWUpXG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgc2VsZi5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2Ygc2VsZi5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHNlbGYuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMudXJsID0gbnVsbFxuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXNcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gb3B0aW9ucy5zdGF0dXNUZXh0XG4gICAgdGhpcy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzO1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0O1xuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodXJsLCBvcHRpb25zKS5mZXRjaCgpXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKCk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzIG9yIHRvYmlcbiAqIEBtb2R1bGUgamFtZXNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgamFtZXMgLSB0b2JpdCBoZWxwZXIgbGlicmFyeVxuICogSGVscGVyIGxpYnJhcnkgc3VwcG9ydGluZyB0aGUgQ2hheW5zIEFQSVxuICovXG5cbi8vIFRPRE86IG1vdmUgYWxsIHRvIGhlbHBlci5qcyBvciB0b2JpL2phbXNcbi8vIFRPRE86IGhlbHBlci5qcyB3aXRoIEVTNiBhbmQgamFzbWluZSAoYW5kIG9yIHRhcGUpXG4vLyBpbmNsdWRlIGhlbHBlciBhcyBtYWluIG1vZHVsZVxuXG4vLyBpbXBvcnRhbnQgaXMqIGZ1bmN0aW9uc1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9pcyc7XG5cbi8vIGV4dGVuZCBvYmplY3QgZnVuY3Rpb25cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXh0ZW5kJztcblxuLy8gbW9kZXJuaXplclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL21vZGVybml6ZXInO1xuXG4vLyBwcm9taXNlIFFcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9wcm9taXNlJztcblxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9odHRwJztcblxuLy8gQnJvd3NlciBBUElzICh3aW5kb3csIGRvY3VtZW50LCBsb2NhdGlvbilcbi8vIFRPRE86IGNvbnNpZGVyIHRvIG5vdCBiaW5kIGJyb3dzZXIgdG8gdGhlIHV0aWxzIGBPYmplY3RgXG4vKiBqc2hpbnQgLVcxMTYgKi9cbi8qIGpzaGludCAtVzAzMyAqL1xuLy8ganNjczpkaXNhYmxlIHBhcnNlRXJyb3JcbmltcG9ydCAqIGFzIGJyb3dzZXIgZnJvbSAnLi91dGlscy9icm93c2VyJzsgLy9ub2luc3BlY3Rpb24gQmFkRXhwcmVzc2lvblN0YXRlbWVudEpTIGpzaGludCBpZ25vcmU6IGxpbmVcbi8vIGpzY3M6ZW5hYmxlIHBhcnNlRXJyb3Jcbi8qIGpzaGludCArVzAzMyAqL1xuLyoganNoaW50ICtXMTE2ICovXG5leHBvcnQge2Jyb3dzZXJ9O1xuXG4vLyBET01cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZG9tJztcblxuLy8gTG9nZ2VyXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XG5cbi8vIEFuYWx5dGljc1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2FuYWx5dGljcyc7XG5cbi8vIFJlbW90ZVxuLy8gcmVtb3RlIGRlYnVnZ2luZyBhbmQgYW5hbHlzaXNcblxuLy8gZnJvbnQtZW5kIEVycm9yIEhhbmRsZXIgKGNhdGNoZXMgZXJyb3JzLCBpZGVudGlmeSBhbmQgYW5hbHlzZXMgdGhlbSlcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXJyb3InO1xuXG4vLyBhdXRoICYgSldUIGhhbmRsZXJcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9qd3QnO1xuXG4vLyBjb29raWUgaGFuZGxlciAod2lsbCBiZSB1c2VkIGluIHRoZSBsb2NhbF9zdG9yYWdlIGFzIGZhbGxiYWNrKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Nvb2tpZV9oYW5kbGVyJztcblxuLy8gbG9jYWxTdG9yYWdlIGhlbHBlciAod2hpY2ggY29va2llIGZhbGxiYWNrKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xvY2FsX3N0b3JhZ2UnO1xuXG4vLyBtaWNybyBldmVudCBsaWJyYXJ5XG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2V2ZW50cyc7XG5cbi8vIG9mZmxpbmUgY2FjaGUgaGVscGVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvb2ZmbGluZV9jYWNoZSc7XG5cbi8vIG5vdGlmaWNhdGlvbnM6IHRvYXN0cywgYWxlcnRzLCBtb2RhbCBwb3B1cHMsIG5hdGl2ZSBwdXNoXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbm90aWZpY2F0aW9ucyc7XG5cbi8vIGlmcmFtZSBjb21tdW5pY2F0aW9uIGFuZCBoZWxwZXIgKENPUlMpXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvaWZyYW1lJztcblxuLy8gcGFnZSB2aXNpYmlsaXR5IEFQSVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL3BhZ2VfdmlzaWJpbGl0eSc7XG5cbi8vIERhdGVUaW1lIGhlbHBlciAoY29udmVydHMgZGF0ZXMsIEMjIGRhdGUsIHRpbWVzdGFtcHMsIGkxOG4sIHRpbWUgYWdvKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2RhdGV0aW1lJztcblxuXG4vLyBsYW5ndWFnZSBBUEkgaTE4blxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xhbmd1YWdlJztcblxuLy8gY3JpdGljYWwgY3NzXG5cbi8vIGxvYWRDU1NcblxuLy8gbGF6eSBsb2FkaW5nXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbGF6eV9sb2FkaW5nJztcblxuLy8gKGltYWdlKSBwcmVsb2FkZXJcbi8vZXhwb3J0ICogZnJvbSAnL3V0aWxzL3ByZWxvYWRlcic7XG5cbi8vIGlzUGVtaXR0ZWQgQXBwIFZlcnNpb24gY2hlY2tcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvaXNfcGVybWl0dGVkJztcblxuXG4vLyBpbiBGdXR1cmVcbi8vIGltbXV0YWJsZVxuLy8gd2VhayBtYXBzXG4vLyBvYnNlcnZlclxuLy8gd2ViIHNvY2tldHMgKHdzLCBTaWduYWxSKVxuLy8gd29ya2VyIChzaGFyZWQgd29ya2VyLCBsYXRlciBzZXJ2aWNlIHdvcmtlciBhcyB3ZWxsKVxuLy8gbG9jYXRpb24sIHB1c2hTdGF0ZSwgaGlzdG9yeSBoYW5kbGVyXG4vLyBjaGF5bnMgc2l0ZSBhbmQgY29kZSBhbmFseXNlcjogZmluZCBkZXByZWNhdGVkIG1ldGhvZHMsIGJhZCBjb2RlLCBpc3N1ZXMgYW5kIGJvdHRsZW5lY2tzXG5cbiIsIi8qKlxuICogVGhpcyBtb2R1bGUgY29udGFpbnMgdGhlIEJyb3dzZXIgQVBJc1xuICpcbiAqL1xuLy8gVE9ETzogbW92ZSBvdXQgb2YgdXRpbHNcbnZhciB3aW4gPSB3aW5kb3c7XG5cbi8vIHVzaW5nIG5vZGUgZ2xvYmFsIChtYWlubHkgZm9yIHRlc3RpbmcsIGRlcGVuZGVuY3kgbWFuYWdlbWVudClcbnZhciBfZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3c7XG5leHBvcnQge19nbG9iYWwgYXMgZ2xvYmFsfTtcblxuZXhwb3J0IHt3aW4gYXMgd2luZG93fTtcbmV4cG9ydCB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQ7XG5leHBvcnQgdmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuZXhwb3J0IHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuZXhwb3J0IHZhciBjaGF5bnMgPSB3aW5kb3cuY2hheW5zO1xuZXhwb3J0IHZhciBjaGF5bnNDYWxsYmFja3MgPSB3aW5kb3cuX2NoYXluc0NhbGxiYWNrcztcbmV4cG9ydCB2YXIgY2hheW5zUm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF5bnMtcm9vdCcpO1xuZXhwb3J0IHZhciBwYXJlbnQgPSB3aW5kb3cucGFyZW50O1xuZXhwb3J0IHZhciBjb25zb2xlID0gd2luZG93LmNvbnNvbGU7IC8vIE5PVEU6IHNob3VsZCBub3QgYmUgdXNlZC4gdXNlIGxvZ2dlciBpbnN0ZWFkXG5leHBvcnQgdmFyIGdjID0gd2luZG93LmdjID8gKCkgPT4gd2luZG93LmdjKCkgOiAoKSA9PiBudWxsO1xuXG4iLCIvLyBpbnNwaXJlZCBieSBBbmd1bGFyMidzIERPTVxuXG5pbXBvcnQge2RvY3VtZW50fSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtpc1VuZGVmaW5lZH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBjbGFzcyBET00ge1xuXG4gIC8vIE5PVEU6IGFsd2F5cyByZXR1cm5zIGFuIGFycmF5XG4gIHN0YXRpYyAkKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwuYmluZChkb2N1bWVudCk7XG4gIH1cblxuICAvLyBzZWxlY3RvcnNcbiAgc3RhdGljIHF1ZXJ5KHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBxdWVyeVNlbGVjdG9yKGVsLCBzZWxlY3Rvcikge1xuICAgIHJldHVybiBlbC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvckFsbChlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIG9uKGVsLCBldnQsIGxpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldnQsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjbG9uZShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuY2xvbmVOb2RlKHRydWUpO1xuICB9XG4gIHN0YXRpYyBoYXNQcm9wZXJ0eShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIG5hbWUgaW4gZWxlbWVudDtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShuYW1lKTtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeVRhZ05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKG5hbWUpO1xuICB9XG5cbiAgLy8gaW5wdXRcbiAgc3RhdGljIGdldElubmVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5pbm5lckhUTUw7XG4gIH1cbiAgc3RhdGljIGdldE91dGVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5vdXRlckhUTUw7XG4gIH1cbiAgc3RhdGljIHNldEhUTUwoZWwsIHZhbHVlKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH1cbiAgc3RhdGljIGdldFRleHQoZWwpIHtcbiAgICByZXR1cm4gZWwudGV4dENvbnRlbnQ7XG4gIH1cbiAgc3RhdGljIHNldFRleHQoZWwsIHZhbHVlKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGlucHV0IHZhbHVlXG4gIHN0YXRpYyBnZXRWYWx1ZShlbCkge1xuICAgIHJldHVybiBlbC52YWx1ZTtcbiAgfVxuICBzdGF0aWMgc2V0VmFsdWUoZWwsIHZhbHVlKSB7XG4gICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGNoZWNrYm94ZXNcbiAgc3RhdGljIGdldENoZWNrZWQoZWwpIHtcbiAgICByZXR1cm4gZWwuY2hlY2tlZDtcbiAgfVxuICBzdGF0aWMgc2V0Q2hlY2tlZChlbCwgdmFsdWUpIHtcbiAgICBlbC5jaGVja2VkID0gdmFsdWU7XG4gIH1cblxuICAvLyBjbGFzc1xuICBzdGF0aWMgY2xhc3NMaXN0KGVsZW1lbnQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWxlbWVudC5jbGFzc0xpc3QsIDApO1xuICB9XG4gIHN0YXRpYyBhZGRDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIGhhc0NsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICB9XG5cbiAgLy8gY3NzXG4gIHN0YXRpYyBjc3MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZoYXNhbHVlKSB7XG4gICAgaWYoaXNVbmRlZmluZWQoc3R5bGVWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gICAgfVxuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IHN0eWxlVmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldENTUyhlbGVtZW50LCBzdHlsZU5hbWUsIHN0eWxlVmFsdWUpIHtcbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDU1MoZWxlbWVudCwgc3R5bGVOYW1lKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gbnVsbDtcbiAgfVxuICBzdGF0aWMgZ2V0Q1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjcmVhdGVFbGVtZW50KHRhZ05hbWUsIGRvYz1kb2N1bWVudCkge1xuICAgIHJldHVybiBkb2MuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgfVxuXG4gIHN0YXRpYyByZW1vdmUoZWwpIHtcbiAgICB2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZTtcbiAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIHJldHVybiBlbDtcbiAgfVxuXG4gIHN0YXRpYyBhcHBlbmRDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLmFwcGVuZENoaWxkKG5vZGUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICB9XG5cbiAgc3RhdGljIGluc2VydEJlZm9yZShlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRBZnRlcihlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHN0YXRpYyB0YWdOYW1lKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lO1xuICB9XG5cbiAgLy8gYXR0cmlidXRlc1xuICBzdGF0aWMgZ2V0QXR0cmlidXRlKGVsZW1lbnQsIGF0dHJpYnV0ZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICB9XG4gIHN0YXRpYyBzZXRBdHRyaWJ1dGUoZWxlbWVudCwgbmFtZSwgdmFsdWUpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBFcnJvciBIYW5kbGVyIE1vZHVsZVxuICovXG5cbi8vIFRPRE86IGNvbnNpZGVyIGltcG9ydGluZyBmcm9tICcuL3V0aWxzJyBvbmx5XG5pbXBvcnQge3dpbmRvdyBhcyB3aW59IGZyb20gJy4vYnJvd3Nlcic7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHtDb25maWd9IGZyb20gJy4uL2NoYXlucy9jb25maWcnO1xuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuZXJyb3InKTtcblxud2luLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxldCBsaW5lQW5kQ29sdW1uSW5mbyA9XG4gICAgZXJyLmNvbG5vXG4gICAgICA/ICcgbGluZTonICsgZXJyLmxpbmVubyArICcsIGNvbHVtbjonICsgZXJyLmNvbG5vXG4gICAgICA6ICcgbGluZTonICsgZXJyLmxpbmVubztcblxuICBsZXQgZmluYWxFcnJvciA9IFtcbiAgICAgICdKYXZhU2NyaXB0IEVycm9yJyxcbiAgICAgIGVyci5tZXNzYWdlLFxuICAgICAgZXJyLmZpbGVuYW1lICsgbGluZUFuZENvbHVtbkluZm8gKyAnIC0+ICcgKyAgbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgICAgIDAsXG4gICAgICB0cnVlXG4gIF07XG5cbiAgLy8gVE9ETzogYWRkIHByb3BlciBFcnJvciBIYW5kbGVyXG4gIGxvZy53YXJuKGZpbmFsRXJyb3IpO1xuICBpZihDb25maWcuZ2V0KCdwcmV2ZW50RXJyb3JzJykpIHtcbiAgICBlcnIucHJldmVudERlZmF1bHQoKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KTtcbiIsIi8vIFRPRE86IHJlZmFjdG9yIGFuZCB3cml0ZSB0ZXN0c1xuLy8gVE9ETzogYWRkIGV4YW1wbGVcbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gYGBganNcbiAvLyBEZW1vXG5cbiBldmVudHMucHVibGlzaCgnL3BhZ2UvbG9hZCcsIHtcblx0dXJsOiAnL3NvbWUvdXJsL3BhdGgnIC8vIGFueSBhcmd1bWVudFxufSk7XG5cbiB2YXIgc3Vic2NyaXB0aW9uID0gZXZlbnRzLnN1YnNjcmliZSgnL3BhZ2UvbG9hZCcsIGZ1bmN0aW9uKG9iaikge1xuXHQvLyBEbyBzb21ldGhpbmcgbm93IHRoYXQgdGhlIGV2ZW50IGhhcyBvY2N1cnJlZFxufSk7XG5cbiAvLyAuLi5zb21ldGltZSBsYXRlciB3aGVyZSBJIG5vIGxvbmdlciB3YW50IHN1YnNjcmlwdGlvbi4uLlxuIHN1YnNjcmlwdGlvbi5yZW1vdmUoKTtcblxuIC8vICB2YXIgdGFyZ2V0ID0gd2luZG93LmV2ZW50ID8gd2luZG93LmV2ZW50LnNyY0VsZW1lbnQgOiBlID8gZS50YXJnZXQgOiBudWxsO1xuIGBgYFxuICovXG5leHBvcnQgdmFyIGV2ZW50cyA9IChmdW5jdGlvbigpIHtcbiAgbGV0IHRvcGljcyA9IHt9O1xuICBsZXQgb3duUHJvcGVydHkgPSB0b3BpY3MuaGFzT3duUHJvcGVydHk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uKHRvcGljLCBsaXN0ZW5lcikge1xuICAgICAgLy8gQ3JlYXRlIHRoZSB0b3BpYydzIG9iamVjdCBpZiBub3QgeWV0IGNyZWF0ZWRcbiAgICAgIGlmICghb3duUHJvcGVydHkuY2FsbCh0b3BpY3MsIHRvcGljKSkge1xuICAgICAgICB0b3BpY3NbdG9waWNdID0gW107XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCB0aGUgbGlzdGVuZXIgdG8gcXVldWVcbiAgICAgIGxldCBpbmRleCA9IHRvcGljc1t0b3BpY10ucHVzaChsaXN0ZW5lcikgLTE7XG5cbiAgICAgIC8vIFByb3ZpZGUgaGFuZGxlIGJhY2sgZm9yIHJlbW92YWwgb2YgdG9waWNcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZGVsZXRlIHRvcGljc1t0b3BpY11baW5kZXhdO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBwdWJsaXNoOiBmdW5jdGlvbih0b3BpYywgaW5mbykge1xuICAgICAgLy8gSWYgdGhlIHRvcGljIGRvZXNuJ3QgZXhpc3QsIG9yIHRoZXJlJ3Mgbm8gbGlzdGVuZXJzIGluIHF1ZXVlLCBqdXN0IGxlYXZlXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBDeWNsZSB0aHJvdWdoIHRvcGljcyBxdWV1ZSwgZmlyZSFcbiAgICAgIHRvcGljc1t0b3BpY10uZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGl0ZW0oaW5mbyAhPT0gdW5kZWZpbmVkID8gaW5mbyA6IHt9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxufSkoKTtcbiIsIi8qKlxuICogQG5hbWUgamFtZXMuZXh0ZW5kXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeHRlbmRzIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QgYnkgY29weWluZyBwcm9wZXJ0aWVzIGZyb20gdGhlIHNyYyBvYmplY3QuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cblxuaW1wb3J0IHtpc09iamVjdH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gIGlmICghaXNPYmplY3Qob2JqKSkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cbiAgdmFyIHNvdXJjZSwgcHJvcDtcbiAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICBmb3IgKHByb3AgaW4gc291cmNlKSB7XG4gICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59XG4iLCJpbXBvcnQge3dpbmRvd30gZnJvbSAnLi9icm93c2VyJztcbmltcG9ydCB7cHJvbWlzZSwgZGVmZXJyZWR9IGZyb20gJy4vcHJvbWlzZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmZXRjaCgpIHtcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmV0Y2hKU09OKCkge1xuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwb3N0KCkge1xuXG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1cGxvYWQoKSB7XG5cbn1cbiIsIi8qKlxuICogQG5hbWUgamFtZXMuaXNVbmRlZmluZWRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgdW5kZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNVbmRlZmluZWQodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBkZWZpbmVkLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBkZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgIT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzUHJlc2VudFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgbmVpdGhlciB1bmRlZmluZWQgbm9yIG51bGwuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHByZXNlbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByZXNlbnQob2JqKSB7XG4gIHJldHVybiBvYmogIT09IHVuZGVmaW5lZCAmJiBvYmogIT09IG51bGw7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNCbGFua1xuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZWl0aGVyIHVuZGVmaW5lZCBvciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBibGFuay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQmxhbmsob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGw7XG59XG5cblxuLyoqXG4qIEBuYW1lIGphbWVzLmlzU3RyaW5nXG4qIEBtb2R1bGUgamFtZXNcbiogQGtpbmQgZnVuY3Rpb25cbipcbiogQGRlc2NyaXB0aW9uXG4qIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgU3RyaW5nYC5cbipcbiogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4qIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgU3RyaW5nYC5cbiovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNOdW1iZXJcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE51bWJlcmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYE51bWJlcmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc09iamVjdFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhbiBgT2JqZWN0YC5cbiAqIG51bGwgaXMgbm90IHRyZWF0ZWQgYXMgYW4gb2JqZWN0LlxuICogSW4gSlMgYXJyYXlzIGFyZSBvYmplY3RzXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhbiBgT2JqZWN0YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQXJyYXlcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYEFycmF5YC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYEFycmF5YC5cbiAqL1xuZXhwb3J0IHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0Z1bmN0aW9uXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBGdW5jdGlvbmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEZ1bmN0aW9uYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0RhdGVcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgdmFsdWUgaXMgYSBkYXRlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBEYXRlYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGF0ZSh2YWx1ZSkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuLy8gVE9ETzogZG9lcyBub3QgYmVsb25nIGluIGhlcmVcbi8qKlxuICogQG5hbWUgdXRpbHMudHJpbVxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZW1vdmVzIHdoaXRlc3BhY2VzLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge1N0cmluZ3wqfSBUcmltbWVkICB2YWx1ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJpbSh2YWx1ZSkge1xuICByZXR1cm4gaXNTdHJpbmcodmFsdWUpID8gdmFsdWUucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpIDogdmFsdWU7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNVVUlEXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgVVVJRGAgKE9TRikuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYFVVSURgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNVVUlEKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXlswLTlhLWZdezR9KFswLTlhLWZdezR9LSl7NH1bMC05YS16XXsxMn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0dVSURcbiAqIEBhbGlhcyB1dGlscy5pc1VVSURcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBHVUlEYCAoTWljcm9zb2Z0IFN0YW5kYXJkKS5cbiAqIElzIGFuIGFsaWFzIHRvIGlzVVVJRFxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBHVUlEYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzR1VJRCh2YWx1ZSkge1xuICByZXR1cm4gaXNVVUlEKHZhbHVlKTtcbn1cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNNYWNBZGRyZXNzXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBNQUMgQWRkcmVzc2AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01hY0FkZHJlc3ModmFsdWUpIHtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhbHVlID0gdHJpbSh2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9eKFswLTlhLWZdezJ9Wy06XSl7NX1bMC05YS1mXXsyfSQvaSkgIT09IG51bGw7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzQkxFQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYEJMRSBBZGRyZXNzYFxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBCTEUgQWRkcmVzc2AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JMRUFkZHJlc3ModmFsdWUpIHtcbiAgcmV0dXJuIGlzVVVJRCh2YWx1ZSkgfHwgaXNNYWNBZGRyZXNzKHZhbHVlKTtcbn1cbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc09iamVjdH0gZnJvbSAnLi4vdXRpbHMnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLnV0aWxzLmlzX3Blcm1pdHRlZCcpO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGN1cnJlbnQgdXNlcidzIE9TIGFuZCBPUyBWZXJzaW9uIGlzIGhpZ2hlclxuICogb3IgZXF1YWwgdG8gdGhlIHBhc3NlZCByZWZlcmVuY2UgYE9iamVjdGAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZlcnNpb25zIFZlcnNpb25zIGBPYmplY3RgIHdpdGggcGVybWl0dGVkIE9TcyBhbmQgdGhlaXIgdmVyc2lvbi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBvcyBPUyBOYW1lIGFzIGxvd2VyY2FzZSBzdHJpbmcuXG4gKiBAcGFyYW0ge0ludGVnZXJ9IGFwcFZlcnNpb24gQXBwIFZlcnNpb24gTnVtYmVyIGFzIEludGVnZXIgIFRPRE86IGZvcm1hdCBSRkM/XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY3VycmVudCBPUyAmIFZlcnNpb24gYXJlIGRlZmluZWQgaW4gdGhlIHZlcnNpb25zIGBPYmplY3RgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Blcm1pdHRlZCh2ZXJzaW9ucywgb3MsIGFwcFZlcnNpb24pIHtcblxuICBpZiAoIXZlcnNpb25zIHx8ICFpc09iamVjdCh2ZXJzaW9ucykpIHtcbiAgICBsb2cud2Fybignbm8gdmVyc2lvbnMgYE9iamVjdGAgd2FzIHBhc3NlZCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB2ZXJzaW9uc1tvc10gJiYgYXBwVmVyc2lvbiA+PSB2ZXJzaW9uc1tvc107XG59XG4iLCIvKipcbiAqIExvZ0xldmVsIEVudW1cbiAqIG5vbmUgaXMgMFxuICogZGVidWcgaXMgNFxuICogQHR5cGUgRW51bVxuICovXG5leHBvcnQgdmFyIGxldmVscyA9IHtcbiAgbm9uZTogMCxcbiAgZXJyb3I6MSxcbiAgd2FybjoyLFxuICBpbmZvOjMsXG4gIGRlYnVnOjRcbn07XG5cbi8qKlxuICogQ2FuIHN0b3JlIG11bHRpcGxlIGxvZ2dlcnNcbiAqIEB0eXBlIHtgT2JqZWN0YH0gbG9nZ2Vyc1xuICovXG5sZXQgbG9nZ2VycyA9IHt9O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogQXNzaWduIHRoZSBsb2dnZXIgbWV0aG9kLlxuICogQnkgZGVmYXVsdCB0aGUgd2luZG93LmNvbnNvbGUgYE9iamVjdGBcbiAqIEB0eXBlIGB3aW5kb3cuY29uc29sZWBcbiAqL1xubGV0IGxvZ2dlciA9IHdpbmRvdy5jb25zb2xlO1xuXG4vKipcbiAqIFNldCB0aGUgY3VycmVudCBsb2cgTGV2ZWxcbiAqIHVzZSBgc2V0TGV2ZWwobmV3TG9nTGV2ZWwpYCB0byBvdmVyd3JpdGUgdGhpcyB2YWx1ZS5cbiAqIFRPRE86IGVhY2ggbG9nZ2VyIGdldHMgYW4gb3duIGxvZ0xldmVsXG4gKi9cbmxldCBsb2dMZXZlbCA9IGxldmVscy5ub25lO1xuXG4vKipcbiAqXG4gKiBAcGFyYW0gbGV2ZWxcbiAqIEBwYXJhbSBhcmdzXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBsb2cobGV2ZWwsIGFyZ3MsIHByZWZpeCkge1xuICBsZXQgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG4gIGlmIChwcmVmaXgpIHtcbiAgICBhcmdzID0gc2xpY2UuY2FsbChhcmdzKTtcbiAgICAvL2FyZ3MudW5zaGlmdCh0aW1lKTsgLy8gVE9ETzogY29uc2lkZXIgdG9nZ2xlYWJsZSB0aW1lXG4gICAgYXJncy51bnNoaWZ0KHByZWZpeCk7XG4gIH1cbiAgbG9nZ2VyW2xldmVsIHx8ICdsb2cnXS5hcHBseShjb25zb2xlLCBhcmdzKTtcbn1cblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nTGV2ZWxcbiAqIGluIG9yZGVyIHRvIHNob3cgb3Igbm90IHNob3cgbG9nc1xuICogQHBhcmFtIGxldmVsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRMZXZlbChsZXZlbCkge1xuICBsb2dMZXZlbCA9IGxldmVsO1xufVxuXG4vKipcbiAqIEdldCBMb2dnZXIgU2luZ2xldG9uIEluc3RhbmNlXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgVGhlIExvZ2dlcidzIG5hbWVcbiAqIEByZXR1cm5zIHtMb2dnZXJ9IExvZ2dlciBpbnN0YW5jZSwgZWl0aGVyIGV4aXN0aW5nIG9uZSBvciBjcmVhdGVzIGEgbmV3IG9uZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9nZ2VyKG5hbWUpIHtcbiAgcmV0dXJuIGxvZ2dlcnNbbmFtZV0gfHwgKGxvZ2dlcnNbbmFtZV0gPSBuZXcgTG9nZ2VyKG5hbWUpKTtcbn1cblxuLyoqXG4gKiBMb2dnZXIgY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG5cbiAgLyoqXG4gICAqIEVhY2ggbG9nZ2VyIGlzIGlkZW50aWZpZWQgYnkgaXQncyBuYW1lLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBsb2dnZXIgKGUuZy4gYGNoYXlucy5jb3JlYClcbiAgICovXG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSAnWycgKyBuYW1lICsgJ106ICc7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqXG4gICAqIEBtZXRob2QgZGVidWdcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICBkZWJ1ZygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCA0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnZGVidWcnLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBpbmZvLlxuICAgKlxuICAgKiBAbWV0aG9kIGluZm9cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICBpbmZvKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdpbmZvJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcuXG4gICAqXG4gICAqIEBtZXRob2Qgd2FyblxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIHdhcm4oKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgMikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZygnd2FybicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yLlxuICAgKlxuICAgKiBAbWV0aG9kIGVycm9yXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZXJyb3IoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2Vycm9yJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gVE9ETzogaW1wZWxlbW50IFJWU1AgKG9yIGJsdWViaXJkKSBQcm9taXNlIEZhbGxiYWtjXG4vLyBUT0RPOiBpbXBsZW1lbnQgRGVmZXJyZWRcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklpSXNJbVpwYkdVaU9pSXZWWE5sY25NdmNIY3ZVSEp2YW1WamRITXZkRzlpYVhRdlkyaGhlVzV6TDJOb1lYbHVjeTVxY3k5emNtTXZkWFJwYkhNdmNISnZiV2x6WlM1cWN5SXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJYWDA9IiwiXG5pbXBvcnQge2NoYXluc30gZnJvbSAnLi9jaGF5bnMnO1xuZXhwb3J0IGRlZmF1bHQgY2hheW5zO1xuIl19
  return require('chayns');

});
