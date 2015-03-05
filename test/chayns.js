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
  }

};
Object.defineProperty(exports, "__esModule", {
  value: true
});

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdXNlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9icm93c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9lcnJvci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9ldmVudHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXh0ZW5kLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzX3Blcm1pdHRlZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9sb2dnZXIuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zLXVtZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7OztJQ09ZLEtBQUssbUNBQW9CLFNBQVM7O0FBQzlDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7OztBQUcxQixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7O0lBR1YsTUFBTSxXQUF1QixpQkFBaUIsRUFBOUMsTUFBTTs7OztJQUdOLFdBQVcsV0FBa0Isc0JBQXNCLEVBQW5ELFdBQVc7Ozs7SUFHWCxJQUFJLFdBQXlCLGVBQWUsRUFBNUMsSUFBSTs7OzswQkFHeUIsZUFBZTs7SUFBNUMsS0FBSyxlQUFMLEtBQUs7SUFBRSxRQUFRLGVBQVIsUUFBUTtJQUFFLEtBQUssZUFBTCxLQUFLOzs7O0lBSXRCLE9BQU8sV0FBc0IsdUJBQXVCLEVBQXBELE9BQU87O0lBRVAsa0JBQWtCLFdBQVcsK0JBQStCLEVBQTVELGtCQUFrQjs7O0FBSW5CLElBQUksTUFBTSxXQUFOLE1BQU0sR0FBRyxFQUFFLENBQUM7O0FBRXZCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFB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QztPQUNuQzs7OztBQVFELFNBQUs7Ozs7Ozs7OzthQUFBLGlCQUFHO0FBQ04sWUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFO0FBQ2hCLGlCQUFPO1NBQ1I7QUFDRCxXQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDcEM7Ozs7OztTQTlEVSxNQUFNOzs7Ozs7Ozs7O0lDdkVYLE1BQU0sV0FBTyxVQUFVLEVBQXZCLE1BQU07O2lCQUNDLE1BQU0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAbmFtZSBjaGF5bnMgQVBJXG4gKiBAbW9kdWxlIGNoYXluc1xuICovXG5cbi8vIGhlbHBlclxuLy8gVE9ETzogZWl0aGVyIGluZGV4LmpzLCB1dGlscy5qcyBvciBqdXN0IHRoZSBzaW5nbGUgZmlsZXNcbmltcG9ydCAqIGFzIHV0aWxzICAgICAgICAgICAgICAgZnJvbSAnLi91dGlscyc7XG52YXIgZXh0ZW5kID0gdXRpbHMuZXh0ZW5kO1xuXG4vLyBzZXQgbG9nTGV2ZWwgdG8gaW5mb1xudXRpbHMuc2V0TGV2ZWwoNCk7IC8vIFRPRE86IGRvbid0IHNldCB0aGUgbGV2ZWwgaGVyZVxuXG4vLyBiYXNpYyBjb25maWdcbmltcG9ydCB7Y29uZmlnfSAgICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY29uZmlnJztcblxuLy8gZW52aXJvbm1lbnRcbmltcG9ydCB7ZW52aXJvbm1lbnR9ICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvZW52aXJvbm1lbnQnO1xuXG4vLyAoY3VycmVudCkgdXNlclxuaW1wb3J0IHt1c2VyfSAgICAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy91c2VyJztcblxuLy8gY29yZSBmdW5jdGlvbnNcbmltcG9ydCB7cmVhZHksIHJlZ2lzdGVyLCBzZXR1cH0gZnJvbSAnLi9jaGF5bnMvY29yZSc7XG5cbi8vIGNoYXlucyBjYWxsc1xuXG5pbXBvcnQge2FwaUNhbGx9ICAgICAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2NoYXluc19jYWxscyc7XG5cbmltcG9ydCB7Y2hheW5zQXBpSW50ZXJmYWNlfSAgICAgZnJvbSAnLi9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuXG5cbi8vIHB1YmxpYyBjaGF5bnMgb2JqZWN0XG5leHBvcnQgdmFyIGNoYXlucyA9IHt9O1xuXG5leHRlbmQoY2hheW5zLCB7Z2V0TG9nZ2VyOiB1dGlscy5nZXRMb2dnZXJ9KTsgLy8ganNoaW50IGlnbm9yZTogbGluZVxuZXh0ZW5kKGNoYXlucywge3V0aWxzfSk7XG5leHRlbmQoY2hheW5zLCB7VkVSU0lPTjogJzAuMS4wJ30pO1xuLy9leHRlbmQoY2hheW5zLCB7Y29uZmlnfSk7IC8vIFRPRE86IHRoZSBjb25maWcgYE9iamVjdGAgc2hvdWxkIG5vdCBiZSBleHBvc2VkXG5cbmV4dGVuZChjaGF5bnMsIHtlbnY6IGVudmlyb25tZW50fSk7IC8vIFRPRE86IGdlbmVyYWxseSByZW5hbWVcbmV4dGVuZChjaGF5bnMsIHt1c2VyfSk7XG5cbmV4dGVuZChjaGF5bnMsIHtyZWdpc3Rlcn0pO1xuZXh0ZW5kKGNoYXlucywge3JlYWR5fSk7XG5cbmV4dGVuZChjaGF5bnMsIHthcGlDYWxsfSk7XG5cbi8vIGFkZCBhbGwgY2hheW5zQXBpSW50ZXJmYWNlIG1ldGhvZHMgZGlyZWN0bHkgdG8gdGhlIGBjaGF5bnNgIE9iamVjdFxuZXh0ZW5kKGNoYXlucywgY2hheW5zQXBpSW50ZXJmYWNlKTtcblxuLy8gc2V0dXAgY2hheW5zXG5zZXR1cCgpO1xuXG5cbi8vIGNoYXlucyBwdWJsaXNoIG5vIFVNRFxuLy93aW5kb3cuY2hheW5zID0gY2hheW5zO1xuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzRnVuY3Rpb24sIGlzVW5kZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvd30gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY2FsbGJhY2tzJyk7XG5cbmxldCBub29wID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG5sZXQgY2FsbGJhY2tzID0ge307XG4vKipcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgRnVuY3Rpb24gdG8gYmUgaW52b2tlZFxuICogQHBhcmFtIHtCb29sZWFufSBpc0NoYXluc0NhbGwgSWYgdHJ1ZSB0aGVuIHRoZSBjYWxsIHdpbGwgYmUgYXNzaWduZWQgdG8gYGNoYXlucy5fY2FsbGJhY2tzYFxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgcGFyYW1ldGVycyBhcmUgdmFsaWQgYW5kIHRoZSBjYWxsYmFjayB3YXMgc2F2ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldENhbGxiYWNrKG5hbWUsIGZuLCBpc0NoYXluc0NhbGwpIHtcblxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBsb2cud2Fybignc2V0Q2FsbGJhY2s6IG5hbWUgaXMgdW5kZWZpbmVkJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghaXNGdW5jdGlvbihmbikpIHtcbiAgICBsb2cud2Fybignc2V0Q2FsbGJhY2s6IGZuIGlzIG5vIEZ1bmN0aW9uJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKG5hbWUuaW5kZXhPZignKCknKSAhPT0gLTEpIHsgLy8gc3RyaXAgJygpJ1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoJygpJywgJycpO1xuICB9XG5cbiAgbG9nLmRlYnVnKCdzZXRDYWxsYmFjazogc2V0IENhbGxiYWNrOiAnICsgbmFtZSk7XG4gIC8vaWYgKG5hbWUgaW4gY2FsbGJhY2tzKSB7XG4gIC8vICBjYWxsYmFja3NbbmFtZV0ucHVzaChmbik7IC8vIFRPRE86IHJlY29uc2lkZXIgQXJyYXkgc3VwcG9ydFxuICAvL30gZWxzZSB7XG4gICAgY2FsbGJhY2tzW25hbWVdID0gZm47IC8vIEF0dGVudGlvbjogd2Ugc2F2ZSBhbiBBcnJheVxuICAvL31cblxuICBpZiAoaXNDaGF5bnNDYWxsKSB7XG4gICAgbG9nLmRlYnVnKCdzZXRDYWxsYmFjazogcmVnaXN0ZXIgZm4gYXMgZ2xvYmFsIGNhbGxiYWNrJyk7XG4gICAgd2luZG93Ll9jaGF5bnNDYWxsYmFja3NbbmFtZV0gPSBjYWxsYmFjayhuYW1lLCAnQ2hheW5zQ2FsbCcpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogUmVnaXN0ZXIgY2FsbGJhY2tzIGZvciBDaGF5bnNDYWxscyBhbmQgQ2hheW5zV2ViQ2FsbHNcbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGNhbGxiYWNrTmFtZSBOYW1lIG9mIHRoZSBGdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgRWl0aGVyICdDaGF5bnNXZWJDYWxsJyBvciAnQ2hheW5zQ2FsbCdcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gaGFuZGxlRGF0YSBSZWNlaXZlcyBjYWxsYmFjayBkYXRhXG4gKi9cbmZ1bmN0aW9uIGNhbGxiYWNrKGNhbGxiYWNrTmFtZSwgdHlwZSkge1xuXG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVEYXRhKCkge1xuXG4gICAgaWYgKGNhbGxiYWNrTmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgICAgIGxvZy5kZWJ1ZygnaW52b2tlIGNhbGxiYWNrOiAnLCBjYWxsYmFja05hbWUsICd0eXBlOicsIHR5cGUpO1xuICAgICAgdmFyIGZuID0gY2FsbGJhY2tzW2NhbGxiYWNrTmFtZV07XG4gICAgICBpZiAoaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgLy9kZWxldGUgY2FsbGJhY2tzW2NhbGxiYWNrTmFtZV07IC8vIFRPRE86IGNhbm5vdCBiZSBsaWtlIHRoYXQsIHJlbW92ZSBhcnJheT9cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy53YXJuKCdjYWxsYmFjayBpcyBubyBmdW5jdGlvbicsIGNhbGxiYWNrTmFtZSwgZm4pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnY2FsbGJhY2sgJyArIGNhbGxiYWNrTmFtZSArICcgZGlkIG5vdCBleGlzdCBpbiBjYWxsYmFja3MgYXJyYXknKTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLl9jYWxsYmFja3NcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBDaGF5bnMgQ2FsbCBDYWxsYmFja3NcbiAqIHdpbGwgYmUgYXNzaWduZWQgdG8gdGhlIGBjaGF5bnMuX2NhbGxiYWNrc2Agb2JqZWN0XG4gKlxuICogQHR5cGUge09iamVjdH0gY2hheW5zQ2FsbHNDYWxsYmFja3NcbiAqL1xud2luZG93Ll9jaGF5bnNDYWxsYmFja3MgPSB7XG4gIC8vLy8gVE9ETzogd3JhcCBjYWxsYmFjayBmdW5jdGlvbiAoRFJZKVxuICAvL2dldEdsb2JhbERhdGE6IGNhbGxiYWNrKCdnZXRHbG9iYWxEYXRhJywgJ0NoYXluc0NhbGwnKSAvLyBleGFtcGxlXG4gIGdldEdlb0xvY2F0aW9uQ2FsbGJhY2s6IG5vb3Bcbn07XG5cblxuLy8gVE9ETzogbW92ZSB0byBhbm90aGVyIGZpbGU/IGNvcmUsIGNoYXluc19jYWxsc1xudmFyIG1lc3NhZ2VMaXN0ZW5pbmcgPSBmYWxzZTtcbmV4cG9ydCBmdW5jdGlvbiBtZXNzYWdlTGlzdGVuZXIoKSB7XG4gIGlmIChtZXNzYWdlTGlzdGVuaW5nKSB7XG4gICAgbG9nLmluZm8oJ3RoZXJlIGlzIGFscmVhZHkgb25lIG1lc3NhZ2UgbGlzdGVuZXIgb24gd2luZG93Jyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIG1lc3NhZ2VMaXN0ZW5pbmcgPSB0cnVlO1xuICBsb2cuZGVidWcoJ21lc3NhZ2UgbGlzdGVuZXIgaXMgc3RhcnRlZCcpO1xuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gb25NZXNzYWdlKGUpIHtcblxuICAgIGxvZy5kZWJ1ZygnbmV3IG1lc3NhZ2UgJyk7XG5cbiAgICB2YXIgbmFtZXNwYWNlID0gJ2NoYXlucy5jdXN0b21UYWIuJyxcbiAgICAgIGRhdGEgPSBlLmRhdGE7XG5cbiAgICBpZiAodHlwZW9mIGRhdGEgIT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHN0cmlwIG5hbWVzcGFjZSBmcm9tIGRhdGFcbiAgICBkYXRhID0gZGF0YS5zdWJzdHIobmFtZXNwYWNlLmxlbmd0aCwgZGF0YS5sZW5ndGggLSBuYW1lc3BhY2UubGVuZ3RoKTtcbiAgICB2YXIgbWV0aG9kID0gZGF0YS5tYXRjaCgvW146XSo6Lyk7IC8vIGRldGVjdCBtZXRob2RcbiAgICBpZiAobWV0aG9kICYmIG1ldGhvZC5sZW5ndGggPiAwKSB7XG4gICAgICBtZXRob2QgPSBtZXRob2RbMF07XG5cbiAgICAgIHZhciBwYXJhbXMgPSBkYXRhLnN1YnN0cihtZXRob2QubGVuZ3RoLCBkYXRhLmxlbmd0aCAtIG1ldGhvZC5sZW5ndGgpO1xuICAgICAgaWYgKHBhcmFtcykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UocGFyYW1zKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIHRoZSBsYXN0ICcpJ1xuICAgICAgbWV0aG9kID0gbWV0aG9kLnN1YnN0cigwLCBtZXRob2QubGVuZ3RoIC0gMSk7XG5cbiAgICAgIC8vIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBjYW4gYmUgaW52b2tlZCBkaXJlY3RseVxuICAgICAgY2FsbGJhY2sobWV0aG9kLCAnQ2hheW5zV2ViQ2FsbCcpKHBhcmFtcyk7XG4gICAgfVxuICB9KTtcbn1cbiIsImltcG9ydCB7YXBpQ2FsbH0gZnJvbSAnLi9jaGF5bnNfY2FsbHMnO1xuaW1wb3J0IHtnZXRMb2dnZXIsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNCTEVBZGRyZXNzLFxuICBpc0RhdGUsIGlzT2JqZWN0LCBpc0FycmF5LCB0cmltLCBET019IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93LCBsb2NhdGlvbn0gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7IC8vIGR1ZSB0byB3aW5kb3cub3BlbiBhbmQgbG9jYXRpb24uaHJlZlxuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnNfYXBpX2ludGVyZmFjZScpO1xuXG4vKipcbiAqIE5GQyBSZXNwb25zZSBEYXRhIFN0b3JhZ2VcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmxldCBOZmNSZXNwb25zZURhdGEgPSB7XG4gIFJGSWQ6IDAsXG4gIFBlcnNvbklkOiAwXG59O1xuXG4vKipcbiAqIFBvcHVwIEJ1dHRvblxuICogQGNsYXNzIFBvcHVwQnV0dG9uXG4gKi9cbmNsYXNzIFBvcHVwQnV0dG9uIHtcbiAgLyoqXG4gICAqIFBvcHVwIEJ1dHRvbiBDb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBQb3B1cCBCdXR0b24gbmFtZVxuICAgKi9cbiAgY29uc3RydWN0b3IobmFtZSwgY2FsbGJhY2spIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBsZXQgZWwgPSBET00uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZWwuc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtcG9wdXAnKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NoYXluc19fcG9wdXAnKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbDtcbiAgfVxuICAvKipcbiAgICogR2V0IFBvcHVwIEJ1dHRvbiBuYW1lXG4gICAqIEByZXR1cm5zIHtuYW1lfVxuICAgKi9cbiAgbmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5uYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrXG4gICAqL1xuICBjYWxsYmFjaygpIHtcbiAgICBsZXQgY2IgPSB0aGlzLmNhbGxiYWNrO1xuICAgIGxldCBuYW1lID0gY2IubmFtZTtcbiAgICBpZiAoaXNGdW5jdGlvbihjYikpIHtcbiAgICAgIGNiLmNhbGwobnVsbCwgbmFtZSk7XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBAbmFtZSB0b0hUTUxcbiAgICogUmV0dXJucyBIVE1MIE5vZGUgY29udGFpbmluZyB0aGUgUG9wdXBCdXR0b24uXG4gICAqIEByZXR1cm5zIHtQb3B1cEJ1dHRvbi5lbGVtZW50fEhUTUxOb2RlfVxuICAgKi9cbiAgdG9IVE1MKCkge1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQ7XG4gIH1cbn1cblxuLyoqXG4gKiBCZWFjb24gTGlzdFxuICogQHR5cGUge0FycmF5fG51bGx9XG4gKi9cbmxldCBiZWFjb25MaXN0ID0gbnVsbDtcblxuLyoqXG4gKiBHbG9iYWwgRGF0YSBTdG9yYWdlXG4gKiBAdHlwZSB7Ym9vbGVhbnxPYmplY3R9XG4gKi9cbmxldCBnbG9iYWxEYXRhID0gZmFsc2U7XG5cbi8qKlxuICogQWxsIHB1YmxpYyBjaGF5bnMgbWV0aG9kcyB0byBpbnRlcmFjdCB3aXRoICpDaGF5bnMgQXBwKiBvciAqQ2hheW5zIFdlYipcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmV4cG9ydCB2YXIgY2hheW5zQXBpSW50ZXJmYWNlID0ge1xuXG5cbiAgLyoqXG4gICAqIEVuYWJsZSBvciBkaXNhYmxlIFB1bGxUb1JlZnJlc2hcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBhbGxvd1B1bGwgQWxsb3cgUHVsbFRvUmVmcmVzaFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNlZWRlZFxuICAgKi9cbiAgc2V0UHVsbFRvUmVmcmVzaDogZnVuY3Rpb24oYWxsb3dQdWxsKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAwLFxuICAgICAgd2ViRm46IGZhbHNlLCAvLyBjb3VsZCBiZSBvbWl0dGVkXG4gICAgICBwYXJhbXM6IFt7J2Jvb2wnOiBhbGxvd1B1bGx9XVxuICAgIH0pO1xuICB9LFxuICAvLyBUT0RPOiByZW5hbWUgdG8gZW5hYmxlUHVsbFRvUmVmcmVzaFxuICBhbGxvd1JlZnJlc2hTY3JvbGw6IGZ1bmN0aW9uKCkge1xuICAgIGNoYXluc0FwaUludGVyZmFjZS5zZXRQdWxsVG9SZWZyZXNoKHRydWUpO1xuICB9LFxuICBkaXNhbGxvd1JlZnJlc2hTY3JvbGw6IGZ1bmN0aW9uKCkge1xuICAgIGNoYXluc0FwaUludGVyZmFjZS5zZXRQdWxsVG9SZWZyZXNoKGZhbHNlKTtcbiAgfSxcblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBbc2hvd0N1cnNvcl0gSWYgdHJ1ZSB0aGUgd2FpdGN1cnNvciB3aWxsIGJlIHNob3duXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG90aGVyd2lzZSBpdCB3aWxsIGJlIGhpZGRlblxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNldFdhaXRjdXJzb3I6IGZ1bmN0aW9uKHNob3dDdXJzb3IpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEsXG4gICAgICB3ZWJGbjogKHNob3dDdXJzb3IgPyAnc2hvdycgOiAnaGlkZScpICsgJ0xvYWRpbmdDdXJzb3InLFxuICAgICAgcGFyYW1zOiBbeydib29sJzogc2hvd0N1cnNvcn1dXG4gICAgfSk7XG4gIH0sXG4gIHNob3dXYWl0Y3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLnNldFdhaXRjdXJzb3IodHJ1ZSk7XG4gIH0sXG4gIGhpZGVXYWl0Y3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLnNldFdhaXRjdXJzb3IoZmFsc2UpO1xuICB9LFxuXG4gIC8vIFRPRE86IHJlbmFtZSBpdCB0byBvcGVuVGFwcD9cbiAgLyoqXG4gICAqIFNlbGVjdCBkaWZmZXJlbnQgVGFwcCBpZGVudGlmaWVkIGJ5IFRhcHBJRCBvciBJbnRlcm5hbFRhcHBOYW1lXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0YWIgVGFwcCBOYW1lIG9yIFRhcHAgSURcbiAgICogQHBhcmFtIHtTdHJpbmd9IChvcHRpb25hbCkgcGFyYW0gVVJMIFBhcmFtZXRlclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNlbGVjdFRhYjogZnVuY3Rpb24odGFiLCBwYXJhbSkge1xuXG4gICAgbGV0IGNtZCA9IDEzOyAvLyBzZWxlY3RUYWIgd2l0aCBwYXJhbSBDaGF5bnNDYWxsXG5cbiAgICAvLyB1cGRhdGUgcGFyYW06IHN0cmlwID8gYW5kIGVuc3VyZSAmIGF0IHRoZSBiZWdpblxuICAgIGlmIChwYXJhbSAmJiAhcGFyYW0ubWF0Y2goL15bJnxcXD9dLykpIHsgLy8gbm8gJiBhbmQgbm8gP1xuICAgICAgcGFyYW0gPSAnJicgKyBwYXJhbTtcbiAgICB9IGVsc2UgaWYgKHBhcmFtKSB7XG4gICAgICBwYXJhbSA9IHBhcmFtLnJlcGxhY2UoJz8nLCAnJicpO1xuICAgIH0gZWxzZSB7IC8vIG5vIHBhcmFtcywgZGlmZmVyZW50IENoYXluc0NhbGxcbiAgICAgIGNtZCA9IDI7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiBjbWQsXG4gICAgICB3ZWJGbjogJ3NlbGVjdG90aGVydGFiJyxcbiAgICAgIHBhcmFtczogY21kID09PSAxM1xuICAgICAgICA/IFt7J3N0cmluZyc6IHRhYn0sIHsnc3RyaW5nJzogcGFyYW19XVxuICAgICAgICA6IFt7J3N0cmluZyc6IHRhYn1dLFxuICAgICAgd2ViUGFyYW1zOiB7XG4gICAgICAgIFRhYjogdGFiLFxuICAgICAgICBQYXJhbWV0ZXI6IHBhcmFtXG4gICAgICB9LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDAyLCBpb3M6IDEzODMsIHdwOiAyNDY5IH0gLy8gZm9yIG5hdGl2ZSBhcHBzIG9ubHlcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2VsZWN0IEFsYnVtXG4gICAqIFRPRE86IHJlbmFtZSB0byBvcGVuXG4gICAqXG4gICAqIEBwYXJhbSB7aWR8c3RyaW5nfSBpZCBBbGJ1bSBJRCAoQWxidW0gTmFtZSB3aWxsIHdvcmsgYXMgd2VsbCwgYnV0IGRvIHByZWZlciBJRHMpXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2VsZWN0QWxidW06IGZ1bmN0aW9uKGlkKSB7XG4gICAgaWYgKCFpc1N0cmluZyhpZCkgJiYgIWlzTnVtYmVyKGlkKSkge1xuICAgICAgbG9nLmVycm9yKCdzZWxlY3RBbGJ1bTogaW52YWxpZCBhbGJ1bSBuYW1lJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMyxcbiAgICAgIHdlYkZuOiAnc2VsZWN0QWxidW0nLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBpZH1dLFxuICAgICAgd2ViUGFyYW1zOiBpZFxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFBpY3R1cmVcbiAgICogKG9sZCBTaG93UGljdHVyZSlcbiAgICogQW5kcm9pZCBkb2VzIG5vdCBzdXBwb3J0IGdpZnMgOihcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBJbWFnZSBVUkwgc2hvdWxkIGNvdGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9wZW5QaWN0dXJlOiBmdW5jdGlvbih1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkgfHwgIXVybC5tYXRjaCgvanBnJHxwbmckfGdpZiQvaSkpIHsgLy8gVE9ETzogbW9yZSBpbWFnZSB0eXBlcz9cbiAgICAgIGxvZy5lcnJvcignb3BlblBpY3R1cmU6IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNCxcbiAgICAgIHdlYkZuOiAnc2hvd1BpY3R1cmUnLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHdlYlBhcmFtczogdXJsLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNTAxLCBpb3M6IDI2MzYsIHdwOiAyNTQzIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGEgQ2FwdGlvbiBCdXR0b24uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqIFRoZSBjYXB0aW9uIGJ1dHRvbiBpcyB0aGUgdGV4dCBhdCB0aGUgdG9wIHJpZ2h0IG9mIHRoZSBhcHAuXG4gICAqIChtYWlubHkgdXNlZCBmb3IgbG9naW4gb3IgdGhlIHVzZXJuYW1lKVxuICAgKiBUT0RPOiBpbXBsZW1lbnQgaW50byBDaGF5bnMgV2ViP1xuICAgKiBUT0RPOiByZW5hbWUgdG8gc2V0P1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dCBUaGUgQnV0dG9uJ3MgdGV4dFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB3aGVuIHRoZSBjYXB0aW9uIGJ1dHRvbiB3YXMgY2xpY2tlZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGNyZWF0ZUNhcHRpb25CdXR0b246IGZ1bmN0aW9uKHRleHQsIGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAvL2xvZy5lcnJvcignVGhlcmUgaXMgbm8gdmFsaWQgY2FsbGJhY2sgRnVuY3Rpb24uJyk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzIG5vIHZhbGlkIGNhbGxiYWNrIEZ1bmN0aW9uLicpO1xuICAgICAgLy9yZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnY2FwdGlvbkJ1dHRvbkNhbGxiYWNrKCknO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA1LFxuICAgICAgcGFyYW1zOiBbe3N0cmluZzogdGV4dH0sIHtjYWxsYmFjazogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTgsIGlvczogMTM2Niwgd3A6IDI0NjkgfSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIGEgQ2FwdGlvbiBCdXR0b24uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqIFRoZSBjYXB0aW9uIGJ1dHRvbiBpcyB0aGUgdGV4dCBhdCB0aGUgdG9wIHJpZ2h0IG9mIHRoZSBhcHAuXG4gICAqIChtYWlubHkgdXNlZCBmb3IgbG9naW4gb3IgdGhlIHVzZXJuYW1lKVxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhpZGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDYsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTgsIGlvczogMTM2Niwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBGYWNlYm9vayBDb25uZWN0XG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJ10gRmFjZWJvb2sgUGVybWlzc2lvbnMsIHNlcGFyYXRlZCBieSBjb21tYVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3JlbG9hZFBhcmFtID0gJ2NvbW1lbnQnXSBSZWxvYWQgUGFyYW1cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAvLyBUT0RPOiB0ZXN0IHBlcm1pc3Npb25zXG4gIGZhY2Vib29rQ29ubmVjdDogZnVuY3Rpb24ocGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJywgcmVsb2FkUGFyYW0gPSAnY29tbWVudCcpIHtcbiAgICByZWxvYWRQYXJhbSA9IHJlbG9hZFBhcmFtO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNyxcbiAgICAgIHdlYkZuOiAnZmFjZWJvb2tDb25uZWN0JyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogcGVybWlzc2lvbnN9LCB7J0Z1bmN0aW9uJzogJ0V4ZWNDb21tYW5kPVwiJyArIHJlbG9hZFBhcmFtICsgJ1wiJ31dLFxuICAgICAgd2ViUGFyYW1zOiB7XG4gICAgICAgIFJlbG9hZFBhcmFtZXRlcjogJ0V4ZWNDb21tYW5kPScgKyByZWxvYWRQYXJhbSxcbiAgICAgICAgUGVybWlzc2lvbnM6IHBlcm1pc3Npb25zXG4gICAgICB9LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU5LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBmYWxsYmFja0NtZDogOCAvLyBpbiBjYXNlIHRoZSBhYm92ZSBpcyBub3Qgc3VwcG9ydCB0aGUgZmFsbGJhY2tDbWQgd2lsbCByZXBsYWNlIHRoZSBjbWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBMaW5rIGluIEJyb3dzZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBVUkxcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuTGlua0luQnJvd3NlcjogZnVuY3Rpb24odXJsKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA5LFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodXJsLmluZGV4T2YoJzovLycpID09PSAtMSkge1xuICAgICAgICAgIHVybCA9ICcvLycgKyB1cmw7IC8vIG9yIGFkZCBsb2NhdGlvbi5wcm90b2NvbCBwcmVmaXggYW5kIC8vIFRPRE86IHRlc3RcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cub3Blbih1cmwsICdfYmxhbmsnKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNDY2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNob3cgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgYmFjayBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzaG93QmFja0J1dHRvbjogZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgICBjaGF5bnNBcGlJbnRlcmZhY2UuaGlkZUJhY2tCdXR0b24oKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmFja0J1dHRvbkNhbGxiYWNrKCknO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhpZGUgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBoaWRlQmFja0J1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogT3BlbiBJbnRlckNvbS5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBvcGVuSW50ZXJDb206IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTIsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDIsIGlvczogMTM4Mywgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgR2VvbG9jYXRpb24uXG4gICAqIG5hdGl2ZSBhcHBzIG9ubHkgKGJ1dCBjb3VsZCB3b3JrIGluIHdlYiBhcyB3ZWxsLCBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pXG4gICAqXG4gICAqIFRPRE86IGNvbnRpbnVvdXNUcmFja2luZyB3YXMgcmVtb3ZlZFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB3aGVuIHRoZSBiYWNrIGJ1dHRvbiB3YXMgY2xpY2tlZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGdldEdlb0xvY2F0aW9uOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdnZXRHZW9Mb2NhdGlvbkNhbGxiYWNrKCknO1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy8gVE9ETzogcmVtb3ZlIGNvbnNvbGVcbiAgICAgIC8vIFRPRE86IGFsbG93IGVtcHR5IGNhbGxiYWNrcyB3aGVuIGl0IGlzIGFscmVhZHkgc2V0XG4gICAgICBjb25zb2xlLndhcm4oJ25vIGNhbGxiYWNrIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNDY2LCB3cDogMjQ2OSB9LFxuICAgICAgLy93ZWJGbjogZnVuY3Rpb24oKSB7IG5hdmlnYXRvci5nZW9sb2NhdGlvbjsgfVxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gVmlkZW9cbiAgICogKG9sZCBTaG93VmlkZW8pXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVmlkZW8gVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuVmlkZW86IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSB8fCAhdXJsLm1hdGNoKC8uKlxcLi57Mix9LykpIHsgLy8gVE9ETzogV1RGIFJlZ2V4XG4gICAgICBsb2cuZXJyb3IoJ29wZW5WaWRlbzogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNSxcbiAgICAgIHdlYkZuOiAnc2hvd1ZpZGVvJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybFxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaG93IERpYWxvZ1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0ge2NvbnRlbnQ6e1N0cmluZ30gLCBoZWFkbGluZTogLGJ1dHRvbnM6e0FycmF5fSwgbm9Db250ZW50blBhZGRpbmc6LCBvbkxvYWQ6fVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHNob3dEaWFsb2c6IGZ1bmN0aW9uIHNob3dEaWFsb2cob2JqKSB7XG4gICAgaWYgKCFvYmogfHwgIWlzT2JqZWN0KG9iaikpIHtcbiAgICAgIGxvZy53YXJuKCdzaG93RGlhbG9nOiBpbnZhbGlkIHBhcmFtZXRlcnMnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKG9iai5jb250ZW50KSkge1xuICAgICAgb2JqLmNvbnRlbnQgPSB0cmltKG9iai5jb250ZW50LnJlcGxhY2UoLzxiclsgL10qPz4vZywgJ1xcbicpKTtcbiAgICB9XG4gICAgaWYgKCFpc0FycmF5KG9iai5idXR0b25zKSB8fCBvYmouYnV0dG9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9iai5idXR0b25zID0gWyhuZXcgUG9wdXBCdXR0b24oJ09LJykpLnRvSFRNTCgpXTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ0NoYXluc0RpYWxvZ0NhbGxCYWNrKCknO1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm4oYnV0dG9ucywgaWQpIHtcbiAgICAgIGlkID0gcGFyc2VJbnQoaWQsIDEwKSAtIDE7XG4gICAgICBpZiAoYnV0dG9uc1tpZF0pIHtcbiAgICAgICAgYnV0dG9uc1tpZF0uY2FsbGJhY2suY2FsbChudWxsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE2LCAvLyBUT0RPOiBpcyBzbGl0dGU6Ly9cbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouaGVhZGxpbmV9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5jb250ZW50fSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouYnV0dG9uc1swXS5uYW1lfSAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICAgIC8veydzdHJpbmcnOiBvYmouYnV0dG9uc1sxXS5uYW1lfSwgLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgICAvL3snc3RyaW5nJzogb2JqLmJ1dHRvbnNbMl0ubmFtZX0gLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgXSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgb2JqLmJ1dHRvbnMpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2MDZ9LFxuICAgICAgZmFsbGJhY2tGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYWxsYmFjayBwb3B1cCcsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogRm9ybWVybHkga25vd24gYXMgZ2V0QXBwSW5mb3NcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aXRoIHRoZSBBcHBEYXRhXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gICAgLy8gVE9ETzogdXNlIGZvcmNlUmVsb2FkIGFuZCBjYWNoZSBBcHBEYXRhXG4gIGdldEdsb2JhbERhdGE6IGZ1bmN0aW9uKGNhbGxiYWNrLCBmb3JjZVJlbG9hZCkge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRHbG9iYWxEYXRhOiBjYWxsYmFjayBpcyBubyB2YWxpZCBgRnVuY3Rpb25gLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWZvcmNlUmVsb2FkICYmIGdsb2JhbERhdGEpIHtcbiAgICAgIGNhbGxiYWNrKGdsb2JhbERhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE4LFxuICAgICAgd2ViRm46ICdnZXRBcHBJbmZvcycsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogJ2dldEdsb2JhbERhdGEoKSd9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWJyYXRlXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gZHVyYXRpb24gVGltZSBpbiBtaWxsaXNlY29uZHNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgdmlicmF0ZTogZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICBpZiAoIWlzTnVtYmVyKGR1cmF0aW9uKSB8fCBkdXJhdGlvbiA8IDIpIHtcbiAgICAgIGR1cmF0aW9uID0gMTUwO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE5LFxuICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogZHVyYXRpb24udG9TdHJpbmcoKX1dLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uIG5hdmlnYXRvclZpYnJhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmF2aWdhdG9yLnZpYnJhdGUoMTAwKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5pbmZvKCd2aWJyYXRlOiB0aGUgZGV2aWNlIGRvZXMgbm90IHN1cHBvcnQgdmlicmF0ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2OTUsIGlvczogMjU5Niwgd3A6IDI1MTV9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIEJhY2suXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgbmF2aWdhdGVCYWNrOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDIwLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjY5NiwgaW9zOiAyNjAwLCB3cDogMjUxNX1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW1hZ2UgVXBsb2FkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2l0aCBpbWFnZSB1cmwgYWZ0ZXIgdXBsb2FkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHVwbG9hZEltYWdlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCd1cGxvYWRJbWFnZTogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdpbWFnZVVwbG9hZENhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjEsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjcwNSwgd3A6IDI1MzgsIGlvczogMjY0Mn1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IE5GQyBDYWxsYmFja1xuICAgKiBUT0RPOiByZWZhY3RvciBhbmQgdGVzdFxuICAgKiBUT0RPOiB3aHkgdHdvIGNhbGxzP1xuICAgKiBDYW4gd2UgaW1wcm92ZSB0aGlzIHNoaXQ/IHNwbGl0IGludG8gdHdvIG1ldGhvZHNcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gZm9yIE5GQ1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICBzZXROZmNDYWxsYmFjazogZnVuY3Rpb24oY2FsbGJhY2ssIHJlc3BvbnNlKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDM3LFxuICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgIH0pICYmIGFwaUNhbGwoe1xuICAgICAgICAgIGNtZDogMzcsXG4gICAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciBjbWQgPSAocmVzcG9uc2UgPT09IG5mY1Jlc3BvbnNlRGF0YS5QZXJzb25JZCkgPyAzNyA6IDM4O1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiBjbWQgPT09IDM3ID8gMzggOiAzNyxcbiAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICB9KSAmJiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdOZmNDYWxsYmFjayd9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMzIzNCwgd3A6IDMxMjEgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWRlbyBQbGF5ZXIgQ29udHJvbHNcbiAgICogQWN1dGFsbHkgbmF0aXZlIG9ubHlcbiAgICogVE9ETzogY291bGQgdGhlb3JldGljYWxseSB3b3JrIGluIENoYXlucyBXZWJcbiAgICogVE9ETzogZXhhbXBsZT8gd2hlcmUgZG9lcyB0aGlzIHdvcms/XG4gICAqL1xuICBwbGF5ZXI6IHtcbiAgICB1c2VEZWZhdWx0VXJsOiBmdW5jdGlvbiB1c2VEZWZhdWx0VXJsKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIyLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBjaGFuZ2VVcmw6IGZ1bmN0aW9uIGNoYW5nZVVybCh1cmwpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMixcbiAgICAgICAgcGFyYW1zOiBbeydTdHJpbmcnOiB1cmx9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGhpZGVCdXR0b246IGZ1bmN0aW9uIGhpZGVCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHNob3dCdXR0b246IGZ1bmN0aW9uIHNob3dCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBhdXNlOiBmdW5jdGlvbiBwYXVzZVZpZGVvKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI0LFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwbGF5OiBmdW5jdGlvbiBwbGF5VmlkZW8oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjQsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBsYXliYWNrU3RhdHVzOiBmdW5jdGlvbiBwbGF5YmFja1N0YXR1cyhjYWxsYmFjaykge1xuXG4gICAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChudWxsLCB7XG4gICAgICAgICAgQXBwQ29udHJvbFZpc2libGU6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uSXNBcHBDb250cm9sVmlzaWJsZSxcbiAgICAgICAgICBTdGF0dXM6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uUGxheWJhY2tTdGF0dXMsXG4gICAgICAgICAgVXJsOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLlN0cmVhbVVybFxuICAgICAgICB9KTtcbiAgICAgIH0sIHRydWUpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQmx1ZXRvb3RoXG4gICAqIE9ubHkgaW4gbmF0aXZlIEFwcHMgKGlvcyBhbmQgYW5kcm9pZClcbiAgICovXG4gIGJsdWV0b290aDoge1xuICAgIExFU2VuZFN0cmVuZ3RoOiB7IC8vIFRPRE86IHdoYXQgaXMgdGhhdD9cbiAgICAgIEFkamFjZW50OiAwLFxuICAgICAgTmVhcmJ5OiAxLFxuICAgICAgRGVmYXVsdDogMixcbiAgICAgIEZhcjogM1xuICAgIH0sXG4gICAgTEVTY2FuOiBmdW5jdGlvbiBMRVNjYW4oY2FsbGJhY2spIHtcbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFU2Nhbjogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJztcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNixcbiAgICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIExFQ29ubmVjdDogZnVuY3Rpb24gTEVDb25uZWN0KGFkZHJlc3MsIGNhbGxiYWNrLCBwYXNzd29yZCkge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRUNvbm5lY3Q6IG5vIHZhbGlkIGFkZHJlc3MgcGFyYW1ldGVyJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFQ29ubmVjdDogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc1N0cmluZyhwYXNzd29yZCkgfHwgIXBhc3N3b3JkLm1hdGNoKC9eWzAtOWEtZl17NiwxMn0kL2kpKSB7XG4gICAgICAgIHBhc3N3b3JkID0gJyc7XG4gICAgICB9XG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snO1xuXG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjcsXG4gICAgICAgIHBhcmFtczogW3snc3RyaW5nJzogYWRkcmVzc30sIHsnc3RyaW5nJzogcGFzc3dvcmR9XSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogVE9ETzogY29uc2lkZXIgT2JqZWN0IGFzIHBhcmFtZXRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZGRyZXNzXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzdWJJZFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbWVhc3VyZVBvd2VyXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzZW5kU3RyZW5ndGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIExFV3JpdGU6IGZ1bmN0aW9uIExFV3JpdGUoYWRkcmVzcywgc3ViSWQsIG1lYXN1cmVQb3dlciwgc2VuZFN0cmVuZ3RoLCBjYWxsYmFjaykge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRVdyaXRlOiBubyB2YWxpZCBhZGRyZXNzIHBhcmFtZXRlcicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHN1YklkKSB8fCBzdWJJZCA8IDAgfHwgc3ViSWQgPiA0MDk1KSB7XG4gICAgICAgIHN1YklkID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihtZWFzdXJlUG93ZXIpIHx8IG1lYXN1cmVQb3dlciA8IC0xMDAgfHwgbWVhc3VyZVBvd2VyID4gMCkge1xuICAgICAgICBtZWFzdXJlUG93ZXIgPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHNlbmRTdHJlbmd0aCkgfHwgc2VuZFN0cmVuZ3RoIDwgMCB8fCBzZW5kU3RyZW5ndGggPiAzKSB7XG4gICAgICAgIHNlbmRTdHJlbmd0aCA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snLFxuICAgICAgICB1aWQgPSAnN0EwN0UxN0EtQTE4OC00MTZFLUI3QTAtNUEzNjA2NTEzRTU3JztcblxuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI4LFxuICAgICAgICBwYXJhbXM6IFtcbiAgICAgICAgICB7J3N0cmluZyc6IGFkZHJlc3N9LFxuICAgICAgICAgIHsnc3RyaW5nJzogdWlkfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzdWJJZH0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogbWVhc3VyZVBvd2VyfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzZW5kU3RyZW5ndGh9XG4gICAgICAgIF0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVE9ETzsgdXNlIGBPYmplY3RgIGFzIHBhcmFtc1xuICAvLyBUT0RPOiB3aGF0IGFyZSBvcHRpb25hbCBwYXJhbXM/IHZhbGlkYXRlIG5hbWUgYW5kIGxvY2F0aW9uP1xuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQXBwb2ludG1lbnQncyBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsb2NhdGlvbiBBcHBvaW50bWVudCdzIGxvY2F0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbZGVzY3JpcHRpb25dIEFwcG9pbnRtZW50J3MgZGVzY3JpcHRpb25cbiAgICogQHBhcmFtIHtEYXRlfSBzdGFydCBBcHBvaW50bWVudHMncyBTdGFydERhdGVcbiAgICogQHBhcmFtIHtEYXRlfSBlbmQgQXBwb2ludG1lbnRzJ3MgRW5kRGF0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNhdmVBcHBvaW50bWVudDogZnVuY3Rpb24gc2F2ZUFwcG9pbnRtZW50KG5hbWUsIGxvY2F0aW9uLCBkZXNjcmlwdGlvbiwgc3RhcnQsIGVuZCkge1xuICAgIGlmICghaXNTdHJpbmcobmFtZSkgfHwgIWlzU3RyaW5nKGxvY2F0aW9uKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogbm8gdmFsaWQgbmFtZSBhbmQvb3IgbG9jYXRpb24nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0RhdGUoc3RhcnQpIHx8ICFpc0RhdGUoZW5kKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogc3RhcnQgYW5kL29yIGVuZERhdGUgaXMgbm8gdmFsaWQgRGF0ZSBgT2JqZWN0YC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgc3RhcnQgPSBwYXJzZUludChzdGFydC5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG4gICAgZW5kID0gcGFyc2VJbnQoZW5kLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjksXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydzdHJpbmcnOiBuYW1lfSxcbiAgICAgICAgeydzdHJpbmcnOiBsb2NhdGlvbn0sXG4gICAgICAgIHsnc3RyaW5nJzogZGVzY3JpcHRpb259LFxuICAgICAgICB7J0ludGVnZXInOiBzdGFydH0sXG4gICAgICAgIHsnSW50ZWdlcic6IGVuZH1cbiAgICAgIF0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzA1NCwgaW9zOiAzMDY3LCB3cDogMzAzMH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRGF0ZVR5cGVzIEVudW1cbiAgICogc3RhcnRzIGF0IDFcbiAgICovXG4gIGRhdGVUeXBlOiB7XG4gICAgZGF0ZTogMSxcbiAgICB0aW1lOiAyLFxuICAgIGRhdGVUaW1lOiAzXG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBEYXRlXG4gICAqIE9sZDogRGF0ZVNlbGVjdFxuICAgKiBOYXRpdmUgQXBwcyBvbmx5LiBUT0RPOiBhbHNvIGluIENoYXlucyBXZWI/IEhUTUw1IERhdGVwaWNrZXIgZXRjXG4gICAqIFRPRE87IHJlY29uc2lkZXIgb3JkZXIgZXRjXG4gICAqIEBwYXJhbSB7ZGF0ZVR5cGV8TnVtYmVyfSBkYXRlVHlwZSBFbnVtIDEtMjogdGltZSwgZGF0ZSwgZGF0ZXRpbWUuIHVzZSBjaGF5bnMuZGF0ZVR5cGVcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gcHJlU2VsZWN0IFByZXNldCB0aGUgRGF0ZSAoZS5nLiBjdXJyZW50IERhdGUpXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdGhlIGNob3NlbiBEYXRlIGFzIFRpbWVzdGFtcFxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBtaW5EYXRlIE1pbmltdW0gU3RhcnREYXRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IG1heERhdGUgTWF4aW11bSBFbmREYXRlXG4gICAqL1xuICBzZWxlY3REYXRlOiBmdW5jdGlvbiBzZWxlY3REYXRlKGRhdGVUeXBlLCBwcmVTZWxlY3QsIGNhbGxiYWNrLCBtaW5EYXRlLCBtYXhEYXRlKSB7XG5cbiAgICBpZiAoIWlzTnVtYmVyKGRhdGVUeXBlKSB8fCBkYXRlVHlwZSA8PSAwKSB7XG4gICAgICBsb2cud2Fybignc2VsZWN0RGF0ZTogd3JvbmcgZGF0ZVR5cGUnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3NlbGVjdERhdGU6IGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlVmFsdWUodmFsdWUpIHtcbiAgICAgIGlmICghaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbHVlLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHByZVNlbGVjdCA9IHZhbGlkYXRlVmFsdWUocHJlU2VsZWN0KTtcbiAgICBtaW5EYXRlID0gdmFsaWRhdGVWYWx1ZShtaW5EYXRlKTtcbiAgICBtYXhEYXRlID0gdmFsaWRhdGVWYWx1ZShtYXhEYXRlKTtcblxuICAgIGxldCBkYXRlUmFuZ2UgPSAnJztcbiAgICBpZiAobWluRGF0ZSA+IC0xICYmIG1heERhdGUgPiAtMSkge1xuICAgICAgZGF0ZVJhbmdlID0gJywnICsgbWluRGF0ZSArICcsJyArIG1heERhdGU7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdzZWxlY3REYXRlQ2FsbGJhY2snO1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm4oY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QsIHRpbWUpIHtcbiAgICAgIC8vIFRPRE86IGltcG9ydGFudCB2YWxpZGF0ZSBEYXRlXG4gICAgICAvLyBUT0RPOiBjaG9vc2UgcmlnaHQgZGF0ZSBieSBkYXRlVHlwZUVudW1cbiAgICAgIGxvZy5kZWJ1ZyhkYXRlVHlwZSwgcHJlU2VsZWN0KTtcbiAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgdGltZSA/IG5ldyBEYXRlKHRpbWUpIDogLTEpO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzAsXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX0sXG4gICAgICAgIHsnSW50ZWdlcic6IGRhdGVUeXBlfSxcbiAgICAgICAgeydJbnRlZ2VyJzogcHJlU2VsZWN0ICsgZGF0ZVJhbmdlfVxuICAgICAgXSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMwNzIsIGlvczogMzA2Miwgd3A6IDMwMzB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gVVJMIGluIEFwcFxuICAgKiAob2xkIFNob3dVUkxJbkFwcClcbiAgICogbm90IHRvIGNvbmZ1c2Ugd2l0aCBvcGVuTGlua0luQnJvd3NlclxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFZpZGVvIFVSTCBzaG91bGQgY29udGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gICAgLy8gVE9ETzogaW1wbGVtZW50IENoYXlucyBXZWIgTWV0aG9kIGFzIHdlbGwgKG5hdmlnYXRlIGJhY2sgc3VwcG9ydClcbiAgb3BlblVybDogZnVuY3Rpb24gb3BlblVybCh1cmwsIHRpdGxlKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cuZXJyb3IoJ29wZW5Vcmw6IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jYXRpb24uaHJlZiA9IHVybDsgLy8gVE9ETzogbWFrZSBzdXJlIGl0IHdvcmtzXG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9LCB7J3N0cmluZyc6IHRpdGxlfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzExMCwgaW9zOiAzMDc0LCB3cDogMzA2M31cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogY3JlYXRlIFFSIENvZGVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhIFFSIENvZGUgZGF0YVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgYmFzZTY0IGVuY29kZWQgSU1HIFRPRE86IHdoaWNoIHR5cGU/XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgY3JlYXRlUVJDb2RlOiBmdW5jdGlvbiBjcmVhdGVRUkNvZGUoZGF0YSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWlzU3RyaW5nKGRhdGEpKSB7XG4gICAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ2NyZWF0ZVFSQ29kZTogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NyZWF0ZVFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzMsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGRhdGF9LCB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWVcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogc2NhbiBRUiBDb2RlXG4gICAqIFNjYW5zIFFSIENvZGUgYW5kIHJlYWQgaXRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNjYW5RUkNvZGU6IGZ1bmN0aW9uIHNjYW5RUkNvZGUoY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdzY2FuUVJDb2RlOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnc2NhblFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHNjYW4gUVIgQ29kZVxuICAgKiBTY2FucyBRUiBDb2RlIGFuZCByZWFkIGl0XG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSByZXN1bHRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBnZXRMb2NhdGlvbkJlYWNvbnM6IGZ1bmN0aW9uIGdldExvY2F0aW9uQmVhY29ucyhjYWxsYmFjaywgZm9yY2VSZWxvYWQpIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRMb2NhdGlvbkJlYWNvbnM6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdnZXRCZWFjb25zQ2FsbEJhY2soKSc7XG4gICAgaWYgKGJlYWNvbkxpc3QgJiYgIWZvcmNlUmVsb2FkKSB7IC8vIFRPRE86IG1ha2Ugc3VyZSBpdCBpcyBnb29kIHRvIGNhY2hlIHRoZSBsaXN0XG4gICAgICBsb2cuZGVidWcoJ2dldExvY2F0aW9uQmVhY29uczogdGhlcmUgaXMgYWxyZWFkeSBvbmUgYmVhY29uTGlzdCcpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwobnVsbCwgYmVhY29uTGlzdCk7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja0ZuID0gZnVuY3Rpb24gZ2V0TG9jYXRpb25CZWFjb25DYWxsYmFjayhjYWxsYmFjaywgbGlzdCkge1xuICAgICAgYmVhY29uTGlzdCA9IGxpc3Q7XG4gICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGxpc3QpO1xuICAgIH07XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzOSxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgNDA0NSwgaW9zOiA0MDQ4fSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2spXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCB0byBQYXNzYm9va1xuICAgKiBpT1Mgb25seVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFBhdGggdG8gUGFzc2Jvb2sgZmlsZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGFkZFRvUGFzc2Jvb2s6IGZ1bmN0aW9uIGFkZFRvUGFzc2Jvb2sodXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cud2FybignYWRkVG9QYXNzYm9vazogdXJsIGlzIGludmFsaWQuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA0NyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7aW9zOiA0MDQ1fSxcbiAgICAgIHdlYkZuOiBjaGF5bnNBcGlJbnRlcmZhY2Uub3BlbkxpbmtJbkJyb3dzZXIuYmluZChudWxsLCB1cmwpLFxuICAgICAgZmFsbGJhY2tGbjogY2hheW5zQXBpSW50ZXJmYWNlLm9wZW5MaW5rSW5Ccm93c2VyLmJpbmQobnVsbCwgdXJsKVxuICAgIH0pO1xuICB9XG5cbn07XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNQZXJtaXR0ZWQsIGlzRnVuY3Rpb24sIGlzQmxhbmssIGlzQXJyYXksIGlzT2JqZWN0LCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93LCBwYXJlbnR9IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInO1xuaW1wb3J0IHtlbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge3NldENhbGxiYWNrfSBmcm9tICcuL2NhbGxiYWNrcyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY29yZS5jaGF5bnNfY2FsbHMnKTtcblxuXG5mdW5jdGlvbiBjYW4odmVyc2lvbnMpIHtcbiAgcmV0dXJuIGlzUGVybWl0dGVkKHZlcnNpb25zLCBlbnZpcm9ubWVudC5vcywgZW52aXJvbm1lbnQuYXBwVmVyc2lvbik7XG59XG5cbi8vIE9TIEFwcCBWZXJzaW9uIE1hcCBmb3IgQ2hheW5zIENhbGxzIFN1cHBvcnRcbi8vIFRPRE86IG1vdmUgaW50byBlbnZpcm9ubWVudD8gKG9yIGp1c3QgcmVtb3ZlIGNhdXNlIGl0IGlzIG9ubHkgdXNlZCBvbmUgdGltZSBpbiBoZXJlKVxubGV0IG9zTWFwID0ge1xuICBjaGF5bnNDYWxsOiB7IGFuZHJvaWQ6IDI1MTAsIGlvczogMjQ4Mywgd3A6IDI0NjksIGJiOiAxMTggfVxufTtcblxuLyoqXG4gKiBQdWJsaWMgQ2hheW5zIEludGVyZmFjZVxuICogRXhlY3V0ZSBBUEkgQ2FsbFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqIEBwYXJhbSBkZWJvdW5jZVxuICogLy8gVE9ETzogbGVmdCBvZiBjYWxsYmFjayBhcyBwcm9taXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcGlDYWxsKG9iaikge1xuXG4gIGxldCBkZWJvdW5jZSA9IG9iai5kZWJvdW5jZSB8fCBmYWxzZTtcblxuICAvLyBUT0RPOiBjaGVjayBvYmoub3MgVkVSU0lPTlxuXG4gIGZ1bmN0aW9uIGV4ZWN1dGVDYWxsKGNoYXluc0NhbGxPYmopIHtcblxuICAgIGlmIChlbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsICYmIGNhbihvc01hcC5jaGF5bnNDYWxsKSkge1xuICAgICAgLy8gVE9ETzogY29uc2lkZXIgY2FsbFF1ZXVlIGFuZCBJbnRlcnZhbCB0byBwcmV2ZW50IGVycm9yc1xuICAgICAgbG9nLmRlYnVnKCdleGVjdXRlQ2FsbDogY2hheW5zIGNhbGwgJywgY2hheW5zQ2FsbE9iai5jbWQpO1xuXG4gICAgICBpZiAoJ2NiJyBpbiBjaGF5bnNDYWxsT2JqICYmIGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5jYikpIHtcbiAgICAgICAgc2V0Q2FsbGJhY2soY2hheW5zQ2FsbE9iai5jYWxsYmFja05hbWUgfHwgY2hheW5zQ2FsbE9iai5wYXJhbXNbMF0uY2FsbGJhY2ssIGNoYXluc0NhbGxPYmouY2IsIHRydWUpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGNoYXluc0NhbGxPYmouc3VwcG9ydCkgJiYgIWNhbihjaGF5bnNDYWxsT2JqLnN1cHBvcnQpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogdGhlIGNoYXlucyB2ZXJzaW9uIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgaWYgKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrIGNoYXlucyBjYWxsIHdpbGwgYmUgaW52b2tlZCcpO1xuICAgICAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbikpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrRm4gd2lsbCBiZSBpbnZva2VkJyk7XG4gICAgICAgICAgcmV0dXJuIGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbi5jYWxsKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouY21kLCBjaGF5bnNDYWxsT2JqLnBhcmFtcyk7XG5cbiAgICB9IGVsc2UgaWYgKGVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwpIHtcblxuICAgICAgaWYgKCdjYicgaW4gY2hheW5zQ2FsbE9iaiAmJiBpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouY2IpKSB7XG4gICAgICAgIHNldENhbGxiYWNrKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmouY2IpO1xuICAgICAgfVxuICAgICAgaWYgKCFjaGF5bnNDYWxsT2JqLndlYkZuKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogVGhpcyBDYWxsIGhhcyBubyB3ZWJGbicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZUNhbGw6IGNoYXlucyB3ZWIgY2FsbCAnLCBjaGF5bnNDYWxsT2JqLndlYkZuLm5hbWUgfHwgY2hheW5zQ2FsbE9iai53ZWJGbik7XG5cbiAgICAgIHJldHVybiBjaGF5bnNXZWJDYWxsKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmoud2ViUGFyYW1zIHx8IGNoYXluc0NhbGxPYmoucGFyYW1zKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IG5laXRoZXIgY2hheW5zIHdlYiBjYWxsIG5vciBjaGF5bnMgd2ViJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRlYm91bmNlKSB7XG4gICAgc2V0VGltZW91dChleGVjdXRlQ2FsbC5iaW5kKG51bGwsIG9iaiksIDEwMCk7IC8vIFRPRE86IGVycm9yP1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleGVjdXRlQ2FsbChvYmopO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGQgQ2hheW5zIENhbGwgKG9ubHkgZm9yIG5hdGl2ZSBBcHBzKVxuICogQHByaXZhdGVcblxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgY2hheW5zIGNhbGwgc3VjY2VlZGVkLCBmYWxzZSBvbiBlcnJvciAobm8gdXJsIGV0YylcbiAqL1xuZnVuY3Rpb24gY2hheW5zQ2FsbChjbWQsIHBhcmFtcykge1xuXG4gIGlmIChpc0JsYW5rKGNtZCkpIHsgLy8gMCBpcyBhIHZhbGlkIGNhbGwsIHVuZGVmaW5lZCBhbmQgbnVsbCBhcmUgbm90XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IG1pc3NpbmcgY21kIGZvciBjaGF5bnNDYWxsJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxldCB1cmwgPSBudWxsO1xuXG4gIC8vIGlmIHRoZXJlIGlzIG5vIHBhcmFtIG9yICdub25lJyB3aGljaCBtZWFucyBubyBjYWxsYmFja1xuICBpZiAoIXBhcmFtcykge1xuXG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArICcpJztcblxuICB9IGVsc2Uge1xuXG4gICAgLy8gcGFyYW1zIGV4aXN0IGhvd2V2ZXIsIGl0IGlzIG5vIGFycmF5XG4gICAgaWYgKCFpc0FycmF5KHBhcmFtcykpIHtcbiAgICAgIGxvZy5lcnJvcignY2hheW5zQ2FsbDogcGFyYW1zIGFyZSBubyBBcnJheScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcGFyYW1zIHRvIHRoZSBjaGF5bnMgY2FsbFxuICAgIGxldCBjYWxsYmFja1ByZWZpeCA9ICdfY2hheW5zQ2FsbGJhY2tzLic7XG4gICAgbGV0IGNhbGxTdHJpbmcgPSAnJztcbiAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBjYWxsQXJncyA9IFtdO1xuICAgICAgcGFyYW1zLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgbGV0IG5hbWUgPSBPYmplY3Qua2V5cyhwYXJhbSlbMF07XG4gICAgICAgIGxldCB2YWx1ZSA9IHBhcmFtW25hbWVdO1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2NhbGxiYWNrJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1xcJycgKyBjYWxsYmFja1ByZWZpeCArIHZhbHVlICsgJ1xcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdib29sJyB8fCBuYW1lID09PSAnRnVuY3Rpb24nIHx8IG5hbWUgPT09ICdJbnRlZ2VyJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2godmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKCdcXCcnICsgdmFsdWUgKyAnXFwnJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY2FsbFN0cmluZyA9ICcsJyArIGNhbGxBcmdzLmpvaW4oJywnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgY2hheW5zIHByb3RvY29sIGFuZCBob3N0IGFuZCBqb2luIGFycmF5XG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArIGNhbGxTdHJpbmcgKyAnKSc7XG4gIH1cblxuICBsb2cuZGVidWcoJ2NoYXluc0NhbGw6IHVybDogJywgdXJsKTtcblxuICB0cnkge1xuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBlYXNpZXIgaWRlbnRpZmljYXRpb24gb2YgdGhlIHJpZ2h0IGVudmlyb25tZW50XG4gICAgLy8gVE9ETzogY29uc2lkZXIgdG8gZXhlY3V0ZSB0aGUgYnJvd3NlciBmYWxsYmFjayBpbiBoZXJlIGFzIHdlbGxcbiAgICBpZiAoJ2NoYXluc0NhbGwnIGluIHdpbmRvdyAmJiBpc0Z1bmN0aW9uKHdpbmRvdy5jaGF5bnNDYWxsLmhyZWYpKSB7XG4gICAgICB3aW5kb3cuY2hheW5zQ2FsbC5ocmVmKHVybCk7XG4gICAgfSBlbHNlIGlmICgnd2Via2l0JyBpbiB3aW5kb3dcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKSB7XG4gICAgICB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKHVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy53YXJuKCdjaGF5bnNDYWxsOiBFcnJvcjogY291bGQgbm90IGV4ZWN1dGUgQ2hheW5zQ2FsbDogJywgZSk7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeGVjdXRlIGEgQ2hheW5zV2ViIENhbGwgaW4gdGhlIHBhcmVudCB3aW5kb3cuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZuIEZ1bmN0aW9uIG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbXMgQWRkaXRpb25hbFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY2hheW5zV2ViYkNhbGwgc3VjY2VlZGVkXG4gKi9cbmZ1bmN0aW9uIGNoYXluc1dlYkNhbGwoZm4sIHBhcmFtcykge1xuICBpZiAoIWZuKSB7XG4gICAgbG9nLmluZm8oJ2NoYXluc1dlYkNhbGw6IG5vIENoYXluc1dlYkNhbGwgZm4nKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAoIXBhcmFtcyB8fCBpc0FycmF5KHBhcmFtcykpIHsgLy8gQXJyYXkgaW5kaWNhdGVzIHRoYXQgdGhlc2UgYXJlIGNoYXluc0NhbGxzIHBhcmFtcyBUT0RPOiByZWZhY3RvclxuICAgIHBhcmFtcyA9ICcnO1xuICB9XG4gIGlmIChpc09iamVjdChwYXJhbXMpKSB7IC8vIGFuIEFycmF5IGlzIGFsc28gc2VlbiBhcyBPYmplY3QsIGhvd2V2ZXIgaXQgd2lsbCBiZSByZXNldCBiZWZvcmVcbiAgICBwYXJhbXMgPSBKU09OLnN0cmluZ2lmeShwYXJhbXMpO1xuICB9XG5cbiAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgcmV0dXJuIGZuLmNhbGwobnVsbCk7XG4gIH1cblxuICB2YXIgbmFtZXNwYWNlID0gJ2NoYXlucy5jdXN0b21UYWIuJztcbiAgdmFyIHVybCA9IG5hbWVzcGFjZSArIGZuICsgJzonICsgcGFyYW1zO1xuXG4gIGxvZy5kZWJ1ZygnY2hheW5zV2FiQ2FsbDogJyArIHVybCk7XG5cbiAgdHJ5IHtcbiAgICBwYXJlbnQucG9zdE1lc3NhZ2UodXJsLCAnKicpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLndhcm4oJ2NoYXluc1dlYkNhbGw6IHBvc3RNZXNzZ2FlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBjb25maWdcbiAqIEBwcml2YXRlXG4gKi9cblxuaW1wb3J0IHtpc1ByZXNlbnQsIGlzQmxhbmssIGlzVW5kZWZpbmVkLCBpc0FycmF5LCBleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBTdG9yZSBpbnRlcm5hbCBjaGF5bnMgY29uZmlndXJhdGlvblxuICogQHR5cGUge3thcHBOYW1lOiBzdHJpbmcsIGFwcFZlcnNpb246IG51bWJlciwgbG9hZE1vZGVybml6ZXI6IGJvb2xlYW4sIGxvYWRQb2x5ZmlsbHM6IGJvb2xlYW4sIHVzZUZldGNoOiBib29sZWFuLCBwcm9taXNlczogc3RyaW5nLCB1c2VPZmZsaW5lQ2FjaGluZzogYm9vbGVhbiwgdXNlTG9jYWxTdG9yYWdlOiBib29sZWFuLCBoYXNBZG1pbjogYm9vbGVhbiwgbXVsdGlMaW5ndWFsOiBib29sZWFuLCBpc1B1Ymxpc2hlZDogYm9vbGVhbiwgZGVidWdNb2RlOiBib29sZWFuLCB1c2VBamF4OiBib29sZWFufX1cbiAqIEBwcml2YXRlXG4gKi9cbnZhciBfY29uZmlnID0ge1xuICBhcHBOYW1lOiAnQ2hheW5zIEFwcCcsICAgLy8gYXBwIE5hbWVcbiAgYXBwVmVyc2lvbjogMSwgICAgICAgICAgIC8vIGFwcCBWZXJzaW9uXG4gIHByZXZlbnRFcnJvcnM6IHRydWUsICAgICAgICAvLyBlcnJvciBoYW5kbGVyIGNhbiBoaWRlIGVycm9ycyAoY2FuIGJlIG92ZXJ3dGl0dGVuIGJ5IGlzUHJvZHVjdGlvbilcbiAgaXNQcm9kdWN0aW9uOiB0cnVlLCAgICAgIC8vIHByb2R1Y3Rpb24sIGRldmVsb3BtZW50IGFuZCB0ZXN0IEVOVlxuICBsb2FkTW9kZXJuaXplcjogdHJ1ZSwgICAgLy8gbG9hZCBtb2Rlcm5pemVyXG4gIGxvYWRQb2x5ZmlsbHM6IHRydWUsICAgICAvLyBsb2FkIHBvbHlmaWxsc1xuICB1c2VGZXRjaDogdHJ1ZSwgICAgICAgICAgLy8gdXNlIHdpbmRvdy5mZXRjaCBhbmQgaXQncyBwb2x5ZmlsbHNcbiAgcHJvbWlzZXM6ICdxJywgICAgICAgICAgIC8vIHByb21pc2UgU2VydmljZTogUSBpcyBzdGFuZGFyZFxuICB1c2VPZmZsaW5lQ2FjaGluZzogZmFsc2UsLy8gaXMgb2ZmbGluZSBjYWNoaW5nIHVzZWQ/IGlubGN1ZGUgb2ZmbGluZSBoZWxwZXJcbiAgdXNlTG9jYWxTdG9yYWdlOiBmYWxzZSwgIC8vIGlzIGxvY2FsU3RvcmFnZSB1c2VkPyBpbmNsdWRlIGhlbHBlclxuICBoYXNBZG1pbjogZmFsc2UsICAgICAgICAgLy8gZG9lcyB0aGlzIGFwcC9wYWdlIGhhdmUgYW4gYWRtaW4/XG4gIG11bHRpTGluZ3VhbDogdHJ1ZSwgICAgICAvLyBlbmFibGUgaTE4bj9cbiAgaXNQdWJsaXNoZWQ6IHRydWUsICAgICAgIC8vIG9ubHkgaW4gaW50ZXJuYWwgdG9iaXQgYXZhaWxhYmxlXG4gIGRlYnVnTW9kZTogdHJ1ZSwgICAgICAgICAvLyBzaG93IGNvbnNvbGUgb3V0cHV0LCBkZWJ1ZyBwYXJhbSBmb3IgbG9nZ2luZ1xuICB1c2VBamF4OiBmYWxzZSxcbiAgaXNJbnRlcm5hbDogZmFsc2UgICAgICAgIC8vIHVzZSBpbnRlcm5hbCByb3V0aW5nXG4gIC8vZnJhbWV3b3JrOiBbJ0VtYmVyJywgJ0FuZ3VsYXInLCAnQmFja2JvbmUnLCAnQW1wZXJzYW5kJywgJ1JlYWN0JywgJ2pRdWVyeSddXG59O1xuXG4vLyBUT0RPOiByZW1vdmVcbi8qZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZygpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gQ29uZmlnLnNldChhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7IC8vIFRPRE86IHJlZmFjdG9yIHRoaXNcbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIENvbmZpZy5nZXQoYXJndW1lbnRzKTtcbiAgfVxuICByZXR1cm4gQ29uZmlnLmdldCgpO1xufSovXG5cbi8vIFRPRE86IHJlZmFjdG9yIHRvIE1hcFxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XG5cbiAgLyoqXG4gICAqIEBtZXRob2QgZ2V0XG4gICAqIEBjbGFzcyBDb25maWdcbiAgICogQG1vZHVsZSBjaGF5bnMuY29uZmlnXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgUmVmZXJlbmNlIHRoZSBga2V5YCBpbiB0aGUgY29uZmlnIGBPYmplY3RgXG4gICAqIEByZXR1cm5zIHtudWxsfSBWYWx1ZSBvZiB0aGUgYGtleWAgaW4gdGhlIGNvbmZpZyBgT2JqZWN0YFxuICAgKiAgICAgICAgICAgICAgICAgYHVuZGVmaW5lZGAgaWYgdGhlIGBrZXlgIHdhcyBub3QgZm91bmRcbiAgICovXG4gIHN0YXRpYyBnZXQoa2V5KSB7XG4gICAgaWYgKGlzUHJlc2VudChrZXkpKSB7XG4gICAgICByZXR1cm4gX2NvbmZpZ1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHBhcmFtIHZhbHVlXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIHNldChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGlzQmxhbmsoa2V5KSB8fCBpc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gVE9ETzogZ29vZCBpZGVhPyBvbmUgc2hvdWxkIGJlIGNhcmVmdWwgaSBzdXBwb3NlXG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBleHRlbmQoX2NvbmZpZywgdmFsdWUpO1xuICAgIH1cbiAgICBfY29uZmlnW2tleV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gISFrZXkgJiYgKGtleSBpbiBfY29uZmlnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzT2JqZWN0LCBET019IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge21lc3NhZ2VMaXN0ZW5lcn0gZnJvbSAnLi9jYWxsYmFja3MnO1xuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9IGZyb20gJy4vY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuXG4vLyBjcmVhdGUgbmV3IExvZ2dlciBpbnN0YW5jZVxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNvcmUnKTtcblxuLy8gZGlzYWJsZSBKUyBFcnJvcnMgaW4gdGhlIGNvbnNvbGVcbkNvbmZpZy5zZXQoJ3ByZXZlbnRFcnJvcnMnLCBmYWxzZSk7XG5cbi8qKlxuICpcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKlxuICogQHR5cGUge2Jvb2xlYW59IFRydWUgaWYgdGhlIERPTSBpcyBsb2FkZWRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciBkb21SZWFkeSA9IGZhbHNlO1xuXG4vKipcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKlxuICogQHR5cGUge2FycmF5fSBDb250YWlucyBjYWxsYmFja3MgZm9yIHRoZSBET00gcmVhZHkgZXZlbnRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciByZWFkeUNhbGxiYWNrcyA9IFtdO1xuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5wcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIodXNlckNvbmZpZykge1xuICBsb2cuaW5mbygnY2hheW5zLnJlZ2lzdGVyJyk7XG4gIENvbmZpZy5zZXQodXNlckNvbmZpZyk7IC8vIHRoaXMgcmVmZXJlbmNlIHRvIHRoZSBjaGF5bnMgb2JqXG4gIHJldHVybiB0aGlzO1xufVxuXG4vLyBUT0RPOiByZWdpc3RlciBgRnVuY3Rpb25gIG9yIHByZUNoYXlucyBgT2JqZWN0YD9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDaGF5bnMoKSB7XG4gIGlmICgncHJlQ2hheW5zJyBpbiB3aW5kb3cgJiYgaXNPYmplY3Qod2luZG93LnByZUNoYXlucykpIHtcbiAgICAvLyBmaWxsIGNvbmZpZ1xuICB9XG59XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLnByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkeShjYikge1xuICBsb2cuaW5mbygnY2hheW5zLnJlYWR5Jyk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChkb21SZWFkeSkge1xuICAgIC8vIFRPRE86IHJldHVybiBhIGN1c3RvbSBNb2RlbCBPYmplY3QgaW5zdGVhZCBvZiBgY29uZmlnYFxuICAgIGNiKHtcbiAgICAgIGFwcE5hbWU6Q29uZmlnLmdldCgnYXBwTmFtZScpLFxuICAgICAgYXBwVmVyc2lvbjogQ29uZmlnLmdldCgnYXBwVmVyc2lvbicpXG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHJlYWR5Q2FsbGJhY2tzLnB1c2goYXJndW1lbnRzWzBdKTtcbn1cblxuLyoqXG4gKiBAbmFtZSBwcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0gb2JqIFJlZmVyZW5jZSB0byBjaGF5bnMgT2JqZWN0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwKCkge1xuICBsb2cuaW5mbygnc3RhcnQgY2hheW5zIHNldHVwJyk7XG5cbiAgLy8gZW5hYmxlIGBjaGF5bnMuY3NzYCBieSBhZGRpbmcgYGNoYXluc2AgY2xhc3NcbiAgLy8gcmVtb3ZlIGBuby1qc2AgY2xhc3MgYW5kIGFkZCBganNgIGNsYXNzXG4gIGxldCBib2R5ID0gZG9jdW1lbnQuYm9keTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdjaGF5bnMnKTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdqcycpO1xuICBET00ucmVtb3ZlQ2xhc3MoYm9keSwgJ25vLWpzJyk7XG5cblxuICAvLyBydW4gcG9seWZpbGwgKGlmIHJlcXVpcmVkKVxuXG4gIC8vIHJ1biBtb2Rlcm5pemVyIChmZWF0dXJlIGRldGVjdGlvbilcblxuICAvLyBydW4gZmFzdGNsaWNrXG5cbiAgLy8gKHZpZXdwb3J0IHNldHVwKVxuXG4gIC8vIGNyYXRlIG1ldGEgdGFncyAoY29sb3JzLCBtb2JpbGUgaWNvbnMgZXRjKVxuXG4gIC8vIGRvIHNvbWUgU0VPIHN0dWZmIChjYW5vbmljYWwgZXRjKVxuXG4gIC8vIGRldGVjdCB1c2VyIChsb2dnZWQgaW4/KVxuXG4gIC8vIHJ1biBjaGF5bnMgc2V0dXAgKGNvbG9ycyBiYXNlZCBvbiBlbnZpcm9ubWVudClcblxuXG5cbiAgLy8gc2V0IERPTSByZWFkeSBldmVudFxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuXG4gICAgZG9tUmVhZHkgPSB0cnVlO1xuICAgIGxvZy5kZWJ1ZygnRE9NIHJlYWR5Jyk7XG5cbiAgICAvLyBhZGQgY2hheW5zIHJvb3QgZWxlbWVudFxuICAgIGxldCBjaGF5bnNSb290ID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtcm9vdCcpO1xuICAgIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3Jvb3QnKTtcbiAgICBET00uYXBwZW5kQ2hpbGQoYm9keSwgY2hheW5zUm9vdCk7XG5cbiAgICAvLyBkb20tcmVhZHkgY2xhc3NcbiAgICBET00uYWRkQ2xhc3MoZG9jdW1lbnQuYm9keSwgJ2RvbS1yZWFkeScpO1xuXG4gICAgLy8gZ2V0IHRoZSBBcHAgSW5mb3JtYXRpb24sIGhhcyB0byBiZSBkb25lIHdoZW4gZG9jdW1lbnQgcmVhZHlcbiAgICBsZXQgZ2V0QXBwSW5mb3JtYXRpb25DYWxsID0gIWNoYXluc0FwaUludGVyZmFjZS5nZXRHbG9iYWxEYXRhKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgLy8gbm93IENoYXlucyBpcyBvZmZpY2lhbGx5IHJlYWR5XG5cbiAgICAgIGxvZy5kZWJ1ZygnYXBwSW5mb3JtYXRpb24gY2FsbGJhY2snLCBkYXRhKTtcblxuICAgICAgcmVhZHlDYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgZGF0YSk7XG4gICAgICB9KTtcbiAgICAgIHJlYWR5Q2FsbGJhY2tzID0gW107XG5cbiAgICAgIERPTS5hZGRDbGFzcyhkb2N1bWVudC5ib2R5LCAnY2hheW5zLXJlYWR5Jyk7XG4gICAgICBET00ucmVtb3ZlQXR0cmlidXRlKERPTS5xdWVyeSgnW2NoYXlucy1jbG9ha10nKSwgJ2NoYXlucy1jbG9haycpO1xuXG4gICAgICBsb2cuaW5mbygnZmluaXNoZWQgY2hheW5zIHNldHVwJyk7XG4gICAgfSk7XG5cbiAgICBpZiAoZ2V0QXBwSW5mb3JtYXRpb25DYWxsKSB7XG4gICAgICBsb2cuZXJyb3IoJ1RoZSBBcHAgSW5mb3JtYXRpb24gY291bGQgbm90IGJlIHJldHJpZXZlZC4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHN0YXJ0IHdpbmRvdy5vbignbWVzc2FnZScpIGxpc3RlbmVyIGZvciBGcmFtZSBDb21tdW5pY2F0aW9uXG4gIG1lc3NhZ2VMaXN0ZW5lcigpO1xuXG5cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVjdCBgQnJvd3NlcmAsIGBPU2AgYW5kICdEZXZpY2VgXG4gKiBhcyB3ZWxsIGFzIGBDaGF5bnMgRW52aXJvbm1lbnRgLCBgQ2hheW5zIFVzZXJgIGFuZCBgQ2hheW5zIFNpdGVgXG4gKiBhbmQgYXNzaWduIHRoZSBkYXRhIGludG8gdGhlIGVudmlyb25tZW50IG9iamVjdFxuICovXG5mdW5jdGlvbiBzZXRFbnZpcm9ubWVudCgpIHtcblxufVxuIiwiLyoqXG4gKiBAbW9kdWxlIGNoYXlucy5lbnZpcm9ubWVudFxuICogQGRlc2NyaXB0aW9uXG4gKiBDaGF5bnMgRW52aXJvbm1lbnRcbiAqL1xuXG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnLi4vdXRpbHMnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVudmlyb25tZW50Jyk7XG5cbi8vIFRPRE86IGltcG9ydCBkZXBlbmRlbmNpZXNcbmV4cG9ydCB2YXIgdHlwZXMgPSB7fTtcblxudHlwZXMuYnJvd3NlciA9IFtcbiAgJ2Nocm9tZScsXG4gICdmaXJlZm94JyxcbiAgJ3NhZmFyaScsXG4gICdvcGVyYScsXG4gICdjaHJvbWUgbW9iaWxlJyxcbiAgJ3NhZmFyaSBtb2JpbGUnLFxuICAnZmlyZWZveCBtb2JpbGUnXG5dO1xuXG50eXBlcy5vcyA9IFtcbiAgJ3dpbmRvd3MnLFxuICAnbWFjT1MnLFxuICAnYW5kcm9pZCcsXG4gICdpb3MnLFxuICAnd3AnXG5dO1xuXG50eXBlcy5jaGF5bnNPUyA9IHtcbiAgd2ViOiAnd2Vic2hhZG93JyxcbiAgd2ViTW9iaWxlOiAnd2Vic2hhZG93bW9iaWxlJyxcbiAgYXBwOiAnd2Vic2hhZG93bW9iaWxlJ1xufTtcblxuLy8gVE9ETzogaGlkZSBpbnRlcm5hbCBwYXJhbWV0ZXJzIGZyb20gdGhlIG90aGVyc1xuLy8gVE9ETzogb2ZmZXIgdXNlciBhbiBgT2JqZWN0YCB3aXRoIFVSTCBQYXJhbWV0ZXJzXG4vLyBsb2NhdGlvbiBxdWVyeSBzdHJpbmdcbnZhciBxdWVyeSA9IGxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSk7XG52YXIgcGFyYW1ldGVycyA9IHt9O1xucXVlcnkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKHBhcnQpIHtcbiAgdmFyIGl0ZW0gPSBwYXJ0LnNwbGl0KCc9Jyk7XG4gIHBhcmFtZXRlcnNbaXRlbVswXS50b0xvd2VyQ2FzZSgpXSA9IGRlY29kZVVSSUNvbXBvbmVudChpdGVtWzFdKS50b0xvd2VyQ2FzZSgpO1xufSk7XG5cbi8vIHZlcmlmeSBieSBjaGF5bnMgcmVxdWlyZWQgcGFyYW1ldGVycyBleGlzdFxuaWYgKCFwYXJhbWV0ZXJzLmFwcHZlcnNpb24pIHtcbiAgbG9nLndhcm4oJ25vIGFwcCB2ZXJzaW9uIHBhcmFtZXRlcicpO1xufVxuaWYgKCFwYXJhbWV0ZXJzLm9zKSB7XG4gIGxvZy53YXJuKCdubyBvcyBwYXJhbWV0ZXInKTtcbn1cbmlmIChwYXJhbWV0ZXJzLmRlYnVnKSB7XG4gIC8vIFRPRE86IGVuYWJsZSBkZWJ1ZyBtb2RlXG59XG5cbi8vIFRPRE86IGZ1cnRoZXIgcGFyYW1zIGFuZCBjb2xvcnNjaGVtZVxuLy8gVE9ETzogZGlzY3VzcyByb2xlIG9mIFVSTCBwYXJhbXMgYW5kIHRyeSB0byByZXBsYWNlIHRoZW0gYW5kIG9ubHkgdXNlIEFwcERhdGFcblxuXG5mdW5jdGlvbiBnZXRGaXJzdE1hdGNoKHJlZ2V4KSB7XG4gIHZhciBtYXRjaCA9IHVhLm1hdGNoKHJlZ2V4KTtcbiAgcmV0dXJuIChtYXRjaCAmJiBtYXRjaC5sZW5ndGggPiAxICYmIG1hdGNoWzFdKSB8fCAnJztcbn1cblxuLy8gdXNlciBhZ2VudCBkZXRlY3Rpb25cbnZhciB1c2VyQWdlbnQgPSAod2luZG93Lm5hdmlnYXRvciAmJiBuYXZpZ2F0b3IudXNlckFnZW50KSB8fCAnJztcblxudmFyIGlzID0ge1xuICBpb3M6IC9pUGhvbmV8aVBhZHxpUG9kL2kudGVzdCh1c2VyQWdlbnQpLFxuICBhbmRyb2lkOiAvQW5kcm9pZC9pLnRlc3QodXNlckFnZW50KSxcbiAgd3A6IC93aW5kb3dzIHBob25lL2kudGVzdCh1c2VyQWdlbnQpLFxuICBiYjogL0JsYWNrQmVycnl8QkIxMHxSSU0vaS50ZXN0KHVzZXJBZ2VudCksXG5cbiAgb3BlcmE6ICghIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMCksXG4gIGZpcmVmb3g6ICh0eXBlb2YgSW5zdGFsbFRyaWdnZXIgIT09ICd1bmRlZmluZWQnKSxcbiAgc2FmYXJpOiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5IVE1MRWxlbWVudCkuaW5kZXhPZignQ29uc3RydWN0b3InKSA+IDApLFxuICBjaHJvbWU6ICghIXdpbmRvdy5jaHJvbWUgJiYgISghIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMCkpLFxuICBpZTogZmFsc2UgfHwgISFkb2N1bWVudC5kb2N1bWVudE1vZGUsXG4gIGllMTE6IC9tc2llIDExL2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTEwOiAvbXNpZSAxMC9pLnRlc3QodXNlckFnZW50KSxcbiAgaWU5OiAvbXNpZSA5L2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTg6IC9tc2llIDgvaS50ZXN0KHVzZXJBZ2VudCksXG5cbiAgbW9iaWxlOiAvKGlwaG9uZXxpcG9kfCgoPzphbmRyb2lkKT8uKj9tb2JpbGUpfGJsYWNrYmVycnl8bm9raWEpL2kudGVzdCh1c2VyQWdlbnQpLFxuICB0YWJsZXQ6IC8oaXBhZHxhbmRyb2lkKD8hLiptb2JpbGUpfHRhYmxldCkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGtpbmRsZTogL1xcVyhraW5kbGV8c2lsaylcXFcvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHR2OiAvZ29vZ2xldHZ8c29ueWR0di9pLnRlc3QodXNlckFnZW50KVxufTtcblxuLy8gVE9ETzogQnJvd3NlciBWZXJzaW9uIGFuZCBPUyBWZXJzaW9uIGRldGVjdGlvblxuXG4vLyBUT0RPOiBhZGQgZmFsbGJhY2tcbnZhciBvcmllbnRhdGlvbiA9IE1hdGguYWJzKHdpbmRvdy5vcmllbnRhdGlvbiAlIDE4MCkgPT09IDAgPyAncG9ydHJhaXQnIDogJ2xhbmRzY2FwZSc7XG52YXIgdmlld3BvcnQgPSB3aW5kb3cuaW5uZXJXaWR0aCArICd4JyArIHdpbmRvdy5pbm5lckhlaWdodDtcblxuZXhwb3J0IHZhciBlbnZpcm9ubWVudCA9IHtcblxuICAvL29zOiBwYXJhbWV0ZXJzLm9zLFxuICBvc1ZlcnNpb246IDEsXG5cbiAgYnJvd3NlcjogJycsXG4gIGJyb3dzZXJWZXJzaW9uOiAxLFxuXG4gIC8vYXBwVmVyc2lvbjogcGFyYW1ldGVycy5hcHB2ZXJzaW9uLFxuXG4gIC8vb3JpZW50YXRpb246IG9yaWVudGF0aW9uLFxuXG4gIC8vdmlld3BvcnQ6IHZpZXdwb3J0LCAvLyBpbiAxeDEgaW4gcHhcblxuICAvL3JhdGlvOiAxLCAvLyBwaXhlbCByYXRpb1xuXG4gIC8vaXNJbkZyYW1lOiBmYWxzZSxcblxuICAvL2lzQ2hheW5zV2ViOiBudWxsLCAvLyBkZXNrdG9wIGJyb3dzZXIsIG5vIEFwcCwgbm8gbW9iaWxlXG4gIC8vaXNDaGF5bnNXZWJNb2JpbGU6IG51bGwsIC8vIG1vYmlsZSBicm93c2VyLCBubyBBcHAsIG5vIGRlc2t0b3BcbiAgLy9pc0FwcDogZmFsc2UsIC8vIG90aGVyd2lzZSBCcm93c2VyXG4gIC8vaXNNb2JpbGU6IG51bGwsIC8vIG5vIGRlc2t0b3AsIGJ1dCBtb2JpbGUgYnJvd3NlciBhbmQgYXBwXG4gIC8vaXNUYWJsZXQ6IG51bGwsIC8vIG5vIGRlc2t0b3AsIGtpbmRhIG1vYmlsZSwgbW9zdCBsaWtlbHkgbm8gYXBwXG4gIC8vaXNEZXNrdG9wOiBudWxsLCAvLyBubyBhcHAsIG5vIG1vYmlsZVxuICAvL2lzQnJvd3NlcjogbnVsbCwgLy8gb3RoZXJ3aXNlIEFwcFxuXG4gIC8vaXNJT1M6IGlzLmlvcyxcbiAgLy9pc0FuZHJvaWQ6IGlzLmFuZHJvaWQsXG4gIC8vaXNXUDogaXMud3AsXG4gIC8vaXNCQjogaXMuYmIsXG5cbiAgLy9wYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzLFxuICAvL2hhc2g6IGxvY2F0aW9uLmhhc2guc3Vic3RyKDEpLFxuXG4gIHNpdGU6IHtcbiAgICBzaXRlSWQ6IDEsXG4gICAgbmFtZTogJ1RvYml0JyxcbiAgICBsb2NhdGlvbklkOiAxLFxuICAgIHVybDogJ2h0dHBzOi8vdG9iaXQuY29tLycsXG4gICAgdXNlU1NMOiB0cnVlLFxuICAgIGNvbG9yc2NoZW1lOiAxXG4gICAgLy9lZGl0TW9kZTogZmFsc2UsIC8vIGZ1dHVyZSBlZGl0IG1vZGUgZm9yIGNvbnRlbnRcbiAgICAvL2lzQWRtaW5Nb2RlOiB0cnVlXG4gIH0sXG5cbiAgLy8gVE9ETzogY29uc2lkZXIgVGFwcFxuICBhcHA6IHtcbiAgICBhcHBJZDogMSxcbiAgICBjb25maWc6IHt9LFxuICAgIC8vZGVmYXVsdENvbnRpZjoge30sXG4gICAgZG9tUmVhZHk6IGZhbHNlLFxuICAgIGxvZ3M6IHtcbiAgICAgIGxvZzogW10sXG4gICAgICBkZWJ1ZzogW10sXG4gICAgICB3YXJuOiBbXVxuICAgIH0sXG4gICAgZXJyb3JzOiBbXVxuICB9XG59O1xuXG5lbnZpcm9ubWVudC5wYXJhbWV0ZXJzID0gcGFyYW1ldGVycztcbmVudmlyb25tZW50Lmhhc2ggPSBsb2NhdGlvbi5oYXNoLnN1YnN0cigxKTtcblxuLy8gV0FUQ0ggT1VUIHRoZSBPUyBpcyBzZXQgYnkgcGFyYW1ldGVyICh1bmZvcnR1bmF0ZWx5KVxuZW52aXJvbm1lbnQub3MgPSBwYXJhbWV0ZXJzLm9zIHx8ICdub09TJzsgLy8gVE9ETzogcmVmYWN0b3IgT1NcbmlmIChpcy5tb2JpbGUgJiYgWydhbmRyb2lkJywgJ2lvcycsICd3cCddLmluZGV4T2YocGFyYW1ldGVycy5vcykgIT09IC0xKSB7XG4gIHBhcmFtZXRlcnMub3MgPSB0eXBlcy5jaGF5bnNPUy5hcHA7XG59XG5cbi8vIGRldGVjdGlvbiBieSB1c2VyIGFnZW50XG5lbnZpcm9ubWVudC5pc0lPUyA9IGlzLmlvcztcbmVudmlyb25tZW50LmlzQW5kcm9pZCA9IGlzLmFuZHJvaWQ7XG5lbnZpcm9ubWVudC5pc1dQID0gaXMud3A7XG5lbnZpcm9ubWVudC5pc0JCID0gaXMuYmI7XG5cbi8vIFRPRE86IG1ha2Ugc3VyZSB0aGF0IHRoaXMgYWx3YXlzIHdvcmtzISAoVFNQTiwgY3JlYXRlIGlmcmFtZSB0ZXN0IHBhZ2UpXG5lbnZpcm9ubWVudC5pc0luRnJhbWUgPSAod2luZG93ICE9PSB3aW5kb3cudG9wKTtcblxuZW52aXJvbm1lbnQuaXNBcHAgPSAocGFyYW1ldGVycy5vcyA9PT0gdHlwZXMuY2hheW5zT1MuYXBwICYmIGlzLm1vYmlsZSAmJiAhZW52aXJvbm1lbnQuaXNJbkZyYW1lKTsgLy8gVE9ETzogZG9lcyB0aGlzIGFsd2F5cyB3b3JrP1xuZW52aXJvbm1lbnQuYXBwVmVyc2lvbiA9IHBhcmFtZXRlcnMuYXBwdmVyc2lvbjtcblxuZW52aXJvbm1lbnQuaXNCcm93c2VyID0gIWVudmlyb25tZW50LmlzQXBwO1xuXG5lbnZpcm9ubWVudC5pc0Rlc2t0b3AgPSAoIWlzLm1vYmlsZSAmJiAhaXMudGFibGV0KTtcblxuZW52aXJvbm1lbnQuaXNNb2JpbGUgPSBpcy5tb2JpbGU7XG5lbnZpcm9ubWVudC5pc1RhYmxldCA9IGlzLnRhYmxldDtcblxuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGUgPSAocGFyYW1ldGVycy5vcyA9PT0gdHlwZXMuY2hheW5zT1Mud2ViTW9iaWxlKSAmJiBlbnZpcm9ubWVudC5pc0luRnJhbWU7XG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3AgPSAocGFyYW1ldGVycy5vcyA9PT0gdHlwZXMuY2hheW5zT1Mud2ViKSAmJiBlbnZpcm9ubWVudC5pc0luRnJhbWU7XG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYiA9IGVudmlyb25tZW50LmlzQ2hheW5zV2ViRGVza3RvcCB8fCBlbnZpcm9ubWVudC5pc0NoYXluc1dlYk1vYmlsZTtcblxuLy8gaW50ZXJuYWwgVE9ETzogbWFrZSBpdCBwcml2YXRlP1xuZW52aXJvbm1lbnQuY2FuQ2hheW5zQ2FsbCA9IGVudmlyb25tZW50LmlzQXBwO1xuZW52aXJvbm1lbnQuY2FuQ2hheW5zV2ViQ2FsbCA9IGVudmlyb25tZW50LmlzQ2hheW5zV2ViO1xuXG5lbnZpcm9ubWVudC52aWV3cG9ydCA9IHZpZXdwb3J0OyAvLyBUT0RPOiB1cGRhdGUgb24gcmVzaXplPyBubywgZHVlIHBlcmZvcm1hbmNlXG5lbnZpcm9ubWVudC5vcmllbnRhdGlvbiA9IG9yaWVudGF0aW9uO1xuZW52aXJvbm1lbnQucmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcbiIsImV4cG9ydCB2YXIgdXNlciA9IHtcbiAgbmFtZTogJ1BhY2FsIFdlaWxhbmQnLFxuICBmaXJzdE5hbWU6ICdQYXNjYWwnLFxuICBsYXN0TmFtZTogJ1dlaWxhbmQnLFxuICB1c2VySWQ6IDEyMzQsXG4gIGZhY2Vib29rSWQ6IDEyMzQ1LFxuICBpc0FkbWluOiB0cnVlLFxuICB1YWNHcm91cHM6IFtdLFxuICBsYW5ndWFnZTogJ2RlX0RFJyxcbiAgdG9rZW46ICd0b2tlbicgLy8gVE9ETyBpbmNsdWRlIHRva2VuIGhlcmU/XG59O1xuIiwiLyoqXG4gKiBAbmFtZSBqYW1lcyBvciB0b2JpXG4gKiBAbW9kdWxlIGphbWVzXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGphbWVzIC0gdG9iaXQgaGVscGVyIGxpYnJhcnlcbiAqIEhlbHBlciBsaWJyYXJ5IHN1cHBvcnRpbmcgdGhlIENoYXlucyBBUElcbiAqL1xuXG4vLyBUT0RPOiBtb3ZlIGFsbCB0byBoZWxwZXIuanMgb3IgdG9iaS9qYW1zXG4vLyBUT0RPOiBoZWxwZXIuanMgd2l0aCBFUzYgYW5kIGphc21pbmUgKGFuZCBvciB0YXBlKVxuLy8gaW5jbHVkZSBoZWxwZXIgYXMgbWFpbiBtb2R1bGVcblxuLy8gaW1wb3J0YW50IGlzKiBmdW5jdGlvbnNcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvaXMnO1xuXG4vLyBleHRlbmQgb2JqZWN0IGZ1bmN0aW9uXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2V4dGVuZCc7XG5cbi8vIG1vZGVybml6ZXJcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9tb2Rlcm5pemVyJztcblxuLy8gcHJvbWlzZSBRXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvcHJvbWlzZSc7XG5cbi8vIHBvbHlmaWxsICYgYWpheCB3cmFwcGVyIHdpbmRvdy5mZXRjaCAoaW5zdGVhZCBvZiAkLmFqYXgsICQuZ2V0LCAkLmdldEpTT04sICRodHRwKVxuLy8gb2ZmZXJzIGZldGNoLCBmZXRjaEpTT04gKGpzb24gaXMgc3RhbmRhcmQpLCB1cGxvYWRzIHtnZXQsIHBvc3QsIHB1dCwgZGVsZXRlfSwgZmV0Y2hDU1MsIGZldGNoSlNcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9mZXRjaCc7XG5cbi8vIEJyb3dzZXIgQVBJcyAod2luZG93LCBkb2N1bWVudCwgbG9jYXRpb24pXG4vLyBUT0RPOiBjb25zaWRlciB0byBub3QgYmluZCBicm93c2VyIHRvIHRoZSB1dGlscyBgT2JqZWN0YFxuLyoganNoaW50IC1XMTE2ICovXG4vKiBqc2hpbnQgLVcwMzMgKi9cbi8vIGpzY3M6ZGlzYWJsZSBwYXJzZUVycm9yXG5pbXBvcnQgKiBhcyBicm93c2VyIGZyb20gJy4vdXRpbHMvYnJvd3Nlcic7IC8vbm9pbnNwZWN0aW9uIEJhZEV4cHJlc3Npb25TdGF0ZW1lbnRKUyBqc2hpbnQgaWdub3JlOiBsaW5lXG4vLyBqc2NzOmVuYWJsZSBwYXJzZUVycm9yXG4vKiBqc2hpbnQgK1cwMzMgKi9cbi8qIGpzaGludCArVzExNiAqL1xuZXhwb3J0IHticm93c2VyfTtcblxuLy8gRE9NXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2RvbSc7XG5cbi8vIExvZ2dlclxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9sb2dnZXInO1xuXG4vLyBBbmFseXRpY3Ncbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9hbmFseXRpY3MnO1xuXG4vLyBSZW1vdGVcbi8vIHJlbW90ZSBkZWJ1Z2dpbmcgYW5kIGFuYWx5c2lzXG5cbi8vIGZyb250LWVuZCBFcnJvciBIYW5kbGVyIChjYXRjaGVzIGVycm9ycywgaWRlbnRpZnkgYW5kIGFuYWx5c2VzIHRoZW0pXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Vycm9yJztcblxuLy8gYXV0aCAmIEpXVCBoYW5kbGVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvand0JztcblxuLy8gY29va2llIGhhbmRsZXIgKHdpbGwgYmUgdXNlZCBpbiB0aGUgbG9jYWxfc3RvcmFnZSBhcyBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9jb29raWVfaGFuZGxlcic7XG5cbi8vIGxvY2FsU3RvcmFnZSBoZWxwZXIgKHdoaWNoIGNvb2tpZSBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sb2NhbF9zdG9yYWdlJztcblxuLy8gbWljcm8gZXZlbnQgbGlicmFyeVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9ldmVudHMnO1xuXG4vLyBvZmZsaW5lIGNhY2hlIGhlbHBlclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL29mZmxpbmVfY2FjaGUnO1xuXG4vLyBub3RpZmljYXRpb25zOiB0b2FzdHMsIGFsZXJ0cywgbW9kYWwgcG9wdXBzLCBuYXRpdmUgcHVzaFxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL25vdGlmaWNhdGlvbnMnO1xuXG4vLyBpZnJhbWUgY29tbXVuaWNhdGlvbiBhbmQgaGVscGVyIChDT1JTKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lmcmFtZSc7XG5cbi8vIHBhZ2UgdmlzaWJpbGl0eSBBUElcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9wYWdlX3Zpc2liaWxpdHknO1xuXG4vLyBEYXRlVGltZSBoZWxwZXIgKGNvbnZlcnRzIGRhdGVzLCBDIyBkYXRlLCB0aW1lc3RhbXBzLCBpMThuLCB0aW1lIGFnbylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9kYXRldGltZSc7XG5cblxuLy8gbGFuZ3VhZ2UgQVBJIGkxOG5cbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sYW5ndWFnZSc7XG5cbi8vIGNyaXRpY2FsIGNzc1xuXG4vLyBsb2FkQ1NTXG5cbi8vIGxhenkgbG9hZGluZ1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xhenlfbG9hZGluZyc7XG5cbi8vIChpbWFnZSkgcHJlbG9hZGVyXG4vL2V4cG9ydCAqIGZyb20gJy91dGlscy9wcmVsb2FkZXInO1xuXG4vLyBpc1BlbWl0dGVkIEFwcCBWZXJzaW9uIGNoZWNrXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lzX3Blcm1pdHRlZCc7XG5cblxuLy8gaW4gRnV0dXJlXG4vLyBpbW11dGFibGVcbi8vIHdlYWsgbWFwc1xuLy8gb2JzZXJ2ZXJcbi8vIHdlYiBzb2NrZXRzICh3cywgU2lnbmFsUilcbi8vIHdvcmtlciAoc2hhcmVkIHdvcmtlciwgbGF0ZXIgc2VydmljZSB3b3JrZXIgYXMgd2VsbClcbi8vIGxvY2F0aW9uLCBwdXNoU3RhdGUsIGhpc3RvcnkgaGFuZGxlclxuLy8gY2hheW5zIHNpdGUgYW5kIGNvZGUgYW5hbHlzZXI6IGZpbmQgZGVwcmVjYXRlZCBtZXRob2RzLCBiYWQgY29kZSwgaXNzdWVzIGFuZCBib3R0bGVuZWNrc1xuXG4iLCIvKipcbiAqIFRoaXMgbW9kdWxlIGNvbnRhaW5zIHRoZSBCcm93c2VyIEFQSXNcbiAqXG4gKi9cbi8vIFRPRE86IG1vdmUgb3V0IG9mIHV0aWxzXG52YXIgd2luID0gd2luZG93O1xuXG4vLyB1c2luZyBub2RlIGdsb2JhbCAobWFpbmx5IGZvciB0ZXN0aW5nLCBkZXBlbmRlbmN5IG1hbmFnZW1lbnQpXG52YXIgX2dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93O1xuZXhwb3J0IHtfZ2xvYmFsIGFzIGdsb2JhbH07XG5cbmV4cG9ydCB7d2luIGFzIHdpbmRvd307XG5leHBvcnQgdmFyIGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xuZXhwb3J0IHZhciBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcbmV4cG9ydCB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbmV4cG9ydCB2YXIgY2hheW5zID0gd2luZG93LmNoYXlucztcbmV4cG9ydCB2YXIgY2hheW5zQ2FsbGJhY2tzID0gd2luZG93Ll9jaGF5bnNDYWxsYmFja3M7XG5leHBvcnQgdmFyIGNoYXluc1Jvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hheW5zLXJvb3QnKTtcbmV4cG9ydCB2YXIgcGFyZW50ID0gd2luZG93LnBhcmVudDtcbmV4cG9ydCB2YXIgY29uc29sZSA9IHdpbmRvdy5jb25zb2xlOyAvLyBOT1RFOiBzaG91bGQgbm90IGJlIHVzZWQuIHVzZSBsb2dnZXIgaW5zdGVhZFxuZXhwb3J0IHZhciBnYyA9IHdpbmRvdy5nYyA/ICgpID0+IHdpbmRvdy5nYygpIDogKCkgPT4gbnVsbDtcblxuIiwiLy8gaW5zcGlyZWQgYnkgQW5ndWxhcjIncyBET01cblxuaW1wb3J0IHtkb2N1bWVudH0gZnJvbSAnLi9icm93c2VyJztcbmltcG9ydCB7aXNVbmRlZmluZWR9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgY2xhc3MgRE9NIHtcblxuICAvLyBOT1RFOiBhbHdheXMgcmV0dXJucyBhbiBhcnJheVxuICBzdGF0aWMgJChzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsLmJpbmQoZG9jdW1lbnQpO1xuICB9XG5cbiAgLy8gc2VsZWN0b3JzXG4gIHN0YXRpYyBxdWVyeShzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvcihlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5U2VsZWN0b3JBbGwoZWwsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBvbihlbCwgZXZ0LCBsaXN0ZW5lcikge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZ0LCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY2xvbmUobm9kZSkge1xuICAgIHJldHVybiBub2RlLmNsb25lTm9kZSh0cnVlKTtcbiAgfVxuICBzdGF0aWMgaGFzUHJvcGVydHkoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBuYW1lIGluIGVsZW1lbnQ7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlDbGFzc05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUobmFtZSk7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlUYWdOYW1lKGVsZW1lbnQsIG5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShuYW1lKTtcbiAgfVxuXG4gIC8vIGlucHV0XG4gIHN0YXRpYyBnZXRJbm5lckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwuaW5uZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBnZXRPdXRlckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwub3V0ZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBzZXRIVE1MKGVsLCB2YWx1ZSkge1xuICAgIGVsLmlubmVySFRNTCA9IHZhbHVlO1xuICB9XG4gIHN0YXRpYyBnZXRUZXh0KGVsKSB7XG4gICAgcmV0dXJuIGVsLnRleHRDb250ZW50O1xuICB9XG4gIHN0YXRpYyBzZXRUZXh0KGVsLCB2YWx1ZSkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH1cblxuICAvLyBpbnB1dCB2YWx1ZVxuICBzdGF0aWMgZ2V0VmFsdWUoZWwpIHtcbiAgICByZXR1cm4gZWwudmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldFZhbHVlKGVsLCB2YWx1ZSkge1xuICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gIH1cblxuICAvLyBjaGVja2JveGVzXG4gIHN0YXRpYyBnZXRDaGVja2VkKGVsKSB7XG4gICAgcmV0dXJuIGVsLmNoZWNrZWQ7XG4gIH1cbiAgc3RhdGljIHNldENoZWNrZWQoZWwsIHZhbHVlKSB7XG4gICAgZWwuY2hlY2tlZCA9IHZhbHVlO1xuICB9XG5cbiAgLy8gY2xhc3NcbiAgc3RhdGljIGNsYXNzTGlzdChlbGVtZW50KSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsZW1lbnQuY2xhc3NMaXN0LCAwKTtcbiAgfVxuICBzdGF0aWMgYWRkQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUNsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICB9XG4gIHN0YXRpYyBoYXNDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgfVxuXG4gIC8vIGNzc1xuICBzdGF0aWMgY3NzKGVsZW1lbnQsIHN0eWxlTmFtZSwgc3R5bGVWaGFzYWx1ZSkge1xuICAgIGlmKGlzVW5kZWZpbmVkKHN0eWxlVmFsdWUpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICAgIH1cbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyBzZXRDU1MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZhbHVlKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gc3R5bGVWYWx1ZTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IG51bGw7XG4gIH1cbiAgc3RhdGljIGdldENTUyhlbGVtZW50LCBzdHlsZU5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBkb2M9ZG9jdW1lbnQpIHtcbiAgICByZXR1cm4gZG9jLmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIH1cblxuICBzdGF0aWMgcmVtb3ZlKGVsKSB7XG4gICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudE5vZGU7XG4gICAgcGFyZW50LnJlbW92ZUNoaWxkKGVsKTtcbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICBzdGF0aWMgYXBwZW5kQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5hcHBlbmRDaGlsZChub2RlKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5yZW1vdmVDaGlsZChub2RlKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRCZWZvcmUoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbCk7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0QWZ0ZXIoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbC5uZXh0U2libGluZyk7XG4gIH1cblxuICBzdGF0aWMgdGFnTmFtZShlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIGF0dHJpYnV0ZXNcbiAgc3RhdGljIGdldEF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxuICBzdGF0aWMgc2V0QXR0cmlidXRlKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVBdHRyaWJ1dGUoZWxlbWVudCwgYXR0cmlidXRlKSB7XG4gICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gIH1cbn1cbiIsIi8qKlxuICogRXJyb3IgSGFuZGxlciBNb2R1bGVcbiAqL1xuXG4vLyBUT0RPOiBjb25zaWRlciBpbXBvcnRpbmcgZnJvbSAnLi91dGlscycgb25seVxuaW1wb3J0IHt3aW5kb3cgYXMgd2lufSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuLi9jaGF5bnMvY29uZmlnJztcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVycm9yJyk7XG5cbndpbi5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICBsZXQgbGluZUFuZENvbHVtbkluZm8gPVxuICAgIGVyci5jb2xub1xuICAgICAgPyAnIGxpbmU6JyArIGVyci5saW5lbm8gKyAnLCBjb2x1bW46JyArIGVyci5jb2xub1xuICAgICAgOiAnIGxpbmU6JyArIGVyci5saW5lbm87XG5cbiAgbGV0IGZpbmFsRXJyb3IgPSBbXG4gICAgICAnSmF2YVNjcmlwdCBFcnJvcicsXG4gICAgICBlcnIubWVzc2FnZSxcbiAgICAgIGVyci5maWxlbmFtZSArIGxpbmVBbmRDb2x1bW5JbmZvICsgJyAtPiAnICsgIG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAwLFxuICAgICAgdHJ1ZVxuICBdO1xuXG4gIC8vIFRPRE86IGFkZCBwcm9wZXIgRXJyb3IgSGFuZGxlclxuICBsb2cud2FybihmaW5hbEVycm9yKTtcbiAgaWYoQ29uZmlnLmdldCgncHJldmVudEVycm9ycycpKSB7XG4gICAgZXJyLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufSk7XG4iLCIvLyBUT0RPOiByZWZhY3RvciBhbmQgd3JpdGUgdGVzdHNcbi8vIFRPRE86IGFkZCBleGFtcGxlXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuIGBgYGpzXG4gLy8gRGVtb1xuXG4gZXZlbnRzLnB1Ymxpc2goJy9wYWdlL2xvYWQnLCB7XG5cdHVybDogJy9zb21lL3VybC9wYXRoJyAvLyBhbnkgYXJndW1lbnRcbn0pO1xuXG4gdmFyIHN1YnNjcmlwdGlvbiA9IGV2ZW50cy5zdWJzY3JpYmUoJy9wYWdlL2xvYWQnLCBmdW5jdGlvbihvYmopIHtcblx0Ly8gRG8gc29tZXRoaW5nIG5vdyB0aGF0IHRoZSBldmVudCBoYXMgb2NjdXJyZWRcbn0pO1xuXG4gLy8gLi4uc29tZXRpbWUgbGF0ZXIgd2hlcmUgSSBubyBsb25nZXIgd2FudCBzdWJzY3JpcHRpb24uLi5cbiBzdWJzY3JpcHRpb24ucmVtb3ZlKCk7XG5cbiAvLyAgdmFyIHRhcmdldCA9IHdpbmRvdy5ldmVudCA/IHdpbmRvdy5ldmVudC5zcmNFbGVtZW50IDogZSA/IGUudGFyZ2V0IDogbnVsbDtcbiBgYGBcbiAqL1xuZXhwb3J0IHZhciBldmVudHMgPSAoZnVuY3Rpb24oKSB7XG4gIGxldCB0b3BpY3MgPSB7fTtcbiAgbGV0IG93blByb3BlcnR5ID0gdG9waWNzLmhhc093blByb3BlcnR5O1xuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlOiBmdW5jdGlvbih0b3BpYywgbGlzdGVuZXIpIHtcbiAgICAgIC8vIENyZWF0ZSB0aGUgdG9waWMncyBvYmplY3QgaWYgbm90IHlldCBjcmVhdGVkXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgdG9waWNzW3RvcGljXSA9IFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICBsZXQgaW5kZXggPSB0b3BpY3NbdG9waWNdLnB1c2gobGlzdGVuZXIpIC0xO1xuXG4gICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICByZXR1cm4ge1xuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlbGV0ZSB0b3BpY3NbdG9waWNdW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9LFxuXG4gICAgcHVibGlzaDogZnVuY3Rpb24odG9waWMsIGluZm8pIHtcbiAgICAgIC8vIElmIHRoZSB0b3BpYyBkb2Vzbid0IGV4aXN0LCBvciB0aGVyZSdzIG5vIGxpc3RlbmVycyBpbiBxdWV1ZSwganVzdCBsZWF2ZVxuICAgICAgaWYgKCFvd25Qcm9wZXJ0eS5jYWxsKHRvcGljcywgdG9waWMpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3ljbGUgdGhyb3VnaCB0b3BpY3MgcXVldWUsIGZpcmUhXG4gICAgICB0b3BpY3NbdG9waWNdLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpdGVtKGluZm8gIT09IHVuZGVmaW5lZCA/IGluZm8gOiB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbn0pKCk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmV4dGVuZFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRXh0ZW5kcyB0aGUgZGVzdGluYXRpb24gb2JqZWN0IGJ5IGNvcHlpbmcgcHJvcGVydGllcyBmcm9tIHRoZSBzcmMgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5cbmltcG9ydCB7aXNPYmplY3R9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKG9iaikge1xuICBpZiAoIWlzT2JqZWN0KG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIHZhciBzb3VyY2UsIHByb3A7XG4gIGZvciAodmFyIGkgPSAxLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgZm9yIChwcm9wIGluIHNvdXJjZSkge1xuICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufVxuIiwiLyoqXG4gKiBAbmFtZSBqYW1lcy5pc1VuZGVmaW5lZFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgdW5kZWZpbmVkLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyB1bmRlZmluZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1VuZGVmaW5lZCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0RlZmluZWRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGRlZmluZWQuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGRlZmluZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RlZmluZWQodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSAhPT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNQcmVzZW50XG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBuZWl0aGVyIHVuZGVmaW5lZCBub3IgbnVsbC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgcHJlc2VudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJlc2VudChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPT0gdW5kZWZpbmVkICYmIG9iaiAhPT0gbnVsbDtcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0JsYW5rXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBlaXRoZXIgdW5kZWZpbmVkIG9yIG51bGwuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGJsYW5rLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCbGFuayhvYmopIHtcbiAgcmV0dXJuIG9iaiA9PT0gdW5kZWZpbmVkIHx8IG9iaiA9PT0gbnVsbDtcbn1cblxuXG4vKipcbiogQG5hbWUgamFtZXMuaXNTdHJpbmdcbiogQG1vZHVsZSBqYW1lc1xuKiBAa2luZCBmdW5jdGlvblxuKlxuKiBAZGVzY3JpcHRpb25cbiogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBTdHJpbmdgLlxuKlxuKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBTdHJpbmdgLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc051bWJlclxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgTnVtYmVyYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgTnVtYmVyYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtYmVyKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzT2JqZWN0XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGFuIGBPYmplY3RgLlxuICogbnVsbCBpcyBub3QgdHJlYXRlZCBhcyBhbiBvYmplY3QuXG4gKiBJbiBKUyBhcnJheXMgYXJlIG9iamVjdHNcbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGFuIGBPYmplY3RgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNBcnJheVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhbiBgQXJyYXlgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhbiBgQXJyYXlgLlxuICovXG5leHBvcnQgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzRnVuY3Rpb25cbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYEZ1bmN0aW9uYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgRnVuY3Rpb25gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzRGF0ZVxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSB2YWx1ZSBpcyBhIGRhdGUuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYERhdGVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEYXRlKHZhbHVlKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuXG4vLyBUT0RPOiBkb2VzIG5vdCBiZWxvbmcgaW4gaGVyZVxuLyoqXG4gKiBAbmFtZSB1dGlscy50cmltXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJlbW92ZXMgd2hpdGVzcGFjZXMuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7U3RyaW5nfCp9IFRyaW1tZWQgIHZhbHVlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmltKHZhbHVlKSB7XG4gIHJldHVybiBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJykgOiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc1VVSURcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBVVUlEYCAoT1NGKS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgVVVJRGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1VVSUQodmFsdWUpIHtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhbHVlID0gdHJpbSh2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9eWzAtOWEtZl17NH0oWzAtOWEtZl17NH0tKXs0fVswLTlhLXpdezEyfSQvaSkgIT09IG51bGw7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzR1VJRFxuICogQGFsaWFzIHV0aWxzLmlzVVVJRFxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYEdVSURgIChNaWNyb3NvZnQgU3RhbmRhcmQpLlxuICogSXMgYW4gYWxpYXMgdG8gaXNVVUlEXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEdVSURgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNHVUlEKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpO1xufVxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc01hY0FkZHJlc3NcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBNQUMgQWRkcmVzc2AuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYE1BQyBBZGRyZXNzYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTWFjQWRkcmVzcyh2YWx1ZSkge1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB0cmltKHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWUubWF0Y2goL14oWzAtOWEtZl17Mn1bLTpdKXs1fVswLTlhLWZdezJ9JC9pKSAhPT0gbnVsbDtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNCTEVBZGRyZXNzXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgQkxFIEFkZHJlc3NgXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEJMRSBBZGRyZXNzYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQkxFQWRkcmVzcyh2YWx1ZSkge1xuICByZXR1cm4gaXNVVUlEKHZhbHVlKSB8fCBpc01hY0FkZHJlc3ModmFsdWUpO1xufVxuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzT2JqZWN0fSBmcm9tICcuLi91dGlscyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMudXRpbHMuaXNfcGVybWl0dGVkJyk7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmUgd2hldGhlciB0aGUgY3VycmVudCB1c2VyJ3MgT1MgYW5kIE9TIFZlcnNpb24gaXMgaGlnaGVyXG4gKiBvciBlcXVhbCB0byB0aGUgcGFzc2VkIHJlZmVyZW5jZSBgT2JqZWN0YC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmVyc2lvbnMgVmVyc2lvbnMgYE9iamVjdGAgd2l0aCBwZXJtaXR0ZWQgT1NzIGFuZCB0aGVpciB2ZXJzaW9uLlxuICogQHBhcmFtIHtzdHJpbmd9IG9zIE9TIE5hbWUgYXMgbG93ZXJjYXNlIHN0cmluZy5cbiAqIEBwYXJhbSB7SW50ZWdlcn0gYXBwVmVyc2lvbiBBcHAgVmVyc2lvbiBOdW1iZXIgYXMgSW50ZWdlciAgVE9ETzogZm9ybWF0IFJGQz9cbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjdXJyZW50IE9TICYgVmVyc2lvbiBhcmUgZGVmaW5lZCBpbiB0aGUgdmVyc2lvbnMgYE9iamVjdGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUGVybWl0dGVkKHZlcnNpb25zLCBvcywgYXBwVmVyc2lvbikge1xuXG4gIGlmICghdmVyc2lvbnMgfHwgIWlzT2JqZWN0KHZlcnNpb25zKSkge1xuICAgIGxvZy53YXJuKCdubyB2ZXJzaW9ucyBgT2JqZWN0YCB3YXMgcGFzc2VkJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHZlcnNpb25zW29zXSAmJiBhcHBWZXJzaW9uID49IHZlcnNpb25zW29zXTtcbn1cbiIsIi8qKlxuICogTG9nTGV2ZWwgRW51bVxuICogbm9uZSBpcyAwXG4gKiBkZWJ1ZyBpcyA0XG4gKiBAdHlwZSBFbnVtXG4gKi9cbmV4cG9ydCB2YXIgbGV2ZWxzID0ge1xuICBub25lOiAwLFxuICBlcnJvcjoxLFxuICB3YXJuOjIsXG4gIGluZm86MyxcbiAgZGVidWc6NFxufTtcblxuLyoqXG4gKiBDYW4gc3RvcmUgbXVsdGlwbGUgbG9nZ2Vyc1xuICogQHR5cGUge2BPYmplY3RgfSBsb2dnZXJzXG4gKi9cbmxldCBsb2dnZXJzID0ge307XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBBc3NpZ24gdGhlIGxvZ2dlciBtZXRob2QuXG4gKiBCeSBkZWZhdWx0IHRoZSB3aW5kb3cuY29uc29sZSBgT2JqZWN0YFxuICogQHR5cGUgYHdpbmRvdy5jb25zb2xlYFxuICovXG5sZXQgbG9nZ2VyID0gd2luZG93LmNvbnNvbGU7XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IGxvZyBMZXZlbFxuICogdXNlIGBzZXRMZXZlbChuZXdMb2dMZXZlbClgIHRvIG92ZXJ3cml0ZSB0aGlzIHZhbHVlLlxuICogVE9ETzogZWFjaCBsb2dnZXIgZ2V0cyBhbiBvd24gbG9nTGV2ZWxcbiAqL1xubGV0IGxvZ0xldmVsID0gbGV2ZWxzLm5vbmU7XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBsZXZlbFxuICogQHBhcmFtIGFyZ3NcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGxvZyhsZXZlbCwgYXJncywgcHJlZml4KSB7XG4gIGxldCBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgaWYgKHByZWZpeCkge1xuICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3MpO1xuICAgIC8vYXJncy51bnNoaWZ0KHRpbWUpOyAvLyBUT0RPOiBjb25zaWRlciB0b2dnbGVhYmxlIHRpbWVcbiAgICBhcmdzLnVuc2hpZnQocHJlZml4KTtcbiAgfVxuICBsb2dnZXJbbGV2ZWwgfHwgJ2xvZyddLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xufVxuXG4vKipcbiAqIFNldCB0aGUgY3VycmVudCBsb2dMZXZlbFxuICogaW4gb3JkZXIgdG8gc2hvdyBvciBub3Qgc2hvdyBsb2dzXG4gKiBAcGFyYW0gbGV2ZWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldExldmVsKGxldmVsKSB7XG4gIGxvZ0xldmVsID0gbGV2ZWw7XG59XG5cbi8qKlxuICogR2V0IExvZ2dlciBTaW5nbGV0b24gSW5zdGFuY2VcbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSBUaGUgTG9nZ2VyJ3MgbmFtZVxuICogQHJldHVybnMge0xvZ2dlcn0gTG9nZ2VyIGluc3RhbmNlLCBlaXRoZXIgZXhpc3Rpbmcgb25lIG9yIGNyZWF0ZXMgYSBuZXcgb25lXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2dnZXIobmFtZSkge1xuICByZXR1cm4gbG9nZ2Vyc1tuYW1lXSB8fCAobG9nZ2Vyc1tuYW1lXSA9IG5ldyBMb2dnZXIobmFtZSkpO1xufVxuXG4vKipcbiAqIExvZ2dlciBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcblxuICAvKipcbiAgICogRWFjaCBsb2dnZXIgaXMgaWRlbnRpZmllZCBieSBpdCdzIG5hbWUuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIGxvZ2dlciAoZS5nLiBgY2hheW5zLmNvcmVgKVxuICAgKi9cbiAgY29uc3RydWN0b3IobmFtZSkge1xuICAgIHRoaXMubmFtZSA9ICdbJyArIG5hbWUgKyAnXTogJztcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICpcbiAgICogQG1ldGhvZCBkZWJ1Z1xuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGRlYnVnKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdkZWJ1ZycsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGluZm8uXG4gICAqXG4gICAqIEBtZXRob2QgaW5mb1xuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGluZm8oKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgMykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2luZm8nLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZy5cbiAgICpcbiAgICogQG1ldGhvZCB3YXJuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgd2FybigpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nKCd3YXJuJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IuXG4gICAqXG4gICAqIEBtZXRob2QgZXJyb3JcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICBlcnJvcigpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnZXJyb3InLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cbn1cbiIsIlxuaW1wb3J0IHtjaGF5bnN9IGZyb20gJy4vY2hheW5zJztcbmV4cG9ydCBkZWZhdWx0IGNoYXlucztcbiJdfQ==
  return require('chayns');

});