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

},{"../utils":9,"../utils/browser":10}],3:[function(require,module,exports){
"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

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

},{"../utils":9,"../utils/browser":10,"./chayns_calls":4}],4:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdXNlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9icm93c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9lcnJvci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9ldmVudHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXh0ZW5kLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzX3Blcm1pdHRlZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9sb2dnZXIuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zLXVtZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7OztJQ09ZLEtBQUssbUNBQW9CLFNBQVM7O0FBQzlDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7OztBQUcxQixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7O0lBR1YsTUFBTSxXQUF1QixpQkFBaUIsRUFBOUMsTUFBTTs7OztJQUdOLFdBQVcsV0FBa0Isc0JBQXNCLEVBQW5ELFdBQVc7Ozs7SUFHWCxJQUFJLFdBQXlCLGVBQWUsRUFBNUMsSUFBSTs7OzswQkFHeUIsZUFBZTs7SUFBNUMsS0FBSyxlQUFMLEtBQUs7SUFBRSxRQUFRLGVBQVIsUUFBUTtJQUFFLEtBQUssZUFBTCxLQUFLOzs7O0lBSXRCLE9BQU8sV0FBc0IsdUJBQXVCLEVBQXBELE9BQU87O0lBRVAsa0JBQWtCLFdBQVcsK0JBQStCLEVBQTVELGtCQUFrQjs7O0FBSW5CLElBQUksTUFBTSxXQUFOLE1BQU0sR0FBRyxFQUFFLENBQUM7O0FBRXZCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFB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Ozt1QkFSVSxNQUFNO0FBZ0JqQixTQUFLOzs7Ozs7Ozs7YUFBQSxpQkFBRztBQUNOLFlBQUksUUFBUSxHQUFHLENBQUMsRUFBRTtBQUNoQixpQkFBTztTQUNSO0FBQ0QsV0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ3BDOzs7O0FBUUQsUUFBSTs7Ozs7Ozs7O2FBQUEsZ0JBQUc7QUFDTCxZQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUU7QUFDaEIsaUJBQU87U0FDUjtBQUNELFdBQUcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNuQzs7OztBQVNELFFBQUk7Ozs7Ozs7OzthQUFBLGdCQUFHO0FBQ0wsWUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFO0FBQ2hCLGlCQUFPO1NBQ1I7O0FBRUQsV0FBRyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ25DOzs7O0FBUUQsU0FBSzs7Ozs7Ozs7O2FBQUEsaUJBQUc7QUFDTixZQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUU7QUFDaEIsaUJBQU87U0FDUjtBQUNELFdBQUcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNwQzs7Ozs7O1NBOURVLE1BQU07Ozs7Ozs7Ozs7SUN2RVgsTUFBTSxXQUFPLFVBQVUsRUFBdkIsTUFBTTs7aUJBQ0MsTUFBTSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIEBuYW1lIGNoYXlucyBBUElcbiAqIEBtb2R1bGUgY2hheW5zXG4gKi9cblxuLy8gaGVscGVyXG4vLyBUT0RPOiBlaXRoZXIgaW5kZXguanMsIHV0aWxzLmpzIG9yIGp1c3QgdGhlIHNpbmdsZSBmaWxlc1xuaW1wb3J0ICogYXMgdXRpbHMgICAgICAgICAgICAgICBmcm9tICcuL3V0aWxzJztcbnZhciBleHRlbmQgPSB1dGlscy5leHRlbmQ7XG5cbi8vIHNldCBsb2dMZXZlbCB0byBpbmZvXG51dGlscy5zZXRMZXZlbCg0KTsgLy8gVE9ETzogZG9uJ3Qgc2V0IHRoZSBsZXZlbCBoZXJlXG5cbi8vIGJhc2ljIGNvbmZpZ1xuaW1wb3J0IHtjb25maWd9ICAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy9jb25maWcnO1xuXG4vLyBlbnZpcm9ubWVudFxuaW1wb3J0IHtlbnZpcm9ubWVudH0gICAgICAgICAgICBmcm9tICcuL2NoYXlucy9lbnZpcm9ubWVudCc7XG5cbi8vIChjdXJyZW50KSB1c2VyXG5pbXBvcnQge3VzZXJ9ICAgICAgICAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL3VzZXInO1xuXG4vLyBjb3JlIGZ1bmN0aW9uc1xuaW1wb3J0IHtyZWFkeSwgcmVnaXN0ZXIsIHNldHVwfSBmcm9tICcuL2NoYXlucy9jb3JlJztcblxuLy8gY2hheW5zIGNhbGxzXG5cbmltcG9ydCB7YXBpQ2FsbH0gICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY2hheW5zX2NhbGxzJztcblxuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9ICAgICBmcm9tICcuL2NoYXlucy9jaGF5bnNfYXBpX2ludGVyZmFjZSc7XG5cblxuLy8gcHVibGljIGNoYXlucyBvYmplY3RcbmV4cG9ydCB2YXIgY2hheW5zID0ge307XG5cbmV4dGVuZChjaGF5bnMsIHtnZXRMb2dnZXI6IHV0aWxzLmdldExvZ2dlcn0pOyAvLyBqc2hpbnQgaWdub3JlOiBsaW5lXG5leHRlbmQoY2hheW5zLCB7dXRpbHN9KTtcbmV4dGVuZChjaGF5bnMsIHtWRVJTSU9OOiAnMC4xLjAnfSk7XG4vL2V4dGVuZChjaGF5bnMsIHtjb25maWd9KTsgLy8gVE9ETzogdGhlIGNvbmZpZyBgT2JqZWN0YCBzaG91bGQgbm90IGJlIGV4cG9zZWRcblxuZXh0ZW5kKGNoYXlucywge2VudjogZW52aXJvbm1lbnR9KTsgLy8gVE9ETzogZ2VuZXJhbGx5IHJlbmFtZVxuZXh0ZW5kKGNoYXlucywge3VzZXJ9KTtcblxuZXh0ZW5kKGNoYXlucywge3JlZ2lzdGVyfSk7XG5leHRlbmQoY2hheW5zLCB7cmVhZHl9KTtcblxuZXh0ZW5kKGNoYXlucywge2FwaUNhbGx9KTtcblxuLy8gYWRkIGFsbCBjaGF5bnNBcGlJbnRlcmZhY2UgbWV0aG9kcyBkaXJlY3RseSB0byB0aGUgYGNoYXluc2AgT2JqZWN0XG5leHRlbmQoY2hheW5zLCBjaGF5bnNBcGlJbnRlcmZhY2UpO1xuXG4vLyBzZXR1cCBjaGF5bnNcbnNldHVwKCk7XG5cblxuLy8gY2hheW5zIHB1Ymxpc2ggbm8gVU1EXG4vL3dpbmRvdy5jaGF5bnMgPSBjaGF5bnM7XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNGdW5jdGlvbiwgaXNVbmRlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93fSBmcm9tICcuLi91dGlscy9icm93c2VyJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jYWxsYmFja3MnKTtcblxubGV0IG5vb3AgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbmxldCBjYWxsYmFja3MgPSB7fTtcbi8qKlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBGdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzQ2hheW5zQ2FsbCBJZiB0cnVlIHRoZW4gdGhlIGNhbGwgd2lsbCBiZSBhc3NpZ25lZCB0byBgY2hheW5zLl9jYWxsYmFja3NgXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBwYXJhbWV0ZXJzIGFyZSB2YWxpZCBhbmQgdGhlIGNhbGxiYWNrIHdhcyBzYXZlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Q2FsbGJhY2sobmFtZSwgZm4sIGlzQ2hheW5zQ2FsbCkge1xuXG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogbmFtZSBpcyB1bmRlZmluZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFpc0Z1bmN0aW9uKGZuKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogZm4gaXMgbm8gRnVuY3Rpb24nKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAobmFtZS5pbmRleE9mKCcoKScpICE9PSAtMSkgeyAvLyBzdHJpcCAnKCknXG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgnKCknLCAnJyk7XG4gIH1cblxuICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiBzZXQgQ2FsbGJhY2s6ICcgKyBuYW1lKTtcbiAgLy9pZiAobmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgLy8gIGNhbGxiYWNrc1tuYW1lXS5wdXNoKGZuKTsgLy8gVE9ETzogcmVjb25zaWRlciBBcnJheSBzdXBwb3J0XG4gIC8vfSBlbHNlIHtcbiAgICBjYWxsYmFja3NbbmFtZV0gPSBmbjsgLy8gQXR0ZW50aW9uOiB3ZSBzYXZlIGFuIEFycmF5XG4gIC8vfVxuXG4gIGlmIChpc0NoYXluc0NhbGwpIHtcbiAgICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiByZWdpc3RlciBmbiBhcyBnbG9iYWwgY2FsbGJhY2snKTtcbiAgICB3aW5kb3cuX2NoYXluc0NhbGxiYWNrc1tuYW1lXSA9IGNhbGxiYWNrKG5hbWUsICdDaGF5bnNDYWxsJyk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZWdpc3RlciBjYWxsYmFja3MgZm9yIENoYXluc0NhbGxzIGFuZCBDaGF5bnNXZWJDYWxsc1xuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gY2FsbGJhY2tOYW1lIE5hbWUgb2YgdGhlIEZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBFaXRoZXIgJ0NoYXluc1dlYkNhbGwnIG9yICdDaGF5bnNDYWxsJ1xuICogQHJldHVybnMge0Z1bmN0aW9ufSBoYW5kbGVEYXRhIFJlY2VpdmVzIGNhbGxiYWNrIGRhdGFcbiAqL1xuZnVuY3Rpb24gY2FsbGJhY2soY2FsbGJhY2tOYW1lLCB0eXBlKSB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZURhdGEoKSB7XG5cbiAgICBpZiAoY2FsbGJhY2tOYW1lIGluIGNhbGxiYWNrcykge1xuICAgICAgbG9nLmRlYnVnKCdpbnZva2UgY2FsbGJhY2s6ICcsIGNhbGxiYWNrTmFtZSwgJ3R5cGU6JywgdHlwZSk7XG4gICAgICB2YXIgZm4gPSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICBmbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAvL2RlbGV0ZSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTsgLy8gVE9ETzogY2Fubm90IGJlIGxpa2UgdGhhdCwgcmVtb3ZlIGFycmF5P1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLndhcm4oJ2NhbGxiYWNrIGlzIG5vIGZ1bmN0aW9uJywgY2FsbGJhY2tOYW1lLCBmbik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5pbmZvKCdjYWxsYmFjayAnICsgY2FsbGJhY2tOYW1lICsgJyBkaWQgbm90IGV4aXN0IGluIGNhbGxiYWNrcyBhcnJheScpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMuX2NhbGxiYWNrc1xuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIENoYXlucyBDYWxsIENhbGxiYWNrc1xuICogd2lsbCBiZSBhc3NpZ25lZCB0byB0aGUgYGNoYXlucy5fY2FsbGJhY2tzYCBvYmplY3RcbiAqXG4gKiBAdHlwZSB7T2JqZWN0fSBjaGF5bnNDYWxsc0NhbGxiYWNrc1xuICovXG53aW5kb3cuX2NoYXluc0NhbGxiYWNrcyA9IHtcbiAgLy8vLyBUT0RPOiB3cmFwIGNhbGxiYWNrIGZ1bmN0aW9uIChEUlkpXG4gIC8vZ2V0R2xvYmFsRGF0YTogY2FsbGJhY2soJ2dldEdsb2JhbERhdGEnLCAnQ2hheW5zQ2FsbCcpIC8vIGV4YW1wbGVcbiAgZ2V0R2VvTG9jYXRpb25DYWxsYmFjazogbm9vcFxufTtcblxuXG4vLyBUT0RPOiBtb3ZlIHRvIGFub3RoZXIgZmlsZT8gY29yZSwgY2hheW5zX2NhbGxzXG52YXIgbWVzc2FnZUxpc3RlbmluZyA9IGZhbHNlO1xuZXhwb3J0IGZ1bmN0aW9uIG1lc3NhZ2VMaXN0ZW5lcigpIHtcbiAgaWYgKG1lc3NhZ2VMaXN0ZW5pbmcpIHtcbiAgICBsb2cuaW5mbygndGhlcmUgaXMgYWxyZWFkeSBvbmUgbWVzc2FnZSBsaXN0ZW5lciBvbiB3aW5kb3cnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgbWVzc2FnZUxpc3RlbmluZyA9IHRydWU7XG4gIGxvZy5kZWJ1ZygnbWVzc2FnZSBsaXN0ZW5lciBpcyBzdGFydGVkJyk7XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiBvbk1lc3NhZ2UoZSkge1xuXG4gICAgbG9nLmRlYnVnKCduZXcgbWVzc2FnZSAnKTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSAnY2hheW5zLmN1c3RvbVRhYi4nLFxuICAgICAgZGF0YSA9IGUuZGF0YTtcblxuICAgIGlmICh0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gc3RyaXAgbmFtZXNwYWNlIGZyb20gZGF0YVxuICAgIGRhdGEgPSBkYXRhLnN1YnN0cihuYW1lc3BhY2UubGVuZ3RoLCBkYXRhLmxlbmd0aCAtIG5hbWVzcGFjZS5sZW5ndGgpO1xuICAgIHZhciBtZXRob2QgPSBkYXRhLm1hdGNoKC9bXjpdKjovKTsgLy8gZGV0ZWN0IG1ldGhvZFxuICAgIGlmIChtZXRob2QgJiYgbWV0aG9kLmxlbmd0aCA+IDApIHtcbiAgICAgIG1ldGhvZCA9IG1ldGhvZFswXTtcblxuICAgICAgdmFyIHBhcmFtcyA9IGRhdGEuc3Vic3RyKG1ldGhvZC5sZW5ndGgsIGRhdGEubGVuZ3RoIC0gbWV0aG9kLmxlbmd0aCk7XG4gICAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFyYW1zID0gSlNPTi5wYXJzZShwYXJhbXMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgdGhlIGxhc3QgJyknXG4gICAgICBtZXRob2QgPSBtZXRob2Quc3Vic3RyKDAsIG1ldGhvZC5sZW5ndGggLSAxKTtcblxuICAgICAgLy8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGNhbiBiZSBpbnZva2VkIGRpcmVjdGx5XG4gICAgICBjYWxsYmFjayhtZXRob2QsICdDaGF5bnNXZWJDYWxsJykocGFyYW1zKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiaW1wb3J0IHthcGlDYWxsfSBmcm9tICcuL2NoYXluc19jYWxscyc7XG5pbXBvcnQge2dldExvZ2dlciwgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0JMRUFkZHJlc3MsXG4gIGlzRGF0ZSwgaXNPYmplY3QsIGlzQXJyYXksIHRyaW0sIERPTX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHt3aW5kb3csIGxvY2F0aW9ufSBmcm9tICcuLi91dGlscy9icm93c2VyJzsgLy8gZHVlIHRvIHdpbmRvdy5vcGVuIGFuZCBsb2NhdGlvbi5ocmVmXG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXluc19hcGlfaW50ZXJmYWNlJyk7XG5cbi8qKlxuICogTkZDIFJlc3BvbnNlIERhdGEgU3RvcmFnZVxuICogQHR5cGUge09iamVjdH1cbiAqL1xubGV0IE5mY1Jlc3BvbnNlRGF0YSA9IHtcbiAgUkZJZDogMCxcbiAgUGVyc29uSWQ6IDBcbn07XG5cbi8qKlxuICogUG9wdXAgQnV0dG9uXG4gKiBAY2xhc3MgUG9wdXBCdXR0b25cbiAqL1xuY2xhc3MgUG9wdXBCdXR0b24ge1xuICAvKipcbiAgICogUG9wdXAgQnV0dG9uIENvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFBvcHVwIEJ1dHRvbiBuYW1lXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lLCBjYWxsYmFjaykge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGxldCBlbCA9IERPTS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2NoYXlucy1wb3B1cCcpO1xuICAgIGVsLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2hheW5zX19wb3B1cCcpO1xuICAgIHRoaXMuZWxlbWVudCA9IGVsO1xuICB9XG4gIC8qKlxuICAgKiBHZXQgUG9wdXAgQnV0dG9uIG5hbWVcbiAgICogQHJldHVybnMge25hbWV9XG4gICAqL1xuICBuYW1lKCkge1xuICAgIHJldHVybiB0aGlzLm5hbWU7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICovXG4gIGNhbGxiYWNrKCkge1xuICAgIGxldCBjYiA9IHRoaXMuY2FsbGJhY2s7XG4gICAgbGV0IG5hbWUgPSBjYi5uYW1lO1xuICAgIGlmIChpc0Z1bmN0aW9uKGNiKSkge1xuICAgICAgY2IuY2FsbChudWxsLCBuYW1lKTtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEBuYW1lIHRvSFRNTFxuICAgKiBSZXR1cm5zIEhUTUwgTm9kZSBjb250YWluaW5nIHRoZSBQb3B1cEJ1dHRvbi5cbiAgICogQHJldHVybnMge1BvcHVwQnV0dG9uLmVsZW1lbnR8SFRNTE5vZGV9XG4gICAqL1xuICB0b0hUTUwoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgfVxufVxuXG4vKipcbiAqIEJlYWNvbiBMaXN0XG4gKiBAdHlwZSB7QXJyYXl8bnVsbH1cbiAqL1xubGV0IGJlYWNvbkxpc3QgPSBudWxsO1xuXG4vKipcbiAqIEdsb2JhbCBEYXRhIFN0b3JhZ2VcbiAqIEB0eXBlIHtib29sZWFufE9iamVjdH1cbiAqL1xubGV0IGdsb2JhbERhdGEgPSBmYWxzZTtcblxuLyoqXG4gKiBBbGwgcHVibGljIGNoYXlucyBtZXRob2RzIHRvIGludGVyYWN0IHdpdGggKkNoYXlucyBBcHAqIG9yICpDaGF5bnMgV2ViKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xuZXhwb3J0IHZhciBjaGF5bnNBcGlJbnRlcmZhY2UgPSB7XG5cblxuICAvKipcbiAgICogRW5hYmxlIG9yIGRpc2FibGUgUHVsbFRvUmVmcmVzaFxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFsbG93UHVsbCBBbGxvdyBQdWxsVG9SZWZyZXNoXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2VlZGVkXG4gICAqL1xuICBzZXRQdWxsVG9SZWZyZXNoOiBmdW5jdGlvbihhbGxvd1B1bGwpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDAsXG4gICAgICB3ZWJGbjogZmFsc2UsIC8vIGNvdWxkIGJlIG9taXR0ZWRcbiAgICAgIHBhcmFtczogW3snYm9vbCc6IGFsbG93UHVsbH1dXG4gICAgfSk7XG4gIH0sXG4gIC8vIFRPRE86IHJlbmFtZSB0byBlbmFibGVQdWxsVG9SZWZyZXNoXG4gIGFsbG93UmVmcmVzaFNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLnNldFB1bGxUb1JlZnJlc2godHJ1ZSk7XG4gIH0sXG4gIGRpc2FsbG93UmVmcmVzaFNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLnNldFB1bGxUb1JlZnJlc2goZmFsc2UpO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtzaG93Q3Vyc29yXSBJZiB0cnVlIHRoZSB3YWl0Y3Vyc29yIHdpbGwgYmUgc2hvd25cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJ3aXNlIGl0IHdpbGwgYmUgaGlkZGVuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2V0V2FpdGN1cnNvcjogZnVuY3Rpb24oc2hvd0N1cnNvcikge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMSxcbiAgICAgIHdlYkZuOiAoc2hvd0N1cnNvciA/ICdzaG93JyA6ICdoaWRlJykgKyAnTG9hZGluZ0N1cnNvcicsXG4gICAgICBwYXJhbXM6IFt7J2Jvb2wnOiBzaG93Q3Vyc29yfV1cbiAgICB9KTtcbiAgfSxcbiAgc2hvd1dhaXRjdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0V2FpdGN1cnNvcih0cnVlKTtcbiAgfSxcbiAgaGlkZVdhaXRjdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0V2FpdGN1cnNvcihmYWxzZSk7XG4gIH0sXG5cbiAgLy8gVE9ETzogcmVuYW1lIGl0IHRvIG9wZW5UYXBwP1xuICAvKipcbiAgICogU2VsZWN0IGRpZmZlcmVudCBUYXBwIGlkZW50aWZpZWQgYnkgVGFwcElEIG9yIEludGVybmFsVGFwcE5hbWVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRhYiBUYXBwIE5hbWUgb3IgVGFwcCBJRFxuICAgKiBAcGFyYW0ge1N0cmluZ30gKG9wdGlvbmFsKSBwYXJhbSBVUkwgUGFyYW1ldGVyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2VsZWN0VGFiOiBmdW5jdGlvbih0YWIsIHBhcmFtKSB7XG5cbiAgICBsZXQgY21kID0gMTM7IC8vIHNlbGVjdFRhYiB3aXRoIHBhcmFtIENoYXluc0NhbGxcblxuICAgIC8vIHVwZGF0ZSBwYXJhbTogc3RyaXAgPyBhbmQgZW5zdXJlICYgYXQgdGhlIGJlZ2luXG4gICAgaWYgKHBhcmFtICYmICFwYXJhbS5tYXRjaCgvXlsmfFxcP10vKSkgeyAvLyBubyAmIGFuZCBubyA/XG4gICAgICBwYXJhbSA9ICcmJyArIHBhcmFtO1xuICAgIH0gZWxzZSBpZiAocGFyYW0pIHtcbiAgICAgIHBhcmFtID0gcGFyYW0ucmVwbGFjZSgnPycsICcmJyk7XG4gICAgfSBlbHNlIHsgLy8gbm8gcGFyYW1zLCBkaWZmZXJlbnQgQ2hheW5zQ2FsbFxuICAgICAgY21kID0gMjtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IGNtZCxcbiAgICAgIHdlYkZuOiAnc2VsZWN0b3RoZXJ0YWInLFxuICAgICAgcGFyYW1zOiBjbWQgPT09IDEzXG4gICAgICAgID8gW3snc3RyaW5nJzogdGFifSwgeydzdHJpbmcnOiBwYXJhbX1dXG4gICAgICAgIDogW3snc3RyaW5nJzogdGFifV0sXG4gICAgICB3ZWJQYXJhbXM6IHtcbiAgICAgICAgVGFiOiB0YWIsXG4gICAgICAgIFBhcmFtZXRlcjogcGFyYW1cbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDIsIGlvczogMTM4Mywgd3A6IDI0NjkgfSAvLyBmb3IgbmF0aXZlIGFwcHMgb25seVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZWxlY3QgQWxidW1cbiAgICogVE9ETzogcmVuYW1lIHRvIG9wZW5cbiAgICpcbiAgICogQHBhcmFtIHtpZHxzdHJpbmd9IGlkIEFsYnVtIElEIChBbGJ1bSBOYW1lIHdpbGwgd29yayBhcyB3ZWxsLCBidXQgZG8gcHJlZmVyIElEcylcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZWxlY3RBbGJ1bTogZnVuY3Rpb24oaWQpIHtcbiAgICBpZiAoIWlzU3RyaW5nKGlkKSAmJiAhaXNOdW1iZXIoaWQpKSB7XG4gICAgICBsb2cuZXJyb3IoJ3NlbGVjdEFsYnVtOiBpbnZhbGlkIGFsYnVtIG5hbWUnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzLFxuICAgICAgd2ViRm46ICdzZWxlY3RBbGJ1bScsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGlkfV0sXG4gICAgICB3ZWJQYXJhbXM6IGlkXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gUGljdHVyZVxuICAgKiAob2xkIFNob3dQaWN0dXJlKVxuICAgKiBBbmRyb2lkIGRvZXMgbm90IHN1cHBvcnQgZ2lmcyA6KFxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIEltYWdlIFVSTCBzaG91bGQgY290YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlblBpY3R1cmU6IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSB8fCAhdXJsLm1hdGNoKC9qcGckfHBuZyR8Z2lmJC9pKSkgeyAvLyBUT0RPOiBtb3JlIGltYWdlIHR5cGVzP1xuICAgICAgbG9nLmVycm9yKCdvcGVuUGljdHVyZTogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA0LFxuICAgICAgd2ViRm46ICdzaG93UGljdHVyZScsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgd2ViUGFyYW1zOiB1cmwsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI1MDEsIGlvczogMjYzNiwgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBDYXB0aW9uIEJ1dHRvbi5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICogVGhlIGNhcHRpb24gYnV0dG9uIGlzIHRoZSB0ZXh0IGF0IHRoZSB0b3AgcmlnaHQgb2YgdGhlIGFwcC5cbiAgICogKG1haW5seSB1c2VkIGZvciBsb2dpbiBvciB0aGUgdXNlcm5hbWUpXG4gICAqIFRPRE86IGltcGxlbWVudCBpbnRvIENoYXlucyBXZWI/XG4gICAqIFRPRE86IHJlbmFtZSB0byBzZXQ/XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0IFRoZSBCdXR0b24ncyB0ZXh0XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGNhcHRpb24gYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgY3JlYXRlQ2FwdGlvbkJ1dHRvbjogZnVuY3Rpb24odGV4dCwgY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIC8vbG9nLmVycm9yKCdUaGVyZSBpcyBubyB2YWxpZCBjYWxsYmFjayBGdW5jdGlvbi4nKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgbm8gdmFsaWQgY2FsbGJhY2sgRnVuY3Rpb24uJyk7XG4gICAgICAvL3JldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdjYXB0aW9uQnV0dG9uQ2FsbGJhY2soKSc7XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDUsXG4gICAgICBwYXJhbXM6IFt7c3RyaW5nOiB0ZXh0fSwge2NhbGxiYWNrOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OCwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9LFxuICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSGlkZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBoaWRlQ2FwdGlvbkJ1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA2LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRmFjZWJvb2sgQ29ubmVjdFxuICAgKiBOT1RFOiBwcmVmZXIgYGNoYXlucy5sb2dpbigpYCBvdmVyIHRoaXMgbWV0aG9kIHRvIHBlcmZvcm0gYSB1c2VyIGxvZ2luLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3Blcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcyddIEZhY2Vib29rIFBlcm1pc3Npb25zLCBzZXBhcmF0ZWQgYnkgY29tbWFcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtyZWxvYWRQYXJhbSA9ICdjb21tZW50J10gUmVsb2FkIFBhcmFtXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgLy8gVE9ETzogdGVzdCBwZXJtaXNzaW9uc1xuICBmYWNlYm9va0Nvbm5lY3Q6IGZ1bmN0aW9uKHBlcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcycsIHJlbG9hZFBhcmFtID0gJ2NvbW1lbnQnKSB7XG4gICAgcmVsb2FkUGFyYW0gPSByZWxvYWRQYXJhbTtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDcsXG4gICAgICB3ZWJGbjogJ2ZhY2Vib29rQ29ubmVjdCcsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHBlcm1pc3Npb25zfSwgeydGdW5jdGlvbic6ICdFeGVjQ29tbWFuZD1cIicgKyByZWxvYWRQYXJhbSArICdcIid9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBSZWxvYWRQYXJhbWV0ZXI6ICdFeGVjQ29tbWFuZD0nICsgcmVsb2FkUGFyYW0sXG4gICAgICAgIFBlcm1pc3Npb25zOiBwZXJtaXNzaW9uc1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OSwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9LFxuICAgICAgZmFsbGJhY2tDbWQ6IDggLy8gaW4gY2FzZSB0aGUgYWJvdmUgaXMgbm90IHN1cHBvcnQgdGhlIGZhbGxiYWNrQ21kIHdpbGwgcmVwbGFjZSB0aGUgY21kXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gTGluayBpbiBCcm93c2VyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVVJMXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlbkxpbmtJbkJyb3dzZXI6IGZ1bmN0aW9uKHVybCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogOSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKCc6Ly8nKSA9PT0gLTEpIHtcbiAgICAgICAgICB1cmwgPSAnLy8nICsgdXJsOyAvLyBvciBhZGQgbG9jYXRpb24ucHJvdG9jb2wgcHJlZml4IGFuZCAvLyBUT0RPOiB0ZXN0XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjQ2Niwgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaG93IEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGJhY2sgYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2hvd0JhY2tCdXR0b246IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgY2hheW5zQXBpSW50ZXJmYWNlLmhpZGVCYWNrQnV0dG9uKCk7XG4gICAgICB9O1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JhY2tCdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTAsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgaGlkZUJhY2tCdXR0b246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTEsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIE9wZW4gSW50ZXJDb20uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgb3BlbkludGVyQ29tOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEyLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDAyLCBpb3M6IDEzODMsIHdwOiAyNTQzIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IEdlb2xvY2F0aW9uLlxuICAgKiBuYXRpdmUgYXBwcyBvbmx5IChidXQgY291bGQgd29yayBpbiB3ZWIgYXMgd2VsbCwgbmF2aWdhdG9yLmdlb2xvY2F0aW9uKVxuICAgKlxuICAgKiBUT0RPOiBjb250aW51b3VzVHJhY2tpbmcgd2FzIHJlbW92ZWRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgYmFjayBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBnZXRHZW9Mb2NhdGlvbjogZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnZ2V0R2VvTG9jYXRpb25DYWxsYmFjaygpJztcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIC8vIFRPRE86IHJlbW92ZSBjb25zb2xlXG4gICAgICAvLyBUT0RPOiBhbGxvdyBlbXB0eSBjYWxsYmFja3Mgd2hlbiBpdCBpcyBhbHJlYWR5IHNldFxuICAgICAgY29uc29sZS53YXJuKCdubyBjYWxsYmFjayBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI1MDEsIGlvczogMjQ2Niwgd3A6IDI0NjkgfSxcbiAgICAgIC8vd2ViRm46IGZ1bmN0aW9uKCkgeyBuYXZpZ2F0b3IuZ2VvbG9jYXRpb247IH1cbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFZpZGVvXG4gICAqIChvbGQgU2hvd1ZpZGVvKVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFZpZGVvIFVSTCBzaG91bGQgY290YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlblZpZGVvOiBmdW5jdGlvbih1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkgfHwgIXVybC5tYXRjaCgvLipcXC4uezIsfS8pKSB7IC8vIFRPRE86IFdURiBSZWdleFxuICAgICAgbG9nLmVycm9yKCdvcGVuVmlkZW86IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTUsXG4gICAgICB3ZWJGbjogJ3Nob3dWaWRlbycsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgd2ViUGFyYW1zOiB1cmxcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2hvdyBEaWFsb2dcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHtjb250ZW50OntTdHJpbmd9ICwgaGVhZGxpbmU6ICxidXR0b25zOntBcnJheX0sIG5vQ29udGVudG5QYWRkaW5nOiwgb25Mb2FkOn1cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzaG93RGlhbG9nOiBmdW5jdGlvbiBzaG93RGlhbG9nKG9iaikge1xuICAgIGlmICghb2JqIHx8ICFpc09iamVjdChvYmopKSB7XG4gICAgICBsb2cud2Fybignc2hvd0RpYWxvZzogaW52YWxpZCBwYXJhbWV0ZXJzJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChpc1N0cmluZyhvYmouY29udGVudCkpIHtcbiAgICAgIG9iai5jb250ZW50ID0gdHJpbShvYmouY29udGVudC5yZXBsYWNlKC88YnJbIC9dKj8+L2csICdcXG4nKSk7XG4gICAgfVxuICAgIGlmICghaXNBcnJheShvYmouYnV0dG9ucykgfHwgb2JqLmJ1dHRvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBvYmouYnV0dG9ucyA9IFsobmV3IFBvcHVwQnV0dG9uKCdPSycpKS50b0hUTUwoKV07XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdDaGF5bnNEaWFsb2dDYWxsQmFjaygpJztcbiAgICBmdW5jdGlvbiBjYWxsYmFja0ZuKGJ1dHRvbnMsIGlkKSB7XG4gICAgICBpZCA9IHBhcnNlSW50KGlkLCAxMCkgLSAxO1xuICAgICAgaWYgKGJ1dHRvbnNbaWRdKSB7XG4gICAgICAgIGJ1dHRvbnNbaWRdLmNhbGxiYWNrLmNhbGwobnVsbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNiwgLy8gVE9ETzogaXMgc2xpdHRlOi8vXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX0sXG4gICAgICAgIHsnc3RyaW5nJzogb2JqLmhlYWRsaW5lfSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouY29udGVudH0sXG4gICAgICAgIHsnc3RyaW5nJzogb2JqLmJ1dHRvbnNbMF0ubmFtZX0gLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgICAvL3snc3RyaW5nJzogb2JqLmJ1dHRvbnNbMV0ubmFtZX0sIC8vIFRPRE86IG5lZWRzIGVuY29kZVVSST9cbiAgICAgICAgLy97J3N0cmluZyc6IG9iai5idXR0b25zWzJdLm5hbWV9IC8vIFRPRE86IG5lZWRzIGVuY29kZVVSST9cbiAgICAgIF0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIG9iai5idXR0b25zKSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNjA2fSxcbiAgICAgIGZhbGxiYWNrRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZmFsbGJhY2sgcG9wdXAnLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEZvcm1lcmx5IGtub3duIGFzIGdldEFwcEluZm9zXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2l0aCB0aGUgQXBwRGF0YVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICAgIC8vIFRPRE86IHVzZSBmb3JjZVJlbG9hZCBhbmQgY2FjaGUgQXBwRGF0YVxuICBnZXRHbG9iYWxEYXRhOiBmdW5jdGlvbihjYWxsYmFjaywgZm9yY2VSZWxvYWQpIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignZ2V0R2xvYmFsRGF0YTogY2FsbGJhY2sgaXMgbm8gdmFsaWQgYEZ1bmN0aW9uYC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFmb3JjZVJlbG9hZCAmJiBnbG9iYWxEYXRhKSB7XG4gICAgICBjYWxsYmFjayhnbG9iYWxEYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxOCxcbiAgICAgIHdlYkZuOiAnZ2V0QXBwSW5mb3MnLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdnZXRHbG9iYWxEYXRhKCknfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVmlicmF0ZVxuICAgKiBAcGFyYW0ge0ludGVnZXJ9IGR1cmF0aW9uIFRpbWUgaW4gbWlsbGlzZWNvbmRzXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHZpYnJhdGU6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG4gICAgaWYgKCFpc051bWJlcihkdXJhdGlvbikgfHwgZHVyYXRpb24gPCAyKSB7XG4gICAgICBkdXJhdGlvbiA9IDE1MDtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxOSxcbiAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IGR1cmF0aW9uLnRvU3RyaW5nKCl9XSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbiBuYXZpZ2F0b3JWaWJyYXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG5hdmlnYXRvci52aWJyYXRlKDEwMCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2cuaW5mbygndmlicmF0ZTogdGhlIGRldmljZSBkb2VzIG5vdCBzdXBwb3J0IHZpYnJhdGUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNjk1LCBpb3M6IDI1OTYsIHdwOiAyNTE1fVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBCYWNrLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gRmFsc2Ugb24gZXJyb3IsIHRydWUgaWYgY2FsbCBzdWNjZWVkZWRcbiAgICovXG4gIG5hdmlnYXRlQmFjazogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAyMCxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2OTYsIGlvczogMjYwMCwgd3A6IDI1MTV9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEltYWdlIFVwbG9hZFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB0byBiZSBpbnZva2VkIHdpdGggaW1hZ2UgdXJsIGFmdGVyIHVwbG9hZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICB1cGxvYWRJbWFnZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybigndXBsb2FkSW1hZ2U6IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnaW1hZ2VVcGxvYWRDYWxsYmFjaygpJztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDIxLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLCAvLyBjYWxsYmFjayBwYXJhbSBvbmx5IG9uIG1vYmlsZVxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBUT0RPOiBpbXBsZW1lbnQgaW1hZ2UgdXBsb2FkIHdpdGggd2luZG93LmZldGNoXG4gICAgICAgIC8vdmFyIGZkID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIC8vZmQuYXBwZW5kKFwiSW1hZ2VcIiwgZmlsZVswXSk7XG4gICAgICAgIC8vd2luZG93LmltYWdlQ2hvc2VuID0gd2luZG93LmZldGNoKHtcbiAgICAgICAgLy8gIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAvLyAgdXJsOiBcIi8vY2hheW5zMS50b2JpdC5jb20vVGFwcEFwaS9GaWxlL0ltYWdlXCIsXG4gICAgICAgIC8vICBjb250ZW50VHlwZTogZmFsc2UsXG4gICAgICAgIC8vICBwcm9jZXNzRGF0YTogZmFsc2UsXG4gICAgICAgIC8vICBjYWNoZTogZmFsc2UsXG4gICAgICAgIC8vICBkYXRhOiBmZFxuICAgICAgICAvL30pLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAvLyAgZGVsZXRlIHdpbmRvdy5pbWFnZUNob3NlbjtcbiAgICAgICAgLy8gIGNhbGxiYWNrLmNhbGwobnVsbCwgZGF0YSk7XG4gICAgICAgIC8vfSk7XG4gICAgICAgIC8vJChcIiNDaGF5bnNJbWFnZVVwbG9hZFwiKS5jbGljaygpO1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzA1LCB3cDogMjUzOCwgaW9zOiAyNjQyfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgTkZDIENhbGxiYWNrXG4gICAqIFRPRE86IHJlZmFjdG9yIGFuZCB0ZXN0XG4gICAqIFRPRE86IHdoeSB0d28gY2FsbHM/XG4gICAqIENhbiB3ZSBpbXByb3ZlIHRoaXMgc2hpdD8gc3BsaXQgaW50byB0d28gbWV0aG9kc1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiBmb3IgTkZDXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHNldE5mY0NhbGxiYWNrOiBmdW5jdGlvbihjYWxsYmFjaywgcmVzcG9uc2UpIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMzcsXG4gICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgfSkgJiYgYXBpQ2FsbCh7XG4gICAgICAgICAgY21kOiAzNyxcbiAgICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmFyIGNtZCA9IChyZXNwb25zZSA9PT0gbmZjUmVzcG9uc2VEYXRhLlBlcnNvbklkKSA/IDM3IDogMzg7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IGNtZCA9PT0gMzcgPyAzOCA6IDM3LFxuICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgIH0pICYmIGFwaUNhbGwoe1xuICAgICAgY21kOiBjbWQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogJ05mY0NhbGxiYWNrJ31dLCAvLyBjYWxsYmFjayBwYXJhbSBvbmx5IG9uIG1vYmlsZVxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAzMjM0LCB3cDogMzEyMSB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFZpZGVvIFBsYXllciBDb250cm9sc1xuICAgKiBBY3V0YWxseSBuYXRpdmUgb25seVxuICAgKiBUT0RPOiBjb3VsZCB0aGVvcmV0aWNhbGx5IHdvcmsgaW4gQ2hheW5zIFdlYlxuICAgKiBUT0RPOiBleGFtcGxlPyB3aGVyZSBkb2VzIHRoaXMgd29yaz9cbiAgICovXG4gIHBsYXllcjoge1xuICAgIHVzZURlZmF1bHRVcmw6IGZ1bmN0aW9uIHVzZURlZmF1bHRVcmwoKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjIsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGNoYW5nZVVybDogZnVuY3Rpb24gY2hhbmdlVXJsKHVybCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIyLFxuICAgICAgICBwYXJhbXM6IFt7J1N0cmluZyc6IHVybH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgaGlkZUJ1dHRvbjogZnVuY3Rpb24gaGlkZUJ1dHRvbigpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMyxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgc2hvd0J1dHRvbjogZnVuY3Rpb24gc2hvd0J1dHRvbigpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMyxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMX1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGF1c2U6IGZ1bmN0aW9uIHBhdXNlVmlkZW8oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjQsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBsYXk6IGZ1bmN0aW9uIHBsYXlWaWRlbygpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNCxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMX1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGxheWJhY2tTdGF0dXM6IGZ1bmN0aW9uIHBsYXliYWNrU3RhdHVzKGNhbGxiYWNrKSB7XG5cbiAgICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2UuZ2V0R2xvYmFsRGF0YShmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKG51bGwsIHtcbiAgICAgICAgICBBcHBDb250cm9sVmlzaWJsZTogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5Jc0FwcENvbnRyb2xWaXNpYmxlLFxuICAgICAgICAgIFN0YXR1czogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5QbGF5YmFja1N0YXR1cyxcbiAgICAgICAgICBVcmw6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uU3RyZWFtVXJsXG4gICAgICAgIH0pO1xuICAgICAgfSwgdHJ1ZSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBCbHVldG9vdGhcbiAgICogT25seSBpbiBuYXRpdmUgQXBwcyAoaW9zIGFuZCBhbmRyb2lkKVxuICAgKi9cbiAgYmx1ZXRvb3RoOiB7XG4gICAgTEVTZW5kU3RyZW5ndGg6IHsgLy8gVE9ETzogd2hhdCBpcyB0aGF0P1xuICAgICAgQWRqYWNlbnQ6IDAsXG4gICAgICBOZWFyYnk6IDEsXG4gICAgICBEZWZhdWx0OiAyLFxuICAgICAgRmFyOiAzXG4gICAgfSxcbiAgICBMRVNjYW46IGZ1bmN0aW9uIExFU2NhbihjYWxsYmFjaykge1xuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBsb2cud2FybignTEVTY2FuOiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snO1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI2LFxuICAgICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgTEVDb25uZWN0OiBmdW5jdGlvbiBMRUNvbm5lY3QoYWRkcmVzcywgY2FsbGJhY2ssIHBhc3N3b3JkKSB7XG4gICAgICBpZiAoIWlzU3RyaW5nKGFkZHJlc3MpIHx8ICFpc0JMRUFkZHJlc3MoYWRkcmVzcykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFQ29ubmVjdDogbm8gdmFsaWQgYWRkcmVzcyBwYXJhbWV0ZXInKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBsb2cud2FybignTEVDb25uZWN0OiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzU3RyaW5nKHBhc3N3b3JkKSB8fCAhcGFzc3dvcmQubWF0Y2goL15bMC05YS1mXXs2LDEyfSQvaSkpIHtcbiAgICAgICAgcGFzc3dvcmQgPSAnJztcbiAgICAgIH1cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjayc7XG5cbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNyxcbiAgICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBhZGRyZXNzfSwgeydzdHJpbmcnOiBwYXNzd29yZH1dLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBUT0RPOiBjb25zaWRlciBPYmplY3QgYXMgcGFyYW1ldGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFkZHJlc3NcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHN1YklkXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBtZWFzdXJlUG93ZXJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHNlbmRTdHJlbmd0aFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgTEVXcml0ZTogZnVuY3Rpb24gTEVXcml0ZShhZGRyZXNzLCBzdWJJZCwgbWVhc3VyZVBvd2VyLCBzZW5kU3RyZW5ndGgsIGNhbGxiYWNrKSB7XG4gICAgICBpZiAoIWlzU3RyaW5nKGFkZHJlc3MpIHx8ICFpc0JMRUFkZHJlc3MoYWRkcmVzcykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFV3JpdGU6IG5vIHZhbGlkIGFkZHJlc3MgcGFyYW1ldGVyJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIoc3ViSWQpIHx8IHN1YklkIDwgMCB8fCBzdWJJZCA+IDQwOTUpIHtcbiAgICAgICAgc3ViSWQgPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKG1lYXN1cmVQb3dlcikgfHwgbWVhc3VyZVBvd2VyIDwgLTEwMCB8fCBtZWFzdXJlUG93ZXIgPiAwKSB7XG4gICAgICAgIG1lYXN1cmVQb3dlciA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIoc2VuZFN0cmVuZ3RoKSB8fCBzZW5kU3RyZW5ndGggPCAwIHx8IHNlbmRTdHJlbmd0aCA+IDMpIHtcbiAgICAgICAgc2VuZFN0cmVuZ3RoID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBjYWxsYmFjayA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjaycsXG4gICAgICAgIHVpZCA9ICc3QTA3RTE3QS1BMTg4LTQxNkUtQjdBMC01QTM2MDY1MTNFNTcnO1xuXG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjgsXG4gICAgICAgIHBhcmFtczogW1xuICAgICAgICAgIHsnc3RyaW5nJzogYWRkcmVzc30sXG4gICAgICAgICAgeydzdHJpbmcnOiB1aWR9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IHN1YklkfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBtZWFzdXJlUG93ZXJ9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IHNlbmRTdHJlbmd0aH1cbiAgICAgICAgXSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICAvLyBUT0RPOyB1c2UgYE9iamVjdGAgYXMgcGFyYW1zXG4gIC8vIFRPRE86IHdoYXQgYXJlIG9wdGlvbmFsIHBhcmFtcz8gdmFsaWRhdGUgbmFtZSBhbmQgbG9jYXRpb24/XG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBBcHBvaW50bWVudCdzIG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGxvY2F0aW9uIEFwcG9pbnRtZW50J3MgbG9jYXRpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtkZXNjcmlwdGlvbl0gQXBwb2ludG1lbnQncyBkZXNjcmlwdGlvblxuICAgKiBAcGFyYW0ge0RhdGV9IHN0YXJ0IEFwcG9pbnRtZW50cydzIFN0YXJ0RGF0ZVxuICAgKiBAcGFyYW0ge0RhdGV9IGVuZCBBcHBvaW50bWVudHMncyBFbmREYXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2F2ZUFwcG9pbnRtZW50OiBmdW5jdGlvbiBzYXZlQXBwb2ludG1lbnQobmFtZSwgbG9jYXRpb24sIGRlc2NyaXB0aW9uLCBzdGFydCwgZW5kKSB7XG4gICAgaWYgKCFpc1N0cmluZyhuYW1lKSB8fCAhaXNTdHJpbmcobG9jYXRpb24pKSB7XG4gICAgICBsb2cud2Fybignc2F2ZUFwcG9pbnRtZW50OiBubyB2YWxpZCBuYW1lIGFuZC9vciBsb2NhdGlvbicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWlzRGF0ZShzdGFydCkgfHwgIWlzRGF0ZShlbmQpKSB7XG4gICAgICBsb2cud2Fybignc2F2ZUFwcG9pbnRtZW50OiBzdGFydCBhbmQvb3IgZW5kRGF0ZSBpcyBubyB2YWxpZCBEYXRlIGBPYmplY3RgLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBzdGFydCA9IHBhcnNlSW50KHN0YXJ0LmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcbiAgICBlbmQgPSBwYXJzZUludChlbmQuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAyOSxcbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J3N0cmluZyc6IG5hbWV9LFxuICAgICAgICB7J3N0cmluZyc6IGxvY2F0aW9ufSxcbiAgICAgICAgeydzdHJpbmcnOiBkZXNjcmlwdGlvbn0sXG4gICAgICAgIHsnSW50ZWdlcic6IHN0YXJ0fSxcbiAgICAgICAgeydJbnRlZ2VyJzogZW5kfVxuICAgICAgXSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMDU0LCBpb3M6IDMwNjcsIHdwOiAzMDMwfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEYXRlVHlwZXMgRW51bVxuICAgKiBzdGFydHMgYXQgMVxuICAgKi9cbiAgZGF0ZVR5cGU6IHtcbiAgICBkYXRlOiAxLFxuICAgIHRpbWU6IDIsXG4gICAgZGF0ZVRpbWU6IDNcbiAgfSxcblxuICAvKipcbiAgICogU2VsZWN0IERhdGVcbiAgICogT2xkOiBEYXRlU2VsZWN0XG4gICAqIE5hdGl2ZSBBcHBzIG9ubHkuIFRPRE86IGFsc28gaW4gQ2hheW5zIFdlYj8gSFRNTDUgRGF0ZXBpY2tlciBldGNcbiAgICogVE9ETzsgcmVjb25zaWRlciBvcmRlciBldGNcbiAgICogQHBhcmFtIHtkYXRlVHlwZXxOdW1iZXJ9IGRhdGVUeXBlIEVudW0gMS0yOiB0aW1lLCBkYXRlLCBkYXRldGltZS4gdXNlIGNoYXlucy5kYXRlVHlwZVxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBwcmVTZWxlY3QgUHJlc2V0IHRoZSBEYXRlIChlLmcuIGN1cnJlbnQgRGF0ZSlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gdGhhdCByZWNlaXZlcyB0aGUgY2hvc2VuIERhdGUgYXMgVGltZXN0YW1wXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IG1pbkRhdGUgTWluaW11bSBTdGFydERhdGVcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gbWF4RGF0ZSBNYXhpbXVtIEVuZERhdGVcbiAgICovXG4gIHNlbGVjdERhdGU6IGZ1bmN0aW9uIHNlbGVjdERhdGUoZGF0ZVR5cGUsIHByZVNlbGVjdCwgY2FsbGJhY2ssIG1pbkRhdGUsIG1heERhdGUpIHtcblxuICAgIGlmICghaXNOdW1iZXIoZGF0ZVR5cGUpIHx8IGRhdGVUeXBlIDw9IDApIHtcbiAgICAgIGxvZy53YXJuKCdzZWxlY3REYXRlOiB3cm9uZyBkYXRlVHlwZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2Fybignc2VsZWN0RGF0ZTogY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdmFsaWRhdGVWYWx1ZSh2YWx1ZSkge1xuICAgICAgaWYgKCFpc051bWJlcih2YWx1ZSkpIHtcbiAgICAgICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gcGFyc2VJbnQodmFsdWUuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcHJlU2VsZWN0ID0gdmFsaWRhdGVWYWx1ZShwcmVTZWxlY3QpO1xuICAgIG1pbkRhdGUgPSB2YWxpZGF0ZVZhbHVlKG1pbkRhdGUpO1xuICAgIG1heERhdGUgPSB2YWxpZGF0ZVZhbHVlKG1heERhdGUpO1xuXG4gICAgbGV0IGRhdGVSYW5nZSA9ICcnO1xuICAgIGlmIChtaW5EYXRlID4gLTEgJiYgbWF4RGF0ZSA+IC0xKSB7XG4gICAgICBkYXRlUmFuZ2UgPSAnLCcgKyBtaW5EYXRlICsgJywnICsgbWF4RGF0ZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ3NlbGVjdERhdGVDYWxsYmFjayc7XG4gICAgZnVuY3Rpb24gY2FsbGJhY2tGbihjYWxsYmFjaywgZGF0ZVR5cGUsIHByZVNlbGVjdCwgdGltZSkge1xuICAgICAgLy8gVE9ETzogaW1wb3J0YW50IHZhbGlkYXRlIERhdGVcbiAgICAgIC8vIFRPRE86IGNob29zZSByaWdodCBkYXRlIGJ5IGRhdGVUeXBlRW51bVxuICAgICAgbG9nLmRlYnVnKGRhdGVUeXBlLCBwcmVTZWxlY3QpO1xuICAgICAgY2FsbGJhY2suY2FsbChudWxsLCB0aW1lID8gbmV3IERhdGUodGltZSkgOiAtMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMCxcbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfSxcbiAgICAgICAgeydJbnRlZ2VyJzogZGF0ZVR5cGV9LFxuICAgICAgICB7J0ludGVnZXInOiBwcmVTZWxlY3QgKyBkYXRlUmFuZ2V9XG4gICAgICBdLFxuICAgICAgY2I6IGNhbGxiYWNrRm4uYmluZChudWxsLCBjYWxsYmFjaywgZGF0ZVR5cGUsIHByZVNlbGVjdCksXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzA3MiwgaW9zOiAzMDYyLCB3cDogMzAzMH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBVUkwgaW4gQXBwXG4gICAqIChvbGQgU2hvd1VSTEluQXBwKVxuICAgKiBub3QgdG8gY29uZnVzZSB3aXRoIG9wZW5MaW5rSW5Ccm93c2VyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVmlkZW8gVVJMIHNob3VsZCBjb250YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgICAvLyBUT0RPOiBpbXBsZW1lbnQgQ2hheW5zIFdlYiBNZXRob2QgYXMgd2VsbCAobmF2aWdhdGUgYmFjayBzdXBwb3J0KVxuICBvcGVuVXJsOiBmdW5jdGlvbiBvcGVuVXJsKHVybCwgdGl0bGUpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkpIHtcbiAgICAgIGxvZy5lcnJvcignb3BlblVybDogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMxLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2NhdGlvbi5ocmVmID0gdXJsOyAvLyBUT0RPOiBtYWtlIHN1cmUgaXQgd29ya3NcbiAgICAgIH0sXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH0sIHsnc3RyaW5nJzogdGl0bGV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMTEwLCBpb3M6IDMwNzQsIHdwOiAzMDYzfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBjcmVhdGUgUVIgQ29kZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGRhdGEgUVIgQ29kZSBkYXRhXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSBiYXNlNjQgZW5jb2RlZCBJTUcgVE9ETzogd2hpY2ggdHlwZT9cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVRUkNvZGU6IGZ1bmN0aW9uIGNyZWF0ZVFSQ29kZShkYXRhLCBjYWxsYmFjaykge1xuICAgIGlmICghaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgIGRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignY3JlYXRlUVJDb2RlOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnY3JlYXRlUVJDb2RlQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogZGF0YX0sIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgMzIyMCwgaW9zOiAxMzcyLCB3cDogMzEwNn0sXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBzY2FuIFFSIENvZGVcbiAgICogU2NhbnMgUVIgQ29kZSBhbmQgcmVhZCBpdFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgcmVzdWx0XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2NhblFSQ29kZTogZnVuY3Rpb24gc2NhblFSQ29kZShjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3NjYW5RUkNvZGU6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdzY2FuUVJDb2RlQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzNCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgMzIyMCwgaW9zOiAxMzcyLCB3cDogMzEwNn0sXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogc2NhbiBRUiBDb2RlXG4gICAqIFNjYW5zIFFSIENvZGUgYW5kIHJlYWQgaXRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGdldExvY2F0aW9uQmVhY29uczogZnVuY3Rpb24gZ2V0TG9jYXRpb25CZWFjb25zKGNhbGxiYWNrLCBmb3JjZVJlbG9hZCkge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ2dldExvY2F0aW9uQmVhY29uczogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2dldEJlYWNvbnNDYWxsQmFjaygpJztcbiAgICBpZiAoYmVhY29uTGlzdCAmJiAhZm9yY2VSZWxvYWQpIHsgLy8gVE9ETzogbWFrZSBzdXJlIGl0IGlzIGdvb2QgdG8gY2FjaGUgdGhlIGxpc3RcbiAgICAgIGxvZy5kZWJ1ZygnZ2V0TG9jYXRpb25CZWFjb25zOiB0aGVyZSBpcyBhbHJlYWR5IG9uZSBiZWFjb25MaXN0Jyk7XG4gICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChudWxsLCBiZWFjb25MaXN0KTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrRm4gPSBmdW5jdGlvbiBnZXRMb2NhdGlvbkJlYWNvbkNhbGxiYWNrKGNhbGxiYWNrLCBsaXN0KSB7XG4gICAgICBiZWFjb25MaXN0ID0gbGlzdDtcbiAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgbGlzdCk7XG4gICAgfTtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDM5LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6ICA0MDQ1LCBpb3M6IDQwNDh9LFxuICAgICAgY2I6IGNhbGxiYWNrRm4uYmluZChudWxsLCBjYWxsYmFjaylcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkIHRvIFBhc3Nib29rXG4gICAqIGlPUyBvbmx5XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgUGF0aCB0byBQYXNzYm9vayBmaWxlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgYWRkVG9QYXNzYm9vazogZnVuY3Rpb24gYWRkVG9QYXNzYm9vayh1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkpIHtcbiAgICAgIGxvZy53YXJuKCdhZGRUb1Bhc3Nib29rOiB1cmwgaXMgaW52YWxpZC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQ3LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHN1cHBvcnQ6IHtpb3M6IDQwNDV9LFxuICAgICAgd2ViRm46IGNoYXluc0FwaUludGVyZmFjZS5vcGVuTGlua0luQnJvd3Nlci5iaW5kKG51bGwsIHVybCksXG4gICAgICBmYWxsYmFja0ZuOiBjaGF5bnNBcGlJbnRlcmZhY2Uub3BlbkxpbmtJbkJyb3dzZXIuYmluZChudWxsLCB1cmwpXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRvYml0IExvZ2luXG4gICAqIFdpdGggRmFjZWJvb2tDb25uZWN0IEZhbGxiYWNrXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbXMgUmVsb2FkIFBhcmFtZXRlclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGxvZ2luOiBmdW5jdGlvbiBsb2dpbihwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSAnRXhlY0NvbW1hbmQ9JyArIHBhcmFtcztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDU0LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBwYXJhbXN9XSxcbiAgICAgIHN1cHBvcnQ6IHtpb3M6IDQyNDAsIHdwOiA0MDk5fSxcbiAgICAgIGZhbGxiYWNrRm46IGNoYXluc0FwaUludGVyZmFjZS5mYWNlYm9va0Nvbm5lY3QuYmluZChudWxsLCAndXNlcl9mcmllbmRzJywgcGFyYW1zKSxcbiAgICAgIHdlYkZuOiAndG9iaXRjb25uZWN0JyxcbiAgICAgIHdlYlBhcmFtczogcGFyYW1zXG4gICAgfSk7XG4gIH1cblxufTtcbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc1Blcm1pdHRlZCwgaXNGdW5jdGlvbiwgaXNCbGFuaywgaXNBcnJheSwgaXNPYmplY3QsIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHt3aW5kb3csIHBhcmVudH0gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7XG5pbXBvcnQge2Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7c2V0Q2FsbGJhY2t9IGZyb20gJy4vY2FsbGJhY2tzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jb3JlLmNoYXluc19jYWxscycpO1xuXG5cbmZ1bmN0aW9uIGNhbih2ZXJzaW9ucykge1xuICByZXR1cm4gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIGVudmlyb25tZW50Lm9zLCBlbnZpcm9ubWVudC5hcHBWZXJzaW9uKTtcbn1cblxuLy8gT1MgQXBwIFZlcnNpb24gTWFwIGZvciBDaGF5bnMgQ2FsbHMgU3VwcG9ydFxuLy8gVE9ETzogbW92ZSBpbnRvIGVudmlyb25tZW50PyAob3IganVzdCByZW1vdmUgY2F1c2UgaXQgaXMgb25seSB1c2VkIG9uZSB0aW1lIGluIGhlcmUpXG5sZXQgb3NNYXAgPSB7XG4gIGNoYXluc0NhbGw6IHsgYW5kcm9pZDogMjUxMCwgaW9zOiAyNDgzLCB3cDogMjQ2OSwgYmI6IDExOCB9XG59O1xuXG4vKipcbiAqIFB1YmxpYyBDaGF5bnMgSW50ZXJmYWNlXG4gKiBFeGVjdXRlIEFQSSBDYWxsXG4gKlxuICogQHBhcmFtIHVybFxuICogQHBhcmFtIHBhcmFtc1xuICogQHBhcmFtIGRlYm91bmNlXG4gKiAvLyBUT0RPOiBsZWZ0IG9mIGNhbGxiYWNrIGFzIHByb21pc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwaUNhbGwob2JqKSB7XG5cbiAgbGV0IGRlYm91bmNlID0gb2JqLmRlYm91bmNlIHx8IGZhbHNlO1xuXG4gIC8vIFRPRE86IGNoZWNrIG9iai5vcyBWRVJTSU9OXG5cbiAgZnVuY3Rpb24gZXhlY3V0ZUNhbGwoY2hheW5zQ2FsbE9iaikge1xuXG4gICAgaWYgKGVudmlyb25tZW50LmNhbkNoYXluc0NhbGwgJiYgY2FuKG9zTWFwLmNoYXluc0NhbGwpKSB7XG4gICAgICAvLyBUT0RPOiBjb25zaWRlciBjYWxsUXVldWUgYW5kIEludGVydmFsIHRvIHByZXZlbnQgZXJyb3JzXG4gICAgICBsb2cuZGVidWcoJ2V4ZWN1dGVDYWxsOiBjaGF5bnMgY2FsbCAnLCBjaGF5bnNDYWxsT2JqLmNtZCk7XG5cbiAgICAgIGlmICgnY2InIGluIGNoYXluc0NhbGxPYmogJiYgaXNGdW5jdGlvbihjaGF5bnNDYWxsT2JqLmNiKSkge1xuICAgICAgICBzZXRDYWxsYmFjayhjaGF5bnNDYWxsT2JqLmNhbGxiYWNrTmFtZSB8fCBjaGF5bnNDYWxsT2JqLnBhcmFtc1swXS5jYWxsYmFjaywgY2hheW5zQ2FsbE9iai5jYiwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBpZiAoaXNPYmplY3QoY2hheW5zQ2FsbE9iai5zdXBwb3J0KSAmJiAhY2FuKGNoYXluc0NhbGxPYmouc3VwcG9ydCkpIHtcbiAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiB0aGUgY2hheW5zIHZlcnNpb24gaXMgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICBpZiAoY2hheW5zQ2FsbE9iai5mYWxsYmFja0NtZCkge1xuICAgICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogZmFsbGJhY2sgY2hheW5zIGNhbGwgd2lsbCBiZSBpbnZva2VkJyk7XG4gICAgICAgICAgcmV0dXJuIGNoYXluc0NhbGwoY2hheW5zQ2FsbE9iai5mYWxsYmFja0NtZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5mYWxsYmFja0ZuKSkge1xuICAgICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogZmFsbGJhY2tGbiB3aWxsIGJlIGludm9rZWQnKTtcbiAgICAgICAgICByZXR1cm4gY2hheW5zQ2FsbE9iai5mYWxsYmFja0ZuLmNhbGwobnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNoYXluc0NhbGwoY2hheW5zQ2FsbE9iai5jbWQsIGNoYXluc0NhbGxPYmoucGFyYW1zKTtcblxuICAgIH0gZWxzZSBpZiAoZW52aXJvbm1lbnQuY2FuQ2hheW5zV2ViQ2FsbCkge1xuXG4gICAgICBpZiAoJ2NiJyBpbiBjaGF5bnNDYWxsT2JqICYmIGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5jYikpIHtcbiAgICAgICAgc2V0Q2FsbGJhY2soY2hheW5zQ2FsbE9iai53ZWJGbiwgY2hheW5zQ2FsbE9iai5jYik7XG4gICAgICB9XG4gICAgICBpZiAoIWNoYXluc0NhbGxPYmoud2ViRm4pIHtcbiAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBUaGlzIENhbGwgaGFzIG5vIHdlYkZuJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgbG9nLmRlYnVnKCdleGVjdXRlQ2FsbDogY2hheW5zIHdlYiBjYWxsICcsIGNoYXluc0NhbGxPYmoud2ViRm4ubmFtZSB8fCBjaGF5bnNDYWxsT2JqLndlYkZuKTtcblxuICAgICAgcmV0dXJuIGNoYXluc1dlYkNhbGwoY2hheW5zQ2FsbE9iai53ZWJGbiwgY2hheW5zQ2FsbE9iai53ZWJQYXJhbXMgfHwgY2hheW5zQ2FsbE9iai5wYXJhbXMpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogbmVpdGhlciBjaGF5bnMgd2ViIGNhbGwgbm9yIGNoYXlucyB3ZWInKTtcbiAgICB9XG4gIH1cblxuICBpZiAoZGVib3VuY2UpIHtcbiAgICBzZXRUaW1lb3V0KGV4ZWN1dGVDYWxsLmJpbmQobnVsbCwgb2JqKSwgMTAwKTsgLy8gVE9ETzogZXJyb3I/XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGV4ZWN1dGVDYWxsKG9iaik7XG4gIH1cbn1cblxuLyoqXG4gKiBCdWlsZCBDaGF5bnMgQ2FsbCAob25seSBmb3IgbmF0aXZlIEFwcHMpXG4gKiBAcHJpdmF0ZVxuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBjaGF5bnMgY2FsbCBzdWNjZWVkZWQsIGZhbHNlIG9uIGVycm9yIChubyB1cmwgZXRjKVxuICovXG5mdW5jdGlvbiBjaGF5bnNDYWxsKGNtZCwgcGFyYW1zKSB7XG5cbiAgaWYgKGlzQmxhbmsoY21kKSkgeyAvLyAwIGlzIGEgdmFsaWQgY2FsbCwgdW5kZWZpbmVkIGFuZCBudWxsIGFyZSBub3RcbiAgICBsb2cud2FybignY2hheW5zQ2FsbDogbWlzc2luZyBjbWQgZm9yIGNoYXluc0NhbGwnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgbGV0IHVybCA9IG51bGw7XG5cbiAgLy8gaWYgdGhlcmUgaXMgbm8gcGFyYW0gb3IgJ25vbmUnIHdoaWNoIG1lYW5zIG5vIGNhbGxiYWNrXG4gIGlmICghcGFyYW1zKSB7XG5cbiAgICB1cmwgPSAnY2hheW5zOi8vY2hheW5zQ2FsbCgnICsgY21kICsgJyknO1xuXG4gIH0gZWxzZSB7XG5cbiAgICAvLyBwYXJhbXMgZXhpc3QgaG93ZXZlciwgaXQgaXMgbm8gYXJyYXlcbiAgICBpZiAoIWlzQXJyYXkocGFyYW1zKSkge1xuICAgICAgbG9nLmVycm9yKCdjaGF5bnNDYWxsOiBwYXJhbXMgYXJlIG5vIEFycmF5Jyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gYWRkIHRoZSBwYXJhbXMgdG8gdGhlIGNoYXlucyBjYWxsXG4gICAgbGV0IGNhbGxiYWNrUHJlZml4ID0gJ19jaGF5bnNDYWxsYmFja3MuJztcbiAgICBsZXQgY2FsbFN0cmluZyA9ICcnO1xuICAgIGlmIChwYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgbGV0IGNhbGxBcmdzID0gW107XG4gICAgICBwYXJhbXMuZm9yRWFjaChmdW5jdGlvbihwYXJhbSkge1xuICAgICAgICBsZXQgbmFtZSA9IE9iamVjdC5rZXlzKHBhcmFtKVswXTtcbiAgICAgICAgbGV0IHZhbHVlID0gcGFyYW1bbmFtZV07XG4gICAgICAgIGlmIChuYW1lID09PSAnY2FsbGJhY2snKSB7XG4gICAgICAgICAgY2FsbEFyZ3MucHVzaCgnXFwnJyArIGNhbGxiYWNrUHJlZml4ICsgdmFsdWUgKyAnXFwnJyk7XG4gICAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ2Jvb2wnIHx8IG5hbWUgPT09ICdGdW5jdGlvbicgfHwgbmFtZSA9PT0gJ0ludGVnZXInKSB7XG4gICAgICAgICAgY2FsbEFyZ3MucHVzaCh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1xcJycgKyB2YWx1ZSArICdcXCcnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjYWxsU3RyaW5nID0gJywnICsgY2FsbEFyZ3Muam9pbignLCcpO1xuICAgIH1cblxuICAgIC8vIGFkZCBjaGF5bnMgcHJvdG9jb2wgYW5kIGhvc3QgYW5kIGpvaW4gYXJyYXlcbiAgICB1cmwgPSAnY2hheW5zOi8vY2hheW5zQ2FsbCgnICsgY21kICsgY2FsbFN0cmluZyArICcpJztcbiAgfVxuXG4gIGxvZy5kZWJ1ZygnY2hheW5zQ2FsbDogdXJsOiAnLCB1cmwpO1xuXG4gIHRyeSB7XG4gICAgLy8gVE9ETzogY3JlYXRlIGFuIGVhc2llciBpZGVudGlmaWNhdGlvbiBvZiB0aGUgcmlnaHQgZW52aXJvbm1lbnRcbiAgICAvLyBUT0RPOiBjb25zaWRlciB0byBleGVjdXRlIHRoZSBicm93c2VyIGZhbGxiYWNrIGluIGhlcmUgYXMgd2VsbFxuICAgIGlmICgnY2hheW5zQ2FsbCcgaW4gd2luZG93ICYmIGlzRnVuY3Rpb24od2luZG93LmNoYXluc0NhbGwuaHJlZikpIHtcbiAgICAgIHdpbmRvdy5jaGF5bnNDYWxsLmhyZWYodXJsKTtcbiAgICB9IGVsc2UgaWYgKCd3ZWJraXQnIGluIHdpbmRvd1xuICAgICAgJiYgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnNcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLmNoYXluc0NhbGxcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLmNoYXluc0NhbGwucG9zdE1lc3NhZ2UpIHtcbiAgICAgIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLmNoYXluc0NhbGwucG9zdE1lc3NhZ2UodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB1cmw7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IEVycm9yOiBjb3VsZCBub3QgZXhlY3V0ZSBDaGF5bnNDYWxsOiAnLCBlKTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEV4ZWN1dGUgYSBDaGF5bnNXZWIgQ2FsbCBpbiB0aGUgcGFyZW50IHdpbmRvdy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZm4gRnVuY3Rpb24gbmFtZVxuICogQHBhcmFtIHtTdHJpbmd9IHBhcmFtcyBBZGRpdGlvbmFsXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBjaGF5bnNXZWJiQ2FsbCBzdWNjZWVkZWRcbiAqL1xuZnVuY3Rpb24gY2hheW5zV2ViQ2FsbChmbiwgcGFyYW1zKSB7XG4gIGlmICghZm4pIHtcbiAgICBsb2cuaW5mbygnY2hheW5zV2ViQ2FsbDogbm8gQ2hheW5zV2ViQ2FsbCBmbicpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmICghcGFyYW1zIHx8IGlzQXJyYXkocGFyYW1zKSkgeyAvLyBBcnJheSBpbmRpY2F0ZXMgdGhhdCB0aGVzZSBhcmUgY2hheW5zQ2FsbHMgcGFyYW1zIFRPRE86IHJlZmFjdG9yXG4gICAgcGFyYW1zID0gJyc7XG4gIH1cbiAgaWYgKGlzT2JqZWN0KHBhcmFtcykpIHsgLy8gYW4gQXJyYXkgaXMgYWxzbyBzZWVuIGFzIE9iamVjdCwgaG93ZXZlciBpdCB3aWxsIGJlIHJlc2V0IGJlZm9yZVxuICAgIHBhcmFtcyA9IEpTT04uc3RyaW5naWZ5KHBhcmFtcyk7XG4gIH1cblxuICBpZiAoaXNGdW5jdGlvbihmbikpIHtcbiAgICByZXR1cm4gZm4uY2FsbChudWxsKTtcbiAgfVxuXG4gIHZhciBuYW1lc3BhY2UgPSAnY2hheW5zLmN1c3RvbVRhYi4nO1xuICB2YXIgdXJsID0gbmFtZXNwYWNlICsgZm4gKyAnOicgKyBwYXJhbXM7XG5cbiAgbG9nLmRlYnVnKCdjaGF5bnNXYWJDYWxsOiAnICsgdXJsKTtcblxuICB0cnkge1xuICAgIHBhcmVudC5wb3N0TWVzc2FnZSh1cmwsICcqJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cud2FybignY2hheW5zV2ViQ2FsbDogcG9zdE1lc3NnYWUgZmFpbGVkJyk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuIiwiLyoqXG4gKiBAbW9kdWxlIGNvbmZpZ1xuICogQHByaXZhdGVcbiAqL1xuXG5pbXBvcnQge2lzUHJlc2VudCwgaXNCbGFuaywgaXNVbmRlZmluZWQsIGlzQXJyYXksIGV4dGVuZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFN0b3JlIGludGVybmFsIGNoYXlucyBjb25maWd1cmF0aW9uXG4gKiBAdHlwZSB7e2FwcE5hbWU6IHN0cmluZywgYXBwVmVyc2lvbjogbnVtYmVyLCBsb2FkTW9kZXJuaXplcjogYm9vbGVhbiwgbG9hZFBvbHlmaWxsczogYm9vbGVhbiwgdXNlRmV0Y2g6IGJvb2xlYW4sIHByb21pc2VzOiBzdHJpbmcsIHVzZU9mZmxpbmVDYWNoaW5nOiBib29sZWFuLCB1c2VMb2NhbFN0b3JhZ2U6IGJvb2xlYW4sIGhhc0FkbWluOiBib29sZWFuLCBtdWx0aUxpbmd1YWw6IGJvb2xlYW4sIGlzUHVibGlzaGVkOiBib29sZWFuLCBkZWJ1Z01vZGU6IGJvb2xlYW4sIHVzZUFqYXg6IGJvb2xlYW59fVxuICogQHByaXZhdGVcbiAqL1xudmFyIF9jb25maWcgPSB7XG4gIGFwcE5hbWU6ICdDaGF5bnMgQXBwJywgICAvLyBhcHAgTmFtZVxuICBhcHBWZXJzaW9uOiAxLCAgICAgICAgICAgLy8gYXBwIFZlcnNpb25cbiAgcHJldmVudEVycm9yczogdHJ1ZSwgICAgICAgIC8vIGVycm9yIGhhbmRsZXIgY2FuIGhpZGUgZXJyb3JzIChjYW4gYmUgb3Zlcnd0aXR0ZW4gYnkgaXNQcm9kdWN0aW9uKVxuICBpc1Byb2R1Y3Rpb246IHRydWUsICAgICAgLy8gcHJvZHVjdGlvbiwgZGV2ZWxvcG1lbnQgYW5kIHRlc3QgRU5WXG4gIGxvYWRNb2Rlcm5pemVyOiB0cnVlLCAgICAvLyBsb2FkIG1vZGVybml6ZXJcbiAgbG9hZFBvbHlmaWxsczogdHJ1ZSwgICAgIC8vIGxvYWQgcG9seWZpbGxzXG4gIHVzZUZldGNoOiB0cnVlLCAgICAgICAgICAvLyB1c2Ugd2luZG93LmZldGNoIGFuZCBpdCdzIHBvbHlmaWxsc1xuICBwcm9taXNlczogJ3EnLCAgICAgICAgICAgLy8gcHJvbWlzZSBTZXJ2aWNlOiBRIGlzIHN0YW5kYXJkXG4gIHVzZU9mZmxpbmVDYWNoaW5nOiBmYWxzZSwvLyBpcyBvZmZsaW5lIGNhY2hpbmcgdXNlZD8gaW5sY3VkZSBvZmZsaW5lIGhlbHBlclxuICB1c2VMb2NhbFN0b3JhZ2U6IGZhbHNlLCAgLy8gaXMgbG9jYWxTdG9yYWdlIHVzZWQ/IGluY2x1ZGUgaGVscGVyXG4gIGhhc0FkbWluOiBmYWxzZSwgICAgICAgICAvLyBkb2VzIHRoaXMgYXBwL3BhZ2UgaGF2ZSBhbiBhZG1pbj9cbiAgbXVsdGlMaW5ndWFsOiB0cnVlLCAgICAgIC8vIGVuYWJsZSBpMThuP1xuICBpc1B1Ymxpc2hlZDogdHJ1ZSwgICAgICAgLy8gb25seSBpbiBpbnRlcm5hbCB0b2JpdCBhdmFpbGFibGVcbiAgZGVidWdNb2RlOiB0cnVlLCAgICAgICAgIC8vIHNob3cgY29uc29sZSBvdXRwdXQsIGRlYnVnIHBhcmFtIGZvciBsb2dnaW5nXG4gIHVzZUFqYXg6IGZhbHNlLFxuICBpc0ludGVybmFsOiBmYWxzZSAgICAgICAgLy8gdXNlIGludGVybmFsIHJvdXRpbmdcbiAgLy9mcmFtZXdvcms6IFsnRW1iZXInLCAnQW5ndWxhcicsICdCYWNrYm9uZScsICdBbXBlcnNhbmQnLCAnUmVhY3QnLCAnalF1ZXJ5J11cbn07XG5cbi8vIFRPRE86IHJlbW92ZVxuLypleHBvcnQgZnVuY3Rpb24gY29uZmlnKCkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIHJldHVybiBDb25maWcuc2V0KGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdKTsgLy8gVE9ETzogcmVmYWN0b3IgdGhpc1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gQ29uZmlnLmdldChhcmd1bWVudHMpO1xuICB9XG4gIHJldHVybiBDb25maWcuZ2V0KCk7XG59Ki9cblxuLy8gVE9ETzogcmVmYWN0b3IgdG8gTWFwXG5leHBvcnQgY2xhc3MgQ29uZmlnIHtcblxuICAvKipcbiAgICogQG1ldGhvZCBnZXRcbiAgICogQGNsYXNzIENvbmZpZ1xuICAgKiBAbW9kdWxlIGNoYXlucy5jb25maWdcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBSZWZlcmVuY2UgdGhlIGBrZXlgIGluIHRoZSBjb25maWcgYE9iamVjdGBcbiAgICogQHJldHVybnMge251bGx9IFZhbHVlIG9mIHRoZSBga2V5YCBpbiB0aGUgY29uZmlnIGBPYmplY3RgXG4gICAqICAgICAgICAgICAgICAgICBgdW5kZWZpbmVkYCBpZiB0aGUgYGtleWAgd2FzIG5vdCBmb3VuZFxuICAgKi9cbiAgc3RhdGljIGdldChrZXkpIHtcbiAgICBpZiAoaXNQcmVzZW50KGtleSkpIHtcbiAgICAgIHJldHVybiBfY29uZmlnW2tleV07XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcGFyYW0gdmFsdWVcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzdGF0aWMgc2V0KGtleSwgdmFsdWUpIHtcbiAgICBpZiAoaXNCbGFuayhrZXkpIHx8IGlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBUT0RPOiBnb29kIGlkZWE/IG9uZSBzaG91bGQgYmUgY2FyZWZ1bCBpIHN1cHBvc2VcbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGV4dGVuZChfY29uZmlnLCB2YWx1ZSk7XG4gICAgfVxuICAgIF9jb25maWdba2V5XSA9IHZhbHVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzdGF0aWMgaGFzKGtleSkge1xuICAgIHJldHVybiAhIWtleSAmJiAoa2V5IGluIF9jb25maWcpO1xuICB9XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3QsIERPTX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtDb25maWd9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7bWVzc2FnZUxpc3RlbmVyfSBmcm9tICcuL2NhbGxiYWNrcyc7XG5pbXBvcnQge2NoYXluc0FwaUludGVyZmFjZX0gZnJvbSAnLi9jaGF5bnNfYXBpX2ludGVyZmFjZSc7XG5cbi8vIGNyZWF0ZSBuZXcgTG9nZ2VyIGluc3RhbmNlXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY29yZScpO1xuXG4vLyBkaXNhYmxlIEpTIEVycm9ycyBpbiB0aGUgY29uc29sZVxuQ29uZmlnLnNldCgncHJldmVudEVycm9ycycsIGZhbHNlKTtcblxuLyoqXG4gKlxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqXG4gKiBAdHlwZSB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgRE9NIGlzIGxvYWRlZFxuICogQHByaXZhdGVcbiAqL1xudmFyIGRvbVJlYWR5ID0gZmFsc2U7XG5cbi8qKlxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqXG4gKiBAdHlwZSB7YXJyYXl9IENvbnRhaW5zIGNhbGxiYWNrcyBmb3IgdGhlIERPTSByZWFkeSBldmVudFxuICogQHByaXZhdGVcbiAqL1xudmFyIHJlYWR5Q2FsbGJhY2tzID0gW107XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLnByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlcih1c2VyQ29uZmlnKSB7XG4gIGxvZy5pbmZvKCdjaGF5bnMucmVnaXN0ZXInKTtcbiAgQ29uZmlnLnNldCh1c2VyQ29uZmlnKTsgLy8gdGhpcyByZWZlcmVuY2UgdG8gdGhlIGNoYXlucyBvYmpcbiAgcmV0dXJuIHRoaXM7XG59XG5cbi8vIFRPRE86IHJlZ2lzdGVyIGBGdW5jdGlvbmAgb3IgcHJlQ2hheW5zIGBPYmplY3RgP1xuZXhwb3J0IGZ1bmN0aW9uIHByZUNoYXlucygpIHtcbiAgaWYgKCdwcmVDaGF5bnMnIGluIHdpbmRvdyAmJiBpc09iamVjdCh3aW5kb3cucHJlQ2hheW5zKSkge1xuICAgIC8vIGZpbGwgY29uZmlnXG4gIH1cbn1cblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMucHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWR5KGNiKSB7XG4gIGxvZy5pbmZvKCdjaGF5bnMucmVhZHknKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGRvbVJlYWR5KSB7XG4gICAgLy8gVE9ETzogcmV0dXJuIGEgY3VzdG9tIE1vZGVsIE9iamVjdCBpbnN0ZWFkIG9mIGBjb25maWdgXG4gICAgY2Ioe1xuICAgICAgYXBwTmFtZTpDb25maWcuZ2V0KCdhcHBOYW1lJyksXG4gICAgICBhcHBWZXJzaW9uOiBDb25maWcuZ2V0KCdhcHBWZXJzaW9uJylcbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cbiAgcmVhZHlDYWxsYmFja3MucHVzaChhcmd1bWVudHNbMF0pO1xufVxuXG4vKipcbiAqIEBuYW1lIHByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSBvYmogUmVmZXJlbmNlIHRvIGNoYXlucyBPYmplY3RcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoKSB7XG4gIGxvZy5pbmZvKCdzdGFydCBjaGF5bnMgc2V0dXAnKTtcblxuICAvLyBlbmFibGUgYGNoYXlucy5jc3NgIGJ5IGFkZGluZyBgY2hheW5zYCBjbGFzc1xuICAvLyByZW1vdmUgYG5vLWpzYCBjbGFzcyBhbmQgYWRkIGBqc2AgY2xhc3NcbiAgbGV0IGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICBET00uYWRkQ2xhc3MoYm9keSwgJ2NoYXlucycpO1xuICBET00uYWRkQ2xhc3MoYm9keSwgJ2pzJyk7XG4gIERPTS5yZW1vdmVDbGFzcyhib2R5LCAnbm8tanMnKTtcblxuXG4gIC8vIHJ1biBwb2x5ZmlsbCAoaWYgcmVxdWlyZWQpXG5cbiAgLy8gcnVuIG1vZGVybml6ZXIgKGZlYXR1cmUgZGV0ZWN0aW9uKVxuXG4gIC8vIHJ1biBmYXN0Y2xpY2tcblxuICAvLyAodmlld3BvcnQgc2V0dXApXG5cbiAgLy8gY3JhdGUgbWV0YSB0YWdzIChjb2xvcnMsIG1vYmlsZSBpY29ucyBldGMpXG5cbiAgLy8gZG8gc29tZSBTRU8gc3R1ZmYgKGNhbm9uaWNhbCBldGMpXG5cbiAgLy8gZGV0ZWN0IHVzZXIgKGxvZ2dlZCBpbj8pXG5cbiAgLy8gcnVuIGNoYXlucyBzZXR1cCAoY29sb3JzIGJhc2VkIG9uIGVudmlyb25tZW50KVxuXG5cblxuICAvLyBzZXQgRE9NIHJlYWR5IGV2ZW50XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24oKSB7XG5cbiAgICBkb21SZWFkeSA9IHRydWU7XG4gICAgbG9nLmRlYnVnKCdET00gcmVhZHknKTtcblxuICAgIC8vIGFkZCBjaGF5bnMgcm9vdCBlbGVtZW50XG4gICAgbGV0IGNoYXluc1Jvb3QgPSBET00uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgY2hheW5zUm9vdC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2NoYXlucy1yb290Jyk7XG4gICAgY2hheW5zUm9vdC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NoYXluc19fcm9vdCcpO1xuICAgIERPTS5hcHBlbmRDaGlsZChib2R5LCBjaGF5bnNSb290KTtcblxuICAgIC8vIGRvbS1yZWFkeSBjbGFzc1xuICAgIERPTS5hZGRDbGFzcyhkb2N1bWVudC5ib2R5LCAnZG9tLXJlYWR5Jyk7XG5cbiAgICAvLyBnZXQgdGhlIEFwcCBJbmZvcm1hdGlvbiwgaGFzIHRvIGJlIGRvbmUgd2hlbiBkb2N1bWVudCByZWFkeVxuICAgIGxldCBnZXRBcHBJbmZvcm1hdGlvbkNhbGwgPSAhY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICAvLyBub3cgQ2hheW5zIGlzIG9mZmljaWFsbHkgcmVhZHlcblxuICAgICAgbG9nLmRlYnVnKCdhcHBJbmZvcm1hdGlvbiBjYWxsYmFjaycsIGRhdGEpO1xuXG4gICAgICByZWFkeUNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgICAgcmVhZHlDYWxsYmFja3MgPSBbXTtcblxuICAgICAgRE9NLmFkZENsYXNzKGRvY3VtZW50LmJvZHksICdjaGF5bnMtcmVhZHknKTtcbiAgICAgIERPTS5yZW1vdmVBdHRyaWJ1dGUoRE9NLnF1ZXJ5KCdbY2hheW5zLWNsb2FrXScpLCAnY2hheW5zLWNsb2FrJyk7XG5cbiAgICAgIGxvZy5pbmZvKCdmaW5pc2hlZCBjaGF5bnMgc2V0dXAnKTtcbiAgICB9KTtcblxuICAgIGlmIChnZXRBcHBJbmZvcm1hdGlvbkNhbGwpIHtcbiAgICAgIGxvZy5lcnJvcignVGhlIEFwcCBJbmZvcm1hdGlvbiBjb3VsZCBub3QgYmUgcmV0cmlldmVkLicpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gc3RhcnQgd2luZG93Lm9uKCdtZXNzYWdlJykgbGlzdGVuZXIgZm9yIEZyYW1lIENvbW11bmljYXRpb25cbiAgbWVzc2FnZUxpc3RlbmVyKCk7XG5cblxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZWN0IGBCcm93c2VyYCwgYE9TYCBhbmQgJ0RldmljZWBcbiAqIGFzIHdlbGwgYXMgYENoYXlucyBFbnZpcm9ubWVudGAsIGBDaGF5bnMgVXNlcmAgYW5kIGBDaGF5bnMgU2l0ZWBcbiAqIGFuZCBhc3NpZ24gdGhlIGRhdGEgaW50byB0aGUgZW52aXJvbm1lbnQgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIHNldEVudmlyb25tZW50KCkge1xuXG59XG4iLCIvKipcbiAqIEBtb2R1bGUgY2hheW5zLmVudmlyb25tZW50XG4gKiBAZGVzY3JpcHRpb25cbiAqIENoYXlucyBFbnZpcm9ubWVudFxuICovXG5cbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICcuLi91dGlscyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuZW52aXJvbm1lbnQnKTtcblxuLy8gVE9ETzogaW1wb3J0IGRlcGVuZGVuY2llc1xuZXhwb3J0IHZhciB0eXBlcyA9IHt9O1xuXG50eXBlcy5icm93c2VyID0gW1xuICAnY2hyb21lJyxcbiAgJ2ZpcmVmb3gnLFxuICAnc2FmYXJpJyxcbiAgJ29wZXJhJyxcbiAgJ2Nocm9tZSBtb2JpbGUnLFxuICAnc2FmYXJpIG1vYmlsZScsXG4gICdmaXJlZm94IG1vYmlsZSdcbl07XG5cbnR5cGVzLm9zID0gW1xuICAnd2luZG93cycsXG4gICdtYWNPUycsXG4gICdhbmRyb2lkJyxcbiAgJ2lvcycsXG4gICd3cCdcbl07XG5cbnR5cGVzLmNoYXluc09TID0ge1xuICB3ZWI6ICd3ZWJzaGFkb3cnLFxuICB3ZWJNb2JpbGU6ICd3ZWJzaGFkb3dtb2JpbGUnLFxuICBhcHA6ICd3ZWJzaGFkb3dtb2JpbGUnXG59O1xuXG4vLyBUT0RPOiBoaWRlIGludGVybmFsIHBhcmFtZXRlcnMgZnJvbSB0aGUgb3RoZXJzXG4vLyBUT0RPOiBvZmZlciB1c2VyIGFuIGBPYmplY3RgIHdpdGggVVJMIFBhcmFtZXRlcnNcbi8vIGxvY2F0aW9uIHF1ZXJ5IHN0cmluZ1xudmFyIHF1ZXJ5ID0gbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKTtcbnZhciBwYXJhbWV0ZXJzID0ge307XG5xdWVyeS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24ocGFydCkge1xuICB2YXIgaXRlbSA9IHBhcnQuc3BsaXQoJz0nKTtcbiAgcGFyYW1ldGVyc1tpdGVtWzBdLnRvTG93ZXJDYXNlKCldID0gZGVjb2RlVVJJQ29tcG9uZW50KGl0ZW1bMV0pLnRvTG93ZXJDYXNlKCk7XG59KTtcblxuLy8gdmVyaWZ5IGJ5IGNoYXlucyByZXF1aXJlZCBwYXJhbWV0ZXJzIGV4aXN0XG5pZiAoIXBhcmFtZXRlcnMuYXBwdmVyc2lvbikge1xuICBsb2cud2Fybignbm8gYXBwIHZlcnNpb24gcGFyYW1ldGVyJyk7XG59XG5pZiAoIXBhcmFtZXRlcnMub3MpIHtcbiAgbG9nLndhcm4oJ25vIG9zIHBhcmFtZXRlcicpO1xufVxuaWYgKHBhcmFtZXRlcnMuZGVidWcpIHtcbiAgLy8gVE9ETzogZW5hYmxlIGRlYnVnIG1vZGVcbn1cblxuLy8gVE9ETzogZnVydGhlciBwYXJhbXMgYW5kIGNvbG9yc2NoZW1lXG4vLyBUT0RPOiBkaXNjdXNzIHJvbGUgb2YgVVJMIHBhcmFtcyBhbmQgdHJ5IHRvIHJlcGxhY2UgdGhlbSBhbmQgb25seSB1c2UgQXBwRGF0YVxuXG5cbmZ1bmN0aW9uIGdldEZpcnN0TWF0Y2gocmVnZXgpIHtcbiAgdmFyIG1hdGNoID0gdWEubWF0Y2gocmVnZXgpO1xuICByZXR1cm4gKG1hdGNoICYmIG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2hbMV0pIHx8ICcnO1xufVxuXG4vLyB1c2VyIGFnZW50IGRldGVjdGlvblxudmFyIHVzZXJBZ2VudCA9ICh3aW5kb3cubmF2aWdhdG9yICYmIG5hdmlnYXRvci51c2VyQWdlbnQpIHx8ICcnO1xuXG52YXIgaXMgPSB7XG4gIGlvczogL2lQaG9uZXxpUGFkfGlQb2QvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGFuZHJvaWQ6IC9BbmRyb2lkL2kudGVzdCh1c2VyQWdlbnQpLFxuICB3cDogL3dpbmRvd3MgcGhvbmUvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGJiOiAvQmxhY2tCZXJyeXxCQjEwfFJJTS9pLnRlc3QodXNlckFnZW50KSxcblxuICBvcGVyYTogKCEhd2luZG93Lm9wZXJhIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignIE9QUi8nKSA+PSAwKSxcbiAgZmlyZWZveDogKHR5cGVvZiBJbnN0YWxsVHJpZ2dlciAhPT0gJ3VuZGVmaW5lZCcpLFxuICBzYWZhcmk6IChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93LkhUTUxFbGVtZW50KS5pbmRleE9mKCdDb25zdHJ1Y3RvcicpID4gMCksXG4gIGNocm9tZTogKCEhd2luZG93LmNocm9tZSAmJiAhKCEhd2luZG93Lm9wZXJhIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignIE9QUi8nKSA+PSAwKSksXG4gIGllOiBmYWxzZSB8fCAhIWRvY3VtZW50LmRvY3VtZW50TW9kZSxcbiAgaWUxMTogL21zaWUgMTEvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllMTA6IC9tc2llIDEwL2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTk6IC9tc2llIDkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllODogL21zaWUgOC9pLnRlc3QodXNlckFnZW50KSxcblxuICBtb2JpbGU6IC8oaXBob25lfGlwb2R8KCg/OmFuZHJvaWQpPy4qP21vYmlsZSl8YmxhY2tiZXJyeXxub2tpYSkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHRhYmxldDogLyhpcGFkfGFuZHJvaWQoPyEuKm1vYmlsZSl8dGFibGV0KS9pLnRlc3QodXNlckFnZW50KSxcbiAga2luZGxlOiAvXFxXKGtpbmRsZXxzaWxrKVxcVy9pLnRlc3QodXNlckFnZW50KSxcbiAgdHY6IC9nb29nbGV0dnxzb255ZHR2L2kudGVzdCh1c2VyQWdlbnQpXG59O1xuXG4vLyBUT0RPOiBCcm93c2VyIFZlcnNpb24gYW5kIE9TIFZlcnNpb24gZGV0ZWN0aW9uXG5cbi8vIFRPRE86IGFkZCBmYWxsYmFja1xudmFyIG9yaWVudGF0aW9uID0gTWF0aC5hYnMod2luZG93Lm9yaWVudGF0aW9uICUgMTgwKSA9PT0gMCA/ICdwb3J0cmFpdCcgOiAnbGFuZHNjYXBlJztcbnZhciB2aWV3cG9ydCA9IHdpbmRvdy5pbm5lcldpZHRoICsgJ3gnICsgd2luZG93LmlubmVySGVpZ2h0O1xuXG5leHBvcnQgdmFyIGVudmlyb25tZW50ID0ge1xuXG4gIC8vb3M6IHBhcmFtZXRlcnMub3MsXG4gIG9zVmVyc2lvbjogMSxcblxuICBicm93c2VyOiAnJyxcbiAgYnJvd3NlclZlcnNpb246IDEsXG5cbiAgLy9hcHBWZXJzaW9uOiBwYXJhbWV0ZXJzLmFwcHZlcnNpb24sXG5cbiAgLy9vcmllbnRhdGlvbjogb3JpZW50YXRpb24sXG5cbiAgLy92aWV3cG9ydDogdmlld3BvcnQsIC8vIGluIDF4MSBpbiBweFxuXG4gIC8vcmF0aW86IDEsIC8vIHBpeGVsIHJhdGlvXG5cbiAgLy9pc0luRnJhbWU6IGZhbHNlLFxuXG4gIC8vaXNDaGF5bnNXZWI6IG51bGwsIC8vIGRlc2t0b3AgYnJvd3Nlciwgbm8gQXBwLCBubyBtb2JpbGVcbiAgLy9pc0NoYXluc1dlYk1vYmlsZTogbnVsbCwgLy8gbW9iaWxlIGJyb3dzZXIsIG5vIEFwcCwgbm8gZGVza3RvcFxuICAvL2lzQXBwOiBmYWxzZSwgLy8gb3RoZXJ3aXNlIEJyb3dzZXJcbiAgLy9pc01vYmlsZTogbnVsbCwgLy8gbm8gZGVza3RvcCwgYnV0IG1vYmlsZSBicm93c2VyIGFuZCBhcHBcbiAgLy9pc1RhYmxldDogbnVsbCwgLy8gbm8gZGVza3RvcCwga2luZGEgbW9iaWxlLCBtb3N0IGxpa2VseSBubyBhcHBcbiAgLy9pc0Rlc2t0b3A6IG51bGwsIC8vIG5vIGFwcCwgbm8gbW9iaWxlXG4gIC8vaXNCcm93c2VyOiBudWxsLCAvLyBvdGhlcndpc2UgQXBwXG5cbiAgLy9pc0lPUzogaXMuaW9zLFxuICAvL2lzQW5kcm9pZDogaXMuYW5kcm9pZCxcbiAgLy9pc1dQOiBpcy53cCxcbiAgLy9pc0JCOiBpcy5iYixcblxuICAvL3BhcmFtZXRlcnM6IHBhcmFtZXRlcnMsXG4gIC8vaGFzaDogbG9jYXRpb24uaGFzaC5zdWJzdHIoMSksXG5cbiAgc2l0ZToge1xuICAgIHNpdGVJZDogMSxcbiAgICBuYW1lOiAnVG9iaXQnLFxuICAgIGxvY2F0aW9uSWQ6IDEsXG4gICAgdXJsOiAnaHR0cHM6Ly90b2JpdC5jb20vJyxcbiAgICB1c2VTU0w6IHRydWUsXG4gICAgY29sb3JzY2hlbWU6IDFcbiAgICAvL2VkaXRNb2RlOiBmYWxzZSwgLy8gZnV0dXJlIGVkaXQgbW9kZSBmb3IgY29udGVudFxuICAgIC8vaXNBZG1pbk1vZGU6IHRydWVcbiAgfSxcblxuICAvLyBUT0RPOiBjb25zaWRlciBUYXBwXG4gIGFwcDoge1xuICAgIGFwcElkOiAxLFxuICAgIGNvbmZpZzoge30sXG4gICAgLy9kZWZhdWx0Q29udGlmOiB7fSxcbiAgICBkb21SZWFkeTogZmFsc2UsXG4gICAgbG9nczoge1xuICAgICAgbG9nOiBbXSxcbiAgICAgIGRlYnVnOiBbXSxcbiAgICAgIHdhcm46IFtdXG4gICAgfSxcbiAgICBlcnJvcnM6IFtdXG4gIH1cbn07XG5cbmVudmlyb25tZW50LnBhcmFtZXRlcnMgPSBwYXJhbWV0ZXJzO1xuZW52aXJvbm1lbnQuaGFzaCA9IGxvY2F0aW9uLmhhc2guc3Vic3RyKDEpO1xuXG4vLyBXQVRDSCBPVVQgdGhlIE9TIGlzIHNldCBieSBwYXJhbWV0ZXIgKHVuZm9ydHVuYXRlbHkpXG5lbnZpcm9ubWVudC5vcyA9IHBhcmFtZXRlcnMub3MgfHwgJ25vT1MnOyAvLyBUT0RPOiByZWZhY3RvciBPU1xuaWYgKGlzLm1vYmlsZSAmJiBbJ2FuZHJvaWQnLCAnaW9zJywgJ3dwJ10uaW5kZXhPZihwYXJhbWV0ZXJzLm9zKSAhPT0gLTEpIHtcbiAgcGFyYW1ldGVycy5vcyA9IHR5cGVzLmNoYXluc09TLmFwcDtcbn1cblxuLy8gZGV0ZWN0aW9uIGJ5IHVzZXIgYWdlbnRcbmVudmlyb25tZW50LmlzSU9TID0gaXMuaW9zO1xuZW52aXJvbm1lbnQuaXNBbmRyb2lkID0gaXMuYW5kcm9pZDtcbmVudmlyb25tZW50LmlzV1AgPSBpcy53cDtcbmVudmlyb25tZW50LmlzQkIgPSBpcy5iYjtcblxuLy8gVE9ETzogbWFrZSBzdXJlIHRoYXQgdGhpcyBhbHdheXMgd29ya3MhIChUU1BOLCBjcmVhdGUgaWZyYW1lIHRlc3QgcGFnZSlcbmVudmlyb25tZW50LmlzSW5GcmFtZSA9ICh3aW5kb3cgIT09IHdpbmRvdy50b3ApO1xuXG5lbnZpcm9ubWVudC5pc0FwcCA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy5hcHAgJiYgaXMubW9iaWxlICYmICFlbnZpcm9ubWVudC5pc0luRnJhbWUpOyAvLyBUT0RPOiBkb2VzIHRoaXMgYWx3YXlzIHdvcms/XG5lbnZpcm9ubWVudC5hcHBWZXJzaW9uID0gcGFyYW1ldGVycy5hcHB2ZXJzaW9uO1xuXG5lbnZpcm9ubWVudC5pc0Jyb3dzZXIgPSAhZW52aXJvbm1lbnQuaXNBcHA7XG5cbmVudmlyb25tZW50LmlzRGVza3RvcCA9ICghaXMubW9iaWxlICYmICFpcy50YWJsZXQpO1xuXG5lbnZpcm9ubWVudC5pc01vYmlsZSA9IGlzLm1vYmlsZTtcbmVudmlyb25tZW50LmlzVGFibGV0ID0gaXMudGFibGV0O1xuXG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYk1vYmlsZSA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy53ZWJNb2JpbGUpICYmIGVudmlyb25tZW50LmlzSW5GcmFtZTtcbmVudmlyb25tZW50LmlzQ2hheW5zV2ViRGVza3RvcCA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy53ZWIpICYmIGVudmlyb25tZW50LmlzSW5GcmFtZTtcbmVudmlyb25tZW50LmlzQ2hheW5zV2ViID0gZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wIHx8IGVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlO1xuXG4vLyBpbnRlcm5hbCBUT0RPOiBtYWtlIGl0IHByaXZhdGU/XG5lbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsID0gZW52aXJvbm1lbnQuaXNBcHA7XG5lbnZpcm9ubWVudC5jYW5DaGF5bnNXZWJDYWxsID0gZW52aXJvbm1lbnQuaXNDaGF5bnNXZWI7XG5cbmVudmlyb25tZW50LnZpZXdwb3J0ID0gdmlld3BvcnQ7IC8vIFRPRE86IHVwZGF0ZSBvbiByZXNpemU/IG5vLCBkdWUgcGVyZm9ybWFuY2VcbmVudmlyb25tZW50Lm9yaWVudGF0aW9uID0gb3JpZW50YXRpb247XG5lbnZpcm9ubWVudC5yYXRpbyA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuIiwiZXhwb3J0IHZhciB1c2VyID0ge1xuICBuYW1lOiAnUGFjYWwgV2VpbGFuZCcsXG4gIGZpcnN0TmFtZTogJ1Bhc2NhbCcsXG4gIGxhc3ROYW1lOiAnV2VpbGFuZCcsXG4gIHVzZXJJZDogMTIzNCxcbiAgZmFjZWJvb2tJZDogMTIzNDUsXG4gIGlzQWRtaW46IHRydWUsXG4gIHVhY0dyb3VwczogW10sXG4gIGxhbmd1YWdlOiAnZGVfREUnLFxuICB0b2tlbjogJ3Rva2VuJyAvLyBUT0RPIGluY2x1ZGUgdG9rZW4gaGVyZT9cbn07XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzIG9yIHRvYmlcbiAqIEBtb2R1bGUgamFtZXNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgamFtZXMgLSB0b2JpdCBoZWxwZXIgbGlicmFyeVxuICogSGVscGVyIGxpYnJhcnkgc3VwcG9ydGluZyB0aGUgQ2hheW5zIEFQSVxuICovXG5cbi8vIFRPRE86IG1vdmUgYWxsIHRvIGhlbHBlci5qcyBvciB0b2JpL2phbXNcbi8vIFRPRE86IGhlbHBlci5qcyB3aXRoIEVTNiBhbmQgamFzbWluZSAoYW5kIG9yIHRhcGUpXG4vLyBpbmNsdWRlIGhlbHBlciBhcyBtYWluIG1vZHVsZVxuXG4vLyBpbXBvcnRhbnQgaXMqIGZ1bmN0aW9uc1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9pcyc7XG5cbi8vIGV4dGVuZCBvYmplY3QgZnVuY3Rpb25cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXh0ZW5kJztcblxuLy8gbW9kZXJuaXplclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL21vZGVybml6ZXInO1xuXG4vLyBwcm9taXNlIFFcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9wcm9taXNlJztcblxuLy8gcG9seWZpbGwgJiBhamF4IHdyYXBwZXIgd2luZG93LmZldGNoIChpbnN0ZWFkIG9mICQuYWpheCwgJC5nZXQsICQuZ2V0SlNPTiwgJGh0dHApXG4vLyBvZmZlcnMgZmV0Y2gsIGZldGNoSlNPTiAoanNvbiBpcyBzdGFuZGFyZCksIHVwbG9hZHMge2dldCwgcG9zdCwgcHV0LCBkZWxldGV9LCBmZXRjaENTUywgZmV0Y2hKU1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2ZldGNoJztcblxuLy8gQnJvd3NlciBBUElzICh3aW5kb3csIGRvY3VtZW50LCBsb2NhdGlvbilcbi8vIFRPRE86IGNvbnNpZGVyIHRvIG5vdCBiaW5kIGJyb3dzZXIgdG8gdGhlIHV0aWxzIGBPYmplY3RgXG4vKiBqc2hpbnQgLVcxMTYgKi9cbi8qIGpzaGludCAtVzAzMyAqL1xuLy8ganNjczpkaXNhYmxlIHBhcnNlRXJyb3JcbmltcG9ydCAqIGFzIGJyb3dzZXIgZnJvbSAnLi91dGlscy9icm93c2VyJzsgLy9ub2luc3BlY3Rpb24gQmFkRXhwcmVzc2lvblN0YXRlbWVudEpTIGpzaGludCBpZ25vcmU6IGxpbmVcbi8vIGpzY3M6ZW5hYmxlIHBhcnNlRXJyb3Jcbi8qIGpzaGludCArVzAzMyAqL1xuLyoganNoaW50ICtXMTE2ICovXG5leHBvcnQge2Jyb3dzZXJ9O1xuXG4vLyBET01cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZG9tJztcblxuLy8gTG9nZ2VyXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XG5cbi8vIEFuYWx5dGljc1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2FuYWx5dGljcyc7XG5cbi8vIFJlbW90ZVxuLy8gcmVtb3RlIGRlYnVnZ2luZyBhbmQgYW5hbHlzaXNcblxuLy8gZnJvbnQtZW5kIEVycm9yIEhhbmRsZXIgKGNhdGNoZXMgZXJyb3JzLCBpZGVudGlmeSBhbmQgYW5hbHlzZXMgdGhlbSlcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXJyb3InO1xuXG4vLyBhdXRoICYgSldUIGhhbmRsZXJcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9qd3QnO1xuXG4vLyBjb29raWUgaGFuZGxlciAod2lsbCBiZSB1c2VkIGluIHRoZSBsb2NhbF9zdG9yYWdlIGFzIGZhbGxiYWNrKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Nvb2tpZV9oYW5kbGVyJztcblxuLy8gbG9jYWxTdG9yYWdlIGhlbHBlciAod2hpY2ggY29va2llIGZhbGxiYWNrKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xvY2FsX3N0b3JhZ2UnO1xuXG4vLyBtaWNybyBldmVudCBsaWJyYXJ5XG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2V2ZW50cyc7XG5cbi8vIG9mZmxpbmUgY2FjaGUgaGVscGVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvb2ZmbGluZV9jYWNoZSc7XG5cbi8vIG5vdGlmaWNhdGlvbnM6IHRvYXN0cywgYWxlcnRzLCBtb2RhbCBwb3B1cHMsIG5hdGl2ZSBwdXNoXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbm90aWZpY2F0aW9ucyc7XG5cbi8vIGlmcmFtZSBjb21tdW5pY2F0aW9uIGFuZCBoZWxwZXIgKENPUlMpXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvaWZyYW1lJztcblxuLy8gcGFnZSB2aXNpYmlsaXR5IEFQSVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL3BhZ2VfdmlzaWJpbGl0eSc7XG5cbi8vIERhdGVUaW1lIGhlbHBlciAoY29udmVydHMgZGF0ZXMsIEMjIGRhdGUsIHRpbWVzdGFtcHMsIGkxOG4sIHRpbWUgYWdvKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2RhdGV0aW1lJztcblxuXG4vLyBsYW5ndWFnZSBBUEkgaTE4blxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xhbmd1YWdlJztcblxuLy8gY3JpdGljYWwgY3NzXG5cbi8vIGxvYWRDU1NcblxuLy8gbGF6eSBsb2FkaW5nXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbGF6eV9sb2FkaW5nJztcblxuLy8gKGltYWdlKSBwcmVsb2FkZXJcbi8vZXhwb3J0ICogZnJvbSAnL3V0aWxzL3ByZWxvYWRlcic7XG5cbi8vIGlzUGVtaXR0ZWQgQXBwIFZlcnNpb24gY2hlY2tcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvaXNfcGVybWl0dGVkJztcblxuXG4vLyBpbiBGdXR1cmVcbi8vIGltbXV0YWJsZVxuLy8gd2VhayBtYXBzXG4vLyBvYnNlcnZlclxuLy8gd2ViIHNvY2tldHMgKHdzLCBTaWduYWxSKVxuLy8gd29ya2VyIChzaGFyZWQgd29ya2VyLCBsYXRlciBzZXJ2aWNlIHdvcmtlciBhcyB3ZWxsKVxuLy8gbG9jYXRpb24sIHB1c2hTdGF0ZSwgaGlzdG9yeSBoYW5kbGVyXG4vLyBjaGF5bnMgc2l0ZSBhbmQgY29kZSBhbmFseXNlcjogZmluZCBkZXByZWNhdGVkIG1ldGhvZHMsIGJhZCBjb2RlLCBpc3N1ZXMgYW5kIGJvdHRsZW5lY2tzXG5cbiIsIi8qKlxuICogVGhpcyBtb2R1bGUgY29udGFpbnMgdGhlIEJyb3dzZXIgQVBJc1xuICpcbiAqL1xuLy8gVE9ETzogbW92ZSBvdXQgb2YgdXRpbHNcbnZhciB3aW4gPSB3aW5kb3c7XG5cbi8vIHVzaW5nIG5vZGUgZ2xvYmFsIChtYWlubHkgZm9yIHRlc3RpbmcsIGRlcGVuZGVuY3kgbWFuYWdlbWVudClcbnZhciBfZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3c7XG5leHBvcnQge19nbG9iYWwgYXMgZ2xvYmFsfTtcblxuZXhwb3J0IHt3aW4gYXMgd2luZG93fTtcbmV4cG9ydCB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQ7XG5leHBvcnQgdmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuZXhwb3J0IHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuZXhwb3J0IHZhciBjaGF5bnMgPSB3aW5kb3cuY2hheW5zO1xuZXhwb3J0IHZhciBjaGF5bnNDYWxsYmFja3MgPSB3aW5kb3cuX2NoYXluc0NhbGxiYWNrcztcbmV4cG9ydCB2YXIgY2hheW5zUm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF5bnMtcm9vdCcpO1xuZXhwb3J0IHZhciBwYXJlbnQgPSB3aW5kb3cucGFyZW50O1xuZXhwb3J0IHZhciBjb25zb2xlID0gd2luZG93LmNvbnNvbGU7IC8vIE5PVEU6IHNob3VsZCBub3QgYmUgdXNlZC4gdXNlIGxvZ2dlciBpbnN0ZWFkXG5leHBvcnQgdmFyIGdjID0gd2luZG93LmdjID8gKCkgPT4gd2luZG93LmdjKCkgOiAoKSA9PiBudWxsO1xuXG4iLCIvLyBpbnNwaXJlZCBieSBBbmd1bGFyMidzIERPTVxuXG5pbXBvcnQge2RvY3VtZW50fSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtpc1VuZGVmaW5lZH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBjbGFzcyBET00ge1xuXG4gIC8vIE5PVEU6IGFsd2F5cyByZXR1cm5zIGFuIGFycmF5XG4gIHN0YXRpYyAkKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwuYmluZChkb2N1bWVudCk7XG4gIH1cblxuICAvLyBzZWxlY3RvcnNcbiAgc3RhdGljIHF1ZXJ5KHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBxdWVyeVNlbGVjdG9yKGVsLCBzZWxlY3Rvcikge1xuICAgIHJldHVybiBlbC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvckFsbChlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIG9uKGVsLCBldnQsIGxpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldnQsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjbG9uZShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuY2xvbmVOb2RlKHRydWUpO1xuICB9XG4gIHN0YXRpYyBoYXNQcm9wZXJ0eShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIG5hbWUgaW4gZWxlbWVudDtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShuYW1lKTtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeVRhZ05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKG5hbWUpO1xuICB9XG5cbiAgLy8gaW5wdXRcbiAgc3RhdGljIGdldElubmVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5pbm5lckhUTUw7XG4gIH1cbiAgc3RhdGljIGdldE91dGVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5vdXRlckhUTUw7XG4gIH1cbiAgc3RhdGljIHNldEhUTUwoZWwsIHZhbHVlKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH1cbiAgc3RhdGljIGdldFRleHQoZWwpIHtcbiAgICByZXR1cm4gZWwudGV4dENvbnRlbnQ7XG4gIH1cbiAgc3RhdGljIHNldFRleHQoZWwsIHZhbHVlKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGlucHV0IHZhbHVlXG4gIHN0YXRpYyBnZXRWYWx1ZShlbCkge1xuICAgIHJldHVybiBlbC52YWx1ZTtcbiAgfVxuICBzdGF0aWMgc2V0VmFsdWUoZWwsIHZhbHVlKSB7XG4gICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGNoZWNrYm94ZXNcbiAgc3RhdGljIGdldENoZWNrZWQoZWwpIHtcbiAgICByZXR1cm4gZWwuY2hlY2tlZDtcbiAgfVxuICBzdGF0aWMgc2V0Q2hlY2tlZChlbCwgdmFsdWUpIHtcbiAgICBlbC5jaGVja2VkID0gdmFsdWU7XG4gIH1cblxuICAvLyBjbGFzc1xuICBzdGF0aWMgY2xhc3NMaXN0KGVsZW1lbnQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWxlbWVudC5jbGFzc0xpc3QsIDApO1xuICB9XG4gIHN0YXRpYyBhZGRDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIGhhc0NsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICB9XG5cbiAgLy8gY3NzXG4gIHN0YXRpYyBjc3MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZoYXNhbHVlKSB7XG4gICAgaWYoaXNVbmRlZmluZWQoc3R5bGVWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gICAgfVxuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IHN0eWxlVmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldENTUyhlbGVtZW50LCBzdHlsZU5hbWUsIHN0eWxlVmFsdWUpIHtcbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDU1MoZWxlbWVudCwgc3R5bGVOYW1lKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gbnVsbDtcbiAgfVxuICBzdGF0aWMgZ2V0Q1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjcmVhdGVFbGVtZW50KHRhZ05hbWUsIGRvYz1kb2N1bWVudCkge1xuICAgIHJldHVybiBkb2MuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgfVxuXG4gIHN0YXRpYyByZW1vdmUoZWwpIHtcbiAgICB2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZTtcbiAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIHJldHVybiBlbDtcbiAgfVxuXG4gIHN0YXRpYyBhcHBlbmRDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLmFwcGVuZENoaWxkKG5vZGUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICB9XG5cbiAgc3RhdGljIGluc2VydEJlZm9yZShlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRBZnRlcihlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHN0YXRpYyB0YWdOYW1lKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lO1xuICB9XG5cbiAgLy8gYXR0cmlidXRlc1xuICBzdGF0aWMgZ2V0QXR0cmlidXRlKGVsZW1lbnQsIGF0dHJpYnV0ZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICB9XG4gIHN0YXRpYyBzZXRBdHRyaWJ1dGUoZWxlbWVudCwgbmFtZSwgdmFsdWUpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBFcnJvciBIYW5kbGVyIE1vZHVsZVxuICovXG5cbi8vIFRPRE86IGNvbnNpZGVyIGltcG9ydGluZyBmcm9tICcuL3V0aWxzJyBvbmx5XG5pbXBvcnQge3dpbmRvdyBhcyB3aW59IGZyb20gJy4vYnJvd3Nlcic7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHtDb25maWd9IGZyb20gJy4uL2NoYXlucy9jb25maWcnO1xuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuZXJyb3InKTtcblxud2luLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxldCBsaW5lQW5kQ29sdW1uSW5mbyA9XG4gICAgZXJyLmNvbG5vXG4gICAgICA/ICcgbGluZTonICsgZXJyLmxpbmVubyArICcsIGNvbHVtbjonICsgZXJyLmNvbG5vXG4gICAgICA6ICcgbGluZTonICsgZXJyLmxpbmVubztcblxuICBsZXQgZmluYWxFcnJvciA9IFtcbiAgICAgICdKYXZhU2NyaXB0IEVycm9yJyxcbiAgICAgIGVyci5tZXNzYWdlLFxuICAgICAgZXJyLmZpbGVuYW1lICsgbGluZUFuZENvbHVtbkluZm8gKyAnIC0+ICcgKyAgbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgICAgIDAsXG4gICAgICB0cnVlXG4gIF07XG5cbiAgLy8gVE9ETzogYWRkIHByb3BlciBFcnJvciBIYW5kbGVyXG4gIGxvZy53YXJuKGZpbmFsRXJyb3IpO1xuICBpZihDb25maWcuZ2V0KCdwcmV2ZW50RXJyb3JzJykpIHtcbiAgICBlcnIucHJldmVudERlZmF1bHQoKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KTtcbiIsIi8vIFRPRE86IHJlZmFjdG9yIGFuZCB3cml0ZSB0ZXN0c1xuLy8gVE9ETzogYWRkIGV4YW1wbGVcbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gYGBganNcbiAvLyBEZW1vXG5cbiBldmVudHMucHVibGlzaCgnL3BhZ2UvbG9hZCcsIHtcblx0dXJsOiAnL3NvbWUvdXJsL3BhdGgnIC8vIGFueSBhcmd1bWVudFxufSk7XG5cbiB2YXIgc3Vic2NyaXB0aW9uID0gZXZlbnRzLnN1YnNjcmliZSgnL3BhZ2UvbG9hZCcsIGZ1bmN0aW9uKG9iaikge1xuXHQvLyBEbyBzb21ldGhpbmcgbm93IHRoYXQgdGhlIGV2ZW50IGhhcyBvY2N1cnJlZFxufSk7XG5cbiAvLyAuLi5zb21ldGltZSBsYXRlciB3aGVyZSBJIG5vIGxvbmdlciB3YW50IHN1YnNjcmlwdGlvbi4uLlxuIHN1YnNjcmlwdGlvbi5yZW1vdmUoKTtcblxuIC8vICB2YXIgdGFyZ2V0ID0gd2luZG93LmV2ZW50ID8gd2luZG93LmV2ZW50LnNyY0VsZW1lbnQgOiBlID8gZS50YXJnZXQgOiBudWxsO1xuIGBgYFxuICovXG5leHBvcnQgdmFyIGV2ZW50cyA9IChmdW5jdGlvbigpIHtcbiAgbGV0IHRvcGljcyA9IHt9O1xuICBsZXQgb3duUHJvcGVydHkgPSB0b3BpY3MuaGFzT3duUHJvcGVydHk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uKHRvcGljLCBsaXN0ZW5lcikge1xuICAgICAgLy8gQ3JlYXRlIHRoZSB0b3BpYydzIG9iamVjdCBpZiBub3QgeWV0IGNyZWF0ZWRcbiAgICAgIGlmICghb3duUHJvcGVydHkuY2FsbCh0b3BpY3MsIHRvcGljKSkge1xuICAgICAgICB0b3BpY3NbdG9waWNdID0gW107XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCB0aGUgbGlzdGVuZXIgdG8gcXVldWVcbiAgICAgIGxldCBpbmRleCA9IHRvcGljc1t0b3BpY10ucHVzaChsaXN0ZW5lcikgLTE7XG5cbiAgICAgIC8vIFByb3ZpZGUgaGFuZGxlIGJhY2sgZm9yIHJlbW92YWwgb2YgdG9waWNcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZGVsZXRlIHRvcGljc1t0b3BpY11baW5kZXhdO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBwdWJsaXNoOiBmdW5jdGlvbih0b3BpYywgaW5mbykge1xuICAgICAgLy8gSWYgdGhlIHRvcGljIGRvZXNuJ3QgZXhpc3QsIG9yIHRoZXJlJ3Mgbm8gbGlzdGVuZXJzIGluIHF1ZXVlLCBqdXN0IGxlYXZlXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBDeWNsZSB0aHJvdWdoIHRvcGljcyBxdWV1ZSwgZmlyZSFcbiAgICAgIHRvcGljc1t0b3BpY10uZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGl0ZW0oaW5mbyAhPT0gdW5kZWZpbmVkID8gaW5mbyA6IHt9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxufSkoKTtcbiIsIi8qKlxuICogQG5hbWUgamFtZXMuZXh0ZW5kXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeHRlbmRzIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QgYnkgY29weWluZyBwcm9wZXJ0aWVzIGZyb20gdGhlIHNyYyBvYmplY3QuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cblxuaW1wb3J0IHtpc09iamVjdH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gIGlmICghaXNPYmplY3Qob2JqKSkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cbiAgdmFyIHNvdXJjZSwgcHJvcDtcbiAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICBmb3IgKHByb3AgaW4gc291cmNlKSB7XG4gICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmlzVW5kZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyB1bmRlZmluZWQuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHVuZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzRGVmaW5lZFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGVmaW5lZCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc1ByZXNlbnRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIG5laXRoZXIgdW5kZWZpbmVkIG5vciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBwcmVzZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmVzZW50KG9iaikge1xuICByZXR1cm4gb2JqICE9PSB1bmRlZmluZWQgJiYgb2JqICE9PSBudWxsO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQmxhbmtcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGVpdGhlciB1bmRlZmluZWQgb3IgbnVsbC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYmxhbmsuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JsYW5rKG9iaikge1xuICByZXR1cm4gb2JqID09PSB1bmRlZmluZWQgfHwgb2JqID09PSBudWxsO1xufVxuXG5cbi8qKlxuKiBAbmFtZSBqYW1lcy5pc1N0cmluZ1xuKiBAbW9kdWxlIGphbWVzXG4qIEBraW5kIGZ1bmN0aW9uXG4qXG4qIEBkZXNjcmlwdGlvblxuKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFN0cmluZ2AuXG4qXG4qIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYFN0cmluZ2AuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzTnVtYmVyXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBOdW1iZXJgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBOdW1iZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNPYmplY3RcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYE9iamVjdGAuXG4gKiBudWxsIGlzIG5vdCB0cmVhdGVkIGFzIGFuIG9iamVjdC5cbiAqIEluIEpTIGFycmF5cyBhcmUgb2JqZWN0c1xuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYE9iamVjdGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0FycmF5XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGFuIGBBcnJheWAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGFuIGBBcnJheWAuXG4gKi9cbmV4cG9ydCB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNGdW5jdGlvblxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgRnVuY3Rpb25gLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBGdW5jdGlvbmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEYXRlXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHZhbHVlIGlzIGEgZGF0ZS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgRGF0ZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RhdGUodmFsdWUpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5cbi8vIFRPRE86IGRvZXMgbm90IGJlbG9uZyBpbiBoZXJlXG4vKipcbiAqIEBuYW1lIHV0aWxzLnRyaW1cbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUmVtb3ZlcyB3aGl0ZXNwYWNlcy5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtTdHJpbmd8Kn0gVHJpbW1lZCAgdmFsdWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyaW0odmFsdWUpIHtcbiAgcmV0dXJuIGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKSA6IHZhbHVlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzVVVJRFxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFVVSURgIChPU0YpLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBVVUlEYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVVVJRCh2YWx1ZSkge1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB0cmltKHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWUubWF0Y2goL15bMC05YS1mXXs0fShbMC05YS1mXXs0fS0pezR9WzAtOWEtel17MTJ9JC9pKSAhPT0gbnVsbDtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNHVUlEXG4gKiBAYWxpYXMgdXRpbHMuaXNVVUlEXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgR1VJRGAgKE1pY3Jvc29mdCBTdGFuZGFyZCkuXG4gKiBJcyBhbiBhbGlhcyB0byBpc1VVSURcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgR1VJRGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0dVSUQodmFsdWUpIHtcbiAgcmV0dXJuIGlzVVVJRCh2YWx1ZSk7XG59XG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzTWFjQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE1BQyBBZGRyZXNzYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNYWNBZGRyZXNzKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXihbMC05YS1mXXsyfVstOl0pezV9WzAtOWEtZl17Mn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0JMRUFkZHJlc3NcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBCTEUgQWRkcmVzc2BcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgQkxFIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCTEVBZGRyZXNzKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpIHx8IGlzTWFjQWRkcmVzcyh2YWx1ZSk7XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3R9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5pc19wZXJtaXR0ZWQnKTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBjdXJyZW50IHVzZXIncyBPUyBhbmQgT1MgVmVyc2lvbiBpcyBoaWdoZXJcbiAqIG9yIGVxdWFsIHRvIHRoZSBwYXNzZWQgcmVmZXJlbmNlIGBPYmplY3RgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJzaW9ucyBWZXJzaW9ucyBgT2JqZWN0YCB3aXRoIHBlcm1pdHRlZCBPU3MgYW5kIHRoZWlyIHZlcnNpb24uXG4gKiBAcGFyYW0ge3N0cmluZ30gb3MgT1MgTmFtZSBhcyBsb3dlcmNhc2Ugc3RyaW5nLlxuICogQHBhcmFtIHtJbnRlZ2VyfSBhcHBWZXJzaW9uIEFwcCBWZXJzaW9uIE51bWJlciBhcyBJbnRlZ2VyICBUT0RPOiBmb3JtYXQgUkZDP1xuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGN1cnJlbnQgT1MgJiBWZXJzaW9uIGFyZSBkZWZpbmVkIGluIHRoZSB2ZXJzaW9ucyBgT2JqZWN0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIG9zLCBhcHBWZXJzaW9uKSB7XG5cbiAgaWYgKCF2ZXJzaW9ucyB8fCAhaXNPYmplY3QodmVyc2lvbnMpKSB7XG4gICAgbG9nLndhcm4oJ25vIHZlcnNpb25zIGBPYmplY3RgIHdhcyBwYXNzZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbnNbb3NdICYmIGFwcFZlcnNpb24gPj0gdmVyc2lvbnNbb3NdO1xufVxuIiwiLyoqXG4gKiBMb2dMZXZlbCBFbnVtXG4gKiBub25lIGlzIDBcbiAqIGRlYnVnIGlzIDRcbiAqIEB0eXBlIEVudW1cbiAqL1xuZXhwb3J0IHZhciBsZXZlbHMgPSB7XG4gIG5vbmU6IDAsXG4gIGVycm9yOjEsXG4gIHdhcm46MixcbiAgaW5mbzozLFxuICBkZWJ1Zzo0XG59O1xuXG4vKipcbiAqIENhbiBzdG9yZSBtdWx0aXBsZSBsb2dnZXJzXG4gKiBAdHlwZSB7YE9iamVjdGB9IGxvZ2dlcnNcbiAqL1xubGV0IGxvZ2dlcnMgPSB7fTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEFzc2lnbiB0aGUgbG9nZ2VyIG1ldGhvZC5cbiAqIEJ5IGRlZmF1bHQgdGhlIHdpbmRvdy5jb25zb2xlIGBPYmplY3RgXG4gKiBAdHlwZSBgd2luZG93LmNvbnNvbGVgXG4gKi9cbmxldCBsb2dnZXIgPSB3aW5kb3cuY29uc29sZTtcblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nIExldmVsXG4gKiB1c2UgYHNldExldmVsKG5ld0xvZ0xldmVsKWAgdG8gb3ZlcndyaXRlIHRoaXMgdmFsdWUuXG4gKiBUT0RPOiBlYWNoIGxvZ2dlciBnZXRzIGFuIG93biBsb2dMZXZlbFxuICovXG5sZXQgbG9nTGV2ZWwgPSBsZXZlbHMubm9uZTtcblxuLyoqXG4gKlxuICogQHBhcmFtIGxldmVsXG4gKiBAcGFyYW0gYXJnc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gbG9nKGxldmVsLCBhcmdzLCBwcmVmaXgpIHtcbiAgbGV0IHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICBpZiAocHJlZml4KSB7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJncyk7XG4gICAgLy9hcmdzLnVuc2hpZnQodGltZSk7IC8vIFRPRE86IGNvbnNpZGVyIHRvZ2dsZWFibGUgdGltZVxuICAgIGFyZ3MudW5zaGlmdChwcmVmaXgpO1xuICB9XG4gIGxvZ2dlcltsZXZlbCB8fCAnbG9nJ10uYXBwbHkoY29uc29sZSwgYXJncyk7XG59XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IGxvZ0xldmVsXG4gKiBpbiBvcmRlciB0byBzaG93IG9yIG5vdCBzaG93IGxvZ3NcbiAqIEBwYXJhbSBsZXZlbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TGV2ZWwobGV2ZWwpIHtcbiAgbG9nTGV2ZWwgPSBsZXZlbDtcbn1cblxuLyoqXG4gKiBHZXQgTG9nZ2VyIFNpbmdsZXRvbiBJbnN0YW5jZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIFRoZSBMb2dnZXIncyBuYW1lXG4gKiBAcmV0dXJucyB7TG9nZ2VyfSBMb2dnZXIgaW5zdGFuY2UsIGVpdGhlciBleGlzdGluZyBvbmUgb3IgY3JlYXRlcyBhIG5ldyBvbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XG4gIHJldHVybiBsb2dnZXJzW25hbWVdIHx8IChsb2dnZXJzW25hbWVdID0gbmV3IExvZ2dlcihuYW1lKSk7XG59XG5cbi8qKlxuICogTG9nZ2VyIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuXG4gIC8qKlxuICAgKiBFYWNoIGxvZ2dlciBpcyBpZGVudGlmaWVkIGJ5IGl0J3MgbmFtZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbG9nZ2VyIChlLmcuIGBjaGF5bnMuY29yZWApXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gJ1snICsgbmFtZSArICddOiAnO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlYnVnXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZGVidWcoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2RlYnVnJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgaW5mby5cbiAgICpcbiAgICogQG1ldGhvZCBpbmZvXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgaW5mbygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnaW5mbycsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nLlxuICAgKlxuICAgKiBAbWV0aG9kIHdhcm5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICB3YXJuKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2coJ3dhcm4nLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvci5cbiAgICpcbiAgICogQG1ldGhvZCBlcnJvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGVycm9yKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdlcnJvcicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxufVxuIiwiXG5pbXBvcnQge2NoYXluc30gZnJvbSAnLi9jaGF5bnMnO1xuZXhwb3J0IGRlZmF1bHQgY2hheW5zO1xuIl19
  return require('chayns');

});
