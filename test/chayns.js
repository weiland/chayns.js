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

var tappApiInterface = require("./chayns/tapp_api_interface").tappApiInterface;

// public chayns object
var chayns = exports.chayns = {};

// TODO: use extend method only one time

extend(chayns, { getLogger: utils.getLogger }); // jshint ignore: line
extend(chayns, { utils: utils });
extend(chayns, { VERSION: "0.1.0" });
//extend(chayns, {config}); // TODO: the config `Object` should not be exposed

extend(chayns, { env: environment }); // TODO: generally rename

extend(chayns, { register: register });
extend(chayns, { ready: ready });

// TODO: remove line below
extend(chayns, { apiCall: apiCall });

// add all chaynsApiInterface methods directly to the `chayns` Object
extend(chayns, chaynsApiInterface);

extend(chayns, tappApiInterface);

// setup chayns
setup();

// chayns publish no UMD
//window.chayns = chayns;
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"./chayns/chayns_api_interface":3,"./chayns/chayns_calls":4,"./chayns/config":5,"./chayns/core":6,"./chayns/environment":7,"./chayns/tapp_api_interface":8,"./lib/fetch_polyfill":10,"./lib/promise_polyfill":11,"./utils":12}],2:[function(require,module,exports){
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

},{"../utils":12,"../utils/browser":13}],3:[function(require,module,exports){
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

},{"../utils":12,"../utils/browser":13,"./chayns_calls":4}],4:[function(require,module,exports){
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

},{"../utils":12,"../utils/browser":13,"./callbacks":2,"./environment":7}],5:[function(require,module,exports){
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

},{"../utils":12}],6:[function(require,module,exports){
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
 * @returns {Promise}
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

var _environment = require("./environment");

var environment = _environment.environment;
var setEnv = _environment.setEnv;

// create new Logger instance
var log = getLogger("chayns.core");

// enable JS Errors in the console
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
var readyCallbacks = [];function register(config) {
  log.info("chayns.register");
  Config.set(config); // this reference to the chayns obj
  return this;
}function preChayns() {
  if ("preChayns" in window && isObject(window.preChayns)) {
    Object.keys(window.preChayns).forEach(function (setting) {
      log.debug("pre chayns: ", setting);
    });
  }
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
    var getAppInformationCall = chaynsApiInterface.getGlobalData(function (data) {

      // now Chayns is officially ready
      // first set all env stuff
      if (!data) {
        throw new Error("There is no app Data");
      }

      if (isObject(data.AppInfo)) {
        var appInfo = data.AppInfo;
        var site = {
          siteId: appInfo.SiteID,
          title: appInfo.Title,
          tapps: appInfo.Tapps,
          facebookAppId: appInfo.FacebookAppID,
          facebookPageId: appInfo.FacebookPageID,
          colorScheme: appInfo.ColorScheme || 0,
          version: appInfo.Version,
          tapp: appInfo.TappSelected
        };
        setEnv("site", site);
      }
      if (isObject(data.AppUser)) {
        var appUser = data.AppUser;
        var user = {
          name: appUser.FacebookUserName,
          id: appUser.TobitUserID,
          facebookId: appUser.FacebookID,
          personId: appUser.PersonID,
          accessToken: appUser.TobitAccessToken,
          facebookAccessToken: appUser.FacebookAccessToken,
          groups: appUser.UACGroups
        };
        setEnv("user", user);
      }
      if (isObject(data.Device)) {
        var device = data.Device;
        var app = {
          languageId: device.LanguageID,
          model: device.Model,
          name: device.SystemName,
          version: device.SystemVersion,
          uid: device.UID, // TODO uuid? is it even used?
          metrics: device.Metrics // TODO: used?
        };
        setEnv("app", app);
      }

      log.debug("appInformation callback", data);

      readyCallbacks.forEach(function (callback) {

        callback.call(null, data);
      });
      readyCallbacks = [];

      DOM.addClass(document.body, "chayns-ready");
      DOM.removeAttribute(DOM.query("[chayns-cloak]"), "chayns-cloak");

      cssSetup();

      log.info("finished chayns setup");
    });

    if (!getAppInformationCall) {
      log.error("The App Information could not be retrieved.");
    }
  });

  // start window.on('message') listener for Frame Communication
  messageListener();
}

function cssSetup() {
  var body = document.body;
  var suffix = "chayns-";

  DOM.addClass(body, suffix + "os--" + environment.os);
  DOM.addClass(body, suffix + "browser--" + environment.browser);
  DOM.addClass(body, suffix + "color--" + environment.browser);

  if (environment.isChaynsWeb) {
    DOM.addClass(body, suffix + "-" + "web");
  }
  if (environment.isChaynsWebMobile) {
    DOM.addClass(body, suffix + "-" + "mobile");
  }
  if (environment.isChaynsWebDesktop) {
    DOM.addClass(body, suffix + "-" + "desktop");
  }
  if (environment.isApp) {
    DOM.addClass(body, suffix + "-" + "app");
  }
  if (environment.isInFrame) {
    DOM.addClass(body, suffix + "-" + "frame");
  }
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":12,"./callbacks":2,"./chayns_api_interface":3,"./config":5,"./environment":7}],7:[function(require,module,exports){
"use strict";

//environment.user = {
//  name: 'Pacal Weiland',
//  firstName: 'Pascal',
//  lastName: 'Weiland',
//  userId: 1234,
//  facebookId: 12345,
//  isAdmin: true,
//  uacGroups: [],
//  language: 'de_DE',
//  token: 'token' // TODO include token here?
//};

exports.setEnv = setEnv;
/**
 * @module chayns.environment
 * @description
 * Chayns Environment
 */

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var extend = _utils.extend;

var log = getLogger("chayns.environment");

// TODO: import dependencies
var types = {};

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

  osVersion: 1,

  browser: "cc",
  browserVersion: 1 };

environment.parameters = parameters; // TODO strip 'secret params'
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
environment.ratio = window.devicePixelRatio;function setEnv(key, value) {
  //extend(environment, prop);
  environment[key] = value;
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

// TODO: enable debug mode

},{"../utils":12}],8:[function(require,module,exports){
"use strict";

/**
 * Tapp API Interface
 * API to communicate with the TappAPI
 */
/* gloabl fetch */

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var isPresent = _utils.isPresent;
var isObject = _utils.isObject;
var isArray = _utils.isArray;
var isDefined = _utils.isDefined;

var environment = require("./environment").environment;

var user = require("./user").user;

//import {window} from '../utils/browser'; // due to window.open and location.href

var log = getLogger("tapp_api");

console.debug(environment, "evn");

// TODO: force SSL?
var tappApiRoot = "//chayns1.tobit.com/TappApi/";
var resultType = {
  error: -1,
  success: 0
};

function parseUser(user) {
  return {
    userId: user.UserID,
    facebookId: user.ID || user.FacebookID,
    name: user.Name || user.UserFullName,
    firstName: user.FirstName,
    lastName: user.Lastname,
    picture: "https://graph.facebook.com/" + user.ID + "/picture",
    chaynsLogin: user.ChaynsLogin
  };
}

function parseGroup(group) {
  return {
    id: group.ID,
    name: group.Name,
    showName: group.ShowName
  };
}

var uacGroupsCache = undefined;

/**
 * @module TappAPIInterface
 * @type {Object}
 */
var tappApiInterface = exports.tappApiInterface = {
  getIntroText: function getIntroText() {
    throw new Error("deprecated");
  },

  /**
   * Get Info
   * User Basic Information
   *
   * @param obj
   * @returns {Promise}
   */
  getUser: function getUserBasicInfo(obj) {
    if (!obj || !isObject(obj)) {
      return Promise.reject(new Error("There was no parameter Object"));
    }
    var data = "";
    if (isPresent(obj.userId)) {
      data = "UserID=" + obj.userId;
    }
    if (isPresent(obj.facebookId)) {
      data = "FBID=" + obj.facebookId;
    }
    if (isPresent(obj.personId)) {
      data = "PersonID=" + obj.personId;
    }
    if (isPresent(obj.accessToken)) {
      data = "AccessToken=" + obj.accessToken;
    }
    return tappApi("User/BasicInfo?" + data).then(function (json) {
      if (isArray(json)) {
        return json.map(function (user) {
          return parseUser(user);
        });
      } else {
        return json;
      }
    });
  },

  /**
   * Get all users of a Location identified by siteId
   *
   *
   * @param [siteId = current siteId] Site Id
   * @returns {Promise}
   */
  getLocationUsers: function getLocationUsers(siteId) {
    if (!siteId) {
      siteId = environment.site.siteId;
    }
    var data = "?SiteID=" + siteId;
    return tappApi("User/GetAllLocationUsers" + data).then(function (json) {
      return json.map(function (user) {
        return parseUser(user);
      });
    });
  },

  /**
   * Get UAC Groups
   *
   * TODO: remove caching? yes, it does not really belong in here
   * TODO: Backend bug http://chayns1.tobit.com/TappApi/Tapp/GetUACGroups?SiteID= not empty
   * TODO: rename to getGroups? (using UAC only internally, there are no other groups either)
   * @param {Boolean} [updateCache=undefined] True to force to receive new UAC Groups
   * @returns {Promise} resolve with  UAC Groups Array otherwise reject with Error
   */
  getUacGroups: function getUacGroups(siteId, updateCache) {
    if (uacGroupsCache && !updateCache) {
      return Promise.resolve(uacGroupsCache);
    }
    siteId = siteId || environment.site.siteId;
    var data = "SiteID=" + siteId;
    return tappApi("Tapp/GetUACGroups?" + data).then(function (json) {
      return json.map(function (group) {
        return parseGroup(group);
      });
    });
  },

  /**
   * TODO: use userId instead of the facebookId?
   * TODO: refactor name? cause Location and SiteId
   * @param userId Facebook UserId
   * @returns {Promise}
   */
  isUserAdminOfLocation: function isUserAdminOfLocation(userId) {
    if (!userId) {
      return Promise.reject(Error("No userId was supplied."));
    }
    var data = "?SiteID=" + environment.site.siteId + "&FBID=" + userId;
    return tappApi("User/IsUserAdmin" + data).then(function (json) {
      return json;
    });
  },

  intercom: {

    /**
     * Send message as user to the entire page.
     *
     * @param message
     * @returns {Promise}
     */
    sendMessageAsUser: function sendMessageAsUser(message) {
      return sendMessage({
        message: message,
        url: "InterCom/Page"
      });
    },

    /**
     * Send Message as page to a user identified by Tobit UserId.
     *
     * @param message
     * @param userId
     * @returns {Promise}
     */
    sendMessageToUser: function sendMessageToUser(userId, message) {
      return sendMessage({
        message: message,
        userId: userId,
        url: "InterCom/User"
      });
    },

    /**
     * Send message as page to a user identified by Facebook UserId.
     *
     * @param message
     * @param facebookId
     * @returns {Promise}
     */
    sendMessageToFacebookUser: function sendMessageToFacebookUser(facebookId, message) {
      return sendMessage({
        message: message,
        facebookId: facebookId,
        url: "Tapp/SendIntercomMessageAsPage"
      });
    },

    /**
     * Send message as page to a UAC Group.
     *
     * @param groupId
     * @param {String} message
     * @returns {Promise}
     */
    sendMessageToGroup: function sendMessageToGroup(groupId, message) {
      return sendMessage({
        message: message,
        groupId: groupId,
        url: "InterCom/group"
      });
    }
  }
};

/**
 * Send Intercom Message
 *
 * @private
 * @param obj
 * @returns {Promise}
 */
// TODO: refactor to JSON instead of www-form-urlencoded
function sendMessage(obj) {
  if (!isObject(obj) || !obj.message || !obj.url) {
    Promise.reject(Error("Invalid parameters"));
  }
  obj.siteId = obj.siteId || environment.site.siteId;
  obj.accessToken = obj.accessToken || user.accessToken;
  var map = {
    message: "Message",
    accessToken: "AccessToken",
    userId: "UserId",
    facebookId: "ToFBID",
    groupId: "GroupID",
    siteId: "SiteID"
  };
  var data = [];
  Object.keys(obj).forEach(function (key) {
    if (isDefined(obj[key]) && key !== "url") {
      data.push(map[key] + "=" + obj[key]);
    }
  });
  var config = {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    //headers: {
    //  'Accept': 'application/json',
    //  'Content-Type': 'application/json'
    //},
    //credentials: 'cors',
    body: data.join("&")
    //body: data
  };
  var url = tappApiRoot + obj.url;
  if (obj.url === "Tapp/SendIntercomMessageAsPage") {
    url += "?" + data.join("&");
    config = undefined; /*{
                        credentials: 'cors'
                        };*/
  }
  return fetch(url, config);
}

/**
 * Tapp API request
 *
 * TODO: use POST instead of GET
 * TODO: posting JSON with {credentials: 'cors'}
 * @param endpoint
 * @returns {Promise} with json data
 */
function tappApi(endpoint) {
  var url = tappApiRoot + endpoint;
  return fetch(url).then(function (res) {
    return res.json();
  }).then(function (json) {
    if (json.Value) {
      return json.Value;
    } else if (json.Data) {
      return json.Data;
    } else {
      return json;
    }
  }).then(function (obj) {
    if (obj.Error) {
      return Promise.reject(new Error(obj.Error));
    }
    return obj;
  });
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":12,"./environment":7,"./user":9}],9:[function(require,module,exports){
"use strict";

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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
},{"_process":22}],12:[function(require,module,exports){
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

},{"./utils/browser":13,"./utils/dom":14,"./utils/error":15,"./utils/events":16,"./utils/extend":17,"./utils/http":18,"./utils/is":19,"./utils/is_permitted":20,"./utils/logger":21}],13:[function(require,module,exports){
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
},{}],14:[function(require,module,exports){
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

},{"./browser":13,"./is":19}],15:[function(require,module,exports){
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

},{"../chayns/config":5,"./browser":13,"./logger":21}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{"./is":19}],18:[function(require,module,exports){
"use strict";

//let Promise = window.Promise; // otherwise import Promise
//let fetch = window.fetch; // otherwise TODO: import fetch

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
exports.postForm = postForm;

/**
 * Post JSON
 *
 * @param {String} url
 * @param {`Object`} data Either Object or JSON String
 * @returns {boolean}
 */
exports.post = post;

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
}function postForm(url, form) {
  if (isFormElement(form)) {
    form = new FormData(form);
  }
  return fetch(url, {
    method: "post",
    body: form
  });
}function post(url, data) {
  if (isObject(data)) {
    data = JSON.stringify(data);
  } else if (!isString(data)) {
    log.warn("postJSON: invalid data");
    throw new Error("Invalid post data");
  }
  return fetch(url, {
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

},{"../utils":12}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
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

},{"../utils":12}],21:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdGFwcF9hcGlfaW50ZXJmYWNlLmpzIiwic3JjL2NoYXlucy91c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2xpYi9mZXRjaF9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9saWIvcHJvbWlzZV9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9icm93c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9lcnJvci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9ldmVudHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXh0ZW5kLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2h0dHAuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvaXMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvaXNfcGVybWl0dGVkLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2xvZ2dlci5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMtdW1kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7SUNPWSxLQUFLLG1DQUFvQixTQUFTOztBQUM5QyxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDOzs7QUFHMUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7OztJQUdWLE1BQU0sV0FBdUIsaUJBQWlCLEVBQTlDLE1B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OztBQy9VTCxDQUFDLFlBQVU7QUFBQyxXQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFFLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLFVBQVUsS0FBRyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTyxZQUFVO0FBQUMsYUFBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsRUFBQyxhQUFhLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sWUFBVTtBQUFDLE9BQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksY0FBYyxFQUFBLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLE9BQU8sWUFBVTtBQUFDLE9BQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTyxZQUFVO0FBQUMsZ0JBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNmLEtBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUc7QUFBQyxPQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksU0FBUyxDQUFDLDBDQUEwQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUcsVUFBVSxLQUFHLE9BQU8sQ0FBQyxJQUFFLFFBQVEsS0FBRyxPQUFPLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxFQUFDLElBQUcsQ0FBQyxDQUFDLFdBQVcsS0FBRyxDQUFDLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzlmLENBQUMsQ0FBQyxDQUFDLEtBQUk7QUFBQyxVQUFJLENBQUMsQ0FBQyxJQUFHO0FBQUMsU0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7T0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxNQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBO0tBQUM7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQ3pnQixJQUFJLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRztBQUFDLFNBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLFNBQVMsQ0FBQyxzREFBc0QsQ0FBQyxDQUFDLENBQUMsT0FBTTtPQUFDO0tBQUMsTUFBSyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHO0FBQUMsT0FBQyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUMzZixJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLE1BQU0sR0FBQyxJQUFJLENBQUMsTUFBTSxJQUFFLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxvRkFBb0YsQ0FBQyxDQUFDLElBQUcsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFBLEFBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLHVIQUF1SCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLE9BQU8sR0FBQyxLQUFLLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxnQkFBZ0IsS0FDamdCLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDO01BQUMsQ0FBQyxHQUFDLENBQUM7TUFBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxHQUFDLE1BQU0sR0FBQyxFQUFFO01BQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxnQkFBZ0IsSUFBRSxDQUFDLENBQUMsc0JBQXNCO01BQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLGlCQUFpQixJQUFFLFdBQVcsS0FBRyxPQUFPLGFBQWEsSUFBRSxXQUFXLEtBQUcsT0FBTyxjQUFjO01BQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFHLENBQUM7TUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLE9BQU8sSUFBRSxrQkFBa0IsS0FBRyxDQUFBLEdBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEVBQUE7TUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEVBQUEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxZQUFVO0FBQUMsV0FBTyxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQzVmLFlBQVU7QUFBQyxRQUFJLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFlBQVU7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFHLE9BQU8sQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxHQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQTtHQUFDLENBQUM7QUFDdGYsR0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEFBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxTQUFTLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxDQUFFLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUUsUUFBUSxLQUFHLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxXQUFXLEtBQUcsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN6ZixLQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLEVBQUMsV0FBVyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUM7QUFBQyxlQUFPLElBQUksQ0FBQztPQUFBLElBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVU7QUFBQyxXQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxNQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsVUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLE1BQU0sR0FBQyxNQUFNLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxRQUFRLEdBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUcsQ0FBQyxJQUFFLFNBQVMsSUFDcmYsQ0FBQyxDQUFDLE9BQU8sSUFBRSxRQUFRLElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBRSxLQUFLLElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBRSxNQUFNLElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBRSxDQUFBLFlBQVU7QUFBQyxZQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFDLEdBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQSxFQUFFLEtBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLFVBQVUsS0FBRyxPQUFPLE1BQU0sSUFBRSxNQUFNLENBQUMsR0FBRyxHQUFDLE1BQU0sQ0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxPQUFPLEdBQUMsTUFBTSxDQUFDLE9BQU8sR0FBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sSUFBSSxLQUFHLElBQUksQ0FBQyxVQUFVLEdB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0lDckZRLE1BQU0sV0FBTyxVQUFVLEVBQXZCLE1BQU07O2lCQUNDLE1BQU0iLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBAbmFtZSBjaGF5bnMgQVBJXG4gKiBAbW9kdWxlIGNoYXluc1xuICovXG5cbi8vIGhlbHBlclxuLy8gVE9ETzogZWl0aGVyIGluZGV4LmpzLCB1dGlscy5qcyBvciBqdXN0IHRoZSBzaW5nbGUgZmlsZXNcbmltcG9ydCAqIGFzIHV0aWxzICAgICAgICAgICAgICAgZnJvbSAnLi91dGlscyc7XG52YXIgZXh0ZW5kID0gdXRpbHMuZXh0ZW5kO1xuXG4vLyBzZXQgbG9nTGV2ZWwgdG8gaW5mb1xudXRpbHMuc2V0TGV2ZWwoNCk7IC8vIFRPRE86IGRvbid0IHNldCB0aGUgbGV2ZWwgaGVyZVxuXG4vLyBiYXNpYyBjb25maWdcbmltcG9ydCB7Y29uZmlnfSAgICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY29uZmlnJztcblxuLy8gZW52aXJvbm1lbnRcbmltcG9ydCB7ZW52aXJvbm1lbnR9ICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvZW52aXJvbm1lbnQnO1xuXG5pbXBvcnQgUHJvbWlzZSBmcm9tICAnLi9saWIvcHJvbWlzZV9wb2x5ZmlsbCc7XG5Qcm9taXNlLnBvbHlmaWxsKCk7IC8vIGF1dG9sb2FkIFByb21pc2UgcG9seWZpbGxcbi8vIFRPRE86IGFkZCBEZWZlcnJlZD9cblxuaW1wb3J0ICcuL2xpYi9mZXRjaF9wb2x5ZmlsbCc7XG5cbi8vIGNvcmUgZnVuY3Rpb25zXG5pbXBvcnQge3JlYWR5LCByZWdpc3Rlciwgc2V0dXB9IGZyb20gJy4vY2hheW5zL2NvcmUnO1xuXG4vLyBjaGF5bnMgY2FsbHNcblxuaW1wb3J0IHthcGlDYWxsfSAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy9jaGF5bnNfY2FsbHMnO1xuXG5pbXBvcnQge2NoYXluc0FwaUludGVyZmFjZX0gICAgIGZyb20gJy4vY2hheW5zL2NoYXluc19hcGlfaW50ZXJmYWNlJztcblxuaW1wb3J0IHt0YXBwQXBpSW50ZXJmYWNlfSAgICAgICBmcm9tICcuL2NoYXlucy90YXBwX2FwaV9pbnRlcmZhY2UnO1xuXG5cbi8vIHB1YmxpYyBjaGF5bnMgb2JqZWN0XG5leHBvcnQgdmFyIGNoYXlucyA9IHt9O1xuXG4vLyBUT0RPOiB1c2UgZXh0ZW5kIG1ldGhvZCBvbmx5IG9uZSB0aW1lXG5cbmV4dGVuZChjaGF5bnMsIHtnZXRMb2dnZXI6IHV0aWxzLmdldExvZ2dlcn0pOyAvLyBqc2hpbnQgaWdub3JlOiBsaW5lXG5leHRlbmQoY2hheW5zLCB7dXRpbHN9KTtcbmV4dGVuZChjaGF5bnMsIHtWRVJTSU9OOiAnMC4xLjAnfSk7XG4vL2V4dGVuZChjaGF5bnMsIHtjb25maWd9KTsgLy8gVE9ETzogdGhlIGNvbmZpZyBgT2JqZWN0YCBzaG91bGQgbm90IGJlIGV4cG9zZWRcblxuZXh0ZW5kKGNoYXlucywge2VudjogZW52aXJvbm1lbnR9KTsgLy8gVE9ETzogZ2VuZXJhbGx5IHJlbmFtZVxuXG5leHRlbmQoY2hheW5zLCB7cmVnaXN0ZXJ9KTtcbmV4dGVuZChjaGF5bnMsIHtyZWFkeX0pO1xuXG4vLyBUT0RPOiByZW1vdmUgbGluZSBiZWxvd1xuZXh0ZW5kKGNoYXlucywge2FwaUNhbGx9KTtcblxuLy8gYWRkIGFsbCBjaGF5bnNBcGlJbnRlcmZhY2UgbWV0aG9kcyBkaXJlY3RseSB0byB0aGUgYGNoYXluc2AgT2JqZWN0XG5leHRlbmQoY2hheW5zLCBjaGF5bnNBcGlJbnRlcmZhY2UpO1xuXG5leHRlbmQoY2hheW5zLCB0YXBwQXBpSW50ZXJmYWNlKTtcblxuLy8gc2V0dXAgY2hheW5zXG5zZXR1cCgpO1xuXG5cbi8vIGNoYXlucyBwdWJsaXNoIG5vIFVNRFxuLy93aW5kb3cuY2hheW5zID0gY2hheW5zO1xuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzRnVuY3Rpb24sIGlzVW5kZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvd30gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY2FsbGJhY2tzJyk7XG5cbmxldCBub29wID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG5sZXQgY2FsbGJhY2tzID0ge307XG4vKipcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgRnVuY3Rpb24gdG8gYmUgaW52b2tlZFxuICogQHBhcmFtIHtCb29sZWFufSBpc0NoYXluc0NhbGwgSWYgdHJ1ZSB0aGVuIHRoZSBjYWxsIHdpbGwgYmUgYXNzaWduZWQgdG8gYGNoYXlucy5fY2FsbGJhY2tzYFxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgcGFyYW1ldGVycyBhcmUgdmFsaWQgYW5kIHRoZSBjYWxsYmFjayB3YXMgc2F2ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldENhbGxiYWNrKG5hbWUsIGZuLCBpc0NoYXluc0NhbGwpIHtcblxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBsb2cud2Fybignc2V0Q2FsbGJhY2s6IG5hbWUgaXMgdW5kZWZpbmVkJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghaXNGdW5jdGlvbihmbikpIHtcbiAgICBsb2cud2Fybignc2V0Q2FsbGJhY2s6IGZuIGlzIG5vIEZ1bmN0aW9uJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKG5hbWUuaW5kZXhPZignKCknKSAhPT0gLTEpIHsgLy8gc3RyaXAgJygpJ1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoJygpJywgJycpO1xuICB9XG5cbiAgbG9nLmRlYnVnKCdzZXRDYWxsYmFjazogc2V0IENhbGxiYWNrOiAnICsgbmFtZSk7XG4gIC8vaWYgKG5hbWUgaW4gY2FsbGJhY2tzKSB7XG4gIC8vICBjYWxsYmFja3NbbmFtZV0ucHVzaChmbik7IC8vIFRPRE86IHJlY29uc2lkZXIgQXJyYXkgc3VwcG9ydFxuICAvL30gZWxzZSB7XG4gICAgY2FsbGJhY2tzW25hbWVdID0gZm47IC8vIEF0dGVudGlvbjogd2Ugc2F2ZSBhbiBBcnJheVxuICAvL31cblxuICBpZiAoaXNDaGF5bnNDYWxsKSB7XG4gICAgbG9nLmRlYnVnKCdzZXRDYWxsYmFjazogcmVnaXN0ZXIgZm4gYXMgZ2xvYmFsIGNhbGxiYWNrJyk7XG4gICAgd2luZG93Ll9jaGF5bnNDYWxsYmFja3NbbmFtZV0gPSBjYWxsYmFjayhuYW1lLCAnQ2hheW5zQ2FsbCcpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogUmVnaXN0ZXIgY2FsbGJhY2tzIGZvciBDaGF5bnNDYWxscyBhbmQgQ2hheW5zV2ViQ2FsbHNcbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGNhbGxiYWNrTmFtZSBOYW1lIG9mIHRoZSBGdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgRWl0aGVyICdDaGF5bnNXZWJDYWxsJyBvciAnQ2hheW5zQ2FsbCdcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gaGFuZGxlRGF0YSBSZWNlaXZlcyBjYWxsYmFjayBkYXRhXG4gKi9cbmZ1bmN0aW9uIGNhbGxiYWNrKGNhbGxiYWNrTmFtZSwgdHlwZSkge1xuXG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVEYXRhKCkge1xuXG4gICAgaWYgKGNhbGxiYWNrTmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgICAgIGxvZy5kZWJ1ZygnaW52b2tlIGNhbGxiYWNrOiAnLCBjYWxsYmFja05hbWUsICd0eXBlOicsIHR5cGUpO1xuICAgICAgdmFyIGZuID0gY2FsbGJhY2tzW2NhbGxiYWNrTmFtZV07XG4gICAgICBpZiAoaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgLy9kZWxldGUgY2FsbGJhY2tzW2NhbGxiYWNrTmFtZV07IC8vIFRPRE86IGNhbm5vdCBiZSBsaWtlIHRoYXQsIHJlbW92ZSBhcnJheT9cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy53YXJuKCdjYWxsYmFjayBpcyBubyBmdW5jdGlvbicsIGNhbGxiYWNrTmFtZSwgZm4pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnY2FsbGJhY2sgJyArIGNhbGxiYWNrTmFtZSArICcgZGlkIG5vdCBleGlzdCBpbiBjYWxsYmFja3MgYXJyYXknKTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLl9jYWxsYmFja3NcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBDaGF5bnMgQ2FsbCBDYWxsYmFja3NcbiAqIHdpbGwgYmUgYXNzaWduZWQgdG8gdGhlIGBjaGF5bnMuX2NhbGxiYWNrc2Agb2JqZWN0XG4gKlxuICogQHR5cGUge09iamVjdH0gY2hheW5zQ2FsbHNDYWxsYmFja3NcbiAqL1xud2luZG93Ll9jaGF5bnNDYWxsYmFja3MgPSB7XG4gIC8vLy8gVE9ETzogd3JhcCBjYWxsYmFjayBmdW5jdGlvbiAoRFJZKVxuICAvL2dldEdsb2JhbERhdGE6IGNhbGxiYWNrKCdnZXRHbG9iYWxEYXRhJywgJ0NoYXluc0NhbGwnKSAvLyBleGFtcGxlXG4gIGdldEdlb0xvY2F0aW9uQ2FsbGJhY2s6IG5vb3Bcbn07XG5cblxuLy8gVE9ETzogbW92ZSB0byBhbm90aGVyIGZpbGU/IGNvcmUsIGNoYXluc19jYWxsc1xudmFyIG1lc3NhZ2VMaXN0ZW5pbmcgPSBmYWxzZTtcbmV4cG9ydCBmdW5jdGlvbiBtZXNzYWdlTGlzdGVuZXIoKSB7XG4gIGlmIChtZXNzYWdlTGlzdGVuaW5nKSB7XG4gICAgbG9nLmluZm8oJ3RoZXJlIGlzIGFscmVhZHkgb25lIG1lc3NhZ2UgbGlzdGVuZXIgb24gd2luZG93Jyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIG1lc3NhZ2VMaXN0ZW5pbmcgPSB0cnVlO1xuICBsb2cuZGVidWcoJ21lc3NhZ2UgbGlzdGVuZXIgaXMgc3RhcnRlZCcpO1xuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gb25NZXNzYWdlKGUpIHtcblxuICAgIGxvZy5kZWJ1ZygnbmV3IG1lc3NhZ2UgJyk7XG5cbiAgICB2YXIgbmFtZXNwYWNlID0gJ2NoYXlucy5jdXN0b21UYWIuJyxcbiAgICAgIGRhdGEgPSBlLmRhdGE7XG5cbiAgICBpZiAodHlwZW9mIGRhdGEgIT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHN0cmlwIG5hbWVzcGFjZSBmcm9tIGRhdGFcbiAgICBkYXRhID0gZGF0YS5zdWJzdHIobmFtZXNwYWNlLmxlbmd0aCwgZGF0YS5sZW5ndGggLSBuYW1lc3BhY2UubGVuZ3RoKTtcbiAgICB2YXIgbWV0aG9kID0gZGF0YS5tYXRjaCgvW146XSo6Lyk7IC8vIGRldGVjdCBtZXRob2RcbiAgICBpZiAobWV0aG9kICYmIG1ldGhvZC5sZW5ndGggPiAwKSB7XG4gICAgICBtZXRob2QgPSBtZXRob2RbMF07XG5cbiAgICAgIHZhciBwYXJhbXMgPSBkYXRhLnN1YnN0cihtZXRob2QubGVuZ3RoLCBkYXRhLmxlbmd0aCAtIG1ldGhvZC5sZW5ndGgpO1xuICAgICAgaWYgKHBhcmFtcykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UocGFyYW1zKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIHRoZSBsYXN0ICcpJ1xuICAgICAgbWV0aG9kID0gbWV0aG9kLnN1YnN0cigwLCBtZXRob2QubGVuZ3RoIC0gMSk7XG5cbiAgICAgIC8vIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBjYW4gYmUgaW52b2tlZCBkaXJlY3RseVxuICAgICAgY2FsbGJhY2sobWV0aG9kLCAnQ2hheW5zV2ViQ2FsbCcpKHBhcmFtcyk7XG4gICAgfVxuICB9KTtcbn1cbiIsIi8qKlxuICogQ2hheW5zIEFQSSBJbnRlcmZhY2VcbiAqIEFQSSB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSBBUFAgYW5kIHRoZSBDaGF5bnMgV2ViXG4gKi9cblxuaW1wb3J0IHthcGlDYWxsfSBmcm9tICcuL2NoYXluc19jYWxscyc7XG5pbXBvcnQge2dldExvZ2dlciwgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0JMRUFkZHJlc3MsXG4gIGlzRGF0ZSwgaXNPYmplY3QsIGlzQXJyYXksIHRyaW0sIERPTX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHt3aW5kb3csIGxvY2F0aW9ufSBmcm9tICcuLi91dGlscy9icm93c2VyJzsgLy8gZHVlIHRvIHdpbmRvdy5vcGVuIGFuZCBsb2NhdGlvbi5ocmVmXG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXluc19hcGlfaW50ZXJmYWNlJyk7XG5cbi8qKlxuICogTkZDIFJlc3BvbnNlIERhdGEgU3RvcmFnZVxuICogQHR5cGUge09iamVjdH1cbiAqL1xubGV0IE5mY1Jlc3BvbnNlRGF0YSA9IHtcbiAgUkZJZDogMCxcbiAgUGVyc29uSWQ6IDBcbn07XG5cbi8qKlxuICogUG9wdXAgQnV0dG9uXG4gKiBAY2xhc3MgUG9wdXBCdXR0b25cbiAqL1xuY2xhc3MgUG9wdXBCdXR0b24ge1xuICAvKipcbiAgICogUG9wdXAgQnV0dG9uIENvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFBvcHVwIEJ1dHRvbiBuYW1lXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lLCBjYWxsYmFjaykge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGxldCBlbCA9IERPTS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2NoYXlucy1wb3B1cCcpO1xuICAgIGVsLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2hheW5zX19wb3B1cCcpO1xuICAgIHRoaXMuZWxlbWVudCA9IGVsO1xuICB9XG4gIC8qKlxuICAgKiBHZXQgUG9wdXAgQnV0dG9uIG5hbWVcbiAgICogQHJldHVybnMge25hbWV9XG4gICAqL1xuICBuYW1lKCkge1xuICAgIHJldHVybiB0aGlzLm5hbWU7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICovXG4gIGNhbGxiYWNrKCkge1xuICAgIGxldCBjYiA9IHRoaXMuY2FsbGJhY2s7XG4gICAgbGV0IG5hbWUgPSBjYi5uYW1lO1xuICAgIGlmIChpc0Z1bmN0aW9uKGNiKSkge1xuICAgICAgY2IuY2FsbChudWxsLCBuYW1lKTtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEBuYW1lIHRvSFRNTFxuICAgKiBSZXR1cm5zIEhUTUwgTm9kZSBjb250YWluaW5nIHRoZSBQb3B1cEJ1dHRvbi5cbiAgICogQHJldHVybnMge1BvcHVwQnV0dG9uLmVsZW1lbnR8SFRNTE5vZGV9XG4gICAqL1xuICB0b0hUTUwoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgfVxufVxuXG4vKipcbiAqIEJlYWNvbiBMaXN0XG4gKiBAdHlwZSB7QXJyYXl8bnVsbH1cbiAqL1xubGV0IGJlYWNvbkxpc3QgPSBudWxsO1xuXG4vKipcbiAqIEdsb2JhbCBEYXRhIFN0b3JhZ2VcbiAqIEB0eXBlIHtib29sZWFufE9iamVjdH1cbiAqL1xubGV0IGdsb2JhbERhdGEgPSBmYWxzZTtcblxuLyoqXG4gKiBBbGwgcHVibGljIGNoYXlucyBtZXRob2RzIHRvIGludGVyYWN0IHdpdGggKkNoYXlucyBBcHAqIG9yICpDaGF5bnMgV2ViKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xuZXhwb3J0IHZhciBjaGF5bnNBcGlJbnRlcmZhY2UgPSB7XG5cblxuICAvKipcbiAgICogRW5hYmxlIG9yIGRpc2FibGUgUHVsbFRvUmVmcmVzaFxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFsbG93UHVsbCBBbGxvdyBQdWxsVG9SZWZyZXNoXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2VlZGVkXG4gICAqL1xuICBzZXRQdWxsVG9SZWZyZXNoOiBmdW5jdGlvbihhbGxvd1B1bGwpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDAsXG4gICAgICB3ZWJGbjogZmFsc2UsIC8vIGNvdWxkIGJlIG9taXR0ZWRcbiAgICAgIHBhcmFtczogW3snYm9vbCc6IGFsbG93UHVsbH1dXG4gICAgfSk7XG4gIH0sXG4gIC8vIFRPRE86IHJlbmFtZSB0byBlbmFibGVQdWxsVG9SZWZyZXNoXG4gIGFsbG93UmVmcmVzaFNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLnNldFB1bGxUb1JlZnJlc2godHJ1ZSk7XG4gIH0sXG4gIGRpc2FsbG93UmVmcmVzaFNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLnNldFB1bGxUb1JlZnJlc2goZmFsc2UpO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtzaG93Q3Vyc29yXSBJZiB0cnVlIHRoZSB3YWl0Y3Vyc29yIHdpbGwgYmUgc2hvd25cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJ3aXNlIGl0IHdpbGwgYmUgaGlkZGVuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2V0V2FpdGN1cnNvcjogZnVuY3Rpb24oc2hvd0N1cnNvcikge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMSxcbiAgICAgIHdlYkZuOiAoc2hvd0N1cnNvciA/ICdzaG93JyA6ICdoaWRlJykgKyAnTG9hZGluZ0N1cnNvcicsXG4gICAgICBwYXJhbXM6IFt7J2Jvb2wnOiBzaG93Q3Vyc29yfV1cbiAgICB9KTtcbiAgfSxcbiAgc2hvd1dhaXRjdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0V2FpdGN1cnNvcih0cnVlKTtcbiAgfSxcbiAgaGlkZVdhaXRjdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0V2FpdGN1cnNvcihmYWxzZSk7XG4gIH0sXG5cbiAgLy8gVE9ETzogcmVuYW1lIGl0IHRvIG9wZW5UYXBwP1xuICAvKipcbiAgICogU2VsZWN0IGRpZmZlcmVudCBUYXBwIGlkZW50aWZpZWQgYnkgVGFwcElEIG9yIEludGVybmFsVGFwcE5hbWVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRhYiBUYXBwIE5hbWUgb3IgVGFwcCBJRFxuICAgKiBAcGFyYW0ge1N0cmluZ30gKG9wdGlvbmFsKSBwYXJhbSBVUkwgUGFyYW1ldGVyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2VsZWN0VGFiOiBmdW5jdGlvbih0YWIsIHBhcmFtKSB7XG5cbiAgICBsZXQgY21kID0gMTM7IC8vIHNlbGVjdFRhYiB3aXRoIHBhcmFtIENoYXluc0NhbGxcblxuICAgIC8vIHVwZGF0ZSBwYXJhbTogc3RyaXAgPyBhbmQgZW5zdXJlICYgYXQgdGhlIGJlZ2luXG4gICAgaWYgKHBhcmFtICYmICFwYXJhbS5tYXRjaCgvXlsmfFxcP10vKSkgeyAvLyBubyAmIGFuZCBubyA/XG4gICAgICBwYXJhbSA9ICcmJyArIHBhcmFtO1xuICAgIH0gZWxzZSBpZiAocGFyYW0pIHtcbiAgICAgIHBhcmFtID0gcGFyYW0ucmVwbGFjZSgnPycsICcmJyk7XG4gICAgfSBlbHNlIHsgLy8gbm8gcGFyYW1zLCBkaWZmZXJlbnQgQ2hheW5zQ2FsbFxuICAgICAgY21kID0gMjtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IGNtZCxcbiAgICAgIHdlYkZuOiAnc2VsZWN0b3RoZXJ0YWInLFxuICAgICAgcGFyYW1zOiBjbWQgPT09IDEzXG4gICAgICAgID8gW3snc3RyaW5nJzogdGFifSwgeydzdHJpbmcnOiBwYXJhbX1dXG4gICAgICAgIDogW3snc3RyaW5nJzogdGFifV0sXG4gICAgICB3ZWJQYXJhbXM6IHtcbiAgICAgICAgVGFiOiB0YWIsXG4gICAgICAgIFBhcmFtZXRlcjogcGFyYW1cbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDIsIGlvczogMTM4Mywgd3A6IDI0NjkgfSAvLyBmb3IgbmF0aXZlIGFwcHMgb25seVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZWxlY3QgQWxidW1cbiAgICogVE9ETzogcmVuYW1lIHRvIG9wZW5cbiAgICpcbiAgICogQHBhcmFtIHtpZHxzdHJpbmd9IGlkIEFsYnVtIElEIChBbGJ1bSBOYW1lIHdpbGwgd29yayBhcyB3ZWxsLCBidXQgZG8gcHJlZmVyIElEcylcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZWxlY3RBbGJ1bTogZnVuY3Rpb24oaWQpIHtcbiAgICBpZiAoIWlzU3RyaW5nKGlkKSAmJiAhaXNOdW1iZXIoaWQpKSB7XG4gICAgICBsb2cuZXJyb3IoJ3NlbGVjdEFsYnVtOiBpbnZhbGlkIGFsYnVtIG5hbWUnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzLFxuICAgICAgd2ViRm46ICdzZWxlY3RBbGJ1bScsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGlkfV0sXG4gICAgICB3ZWJQYXJhbXM6IGlkXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gUGljdHVyZVxuICAgKiAob2xkIFNob3dQaWN0dXJlKVxuICAgKiBBbmRyb2lkIGRvZXMgbm90IHN1cHBvcnQgZ2lmcyA6KFxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIEltYWdlIFVSTCBzaG91bGQgY290YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlblBpY3R1cmU6IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSB8fCAhdXJsLm1hdGNoKC9qcGckfHBuZyR8Z2lmJC9pKSkgeyAvLyBUT0RPOiBtb3JlIGltYWdlIHR5cGVzP1xuICAgICAgbG9nLmVycm9yKCdvcGVuUGljdHVyZTogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA0LFxuICAgICAgd2ViRm46ICdzaG93UGljdHVyZScsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgd2ViUGFyYW1zOiB1cmwsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI1MDEsIGlvczogMjYzNiwgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBDYXB0aW9uIEJ1dHRvbi5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICogVGhlIGNhcHRpb24gYnV0dG9uIGlzIHRoZSB0ZXh0IGF0IHRoZSB0b3AgcmlnaHQgb2YgdGhlIGFwcC5cbiAgICogKG1haW5seSB1c2VkIGZvciBsb2dpbiBvciB0aGUgdXNlcm5hbWUpXG4gICAqIFRPRE86IGltcGxlbWVudCBpbnRvIENoYXlucyBXZWI/XG4gICAqIFRPRE86IHJlbmFtZSB0byBzZXQ/XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0IFRoZSBCdXR0b24ncyB0ZXh0XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGNhcHRpb24gYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgY3JlYXRlQ2FwdGlvbkJ1dHRvbjogZnVuY3Rpb24odGV4dCwgY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIC8vbG9nLmVycm9yKCdUaGVyZSBpcyBubyB2YWxpZCBjYWxsYmFjayBGdW5jdGlvbi4nKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgbm8gdmFsaWQgY2FsbGJhY2sgRnVuY3Rpb24uJyk7XG4gICAgICAvL3JldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdjYXB0aW9uQnV0dG9uQ2FsbGJhY2soKSc7XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDUsXG4gICAgICBwYXJhbXM6IFt7c3RyaW5nOiB0ZXh0fSwge2NhbGxiYWNrOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OCwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9LFxuICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSGlkZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBoaWRlQ2FwdGlvbkJ1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA2LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRmFjZWJvb2sgQ29ubmVjdFxuICAgKiBOT1RFOiBwcmVmZXIgYGNoYXlucy5sb2dpbigpYCBvdmVyIHRoaXMgbWV0aG9kIHRvIHBlcmZvcm0gYSB1c2VyIGxvZ2luLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3Blcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcyddIEZhY2Vib29rIFBlcm1pc3Npb25zLCBzZXBhcmF0ZWQgYnkgY29tbWFcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtyZWxvYWRQYXJhbSA9ICdjb21tZW50J10gUmVsb2FkIFBhcmFtXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgLy8gVE9ETzogdGVzdCBwZXJtaXNzaW9uc1xuICBmYWNlYm9va0Nvbm5lY3Q6IGZ1bmN0aW9uKHBlcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcycsIHJlbG9hZFBhcmFtID0gJ2NvbW1lbnQnKSB7XG4gICAgcmVsb2FkUGFyYW0gPSByZWxvYWRQYXJhbTtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDcsXG4gICAgICB3ZWJGbjogJ2ZhY2Vib29rQ29ubmVjdCcsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHBlcm1pc3Npb25zfSwgeydGdW5jdGlvbic6ICdFeGVjQ29tbWFuZD1cIicgKyByZWxvYWRQYXJhbSArICdcIid9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBSZWxvYWRQYXJhbWV0ZXI6ICdFeGVjQ29tbWFuZD0nICsgcmVsb2FkUGFyYW0sXG4gICAgICAgIFBlcm1pc3Npb25zOiBwZXJtaXNzaW9uc1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OSwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9LFxuICAgICAgZmFsbGJhY2tDbWQ6IDggLy8gaW4gY2FzZSB0aGUgYWJvdmUgaXMgbm90IHN1cHBvcnQgdGhlIGZhbGxiYWNrQ21kIHdpbGwgcmVwbGFjZSB0aGUgY21kXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gTGluayBpbiBCcm93c2VyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVVJMXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlbkxpbmtJbkJyb3dzZXI6IGZ1bmN0aW9uKHVybCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogOSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKCc6Ly8nKSA9PT0gLTEpIHtcbiAgICAgICAgICB1cmwgPSAnLy8nICsgdXJsOyAvLyBvciBhZGQgbG9jYXRpb24ucHJvdG9jb2wgcHJlZml4IGFuZCAvLyBUT0RPOiB0ZXN0XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjQ2Niwgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaG93IEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGJhY2sgYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2hvd0JhY2tCdXR0b246IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgY2hheW5zQXBpSW50ZXJmYWNlLmhpZGVCYWNrQnV0dG9uKCk7XG4gICAgICB9O1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JhY2tCdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTAsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgaGlkZUJhY2tCdXR0b246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTEsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIE9wZW4gSW50ZXJDb20uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgb3BlbkludGVyQ29tOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEyLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDAyLCBpb3M6IDEzODMsIHdwOiAyNTQzIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IEdlb2xvY2F0aW9uLlxuICAgKiBuYXRpdmUgYXBwcyBvbmx5IChidXQgY291bGQgd29yayBpbiB3ZWIgYXMgd2VsbCwgbmF2aWdhdG9yLmdlb2xvY2F0aW9uKVxuICAgKlxuICAgKiBUT0RPOiBjb250aW51b3VzVHJhY2tpbmcgd2FzIHJlbW92ZWRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgYmFjayBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBnZXRHZW9Mb2NhdGlvbjogZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnZ2V0R2VvTG9jYXRpb25DYWxsYmFjaygpJztcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIC8vIFRPRE86IHJlbW92ZSBjb25zb2xlXG4gICAgICAvLyBUT0RPOiBhbGxvdyBlbXB0eSBjYWxsYmFja3Mgd2hlbiBpdCBpcyBhbHJlYWR5IHNldFxuICAgICAgY29uc29sZS53YXJuKCdubyBjYWxsYmFjayBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI1MDEsIGlvczogMjQ2Niwgd3A6IDI0NjkgfSxcbiAgICAgIC8vd2ViRm46IGZ1bmN0aW9uKCkgeyBuYXZpZ2F0b3IuZ2VvbG9jYXRpb247IH1cbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFZpZGVvXG4gICAqIChvbGQgU2hvd1ZpZGVvKVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFZpZGVvIFVSTCBzaG91bGQgY290YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlblZpZGVvOiBmdW5jdGlvbih1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkgfHwgIXVybC5tYXRjaCgvLipcXC4uezIsfS8pKSB7IC8vIFRPRE86IFdURiBSZWdleFxuICAgICAgbG9nLmVycm9yKCdvcGVuVmlkZW86IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTUsXG4gICAgICB3ZWJGbjogJ3Nob3dWaWRlbycsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgd2ViUGFyYW1zOiB1cmxcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2hvdyBEaWFsb2dcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHtjb250ZW50OntTdHJpbmd9ICwgaGVhZGxpbmU6ICxidXR0b25zOntBcnJheX0sIG5vQ29udGVudG5QYWRkaW5nOiwgb25Mb2FkOn1cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzaG93RGlhbG9nOiBmdW5jdGlvbiBzaG93RGlhbG9nKG9iaikge1xuICAgIGlmICghb2JqIHx8ICFpc09iamVjdChvYmopKSB7XG4gICAgICBsb2cud2Fybignc2hvd0RpYWxvZzogaW52YWxpZCBwYXJhbWV0ZXJzJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChpc1N0cmluZyhvYmouY29udGVudCkpIHtcbiAgICAgIG9iai5jb250ZW50ID0gdHJpbShvYmouY29udGVudC5yZXBsYWNlKC88YnJbIC9dKj8+L2csICdcXG4nKSk7XG4gICAgfVxuICAgIGlmICghaXNBcnJheShvYmouYnV0dG9ucykgfHwgb2JqLmJ1dHRvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBvYmouYnV0dG9ucyA9IFsobmV3IFBvcHVwQnV0dG9uKCdPSycpKS50b0hUTUwoKV07XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdDaGF5bnNEaWFsb2dDYWxsQmFjaygpJztcbiAgICBmdW5jdGlvbiBjYWxsYmFja0ZuKGJ1dHRvbnMsIGlkKSB7XG4gICAgICBpZCA9IHBhcnNlSW50KGlkLCAxMCkgLSAxO1xuICAgICAgaWYgKGJ1dHRvbnNbaWRdKSB7XG4gICAgICAgIGJ1dHRvbnNbaWRdLmNhbGxiYWNrLmNhbGwobnVsbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNiwgLy8gVE9ETzogaXMgc2xpdHRlOi8vXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX0sXG4gICAgICAgIHsnc3RyaW5nJzogb2JqLmhlYWRsaW5lfSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouY29udGVudH0sXG4gICAgICAgIHsnc3RyaW5nJzogb2JqLmJ1dHRvbnNbMF0ubmFtZX0gLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgICAvL3snc3RyaW5nJzogb2JqLmJ1dHRvbnNbMV0ubmFtZX0sIC8vIFRPRE86IG5lZWRzIGVuY29kZVVSST9cbiAgICAgICAgLy97J3N0cmluZyc6IG9iai5idXR0b25zWzJdLm5hbWV9IC8vIFRPRE86IG5lZWRzIGVuY29kZVVSST9cbiAgICAgIF0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIG9iai5idXR0b25zKSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNjA2fSxcbiAgICAgIGZhbGxiYWNrRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZmFsbGJhY2sgcG9wdXAnLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEZvcm1lcmx5IGtub3duIGFzIGdldEFwcEluZm9zXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2l0aCB0aGUgQXBwRGF0YVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICAgIC8vIFRPRE86IHVzZSBmb3JjZVJlbG9hZCBhbmQgY2FjaGUgQXBwRGF0YVxuICBnZXRHbG9iYWxEYXRhOiBmdW5jdGlvbihjYWxsYmFjaywgZm9yY2VSZWxvYWQpIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignZ2V0R2xvYmFsRGF0YTogY2FsbGJhY2sgaXMgbm8gdmFsaWQgYEZ1bmN0aW9uYC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFmb3JjZVJlbG9hZCAmJiBnbG9iYWxEYXRhKSB7XG4gICAgICBjYWxsYmFjayhnbG9iYWxEYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxOCxcbiAgICAgIHdlYkZuOiAnZ2V0QXBwSW5mb3MnLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdnZXRHbG9iYWxEYXRhKCknfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVmlicmF0ZVxuICAgKiBAcGFyYW0ge0ludGVnZXJ9IGR1cmF0aW9uIFRpbWUgaW4gbWlsbGlzZWNvbmRzXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHZpYnJhdGU6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG4gICAgaWYgKCFpc051bWJlcihkdXJhdGlvbikgfHwgZHVyYXRpb24gPCAyKSB7XG4gICAgICBkdXJhdGlvbiA9IDE1MDtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxOSxcbiAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IGR1cmF0aW9uLnRvU3RyaW5nKCl9XSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbiBuYXZpZ2F0b3JWaWJyYXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG5hdmlnYXRvci52aWJyYXRlKDEwMCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2cuaW5mbygndmlicmF0ZTogdGhlIGRldmljZSBkb2VzIG5vdCBzdXBwb3J0IHZpYnJhdGUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNjk1LCBpb3M6IDI1OTYsIHdwOiAyNTE1fVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBCYWNrLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gRmFsc2Ugb24gZXJyb3IsIHRydWUgaWYgY2FsbCBzdWNjZWVkZWRcbiAgICovXG4gIG5hdmlnYXRlQmFjazogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAyMCxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2OTYsIGlvczogMjYwMCwgd3A6IDI1MTV9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEltYWdlIFVwbG9hZFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB0byBiZSBpbnZva2VkIHdpdGggaW1hZ2UgdXJsIGFmdGVyIHVwbG9hZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICB1cGxvYWRJbWFnZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybigndXBsb2FkSW1hZ2U6IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnaW1hZ2VVcGxvYWRDYWxsYmFjaygpJztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDIxLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLCAvLyBjYWxsYmFjayBwYXJhbSBvbmx5IG9uIG1vYmlsZVxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaW5wdXQgPSBET00uY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ2ZpbGUnKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCd2YWx1ZScsICcnKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCdhY2NlcHQnLCAnaW1hZ2UvKicpO1xuICAgICAgICAvL2lucHV0LnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLWltYWdlLXVwbG9hZC1maWVsZCk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgnb25jaGFuZ2UnLCAnaW1hZ2VDaG9zZW4oKScpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NoYXluc19fdXBsb2FkLWltYWdlJyk7XG4gICAgICAgIERPTS5xdWVyeSgnI2NoYXlucy1yb290JykuYXBwZW5kQ2hpbGQoaW5wdXQpO1xuICAgICAgICAvL3ZhciBmZCA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICAvL2ZkLmFwcGVuZChcIkltYWdlXCIsIGZpbGVbMF0pO1xuICAgICAgICAvL3dpbmRvdy5pbWFnZUNob3NlbiA9IHdpbmRvdy5mZXRjaCh7XG4gICAgICAgIC8vICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgLy8gIHVybDogXCIvL2NoYXluczEudG9iaXQuY29tL1RhcHBBcGkvRmlsZS9JbWFnZVwiLFxuICAgICAgICAvLyAgY29udGVudFR5cGU6IGZhbHNlLFxuICAgICAgICAvLyAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxuICAgICAgICAvLyAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAvLyAgZGF0YTogZmRcbiAgICAgICAgLy99KS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gIGRlbGV0ZSB3aW5kb3cuaW1hZ2VDaG9zZW47XG4gICAgICAgIC8vICBjYWxsYmFjay5jYWxsKG51bGwsIGRhdGEpO1xuICAgICAgICAvL30pO1xuICAgICAgICAvLyQoXCIjQ2hheW5zSW1hZ2VVcGxvYWRcIikuY2xpY2soKTtcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjcwNSwgd3A6IDI1MzgsIGlvczogMjY0Mn1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IE5GQyBDYWxsYmFja1xuICAgKiBUT0RPOiByZWZhY3RvciBhbmQgdGVzdFxuICAgKiBUT0RPOiB3aHkgdHdvIGNhbGxzP1xuICAgKiBDYW4gd2UgaW1wcm92ZSB0aGlzIHNoaXQ/IHNwbGl0IGludG8gdHdvIG1ldGhvZHNcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gZm9yIE5GQ1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICBzZXROZmNDYWxsYmFjazogZnVuY3Rpb24oY2FsbGJhY2ssIHJlc3BvbnNlKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDM3LFxuICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgIH0pICYmIGFwaUNhbGwoe1xuICAgICAgICAgIGNtZDogMzcsXG4gICAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciBjbWQgPSAocmVzcG9uc2UgPT09IG5mY1Jlc3BvbnNlRGF0YS5QZXJzb25JZCkgPyAzNyA6IDM4O1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiBjbWQgPT09IDM3ID8gMzggOiAzNyxcbiAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICB9KSAmJiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdOZmNDYWxsYmFjayd9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMzIzNCwgd3A6IDMxMjEgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWRlbyBQbGF5ZXIgQ29udHJvbHNcbiAgICogQWN1dGFsbHkgbmF0aXZlIG9ubHlcbiAgICogVE9ETzogY291bGQgdGhlb3JldGljYWxseSB3b3JrIGluIENoYXlucyBXZWJcbiAgICogVE9ETzogZXhhbXBsZT8gd2hlcmUgZG9lcyB0aGlzIHdvcms/XG4gICAqL1xuICBwbGF5ZXI6IHtcbiAgICB1c2VEZWZhdWx0VXJsOiBmdW5jdGlvbiB1c2VEZWZhdWx0VXJsKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIyLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBjaGFuZ2VVcmw6IGZ1bmN0aW9uIGNoYW5nZVVybCh1cmwpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMixcbiAgICAgICAgcGFyYW1zOiBbeydTdHJpbmcnOiB1cmx9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGhpZGVCdXR0b246IGZ1bmN0aW9uIGhpZGVCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHNob3dCdXR0b246IGZ1bmN0aW9uIHNob3dCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBhdXNlOiBmdW5jdGlvbiBwYXVzZVZpZGVvKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI0LFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwbGF5OiBmdW5jdGlvbiBwbGF5VmlkZW8oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjQsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBsYXliYWNrU3RhdHVzOiBmdW5jdGlvbiBwbGF5YmFja1N0YXR1cyhjYWxsYmFjaykge1xuXG4gICAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChudWxsLCB7XG4gICAgICAgICAgQXBwQ29udHJvbFZpc2libGU6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uSXNBcHBDb250cm9sVmlzaWJsZSxcbiAgICAgICAgICBTdGF0dXM6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uUGxheWJhY2tTdGF0dXMsXG4gICAgICAgICAgVXJsOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLlN0cmVhbVVybFxuICAgICAgICB9KTtcbiAgICAgIH0sIHRydWUpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQmx1ZXRvb3RoXG4gICAqIE9ubHkgaW4gbmF0aXZlIEFwcHMgKGlvcyBhbmQgYW5kcm9pZClcbiAgICovXG4gIGJsdWV0b290aDoge1xuICAgIExFU2VuZFN0cmVuZ3RoOiB7IC8vIFRPRE86IHdoYXQgaXMgdGhhdD9cbiAgICAgIEFkamFjZW50OiAwLFxuICAgICAgTmVhcmJ5OiAxLFxuICAgICAgRGVmYXVsdDogMixcbiAgICAgIEZhcjogM1xuICAgIH0sXG4gICAgTEVTY2FuOiBmdW5jdGlvbiBMRVNjYW4oY2FsbGJhY2spIHtcbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFU2Nhbjogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJztcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNixcbiAgICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIExFQ29ubmVjdDogZnVuY3Rpb24gTEVDb25uZWN0KGFkZHJlc3MsIGNhbGxiYWNrLCBwYXNzd29yZCkge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRUNvbm5lY3Q6IG5vIHZhbGlkIGFkZHJlc3MgcGFyYW1ldGVyJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFQ29ubmVjdDogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc1N0cmluZyhwYXNzd29yZCkgfHwgIXBhc3N3b3JkLm1hdGNoKC9eWzAtOWEtZl17NiwxMn0kL2kpKSB7XG4gICAgICAgIHBhc3N3b3JkID0gJyc7XG4gICAgICB9XG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snO1xuXG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjcsXG4gICAgICAgIHBhcmFtczogW3snc3RyaW5nJzogYWRkcmVzc30sIHsnc3RyaW5nJzogcGFzc3dvcmR9XSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogVE9ETzogY29uc2lkZXIgT2JqZWN0IGFzIHBhcmFtZXRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZGRyZXNzXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzdWJJZFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbWVhc3VyZVBvd2VyXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzZW5kU3RyZW5ndGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIExFV3JpdGU6IGZ1bmN0aW9uIExFV3JpdGUoYWRkcmVzcywgc3ViSWQsIG1lYXN1cmVQb3dlciwgc2VuZFN0cmVuZ3RoLCBjYWxsYmFjaykge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRVdyaXRlOiBubyB2YWxpZCBhZGRyZXNzIHBhcmFtZXRlcicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHN1YklkKSB8fCBzdWJJZCA8IDAgfHwgc3ViSWQgPiA0MDk1KSB7XG4gICAgICAgIHN1YklkID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihtZWFzdXJlUG93ZXIpIHx8IG1lYXN1cmVQb3dlciA8IC0xMDAgfHwgbWVhc3VyZVBvd2VyID4gMCkge1xuICAgICAgICBtZWFzdXJlUG93ZXIgPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHNlbmRTdHJlbmd0aCkgfHwgc2VuZFN0cmVuZ3RoIDwgMCB8fCBzZW5kU3RyZW5ndGggPiAzKSB7XG4gICAgICAgIHNlbmRTdHJlbmd0aCA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snLFxuICAgICAgICB1aWQgPSAnN0EwN0UxN0EtQTE4OC00MTZFLUI3QTAtNUEzNjA2NTEzRTU3JztcblxuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI4LFxuICAgICAgICBwYXJhbXM6IFtcbiAgICAgICAgICB7J3N0cmluZyc6IGFkZHJlc3N9LFxuICAgICAgICAgIHsnc3RyaW5nJzogdWlkfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzdWJJZH0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogbWVhc3VyZVBvd2VyfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzZW5kU3RyZW5ndGh9XG4gICAgICAgIF0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVE9ETzsgdXNlIGBPYmplY3RgIGFzIHBhcmFtc1xuICAvLyBUT0RPOiB3aGF0IGFyZSBvcHRpb25hbCBwYXJhbXM/IHZhbGlkYXRlIG5hbWUgYW5kIGxvY2F0aW9uP1xuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQXBwb2ludG1lbnQncyBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsb2NhdGlvbiBBcHBvaW50bWVudCdzIGxvY2F0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbZGVzY3JpcHRpb25dIEFwcG9pbnRtZW50J3MgZGVzY3JpcHRpb25cbiAgICogQHBhcmFtIHtEYXRlfSBzdGFydCBBcHBvaW50bWVudHMncyBTdGFydERhdGVcbiAgICogQHBhcmFtIHtEYXRlfSBlbmQgQXBwb2ludG1lbnRzJ3MgRW5kRGF0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNhdmVBcHBvaW50bWVudDogZnVuY3Rpb24gc2F2ZUFwcG9pbnRtZW50KG5hbWUsIGxvY2F0aW9uLCBkZXNjcmlwdGlvbiwgc3RhcnQsIGVuZCkge1xuICAgIGlmICghaXNTdHJpbmcobmFtZSkgfHwgIWlzU3RyaW5nKGxvY2F0aW9uKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogbm8gdmFsaWQgbmFtZSBhbmQvb3IgbG9jYXRpb24nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0RhdGUoc3RhcnQpIHx8ICFpc0RhdGUoZW5kKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogc3RhcnQgYW5kL29yIGVuZERhdGUgaXMgbm8gdmFsaWQgRGF0ZSBgT2JqZWN0YC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgc3RhcnQgPSBwYXJzZUludChzdGFydC5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG4gICAgZW5kID0gcGFyc2VJbnQoZW5kLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjksXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydzdHJpbmcnOiBuYW1lfSxcbiAgICAgICAgeydzdHJpbmcnOiBsb2NhdGlvbn0sXG4gICAgICAgIHsnc3RyaW5nJzogZGVzY3JpcHRpb259LFxuICAgICAgICB7J0ludGVnZXInOiBzdGFydH0sXG4gICAgICAgIHsnSW50ZWdlcic6IGVuZH1cbiAgICAgIF0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzA1NCwgaW9zOiAzMDY3LCB3cDogMzAzMH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRGF0ZVR5cGVzIEVudW1cbiAgICogc3RhcnRzIGF0IDFcbiAgICovXG4gIGRhdGVUeXBlOiB7XG4gICAgZGF0ZTogMSxcbiAgICB0aW1lOiAyLFxuICAgIGRhdGVUaW1lOiAzXG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBEYXRlXG4gICAqIE9sZDogRGF0ZVNlbGVjdFxuICAgKiBOYXRpdmUgQXBwcyBvbmx5LiBUT0RPOiBhbHNvIGluIENoYXlucyBXZWI/IEhUTUw1IERhdGVwaWNrZXIgZXRjXG4gICAqIFRPRE87IHJlY29uc2lkZXIgb3JkZXIgZXRjXG4gICAqIEBwYXJhbSB7ZGF0ZVR5cGV8TnVtYmVyfSBkYXRlVHlwZSBFbnVtIDEtMjogdGltZSwgZGF0ZSwgZGF0ZXRpbWUuIHVzZSBjaGF5bnMuZGF0ZVR5cGVcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gcHJlU2VsZWN0IFByZXNldCB0aGUgRGF0ZSAoZS5nLiBjdXJyZW50IERhdGUpXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdGhlIGNob3NlbiBEYXRlIGFzIFRpbWVzdGFtcFxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBtaW5EYXRlIE1pbmltdW0gU3RhcnREYXRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IG1heERhdGUgTWF4aW11bSBFbmREYXRlXG4gICAqL1xuICBzZWxlY3REYXRlOiBmdW5jdGlvbiBzZWxlY3REYXRlKGRhdGVUeXBlLCBwcmVTZWxlY3QsIGNhbGxiYWNrLCBtaW5EYXRlLCBtYXhEYXRlKSB7XG5cbiAgICBpZiAoIWlzTnVtYmVyKGRhdGVUeXBlKSB8fCBkYXRlVHlwZSA8PSAwKSB7XG4gICAgICBsb2cud2Fybignc2VsZWN0RGF0ZTogd3JvbmcgZGF0ZVR5cGUnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3NlbGVjdERhdGU6IGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlVmFsdWUodmFsdWUpIHtcbiAgICAgIGlmICghaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbHVlLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHByZVNlbGVjdCA9IHZhbGlkYXRlVmFsdWUocHJlU2VsZWN0KTtcbiAgICBtaW5EYXRlID0gdmFsaWRhdGVWYWx1ZShtaW5EYXRlKTtcbiAgICBtYXhEYXRlID0gdmFsaWRhdGVWYWx1ZShtYXhEYXRlKTtcblxuICAgIGxldCBkYXRlUmFuZ2UgPSAnJztcbiAgICBpZiAobWluRGF0ZSA+IC0xICYmIG1heERhdGUgPiAtMSkge1xuICAgICAgZGF0ZVJhbmdlID0gJywnICsgbWluRGF0ZSArICcsJyArIG1heERhdGU7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdzZWxlY3REYXRlQ2FsbGJhY2snO1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm4oY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QsIHRpbWUpIHtcbiAgICAgIC8vIFRPRE86IGltcG9ydGFudCB2YWxpZGF0ZSBEYXRlXG4gICAgICAvLyBUT0RPOiBjaG9vc2UgcmlnaHQgZGF0ZSBieSBkYXRlVHlwZUVudW1cbiAgICAgIGxvZy5kZWJ1ZyhkYXRlVHlwZSwgcHJlU2VsZWN0KTtcbiAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgdGltZSA/IG5ldyBEYXRlKHRpbWUpIDogLTEpO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzAsXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX0sXG4gICAgICAgIHsnSW50ZWdlcic6IGRhdGVUeXBlfSxcbiAgICAgICAgeydJbnRlZ2VyJzogcHJlU2VsZWN0ICsgZGF0ZVJhbmdlfVxuICAgICAgXSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMwNzIsIGlvczogMzA2Miwgd3A6IDMwMzB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gVVJMIGluIEFwcFxuICAgKiAob2xkIFNob3dVUkxJbkFwcClcbiAgICogbm90IHRvIGNvbmZ1c2Ugd2l0aCBvcGVuTGlua0luQnJvd3NlclxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFZpZGVvIFVSTCBzaG91bGQgY29udGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gICAgLy8gVE9ETzogaW1wbGVtZW50IENoYXlucyBXZWIgTWV0aG9kIGFzIHdlbGwgKG5hdmlnYXRlIGJhY2sgc3VwcG9ydClcbiAgb3BlblVybDogZnVuY3Rpb24gb3BlblVybCh1cmwsIHRpdGxlKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cuZXJyb3IoJ29wZW5Vcmw6IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jYXRpb24uaHJlZiA9IHVybDsgLy8gVE9ETzogbWFrZSBzdXJlIGl0IHdvcmtzXG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9LCB7J3N0cmluZyc6IHRpdGxlfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzExMCwgaW9zOiAzMDc0LCB3cDogMzA2M31cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogY3JlYXRlIFFSIENvZGVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhIFFSIENvZGUgZGF0YVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgYmFzZTY0IGVuY29kZWQgSU1HIFRPRE86IHdoaWNoIHR5cGU/XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgY3JlYXRlUVJDb2RlOiBmdW5jdGlvbiBjcmVhdGVRUkNvZGUoZGF0YSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWlzU3RyaW5nKGRhdGEpKSB7XG4gICAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ2NyZWF0ZVFSQ29kZTogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NyZWF0ZVFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzMsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGRhdGF9LCB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWVcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogc2NhbiBRUiBDb2RlXG4gICAqIFNjYW5zIFFSIENvZGUgYW5kIHJlYWQgaXRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNjYW5RUkNvZGU6IGZ1bmN0aW9uIHNjYW5RUkNvZGUoY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdzY2FuUVJDb2RlOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnc2NhblFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHNjYW4gUVIgQ29kZVxuICAgKiBTY2FucyBRUiBDb2RlIGFuZCByZWFkIGl0XG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSByZXN1bHRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBnZXRMb2NhdGlvbkJlYWNvbnM6IGZ1bmN0aW9uIGdldExvY2F0aW9uQmVhY29ucyhjYWxsYmFjaywgZm9yY2VSZWxvYWQpIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRMb2NhdGlvbkJlYWNvbnM6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdnZXRCZWFjb25zQ2FsbEJhY2soKSc7XG4gICAgaWYgKGJlYWNvbkxpc3QgJiYgIWZvcmNlUmVsb2FkKSB7IC8vIFRPRE86IG1ha2Ugc3VyZSBpdCBpcyBnb29kIHRvIGNhY2hlIHRoZSBsaXN0XG4gICAgICBsb2cuZGVidWcoJ2dldExvY2F0aW9uQmVhY29uczogdGhlcmUgaXMgYWxyZWFkeSBvbmUgYmVhY29uTGlzdCcpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwobnVsbCwgYmVhY29uTGlzdCk7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja0ZuID0gZnVuY3Rpb24gZ2V0TG9jYXRpb25CZWFjb25DYWxsYmFjayhjYWxsYmFjaywgbGlzdCkge1xuICAgICAgYmVhY29uTGlzdCA9IGxpc3Q7XG4gICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGxpc3QpO1xuICAgIH07XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzOSxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgNDA0NSwgaW9zOiA0MDQ4fSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2spXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCB0byBQYXNzYm9va1xuICAgKiBpT1Mgb25seVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFBhdGggdG8gUGFzc2Jvb2sgZmlsZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGFkZFRvUGFzc2Jvb2s6IGZ1bmN0aW9uIGFkZFRvUGFzc2Jvb2sodXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cud2FybignYWRkVG9QYXNzYm9vazogdXJsIGlzIGludmFsaWQuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA0NyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7aW9zOiA0MDQ1fSxcbiAgICAgIHdlYkZuOiBjaGF5bnNBcGlJbnRlcmZhY2Uub3BlbkxpbmtJbkJyb3dzZXIuYmluZChudWxsLCB1cmwpLFxuICAgICAgZmFsbGJhY2tGbjogY2hheW5zQXBpSW50ZXJmYWNlLm9wZW5MaW5rSW5Ccm93c2VyLmJpbmQobnVsbCwgdXJsKVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUb2JpdCBMb2dpblxuICAgKiBXaXRoIEZhY2Vib29rQ29ubmVjdCBGYWxsYmFja1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1zIFJlbG9hZCBQYXJhbWV0ZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBsb2dpbjogZnVuY3Rpb24gbG9naW4ocGFyYW1zKSB7XG4gICAgcGFyYW1zID0gJ0V4ZWNDb21tYW5kPScgKyBwYXJhbXM7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA1NCxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogcGFyYW1zfV0sXG4gICAgICBzdXBwb3J0OiB7aW9zOiA0MjQwLCB3cDogNDA5OX0sXG4gICAgICBmYWxsYmFja0ZuOiBjaGF5bnNBcGlJbnRlcmZhY2UuZmFjZWJvb2tDb25uZWN0LmJpbmQobnVsbCwgJ3VzZXJfZnJpZW5kcycsIHBhcmFtcyksXG4gICAgICB3ZWJGbjogJ3RvYml0Y29ubmVjdCcsXG4gICAgICB3ZWJQYXJhbXM6IHBhcmFtc1xuICAgIH0pO1xuICB9XG5cbn07XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNQZXJtaXR0ZWQsIGlzRnVuY3Rpb24sIGlzQmxhbmssIGlzQXJyYXksIGlzT2JqZWN0LCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93LCBwYXJlbnR9IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInO1xuaW1wb3J0IHtlbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge3NldENhbGxiYWNrfSBmcm9tICcuL2NhbGxiYWNrcyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY29yZS5jaGF5bnNfY2FsbHMnKTtcblxuXG5mdW5jdGlvbiBjYW4odmVyc2lvbnMpIHtcbiAgcmV0dXJuIGlzUGVybWl0dGVkKHZlcnNpb25zLCBlbnZpcm9ubWVudC5vcywgZW52aXJvbm1lbnQuYXBwVmVyc2lvbik7XG59XG5cbi8vIE9TIEFwcCBWZXJzaW9uIE1hcCBmb3IgQ2hheW5zIENhbGxzIFN1cHBvcnRcbi8vIFRPRE86IG1vdmUgaW50byBlbnZpcm9ubWVudD8gKG9yIGp1c3QgcmVtb3ZlIGNhdXNlIGl0IGlzIG9ubHkgdXNlZCBvbmUgdGltZSBpbiBoZXJlKVxubGV0IG9zTWFwID0ge1xuICBjaGF5bnNDYWxsOiB7IGFuZHJvaWQ6IDI1MTAsIGlvczogMjQ4Mywgd3A6IDI0NjksIGJiOiAxMTggfVxufTtcblxuLyoqXG4gKiBQdWJsaWMgQ2hheW5zIEludGVyZmFjZVxuICogRXhlY3V0ZSBBUEkgQ2FsbFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqIEBwYXJhbSBkZWJvdW5jZVxuICogLy8gVE9ETzogbGVmdCBvZiBjYWxsYmFjayBhcyBwcm9taXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcGlDYWxsKG9iaikge1xuXG4gIGxldCBkZWJvdW5jZSA9IG9iai5kZWJvdW5jZSB8fCBmYWxzZTtcblxuICAvLyBUT0RPOiBjaGVjayBvYmoub3MgVkVSU0lPTlxuXG4gIGZ1bmN0aW9uIGV4ZWN1dGVDYWxsKGNoYXluc0NhbGxPYmopIHtcblxuICAgIGlmIChlbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsICYmIGNhbihvc01hcC5jaGF5bnNDYWxsKSkge1xuICAgICAgLy8gVE9ETzogY29uc2lkZXIgY2FsbFF1ZXVlIGFuZCBJbnRlcnZhbCB0byBwcmV2ZW50IGVycm9yc1xuICAgICAgbG9nLmRlYnVnKCdleGVjdXRlQ2FsbDogY2hheW5zIGNhbGwgJywgY2hheW5zQ2FsbE9iai5jbWQpO1xuXG4gICAgICBpZiAoJ2NiJyBpbiBjaGF5bnNDYWxsT2JqICYmIGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5jYikpIHtcbiAgICAgICAgc2V0Q2FsbGJhY2soY2hheW5zQ2FsbE9iai5jYWxsYmFja05hbWUgfHwgY2hheW5zQ2FsbE9iai5wYXJhbXNbMF0uY2FsbGJhY2ssIGNoYXluc0NhbGxPYmouY2IsIHRydWUpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGNoYXluc0NhbGxPYmouc3VwcG9ydCkgJiYgIWNhbihjaGF5bnNDYWxsT2JqLnN1cHBvcnQpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogdGhlIGNoYXlucyB2ZXJzaW9uIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgaWYgKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrIGNoYXlucyBjYWxsIHdpbGwgYmUgaW52b2tlZCcpO1xuICAgICAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbikpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrRm4gd2lsbCBiZSBpbnZva2VkJyk7XG4gICAgICAgICAgcmV0dXJuIGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbi5jYWxsKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouY21kLCBjaGF5bnNDYWxsT2JqLnBhcmFtcyk7XG5cbiAgICB9IGVsc2UgaWYgKGVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwpIHtcblxuICAgICAgaWYgKCdjYicgaW4gY2hheW5zQ2FsbE9iaiAmJiBpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouY2IpKSB7XG4gICAgICAgIHNldENhbGxiYWNrKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmouY2IpO1xuICAgICAgfVxuICAgICAgaWYgKCFjaGF5bnNDYWxsT2JqLndlYkZuKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogVGhpcyBDYWxsIGhhcyBubyB3ZWJGbicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZUNhbGw6IGNoYXlucyB3ZWIgY2FsbCAnLCBjaGF5bnNDYWxsT2JqLndlYkZuLm5hbWUgfHwgY2hheW5zQ2FsbE9iai53ZWJGbik7XG5cbiAgICAgIHJldHVybiBjaGF5bnNXZWJDYWxsKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmoud2ViUGFyYW1zIHx8IGNoYXluc0NhbGxPYmoucGFyYW1zKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IG5laXRoZXIgY2hheW5zIHdlYiBjYWxsIG5vciBjaGF5bnMgd2ViJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRlYm91bmNlKSB7XG4gICAgc2V0VGltZW91dChleGVjdXRlQ2FsbC5iaW5kKG51bGwsIG9iaiksIDEwMCk7IC8vIFRPRE86IGVycm9yP1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleGVjdXRlQ2FsbChvYmopO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGQgQ2hheW5zIENhbGwgKG9ubHkgZm9yIG5hdGl2ZSBBcHBzKVxuICogQHByaXZhdGVcblxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgY2hheW5zIGNhbGwgc3VjY2VlZGVkLCBmYWxzZSBvbiBlcnJvciAobm8gdXJsIGV0YylcbiAqL1xuZnVuY3Rpb24gY2hheW5zQ2FsbChjbWQsIHBhcmFtcykge1xuXG4gIGlmIChpc0JsYW5rKGNtZCkpIHsgLy8gMCBpcyBhIHZhbGlkIGNhbGwsIHVuZGVmaW5lZCBhbmQgbnVsbCBhcmUgbm90XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IG1pc3NpbmcgY21kIGZvciBjaGF5bnNDYWxsJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxldCB1cmwgPSBudWxsO1xuXG4gIC8vIGlmIHRoZXJlIGlzIG5vIHBhcmFtIG9yICdub25lJyB3aGljaCBtZWFucyBubyBjYWxsYmFja1xuICBpZiAoIXBhcmFtcykge1xuXG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArICcpJztcblxuICB9IGVsc2Uge1xuXG4gICAgLy8gcGFyYW1zIGV4aXN0IGhvd2V2ZXIsIGl0IGlzIG5vIGFycmF5XG4gICAgaWYgKCFpc0FycmF5KHBhcmFtcykpIHtcbiAgICAgIGxvZy5lcnJvcignY2hheW5zQ2FsbDogcGFyYW1zIGFyZSBubyBBcnJheScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcGFyYW1zIHRvIHRoZSBjaGF5bnMgY2FsbFxuICAgIGxldCBjYWxsYmFja1ByZWZpeCA9ICdfY2hheW5zQ2FsbGJhY2tzLic7XG4gICAgbGV0IGNhbGxTdHJpbmcgPSAnJztcbiAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBjYWxsQXJncyA9IFtdO1xuICAgICAgcGFyYW1zLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgbGV0IG5hbWUgPSBPYmplY3Qua2V5cyhwYXJhbSlbMF07XG4gICAgICAgIGxldCB2YWx1ZSA9IHBhcmFtW25hbWVdO1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2NhbGxiYWNrJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1xcJycgKyBjYWxsYmFja1ByZWZpeCArIHZhbHVlICsgJ1xcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdib29sJyB8fCBuYW1lID09PSAnRnVuY3Rpb24nIHx8IG5hbWUgPT09ICdJbnRlZ2VyJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2godmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKCdcXCcnICsgdmFsdWUgKyAnXFwnJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY2FsbFN0cmluZyA9ICcsJyArIGNhbGxBcmdzLmpvaW4oJywnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgY2hheW5zIHByb3RvY29sIGFuZCBob3N0IGFuZCBqb2luIGFycmF5XG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArIGNhbGxTdHJpbmcgKyAnKSc7XG4gIH1cblxuICBsb2cuZGVidWcoJ2NoYXluc0NhbGw6IHVybDogJywgdXJsKTtcblxuICB0cnkge1xuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBlYXNpZXIgaWRlbnRpZmljYXRpb24gb2YgdGhlIHJpZ2h0IGVudmlyb25tZW50XG4gICAgLy8gVE9ETzogY29uc2lkZXIgdG8gZXhlY3V0ZSB0aGUgYnJvd3NlciBmYWxsYmFjayBpbiBoZXJlIGFzIHdlbGxcbiAgICBpZiAoJ2NoYXluc0NhbGwnIGluIHdpbmRvdyAmJiBpc0Z1bmN0aW9uKHdpbmRvdy5jaGF5bnNDYWxsLmhyZWYpKSB7XG4gICAgICB3aW5kb3cuY2hheW5zQ2FsbC5ocmVmKHVybCk7XG4gICAgfSBlbHNlIGlmICgnd2Via2l0JyBpbiB3aW5kb3dcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKSB7XG4gICAgICB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKHVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy53YXJuKCdjaGF5bnNDYWxsOiBFcnJvcjogY291bGQgbm90IGV4ZWN1dGUgQ2hheW5zQ2FsbDogJywgZSk7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeGVjdXRlIGEgQ2hheW5zV2ViIENhbGwgaW4gdGhlIHBhcmVudCB3aW5kb3cuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZuIEZ1bmN0aW9uIG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbXMgQWRkaXRpb25hbFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY2hheW5zV2ViYkNhbGwgc3VjY2VlZGVkXG4gKi9cbmZ1bmN0aW9uIGNoYXluc1dlYkNhbGwoZm4sIHBhcmFtcykge1xuICBpZiAoIWZuKSB7XG4gICAgbG9nLmluZm8oJ2NoYXluc1dlYkNhbGw6IG5vIENoYXluc1dlYkNhbGwgZm4nKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAoIXBhcmFtcyB8fCBpc0FycmF5KHBhcmFtcykpIHsgLy8gQXJyYXkgaW5kaWNhdGVzIHRoYXQgdGhlc2UgYXJlIGNoYXluc0NhbGxzIHBhcmFtcyBUT0RPOiByZWZhY3RvclxuICAgIHBhcmFtcyA9ICcnO1xuICB9XG4gIGlmIChpc09iamVjdChwYXJhbXMpKSB7IC8vIGFuIEFycmF5IGlzIGFsc28gc2VlbiBhcyBPYmplY3QsIGhvd2V2ZXIgaXQgd2lsbCBiZSByZXNldCBiZWZvcmVcbiAgICBwYXJhbXMgPSBKU09OLnN0cmluZ2lmeShwYXJhbXMpO1xuICB9XG5cbiAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgcmV0dXJuIGZuLmNhbGwobnVsbCk7XG4gIH1cblxuICB2YXIgbmFtZXNwYWNlID0gJ2NoYXlucy5jdXN0b21UYWIuJztcbiAgdmFyIHVybCA9IG5hbWVzcGFjZSArIGZuICsgJzonICsgcGFyYW1zO1xuXG4gIGxvZy5kZWJ1ZygnY2hheW5zV2FiQ2FsbDogJyArIHVybCk7XG5cbiAgdHJ5IHtcbiAgICBwYXJlbnQucG9zdE1lc3NhZ2UodXJsLCAnKicpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLndhcm4oJ2NoYXluc1dlYkNhbGw6IHBvc3RNZXNzZ2FlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBjb25maWdcbiAqIEBwcml2YXRlXG4gKi9cblxuaW1wb3J0IHtpc1ByZXNlbnQsIGlzQmxhbmssIGlzVW5kZWZpbmVkLCBpc0FycmF5LCBleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBTdG9yZSBpbnRlcm5hbCBjaGF5bnMgY29uZmlndXJhdGlvblxuICogQHR5cGUge3thcHBOYW1lOiBzdHJpbmcsIGFwcFZlcnNpb246IG51bWJlciwgbG9hZE1vZGVybml6ZXI6IGJvb2xlYW4sIGxvYWRQb2x5ZmlsbHM6IGJvb2xlYW4sIHVzZUZldGNoOiBib29sZWFuLCBwcm9taXNlczogc3RyaW5nLCB1c2VPZmZsaW5lQ2FjaGluZzogYm9vbGVhbiwgdXNlTG9jYWxTdG9yYWdlOiBib29sZWFuLCBoYXNBZG1pbjogYm9vbGVhbiwgbXVsdGlMaW5ndWFsOiBib29sZWFuLCBpc1B1Ymxpc2hlZDogYm9vbGVhbiwgZGVidWdNb2RlOiBib29sZWFuLCB1c2VBamF4OiBib29sZWFufX1cbiAqIEBwcml2YXRlXG4gKi9cbnZhciBfY29uZmlnID0ge1xuICBhcHBOYW1lOiAnQ2hheW5zIEFwcCcsICAgLy8gYXBwIE5hbWVcbiAgYXBwVmVyc2lvbjogMSwgICAgICAgICAgIC8vIGFwcCBWZXJzaW9uXG4gIHByZXZlbnRFcnJvcnM6IHRydWUsICAgICAgICAvLyBlcnJvciBoYW5kbGVyIGNhbiBoaWRlIGVycm9ycyAoY2FuIGJlIG92ZXJ3dGl0dGVuIGJ5IGlzUHJvZHVjdGlvbilcbiAgaXNQcm9kdWN0aW9uOiB0cnVlLCAgICAgIC8vIHByb2R1Y3Rpb24sIGRldmVsb3BtZW50IGFuZCB0ZXN0IEVOVlxuICBsb2FkTW9kZXJuaXplcjogdHJ1ZSwgICAgLy8gbG9hZCBtb2Rlcm5pemVyXG4gIGxvYWRQb2x5ZmlsbHM6IHRydWUsICAgICAvLyBsb2FkIHBvbHlmaWxsc1xuICB1c2VGZXRjaDogdHJ1ZSwgICAgICAgICAgLy8gdXNlIHdpbmRvdy5mZXRjaCBhbmQgaXQncyBwb2x5ZmlsbHNcbiAgcHJvbWlzZXM6ICdxJywgICAgICAgICAgIC8vIHByb21pc2UgU2VydmljZTogUSBpcyBzdGFuZGFyZFxuICB1c2VPZmZsaW5lQ2FjaGluZzogZmFsc2UsLy8gaXMgb2ZmbGluZSBjYWNoaW5nIHVzZWQ/IGlubGN1ZGUgb2ZmbGluZSBoZWxwZXJcbiAgdXNlTG9jYWxTdG9yYWdlOiBmYWxzZSwgIC8vIGlzIGxvY2FsU3RvcmFnZSB1c2VkPyBpbmNsdWRlIGhlbHBlclxuICBoYXNBZG1pbjogZmFsc2UsICAgICAgICAgLy8gZG9lcyB0aGlzIGFwcC9wYWdlIGhhdmUgYW4gYWRtaW4/XG4gIG11bHRpTGluZ3VhbDogdHJ1ZSwgICAgICAvLyBlbmFibGUgaTE4bj9cbiAgaXNQdWJsaXNoZWQ6IHRydWUsICAgICAgIC8vIG9ubHkgaW4gaW50ZXJuYWwgdG9iaXQgYXZhaWxhYmxlXG4gIGRlYnVnTW9kZTogdHJ1ZSwgICAgICAgICAvLyBzaG93IGNvbnNvbGUgb3V0cHV0LCBkZWJ1ZyBwYXJhbSBmb3IgbG9nZ2luZ1xuICB1c2VBamF4OiBmYWxzZSxcbiAgaXNJbnRlcm5hbDogZmFsc2UgICAgICAgIC8vIHVzZSBpbnRlcm5hbCByb3V0aW5nXG4gIC8vZnJhbWV3b3JrOiBbJ0VtYmVyJywgJ0FuZ3VsYXInLCAnQmFja2JvbmUnLCAnQW1wZXJzYW5kJywgJ1JlYWN0JywgJ2pRdWVyeSddXG59O1xuXG4vLyBUT0RPOiByZW1vdmVcbi8qZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZygpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gQ29uZmlnLnNldChhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7IC8vIFRPRE86IHJlZmFjdG9yIHRoaXNcbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIENvbmZpZy5nZXQoYXJndW1lbnRzKTtcbiAgfVxuICByZXR1cm4gQ29uZmlnLmdldCgpO1xufSovXG5cbi8vIFRPRE86IHJlZmFjdG9yIHRvIE1hcFxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XG5cbiAgLyoqXG4gICAqIEBtZXRob2QgZ2V0XG4gICAqIEBjbGFzcyBDb25maWdcbiAgICogQG1vZHVsZSBjaGF5bnMuY29uZmlnXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgUmVmZXJlbmNlIHRoZSBga2V5YCBpbiB0aGUgY29uZmlnIGBPYmplY3RgXG4gICAqIEByZXR1cm5zIHtudWxsfSBWYWx1ZSBvZiB0aGUgYGtleWAgaW4gdGhlIGNvbmZpZyBgT2JqZWN0YFxuICAgKiAgICAgICAgICAgICAgICAgYHVuZGVmaW5lZGAgaWYgdGhlIGBrZXlgIHdhcyBub3QgZm91bmRcbiAgICovXG4gIHN0YXRpYyBnZXQoa2V5KSB7XG4gICAgaWYgKGlzUHJlc2VudChrZXkpKSB7XG4gICAgICByZXR1cm4gX2NvbmZpZ1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHBhcmFtIHZhbHVlXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIHNldChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGlzQmxhbmsoa2V5KSB8fCBpc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gVE9ETzogZ29vZCBpZGVhPyBvbmUgc2hvdWxkIGJlIGNhcmVmdWwgaSBzdXBwb3NlXG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBleHRlbmQoX2NvbmZpZywgdmFsdWUpO1xuICAgIH1cbiAgICBfY29uZmlnW2tleV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gISFrZXkgJiYgKGtleSBpbiBfY29uZmlnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzT2JqZWN0LCBET019IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge21lc3NhZ2VMaXN0ZW5lcn0gZnJvbSAnLi9jYWxsYmFja3MnO1xuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9IGZyb20gJy4vY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuaW1wb3J0IHtlbnZpcm9ubWVudCwgc2V0RW52fSBmcm9tICcuL2Vudmlyb25tZW50JztcblxuLy8gY3JlYXRlIG5ldyBMb2dnZXIgaW5zdGFuY2VcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jb3JlJyk7XG5cbi8vIGVuYWJsZSBKUyBFcnJvcnMgaW4gdGhlIGNvbnNvbGVcbkNvbmZpZy5zZXQoJ3ByZXZlbnRFcnJvcnMnLCBmYWxzZSk7XG5cbi8qKlxuICpcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKlxuICogQHR5cGUge2Jvb2xlYW59IFRydWUgaWYgdGhlIERPTSBpcyBsb2FkZWRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciBkb21SZWFkeSA9IGZhbHNlO1xuXG4vKipcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKlxuICogQHR5cGUge2FycmF5fSBDb250YWlucyBjYWxsYmFja3MgZm9yIHRoZSBET00gcmVhZHkgZXZlbnRcbiAqIEBwcml2YXRlXG4gKi9cbnZhciByZWFkeUNhbGxiYWNrcyA9IFtdO1xuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5wcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIoY29uZmlnKSB7XG4gIGxvZy5pbmZvKCdjaGF5bnMucmVnaXN0ZXInKTtcbiAgQ29uZmlnLnNldChjb25maWcpOyAvLyB0aGlzIHJlZmVyZW5jZSB0byB0aGUgY2hheW5zIG9ialxuICByZXR1cm4gdGhpcztcbn1cblxuLy8gVE9ETzogcmVnaXN0ZXIgYEZ1bmN0aW9uYCBvciBwcmVDaGF5bnMgYE9iamVjdGA/XG5leHBvcnQgZnVuY3Rpb24gcHJlQ2hheW5zKCkge1xuICBpZiAoJ3ByZUNoYXlucycgaW4gd2luZG93ICYmIGlzT2JqZWN0KHdpbmRvdy5wcmVDaGF5bnMpKSB7XG4gICAgT2JqZWN0LmtleXMod2luZG93LnByZUNoYXlucykuZm9yRWFjaChmdW5jdGlvbihzZXR0aW5nKSB7XG4gICAgICBsb2cuZGVidWcoJ3ByZSBjaGF5bnM6ICcsIHNldHRpbmcpO1xuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLnByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkeShjYikge1xuICBsb2cuaW5mbygnY2hheW5zLnJlYWR5Jyk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChkb21SZWFkeSkge1xuICAgIC8vIFRPRE86IHJldHVybiBhIGN1c3RvbSBNb2RlbCBPYmplY3QgaW5zdGVhZCBvZiBgY29uZmlnYFxuICAgIGNiKHtcbiAgICAgIGFwcE5hbWU6Q29uZmlnLmdldCgnYXBwTmFtZScpLFxuICAgICAgYXBwVmVyc2lvbjogQ29uZmlnLmdldCgnYXBwVmVyc2lvbicpXG4gICAgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHJlYWR5Q2FsbGJhY2tzLnB1c2goYXJndW1lbnRzWzBdKTtcbn1cblxuLyoqXG4gKiBAbmFtZSBwcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0gb2JqIFJlZmVyZW5jZSB0byBjaGF5bnMgT2JqZWN0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwKCkge1xuICBsb2cuaW5mbygnc3RhcnQgY2hheW5zIHNldHVwJyk7XG5cbiAgLy8gZW5hYmxlIGBjaGF5bnMuY3NzYCBieSBhZGRpbmcgYGNoYXluc2AgY2xhc3NcbiAgLy8gcmVtb3ZlIGBuby1qc2AgY2xhc3MgYW5kIGFkZCBganNgIGNsYXNzXG4gIGxldCBib2R5ID0gZG9jdW1lbnQuYm9keTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdjaGF5bnMnKTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdqcycpO1xuICBET00ucmVtb3ZlQ2xhc3MoYm9keSwgJ25vLWpzJyk7XG5cblxuICAvLyBydW4gcG9seWZpbGwgKGlmIHJlcXVpcmVkKVxuXG4gIC8vIHJ1biBtb2Rlcm5pemVyIChmZWF0dXJlIGRldGVjdGlvbilcblxuICAvLyBydW4gZmFzdGNsaWNrXG5cbiAgLy8gKHZpZXdwb3J0IHNldHVwKVxuXG4gIC8vIGNyYXRlIG1ldGEgdGFncyAoY29sb3JzLCBtb2JpbGUgaWNvbnMgZXRjKVxuXG4gIC8vIGRvIHNvbWUgU0VPIHN0dWZmIChjYW5vbmljYWwgZXRjKVxuXG4gIC8vIGRldGVjdCB1c2VyIChsb2dnZWQgaW4/KVxuXG4gIC8vIHJ1biBjaGF5bnMgc2V0dXAgKGNvbG9ycyBiYXNlZCBvbiBlbnZpcm9ubWVudClcblxuXG5cbiAgLy8gc2V0IERPTSByZWFkeSBldmVudFxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuXG4gICAgZG9tUmVhZHkgPSB0cnVlO1xuICAgIGxvZy5kZWJ1ZygnRE9NIHJlYWR5Jyk7XG5cbiAgICAvLyBhZGQgY2hheW5zIHJvb3QgZWxlbWVudFxuICAgIGxldCBjaGF5bnNSb290ID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtcm9vdCcpO1xuICAgIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3Jvb3QnKTtcbiAgICBET00uYXBwZW5kQ2hpbGQoYm9keSwgY2hheW5zUm9vdCk7XG5cbiAgICAvLyBkb20tcmVhZHkgY2xhc3NcbiAgICBET00uYWRkQ2xhc3MoZG9jdW1lbnQuYm9keSwgJ2RvbS1yZWFkeScpO1xuXG4gICAgLy8gZ2V0IHRoZSBBcHAgSW5mb3JtYXRpb24sIGhhcyB0byBiZSBkb25lIHdoZW4gZG9jdW1lbnQgcmVhZHlcbiAgICBsZXQgZ2V0QXBwSW5mb3JtYXRpb25DYWxsID0gY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICAvLyBub3cgQ2hheW5zIGlzIG9mZmljaWFsbHkgcmVhZHlcbiAgICAgIC8vIGZpcnN0IHNldCBhbGwgZW52IHN0dWZmXG4gICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpcyBubyBhcHAgRGF0YScpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNPYmplY3QoZGF0YS5BcHBJbmZvKSkge1xuICAgICAgICBsZXQgYXBwSW5mbyA9IGRhdGEuQXBwSW5mbztcbiAgICAgICAgbGV0IHNpdGUgPSB7XG4gICAgICAgICAgc2l0ZUlkOiBhcHBJbmZvLlNpdGVJRCxcbiAgICAgICAgICB0aXRsZTogYXBwSW5mby5UaXRsZSxcbiAgICAgICAgICB0YXBwczogYXBwSW5mby5UYXBwcyxcbiAgICAgICAgICBmYWNlYm9va0FwcElkOiBhcHBJbmZvLkZhY2Vib29rQXBwSUQsXG4gICAgICAgICAgZmFjZWJvb2tQYWdlSWQ6IGFwcEluZm8uRmFjZWJvb2tQYWdlSUQsXG4gICAgICAgICAgY29sb3JTY2hlbWU6IGFwcEluZm8uQ29sb3JTY2hlbWUgfHwgMCxcbiAgICAgICAgICB2ZXJzaW9uOiBhcHBJbmZvLlZlcnNpb24sXG4gICAgICAgICAgdGFwcDogYXBwSW5mby5UYXBwU2VsZWN0ZWRcbiAgICAgICAgfTtcbiAgICAgICAgc2V0RW52KCdzaXRlJywgc2l0ZSk7XG4gICAgICB9XG4gICAgICBpZiAoaXNPYmplY3QoZGF0YS5BcHBVc2VyKSkge1xuICAgICAgICBsZXQgYXBwVXNlciA9IGRhdGEuQXBwVXNlcjtcbiAgICAgICAgbGV0IHVzZXIgPSB7XG4gICAgICAgICAgbmFtZTogYXBwVXNlci5GYWNlYm9va1VzZXJOYW1lLFxuICAgICAgICAgIGlkOiBhcHBVc2VyLlRvYml0VXNlcklELFxuICAgICAgICAgIGZhY2Vib29rSWQ6IGFwcFVzZXIuRmFjZWJvb2tJRCxcbiAgICAgICAgICBwZXJzb25JZDogYXBwVXNlci5QZXJzb25JRCxcbiAgICAgICAgICBhY2Nlc3NUb2tlbjogYXBwVXNlci5Ub2JpdEFjY2Vzc1Rva2VuLFxuICAgICAgICAgIGZhY2Vib29rQWNjZXNzVG9rZW46IGFwcFVzZXIuRmFjZWJvb2tBY2Nlc3NUb2tlbixcbiAgICAgICAgICBncm91cHM6IGFwcFVzZXIuVUFDR3JvdXBzXG4gICAgICAgIH07XG4gICAgICAgIHNldEVudigndXNlcicsIHVzZXIpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGRhdGEuRGV2aWNlKSkge1xuICAgICAgICBsZXQgZGV2aWNlID0gZGF0YS5EZXZpY2U7XG4gICAgICAgIGxldCBhcHAgPSB7XG4gICAgICAgICAgbGFuZ3VhZ2VJZDogZGV2aWNlLkxhbmd1YWdlSUQsXG4gICAgICAgICAgbW9kZWw6IGRldmljZS5Nb2RlbCxcbiAgICAgICAgICBuYW1lOiBkZXZpY2UuU3lzdGVtTmFtZSxcbiAgICAgICAgICB2ZXJzaW9uOiBkZXZpY2UuU3lzdGVtVmVyc2lvbixcbiAgICAgICAgICB1aWQ6IGRldmljZS5VSUQsIC8vIFRPRE8gdXVpZD8gaXMgaXQgZXZlbiB1c2VkP1xuICAgICAgICAgIG1ldHJpY3M6IGRldmljZS5NZXRyaWNzIC8vIFRPRE86IHVzZWQ/XG4gICAgICAgIH07XG4gICAgICAgIHNldEVudignYXBwJywgYXBwKTtcbiAgICAgIH1cblxuXG4gICAgICBsb2cuZGVidWcoJ2FwcEluZm9ybWF0aW9uIGNhbGxiYWNrJywgZGF0YSk7XG5cbiAgICAgIHJlYWR5Q2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgICByZWFkeUNhbGxiYWNrcyA9IFtdO1xuXG4gICAgICBET00uYWRkQ2xhc3MoZG9jdW1lbnQuYm9keSwgJ2NoYXlucy1yZWFkeScpO1xuICAgICAgRE9NLnJlbW92ZUF0dHJpYnV0ZShET00ucXVlcnkoJ1tjaGF5bnMtY2xvYWtdJyksICdjaGF5bnMtY2xvYWsnKTtcblxuICAgICAgY3NzU2V0dXAoKTtcblxuICAgICAgbG9nLmluZm8oJ2ZpbmlzaGVkIGNoYXlucyBzZXR1cCcpO1xuICAgIH0pO1xuXG4gICAgaWYgKCFnZXRBcHBJbmZvcm1hdGlvbkNhbGwpIHtcbiAgICAgIGxvZy5lcnJvcignVGhlIEFwcCBJbmZvcm1hdGlvbiBjb3VsZCBub3QgYmUgcmV0cmlldmVkLicpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gc3RhcnQgd2luZG93Lm9uKCdtZXNzYWdlJykgbGlzdGVuZXIgZm9yIEZyYW1lIENvbW11bmljYXRpb25cbiAgbWVzc2FnZUxpc3RlbmVyKCk7XG5cblxufVxuXG5mdW5jdGlvbiBjc3NTZXR1cCgpIHtcbiAgbGV0IGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICBsZXQgc3VmZml4ID0gJ2NoYXlucy0nO1xuXG4gIERPTS5hZGRDbGFzcyhib2R5LCBzdWZmaXggKyAnb3MtLScgKyBlbnZpcm9ubWVudC5vcyk7XG4gIERPTS5hZGRDbGFzcyhib2R5LCBzdWZmaXggKyAnYnJvd3Nlci0tJyArIGVudmlyb25tZW50LmJyb3dzZXIpO1xuICBET00uYWRkQ2xhc3MoYm9keSwgc3VmZml4ICsgJ2NvbG9yLS0nICsgZW52aXJvbm1lbnQuYnJvd3Nlcik7XG5cbiAgaWYgKGVudmlyb25tZW50LmlzQ2hheW5zV2ViKSB7XG4gICAgRE9NLmFkZENsYXNzKGJvZHksIHN1ZmZpeCArICctJyArICd3ZWInKTtcbiAgfVxuICBpZiAoZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGUpIHtcbiAgICBET00uYWRkQ2xhc3MoYm9keSwgc3VmZml4ICsgJy0nICsgJ21vYmlsZScpO1xuICB9XG4gIGlmIChlbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3ApIHtcbiAgICBET00uYWRkQ2xhc3MoYm9keSwgc3VmZml4ICsgJy0nICsgJ2Rlc2t0b3AnKTtcbiAgfVxuICBpZiAoZW52aXJvbm1lbnQuaXNBcHApIHtcbiAgICBET00uYWRkQ2xhc3MoYm9keSwgc3VmZml4ICsgJy0nICsgJ2FwcCcpO1xuICB9XG4gIGlmIChlbnZpcm9ubWVudC5pc0luRnJhbWUpIHtcbiAgICBET00uYWRkQ2xhc3MoYm9keSwgc3VmZml4ICsgJy0nICsgJ2ZyYW1lJyk7XG4gIH1cbn1cbiIsIi8qKlxuICogQG1vZHVsZSBjaGF5bnMuZW52aXJvbm1lbnRcbiAqIEBkZXNjcmlwdGlvblxuICogQ2hheW5zIEVudmlyb25tZW50XG4gKi9cblxuaW1wb3J0IHtnZXRMb2dnZXIsIGV4dGVuZH0gZnJvbSAnLi4vdXRpbHMnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVudmlyb25tZW50Jyk7XG5cbi8vIFRPRE86IGltcG9ydCBkZXBlbmRlbmNpZXNcbnZhciB0eXBlcyA9IHt9O1xuXG50eXBlcy5icm93c2VyID0gW1xuICAnY2hyb21lJyxcbiAgJ2ZpcmVmb3gnLFxuICAnc2FmYXJpJyxcbiAgJ29wZXJhJyxcbiAgJ2Nocm9tZSBtb2JpbGUnLFxuICAnc2FmYXJpIG1vYmlsZScsXG4gICdmaXJlZm94IG1vYmlsZSdcbl07XG5cbnR5cGVzLm9zID0gW1xuICAnd2luZG93cycsXG4gICdtYWNPUycsXG4gICdhbmRyb2lkJyxcbiAgJ2lvcycsXG4gICd3cCdcbl07XG5cbnR5cGVzLmNoYXluc09TID0ge1xuICB3ZWI6ICd3ZWJzaGFkb3cnLFxuICB3ZWJNb2JpbGU6ICd3ZWJzaGFkb3dtb2JpbGUnLFxuICBhcHA6ICd3ZWJzaGFkb3dtb2JpbGUnXG59O1xuXG4vLyBUT0RPOiBoaWRlIGludGVybmFsIHBhcmFtZXRlcnMgZnJvbSB0aGUgb3RoZXJzXG4vLyBUT0RPOiBvZmZlciB1c2VyIGFuIGBPYmplY3RgIHdpdGggVVJMIFBhcmFtZXRlcnNcbi8vIGxvY2F0aW9uIHF1ZXJ5IHN0cmluZ1xudmFyIHF1ZXJ5ID0gbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKTtcbnZhciBwYXJhbWV0ZXJzID0ge307XG5xdWVyeS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24ocGFydCkge1xuICB2YXIgaXRlbSA9IHBhcnQuc3BsaXQoJz0nKTtcbiAgcGFyYW1ldGVyc1tpdGVtWzBdLnRvTG93ZXJDYXNlKCldID0gZGVjb2RlVVJJQ29tcG9uZW50KGl0ZW1bMV0pLnRvTG93ZXJDYXNlKCk7XG59KTtcblxuLy8gdmVyaWZ5IGJ5IGNoYXlucyByZXF1aXJlZCBwYXJhbWV0ZXJzIGV4aXN0XG5pZiAoIXBhcmFtZXRlcnMuYXBwdmVyc2lvbikge1xuICBsb2cud2Fybignbm8gYXBwIHZlcnNpb24gcGFyYW1ldGVyJyk7XG59XG5pZiAoIXBhcmFtZXRlcnMub3MpIHtcbiAgbG9nLndhcm4oJ25vIG9zIHBhcmFtZXRlcicpO1xufVxuaWYgKHBhcmFtZXRlcnMuZGVidWcpIHtcbiAgLy8gVE9ETzogZW5hYmxlIGRlYnVnIG1vZGVcbn1cblxuLy8gVE9ETzogZnVydGhlciBwYXJhbXMgYW5kIGNvbG9yc2NoZW1lXG4vLyBUT0RPOiBkaXNjdXNzIHJvbGUgb2YgVVJMIHBhcmFtcyBhbmQgdHJ5IHRvIHJlcGxhY2UgdGhlbSBhbmQgb25seSB1c2UgQXBwRGF0YVxuXG5cbmZ1bmN0aW9uIGdldEZpcnN0TWF0Y2gocmVnZXgpIHtcbiAgdmFyIG1hdGNoID0gdWEubWF0Y2gocmVnZXgpO1xuICByZXR1cm4gKG1hdGNoICYmIG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2hbMV0pIHx8ICcnO1xufVxuXG4vLyB1c2VyIGFnZW50IGRldGVjdGlvblxudmFyIHVzZXJBZ2VudCA9ICh3aW5kb3cubmF2aWdhdG9yICYmIG5hdmlnYXRvci51c2VyQWdlbnQpIHx8ICcnO1xuXG52YXIgaXMgPSB7XG4gIGlvczogL2lQaG9uZXxpUGFkfGlQb2QvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGFuZHJvaWQ6IC9BbmRyb2lkL2kudGVzdCh1c2VyQWdlbnQpLFxuICB3cDogL3dpbmRvd3MgcGhvbmUvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGJiOiAvQmxhY2tCZXJyeXxCQjEwfFJJTS9pLnRlc3QodXNlckFnZW50KSxcblxuICBvcGVyYTogKCEhd2luZG93Lm9wZXJhIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignIE9QUi8nKSA+PSAwKSxcbiAgZmlyZWZveDogKHR5cGVvZiBJbnN0YWxsVHJpZ2dlciAhPT0gJ3VuZGVmaW5lZCcpLFxuICBzYWZhcmk6IChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93LkhUTUxFbGVtZW50KS5pbmRleE9mKCdDb25zdHJ1Y3RvcicpID4gMCksXG4gIGNocm9tZTogKCEhd2luZG93LmNocm9tZSAmJiAhKCEhd2luZG93Lm9wZXJhIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignIE9QUi8nKSA+PSAwKSksXG4gIGllOiBmYWxzZSB8fCAhIWRvY3VtZW50LmRvY3VtZW50TW9kZSxcbiAgaWUxMTogL21zaWUgMTEvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllMTA6IC9tc2llIDEwL2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTk6IC9tc2llIDkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllODogL21zaWUgOC9pLnRlc3QodXNlckFnZW50KSxcblxuICBtb2JpbGU6IC8oaXBob25lfGlwb2R8KCg/OmFuZHJvaWQpPy4qP21vYmlsZSl8YmxhY2tiZXJyeXxub2tpYSkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHRhYmxldDogLyhpcGFkfGFuZHJvaWQoPyEuKm1vYmlsZSl8dGFibGV0KS9pLnRlc3QodXNlckFnZW50KSxcbiAga2luZGxlOiAvXFxXKGtpbmRsZXxzaWxrKVxcVy9pLnRlc3QodXNlckFnZW50KSxcbiAgdHY6IC9nb29nbGV0dnxzb255ZHR2L2kudGVzdCh1c2VyQWdlbnQpXG59O1xuXG4vLyBUT0RPOiBCcm93c2VyIFZlcnNpb24gYW5kIE9TIFZlcnNpb24gZGV0ZWN0aW9uXG5cbi8vIFRPRE86IGFkZCBmYWxsYmFja1xudmFyIG9yaWVudGF0aW9uID0gTWF0aC5hYnMod2luZG93Lm9yaWVudGF0aW9uICUgMTgwKSA9PT0gMCA/ICdwb3J0cmFpdCcgOiAnbGFuZHNjYXBlJztcbnZhciB2aWV3cG9ydCA9IHdpbmRvdy5pbm5lcldpZHRoICsgJ3gnICsgd2luZG93LmlubmVySGVpZ2h0O1xuXG5leHBvcnQgdmFyIGVudmlyb25tZW50ID0ge1xuXG4gIG9zVmVyc2lvbjogMSxcblxuICBicm93c2VyOiAnY2MnLFxuICBicm93c2VyVmVyc2lvbjogMSxcblxufTtcblxuZW52aXJvbm1lbnQucGFyYW1ldGVycyA9IHBhcmFtZXRlcnM7IC8vIFRPRE8gc3RyaXAgJ3NlY3JldCBwYXJhbXMnXG5lbnZpcm9ubWVudC5oYXNoID0gbG9jYXRpb24uaGFzaC5zdWJzdHIoMSk7XG5cbi8vIFdBVENIIE9VVCB0aGUgT1MgaXMgc2V0IGJ5IHBhcmFtZXRlciAodW5mb3J0dW5hdGVseSlcbmVudmlyb25tZW50Lm9zID0gcGFyYW1ldGVycy5vcyB8fCAnbm9PUyc7IC8vIFRPRE86IHJlZmFjdG9yIE9TXG5pZiAoaXMubW9iaWxlICYmIFsnYW5kcm9pZCcsICdpb3MnLCAnd3AnXS5pbmRleE9mKHBhcmFtZXRlcnMub3MpICE9PSAtMSkge1xuICBwYXJhbWV0ZXJzLm9zID0gdHlwZXMuY2hheW5zT1MuYXBwO1xufVxuXG4vLyBkZXRlY3Rpb24gYnkgdXNlciBhZ2VudFxuZW52aXJvbm1lbnQuaXNJT1MgPSBpcy5pb3M7XG5lbnZpcm9ubWVudC5pc0FuZHJvaWQgPSBpcy5hbmRyb2lkO1xuZW52aXJvbm1lbnQuaXNXUCA9IGlzLndwO1xuZW52aXJvbm1lbnQuaXNCQiA9IGlzLmJiO1xuXG4vLyBUT0RPOiBtYWtlIHN1cmUgdGhhdCB0aGlzIGFsd2F5cyB3b3JrcyEgKFRTUE4sIGNyZWF0ZSBpZnJhbWUgdGVzdCBwYWdlKVxuZW52aXJvbm1lbnQuaXNJbkZyYW1lID0gKHdpbmRvdyAhPT0gd2luZG93LnRvcCk7XG5cbmVudmlyb25tZW50LmlzQXBwID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLmFwcCAmJiBpcy5tb2JpbGUgJiYgIWVudmlyb25tZW50LmlzSW5GcmFtZSk7IC8vIFRPRE86IGRvZXMgdGhpcyBhbHdheXMgd29yaz9cbmVudmlyb25tZW50LmFwcFZlcnNpb24gPSBwYXJhbWV0ZXJzLmFwcHZlcnNpb247XG5cbmVudmlyb25tZW50LmlzQnJvd3NlciA9ICFlbnZpcm9ubWVudC5pc0FwcDtcblxuZW52aXJvbm1lbnQuaXNEZXNrdG9wID0gKCFpcy5tb2JpbGUgJiYgIWlzLnRhYmxldCk7XG5cbmVudmlyb25tZW50LmlzTW9iaWxlID0gaXMubW9iaWxlO1xuZW52aXJvbm1lbnQuaXNUYWJsZXQgPSBpcy50YWJsZXQ7XG5cbmVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYk1vYmlsZSkgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYikgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWIgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3AgfHwgZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGU7XG5cbi8vIGludGVybmFsIFRPRE86IG1ha2UgaXQgcHJpdmF0ZT9cbmVudmlyb25tZW50LmNhbkNoYXluc0NhbGwgPSBlbnZpcm9ubWVudC5pc0FwcDtcbmVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYjtcblxuZW52aXJvbm1lbnQudmlld3BvcnQgPSB2aWV3cG9ydDsgLy8gVE9ETzogdXBkYXRlIG9uIHJlc2l6ZT8gbm8sIGR1ZSBwZXJmb3JtYW5jZVxuZW52aXJvbm1lbnQub3JpZW50YXRpb24gPSBvcmllbnRhdGlvbjtcbmVudmlyb25tZW50LnJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG5cbi8vZW52aXJvbm1lbnQudXNlciA9IHtcbi8vICBuYW1lOiAnUGFjYWwgV2VpbGFuZCcsXG4vLyAgZmlyc3ROYW1lOiAnUGFzY2FsJyxcbi8vICBsYXN0TmFtZTogJ1dlaWxhbmQnLFxuLy8gIHVzZXJJZDogMTIzNCxcbi8vICBmYWNlYm9va0lkOiAxMjM0NSxcbi8vICBpc0FkbWluOiB0cnVlLFxuLy8gIHVhY0dyb3VwczogW10sXG4vLyAgbGFuZ3VhZ2U6ICdkZV9ERScsXG4vLyAgdG9rZW46ICd0b2tlbicgLy8gVE9ETyBpbmNsdWRlIHRva2VuIGhlcmU/XG4vL307XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEVudihrZXksIHZhbHVlKSB7XG4gIC8vZXh0ZW5kKGVudmlyb25tZW50LCBwcm9wKTtcbiAgZW52aXJvbm1lbnRba2V5XSA9IHZhbHVlO1xufVxuXG4iLCIvKipcbiAqIFRhcHAgQVBJIEludGVyZmFjZVxuICogQVBJIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIFRhcHBBUElcbiAqL1xuLyogZ2xvYWJsIGZldGNoICovXG5cbmltcG9ydCB7Z2V0TG9nZ2VyLCBpc1ByZXNlbnQsIGlzT2JqZWN0LCBpc0FycmF5LCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7ZW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHt1c2VyfSBmcm9tICcuL3VzZXInO1xuLy9pbXBvcnQge3dpbmRvd30gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7IC8vIGR1ZSB0byB3aW5kb3cub3BlbiBhbmQgbG9jYXRpb24uaHJlZlxuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCd0YXBwX2FwaScpO1xuXG5jb25zb2xlLmRlYnVnKGVudmlyb25tZW50LCAnZXZuJyk7XG5cbi8vIFRPRE86IGZvcmNlIFNTTD9cbmxldCB0YXBwQXBpUm9vdCA9ICcvL2NoYXluczEudG9iaXQuY29tL1RhcHBBcGkvJztcbmxldCByZXN1bHRUeXBlID0ge1xuICBlcnJvcjogLTEsXG4gIHN1Y2Nlc3M6IDBcbn07XG5cbmZ1bmN0aW9uIHBhcnNlVXNlcih1c2VyKSB7XG4gIHJldHVybiB7XG4gICAgdXNlcklkOiB1c2VyLlVzZXJJRCxcbiAgICBmYWNlYm9va0lkOiB1c2VyLklEIHx8IHVzZXIuRmFjZWJvb2tJRCxcbiAgICBuYW1lOiB1c2VyLk5hbWUgfHwgdXNlci5Vc2VyRnVsbE5hbWUsXG4gICAgZmlyc3ROYW1lOiB1c2VyLkZpcnN0TmFtZSxcbiAgICBsYXN0TmFtZTogdXNlci5MYXN0bmFtZSxcbiAgICBwaWN0dXJlOiAnaHR0cHM6Ly9ncmFwaC5mYWNlYm9vay5jb20vJyArIHVzZXIuSUQgKyAnL3BpY3R1cmUnLFxuICAgIGNoYXluc0xvZ2luOiB1c2VyLkNoYXluc0xvZ2luXG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlR3JvdXAoZ3JvdXApIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogZ3JvdXAuSUQsXG4gICAgbmFtZTogZ3JvdXAuTmFtZSxcbiAgICBzaG93TmFtZTogZ3JvdXAuU2hvd05hbWVcbiAgfTtcbn1cblxubGV0IHVhY0dyb3Vwc0NhY2hlO1xuXG4vKipcbiAqIEBtb2R1bGUgVGFwcEFQSUludGVyZmFjZVxuICogQHR5cGUge09iamVjdH1cbiAqL1xuZXhwb3J0IHZhciB0YXBwQXBpSW50ZXJmYWNlID0ge1xuICBnZXRJbnRyb1RleHQ6IGZ1bmN0aW9uIGdldEludHJvVGV4dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2RlcHJlY2F0ZWQnKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IEluZm9cbiAgICogVXNlciBCYXNpYyBJbmZvcm1hdGlvblxuICAgKlxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgZ2V0VXNlcjogZnVuY3Rpb24gZ2V0VXNlckJhc2ljSW5mbyhvYmopIHtcbiAgICBpZiAoIW9iaiB8fCAhaXNPYmplY3Qob2JqKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignVGhlcmUgd2FzIG5vIHBhcmFtZXRlciBPYmplY3QnKSk7XG4gICAgfVxuICAgIGxldCBkYXRhID0gJyc7XG4gICAgaWYgKGlzUHJlc2VudChvYmoudXNlcklkKSkge1xuICAgICAgZGF0YSA9ICdVc2VySUQ9JyArIG9iai51c2VySWQ7XG4gICAgfVxuICAgIGlmIChpc1ByZXNlbnQob2JqLmZhY2Vib29rSWQpKSB7XG4gICAgICBkYXRhID0gJ0ZCSUQ9JyArIG9iai5mYWNlYm9va0lkO1xuICAgIH1cbiAgICBpZiAoaXNQcmVzZW50KG9iai5wZXJzb25JZCkpIHtcbiAgICAgIGRhdGEgPSAnUGVyc29uSUQ9JyArIG9iai5wZXJzb25JZDtcbiAgICB9XG4gICAgaWYgKGlzUHJlc2VudChvYmouYWNjZXNzVG9rZW4pKSB7XG4gICAgICBkYXRhID0gJ0FjY2Vzc1Rva2VuPScgKyBvYmouYWNjZXNzVG9rZW47XG4gICAgfVxuICAgIHJldHVybiB0YXBwQXBpKCdVc2VyL0Jhc2ljSW5mbz8nICsgZGF0YSkudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICBpZiAoaXNBcnJheShqc29uKSkge1xuICAgICAgICByZXR1cm4ganNvbi5tYXAoKHVzZXIpID0+IHBhcnNlVXNlcih1c2VyKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ganNvbjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGFsbCB1c2VycyBvZiBhIExvY2F0aW9uIGlkZW50aWZpZWQgYnkgc2l0ZUlkXG4gICAqXG4gICAqXG4gICAqIEBwYXJhbSBbc2l0ZUlkID0gY3VycmVudCBzaXRlSWRdIFNpdGUgSWRcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBnZXRMb2NhdGlvblVzZXJzOiBmdW5jdGlvbiBnZXRMb2NhdGlvblVzZXJzKHNpdGVJZCkge1xuICAgIGlmICghc2l0ZUlkKSB7XG4gICAgICBzaXRlSWQgPSBlbnZpcm9ubWVudC5zaXRlLnNpdGVJZDtcbiAgICB9XG4gICAgbGV0IGRhdGEgPSAnP1NpdGVJRD0nICsgc2l0ZUlkO1xuICAgIHJldHVybiB0YXBwQXBpKCdVc2VyL0dldEFsbExvY2F0aW9uVXNlcnMnICsgZGF0YSkudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICByZXR1cm4ganNvbi5tYXAoKHVzZXIpID0+IHBhcnNlVXNlcih1c2VyKSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBVQUMgR3JvdXBzXG4gICAqXG4gICAqIFRPRE86IHJlbW92ZSBjYWNoaW5nPyB5ZXMsIGl0IGRvZXMgbm90IHJlYWxseSBiZWxvbmcgaW4gaGVyZVxuICAgKiBUT0RPOiBCYWNrZW5kIGJ1ZyBodHRwOi8vY2hheW5zMS50b2JpdC5jb20vVGFwcEFwaS9UYXBwL0dldFVBQ0dyb3Vwcz9TaXRlSUQ9IG5vdCBlbXB0eVxuICAgKiBUT0RPOiByZW5hbWUgdG8gZ2V0R3JvdXBzPyAodXNpbmcgVUFDIG9ubHkgaW50ZXJuYWxseSwgdGhlcmUgYXJlIG5vIG90aGVyIGdyb3VwcyBlaXRoZXIpXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3VwZGF0ZUNhY2hlPXVuZGVmaW5lZF0gVHJ1ZSB0byBmb3JjZSB0byByZWNlaXZlIG5ldyBVQUMgR3JvdXBzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSByZXNvbHZlIHdpdGggIFVBQyBHcm91cHMgQXJyYXkgb3RoZXJ3aXNlIHJlamVjdCB3aXRoIEVycm9yXG4gICAqL1xuICBnZXRVYWNHcm91cHM6IGZ1bmN0aW9uIGdldFVhY0dyb3VwcyhzaXRlSWQsIHVwZGF0ZUNhY2hlKSB7XG4gICAgaWYgKHVhY0dyb3Vwc0NhY2hlICYmICF1cGRhdGVDYWNoZSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh1YWNHcm91cHNDYWNoZSk7XG4gICAgfVxuICAgIHNpdGVJZCA9IHNpdGVJZCB8fCBlbnZpcm9ubWVudC5zaXRlLnNpdGVJZDtcbiAgICBsZXQgZGF0YSA9ICdTaXRlSUQ9JyArIHNpdGVJZDtcbiAgICByZXR1cm4gdGFwcEFwaSgnVGFwcC9HZXRVQUNHcm91cHM/JyArIGRhdGEpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgcmV0dXJuIGpzb24ubWFwKChncm91cCkgPT4gcGFyc2VHcm91cChncm91cCkpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUT0RPOiB1c2UgdXNlcklkIGluc3RlYWQgb2YgdGhlIGZhY2Vib29rSWQ/XG4gICAqIFRPRE86IHJlZmFjdG9yIG5hbWU/IGNhdXNlIExvY2F0aW9uIGFuZCBTaXRlSWRcbiAgICogQHBhcmFtIHVzZXJJZCBGYWNlYm9vayBVc2VySWRcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBpc1VzZXJBZG1pbk9mTG9jYXRpb246IGZ1bmN0aW9uIGlzVXNlckFkbWluT2ZMb2NhdGlvbih1c2VySWQpIHtcbiAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KEVycm9yKCdObyB1c2VySWQgd2FzIHN1cHBsaWVkLicpKTtcbiAgICB9XG4gICAgbGV0IGRhdGEgPSAnP1NpdGVJRD0nICsgZW52aXJvbm1lbnQuc2l0ZS5zaXRlSWQgKyAnJkZCSUQ9JyArIHVzZXJJZDtcbiAgICByZXR1cm4gdGFwcEFwaSgnVXNlci9Jc1VzZXJBZG1pbicgKyBkYXRhKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIHJldHVybiBqc29uO1xuICAgIH0pO1xuICB9LFxuXG4gIGludGVyY29tOiB7XG5cbiAgICAvKipcbiAgICAgKiBTZW5kIG1lc3NhZ2UgYXMgdXNlciB0byB0aGUgZW50aXJlIHBhZ2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHNlbmRNZXNzYWdlQXNVc2VyOiBmdW5jdGlvbiBzZW5kTWVzc2FnZUFzVXNlcihtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gc2VuZE1lc3NhZ2Uoe1xuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICB1cmw6ICdJbnRlckNvbS9QYWdlJ1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgTWVzc2FnZSBhcyBwYWdlIHRvIGEgdXNlciBpZGVudGlmaWVkIGJ5IFRvYml0IFVzZXJJZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogQHBhcmFtIHVzZXJJZFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHNlbmRNZXNzYWdlVG9Vc2VyOiBmdW5jdGlvbiBzZW5kTWVzc2FnZVRvVXNlcih1c2VySWQsIG1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBzZW5kTWVzc2FnZSh7XG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgIHVzZXJJZDogdXNlcklkLFxuICAgICAgICB1cmw6ICdJbnRlckNvbS9Vc2VyJ1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgbWVzc2FnZSBhcyBwYWdlIHRvIGEgdXNlciBpZGVudGlmaWVkIGJ5IEZhY2Vib29rIFVzZXJJZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogQHBhcmFtIGZhY2Vib29rSWRcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBzZW5kTWVzc2FnZVRvRmFjZWJvb2tVc2VyOiBmdW5jdGlvbiBzZW5kTWVzc2FnZVRvRmFjZWJvb2tVc2VyKGZhY2Vib29rSWQsIG1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBzZW5kTWVzc2FnZSh7XG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgIGZhY2Vib29rSWQ6IGZhY2Vib29rSWQsXG4gICAgICAgIHVybDogJ1RhcHAvU2VuZEludGVyY29tTWVzc2FnZUFzUGFnZSdcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIG1lc3NhZ2UgYXMgcGFnZSB0byBhIFVBQyBHcm91cC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBncm91cElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBzZW5kTWVzc2FnZVRvR3JvdXA6IGZ1bmN0aW9uIHNlbmRNZXNzYWdlVG9Hcm91cChncm91cElkLCBtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gc2VuZE1lc3NhZ2Uoe1xuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICBncm91cElkOiBncm91cElkLFxuICAgICAgICB1cmw6ICdJbnRlckNvbS9ncm91cCdcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBTZW5kIEludGVyY29tIE1lc3NhZ2VcbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbi8vIFRPRE86IHJlZmFjdG9yIHRvIEpTT04gaW5zdGVhZCBvZiB3d3ctZm9ybS11cmxlbmNvZGVkXG5mdW5jdGlvbiBzZW5kTWVzc2FnZShvYmopIHtcbiAgaWYgKCFpc09iamVjdChvYmopIHx8ICFvYmoubWVzc2FnZSB8fCAhb2JqLnVybCkge1xuICAgIFByb21pc2UucmVqZWN0KEVycm9yKCdJbnZhbGlkIHBhcmFtZXRlcnMnKSk7XG4gIH1cbiAgb2JqLnNpdGVJZCA9IG9iai5zaXRlSWQgfHwgZW52aXJvbm1lbnQuc2l0ZS5zaXRlSWQ7XG4gIG9iai5hY2Nlc3NUb2tlbiA9IG9iai5hY2Nlc3NUb2tlbiB8fCB1c2VyLmFjY2Vzc1Rva2VuO1xuICBsZXQgbWFwID0ge1xuICAgIG1lc3NhZ2U6ICdNZXNzYWdlJyxcbiAgICBhY2Nlc3NUb2tlbjogJ0FjY2Vzc1Rva2VuJyxcbiAgICB1c2VySWQ6ICdVc2VySWQnLFxuICAgIGZhY2Vib29rSWQ6ICdUb0ZCSUQnLFxuICAgIGdyb3VwSWQ6ICdHcm91cElEJyxcbiAgICBzaXRlSWQ6ICdTaXRlSUQnXG4gIH07XG4gIGxldCBkYXRhID0gW107XG4gIE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoaXNEZWZpbmVkKG9ialtrZXldKSAmJiBrZXkgIT09ICd1cmwnKSB7XG4gICAgICBkYXRhLnB1c2gobWFwW2tleV0gKyAnPScgKyAgb2JqW2tleV0pO1xuICAgIH1cbiAgfSk7XG4gIGxldCBjb25maWcgPSB7XG4gICAgbWV0aG9kOiAncG9zdCcsXG4gICAgaGVhZGVyczoge1xuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQ7IGNoYXJzZXQ9VVRGLTgnXG4gICAgfSxcbiAgICAvL2hlYWRlcnM6IHtcbiAgICAvLyAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAvLyAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIC8vfSxcbiAgICAvL2NyZWRlbnRpYWxzOiAnY29ycycsXG4gICAgYm9keTogZGF0YS5qb2luKCcmJylcbiAgICAvL2JvZHk6IGRhdGFcbiAgfTtcbiAgbGV0IHVybCA9IHRhcHBBcGlSb290ICsgb2JqLnVybDtcbiAgaWYgKG9iai51cmwgPT09ICdUYXBwL1NlbmRJbnRlcmNvbU1lc3NhZ2VBc1BhZ2UnKSB7XG4gICAgdXJsICs9ICc/JyArIGRhdGEuam9pbignJicpO1xuICAgIGNvbmZpZyA9IHVuZGVmaW5lZDsgLyp7XG4gICAgICBjcmVkZW50aWFsczogJ2NvcnMnXG4gICAgfTsqL1xuICB9XG4gIHJldHVybiBmZXRjaCh1cmwsIGNvbmZpZyk7XG59XG5cbi8qKlxuICogVGFwcCBBUEkgcmVxdWVzdFxuICpcbiAqIFRPRE86IHVzZSBQT1NUIGluc3RlYWQgb2YgR0VUXG4gKiBUT0RPOiBwb3N0aW5nIEpTT04gd2l0aCB7Y3JlZGVudGlhbHM6ICdjb3JzJ31cbiAqIEBwYXJhbSBlbmRwb2ludFxuICogQHJldHVybnMge1Byb21pc2V9IHdpdGgganNvbiBkYXRhXG4gKi9cbmZ1bmN0aW9uIHRhcHBBcGkoZW5kcG9pbnQpIHtcbiAgbGV0IHVybCA9IHRhcHBBcGlSb290ICsgZW5kcG9pbnQ7XG4gIHJldHVybiBmZXRjaCh1cmwpXG4gICAgLnRoZW4oKHJlcykgPT4gcmVzLmpzb24oKSlcbiAgICAudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICBpZiAoanNvbi5WYWx1ZSkge1xuICAgICAgICByZXR1cm4ganNvbi5WYWx1ZTtcbiAgICAgIH0gZWxzZSBpZiAoanNvbi5EYXRhKSB7XG4gICAgICAgIHJldHVybiBqc29uLkRhdGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ganNvbjtcbiAgICAgIH1cbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iai5FcnJvcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKG9iai5FcnJvcikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9KTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYlhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWlJc0ltWnBiR1VpT2lJdlZYTmxjbk12Y0hjdlVISnZhbVZqZEhNdmRHOWlhWFF2WTJoaGVXNXpMMk5vWVhsdWN5NXFjeTl6Y21NdlkyaGhlVzV6TDNWelpYSXVhbk1pTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2VzExOSIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvL1xuICAvL2lmIChzZWxmLmZldGNoKSB7XG4gIC8vICByZXR1cm5cbiAgLy99XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTmFtZShuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgbmFtZSA9IG5hbWUudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihuYW1lLCB2YWx1ZXMpIHtcbiAgICAgICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBzZWxmLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICBzZWxmLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgbGlzdCA9IHRoaXMubWFwW25hbWVdXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICBsaXN0ID0gW11cbiAgICAgIHRoaXMubWFwW25hbWVdID0gbGlzdFxuICAgIH1cbiAgICBsaXN0LnB1c2godmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gICAgcmV0dXJuIHZhbHVlcyA/IHZhbHVlc1swXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gfHwgW11cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBbbm9ybWFsaXplVmFsdWUodmFsdWUpXVxuICB9XG5cbiAgLy8gSW5zdGVhZCBvZiBpdGVyYWJsZSBmb3Igbm93LlxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0aGlzLm1hcCkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICBjYWxsYmFjayhuYW1lLCBzZWxmLm1hcFtuYW1lXSlcbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgdmFyIHN1cHBvcnQgPSB7XG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKTtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KSgpLFxuICAgIGZvcm1EYXRhOiAnRm9ybURhdGEnIGluIHNlbGZcbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoIWJvZHkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgfVxuXG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICByZXR1cm4gcmVqZWN0ZWQgPyByZWplY3RlZCA6IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdCh1cmwsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHRoaXMudXJsID0gdXJsXG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCAnb21pdCdcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy5tZXRob2QgPSBub3JtYWxpemVNZXRob2Qob3B0aW9ucy5tZXRob2QgfHwgJ0dFVCcpXG4gICAgdGhpcy5tb2RlID0gb3B0aW9ucy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgb3B0aW9ucy5ib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KG9wdGlvbnMuYm9keSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gaGVhZGVycyh4aHIpIHtcbiAgICB2YXIgaGVhZCA9IG5ldyBIZWFkZXJzKClcbiAgICB2YXIgcGFpcnMgPSB4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkudHJpbSgpLnNwbGl0KCdcXG4nKVxuICAgIHBhaXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICB2YXIgc3BsaXQgPSBoZWFkZXIudHJpbSgpLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBzcGxpdC5zaGlmdCgpLnRyaW0oKVxuICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignOicpLnRyaW0oKVxuICAgICAgaGVhZC5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICB9KVxuICAgIHJldHVybiBoZWFkXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5mZXRjaCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBpZiAoc2VsZi5jcmVkZW50aWFscyA9PT0gJ2NvcnMnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiByZXNwb25zZVVSTCgpIHtcbiAgICAgICAgaWYgKCdyZXNwb25zZVVSTCcgaW4geGhyKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5yZXNwb25zZVVSTFxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXZvaWQgc2VjdXJpdHkgd2FybmluZ3Mgb24gZ2V0UmVzcG9uc2VIZWFkZXIgd2hlbiBub3QgYWxsb3dlZCBieSBDT1JTXG4gICAgICAgIGlmICgvXlgtUmVxdWVzdC1VUkw6L20udGVzdCh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5nZXRSZXNwb25zZUhlYWRlcignWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHN0YXR1cyA9ICh4aHIuc3RhdHVzID09PSAxMjIzKSA/IDIwNCA6IHhoci5zdGF0dXNcbiAgICAgICAgaWYgKHN0YXR1cyA8IDEwMCB8fCBzdGF0dXMgPiA1OTkpIHtcbiAgICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcnMoeGhyKSxcbiAgICAgICAgICB1cmw6IHJlc3BvbnNlVVJMKClcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHNlbGYubWV0aG9kLCBzZWxmLnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICBzZWxmLmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihuYW1lLCB2YWx1ZXMpIHtcbiAgICAgICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiBzZWxmLl9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogc2VsZi5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy51cmwgPSBudWxsXG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSBvcHRpb25zLnN0YXR1c1RleHRcbiAgICB0aGlzLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnNcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnM7XG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3Q7XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZTtcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh1cmwsIG9wdGlvbnMpLmZldGNoKClcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkoKTtcbiIsIi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9qYWtlYXJjaGliYWxkL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIDIuMC4wXG4gKi9cblxuKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihhLGIpe25bbF09YTtuW2wrMV09YjtsKz0yOzI9PT1sJiZBKCl9ZnVuY3Rpb24gcyhhKXtyZXR1cm5cImZ1bmN0aW9uXCI9PT10eXBlb2YgYX1mdW5jdGlvbiBGKCl7cmV0dXJuIGZ1bmN0aW9uKCl7cHJvY2Vzcy5uZXh0VGljayh0KX19ZnVuY3Rpb24gRygpe3ZhciBhPTAsYj1uZXcgQih0KSxjPWRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiXCIpO2Iub2JzZXJ2ZShjLHtjaGFyYWN0ZXJEYXRhOiEwfSk7cmV0dXJuIGZ1bmN0aW9uKCl7Yy5kYXRhPWE9KythJTJ9fWZ1bmN0aW9uIEgoKXt2YXIgYT1uZXcgTWVzc2FnZUNoYW5uZWw7YS5wb3J0MS5vbm1lc3NhZ2U9dDtyZXR1cm4gZnVuY3Rpb24oKXthLnBvcnQyLnBvc3RNZXNzYWdlKDApfX1mdW5jdGlvbiBJKCl7cmV0dXJuIGZ1bmN0aW9uKCl7c2V0VGltZW91dCh0LDEpfX1mdW5jdGlvbiB0KCl7Zm9yKHZhciBhPTA7YTxsO2ErPTIpKDAsblthXSkoblthKzFdKSxuW2FdPXZvaWQgMCxuW2ErMV09dm9pZCAwO1xubD0wfWZ1bmN0aW9uIHAoKXt9ZnVuY3Rpb24gSihhLGIsYyxkKXt0cnl7YS5jYWxsKGIsYyxkKX1jYXRjaChlKXtyZXR1cm4gZX19ZnVuY3Rpb24gSyhhLGIsYyl7cihmdW5jdGlvbihhKXt2YXIgZT0hMSxmPUooYyxiLGZ1bmN0aW9uKGMpe2V8fChlPSEwLGIhPT1jP3EoYSxjKTptKGEsYykpfSxmdW5jdGlvbihiKXtlfHwoZT0hMCxnKGEsYikpfSk7IWUmJmYmJihlPSEwLGcoYSxmKSl9LGEpfWZ1bmN0aW9uIEwoYSxiKXsxPT09Yi5hP20oYSxiLmIpOjI9PT1hLmE/ZyhhLGIuYik6dShiLHZvaWQgMCxmdW5jdGlvbihiKXtxKGEsYil9LGZ1bmN0aW9uKGIpe2coYSxiKX0pfWZ1bmN0aW9uIHEoYSxiKXtpZihhPT09YilnKGEsbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIikpO2Vsc2UgaWYoXCJmdW5jdGlvblwiPT09dHlwZW9mIGJ8fFwib2JqZWN0XCI9PT10eXBlb2YgYiYmbnVsbCE9PWIpaWYoYi5jb25zdHJ1Y3Rvcj09PWEuY29uc3RydWN0b3IpTChhLFxuYik7ZWxzZXt2YXIgYzt0cnl7Yz1iLnRoZW59Y2F0Y2goZCl7di5lcnJvcj1kLGM9dn1jPT09dj9nKGEsdi5lcnJvcik6dm9pZCAwPT09Yz9tKGEsYik6cyhjKT9LKGEsYixjKTptKGEsYil9ZWxzZSBtKGEsYil9ZnVuY3Rpb24gTShhKXthLmYmJmEuZihhLmIpO3goYSl9ZnVuY3Rpb24gbShhLGIpe3ZvaWQgMD09PWEuYSYmKGEuYj1iLGEuYT0xLDAhPT1hLmUubGVuZ3RoJiZyKHgsYSkpfWZ1bmN0aW9uIGcoYSxiKXt2b2lkIDA9PT1hLmEmJihhLmE9MixhLmI9YixyKE0sYSkpfWZ1bmN0aW9uIHUoYSxiLGMsZCl7dmFyIGU9YS5lLGY9ZS5sZW5ndGg7YS5mPW51bGw7ZVtmXT1iO2VbZisxXT1jO2VbZisyXT1kOzA9PT1mJiZhLmEmJnIoeCxhKX1mdW5jdGlvbiB4KGEpe3ZhciBiPWEuZSxjPWEuYTtpZigwIT09Yi5sZW5ndGgpe2Zvcih2YXIgZCxlLGY9YS5iLGc9MDtnPGIubGVuZ3RoO2crPTMpZD1iW2ddLGU9YltnK2NdLGQ/QyhjLGQsZSxmKTplKGYpO2EuZS5sZW5ndGg9MH19ZnVuY3Rpb24gRCgpe3RoaXMuZXJyb3I9XG5udWxsfWZ1bmN0aW9uIEMoYSxiLGMsZCl7dmFyIGU9cyhjKSxmLGssaCxsO2lmKGUpe3RyeXtmPWMoZCl9Y2F0Y2gobil7eS5lcnJvcj1uLGY9eX1mPT09eT8obD0hMCxrPWYuZXJyb3IsZj1udWxsKTpoPSEwO2lmKGI9PT1mKXtnKGIsbmV3IFR5cGVFcnJvcihcIkEgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS5cIikpO3JldHVybn19ZWxzZSBmPWQsaD0hMDt2b2lkIDA9PT1iLmEmJihlJiZoP3EoYixmKTpsP2coYixrKToxPT09YT9tKGIsZik6Mj09PWEmJmcoYixmKSl9ZnVuY3Rpb24gTihhLGIpe3RyeXtiKGZ1bmN0aW9uKGIpe3EoYSxiKX0sZnVuY3Rpb24oYil7ZyhhLGIpfSl9Y2F0Y2goYyl7ZyhhLGMpfX1mdW5jdGlvbiBrKGEsYixjLGQpe3RoaXMubj1hO3RoaXMuYz1uZXcgYShwLGQpO3RoaXMuaT1jO3RoaXMubyhiKT8odGhpcy5tPWIsdGhpcy5kPXRoaXMubGVuZ3RoPWIubGVuZ3RoLHRoaXMubCgpLDA9PT10aGlzLmxlbmd0aD9tKHRoaXMuYyxcbnRoaXMuYik6KHRoaXMubGVuZ3RoPXRoaXMubGVuZ3RofHwwLHRoaXMuaygpLDA9PT10aGlzLmQmJm0odGhpcy5jLHRoaXMuYikpKTpnKHRoaXMuYyx0aGlzLnAoKSl9ZnVuY3Rpb24gaChhKXtPKys7dGhpcy5iPXRoaXMuYT12b2lkIDA7dGhpcy5lPVtdO2lmKHAhPT1hKXtpZighcyhhKSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvclwiKTtpZighKHRoaXMgaW5zdGFuY2VvZiBoKSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO04odGhpcyxhKX19dmFyIEU9QXJyYXkuaXNBcnJheT9BcnJheS5pc0FycmF5OmZ1bmN0aW9uKGEpe3JldHVyblwiW29iamVjdCBBcnJheV1cIj09PVxuT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGEpfSxsPTAsdz1cInVuZGVmaW5lZFwiIT09dHlwZW9mIHdpbmRvdz93aW5kb3c6e30sQj13Lk11dGF0aW9uT2JzZXJ2ZXJ8fHcuV2ViS2l0TXV0YXRpb25PYnNlcnZlcix3PVwidW5kZWZpbmVkXCIhPT10eXBlb2YgVWludDhDbGFtcGVkQXJyYXkmJlwidW5kZWZpbmVkXCIhPT10eXBlb2YgaW1wb3J0U2NyaXB0cyYmXCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBNZXNzYWdlQ2hhbm5lbCxuPUFycmF5KDFFMyksQTtBPVwidW5kZWZpbmVkXCIhPT10eXBlb2YgcHJvY2VzcyYmXCJbb2JqZWN0IHByb2Nlc3NdXCI9PT17fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpP0YoKTpCP0coKTp3P0goKTpJKCk7dmFyIHY9bmV3IEQseT1uZXcgRDtrLnByb3RvdHlwZS5vPWZ1bmN0aW9uKGEpe3JldHVybiBFKGEpfTtrLnByb3RvdHlwZS5wPWZ1bmN0aW9uKCl7cmV0dXJuIEVycm9yKFwiQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5XCIpfTtrLnByb3RvdHlwZS5sPVxuZnVuY3Rpb24oKXt0aGlzLmI9QXJyYXkodGhpcy5sZW5ndGgpfTtrLnByb3RvdHlwZS5rPWZ1bmN0aW9uKCl7Zm9yKHZhciBhPXRoaXMubGVuZ3RoLGI9dGhpcy5jLGM9dGhpcy5tLGQ9MDt2b2lkIDA9PT1iLmEmJmQ8YTtkKyspdGhpcy5qKGNbZF0sZCl9O2sucHJvdG90eXBlLmo9ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLm47XCJvYmplY3RcIj09PXR5cGVvZiBhJiZudWxsIT09YT9hLmNvbnN0cnVjdG9yPT09YyYmdm9pZCAwIT09YS5hPyhhLmY9bnVsbCx0aGlzLmcoYS5hLGIsYS5iKSk6dGhpcy5xKGMucmVzb2x2ZShhKSxiKToodGhpcy5kLS0sdGhpcy5iW2JdPXRoaXMuaChhKSl9O2sucHJvdG90eXBlLmc9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuYzt2b2lkIDA9PT1kLmEmJih0aGlzLmQtLSx0aGlzLmkmJjI9PT1hP2coZCxjKTp0aGlzLmJbYl09dGhpcy5oKGMpKTswPT09dGhpcy5kJiZtKGQsdGhpcy5iKX07ay5wcm90b3R5cGUuaD1mdW5jdGlvbihhKXtyZXR1cm4gYX07XG5rLnByb3RvdHlwZS5xPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpczt1KGEsdm9pZCAwLGZ1bmN0aW9uKGEpe2MuZygxLGIsYSl9LGZ1bmN0aW9uKGEpe2MuZygyLGIsYSl9KX07dmFyIE89MDtoLmFsbD1mdW5jdGlvbihhLGIpe3JldHVybihuZXcgayh0aGlzLGEsITAsYikpLmN9O2gucmFjZT1mdW5jdGlvbihhLGIpe2Z1bmN0aW9uIGMoYSl7cShlLGEpfWZ1bmN0aW9uIGQoYSl7ZyhlLGEpfXZhciBlPW5ldyB0aGlzKHAsYik7aWYoIUUoYSkpcmV0dXJuIChnKGUsbmV3IFR5cGVFcnJvcihcIllvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS5cIikpLCBlKTtmb3IodmFyIGY9YS5sZW5ndGgsaD0wO3ZvaWQgMD09PWUuYSYmaDxmO2grKyl1KHRoaXMucmVzb2x2ZShhW2hdKSx2b2lkIDAsYyxkKTtyZXR1cm4gZX07aC5yZXNvbHZlPWZ1bmN0aW9uKGEsYil7aWYoYSYmXCJvYmplY3RcIj09PXR5cGVvZiBhJiZhLmNvbnN0cnVjdG9yPT09dGhpcylyZXR1cm4gYTt2YXIgYz1uZXcgdGhpcyhwLGIpO1xucShjLGEpO3JldHVybiBjfTtoLnJlamVjdD1mdW5jdGlvbihhLGIpe3ZhciBjPW5ldyB0aGlzKHAsYik7ZyhjLGEpO3JldHVybiBjfTtoLnByb3RvdHlwZT17Y29uc3RydWN0b3I6aCx0aGVuOmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5hO2lmKDE9PT1jJiYhYXx8Mj09PWMmJiFiKXJldHVybiB0aGlzO3ZhciBkPW5ldyB0aGlzLmNvbnN0cnVjdG9yKHApLGU9dGhpcy5iO2lmKGMpe3ZhciBmPWFyZ3VtZW50c1tjLTFdO3IoZnVuY3Rpb24oKXtDKGMsZCxmLGUpfSl9ZWxzZSB1KHRoaXMsZCxhLGIpO3JldHVybiBkfSxcImNhdGNoXCI6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMudGhlbihudWxsLGEpfX07dmFyIHo9e1Byb21pc2U6aCxwb2x5ZmlsbDpmdW5jdGlvbigpe3ZhciBhO2E9XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBnbG9iYWw/Z2xvYmFsOlwidW5kZWZpbmVkXCIhPT10eXBlb2Ygd2luZG93JiZ3aW5kb3cuZG9jdW1lbnQ/d2luZG93OnNlbGY7XCJQcm9taXNlXCJpbiBhJiZcInJlc29sdmVcImluXG5hLlByb21pc2UmJlwicmVqZWN0XCJpbiBhLlByb21pc2UmJlwiYWxsXCJpbiBhLlByb21pc2UmJlwicmFjZVwiaW4gYS5Qcm9taXNlJiZmdW5jdGlvbigpe3ZhciBiO25ldyBhLlByb21pc2UoZnVuY3Rpb24oYSl7Yj1hfSk7cmV0dXJuIHMoYil9KCl8fChhLlByb21pc2U9aCl9fTtcImZ1bmN0aW9uXCI9PT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShmdW5jdGlvbigpe3JldHVybiB6fSk6XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPXo6XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiB0aGlzJiYodGhpcy5FUzZQcm9taXNlPXopfSkuY2FsbCh0aGlzKTtcbiIsIi8qKlxuICogQG5hbWUgamFtZXMgb3IgdG9iaVxuICogQG1vZHVsZSBqYW1lc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogIyBqYW1lcyAtIHRvYml0IGhlbHBlciBsaWJyYXJ5XG4gKiBIZWxwZXIgbGlicmFyeSBzdXBwb3J0aW5nIHRoZSBDaGF5bnMgQVBJXG4gKi9cblxuLy8gVE9ETzogbW92ZSBhbGwgdG8gaGVscGVyLmpzIG9yIHRvYmkvamFtc1xuLy8gVE9ETzogaGVscGVyLmpzIHdpdGggRVM2IGFuZCBqYXNtaW5lIChhbmQgb3IgdGFwZSlcbi8vIGluY2x1ZGUgaGVscGVyIGFzIG1haW4gbW9kdWxlXG5cbi8vIGltcG9ydGFudCBpcyogZnVuY3Rpb25zXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lzJztcblxuLy8gZXh0ZW5kIG9iamVjdCBmdW5jdGlvblxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9leHRlbmQnO1xuXG4vLyBMb2dnZXJcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvbG9nZ2VyJztcblxuLy8gVE9ETzogZG8gd2UgZXZlbiBuZWVkIG1vZGVybml6ZXI/XG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbW9kZXJuaXplcic7XG5cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvaHR0cCc7XG5cbi8vIEJyb3dzZXIgQVBJcyAod2luZG93LCBkb2N1bWVudCwgbG9jYXRpb24pXG4vLyBUT0RPOiBjb25zaWRlciB0byBub3QgYmluZCBicm93c2VyIHRvIHRoZSB1dGlscyBgT2JqZWN0YFxuLyoganNoaW50IC1XMTE2ICovXG4vKiBqc2hpbnQgLVcwMzMgKi9cbi8vIGpzY3M6ZGlzYWJsZSBwYXJzZUVycm9yXG5pbXBvcnQgKiBhcyBicm93c2VyIGZyb20gJy4vdXRpbHMvYnJvd3Nlcic7IC8vbm9pbnNwZWN0aW9uIEJhZEV4cHJlc3Npb25TdGF0ZW1lbnRKUyBqc2hpbnQgaWdub3JlOiBsaW5lXG4vLyBqc2NzOmVuYWJsZSBwYXJzZUVycm9yXG4vKiBqc2hpbnQgK1cwMzMgKi9cbi8qIGpzaGludCArVzExNiAqL1xuZXhwb3J0IHticm93c2VyfTtcblxuLy8gRE9NXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2RvbSc7XG5cbi8vIEFuYWx5dGljc1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2FuYWx5dGljcyc7XG5cbi8vIFJlbW90ZVxuLy8gcmVtb3RlIGRlYnVnZ2luZyBhbmQgYW5hbHlzaXNcblxuLy8gZnJvbnQtZW5kIEVycm9yIEhhbmRsZXIgKGNhdGNoZXMgZXJyb3JzLCBpZGVudGlmeSBhbmQgYW5hbHlzZXMgdGhlbSlcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXJyb3InO1xuXG4vLyBhdXRoICYgSldUIGhhbmRsZXJcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9qd3QnO1xuXG4vLyBjb29raWUgaGFuZGxlciAod2lsbCBiZSB1c2VkIGluIHRoZSBsb2NhbF9zdG9yYWdlIGFzIGZhbGxiYWNrKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Nvb2tpZV9oYW5kbGVyJztcblxuLy8gbG9jYWxTdG9yYWdlIGhlbHBlciAod2hpY2ggY29va2llIGZhbGxiYWNrKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xvY2FsX3N0b3JhZ2UnO1xuXG4vLyBtaWNybyBldmVudCBsaWJyYXJ5XG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2V2ZW50cyc7XG5cbi8vIG9mZmxpbmUgY2FjaGUgaGVscGVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvb2ZmbGluZV9jYWNoZSc7XG5cbi8vIG5vdGlmaWNhdGlvbnM6IHRvYXN0cywgYWxlcnRzLCBtb2RhbCBwb3B1cHMsIG5hdGl2ZSBwdXNoXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbm90aWZpY2F0aW9ucyc7XG5cbi8vIGlmcmFtZSBjb21tdW5pY2F0aW9uIGFuZCBoZWxwZXIgKENPUlMpXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvaWZyYW1lJztcblxuLy8gcGFnZSB2aXNpYmlsaXR5IEFQSVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL3BhZ2VfdmlzaWJpbGl0eSc7XG5cbi8vIERhdGVUaW1lIGhlbHBlciAoY29udmVydHMgZGF0ZXMsIEMjIGRhdGUsIHRpbWVzdGFtcHMsIGkxOG4sIHRpbWUgYWdvKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2RhdGV0aW1lJztcblxuXG4vLyBsYW5ndWFnZSBBUEkgaTE4blxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xhbmd1YWdlJztcblxuLy8gY3JpdGljYWwgY3NzXG5cbi8vIGxvYWRDU1NcblxuLy8gbGF6eSBsb2FkaW5nXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbGF6eV9sb2FkaW5nJztcblxuLy8gKGltYWdlKSBwcmVsb2FkZXJcbi8vZXhwb3J0ICogZnJvbSAnL3V0aWxzL3ByZWxvYWRlcic7XG5cbi8vIGlzUGVtaXR0ZWQgQXBwIFZlcnNpb24gY2hlY2tcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvaXNfcGVybWl0dGVkJztcblxuXG4vLyBpbiBGdXR1cmVcbi8vIGltbXV0YWJsZVxuLy8gd2VhayBtYXBzXG4vLyBvYnNlcnZlclxuLy8gd2ViIHNvY2tldHMgKHdzLCBTaWduYWxSKVxuLy8gd29ya2VyIChzaGFyZWQgd29ya2VyLCBsYXRlciBzZXJ2aWNlIHdvcmtlciBhcyB3ZWxsKVxuLy8gbG9jYXRpb24sIHB1c2hTdGF0ZSwgaGlzdG9yeSBoYW5kbGVyXG4vLyBjaGF5bnMgc2l0ZSBhbmQgY29kZSBhbmFseXNlcjogZmluZCBkZXByZWNhdGVkIG1ldGhvZHMsIGJhZCBjb2RlLCBpc3N1ZXMgYW5kIGJvdHRsZW5lY2tzXG5cbiIsIi8qKlxuICogVGhpcyBtb2R1bGUgY29udGFpbnMgdGhlIEJyb3dzZXIgQVBJc1xuICpcbiAqL1xuLy8gVE9ETzogbW92ZSBvdXQgb2YgdXRpbHNcbnZhciB3aW4gPSB3aW5kb3c7XG5cbi8vIHVzaW5nIG5vZGUgZ2xvYmFsIChtYWlubHkgZm9yIHRlc3RpbmcsIGRlcGVuZGVuY3kgbWFuYWdlbWVudClcbnZhciBfZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB3aW5kb3c7XG5leHBvcnQge19nbG9iYWwgYXMgZ2xvYmFsfTtcblxuZXhwb3J0IHt3aW4gYXMgd2luZG93fTtcbmV4cG9ydCB2YXIgZG9jdW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQ7XG5leHBvcnQgdmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuZXhwb3J0IHZhciBuYXZpZ2F0b3IgPSB3aW5kb3cubmF2aWdhdG9yO1xuZXhwb3J0IHZhciBjaGF5bnMgPSB3aW5kb3cuY2hheW5zO1xuZXhwb3J0IHZhciBjaGF5bnNDYWxsYmFja3MgPSB3aW5kb3cuX2NoYXluc0NhbGxiYWNrcztcbmV4cG9ydCB2YXIgY2hheW5zUm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGF5bnMtcm9vdCcpO1xuZXhwb3J0IHZhciBwYXJlbnQgPSB3aW5kb3cucGFyZW50O1xuZXhwb3J0IHZhciBjb25zb2xlID0gd2luZG93LmNvbnNvbGU7IC8vIE5PVEU6IHNob3VsZCBub3QgYmUgdXNlZC4gdXNlIGxvZ2dlciBpbnN0ZWFkXG5leHBvcnQgdmFyIGdjID0gd2luZG93LmdjID8gKCkgPT4gd2luZG93LmdjKCkgOiAoKSA9PiBudWxsO1xuXG4iLCIvLyBpbnNwaXJlZCBieSBBbmd1bGFyMidzIERPTVxuXG5pbXBvcnQge2RvY3VtZW50fSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtpc1VuZGVmaW5lZH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBjbGFzcyBET00ge1xuXG4gIC8vIE5PVEU6IGFsd2F5cyByZXR1cm5zIGFuIGFycmF5XG4gIHN0YXRpYyAkKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwuYmluZChkb2N1bWVudCk7XG4gIH1cblxuICAvLyBzZWxlY3RvcnNcbiAgc3RhdGljIHF1ZXJ5KHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBxdWVyeVNlbGVjdG9yKGVsLCBzZWxlY3Rvcikge1xuICAgIHJldHVybiBlbC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvckFsbChlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIG9uKGVsLCBldnQsIGxpc3RlbmVyKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcihldnQsIGxpc3RlbmVyLCBmYWxzZSk7XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjbG9uZShub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUuY2xvbmVOb2RlKHRydWUpO1xuICB9XG4gIHN0YXRpYyBoYXNQcm9wZXJ0eShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIG5hbWUgaW4gZWxlbWVudDtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShuYW1lKTtcbiAgfVxuICBzdGF0aWMgZ2V0RWxlbWVudHNCeVRhZ05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKG5hbWUpO1xuICB9XG5cbiAgLy8gaW5wdXRcbiAgc3RhdGljIGdldElubmVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5pbm5lckhUTUw7XG4gIH1cbiAgc3RhdGljIGdldE91dGVySFRNTChlbCkge1xuICAgIHJldHVybiBlbC5vdXRlckhUTUw7XG4gIH1cbiAgc3RhdGljIHNldEhUTUwoZWwsIHZhbHVlKSB7XG4gICAgZWwuaW5uZXJIVE1MID0gdmFsdWU7XG4gIH1cbiAgc3RhdGljIGdldFRleHQoZWwpIHtcbiAgICByZXR1cm4gZWwudGV4dENvbnRlbnQ7XG4gIH1cbiAgc3RhdGljIHNldFRleHQoZWwsIHZhbHVlKSB7XG4gICAgZWwudGV4dENvbnRlbnQgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGlucHV0IHZhbHVlXG4gIHN0YXRpYyBnZXRWYWx1ZShlbCkge1xuICAgIHJldHVybiBlbC52YWx1ZTtcbiAgfVxuICBzdGF0aWMgc2V0VmFsdWUoZWwsIHZhbHVlKSB7XG4gICAgZWwudmFsdWUgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGNoZWNrYm94ZXNcbiAgc3RhdGljIGdldENoZWNrZWQoZWwpIHtcbiAgICByZXR1cm4gZWwuY2hlY2tlZDtcbiAgfVxuICBzdGF0aWMgc2V0Q2hlY2tlZChlbCwgdmFsdWUpIHtcbiAgICBlbC5jaGVja2VkID0gdmFsdWU7XG4gIH1cblxuICAvLyBjbGFzc1xuICBzdGF0aWMgY2xhc3NMaXN0KGVsZW1lbnQpIHtcbiAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZWxlbWVudC5jbGFzc0xpc3QsIDApO1xuICB9XG4gIHN0YXRpYyBhZGRDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIGhhc0NsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmNsYXNzTGlzdC5jb250YWlucyhjbGFzc05hbWUpO1xuICB9XG5cbiAgLy8gY3NzXG4gIHN0YXRpYyBjc3MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZoYXNhbHVlKSB7XG4gICAgaWYoaXNVbmRlZmluZWQoc3R5bGVWYWx1ZSkpIHtcbiAgICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gICAgfVxuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IHN0eWxlVmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldENTUyhlbGVtZW50LCBzdHlsZU5hbWUsIHN0eWxlVmFsdWUpIHtcbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDU1MoZWxlbWVudCwgc3R5bGVOYW1lKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gbnVsbDtcbiAgfVxuICBzdGF0aWMgZ2V0Q1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV07XG4gIH1cblxuICAvLyBub2RlcyAmIGVsZW1lbnRzXG4gIHN0YXRpYyBjcmVhdGVFbGVtZW50KHRhZ05hbWUsIGRvYz1kb2N1bWVudCkge1xuICAgIHJldHVybiBkb2MuY3JlYXRlRWxlbWVudCh0YWdOYW1lKTtcbiAgfVxuXG4gIHN0YXRpYyByZW1vdmUoZWwpIHtcbiAgICB2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZTtcbiAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICAgIHJldHVybiBlbDtcbiAgfVxuXG4gIHN0YXRpYyBhcHBlbmRDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLmFwcGVuZENoaWxkKG5vZGUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDaGlsZChlbCwgbm9kZSkge1xuICAgIGVsLnJlbW92ZUNoaWxkKG5vZGUpO1xuICB9XG5cbiAgc3RhdGljIGluc2VydEJlZm9yZShlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRBZnRlcihlbCwgbm9kZSkge1xuICAgIGVsLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGVsLm5leHRTaWJsaW5nKTtcbiAgfVxuXG4gIHN0YXRpYyB0YWdOYW1lKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudC50YWdOYW1lO1xuICB9XG5cbiAgLy8gYXR0cmlidXRlc1xuICBzdGF0aWMgZ2V0QXR0cmlidXRlKGVsZW1lbnQsIGF0dHJpYnV0ZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICB9XG4gIHN0YXRpYyBzZXRBdHRyaWJ1dGUoZWxlbWVudCwgbmFtZSwgdmFsdWUpIHtcbiAgICBlbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudC5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBFcnJvciBIYW5kbGVyIE1vZHVsZVxuICovXG5cbi8vIFRPRE86IGNvbnNpZGVyIGltcG9ydGluZyBmcm9tICcuL3V0aWxzJyBvbmx5XG5pbXBvcnQge3dpbmRvdyBhcyB3aW59IGZyb20gJy4vYnJvd3Nlcic7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHtDb25maWd9IGZyb20gJy4uL2NoYXlucy9jb25maWcnO1xuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuZXJyb3InKTtcblxud2luLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxldCBsaW5lQW5kQ29sdW1uSW5mbyA9XG4gICAgZXJyLmNvbG5vXG4gICAgICA/ICcgbGluZTonICsgZXJyLmxpbmVubyArICcsIGNvbHVtbjonICsgZXJyLmNvbG5vXG4gICAgICA6ICcgbGluZTonICsgZXJyLmxpbmVubztcblxuICBsZXQgZmluYWxFcnJvciA9IFtcbiAgICAgICdKYXZhU2NyaXB0IEVycm9yJyxcbiAgICAgIGVyci5tZXNzYWdlLFxuICAgICAgZXJyLmZpbGVuYW1lICsgbGluZUFuZENvbHVtbkluZm8gKyAnIC0+ICcgKyAgbmF2aWdhdG9yLnVzZXJBZ2VudCxcbiAgICAgIDAsXG4gICAgICB0cnVlXG4gIF07XG5cbiAgLy8gVE9ETzogYWRkIHByb3BlciBFcnJvciBIYW5kbGVyXG4gIGxvZy53YXJuKGZpbmFsRXJyb3IpO1xuICBpZihDb25maWcuZ2V0KCdwcmV2ZW50RXJyb3JzJykpIHtcbiAgICBlcnIucHJldmVudERlZmF1bHQoKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KTtcbiIsIi8vIFRPRE86IHJlZmFjdG9yIGFuZCB3cml0ZSB0ZXN0c1xuLy8gVE9ETzogYWRkIGV4YW1wbGVcbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gYGBganNcbiAvLyBEZW1vXG5cbiBldmVudHMucHVibGlzaCgnL3BhZ2UvbG9hZCcsIHtcblx0dXJsOiAnL3NvbWUvdXJsL3BhdGgnIC8vIGFueSBhcmd1bWVudFxufSk7XG5cbiB2YXIgc3Vic2NyaXB0aW9uID0gZXZlbnRzLnN1YnNjcmliZSgnL3BhZ2UvbG9hZCcsIGZ1bmN0aW9uKG9iaikge1xuXHQvLyBEbyBzb21ldGhpbmcgbm93IHRoYXQgdGhlIGV2ZW50IGhhcyBvY2N1cnJlZFxufSk7XG5cbiAvLyAuLi5zb21ldGltZSBsYXRlciB3aGVyZSBJIG5vIGxvbmdlciB3YW50IHN1YnNjcmlwdGlvbi4uLlxuIHN1YnNjcmlwdGlvbi5yZW1vdmUoKTtcblxuIC8vICB2YXIgdGFyZ2V0ID0gd2luZG93LmV2ZW50ID8gd2luZG93LmV2ZW50LnNyY0VsZW1lbnQgOiBlID8gZS50YXJnZXQgOiBudWxsO1xuIGBgYFxuICovXG5leHBvcnQgdmFyIGV2ZW50cyA9IChmdW5jdGlvbigpIHtcbiAgbGV0IHRvcGljcyA9IHt9O1xuICBsZXQgb3duUHJvcGVydHkgPSB0b3BpY3MuaGFzT3duUHJvcGVydHk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uKHRvcGljLCBsaXN0ZW5lcikge1xuICAgICAgLy8gQ3JlYXRlIHRoZSB0b3BpYydzIG9iamVjdCBpZiBub3QgeWV0IGNyZWF0ZWRcbiAgICAgIGlmICghb3duUHJvcGVydHkuY2FsbCh0b3BpY3MsIHRvcGljKSkge1xuICAgICAgICB0b3BpY3NbdG9waWNdID0gW107XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCB0aGUgbGlzdGVuZXIgdG8gcXVldWVcbiAgICAgIGxldCBpbmRleCA9IHRvcGljc1t0b3BpY10ucHVzaChsaXN0ZW5lcikgLTE7XG5cbiAgICAgIC8vIFByb3ZpZGUgaGFuZGxlIGJhY2sgZm9yIHJlbW92YWwgb2YgdG9waWNcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgZGVsZXRlIHRvcGljc1t0b3BpY11baW5kZXhdO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0sXG5cbiAgICBwdWJsaXNoOiBmdW5jdGlvbih0b3BpYywgaW5mbykge1xuICAgICAgLy8gSWYgdGhlIHRvcGljIGRvZXNuJ3QgZXhpc3QsIG9yIHRoZXJlJ3Mgbm8gbGlzdGVuZXJzIGluIHF1ZXVlLCBqdXN0IGxlYXZlXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBDeWNsZSB0aHJvdWdoIHRvcGljcyBxdWV1ZSwgZmlyZSFcbiAgICAgIHRvcGljc1t0b3BpY10uZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIGl0ZW0oaW5mbyAhPT0gdW5kZWZpbmVkID8gaW5mbyA6IHt9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxufSkoKTtcbiIsIi8qKlxuICogQG5hbWUgamFtZXMuZXh0ZW5kXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeHRlbmRzIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QgYnkgY29weWluZyBwcm9wZXJ0aWVzIGZyb20gdGhlIHNyYyBvYmplY3QuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cblxuaW1wb3J0IHtpc09iamVjdH0gZnJvbSAnLi9pcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gIGlmICghaXNPYmplY3Qob2JqKSkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cbiAgdmFyIHNvdXJjZSwgcHJvcDtcbiAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICBmb3IgKHByb3AgaW4gc291cmNlKSB7XG4gICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgfVxuICB9XG4gIHJldHVybiBvYmo7XG59XG4iLCIvL2ltcG9ydCB7d2luZG93fSBmcm9tICcuL2Jyb3dzZXInO1xuLyogZ2xvYmFsIGZldGNoICovXG5pbXBvcnQge1xuICBnZXRMb2dnZXIsXG4gIGlzRm9ybUVsZW1lbnQsXG4gIGlzU3RyaW5nLFxuICBpc09iamVjdCxcbiAgaXNGb3JtRGF0YVxuICB9IGZyb20gJy4uL3V0aWxzJztcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLnV0aWxzLmh0dHAnKTtcbi8vbGV0IFByb21pc2UgPSB3aW5kb3cuUHJvbWlzZTsgLy8gb3RoZXJ3aXNlIGltcG9ydCBQcm9taXNlXG4vL2xldCBmZXRjaCA9IHdpbmRvdy5mZXRjaDsgLy8gb3RoZXJ3aXNlIFRPRE86IGltcG9ydCBmZXRjaFxuXG5cblxuXG4vKipcbiAqIEZldGNoIEpTT04gdmlhIEdFVFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBqc29uIHJlc3VsdFxuICovXG5leHBvcnQgZnVuY3Rpb24gZmV0Y2hKU09OKHVybCkge1xuICByZXR1cm4gZmV0Y2godXJsKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIFBlcmZvcm1zIFBPU1QgUmVxdWVzdFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7SFRNTEZvcm1FbGVtZW50XFxGb3JtRGF0YVxcVVJMU2VhcmNoUGFyYW1zXFxVU1ZTdHJpbmdcXEJsb2J8QnVmZmVyU291cmNlfSBmb3JtXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3RGb3JtKHVybCwgZm9ybSkge1xuICBpZiAoaXNGb3JtRWxlbWVudChmb3JtKSkge1xuICAgIGZvcm0gPSBuZXcgRm9ybURhdGEoZm9ybSk7XG4gIH1cbiAgcmV0dXJuIGZldGNoKHVybCwge1xuICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgIGJvZHk6IGZvcm1cbiAgfSk7XG59XG5cbi8qKlxuICogUG9zdCBKU09OXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtgT2JqZWN0YH0gZGF0YSBFaXRoZXIgT2JqZWN0IG9yIEpTT04gU3RyaW5nXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3QodXJsLCBkYXRhKSB7XG4gIGlmIChpc09iamVjdChkYXRhKSkge1xuICAgIGRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgfSBlbHNlIGlmICghaXNTdHJpbmcoZGF0YSkpIHtcbiAgICBsb2cud2FybigncG9zdEpTT046IGludmFsaWQgZGF0YScpO1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwb3N0IGRhdGEnKTtcbiAgfVxuICByZXR1cm4gZmV0Y2godXJsLCB7XG4gICAgbWV0aG9kOiAncG9zdCcsXG4gICAgaGVhZGVyczoge1xuICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICB9LFxuICAgIGJvZHk6IGRhdGFcbiAgfSk7XG59XG5cbi8qKlxuICogVXBsb2FkIGZpbGVcbiAqIFRPRE86IGFkZCBhZGRpdGlvbmFsIHBhcmFtcyBvcHRpb25zXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge0lucHV0LmZpbGV8Rm9ybURhdGF9IGRhdGFcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwbG9hZCh1cmwsIGRhdGEsIG5hbWUpIHtcbiAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKTtcbiAgaWYgKCFpc0Zvcm1EYXRhKGRhdGEpKSB7XG4gICAgZm9ybS5hcHBlbmQobmFtZSB8fCAnZmlsZScsIGRhdGEpO1xuICB9IGVsc2Uge1xuICAgIGZvcm0gPSBkYXRhO1xuICB9XG5cbiAgcmV0dXJuIGZldGNoKHVybCwge1xuICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgIGJvZHk6IGZvcm1cbiAgfSk7XG59XG5cbi8qKlxuICogRmV0Y2ggdGV4dCBvciBIVE1MIHZpYSBHRVRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gd2l0aCB0ZXN0IHJlc3VsdFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0KHVybCkge1xuICByZXR1cm4gZmV0Y2godXJsKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICByZXR1cm4gcmVzcG9uc2UudGV4dCgpO1xuICAgIH0pO1xufVxuIiwiLyoqXG4gKiBAbmFtZSBqYW1lcy5pc1VuZGVmaW5lZFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgdW5kZWZpbmVkLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyB1bmRlZmluZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1VuZGVmaW5lZCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0RlZmluZWRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGRlZmluZWQuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGRlZmluZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RlZmluZWQodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSAhPT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNQcmVzZW50XG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBuZWl0aGVyIHVuZGVmaW5lZCBub3IgbnVsbC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgcHJlc2VudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUHJlc2VudChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPT0gdW5kZWZpbmVkICYmIG9iaiAhPT0gbnVsbDtcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0JsYW5rXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBlaXRoZXIgdW5kZWZpbmVkIG9yIG51bGwuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGJsYW5rLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCbGFuayhvYmopIHtcbiAgcmV0dXJuIG9iaiA9PT0gdW5kZWZpbmVkIHx8IG9iaiA9PT0gbnVsbDtcbn1cblxuXG4vKipcbiogQG5hbWUgamFtZXMuaXNTdHJpbmdcbiogQG1vZHVsZSBqYW1lc1xuKiBAa2luZCBmdW5jdGlvblxuKlxuKiBAZGVzY3JpcHRpb25cbiogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBTdHJpbmdgLlxuKlxuKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBTdHJpbmdgLlxuKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZyh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc051bWJlclxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgTnVtYmVyYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgTnVtYmVyYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTnVtYmVyKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzT2JqZWN0XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGFuIGBPYmplY3RgLlxuICogbnVsbCBpcyBub3QgdHJlYXRlZCBhcyBhbiBvYmplY3QuXG4gKiBJbiBKUyBhcnJheXMgYXJlIG9iamVjdHNcbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGFuIGBPYmplY3RgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNBcnJheVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhbiBgQXJyYXlgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhbiBgQXJyYXlgLlxuICovXG5leHBvcnQgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzRnVuY3Rpb25cbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYEZ1bmN0aW9uYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgRnVuY3Rpb25gLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzRGF0ZVxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSB2YWx1ZSBpcyBhIGRhdGUuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYERhdGVgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEYXRlKHZhbHVlKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuXG4vLyBUT0RPOiBkb2VzIG5vdCBiZWxvbmcgaW4gaGVyZVxuLyoqXG4gKiBAbmFtZSB1dGlscy50cmltXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJlbW92ZXMgd2hpdGVzcGFjZXMuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7U3RyaW5nfCp9IFRyaW1tZWQgIHZhbHVlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmltKHZhbHVlKSB7XG4gIHJldHVybiBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJykgOiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc1VVSURcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBVVUlEYCAoT1NGKS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgVVVJRGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1VVSUQodmFsdWUpIHtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhbHVlID0gdHJpbSh2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9eWzAtOWEtZl17NH0oWzAtOWEtZl17NH0tKXs0fVswLTlhLXpdezEyfSQvaSkgIT09IG51bGw7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzR1VJRFxuICogQGFsaWFzIHV0aWxzLmlzVVVJRFxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYEdVSURgIChNaWNyb3NvZnQgU3RhbmRhcmQpLlxuICogSXMgYW4gYWxpYXMgdG8gaXNVVUlEXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEdVSURgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNHVUlEKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpO1xufVxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc01hY0FkZHJlc3NcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBNQUMgQWRkcmVzc2AuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYE1BQyBBZGRyZXNzYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTWFjQWRkcmVzcyh2YWx1ZSkge1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB0cmltKHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWUubWF0Y2goL14oWzAtOWEtZl17Mn1bLTpdKXs1fVswLTlhLWZdezJ9JC9pKSAhPT0gbnVsbDtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNCTEVBZGRyZXNzXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgQkxFIEFkZHJlc3NgXG4gKlxuICogQHBhcmFtIHsqfSBvYmogUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBCTEUgQWRkcmVzc2AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JMRUFkZHJlc3ModmFsdWUpIHtcbiAgcmV0dXJuIGlzVVVJRCh2YWx1ZSkgfHwgaXNNYWNBZGRyZXNzKHZhbHVlKTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0Zvcm1EYXRhXG4gKiBAbW9kdWxlIHV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIEZvcm1EYXRhIGBPYmplY3RgLlxuICpcbiAqIEBwYXJhbSB7Kn0gb2JqIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGBvYmpgIGlzIGEgYEZvcm1EYXRhYCBPYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Zvcm1EYXRhKG9iaikge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBGb3JtRGF0YV0nO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzRm9ybUVsZW1lbnRcbiAqIEBtb2R1bGUgdXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgRm9ybUVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHsqfSBvYmogUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYG9iamAgaXMgYSBgSFRNTEZvcm1FbGVtZW50YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRm9ybUVsZW1lbnQob2JqKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEhUTUxGb3JtRWxlbWVudF0nO1xufVxuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzT2JqZWN0fSBmcm9tICcuLi91dGlscyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMudXRpbHMuaXNfcGVybWl0dGVkJyk7XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmUgd2hldGhlciB0aGUgY3VycmVudCB1c2VyJ3MgT1MgYW5kIE9TIFZlcnNpb24gaXMgaGlnaGVyXG4gKiBvciBlcXVhbCB0byB0aGUgcGFzc2VkIHJlZmVyZW5jZSBgT2JqZWN0YC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmVyc2lvbnMgVmVyc2lvbnMgYE9iamVjdGAgd2l0aCBwZXJtaXR0ZWQgT1NzIGFuZCB0aGVpciB2ZXJzaW9uLlxuICogQHBhcmFtIHtzdHJpbmd9IG9zIE9TIE5hbWUgYXMgbG93ZXJjYXNlIHN0cmluZy5cbiAqIEBwYXJhbSB7SW50ZWdlcn0gYXBwVmVyc2lvbiBBcHAgVmVyc2lvbiBOdW1iZXIgYXMgSW50ZWdlciAgVE9ETzogZm9ybWF0IFJGQz9cbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjdXJyZW50IE9TICYgVmVyc2lvbiBhcmUgZGVmaW5lZCBpbiB0aGUgdmVyc2lvbnMgYE9iamVjdGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUGVybWl0dGVkKHZlcnNpb25zLCBvcywgYXBwVmVyc2lvbikge1xuXG4gIGlmICghdmVyc2lvbnMgfHwgIWlzT2JqZWN0KHZlcnNpb25zKSkge1xuICAgIGxvZy53YXJuKCdubyB2ZXJzaW9ucyBgT2JqZWN0YCB3YXMgcGFzc2VkJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIHZlcnNpb25zW29zXSAmJiBhcHBWZXJzaW9uID49IHZlcnNpb25zW29zXTtcbn1cbiIsIi8qKlxuICogTG9nTGV2ZWwgRW51bVxuICogbm9uZSBpcyAwXG4gKiBkZWJ1ZyBpcyA0XG4gKiBAdHlwZSBFbnVtXG4gKi9cbmV4cG9ydCB2YXIgbGV2ZWxzID0ge1xuICBub25lOiAwLFxuICBlcnJvcjoxLFxuICB3YXJuOjIsXG4gIGluZm86MyxcbiAgZGVidWc6NFxufTtcblxuLyoqXG4gKiBDYW4gc3RvcmUgbXVsdGlwbGUgbG9nZ2Vyc1xuICogQHR5cGUge2BPYmplY3RgfSBsb2dnZXJzXG4gKi9cbmxldCBsb2dnZXJzID0ge307XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBBc3NpZ24gdGhlIGxvZ2dlciBtZXRob2QuXG4gKiBCeSBkZWZhdWx0IHRoZSB3aW5kb3cuY29uc29sZSBgT2JqZWN0YFxuICogQHR5cGUgYHdpbmRvdy5jb25zb2xlYFxuICovXG5sZXQgbG9nZ2VyID0gd2luZG93LmNvbnNvbGU7XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IGxvZyBMZXZlbFxuICogdXNlIGBzZXRMZXZlbChuZXdMb2dMZXZlbClgIHRvIG92ZXJ3cml0ZSB0aGlzIHZhbHVlLlxuICogVE9ETzogZWFjaCBsb2dnZXIgZ2V0cyBhbiBvd24gbG9nTGV2ZWxcbiAqL1xubGV0IGxvZ0xldmVsID0gbGV2ZWxzLm5vbmU7XG5cbi8qKlxuICpcbiAqIEBwYXJhbSBsZXZlbFxuICogQHBhcmFtIGFyZ3NcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGxvZyhsZXZlbCwgYXJncywgcHJlZml4KSB7XG4gIGxldCBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbiAgaWYgKHByZWZpeCkge1xuICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3MpO1xuICAgIC8vYXJncy51bnNoaWZ0KHRpbWUpOyAvLyBUT0RPOiBjb25zaWRlciB0b2dnbGVhYmxlIHRpbWVcbiAgICBhcmdzLnVuc2hpZnQocHJlZml4KTtcbiAgfVxuICBsb2dnZXJbbGV2ZWwgfHwgJ2xvZyddLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xufVxuXG4vKipcbiAqIFNldCB0aGUgY3VycmVudCBsb2dMZXZlbFxuICogaW4gb3JkZXIgdG8gc2hvdyBvciBub3Qgc2hvdyBsb2dzXG4gKiBAcGFyYW0gbGV2ZWxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldExldmVsKGxldmVsKSB7XG4gIGxvZ0xldmVsID0gbGV2ZWw7XG59XG5cbi8qKlxuICogR2V0IExvZ2dlciBTaW5nbGV0b24gSW5zdGFuY2VcbiAqIEBwYXJhbSAge3N0cmluZ30gbmFtZSBUaGUgTG9nZ2VyJ3MgbmFtZVxuICogQHJldHVybnMge0xvZ2dlcn0gTG9nZ2VyIGluc3RhbmNlLCBlaXRoZXIgZXhpc3Rpbmcgb25lIG9yIGNyZWF0ZXMgYSBuZXcgb25lXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2dnZXIobmFtZSkge1xuICByZXR1cm4gbG9nZ2Vyc1tuYW1lXSB8fCAobG9nZ2Vyc1tuYW1lXSA9IG5ldyBMb2dnZXIobmFtZSkpO1xufVxuXG4vKipcbiAqIExvZ2dlciBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcblxuICAvKipcbiAgICogRWFjaCBsb2dnZXIgaXMgaWRlbnRpZmllZCBieSBpdCdzIG5hbWUuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIGxvZ2dlciAoZS5nLiBgY2hheW5zLmNvcmVgKVxuICAgKi9cbiAgY29uc3RydWN0b3IobmFtZSkge1xuICAgIHRoaXMubmFtZSA9ICdbJyArIG5hbWUgKyAnXTogJztcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICpcbiAgICogQG1ldGhvZCBkZWJ1Z1xuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGRlYnVnKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdkZWJ1ZycsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGluZm8uXG4gICAqXG4gICAqIEBtZXRob2QgaW5mb1xuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGluZm8oKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgMykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2luZm8nLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBMb2dzIGEgd2FybmluZy5cbiAgICpcbiAgICogQG1ldGhvZCB3YXJuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgd2FybigpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbG9nKCd3YXJuJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IuXG4gICAqXG4gICAqIEBtZXRob2QgZXJyb3JcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICBlcnJvcigpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAxKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnZXJyb3InLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhbk11dGF0aW9uT2JzZXJ2ZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuXG4gICAgaWYgKGNhbk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgdmFyIGhpZGRlbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxdWV1ZUxpc3QgPSBxdWV1ZS5zbGljZSgpO1xuICAgICAgICAgICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHF1ZXVlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShoaWRkZW5EaXYsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaGlkZGVuRGl2LnNldEF0dHJpYnV0ZSgneWVzJywgJ25vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJcbmltcG9ydCB7Y2hheW5zfSBmcm9tICcuL2NoYXlucyc7XG5leHBvcnQgZGVmYXVsdCBjaGF5bnM7XG4iXX0=
  return require('chayns');

});
