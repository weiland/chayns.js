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
    this.element = DOM.createElement("div").setAttribute("id", "chayns-popup").setAttribute("class", "chayns__popup");
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
    var callbackFn = function callbackFn(buttons, id) {
      id = parseInt(id, 10) - 1;
      if (buttons[id]) {
        buttons[id].callback();
      }
    };

    return apiCall({
      cmd: 16, // TODO: is slitte://
      params: [{ callback: callbackFn }, { string: obj.headline }, { string: obj.content }, { string: obj.buttons[0].name } // TODO: needs encodeURI?
      //{'string': obj.buttons[1].name}, // TODO: needs encodeURI?
      //{'string': obj.buttons[2].name} // TODO: needs encodeURI?
      ],
      callbackName: callbackName.bind(null, obj.buttons),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdXNlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9icm93c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9lcnJvci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9ldmVudHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXh0ZW5kLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzX3Blcm1pdHRlZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9sb2dnZXIuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zLXVtZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7OztJQ09ZLEtBQUssbUNBQW9CLFNBQVM7O0FBQzlDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7OztBQUcxQixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDOzs7O0lBR1YsTUFBTSxXQUF1QixpQkFBaUIsRUFBOUMsTUFBTTs7OztJQUdOLFdBQVcsV0FBa0Isc0JBQXNCLEVBQW5ELFdBQVc7Ozs7SUFHWCxJQUFJLFdBQXlCLGVBQWUsRUFBNUMsSUFBSTs7OzswQkFHeUIsZUFBZTs7SUFBNUMsS0FBSyxlQUFMLEtBQUs7SUFBRSxRQUFRLGVBQVIsUUFBUTtJQUFFLEtBQUssZUFBTCxLQUFLOzs7O0lBSXRCLE9BQU8sV0FBc0IsdUJBQXVCLEVBQXBELE9BQU87O0lBRVAsa0JBQWtCLFdBQVcsK0JBQStCLEVBQTVELGtCQUFrQjs7O0FBSW5CLElBQUksTUFBTSxXQUFOLE1BQU0sR0FBRyxFQUFFLENBQUM7O0FBRXZCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFB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QUNoQixpQkFBTztTQUNSO0FBQ0QsV0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ3BDOzs7Ozs7U0E5RFUsTUFBTTs7Ozs7Ozs7OztJQ3ZFWCxNQUFNLFdBQU8sVUFBVSxFQUF2QixNQUFNOztpQkFDQyxNQUFNIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQG5hbWUgY2hheW5zIEFQSVxuICogQG1vZHVsZSBjaGF5bnNcbiAqL1xuXG4vLyBoZWxwZXJcbi8vIFRPRE86IGVpdGhlciBpbmRleC5qcywgdXRpbHMuanMgb3IganVzdCB0aGUgc2luZ2xlIGZpbGVzXG5pbXBvcnQgKiBhcyB1dGlscyAgICAgICAgICAgICAgIGZyb20gJy4vdXRpbHMnO1xudmFyIGV4dGVuZCA9IHV0aWxzLmV4dGVuZDtcblxuLy8gc2V0IGxvZ0xldmVsIHRvIGluZm9cbnV0aWxzLnNldExldmVsKDQpOyAvLyBUT0RPOiBkb24ndCBzZXQgdGhlIGxldmVsIGhlcmVcblxuLy8gYmFzaWMgY29uZmlnXG5pbXBvcnQge2NvbmZpZ30gICAgICAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2NvbmZpZyc7XG5cbi8vIGVudmlyb25tZW50XG5pbXBvcnQge2Vudmlyb25tZW50fSAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2Vudmlyb25tZW50JztcblxuLy8gKGN1cnJlbnQpIHVzZXJcbmltcG9ydCB7dXNlcn0gICAgICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvdXNlcic7XG5cbi8vIGNvcmUgZnVuY3Rpb25zXG5pbXBvcnQge3JlYWR5LCByZWdpc3Rlciwgc2V0dXB9IGZyb20gJy4vY2hheW5zL2NvcmUnO1xuXG4vLyBjaGF5bnMgY2FsbHNcblxuaW1wb3J0IHthcGlDYWxsfSAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy9jaGF5bnNfY2FsbHMnO1xuXG5pbXBvcnQge2NoYXluc0FwaUludGVyZmFjZX0gICAgIGZyb20gJy4vY2hheW5zL2NoYXluc19hcGlfaW50ZXJmYWNlJztcblxuXG4vLyBwdWJsaWMgY2hheW5zIG9iamVjdFxuZXhwb3J0IHZhciBjaGF5bnMgPSB7fTtcblxuZXh0ZW5kKGNoYXlucywge2dldExvZ2dlcjogdXRpbHMuZ2V0TG9nZ2VyfSk7IC8vIGpzaGludCBpZ25vcmU6IGxpbmVcbmV4dGVuZChjaGF5bnMsIHt1dGlsc30pO1xuZXh0ZW5kKGNoYXlucywge1ZFUlNJT046ICcwLjEuMCd9KTtcbi8vZXh0ZW5kKGNoYXlucywge2NvbmZpZ30pOyAvLyBUT0RPOiB0aGUgY29uZmlnIGBPYmplY3RgIHNob3VsZCBub3QgYmUgZXhwb3NlZFxuXG5leHRlbmQoY2hheW5zLCB7ZW52OiBlbnZpcm9ubWVudH0pOyAvLyBUT0RPOiBnZW5lcmFsbHkgcmVuYW1lXG5leHRlbmQoY2hheW5zLCB7dXNlcn0pO1xuXG5leHRlbmQoY2hheW5zLCB7cmVnaXN0ZXJ9KTtcbmV4dGVuZChjaGF5bnMsIHtyZWFkeX0pO1xuXG5leHRlbmQoY2hheW5zLCB7YXBpQ2FsbH0pO1xuXG4vLyBhZGQgYWxsIGNoYXluc0FwaUludGVyZmFjZSBtZXRob2RzIGRpcmVjdGx5IHRvIHRoZSBgY2hheW5zYCBPYmplY3RcbmV4dGVuZChjaGF5bnMsIGNoYXluc0FwaUludGVyZmFjZSk7XG5cbi8vIHNldHVwIGNoYXluc1xuc2V0dXAoKTtcblxuXG4vLyBjaGF5bnMgcHVibGlzaCBubyBVTURcbi8vd2luZG93LmNoYXlucyA9IGNoYXlucztcbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc0Z1bmN0aW9uLCBpc1VuZGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHt3aW5kb3d9IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNhbGxiYWNrcycpO1xuXG5sZXQgbm9vcCA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxubGV0IGNhbGxiYWNrcyA9IHt9O1xuLyoqXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGludm9rZWRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNDaGF5bnNDYWxsIElmIHRydWUgdGhlbiB0aGUgY2FsbCB3aWxsIGJlIGFzc2lnbmVkIHRvIGBjaGF5bnMuX2NhbGxiYWNrc2BcbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHBhcmFtZXRlcnMgYXJlIHZhbGlkIGFuZCB0aGUgY2FsbGJhY2sgd2FzIHNhdmVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRDYWxsYmFjayhuYW1lLCBmbiwgaXNDaGF5bnNDYWxsKSB7XG5cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgbG9nLndhcm4oJ3NldENhbGxiYWNrOiBuYW1lIGlzIHVuZGVmaW5lZCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzRnVuY3Rpb24oZm4pKSB7XG4gICAgbG9nLndhcm4oJ3NldENhbGxiYWNrOiBmbiBpcyBubyBGdW5jdGlvbicpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChuYW1lLmluZGV4T2YoJygpJykgIT09IC0xKSB7IC8vIHN0cmlwICcoKSdcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKCcoKScsICcnKTtcbiAgfVxuXG4gIGxvZy5kZWJ1Zygnc2V0Q2FsbGJhY2s6IHNldCBDYWxsYmFjazogJyArIG5hbWUpO1xuICAvL2lmIChuYW1lIGluIGNhbGxiYWNrcykge1xuICAvLyAgY2FsbGJhY2tzW25hbWVdLnB1c2goZm4pOyAvLyBUT0RPOiByZWNvbnNpZGVyIEFycmF5IHN1cHBvcnRcbiAgLy99IGVsc2Uge1xuICAgIGNhbGxiYWNrc1tuYW1lXSA9IGZuOyAvLyBBdHRlbnRpb246IHdlIHNhdmUgYW4gQXJyYXlcbiAgLy99XG5cbiAgaWYgKGlzQ2hheW5zQ2FsbCkge1xuICAgIGxvZy5kZWJ1Zygnc2V0Q2FsbGJhY2s6IHJlZ2lzdGVyIGZuIGFzIGdsb2JhbCBjYWxsYmFjaycpO1xuICAgIHdpbmRvdy5fY2hheW5zQ2FsbGJhY2tzW25hbWVdID0gY2FsbGJhY2sobmFtZSwgJ0NoYXluc0NhbGwnKTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJlZ2lzdGVyIGNhbGxiYWNrcyBmb3IgQ2hheW5zQ2FsbHMgYW5kIENoYXluc1dlYkNhbGxzXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsYmFja05hbWUgTmFtZSBvZiB0aGUgRnVuY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIEVpdGhlciAnQ2hheW5zV2ViQ2FsbCcgb3IgJ0NoYXluc0NhbGwnXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IGhhbmRsZURhdGEgUmVjZWl2ZXMgY2FsbGJhY2sgZGF0YVxuICovXG5mdW5jdGlvbiBjYWxsYmFjayhjYWxsYmFja05hbWUsIHR5cGUpIHtcblxuICByZXR1cm4gZnVuY3Rpb24gaGFuZGxlRGF0YSgpIHtcblxuICAgIGlmIChjYWxsYmFja05hbWUgaW4gY2FsbGJhY2tzKSB7XG4gICAgICBsb2cuZGVidWcoJ2ludm9rZSBjYWxsYmFjazogJywgY2FsbGJhY2tOYW1lLCAndHlwZTonLCB0eXBlKTtcbiAgICAgIHZhciBmbiA9IGNhbGxiYWNrc1tjYWxsYmFja05hbWVdO1xuICAgICAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIC8vZGVsZXRlIGNhbGxiYWNrc1tjYWxsYmFja05hbWVdOyAvLyBUT0RPOiBjYW5ub3QgYmUgbGlrZSB0aGF0LCByZW1vdmUgYXJyYXk/XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cud2FybignY2FsbGJhY2sgaXMgbm8gZnVuY3Rpb24nLCBjYWxsYmFja05hbWUsIGZuKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmluZm8oJ2NhbGxiYWNrICcgKyBjYWxsYmFja05hbWUgKyAnIGRpZCBub3QgZXhpc3QgaW4gY2FsbGJhY2tzIGFycmF5Jyk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5fY2FsbGJhY2tzXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQ2hheW5zIENhbGwgQ2FsbGJhY2tzXG4gKiB3aWxsIGJlIGFzc2lnbmVkIHRvIHRoZSBgY2hheW5zLl9jYWxsYmFja3NgIG9iamVjdFxuICpcbiAqIEB0eXBlIHtPYmplY3R9IGNoYXluc0NhbGxzQ2FsbGJhY2tzXG4gKi9cbndpbmRvdy5fY2hheW5zQ2FsbGJhY2tzID0ge1xuICAvLy8vIFRPRE86IHdyYXAgY2FsbGJhY2sgZnVuY3Rpb24gKERSWSlcbiAgLy9nZXRHbG9iYWxEYXRhOiBjYWxsYmFjaygnZ2V0R2xvYmFsRGF0YScsICdDaGF5bnNDYWxsJykgLy8gZXhhbXBsZVxuICBnZXRHZW9Mb2NhdGlvbkNhbGxiYWNrOiBub29wXG59O1xuXG5cbi8vIFRPRE86IG1vdmUgdG8gYW5vdGhlciBmaWxlPyBjb3JlLCBjaGF5bnNfY2FsbHNcbnZhciBtZXNzYWdlTGlzdGVuaW5nID0gZmFsc2U7XG5leHBvcnQgZnVuY3Rpb24gbWVzc2FnZUxpc3RlbmVyKCkge1xuICBpZiAobWVzc2FnZUxpc3RlbmluZykge1xuICAgIGxvZy5pbmZvKCd0aGVyZSBpcyBhbHJlYWR5IG9uZSBtZXNzYWdlIGxpc3RlbmVyIG9uIHdpbmRvdycpO1xuICAgIHJldHVybjtcbiAgfVxuICBtZXNzYWdlTGlzdGVuaW5nID0gdHJ1ZTtcbiAgbG9nLmRlYnVnKCdtZXNzYWdlIGxpc3RlbmVyIGlzIHN0YXJ0ZWQnKTtcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIG9uTWVzc2FnZShlKSB7XG5cbiAgICBsb2cuZGVidWcoJ25ldyBtZXNzYWdlICcpO1xuXG4gICAgdmFyIG5hbWVzcGFjZSA9ICdjaGF5bnMuY3VzdG9tVGFiLicsXG4gICAgICBkYXRhID0gZS5kYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBkYXRhICE9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBzdHJpcCBuYW1lc3BhY2UgZnJvbSBkYXRhXG4gICAgZGF0YSA9IGRhdGEuc3Vic3RyKG5hbWVzcGFjZS5sZW5ndGgsIGRhdGEubGVuZ3RoIC0gbmFtZXNwYWNlLmxlbmd0aCk7XG4gICAgdmFyIG1ldGhvZCA9IGRhdGEubWF0Y2goL1teOl0qOi8pOyAvLyBkZXRlY3QgbWV0aG9kXG4gICAgaWYgKG1ldGhvZCAmJiBtZXRob2QubGVuZ3RoID4gMCkge1xuICAgICAgbWV0aG9kID0gbWV0aG9kWzBdO1xuXG4gICAgICB2YXIgcGFyYW1zID0gZGF0YS5zdWJzdHIobWV0aG9kLmxlbmd0aCwgZGF0YS5sZW5ndGggLSBtZXRob2QubGVuZ3RoKTtcbiAgICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwYXJhbXMgPSBKU09OLnBhcnNlKHBhcmFtcyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICB9XG5cbiAgICAgIC8vIHJlbW92ZSB0aGUgbGFzdCAnKSdcbiAgICAgIG1ldGhvZCA9IG1ldGhvZC5zdWJzdHIoMCwgbWV0aG9kLmxlbmd0aCAtIDEpO1xuXG4gICAgICAvLyB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gY2FuIGJlIGludm9rZWQgZGlyZWN0bHlcbiAgICAgIGNhbGxiYWNrKG1ldGhvZCwgJ0NoYXluc1dlYkNhbGwnKShwYXJhbXMpO1xuICAgIH1cbiAgfSk7XG59XG4iLCJpbXBvcnQge2FwaUNhbGx9IGZyb20gJy4vY2hheW5zX2NhbGxzJztcbmltcG9ydCB7Z2V0TG9nZ2VyLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzQkxFQWRkcmVzcyxcbiAgaXNEYXRlLCBpc09iamVjdCwgaXNBcnJheSwgdHJpbSwgRE9NfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvdywgbG9jYXRpb259IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInOyAvLyBkdWUgdG8gd2luZG93Lm9wZW4gYW5kIGxvY2F0aW9uLmhyZWZcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zX2FwaV9pbnRlcmZhY2UnKTtcblxuLyoqXG4gKiBORkMgUmVzcG9uc2UgRGF0YSBTdG9yYWdlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5sZXQgTmZjUmVzcG9uc2VEYXRhID0ge1xuICBSRklkOiAwLFxuICBQZXJzb25JZDogMFxufTtcblxuLyoqXG4gKiBQb3B1cCBCdXR0b25cbiAqIEBjbGFzcyBQb3B1cEJ1dHRvblxuICovXG5jbGFzcyBQb3B1cEJ1dHRvbiB7XG4gIC8qKlxuICAgKiBQb3B1cCBCdXR0b24gQ29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgUG9wdXAgQnV0dG9uIG5hbWVcbiAgICovXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgdGhpcy5lbGVtZW50ID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICAgICAgICAgICAgLnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLXBvcHVwJylcbiAgICAgICAgICAgICAgICAuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3BvcHVwJyk7XG4gIH1cbiAgLyoqXG4gICAqIEdldCBQb3B1cCBCdXR0b24gbmFtZVxuICAgKiBAcmV0dXJucyB7bmFtZX1cbiAgICovXG4gIG5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsYmFja1xuICAgKi9cbiAgY2FsbGJhY2soKSB7XG4gICAgbGV0IGNiID0gdGhpcy5jYWxsYmFjaztcbiAgICBsZXQgbmFtZSA9IGNiLm5hbWU7XG4gICAgaWYgKGlzRnVuY3Rpb24oY2IpKSB7XG4gICAgICBjYi5jYWxsKG51bGwsIG5hbWUpO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogQG5hbWUgdG9IVE1MXG4gICAqIFJldHVybnMgSFRNTCBOb2RlIGNvbnRhaW5pbmcgdGhlIFBvcHVwQnV0dG9uLlxuICAgKiBAcmV0dXJucyB7UG9wdXBCdXR0b24uZWxlbWVudHxIVE1MTm9kZX1cbiAgICovXG4gIHRvSFRNTCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbGVtZW50O1xuICB9XG59XG5cbi8qKlxuICogQmVhY29uIExpc3RcbiAqIEB0eXBlIHtBcnJheXxudWxsfVxuICovXG5sZXQgYmVhY29uTGlzdCA9IG51bGw7XG5cbi8qKlxuICogR2xvYmFsIERhdGEgU3RvcmFnZVxuICogQHR5cGUge2Jvb2xlYW58T2JqZWN0fVxuICovXG5sZXQgZ2xvYmFsRGF0YSA9IGZhbHNlO1xuXG4vKipcbiAqIEFsbCBwdWJsaWMgY2hheW5zIG1ldGhvZHMgdG8gaW50ZXJhY3Qgd2l0aCAqQ2hheW5zIEFwcCogb3IgKkNoYXlucyBXZWIqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5leHBvcnQgdmFyIGNoYXluc0FwaUludGVyZmFjZSA9IHtcblxuXG4gIC8qKlxuICAgKiBFbmFibGUgb3IgZGlzYWJsZSBQdWxsVG9SZWZyZXNoXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWxsb3dQdWxsIEFsbG93IFB1bGxUb1JlZnJlc2hcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjZWVkZWRcbiAgICovXG4gIHNldFB1bGxUb1JlZnJlc2g6IGZ1bmN0aW9uKGFsbG93UHVsbCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMCxcbiAgICAgIHdlYkZuOiBmYWxzZSwgLy8gY291bGQgYmUgb21pdHRlZFxuICAgICAgcGFyYW1zOiBbeydib29sJzogYWxsb3dQdWxsfV1cbiAgICB9KTtcbiAgfSxcbiAgLy8gVE9ETzogcmVuYW1lIHRvIGVuYWJsZVB1bGxUb1JlZnJlc2hcbiAgYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaCh0cnVlKTtcbiAgfSxcbiAgZGlzYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaChmYWxzZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3Nob3dDdXJzb3JdIElmIHRydWUgdGhlIHdhaXRjdXJzb3Igd2lsbCBiZSBzaG93blxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgaXQgd2lsbCBiZSBoaWRkZW5cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZXRXYWl0Y3Vyc29yOiBmdW5jdGlvbihzaG93Q3Vyc29yKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxLFxuICAgICAgd2ViRm46IChzaG93Q3Vyc29yID8gJ3Nob3cnIDogJ2hpZGUnKSArICdMb2FkaW5nQ3Vyc29yJyxcbiAgICAgIHBhcmFtczogW3snYm9vbCc6IHNob3dDdXJzb3J9XVxuICAgIH0pO1xuICB9LFxuICBzaG93V2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKHRydWUpO1xuICB9LFxuICBoaWRlV2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKGZhbHNlKTtcbiAgfSxcblxuICAvLyBUT0RPOiByZW5hbWUgaXQgdG8gb3BlblRhcHA/XG4gIC8qKlxuICAgKiBTZWxlY3QgZGlmZmVyZW50IFRhcHAgaWRlbnRpZmllZCBieSBUYXBwSUQgb3IgSW50ZXJuYWxUYXBwTmFtZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGFiIFRhcHAgTmFtZSBvciBUYXBwIElEXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAob3B0aW9uYWwpIHBhcmFtIFVSTCBQYXJhbWV0ZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZWxlY3RUYWI6IGZ1bmN0aW9uKHRhYiwgcGFyYW0pIHtcblxuICAgIGxldCBjbWQgPSAxMzsgLy8gc2VsZWN0VGFiIHdpdGggcGFyYW0gQ2hheW5zQ2FsbFxuXG4gICAgLy8gdXBkYXRlIHBhcmFtOiBzdHJpcCA/IGFuZCBlbnN1cmUgJiBhdCB0aGUgYmVnaW5cbiAgICBpZiAocGFyYW0gJiYgIXBhcmFtLm1hdGNoKC9eWyZ8XFw/XS8pKSB7IC8vIG5vICYgYW5kIG5vID9cbiAgICAgIHBhcmFtID0gJyYnICsgcGFyYW07XG4gICAgfSBlbHNlIGlmIChwYXJhbSkge1xuICAgICAgcGFyYW0gPSBwYXJhbS5yZXBsYWNlKCc/JywgJyYnKTtcbiAgICB9IGVsc2UgeyAvLyBubyBwYXJhbXMsIGRpZmZlcmVudCBDaGF5bnNDYWxsXG4gICAgICBjbWQgPSAyO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgd2ViRm46ICdzZWxlY3RvdGhlcnRhYicsXG4gICAgICBwYXJhbXM6IGNtZCA9PT0gMTNcbiAgICAgICAgPyBbeydzdHJpbmcnOiB0YWJ9LCB7J3N0cmluZyc6IHBhcmFtfV1cbiAgICAgICAgOiBbeydzdHJpbmcnOiB0YWJ9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBUYWI6IHRhYixcbiAgICAgICAgUGFyYW1ldGVyOiBwYXJhbVxuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwMiwgaW9zOiAxMzgzLCB3cDogMjQ2OSB9IC8vIGZvciBuYXRpdmUgYXBwcyBvbmx5XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBBbGJ1bVxuICAgKiBUT0RPOiByZW5hbWUgdG8gb3BlblxuICAgKlxuICAgKiBAcGFyYW0ge2lkfHN0cmluZ30gaWQgQWxidW0gSUQgKEFsYnVtIE5hbWUgd2lsbCB3b3JrIGFzIHdlbGwsIGJ1dCBkbyBwcmVmZXIgSURzKVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNlbGVjdEFsYnVtOiBmdW5jdGlvbihpZCkge1xuICAgIGlmICghaXNTdHJpbmcoaWQpICYmICFpc051bWJlcihpZCkpIHtcbiAgICAgIGxvZy5lcnJvcignc2VsZWN0QWxidW06IGludmFsaWQgYWxidW0gbmFtZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMsXG4gICAgICB3ZWJGbjogJ3NlbGVjdEFsYnVtJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogaWR9XSxcbiAgICAgIHdlYlBhcmFtczogaWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBQaWN0dXJlXG4gICAqIChvbGQgU2hvd1BpY3R1cmUpXG4gICAqIEFuZHJvaWQgZG9lcyBub3Qgc3VwcG9ydCBnaWZzIDooXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgSW1hZ2UgVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuUGljdHVyZTogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goL2pwZyR8cG5nJHxnaWYkL2kpKSB7IC8vIFRPRE86IG1vcmUgaW1hZ2UgdHlwZXM/XG4gICAgICBsb2cuZXJyb3IoJ29wZW5QaWN0dXJlOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQsXG4gICAgICB3ZWJGbjogJ3Nob3dQaWN0dXJlJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybCxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNjM2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICogVE9ETzogaW1wbGVtZW50IGludG8gQ2hheW5zIFdlYj9cbiAgICogVE9ETzogcmVuYW1lIHRvIHNldD9cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHQgVGhlIEJ1dHRvbidzIHRleHRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgY2FwdGlvbiBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbih0ZXh0LCBjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy9sb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIHZhbGlkIGNhbGxiYWNrIEZ1bmN0aW9uLicpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpcyBubyB2YWxpZCBjYWxsYmFjayBGdW5jdGlvbi4nKTtcbiAgICAgIC8vcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NhcHRpb25CdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNSxcbiAgICAgIHBhcmFtczogW3tzdHJpbmc6IHRleHR9LCB7Y2FsbGJhY2s6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSGlkZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBoaWRlQ2FwdGlvbkJ1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA2LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRmFjZWJvb2sgQ29ubmVjdFxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3Blcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcyddIEZhY2Vib29rIFBlcm1pc3Npb25zLCBzZXBhcmF0ZWQgYnkgY29tbWFcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtyZWxvYWRQYXJhbSA9ICdjb21tZW50J10gUmVsb2FkIFBhcmFtXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgLy8gVE9ETzogdGVzdCBwZXJtaXNzaW9uc1xuICBmYWNlYm9va0Nvbm5lY3Q6IGZ1bmN0aW9uKHBlcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcycsIHJlbG9hZFBhcmFtID0gJ2NvbW1lbnQnKSB7XG4gICAgcmVsb2FkUGFyYW0gPSByZWxvYWRQYXJhbTtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDcsXG4gICAgICB3ZWJGbjogJ2ZhY2Vib29rQ29ubmVjdCcsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHBlcm1pc3Npb25zfSwgeydGdW5jdGlvbic6ICdFeGVjQ29tbWFuZD1cIicgKyByZWxvYWRQYXJhbSArICdcIid9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBSZWxvYWRQYXJhbWV0ZXI6ICdFeGVjQ29tbWFuZD0nICsgcmVsb2FkUGFyYW0sXG4gICAgICAgIFBlcm1pc3Npb25zOiBwZXJtaXNzaW9uc1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OSwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9LFxuICAgICAgZmFsbGJhY2tDbWQ6IDggLy8gaW4gY2FzZSB0aGUgYWJvdmUgaXMgbm90IHN1cHBvcnQgdGhlIGZhbGxiYWNrQ21kIHdpbGwgcmVwbGFjZSB0aGUgY21kXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gTGluayBpbiBCcm93c2VyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVVJMXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlbkxpbmtJbkJyb3dzZXI6IGZ1bmN0aW9uKHVybCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogOSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKCc6Ly8nKSA9PT0gLTEpIHtcbiAgICAgICAgICB1cmwgPSAnLy8nICsgdXJsOyAvLyBvciBhZGQgbG9jYXRpb24ucHJvdG9jb2wgcHJlZml4IGFuZCAvLyBUT0RPOiB0ZXN0XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjQ2Niwgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaG93IEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGJhY2sgYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2hvd0JhY2tCdXR0b246IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgY2hheW5zQXBpSW50ZXJmYWNlLmhpZGVCYWNrQnV0dG9uKCk7XG4gICAgICB9O1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JhY2tCdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTAsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgaGlkZUJhY2tCdXR0b246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTEsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIE9wZW4gSW50ZXJDb20uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgb3BlbkludGVyQ29tOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEyLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDAyLCBpb3M6IDEzODMsIHdwOiAyNTQzIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IEdlb2xvY2F0aW9uLlxuICAgKiBuYXRpdmUgYXBwcyBvbmx5IChidXQgY291bGQgd29yayBpbiB3ZWIgYXMgd2VsbCwgbmF2aWdhdG9yLmdlb2xvY2F0aW9uKVxuICAgKlxuICAgKiBUT0RPOiBjb250aW51b3VzVHJhY2tpbmcgd2FzIHJlbW92ZWRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgYmFjayBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBnZXRHZW9Mb2NhdGlvbjogZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnZ2V0R2VvTG9jYXRpb25DYWxsYmFjaygpJztcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIC8vIFRPRE86IHJlbW92ZSBjb25zb2xlXG4gICAgICAvLyBUT0RPOiBhbGxvdyBlbXB0eSBjYWxsYmFja3Mgd2hlbiBpdCBpcyBhbHJlYWR5IHNldFxuICAgICAgY29uc29sZS53YXJuKCdubyBjYWxsYmFjayBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI1MDEsIGlvczogMjQ2Niwgd3A6IDI0NjkgfSxcbiAgICAgIC8vd2ViRm46IGZ1bmN0aW9uKCkgeyBuYXZpZ2F0b3IuZ2VvbG9jYXRpb247IH1cbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFZpZGVvXG4gICAqIChvbGQgU2hvd1ZpZGVvKVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFZpZGVvIFVSTCBzaG91bGQgY290YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlblZpZGVvOiBmdW5jdGlvbih1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkgfHwgIXVybC5tYXRjaCgvLipcXC4uezIsfS8pKSB7IC8vIFRPRE86IFdURiBSZWdleFxuICAgICAgbG9nLmVycm9yKCdvcGVuVmlkZW86IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTUsXG4gICAgICB3ZWJGbjogJ3Nob3dWaWRlbycsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgd2ViUGFyYW1zOiB1cmxcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2hvdyBEaWFsb2dcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHtjb250ZW50OntTdHJpbmd9ICwgaGVhZGxpbmU6ICxidXR0b25zOntBcnJheX0sIG5vQ29udGVudG5QYWRkaW5nOiwgb25Mb2FkOn1cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzaG93RGlhbG9nOiBmdW5jdGlvbiBzaG93RGlhbG9nKG9iaikge1xuICAgIGlmICghb2JqIHx8ICFpc09iamVjdChvYmopKSB7XG4gICAgICBsb2cud2Fybignc2hvd0RpYWxvZzogaW52YWxpZCBwYXJhbWV0ZXJzJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChpc1N0cmluZyhvYmouY29udGVudCkpIHtcbiAgICAgIG9iai5jb250ZW50ID0gdHJpbShvYmouY29udGVudC5yZXBsYWNlKC88YnJbIC9dKj8+L2csICdcXG4nKSk7XG4gICAgfVxuICAgIGlmICghaXNBcnJheShvYmouYnV0dG9ucykgfHwgb2JqLmJ1dHRvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBvYmouYnV0dG9ucyA9IFsobmV3IFBvcHVwQnV0dG9uKCdPSycpKS50b0hUTUwoKV07XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdDaGF5bnNEaWFsb2dDYWxsQmFjaygpJztcbiAgICBsZXQgY2FsbGJhY2tGbiA9IGZ1bmN0aW9uKGJ1dHRvbnMsIGlkKSB7XG4gICAgICBpZCA9IHBhcnNlSW50KGlkLCAxMCkgLSAxO1xuICAgICAgaWYgKGJ1dHRvbnNbaWRdKSB7XG4gICAgICAgIGJ1dHRvbnNbaWRdLmNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTYsIC8vIFRPRE86IGlzIHNsaXR0ZTovL1xuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnY2FsbGJhY2snOiBjYWxsYmFja0ZufSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouaGVhZGxpbmV9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5jb250ZW50fSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouYnV0dG9uc1swXS5uYW1lfSAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICAgIC8veydzdHJpbmcnOiBvYmouYnV0dG9uc1sxXS5uYW1lfSwgLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgICAvL3snc3RyaW5nJzogb2JqLmJ1dHRvbnNbMl0ubmFtZX0gLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgXSxcbiAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLmJpbmQobnVsbCwgb2JqLmJ1dHRvbnMpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2MDZ9LFxuICAgICAgZmFsbGJhY2tGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYWxsYmFjayBwb3B1cCcsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogRm9ybWVybHkga25vd24gYXMgZ2V0QXBwSW5mb3NcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aXRoIHRoZSBBcHBEYXRhXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gICAgLy8gVE9ETzogdXNlIGZvcmNlUmVsb2FkIGFuZCBjYWNoZSBBcHBEYXRhXG4gIGdldEdsb2JhbERhdGE6IGZ1bmN0aW9uKGNhbGxiYWNrLCBmb3JjZVJlbG9hZCkge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRHbG9iYWxEYXRhOiBjYWxsYmFjayBpcyBubyB2YWxpZCBgRnVuY3Rpb25gLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWZvcmNlUmVsb2FkICYmIGdsb2JhbERhdGEpIHtcbiAgICAgIGNhbGxiYWNrKGdsb2JhbERhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE4LFxuICAgICAgd2ViRm46ICdnZXRBcHBJbmZvcycsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogJ2dldEdsb2JhbERhdGEoKSd9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWJyYXRlXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gZHVyYXRpb24gVGltZSBpbiBtaWxsaXNlY29uZHNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgdmlicmF0ZTogZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICBpZiAoIWlzTnVtYmVyKGR1cmF0aW9uKSB8fCBkdXJhdGlvbiA8IDIpIHtcbiAgICAgIGR1cmF0aW9uID0gMTUwO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE5LFxuICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogZHVyYXRpb24udG9TdHJpbmcoKX1dLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uIG5hdmlnYXRvclZpYnJhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmF2aWdhdG9yLnZpYnJhdGUoMTAwKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5pbmZvKCd2aWJyYXRlOiB0aGUgZGV2aWNlIGRvZXMgbm90IHN1cHBvcnQgdmlicmF0ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2OTUsIGlvczogMjU5Niwgd3A6IDI1MTV9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIEJhY2suXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgbmF2aWdhdGVCYWNrOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDIwLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjY5NiwgaW9zOiAyNjAwLCB3cDogMjUxNX1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW1hZ2UgVXBsb2FkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2l0aCBpbWFnZSB1cmwgYWZ0ZXIgdXBsb2FkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHVwbG9hZEltYWdlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCd1cGxvYWRJbWFnZTogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdpbWFnZVVwbG9hZENhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjEsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjcwNSwgd3A6IDI1MzgsIGlvczogMjY0Mn1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IE5GQyBDYWxsYmFja1xuICAgKiBUT0RPOiByZWZhY3RvciBhbmQgdGVzdFxuICAgKiBUT0RPOiB3aHkgdHdvIGNhbGxzP1xuICAgKiBDYW4gd2UgaW1wcm92ZSB0aGlzIHNoaXQ/IHNwbGl0IGludG8gdHdvIG1ldGhvZHNcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gZm9yIE5GQ1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICBzZXROZmNDYWxsYmFjazogZnVuY3Rpb24oY2FsbGJhY2ssIHJlc3BvbnNlKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDM3LFxuICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgIH0pICYmIGFwaUNhbGwoe1xuICAgICAgICAgIGNtZDogMzcsXG4gICAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciBjbWQgPSAocmVzcG9uc2UgPT09IG5mY1Jlc3BvbnNlRGF0YS5QZXJzb25JZCkgPyAzNyA6IDM4O1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiBjbWQgPT09IDM3ID8gMzggOiAzNyxcbiAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICB9KSAmJiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdOZmNDYWxsYmFjayd9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMzIzNCwgd3A6IDMxMjEgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWRlbyBQbGF5ZXIgQ29udHJvbHNcbiAgICogQWN1dGFsbHkgbmF0aXZlIG9ubHlcbiAgICogVE9ETzogY291bGQgdGhlb3JldGljYWxseSB3b3JrIGluIENoYXlucyBXZWJcbiAgICogVE9ETzogZXhhbXBsZT8gd2hlcmUgZG9lcyB0aGlzIHdvcms/XG4gICAqL1xuICBwbGF5ZXI6IHtcbiAgICB1c2VEZWZhdWx0VXJsOiBmdW5jdGlvbiB1c2VEZWZhdWx0VXJsKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIyLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBjaGFuZ2VVcmw6IGZ1bmN0aW9uIGNoYW5nZVVybCh1cmwpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMixcbiAgICAgICAgcGFyYW1zOiBbeydTdHJpbmcnOiB1cmx9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGhpZGVCdXR0b246IGZ1bmN0aW9uIGhpZGVCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHNob3dCdXR0b246IGZ1bmN0aW9uIHNob3dCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBhdXNlOiBmdW5jdGlvbiBwYXVzZVZpZGVvKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI0LFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwbGF5OiBmdW5jdGlvbiBwbGF5VmlkZW8oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjQsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBsYXliYWNrU3RhdHVzOiBmdW5jdGlvbiBwbGF5YmFja1N0YXR1cyhjYWxsYmFjaykge1xuXG4gICAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChudWxsLCB7XG4gICAgICAgICAgQXBwQ29udHJvbFZpc2libGU6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uSXNBcHBDb250cm9sVmlzaWJsZSxcbiAgICAgICAgICBTdGF0dXM6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uUGxheWJhY2tTdGF0dXMsXG4gICAgICAgICAgVXJsOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLlN0cmVhbVVybFxuICAgICAgICB9KTtcbiAgICAgIH0sIHRydWUpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQmx1ZXRvb3RoXG4gICAqIE9ubHkgaW4gbmF0aXZlIEFwcHMgKGlvcyBhbmQgYW5kcm9pZClcbiAgICovXG4gIGJsdWV0b290aDoge1xuICAgIExFU2VuZFN0cmVuZ3RoOiB7IC8vIFRPRE86IHdoYXQgaXMgdGhhdD9cbiAgICAgIEFkamFjZW50OiAwLFxuICAgICAgTmVhcmJ5OiAxLFxuICAgICAgRGVmYXVsdDogMixcbiAgICAgIEZhcjogM1xuICAgIH0sXG4gICAgTEVTY2FuOiBmdW5jdGlvbiBMRVNjYW4oY2FsbGJhY2spIHtcbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFU2Nhbjogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJztcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNixcbiAgICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIExFQ29ubmVjdDogZnVuY3Rpb24gTEVDb25uZWN0KGFkZHJlc3MsIGNhbGxiYWNrLCBwYXNzd29yZCkge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRUNvbm5lY3Q6IG5vIHZhbGlkIGFkZHJlc3MgcGFyYW1ldGVyJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFQ29ubmVjdDogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc1N0cmluZyhwYXNzd29yZCkgfHwgIXBhc3N3b3JkLm1hdGNoKC9eWzAtOWEtZl17NiwxMn0kL2kpKSB7XG4gICAgICAgIHBhc3N3b3JkID0gJyc7XG4gICAgICB9XG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snO1xuXG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjcsXG4gICAgICAgIHBhcmFtczogW3snc3RyaW5nJzogYWRkcmVzc30sIHsnc3RyaW5nJzogcGFzc3dvcmR9XSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogVE9ETzogY29uc2lkZXIgT2JqZWN0IGFzIHBhcmFtZXRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZGRyZXNzXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzdWJJZFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbWVhc3VyZVBvd2VyXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzZW5kU3RyZW5ndGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIExFV3JpdGU6IGZ1bmN0aW9uIExFV3JpdGUoYWRkcmVzcywgc3ViSWQsIG1lYXN1cmVQb3dlciwgc2VuZFN0cmVuZ3RoLCBjYWxsYmFjaykge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRVdyaXRlOiBubyB2YWxpZCBhZGRyZXNzIHBhcmFtZXRlcicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHN1YklkKSB8fCBzdWJJZCA8IDAgfHwgc3ViSWQgPiA0MDk1KSB7XG4gICAgICAgIHN1YklkID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihtZWFzdXJlUG93ZXIpIHx8IG1lYXN1cmVQb3dlciA8IC0xMDAgfHwgbWVhc3VyZVBvd2VyID4gMCkge1xuICAgICAgICBtZWFzdXJlUG93ZXIgPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHNlbmRTdHJlbmd0aCkgfHwgc2VuZFN0cmVuZ3RoIDwgMCB8fCBzZW5kU3RyZW5ndGggPiAzKSB7XG4gICAgICAgIHNlbmRTdHJlbmd0aCA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snLFxuICAgICAgICB1aWQgPSAnN0EwN0UxN0EtQTE4OC00MTZFLUI3QTAtNUEzNjA2NTEzRTU3JztcblxuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI4LFxuICAgICAgICBwYXJhbXM6IFtcbiAgICAgICAgICB7J3N0cmluZyc6IGFkZHJlc3N9LFxuICAgICAgICAgIHsnc3RyaW5nJzogdWlkfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzdWJJZH0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogbWVhc3VyZVBvd2VyfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzZW5kU3RyZW5ndGh9XG4gICAgICAgIF0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVE9ETzsgdXNlIGBPYmplY3RgIGFzIHBhcmFtc1xuICAvLyBUT0RPOiB3aGF0IGFyZSBvcHRpb25hbCBwYXJhbXM/IHZhbGlkYXRlIG5hbWUgYW5kIGxvY2F0aW9uP1xuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQXBwb2ludG1lbnQncyBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsb2NhdGlvbiBBcHBvaW50bWVudCdzIGxvY2F0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbZGVzY3JpcHRpb25dIEFwcG9pbnRtZW50J3MgZGVzY3JpcHRpb25cbiAgICogQHBhcmFtIHtEYXRlfSBzdGFydCBBcHBvaW50bWVudHMncyBTdGFydERhdGVcbiAgICogQHBhcmFtIHtEYXRlfSBlbmQgQXBwb2ludG1lbnRzJ3MgRW5kRGF0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNhdmVBcHBvaW50bWVudDogZnVuY3Rpb24gc2F2ZUFwcG9pbnRtZW50KG5hbWUsIGxvY2F0aW9uLCBkZXNjcmlwdGlvbiwgc3RhcnQsIGVuZCkge1xuICAgIGlmICghaXNTdHJpbmcobmFtZSkgfHwgIWlzU3RyaW5nKGxvY2F0aW9uKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogbm8gdmFsaWQgbmFtZSBhbmQvb3IgbG9jYXRpb24nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0RhdGUoc3RhcnQpIHx8ICFpc0RhdGUoZW5kKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogc3RhcnQgYW5kL29yIGVuZERhdGUgaXMgbm8gdmFsaWQgRGF0ZSBgT2JqZWN0YC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgc3RhcnQgPSBwYXJzZUludChzdGFydC5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG4gICAgZW5kID0gcGFyc2VJbnQoZW5kLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjksXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydzdHJpbmcnOiBuYW1lfSxcbiAgICAgICAgeydzdHJpbmcnOiBsb2NhdGlvbn0sXG4gICAgICAgIHsnc3RyaW5nJzogZGVzY3JpcHRpb259LFxuICAgICAgICB7J0ludGVnZXInOiBzdGFydH0sXG4gICAgICAgIHsnSW50ZWdlcic6IGVuZH1cbiAgICAgIF0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzA1NCwgaW9zOiAzMDY3LCB3cDogMzAzMH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRGF0ZVR5cGVzIEVudW1cbiAgICogc3RhcnRzIGF0IDFcbiAgICovXG4gIGRhdGVUeXBlOiB7XG4gICAgZGF0ZTogMSxcbiAgICB0aW1lOiAyLFxuICAgIGRhdGVUaW1lOiAzXG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBEYXRlXG4gICAqIE9sZDogRGF0ZVNlbGVjdFxuICAgKiBOYXRpdmUgQXBwcyBvbmx5LiBUT0RPOiBhbHNvIGluIENoYXlucyBXZWI/IEhUTUw1IERhdGVwaWNrZXIgZXRjXG4gICAqIFRPRE87IHJlY29uc2lkZXIgb3JkZXIgZXRjXG4gICAqIEBwYXJhbSB7ZGF0ZVR5cGV8TnVtYmVyfSBkYXRlVHlwZSBFbnVtIDEtMjogdGltZSwgZGF0ZSwgZGF0ZXRpbWUuIHVzZSBjaGF5bnMuZGF0ZVR5cGVcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gcHJlU2VsZWN0IFByZXNldCB0aGUgRGF0ZSAoZS5nLiBjdXJyZW50IERhdGUpXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdGhlIGNob3NlbiBEYXRlIGFzIFRpbWVzdGFtcFxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBtaW5EYXRlIE1pbmltdW0gU3RhcnREYXRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IG1heERhdGUgTWF4aW11bSBFbmREYXRlXG4gICAqL1xuICBzZWxlY3REYXRlOiBmdW5jdGlvbiBzZWxlY3REYXRlKGRhdGVUeXBlLCBwcmVTZWxlY3QsIGNhbGxiYWNrLCBtaW5EYXRlLCBtYXhEYXRlKSB7XG5cbiAgICBpZiAoIWlzTnVtYmVyKGRhdGVUeXBlKSB8fCBkYXRlVHlwZSA8PSAwKSB7XG4gICAgICBsb2cud2Fybignc2VsZWN0RGF0ZTogd3JvbmcgZGF0ZVR5cGUnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3NlbGVjdERhdGU6IGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlVmFsdWUodmFsdWUpIHtcbiAgICAgIGlmICghaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbHVlLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHByZVNlbGVjdCA9IHZhbGlkYXRlVmFsdWUocHJlU2VsZWN0KTtcbiAgICBtaW5EYXRlID0gdmFsaWRhdGVWYWx1ZShtaW5EYXRlKTtcbiAgICBtYXhEYXRlID0gdmFsaWRhdGVWYWx1ZShtYXhEYXRlKTtcblxuICAgIGxldCBkYXRlUmFuZ2UgPSAnJztcbiAgICBpZiAobWluRGF0ZSA+IC0xICYmIG1heERhdGUgPiAtMSkge1xuICAgICAgZGF0ZVJhbmdlID0gJywnICsgbWluRGF0ZSArICcsJyArIG1heERhdGU7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdzZWxlY3REYXRlQ2FsbGJhY2snO1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm4oY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QsIHRpbWUpIHtcbiAgICAgIC8vIFRPRE86IGltcG9ydGFudCB2YWxpZGF0ZSBEYXRlXG4gICAgICAvLyBUT0RPOiBjaG9vc2UgcmlnaHQgZGF0ZSBieSBkYXRlVHlwZUVudW1cbiAgICAgIGxvZy5kZWJ1ZyhkYXRlVHlwZSwgcHJlU2VsZWN0KTtcbiAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgdGltZSA/IG5ldyBEYXRlKHRpbWUpIDogLTEpO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzAsXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX0sXG4gICAgICAgIHsnSW50ZWdlcic6IGRhdGVUeXBlfSxcbiAgICAgICAgeydJbnRlZ2VyJzogcHJlU2VsZWN0ICsgZGF0ZVJhbmdlfVxuICAgICAgXSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMwNzIsIGlvczogMzA2Miwgd3A6IDMwMzB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gVVJMIGluIEFwcFxuICAgKiAob2xkIFNob3dVUkxJbkFwcClcbiAgICogbm90IHRvIGNvbmZ1c2Ugd2l0aCBvcGVuTGlua0luQnJvd3NlclxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFZpZGVvIFVSTCBzaG91bGQgY29udGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gICAgLy8gVE9ETzogaW1wbGVtZW50IENoYXlucyBXZWIgTWV0aG9kIGFzIHdlbGwgKG5hdmlnYXRlIGJhY2sgc3VwcG9ydClcbiAgb3BlblVybDogZnVuY3Rpb24gb3BlblVybCh1cmwsIHRpdGxlKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cuZXJyb3IoJ29wZW5Vcmw6IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jYXRpb24uaHJlZiA9IHVybDsgLy8gVE9ETzogbWFrZSBzdXJlIGl0IHdvcmtzXG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9LCB7J3N0cmluZyc6IHRpdGxlfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzExMCwgaW9zOiAzMDc0LCB3cDogMzA2M31cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogY3JlYXRlIFFSIENvZGVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhIFFSIENvZGUgZGF0YVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgYmFzZTY0IGVuY29kZWQgSU1HIFRPRE86IHdoaWNoIHR5cGU/XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgY3JlYXRlUVJDb2RlOiBmdW5jdGlvbiBjcmVhdGVRUkNvZGUoZGF0YSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWlzU3RyaW5nKGRhdGEpKSB7XG4gICAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ2NyZWF0ZVFSQ29kZTogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NyZWF0ZVFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzMsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGRhdGF9LCB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWVcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogc2NhbiBRUiBDb2RlXG4gICAqIFNjYW5zIFFSIENvZGUgYW5kIHJlYWQgaXRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNjYW5RUkNvZGU6IGZ1bmN0aW9uIHNjYW5RUkNvZGUoY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdzY2FuUVJDb2RlOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnc2NhblFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHNjYW4gUVIgQ29kZVxuICAgKiBTY2FucyBRUiBDb2RlIGFuZCByZWFkIGl0XG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSByZXN1bHRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBnZXRMb2NhdGlvbkJlYWNvbnM6IGZ1bmN0aW9uIGdldExvY2F0aW9uQmVhY29ucyhjYWxsYmFjaywgZm9yY2VSZWxvYWQpIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRMb2NhdGlvbkJlYWNvbnM6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdnZXRCZWFjb25zQ2FsbEJhY2soKSc7XG4gICAgaWYgKGJlYWNvbkxpc3QgJiYgIWZvcmNlUmVsb2FkKSB7IC8vIFRPRE86IG1ha2Ugc3VyZSBpdCBpcyBnb29kIHRvIGNhY2hlIHRoZSBsaXN0XG4gICAgICBsb2cuZGVidWcoJ2dldExvY2F0aW9uQmVhY29uczogdGhlcmUgaXMgYWxyZWFkeSBvbmUgYmVhY29uTGlzdCcpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwobnVsbCwgYmVhY29uTGlzdCk7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja0ZuID0gZnVuY3Rpb24gZ2V0TG9jYXRpb25CZWFjb25DYWxsYmFjayhjYWxsYmFjaywgbGlzdCkge1xuICAgICAgYmVhY29uTGlzdCA9IGxpc3Q7XG4gICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGxpc3QpO1xuICAgIH07XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzOSxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgNDA0NSwgaW9zOiA0MDQ4fSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2spXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCB0byBQYXNzYm9va1xuICAgKiBpT1Mgb25seVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFBhdGggdG8gUGFzc2Jvb2sgZmlsZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGFkZFRvUGFzc2Jvb2s6IGZ1bmN0aW9uIGFkZFRvUGFzc2Jvb2sodXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cud2FybignYWRkVG9QYXNzYm9vazogdXJsIGlzIGludmFsaWQuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA0NyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7aW9zOiA0MDQ1fSxcbiAgICAgIHdlYkZuOiBjaGF5bnNBcGlJbnRlcmZhY2Uub3BlbkxpbmtJbkJyb3dzZXIuYmluZChudWxsLCB1cmwpLFxuICAgICAgZmFsbGJhY2tGbjogY2hheW5zQXBpSW50ZXJmYWNlLm9wZW5MaW5rSW5Ccm93c2VyLmJpbmQobnVsbCwgdXJsKVxuICAgIH0pO1xuICB9XG5cbn07XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNQZXJtaXR0ZWQsIGlzRnVuY3Rpb24sIGlzQmxhbmssIGlzQXJyYXksIGlzT2JqZWN0LCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93LCBwYXJlbnR9IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInO1xuaW1wb3J0IHtlbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge3NldENhbGxiYWNrfSBmcm9tICcuL2NhbGxiYWNrcyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY29yZS5jaGF5bnNfY2FsbHMnKTtcblxuXG5mdW5jdGlvbiBjYW4odmVyc2lvbnMpIHtcbiAgcmV0dXJuIGlzUGVybWl0dGVkKHZlcnNpb25zLCBlbnZpcm9ubWVudC5vcywgZW52aXJvbm1lbnQuYXBwVmVyc2lvbik7XG59XG5cbi8vIE9TIEFwcCBWZXJzaW9uIE1hcCBmb3IgQ2hheW5zIENhbGxzIFN1cHBvcnRcbi8vIFRPRE86IG1vdmUgaW50byBlbnZpcm9ubWVudD8gKG9yIGp1c3QgcmVtb3ZlIGNhdXNlIGl0IGlzIG9ubHkgdXNlZCBvbmUgdGltZSBpbiBoZXJlKVxubGV0IG9zTWFwID0ge1xuICBjaGF5bnNDYWxsOiB7IGFuZHJvaWQ6IDI1MTAsIGlvczogMjQ4Mywgd3A6IDI0NjksIGJiOiAxMTggfVxufTtcblxuLyoqXG4gKiBQdWJsaWMgQ2hheW5zIEludGVyZmFjZVxuICogRXhlY3V0ZSBBUEkgQ2FsbFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqIEBwYXJhbSBkZWJvdW5jZVxuICogLy8gVE9ETzogbGVmdCBvZiBjYWxsYmFjayBhcyBwcm9taXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcGlDYWxsKG9iaikge1xuXG4gIGxldCBkZWJvdW5jZSA9IG9iai5kZWJvdW5jZSB8fCBmYWxzZTtcblxuICAvLyBUT0RPOiBjaGVjayBvYmoub3MgVkVSU0lPTlxuXG4gIGZ1bmN0aW9uIGV4ZWN1dGVDYWxsKGNoYXluc0NhbGxPYmopIHtcblxuICAgIGlmIChlbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsICYmIGNhbihvc01hcC5jaGF5bnNDYWxsKSkge1xuICAgICAgLy8gVE9ETzogY29uc2lkZXIgY2FsbFF1ZXVlIGFuZCBJbnRlcnZhbCB0byBwcmV2ZW50IGVycm9yc1xuICAgICAgbG9nLmRlYnVnKCdleGVjdXRlQ2FsbDogY2hheW5zIGNhbGwgJywgY2hheW5zQ2FsbE9iai5jbWQpO1xuXG4gICAgICBpZiAoJ2NiJyBpbiBjaGF5bnNDYWxsT2JqICYmIGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5jYikpIHtcbiAgICAgICAgc2V0Q2FsbGJhY2soY2hheW5zQ2FsbE9iai5jYWxsYmFja05hbWUgfHwgY2hheW5zQ2FsbE9iai5wYXJhbXNbMF0uY2FsbGJhY2ssIGNoYXluc0NhbGxPYmouY2IsIHRydWUpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGNoYXluc0NhbGxPYmouc3VwcG9ydCkgJiYgIWNhbihjaGF5bnNDYWxsT2JqLnN1cHBvcnQpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogdGhlIGNoYXlucyB2ZXJzaW9uIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgaWYgKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrIGNoYXlucyBjYWxsIHdpbGwgYmUgaW52b2tlZCcpO1xuICAgICAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbikpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrRm4gd2lsbCBiZSBpbnZva2VkJyk7XG4gICAgICAgICAgcmV0dXJuIGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbi5jYWxsKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouY21kLCBjaGF5bnNDYWxsT2JqLnBhcmFtcyk7XG5cbiAgICB9IGVsc2UgaWYgKGVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwpIHtcblxuICAgICAgaWYgKCdjYicgaW4gY2hheW5zQ2FsbE9iaiAmJiBpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouY2IpKSB7XG4gICAgICAgIHNldENhbGxiYWNrKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmouY2IpO1xuICAgICAgfVxuICAgICAgaWYgKCFjaGF5bnNDYWxsT2JqLndlYkZuKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogVGhpcyBDYWxsIGhhcyBubyB3ZWJGbicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZUNhbGw6IGNoYXlucyB3ZWIgY2FsbCAnLCBjaGF5bnNDYWxsT2JqLndlYkZuLm5hbWUgfHwgY2hheW5zQ2FsbE9iai53ZWJGbik7XG5cbiAgICAgIHJldHVybiBjaGF5bnNXZWJDYWxsKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmoud2ViUGFyYW1zIHx8IGNoYXluc0NhbGxPYmoucGFyYW1zKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IG5laXRoZXIgY2hheW5zIHdlYiBjYWxsIG5vciBjaGF5bnMgd2ViJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRlYm91bmNlKSB7XG4gICAgc2V0VGltZW91dChleGVjdXRlQ2FsbC5iaW5kKG51bGwsIG9iaiksIDEwMCk7IC8vIFRPRE86IGVycm9yP1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleGVjdXRlQ2FsbChvYmopO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGQgQ2hheW5zIENhbGwgKG9ubHkgZm9yIG5hdGl2ZSBBcHBzKVxuICogQHByaXZhdGVcblxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgY2hheW5zIGNhbGwgc3VjY2VlZGVkLCBmYWxzZSBvbiBlcnJvciAobm8gdXJsIGV0YylcbiAqL1xuZnVuY3Rpb24gY2hheW5zQ2FsbChjbWQsIHBhcmFtcykge1xuXG4gIGlmIChpc0JsYW5rKGNtZCkpIHsgLy8gMCBpcyBhIHZhbGlkIGNhbGwsIHVuZGVmaW5lZCBhbmQgbnVsbCBhcmUgbm90XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IG1pc3NpbmcgY21kIGZvciBjaGF5bnNDYWxsJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxldCB1cmwgPSBudWxsO1xuXG4gIC8vIGlmIHRoZXJlIGlzIG5vIHBhcmFtIG9yICdub25lJyB3aGljaCBtZWFucyBubyBjYWxsYmFja1xuICBpZiAoIXBhcmFtcykge1xuXG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArICcpJztcblxuICB9IGVsc2Uge1xuXG4gICAgLy8gcGFyYW1zIGV4aXN0IGhvd2V2ZXIsIGl0IGlzIG5vIGFycmF5XG4gICAgaWYgKCFpc0FycmF5KHBhcmFtcykpIHtcbiAgICAgIGxvZy5lcnJvcignY2hheW5zQ2FsbDogcGFyYW1zIGFyZSBubyBBcnJheScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcGFyYW1zIHRvIHRoZSBjaGF5bnMgY2FsbFxuICAgIGxldCBjYWxsYmFja1ByZWZpeCA9ICdfY2hheW5zQ2FsbGJhY2tzLic7XG4gICAgbGV0IGNhbGxTdHJpbmcgPSAnJztcbiAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBjYWxsQXJncyA9IFtdO1xuICAgICAgcGFyYW1zLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgbGV0IG5hbWUgPSBPYmplY3Qua2V5cyhwYXJhbSlbMF07XG4gICAgICAgIGxldCB2YWx1ZSA9IHBhcmFtW25hbWVdO1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2NhbGxiYWNrJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1xcJycgKyBjYWxsYmFja1ByZWZpeCArIHZhbHVlICsgJ1xcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdib29sJyB8fCBuYW1lID09PSAnRnVuY3Rpb24nIHx8IG5hbWUgPT09ICdJbnRlZ2VyJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2godmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKCdcXCcnICsgdmFsdWUgKyAnXFwnJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY2FsbFN0cmluZyA9ICcsJyArIGNhbGxBcmdzLmpvaW4oJywnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgY2hheW5zIHByb3RvY29sIGFuZCBob3N0IGFuZCBqb2luIGFycmF5XG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArIGNhbGxTdHJpbmcgKyAnKSc7XG4gIH1cblxuICBsb2cuZGVidWcoJ2NoYXluc0NhbGw6IHVybDogJywgdXJsKTtcblxuICB0cnkge1xuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBlYXNpZXIgaWRlbnRpZmljYXRpb24gb2YgdGhlIHJpZ2h0IGVudmlyb25tZW50XG4gICAgLy8gVE9ETzogY29uc2lkZXIgdG8gZXhlY3V0ZSB0aGUgYnJvd3NlciBmYWxsYmFjayBpbiBoZXJlIGFzIHdlbGxcbiAgICBpZiAoJ2NoYXluc0NhbGwnIGluIHdpbmRvdyAmJiBpc0Z1bmN0aW9uKHdpbmRvdy5jaGF5bnNDYWxsLmhyZWYpKSB7XG4gICAgICB3aW5kb3cuY2hheW5zQ2FsbC5ocmVmKHVybCk7XG4gICAgfSBlbHNlIGlmICgnd2Via2l0JyBpbiB3aW5kb3dcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKSB7XG4gICAgICB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKHVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy53YXJuKCdjaGF5bnNDYWxsOiBFcnJvcjogY291bGQgbm90IGV4ZWN1dGUgQ2hheW5zQ2FsbDogJywgZSk7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeGVjdXRlIGEgQ2hheW5zV2ViIENhbGwgaW4gdGhlIHBhcmVudCB3aW5kb3cuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZuIEZ1bmN0aW9uIG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbXMgQWRkaXRpb25hbFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY2hheW5zV2ViYkNhbGwgc3VjY2VlZGVkXG4gKi9cbmZ1bmN0aW9uIGNoYXluc1dlYkNhbGwoZm4sIHBhcmFtcykge1xuICBpZiAoIWZuKSB7XG4gICAgbG9nLmluZm8oJ2NoYXluc1dlYkNhbGw6IG5vIENoYXluc1dlYkNhbGwgZm4nKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAoIXBhcmFtcyB8fCBpc0FycmF5KHBhcmFtcykpIHsgLy8gQXJyYXkgaW5kaWNhdGVzIHRoYXQgdGhlc2UgYXJlIGNoYXluc0NhbGxzIHBhcmFtcyBUT0RPOiByZWZhY3RvclxuICAgIHBhcmFtcyA9ICcnO1xuICB9XG4gIGlmIChpc09iamVjdChwYXJhbXMpKSB7IC8vIGFuIEFycmF5IGlzIGFsc28gc2VlbiBhcyBPYmplY3QsIGhvd2V2ZXIgaXQgd2lsbCBiZSByZXNldCBiZWZvcmVcbiAgICBwYXJhbXMgPSBKU09OLnN0cmluZ2lmeShwYXJhbXMpO1xuICB9XG5cbiAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgcmV0dXJuIGZuLmNhbGwobnVsbCk7XG4gIH1cblxuICB2YXIgbmFtZXNwYWNlID0gJ2NoYXlucy5jdXN0b21UYWIuJztcbiAgdmFyIHVybCA9IG5hbWVzcGFjZSArIGZuICsgJzonICsgcGFyYW1zO1xuXG4gIGxvZy5kZWJ1ZygnY2hheW5zV2FiQ2FsbDogJyArIHVybCk7XG5cbiAgdHJ5IHtcbiAgICBwYXJlbnQucG9zdE1lc3NhZ2UodXJsLCAnKicpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLndhcm4oJ2NoYXluc1dlYkNhbGw6IHBvc3RNZXNzZ2FlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBjb25maWdcbiAqIEBwcml2YXRlXG4gKi9cblxuaW1wb3J0IHtpc1ByZXNlbnQsIGlzQmxhbmssIGlzVW5kZWZpbmVkLCBpc0FycmF5LCBleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBTdG9yZSBpbnRlcm5hbCBjaGF5bnMgY29uZmlndXJhdGlvblxuICogQHR5cGUge3thcHBOYW1lOiBzdHJpbmcsIGFwcFZlcnNpb246IG51bWJlciwgbG9hZE1vZGVybml6ZXI6IGJvb2xlYW4sIGxvYWRQb2x5ZmlsbHM6IGJvb2xlYW4sIHVzZUZldGNoOiBib29sZWFuLCBwcm9taXNlczogc3RyaW5nLCB1c2VPZmZsaW5lQ2FjaGluZzogYm9vbGVhbiwgdXNlTG9jYWxTdG9yYWdlOiBib29sZWFuLCBoYXNBZG1pbjogYm9vbGVhbiwgbXVsdGlMaW5ndWFsOiBib29sZWFuLCBpc1B1Ymxpc2hlZDogYm9vbGVhbiwgZGVidWdNb2RlOiBib29sZWFuLCB1c2VBamF4OiBib29sZWFufX1cbiAqIEBwcml2YXRlXG4gKi9cbnZhciBfY29uZmlnID0ge1xuICBhcHBOYW1lOiAnQ2hheW5zIEFwcCcsICAgLy8gYXBwIE5hbWVcbiAgYXBwVmVyc2lvbjogMSwgICAgICAgICAgIC8vIGFwcCBWZXJzaW9uXG4gIHByZXZlbnRFcnJvcnM6IHRydWUsICAgICAgICAvLyBlcnJvciBoYW5kbGVyIGNhbiBoaWRlIGVycm9ycyAoY2FuIGJlIG92ZXJ3dGl0dGVuIGJ5IGlzUHJvZHVjdGlvbilcbiAgaXNQcm9kdWN0aW9uOiB0cnVlLCAgICAgIC8vIHByb2R1Y3Rpb24sIGRldmVsb3BtZW50IGFuZCB0ZXN0IEVOVlxuICBsb2FkTW9kZXJuaXplcjogdHJ1ZSwgICAgLy8gbG9hZCBtb2Rlcm5pemVyXG4gIGxvYWRQb2x5ZmlsbHM6IHRydWUsICAgICAvLyBsb2FkIHBvbHlmaWxsc1xuICB1c2VGZXRjaDogdHJ1ZSwgICAgICAgICAgLy8gdXNlIHdpbmRvdy5mZXRjaCBhbmQgaXQncyBwb2x5ZmlsbHNcbiAgcHJvbWlzZXM6ICdxJywgICAgICAgICAgIC8vIHByb21pc2UgU2VydmljZTogUSBpcyBzdGFuZGFyZFxuICB1c2VPZmZsaW5lQ2FjaGluZzogZmFsc2UsLy8gaXMgb2ZmbGluZSBjYWNoaW5nIHVzZWQ/IGlubGN1ZGUgb2ZmbGluZSBoZWxwZXJcbiAgdXNlTG9jYWxTdG9yYWdlOiBmYWxzZSwgIC8vIGlzIGxvY2FsU3RvcmFnZSB1c2VkPyBpbmNsdWRlIGhlbHBlclxuICBoYXNBZG1pbjogZmFsc2UsICAgICAgICAgLy8gZG9lcyB0aGlzIGFwcC9wYWdlIGhhdmUgYW4gYWRtaW4/XG4gIG11bHRpTGluZ3VhbDogdHJ1ZSwgICAgICAvLyBlbmFibGUgaTE4bj9cbiAgaXNQdWJsaXNoZWQ6IHRydWUsICAgICAgIC8vIG9ubHkgaW4gaW50ZXJuYWwgdG9iaXQgYXZhaWxhYmxlXG4gIGRlYnVnTW9kZTogdHJ1ZSwgICAgICAgICAvLyBzaG93IGNvbnNvbGUgb3V0cHV0LCBkZWJ1ZyBwYXJhbSBmb3IgbG9nZ2luZ1xuICB1c2VBamF4OiBmYWxzZSxcbiAgaXNJbnRlcm5hbDogZmFsc2UgICAgICAgIC8vIHVzZSBpbnRlcm5hbCByb3V0aW5nXG4gIC8vZnJhbWV3b3JrOiBbJ0VtYmVyJywgJ0FuZ3VsYXInLCAnQmFja2JvbmUnLCAnQW1wZXJzYW5kJywgJ1JlYWN0JywgJ2pRdWVyeSddXG59O1xuXG4vLyBUT0RPOiByZW1vdmVcbi8qZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZygpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gQ29uZmlnLnNldChhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7IC8vIFRPRE86IHJlZmFjdG9yIHRoaXNcbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIENvbmZpZy5nZXQoYXJndW1lbnRzKTtcbiAgfVxuICByZXR1cm4gQ29uZmlnLmdldCgpO1xufSovXG5cbi8vIFRPRE86IHJlZmFjdG9yIHRvIE1hcFxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XG5cbiAgLyoqXG4gICAqIEBtZXRob2QgZ2V0XG4gICAqIEBjbGFzcyBDb25maWdcbiAgICogQG1vZHVsZSBjaGF5bnMuY29uZmlnXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgUmVmZXJlbmNlIHRoZSBga2V5YCBpbiB0aGUgY29uZmlnIGBPYmplY3RgXG4gICAqIEByZXR1cm5zIHtudWxsfSBWYWx1ZSBvZiB0aGUgYGtleWAgaW4gdGhlIGNvbmZpZyBgT2JqZWN0YFxuICAgKiAgICAgICAgICAgICAgICAgYHVuZGVmaW5lZGAgaWYgdGhlIGBrZXlgIHdhcyBub3QgZm91bmRcbiAgICovXG4gIHN0YXRpYyBnZXQoa2V5KSB7XG4gICAgaWYgKGlzUHJlc2VudChrZXkpKSB7XG4gICAgICByZXR1cm4gX2NvbmZpZ1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHBhcmFtIHZhbHVlXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIHNldChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGlzQmxhbmsoa2V5KSB8fCBpc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gVE9ETzogZ29vZCBpZGVhPyBvbmUgc2hvdWxkIGJlIGNhcmVmdWwgaSBzdXBwb3NlXG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBleHRlbmQoX2NvbmZpZywgdmFsdWUpO1xuICAgIH1cbiAgICBfY29uZmlnW2tleV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gISFrZXkgJiYgKGtleSBpbiBfY29uZmlnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzT2JqZWN0LCBET019IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge21lc3NhZ2VMaXN0ZW5lcn0gZnJvbSAnLi9jYWxsYmFja3MnO1xuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9IGZyb20gJy4vY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuXG4vLyBjcmVhdGUgbmV3IExvZ2dlciBpbnN0YW5jZVxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNvcmUnKTtcblxuLy8gZGlzYWJsZSBKUyBFcnJvcnMgaW4gdGhlIGNvbnNvbGVcbkNvbmZpZy5zZXQoJ3ByZXZlbnRFcnJvcnMnLCBmYWxzZSk7XG5cbi8qKlxuICpcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKlxuICogQHR5cGUge2Jvb2xlYW59IFRydWUgaWYgdGhlIERPTSBpcyBsb2FkZWRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciBkb21SZWFkeSA9IGZhbHNlO1xuXG4vKipcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKlxuICogQHR5cGUge2FycmF5fSBDb250YWlucyBjYWxsYmFja3MgZm9yIHRoZSBET00gcmVhZHkgZXZlbnRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciByZWFkeUNhbGxiYWNrcyA9IFtdO1xuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5wcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIodXNlckNvbmZpZykge1xuICBsb2cuaW5mbygnY2hheW5zLnJlZ2lzdGVyJyk7XG4gIENvbmZpZy5zZXQodXNlckNvbmZpZyk7IC8vIHRoaXMgcmVmZXJlbmNlIHRvIHRoZSBjaGF5bnMgb2JqXG4gIHJldHVybiB0aGlzO1xufVxuXG4vLyBUT0RPOiByZWdpc3RlciBgRnVuY3Rpb25gIG9yIHByZUNoYXlucyBgT2JqZWN0YD9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDaGF5bnMoKSB7XG4gIGlmICgncHJlQ2hheW5zJyBpbiB3aW5kb3cgJiYgaXNPYmplY3Qod2luZG93LnByZUNoYXlucykpIHtcbiAgICAvLyBmaWxsIGNvbmZpZ1xuICB9XG59XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLnByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkeShjYikge1xuICBsb2cuaW5mbygnY2hheW5zLnJlYWR5Jyk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChkb21SZWFkeSkge1xuICAgIC8vIFRPRE86IHJldHVybiBhIGN1c3RvbSBNb2RlbCBPYmplY3QgaW5zdGVhZCBvZiBgY29uZmlnYFxuICAgIGNiKHtcbiAgICAgIGFwcE5hbWU6Q29uZmlnLmdldCgnYXBwTmFtZScpLFxuICAgICAgYXBwVmVyc2lvbjogQ29uZmlnLmdldCgnYXBwVmVyc2lvbicpXG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHJlYWR5Q2FsbGJhY2tzLnB1c2goYXJndW1lbnRzWzBdKTtcbn1cblxuLyoqXG4gKiBAbmFtZSBwcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0gb2JqIFJlZmVyZW5jZSB0byBjaGF5bnMgT2JqZWN0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwKCkge1xuICBsb2cuaW5mbygnc3RhcnQgY2hheW5zIHNldHVwJyk7XG5cbiAgLy8gZW5hYmxlIGBjaGF5bnMuY3NzYCBieSBhZGRpbmcgYGNoYXluc2AgY2xhc3NcbiAgLy8gcmVtb3ZlIGBuby1qc2AgY2xhc3MgYW5kIGFkZCBganNgIGNsYXNzXG4gIGxldCBib2R5ID0gZG9jdW1lbnQuYm9keTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdjaGF5bnMnKTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdqcycpO1xuICBET00ucmVtb3ZlQ2xhc3MoYm9keSwgJ25vLWpzJyk7XG5cblxuICAvLyBydW4gcG9seWZpbGwgKGlmIHJlcXVpcmVkKVxuXG4gIC8vIHJ1biBtb2Rlcm5pemVyIChmZWF0dXJlIGRldGVjdGlvbilcblxuICAvLyBydW4gZmFzdGNsaWNrXG5cbiAgLy8gKHZpZXdwb3J0IHNldHVwKVxuXG4gIC8vIGNyYXRlIG1ldGEgdGFncyAoY29sb3JzLCBtb2JpbGUgaWNvbnMgZXRjKVxuXG4gIC8vIGRvIHNvbWUgU0VPIHN0dWZmIChjYW5vbmljYWwgZXRjKVxuXG4gIC8vIGRldGVjdCB1c2VyIChsb2dnZWQgaW4/KVxuXG4gIC8vIHJ1biBjaGF5bnMgc2V0dXAgKGNvbG9ycyBiYXNlZCBvbiBlbnZpcm9ubWVudClcblxuXG5cbiAgLy8gc2V0IERPTSByZWFkeSBldmVudFxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuXG4gICAgZG9tUmVhZHkgPSB0cnVlO1xuICAgIGxvZy5kZWJ1ZygnRE9NIHJlYWR5Jyk7XG5cbiAgICAvLyBhZGQgY2hheW5zIHJvb3QgZWxlbWVudFxuICAgIGxldCBjaGF5bnNSb290ID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtcm9vdCcpO1xuICAgIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3Jvb3QnKTtcbiAgICBET00uYXBwZW5kQ2hpbGQoYm9keSwgY2hheW5zUm9vdCk7XG5cbiAgICAvLyBkb20tcmVhZHkgY2xhc3NcbiAgICBET00uYWRkQ2xhc3MoZG9jdW1lbnQuYm9keSwgJ2RvbS1yZWFkeScpO1xuXG4gICAgLy8gZ2V0IHRoZSBBcHAgSW5mb3JtYXRpb24sIGhhcyB0byBiZSBkb25lIHdoZW4gZG9jdW1lbnQgcmVhZHlcbiAgICBsZXQgZ2V0QXBwSW5mb3JtYXRpb25DYWxsID0gIWNoYXluc0FwaUludGVyZmFjZS5nZXRHbG9iYWxEYXRhKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgLy8gbm93IENoYXlucyBpcyBvZmZpY2lhbGx5IHJlYWR5XG5cbiAgICAgIGxvZy5kZWJ1ZygnYXBwSW5mb3JtYXRpb24gY2FsbGJhY2snLCBkYXRhKTtcblxuICAgICAgcmVhZHlDYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gICAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgZGF0YSk7XG4gICAgICB9KTtcbiAgICAgIHJlYWR5Q2FsbGJhY2tzID0gW107XG5cbiAgICAgIERPTS5hZGRDbGFzcyhkb2N1bWVudC5ib2R5LCAnY2hheW5zLXJlYWR5Jyk7XG4gICAgICBET00ucmVtb3ZlQXR0cmlidXRlKERPTS5xdWVyeSgnW2NoYXlucy1jbG9ha10nKSwgJ2NoYXlucy1jbG9haycpO1xuXG4gICAgICBsb2cuaW5mbygnZmluaXNoZWQgY2hheW5zIHNldHVwJyk7XG4gICAgfSk7XG5cbiAgICBpZiAoZ2V0QXBwSW5mb3JtYXRpb25DYWxsKSB7XG4gICAgICBsb2cuZXJyb3IoJ1RoZSBBcHAgSW5mb3JtYXRpb24gY291bGQgbm90IGJlIHJldHJpZXZlZC4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHN0YXJ0IHdpbmRvdy5vbignbWVzc2FnZScpIGxpc3RlbmVyIGZvciBGcmFtZSBDb21tdW5pY2F0aW9uXG4gIG1lc3NhZ2VMaXN0ZW5lcigpO1xuXG5cbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVjdCBgQnJvd3NlcmAsIGBPU2AgYW5kICdEZXZpY2VgXG4gKiBhcyB3ZWxsIGFzIGBDaGF5bnMgRW52aXJvbm1lbnRgLCBgQ2hheW5zIFVzZXJgIGFuZCBgQ2hheW5zIFNpdGVgXG4gKiBhbmQgYXNzaWduIHRoZSBkYXRhIGludG8gdGhlIGVudmlyb25tZW50IG9iamVjdFxuICovXG5mdW5jdGlvbiBzZXRFbnZpcm9ubWVudCgpIHtcblxufVxuIiwiLyoqXG4gKiBAbW9kdWxlIGNoYXlucy5lbnZpcm9ubWVudFxuICogQGRlc2NyaXB0aW9uXG4gKiBDaGF5bnMgRW52aXJvbm1lbnRcbiAqL1xuXG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnLi4vdXRpbHMnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVudmlyb25tZW50Jyk7XG5cbi8vIFRPRE86IGltcG9ydCBkZXBlbmRlbmNpZXNcbmV4cG9ydCB2YXIgdHlwZXMgPSB7fTtcblxudHlwZXMuYnJvd3NlciA9IFtcbiAgJ2Nocm9tZScsXG4gICdmaXJlZm94JyxcbiAgJ3NhZmFyaScsXG4gICdvcGVyYScsXG4gICdjaHJvbWUgbW9iaWxlJyxcbiAgJ3NhZmFyaSBtb2JpbGUnLFxuICAnZmlyZWZveCBtb2JpbGUnXG5dO1xuXG50eXBlcy5vcyA9IFtcbiAgJ3dpbmRvd3MnLFxuICAnbWFjT1MnLFxuICAnYW5kcm9pZCcsXG4gICdpb3MnLFxuICAnd3AnXG5dO1xuXG50eXBlcy5jaGF5bnNPUyA9IHtcbiAgd2ViOiAnd2Vic2hhZG93JyxcbiAgd2ViTW9iaWxlOiAnd2Vic2hhZG93bW9iaWxlJyxcbiAgYXBwOiAnd2Vic2hhZG93bW9iaWxlJ1xufTtcblxuLy8gbG9jYXRpb24gcXVlcnkgc3RyaW5nXG52YXIgcXVlcnkgPSBsb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpO1xudmFyIHBhcmFtZXRlcnMgPSB7fTtcbnF1ZXJ5LnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihwYXJ0KSB7XG4gIHZhciBpdGVtID0gcGFydC5zcGxpdCgnPScpO1xuICBwYXJhbWV0ZXJzW2l0ZW1bMF0udG9Mb3dlckNhc2UoKV0gPSBkZWNvZGVVUklDb21wb25lbnQoaXRlbVsxXSkudG9Mb3dlckNhc2UoKTtcbn0pO1xuXG4vLyB2ZXJpZnkgYnkgY2hheW5zIHJlcXVpcmVkIHBhcmFtZXRlcnMgZXhpc3RcbmlmICghcGFyYW1ldGVycy5hcHB2ZXJzaW9uKSB7XG4gIGxvZy53YXJuKCdubyBhcHAgdmVyc2lvbiBwYXJhbWV0ZXInKTtcbn1cbmlmICghcGFyYW1ldGVycy5vcykge1xuICBsb2cud2Fybignbm8gb3MgcGFyYW1ldGVyJyk7XG59XG5pZiAocGFyYW1ldGVycy5kZWJ1Zykge1xuICAvLyBUT0RPOiBlbmFibGUgZGVidWcgbW9kZVxufVxuXG4vLyBUT0RPOiBmdXJ0aGVyIHBhcmFtcyBhbmQgY29sb3JzY2hlbWVcbi8vIFRPRE86IGRpc2N1c3Mgcm9sZSBvZiBVUkwgcGFyYW1zIGFuZCB0cnkgdG8gcmVwbGFjZSB0aGVtIGFuZCBvbmx5IHVzZSBBcHBEYXRhXG5cblxuZnVuY3Rpb24gZ2V0Rmlyc3RNYXRjaChyZWdleCkge1xuICB2YXIgbWF0Y2ggPSB1YS5tYXRjaChyZWdleCk7XG4gIHJldHVybiAobWF0Y2ggJiYgbWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaFsxXSkgfHwgJyc7XG59XG5cbi8vIHVzZXIgYWdlbnQgZGV0ZWN0aW9uXG52YXIgdXNlckFnZW50ID0gKHdpbmRvdy5uYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCkgfHwgJyc7XG5cbnZhciBpcyA9IHtcbiAgaW9zOiAvaVBob25lfGlQYWR8aVBvZC9pLnRlc3QodXNlckFnZW50KSxcbiAgYW5kcm9pZDogL0FuZHJvaWQvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHdwOiAvd2luZG93cyBwaG9uZS9pLnRlc3QodXNlckFnZW50KSxcbiAgYmI6IC9CbGFja0JlcnJ5fEJCMTB8UklNL2kudGVzdCh1c2VyQWdlbnQpLFxuXG4gIG9wZXJhOiAoISF3aW5kb3cub3BlcmEgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCcgT1BSLycpID49IDApLFxuICBmaXJlZm94OiAodHlwZW9mIEluc3RhbGxUcmlnZ2VyICE9PSAndW5kZWZpbmVkJyksXG4gIHNhZmFyaTogKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cuSFRNTEVsZW1lbnQpLmluZGV4T2YoJ0NvbnN0cnVjdG9yJykgPiAwKSxcbiAgY2hyb21lOiAoISF3aW5kb3cuY2hyb21lICYmICEoISF3aW5kb3cub3BlcmEgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCcgT1BSLycpID49IDApKSxcbiAgaWU6IGZhbHNlIHx8ICEhZG9jdW1lbnQuZG9jdW1lbnRNb2RlLFxuICBpZTExOiAvbXNpZSAxMS9pLnRlc3QodXNlckFnZW50KSxcbiAgaWUxMDogL21zaWUgMTAvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllOTogL21zaWUgOS9pLnRlc3QodXNlckFnZW50KSxcbiAgaWU4OiAvbXNpZSA4L2kudGVzdCh1c2VyQWdlbnQpLFxuXG4gIG1vYmlsZTogLyhpcGhvbmV8aXBvZHwoKD86YW5kcm9pZCk/Lio/bW9iaWxlKXxibGFja2JlcnJ5fG5va2lhKS9pLnRlc3QodXNlckFnZW50KSxcbiAgdGFibGV0OiAvKGlwYWR8YW5kcm9pZCg/IS4qbW9iaWxlKXx0YWJsZXQpL2kudGVzdCh1c2VyQWdlbnQpLFxuICBraW5kbGU6IC9cXFcoa2luZGxlfHNpbGspXFxXL2kudGVzdCh1c2VyQWdlbnQpLFxuICB0djogL2dvb2dsZXR2fHNvbnlkdHYvaS50ZXN0KHVzZXJBZ2VudClcbn07XG5cbi8vIFRPRE86IEJyb3dzZXIgVmVyc2lvbiBhbmQgT1MgVmVyc2lvbiBkZXRlY3Rpb25cblxuLy8gVE9ETzogYWRkIGZhbGxiYWNrXG52YXIgb3JpZW50YXRpb24gPSBNYXRoLmFicyh3aW5kb3cub3JpZW50YXRpb24gJSAxODApID09PSAwID8gJ3BvcnRyYWl0JyA6ICdsYW5kc2NhcGUnO1xudmFyIHZpZXdwb3J0ID0gd2luZG93LmlubmVyV2lkdGggKyAneCcgKyB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbmV4cG9ydCB2YXIgZW52aXJvbm1lbnQgPSB7XG5cbiAgLy9vczogcGFyYW1ldGVycy5vcyxcbiAgb3NWZXJzaW9uOiAxLFxuXG4gIGJyb3dzZXI6ICcnLFxuICBicm93c2VyVmVyc2lvbjogMSxcblxuICAvL2FwcFZlcnNpb246IHBhcmFtZXRlcnMuYXBwdmVyc2lvbixcblxuICAvL29yaWVudGF0aW9uOiBvcmllbnRhdGlvbixcblxuICAvL3ZpZXdwb3J0OiB2aWV3cG9ydCwgLy8gaW4gMXgxIGluIHB4XG5cbiAgLy9yYXRpbzogMSwgLy8gcGl4ZWwgcmF0aW9cblxuICAvL2lzSW5GcmFtZTogZmFsc2UsXG5cbiAgLy9pc0NoYXluc1dlYjogbnVsbCwgLy8gZGVza3RvcCBicm93c2VyLCBubyBBcHAsIG5vIG1vYmlsZVxuICAvL2lzQ2hheW5zV2ViTW9iaWxlOiBudWxsLCAvLyBtb2JpbGUgYnJvd3Nlciwgbm8gQXBwLCBubyBkZXNrdG9wXG4gIC8vaXNBcHA6IGZhbHNlLCAvLyBvdGhlcndpc2UgQnJvd3NlclxuICAvL2lzTW9iaWxlOiBudWxsLCAvLyBubyBkZXNrdG9wLCBidXQgbW9iaWxlIGJyb3dzZXIgYW5kIGFwcFxuICAvL2lzVGFibGV0OiBudWxsLCAvLyBubyBkZXNrdG9wLCBraW5kYSBtb2JpbGUsIG1vc3QgbGlrZWx5IG5vIGFwcFxuICAvL2lzRGVza3RvcDogbnVsbCwgLy8gbm8gYXBwLCBubyBtb2JpbGVcbiAgLy9pc0Jyb3dzZXI6IG51bGwsIC8vIG90aGVyd2lzZSBBcHBcblxuICAvL2lzSU9TOiBpcy5pb3MsXG4gIC8vaXNBbmRyb2lkOiBpcy5hbmRyb2lkLFxuICAvL2lzV1A6IGlzLndwLFxuICAvL2lzQkI6IGlzLmJiLFxuXG4gIC8vcGFyYW1ldGVyczogcGFyYW1ldGVycyxcbiAgLy9oYXNoOiBsb2NhdGlvbi5oYXNoLnN1YnN0cigxKSxcblxuICBzaXRlOiB7XG4gICAgc2l0ZUlkOiAxLFxuICAgIG5hbWU6ICdUb2JpdCcsXG4gICAgbG9jYXRpb25JZDogMSxcbiAgICB1cmw6ICdodHRwczovL3RvYml0LmNvbS8nLFxuICAgIHVzZVNTTDogdHJ1ZSxcbiAgICBjb2xvcnNjaGVtZTogMVxuICAgIC8vZWRpdE1vZGU6IGZhbHNlLCAvLyBmdXR1cmUgZWRpdCBtb2RlIGZvciBjb250ZW50XG4gICAgLy9pc0FkbWluTW9kZTogdHJ1ZVxuICB9LFxuXG4gIC8vIFRPRE86IGNvbnNpZGVyIFRhcHBcbiAgYXBwOiB7XG4gICAgYXBwSWQ6IDEsXG4gICAgY29uZmlnOiB7fSxcbiAgICAvL2RlZmF1bHRDb250aWY6IHt9LFxuICAgIGRvbVJlYWR5OiBmYWxzZSxcbiAgICBsb2dzOiB7XG4gICAgICBsb2c6IFtdLFxuICAgICAgZGVidWc6IFtdLFxuICAgICAgd2FybjogW11cbiAgICB9LFxuICAgIGVycm9yczogW11cbiAgfVxufTtcblxuZW52aXJvbm1lbnQucGFyYW1ldGVycyA9IHBhcmFtZXRlcnM7XG5lbnZpcm9ubWVudC5oYXNoID0gbG9jYXRpb24uaGFzaC5zdWJzdHIoMSk7XG5cbi8vIFdBVENIIE9VVCB0aGUgT1MgaXMgc2V0IGJ5IHBhcmFtZXRlciAodW5mb3J0dW5hdGVseSlcbmVudmlyb25tZW50Lm9zID0gcGFyYW1ldGVycy5vcyB8fCAnbm9PUyc7IC8vIFRPRE86IHJlZmFjdG9yIE9TXG5pZiAoaXMubW9iaWxlICYmIFsnYW5kcm9pZCcsICdpb3MnLCAnd3AnXS5pbmRleE9mKHBhcmFtZXRlcnMub3MpICE9PSAtMSkge1xuICBwYXJhbWV0ZXJzLm9zID0gdHlwZXMuY2hheW5zT1MuYXBwO1xufVxuXG4vLyBkZXRlY3Rpb24gYnkgdXNlciBhZ2VudFxuZW52aXJvbm1lbnQuaXNJT1MgPSBpcy5pb3M7XG5lbnZpcm9ubWVudC5pc0FuZHJvaWQgPSBpcy5hbmRyb2lkO1xuZW52aXJvbm1lbnQuaXNXUCA9IGlzLndwO1xuZW52aXJvbm1lbnQuaXNCQiA9IGlzLmJiO1xuXG4vLyBUT0RPOiBtYWtlIHN1cmUgdGhhdCB0aGlzIGFsd2F5cyB3b3JrcyEgKFRTUE4sIGNyZWF0ZSBpZnJhbWUgdGVzdCBwYWdlKVxuZW52aXJvbm1lbnQuaXNJbkZyYW1lID0gKHdpbmRvdyAhPT0gd2luZG93LnRvcCk7XG5cbmVudmlyb25tZW50LmlzQXBwID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLmFwcCAmJiBpcy5tb2JpbGUgJiYgIWVudmlyb25tZW50LmlzSW5GcmFtZSk7IC8vIFRPRE86IGRvZXMgdGhpcyBhbHdheXMgd29yaz9cbmVudmlyb25tZW50LmFwcFZlcnNpb24gPSBwYXJhbWV0ZXJzLmFwcHZlcnNpb247XG5cbmVudmlyb25tZW50LmlzQnJvd3NlciA9ICFlbnZpcm9ubWVudC5pc0FwcDtcblxuZW52aXJvbm1lbnQuaXNEZXNrdG9wID0gKCFpcy5tb2JpbGUgJiYgIWlzLnRhYmxldCk7XG5cbmVudmlyb25tZW50LmlzTW9iaWxlID0gaXMubW9iaWxlO1xuZW52aXJvbm1lbnQuaXNUYWJsZXQgPSBpcy50YWJsZXQ7XG5cbmVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYk1vYmlsZSkgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYikgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWIgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3AgfHwgZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGU7XG5cbi8vIGludGVybmFsIFRPRE86IG1ha2UgaXQgcHJpdmF0ZT9cbmVudmlyb25tZW50LmNhbkNoYXluc0NhbGwgPSBlbnZpcm9ubWVudC5pc0FwcDtcbmVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYjtcblxuZW52aXJvbm1lbnQudmlld3BvcnQgPSB2aWV3cG9ydDsgLy8gVE9ETzogdXBkYXRlIG9uIHJlc2l6ZT8gbm8sIGR1ZSBwZXJmb3JtYW5jZVxuZW52aXJvbm1lbnQub3JpZW50YXRpb24gPSBvcmllbnRhdGlvbjtcbmVudmlyb25tZW50LnJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG4iLCJleHBvcnQgdmFyIHVzZXIgPSB7XG4gIG5hbWU6ICdQYWNhbCBXZWlsYW5kJyxcbiAgZmlyc3ROYW1lOiAnUGFzY2FsJyxcbiAgbGFzdE5hbWU6ICdXZWlsYW5kJyxcbiAgdXNlcklkOiAxMjM0LFxuICBmYWNlYm9va0lkOiAxMjM0NSxcbiAgaXNBZG1pbjogdHJ1ZSxcbiAgdWFjR3JvdXBzOiBbXSxcbiAgbGFuZ3VhZ2U6ICdkZV9ERScsXG4gIHRva2VuOiAndG9rZW4nIC8vIFRPRE8gaW5jbHVkZSB0b2tlbiBoZXJlP1xufTtcbiIsIi8qKlxuICogQG5hbWUgamFtZXMgb3IgdG9iaVxuICogQG1vZHVsZSBqYW1lc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogIyBqYW1lcyAtIHRvYml0IGhlbHBlciBsaWJyYXJ5XG4gKiBIZWxwZXIgbGlicmFyeSBzdXBwb3J0aW5nIHRoZSBDaGF5bnMgQVBJXG4gKi9cblxuLy8gVE9ETzogbW92ZSBhbGwgdG8gaGVscGVyLmpzIG9yIHRvYmkvamFtc1xuLy8gVE9ETzogaGVscGVyLmpzIHdpdGggRVM2IGFuZCBqYXNtaW5lIChhbmQgb3IgdGFwZSlcbi8vIGluY2x1ZGUgaGVscGVyIGFzIG1haW4gbW9kdWxlXG5cbi8vIGltcG9ydGFudCBpcyogZnVuY3Rpb25zXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lzJztcblxuLy8gZXh0ZW5kIG9iamVjdCBmdW5jdGlvblxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9leHRlbmQnO1xuXG4vLyBtb2Rlcm5pemVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbW9kZXJuaXplcic7XG5cbi8vIHByb21pc2UgUVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL3Byb21pc2UnO1xuXG4vLyBwb2x5ZmlsbCAmIGFqYXggd3JhcHBlciB3aW5kb3cuZmV0Y2ggKGluc3RlYWQgb2YgJC5hamF4LCAkLmdldCwgJC5nZXRKU09OLCAkaHR0cClcbi8vIG9mZmVycyBmZXRjaCwgZmV0Y2hKU09OIChqc29uIGlzIHN0YW5kYXJkKSwgdXBsb2FkcyB7Z2V0LCBwb3N0LCBwdXQsIGRlbGV0ZX0sIGZldGNoQ1NTLCBmZXRjaEpTXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvZmV0Y2gnO1xuXG4vLyBCcm93c2VyIEFQSXMgKHdpbmRvdywgZG9jdW1lbnQsIGxvY2F0aW9uKVxuLy8gVE9ETzogY29uc2lkZXIgdG8gbm90IGJpbmQgYnJvd3NlciB0byB0aGUgdXRpbHMgYE9iamVjdGBcbi8qIGpzaGludCAtVzExNiAqL1xuLyoganNoaW50IC1XMDMzICovXG4vLyBqc2NzOmRpc2FibGUgcGFyc2VFcnJvclxuaW1wb3J0ICogYXMgYnJvd3NlciBmcm9tICcuL3V0aWxzL2Jyb3dzZXInOyAvL25vaW5zcGVjdGlvbiBCYWRFeHByZXNzaW9uU3RhdGVtZW50SlMganNoaW50IGlnbm9yZTogbGluZVxuLy8ganNjczplbmFibGUgcGFyc2VFcnJvclxuLyoganNoaW50ICtXMDMzICovXG4vKiBqc2hpbnQgK1cxMTYgKi9cbmV4cG9ydCB7YnJvd3Nlcn07XG5cbi8vIERPTVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9kb20nO1xuXG4vLyBMb2dnZXJcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvbG9nZ2VyJztcblxuLy8gQW5hbHl0aWNzXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvYW5hbHl0aWNzJztcblxuLy8gUmVtb3RlXG4vLyByZW1vdGUgZGVidWdnaW5nIGFuZCBhbmFseXNpc1xuXG4vLyBmcm9udC1lbmQgRXJyb3IgSGFuZGxlciAoY2F0Y2hlcyBlcnJvcnMsIGlkZW50aWZ5IGFuZCBhbmFseXNlcyB0aGVtKVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9lcnJvcic7XG5cbi8vIGF1dGggJiBKV1QgaGFuZGxlclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2p3dCc7XG5cbi8vIGNvb2tpZSBoYW5kbGVyICh3aWxsIGJlIHVzZWQgaW4gdGhlIGxvY2FsX3N0b3JhZ2UgYXMgZmFsbGJhY2spXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvY29va2llX2hhbmRsZXInO1xuXG4vLyBsb2NhbFN0b3JhZ2UgaGVscGVyICh3aGljaCBjb29raWUgZmFsbGJhY2spXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbG9jYWxfc3RvcmFnZSc7XG5cbi8vIG1pY3JvIGV2ZW50IGxpYnJhcnlcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXZlbnRzJztcblxuLy8gb2ZmbGluZSBjYWNoZSBoZWxwZXJcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9vZmZsaW5lX2NhY2hlJztcblxuLy8gbm90aWZpY2F0aW9uczogdG9hc3RzLCBhbGVydHMsIG1vZGFsIHBvcHVwcywgbmF0aXZlIHB1c2hcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9ub3RpZmljYXRpb25zJztcblxuLy8gaWZyYW1lIGNvbW11bmljYXRpb24gYW5kIGhlbHBlciAoQ09SUylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9pZnJhbWUnO1xuXG4vLyBwYWdlIHZpc2liaWxpdHkgQVBJXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvcGFnZV92aXNpYmlsaXR5JztcblxuLy8gRGF0ZVRpbWUgaGVscGVyIChjb252ZXJ0cyBkYXRlcywgQyMgZGF0ZSwgdGltZXN0YW1wcywgaTE4biwgdGltZSBhZ28pXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvZGF0ZXRpbWUnO1xuXG5cbi8vIGxhbmd1YWdlIEFQSSBpMThuXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbGFuZ3VhZ2UnO1xuXG4vLyBjcml0aWNhbCBjc3NcblxuLy8gbG9hZENTU1xuXG4vLyBsYXp5IGxvYWRpbmdcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sYXp5X2xvYWRpbmcnO1xuXG4vLyAoaW1hZ2UpIHByZWxvYWRlclxuLy9leHBvcnQgKiBmcm9tICcvdXRpbHMvcHJlbG9hZGVyJztcblxuLy8gaXNQZW1pdHRlZCBBcHAgVmVyc2lvbiBjaGVja1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9pc19wZXJtaXR0ZWQnO1xuXG5cbi8vIGluIEZ1dHVyZVxuLy8gaW1tdXRhYmxlXG4vLyB3ZWFrIG1hcHNcbi8vIG9ic2VydmVyXG4vLyB3ZWIgc29ja2V0cyAod3MsIFNpZ25hbFIpXG4vLyB3b3JrZXIgKHNoYXJlZCB3b3JrZXIsIGxhdGVyIHNlcnZpY2Ugd29ya2VyIGFzIHdlbGwpXG4vLyBsb2NhdGlvbiwgcHVzaFN0YXRlLCBoaXN0b3J5IGhhbmRsZXJcbi8vIGNoYXlucyBzaXRlIGFuZCBjb2RlIGFuYWx5c2VyOiBmaW5kIGRlcHJlY2F0ZWQgbWV0aG9kcywgYmFkIGNvZGUsIGlzc3VlcyBhbmQgYm90dGxlbmVja3NcblxuIiwiLyoqXG4gKiBUaGlzIG1vZHVsZSBjb250YWlucyB0aGUgQnJvd3NlciBBUElzXG4gKlxuICovXG5cbnZhciB3aW4gPSB3aW5kb3c7XG5cbi8vIHVzaW5nIG5vZGUgZ2xvYmFsIChtYWlubHkgZm9yIHRlc3RpbmcsIGRlcGVuZGVuY3kgbWFuYWdlbWVudClcbnZhciBfZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3c7XG5leHBvcnQge19nbG9iYWwgYXMgZ2xvYmFsfTtcblxuZXhwb3J0IHt3aW4gYXMgd2luZG93fTtcbmV4cG9ydCB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQ7XG5leHBvcnQgdmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuZXhwb3J0IHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuZXhwb3J0IHZhciBjaGF5bnMgPSB3aW5kb3cuY2hheW5zO1xuZXhwb3J0IHZhciBjaGF5bnNDYWxsYmFja3MgPSB3aW5kb3cuX2NoYXluc0NhbGxiYWNrcztcbmV4cG9ydCB2YXIgY2hheW5zUm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF5bnMtcm9vdCcpO1xuZXhwb3J0IHZhciBwYXJlbnQgPSB3aW5kb3cucGFyZW50O1xuZXhwb3J0IHZhciBjb25zb2xlID0gd2luZG93LmNvbnNvbGU7IC8vIE5PVEU6IHNob3VsZCBub3QgYmUgdXNlZC4gdXNlIGxvZ2dlciBpbnN0ZWFkXG5leHBvcnQgdmFyIGdjID0gd2luZG93LmdjID8gKCkgPT4gd2luZG93LmdjKCkgOiAoKSA9PiBudWxsO1xuXG4iLCIvLyBpbnNwaXJlZCBieSBBbmd1bGFyMidzIERPTVxuXG5pbXBvcnQge2RvY3VtZW50fSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtpc1VuZGVmaW5lZH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBjbGFzcyBET00ge1xuXG4gIC8vIE5PVEU6IGFsd2F5cyByZXR1cm5zIGFuIGFycmF5XG4gIHN0YXRpYyAkKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwuYmluZChkb2N1bWVudCk7XG4gIH1cblxuICAvLyBzZWxlY3RvcnNcbiAgc3RhdGljIHF1ZXJ5KHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBxdWVyeVNlbGVjdG9yKGVsLCBzZWxlY3Rvcikge1xuICAgIHJldHVybiBlbC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvckFsbChlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIG9uKGVsLCBldnQsIGxpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldnQsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjbG9uZShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuY2xvbmVOb2RlKHRydWUpO1xuICB9XG4gIHN0YXRpYyBoYXNQcm9wZXJ0eShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIG5hbWUgaW4gZWxlbWVudDtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShuYW1lKTtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeVRhZ05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKG5hbWUpO1xuICB9XG5cbiAgLy8gaW5wdXRcbiAgc3RhdGljIGdldElubmVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5pbm5lckhUTUw7XG4gIH1cbiAgc3RhdGljIGdldE91dGVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5vdXRlckhUTUw7XG4gIH1cbiAgc3RhdGljIHNldEhUTUwoZWwsIHZhbHVlKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH1cbiAgc3RhdGljIGdldFRleHQoZWwpIHtcbiAgICByZXR1cm4gZWwudGV4dENvbnRlbnQ7XG4gIH1cbiAgc3RhdGljIHNldFRleHQoZWwsIHZhbHVlKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGlucHV0IHZhbHVlXG4gIHN0YXRpYyBnZXRWYWx1ZShlbCkge1xuICAgIHJldHVybiBlbC52YWx1ZTtcbiAgfVxuICBzdGF0aWMgc2V0VmFsdWUoZWwsIHZhbHVlKSB7XG4gICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGNoZWNrYm94ZXNcbiAgc3RhdGljIGdldENoZWNrZWQoZWwpIHtcbiAgICByZXR1cm4gZWwuY2hlY2tlZDtcbiAgfVxuICBzdGF0aWMgc2V0Q2hlY2tlZChlbCwgdmFsdWUpIHtcbiAgICBlbC5jaGVja2VkID0gdmFsdWU7XG4gIH1cblxuICAvLyBjbGFzc1xuICBzdGF0aWMgY2xhc3NMaXN0KGVsZW1lbnQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWxlbWVudC5jbGFzc0xpc3QsIDApO1xuICB9XG4gIHN0YXRpYyBhZGRDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIGhhc0NsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICB9XG5cbiAgLy8gY3NzXG4gIHN0YXRpYyBjc3MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZoYXNhbHVlKSB7XG4gICAgaWYoaXNVbmRlZmluZWQoc3R5bGVWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gICAgfVxuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IHN0eWxlVmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldENTUyhlbGVtZW50LCBzdHlsZU5hbWUsIHN0eWxlVmFsdWUpIHtcbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDU1MoZWxlbWVudCwgc3R5bGVOYW1lKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gbnVsbDtcbiAgfVxuICBzdGF0aWMgZ2V0Q1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjcmVhdGVFbGVtZW50KHRhZ05hbWUsIGRvYz1kb2N1bWVudCkge1xuICAgIHJldHVybiBkb2MuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgfVxuXG4gIHN0YXRpYyByZW1vdmUoZWwpIHtcbiAgICB2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZTtcbiAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIHJldHVybiBlbDtcbiAgfVxuXG4gIHN0YXRpYyBhcHBlbmRDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLmFwcGVuZENoaWxkKG5vZGUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICB9XG5cbiAgc3RhdGljIGluc2VydEJlZm9yZShlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRBZnRlcihlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHN0YXRpYyB0YWdOYW1lKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lO1xuICB9XG5cbiAgLy8gYXR0cmlidXRlc1xuICBzdGF0aWMgZ2V0QXR0cmlidXRlKGVsZW1lbnQsIGF0dHJpYnV0ZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICB9XG4gIHN0YXRpYyBzZXRBdHRyaWJ1dGUoZWxlbWVudCwgbmFtZSwgdmFsdWUpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBFcnJvciBIYW5kbGVyIE1vZHVsZVxuICovXG5cbi8vIFRPRE86IGNvbnNpZGVyIGltcG9ydGluZyBmcm9tICcuL3V0aWxzJyBvbmx5XG5pbXBvcnQge3dpbmRvdyBhcyB3aW59IGZyb20gJy4vYnJvd3Nlcic7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHtDb25maWd9IGZyb20gJy4uL2NoYXlucy9jb25maWcnO1xuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuZXJyb3InKTtcblxud2luLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxldCBsaW5lQW5kQ29sdW1uSW5mbyA9XG4gICAgZXJyLmNvbG5vXG4gICAgICA/ICcgbGluZTonICsgZXJyLmxpbmVubyArICcsIGNvbHVtbjonICsgZXJyLmNvbG5vXG4gICAgICA6ICcgbGluZTonICsgZXJyLmxpbmVubztcblxuICBsZXQgZmluYWxFcnJvciA9IFtcbiAgICAgICdKYXZhU2NyaXB0IEVycm9yJyxcbiAgICAgIGVyci5tZXNzYWdlLFxuICAgICAgZXJyLmZpbGVuYW1lICsgbGluZUFuZENvbHVtbkluZm8gKyAnIC0+ICcgKyAgbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgICAgIDAsXG4gICAgICB0cnVlXG4gIF07XG5cbiAgLy8gVE9ETzogYWRkIHByb3BlciBFcnJvciBIYW5kbGVyXG4gIGxvZy53YXJuKGZpbmFsRXJyb3IpO1xuICBpZihDb25maWcuZ2V0KCdwcmV2ZW50RXJyb3JzJykpIHtcbiAgICBlcnIucHJldmVudERlZmF1bHQoKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KTtcbiIsIi8vIFRPRE86IHJlZmFjdG9yIGFuZCB3cml0ZSB0ZXN0c1xuLy8gVE9ETzogYWRkIGV4YW1wbGVcbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gYGBganNcbiAvLyBEZW1vXG5cbiBldmVudHMucHVibGlzaCgnL3BhZ2UvbG9hZCcsIHtcblx0dXJsOiAnL3NvbWUvdXJsL3BhdGgnIC8vIGFueSBhcmd1bWVudFxufSk7XG5cbiB2YXIgc3Vic2NyaXB0aW9uID0gZXZlbnRzLnN1YnNjcmliZSgnL3BhZ2UvbG9hZCcsIGZ1bmN0aW9uKG9iaikge1xuXHQvLyBEbyBzb21ldGhpbmcgbm93IHRoYXQgdGhlIGV2ZW50IGhhcyBvY2N1cnJlZFxufSk7XG5cbiAvLyAuLi5zb21ldGltZSBsYXRlciB3aGVyZSBJIG5vIGxvbmdlciB3YW50IHN1YnNjcmlwdGlvbi4uLlxuIHN1YnNjcmlwdGlvbi5yZW1vdmUoKTtcblxuIC8vICB2YXIgdGFyZ2V0ID0gd2luZG93LmV2ZW50ID8gd2luZG93LmV2ZW50LnNyY0VsZW1lbnQgOiBlID8gZS50YXJnZXQgOiBudWxsO1xuIGBgYFxuICovXG5leHBvcnQgdmFyIGV2ZW50cyA9IChmdW5jdGlvbigpIHtcbiAgbGV0IHRvcGljcyA9IHt9O1xuICBsZXQgb3duUHJvcGVydHkgPSB0b3BpY3MuaGFzT3duUHJvcGVydHk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uKHRvcGljLCBsaXN0ZW5lcikge1xuICAgICAgLy8gQ3JlYXRlIHRoZSB0b3BpYydzIG9iamVjdCBpZiBub3QgeWV0IGNyZWF0ZWRcbiAgICAgIGlmICghb3duUHJvcGVydHkuY2FsbCh0b3BpY3MsIHRvcGljKSkge1xuICAgICAgICB0b3BpY3NbdG9waWNdID0gW107XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCB0aGUgbGlzdGVuZXIgdG8gcXVldWVcbiAgICAgIGxldCBpbmRleCA9IHRvcGljc1t0b3BpY10ucHVzaChsaXN0ZW5lcikgLTE7XG5cbiAgICAgIC8vIFByb3ZpZGUgaGFuZGxlIGJhY2sgZm9yIHJlbW92YWwgb2YgdG9waWNcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZGVsZXRlIHRvcGljc1t0b3BpY11baW5kZXhdO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBwdWJsaXNoOiBmdW5jdGlvbih0b3BpYywgaW5mbykge1xuICAgICAgLy8gSWYgdGhlIHRvcGljIGRvZXNuJ3QgZXhpc3QsIG9yIHRoZXJlJ3Mgbm8gbGlzdGVuZXJzIGluIHF1ZXVlLCBqdXN0IGxlYXZlXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBDeWNsZSB0aHJvdWdoIHRvcGljcyBxdWV1ZSwgZmlyZSFcbiAgICAgIHRvcGljc1t0b3BpY10uZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGl0ZW0oaW5mbyAhPT0gdW5kZWZpbmVkID8gaW5mbyA6IHt9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxufSkoKTtcbiIsIi8qKlxuICogQG5hbWUgamFtZXMuZXh0ZW5kXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeHRlbmRzIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QgYnkgY29weWluZyBwcm9wZXJ0aWVzIGZyb20gdGhlIHNyYyBvYmplY3QuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cblxuaW1wb3J0IHtpc09iamVjdH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gIGlmICghaXNPYmplY3Qob2JqKSkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cbiAgdmFyIHNvdXJjZSwgcHJvcDtcbiAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICBmb3IgKHByb3AgaW4gc291cmNlKSB7XG4gICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmlzVW5kZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyB1bmRlZmluZWQuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHVuZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzRGVmaW5lZFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGVmaW5lZCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc1ByZXNlbnRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIG5laXRoZXIgdW5kZWZpbmVkIG5vciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBwcmVzZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmVzZW50KG9iaikge1xuICByZXR1cm4gb2JqICE9PSB1bmRlZmluZWQgJiYgb2JqICE9PSBudWxsO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQmxhbmtcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGVpdGhlciB1bmRlZmluZWQgb3IgbnVsbC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYmxhbmsuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JsYW5rKG9iaikge1xuICByZXR1cm4gb2JqID09PSB1bmRlZmluZWQgfHwgb2JqID09PSBudWxsO1xufVxuXG5cbi8qKlxuKiBAbmFtZSBqYW1lcy5pc1N0cmluZ1xuKiBAbW9kdWxlIGphbWVzXG4qIEBraW5kIGZ1bmN0aW9uXG4qXG4qIEBkZXNjcmlwdGlvblxuKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFN0cmluZ2AuXG4qXG4qIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYFN0cmluZ2AuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzTnVtYmVyXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBOdW1iZXJgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBOdW1iZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNPYmplY3RcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYE9iamVjdGAuXG4gKiBudWxsIGlzIG5vdCB0cmVhdGVkIGFzIGFuIG9iamVjdC5cbiAqIEluIEpTIGFycmF5cyBhcmUgb2JqZWN0c1xuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYE9iamVjdGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0FycmF5XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGFuIGBBcnJheWAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGFuIGBBcnJheWAuXG4gKi9cbmV4cG9ydCB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNGdW5jdGlvblxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgRnVuY3Rpb25gLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBGdW5jdGlvbmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEYXRlXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHZhbHVlIGlzIGEgZGF0ZS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgRGF0ZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RhdGUodmFsdWUpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5cbi8vIFRPRE86IGRvZXMgbm90IGJlbG9uZyBpbiBoZXJlXG4vKipcbiAqIEBuYW1lIHV0aWxzLnRyaW1cbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUmVtb3ZlcyB3aGl0ZXNwYWNlcy5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtTdHJpbmd8Kn0gVHJpbW1lZCAgdmFsdWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyaW0odmFsdWUpIHtcbiAgcmV0dXJuIGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKSA6IHZhbHVlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzVVVJRFxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFVVSURgIChPU0YpLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBVVUlEYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVVVJRCh2YWx1ZSkge1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB0cmltKHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWUubWF0Y2goL15bMC05YS1mXXs0fShbMC05YS1mXXs0fS0pezR9WzAtOWEtel17MTJ9JC9pKSAhPT0gbnVsbDtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNHVUlEXG4gKiBAYWxpYXMgdXRpbHMuaXNVVUlEXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgR1VJRGAgKE1pY3Jvc29mdCBTdGFuZGFyZCkuXG4gKiBJcyBhbiBhbGlhcyB0byBpc1VVSURcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgR1VJRGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0dVSUQodmFsdWUpIHtcbiAgcmV0dXJuIGlzVVVJRCh2YWx1ZSk7XG59XG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzTWFjQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE1BQyBBZGRyZXNzYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNYWNBZGRyZXNzKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXihbMC05YS1mXXsyfVstOl0pezV9WzAtOWEtZl17Mn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0JMRUFkZHJlc3NcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBCTEUgQWRkcmVzc2BcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgQkxFIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCTEVBZGRyZXNzKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpIHx8IGlzTWFjQWRkcmVzcyh2YWx1ZSk7XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3R9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5pc19wZXJtaXR0ZWQnKTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBjdXJyZW50IHVzZXIncyBPUyBhbmQgT1MgVmVyc2lvbiBpcyBoaWdoZXJcbiAqIG9yIGVxdWFsIHRvIHRoZSBwYXNzZWQgcmVmZXJlbmNlIGBPYmplY3RgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJzaW9ucyBWZXJzaW9ucyBgT2JqZWN0YCB3aXRoIHBlcm1pdHRlZCBPU3MgYW5kIHRoZWlyIHZlcnNpb24uXG4gKiBAcGFyYW0ge3N0cmluZ30gb3MgT1MgTmFtZSBhcyBsb3dlcmNhc2Ugc3RyaW5nLlxuICogQHBhcmFtIHtJbnRlZ2VyfSBhcHBWZXJzaW9uIEFwcCBWZXJzaW9uIE51bWJlciBhcyBJbnRlZ2VyICBUT0RPOiBmb3JtYXQgUkZDP1xuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGN1cnJlbnQgT1MgJiBWZXJzaW9uIGFyZSBkZWZpbmVkIGluIHRoZSB2ZXJzaW9ucyBgT2JqZWN0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIG9zLCBhcHBWZXJzaW9uKSB7XG5cbiAgaWYgKCF2ZXJzaW9ucyB8fCAhaXNPYmplY3QodmVyc2lvbnMpKSB7XG4gICAgbG9nLndhcm4oJ25vIHZlcnNpb25zIGBPYmplY3RgIHdhcyBwYXNzZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbnNbb3NdICYmIGFwcFZlcnNpb24gPj0gdmVyc2lvbnNbb3NdO1xufVxuIiwiLyoqXG4gKiBMb2dMZXZlbCBFbnVtXG4gKiBub25lIGlzIDBcbiAqIGRlYnVnIGlzIDRcbiAqIEB0eXBlIEVudW1cbiAqL1xuZXhwb3J0IHZhciBsZXZlbHMgPSB7XG4gIG5vbmU6IDAsXG4gIGVycm9yOjEsXG4gIHdhcm46MixcbiAgaW5mbzozLFxuICBkZWJ1Zzo0XG59O1xuXG4vKipcbiAqIENhbiBzdG9yZSBtdWx0aXBsZSBsb2dnZXJzXG4gKiBAdHlwZSB7YE9iamVjdGB9IGxvZ2dlcnNcbiAqL1xubGV0IGxvZ2dlcnMgPSB7fTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEFzc2lnbiB0aGUgbG9nZ2VyIG1ldGhvZC5cbiAqIEJ5IGRlZmF1bHQgdGhlIHdpbmRvdy5jb25zb2xlIGBPYmplY3RgXG4gKiBAdHlwZSBgd2luZG93LmNvbnNvbGVgXG4gKi9cbmxldCBsb2dnZXIgPSB3aW5kb3cuY29uc29sZTtcblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nIExldmVsXG4gKiB1c2UgYHNldExldmVsKG5ld0xvZ0xldmVsKWAgdG8gb3ZlcndyaXRlIHRoaXMgdmFsdWUuXG4gKiBUT0RPOiBlYWNoIGxvZ2dlciBnZXRzIGFuIG93biBsb2dMZXZlbFxuICovXG5sZXQgbG9nTGV2ZWwgPSBsZXZlbHMubm9uZTtcblxuLyoqXG4gKlxuICogQHBhcmFtIGxldmVsXG4gKiBAcGFyYW0gYXJnc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gbG9nKGxldmVsLCBhcmdzLCBwcmVmaXgpIHtcbiAgbGV0IHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICBpZiAocHJlZml4KSB7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJncyk7XG4gICAgLy9hcmdzLnVuc2hpZnQodGltZSk7IC8vIFRPRE86IGNvbnNpZGVyIHRvZ2dsZWFibGUgdGltZVxuICAgIGFyZ3MudW5zaGlmdChwcmVmaXgpO1xuICB9XG4gIGxvZ2dlcltsZXZlbCB8fCAnbG9nJ10uYXBwbHkoY29uc29sZSwgYXJncyk7XG59XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IGxvZ0xldmVsXG4gKiBpbiBvcmRlciB0byBzaG93IG9yIG5vdCBzaG93IGxvZ3NcbiAqIEBwYXJhbSBsZXZlbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TGV2ZWwobGV2ZWwpIHtcbiAgbG9nTGV2ZWwgPSBsZXZlbDtcbn1cblxuLyoqXG4gKiBHZXQgTG9nZ2VyIFNpbmdsZXRvbiBJbnN0YW5jZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIFRoZSBMb2dnZXIncyBuYW1lXG4gKiBAcmV0dXJucyB7TG9nZ2VyfSBMb2dnZXIgaW5zdGFuY2UsIGVpdGhlciBleGlzdGluZyBvbmUgb3IgY3JlYXRlcyBhIG5ldyBvbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XG4gIHJldHVybiBsb2dnZXJzW25hbWVdIHx8IChsb2dnZXJzW25hbWVdID0gbmV3IExvZ2dlcihuYW1lKSk7XG59XG5cbi8qKlxuICogTG9nZ2VyIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuXG4gIC8qKlxuICAgKiBFYWNoIGxvZ2dlciBpcyBpZGVudGlmaWVkIGJ5IGl0J3MgbmFtZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbG9nZ2VyIChlLmcuIGBjaGF5bnMuY29yZWApXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gJ1snICsgbmFtZSArICddOiAnO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlYnVnXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZGVidWcoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2RlYnVnJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgaW5mby5cbiAgICpcbiAgICogQG1ldGhvZCBpbmZvXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgaW5mbygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnaW5mbycsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nLlxuICAgKlxuICAgKiBAbWV0aG9kIHdhcm5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICB3YXJuKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2coJ3dhcm4nLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvci5cbiAgICpcbiAgICogQG1ldGhvZCBlcnJvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGVycm9yKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdlcnJvcicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxufVxuIiwiXG5pbXBvcnQge2NoYXluc30gZnJvbSAnLi9jaGF5bnMnO1xuZXhwb3J0IGRlZmF1bHQgY2hheW5zO1xuIl19
  return require('chayns');

});
