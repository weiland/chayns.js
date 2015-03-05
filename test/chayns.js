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
      webFn: function webFn() {
        var input = DOM.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("value", "");
        input.setAttribute("accept", "image/*");
        //input.setAttribute('id', 'chayns-image-upload-field);
        input.setAttribute("onchange", "imageChosen()");
        input.setAttribute("class", "chayns__upload-image");
        DOM.query("#chayns-root").appendChild(input);
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
      },
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
  //
  //if (self.fetch) {
  //  return
  //}

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
},{"_process":21}],11:[function(require,module,exports){
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

// Logger

_defaults(exports, _interopRequireWildcard(require("./utils/logger")));

// TODO: do we even need modernizer?
//export * from './utils/modernizer';

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

//let Promise = window.Promise; // otherwise import Promise
//let fetch = window.fetch; // otherwise import fetch

/**
 * Fetch JSON via GET
 *
 * @param {String} url
 * @returns {Promise} json result
 */
exports.fetchJSON = fetchJSON;

/**
 * Performs POST Request
 *
 * @param {String} url
 * @param {HTMLFormElement\FormData\URLSearchParams\USVString\Blob|BufferSource} form
 * @returns {Promise}
 */
exports.post = post;

/**
 * Post JSON
 *
 * @param {String} url
 * @param {`Object`} data
 * @returns {boolean}
 */
exports.postJSON = postJSON;

/**
 * Upload file
 * TODO: add additional params options
 * @param {String} url
 * @param {Input.file|FormData} data
 * @param {String} name
 * @returns {*}
 */
exports.upload = upload;

/**
 * Fetch text or HTML via GET
 *
 * @param {String} url
 * @returns {Promise} with test result
 */
exports.get = get;
//import {window} from './browser';
/* global fetch */

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var isFormElement = _utils.isFormElement;
var isString = _utils.isString;
var isObject = _utils.isObject;
var isFormData = _utils.isFormData;

var log = getLogger("chayns.utils.http");function fetchJSON(url) {
  return fetch(url).then(function (response) {
    return response.json();
  });
}function post(url, form) {
  if (isFormElement(form)) {
    form = new FormData(form);
  }
  return fetch(url, {
    method: "post",
    body: form
  });
}function postJSON(url, data) {
  if (isObject(data)) {
    data = JSON.stringify(data);
  } else if (!isString(data)) {
    log.warn("postJSON: invalid data");
    return false;
  }
  fetch(url, {
    method: "post",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: data
  });
}function upload(url, data, name) {
  var form = new FormData();
  if (!isFormData(data)) {
    form.append(name || "file", data);
  } else {
    form = data;
  }

  return fetch(url, {
    method: "post",
    body: form
  });
}function get(url) {
  return fetch(url).then(function (response) {
    return response.text();
  });
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":11}],18:[function(require,module,exports){
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
 * @param {*} obj Reference to check.
 * @returns {boolean} True if `value` is a `BLE Address`.
 */
exports.isBLEAddress = isBLEAddress;

/**
 * @name utils.isFormData
 * @module utils
 * @kind function
 *
 * @description
 * Determines if a reference is a FormData `Object`.
 *
 * @param {*} obj Reference to check.
 * @returns {boolean} True if `obj` is a `FormData` Object.
 */
exports.isFormData = isFormData;

/**
 * @name utils.isFormElement
 * @module utils
 * @kind function
 *
 * @description
 * Determines if a reference is a FormElement.
 *
 * @param {*} obj Reference to check.
 * @returns {boolean} True if `obj` is a `HTMLFormElement`.
 */
exports.isFormElement = isFormElement;
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
}function isFormData(obj) {
  return toString.call(obj) === "[object FormData]";
}function isFormElement(obj) {
  return toString.call(obj) === "[object HTMLFormElement]";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdXNlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9saWIvZmV0Y2hfcG9seWZpbGwuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvbGliL3Byb21pc2VfcG9seWZpbGwuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9kb20uanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXJyb3IuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXZlbnRzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2V4dGVuZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9odHRwLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2lzX3Blcm1pdHRlZC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9sb2dnZXIuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zLXVtZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0lDT1ksS0FBSyxtQ0FBb0IsU0FBUzs7QUFDOUMsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQzs7O0FBRzFCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Ozs7SUFHVixNQUFNLFdBQXVCLGlCQUFpQixFQUE5QyxNQUFNOzs7O0lBR04sV0FBVyxXQUFrQixzQkFBc0IsRUFBbkQs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LEVBQUM7QUFBQyxLQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUUsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sVUFBVSxLQUFHLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFPLFlBQVU7QUFBQyxhQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBQyxFQUFDLGFBQWEsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxZQUFVO0FBQUMsT0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxjQUFjLEVBQUEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsT0FBTyxZQUFVO0FBQUMsT0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFPLFlBQVU7QUFBQyxnQkFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUM7QUFDM2YsS0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRztBQUFDLE9BQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxTQUFTLENBQUMsMENBQTBDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRyxVQUFVLEtBQUcsT0FBTyxDQUFDLElBQUUsUUFBUSxLQUFHLE9BQU8sQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLEVBQUMsSUFBRyxDQUFDLENBQUMsV0FBVyxLQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFDOWYsQ0FBQyxDQUFDLENBQUMsS0FBSTtBQUFDLFVBQUksQ0FBQyxDQUFDLElBQUc7QUFBQyxTQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtPQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE1BQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FDemdCLElBQUksQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFHO0FBQUMsU0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQSxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksU0FBUyxDQUFDLHNEQUFzRCxDQUFDLENBQUMsQ0FBQyxPQUFNO09BQUM7S0FBQyxNQUFLLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUc7QUFBQyxPQUFDLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQzNmLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxNQUFNLElBQUUsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLEdBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLG9GQUFvRixDQUFDLENBQUMsSUFBRyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUEsQUFBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsdUhBQXVILENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUM7R0FBQyxJQUFJLENBQUMsR0FBQyxLQUFLLENBQUMsT0FBTyxHQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFNLGdCQUFnQixLQUNqZ0IsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUM7TUFBQyxDQUFDLEdBQUMsQ0FBQztNQUFDLENBQUMsR0FBQyxXQUFXLEtBQUcsT0FBTyxNQUFNLEdBQUMsTUFBTSxHQUFDLEVBQUU7TUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLGdCQUFnQixJQUFFLENBQUMsQ0FBQyxzQkFBc0I7TUFBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8saUJBQWlCLElBQUUsV0FBVyxLQUFHLE9BQU8sYUFBYSxJQUFFLFdBQVcsS0FBRyxPQUFPLGNBQWM7TUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQztNQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sT0FBTyxJQUFFLGtCQUFrQixLQUFHLENBQUEsR0FBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsRUFBQTtNQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsRUFBQSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFlBQVU7QUFBQyxXQUFPLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FDNWYsWUFBVTtBQUFDLFFBQUksQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsWUFBVTtBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUcsT0FBTyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQztBQUN0ZixHQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQUFBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLENBQUUsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBRSxRQUFRLEtBQUcsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLFdBQVcsS0FBRyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pmLEtBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsRUFBQyxXQUFXLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQztBQUFDLGVBQU8sSUFBSSxDQUFDO09BQUEsSUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBVTtBQUFDLFdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsQ0FBQTtPQUFDLE1BQUssQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUMsT0FBTyxFQUFDLENBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxVQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxHQUFDLE1BQU0sR0FBQyxXQUFXLEtBQUcsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLFFBQVEsR0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRyxDQUFDLElBQUUsU0FBUyxJQUNyZixDQUFDLENBQUMsT0FBTyxJQUFFLFFBQVEsSUFBRyxDQUFDLENBQUMsT0FBTyxJQUFFLEtBQUssSUFBRyxDQUFDLENBQUMsT0FBTyxJQUFFLE1BQU0sSUFBRyxDQUFDLENBQUMsT0FBTyxJQUFFLENBQUEsWUFBVTtBQUFDLFlBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQUMsR0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFBLEVBQUUsS0FBRyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsVUFBVSxLQUFHLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxHQUFHLEdBQUMsTUFBTSxDQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQTtHQUFDLENBQUMsR0FBQyxXQUFXLEtBQUcsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLE9BQU8sR0FBQyxNQUFNLENBQUMsT0FBTyxHQUFDLENBQUMsR0FBQyxXQUFXLEtBQUcsT0FBTyxJQUFJLEtBQUcsSUFBSSxDQUFDLFVBQVUsR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0NBQUMsQ0FBQSxDQUFFLElBQUksV0FBTSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzttRENIeFUsWUFBWTs7OzttREFHWixnQkFBZ0I7Ozs7bURBR2hCLGdCQUFnQjs7Ozs7bURBS2hCLGNBQWM7Ozs7Ozs7O0lBT2hCLE9BQU8sbUNBQU0saUJBQWlCOzs7Ozs7UUFJbEMsT0FBTyxHQUFQLE9BQU87Ozs7bURBR0QsYUFBYTs7Ozs7Ozs7OzttREFTYixlQUFlOzs7Ozs7Ozs7Ozs7O21EQVlmLGdCQUFnQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7bURBZ0NoQixzQkFBc0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUN2RnBDLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQzs7O0FBR2pCLElBQUksT0FBTyxHQUFHLE9BQU8sTUFBTSxLQUFLLFdBQVcsR0FBRyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQzNDLE1BQU0sR0FBakIsT0FBTztRQUVBLE1BQU0sR0FBYixHQUFHO0FBQ0osSUFBSSxRQUFRLFdBQVIsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDL0IsSUFBSSxRQUFRLFdBQVIsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDL0IsSUFBSSxTQUFTLFdBQVQsU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7QUFDakMsSUFBSSxNQUFNLFdBQU4sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDM0IsSUFBSSxlQUFlLFdBQWYsZUFBZSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztBQUM5QyxJQUFJLFVBQVUsV0FBVixVQUFVLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUN4RCxJQUFJLE1BQU0sV0FBTixNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUMzQixJQUFJLE9BQU8sV0FBUCxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUM3QixJQUFJLEVBQUUsV0FBRixFQUFFLEdBQUcsTUFBTSxDQUFDLEVBQUUsR0FBRztTQUFNLE1BQU0sQ0FBQyxFQUFFLEVBQUU7Q0FBQSxHQUFHO1NBQU0sSUFBSTtDQUFBLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7SUNsQm5ELFFBQVEsV0FBTyxXQUFXLEVBQTFCLFFBQVE7O0lBQ1IsV0FBVyxXQUFPLE1BQU0sRUFBeEIsV0FBVzs7SUFFTixHQUFHLFdBQUgsR0FBRztXQUFILEdBQUc7MEJBQUgsR0FBRzs7O3VCQUFILEdBQUc7QUFHUCxLQUFDOzs7O2FBQUEsV0FBQyxRQUFRLEVBQUU7QUFDakIsZUFBTyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO09BQ2pEOzs7O0FBR00sU0FBSzs7OzthQUFBLGVBQUMsUUFBUSxFQUFFO0FBQ3JCLGVBQU8sUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztPQUN6Qzs7OztBQUNNLGlCQUFhO2FBQUEsdUJBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRTtBQUNqQyxlQUFPLEVBQUUsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7T0FDbkM7Ozs7QUFDTSxvQkFBZ0I7YUFBQSwwQkFBQyxFQUFFLEVBQUUsUUFBUSxFQUFFO0FBQ3BDLGVBQU8sRUFBRSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO09BQ3RDOzs7O0FBQ00sTUFBRTthQUFBLFlBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUU7QUFDM0IsVUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7T0FDM0M7Ozs7QUFHTSxTQUFLOzs7O2FBQUEsZUFBQyxJQUFJLEVBQUU7QUFDakIsZUFBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO09BQzdCOzs7O0FBQ00sZUFBVzthQUFBLHFCQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUU7QUFDaEMsZUFBTyxJQUFJLElBQUksT0FBTyxDQUFDO09BQ3hCOzs7O0FBQ00sMEJBQXNCO2FBQUEsZ0NBQUMsT0FBTyxFQUFFLElBQUksRUFBRTtBQUMzQyxlQUFPLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUM3Qzs7OztBQUNNLHdCQUFvQjthQUFBLDhCQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUU7QUFDekMsZUFBTyxPQUFPLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDM0M7Ozs7QUFHTSxnQkFBWTs7OzthQUFBLHNCQUFDLEVBQUUsRUFBRTtBQUN0QixlQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUM7T0FDckI7Ozs7QUFDTSxnQkFBWTthQUFBLHNCQUFDLEVBQUUsRUFBRTtBQUN0QixlQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUM7T0FDckI7Ozs7QUFDTSxXQUFPO2FBQUEsaUJBQUMsRUFBRSxFQUFFLEtBQUssRUFBRTtBQUN4QixVQUFFLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztPQUN0Qjs7OztBQUNNLFdBQU87YUFBQSxpQkFBQyxFQUFFLEVBQUU7QUFDakIsZUFBTyxFQUFFLENBQUMsV0FBVyxDQUFDO09BQ3ZCOzs7O0FBQ00sV0FBTzthQUFBLGlCQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUU7QUFDeEIsVUFBRSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7T0FDeEI7Ozs7QUFHTSxZQUFROzs7O2FBQUEsa0JBQUMsRUFBRSxFQUFFO0FBQ2xCLGVBQU8sRUFBRSxDQUFDLEtBQUssQ0FBQztPQUNqQjs7OztBQUNNLFlBQVE7YUFBQSxrQkFBQyxFQUFFLEVBQUUsS0FBSyxFQUFFO0FBQ3pCLFVBQUUsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO09BQ2xCOzs7O0FBR00sY0FBVTs7OzthQUFBLG9CQUFDLEVBQUUsRUFBRTtBQUNwQixlQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUM7T0FDbkI7Ozs7QUFDTSxjQUFVO2FBQUEsb0JBQUMsRUFBRSxFQUFFLEtBQUssRUFBRTtBQUMzQixVQUFFLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztPQUNwQjs7OztBQUdNLGFBQVM7Ozs7YUFBQSxtQkFBQyxPQUFPLEVBQUU7QUFDeEIsZUFBTyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztPQUN6RDs7OztBQUNNLFlBQVE7YUFBQSxrQkFBQyxPQUFPLEVBQUUsU0FBUyxFQUFFO0FBQ2xDLGVBQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO09BQ2xDOzs7O0FBQ00sZUFBVzthQUFBLHFCQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUU7QUFDckMsZUFBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7T0FDckM7Ozs7QUFDTSxZQUFRO2FBQUEsa0JBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRTtBQUNsQyxlQUFPLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO09BQzlDOzs7O0FBR00sT0FBRzs7OzthQUFBLGFBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUU7QUFDNUMsWUFBRyxXQUFXLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDMUIsaUJBQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUNqQztBQUNELGVBQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsVUFBVSxDQUFDO09BQ3ZDOzs7O0FBQ00sVUFBTTthQUFBLGdCQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFO0FBQzVDLGVBQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsVUFBVSxDQUFDO09BQ3ZDOzs7O0FBQ00sYUFBUzthQUFBLG1CQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUU7QUFDbkMsZUFBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUM7T0FDakM7Ozs7QUFDTSxVQUFNO2FBQUEsZ0JBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRTtBQUNoQyxlQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7T0FDakM7Ozs7QUFHTSxpQkFBYTs7OzthQUFBLHVCQUFDLE9BQU8sRUFBZ0I7WUFBZCxHQUFHLGdDQUFDLFFBQVE7O0FBQ3hDLGVBQU8sR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztPQUNuQzs7OztBQUVNLFVBQU07YUFBQSxnQkFBQyxFQUFFLEVBQUU7QUFDaEIsWUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQztBQUMzQixjQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZCLGVBQU8sRUFBRSxDQUFDO09BQ1g7Ozs7QUFFTSxlQUFXO2FBQUEscUJBQUMsRUFBRSxFQUFFLElBQUksRUFBRTtBQUMzQixVQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ3RCOzs7O0FBQ00sZUFBVzthQUFBLHFCQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUU7QUFDM0IsVUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUN0Qjs7OztBQUVNLGdCQUFZO2FBQUEsc0JBQUMsRUFBRSxFQUFFLElBQUksRUFBRTtBQUM1QixVQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7T0FDdEM7Ozs7QUFFTSxlQUFXO2FBQUEscUJBQUMsRUFBRSxFQUFFLElBQUksRUFBRTtBQUMzQixVQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDO09BQ2xEOzs7O0FBRU0sV0FBTzthQUFBLGlCQUFDLE9BQU8sRUFBRTtBQUN0QixlQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUM7T0FDeEI7Ozs7QUFHTSxnQkFBWTs7OzthQUFBLHNCQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUU7QUFDdEMsZUFBTyxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO09BQ3hDOzs7O0FBQ00sZ0JBQVk7YUFBQSxzQkFBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRTtBQUN4QyxlQUFPLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztPQUNuQzs7OztBQUNNLG1CQUFlO2FBQUEseUJBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRTtBQUN6QyxZQUFJLENBQUMsT0FBTyxFQUFFO0FBQ1osaUJBQU8sT0FBTyxDQUFDO1NBQ2hCO0FBQ0QsZUFBTyxPQUFPLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO09BQzNDOzs7Ozs7U0E3SVUsR0FBRzs7Ozs7Ozs7Ozs7Ozs7OztJQ0FFLEdBQUcsV0FBTyxXQUFXLEVBQS9CLE1BQU07O0lBQ04sU0FBUyxXQUFPLFVBQVUsRUFBMUIsU0FBUzs7SUFDVCxNQUFNLFdBQU8sa0JBQWtCLEVBQS9CLE1BQU07O0FBRWQsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDOztBQUVwQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFVBQVMsR0FBRyxFQUFFO0FBQzFDLE1BQUksaUJBQWlCLEdBQ25CLEdBQUcsQ0FBQyxLQUFLLEdBQ0wsUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsV0FBVyxHQUFHLEdBQUcsQ0FBQyxLQUFLLEdBQy9DLFFBQVEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDOztBQUU1QixNQUFJLFVBQVUsR0FBRyxDQUNiLGtCQUFrQixFQUNsQixHQUFHLENBQUMsT0FBTyxFQUNYLEdBQUcsQ0FBQyxRQUFRLEdBQUcsaUJBQWlCLEdBQUcsTUFBTSxHQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQ2hFLENBQUMsRUFDRCxJQUFJLENBQ1AsQ0FBQzs7O0FBR0YsS0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNyQixNQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUU7QUFDOUIsT0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO0dBQ3RCO0FBQ0QsU0FBTyxLQUFLLENBQUM7Q0FDZCxDQUFDLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDVkksSUFBSSxNQUFNLFdBQU4sTUFBTSxHQUFHLENBQUMsWUFBVztBQUM5QixNQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDaEIsTUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQzs7QUFFeEMsU0FBTztBQUNMLGFBQVMsRUFBRSxtQkFBUyxLQUFLLEVBQUUsUUFBUSxFQUFFOztBQUVuQyxVQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUU7QUFDcEMsY0FBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztPQUNwQjs7O0FBR0QsVUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRSxDQUFDLENBQUM7OztBQUc1QyxhQUFPO0FBQ0wsY0FBTSxFQUFFLGtCQUFXO0FBQ2pCLGlCQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM3QjtPQUNGLENBQUM7S0FDSDs7QUFFRCxXQUFPLEVBQUUsaUJBQVMsS0FBSyxFQUFFLElBQUksRUFBRTs7QUFFN0IsVUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFO0FBQ3BDLGVBQU87T0FDUjs7O0FBR0QsWUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLElBQUksRUFBRTtBQUNuQyxZQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7T0FDdEMsQ0FBQyxDQUFDO0tBQ0o7R0FDRixDQUFDO0NBRUgsQ0FBQSxFQUFHLENBQUM7Ozs7Ozs7O1FDNUNXLE1BQU0sR0FBTixNQUFNOzs7Ozs7Ozs7OztJQUZkLFFBQVEsV0FBTyxNQUFNLEVBQXJCLFFBQVE7O0FBRVQsU0FBUyxNQUFNLENBQUMsR0FBRyxFQUFFO0FBQzFCLE1BQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDbEIsV0FBTyxHQUFHLENBQUM7R0FDWjtBQUNELE1BQUksTUFBTSxFQUFFLElBQUksQ0FBQztBQUNqQixPQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzFELFVBQU0sR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEIsU0FBSyxJQUFJLElBQUksTUFBTSxFQUFFO0FBQ25CLFNBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDMUI7R0FDRjtBQUNELFNBQU8sR0FBRyxDQUFDO0NBQ1o7Ozs7Ozs7Ozs7Ozs7Ozs7O1FDRGUsU0FBUyxHQUFULFNBQVM7Ozs7Ozs7OztRQWNULElBQUksR0FBSixJQUFJOzs7Ozs7Ozs7UUFpQkosUUFBUSxHQUFSLFFBQVE7Ozs7Ozs7Ozs7UUF5QlIsTUFBTSxHQUFOLE1BQU07Ozs7Ozs7O1FBb0JOLEdBQUcsR0FBSCxHQUFHOzs7O3FCQTNGVixVQUFVOztJQUxqQixTQUFTLFVBQVQsU0FBUztJQUNULGFBQWEsVUFBYixhQUFhO0lBQ2IsUUFBUSxVQUFSLFFBQVE7SUFDUixRQUFRLFVBQVIsUUFBUTtJQUNSLFVBQVUsVUFBVixVQUFVOztBQUdaLElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEFBYWxDLFNBQVMsU0FBUyxDQUFDLEdBQUcsRUFBRTtBQUM3QixTQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FDZCxJQUFJLENBQUMsVUFBUyxRQUFRLEVBQUU7QUFDdkIsV0FBTyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7R0FDeEIsQ0FBQyxDQUFDO0NBQ04sQUFTTSxTQUFTLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQzlCLE1BQUksYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3ZCLFFBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztHQUMzQjtBQUNELFNBQU8sS0FBSyxDQUFDLEdBQUcsRUFBRTtBQUNoQixVQUFNLEVBQUUsTUFBTTtBQUNkLFFBQUksRUFBRSxJQUFJO0dBQ1gsQ0FBQyxDQUFDO0NBQ0osQUFTTSxTQUFTLFFBQVEsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQ2xDLE1BQUksUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ2xCLFFBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0dBQzdCLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUMxQixPQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDbkMsV0FBTyxLQUFLLENBQUM7R0FDZDtBQUNELE9BQUssQ0FBQyxHQUFHLEVBQUU7QUFDVCxVQUFNLEVBQUUsTUFBTTtBQUNkLFdBQU8sRUFBRTtBQUNQLGNBQVUsa0JBQWtCO0FBQzVCLG9CQUFjLEVBQUUsa0JBQWtCO0tBQ25DO0FBQ0QsUUFBSSxFQUFFLElBQUk7R0FDWCxDQUFDLENBQUM7Q0FDSixBQVVNLFNBQVMsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO0FBQ3RDLE1BQUksSUFBSSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7QUFDMUIsTUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUNyQixRQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7R0FDbkMsTUFBTTtBQUNMLFFBQUksR0FBRyxJQUFJLENBQUM7R0FDYjs7QUFFRCxTQUFPLEtBQUssQ0FBQyxHQUFHLEVBQUU7QUFDaEIsVUFBTSxFQUFFLE1BQU07QUFDZCxRQUFJLEVBQUUsSUFBSTtHQUNYLENBQUMsQ0FBQztDQUNKLEFBUU0sU0FBUyxHQUFHLENBQUMsR0FBRyxFQUFFO0FBQ3ZCLFNBQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUNkLElBQUksQ0FBQyxVQUFTLFFBQVEsRUFBRTtBQUN2QixXQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztHQUN4QixDQUFDLENBQUM7Q0FDTjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztRQzdGZSxXQUFXLEdBQVgsV0FBVzs7Ozs7Ozs7Ozs7OztRQWVYLFNBQVMsR0FBVCxTQUFTOzs7Ozs7Ozs7Ozs7O1FBZVQsU0FBUyxHQUFULFNBQVM7Ozs7Ozs7Ozs7Ozs7UUFlVCxPQUFPLEdBQVAsT0FBTzs7Ozs7Ozs7Ozs7OztRQWdCUCxRQUFRLEdBQVIsUUFBUTs7Ozs7Ozs7Ozs7OztRQWVSLFFBQVEsR0FBUixRQUFROzs7Ozs7Ozs7Ozs7O1FBZVIsUUFBUSxHQUFSLFFBQVE7Ozs7Ozs7Ozs7Ozs7UUEwQlIsVUFBVSxHQUFWLFVBQVU7Ozs7Ozs7Ozs7Ozs7UUFlVixNQUFNLEdBQU4sTUFBTTs7Ozs7Ozs7Ozs7Ozs7UUFnQk4sSUFBSSxHQUFKLElBQUk7Ozs7Ozs7Ozs7Ozs7UUFlSixNQUFNLEdBQU4sTUFBTTs7Ozs7Ozs7Ozs7Ozs7O1FBcUJOLE1BQU0sR0FBTixNQUFNOzs7Ozs7Ozs7Ozs7O1FBY04sWUFBWSxHQUFaLFlBQVk7Ozs7Ozs7Ozs7Ozs7UUFtQlosWUFBWSxHQUFaLFlBQVk7Ozs7Ozs7Ozs7Ozs7UUFlWixVQUFVLEdBQVYsVUFBVTs7Ozs7Ozs7Ozs7OztRQWVWLGFBQWEsR0FBYixhQUFhO0FBdlB0QixTQUFTLFdBQVcsQ0FBQyxLQUFLLEVBQUU7QUFDakMsU0FBTyxPQUFPLEtBQUssS0FBSyxXQUFXLENBQUM7Q0FDckMsQUFhTSxTQUFTLFNBQVMsQ0FBQyxLQUFLLEVBQUU7QUFDL0IsU0FBTyxPQUFPLEtBQUssS0FBSyxXQUFXLENBQUM7Q0FDckMsQUFhTSxTQUFTLFNBQVMsQ0FBQyxHQUFHLEVBQUU7QUFDN0IsU0FBTyxHQUFHLEtBQUssU0FBUyxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUM7Q0FDMUMsQUFhTSxTQUFTLE9BQU8sQ0FBQyxHQUFHLEVBQUU7QUFDM0IsU0FBTyxHQUFHLEtBQUssU0FBUyxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUM7Q0FDMUMsQUFjTSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUU7QUFDOUIsU0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUM7Q0FDbEMsQUFhTSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUU7QUFDOUIsU0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLENBQUM7Q0FDbEMsQUFhTSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUU7QUFDOUIsU0FBTyxLQUFLLEtBQUssSUFBSSxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQztDQUNwRDs7Ozs7Ozs7Ozs7QUFXTSxJQUFJLE9BQU8sV0FBUCxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxBQWE1QixTQUFTLFVBQVUsQ0FBQyxLQUFLLEVBQUU7QUFDaEMsU0FBTyxPQUFPLEtBQUssS0FBSyxVQUFVLENBQUM7Q0FDcEMsQUFhTSxTQUFTLE1BQU0sQ0FBQyxLQUFLLEVBQUU7QUFDNUIsU0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLGVBQWUsQ0FBQztDQUNqRCxBQWNNLFNBQVMsSUFBSSxDQUFDLEtBQUssRUFBRTtBQUMxQixTQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUM7Q0FDbEUsQUFhTSxTQUFTLE1BQU0sQ0FBQyxLQUFLLEVBQUU7QUFDNUIsTUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDbkIsU0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNwQixXQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsNkNBQTZDLENBQUMsS0FBSyxJQUFJLENBQUM7R0FDNUU7QUFDRCxTQUFPLEtBQUssQ0FBQztDQUNkLEFBZU0sU0FBUyxNQUFNLENBQUMsS0FBSyxFQUFFO0FBQzVCLFNBQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQ3RCLEFBWU0sU0FBUyxZQUFZLENBQUMsS0FBSyxFQUFFO0FBQ2xDLE1BQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQ25CLFNBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDcEIsV0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxDQUFDLEtBQUssSUFBSSxDQUFDO0dBQ25FO0FBQ0QsU0FBTyxLQUFLLENBQUM7Q0FDZCxBQWFNLFNBQVMsWUFBWSxDQUFDLEtBQUssRUFBRTtBQUNsQyxTQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDN0MsQUFhTSxTQUFTLFVBQVUsQ0FBQyxHQUFHLEVBQUU7QUFDOUIsU0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLG1CQUFtQixDQUFDO0NBQ25ELEFBYU0sU0FBUyxhQUFhLENBQUMsR0FBRyxFQUFFO0FBQ2pDLFNBQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSywwQkFBMEIsQ0FBQztDQUMxRDs7Ozs7Ozs7Ozs7Ozs7Ozs7O1FDdlBlLFdBQVcsR0FBWCxXQUFXOztxQkFiTyxVQUFVOztJQUFwQyxTQUFTLFVBQVQsU0FBUztJQUFFLFFBQVEsVUFBUixRQUFROztBQUMzQixJQUFJLEdBQUcsR0FBRyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxBQVkxQyxTQUFTLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRTs7QUFFcEQsTUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtBQUNwQyxPQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7QUFDNUMsV0FBTyxLQUFLLENBQUM7R0FDZDs7QUFFRCxTQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxVQUFVLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ25EOzs7Ozs7Ozs7Ozs7Ozs7OztRQ21DZSxRQUFRLEdBQVIsUUFBUTs7Ozs7OztRQVNSLFNBQVMsR0FBVCxTQUFTOzs7Ozs7O0FBM0RsQixJQUFJLE1BQU0sV0FBTixNQUFNLEdBQUc7QUFDbEIsTUFBSSxFQUFFLENBQUM7QUFDUCxPQUFLLEVBQUMsQ0FBQztBQUNQLE1BQUksRUFBQyxDQUFDO0FBQ04sTUFBSSxFQUFDLENBQUM7QUFDTixPQUFLLEVBQUMsQ0FBQztDQUNSLENBQUM7Ozs7OztBQU1GLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQzs7Ozs7Ozs7QUFRakIsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQzs7Ozs7OztBQU81QixJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDOzs7Ozs7OztBQVEzQixTQUFTLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtBQUNoQyxNQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztBQUNsQyxNQUFJLE1BQU0sRUFBRTtBQUNWLFFBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUV4QixRQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0dBQ3RCO0FBQ0QsUUFBTSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQzdDLEFBT00sU0FBUyxRQUFRLENBQUMsS0FBSyxFQUFFO0FBQzlCLFVBQVEsR0FBRyxLQUFLLENBQUM7Q0FDbEIsQUFPTSxTQUFTLFNBQVMsQ0FBQyxJQUFJLEVBQUU7QUFDOUIsU0FBTyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBLEFBQUMsQ0FBQztDQUM1RDs7Ozs7O0lBS1ksTUFBTSxXQUFOLE1BQU07Ozs7Ozs7QUFNTixXQU5BLE1BQU0sQ0FNTCxJQUFJOzBCQU5MLE1BQU07O0FBT2YsUUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQztHQUNoQzs7dUJBUlUsTUFBTTtBQWdCakIsU0FBSzs7Ozs7Ozs7O2FBQUEsaUJBQUc7QUFDTixZQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUU7QUFDaEIsaUJBQU87U0FDUjtBQUNELFdBQUcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNwQzs7OztBQVFELFFBQUk7Ozs7Ozs7OzthQUFBLGdCQUFHO0FBQ0wsWUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFO0FBQ2hCLGlCQUFPO1NBQ1I7QUFDRCxXQUFHLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDbkM7Ozs7QUFTRCxRQUFJOzs7Ozs7Ozs7YUFBQSxnQkFBRztBQUNMLFlBQUksUUFBUSxHQUFHLENBQUMsRUFBRTtBQUNoQixpQkFBTztTQUNSOztBQUVELFdBQUcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNuQzs7OztBQVFELFNBQUs7Ozs7Ozs7OzthQUFBLGlCQUFHO0FBQ04sWUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFO0FBQ2hCLGlCQUFPO1NBQ1I7QUFDRCxXQUFHLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDcEM7Ozs7OztTQTlEVSxNQUFNOzs7Ozs7OztBQ3hFbkI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0lDckZRLE1BQU0sV0FBTyxVQUFVLEVBQXZCLE1BQU07O2lCQUNDLE1BQU0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAbmFtZSBjaGF5bnMgQVBJXG4gKiBAbW9kdWxlIGNoYXluc1xuICovXG5cbi8vIGhlbHBlclxuLy8gVE9ETzogZWl0aGVyIGluZGV4LmpzLCB1dGlscy5qcyBvciBqdXN0IHRoZSBzaW5nbGUgZmlsZXNcbmltcG9ydCAqIGFzIHV0aWxzICAgICAgICAgICAgICAgZnJvbSAnLi91dGlscyc7XG52YXIgZXh0ZW5kID0gdXRpbHMuZXh0ZW5kO1xuXG4vLyBzZXQgbG9nTGV2ZWwgdG8gaW5mb1xudXRpbHMuc2V0TGV2ZWwoNCk7IC8vIFRPRE86IGRvbid0IHNldCB0aGUgbGV2ZWwgaGVyZVxuXG4vLyBiYXNpYyBjb25maWdcbmltcG9ydCB7Y29uZmlnfSAgICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY29uZmlnJztcblxuLy8gZW52aXJvbm1lbnRcbmltcG9ydCB7ZW52aXJvbm1lbnR9ICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvZW52aXJvbm1lbnQnO1xuXG4vLyAoY3VycmVudCkgdXNlclxuaW1wb3J0IHt1c2VyfSAgICAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy91c2VyJztcblxuaW1wb3J0IFByb21pc2UgZnJvbSAgJy4vbGliL3Byb21pc2VfcG9seWZpbGwnO1xuUHJvbWlzZS5wb2x5ZmlsbCgpOyAvLyBhdXRvbG9hZCBQcm9taXNlIHBvbHlmaWxsXG4vLyBUT0RPOiBhZGQgRGVmZXJyZWQ/XG5cbmltcG9ydCAnLi9saWIvZmV0Y2hfcG9seWZpbGwnO1xuXG4vLyBjb3JlIGZ1bmN0aW9uc1xuaW1wb3J0IHtyZWFkeSwgcmVnaXN0ZXIsIHNldHVwfSBmcm9tICcuL2NoYXlucy9jb3JlJztcblxuLy8gY2hheW5zIGNhbGxzXG5cbmltcG9ydCB7YXBpQ2FsbH0gICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY2hheW5zX2NhbGxzJztcblxuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9ICAgICBmcm9tICcuL2NoYXlucy9jaGF5bnNfYXBpX2ludGVyZmFjZSc7XG5cblxuLy8gcHVibGljIGNoYXlucyBvYmplY3RcbmV4cG9ydCB2YXIgY2hheW5zID0ge307XG5cbmV4dGVuZChjaGF5bnMsIHtnZXRMb2dnZXI6IHV0aWxzLmdldExvZ2dlcn0pOyAvLyBqc2hpbnQgaWdub3JlOiBsaW5lXG5leHRlbmQoY2hheW5zLCB7dXRpbHN9KTtcbmV4dGVuZChjaGF5bnMsIHtWRVJTSU9OOiAnMC4xLjAnfSk7XG4vL2V4dGVuZChjaGF5bnMsIHtjb25maWd9KTsgLy8gVE9ETzogdGhlIGNvbmZpZyBgT2JqZWN0YCBzaG91bGQgbm90IGJlIGV4cG9zZWRcblxuZXh0ZW5kKGNoYXlucywge2VudjogZW52aXJvbm1lbnR9KTsgLy8gVE9ETzogZ2VuZXJhbGx5IHJlbmFtZVxuZXh0ZW5kKGNoYXlucywge3VzZXJ9KTtcblxuZXh0ZW5kKGNoYXlucywge3JlZ2lzdGVyfSk7XG5leHRlbmQoY2hheW5zLCB7cmVhZHl9KTtcblxuZXh0ZW5kKGNoYXlucywge2FwaUNhbGx9KTtcblxuLy8gYWRkIGFsbCBjaGF5bnNBcGlJbnRlcmZhY2UgbWV0aG9kcyBkaXJlY3RseSB0byB0aGUgYGNoYXluc2AgT2JqZWN0XG5leHRlbmQoY2hheW5zLCBjaGF5bnNBcGlJbnRlcmZhY2UpO1xuXG4vLyBzZXR1cCBjaGF5bnNcbnNldHVwKCk7XG5cblxuLy8gY2hheW5zIHB1Ymxpc2ggbm8gVU1EXG4vL3dpbmRvdy5jaGF5bnMgPSBjaGF5bnM7XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNGdW5jdGlvbiwgaXNVbmRlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93fSBmcm9tICcuLi91dGlscy9icm93c2VyJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jYWxsYmFja3MnKTtcblxubGV0IG5vb3AgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbmxldCBjYWxsYmFja3MgPSB7fTtcbi8qKlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBGdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzQ2hheW5zQ2FsbCBJZiB0cnVlIHRoZW4gdGhlIGNhbGwgd2lsbCBiZSBhc3NpZ25lZCB0byBgY2hheW5zLl9jYWxsYmFja3NgXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBwYXJhbWV0ZXJzIGFyZSB2YWxpZCBhbmQgdGhlIGNhbGxiYWNrIHdhcyBzYXZlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Q2FsbGJhY2sobmFtZSwgZm4sIGlzQ2hheW5zQ2FsbCkge1xuXG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogbmFtZSBpcyB1bmRlZmluZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFpc0Z1bmN0aW9uKGZuKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogZm4gaXMgbm8gRnVuY3Rpb24nKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAobmFtZS5pbmRleE9mKCcoKScpICE9PSAtMSkgeyAvLyBzdHJpcCAnKCknXG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgnKCknLCAnJyk7XG4gIH1cblxuICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiBzZXQgQ2FsbGJhY2s6ICcgKyBuYW1lKTtcbiAgLy9pZiAobmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgLy8gIGNhbGxiYWNrc1tuYW1lXS5wdXNoKGZuKTsgLy8gVE9ETzogcmVjb25zaWRlciBBcnJheSBzdXBwb3J0XG4gIC8vfSBlbHNlIHtcbiAgICBjYWxsYmFja3NbbmFtZV0gPSBmbjsgLy8gQXR0ZW50aW9uOiB3ZSBzYXZlIGFuIEFycmF5XG4gIC8vfVxuXG4gIGlmIChpc0NoYXluc0NhbGwpIHtcbiAgICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiByZWdpc3RlciBmbiBhcyBnbG9iYWwgY2FsbGJhY2snKTtcbiAgICB3aW5kb3cuX2NoYXluc0NhbGxiYWNrc1tuYW1lXSA9IGNhbGxiYWNrKG5hbWUsICdDaGF5bnNDYWxsJyk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZWdpc3RlciBjYWxsYmFja3MgZm9yIENoYXluc0NhbGxzIGFuZCBDaGF5bnNXZWJDYWxsc1xuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gY2FsbGJhY2tOYW1lIE5hbWUgb2YgdGhlIEZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBFaXRoZXIgJ0NoYXluc1dlYkNhbGwnIG9yICdDaGF5bnNDYWxsJ1xuICogQHJldHVybnMge0Z1bmN0aW9ufSBoYW5kbGVEYXRhIFJlY2VpdmVzIGNhbGxiYWNrIGRhdGFcbiAqL1xuZnVuY3Rpb24gY2FsbGJhY2soY2FsbGJhY2tOYW1lLCB0eXBlKSB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZURhdGEoKSB7XG5cbiAgICBpZiAoY2FsbGJhY2tOYW1lIGluIGNhbGxiYWNrcykge1xuICAgICAgbG9nLmRlYnVnKCdpbnZva2UgY2FsbGJhY2s6ICcsIGNhbGxiYWNrTmFtZSwgJ3R5cGU6JywgdHlwZSk7XG4gICAgICB2YXIgZm4gPSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICBmbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAvL2RlbGV0ZSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTsgLy8gVE9ETzogY2Fubm90IGJlIGxpa2UgdGhhdCwgcmVtb3ZlIGFycmF5P1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLndhcm4oJ2NhbGxiYWNrIGlzIG5vIGZ1bmN0aW9uJywgY2FsbGJhY2tOYW1lLCBmbik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5pbmZvKCdjYWxsYmFjayAnICsgY2FsbGJhY2tOYW1lICsgJyBkaWQgbm90IGV4aXN0IGluIGNhbGxiYWNrcyBhcnJheScpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMuX2NhbGxiYWNrc1xuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIENoYXlucyBDYWxsIENhbGxiYWNrc1xuICogd2lsbCBiZSBhc3NpZ25lZCB0byB0aGUgYGNoYXlucy5fY2FsbGJhY2tzYCBvYmplY3RcbiAqXG4gKiBAdHlwZSB7T2JqZWN0fSBjaGF5bnNDYWxsc0NhbGxiYWNrc1xuICovXG53aW5kb3cuX2NoYXluc0NhbGxiYWNrcyA9IHtcbiAgLy8vLyBUT0RPOiB3cmFwIGNhbGxiYWNrIGZ1bmN0aW9uIChEUlkpXG4gIC8vZ2V0R2xvYmFsRGF0YTogY2FsbGJhY2soJ2dldEdsb2JhbERhdGEnLCAnQ2hheW5zQ2FsbCcpIC8vIGV4YW1wbGVcbiAgZ2V0R2VvTG9jYXRpb25DYWxsYmFjazogbm9vcFxufTtcblxuXG4vLyBUT0RPOiBtb3ZlIHRvIGFub3RoZXIgZmlsZT8gY29yZSwgY2hheW5zX2NhbGxzXG52YXIgbWVzc2FnZUxpc3RlbmluZyA9IGZhbHNlO1xuZXhwb3J0IGZ1bmN0aW9uIG1lc3NhZ2VMaXN0ZW5lcigpIHtcbiAgaWYgKG1lc3NhZ2VMaXN0ZW5pbmcpIHtcbiAgICBsb2cuaW5mbygndGhlcmUgaXMgYWxyZWFkeSBvbmUgbWVzc2FnZSBsaXN0ZW5lciBvbiB3aW5kb3cnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgbWVzc2FnZUxpc3RlbmluZyA9IHRydWU7XG4gIGxvZy5kZWJ1ZygnbWVzc2FnZSBsaXN0ZW5lciBpcyBzdGFydGVkJyk7XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiBvbk1lc3NhZ2UoZSkge1xuXG4gICAgbG9nLmRlYnVnKCduZXcgbWVzc2FnZSAnKTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSAnY2hheW5zLmN1c3RvbVRhYi4nLFxuICAgICAgZGF0YSA9IGUuZGF0YTtcblxuICAgIGlmICh0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gc3RyaXAgbmFtZXNwYWNlIGZyb20gZGF0YVxuICAgIGRhdGEgPSBkYXRhLnN1YnN0cihuYW1lc3BhY2UubGVuZ3RoLCBkYXRhLmxlbmd0aCAtIG5hbWVzcGFjZS5sZW5ndGgpO1xuICAgIHZhciBtZXRob2QgPSBkYXRhLm1hdGNoKC9bXjpdKjovKTsgLy8gZGV0ZWN0IG1ldGhvZFxuICAgIGlmIChtZXRob2QgJiYgbWV0aG9kLmxlbmd0aCA+IDApIHtcbiAgICAgIG1ldGhvZCA9IG1ldGhvZFswXTtcblxuICAgICAgdmFyIHBhcmFtcyA9IGRhdGEuc3Vic3RyKG1ldGhvZC5sZW5ndGgsIGRhdGEubGVuZ3RoIC0gbWV0aG9kLmxlbmd0aCk7XG4gICAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFyYW1zID0gSlNPTi5wYXJzZShwYXJhbXMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgdGhlIGxhc3QgJyknXG4gICAgICBtZXRob2QgPSBtZXRob2Quc3Vic3RyKDAsIG1ldGhvZC5sZW5ndGggLSAxKTtcblxuICAgICAgLy8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGNhbiBiZSBpbnZva2VkIGRpcmVjdGx5XG4gICAgICBjYWxsYmFjayhtZXRob2QsICdDaGF5bnNXZWJDYWxsJykocGFyYW1zKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiLyoqXG4gKiBDaGF5bnMgQVBJIEludGVyZmFjZVxuICogQVBJIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIEFQUCBhbmQgdGhlIENoYXlucyBXZWJcbiAqL1xuXG5pbXBvcnQge2FwaUNhbGx9IGZyb20gJy4vY2hheW5zX2NhbGxzJztcbmltcG9ydCB7Z2V0TG9nZ2VyLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzQkxFQWRkcmVzcyxcbiAgaXNEYXRlLCBpc09iamVjdCwgaXNBcnJheSwgdHJpbSwgRE9NfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvdywgbG9jYXRpb259IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInOyAvLyBkdWUgdG8gd2luZG93Lm9wZW4gYW5kIGxvY2F0aW9uLmhyZWZcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zX2FwaV9pbnRlcmZhY2UnKTtcblxuLyoqXG4gKiBORkMgUmVzcG9uc2UgRGF0YSBTdG9yYWdlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5sZXQgTmZjUmVzcG9uc2VEYXRhID0ge1xuICBSRklkOiAwLFxuICBQZXJzb25JZDogMFxufTtcblxuLyoqXG4gKiBQb3B1cCBCdXR0b25cbiAqIEBjbGFzcyBQb3B1cEJ1dHRvblxuICovXG5jbGFzcyBQb3B1cEJ1dHRvbiB7XG4gIC8qKlxuICAgKiBQb3B1cCBCdXR0b24gQ29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgUG9wdXAgQnV0dG9uIG5hbWVcbiAgICovXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgbGV0IGVsID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGVsLnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLXBvcHVwJyk7XG4gICAgZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3BvcHVwJyk7XG4gICAgdGhpcy5lbGVtZW50ID0gZWw7XG4gIH1cbiAgLyoqXG4gICAqIEdldCBQb3B1cCBCdXR0b24gbmFtZVxuICAgKiBAcmV0dXJucyB7bmFtZX1cbiAgICovXG4gIG5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsYmFja1xuICAgKi9cbiAgY2FsbGJhY2soKSB7XG4gICAgbGV0IGNiID0gdGhpcy5jYWxsYmFjaztcbiAgICBsZXQgbmFtZSA9IGNiLm5hbWU7XG4gICAgaWYgKGlzRnVuY3Rpb24oY2IpKSB7XG4gICAgICBjYi5jYWxsKG51bGwsIG5hbWUpO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogQG5hbWUgdG9IVE1MXG4gICAqIFJldHVybnMgSFRNTCBOb2RlIGNvbnRhaW5pbmcgdGhlIFBvcHVwQnV0dG9uLlxuICAgKiBAcmV0dXJucyB7UG9wdXBCdXR0b24uZWxlbWVudHxIVE1MTm9kZX1cbiAgICovXG4gIHRvSFRNTCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbGVtZW50O1xuICB9XG59XG5cbi8qKlxuICogQmVhY29uIExpc3RcbiAqIEB0eXBlIHtBcnJheXxudWxsfVxuICovXG5sZXQgYmVhY29uTGlzdCA9IG51bGw7XG5cbi8qKlxuICogR2xvYmFsIERhdGEgU3RvcmFnZVxuICogQHR5cGUge2Jvb2xlYW58T2JqZWN0fVxuICovXG5sZXQgZ2xvYmFsRGF0YSA9IGZhbHNlO1xuXG4vKipcbiAqIEFsbCBwdWJsaWMgY2hheW5zIG1ldGhvZHMgdG8gaW50ZXJhY3Qgd2l0aCAqQ2hheW5zIEFwcCogb3IgKkNoYXlucyBXZWIqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5leHBvcnQgdmFyIGNoYXluc0FwaUludGVyZmFjZSA9IHtcblxuXG4gIC8qKlxuICAgKiBFbmFibGUgb3IgZGlzYWJsZSBQdWxsVG9SZWZyZXNoXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWxsb3dQdWxsIEFsbG93IFB1bGxUb1JlZnJlc2hcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjZWVkZWRcbiAgICovXG4gIHNldFB1bGxUb1JlZnJlc2g6IGZ1bmN0aW9uKGFsbG93UHVsbCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMCxcbiAgICAgIHdlYkZuOiBmYWxzZSwgLy8gY291bGQgYmUgb21pdHRlZFxuICAgICAgcGFyYW1zOiBbeydib29sJzogYWxsb3dQdWxsfV1cbiAgICB9KTtcbiAgfSxcbiAgLy8gVE9ETzogcmVuYW1lIHRvIGVuYWJsZVB1bGxUb1JlZnJlc2hcbiAgYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaCh0cnVlKTtcbiAgfSxcbiAgZGlzYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaChmYWxzZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3Nob3dDdXJzb3JdIElmIHRydWUgdGhlIHdhaXRjdXJzb3Igd2lsbCBiZSBzaG93blxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgaXQgd2lsbCBiZSBoaWRkZW5cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZXRXYWl0Y3Vyc29yOiBmdW5jdGlvbihzaG93Q3Vyc29yKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxLFxuICAgICAgd2ViRm46IChzaG93Q3Vyc29yID8gJ3Nob3cnIDogJ2hpZGUnKSArICdMb2FkaW5nQ3Vyc29yJyxcbiAgICAgIHBhcmFtczogW3snYm9vbCc6IHNob3dDdXJzb3J9XVxuICAgIH0pO1xuICB9LFxuICBzaG93V2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKHRydWUpO1xuICB9LFxuICBoaWRlV2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKGZhbHNlKTtcbiAgfSxcblxuICAvLyBUT0RPOiByZW5hbWUgaXQgdG8gb3BlblRhcHA/XG4gIC8qKlxuICAgKiBTZWxlY3QgZGlmZmVyZW50IFRhcHAgaWRlbnRpZmllZCBieSBUYXBwSUQgb3IgSW50ZXJuYWxUYXBwTmFtZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGFiIFRhcHAgTmFtZSBvciBUYXBwIElEXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAob3B0aW9uYWwpIHBhcmFtIFVSTCBQYXJhbWV0ZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZWxlY3RUYWI6IGZ1bmN0aW9uKHRhYiwgcGFyYW0pIHtcblxuICAgIGxldCBjbWQgPSAxMzsgLy8gc2VsZWN0VGFiIHdpdGggcGFyYW0gQ2hheW5zQ2FsbFxuXG4gICAgLy8gdXBkYXRlIHBhcmFtOiBzdHJpcCA/IGFuZCBlbnN1cmUgJiBhdCB0aGUgYmVnaW5cbiAgICBpZiAocGFyYW0gJiYgIXBhcmFtLm1hdGNoKC9eWyZ8XFw/XS8pKSB7IC8vIG5vICYgYW5kIG5vID9cbiAgICAgIHBhcmFtID0gJyYnICsgcGFyYW07XG4gICAgfSBlbHNlIGlmIChwYXJhbSkge1xuICAgICAgcGFyYW0gPSBwYXJhbS5yZXBsYWNlKCc/JywgJyYnKTtcbiAgICB9IGVsc2UgeyAvLyBubyBwYXJhbXMsIGRpZmZlcmVudCBDaGF5bnNDYWxsXG4gICAgICBjbWQgPSAyO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgd2ViRm46ICdzZWxlY3RvdGhlcnRhYicsXG4gICAgICBwYXJhbXM6IGNtZCA9PT0gMTNcbiAgICAgICAgPyBbeydzdHJpbmcnOiB0YWJ9LCB7J3N0cmluZyc6IHBhcmFtfV1cbiAgICAgICAgOiBbeydzdHJpbmcnOiB0YWJ9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBUYWI6IHRhYixcbiAgICAgICAgUGFyYW1ldGVyOiBwYXJhbVxuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwMiwgaW9zOiAxMzgzLCB3cDogMjQ2OSB9IC8vIGZvciBuYXRpdmUgYXBwcyBvbmx5XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBBbGJ1bVxuICAgKiBUT0RPOiByZW5hbWUgdG8gb3BlblxuICAgKlxuICAgKiBAcGFyYW0ge2lkfHN0cmluZ30gaWQgQWxidW0gSUQgKEFsYnVtIE5hbWUgd2lsbCB3b3JrIGFzIHdlbGwsIGJ1dCBkbyBwcmVmZXIgSURzKVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNlbGVjdEFsYnVtOiBmdW5jdGlvbihpZCkge1xuICAgIGlmICghaXNTdHJpbmcoaWQpICYmICFpc051bWJlcihpZCkpIHtcbiAgICAgIGxvZy5lcnJvcignc2VsZWN0QWxidW06IGludmFsaWQgYWxidW0gbmFtZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMsXG4gICAgICB3ZWJGbjogJ3NlbGVjdEFsYnVtJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogaWR9XSxcbiAgICAgIHdlYlBhcmFtczogaWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBQaWN0dXJlXG4gICAqIChvbGQgU2hvd1BpY3R1cmUpXG4gICAqIEFuZHJvaWQgZG9lcyBub3Qgc3VwcG9ydCBnaWZzIDooXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgSW1hZ2UgVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuUGljdHVyZTogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goL2pwZyR8cG5nJHxnaWYkL2kpKSB7IC8vIFRPRE86IG1vcmUgaW1hZ2UgdHlwZXM/XG4gICAgICBsb2cuZXJyb3IoJ29wZW5QaWN0dXJlOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQsXG4gICAgICB3ZWJGbjogJ3Nob3dQaWN0dXJlJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybCxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNjM2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICogVE9ETzogaW1wbGVtZW50IGludG8gQ2hheW5zIFdlYj9cbiAgICogVE9ETzogcmVuYW1lIHRvIHNldD9cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHQgVGhlIEJ1dHRvbidzIHRleHRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgY2FwdGlvbiBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbih0ZXh0LCBjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy9sb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIHZhbGlkIGNhbGxiYWNrIEZ1bmN0aW9uLicpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpcyBubyB2YWxpZCBjYWxsYmFjayBGdW5jdGlvbi4nKTtcbiAgICAgIC8vcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NhcHRpb25CdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNSxcbiAgICAgIHBhcmFtczogW3tzdHJpbmc6IHRleHR9LCB7Y2FsbGJhY2s6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIGEgQ2FwdGlvbiBCdXR0b24uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqIFRoZSBjYXB0aW9uIGJ1dHRvbiBpcyB0aGUgdGV4dCBhdCB0aGUgdG9wIHJpZ2h0IG9mIHRoZSBhcHAuXG4gICAqIChtYWlubHkgdXNlZCBmb3IgbG9naW4gb3IgdGhlIHVzZXJuYW1lKVxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhpZGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDYsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTgsIGlvczogMTM2Niwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBGYWNlYm9vayBDb25uZWN0XG4gICAqIE5PVEU6IHByZWZlciBgY2hheW5zLmxvZ2luKClgIG92ZXIgdGhpcyBtZXRob2QgdG8gcGVyZm9ybSBhIHVzZXIgbG9naW4uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJ10gRmFjZWJvb2sgUGVybWlzc2lvbnMsIHNlcGFyYXRlZCBieSBjb21tYVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3JlbG9hZFBhcmFtID0gJ2NvbW1lbnQnXSBSZWxvYWQgUGFyYW1cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAvLyBUT0RPOiB0ZXN0IHBlcm1pc3Npb25zXG4gIGZhY2Vib29rQ29ubmVjdDogZnVuY3Rpb24ocGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJywgcmVsb2FkUGFyYW0gPSAnY29tbWVudCcpIHtcbiAgICByZWxvYWRQYXJhbSA9IHJlbG9hZFBhcmFtO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNyxcbiAgICAgIHdlYkZuOiAnZmFjZWJvb2tDb25uZWN0JyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogcGVybWlzc2lvbnN9LCB7J0Z1bmN0aW9uJzogJ0V4ZWNDb21tYW5kPVwiJyArIHJlbG9hZFBhcmFtICsgJ1wiJ31dLFxuICAgICAgd2ViUGFyYW1zOiB7XG4gICAgICAgIFJlbG9hZFBhcmFtZXRlcjogJ0V4ZWNDb21tYW5kPScgKyByZWxvYWRQYXJhbSxcbiAgICAgICAgUGVybWlzc2lvbnM6IHBlcm1pc3Npb25zXG4gICAgICB9LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU5LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBmYWxsYmFja0NtZDogOCAvLyBpbiBjYXNlIHRoZSBhYm92ZSBpcyBub3Qgc3VwcG9ydCB0aGUgZmFsbGJhY2tDbWQgd2lsbCByZXBsYWNlIHRoZSBjbWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBMaW5rIGluIEJyb3dzZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBVUkxcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuTGlua0luQnJvd3NlcjogZnVuY3Rpb24odXJsKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA5LFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodXJsLmluZGV4T2YoJzovLycpID09PSAtMSkge1xuICAgICAgICAgIHVybCA9ICcvLycgKyB1cmw7IC8vIG9yIGFkZCBsb2NhdGlvbi5wcm90b2NvbCBwcmVmaXggYW5kIC8vIFRPRE86IHRlc3RcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cub3Blbih1cmwsICdfYmxhbmsnKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNDY2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNob3cgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgYmFjayBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzaG93QmFja0J1dHRvbjogZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgICBjaGF5bnNBcGlJbnRlcmZhY2UuaGlkZUJhY2tCdXR0b24oKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmFja0J1dHRvbkNhbGxiYWNrKCknO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhpZGUgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBoaWRlQmFja0J1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogT3BlbiBJbnRlckNvbS5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBvcGVuSW50ZXJDb206IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTIsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDIsIGlvczogMTM4Mywgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgR2VvbG9jYXRpb24uXG4gICAqIG5hdGl2ZSBhcHBzIG9ubHkgKGJ1dCBjb3VsZCB3b3JrIGluIHdlYiBhcyB3ZWxsLCBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pXG4gICAqXG4gICAqIFRPRE86IGNvbnRpbnVvdXNUcmFja2luZyB3YXMgcmVtb3ZlZFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB3aGVuIHRoZSBiYWNrIGJ1dHRvbiB3YXMgY2xpY2tlZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGdldEdlb0xvY2F0aW9uOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdnZXRHZW9Mb2NhdGlvbkNhbGxiYWNrKCknO1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy8gVE9ETzogcmVtb3ZlIGNvbnNvbGVcbiAgICAgIC8vIFRPRE86IGFsbG93IGVtcHR5IGNhbGxiYWNrcyB3aGVuIGl0IGlzIGFscmVhZHkgc2V0XG4gICAgICBjb25zb2xlLndhcm4oJ25vIGNhbGxiYWNrIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNDY2LCB3cDogMjQ2OSB9LFxuICAgICAgLy93ZWJGbjogZnVuY3Rpb24oKSB7IG5hdmlnYXRvci5nZW9sb2NhdGlvbjsgfVxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gVmlkZW9cbiAgICogKG9sZCBTaG93VmlkZW8pXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVmlkZW8gVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuVmlkZW86IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSB8fCAhdXJsLm1hdGNoKC8uKlxcLi57Mix9LykpIHsgLy8gVE9ETzogV1RGIFJlZ2V4XG4gICAgICBsb2cuZXJyb3IoJ29wZW5WaWRlbzogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNSxcbiAgICAgIHdlYkZuOiAnc2hvd1ZpZGVvJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybFxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaG93IERpYWxvZ1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0ge2NvbnRlbnQ6e1N0cmluZ30gLCBoZWFkbGluZTogLGJ1dHRvbnM6e0FycmF5fSwgbm9Db250ZW50blBhZGRpbmc6LCBvbkxvYWQ6fVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHNob3dEaWFsb2c6IGZ1bmN0aW9uIHNob3dEaWFsb2cob2JqKSB7XG4gICAgaWYgKCFvYmogfHwgIWlzT2JqZWN0KG9iaikpIHtcbiAgICAgIGxvZy53YXJuKCdzaG93RGlhbG9nOiBpbnZhbGlkIHBhcmFtZXRlcnMnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKG9iai5jb250ZW50KSkge1xuICAgICAgb2JqLmNvbnRlbnQgPSB0cmltKG9iai5jb250ZW50LnJlcGxhY2UoLzxiclsgL10qPz4vZywgJ1xcbicpKTtcbiAgICB9XG4gICAgaWYgKCFpc0FycmF5KG9iai5idXR0b25zKSB8fCBvYmouYnV0dG9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9iai5idXR0b25zID0gWyhuZXcgUG9wdXBCdXR0b24oJ09LJykpLnRvSFRNTCgpXTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ0NoYXluc0RpYWxvZ0NhbGxCYWNrKCknO1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm4oYnV0dG9ucywgaWQpIHtcbiAgICAgIGlkID0gcGFyc2VJbnQoaWQsIDEwKSAtIDE7XG4gICAgICBpZiAoYnV0dG9uc1tpZF0pIHtcbiAgICAgICAgYnV0dG9uc1tpZF0uY2FsbGJhY2suY2FsbChudWxsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE2LCAvLyBUT0RPOiBpcyBzbGl0dGU6Ly9cbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouaGVhZGxpbmV9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5jb250ZW50fSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouYnV0dG9uc1swXS5uYW1lfSAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICAgIC8veydzdHJpbmcnOiBvYmouYnV0dG9uc1sxXS5uYW1lfSwgLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgICAvL3snc3RyaW5nJzogb2JqLmJ1dHRvbnNbMl0ubmFtZX0gLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgXSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgb2JqLmJ1dHRvbnMpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2MDZ9LFxuICAgICAgZmFsbGJhY2tGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYWxsYmFjayBwb3B1cCcsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogRm9ybWVybHkga25vd24gYXMgZ2V0QXBwSW5mb3NcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aXRoIHRoZSBBcHBEYXRhXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gICAgLy8gVE9ETzogdXNlIGZvcmNlUmVsb2FkIGFuZCBjYWNoZSBBcHBEYXRhXG4gIGdldEdsb2JhbERhdGE6IGZ1bmN0aW9uKGNhbGxiYWNrLCBmb3JjZVJlbG9hZCkge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRHbG9iYWxEYXRhOiBjYWxsYmFjayBpcyBubyB2YWxpZCBgRnVuY3Rpb25gLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWZvcmNlUmVsb2FkICYmIGdsb2JhbERhdGEpIHtcbiAgICAgIGNhbGxiYWNrKGdsb2JhbERhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE4LFxuICAgICAgd2ViRm46ICdnZXRBcHBJbmZvcycsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogJ2dldEdsb2JhbERhdGEoKSd9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWJyYXRlXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gZHVyYXRpb24gVGltZSBpbiBtaWxsaXNlY29uZHNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgdmlicmF0ZTogZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICBpZiAoIWlzTnVtYmVyKGR1cmF0aW9uKSB8fCBkdXJhdGlvbiA8IDIpIHtcbiAgICAgIGR1cmF0aW9uID0gMTUwO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE5LFxuICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogZHVyYXRpb24udG9TdHJpbmcoKX1dLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uIG5hdmlnYXRvclZpYnJhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmF2aWdhdG9yLnZpYnJhdGUoMTAwKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5pbmZvKCd2aWJyYXRlOiB0aGUgZGV2aWNlIGRvZXMgbm90IHN1cHBvcnQgdmlicmF0ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2OTUsIGlvczogMjU5Niwgd3A6IDI1MTV9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIEJhY2suXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgbmF2aWdhdGVCYWNrOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDIwLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjY5NiwgaW9zOiAyNjAwLCB3cDogMjUxNX1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW1hZ2UgVXBsb2FkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2l0aCBpbWFnZSB1cmwgYWZ0ZXIgdXBsb2FkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHVwbG9hZEltYWdlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCd1cGxvYWRJbWFnZTogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdpbWFnZVVwbG9hZENhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjEsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IERPTS5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAnZmlsZScpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ3ZhbHVlJywgJycpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ2FjY2VwdCcsICdpbWFnZS8qJyk7XG4gICAgICAgIC8vaW5wdXQuc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtaW1hZ2UtdXBsb2FkLWZpZWxkKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCdvbmNoYW5nZScsICdpbWFnZUNob3NlbigpJyk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2hheW5zX191cGxvYWQtaW1hZ2UnKTtcbiAgICAgICAgRE9NLnF1ZXJ5KCcjY2hheW5zLXJvb3QnKS5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgICAgIC8vdmFyIGZkID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIC8vZmQuYXBwZW5kKFwiSW1hZ2VcIiwgZmlsZVswXSk7XG4gICAgICAgIC8vd2luZG93LmltYWdlQ2hvc2VuID0gd2luZG93LmZldGNoKHtcbiAgICAgICAgLy8gIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAvLyAgdXJsOiBcIi8vY2hheW5zMS50b2JpdC5jb20vVGFwcEFwaS9GaWxlL0ltYWdlXCIsXG4gICAgICAgIC8vICBjb250ZW50VHlwZTogZmFsc2UsXG4gICAgICAgIC8vICBwcm9jZXNzRGF0YTogZmFsc2UsXG4gICAgICAgIC8vICBjYWNoZTogZmFsc2UsXG4gICAgICAgIC8vICBkYXRhOiBmZFxuICAgICAgICAvL30pLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAvLyAgZGVsZXRlIHdpbmRvdy5pbWFnZUNob3NlbjtcbiAgICAgICAgLy8gIGNhbGxiYWNrLmNhbGwobnVsbCwgZGF0YSk7XG4gICAgICAgIC8vfSk7XG4gICAgICAgIC8vJChcIiNDaGF5bnNJbWFnZVVwbG9hZFwiKS5jbGljaygpO1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzA1LCB3cDogMjUzOCwgaW9zOiAyNjQyfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgTkZDIENhbGxiYWNrXG4gICAqIFRPRE86IHJlZmFjdG9yIGFuZCB0ZXN0XG4gICAqIFRPRE86IHdoeSB0d28gY2FsbHM/XG4gICAqIENhbiB3ZSBpbXByb3ZlIHRoaXMgc2hpdD8gc3BsaXQgaW50byB0d28gbWV0aG9kc1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiBmb3IgTkZDXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHNldE5mY0NhbGxiYWNrOiBmdW5jdGlvbihjYWxsYmFjaywgcmVzcG9uc2UpIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMzcsXG4gICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgfSkgJiYgYXBpQ2FsbCh7XG4gICAgICAgICAgY21kOiAzNyxcbiAgICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmFyIGNtZCA9IChyZXNwb25zZSA9PT0gbmZjUmVzcG9uc2VEYXRhLlBlcnNvbklkKSA/IDM3IDogMzg7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IGNtZCA9PT0gMzcgPyAzOCA6IDM3LFxuICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgIH0pICYmIGFwaUNhbGwoe1xuICAgICAgY21kOiBjbWQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogJ05mY0NhbGxiYWNrJ31dLCAvLyBjYWxsYmFjayBwYXJhbSBvbmx5IG9uIG1vYmlsZVxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAzMjM0LCB3cDogMzEyMSB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFZpZGVvIFBsYXllciBDb250cm9sc1xuICAgKiBBY3V0YWxseSBuYXRpdmUgb25seVxuICAgKiBUT0RPOiBjb3VsZCB0aGVvcmV0aWNhbGx5IHdvcmsgaW4gQ2hheW5zIFdlYlxuICAgKiBUT0RPOiBleGFtcGxlPyB3aGVyZSBkb2VzIHRoaXMgd29yaz9cbiAgICovXG4gIHBsYXllcjoge1xuICAgIHVzZURlZmF1bHRVcmw6IGZ1bmN0aW9uIHVzZURlZmF1bHRVcmwoKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjIsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGNoYW5nZVVybDogZnVuY3Rpb24gY2hhbmdlVXJsKHVybCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIyLFxuICAgICAgICBwYXJhbXM6IFt7J1N0cmluZyc6IHVybH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgaGlkZUJ1dHRvbjogZnVuY3Rpb24gaGlkZUJ1dHRvbigpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMyxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgc2hvd0J1dHRvbjogZnVuY3Rpb24gc2hvd0J1dHRvbigpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMyxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMX1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGF1c2U6IGZ1bmN0aW9uIHBhdXNlVmlkZW8oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjQsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBsYXk6IGZ1bmN0aW9uIHBsYXlWaWRlbygpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNCxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMX1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGxheWJhY2tTdGF0dXM6IGZ1bmN0aW9uIHBsYXliYWNrU3RhdHVzKGNhbGxiYWNrKSB7XG5cbiAgICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2UuZ2V0R2xvYmFsRGF0YShmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKG51bGwsIHtcbiAgICAgICAgICBBcHBDb250cm9sVmlzaWJsZTogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5Jc0FwcENvbnRyb2xWaXNpYmxlLFxuICAgICAgICAgIFN0YXR1czogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5QbGF5YmFja1N0YXR1cyxcbiAgICAgICAgICBVcmw6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uU3RyZWFtVXJsXG4gICAgICAgIH0pO1xuICAgICAgfSwgdHJ1ZSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBCbHVldG9vdGhcbiAgICogT25seSBpbiBuYXRpdmUgQXBwcyAoaW9zIGFuZCBhbmRyb2lkKVxuICAgKi9cbiAgYmx1ZXRvb3RoOiB7XG4gICAgTEVTZW5kU3RyZW5ndGg6IHsgLy8gVE9ETzogd2hhdCBpcyB0aGF0P1xuICAgICAgQWRqYWNlbnQ6IDAsXG4gICAgICBOZWFyYnk6IDEsXG4gICAgICBEZWZhdWx0OiAyLFxuICAgICAgRmFyOiAzXG4gICAgfSxcbiAgICBMRVNjYW46IGZ1bmN0aW9uIExFU2NhbihjYWxsYmFjaykge1xuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBsb2cud2FybignTEVTY2FuOiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snO1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI2LFxuICAgICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgTEVDb25uZWN0OiBmdW5jdGlvbiBMRUNvbm5lY3QoYWRkcmVzcywgY2FsbGJhY2ssIHBhc3N3b3JkKSB7XG4gICAgICBpZiAoIWlzU3RyaW5nKGFkZHJlc3MpIHx8ICFpc0JMRUFkZHJlc3MoYWRkcmVzcykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFQ29ubmVjdDogbm8gdmFsaWQgYWRkcmVzcyBwYXJhbWV0ZXInKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBsb2cud2FybignTEVDb25uZWN0OiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzU3RyaW5nKHBhc3N3b3JkKSB8fCAhcGFzc3dvcmQubWF0Y2goL15bMC05YS1mXXs2LDEyfSQvaSkpIHtcbiAgICAgICAgcGFzc3dvcmQgPSAnJztcbiAgICAgIH1cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjayc7XG5cbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNyxcbiAgICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBhZGRyZXNzfSwgeydzdHJpbmcnOiBwYXNzd29yZH1dLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBUT0RPOiBjb25zaWRlciBPYmplY3QgYXMgcGFyYW1ldGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFkZHJlc3NcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHN1YklkXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBtZWFzdXJlUG93ZXJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHNlbmRTdHJlbmd0aFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgTEVXcml0ZTogZnVuY3Rpb24gTEVXcml0ZShhZGRyZXNzLCBzdWJJZCwgbWVhc3VyZVBvd2VyLCBzZW5kU3RyZW5ndGgsIGNhbGxiYWNrKSB7XG4gICAgICBpZiAoIWlzU3RyaW5nKGFkZHJlc3MpIHx8ICFpc0JMRUFkZHJlc3MoYWRkcmVzcykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFV3JpdGU6IG5vIHZhbGlkIGFkZHJlc3MgcGFyYW1ldGVyJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIoc3ViSWQpIHx8IHN1YklkIDwgMCB8fCBzdWJJZCA+IDQwOTUpIHtcbiAgICAgICAgc3ViSWQgPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKG1lYXN1cmVQb3dlcikgfHwgbWVhc3VyZVBvd2VyIDwgLTEwMCB8fCBtZWFzdXJlUG93ZXIgPiAwKSB7XG4gICAgICAgIG1lYXN1cmVQb3dlciA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIoc2VuZFN0cmVuZ3RoKSB8fCBzZW5kU3RyZW5ndGggPCAwIHx8IHNlbmRTdHJlbmd0aCA+IDMpIHtcbiAgICAgICAgc2VuZFN0cmVuZ3RoID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBjYWxsYmFjayA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjaycsXG4gICAgICAgIHVpZCA9ICc3QTA3RTE3QS1BMTg4LTQxNkUtQjdBMC01QTM2MDY1MTNFNTcnO1xuXG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjgsXG4gICAgICAgIHBhcmFtczogW1xuICAgICAgICAgIHsnc3RyaW5nJzogYWRkcmVzc30sXG4gICAgICAgICAgeydzdHJpbmcnOiB1aWR9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IHN1YklkfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBtZWFzdXJlUG93ZXJ9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IHNlbmRTdHJlbmd0aH1cbiAgICAgICAgXSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICAvLyBUT0RPOyB1c2UgYE9iamVjdGAgYXMgcGFyYW1zXG4gIC8vIFRPRE86IHdoYXQgYXJlIG9wdGlvbmFsIHBhcmFtcz8gdmFsaWRhdGUgbmFtZSBhbmQgbG9jYXRpb24/XG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBBcHBvaW50bWVudCdzIG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGxvY2F0aW9uIEFwcG9pbnRtZW50J3MgbG9jYXRpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtkZXNjcmlwdGlvbl0gQXBwb2ludG1lbnQncyBkZXNjcmlwdGlvblxuICAgKiBAcGFyYW0ge0RhdGV9IHN0YXJ0IEFwcG9pbnRtZW50cydzIFN0YXJ0RGF0ZVxuICAgKiBAcGFyYW0ge0RhdGV9IGVuZCBBcHBvaW50bWVudHMncyBFbmREYXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2F2ZUFwcG9pbnRtZW50OiBmdW5jdGlvbiBzYXZlQXBwb2ludG1lbnQobmFtZSwgbG9jYXRpb24sIGRlc2NyaXB0aW9uLCBzdGFydCwgZW5kKSB7XG4gICAgaWYgKCFpc1N0cmluZyhuYW1lKSB8fCAhaXNTdHJpbmcobG9jYXRpb24pKSB7XG4gICAgICBsb2cud2Fybignc2F2ZUFwcG9pbnRtZW50OiBubyB2YWxpZCBuYW1lIGFuZC9vciBsb2NhdGlvbicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWlzRGF0ZShzdGFydCkgfHwgIWlzRGF0ZShlbmQpKSB7XG4gICAgICBsb2cud2Fybignc2F2ZUFwcG9pbnRtZW50OiBzdGFydCBhbmQvb3IgZW5kRGF0ZSBpcyBubyB2YWxpZCBEYXRlIGBPYmplY3RgLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBzdGFydCA9IHBhcnNlSW50KHN0YXJ0LmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcbiAgICBlbmQgPSBwYXJzZUludChlbmQuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAyOSxcbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J3N0cmluZyc6IG5hbWV9LFxuICAgICAgICB7J3N0cmluZyc6IGxvY2F0aW9ufSxcbiAgICAgICAgeydzdHJpbmcnOiBkZXNjcmlwdGlvbn0sXG4gICAgICAgIHsnSW50ZWdlcic6IHN0YXJ0fSxcbiAgICAgICAgeydJbnRlZ2VyJzogZW5kfVxuICAgICAgXSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMDU0LCBpb3M6IDMwNjcsIHdwOiAzMDMwfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEYXRlVHlwZXMgRW51bVxuICAgKiBzdGFydHMgYXQgMVxuICAgKi9cbiAgZGF0ZVR5cGU6IHtcbiAgICBkYXRlOiAxLFxuICAgIHRpbWU6IDIsXG4gICAgZGF0ZVRpbWU6IDNcbiAgfSxcblxuICAvKipcbiAgICogU2VsZWN0IERhdGVcbiAgICogT2xkOiBEYXRlU2VsZWN0XG4gICAqIE5hdGl2ZSBBcHBzIG9ubHkuIFRPRE86IGFsc28gaW4gQ2hheW5zIFdlYj8gSFRNTDUgRGF0ZXBpY2tlciBldGNcbiAgICogVE9ETzsgcmVjb25zaWRlciBvcmRlciBldGNcbiAgICogQHBhcmFtIHtkYXRlVHlwZXxOdW1iZXJ9IGRhdGVUeXBlIEVudW0gMS0yOiB0aW1lLCBkYXRlLCBkYXRldGltZS4gdXNlIGNoYXlucy5kYXRlVHlwZVxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBwcmVTZWxlY3QgUHJlc2V0IHRoZSBEYXRlIChlLmcuIGN1cnJlbnQgRGF0ZSlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gdGhhdCByZWNlaXZlcyB0aGUgY2hvc2VuIERhdGUgYXMgVGltZXN0YW1wXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IG1pbkRhdGUgTWluaW11bSBTdGFydERhdGVcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gbWF4RGF0ZSBNYXhpbXVtIEVuZERhdGVcbiAgICovXG4gIHNlbGVjdERhdGU6IGZ1bmN0aW9uIHNlbGVjdERhdGUoZGF0ZVR5cGUsIHByZVNlbGVjdCwgY2FsbGJhY2ssIG1pbkRhdGUsIG1heERhdGUpIHtcblxuICAgIGlmICghaXNOdW1iZXIoZGF0ZVR5cGUpIHx8IGRhdGVUeXBlIDw9IDApIHtcbiAgICAgIGxvZy53YXJuKCdzZWxlY3REYXRlOiB3cm9uZyBkYXRlVHlwZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2Fybignc2VsZWN0RGF0ZTogY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdmFsaWRhdGVWYWx1ZSh2YWx1ZSkge1xuICAgICAgaWYgKCFpc051bWJlcih2YWx1ZSkpIHtcbiAgICAgICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gcGFyc2VJbnQodmFsdWUuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcHJlU2VsZWN0ID0gdmFsaWRhdGVWYWx1ZShwcmVTZWxlY3QpO1xuICAgIG1pbkRhdGUgPSB2YWxpZGF0ZVZhbHVlKG1pbkRhdGUpO1xuICAgIG1heERhdGUgPSB2YWxpZGF0ZVZhbHVlKG1heERhdGUpO1xuXG4gICAgbGV0IGRhdGVSYW5nZSA9ICcnO1xuICAgIGlmIChtaW5EYXRlID4gLTEgJiYgbWF4RGF0ZSA+IC0xKSB7XG4gICAgICBkYXRlUmFuZ2UgPSAnLCcgKyBtaW5EYXRlICsgJywnICsgbWF4RGF0ZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ3NlbGVjdERhdGVDYWxsYmFjayc7XG4gICAgZnVuY3Rpb24gY2FsbGJhY2tGbihjYWxsYmFjaywgZGF0ZVR5cGUsIHByZVNlbGVjdCwgdGltZSkge1xuICAgICAgLy8gVE9ETzogaW1wb3J0YW50IHZhbGlkYXRlIERhdGVcbiAgICAgIC8vIFRPRE86IGNob29zZSByaWdodCBkYXRlIGJ5IGRhdGVUeXBlRW51bVxuICAgICAgbG9nLmRlYnVnKGRhdGVUeXBlLCBwcmVTZWxlY3QpO1xuICAgICAgY2FsbGJhY2suY2FsbChudWxsLCB0aW1lID8gbmV3IERhdGUodGltZSkgOiAtMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMCxcbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfSxcbiAgICAgICAgeydJbnRlZ2VyJzogZGF0ZVR5cGV9LFxuICAgICAgICB7J0ludGVnZXInOiBwcmVTZWxlY3QgKyBkYXRlUmFuZ2V9XG4gICAgICBdLFxuICAgICAgY2I6IGNhbGxiYWNrRm4uYmluZChudWxsLCBjYWxsYmFjaywgZGF0ZVR5cGUsIHByZVNlbGVjdCksXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzA3MiwgaW9zOiAzMDYyLCB3cDogMzAzMH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBVUkwgaW4gQXBwXG4gICAqIChvbGQgU2hvd1VSTEluQXBwKVxuICAgKiBub3QgdG8gY29uZnVzZSB3aXRoIG9wZW5MaW5rSW5Ccm93c2VyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVmlkZW8gVVJMIHNob3VsZCBjb250YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgICAvLyBUT0RPOiBpbXBsZW1lbnQgQ2hheW5zIFdlYiBNZXRob2QgYXMgd2VsbCAobmF2aWdhdGUgYmFjayBzdXBwb3J0KVxuICBvcGVuVXJsOiBmdW5jdGlvbiBvcGVuVXJsKHVybCwgdGl0bGUpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkpIHtcbiAgICAgIGxvZy5lcnJvcignb3BlblVybDogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMxLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2NhdGlvbi5ocmVmID0gdXJsOyAvLyBUT0RPOiBtYWtlIHN1cmUgaXQgd29ya3NcbiAgICAgIH0sXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH0sIHsnc3RyaW5nJzogdGl0bGV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMTEwLCBpb3M6IDMwNzQsIHdwOiAzMDYzfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBjcmVhdGUgUVIgQ29kZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGRhdGEgUVIgQ29kZSBkYXRhXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSBiYXNlNjQgZW5jb2RlZCBJTUcgVE9ETzogd2hpY2ggdHlwZT9cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVRUkNvZGU6IGZ1bmN0aW9uIGNyZWF0ZVFSQ29kZShkYXRhLCBjYWxsYmFjaykge1xuICAgIGlmICghaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgIGRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignY3JlYXRlUVJDb2RlOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnY3JlYXRlUVJDb2RlQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogZGF0YX0sIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgMzIyMCwgaW9zOiAxMzcyLCB3cDogMzEwNn0sXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBzY2FuIFFSIENvZGVcbiAgICogU2NhbnMgUVIgQ29kZSBhbmQgcmVhZCBpdFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgcmVzdWx0XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2NhblFSQ29kZTogZnVuY3Rpb24gc2NhblFSQ29kZShjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3NjYW5RUkNvZGU6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdzY2FuUVJDb2RlQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzNCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgMzIyMCwgaW9zOiAxMzcyLCB3cDogMzEwNn0sXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogc2NhbiBRUiBDb2RlXG4gICAqIFNjYW5zIFFSIENvZGUgYW5kIHJlYWQgaXRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGdldExvY2F0aW9uQmVhY29uczogZnVuY3Rpb24gZ2V0TG9jYXRpb25CZWFjb25zKGNhbGxiYWNrLCBmb3JjZVJlbG9hZCkge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ2dldExvY2F0aW9uQmVhY29uczogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2dldEJlYWNvbnNDYWxsQmFjaygpJztcbiAgICBpZiAoYmVhY29uTGlzdCAmJiAhZm9yY2VSZWxvYWQpIHsgLy8gVE9ETzogbWFrZSBzdXJlIGl0IGlzIGdvb2QgdG8gY2FjaGUgdGhlIGxpc3RcbiAgICAgIGxvZy5kZWJ1ZygnZ2V0TG9jYXRpb25CZWFjb25zOiB0aGVyZSBpcyBhbHJlYWR5IG9uZSBiZWFjb25MaXN0Jyk7XG4gICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChudWxsLCBiZWFjb25MaXN0KTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrRm4gPSBmdW5jdGlvbiBnZXRMb2NhdGlvbkJlYWNvbkNhbGxiYWNrKGNhbGxiYWNrLCBsaXN0KSB7XG4gICAgICBiZWFjb25MaXN0ID0gbGlzdDtcbiAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgbGlzdCk7XG4gICAgfTtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDM5LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6ICA0MDQ1LCBpb3M6IDQwNDh9LFxuICAgICAgY2I6IGNhbGxiYWNrRm4uYmluZChudWxsLCBjYWxsYmFjaylcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkIHRvIFBhc3Nib29rXG4gICAqIGlPUyBvbmx5XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgUGF0aCB0byBQYXNzYm9vayBmaWxlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgYWRkVG9QYXNzYm9vazogZnVuY3Rpb24gYWRkVG9QYXNzYm9vayh1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkpIHtcbiAgICAgIGxvZy53YXJuKCdhZGRUb1Bhc3Nib29rOiB1cmwgaXMgaW52YWxpZC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQ3LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHN1cHBvcnQ6IHtpb3M6IDQwNDV9LFxuICAgICAgd2ViRm46IGNoYXluc0FwaUludGVyZmFjZS5vcGVuTGlua0luQnJvd3Nlci5iaW5kKG51bGwsIHVybCksXG4gICAgICBmYWxsYmFja0ZuOiBjaGF5bnNBcGlJbnRlcmZhY2Uub3BlbkxpbmtJbkJyb3dzZXIuYmluZChudWxsLCB1cmwpXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRvYml0IExvZ2luXG4gICAqIFdpdGggRmFjZWJvb2tDb25uZWN0IEZhbGxiYWNrXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbXMgUmVsb2FkIFBhcmFtZXRlclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGxvZ2luOiBmdW5jdGlvbiBsb2dpbihwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSAnRXhlY0NvbW1hbmQ9JyArIHBhcmFtcztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDU0LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBwYXJhbXN9XSxcbiAgICAgIHN1cHBvcnQ6IHtpb3M6IDQyNDAsIHdwOiA0MDk5fSxcbiAgICAgIGZhbGxiYWNrRm46IGNoYXluc0FwaUludGVyZmFjZS5mYWNlYm9va0Nvbm5lY3QuYmluZChudWxsLCAndXNlcl9mcmllbmRzJywgcGFyYW1zKSxcbiAgICAgIHdlYkZuOiAndG9iaXRjb25uZWN0JyxcbiAgICAgIHdlYlBhcmFtczogcGFyYW1zXG4gICAgfSk7XG4gIH1cblxufTtcbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc1Blcm1pdHRlZCwgaXNGdW5jdGlvbiwgaXNCbGFuaywgaXNBcnJheSwgaXNPYmplY3QsIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHt3aW5kb3csIHBhcmVudH0gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7XG5pbXBvcnQge2Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7c2V0Q2FsbGJhY2t9IGZyb20gJy4vY2FsbGJhY2tzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jb3JlLmNoYXluc19jYWxscycpO1xuXG5cbmZ1bmN0aW9uIGNhbih2ZXJzaW9ucykge1xuICByZXR1cm4gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIGVudmlyb25tZW50Lm9zLCBlbnZpcm9ubWVudC5hcHBWZXJzaW9uKTtcbn1cblxuLy8gT1MgQXBwIFZlcnNpb24gTWFwIGZvciBDaGF5bnMgQ2FsbHMgU3VwcG9ydFxuLy8gVE9ETzogbW92ZSBpbnRvIGVudmlyb25tZW50PyAob3IganVzdCByZW1vdmUgY2F1c2UgaXQgaXMgb25seSB1c2VkIG9uZSB0aW1lIGluIGhlcmUpXG5sZXQgb3NNYXAgPSB7XG4gIGNoYXluc0NhbGw6IHsgYW5kcm9pZDogMjUxMCwgaW9zOiAyNDgzLCB3cDogMjQ2OSwgYmI6IDExOCB9XG59O1xuXG4vKipcbiAqIFB1YmxpYyBDaGF5bnMgSW50ZXJmYWNlXG4gKiBFeGVjdXRlIEFQSSBDYWxsXG4gKlxuICogQHBhcmFtIHVybFxuICogQHBhcmFtIHBhcmFtc1xuICogQHBhcmFtIGRlYm91bmNlXG4gKiAvLyBUT0RPOiBsZWZ0IG9mIGNhbGxiYWNrIGFzIHByb21pc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwaUNhbGwob2JqKSB7XG5cbiAgbGV0IGRlYm91bmNlID0gb2JqLmRlYm91bmNlIHx8IGZhbHNlO1xuXG4gIC8vIFRPRE86IGNoZWNrIG9iai5vcyBWRVJTSU9OXG5cbiAgZnVuY3Rpb24gZXhlY3V0ZUNhbGwoY2hheW5zQ2FsbE9iaikge1xuXG4gICAgaWYgKGVudmlyb25tZW50LmNhbkNoYXluc0NhbGwgJiYgY2FuKG9zTWFwLmNoYXluc0NhbGwpKSB7XG4gICAgICAvLyBUT0RPOiBjb25zaWRlciBjYWxsUXVldWUgYW5kIEludGVydmFsIHRvIHByZXZlbnQgZXJyb3JzXG4gICAgICBsb2cuZGVidWcoJ2V4ZWN1dGVDYWxsOiBjaGF5bnMgY2FsbCAnLCBjaGF5bnNDYWxsT2JqLmNtZCk7XG5cbiAgICAgIGlmICgnY2InIGluIGNoYXluc0NhbGxPYmogJiYgaXNGdW5jdGlvbihjaGF5bnNDYWxsT2JqLmNiKSkge1xuICAgICAgICBzZXRDYWxsYmFjayhjaGF5bnNDYWxsT2JqLmNhbGxiYWNrTmFtZSB8fCBjaGF5bnNDYWxsT2JqLnBhcmFtc1swXS5jYWxsYmFjaywgY2hheW5zQ2FsbE9iai5jYiwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBpZiAoaXNPYmplY3QoY2hheW5zQ2FsbE9iai5zdXBwb3J0KSAmJiAhY2FuKGNoYXluc0NhbGxPYmouc3VwcG9ydCkpIHtcbiAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiB0aGUgY2hheW5zIHZlcnNpb24gaXMgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICBpZiAoY2hheW5zQ2FsbE9iai5mYWxsYmFja0NtZCkge1xuICAgICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogZmFsbGJhY2sgY2hheW5zIGNhbGwgd2lsbCBiZSBpbnZva2VkJyk7XG4gICAgICAgICAgcmV0dXJuIGNoYXluc0NhbGwoY2hheW5zQ2FsbE9iai5mYWxsYmFja0NtZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5mYWxsYmFja0ZuKSkge1xuICAgICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogZmFsbGJhY2tGbiB3aWxsIGJlIGludm9rZWQnKTtcbiAgICAgICAgICByZXR1cm4gY2hheW5zQ2FsbE9iai5mYWxsYmFja0ZuLmNhbGwobnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNoYXluc0NhbGwoY2hheW5zQ2FsbE9iai5jbWQsIGNoYXluc0NhbGxPYmoucGFyYW1zKTtcblxuICAgIH0gZWxzZSBpZiAoZW52aXJvbm1lbnQuY2FuQ2hheW5zV2ViQ2FsbCkge1xuXG4gICAgICBpZiAoJ2NiJyBpbiBjaGF5bnNDYWxsT2JqICYmIGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5jYikpIHtcbiAgICAgICAgc2V0Q2FsbGJhY2soY2hheW5zQ2FsbE9iai53ZWJGbiwgY2hheW5zQ2FsbE9iai5jYik7XG4gICAgICB9XG4gICAgICBpZiAoIWNoYXluc0NhbGxPYmoud2ViRm4pIHtcbiAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBUaGlzIENhbGwgaGFzIG5vIHdlYkZuJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgbG9nLmRlYnVnKCdleGVjdXRlQ2FsbDogY2hheW5zIHdlYiBjYWxsICcsIGNoYXluc0NhbGxPYmoud2ViRm4ubmFtZSB8fCBjaGF5bnNDYWxsT2JqLndlYkZuKTtcblxuICAgICAgcmV0dXJuIGNoYXluc1dlYkNhbGwoY2hheW5zQ2FsbE9iai53ZWJGbiwgY2hheW5zQ2FsbE9iai53ZWJQYXJhbXMgfHwgY2hheW5zQ2FsbE9iai5wYXJhbXMpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogbmVpdGhlciBjaGF5bnMgd2ViIGNhbGwgbm9yIGNoYXlucyB3ZWInKTtcbiAgICB9XG4gIH1cblxuICBpZiAoZGVib3VuY2UpIHtcbiAgICBzZXRUaW1lb3V0KGV4ZWN1dGVDYWxsLmJpbmQobnVsbCwgb2JqKSwgMTAwKTsgLy8gVE9ETzogZXJyb3I/XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGV4ZWN1dGVDYWxsKG9iaik7XG4gIH1cbn1cblxuLyoqXG4gKiBCdWlsZCBDaGF5bnMgQ2FsbCAob25seSBmb3IgbmF0aXZlIEFwcHMpXG4gKiBAcHJpdmF0ZVxuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBjaGF5bnMgY2FsbCBzdWNjZWVkZWQsIGZhbHNlIG9uIGVycm9yIChubyB1cmwgZXRjKVxuICovXG5mdW5jdGlvbiBjaGF5bnNDYWxsKGNtZCwgcGFyYW1zKSB7XG5cbiAgaWYgKGlzQmxhbmsoY21kKSkgeyAvLyAwIGlzIGEgdmFsaWQgY2FsbCwgdW5kZWZpbmVkIGFuZCBudWxsIGFyZSBub3RcbiAgICBsb2cud2FybignY2hheW5zQ2FsbDogbWlzc2luZyBjbWQgZm9yIGNoYXluc0NhbGwnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgbGV0IHVybCA9IG51bGw7XG5cbiAgLy8gaWYgdGhlcmUgaXMgbm8gcGFyYW0gb3IgJ25vbmUnIHdoaWNoIG1lYW5zIG5vIGNhbGxiYWNrXG4gIGlmICghcGFyYW1zKSB7XG5cbiAgICB1cmwgPSAnY2hheW5zOi8vY2hheW5zQ2FsbCgnICsgY21kICsgJyknO1xuXG4gIH0gZWxzZSB7XG5cbiAgICAvLyBwYXJhbXMgZXhpc3QgaG93ZXZlciwgaXQgaXMgbm8gYXJyYXlcbiAgICBpZiAoIWlzQXJyYXkocGFyYW1zKSkge1xuICAgICAgbG9nLmVycm9yKCdjaGF5bnNDYWxsOiBwYXJhbXMgYXJlIG5vIEFycmF5Jyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gYWRkIHRoZSBwYXJhbXMgdG8gdGhlIGNoYXlucyBjYWxsXG4gICAgbGV0IGNhbGxiYWNrUHJlZml4ID0gJ19jaGF5bnNDYWxsYmFja3MuJztcbiAgICBsZXQgY2FsbFN0cmluZyA9ICcnO1xuICAgIGlmIChwYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgbGV0IGNhbGxBcmdzID0gW107XG4gICAgICBwYXJhbXMuZm9yRWFjaChmdW5jdGlvbihwYXJhbSkge1xuICAgICAgICBsZXQgbmFtZSA9IE9iamVjdC5rZXlzKHBhcmFtKVswXTtcbiAgICAgICAgbGV0IHZhbHVlID0gcGFyYW1bbmFtZV07XG4gICAgICAgIGlmIChuYW1lID09PSAnY2FsbGJhY2snKSB7XG4gICAgICAgICAgY2FsbEFyZ3MucHVzaCgnXFwnJyArIGNhbGxiYWNrUHJlZml4ICsgdmFsdWUgKyAnXFwnJyk7XG4gICAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ2Jvb2wnIHx8IG5hbWUgPT09ICdGdW5jdGlvbicgfHwgbmFtZSA9PT0gJ0ludGVnZXInKSB7XG4gICAgICAgICAgY2FsbEFyZ3MucHVzaCh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1xcJycgKyB2YWx1ZSArICdcXCcnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjYWxsU3RyaW5nID0gJywnICsgY2FsbEFyZ3Muam9pbignLCcpO1xuICAgIH1cblxuICAgIC8vIGFkZCBjaGF5bnMgcHJvdG9jb2wgYW5kIGhvc3QgYW5kIGpvaW4gYXJyYXlcbiAgICB1cmwgPSAnY2hheW5zOi8vY2hheW5zQ2FsbCgnICsgY21kICsgY2FsbFN0cmluZyArICcpJztcbiAgfVxuXG4gIGxvZy5kZWJ1ZygnY2hheW5zQ2FsbDogdXJsOiAnLCB1cmwpO1xuXG4gIHRyeSB7XG4gICAgLy8gVE9ETzogY3JlYXRlIGFuIGVhc2llciBpZGVudGlmaWNhdGlvbiBvZiB0aGUgcmlnaHQgZW52aXJvbm1lbnRcbiAgICAvLyBUT0RPOiBjb25zaWRlciB0byBleGVjdXRlIHRoZSBicm93c2VyIGZhbGxiYWNrIGluIGhlcmUgYXMgd2VsbFxuICAgIGlmICgnY2hheW5zQ2FsbCcgaW4gd2luZG93ICYmIGlzRnVuY3Rpb24od2luZG93LmNoYXluc0NhbGwuaHJlZikpIHtcbiAgICAgIHdpbmRvdy5jaGF5bnNDYWxsLmhyZWYodXJsKTtcbiAgICB9IGVsc2UgaWYgKCd3ZWJraXQnIGluIHdpbmRvd1xuICAgICAgJiYgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnNcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLmNoYXluc0NhbGxcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLmNoYXluc0NhbGwucG9zdE1lc3NhZ2UpIHtcbiAgICAgIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLmNoYXluc0NhbGwucG9zdE1lc3NhZ2UodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB1cmw7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IEVycm9yOiBjb3VsZCBub3QgZXhlY3V0ZSBDaGF5bnNDYWxsOiAnLCBlKTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEV4ZWN1dGUgYSBDaGF5bnNXZWIgQ2FsbCBpbiB0aGUgcGFyZW50IHdpbmRvdy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZm4gRnVuY3Rpb24gbmFtZVxuICogQHBhcmFtIHtTdHJpbmd9IHBhcmFtcyBBZGRpdGlvbmFsXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBjaGF5bnNXZWJiQ2FsbCBzdWNjZWVkZWRcbiAqL1xuZnVuY3Rpb24gY2hheW5zV2ViQ2FsbChmbiwgcGFyYW1zKSB7XG4gIGlmICghZm4pIHtcbiAgICBsb2cuaW5mbygnY2hheW5zV2ViQ2FsbDogbm8gQ2hheW5zV2ViQ2FsbCBmbicpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmICghcGFyYW1zIHx8IGlzQXJyYXkocGFyYW1zKSkgeyAvLyBBcnJheSBpbmRpY2F0ZXMgdGhhdCB0aGVzZSBhcmUgY2hheW5zQ2FsbHMgcGFyYW1zIFRPRE86IHJlZmFjdG9yXG4gICAgcGFyYW1zID0gJyc7XG4gIH1cbiAgaWYgKGlzT2JqZWN0KHBhcmFtcykpIHsgLy8gYW4gQXJyYXkgaXMgYWxzbyBzZWVuIGFzIE9iamVjdCwgaG93ZXZlciBpdCB3aWxsIGJlIHJlc2V0IGJlZm9yZVxuICAgIHBhcmFtcyA9IEpTT04uc3RyaW5naWZ5KHBhcmFtcyk7XG4gIH1cblxuICBpZiAoaXNGdW5jdGlvbihmbikpIHtcbiAgICByZXR1cm4gZm4uY2FsbChudWxsKTtcbiAgfVxuXG4gIHZhciBuYW1lc3BhY2UgPSAnY2hheW5zLmN1c3RvbVRhYi4nO1xuICB2YXIgdXJsID0gbmFtZXNwYWNlICsgZm4gKyAnOicgKyBwYXJhbXM7XG5cbiAgbG9nLmRlYnVnKCdjaGF5bnNXYWJDYWxsOiAnICsgdXJsKTtcblxuICB0cnkge1xuICAgIHBhcmVudC5wb3N0TWVzc2FnZSh1cmwsICcqJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cud2FybignY2hheW5zV2ViQ2FsbDogcG9zdE1lc3NnYWUgZmFpbGVkJyk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuIiwiLyoqXG4gKiBAbW9kdWxlIGNvbmZpZ1xuICogQHByaXZhdGVcbiAqL1xuXG5pbXBvcnQge2lzUHJlc2VudCwgaXNCbGFuaywgaXNVbmRlZmluZWQsIGlzQXJyYXksIGV4dGVuZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFN0b3JlIGludGVybmFsIGNoYXlucyBjb25maWd1cmF0aW9uXG4gKiBAdHlwZSB7e2FwcE5hbWU6IHN0cmluZywgYXBwVmVyc2lvbjogbnVtYmVyLCBsb2FkTW9kZXJuaXplcjogYm9vbGVhbiwgbG9hZFBvbHlmaWxsczogYm9vbGVhbiwgdXNlRmV0Y2g6IGJvb2xlYW4sIHByb21pc2VzOiBzdHJpbmcsIHVzZU9mZmxpbmVDYWNoaW5nOiBib29sZWFuLCB1c2VMb2NhbFN0b3JhZ2U6IGJvb2xlYW4sIGhhc0FkbWluOiBib29sZWFuLCBtdWx0aUxpbmd1YWw6IGJvb2xlYW4sIGlzUHVibGlzaGVkOiBib29sZWFuLCBkZWJ1Z01vZGU6IGJvb2xlYW4sIHVzZUFqYXg6IGJvb2xlYW59fVxuICogQHByaXZhdGVcbiAqL1xudmFyIF9jb25maWcgPSB7XG4gIGFwcE5hbWU6ICdDaGF5bnMgQXBwJywgICAvLyBhcHAgTmFtZVxuICBhcHBWZXJzaW9uOiAxLCAgICAgICAgICAgLy8gYXBwIFZlcnNpb25cbiAgcHJldmVudEVycm9yczogdHJ1ZSwgICAgICAgIC8vIGVycm9yIGhhbmRsZXIgY2FuIGhpZGUgZXJyb3JzIChjYW4gYmUgb3Zlcnd0aXR0ZW4gYnkgaXNQcm9kdWN0aW9uKVxuICBpc1Byb2R1Y3Rpb246IHRydWUsICAgICAgLy8gcHJvZHVjdGlvbiwgZGV2ZWxvcG1lbnQgYW5kIHRlc3QgRU5WXG4gIGxvYWRNb2Rlcm5pemVyOiB0cnVlLCAgICAvLyBsb2FkIG1vZGVybml6ZXJcbiAgbG9hZFBvbHlmaWxsczogdHJ1ZSwgICAgIC8vIGxvYWQgcG9seWZpbGxzXG4gIHVzZUZldGNoOiB0cnVlLCAgICAgICAgICAvLyB1c2Ugd2luZG93LmZldGNoIGFuZCBpdCdzIHBvbHlmaWxsc1xuICBwcm9taXNlczogJ3EnLCAgICAgICAgICAgLy8gcHJvbWlzZSBTZXJ2aWNlOiBRIGlzIHN0YW5kYXJkXG4gIHVzZU9mZmxpbmVDYWNoaW5nOiBmYWxzZSwvLyBpcyBvZmZsaW5lIGNhY2hpbmcgdXNlZD8gaW5sY3VkZSBvZmZsaW5lIGhlbHBlclxuICB1c2VMb2NhbFN0b3JhZ2U6IGZhbHNlLCAgLy8gaXMgbG9jYWxTdG9yYWdlIHVzZWQ/IGluY2x1ZGUgaGVscGVyXG4gIGhhc0FkbWluOiBmYWxzZSwgICAgICAgICAvLyBkb2VzIHRoaXMgYXBwL3BhZ2UgaGF2ZSBhbiBhZG1pbj9cbiAgbXVsdGlMaW5ndWFsOiB0cnVlLCAgICAgIC8vIGVuYWJsZSBpMThuP1xuICBpc1B1Ymxpc2hlZDogdHJ1ZSwgICAgICAgLy8gb25seSBpbiBpbnRlcm5hbCB0b2JpdCBhdmFpbGFibGVcbiAgZGVidWdNb2RlOiB0cnVlLCAgICAgICAgIC8vIHNob3cgY29uc29sZSBvdXRwdXQsIGRlYnVnIHBhcmFtIGZvciBsb2dnaW5nXG4gIHVzZUFqYXg6IGZhbHNlLFxuICBpc0ludGVybmFsOiBmYWxzZSAgICAgICAgLy8gdXNlIGludGVybmFsIHJvdXRpbmdcbiAgLy9mcmFtZXdvcms6IFsnRW1iZXInLCAnQW5ndWxhcicsICdCYWNrYm9uZScsICdBbXBlcnNhbmQnLCAnUmVhY3QnLCAnalF1ZXJ5J11cbn07XG5cbi8vIFRPRE86IHJlbW92ZVxuLypleHBvcnQgZnVuY3Rpb24gY29uZmlnKCkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIHJldHVybiBDb25maWcuc2V0KGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdKTsgLy8gVE9ETzogcmVmYWN0b3IgdGhpc1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gQ29uZmlnLmdldChhcmd1bWVudHMpO1xuICB9XG4gIHJldHVybiBDb25maWcuZ2V0KCk7XG59Ki9cblxuLy8gVE9ETzogcmVmYWN0b3IgdG8gTWFwXG5leHBvcnQgY2xhc3MgQ29uZmlnIHtcblxuICAvKipcbiAgICogQG1ldGhvZCBnZXRcbiAgICogQGNsYXNzIENvbmZpZ1xuICAgKiBAbW9kdWxlIGNoYXlucy5jb25maWdcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBSZWZlcmVuY2UgdGhlIGBrZXlgIGluIHRoZSBjb25maWcgYE9iamVjdGBcbiAgICogQHJldHVybnMge251bGx9IFZhbHVlIG9mIHRoZSBga2V5YCBpbiB0aGUgY29uZmlnIGBPYmplY3RgXG4gICAqICAgICAgICAgICAgICAgICBgdW5kZWZpbmVkYCBpZiB0aGUgYGtleWAgd2FzIG5vdCBmb3VuZFxuICAgKi9cbiAgc3RhdGljIGdldChrZXkpIHtcbiAgICBpZiAoaXNQcmVzZW50KGtleSkpIHtcbiAgICAgIHJldHVybiBfY29uZmlnW2tleV07XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcGFyYW0gdmFsdWVcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzdGF0aWMgc2V0KGtleSwgdmFsdWUpIHtcbiAgICBpZiAoaXNCbGFuayhrZXkpIHx8IGlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBUT0RPOiBnb29kIGlkZWE/IG9uZSBzaG91bGQgYmUgY2FyZWZ1bCBpIHN1cHBvc2VcbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGV4dGVuZChfY29uZmlnLCB2YWx1ZSk7XG4gICAgfVxuICAgIF9jb25maWdba2V5XSA9IHZhbHVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzdGF0aWMgaGFzKGtleSkge1xuICAgIHJldHVybiAhIWtleSAmJiAoa2V5IGluIF9jb25maWcpO1xuICB9XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3QsIERPTX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtDb25maWd9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7bWVzc2FnZUxpc3RlbmVyfSBmcm9tICcuL2NhbGxiYWNrcyc7XG5pbXBvcnQge2NoYXluc0FwaUludGVyZmFjZX0gZnJvbSAnLi9jaGF5bnNfYXBpX2ludGVyZmFjZSc7XG5cbi8vIGNyZWF0ZSBuZXcgTG9nZ2VyIGluc3RhbmNlXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY29yZScpO1xuXG4vLyBkaXNhYmxlIEpTIEVycm9ycyBpbiB0aGUgY29uc29sZVxuQ29uZmlnLnNldCgncHJldmVudEVycm9ycycsIGZhbHNlKTtcblxuLyoqXG4gKlxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqXG4gKiBAdHlwZSB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgRE9NIGlzIGxvYWRlZFxuICogQHByaXZhdGVcbiAqL1xudmFyIGRvbVJlYWR5ID0gZmFsc2U7XG5cbi8qKlxuICpcbiAqIEBkZXNjcmlwdGlvblxuICpcbiAqXG4gKiBAdHlwZSB7YXJyYXl9IENvbnRhaW5zIGNhbGxiYWNrcyBmb3IgdGhlIERPTSByZWFkeSBldmVudFxuICogQHByaXZhdGVcbiAqL1xudmFyIHJlYWR5Q2FsbGJhY2tzID0gW107XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLnByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlcih1c2VyQ29uZmlnKSB7XG4gIGxvZy5pbmZvKCdjaGF5bnMucmVnaXN0ZXInKTtcbiAgQ29uZmlnLnNldCh1c2VyQ29uZmlnKTsgLy8gdGhpcyByZWZlcmVuY2UgdG8gdGhlIGNoYXlucyBvYmpcbiAgcmV0dXJuIHRoaXM7XG59XG5cbi8vIFRPRE86IHJlZ2lzdGVyIGBGdW5jdGlvbmAgb3IgcHJlQ2hheW5zIGBPYmplY3RgP1xuZXhwb3J0IGZ1bmN0aW9uIHByZUNoYXlucygpIHtcbiAgaWYgKCdwcmVDaGF5bnMnIGluIHdpbmRvdyAmJiBpc09iamVjdCh3aW5kb3cucHJlQ2hheW5zKSkge1xuICAgIC8vIGZpbGwgY29uZmlnXG4gIH1cbn1cblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMucHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWR5KGNiKSB7XG4gIGxvZy5pbmZvKCdjaGF5bnMucmVhZHknKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGRvbVJlYWR5KSB7XG4gICAgLy8gVE9ETzogcmV0dXJuIGEgY3VzdG9tIE1vZGVsIE9iamVjdCBpbnN0ZWFkIG9mIGBjb25maWdgXG4gICAgY2Ioe1xuICAgICAgYXBwTmFtZTpDb25maWcuZ2V0KCdhcHBOYW1lJyksXG4gICAgICBhcHBWZXJzaW9uOiBDb25maWcuZ2V0KCdhcHBWZXJzaW9uJylcbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cbiAgcmVhZHlDYWxsYmFja3MucHVzaChhcmd1bWVudHNbMF0pO1xufVxuXG4vKipcbiAqIEBuYW1lIHByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSBvYmogUmVmZXJlbmNlIHRvIGNoYXlucyBPYmplY3RcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoKSB7XG4gIGxvZy5pbmZvKCdzdGFydCBjaGF5bnMgc2V0dXAnKTtcblxuICAvLyBlbmFibGUgYGNoYXlucy5jc3NgIGJ5IGFkZGluZyBgY2hheW5zYCBjbGFzc1xuICAvLyByZW1vdmUgYG5vLWpzYCBjbGFzcyBhbmQgYWRkIGBqc2AgY2xhc3NcbiAgbGV0IGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICBET00uYWRkQ2xhc3MoYm9keSwgJ2NoYXlucycpO1xuICBET00uYWRkQ2xhc3MoYm9keSwgJ2pzJyk7XG4gIERPTS5yZW1vdmVDbGFzcyhib2R5LCAnbm8tanMnKTtcblxuXG4gIC8vIHJ1biBwb2x5ZmlsbCAoaWYgcmVxdWlyZWQpXG5cbiAgLy8gcnVuIG1vZGVybml6ZXIgKGZlYXR1cmUgZGV0ZWN0aW9uKVxuXG4gIC8vIHJ1biBmYXN0Y2xpY2tcblxuICAvLyAodmlld3BvcnQgc2V0dXApXG5cbiAgLy8gY3JhdGUgbWV0YSB0YWdzIChjb2xvcnMsIG1vYmlsZSBpY29ucyBldGMpXG5cbiAgLy8gZG8gc29tZSBTRU8gc3R1ZmYgKGNhbm9uaWNhbCBldGMpXG5cbiAgLy8gZGV0ZWN0IHVzZXIgKGxvZ2dlZCBpbj8pXG5cbiAgLy8gcnVuIGNoYXlucyBzZXR1cCAoY29sb3JzIGJhc2VkIG9uIGVudmlyb25tZW50KVxuXG5cblxuICAvLyBzZXQgRE9NIHJlYWR5IGV2ZW50XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24oKSB7XG5cbiAgICBkb21SZWFkeSA9IHRydWU7XG4gICAgbG9nLmRlYnVnKCdET00gcmVhZHknKTtcblxuICAgIC8vIGFkZCBjaGF5bnMgcm9vdCBlbGVtZW50XG4gICAgbGV0IGNoYXluc1Jvb3QgPSBET00uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgY2hheW5zUm9vdC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2NoYXlucy1yb290Jyk7XG4gICAgY2hheW5zUm9vdC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NoYXluc19fcm9vdCcpO1xuICAgIERPTS5hcHBlbmRDaGlsZChib2R5LCBjaGF5bnNSb290KTtcblxuICAgIC8vIGRvbS1yZWFkeSBjbGFzc1xuICAgIERPTS5hZGRDbGFzcyhkb2N1bWVudC5ib2R5LCAnZG9tLXJlYWR5Jyk7XG5cbiAgICAvLyBnZXQgdGhlIEFwcCBJbmZvcm1hdGlvbiwgaGFzIHRvIGJlIGRvbmUgd2hlbiBkb2N1bWVudCByZWFkeVxuICAgIGxldCBnZXRBcHBJbmZvcm1hdGlvbkNhbGwgPSAhY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICAvLyBub3cgQ2hheW5zIGlzIG9mZmljaWFsbHkgcmVhZHlcblxuICAgICAgbG9nLmRlYnVnKCdhcHBJbmZvcm1hdGlvbiBjYWxsYmFjaycsIGRhdGEpO1xuXG4gICAgICByZWFkeUNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgICAgcmVhZHlDYWxsYmFja3MgPSBbXTtcblxuICAgICAgRE9NLmFkZENsYXNzKGRvY3VtZW50LmJvZHksICdjaGF5bnMtcmVhZHknKTtcbiAgICAgIERPTS5yZW1vdmVBdHRyaWJ1dGUoRE9NLnF1ZXJ5KCdbY2hheW5zLWNsb2FrXScpLCAnY2hheW5zLWNsb2FrJyk7XG5cbiAgICAgIGxvZy5pbmZvKCdmaW5pc2hlZCBjaGF5bnMgc2V0dXAnKTtcbiAgICB9KTtcblxuICAgIGlmIChnZXRBcHBJbmZvcm1hdGlvbkNhbGwpIHtcbiAgICAgIGxvZy5lcnJvcignVGhlIEFwcCBJbmZvcm1hdGlvbiBjb3VsZCBub3QgYmUgcmV0cmlldmVkLicpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gc3RhcnQgd2luZG93Lm9uKCdtZXNzYWdlJykgbGlzdGVuZXIgZm9yIEZyYW1lIENvbW11bmljYXRpb25cbiAgbWVzc2FnZUxpc3RlbmVyKCk7XG5cblxufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZWN0IGBCcm93c2VyYCwgYE9TYCBhbmQgJ0RldmljZWBcbiAqIGFzIHdlbGwgYXMgYENoYXlucyBFbnZpcm9ubWVudGAsIGBDaGF5bnMgVXNlcmAgYW5kIGBDaGF5bnMgU2l0ZWBcbiAqIGFuZCBhc3NpZ24gdGhlIGRhdGEgaW50byB0aGUgZW52aXJvbm1lbnQgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIHNldEVudmlyb25tZW50KCkge1xuXG59XG4iLCIvKipcbiAqIEBtb2R1bGUgY2hheW5zLmVudmlyb25tZW50XG4gKiBAZGVzY3JpcHRpb25cbiAqIENoYXlucyBFbnZpcm9ubWVudFxuICovXG5cbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICcuLi91dGlscyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuZW52aXJvbm1lbnQnKTtcblxuLy8gVE9ETzogaW1wb3J0IGRlcGVuZGVuY2llc1xuZXhwb3J0IHZhciB0eXBlcyA9IHt9O1xuXG50eXBlcy5icm93c2VyID0gW1xuICAnY2hyb21lJyxcbiAgJ2ZpcmVmb3gnLFxuICAnc2FmYXJpJyxcbiAgJ29wZXJhJyxcbiAgJ2Nocm9tZSBtb2JpbGUnLFxuICAnc2FmYXJpIG1vYmlsZScsXG4gICdmaXJlZm94IG1vYmlsZSdcbl07XG5cbnR5cGVzLm9zID0gW1xuICAnd2luZG93cycsXG4gICdtYWNPUycsXG4gICdhbmRyb2lkJyxcbiAgJ2lvcycsXG4gICd3cCdcbl07XG5cbnR5cGVzLmNoYXluc09TID0ge1xuICB3ZWI6ICd3ZWJzaGFkb3cnLFxuICB3ZWJNb2JpbGU6ICd3ZWJzaGFkb3dtb2JpbGUnLFxuICBhcHA6ICd3ZWJzaGFkb3dtb2JpbGUnXG59O1xuXG4vLyBUT0RPOiBoaWRlIGludGVybmFsIHBhcmFtZXRlcnMgZnJvbSB0aGUgb3RoZXJzXG4vLyBUT0RPOiBvZmZlciB1c2VyIGFuIGBPYmplY3RgIHdpdGggVVJMIFBhcmFtZXRlcnNcbi8vIGxvY2F0aW9uIHF1ZXJ5IHN0cmluZ1xudmFyIHF1ZXJ5ID0gbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKTtcbnZhciBwYXJhbWV0ZXJzID0ge307XG5xdWVyeS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24ocGFydCkge1xuICB2YXIgaXRlbSA9IHBhcnQuc3BsaXQoJz0nKTtcbiAgcGFyYW1ldGVyc1tpdGVtWzBdLnRvTG93ZXJDYXNlKCldID0gZGVjb2RlVVJJQ29tcG9uZW50KGl0ZW1bMV0pLnRvTG93ZXJDYXNlKCk7XG59KTtcblxuLy8gdmVyaWZ5IGJ5IGNoYXlucyByZXF1aXJlZCBwYXJhbWV0ZXJzIGV4aXN0XG5pZiAoIXBhcmFtZXRlcnMuYXBwdmVyc2lvbikge1xuICBsb2cud2Fybignbm8gYXBwIHZlcnNpb24gcGFyYW1ldGVyJyk7XG59XG5pZiAoIXBhcmFtZXRlcnMub3MpIHtcbiAgbG9nLndhcm4oJ25vIG9zIHBhcmFtZXRlcicpO1xufVxuaWYgKHBhcmFtZXRlcnMuZGVidWcpIHtcbiAgLy8gVE9ETzogZW5hYmxlIGRlYnVnIG1vZGVcbn1cblxuLy8gVE9ETzogZnVydGhlciBwYXJhbXMgYW5kIGNvbG9yc2NoZW1lXG4vLyBUT0RPOiBkaXNjdXNzIHJvbGUgb2YgVVJMIHBhcmFtcyBhbmQgdHJ5IHRvIHJlcGxhY2UgdGhlbSBhbmQgb25seSB1c2UgQXBwRGF0YVxuXG5cbmZ1bmN0aW9uIGdldEZpcnN0TWF0Y2gocmVnZXgpIHtcbiAgdmFyIG1hdGNoID0gdWEubWF0Y2gocmVnZXgpO1xuICByZXR1cm4gKG1hdGNoICYmIG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2hbMV0pIHx8ICcnO1xufVxuXG4vLyB1c2VyIGFnZW50IGRldGVjdGlvblxudmFyIHVzZXJBZ2VudCA9ICh3aW5kb3cubmF2aWdhdG9yICYmIG5hdmlnYXRvci51c2VyQWdlbnQpIHx8ICcnO1xuXG52YXIgaXMgPSB7XG4gIGlvczogL2lQaG9uZXxpUGFkfGlQb2QvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGFuZHJvaWQ6IC9BbmRyb2lkL2kudGVzdCh1c2VyQWdlbnQpLFxuICB3cDogL3dpbmRvd3MgcGhvbmUvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGJiOiAvQmxhY2tCZXJyeXxCQjEwfFJJTS9pLnRlc3QodXNlckFnZW50KSxcblxuICBvcGVyYTogKCEhd2luZG93Lm9wZXJhIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignIE9QUi8nKSA+PSAwKSxcbiAgZmlyZWZveDogKHR5cGVvZiBJbnN0YWxsVHJpZ2dlciAhPT0gJ3VuZGVmaW5lZCcpLFxuICBzYWZhcmk6IChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93LkhUTUxFbGVtZW50KS5pbmRleE9mKCdDb25zdHJ1Y3RvcicpID4gMCksXG4gIGNocm9tZTogKCEhd2luZG93LmNocm9tZSAmJiAhKCEhd2luZG93Lm9wZXJhIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignIE9QUi8nKSA+PSAwKSksXG4gIGllOiBmYWxzZSB8fCAhIWRvY3VtZW50LmRvY3VtZW50TW9kZSxcbiAgaWUxMTogL21zaWUgMTEvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllMTA6IC9tc2llIDEwL2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTk6IC9tc2llIDkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllODogL21zaWUgOC9pLnRlc3QodXNlckFnZW50KSxcblxuICBtb2JpbGU6IC8oaXBob25lfGlwb2R8KCg/OmFuZHJvaWQpPy4qP21vYmlsZSl8YmxhY2tiZXJyeXxub2tpYSkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHRhYmxldDogLyhpcGFkfGFuZHJvaWQoPyEuKm1vYmlsZSl8dGFibGV0KS9pLnRlc3QodXNlckFnZW50KSxcbiAga2luZGxlOiAvXFxXKGtpbmRsZXxzaWxrKVxcVy9pLnRlc3QodXNlckFnZW50KSxcbiAgdHY6IC9nb29nbGV0dnxzb255ZHR2L2kudGVzdCh1c2VyQWdlbnQpXG59O1xuXG4vLyBUT0RPOiBCcm93c2VyIFZlcnNpb24gYW5kIE9TIFZlcnNpb24gZGV0ZWN0aW9uXG5cbi8vIFRPRE86IGFkZCBmYWxsYmFja1xudmFyIG9yaWVudGF0aW9uID0gTWF0aC5hYnMod2luZG93Lm9yaWVudGF0aW9uICUgMTgwKSA9PT0gMCA/ICdwb3J0cmFpdCcgOiAnbGFuZHNjYXBlJztcbnZhciB2aWV3cG9ydCA9IHdpbmRvdy5pbm5lcldpZHRoICsgJ3gnICsgd2luZG93LmlubmVySGVpZ2h0O1xuXG5leHBvcnQgdmFyIGVudmlyb25tZW50ID0ge1xuXG4gIC8vb3M6IHBhcmFtZXRlcnMub3MsXG4gIG9zVmVyc2lvbjogMSxcblxuICBicm93c2VyOiAnJyxcbiAgYnJvd3NlclZlcnNpb246IDEsXG5cbiAgLy9hcHBWZXJzaW9uOiBwYXJhbWV0ZXJzLmFwcHZlcnNpb24sXG5cbiAgLy9vcmllbnRhdGlvbjogb3JpZW50YXRpb24sXG5cbiAgLy92aWV3cG9ydDogdmlld3BvcnQsIC8vIGluIDF4MSBpbiBweFxuXG4gIC8vcmF0aW86IDEsIC8vIHBpeGVsIHJhdGlvXG5cbiAgLy9pc0luRnJhbWU6IGZhbHNlLFxuXG4gIC8vaXNDaGF5bnNXZWI6IG51bGwsIC8vIGRlc2t0b3AgYnJvd3Nlciwgbm8gQXBwLCBubyBtb2JpbGVcbiAgLy9pc0NoYXluc1dlYk1vYmlsZTogbnVsbCwgLy8gbW9iaWxlIGJyb3dzZXIsIG5vIEFwcCwgbm8gZGVza3RvcFxuICAvL2lzQXBwOiBmYWxzZSwgLy8gb3RoZXJ3aXNlIEJyb3dzZXJcbiAgLy9pc01vYmlsZTogbnVsbCwgLy8gbm8gZGVza3RvcCwgYnV0IG1vYmlsZSBicm93c2VyIGFuZCBhcHBcbiAgLy9pc1RhYmxldDogbnVsbCwgLy8gbm8gZGVza3RvcCwga2luZGEgbW9iaWxlLCBtb3N0IGxpa2VseSBubyBhcHBcbiAgLy9pc0Rlc2t0b3A6IG51bGwsIC8vIG5vIGFwcCwgbm8gbW9iaWxlXG4gIC8vaXNCcm93c2VyOiBudWxsLCAvLyBvdGhlcndpc2UgQXBwXG5cbiAgLy9pc0lPUzogaXMuaW9zLFxuICAvL2lzQW5kcm9pZDogaXMuYW5kcm9pZCxcbiAgLy9pc1dQOiBpcy53cCxcbiAgLy9pc0JCOiBpcy5iYixcblxuICAvL3BhcmFtZXRlcnM6IHBhcmFtZXRlcnMsXG4gIC8vaGFzaDogbG9jYXRpb24uaGFzaC5zdWJzdHIoMSksXG5cbiAgc2l0ZToge1xuICAgIHNpdGVJZDogMSxcbiAgICBuYW1lOiAnVG9iaXQnLFxuICAgIGxvY2F0aW9uSWQ6IDEsXG4gICAgdXJsOiAnaHR0cHM6Ly90b2JpdC5jb20vJyxcbiAgICB1c2VTU0w6IHRydWUsXG4gICAgY29sb3JzY2hlbWU6IDFcbiAgICAvL2VkaXRNb2RlOiBmYWxzZSwgLy8gZnV0dXJlIGVkaXQgbW9kZSBmb3IgY29udGVudFxuICAgIC8vaXNBZG1pbk1vZGU6IHRydWVcbiAgfSxcblxuICAvLyBUT0RPOiBjb25zaWRlciBUYXBwXG4gIGFwcDoge1xuICAgIGFwcElkOiAxLFxuICAgIGNvbmZpZzoge30sXG4gICAgLy9kZWZhdWx0Q29udGlmOiB7fSxcbiAgICBkb21SZWFkeTogZmFsc2UsXG4gICAgbG9nczoge1xuICAgICAgbG9nOiBbXSxcbiAgICAgIGRlYnVnOiBbXSxcbiAgICAgIHdhcm46IFtdXG4gICAgfSxcbiAgICBlcnJvcnM6IFtdXG4gIH1cbn07XG5cbmVudmlyb25tZW50LnBhcmFtZXRlcnMgPSBwYXJhbWV0ZXJzO1xuZW52aXJvbm1lbnQuaGFzaCA9IGxvY2F0aW9uLmhhc2guc3Vic3RyKDEpO1xuXG4vLyBXQVRDSCBPVVQgdGhlIE9TIGlzIHNldCBieSBwYXJhbWV0ZXIgKHVuZm9ydHVuYXRlbHkpXG5lbnZpcm9ubWVudC5vcyA9IHBhcmFtZXRlcnMub3MgfHwgJ25vT1MnOyAvLyBUT0RPOiByZWZhY3RvciBPU1xuaWYgKGlzLm1vYmlsZSAmJiBbJ2FuZHJvaWQnLCAnaW9zJywgJ3dwJ10uaW5kZXhPZihwYXJhbWV0ZXJzLm9zKSAhPT0gLTEpIHtcbiAgcGFyYW1ldGVycy5vcyA9IHR5cGVzLmNoYXluc09TLmFwcDtcbn1cblxuLy8gZGV0ZWN0aW9uIGJ5IHVzZXIgYWdlbnRcbmVudmlyb25tZW50LmlzSU9TID0gaXMuaW9zO1xuZW52aXJvbm1lbnQuaXNBbmRyb2lkID0gaXMuYW5kcm9pZDtcbmVudmlyb25tZW50LmlzV1AgPSBpcy53cDtcbmVudmlyb25tZW50LmlzQkIgPSBpcy5iYjtcblxuLy8gVE9ETzogbWFrZSBzdXJlIHRoYXQgdGhpcyBhbHdheXMgd29ya3MhIChUU1BOLCBjcmVhdGUgaWZyYW1lIHRlc3QgcGFnZSlcbmVudmlyb25tZW50LmlzSW5GcmFtZSA9ICh3aW5kb3cgIT09IHdpbmRvdy50b3ApO1xuXG5lbnZpcm9ubWVudC5pc0FwcCA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy5hcHAgJiYgaXMubW9iaWxlICYmICFlbnZpcm9ubWVudC5pc0luRnJhbWUpOyAvLyBUT0RPOiBkb2VzIHRoaXMgYWx3YXlzIHdvcms/XG5lbnZpcm9ubWVudC5hcHBWZXJzaW9uID0gcGFyYW1ldGVycy5hcHB2ZXJzaW9uO1xuXG5lbnZpcm9ubWVudC5pc0Jyb3dzZXIgPSAhZW52aXJvbm1lbnQuaXNBcHA7XG5cbmVudmlyb25tZW50LmlzRGVza3RvcCA9ICghaXMubW9iaWxlICYmICFpcy50YWJsZXQpO1xuXG5lbnZpcm9ubWVudC5pc01vYmlsZSA9IGlzLm1vYmlsZTtcbmVudmlyb25tZW50LmlzVGFibGV0ID0gaXMudGFibGV0O1xuXG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYk1vYmlsZSA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy53ZWJNb2JpbGUpICYmIGVudmlyb25tZW50LmlzSW5GcmFtZTtcbmVudmlyb25tZW50LmlzQ2hheW5zV2ViRGVza3RvcCA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy53ZWIpICYmIGVudmlyb25tZW50LmlzSW5GcmFtZTtcbmVudmlyb25tZW50LmlzQ2hheW5zV2ViID0gZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wIHx8IGVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlO1xuXG4vLyBpbnRlcm5hbCBUT0RPOiBtYWtlIGl0IHByaXZhdGU/XG5lbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsID0gZW52aXJvbm1lbnQuaXNBcHA7XG5lbnZpcm9ubWVudC5jYW5DaGF5bnNXZWJDYWxsID0gZW52aXJvbm1lbnQuaXNDaGF5bnNXZWI7XG5cbmVudmlyb25tZW50LnZpZXdwb3J0ID0gdmlld3BvcnQ7IC8vIFRPRE86IHVwZGF0ZSBvbiByZXNpemU/IG5vLCBkdWUgcGVyZm9ybWFuY2VcbmVudmlyb25tZW50Lm9yaWVudGF0aW9uID0gb3JpZW50YXRpb247XG5lbnZpcm9ubWVudC5yYXRpbyA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuIiwiZXhwb3J0IHZhciB1c2VyID0ge1xuICBuYW1lOiAnUGFjYWwgV2VpbGFuZCcsXG4gIGZpcnN0TmFtZTogJ1Bhc2NhbCcsXG4gIGxhc3ROYW1lOiAnV2VpbGFuZCcsXG4gIHVzZXJJZDogMTIzNCxcbiAgZmFjZWJvb2tJZDogMTIzNDUsXG4gIGlzQWRtaW46IHRydWUsXG4gIHVhY0dyb3VwczogW10sXG4gIGxhbmd1YWdlOiAnZGVfREUnLFxuICB0b2tlbjogJ3Rva2VuJyAvLyBUT0RPIGluY2x1ZGUgdG9rZW4gaGVyZT9cbn07XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgLy9cbiAgLy9pZiAoc2VsZi5mZXRjaCkge1xuICAvLyAgcmV0dXJuXG4gIC8vfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIC8vIEluc3RlYWQgb2YgaXRlcmFibGUgZm9yIG5vdy5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5tYXApLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgY2FsbGJhY2sobmFtZSwgc2VsZi5tYXBbbmFtZV0pXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKCk7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKCFib2R5KSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgIH1cblxuICAgICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoIWJvZHkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QodXJsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB0aGlzLnVybCA9IHVybFxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIG9wdGlvbnMuYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShvcHRpb25zLmJvZHkpXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhlYWRlcnMoeGhyKSB7XG4gICAgdmFyIGhlYWQgPSBuZXcgSGVhZGVycygpXG4gICAgdmFyIHBhaXJzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuZmV0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgaWYgKHNlbGYuY3JlZGVudGlhbHMgPT09ICdjb3JzJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVzcG9uc2VVUkwoKSB7XG4gICAgICAgIGlmICgncmVzcG9uc2VVUkwnIGluIHhocikge1xuICAgICAgICAgIHJldHVybiB4aHIucmVzcG9uc2VVUkxcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF2b2lkIHNlY3VyaXR5IHdhcm5pbmdzIG9uIGdldFJlc3BvbnNlSGVhZGVyIHdoZW4gbm90IGFsbG93ZWQgYnkgQ09SU1xuICAgICAgICBpZiAoL15YLVJlcXVlc3QtVVJMOi9tLnRlc3QoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSkge1xuICAgICAgICAgIHJldHVybiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0dXMgPSAoeGhyLnN0YXR1cyA9PT0gMTIyMykgPyAyMDQgOiB4aHIuc3RhdHVzXG4gICAgICAgIGlmIChzdGF0dXMgPCAxMDAgfHwgc3RhdHVzID4gNTk5KSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBoZWFkZXJzKHhociksXG4gICAgICAgICAgdXJsOiByZXNwb25zZVVSTCgpXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHQ7XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihzZWxmLm1ldGhvZCwgc2VsZi51cmwsIHRydWUpXG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgc2VsZi5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2Ygc2VsZi5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHNlbGYuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMudXJsID0gbnVsbFxuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXNcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gb3B0aW9ucy5zdGF0dXNUZXh0XG4gICAgdGhpcy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzO1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0O1xuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodXJsLCBvcHRpb25zKS5mZXRjaCgpXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKCk7XG4iLCIvKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vamFrZWFyY2hpYmFsZC9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICAyLjAuMFxuICovXG5cbihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoYSxiKXtuW2xdPWE7bltsKzFdPWI7bCs9MjsyPT09bCYmQSgpfWZ1bmN0aW9uIHMoYSl7cmV0dXJuXCJmdW5jdGlvblwiPT09dHlwZW9mIGF9ZnVuY3Rpb24gRigpe3JldHVybiBmdW5jdGlvbigpe3Byb2Nlc3MubmV4dFRpY2sodCl9fWZ1bmN0aW9uIEcoKXt2YXIgYT0wLGI9bmV3IEIodCksYz1kb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIlwiKTtiLm9ic2VydmUoYyx7Y2hhcmFjdGVyRGF0YTohMH0pO3JldHVybiBmdW5jdGlvbigpe2MuZGF0YT1hPSsrYSUyfX1mdW5jdGlvbiBIKCl7dmFyIGE9bmV3IE1lc3NhZ2VDaGFubmVsO2EucG9ydDEub25tZXNzYWdlPXQ7cmV0dXJuIGZ1bmN0aW9uKCl7YS5wb3J0Mi5wb3N0TWVzc2FnZSgwKX19ZnVuY3Rpb24gSSgpe3JldHVybiBmdW5jdGlvbigpe3NldFRpbWVvdXQodCwxKX19ZnVuY3Rpb24gdCgpe2Zvcih2YXIgYT0wO2E8bDthKz0yKSgwLG5bYV0pKG5bYSsxXSksblthXT12b2lkIDAsblthKzFdPXZvaWQgMDtcbmw9MH1mdW5jdGlvbiBwKCl7fWZ1bmN0aW9uIEooYSxiLGMsZCl7dHJ5e2EuY2FsbChiLGMsZCl9Y2F0Y2goZSl7cmV0dXJuIGV9fWZ1bmN0aW9uIEsoYSxiLGMpe3IoZnVuY3Rpb24oYSl7dmFyIGU9ITEsZj1KKGMsYixmdW5jdGlvbihjKXtlfHwoZT0hMCxiIT09Yz9xKGEsYyk6bShhLGMpKX0sZnVuY3Rpb24oYil7ZXx8KGU9ITAsZyhhLGIpKX0pOyFlJiZmJiYoZT0hMCxnKGEsZikpfSxhKX1mdW5jdGlvbiBMKGEsYil7MT09PWIuYT9tKGEsYi5iKToyPT09YS5hP2coYSxiLmIpOnUoYix2b2lkIDAsZnVuY3Rpb24oYil7cShhLGIpfSxmdW5jdGlvbihiKXtnKGEsYil9KX1mdW5jdGlvbiBxKGEsYil7aWYoYT09PWIpZyhhLG5ldyBUeXBlRXJyb3IoXCJZb3UgY2Fubm90IHJlc29sdmUgYSBwcm9taXNlIHdpdGggaXRzZWxmXCIpKTtlbHNlIGlmKFwiZnVuY3Rpb25cIj09PXR5cGVvZiBifHxcIm9iamVjdFwiPT09dHlwZW9mIGImJm51bGwhPT1iKWlmKGIuY29uc3RydWN0b3I9PT1hLmNvbnN0cnVjdG9yKUwoYSxcbmIpO2Vsc2V7dmFyIGM7dHJ5e2M9Yi50aGVufWNhdGNoKGQpe3YuZXJyb3I9ZCxjPXZ9Yz09PXY/ZyhhLHYuZXJyb3IpOnZvaWQgMD09PWM/bShhLGIpOnMoYyk/SyhhLGIsYyk6bShhLGIpfWVsc2UgbShhLGIpfWZ1bmN0aW9uIE0oYSl7YS5mJiZhLmYoYS5iKTt4KGEpfWZ1bmN0aW9uIG0oYSxiKXt2b2lkIDA9PT1hLmEmJihhLmI9YixhLmE9MSwwIT09YS5lLmxlbmd0aCYmcih4LGEpKX1mdW5jdGlvbiBnKGEsYil7dm9pZCAwPT09YS5hJiYoYS5hPTIsYS5iPWIscihNLGEpKX1mdW5jdGlvbiB1KGEsYixjLGQpe3ZhciBlPWEuZSxmPWUubGVuZ3RoO2EuZj1udWxsO2VbZl09YjtlW2YrMV09YztlW2YrMl09ZDswPT09ZiYmYS5hJiZyKHgsYSl9ZnVuY3Rpb24geChhKXt2YXIgYj1hLmUsYz1hLmE7aWYoMCE9PWIubGVuZ3RoKXtmb3IodmFyIGQsZSxmPWEuYixnPTA7ZzxiLmxlbmd0aDtnKz0zKWQ9YltnXSxlPWJbZytjXSxkP0MoYyxkLGUsZik6ZShmKTthLmUubGVuZ3RoPTB9fWZ1bmN0aW9uIEQoKXt0aGlzLmVycm9yPVxubnVsbH1mdW5jdGlvbiBDKGEsYixjLGQpe3ZhciBlPXMoYyksZixrLGgsbDtpZihlKXt0cnl7Zj1jKGQpfWNhdGNoKG4pe3kuZXJyb3I9bixmPXl9Zj09PXk/KGw9ITAsaz1mLmVycm9yLGY9bnVsbCk6aD0hMDtpZihiPT09Zil7ZyhiLG5ldyBUeXBlRXJyb3IoXCJBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuXCIpKTtyZXR1cm59fWVsc2UgZj1kLGg9ITA7dm9pZCAwPT09Yi5hJiYoZSYmaD9xKGIsZik6bD9nKGIsayk6MT09PWE/bShiLGYpOjI9PT1hJiZnKGIsZikpfWZ1bmN0aW9uIE4oYSxiKXt0cnl7YihmdW5jdGlvbihiKXtxKGEsYil9LGZ1bmN0aW9uKGIpe2coYSxiKX0pfWNhdGNoKGMpe2coYSxjKX19ZnVuY3Rpb24gayhhLGIsYyxkKXt0aGlzLm49YTt0aGlzLmM9bmV3IGEocCxkKTt0aGlzLmk9Yzt0aGlzLm8oYik/KHRoaXMubT1iLHRoaXMuZD10aGlzLmxlbmd0aD1iLmxlbmd0aCx0aGlzLmwoKSwwPT09dGhpcy5sZW5ndGg/bSh0aGlzLmMsXG50aGlzLmIpOih0aGlzLmxlbmd0aD10aGlzLmxlbmd0aHx8MCx0aGlzLmsoKSwwPT09dGhpcy5kJiZtKHRoaXMuYyx0aGlzLmIpKSk6Zyh0aGlzLmMsdGhpcy5wKCkpfWZ1bmN0aW9uIGgoYSl7TysrO3RoaXMuYj10aGlzLmE9dm9pZCAwO3RoaXMuZT1bXTtpZihwIT09YSl7aWYoIXMoYSkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIllvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3JcIik7aWYoISh0aGlzIGluc3RhbmNlb2YgaCkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtOKHRoaXMsYSl9fXZhciBFPUFycmF5LmlzQXJyYXk/QXJyYXkuaXNBcnJheTpmdW5jdGlvbihhKXtyZXR1cm5cIltvYmplY3QgQXJyYXldXCI9PT1cbk9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhKX0sbD0wLHc9XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiB3aW5kb3c/d2luZG93Ont9LEI9dy5NdXRhdGlvbk9ic2VydmVyfHx3LldlYktpdE11dGF0aW9uT2JzZXJ2ZXIsdz1cInVuZGVmaW5lZFwiIT09dHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5JiZcInVuZGVmaW5lZFwiIT09dHlwZW9mIGltcG9ydFNjcmlwdHMmJlwidW5kZWZpbmVkXCIhPT10eXBlb2YgTWVzc2FnZUNoYW5uZWwsbj1BcnJheSgxRTMpLEE7QT1cInVuZGVmaW5lZFwiIT09dHlwZW9mIHByb2Nlc3MmJlwiW29iamVjdCBwcm9jZXNzXVwiPT09e30udG9TdHJpbmcuY2FsbChwcm9jZXNzKT9GKCk6Qj9HKCk6dz9IKCk6SSgpO3ZhciB2PW5ldyBELHk9bmV3IEQ7ay5wcm90b3R5cGUubz1mdW5jdGlvbihhKXtyZXR1cm4gRShhKX07ay5wcm90b3R5cGUucD1mdW5jdGlvbigpe3JldHVybiBFcnJvcihcIkFycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheVwiKX07ay5wcm90b3R5cGUubD1cbmZ1bmN0aW9uKCl7dGhpcy5iPUFycmF5KHRoaXMubGVuZ3RoKX07ay5wcm90b3R5cGUuaz1mdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLmxlbmd0aCxiPXRoaXMuYyxjPXRoaXMubSxkPTA7dm9pZCAwPT09Yi5hJiZkPGE7ZCsrKXRoaXMuaihjW2RdLGQpfTtrLnByb3RvdHlwZS5qPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5uO1wib2JqZWN0XCI9PT10eXBlb2YgYSYmbnVsbCE9PWE/YS5jb25zdHJ1Y3Rvcj09PWMmJnZvaWQgMCE9PWEuYT8oYS5mPW51bGwsdGhpcy5nKGEuYSxiLGEuYikpOnRoaXMucShjLnJlc29sdmUoYSksYik6KHRoaXMuZC0tLHRoaXMuYltiXT10aGlzLmgoYSkpfTtrLnByb3RvdHlwZS5nPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmM7dm9pZCAwPT09ZC5hJiYodGhpcy5kLS0sdGhpcy5pJiYyPT09YT9nKGQsYyk6dGhpcy5iW2JdPXRoaXMuaChjKSk7MD09PXRoaXMuZCYmbShkLHRoaXMuYil9O2sucHJvdG90eXBlLmg9ZnVuY3Rpb24oYSl7cmV0dXJuIGF9O1xuay5wcm90b3R5cGUucT1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXM7dShhLHZvaWQgMCxmdW5jdGlvbihhKXtjLmcoMSxiLGEpfSxmdW5jdGlvbihhKXtjLmcoMixiLGEpfSl9O3ZhciBPPTA7aC5hbGw9ZnVuY3Rpb24oYSxiKXtyZXR1cm4obmV3IGsodGhpcyxhLCEwLGIpKS5jfTtoLnJhY2U9ZnVuY3Rpb24oYSxiKXtmdW5jdGlvbiBjKGEpe3EoZSxhKX1mdW5jdGlvbiBkKGEpe2coZSxhKX12YXIgZT1uZXcgdGhpcyhwLGIpO2lmKCFFKGEpKXJldHVybiAoZyhlLG5ldyBUeXBlRXJyb3IoXCJZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuXCIpKSwgZSk7Zm9yKHZhciBmPWEubGVuZ3RoLGg9MDt2b2lkIDA9PT1lLmEmJmg8ZjtoKyspdSh0aGlzLnJlc29sdmUoYVtoXSksdm9pZCAwLGMsZCk7cmV0dXJuIGV9O2gucmVzb2x2ZT1mdW5jdGlvbihhLGIpe2lmKGEmJlwib2JqZWN0XCI9PT10eXBlb2YgYSYmYS5jb25zdHJ1Y3Rvcj09PXRoaXMpcmV0dXJuIGE7dmFyIGM9bmV3IHRoaXMocCxiKTtcbnEoYyxhKTtyZXR1cm4gY307aC5yZWplY3Q9ZnVuY3Rpb24oYSxiKXt2YXIgYz1uZXcgdGhpcyhwLGIpO2coYyxhKTtyZXR1cm4gY307aC5wcm90b3R5cGU9e2NvbnN0cnVjdG9yOmgsdGhlbjpmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuYTtpZigxPT09YyYmIWF8fDI9PT1jJiYhYilyZXR1cm4gdGhpczt2YXIgZD1uZXcgdGhpcy5jb25zdHJ1Y3RvcihwKSxlPXRoaXMuYjtpZihjKXt2YXIgZj1hcmd1bWVudHNbYy0xXTtyKGZ1bmN0aW9uKCl7QyhjLGQsZixlKX0pfWVsc2UgdSh0aGlzLGQsYSxiKTtyZXR1cm4gZH0sXCJjYXRjaFwiOmZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLnRoZW4obnVsbCxhKX19O3ZhciB6PXtQcm9taXNlOmgscG9seWZpbGw6ZnVuY3Rpb24oKXt2YXIgYTthPVwidW5kZWZpbmVkXCIhPT10eXBlb2YgZ2xvYmFsP2dsb2JhbDpcInVuZGVmaW5lZFwiIT09dHlwZW9mIHdpbmRvdyYmd2luZG93LmRvY3VtZW50P3dpbmRvdzpzZWxmO1wiUHJvbWlzZVwiaW4gYSYmXCJyZXNvbHZlXCJpblxuYS5Qcm9taXNlJiZcInJlamVjdFwiaW4gYS5Qcm9taXNlJiZcImFsbFwiaW4gYS5Qcm9taXNlJiZcInJhY2VcImluIGEuUHJvbWlzZSYmZnVuY3Rpb24oKXt2YXIgYjtuZXcgYS5Qcm9taXNlKGZ1bmN0aW9uKGEpe2I9YX0pO3JldHVybiBzKGIpfSgpfHwoYS5Qcm9taXNlPWgpfX07XCJmdW5jdGlvblwiPT09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gen0pOlwidW5kZWZpbmVkXCIhPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz16OlwidW5kZWZpbmVkXCIhPT10eXBlb2YgdGhpcyYmKHRoaXMuRVM2UHJvbWlzZT16KX0pLmNhbGwodGhpcyk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzIG9yIHRvYmlcbiAqIEBtb2R1bGUgamFtZXNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgamFtZXMgLSB0b2JpdCBoZWxwZXIgbGlicmFyeVxuICogSGVscGVyIGxpYnJhcnkgc3VwcG9ydGluZyB0aGUgQ2hheW5zIEFQSVxuICovXG5cbi8vIFRPRE86IG1vdmUgYWxsIHRvIGhlbHBlci5qcyBvciB0b2JpL2phbXNcbi8vIFRPRE86IGhlbHBlci5qcyB3aXRoIEVTNiBhbmQgamFzbWluZSAoYW5kIG9yIHRhcGUpXG4vLyBpbmNsdWRlIGhlbHBlciBhcyBtYWluIG1vZHVsZVxuXG4vLyBpbXBvcnRhbnQgaXMqIGZ1bmN0aW9uc1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9pcyc7XG5cbi8vIGV4dGVuZCBvYmplY3QgZnVuY3Rpb25cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXh0ZW5kJztcblxuLy8gTG9nZ2VyXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XG5cbi8vIFRPRE86IGRvIHdlIGV2ZW4gbmVlZCBtb2Rlcm5pemVyP1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL21vZGVybml6ZXInO1xuXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2h0dHAnO1xuXG4vLyBCcm93c2VyIEFQSXMgKHdpbmRvdywgZG9jdW1lbnQsIGxvY2F0aW9uKVxuLy8gVE9ETzogY29uc2lkZXIgdG8gbm90IGJpbmQgYnJvd3NlciB0byB0aGUgdXRpbHMgYE9iamVjdGBcbi8qIGpzaGludCAtVzExNiAqL1xuLyoganNoaW50IC1XMDMzICovXG4vLyBqc2NzOmRpc2FibGUgcGFyc2VFcnJvclxuaW1wb3J0ICogYXMgYnJvd3NlciBmcm9tICcuL3V0aWxzL2Jyb3dzZXInOyAvL25vaW5zcGVjdGlvbiBCYWRFeHByZXNzaW9uU3RhdGVtZW50SlMganNoaW50IGlnbm9yZTogbGluZVxuLy8ganNjczplbmFibGUgcGFyc2VFcnJvclxuLyoganNoaW50ICtXMDMzICovXG4vKiBqc2hpbnQgK1cxMTYgKi9cbmV4cG9ydCB7YnJvd3Nlcn07XG5cbi8vIERPTVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9kb20nO1xuXG4vLyBBbmFseXRpY3Ncbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9hbmFseXRpY3MnO1xuXG4vLyBSZW1vdGVcbi8vIHJlbW90ZSBkZWJ1Z2dpbmcgYW5kIGFuYWx5c2lzXG5cbi8vIGZyb250LWVuZCBFcnJvciBIYW5kbGVyIChjYXRjaGVzIGVycm9ycywgaWRlbnRpZnkgYW5kIGFuYWx5c2VzIHRoZW0pXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Vycm9yJztcblxuLy8gYXV0aCAmIEpXVCBoYW5kbGVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvand0JztcblxuLy8gY29va2llIGhhbmRsZXIgKHdpbGwgYmUgdXNlZCBpbiB0aGUgbG9jYWxfc3RvcmFnZSBhcyBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9jb29raWVfaGFuZGxlcic7XG5cbi8vIGxvY2FsU3RvcmFnZSBoZWxwZXIgKHdoaWNoIGNvb2tpZSBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sb2NhbF9zdG9yYWdlJztcblxuLy8gbWljcm8gZXZlbnQgbGlicmFyeVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9ldmVudHMnO1xuXG4vLyBvZmZsaW5lIGNhY2hlIGhlbHBlclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL29mZmxpbmVfY2FjaGUnO1xuXG4vLyBub3RpZmljYXRpb25zOiB0b2FzdHMsIGFsZXJ0cywgbW9kYWwgcG9wdXBzLCBuYXRpdmUgcHVzaFxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL25vdGlmaWNhdGlvbnMnO1xuXG4vLyBpZnJhbWUgY29tbXVuaWNhdGlvbiBhbmQgaGVscGVyIChDT1JTKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lmcmFtZSc7XG5cbi8vIHBhZ2UgdmlzaWJpbGl0eSBBUElcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9wYWdlX3Zpc2liaWxpdHknO1xuXG4vLyBEYXRlVGltZSBoZWxwZXIgKGNvbnZlcnRzIGRhdGVzLCBDIyBkYXRlLCB0aW1lc3RhbXBzLCBpMThuLCB0aW1lIGFnbylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9kYXRldGltZSc7XG5cblxuLy8gbGFuZ3VhZ2UgQVBJIGkxOG5cbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sYW5ndWFnZSc7XG5cbi8vIGNyaXRpY2FsIGNzc1xuXG4vLyBsb2FkQ1NTXG5cbi8vIGxhenkgbG9hZGluZ1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xhenlfbG9hZGluZyc7XG5cbi8vIChpbWFnZSkgcHJlbG9hZGVyXG4vL2V4cG9ydCAqIGZyb20gJy91dGlscy9wcmVsb2FkZXInO1xuXG4vLyBpc1BlbWl0dGVkIEFwcCBWZXJzaW9uIGNoZWNrXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lzX3Blcm1pdHRlZCc7XG5cblxuLy8gaW4gRnV0dXJlXG4vLyBpbW11dGFibGVcbi8vIHdlYWsgbWFwc1xuLy8gb2JzZXJ2ZXJcbi8vIHdlYiBzb2NrZXRzICh3cywgU2lnbmFsUilcbi8vIHdvcmtlciAoc2hhcmVkIHdvcmtlciwgbGF0ZXIgc2VydmljZSB3b3JrZXIgYXMgd2VsbClcbi8vIGxvY2F0aW9uLCBwdXNoU3RhdGUsIGhpc3RvcnkgaGFuZGxlclxuLy8gY2hheW5zIHNpdGUgYW5kIGNvZGUgYW5hbHlzZXI6IGZpbmQgZGVwcmVjYXRlZCBtZXRob2RzLCBiYWQgY29kZSwgaXNzdWVzIGFuZCBib3R0bGVuZWNrc1xuXG4iLCIvKipcbiAqIFRoaXMgbW9kdWxlIGNvbnRhaW5zIHRoZSBCcm93c2VyIEFQSXNcbiAqXG4gKi9cbi8vIFRPRE86IG1vdmUgb3V0IG9mIHV0aWxzXG52YXIgd2luID0gd2luZG93O1xuXG4vLyB1c2luZyBub2RlIGdsb2JhbCAobWFpbmx5IGZvciB0ZXN0aW5nLCBkZXBlbmRlbmN5IG1hbmFnZW1lbnQpXG52YXIgX2dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93O1xuZXhwb3J0IHtfZ2xvYmFsIGFzIGdsb2JhbH07XG5cbmV4cG9ydCB7d2luIGFzIHdpbmRvd307XG5leHBvcnQgdmFyIGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xuZXhwb3J0IHZhciBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcbmV4cG9ydCB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbmV4cG9ydCB2YXIgY2hheW5zID0gd2luZG93LmNoYXlucztcbmV4cG9ydCB2YXIgY2hheW5zQ2FsbGJhY2tzID0gd2luZG93Ll9jaGF5bnNDYWxsYmFja3M7XG5leHBvcnQgdmFyIGNoYXluc1Jvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hheW5zLXJvb3QnKTtcbmV4cG9ydCB2YXIgcGFyZW50ID0gd2luZG93LnBhcmVudDtcbmV4cG9ydCB2YXIgY29uc29sZSA9IHdpbmRvdy5jb25zb2xlOyAvLyBOT1RFOiBzaG91bGQgbm90IGJlIHVzZWQuIHVzZSBsb2dnZXIgaW5zdGVhZFxuZXhwb3J0IHZhciBnYyA9IHdpbmRvdy5nYyA/ICgpID0+IHdpbmRvdy5nYygpIDogKCkgPT4gbnVsbDtcblxuIiwiLy8gaW5zcGlyZWQgYnkgQW5ndWxhcjIncyBET01cblxuaW1wb3J0IHtkb2N1bWVudH0gZnJvbSAnLi9icm93c2VyJztcbmltcG9ydCB7aXNVbmRlZmluZWR9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgY2xhc3MgRE9NIHtcblxuICAvLyBOT1RFOiBhbHdheXMgcmV0dXJucyBhbiBhcnJheVxuICBzdGF0aWMgJChzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsLmJpbmQoZG9jdW1lbnQpO1xuICB9XG5cbiAgLy8gc2VsZWN0b3JzXG4gIHN0YXRpYyBxdWVyeShzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvcihlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5U2VsZWN0b3JBbGwoZWwsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBvbihlbCwgZXZ0LCBsaXN0ZW5lcikge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZ0LCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY2xvbmUobm9kZSkge1xuICAgIHJldHVybiBub2RlLmNsb25lTm9kZSh0cnVlKTtcbiAgfVxuICBzdGF0aWMgaGFzUHJvcGVydHkoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBuYW1lIGluIGVsZW1lbnQ7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlDbGFzc05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUobmFtZSk7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlUYWdOYW1lKGVsZW1lbnQsIG5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShuYW1lKTtcbiAgfVxuXG4gIC8vIGlucHV0XG4gIHN0YXRpYyBnZXRJbm5lckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwuaW5uZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBnZXRPdXRlckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwub3V0ZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBzZXRIVE1MKGVsLCB2YWx1ZSkge1xuICAgIGVsLmlubmVySFRNTCA9IHZhbHVlO1xuICB9XG4gIHN0YXRpYyBnZXRUZXh0KGVsKSB7XG4gICAgcmV0dXJuIGVsLnRleHRDb250ZW50O1xuICB9XG4gIHN0YXRpYyBzZXRUZXh0KGVsLCB2YWx1ZSkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH1cblxuICAvLyBpbnB1dCB2YWx1ZVxuICBzdGF0aWMgZ2V0VmFsdWUoZWwpIHtcbiAgICByZXR1cm4gZWwudmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldFZhbHVlKGVsLCB2YWx1ZSkge1xuICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gIH1cblxuICAvLyBjaGVja2JveGVzXG4gIHN0YXRpYyBnZXRDaGVja2VkKGVsKSB7XG4gICAgcmV0dXJuIGVsLmNoZWNrZWQ7XG4gIH1cbiAgc3RhdGljIHNldENoZWNrZWQoZWwsIHZhbHVlKSB7XG4gICAgZWwuY2hlY2tlZCA9IHZhbHVlO1xuICB9XG5cbiAgLy8gY2xhc3NcbiAgc3RhdGljIGNsYXNzTGlzdChlbGVtZW50KSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsZW1lbnQuY2xhc3NMaXN0LCAwKTtcbiAgfVxuICBzdGF0aWMgYWRkQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUNsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICB9XG4gIHN0YXRpYyBoYXNDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgfVxuXG4gIC8vIGNzc1xuICBzdGF0aWMgY3NzKGVsZW1lbnQsIHN0eWxlTmFtZSwgc3R5bGVWaGFzYWx1ZSkge1xuICAgIGlmKGlzVW5kZWZpbmVkKHN0eWxlVmFsdWUpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICAgIH1cbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyBzZXRDU1MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZhbHVlKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gc3R5bGVWYWx1ZTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IG51bGw7XG4gIH1cbiAgc3RhdGljIGdldENTUyhlbGVtZW50LCBzdHlsZU5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBkb2M9ZG9jdW1lbnQpIHtcbiAgICByZXR1cm4gZG9jLmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIH1cblxuICBzdGF0aWMgcmVtb3ZlKGVsKSB7XG4gICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudE5vZGU7XG4gICAgcGFyZW50LnJlbW92ZUNoaWxkKGVsKTtcbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICBzdGF0aWMgYXBwZW5kQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5hcHBlbmRDaGlsZChub2RlKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5yZW1vdmVDaGlsZChub2RlKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRCZWZvcmUoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbCk7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0QWZ0ZXIoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbC5uZXh0U2libGluZyk7XG4gIH1cblxuICBzdGF0aWMgdGFnTmFtZShlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIGF0dHJpYnV0ZXNcbiAgc3RhdGljIGdldEF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxuICBzdGF0aWMgc2V0QXR0cmlidXRlKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVBdHRyaWJ1dGUoZWxlbWVudCwgYXR0cmlidXRlKSB7XG4gICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gIH1cbn1cbiIsIi8qKlxuICogRXJyb3IgSGFuZGxlciBNb2R1bGVcbiAqL1xuXG4vLyBUT0RPOiBjb25zaWRlciBpbXBvcnRpbmcgZnJvbSAnLi91dGlscycgb25seVxuaW1wb3J0IHt3aW5kb3cgYXMgd2lufSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuLi9jaGF5bnMvY29uZmlnJztcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVycm9yJyk7XG5cbndpbi5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICBsZXQgbGluZUFuZENvbHVtbkluZm8gPVxuICAgIGVyci5jb2xub1xuICAgICAgPyAnIGxpbmU6JyArIGVyci5saW5lbm8gKyAnLCBjb2x1bW46JyArIGVyci5jb2xub1xuICAgICAgOiAnIGxpbmU6JyArIGVyci5saW5lbm87XG5cbiAgbGV0IGZpbmFsRXJyb3IgPSBbXG4gICAgICAnSmF2YVNjcmlwdCBFcnJvcicsXG4gICAgICBlcnIubWVzc2FnZSxcbiAgICAgIGVyci5maWxlbmFtZSArIGxpbmVBbmRDb2x1bW5JbmZvICsgJyAtPiAnICsgIG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAwLFxuICAgICAgdHJ1ZVxuICBdO1xuXG4gIC8vIFRPRE86IGFkZCBwcm9wZXIgRXJyb3IgSGFuZGxlclxuICBsb2cud2FybihmaW5hbEVycm9yKTtcbiAgaWYoQ29uZmlnLmdldCgncHJldmVudEVycm9ycycpKSB7XG4gICAgZXJyLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufSk7XG4iLCIvLyBUT0RPOiByZWZhY3RvciBhbmQgd3JpdGUgdGVzdHNcbi8vIFRPRE86IGFkZCBleGFtcGxlXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuIGBgYGpzXG4gLy8gRGVtb1xuXG4gZXZlbnRzLnB1Ymxpc2goJy9wYWdlL2xvYWQnLCB7XG5cdHVybDogJy9zb21lL3VybC9wYXRoJyAvLyBhbnkgYXJndW1lbnRcbn0pO1xuXG4gdmFyIHN1YnNjcmlwdGlvbiA9IGV2ZW50cy5zdWJzY3JpYmUoJy9wYWdlL2xvYWQnLCBmdW5jdGlvbihvYmopIHtcblx0Ly8gRG8gc29tZXRoaW5nIG5vdyB0aGF0IHRoZSBldmVudCBoYXMgb2NjdXJyZWRcbn0pO1xuXG4gLy8gLi4uc29tZXRpbWUgbGF0ZXIgd2hlcmUgSSBubyBsb25nZXIgd2FudCBzdWJzY3JpcHRpb24uLi5cbiBzdWJzY3JpcHRpb24ucmVtb3ZlKCk7XG5cbiAvLyAgdmFyIHRhcmdldCA9IHdpbmRvdy5ldmVudCA/IHdpbmRvdy5ldmVudC5zcmNFbGVtZW50IDogZSA/IGUudGFyZ2V0IDogbnVsbDtcbiBgYGBcbiAqL1xuZXhwb3J0IHZhciBldmVudHMgPSAoZnVuY3Rpb24oKSB7XG4gIGxldCB0b3BpY3MgPSB7fTtcbiAgbGV0IG93blByb3BlcnR5ID0gdG9waWNzLmhhc093blByb3BlcnR5O1xuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlOiBmdW5jdGlvbih0b3BpYywgbGlzdGVuZXIpIHtcbiAgICAgIC8vIENyZWF0ZSB0aGUgdG9waWMncyBvYmplY3QgaWYgbm90IHlldCBjcmVhdGVkXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgdG9waWNzW3RvcGljXSA9IFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICBsZXQgaW5kZXggPSB0b3BpY3NbdG9waWNdLnB1c2gobGlzdGVuZXIpIC0xO1xuXG4gICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICByZXR1cm4ge1xuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlbGV0ZSB0b3BpY3NbdG9waWNdW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9LFxuXG4gICAgcHVibGlzaDogZnVuY3Rpb24odG9waWMsIGluZm8pIHtcbiAgICAgIC8vIElmIHRoZSB0b3BpYyBkb2Vzbid0IGV4aXN0LCBvciB0aGVyZSdzIG5vIGxpc3RlbmVycyBpbiBxdWV1ZSwganVzdCBsZWF2ZVxuICAgICAgaWYgKCFvd25Qcm9wZXJ0eS5jYWxsKHRvcGljcywgdG9waWMpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3ljbGUgdGhyb3VnaCB0b3BpY3MgcXVldWUsIGZpcmUhXG4gICAgICB0b3BpY3NbdG9waWNdLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpdGVtKGluZm8gIT09IHVuZGVmaW5lZCA/IGluZm8gOiB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbn0pKCk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmV4dGVuZFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRXh0ZW5kcyB0aGUgZGVzdGluYXRpb24gb2JqZWN0IGJ5IGNvcHlpbmcgcHJvcGVydGllcyBmcm9tIHRoZSBzcmMgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5cbmltcG9ydCB7aXNPYmplY3R9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKG9iaikge1xuICBpZiAoIWlzT2JqZWN0KG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIHZhciBzb3VyY2UsIHByb3A7XG4gIGZvciAodmFyIGkgPSAxLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgZm9yIChwcm9wIGluIHNvdXJjZSkge1xuICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufVxuIiwiLy9pbXBvcnQge3dpbmRvd30gZnJvbSAnLi9icm93c2VyJztcbi8qIGdsb2JhbCBmZXRjaCAqL1xuaW1wb3J0IHtcbiAgZ2V0TG9nZ2VyLFxuICBpc0Zvcm1FbGVtZW50LFxuICBpc1N0cmluZyxcbiAgaXNPYmplY3QsXG4gIGlzRm9ybURhdGFcbiAgfSBmcm9tICcuLi91dGlscyc7XG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5odHRwJyk7XG4vL2xldCBQcm9taXNlID0gd2luZG93LlByb21pc2U7IC8vIG90aGVyd2lzZSBpbXBvcnQgUHJvbWlzZVxuLy9sZXQgZmV0Y2ggPSB3aW5kb3cuZmV0Y2g7IC8vIG90aGVyd2lzZSBpbXBvcnQgZmV0Y2hcblxuXG5cblxuLyoqXG4gKiBGZXRjaCBKU09OIHZpYSBHRVRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0ganNvbiByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZldGNoSlNPTih1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBQT1NUIFJlcXVlc3RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge0hUTUxGb3JtRWxlbWVudFxcRm9ybURhdGFcXFVSTFNlYXJjaFBhcmFtc1xcVVNWU3RyaW5nXFxCbG9ifEJ1ZmZlclNvdXJjZX0gZm9ybVxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0KHVybCwgZm9ybSkge1xuICBpZiAoaXNGb3JtRWxlbWVudChmb3JtKSkge1xuICAgIGZvcm0gPSBuZXcgRm9ybURhdGEoZm9ybSk7XG4gIH1cbiAgcmV0dXJuIGZldGNoKHVybCwge1xuICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgIGJvZHk6IGZvcm1cbiAgfSk7XG59XG5cbi8qKlxuICogUG9zdCBKU09OXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtgT2JqZWN0YH0gZGF0YVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0SlNPTih1cmwsIGRhdGEpIHtcbiAgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICB9IGVsc2UgaWYgKCFpc1N0cmluZyhkYXRhKSkge1xuICAgIGxvZy53YXJuKCdwb3N0SlNPTjogaW52YWxpZCBkYXRhJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZldGNoKHVybCwge1xuICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfSxcbiAgICBib2R5OiBkYXRhXG4gIH0pO1xufVxuXG4vKipcbiAqIFVwbG9hZCBmaWxlXG4gKiBUT0RPOiBhZGQgYWRkaXRpb25hbCBwYXJhbXMgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtJbnB1dC5maWxlfEZvcm1EYXRhfSBkYXRhXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGxvYWQodXJsLCBkYXRhLCBuYW1lKSB7XG4gIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKCk7XG4gIGlmICghaXNGb3JtRGF0YShkYXRhKSkge1xuICAgIGZvcm0uYXBwZW5kKG5hbWUgfHwgJ2ZpbGUnLCBkYXRhKTtcbiAgfSBlbHNlIHtcbiAgICBmb3JtID0gZGF0YTtcbiAgfVxuXG4gIHJldHVybiBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBib2R5OiBmb3JtXG4gIH0pO1xufVxuXG4vKipcbiAqIEZldGNoIHRleHQgb3IgSFRNTCB2aWEgR0VUXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHJldHVybnMge1Byb21pc2V9IHdpdGggdGVzdCByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldCh1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbiAgICB9KTtcbn1cbiIsIi8qKlxuICogQG5hbWUgamFtZXMuaXNVbmRlZmluZWRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgdW5kZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNVbmRlZmluZWQodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBkZWZpbmVkLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBkZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgIT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzUHJlc2VudFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgbmVpdGhlciB1bmRlZmluZWQgbm9yIG51bGwuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHByZXNlbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByZXNlbnQob2JqKSB7XG4gIHJldHVybiBvYmogIT09IHVuZGVmaW5lZCAmJiBvYmogIT09IG51bGw7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNCbGFua1xuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZWl0aGVyIHVuZGVmaW5lZCBvciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBibGFuay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQmxhbmsob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGw7XG59XG5cblxuLyoqXG4qIEBuYW1lIGphbWVzLmlzU3RyaW5nXG4qIEBtb2R1bGUgamFtZXNcbiogQGtpbmQgZnVuY3Rpb25cbipcbiogQGRlc2NyaXB0aW9uXG4qIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgU3RyaW5nYC5cbipcbiogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4qIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgU3RyaW5nYC5cbiovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNOdW1iZXJcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE51bWJlcmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYE51bWJlcmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc09iamVjdFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhbiBgT2JqZWN0YC5cbiAqIG51bGwgaXMgbm90IHRyZWF0ZWQgYXMgYW4gb2JqZWN0LlxuICogSW4gSlMgYXJyYXlzIGFyZSBvYmplY3RzXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhbiBgT2JqZWN0YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQXJyYXlcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYEFycmF5YC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYEFycmF5YC5cbiAqL1xuZXhwb3J0IHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0Z1bmN0aW9uXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBGdW5jdGlvbmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEZ1bmN0aW9uYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0RhdGVcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgdmFsdWUgaXMgYSBkYXRlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBEYXRlYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGF0ZSh2YWx1ZSkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuLy8gVE9ETzogZG9lcyBub3QgYmVsb25nIGluIGhlcmVcbi8qKlxuICogQG5hbWUgdXRpbHMudHJpbVxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZW1vdmVzIHdoaXRlc3BhY2VzLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge1N0cmluZ3wqfSBUcmltbWVkICB2YWx1ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJpbSh2YWx1ZSkge1xuICByZXR1cm4gaXNTdHJpbmcodmFsdWUpID8gdmFsdWUucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpIDogdmFsdWU7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNVVUlEXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgVVVJRGAgKE9TRikuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYFVVSURgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNVVUlEKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXlswLTlhLWZdezR9KFswLTlhLWZdezR9LSl7NH1bMC05YS16XXsxMn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0dVSURcbiAqIEBhbGlhcyB1dGlscy5pc1VVSURcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBHVUlEYCAoTWljcm9zb2Z0IFN0YW5kYXJkKS5cbiAqIElzIGFuIGFsaWFzIHRvIGlzVVVJRFxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBHVUlEYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzR1VJRCh2YWx1ZSkge1xuICByZXR1cm4gaXNVVUlEKHZhbHVlKTtcbn1cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNNYWNBZGRyZXNzXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBNQUMgQWRkcmVzc2AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01hY0FkZHJlc3ModmFsdWUpIHtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhbHVlID0gdHJpbSh2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9eKFswLTlhLWZdezJ9Wy06XSl7NX1bMC05YS1mXXsyfSQvaSkgIT09IG51bGw7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzQkxFQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYEJMRSBBZGRyZXNzYFxuICpcbiAqIEBwYXJhbSB7Kn0gb2JqIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgQkxFIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCTEVBZGRyZXNzKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpIHx8IGlzTWFjQWRkcmVzcyh2YWx1ZSk7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNGb3JtRGF0YVxuICogQG1vZHVsZSB1dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBGb3JtRGF0YSBgT2JqZWN0YC5cbiAqXG4gKiBAcGFyYW0geyp9IG9iaiBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgb2JqYCBpcyBhIGBGb3JtRGF0YWAgT2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGb3JtRGF0YShvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgRm9ybURhdGFdJztcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0Zvcm1FbGVtZW50XG4gKiBAbW9kdWxlIHV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIEZvcm1FbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7Kn0gb2JqIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGBvYmpgIGlzIGEgYEhUTUxGb3JtRWxlbWVudGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Zvcm1FbGVtZW50KG9iaikge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBIVE1MRm9ybUVsZW1lbnRdJztcbn1cbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc09iamVjdH0gZnJvbSAnLi4vdXRpbHMnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLnV0aWxzLmlzX3Blcm1pdHRlZCcpO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGN1cnJlbnQgdXNlcidzIE9TIGFuZCBPUyBWZXJzaW9uIGlzIGhpZ2hlclxuICogb3IgZXF1YWwgdG8gdGhlIHBhc3NlZCByZWZlcmVuY2UgYE9iamVjdGAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZlcnNpb25zIFZlcnNpb25zIGBPYmplY3RgIHdpdGggcGVybWl0dGVkIE9TcyBhbmQgdGhlaXIgdmVyc2lvbi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBvcyBPUyBOYW1lIGFzIGxvd2VyY2FzZSBzdHJpbmcuXG4gKiBAcGFyYW0ge0ludGVnZXJ9IGFwcFZlcnNpb24gQXBwIFZlcnNpb24gTnVtYmVyIGFzIEludGVnZXIgIFRPRE86IGZvcm1hdCBSRkM/XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY3VycmVudCBPUyAmIFZlcnNpb24gYXJlIGRlZmluZWQgaW4gdGhlIHZlcnNpb25zIGBPYmplY3RgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Blcm1pdHRlZCh2ZXJzaW9ucywgb3MsIGFwcFZlcnNpb24pIHtcblxuICBpZiAoIXZlcnNpb25zIHx8ICFpc09iamVjdCh2ZXJzaW9ucykpIHtcbiAgICBsb2cud2Fybignbm8gdmVyc2lvbnMgYE9iamVjdGAgd2FzIHBhc3NlZCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB2ZXJzaW9uc1tvc10gJiYgYXBwVmVyc2lvbiA+PSB2ZXJzaW9uc1tvc107XG59XG4iLCIvKipcbiAqIExvZ0xldmVsIEVudW1cbiAqIG5vbmUgaXMgMFxuICogZGVidWcgaXMgNFxuICogQHR5cGUgRW51bVxuICovXG5leHBvcnQgdmFyIGxldmVscyA9IHtcbiAgbm9uZTogMCxcbiAgZXJyb3I6MSxcbiAgd2FybjoyLFxuICBpbmZvOjMsXG4gIGRlYnVnOjRcbn07XG5cbi8qKlxuICogQ2FuIHN0b3JlIG11bHRpcGxlIGxvZ2dlcnNcbiAqIEB0eXBlIHtgT2JqZWN0YH0gbG9nZ2Vyc1xuICovXG5sZXQgbG9nZ2VycyA9IHt9O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogQXNzaWduIHRoZSBsb2dnZXIgbWV0aG9kLlxuICogQnkgZGVmYXVsdCB0aGUgd2luZG93LmNvbnNvbGUgYE9iamVjdGBcbiAqIEB0eXBlIGB3aW5kb3cuY29uc29sZWBcbiAqL1xubGV0IGxvZ2dlciA9IHdpbmRvdy5jb25zb2xlO1xuXG4vKipcbiAqIFNldCB0aGUgY3VycmVudCBsb2cgTGV2ZWxcbiAqIHVzZSBgc2V0TGV2ZWwobmV3TG9nTGV2ZWwpYCB0byBvdmVyd3JpdGUgdGhpcyB2YWx1ZS5cbiAqIFRPRE86IGVhY2ggbG9nZ2VyIGdldHMgYW4gb3duIGxvZ0xldmVsXG4gKi9cbmxldCBsb2dMZXZlbCA9IGxldmVscy5ub25lO1xuXG4vKipcbiAqXG4gKiBAcGFyYW0gbGV2ZWxcbiAqIEBwYXJhbSBhcmdzXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBsb2cobGV2ZWwsIGFyZ3MsIHByZWZpeCkge1xuICBsZXQgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG4gIGlmIChwcmVmaXgpIHtcbiAgICBhcmdzID0gc2xpY2UuY2FsbChhcmdzKTtcbiAgICAvL2FyZ3MudW5zaGlmdCh0aW1lKTsgLy8gVE9ETzogY29uc2lkZXIgdG9nZ2xlYWJsZSB0aW1lXG4gICAgYXJncy51bnNoaWZ0KHByZWZpeCk7XG4gIH1cbiAgbG9nZ2VyW2xldmVsIHx8ICdsb2cnXS5hcHBseShjb25zb2xlLCBhcmdzKTtcbn1cblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nTGV2ZWxcbiAqIGluIG9yZGVyIHRvIHNob3cgb3Igbm90IHNob3cgbG9nc1xuICogQHBhcmFtIGxldmVsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRMZXZlbChsZXZlbCkge1xuICBsb2dMZXZlbCA9IGxldmVsO1xufVxuXG4vKipcbiAqIEdldCBMb2dnZXIgU2luZ2xldG9uIEluc3RhbmNlXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgVGhlIExvZ2dlcidzIG5hbWVcbiAqIEByZXR1cm5zIHtMb2dnZXJ9IExvZ2dlciBpbnN0YW5jZSwgZWl0aGVyIGV4aXN0aW5nIG9uZSBvciBjcmVhdGVzIGEgbmV3IG9uZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9nZ2VyKG5hbWUpIHtcbiAgcmV0dXJuIGxvZ2dlcnNbbmFtZV0gfHwgKGxvZ2dlcnNbbmFtZV0gPSBuZXcgTG9nZ2VyKG5hbWUpKTtcbn1cblxuLyoqXG4gKiBMb2dnZXIgY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG5cbiAgLyoqXG4gICAqIEVhY2ggbG9nZ2VyIGlzIGlkZW50aWZpZWQgYnkgaXQncyBuYW1lLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBsb2dnZXIgKGUuZy4gYGNoYXlucy5jb3JlYClcbiAgICovXG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSAnWycgKyBuYW1lICsgJ106ICc7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqXG4gICAqIEBtZXRob2QgZGVidWdcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICBkZWJ1ZygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCA0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnZGVidWcnLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBpbmZvLlxuICAgKlxuICAgKiBAbWV0aG9kIGluZm9cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICBpbmZvKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdpbmZvJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcuXG4gICAqXG4gICAqIEBtZXRob2Qgd2FyblxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIHdhcm4oKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgMikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZygnd2FybicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yLlxuICAgKlxuICAgKiBAbWV0aG9kIGVycm9yXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZXJyb3IoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2Vycm9yJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiXG5pbXBvcnQge2NoYXluc30gZnJvbSAnLi9jaGF5bnMnO1xuZXhwb3J0IGRlZmF1bHQgY2hheW5zO1xuIl19
  return require('chayns');

});
