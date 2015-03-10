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
   * @returns {Promise} True if the call succeeded or is async, false on error
   */
  // TODO: use forceReload and cache AppData
  getGlobalData: function getGlobalData(forceReload) {
    if (!forceReload && globalData) {
      log.debug("getGlobalData: return cached data");
      return Promise.resolve(globalData);
    }
    return new Promise(function (resolve, reject) {

      apiCall({
        cmd: 18,
        webFn: "getAppInfos",
        params: [{ callback: "getGlobalData()" }], // callback param only on mobile
        cb: resolve,
        onError: reject
      });
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
      if (isFunction(obj.onError)) {
        obj.onError.call(undefined, new Error("Neither in Chayns Web nor in Chayns App"));
      }
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

var domReadyPromise;
var chaynsReadyPromise;function register(config) {
  log.info("chayns.register");
  Config.set(config); // this reference to the chayns obj
  return this;
}function preChayns() {
  if ("preChayns" in window && isObject(window.preChayns)) {
    Object.keys(window.preChayns).forEach(function (setting) {
      log.debug("pre chayns: ", setting);
    });
  }
}function ready() {
  log.debug("chayns.ready()");
  return chaynsReadyPromise;
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

  // DOM  ready promise
  domReadyPromise = new Promise(function (resolve) {
    if (document.readyState === "complete") {
      resolve();
    } else {
      var domReady = function domReady() {
        resolve();
        window.removeEventListener("DOMContentLoaded", domReady, true);
      };
      window.addEventListener("DOMContentLoaded", domReady, true);
    }
  }).then(function () {
    // DOM ready actions
    log.debug("DOM ready"); // TODO: actually we can remove this
    // dom-ready class
    DOM.addClass(body, "dom-ready");
    // start window.on('message') listener for iFrame Communication
    messageListener();
  });

  // chaynsReady Promise
  chaynsReadyPromise = new Promise(function (resolve, reject) {
    // get the App Information (TODO: has to be done when document ready?)
    chaynsApiInterface.getGlobalData().then(function resolved(data) {

      // now Chayns is officially ready
      // first set all env stuff
      if (!data) {
        return reject(new Error("There is no app Data"));
      }

      log.debug("appInformation callback", data);

      // store received information
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

      // don't worry this is no v2 thing
      cssSetup();
      log.info("finished chayns setup");

      // TODO: create custom model?
      resolve(data);
    }, function rejected() {
      log.debug("Error: The App Information could not be received.");
      reject("The App Information could not be received.");
      //return Promise.reject(new Error('The App Information could not be received.'));
    });
  });
}

/**
 * Adds vendor classes to the body in order to show that chayns is ready
 * and which OS, Browser and ColorScheme should be applied.
 * This function is invoked when the DOM and Chayns is ready.
 *
 * @private
 */
function cssSetup() {
  var body = document.body;
  var suffix = "chayns-";

  DOM.addClass(body, "chayns-ready");
  DOM.removeAttribute(DOM.query("[chayns-cloak]"), "chayns-cloak");

  // add vendor classes (OS, Browser, ColorScheme)
  DOM.addClass(body, suffix + "os--" + environment.os);
  DOM.addClass(body, suffix + "browser--" + environment.browser);
  DOM.addClass(body, suffix + "color--" + environment.browser);

  // Environment
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

  // add chayns root element
  var chaynsRoot = DOM.createElement("div");
  chaynsRoot.setAttribute("id", "chayns-root");
  chaynsRoot.setAttribute("class", "chayns__root");
  DOM.appendChild(body, chaynsRoot);
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
//  token: 'token' // TODO: exclude token?
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

var debugMode = !!parameters.debug;

// TODO: further params and colorscheme
// TODO: discuss role of URL params and try to replace them and only use AppData

//function getFirstMatch(regex) {
//  var match = ua.match(regex);
//  return (match && match.length > 1 && match[1]) || '';
//}

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
  browserVersion: 1

};

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
environment.ratio = window.devicePixelRatio;

environment.debugMode = debugMode;function setEnv(key, value) {
  //extend(environment, prop);
  environment[key] = value;
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdGFwcF9hcGlfaW50ZXJmYWNlLmpzIiwic3JjL2NoYXlucy91c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2xpYi9mZXRjaF9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9saWIvcHJvbWlzZV9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9icm93c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9lcnJvci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9ldmVudHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXh0ZW5kLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2h0dHAuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvaXMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvaXNfcGVybWl0dGVkLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2xvZ2dlci5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMtdW1kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7SUNPWSxLQUFLLG1DQUFvQixTQUFTOztBQUM5QyxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDOzs7QUFHMUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7OztJQUdWLE1BQU0sV0FBdUIsaUJBQWlCLEVBQTlDLE1B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RUFBRyxDQUFDOzs7Ozs7Ozs7Ozs7O0FDL1VMLENBQUMsWUFBVTtBQUFDLFdBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEVBQUUsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sVUFBVSxLQUFHLE9BQU8sQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFPLFlBQVU7QUFBQyxhQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBQyxFQUFDLGFBQWEsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsT0FBTyxZQUFVO0FBQUMsT0FBQyxDQUFDLElBQUksR0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxjQUFjLEVBQUEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBQyxDQUFDLENBQUMsT0FBTyxZQUFVO0FBQUMsT0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxXQUFPLFlBQVU7QUFBQyxnQkFBVSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUM7QUFDM2YsS0FBQyxHQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRztBQUFDLE9BQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxhQUFPLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxTQUFTLENBQUMsMENBQTBDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBRyxVQUFVLEtBQUcsT0FBTyxDQUFDLElBQUUsUUFBUSxLQUFHLE9BQU8sQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLEVBQUMsSUFBRyxDQUFDLENBQUMsV0FBVyxLQUFHLENBQUMsQ0FBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFDOWYsQ0FBQyxDQUFDLENBQUMsS0FBSTtBQUFDLFVBQUksQ0FBQyxDQUFDLElBQUc7QUFBQyxTQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtPQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLE1BQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFNBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUM7QUFBQyxXQUFJLElBQUksQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsUUFBSSxDQUFDLEtBQUssR0FDemdCLElBQUksQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxVQUFHO0FBQUMsU0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsS0FBSyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQSxHQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksU0FBUyxDQUFDLHNEQUFzRCxDQUFDLENBQUMsQ0FBQyxPQUFNO09BQUM7S0FBQyxNQUFLLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUc7QUFBQyxPQUFDLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQzNmLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxNQUFNLElBQUUsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBLEdBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLG9GQUFvRixDQUFDLENBQUMsSUFBRyxFQUFFLElBQUksWUFBWSxDQUFDLENBQUEsQUFBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsdUhBQXVILENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUM7R0FBQyxJQUFJLENBQUMsR0FBQyxLQUFLLENBQUMsT0FBTyxHQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFNLGdCQUFnQixLQUNqZ0IsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUM7TUFBQyxDQUFDLEdBQUMsQ0FBQztNQUFDLENBQUMsR0FBQyxXQUFXLEtBQUcsT0FBTyxNQUFNLEdBQUMsTUFBTSxHQUFDLEVBQUU7TUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLGdCQUFnQixJQUFFLENBQUMsQ0FBQyxzQkFBc0I7TUFBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8saUJBQWlCLElBQUUsV0FBVyxLQUFHLE9BQU8sYUFBYSxJQUFFLFdBQVcsS0FBRyxPQUFPLGNBQWM7TUFBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUcsQ0FBQztNQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sT0FBTyxJQUFFLGtCQUFrQixLQUFHLENBQUEsR0FBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsRUFBQTtNQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsRUFBQSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFlBQVU7QUFBQyxXQUFPLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FDNWYsWUFBVTtBQUFDLFFBQUksQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsWUFBVTtBQUFDLFNBQUksSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUcsT0FBTyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsV0FBVyxLQUFHLENBQUMsSUFBRSxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEdBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxJQUFJLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQztBQUN0ZixHQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFdBQU0sQUFBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxhQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLElBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBLENBQUUsS0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsSUFBRSxRQUFRLEtBQUcsT0FBTyxDQUFDLElBQUUsQ0FBQyxDQUFDLFdBQVcsS0FBRyxJQUFJLEVBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pmLEtBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUMsRUFBQyxXQUFXLEVBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxjQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxVQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQztBQUFDLGVBQU8sSUFBSSxDQUFDO09BQUEsSUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsWUFBSSxDQUFDLEdBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBVTtBQUFDLFdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtTQUFDLENBQUMsQ0FBQTtPQUFDLE1BQUssQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQUMsRUFBQyxPQUFPLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxhQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLElBQUksQ0FBQyxHQUFDLEVBQUMsT0FBTyxFQUFDLENBQUMsRUFBQyxRQUFRLEVBQUMsb0JBQVU7QUFBQyxVQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxHQUFDLE1BQU0sR0FBQyxXQUFXLEtBQUcsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLFFBQVEsR0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLFNBQVMsSUFBRyxDQUFDLElBQUUsU0FBUyxJQUNyZixDQUFDLENBQUMsT0FBTyxJQUFFLFFBQVEsSUFBRyxDQUFDLENBQUMsT0FBTyxJQUFFLEtBQUssSUFBRyxDQUFDLENBQUMsT0FBTyxJQUFFLE1BQU0sSUFBRyxDQUFDLENBQUMsT0FBTyxJQUFFLENBQUEsWUFBVTtBQUFDLFlBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQUMsR0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFBLEVBQUUsS0FBRyxDQUFDLENBQUMsT0FBTyxHQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsVUFBVSxLQUFHLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxHQUFHLEdBQUMsTUFBTSxDQUFDLFlBQVU7QUFBQyxXQUFPLENBQUMsQ0FBQTtHQUFDLENBQUMsR0FBQyxXQUFXLEtBQUcsT0FBTyxNQUFNLElBQUUsTUFBTSxDQUFDLE9BQU8sR0FBQyxNQUFNLENBQUMsT0FBTyxHQUFDLENBQUMsR0FBQyxXQUFXLEtBQUcsT0FBTyxJQUFJLEtB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7SUNyRlEsTUFBTSxXQUFPLFVBQVUsRUFBdkIsTUFBTTs7aUJBQ0MsTUFBTSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIEBuYW1lIGNoYXlucyBBUElcbiAqIEBtb2R1bGUgY2hheW5zXG4gKi9cblxuLy8gaGVscGVyXG4vLyBUT0RPOiBlaXRoZXIgaW5kZXguanMsIHV0aWxzLmpzIG9yIGp1c3QgdGhlIHNpbmdsZSBmaWxlc1xuaW1wb3J0ICogYXMgdXRpbHMgICAgICAgICAgICAgICBmcm9tICcuL3V0aWxzJztcbnZhciBleHRlbmQgPSB1dGlscy5leHRlbmQ7XG5cbi8vIHNldCBsb2dMZXZlbCB0byBpbmZvXG51dGlscy5zZXRMZXZlbCg0KTsgLy8gVE9ETzogZG9uJ3Qgc2V0IHRoZSBsZXZlbCBoZXJlXG5cbi8vIGJhc2ljIGNvbmZpZ1xuaW1wb3J0IHtjb25maWd9ICAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy9jb25maWcnO1xuXG4vLyBlbnZpcm9ubWVudFxuaW1wb3J0IHtlbnZpcm9ubWVudH0gICAgICAgICAgICBmcm9tICcuL2NoYXlucy9lbnZpcm9ubWVudCc7XG5cbmltcG9ydCBQcm9taXNlIGZyb20gICcuL2xpYi9wcm9taXNlX3BvbHlmaWxsJztcblByb21pc2UucG9seWZpbGwoKTsgLy8gYXV0b2xvYWQgUHJvbWlzZSBwb2x5ZmlsbFxuLy8gVE9ETzogYWRkIERlZmVycmVkP1xuXG5pbXBvcnQgJy4vbGliL2ZldGNoX3BvbHlmaWxsJztcblxuLy8gY29yZSBmdW5jdGlvbnNcbmltcG9ydCB7cmVhZHksIHJlZ2lzdGVyLCBzZXR1cH0gZnJvbSAnLi9jaGF5bnMvY29yZSc7XG5cbi8vIGNoYXlucyBjYWxsc1xuXG5pbXBvcnQge2FwaUNhbGx9ICAgICAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2NoYXluc19jYWxscyc7XG5cbmltcG9ydCB7Y2hheW5zQXBpSW50ZXJmYWNlfSAgICAgZnJvbSAnLi9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuXG5pbXBvcnQge3RhcHBBcGlJbnRlcmZhY2V9ICAgICAgIGZyb20gJy4vY2hheW5zL3RhcHBfYXBpX2ludGVyZmFjZSc7XG5cblxuLy8gcHVibGljIGNoYXlucyBvYmplY3RcbmV4cG9ydCB2YXIgY2hheW5zID0ge307XG5cbi8vIFRPRE86IHVzZSBleHRlbmQgbWV0aG9kIG9ubHkgb25lIHRpbWVcblxuZXh0ZW5kKGNoYXlucywge2dldExvZ2dlcjogdXRpbHMuZ2V0TG9nZ2VyfSk7IC8vIGpzaGludCBpZ25vcmU6IGxpbmVcbmV4dGVuZChjaGF5bnMsIHt1dGlsc30pO1xuZXh0ZW5kKGNoYXlucywge1ZFUlNJT046ICcwLjEuMCd9KTtcbi8vZXh0ZW5kKGNoYXlucywge2NvbmZpZ30pOyAvLyBUT0RPOiB0aGUgY29uZmlnIGBPYmplY3RgIHNob3VsZCBub3QgYmUgZXhwb3NlZFxuXG5leHRlbmQoY2hheW5zLCB7ZW52OiBlbnZpcm9ubWVudH0pOyAvLyBUT0RPOiBnZW5lcmFsbHkgcmVuYW1lXG5cbmV4dGVuZChjaGF5bnMsIHtyZWdpc3Rlcn0pO1xuZXh0ZW5kKGNoYXlucywge3JlYWR5fSk7XG5cbi8vIFRPRE86IHJlbW92ZSBsaW5lIGJlbG93XG5leHRlbmQoY2hheW5zLCB7YXBpQ2FsbH0pO1xuXG4vLyBhZGQgYWxsIGNoYXluc0FwaUludGVyZmFjZSBtZXRob2RzIGRpcmVjdGx5IHRvIHRoZSBgY2hheW5zYCBPYmplY3RcbmV4dGVuZChjaGF5bnMsIGNoYXluc0FwaUludGVyZmFjZSk7XG5cbmV4dGVuZChjaGF5bnMsIHRhcHBBcGlJbnRlcmZhY2UpO1xuXG4vLyBzZXR1cCBjaGF5bnNcbnNldHVwKCk7XG5cblxuLy8gY2hheW5zIHB1Ymxpc2ggbm8gVU1EXG4vL3dpbmRvdy5jaGF5bnMgPSBjaGF5bnM7XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNGdW5jdGlvbiwgaXNVbmRlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93fSBmcm9tICcuLi91dGlscy9icm93c2VyJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jYWxsYmFja3MnKTtcblxubGV0IG5vb3AgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbmxldCBjYWxsYmFja3MgPSB7fTtcbi8qKlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBGdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzQ2hheW5zQ2FsbCBJZiB0cnVlIHRoZW4gdGhlIGNhbGwgd2lsbCBiZSBhc3NpZ25lZCB0byBgY2hheW5zLl9jYWxsYmFja3NgXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBwYXJhbWV0ZXJzIGFyZSB2YWxpZCBhbmQgdGhlIGNhbGxiYWNrIHdhcyBzYXZlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Q2FsbGJhY2sobmFtZSwgZm4sIGlzQ2hheW5zQ2FsbCkge1xuXG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogbmFtZSBpcyB1bmRlZmluZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFpc0Z1bmN0aW9uKGZuKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogZm4gaXMgbm8gRnVuY3Rpb24nKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAobmFtZS5pbmRleE9mKCcoKScpICE9PSAtMSkgeyAvLyBzdHJpcCAnKCknXG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgnKCknLCAnJyk7XG4gIH1cblxuICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiBzZXQgQ2FsbGJhY2s6ICcgKyBuYW1lKTtcbiAgLy9pZiAobmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgLy8gIGNhbGxiYWNrc1tuYW1lXS5wdXNoKGZuKTsgLy8gVE9ETzogcmVjb25zaWRlciBBcnJheSBzdXBwb3J0XG4gIC8vfSBlbHNlIHtcbiAgICBjYWxsYmFja3NbbmFtZV0gPSBmbjsgLy8gQXR0ZW50aW9uOiB3ZSBzYXZlIGFuIEFycmF5XG4gIC8vfVxuXG4gIGlmIChpc0NoYXluc0NhbGwpIHtcbiAgICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiByZWdpc3RlciBmbiBhcyBnbG9iYWwgY2FsbGJhY2snKTtcbiAgICB3aW5kb3cuX2NoYXluc0NhbGxiYWNrc1tuYW1lXSA9IGNhbGxiYWNrKG5hbWUsICdDaGF5bnNDYWxsJyk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZWdpc3RlciBjYWxsYmFja3MgZm9yIENoYXluc0NhbGxzIGFuZCBDaGF5bnNXZWJDYWxsc1xuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gY2FsbGJhY2tOYW1lIE5hbWUgb2YgdGhlIEZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBFaXRoZXIgJ0NoYXluc1dlYkNhbGwnIG9yICdDaGF5bnNDYWxsJ1xuICogQHJldHVybnMge0Z1bmN0aW9ufSBoYW5kbGVEYXRhIFJlY2VpdmVzIGNhbGxiYWNrIGRhdGFcbiAqL1xuZnVuY3Rpb24gY2FsbGJhY2soY2FsbGJhY2tOYW1lLCB0eXBlKSB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZURhdGEoKSB7XG5cbiAgICBpZiAoY2FsbGJhY2tOYW1lIGluIGNhbGxiYWNrcykge1xuICAgICAgbG9nLmRlYnVnKCdpbnZva2UgY2FsbGJhY2s6ICcsIGNhbGxiYWNrTmFtZSwgJ3R5cGU6JywgdHlwZSk7XG4gICAgICB2YXIgZm4gPSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICBmbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAvL2RlbGV0ZSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTsgLy8gVE9ETzogY2Fubm90IGJlIGxpa2UgdGhhdCwgcmVtb3ZlIGFycmF5P1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLndhcm4oJ2NhbGxiYWNrIGlzIG5vIGZ1bmN0aW9uJywgY2FsbGJhY2tOYW1lLCBmbik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5pbmZvKCdjYWxsYmFjayAnICsgY2FsbGJhY2tOYW1lICsgJyBkaWQgbm90IGV4aXN0IGluIGNhbGxiYWNrcyBhcnJheScpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMuX2NhbGxiYWNrc1xuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIENoYXlucyBDYWxsIENhbGxiYWNrc1xuICogd2lsbCBiZSBhc3NpZ25lZCB0byB0aGUgYGNoYXlucy5fY2FsbGJhY2tzYCBvYmplY3RcbiAqXG4gKiBAdHlwZSB7T2JqZWN0fSBjaGF5bnNDYWxsc0NhbGxiYWNrc1xuICovXG53aW5kb3cuX2NoYXluc0NhbGxiYWNrcyA9IHtcbiAgLy8vLyBUT0RPOiB3cmFwIGNhbGxiYWNrIGZ1bmN0aW9uIChEUlkpXG4gIC8vZ2V0R2xvYmFsRGF0YTogY2FsbGJhY2soJ2dldEdsb2JhbERhdGEnLCAnQ2hheW5zQ2FsbCcpIC8vIGV4YW1wbGVcbiAgZ2V0R2VvTG9jYXRpb25DYWxsYmFjazogbm9vcFxufTtcblxuXG4vLyBUT0RPOiBtb3ZlIHRvIGFub3RoZXIgZmlsZT8gY29yZSwgY2hheW5zX2NhbGxzXG52YXIgbWVzc2FnZUxpc3RlbmluZyA9IGZhbHNlO1xuZXhwb3J0IGZ1bmN0aW9uIG1lc3NhZ2VMaXN0ZW5lcigpIHtcbiAgaWYgKG1lc3NhZ2VMaXN0ZW5pbmcpIHtcbiAgICBsb2cuaW5mbygndGhlcmUgaXMgYWxyZWFkeSBvbmUgbWVzc2FnZSBsaXN0ZW5lciBvbiB3aW5kb3cnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgbWVzc2FnZUxpc3RlbmluZyA9IHRydWU7XG4gIGxvZy5kZWJ1ZygnbWVzc2FnZSBsaXN0ZW5lciBpcyBzdGFydGVkJyk7XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiBvbk1lc3NhZ2UoZSkge1xuXG4gICAgbG9nLmRlYnVnKCduZXcgbWVzc2FnZSAnKTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSAnY2hheW5zLmN1c3RvbVRhYi4nLFxuICAgICAgZGF0YSA9IGUuZGF0YTtcblxuICAgIGlmICh0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gc3RyaXAgbmFtZXNwYWNlIGZyb20gZGF0YVxuICAgIGRhdGEgPSBkYXRhLnN1YnN0cihuYW1lc3BhY2UubGVuZ3RoLCBkYXRhLmxlbmd0aCAtIG5hbWVzcGFjZS5sZW5ndGgpO1xuICAgIHZhciBtZXRob2QgPSBkYXRhLm1hdGNoKC9bXjpdKjovKTsgLy8gZGV0ZWN0IG1ldGhvZFxuICAgIGlmIChtZXRob2QgJiYgbWV0aG9kLmxlbmd0aCA+IDApIHtcbiAgICAgIG1ldGhvZCA9IG1ldGhvZFswXTtcblxuICAgICAgdmFyIHBhcmFtcyA9IGRhdGEuc3Vic3RyKG1ldGhvZC5sZW5ndGgsIGRhdGEubGVuZ3RoIC0gbWV0aG9kLmxlbmd0aCk7XG4gICAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFyYW1zID0gSlNPTi5wYXJzZShwYXJhbXMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgdGhlIGxhc3QgJyknXG4gICAgICBtZXRob2QgPSBtZXRob2Quc3Vic3RyKDAsIG1ldGhvZC5sZW5ndGggLSAxKTtcblxuICAgICAgLy8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGNhbiBiZSBpbnZva2VkIGRpcmVjdGx5XG4gICAgICBjYWxsYmFjayhtZXRob2QsICdDaGF5bnNXZWJDYWxsJykocGFyYW1zKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiLyoqXG4gKiBDaGF5bnMgQVBJIEludGVyZmFjZVxuICogQVBJIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIEFQUCBhbmQgdGhlIENoYXlucyBXZWJcbiAqL1xuXG5pbXBvcnQge2FwaUNhbGx9IGZyb20gJy4vY2hheW5zX2NhbGxzJztcbmltcG9ydCB7Z2V0TG9nZ2VyLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzQkxFQWRkcmVzcyxcbiAgaXNEYXRlLCBpc09iamVjdCwgaXNBcnJheSwgdHJpbSwgRE9NfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvdywgbG9jYXRpb259IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInOyAvLyBkdWUgdG8gd2luZG93Lm9wZW4gYW5kIGxvY2F0aW9uLmhyZWZcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zX2FwaV9pbnRlcmZhY2UnKTtcblxuLyoqXG4gKiBORkMgUmVzcG9uc2UgRGF0YSBTdG9yYWdlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5sZXQgTmZjUmVzcG9uc2VEYXRhID0ge1xuICBSRklkOiAwLFxuICBQZXJzb25JZDogMFxufTtcblxuLyoqXG4gKiBQb3B1cCBCdXR0b25cbiAqIEBjbGFzcyBQb3B1cEJ1dHRvblxuICovXG5jbGFzcyBQb3B1cEJ1dHRvbiB7XG4gIC8qKlxuICAgKiBQb3B1cCBCdXR0b24gQ29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgUG9wdXAgQnV0dG9uIG5hbWVcbiAgICovXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgbGV0IGVsID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGVsLnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLXBvcHVwJyk7XG4gICAgZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3BvcHVwJyk7XG4gICAgdGhpcy5lbGVtZW50ID0gZWw7XG4gIH1cbiAgLyoqXG4gICAqIEdldCBQb3B1cCBCdXR0b24gbmFtZVxuICAgKiBAcmV0dXJucyB7bmFtZX1cbiAgICovXG4gIG5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsYmFja1xuICAgKi9cbiAgY2FsbGJhY2soKSB7XG4gICAgbGV0IGNiID0gdGhpcy5jYWxsYmFjaztcbiAgICBsZXQgbmFtZSA9IGNiLm5hbWU7XG4gICAgaWYgKGlzRnVuY3Rpb24oY2IpKSB7XG4gICAgICBjYi5jYWxsKG51bGwsIG5hbWUpO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogQG5hbWUgdG9IVE1MXG4gICAqIFJldHVybnMgSFRNTCBOb2RlIGNvbnRhaW5pbmcgdGhlIFBvcHVwQnV0dG9uLlxuICAgKiBAcmV0dXJucyB7UG9wdXBCdXR0b24uZWxlbWVudHxIVE1MTm9kZX1cbiAgICovXG4gIHRvSFRNTCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbGVtZW50O1xuICB9XG59XG5cbi8qKlxuICogQmVhY29uIExpc3RcbiAqIEB0eXBlIHtBcnJheXxudWxsfVxuICovXG5sZXQgYmVhY29uTGlzdCA9IG51bGw7XG5cbi8qKlxuICogR2xvYmFsIERhdGEgU3RvcmFnZVxuICogQHR5cGUge2Jvb2xlYW58T2JqZWN0fVxuICovXG5sZXQgZ2xvYmFsRGF0YSA9IGZhbHNlO1xuXG4vKipcbiAqIEFsbCBwdWJsaWMgY2hheW5zIG1ldGhvZHMgdG8gaW50ZXJhY3Qgd2l0aCAqQ2hheW5zIEFwcCogb3IgKkNoYXlucyBXZWIqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5leHBvcnQgdmFyIGNoYXluc0FwaUludGVyZmFjZSA9IHtcblxuXG4gIC8qKlxuICAgKiBFbmFibGUgb3IgZGlzYWJsZSBQdWxsVG9SZWZyZXNoXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWxsb3dQdWxsIEFsbG93IFB1bGxUb1JlZnJlc2hcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjZWVkZWRcbiAgICovXG4gIHNldFB1bGxUb1JlZnJlc2g6IGZ1bmN0aW9uKGFsbG93UHVsbCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMCxcbiAgICAgIHdlYkZuOiBmYWxzZSwgLy8gY291bGQgYmUgb21pdHRlZFxuICAgICAgcGFyYW1zOiBbeydib29sJzogYWxsb3dQdWxsfV1cbiAgICB9KTtcbiAgfSxcbiAgLy8gVE9ETzogcmVuYW1lIHRvIGVuYWJsZVB1bGxUb1JlZnJlc2hcbiAgYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaCh0cnVlKTtcbiAgfSxcbiAgZGlzYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaChmYWxzZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3Nob3dDdXJzb3JdIElmIHRydWUgdGhlIHdhaXRjdXJzb3Igd2lsbCBiZSBzaG93blxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgaXQgd2lsbCBiZSBoaWRkZW5cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZXRXYWl0Y3Vyc29yOiBmdW5jdGlvbihzaG93Q3Vyc29yKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxLFxuICAgICAgd2ViRm46IChzaG93Q3Vyc29yID8gJ3Nob3cnIDogJ2hpZGUnKSArICdMb2FkaW5nQ3Vyc29yJyxcbiAgICAgIHBhcmFtczogW3snYm9vbCc6IHNob3dDdXJzb3J9XVxuICAgIH0pO1xuICB9LFxuICBzaG93V2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKHRydWUpO1xuICB9LFxuICBoaWRlV2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKGZhbHNlKTtcbiAgfSxcblxuICAvLyBUT0RPOiByZW5hbWUgaXQgdG8gb3BlblRhcHA/XG4gIC8qKlxuICAgKiBTZWxlY3QgZGlmZmVyZW50IFRhcHAgaWRlbnRpZmllZCBieSBUYXBwSUQgb3IgSW50ZXJuYWxUYXBwTmFtZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGFiIFRhcHAgTmFtZSBvciBUYXBwIElEXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAob3B0aW9uYWwpIHBhcmFtIFVSTCBQYXJhbWV0ZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZWxlY3RUYWI6IGZ1bmN0aW9uKHRhYiwgcGFyYW0pIHtcblxuICAgIGxldCBjbWQgPSAxMzsgLy8gc2VsZWN0VGFiIHdpdGggcGFyYW0gQ2hheW5zQ2FsbFxuXG4gICAgLy8gdXBkYXRlIHBhcmFtOiBzdHJpcCA/IGFuZCBlbnN1cmUgJiBhdCB0aGUgYmVnaW5cbiAgICBpZiAocGFyYW0gJiYgIXBhcmFtLm1hdGNoKC9eWyZ8XFw/XS8pKSB7IC8vIG5vICYgYW5kIG5vID9cbiAgICAgIHBhcmFtID0gJyYnICsgcGFyYW07XG4gICAgfSBlbHNlIGlmIChwYXJhbSkge1xuICAgICAgcGFyYW0gPSBwYXJhbS5yZXBsYWNlKCc/JywgJyYnKTtcbiAgICB9IGVsc2UgeyAvLyBubyBwYXJhbXMsIGRpZmZlcmVudCBDaGF5bnNDYWxsXG4gICAgICBjbWQgPSAyO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgd2ViRm46ICdzZWxlY3RvdGhlcnRhYicsXG4gICAgICBwYXJhbXM6IGNtZCA9PT0gMTNcbiAgICAgICAgPyBbeydzdHJpbmcnOiB0YWJ9LCB7J3N0cmluZyc6IHBhcmFtfV1cbiAgICAgICAgOiBbeydzdHJpbmcnOiB0YWJ9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBUYWI6IHRhYixcbiAgICAgICAgUGFyYW1ldGVyOiBwYXJhbVxuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwMiwgaW9zOiAxMzgzLCB3cDogMjQ2OSB9IC8vIGZvciBuYXRpdmUgYXBwcyBvbmx5XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBBbGJ1bVxuICAgKiBUT0RPOiByZW5hbWUgdG8gb3BlblxuICAgKlxuICAgKiBAcGFyYW0ge2lkfHN0cmluZ30gaWQgQWxidW0gSUQgKEFsYnVtIE5hbWUgd2lsbCB3b3JrIGFzIHdlbGwsIGJ1dCBkbyBwcmVmZXIgSURzKVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNlbGVjdEFsYnVtOiBmdW5jdGlvbihpZCkge1xuICAgIGlmICghaXNTdHJpbmcoaWQpICYmICFpc051bWJlcihpZCkpIHtcbiAgICAgIGxvZy5lcnJvcignc2VsZWN0QWxidW06IGludmFsaWQgYWxidW0gbmFtZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMsXG4gICAgICB3ZWJGbjogJ3NlbGVjdEFsYnVtJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogaWR9XSxcbiAgICAgIHdlYlBhcmFtczogaWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBQaWN0dXJlXG4gICAqIChvbGQgU2hvd1BpY3R1cmUpXG4gICAqIEFuZHJvaWQgZG9lcyBub3Qgc3VwcG9ydCBnaWZzIDooXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgSW1hZ2UgVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuUGljdHVyZTogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goL2pwZyR8cG5nJHxnaWYkL2kpKSB7IC8vIFRPRE86IG1vcmUgaW1hZ2UgdHlwZXM/XG4gICAgICBsb2cuZXJyb3IoJ29wZW5QaWN0dXJlOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQsXG4gICAgICB3ZWJGbjogJ3Nob3dQaWN0dXJlJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybCxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNjM2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICogVE9ETzogaW1wbGVtZW50IGludG8gQ2hheW5zIFdlYj9cbiAgICogVE9ETzogcmVuYW1lIHRvIHNldD9cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHQgVGhlIEJ1dHRvbidzIHRleHRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgY2FwdGlvbiBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbih0ZXh0LCBjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy9sb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIHZhbGlkIGNhbGxiYWNrIEZ1bmN0aW9uLicpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpcyBubyB2YWxpZCBjYWxsYmFjayBGdW5jdGlvbi4nKTtcbiAgICAgIC8vcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NhcHRpb25CdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNSxcbiAgICAgIHBhcmFtczogW3tzdHJpbmc6IHRleHR9LCB7Y2FsbGJhY2s6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIGEgQ2FwdGlvbiBCdXR0b24uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqIFRoZSBjYXB0aW9uIGJ1dHRvbiBpcyB0aGUgdGV4dCBhdCB0aGUgdG9wIHJpZ2h0IG9mIHRoZSBhcHAuXG4gICAqIChtYWlubHkgdXNlZCBmb3IgbG9naW4gb3IgdGhlIHVzZXJuYW1lKVxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhpZGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDYsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTgsIGlvczogMTM2Niwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBGYWNlYm9vayBDb25uZWN0XG4gICAqIE5PVEU6IHByZWZlciBgY2hheW5zLmxvZ2luKClgIG92ZXIgdGhpcyBtZXRob2QgdG8gcGVyZm9ybSBhIHVzZXIgbG9naW4uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJ10gRmFjZWJvb2sgUGVybWlzc2lvbnMsIHNlcGFyYXRlZCBieSBjb21tYVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3JlbG9hZFBhcmFtID0gJ2NvbW1lbnQnXSBSZWxvYWQgUGFyYW1cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAvLyBUT0RPOiB0ZXN0IHBlcm1pc3Npb25zXG4gIGZhY2Vib29rQ29ubmVjdDogZnVuY3Rpb24ocGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJywgcmVsb2FkUGFyYW0gPSAnY29tbWVudCcpIHtcbiAgICByZWxvYWRQYXJhbSA9IHJlbG9hZFBhcmFtO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNyxcbiAgICAgIHdlYkZuOiAnZmFjZWJvb2tDb25uZWN0JyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogcGVybWlzc2lvbnN9LCB7J0Z1bmN0aW9uJzogJ0V4ZWNDb21tYW5kPVwiJyArIHJlbG9hZFBhcmFtICsgJ1wiJ31dLFxuICAgICAgd2ViUGFyYW1zOiB7XG4gICAgICAgIFJlbG9hZFBhcmFtZXRlcjogJ0V4ZWNDb21tYW5kPScgKyByZWxvYWRQYXJhbSxcbiAgICAgICAgUGVybWlzc2lvbnM6IHBlcm1pc3Npb25zXG4gICAgICB9LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU5LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBmYWxsYmFja0NtZDogOCAvLyBpbiBjYXNlIHRoZSBhYm92ZSBpcyBub3Qgc3VwcG9ydCB0aGUgZmFsbGJhY2tDbWQgd2lsbCByZXBsYWNlIHRoZSBjbWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBMaW5rIGluIEJyb3dzZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBVUkxcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuTGlua0luQnJvd3NlcjogZnVuY3Rpb24odXJsKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA5LFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodXJsLmluZGV4T2YoJzovLycpID09PSAtMSkge1xuICAgICAgICAgIHVybCA9ICcvLycgKyB1cmw7IC8vIG9yIGFkZCBsb2NhdGlvbi5wcm90b2NvbCBwcmVmaXggYW5kIC8vIFRPRE86IHRlc3RcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cub3Blbih1cmwsICdfYmxhbmsnKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNDY2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNob3cgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgYmFjayBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzaG93QmFja0J1dHRvbjogZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgICBjaGF5bnNBcGlJbnRlcmZhY2UuaGlkZUJhY2tCdXR0b24oKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmFja0J1dHRvbkNhbGxiYWNrKCknO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhpZGUgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBoaWRlQmFja0J1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogT3BlbiBJbnRlckNvbS5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBvcGVuSW50ZXJDb206IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTIsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDIsIGlvczogMTM4Mywgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgR2VvbG9jYXRpb24uXG4gICAqIG5hdGl2ZSBhcHBzIG9ubHkgKGJ1dCBjb3VsZCB3b3JrIGluIHdlYiBhcyB3ZWxsLCBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pXG4gICAqXG4gICAqIFRPRE86IGNvbnRpbnVvdXNUcmFja2luZyB3YXMgcmVtb3ZlZFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB3aGVuIHRoZSBiYWNrIGJ1dHRvbiB3YXMgY2xpY2tlZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGdldEdlb0xvY2F0aW9uOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdnZXRHZW9Mb2NhdGlvbkNhbGxiYWNrKCknO1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy8gVE9ETzogcmVtb3ZlIGNvbnNvbGVcbiAgICAgIC8vIFRPRE86IGFsbG93IGVtcHR5IGNhbGxiYWNrcyB3aGVuIGl0IGlzIGFscmVhZHkgc2V0XG4gICAgICBjb25zb2xlLndhcm4oJ25vIGNhbGxiYWNrIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNDY2LCB3cDogMjQ2OSB9LFxuICAgICAgLy93ZWJGbjogZnVuY3Rpb24oKSB7IG5hdmlnYXRvci5nZW9sb2NhdGlvbjsgfVxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gVmlkZW9cbiAgICogKG9sZCBTaG93VmlkZW8pXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVmlkZW8gVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuVmlkZW86IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSB8fCAhdXJsLm1hdGNoKC8uKlxcLi57Mix9LykpIHsgLy8gVE9ETzogV1RGIFJlZ2V4XG4gICAgICBsb2cuZXJyb3IoJ29wZW5WaWRlbzogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNSxcbiAgICAgIHdlYkZuOiAnc2hvd1ZpZGVvJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybFxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaG93IERpYWxvZ1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0ge2NvbnRlbnQ6e1N0cmluZ30gLCBoZWFkbGluZTogLGJ1dHRvbnM6e0FycmF5fSwgbm9Db250ZW50blBhZGRpbmc6LCBvbkxvYWQ6fVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHNob3dEaWFsb2c6IGZ1bmN0aW9uIHNob3dEaWFsb2cob2JqKSB7XG4gICAgaWYgKCFvYmogfHwgIWlzT2JqZWN0KG9iaikpIHtcbiAgICAgIGxvZy53YXJuKCdzaG93RGlhbG9nOiBpbnZhbGlkIHBhcmFtZXRlcnMnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKG9iai5jb250ZW50KSkge1xuICAgICAgb2JqLmNvbnRlbnQgPSB0cmltKG9iai5jb250ZW50LnJlcGxhY2UoLzxiclsgL10qPz4vZywgJ1xcbicpKTtcbiAgICB9XG4gICAgaWYgKCFpc0FycmF5KG9iai5idXR0b25zKSB8fCBvYmouYnV0dG9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9iai5idXR0b25zID0gWyhuZXcgUG9wdXBCdXR0b24oJ09LJykpLnRvSFRNTCgpXTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ0NoYXluc0RpYWxvZ0NhbGxCYWNrKCknO1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm4oYnV0dG9ucywgaWQpIHtcbiAgICAgIGlkID0gcGFyc2VJbnQoaWQsIDEwKSAtIDE7XG4gICAgICBpZiAoYnV0dG9uc1tpZF0pIHtcbiAgICAgICAgYnV0dG9uc1tpZF0uY2FsbGJhY2suY2FsbChudWxsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE2LCAvLyBUT0RPOiBpcyBzbGl0dGU6Ly9cbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouaGVhZGxpbmV9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5jb250ZW50fSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouYnV0dG9uc1swXS5uYW1lfSAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICAgIC8veydzdHJpbmcnOiBvYmouYnV0dG9uc1sxXS5uYW1lfSwgLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgICAvL3snc3RyaW5nJzogb2JqLmJ1dHRvbnNbMl0ubmFtZX0gLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgXSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgb2JqLmJ1dHRvbnMpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2MDZ9LFxuICAgICAgZmFsbGJhY2tGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdmYWxsYmFjayBwb3B1cCcsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogRm9ybWVybHkga25vd24gYXMgZ2V0QXBwSW5mb3NcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aXRoIHRoZSBBcHBEYXRhXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gICAgLy8gVE9ETzogdXNlIGZvcmNlUmVsb2FkIGFuZCBjYWNoZSBBcHBEYXRhXG4gIGdldEdsb2JhbERhdGE6IGZ1bmN0aW9uKGZvcmNlUmVsb2FkKSB7XG4gICAgaWYgKCFmb3JjZVJlbG9hZCAmJiBnbG9iYWxEYXRhKSB7XG4gICAgICBsb2cuZGVidWcoJ2dldEdsb2JhbERhdGE6IHJldHVybiBjYWNoZWQgZGF0YScpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShnbG9iYWxEYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAxOCxcbiAgICAgICAgd2ViRm46ICdnZXRBcHBJbmZvcycsXG4gICAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiAnZ2V0R2xvYmFsRGF0YSgpJ31dLCAvLyBjYWxsYmFjayBwYXJhbSBvbmx5IG9uIG1vYmlsZVxuICAgICAgICBjYjogcmVzb2x2ZSxcbiAgICAgICAgb25FcnJvcjogcmVqZWN0XG4gICAgICB9KTtcblxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWJyYXRlXG4gICAqIEBwYXJhbSB7SW50ZWdlcn0gZHVyYXRpb24gVGltZSBpbiBtaWxsaXNlY29uZHNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgdmlicmF0ZTogZnVuY3Rpb24oZHVyYXRpb24pIHtcbiAgICBpZiAoIWlzTnVtYmVyKGR1cmF0aW9uKSB8fCBkdXJhdGlvbiA8IDIpIHtcbiAgICAgIGR1cmF0aW9uID0gMTUwO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE5LFxuICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogZHVyYXRpb24udG9TdHJpbmcoKX1dLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uIG5hdmlnYXRvclZpYnJhdGUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbmF2aWdhdG9yLnZpYnJhdGUoMTAwKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGxvZy5pbmZvKCd2aWJyYXRlOiB0aGUgZGV2aWNlIGRvZXMgbm90IHN1cHBvcnQgdmlicmF0ZScpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2OTUsIGlvczogMjU5Niwgd3A6IDI1MTV9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE5hdmlnYXRlIEJhY2suXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgbmF2aWdhdGVCYWNrOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDIwLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjY5NiwgaW9zOiAyNjAwLCB3cDogMjUxNX1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSW1hZ2UgVXBsb2FkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2l0aCBpbWFnZSB1cmwgYWZ0ZXIgdXBsb2FkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHVwbG9hZEltYWdlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCd1cGxvYWRJbWFnZTogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdpbWFnZVVwbG9hZENhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjEsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBpbnB1dCA9IERPTS5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAnZmlsZScpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ3ZhbHVlJywgJycpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ2FjY2VwdCcsICdpbWFnZS8qJyk7XG4gICAgICAgIC8vaW5wdXQuc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtaW1hZ2UtdXBsb2FkLWZpZWxkKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCdvbmNoYW5nZScsICdpbWFnZUNob3NlbigpJyk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2hheW5zX191cGxvYWQtaW1hZ2UnKTtcbiAgICAgICAgRE9NLnF1ZXJ5KCcjY2hheW5zLXJvb3QnKS5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgICAgIC8vdmFyIGZkID0gbmV3IEZvcm1EYXRhKCk7XG4gICAgICAgIC8vZmQuYXBwZW5kKFwiSW1hZ2VcIiwgZmlsZVswXSk7XG4gICAgICAgIC8vd2luZG93LmltYWdlQ2hvc2VuID0gd2luZG93LmZldGNoKHtcbiAgICAgICAgLy8gIHR5cGU6IFwiUE9TVFwiLFxuICAgICAgICAvLyAgdXJsOiBcIi8vY2hheW5zMS50b2JpdC5jb20vVGFwcEFwaS9GaWxlL0ltYWdlXCIsXG4gICAgICAgIC8vICBjb250ZW50VHlwZTogZmFsc2UsXG4gICAgICAgIC8vICBwcm9jZXNzRGF0YTogZmFsc2UsXG4gICAgICAgIC8vICBjYWNoZTogZmFsc2UsXG4gICAgICAgIC8vICBkYXRhOiBmZFxuICAgICAgICAvL30pLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAvLyAgZGVsZXRlIHdpbmRvdy5pbWFnZUNob3NlbjtcbiAgICAgICAgLy8gIGNhbGxiYWNrLmNhbGwobnVsbCwgZGF0YSk7XG4gICAgICAgIC8vfSk7XG4gICAgICAgIC8vJChcIiNDaGF5bnNJbWFnZVVwbG9hZFwiKS5jbGljaygpO1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzA1LCB3cDogMjUzOCwgaW9zOiAyNjQyfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZXQgTkZDIENhbGxiYWNrXG4gICAqIFRPRE86IHJlZmFjdG9yIGFuZCB0ZXN0XG4gICAqIFRPRE86IHdoeSB0d28gY2FsbHM/XG4gICAqIENhbiB3ZSBpbXByb3ZlIHRoaXMgc2hpdD8gc3BsaXQgaW50byB0d28gbWV0aG9kc1xuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiBmb3IgTkZDXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHNldE5mY0NhbGxiYWNrOiBmdW5jdGlvbihjYWxsYmFjaywgcmVzcG9uc2UpIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMzcsXG4gICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgfSkgJiYgYXBpQ2FsbCh7XG4gICAgICAgICAgY21kOiAzNyxcbiAgICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmFyIGNtZCA9IChyZXNwb25zZSA9PT0gbmZjUmVzcG9uc2VEYXRhLlBlcnNvbklkKSA/IDM3IDogMzg7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IGNtZCA9PT0gMzcgPyAzOCA6IDM3LFxuICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgIH0pICYmIGFwaUNhbGwoe1xuICAgICAgY21kOiBjbWQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogJ05mY0NhbGxiYWNrJ31dLCAvLyBjYWxsYmFjayBwYXJhbSBvbmx5IG9uIG1vYmlsZVxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAzMjM0LCB3cDogMzEyMSB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFZpZGVvIFBsYXllciBDb250cm9sc1xuICAgKiBBY3V0YWxseSBuYXRpdmUgb25seVxuICAgKiBUT0RPOiBjb3VsZCB0aGVvcmV0aWNhbGx5IHdvcmsgaW4gQ2hheW5zIFdlYlxuICAgKiBUT0RPOiBleGFtcGxlPyB3aGVyZSBkb2VzIHRoaXMgd29yaz9cbiAgICovXG4gIHBsYXllcjoge1xuICAgIHVzZURlZmF1bHRVcmw6IGZ1bmN0aW9uIHVzZURlZmF1bHRVcmwoKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjIsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGNoYW5nZVVybDogZnVuY3Rpb24gY2hhbmdlVXJsKHVybCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIyLFxuICAgICAgICBwYXJhbXM6IFt7J1N0cmluZyc6IHVybH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgaGlkZUJ1dHRvbjogZnVuY3Rpb24gaGlkZUJ1dHRvbigpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMyxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgc2hvd0J1dHRvbjogZnVuY3Rpb24gc2hvd0J1dHRvbigpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMyxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMX1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGF1c2U6IGZ1bmN0aW9uIHBhdXNlVmlkZW8oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjQsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBsYXk6IGZ1bmN0aW9uIHBsYXlWaWRlbygpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNCxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMX1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGxheWJhY2tTdGF0dXM6IGZ1bmN0aW9uIHBsYXliYWNrU3RhdHVzKGNhbGxiYWNrKSB7XG5cbiAgICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2UuZ2V0R2xvYmFsRGF0YShmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKG51bGwsIHtcbiAgICAgICAgICBBcHBDb250cm9sVmlzaWJsZTogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5Jc0FwcENvbnRyb2xWaXNpYmxlLFxuICAgICAgICAgIFN0YXR1czogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5QbGF5YmFja1N0YXR1cyxcbiAgICAgICAgICBVcmw6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uU3RyZWFtVXJsXG4gICAgICAgIH0pO1xuICAgICAgfSwgdHJ1ZSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBCbHVldG9vdGhcbiAgICogT25seSBpbiBuYXRpdmUgQXBwcyAoaW9zIGFuZCBhbmRyb2lkKVxuICAgKi9cbiAgYmx1ZXRvb3RoOiB7XG4gICAgTEVTZW5kU3RyZW5ndGg6IHsgLy8gVE9ETzogd2hhdCBpcyB0aGF0P1xuICAgICAgQWRqYWNlbnQ6IDAsXG4gICAgICBOZWFyYnk6IDEsXG4gICAgICBEZWZhdWx0OiAyLFxuICAgICAgRmFyOiAzXG4gICAgfSxcbiAgICBMRVNjYW46IGZ1bmN0aW9uIExFU2NhbihjYWxsYmFjaykge1xuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBsb2cud2FybignTEVTY2FuOiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snO1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI2LFxuICAgICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgTEVDb25uZWN0OiBmdW5jdGlvbiBMRUNvbm5lY3QoYWRkcmVzcywgY2FsbGJhY2ssIHBhc3N3b3JkKSB7XG4gICAgICBpZiAoIWlzU3RyaW5nKGFkZHJlc3MpIHx8ICFpc0JMRUFkZHJlc3MoYWRkcmVzcykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFQ29ubmVjdDogbm8gdmFsaWQgYWRkcmVzcyBwYXJhbWV0ZXInKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBsb2cud2FybignTEVDb25uZWN0OiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzU3RyaW5nKHBhc3N3b3JkKSB8fCAhcGFzc3dvcmQubWF0Y2goL15bMC05YS1mXXs2LDEyfSQvaSkpIHtcbiAgICAgICAgcGFzc3dvcmQgPSAnJztcbiAgICAgIH1cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjayc7XG5cbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNyxcbiAgICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBhZGRyZXNzfSwgeydzdHJpbmcnOiBwYXNzd29yZH1dLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBUT0RPOiBjb25zaWRlciBPYmplY3QgYXMgcGFyYW1ldGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFkZHJlc3NcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHN1YklkXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBtZWFzdXJlUG93ZXJcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IHNlbmRTdHJlbmd0aFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICovXG4gICAgTEVXcml0ZTogZnVuY3Rpb24gTEVXcml0ZShhZGRyZXNzLCBzdWJJZCwgbWVhc3VyZVBvd2VyLCBzZW5kU3RyZW5ndGgsIGNhbGxiYWNrKSB7XG4gICAgICBpZiAoIWlzU3RyaW5nKGFkZHJlc3MpIHx8ICFpc0JMRUFkZHJlc3MoYWRkcmVzcykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFV3JpdGU6IG5vIHZhbGlkIGFkZHJlc3MgcGFyYW1ldGVyJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIoc3ViSWQpIHx8IHN1YklkIDwgMCB8fCBzdWJJZCA+IDQwOTUpIHtcbiAgICAgICAgc3ViSWQgPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKG1lYXN1cmVQb3dlcikgfHwgbWVhc3VyZVBvd2VyIDwgLTEwMCB8fCBtZWFzdXJlUG93ZXIgPiAwKSB7XG4gICAgICAgIG1lYXN1cmVQb3dlciA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIoc2VuZFN0cmVuZ3RoKSB8fCBzZW5kU3RyZW5ndGggPCAwIHx8IHNlbmRTdHJlbmd0aCA+IDMpIHtcbiAgICAgICAgc2VuZFN0cmVuZ3RoID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgICBjYWxsYmFjayA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjaycsXG4gICAgICAgIHVpZCA9ICc3QTA3RTE3QS1BMTg4LTQxNkUtQjdBMC01QTM2MDY1MTNFNTcnO1xuXG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjgsXG4gICAgICAgIHBhcmFtczogW1xuICAgICAgICAgIHsnc3RyaW5nJzogYWRkcmVzc30sXG4gICAgICAgICAgeydzdHJpbmcnOiB1aWR9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IHN1YklkfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBtZWFzdXJlUG93ZXJ9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IHNlbmRTdHJlbmd0aH1cbiAgICAgICAgXSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICAvLyBUT0RPOyB1c2UgYE9iamVjdGAgYXMgcGFyYW1zXG4gIC8vIFRPRE86IHdoYXQgYXJlIG9wdGlvbmFsIHBhcmFtcz8gdmFsaWRhdGUgbmFtZSBhbmQgbG9jYXRpb24/XG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBBcHBvaW50bWVudCdzIG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IGxvY2F0aW9uIEFwcG9pbnRtZW50J3MgbG9jYXRpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IFtkZXNjcmlwdGlvbl0gQXBwb2ludG1lbnQncyBkZXNjcmlwdGlvblxuICAgKiBAcGFyYW0ge0RhdGV9IHN0YXJ0IEFwcG9pbnRtZW50cydzIFN0YXJ0RGF0ZVxuICAgKiBAcGFyYW0ge0RhdGV9IGVuZCBBcHBvaW50bWVudHMncyBFbmREYXRlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2F2ZUFwcG9pbnRtZW50OiBmdW5jdGlvbiBzYXZlQXBwb2ludG1lbnQobmFtZSwgbG9jYXRpb24sIGRlc2NyaXB0aW9uLCBzdGFydCwgZW5kKSB7XG4gICAgaWYgKCFpc1N0cmluZyhuYW1lKSB8fCAhaXNTdHJpbmcobG9jYXRpb24pKSB7XG4gICAgICBsb2cud2Fybignc2F2ZUFwcG9pbnRtZW50OiBubyB2YWxpZCBuYW1lIGFuZC9vciBsb2NhdGlvbicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWlzRGF0ZShzdGFydCkgfHwgIWlzRGF0ZShlbmQpKSB7XG4gICAgICBsb2cud2Fybignc2F2ZUFwcG9pbnRtZW50OiBzdGFydCBhbmQvb3IgZW5kRGF0ZSBpcyBubyB2YWxpZCBEYXRlIGBPYmplY3RgLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBzdGFydCA9IHBhcnNlSW50KHN0YXJ0LmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcbiAgICBlbmQgPSBwYXJzZUludChlbmQuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAyOSxcbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J3N0cmluZyc6IG5hbWV9LFxuICAgICAgICB7J3N0cmluZyc6IGxvY2F0aW9ufSxcbiAgICAgICAgeydzdHJpbmcnOiBkZXNjcmlwdGlvbn0sXG4gICAgICAgIHsnSW50ZWdlcic6IHN0YXJ0fSxcbiAgICAgICAgeydJbnRlZ2VyJzogZW5kfVxuICAgICAgXSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMDU0LCBpb3M6IDMwNjcsIHdwOiAzMDMwfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBEYXRlVHlwZXMgRW51bVxuICAgKiBzdGFydHMgYXQgMVxuICAgKi9cbiAgZGF0ZVR5cGU6IHtcbiAgICBkYXRlOiAxLFxuICAgIHRpbWU6IDIsXG4gICAgZGF0ZVRpbWU6IDNcbiAgfSxcblxuICAvKipcbiAgICogU2VsZWN0IERhdGVcbiAgICogT2xkOiBEYXRlU2VsZWN0XG4gICAqIE5hdGl2ZSBBcHBzIG9ubHkuIFRPRE86IGFsc28gaW4gQ2hheW5zIFdlYj8gSFRNTDUgRGF0ZXBpY2tlciBldGNcbiAgICogVE9ETzsgcmVjb25zaWRlciBvcmRlciBldGNcbiAgICogQHBhcmFtIHtkYXRlVHlwZXxOdW1iZXJ9IGRhdGVUeXBlIEVudW0gMS0yOiB0aW1lLCBkYXRlLCBkYXRldGltZS4gdXNlIGNoYXlucy5kYXRlVHlwZVxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBwcmVTZWxlY3QgUHJlc2V0IHRoZSBEYXRlIChlLmcuIGN1cnJlbnQgRGF0ZSlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gdGhhdCByZWNlaXZlcyB0aGUgY2hvc2VuIERhdGUgYXMgVGltZXN0YW1wXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IG1pbkRhdGUgTWluaW11bSBTdGFydERhdGVcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gbWF4RGF0ZSBNYXhpbXVtIEVuZERhdGVcbiAgICovXG4gIHNlbGVjdERhdGU6IGZ1bmN0aW9uIHNlbGVjdERhdGUoZGF0ZVR5cGUsIHByZVNlbGVjdCwgY2FsbGJhY2ssIG1pbkRhdGUsIG1heERhdGUpIHtcblxuICAgIGlmICghaXNOdW1iZXIoZGF0ZVR5cGUpIHx8IGRhdGVUeXBlIDw9IDApIHtcbiAgICAgIGxvZy53YXJuKCdzZWxlY3REYXRlOiB3cm9uZyBkYXRlVHlwZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2Fybignc2VsZWN0RGF0ZTogY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdmFsaWRhdGVWYWx1ZSh2YWx1ZSkge1xuICAgICAgaWYgKCFpc051bWJlcih2YWx1ZSkpIHtcbiAgICAgICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gcGFyc2VJbnQodmFsdWUuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcHJlU2VsZWN0ID0gdmFsaWRhdGVWYWx1ZShwcmVTZWxlY3QpO1xuICAgIG1pbkRhdGUgPSB2YWxpZGF0ZVZhbHVlKG1pbkRhdGUpO1xuICAgIG1heERhdGUgPSB2YWxpZGF0ZVZhbHVlKG1heERhdGUpO1xuXG4gICAgbGV0IGRhdGVSYW5nZSA9ICcnO1xuICAgIGlmIChtaW5EYXRlID4gLTEgJiYgbWF4RGF0ZSA+IC0xKSB7XG4gICAgICBkYXRlUmFuZ2UgPSAnLCcgKyBtaW5EYXRlICsgJywnICsgbWF4RGF0ZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ3NlbGVjdERhdGVDYWxsYmFjayc7XG4gICAgZnVuY3Rpb24gY2FsbGJhY2tGbihjYWxsYmFjaywgZGF0ZVR5cGUsIHByZVNlbGVjdCwgdGltZSkge1xuICAgICAgLy8gVE9ETzogaW1wb3J0YW50IHZhbGlkYXRlIERhdGVcbiAgICAgIC8vIFRPRE86IGNob29zZSByaWdodCBkYXRlIGJ5IGRhdGVUeXBlRW51bVxuICAgICAgbG9nLmRlYnVnKGRhdGVUeXBlLCBwcmVTZWxlY3QpO1xuICAgICAgY2FsbGJhY2suY2FsbChudWxsLCB0aW1lID8gbmV3IERhdGUodGltZSkgOiAtMSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMCxcbiAgICAgIHBhcmFtczogW1xuICAgICAgICB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfSxcbiAgICAgICAgeydJbnRlZ2VyJzogZGF0ZVR5cGV9LFxuICAgICAgICB7J0ludGVnZXInOiBwcmVTZWxlY3QgKyBkYXRlUmFuZ2V9XG4gICAgICBdLFxuICAgICAgY2I6IGNhbGxiYWNrRm4uYmluZChudWxsLCBjYWxsYmFjaywgZGF0ZVR5cGUsIHByZVNlbGVjdCksXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzA3MiwgaW9zOiAzMDYyLCB3cDogMzAzMH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBVUkwgaW4gQXBwXG4gICAqIChvbGQgU2hvd1VSTEluQXBwKVxuICAgKiBub3QgdG8gY29uZnVzZSB3aXRoIG9wZW5MaW5rSW5Ccm93c2VyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVmlkZW8gVVJMIHNob3VsZCBjb250YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgICAvLyBUT0RPOiBpbXBsZW1lbnQgQ2hheW5zIFdlYiBNZXRob2QgYXMgd2VsbCAobmF2aWdhdGUgYmFjayBzdXBwb3J0KVxuICBvcGVuVXJsOiBmdW5jdGlvbiBvcGVuVXJsKHVybCwgdGl0bGUpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkpIHtcbiAgICAgIGxvZy5lcnJvcignb3BlblVybDogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMxLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2NhdGlvbi5ocmVmID0gdXJsOyAvLyBUT0RPOiBtYWtlIHN1cmUgaXQgd29ya3NcbiAgICAgIH0sXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH0sIHsnc3RyaW5nJzogdGl0bGV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMTEwLCBpb3M6IDMwNzQsIHdwOiAzMDYzfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBjcmVhdGUgUVIgQ29kZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IGRhdGEgUVIgQ29kZSBkYXRhXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSBiYXNlNjQgZW5jb2RlZCBJTUcgVE9ETzogd2hpY2ggdHlwZT9cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVRUkNvZGU6IGZ1bmN0aW9uIGNyZWF0ZVFSQ29kZShkYXRhLCBjYWxsYmFjaykge1xuICAgIGlmICghaXNTdHJpbmcoZGF0YSkpIHtcbiAgICAgIGRhdGEgPSBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignY3JlYXRlUVJDb2RlOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnY3JlYXRlUVJDb2RlQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogZGF0YX0sIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgMzIyMCwgaW9zOiAxMzcyLCB3cDogMzEwNn0sXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBzY2FuIFFSIENvZGVcbiAgICogU2NhbnMgUVIgQ29kZSBhbmQgcmVhZCBpdFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgcmVzdWx0XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2NhblFSQ29kZTogZnVuY3Rpb24gc2NhblFSQ29kZShjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3NjYW5RUkNvZGU6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdzY2FuUVJDb2RlQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzNCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgMzIyMCwgaW9zOiAxMzcyLCB3cDogMzEwNn0sXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogc2NhbiBRUiBDb2RlXG4gICAqIFNjYW5zIFFSIENvZGUgYW5kIHJlYWQgaXRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGdldExvY2F0aW9uQmVhY29uczogZnVuY3Rpb24gZ2V0TG9jYXRpb25CZWFjb25zKGNhbGxiYWNrLCBmb3JjZVJlbG9hZCkge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ2dldExvY2F0aW9uQmVhY29uczogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2dldEJlYWNvbnNDYWxsQmFjaygpJztcbiAgICBpZiAoYmVhY29uTGlzdCAmJiAhZm9yY2VSZWxvYWQpIHsgLy8gVE9ETzogbWFrZSBzdXJlIGl0IGlzIGdvb2QgdG8gY2FjaGUgdGhlIGxpc3RcbiAgICAgIGxvZy5kZWJ1ZygnZ2V0TG9jYXRpb25CZWFjb25zOiB0aGVyZSBpcyBhbHJlYWR5IG9uZSBiZWFjb25MaXN0Jyk7XG4gICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChudWxsLCBiZWFjb25MaXN0KTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrRm4gPSBmdW5jdGlvbiBnZXRMb2NhdGlvbkJlYWNvbkNhbGxiYWNrKGNhbGxiYWNrLCBsaXN0KSB7XG4gICAgICBiZWFjb25MaXN0ID0gbGlzdDtcbiAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgbGlzdCk7XG4gICAgfTtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDM5LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6ICA0MDQ1LCBpb3M6IDQwNDh9LFxuICAgICAgY2I6IGNhbGxiYWNrRm4uYmluZChudWxsLCBjYWxsYmFjaylcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQWRkIHRvIFBhc3Nib29rXG4gICAqIGlPUyBvbmx5XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgUGF0aCB0byBQYXNzYm9vayBmaWxlXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgYWRkVG9QYXNzYm9vazogZnVuY3Rpb24gYWRkVG9QYXNzYm9vayh1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkpIHtcbiAgICAgIGxvZy53YXJuKCdhZGRUb1Bhc3Nib29rOiB1cmwgaXMgaW52YWxpZC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQ3LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHN1cHBvcnQ6IHtpb3M6IDQwNDV9LFxuICAgICAgd2ViRm46IGNoYXluc0FwaUludGVyZmFjZS5vcGVuTGlua0luQnJvd3Nlci5iaW5kKG51bGwsIHVybCksXG4gICAgICBmYWxsYmFja0ZuOiBjaGF5bnNBcGlJbnRlcmZhY2Uub3BlbkxpbmtJbkJyb3dzZXIuYmluZChudWxsLCB1cmwpXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRvYml0IExvZ2luXG4gICAqIFdpdGggRmFjZWJvb2tDb25uZWN0IEZhbGxiYWNrXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbXMgUmVsb2FkIFBhcmFtZXRlclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGxvZ2luOiBmdW5jdGlvbiBsb2dpbihwYXJhbXMpIHtcbiAgICBwYXJhbXMgPSAnRXhlY0NvbW1hbmQ9JyArIHBhcmFtcztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDU0LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBwYXJhbXN9XSxcbiAgICAgIHN1cHBvcnQ6IHtpb3M6IDQyNDAsIHdwOiA0MDk5fSxcbiAgICAgIGZhbGxiYWNrRm46IGNoYXluc0FwaUludGVyZmFjZS5mYWNlYm9va0Nvbm5lY3QuYmluZChudWxsLCAndXNlcl9mcmllbmRzJywgcGFyYW1zKSxcbiAgICAgIHdlYkZuOiAndG9iaXRjb25uZWN0JyxcbiAgICAgIHdlYlBhcmFtczogcGFyYW1zXG4gICAgfSk7XG4gIH1cblxufTtcbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc1Blcm1pdHRlZCwgaXNGdW5jdGlvbiwgaXNCbGFuaywgaXNBcnJheSwgaXNPYmplY3QsIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHt3aW5kb3csIHBhcmVudH0gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7XG5pbXBvcnQge2Vudmlyb25tZW50fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7c2V0Q2FsbGJhY2t9IGZyb20gJy4vY2FsbGJhY2tzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jb3JlLmNoYXluc19jYWxscycpO1xuXG5cbmZ1bmN0aW9uIGNhbih2ZXJzaW9ucykge1xuICByZXR1cm4gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIGVudmlyb25tZW50Lm9zLCBlbnZpcm9ubWVudC5hcHBWZXJzaW9uKTtcbn1cblxuLy8gT1MgQXBwIFZlcnNpb24gTWFwIGZvciBDaGF5bnMgQ2FsbHMgU3VwcG9ydFxuLy8gVE9ETzogbW92ZSBpbnRvIGVudmlyb25tZW50PyAob3IganVzdCByZW1vdmUgY2F1c2UgaXQgaXMgb25seSB1c2VkIG9uZSB0aW1lIGluIGhlcmUpXG5sZXQgb3NNYXAgPSB7XG4gIGNoYXluc0NhbGw6IHsgYW5kcm9pZDogMjUxMCwgaW9zOiAyNDgzLCB3cDogMjQ2OSwgYmI6IDExOCB9XG59O1xuXG4vKipcbiAqIFB1YmxpYyBDaGF5bnMgSW50ZXJmYWNlXG4gKiBFeGVjdXRlIEFQSSBDYWxsXG4gKlxuICogQHBhcmFtIHVybFxuICogQHBhcmFtIHBhcmFtc1xuICogQHBhcmFtIGRlYm91bmNlXG4gKiAvLyBUT0RPOiBsZWZ0IG9mIGNhbGxiYWNrIGFzIHByb21pc2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwaUNhbGwob2JqKSB7XG5cbiAgbGV0IGRlYm91bmNlID0gb2JqLmRlYm91bmNlIHx8IGZhbHNlO1xuXG4gIC8vIFRPRE86IGNoZWNrIG9iai5vcyBWRVJTSU9OXG5cbiAgZnVuY3Rpb24gZXhlY3V0ZUNhbGwoY2hheW5zQ2FsbE9iaikge1xuXG4gICAgaWYgKGVudmlyb25tZW50LmNhbkNoYXluc0NhbGwgJiYgY2FuKG9zTWFwLmNoYXluc0NhbGwpKSB7XG4gICAgICAvLyBUT0RPOiBjb25zaWRlciBjYWxsUXVldWUgYW5kIEludGVydmFsIHRvIHByZXZlbnQgZXJyb3JzXG4gICAgICBsb2cuZGVidWcoJ2V4ZWN1dGVDYWxsOiBjaGF5bnMgY2FsbCAnLCBjaGF5bnNDYWxsT2JqLmNtZCk7XG5cbiAgICAgIGlmICgnY2InIGluIGNoYXluc0NhbGxPYmogJiYgaXNGdW5jdGlvbihjaGF5bnNDYWxsT2JqLmNiKSkge1xuICAgICAgICBzZXRDYWxsYmFjayhjaGF5bnNDYWxsT2JqLmNhbGxiYWNrTmFtZSB8fCBjaGF5bnNDYWxsT2JqLnBhcmFtc1swXS5jYWxsYmFjaywgY2hheW5zQ2FsbE9iai5jYiwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBpZiAoaXNPYmplY3QoY2hheW5zQ2FsbE9iai5zdXBwb3J0KSAmJiAhY2FuKGNoYXluc0NhbGxPYmouc3VwcG9ydCkpIHtcbiAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiB0aGUgY2hheW5zIHZlcnNpb24gaXMgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgICBpZiAoY2hheW5zQ2FsbE9iai5mYWxsYmFja0NtZCkge1xuICAgICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogZmFsbGJhY2sgY2hheW5zIGNhbGwgd2lsbCBiZSBpbnZva2VkJyk7XG4gICAgICAgICAgcmV0dXJuIGNoYXluc0NhbGwoY2hheW5zQ2FsbE9iai5mYWxsYmFja0NtZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5mYWxsYmFja0ZuKSkge1xuICAgICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogZmFsbGJhY2tGbiB3aWxsIGJlIGludm9rZWQnKTtcbiAgICAgICAgICByZXR1cm4gY2hheW5zQ2FsbE9iai5mYWxsYmFja0ZuLmNhbGwobnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNoYXluc0NhbGwoY2hheW5zQ2FsbE9iai5jbWQsIGNoYXluc0NhbGxPYmoucGFyYW1zKTtcblxuICAgIH0gZWxzZSBpZiAoZW52aXJvbm1lbnQuY2FuQ2hheW5zV2ViQ2FsbCkge1xuXG4gICAgICBpZiAoJ2NiJyBpbiBjaGF5bnNDYWxsT2JqICYmIGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5jYikpIHtcbiAgICAgICAgc2V0Q2FsbGJhY2soY2hheW5zQ2FsbE9iai53ZWJGbiwgY2hheW5zQ2FsbE9iai5jYik7XG4gICAgICB9XG4gICAgICBpZiAoIWNoYXluc0NhbGxPYmoud2ViRm4pIHtcbiAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBUaGlzIENhbGwgaGFzIG5vIHdlYkZuJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgbG9nLmRlYnVnKCdleGVjdXRlQ2FsbDogY2hheW5zIHdlYiBjYWxsICcsIGNoYXluc0NhbGxPYmoud2ViRm4ubmFtZSB8fCBjaGF5bnNDYWxsT2JqLndlYkZuKTtcblxuICAgICAgcmV0dXJuIGNoYXluc1dlYkNhbGwoY2hheW5zQ2FsbE9iai53ZWJGbiwgY2hheW5zQ2FsbE9iai53ZWJQYXJhbXMgfHwgY2hheW5zQ2FsbE9iai5wYXJhbXMpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogbmVpdGhlciBjaGF5bnMgd2ViIGNhbGwgbm9yIGNoYXlucyB3ZWInKTtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKG9iai5vbkVycm9yKSkge1xuICAgICAgICBvYmoub25FcnJvci5jYWxsKHVuZGVmaW5lZCwgbmV3IEVycm9yKCdOZWl0aGVyIGluIENoYXlucyBXZWIgbm9yIGluIENoYXlucyBBcHAnKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGRlYm91bmNlKSB7XG4gICAgc2V0VGltZW91dChleGVjdXRlQ2FsbC5iaW5kKG51bGwsIG9iaiksIDEwMCk7IC8vIFRPRE86IGVycm9yP1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleGVjdXRlQ2FsbChvYmopO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGQgQ2hheW5zIENhbGwgKG9ubHkgZm9yIG5hdGl2ZSBBcHBzKVxuICogQHByaXZhdGVcblxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgY2hheW5zIGNhbGwgc3VjY2VlZGVkLCBmYWxzZSBvbiBlcnJvciAobm8gdXJsIGV0YylcbiAqL1xuZnVuY3Rpb24gY2hheW5zQ2FsbChjbWQsIHBhcmFtcykge1xuXG4gIGlmIChpc0JsYW5rKGNtZCkpIHsgLy8gMCBpcyBhIHZhbGlkIGNhbGwsIHVuZGVmaW5lZCBhbmQgbnVsbCBhcmUgbm90XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IG1pc3NpbmcgY21kIGZvciBjaGF5bnNDYWxsJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxldCB1cmwgPSBudWxsO1xuXG4gIC8vIGlmIHRoZXJlIGlzIG5vIHBhcmFtIG9yICdub25lJyB3aGljaCBtZWFucyBubyBjYWxsYmFja1xuICBpZiAoIXBhcmFtcykge1xuXG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArICcpJztcblxuICB9IGVsc2Uge1xuXG4gICAgLy8gcGFyYW1zIGV4aXN0IGhvd2V2ZXIsIGl0IGlzIG5vIGFycmF5XG4gICAgaWYgKCFpc0FycmF5KHBhcmFtcykpIHtcbiAgICAgIGxvZy5lcnJvcignY2hheW5zQ2FsbDogcGFyYW1zIGFyZSBubyBBcnJheScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcGFyYW1zIHRvIHRoZSBjaGF5bnMgY2FsbFxuICAgIGxldCBjYWxsYmFja1ByZWZpeCA9ICdfY2hheW5zQ2FsbGJhY2tzLic7XG4gICAgbGV0IGNhbGxTdHJpbmcgPSAnJztcbiAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBjYWxsQXJncyA9IFtdO1xuICAgICAgcGFyYW1zLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgbGV0IG5hbWUgPSBPYmplY3Qua2V5cyhwYXJhbSlbMF07XG4gICAgICAgIGxldCB2YWx1ZSA9IHBhcmFtW25hbWVdO1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2NhbGxiYWNrJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1xcJycgKyBjYWxsYmFja1ByZWZpeCArIHZhbHVlICsgJ1xcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdib29sJyB8fCBuYW1lID09PSAnRnVuY3Rpb24nIHx8IG5hbWUgPT09ICdJbnRlZ2VyJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2godmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKCdcXCcnICsgdmFsdWUgKyAnXFwnJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY2FsbFN0cmluZyA9ICcsJyArIGNhbGxBcmdzLmpvaW4oJywnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgY2hheW5zIHByb3RvY29sIGFuZCBob3N0IGFuZCBqb2luIGFycmF5XG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArIGNhbGxTdHJpbmcgKyAnKSc7XG4gIH1cblxuICBsb2cuZGVidWcoJ2NoYXluc0NhbGw6IHVybDogJywgdXJsKTtcblxuICB0cnkge1xuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBlYXNpZXIgaWRlbnRpZmljYXRpb24gb2YgdGhlIHJpZ2h0IGVudmlyb25tZW50XG4gICAgLy8gVE9ETzogY29uc2lkZXIgdG8gZXhlY3V0ZSB0aGUgYnJvd3NlciBmYWxsYmFjayBpbiBoZXJlIGFzIHdlbGxcbiAgICBpZiAoJ2NoYXluc0NhbGwnIGluIHdpbmRvdyAmJiBpc0Z1bmN0aW9uKHdpbmRvdy5jaGF5bnNDYWxsLmhyZWYpKSB7XG4gICAgICB3aW5kb3cuY2hheW5zQ2FsbC5ocmVmKHVybCk7XG4gICAgfSBlbHNlIGlmICgnd2Via2l0JyBpbiB3aW5kb3dcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKSB7XG4gICAgICB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKHVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy53YXJuKCdjaGF5bnNDYWxsOiBFcnJvcjogY291bGQgbm90IGV4ZWN1dGUgQ2hheW5zQ2FsbDogJywgZSk7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeGVjdXRlIGEgQ2hheW5zV2ViIENhbGwgaW4gdGhlIHBhcmVudCB3aW5kb3cuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZuIEZ1bmN0aW9uIG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbXMgQWRkaXRpb25hbFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY2hheW5zV2ViYkNhbGwgc3VjY2VlZGVkXG4gKi9cbmZ1bmN0aW9uIGNoYXluc1dlYkNhbGwoZm4sIHBhcmFtcykge1xuICBpZiAoIWZuKSB7XG4gICAgbG9nLmluZm8oJ2NoYXluc1dlYkNhbGw6IG5vIENoYXluc1dlYkNhbGwgZm4nKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAoIXBhcmFtcyB8fCBpc0FycmF5KHBhcmFtcykpIHsgLy8gQXJyYXkgaW5kaWNhdGVzIHRoYXQgdGhlc2UgYXJlIGNoYXluc0NhbGxzIHBhcmFtcyBUT0RPOiByZWZhY3RvclxuICAgIHBhcmFtcyA9ICcnO1xuICB9XG4gIGlmIChpc09iamVjdChwYXJhbXMpKSB7IC8vIGFuIEFycmF5IGlzIGFsc28gc2VlbiBhcyBPYmplY3QsIGhvd2V2ZXIgaXQgd2lsbCBiZSByZXNldCBiZWZvcmVcbiAgICBwYXJhbXMgPSBKU09OLnN0cmluZ2lmeShwYXJhbXMpO1xuICB9XG5cbiAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgcmV0dXJuIGZuLmNhbGwobnVsbCk7XG4gIH1cblxuICB2YXIgbmFtZXNwYWNlID0gJ2NoYXlucy5jdXN0b21UYWIuJztcbiAgdmFyIHVybCA9IG5hbWVzcGFjZSArIGZuICsgJzonICsgcGFyYW1zO1xuXG4gIGxvZy5kZWJ1ZygnY2hheW5zV2FiQ2FsbDogJyArIHVybCk7XG5cbiAgdHJ5IHtcbiAgICBwYXJlbnQucG9zdE1lc3NhZ2UodXJsLCAnKicpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLndhcm4oJ2NoYXluc1dlYkNhbGw6IHBvc3RNZXNzZ2FlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBjb25maWdcbiAqIEBwcml2YXRlXG4gKi9cblxuaW1wb3J0IHtpc1ByZXNlbnQsIGlzQmxhbmssIGlzVW5kZWZpbmVkLCBpc0FycmF5LCBleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBTdG9yZSBpbnRlcm5hbCBjaGF5bnMgY29uZmlndXJhdGlvblxuICogQHR5cGUge3thcHBOYW1lOiBzdHJpbmcsIGFwcFZlcnNpb246IG51bWJlciwgbG9hZE1vZGVybml6ZXI6IGJvb2xlYW4sIGxvYWRQb2x5ZmlsbHM6IGJvb2xlYW4sIHVzZUZldGNoOiBib29sZWFuLCBwcm9taXNlczogc3RyaW5nLCB1c2VPZmZsaW5lQ2FjaGluZzogYm9vbGVhbiwgdXNlTG9jYWxTdG9yYWdlOiBib29sZWFuLCBoYXNBZG1pbjogYm9vbGVhbiwgbXVsdGlMaW5ndWFsOiBib29sZWFuLCBpc1B1Ymxpc2hlZDogYm9vbGVhbiwgZGVidWdNb2RlOiBib29sZWFuLCB1c2VBamF4OiBib29sZWFufX1cbiAqIEBwcml2YXRlXG4gKi9cbnZhciBfY29uZmlnID0ge1xuICBhcHBOYW1lOiAnQ2hheW5zIEFwcCcsICAgLy8gYXBwIE5hbWVcbiAgYXBwVmVyc2lvbjogMSwgICAgICAgICAgIC8vIGFwcCBWZXJzaW9uXG4gIHByZXZlbnRFcnJvcnM6IHRydWUsICAgICAgICAvLyBlcnJvciBoYW5kbGVyIGNhbiBoaWRlIGVycm9ycyAoY2FuIGJlIG92ZXJ3dGl0dGVuIGJ5IGlzUHJvZHVjdGlvbilcbiAgaXNQcm9kdWN0aW9uOiB0cnVlLCAgICAgIC8vIHByb2R1Y3Rpb24sIGRldmVsb3BtZW50IGFuZCB0ZXN0IEVOVlxuICBsb2FkTW9kZXJuaXplcjogdHJ1ZSwgICAgLy8gbG9hZCBtb2Rlcm5pemVyXG4gIGxvYWRQb2x5ZmlsbHM6IHRydWUsICAgICAvLyBsb2FkIHBvbHlmaWxsc1xuICB1c2VGZXRjaDogdHJ1ZSwgICAgICAgICAgLy8gdXNlIHdpbmRvdy5mZXRjaCBhbmQgaXQncyBwb2x5ZmlsbHNcbiAgcHJvbWlzZXM6ICdxJywgICAgICAgICAgIC8vIHByb21pc2UgU2VydmljZTogUSBpcyBzdGFuZGFyZFxuICB1c2VPZmZsaW5lQ2FjaGluZzogZmFsc2UsLy8gaXMgb2ZmbGluZSBjYWNoaW5nIHVzZWQ/IGlubGN1ZGUgb2ZmbGluZSBoZWxwZXJcbiAgdXNlTG9jYWxTdG9yYWdlOiBmYWxzZSwgIC8vIGlzIGxvY2FsU3RvcmFnZSB1c2VkPyBpbmNsdWRlIGhlbHBlclxuICBoYXNBZG1pbjogZmFsc2UsICAgICAgICAgLy8gZG9lcyB0aGlzIGFwcC9wYWdlIGhhdmUgYW4gYWRtaW4/XG4gIG11bHRpTGluZ3VhbDogdHJ1ZSwgICAgICAvLyBlbmFibGUgaTE4bj9cbiAgaXNQdWJsaXNoZWQ6IHRydWUsICAgICAgIC8vIG9ubHkgaW4gaW50ZXJuYWwgdG9iaXQgYXZhaWxhYmxlXG4gIGRlYnVnTW9kZTogdHJ1ZSwgICAgICAgICAvLyBzaG93IGNvbnNvbGUgb3V0cHV0LCBkZWJ1ZyBwYXJhbSBmb3IgbG9nZ2luZ1xuICB1c2VBamF4OiBmYWxzZSxcbiAgaXNJbnRlcm5hbDogZmFsc2UgICAgICAgIC8vIHVzZSBpbnRlcm5hbCByb3V0aW5nXG4gIC8vZnJhbWV3b3JrOiBbJ0VtYmVyJywgJ0FuZ3VsYXInLCAnQmFja2JvbmUnLCAnQW1wZXJzYW5kJywgJ1JlYWN0JywgJ2pRdWVyeSddXG59O1xuXG4vLyBUT0RPOiByZW1vdmVcbi8qZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZygpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gQ29uZmlnLnNldChhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7IC8vIFRPRE86IHJlZmFjdG9yIHRoaXNcbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIENvbmZpZy5nZXQoYXJndW1lbnRzKTtcbiAgfVxuICByZXR1cm4gQ29uZmlnLmdldCgpO1xufSovXG5cbi8vIFRPRE86IHJlZmFjdG9yIHRvIE1hcFxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XG5cbiAgLyoqXG4gICAqIEBtZXRob2QgZ2V0XG4gICAqIEBjbGFzcyBDb25maWdcbiAgICogQG1vZHVsZSBjaGF5bnMuY29uZmlnXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgUmVmZXJlbmNlIHRoZSBga2V5YCBpbiB0aGUgY29uZmlnIGBPYmplY3RgXG4gICAqIEByZXR1cm5zIHtudWxsfSBWYWx1ZSBvZiB0aGUgYGtleWAgaW4gdGhlIGNvbmZpZyBgT2JqZWN0YFxuICAgKiAgICAgICAgICAgICAgICAgYHVuZGVmaW5lZGAgaWYgdGhlIGBrZXlgIHdhcyBub3QgZm91bmRcbiAgICovXG4gIHN0YXRpYyBnZXQoa2V5KSB7XG4gICAgaWYgKGlzUHJlc2VudChrZXkpKSB7XG4gICAgICByZXR1cm4gX2NvbmZpZ1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHBhcmFtIHZhbHVlXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIHNldChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGlzQmxhbmsoa2V5KSB8fCBpc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gVE9ETzogZ29vZCBpZGVhPyBvbmUgc2hvdWxkIGJlIGNhcmVmdWwgaSBzdXBwb3NlXG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBleHRlbmQoX2NvbmZpZywgdmFsdWUpO1xuICAgIH1cbiAgICBfY29uZmlnW2tleV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gISFrZXkgJiYgKGtleSBpbiBfY29uZmlnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzT2JqZWN0LCBET019IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge21lc3NhZ2VMaXN0ZW5lcn0gZnJvbSAnLi9jYWxsYmFja3MnO1xuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9IGZyb20gJy4vY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuaW1wb3J0IHtlbnZpcm9ubWVudCwgc2V0RW52fSBmcm9tICcuL2Vudmlyb25tZW50JztcblxuLy8gY3JlYXRlIG5ldyBMb2dnZXIgaW5zdGFuY2VcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jb3JlJyk7XG5cbi8vIGVuYWJsZSBKUyBFcnJvcnMgaW4gdGhlIGNvbnNvbGVcbkNvbmZpZy5zZXQoJ3ByZXZlbnRFcnJvcnMnLCBmYWxzZSk7XG5cbnZhciBkb21SZWFkeVByb21pc2U7XG52YXIgY2hheW5zUmVhZHlQcm9taXNlO1xuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5wcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIoY29uZmlnKSB7XG4gIGxvZy5pbmZvKCdjaGF5bnMucmVnaXN0ZXInKTtcbiAgQ29uZmlnLnNldChjb25maWcpOyAvLyB0aGlzIHJlZmVyZW5jZSB0byB0aGUgY2hheW5zIG9ialxuICByZXR1cm4gdGhpcztcbn1cblxuLy8gVE9ETzogcmVnaXN0ZXIgYEZ1bmN0aW9uYCBvciBwcmVDaGF5bnMgYE9iamVjdGA/XG5leHBvcnQgZnVuY3Rpb24gcHJlQ2hheW5zKCkge1xuICBpZiAoJ3ByZUNoYXlucycgaW4gd2luZG93ICYmIGlzT2JqZWN0KHdpbmRvdy5wcmVDaGF5bnMpKSB7XG4gICAgT2JqZWN0LmtleXMod2luZG93LnByZUNoYXlucykuZm9yRWFjaChmdW5jdGlvbihzZXR0aW5nKSB7XG4gICAgICBsb2cuZGVidWcoJ3ByZSBjaGF5bnM6ICcsIHNldHRpbmcpO1xuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLnByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkeSgpIHtcbiAgbG9nLmRlYnVnKCdjaGF5bnMucmVhZHkoKScpO1xuICByZXR1cm4gY2hheW5zUmVhZHlQcm9taXNlO1xufVxuXG4vKipcbiAqIEBuYW1lIHByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSBvYmogUmVmZXJlbmNlIHRvIGNoYXlucyBPYmplY3RcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXAoKSB7XG4gIGxvZy5pbmZvKCdzdGFydCBjaGF5bnMgc2V0dXAnKTtcblxuICAvLyBlbmFibGUgYGNoYXlucy5jc3NgIGJ5IGFkZGluZyBgY2hheW5zYCBjbGFzc1xuICAvLyByZW1vdmUgYG5vLWpzYCBjbGFzcyBhbmQgYWRkIGBqc2AgY2xhc3NcbiAgbGV0IGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICBET00uYWRkQ2xhc3MoYm9keSwgJ2NoYXlucycpO1xuICBET00uYWRkQ2xhc3MoYm9keSwgJ2pzJyk7XG4gIERPTS5yZW1vdmVDbGFzcyhib2R5LCAnbm8tanMnKTtcblxuXG4gIC8vIHJ1biBwb2x5ZmlsbCAoaWYgcmVxdWlyZWQpXG5cbiAgLy8gcnVuIG1vZGVybml6ZXIgKGZlYXR1cmUgZGV0ZWN0aW9uKVxuXG4gIC8vIHJ1biBmYXN0Y2xpY2tcblxuICAvLyAodmlld3BvcnQgc2V0dXApXG5cbiAgLy8gY3JhdGUgbWV0YSB0YWdzIChjb2xvcnMsIG1vYmlsZSBpY29ucyBldGMpXG5cbiAgLy8gZG8gc29tZSBTRU8gc3R1ZmYgKGNhbm9uaWNhbCBldGMpXG5cbiAgLy8gZGV0ZWN0IHVzZXIgKGxvZ2dlZCBpbj8pXG5cbiAgLy8gcnVuIGNoYXlucyBzZXR1cCAoY29sb3JzIGJhc2VkIG9uIGVudmlyb25tZW50KVxuXG4gIC8vIERPTSAgcmVhZHkgcHJvbWlzZVxuICBkb21SZWFkeVByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScpIHtcbiAgICAgIHJlc29sdmUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGRvbVJlYWR5ID0gZnVuY3Rpb24gZG9tUmVhZHkoKSB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBkb21SZWFkeSwgdHJ1ZSk7XG4gICAgICB9O1xuICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBkb21SZWFkeSwgdHJ1ZSk7XG4gICAgfVxuICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgIC8vIERPTSByZWFkeSBhY3Rpb25zXG4gICAgbG9nLmRlYnVnKCdET00gcmVhZHknKTsgLy8gVE9ETzogYWN0dWFsbHkgd2UgY2FuIHJlbW92ZSB0aGlzXG4gICAgLy8gZG9tLXJlYWR5IGNsYXNzXG4gICAgRE9NLmFkZENsYXNzKGJvZHksICdkb20tcmVhZHknKTtcbiAgICAvLyBzdGFydCB3aW5kb3cub24oJ21lc3NhZ2UnKSBsaXN0ZW5lciBmb3IgaUZyYW1lIENvbW11bmljYXRpb25cbiAgICBtZXNzYWdlTGlzdGVuZXIoKTtcbiAgfSk7XG5cbiAgLy8gY2hheW5zUmVhZHkgUHJvbWlzZVxuICBjaGF5bnNSZWFkeVByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAvLyBnZXQgdGhlIEFwcCBJbmZvcm1hdGlvbiAoVE9ETzogaGFzIHRvIGJlIGRvbmUgd2hlbiBkb2N1bWVudCByZWFkeT8pXG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoKS50aGVuKGZ1bmN0aW9uIHJlc29sdmVkKGRhdGEpIHtcblxuICAgICAgLy8gbm93IENoYXlucyBpcyBvZmZpY2lhbGx5IHJlYWR5XG4gICAgICAvLyBmaXJzdCBzZXQgYWxsIGVudiBzdHVmZlxuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdUaGVyZSBpcyBubyBhcHAgRGF0YScpKTtcbiAgICAgIH1cblxuICAgICAgbG9nLmRlYnVnKCdhcHBJbmZvcm1hdGlvbiBjYWxsYmFjaycsIGRhdGEpO1xuXG4gICAgICAvLyBzdG9yZSByZWNlaXZlZCBpbmZvcm1hdGlvblxuICAgICAgaWYgKGlzT2JqZWN0KGRhdGEuQXBwSW5mbykpIHtcbiAgICAgICAgbGV0IGFwcEluZm8gPSBkYXRhLkFwcEluZm87XG4gICAgICAgIGxldCBzaXRlID0ge1xuICAgICAgICAgIHNpdGVJZDogYXBwSW5mby5TaXRlSUQsXG4gICAgICAgICAgdGl0bGU6IGFwcEluZm8uVGl0bGUsXG4gICAgICAgICAgdGFwcHM6IGFwcEluZm8uVGFwcHMsXG4gICAgICAgICAgZmFjZWJvb2tBcHBJZDogYXBwSW5mby5GYWNlYm9va0FwcElELFxuICAgICAgICAgIGZhY2Vib29rUGFnZUlkOiBhcHBJbmZvLkZhY2Vib29rUGFnZUlELFxuICAgICAgICAgIGNvbG9yU2NoZW1lOiBhcHBJbmZvLkNvbG9yU2NoZW1lIHx8IDAsXG4gICAgICAgICAgdmVyc2lvbjogYXBwSW5mby5WZXJzaW9uLFxuICAgICAgICAgIHRhcHA6IGFwcEluZm8uVGFwcFNlbGVjdGVkXG4gICAgICAgIH07XG4gICAgICAgIHNldEVudignc2l0ZScsIHNpdGUpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGRhdGEuQXBwVXNlcikpIHtcbiAgICAgICAgbGV0IGFwcFVzZXIgPSBkYXRhLkFwcFVzZXI7XG4gICAgICAgIGxldCB1c2VyID0ge1xuICAgICAgICAgIG5hbWU6IGFwcFVzZXIuRmFjZWJvb2tVc2VyTmFtZSxcbiAgICAgICAgICBpZDogYXBwVXNlci5Ub2JpdFVzZXJJRCxcbiAgICAgICAgICBmYWNlYm9va0lkOiBhcHBVc2VyLkZhY2Vib29rSUQsXG4gICAgICAgICAgcGVyc29uSWQ6IGFwcFVzZXIuUGVyc29uSUQsXG4gICAgICAgICAgYWNjZXNzVG9rZW46IGFwcFVzZXIuVG9iaXRBY2Nlc3NUb2tlbixcbiAgICAgICAgICBmYWNlYm9va0FjY2Vzc1Rva2VuOiBhcHBVc2VyLkZhY2Vib29rQWNjZXNzVG9rZW4sXG4gICAgICAgICAgZ3JvdXBzOiBhcHBVc2VyLlVBQ0dyb3Vwc1xuICAgICAgICB9O1xuICAgICAgICBzZXRFbnYoJ3VzZXInLCB1c2VyKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc09iamVjdChkYXRhLkRldmljZSkpIHtcbiAgICAgICAgbGV0IGRldmljZSA9IGRhdGEuRGV2aWNlO1xuICAgICAgICBsZXQgYXBwID0ge1xuICAgICAgICAgIGxhbmd1YWdlSWQ6IGRldmljZS5MYW5ndWFnZUlELFxuICAgICAgICAgIG1vZGVsOiBkZXZpY2UuTW9kZWwsXG4gICAgICAgICAgbmFtZTogZGV2aWNlLlN5c3RlbU5hbWUsXG4gICAgICAgICAgdmVyc2lvbjogZGV2aWNlLlN5c3RlbVZlcnNpb24sXG4gICAgICAgICAgdWlkOiBkZXZpY2UuVUlELCAvLyBUT0RPIHV1aWQ/IGlzIGl0IGV2ZW4gdXNlZD9cbiAgICAgICAgICBtZXRyaWNzOiBkZXZpY2UuTWV0cmljcyAvLyBUT0RPOiB1c2VkP1xuICAgICAgICB9O1xuICAgICAgICBzZXRFbnYoJ2FwcCcsIGFwcCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGRvbid0IHdvcnJ5IHRoaXMgaXMgbm8gdjIgdGhpbmdcbiAgICAgIGNzc1NldHVwKCk7XG4gICAgICBsb2cuaW5mbygnZmluaXNoZWQgY2hheW5zIHNldHVwJyk7XG5cbiAgICAgIC8vIFRPRE86IGNyZWF0ZSBjdXN0b20gbW9kZWw/XG4gICAgICByZXNvbHZlKGRhdGEpO1xuXG4gICAgfSwgZnVuY3Rpb24gcmVqZWN0ZWQoKSB7XG4gICAgICBsb2cuZGVidWcoJ0Vycm9yOiBUaGUgQXBwIEluZm9ybWF0aW9uIGNvdWxkIG5vdCBiZSByZWNlaXZlZC4nKTtcbiAgICAgIHJlamVjdCgnVGhlIEFwcCBJbmZvcm1hdGlvbiBjb3VsZCBub3QgYmUgcmVjZWl2ZWQuJyk7XG4gICAgICAvL3JldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1RoZSBBcHAgSW5mb3JtYXRpb24gY291bGQgbm90IGJlIHJlY2VpdmVkLicpKTtcbiAgICB9KTtcblxuICB9KTtcblxufVxuXG5cbi8qKlxuICogQWRkcyB2ZW5kb3IgY2xhc3NlcyB0byB0aGUgYm9keSBpbiBvcmRlciB0byBzaG93IHRoYXQgY2hheW5zIGlzIHJlYWR5XG4gKiBhbmQgd2hpY2ggT1MsIEJyb3dzZXIgYW5kIENvbG9yU2NoZW1lIHNob3VsZCBiZSBhcHBsaWVkLlxuICogVGhpcyBmdW5jdGlvbiBpcyBpbnZva2VkIHdoZW4gdGhlIERPTSBhbmQgQ2hheW5zIGlzIHJlYWR5LlxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIGNzc1NldHVwKCkge1xuICBsZXQgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gIGxldCBzdWZmaXggPSAnY2hheW5zLSc7XG5cbiAgRE9NLmFkZENsYXNzKGJvZHksICdjaGF5bnMtcmVhZHknKTtcbiAgRE9NLnJlbW92ZUF0dHJpYnV0ZShET00ucXVlcnkoJ1tjaGF5bnMtY2xvYWtdJyksICdjaGF5bnMtY2xvYWsnKTtcblxuICAvLyBhZGQgdmVuZG9yIGNsYXNzZXMgKE9TLCBCcm93c2VyLCBDb2xvclNjaGVtZSlcbiAgRE9NLmFkZENsYXNzKGJvZHksIHN1ZmZpeCArICdvcy0tJyArIGVudmlyb25tZW50Lm9zKTtcbiAgRE9NLmFkZENsYXNzKGJvZHksIHN1ZmZpeCArICdicm93c2VyLS0nICsgZW52aXJvbm1lbnQuYnJvd3Nlcik7XG4gIERPTS5hZGRDbGFzcyhib2R5LCBzdWZmaXggKyAnY29sb3ItLScgKyBlbnZpcm9ubWVudC5icm93c2VyKTtcblxuICAvLyBFbnZpcm9ubWVudFxuICBpZiAoZW52aXJvbm1lbnQuaXNDaGF5bnNXZWIpIHtcbiAgICBET00uYWRkQ2xhc3MoYm9keSwgc3VmZml4ICsgJy0nICsgJ3dlYicpO1xuICB9XG4gIGlmIChlbnZpcm9ubWVudC5pc0NoYXluc1dlYk1vYmlsZSkge1xuICAgIERPTS5hZGRDbGFzcyhib2R5LCBzdWZmaXggKyAnLScgKyAnbW9iaWxlJyk7XG4gIH1cbiAgaWYgKGVudmlyb25tZW50LmlzQ2hheW5zV2ViRGVza3RvcCkge1xuICAgIERPTS5hZGRDbGFzcyhib2R5LCBzdWZmaXggKyAnLScgKyAnZGVza3RvcCcpO1xuICB9XG4gIGlmIChlbnZpcm9ubWVudC5pc0FwcCkge1xuICAgIERPTS5hZGRDbGFzcyhib2R5LCBzdWZmaXggKyAnLScgKyAnYXBwJyk7XG4gIH1cbiAgaWYgKGVudmlyb25tZW50LmlzSW5GcmFtZSkge1xuICAgIERPTS5hZGRDbGFzcyhib2R5LCBzdWZmaXggKyAnLScgKyAnZnJhbWUnKTtcbiAgfVxuXG4gIC8vIGFkZCBjaGF5bnMgcm9vdCBlbGVtZW50XG4gIGxldCBjaGF5bnNSb290ID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBjaGF5bnNSb290LnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLXJvb3QnKTtcbiAgY2hheW5zUm9vdC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NoYXluc19fcm9vdCcpO1xuICBET00uYXBwZW5kQ2hpbGQoYm9keSwgY2hheW5zUm9vdCk7XG59XG4iLCIvKipcbiAqIEBtb2R1bGUgY2hheW5zLmVudmlyb25tZW50XG4gKiBAZGVzY3JpcHRpb25cbiAqIENoYXlucyBFbnZpcm9ubWVudFxuICovXG5cbmltcG9ydCB7Z2V0TG9nZ2VyLCBleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5lbnZpcm9ubWVudCcpO1xuXG4vLyBUT0RPOiBpbXBvcnQgZGVwZW5kZW5jaWVzXG52YXIgdHlwZXMgPSB7fTtcblxudHlwZXMuYnJvd3NlciA9IFtcbiAgJ2Nocm9tZScsXG4gICdmaXJlZm94JyxcbiAgJ3NhZmFyaScsXG4gICdvcGVyYScsXG4gICdjaHJvbWUgbW9iaWxlJyxcbiAgJ3NhZmFyaSBtb2JpbGUnLFxuICAnZmlyZWZveCBtb2JpbGUnXG5dO1xuXG50eXBlcy5vcyA9IFtcbiAgJ3dpbmRvd3MnLFxuICAnbWFjT1MnLFxuICAnYW5kcm9pZCcsXG4gICdpb3MnLFxuICAnd3AnXG5dO1xuXG50eXBlcy5jaGF5bnNPUyA9IHtcbiAgd2ViOiAnd2Vic2hhZG93JyxcbiAgd2ViTW9iaWxlOiAnd2Vic2hhZG93bW9iaWxlJyxcbiAgYXBwOiAnd2Vic2hhZG93bW9iaWxlJ1xufTtcblxuLy8gVE9ETzogaGlkZSBpbnRlcm5hbCBwYXJhbWV0ZXJzIGZyb20gdGhlIG90aGVyc1xuLy8gVE9ETzogb2ZmZXIgdXNlciBhbiBgT2JqZWN0YCB3aXRoIFVSTCBQYXJhbWV0ZXJzXG4vLyBsb2NhdGlvbiBxdWVyeSBzdHJpbmdcbnZhciBxdWVyeSA9IGxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSk7XG52YXIgcGFyYW1ldGVycyA9IHt9O1xucXVlcnkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKHBhcnQpIHtcbiAgdmFyIGl0ZW0gPSBwYXJ0LnNwbGl0KCc9Jyk7XG4gIHBhcmFtZXRlcnNbaXRlbVswXS50b0xvd2VyQ2FzZSgpXSA9IGRlY29kZVVSSUNvbXBvbmVudChpdGVtWzFdKS50b0xvd2VyQ2FzZSgpO1xufSk7XG5cbi8vIHZlcmlmeSBieSBjaGF5bnMgcmVxdWlyZWQgcGFyYW1ldGVycyBleGlzdFxuaWYgKCFwYXJhbWV0ZXJzLmFwcHZlcnNpb24pIHtcbiAgbG9nLndhcm4oJ25vIGFwcCB2ZXJzaW9uIHBhcmFtZXRlcicpO1xufVxuaWYgKCFwYXJhbWV0ZXJzLm9zKSB7XG4gIGxvZy53YXJuKCdubyBvcyBwYXJhbWV0ZXInKTtcbn1cblxubGV0IGRlYnVnTW9kZSA9ICEhcGFyYW1ldGVycy5kZWJ1ZztcblxuLy8gVE9ETzogZnVydGhlciBwYXJhbXMgYW5kIGNvbG9yc2NoZW1lXG4vLyBUT0RPOiBkaXNjdXNzIHJvbGUgb2YgVVJMIHBhcmFtcyBhbmQgdHJ5IHRvIHJlcGxhY2UgdGhlbSBhbmQgb25seSB1c2UgQXBwRGF0YVxuXG5cbi8vZnVuY3Rpb24gZ2V0Rmlyc3RNYXRjaChyZWdleCkge1xuLy8gIHZhciBtYXRjaCA9IHVhLm1hdGNoKHJlZ2V4KTtcbi8vICByZXR1cm4gKG1hdGNoICYmIG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2hbMV0pIHx8ICcnO1xuLy99XG5cbi8vIHVzZXIgYWdlbnQgZGV0ZWN0aW9uXG52YXIgdXNlckFnZW50ID0gKHdpbmRvdy5uYXZpZ2F0b3IgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCkgfHwgJyc7XG5cbnZhciBpcyA9IHtcbiAgaW9zOiAvaVBob25lfGlQYWR8aVBvZC9pLnRlc3QodXNlckFnZW50KSxcbiAgYW5kcm9pZDogL0FuZHJvaWQvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHdwOiAvd2luZG93cyBwaG9uZS9pLnRlc3QodXNlckFnZW50KSxcbiAgYmI6IC9CbGFja0JlcnJ5fEJCMTB8UklNL2kudGVzdCh1c2VyQWdlbnQpLFxuXG4gIG9wZXJhOiAoISF3aW5kb3cub3BlcmEgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCcgT1BSLycpID49IDApLFxuICBmaXJlZm94OiAodHlwZW9mIEluc3RhbGxUcmlnZ2VyICE9PSAndW5kZWZpbmVkJyksXG4gIHNhZmFyaTogKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cuSFRNTEVsZW1lbnQpLmluZGV4T2YoJ0NvbnN0cnVjdG9yJykgPiAwKSxcbiAgY2hyb21lOiAoISF3aW5kb3cuY2hyb21lICYmICEoISF3aW5kb3cub3BlcmEgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCcgT1BSLycpID49IDApKSxcbiAgaWU6IGZhbHNlIHx8ICEhZG9jdW1lbnQuZG9jdW1lbnRNb2RlLFxuICBpZTExOiAvbXNpZSAxMS9pLnRlc3QodXNlckFnZW50KSxcbiAgaWUxMDogL21zaWUgMTAvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllOTogL21zaWUgOS9pLnRlc3QodXNlckFnZW50KSxcbiAgaWU4OiAvbXNpZSA4L2kudGVzdCh1c2VyQWdlbnQpLFxuXG4gIG1vYmlsZTogLyhpcGhvbmV8aXBvZHwoKD86YW5kcm9pZCk/Lio/bW9iaWxlKXxibGFja2JlcnJ5fG5va2lhKS9pLnRlc3QodXNlckFnZW50KSxcbiAgdGFibGV0OiAvKGlwYWR8YW5kcm9pZCg/IS4qbW9iaWxlKXx0YWJsZXQpL2kudGVzdCh1c2VyQWdlbnQpLFxuICBraW5kbGU6IC9cXFcoa2luZGxlfHNpbGspXFxXL2kudGVzdCh1c2VyQWdlbnQpLFxuICB0djogL2dvb2dsZXR2fHNvbnlkdHYvaS50ZXN0KHVzZXJBZ2VudClcbn07XG5cbi8vIFRPRE86IEJyb3dzZXIgVmVyc2lvbiBhbmQgT1MgVmVyc2lvbiBkZXRlY3Rpb25cblxuLy8gVE9ETzogYWRkIGZhbGxiYWNrXG52YXIgb3JpZW50YXRpb24gPSBNYXRoLmFicyh3aW5kb3cub3JpZW50YXRpb24gJSAxODApID09PSAwID8gJ3BvcnRyYWl0JyA6ICdsYW5kc2NhcGUnO1xudmFyIHZpZXdwb3J0ID0gd2luZG93LmlubmVyV2lkdGggKyAneCcgKyB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbmV4cG9ydCB2YXIgZW52aXJvbm1lbnQgPSB7XG5cbiAgb3NWZXJzaW9uOiAxLFxuXG4gIGJyb3dzZXI6ICdjYycsXG4gIGJyb3dzZXJWZXJzaW9uOiAxXG5cbn07XG5cbmVudmlyb25tZW50LnBhcmFtZXRlcnMgPSBwYXJhbWV0ZXJzOyAvLyBUT0RPIHN0cmlwICdzZWNyZXQgcGFyYW1zJ1xuZW52aXJvbm1lbnQuaGFzaCA9IGxvY2F0aW9uLmhhc2guc3Vic3RyKDEpO1xuXG4vLyBXQVRDSCBPVVQgdGhlIE9TIGlzIHNldCBieSBwYXJhbWV0ZXIgKHVuZm9ydHVuYXRlbHkpXG5lbnZpcm9ubWVudC5vcyA9IHBhcmFtZXRlcnMub3MgfHwgJ25vT1MnOyAvLyBUT0RPOiByZWZhY3RvciBPU1xuaWYgKGlzLm1vYmlsZSAmJiBbJ2FuZHJvaWQnLCAnaW9zJywgJ3dwJ10uaW5kZXhPZihwYXJhbWV0ZXJzLm9zKSAhPT0gLTEpIHtcbiAgcGFyYW1ldGVycy5vcyA9IHR5cGVzLmNoYXluc09TLmFwcDtcbn1cblxuLy8gZGV0ZWN0aW9uIGJ5IHVzZXIgYWdlbnRcbmVudmlyb25tZW50LmlzSU9TID0gaXMuaW9zO1xuZW52aXJvbm1lbnQuaXNBbmRyb2lkID0gaXMuYW5kcm9pZDtcbmVudmlyb25tZW50LmlzV1AgPSBpcy53cDtcbmVudmlyb25tZW50LmlzQkIgPSBpcy5iYjtcblxuLy8gVE9ETzogbWFrZSBzdXJlIHRoYXQgdGhpcyBhbHdheXMgd29ya3MhIChUU1BOLCBjcmVhdGUgaWZyYW1lIHRlc3QgcGFnZSlcbmVudmlyb25tZW50LmlzSW5GcmFtZSA9ICh3aW5kb3cgIT09IHdpbmRvdy50b3ApO1xuXG5lbnZpcm9ubWVudC5pc0FwcCA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy5hcHAgJiYgaXMubW9iaWxlICYmICFlbnZpcm9ubWVudC5pc0luRnJhbWUpOyAvLyBUT0RPOiBkb2VzIHRoaXMgYWx3YXlzIHdvcms/XG5lbnZpcm9ubWVudC5hcHBWZXJzaW9uID0gcGFyYW1ldGVycy5hcHB2ZXJzaW9uO1xuXG5lbnZpcm9ubWVudC5pc0Jyb3dzZXIgPSAhZW52aXJvbm1lbnQuaXNBcHA7XG5cbmVudmlyb25tZW50LmlzRGVza3RvcCA9ICghaXMubW9iaWxlICYmICFpcy50YWJsZXQpO1xuXG5lbnZpcm9ubWVudC5pc01vYmlsZSA9IGlzLm1vYmlsZTtcbmVudmlyb25tZW50LmlzVGFibGV0ID0gaXMudGFibGV0O1xuXG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYk1vYmlsZSA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy53ZWJNb2JpbGUpICYmIGVudmlyb25tZW50LmlzSW5GcmFtZTtcbmVudmlyb25tZW50LmlzQ2hheW5zV2ViRGVza3RvcCA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy53ZWIpICYmIGVudmlyb25tZW50LmlzSW5GcmFtZTtcbmVudmlyb25tZW50LmlzQ2hheW5zV2ViID0gZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wIHx8IGVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlO1xuXG4vLyBpbnRlcm5hbCBUT0RPOiBtYWtlIGl0IHByaXZhdGU/XG5lbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsID0gZW52aXJvbm1lbnQuaXNBcHA7XG5lbnZpcm9ubWVudC5jYW5DaGF5bnNXZWJDYWxsID0gZW52aXJvbm1lbnQuaXNDaGF5bnNXZWI7XG5cbmVudmlyb25tZW50LnZpZXdwb3J0ID0gdmlld3BvcnQ7IC8vIFRPRE86IHVwZGF0ZSBvbiByZXNpemU/IG5vLCBkdWUgcGVyZm9ybWFuY2VcbmVudmlyb25tZW50Lm9yaWVudGF0aW9uID0gb3JpZW50YXRpb247XG5lbnZpcm9ubWVudC5yYXRpbyA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuXG5lbnZpcm9ubWVudC5kZWJ1Z01vZGUgPSBkZWJ1Z01vZGU7XG5cbi8vZW52aXJvbm1lbnQudXNlciA9IHtcbi8vICBuYW1lOiAnUGFjYWwgV2VpbGFuZCcsXG4vLyAgZmlyc3ROYW1lOiAnUGFzY2FsJyxcbi8vICBsYXN0TmFtZTogJ1dlaWxhbmQnLFxuLy8gIHVzZXJJZDogMTIzNCxcbi8vICBmYWNlYm9va0lkOiAxMjM0NSxcbi8vICBpc0FkbWluOiB0cnVlLFxuLy8gIHVhY0dyb3VwczogW10sXG4vLyAgbGFuZ3VhZ2U6ICdkZV9ERScsXG4vLyAgdG9rZW46ICd0b2tlbicgLy8gVE9ETzogZXhjbHVkZSB0b2tlbj9cbi8vfTtcblxuXG5leHBvcnQgZnVuY3Rpb24gc2V0RW52KGtleSwgdmFsdWUpIHtcbiAgLy9leHRlbmQoZW52aXJvbm1lbnQsIHByb3ApO1xuICBlbnZpcm9ubWVudFtrZXldID0gdmFsdWU7XG59XG5cbiIsIi8qKlxuICogVGFwcCBBUEkgSW50ZXJmYWNlXG4gKiBBUEkgdG8gY29tbXVuaWNhdGUgd2l0aCB0aGUgVGFwcEFQSVxuICovXG4vKiBnbG9hYmwgZmV0Y2ggKi9cblxuaW1wb3J0IHtnZXRMb2dnZXIsIGlzUHJlc2VudCwgaXNPYmplY3QsIGlzQXJyYXksIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtlbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge3VzZXJ9IGZyb20gJy4vdXNlcic7XG4vL2ltcG9ydCB7d2luZG93fSBmcm9tICcuLi91dGlscy9icm93c2VyJzsgLy8gZHVlIHRvIHdpbmRvdy5vcGVuIGFuZCBsb2NhdGlvbi5ocmVmXG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ3RhcHBfYXBpJyk7XG5cbmNvbnNvbGUuZGVidWcoZW52aXJvbm1lbnQsICdldm4nKTtcblxuLy8gVE9ETzogZm9yY2UgU1NMP1xubGV0IHRhcHBBcGlSb290ID0gJy8vY2hheW5zMS50b2JpdC5jb20vVGFwcEFwaS8nO1xubGV0IHJlc3VsdFR5cGUgPSB7XG4gIGVycm9yOiAtMSxcbiAgc3VjY2VzczogMFxufTtcblxuZnVuY3Rpb24gcGFyc2VVc2VyKHVzZXIpIHtcbiAgcmV0dXJuIHtcbiAgICB1c2VySWQ6IHVzZXIuVXNlcklELFxuICAgIGZhY2Vib29rSWQ6IHVzZXIuSUQgfHwgdXNlci5GYWNlYm9va0lELFxuICAgIG5hbWU6IHVzZXIuTmFtZSB8fCB1c2VyLlVzZXJGdWxsTmFtZSxcbiAgICBmaXJzdE5hbWU6IHVzZXIuRmlyc3ROYW1lLFxuICAgIGxhc3ROYW1lOiB1c2VyLkxhc3RuYW1lLFxuICAgIHBpY3R1cmU6ICdodHRwczovL2dyYXBoLmZhY2Vib29rLmNvbS8nICsgdXNlci5JRCArICcvcGljdHVyZScsXG4gICAgY2hheW5zTG9naW46IHVzZXIuQ2hheW5zTG9naW5cbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VHcm91cChncm91cCkge1xuICByZXR1cm4ge1xuICAgIGlkOiBncm91cC5JRCxcbiAgICBuYW1lOiBncm91cC5OYW1lLFxuICAgIHNob3dOYW1lOiBncm91cC5TaG93TmFtZVxuICB9O1xufVxuXG5sZXQgdWFjR3JvdXBzQ2FjaGU7XG5cbi8qKlxuICogQG1vZHVsZSBUYXBwQVBJSW50ZXJmYWNlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5leHBvcnQgdmFyIHRhcHBBcGlJbnRlcmZhY2UgPSB7XG4gIGdldEludHJvVGV4dDogZnVuY3Rpb24gZ2V0SW50cm9UZXh0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignZGVwcmVjYXRlZCcpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgSW5mb1xuICAgKiBVc2VyIEJhc2ljIEluZm9ybWF0aW9uXG4gICAqXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBnZXRVc2VyOiBmdW5jdGlvbiBnZXRVc2VyQmFzaWNJbmZvKG9iaikge1xuICAgIGlmICghb2JqIHx8ICFpc09iamVjdChvYmopKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdUaGVyZSB3YXMgbm8gcGFyYW1ldGVyIE9iamVjdCcpKTtcbiAgICB9XG4gICAgbGV0IGRhdGEgPSAnJztcbiAgICBpZiAoaXNQcmVzZW50KG9iai51c2VySWQpKSB7XG4gICAgICBkYXRhID0gJ1VzZXJJRD0nICsgb2JqLnVzZXJJZDtcbiAgICB9XG4gICAgaWYgKGlzUHJlc2VudChvYmouZmFjZWJvb2tJZCkpIHtcbiAgICAgIGRhdGEgPSAnRkJJRD0nICsgb2JqLmZhY2Vib29rSWQ7XG4gICAgfVxuICAgIGlmIChpc1ByZXNlbnQob2JqLnBlcnNvbklkKSkge1xuICAgICAgZGF0YSA9ICdQZXJzb25JRD0nICsgb2JqLnBlcnNvbklkO1xuICAgIH1cbiAgICBpZiAoaXNQcmVzZW50KG9iai5hY2Nlc3NUb2tlbikpIHtcbiAgICAgIGRhdGEgPSAnQWNjZXNzVG9rZW49JyArIG9iai5hY2Nlc3NUb2tlbjtcbiAgICB9XG4gICAgcmV0dXJuIHRhcHBBcGkoJ1VzZXIvQmFzaWNJbmZvPycgKyBkYXRhKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIGlmIChpc0FycmF5KGpzb24pKSB7XG4gICAgICAgIHJldHVybiBqc29uLm1hcCgodXNlcikgPT4gcGFyc2VVc2VyKHVzZXIpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBqc29uO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIHVzZXJzIG9mIGEgTG9jYXRpb24gaWRlbnRpZmllZCBieSBzaXRlSWRcbiAgICpcbiAgICpcbiAgICogQHBhcmFtIFtzaXRlSWQgPSBjdXJyZW50IHNpdGVJZF0gU2l0ZSBJZFxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIGdldExvY2F0aW9uVXNlcnM6IGZ1bmN0aW9uIGdldExvY2F0aW9uVXNlcnMoc2l0ZUlkKSB7XG4gICAgaWYgKCFzaXRlSWQpIHtcbiAgICAgIHNpdGVJZCA9IGVudmlyb25tZW50LnNpdGUuc2l0ZUlkO1xuICAgIH1cbiAgICBsZXQgZGF0YSA9ICc/U2l0ZUlEPScgKyBzaXRlSWQ7XG4gICAgcmV0dXJuIHRhcHBBcGkoJ1VzZXIvR2V0QWxsTG9jYXRpb25Vc2VycycgKyBkYXRhKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIHJldHVybiBqc29uLm1hcCgodXNlcikgPT4gcGFyc2VVc2VyKHVzZXIpKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IFVBQyBHcm91cHNcbiAgICpcbiAgICogVE9ETzogcmVtb3ZlIGNhY2hpbmc/IHllcywgaXQgZG9lcyBub3QgcmVhbGx5IGJlbG9uZyBpbiBoZXJlXG4gICAqIFRPRE86IEJhY2tlbmQgYnVnIGh0dHA6Ly9jaGF5bnMxLnRvYml0LmNvbS9UYXBwQXBpL1RhcHAvR2V0VUFDR3JvdXBzP1NpdGVJRD0gbm90IGVtcHR5XG4gICAqIFRPRE86IHJlbmFtZSB0byBnZXRHcm91cHM/ICh1c2luZyBVQUMgb25seSBpbnRlcm5hbGx5LCB0aGVyZSBhcmUgbm8gb3RoZXIgZ3JvdXBzIGVpdGhlcilcbiAgICogQHBhcmFtIHtCb29sZWFufSBbdXBkYXRlQ2FjaGU9dW5kZWZpbmVkXSBUcnVlIHRvIGZvcmNlIHRvIHJlY2VpdmUgbmV3IFVBQyBHcm91cHNcbiAgICogQHJldHVybnMge1Byb21pc2V9IHJlc29sdmUgd2l0aCAgVUFDIEdyb3VwcyBBcnJheSBvdGhlcndpc2UgcmVqZWN0IHdpdGggRXJyb3JcbiAgICovXG4gIGdldFVhY0dyb3VwczogZnVuY3Rpb24gZ2V0VWFjR3JvdXBzKHNpdGVJZCwgdXBkYXRlQ2FjaGUpIHtcbiAgICBpZiAodWFjR3JvdXBzQ2FjaGUgJiYgIXVwZGF0ZUNhY2hlKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHVhY0dyb3Vwc0NhY2hlKTtcbiAgICB9XG4gICAgc2l0ZUlkID0gc2l0ZUlkIHx8IGVudmlyb25tZW50LnNpdGUuc2l0ZUlkO1xuICAgIGxldCBkYXRhID0gJ1NpdGVJRD0nICsgc2l0ZUlkO1xuICAgIHJldHVybiB0YXBwQXBpKCdUYXBwL0dldFVBQ0dyb3Vwcz8nICsgZGF0YSkudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICByZXR1cm4ganNvbi5tYXAoKGdyb3VwKSA9PiBwYXJzZUdyb3VwKGdyb3VwKSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRPRE86IHVzZSB1c2VySWQgaW5zdGVhZCBvZiB0aGUgZmFjZWJvb2tJZD9cbiAgICogVE9ETzogcmVmYWN0b3IgbmFtZT8gY2F1c2UgTG9jYXRpb24gYW5kIFNpdGVJZFxuICAgKiBAcGFyYW0gdXNlcklkIEZhY2Vib29rIFVzZXJJZFxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIGlzVXNlckFkbWluT2ZMb2NhdGlvbjogZnVuY3Rpb24gaXNVc2VyQWRtaW5PZkxvY2F0aW9uKHVzZXJJZCkge1xuICAgIGlmICghdXNlcklkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoRXJyb3IoJ05vIHVzZXJJZCB3YXMgc3VwcGxpZWQuJykpO1xuICAgIH1cbiAgICBsZXQgZGF0YSA9ICc/U2l0ZUlEPScgKyBlbnZpcm9ubWVudC5zaXRlLnNpdGVJZCArICcmRkJJRD0nICsgdXNlcklkO1xuICAgIHJldHVybiB0YXBwQXBpKCdVc2VyL0lzVXNlckFkbWluJyArIGRhdGEpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgcmV0dXJuIGpzb247XG4gICAgfSk7XG4gIH0sXG5cbiAgaW50ZXJjb206IHtcblxuICAgIC8qKlxuICAgICAqIFNlbmQgbWVzc2FnZSBhcyB1c2VyIHRvIHRoZSBlbnRpcmUgcGFnZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgc2VuZE1lc3NhZ2VBc1VzZXI6IGZ1bmN0aW9uIHNlbmRNZXNzYWdlQXNVc2VyKG1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBzZW5kTWVzc2FnZSh7XG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgIHVybDogJ0ludGVyQ29tL1BhZ2UnXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VuZCBNZXNzYWdlIGFzIHBhZ2UgdG8gYSB1c2VyIGlkZW50aWZpZWQgYnkgVG9iaXQgVXNlcklkLlxuICAgICAqXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gdXNlcklkXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgc2VuZE1lc3NhZ2VUb1VzZXI6IGZ1bmN0aW9uIHNlbmRNZXNzYWdlVG9Vc2VyKHVzZXJJZCwgbWVzc2FnZSkge1xuICAgICAgcmV0dXJuIHNlbmRNZXNzYWdlKHtcbiAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgdXNlcklkOiB1c2VySWQsXG4gICAgICAgIHVybDogJ0ludGVyQ29tL1VzZXInXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VuZCBtZXNzYWdlIGFzIHBhZ2UgdG8gYSB1c2VyIGlkZW50aWZpZWQgYnkgRmFjZWJvb2sgVXNlcklkLlxuICAgICAqXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiBAcGFyYW0gZmFjZWJvb2tJZFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHNlbmRNZXNzYWdlVG9GYWNlYm9va1VzZXI6IGZ1bmN0aW9uIHNlbmRNZXNzYWdlVG9GYWNlYm9va1VzZXIoZmFjZWJvb2tJZCwgbWVzc2FnZSkge1xuICAgICAgcmV0dXJuIHNlbmRNZXNzYWdlKHtcbiAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgZmFjZWJvb2tJZDogZmFjZWJvb2tJZCxcbiAgICAgICAgdXJsOiAnVGFwcC9TZW5kSW50ZXJjb21NZXNzYWdlQXNQYWdlJ1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgbWVzc2FnZSBhcyBwYWdlIHRvIGEgVUFDIEdyb3VwLlxuICAgICAqXG4gICAgICogQHBhcmFtIGdyb3VwSWRcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHNlbmRNZXNzYWdlVG9Hcm91cDogZnVuY3Rpb24gc2VuZE1lc3NhZ2VUb0dyb3VwKGdyb3VwSWQsIG1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBzZW5kTWVzc2FnZSh7XG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgIGdyb3VwSWQ6IGdyb3VwSWQsXG4gICAgICAgIHVybDogJ0ludGVyQ29tL2dyb3VwJ1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIFNlbmQgSW50ZXJjb20gTWVzc2FnZVxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqL1xuLy8gVE9ETzogcmVmYWN0b3IgdG8gSlNPTiBpbnN0ZWFkIG9mIHd3dy1mb3JtLXVybGVuY29kZWRcbmZ1bmN0aW9uIHNlbmRNZXNzYWdlKG9iaikge1xuICBpZiAoIWlzT2JqZWN0KG9iaikgfHwgIW9iai5tZXNzYWdlIHx8ICFvYmoudXJsKSB7XG4gICAgUHJvbWlzZS5yZWplY3QoRXJyb3IoJ0ludmFsaWQgcGFyYW1ldGVycycpKTtcbiAgfVxuICBvYmouc2l0ZUlkID0gb2JqLnNpdGVJZCB8fCBlbnZpcm9ubWVudC5zaXRlLnNpdGVJZDtcbiAgb2JqLmFjY2Vzc1Rva2VuID0gb2JqLmFjY2Vzc1Rva2VuIHx8IHVzZXIuYWNjZXNzVG9rZW47XG4gIGxldCBtYXAgPSB7XG4gICAgbWVzc2FnZTogJ01lc3NhZ2UnLFxuICAgIGFjY2Vzc1Rva2VuOiAnQWNjZXNzVG9rZW4nLFxuICAgIHVzZXJJZDogJ1VzZXJJZCcsXG4gICAgZmFjZWJvb2tJZDogJ1RvRkJJRCcsXG4gICAgZ3JvdXBJZDogJ0dyb3VwSUQnLFxuICAgIHNpdGVJZDogJ1NpdGVJRCdcbiAgfTtcbiAgbGV0IGRhdGEgPSBbXTtcbiAgT2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChpc0RlZmluZWQob2JqW2tleV0pICYmIGtleSAhPT0gJ3VybCcpIHtcbiAgICAgIGRhdGEucHVzaChtYXBba2V5XSArICc9JyArICBvYmpba2V5XSk7XG4gICAgfVxuICB9KTtcbiAgbGV0IGNvbmZpZyA9IHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOCdcbiAgICB9LFxuICAgIC8vaGVhZGVyczoge1xuICAgIC8vICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIC8vICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgLy99LFxuICAgIC8vY3JlZGVudGlhbHM6ICdjb3JzJyxcbiAgICBib2R5OiBkYXRhLmpvaW4oJyYnKVxuICAgIC8vYm9keTogZGF0YVxuICB9O1xuICBsZXQgdXJsID0gdGFwcEFwaVJvb3QgKyBvYmoudXJsO1xuICBpZiAob2JqLnVybCA9PT0gJ1RhcHAvU2VuZEludGVyY29tTWVzc2FnZUFzUGFnZScpIHtcbiAgICB1cmwgKz0gJz8nICsgZGF0YS5qb2luKCcmJyk7XG4gICAgY29uZmlnID0gdW5kZWZpbmVkOyAvKntcbiAgICAgIGNyZWRlbnRpYWxzOiAnY29ycydcbiAgICB9OyovXG4gIH1cbiAgcmV0dXJuIGZldGNoKHVybCwgY29uZmlnKTtcbn1cblxuLyoqXG4gKiBUYXBwIEFQSSByZXF1ZXN0XG4gKlxuICogVE9ETzogdXNlIFBPU1QgaW5zdGVhZCBvZiBHRVRcbiAqIFRPRE86IHBvc3RpbmcgSlNPTiB3aXRoIHtjcmVkZW50aWFsczogJ2NvcnMnfVxuICogQHBhcmFtIGVuZHBvaW50XG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gd2l0aCBqc29uIGRhdGFcbiAqL1xuZnVuY3Rpb24gdGFwcEFwaShlbmRwb2ludCkge1xuICBsZXQgdXJsID0gdGFwcEFwaVJvb3QgKyBlbmRwb2ludDtcbiAgcmV0dXJuIGZldGNoKHVybClcbiAgICAudGhlbigocmVzKSA9PiByZXMuanNvbigpKVxuICAgIC50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIGlmIChqc29uLlZhbHVlKSB7XG4gICAgICAgIHJldHVybiBqc29uLlZhbHVlO1xuICAgICAgfSBlbHNlIGlmIChqc29uLkRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGpzb24uRGF0YTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBqc29uO1xuICAgICAgfVxuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAob2JqLkVycm9yKSB7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3Iob2JqLkVycm9yKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0pO1xufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJaUlzSW1acGJHVWlPaUl2VlhObGNuTXZjSGN2VUhKdmFtVmpkSE12ZEc5aWFYUXZZMmhoZVc1ekwyTm9ZWGx1Y3k1cWN5OXpjbU12WTJoaGVXNXpMM1Z6WlhJdWFuTWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXMTE5IiwiKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIC8vXG4gIC8vaWYgKHNlbGYuZmV0Y2gpIHtcbiAgLy8gIHJldHVyblxuICAvL31cblxuICBmdW5jdGlvbiBub3JtYWxpemVOYW1lKG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gbmFtZS50b1N0cmluZygpO1xuICAgIH1cbiAgICBpZiAoL1teYS16MC05XFwtIyQlJicqKy5cXF5fYHx+XS9pLnRlc3QobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgY2hhcmFjdGVyIGluIGhlYWRlciBmaWVsZCBuYW1lJylcbiAgICB9XG4gICAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKVxuICB9XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplVmFsdWUodmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSB2YWx1ZS50b1N0cmluZygpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIGZ1bmN0aW9uIEhlYWRlcnMoaGVhZGVycykge1xuICAgIHRoaXMubWFwID0ge31cblxuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIGlmIChoZWFkZXJzIGluc3RhbmNlb2YgSGVhZGVycykge1xuICAgICAgaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUsIHZhbHVlcykge1xuICAgICAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHNlbGYuYXBwZW5kKG5hbWUsIHZhbHVlKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgIH0gZWxzZSBpZiAoaGVhZGVycykge1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoaGVhZGVycykuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIHNlbGYuYXBwZW5kKG5hbWUsIGhlYWRlcnNbbmFtZV0pXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgbmFtZSA9IG5vcm1hbGl6ZU5hbWUobmFtZSlcbiAgICB2YWx1ZSA9IG5vcm1hbGl6ZVZhbHVlKHZhbHVlKVxuICAgIHZhciBsaXN0ID0gdGhpcy5tYXBbbmFtZV1cbiAgICBpZiAoIWxpc3QpIHtcbiAgICAgIGxpc3QgPSBbXVxuICAgICAgdGhpcy5tYXBbbmFtZV0gPSBsaXN0XG4gICAgfVxuICAgIGxpc3QucHVzaCh2YWx1ZSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlWydkZWxldGUnXSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBkZWxldGUgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgdmFsdWVzID0gdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV1cbiAgICByZXR1cm4gdmFsdWVzID8gdmFsdWVzWzBdIDogbnVsbFxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0QWxsID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSB8fCBbXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLm1hcC5oYXNPd25Qcm9wZXJ0eShub3JtYWxpemVOYW1lKG5hbWUpKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXSA9IFtub3JtYWxpemVWYWx1ZSh2YWx1ZSldXG4gIH1cblxuICAvLyBJbnN0ZWFkIG9mIGl0ZXJhYmxlIGZvciBub3cuXG4gIEhlYWRlcnMucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpc1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMubWFwKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGNhbGxiYWNrKG5hbWUsIHNlbGYubWFwW25hbWVdKVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lZChib2R5KSB7XG4gICAgaWYgKGJvZHkuYm9keVVzZWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKSlcbiAgICB9XG4gICAgYm9keS5ib2R5VXNlZCA9IHRydWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlc29sdmUocmVhZGVyLnJlc3VsdClcbiAgICAgIH1cbiAgICAgIHJlYWRlci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChyZWFkZXIuZXJyb3IpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNBcnJheUJ1ZmZlcihibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlYWRCbG9iQXNUZXh0KGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNUZXh0KGJsb2IpXG4gICAgcmV0dXJuIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gIH1cblxuICB2YXIgc3VwcG9ydCA9IHtcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpO1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH0pKCksXG4gICAgZm9ybURhdGE6ICdGb3JtRGF0YScgaW4gc2VsZlxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIGlmIChzdXBwb3J0LmJsb2IpIHtcbiAgICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYmxvYiAmJiBCbG9iLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5fYm9keUJsb2IgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYmxvYiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIGJsb2InKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IEJsb2IoW3RoaXMuX2JvZHlUZXh0XSkpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5hcnJheUJ1ZmZlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ibG9iKCkudGhlbihyZWFkQmxvYkFzQXJyYXlCdWZmZXIpXG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICBpZiAocmVqZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0ZWRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9ib2R5QmxvYikge1xuICAgICAgICAgIHJldHVybiByZWFkQmxvYkFzVGV4dCh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgdGV4dCcpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKCFib2R5KSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIHJldHVybiByZWplY3RlZCA/IHJlamVjdGVkIDogUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzdXBwb3J0LmZvcm1EYXRhKSB7XG4gICAgICB0aGlzLmZvcm1EYXRhID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKGRlY29kZSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHQoKS50aGVuKEpTT04ucGFyc2UpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8vIEhUVFAgbWV0aG9kcyB3aG9zZSBjYXBpdGFsaXphdGlvbiBzaG91bGQgYmUgbm9ybWFsaXplZFxuICB2YXIgbWV0aG9kcyA9IFsnREVMRVRFJywgJ0dFVCcsICdIRUFEJywgJ09QVElPTlMnLCAnUE9TVCcsICdQVVQnXVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldGhvZChtZXRob2QpIHtcbiAgICB2YXIgdXBjYXNlZCA9IG1ldGhvZC50b1VwcGVyQ2FzZSgpXG4gICAgcmV0dXJuIChtZXRob2RzLmluZGV4T2YodXBjYXNlZCkgPiAtMSkgPyB1cGNhc2VkIDogbWV0aG9kXG4gIH1cblxuICBmdW5jdGlvbiBSZXF1ZXN0KHVybCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdGhpcy51cmwgPSB1cmxcblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8ICdvbWl0J1xuICAgIHRoaXMuaGVhZGVycyA9IG5ldyBIZWFkZXJzKG9wdGlvbnMuaGVhZGVycylcbiAgICB0aGlzLm1ldGhvZCA9IG5vcm1hbGl6ZU1ldGhvZChvcHRpb25zLm1ldGhvZCB8fCAnR0VUJylcbiAgICB0aGlzLm1vZGUgPSBvcHRpb25zLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBvcHRpb25zLmJvZHkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0JvZHkgbm90IGFsbG93ZWQgZm9yIEdFVCBvciBIRUFEIHJlcXVlc3RzJylcbiAgICB9XG4gICAgdGhpcy5faW5pdEJvZHkob3B0aW9ucy5ib2R5KVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBoZWFkZXJzKHhocikge1xuICAgIHZhciBoZWFkID0gbmV3IEhlYWRlcnMoKVxuICAgIHZhciBwYWlycyA9IHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKS50cmltKCkuc3BsaXQoJ1xcbicpXG4gICAgcGFpcnMuZm9yRWFjaChmdW5jdGlvbihoZWFkZXIpIHtcbiAgICAgIHZhciBzcGxpdCA9IGhlYWRlci50cmltKCkuc3BsaXQoJzonKVxuICAgICAgdmFyIGtleSA9IHNwbGl0LnNoaWZ0KCkudHJpbSgpXG4gICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc6JykudHJpbSgpXG4gICAgICBoZWFkLmFwcGVuZChrZXksIHZhbHVlKVxuICAgIH0pXG4gICAgcmV0dXJuIGhlYWRcbiAgfVxuXG4gIFJlcXVlc3QucHJvdG90eXBlLmZldGNoID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICAgIGlmIChzZWxmLmNyZWRlbnRpYWxzID09PSAnY29ycycpIHtcbiAgICAgICAgeGhyLndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIHJlc3BvbnNlVVJMKCkge1xuICAgICAgICBpZiAoJ3Jlc3BvbnNlVVJMJyBpbiB4aHIpIHtcbiAgICAgICAgICByZXR1cm4geGhyLnJlc3BvbnNlVVJMXG4gICAgICAgIH1cblxuICAgICAgICAvLyBBdm9pZCBzZWN1cml0eSB3YXJuaW5ncyBvbiBnZXRSZXNwb25zZUhlYWRlciB3aGVuIG5vdCBhbGxvd2VkIGJ5IENPUlNcbiAgICAgICAgaWYgKC9eWC1SZXF1ZXN0LVVSTDovbS50ZXN0KHhoci5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSkpIHtcbiAgICAgICAgICByZXR1cm4geGhyLmdldFJlc3BvbnNlSGVhZGVyKCdYLVJlcXVlc3QtVVJMJylcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgc3RhdHVzID0gKHhoci5zdGF0dXMgPT09IDEyMjMpID8gMjA0IDogeGhyLnN0YXR1c1xuICAgICAgICBpZiAoc3RhdHVzIDwgMTAwIHx8IHN0YXR1cyA+IDU5OSkge1xuICAgICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgICAgc3RhdHVzOiBzdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogaGVhZGVycyh4aHIpLFxuICAgICAgICAgIHVybDogcmVzcG9uc2VVUkwoKVxuICAgICAgICB9XG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0O1xuICAgICAgICByZXNvbHZlKG5ldyBSZXNwb25zZShib2R5LCBvcHRpb25zKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgIH1cblxuICAgICAgeGhyLm9wZW4oc2VsZi5tZXRob2QsIHNlbGYudXJsLCB0cnVlKVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgICB9XG5cbiAgICAgIHNlbGYuaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUsIHZhbHVlcykge1xuICAgICAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQodHlwZW9mIHNlbGYuX2JvZHlJbml0ID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiBzZWxmLl9ib2R5SW5pdClcbiAgICB9KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLl9pbml0Qm9keShib2R5SW5pdClcbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnVybCA9IG51bGxcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9IG9wdGlvbnMuc3RhdHVzVGV4dFxuICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVyc1xuICAgIHRoaXMudXJsID0gb3B0aW9ucy51cmwgfHwgJydcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXNwb25zZS5wcm90b3R5cGUpXG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVycztcbiAgc2VsZi5SZXF1ZXN0ID0gUmVxdWVzdDtcbiAgc2VsZi5SZXNwb25zZSA9IFJlc3BvbnNlO1xuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF1ZXN0KHVybCwgb3B0aW9ucykuZmV0Y2goKVxuICB9XG4gIHNlbGYuZmV0Y2gucG9seWZpbGwgPSB0cnVlXG59KSgpO1xuIiwiLyohXG4gKiBAb3ZlcnZpZXcgZXM2LXByb21pc2UgLSBhIHRpbnkgaW1wbGVtZW50YXRpb24gb2YgUHJvbWlzZXMvQSsuXG4gKiBAY29weXJpZ2h0IENvcHlyaWdodCAoYykgMjAxNCBZZWh1ZGEgS2F0eiwgVG9tIERhbGUsIFN0ZWZhbiBQZW5uZXIgYW5kIGNvbnRyaWJ1dG9ycyAoQ29udmVyc2lvbiB0byBFUzYgQVBJIGJ5IEpha2UgQXJjaGliYWxkKVxuICogQGxpY2Vuc2UgICBMaWNlbnNlZCB1bmRlciBNSVQgbGljZW5zZVxuICogICAgICAgICAgICBTZWUgaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL2pha2VhcmNoaWJhbGQvZXM2LXByb21pc2UvbWFzdGVyL0xJQ0VOU0VcbiAqIEB2ZXJzaW9uICAgMi4wLjBcbiAqL1xuXG4oZnVuY3Rpb24oKXtmdW5jdGlvbiByKGEsYil7bltsXT1hO25bbCsxXT1iO2wrPTI7Mj09PWwmJkEoKX1mdW5jdGlvbiBzKGEpe3JldHVyblwiZnVuY3Rpb25cIj09PXR5cGVvZiBhfWZ1bmN0aW9uIEYoKXtyZXR1cm4gZnVuY3Rpb24oKXtwcm9jZXNzLm5leHRUaWNrKHQpfX1mdW5jdGlvbiBHKCl7dmFyIGE9MCxiPW5ldyBCKHQpLGM9ZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoXCJcIik7Yi5vYnNlcnZlKGMse2NoYXJhY3RlckRhdGE6ITB9KTtyZXR1cm4gZnVuY3Rpb24oKXtjLmRhdGE9YT0rK2ElMn19ZnVuY3Rpb24gSCgpe3ZhciBhPW5ldyBNZXNzYWdlQ2hhbm5lbDthLnBvcnQxLm9ubWVzc2FnZT10O3JldHVybiBmdW5jdGlvbigpe2EucG9ydDIucG9zdE1lc3NhZ2UoMCl9fWZ1bmN0aW9uIEkoKXtyZXR1cm4gZnVuY3Rpb24oKXtzZXRUaW1lb3V0KHQsMSl9fWZ1bmN0aW9uIHQoKXtmb3IodmFyIGE9MDthPGw7YSs9MikoMCxuW2FdKShuW2ErMV0pLG5bYV09dm9pZCAwLG5bYSsxXT12b2lkIDA7XG5sPTB9ZnVuY3Rpb24gcCgpe31mdW5jdGlvbiBKKGEsYixjLGQpe3RyeXthLmNhbGwoYixjLGQpfWNhdGNoKGUpe3JldHVybiBlfX1mdW5jdGlvbiBLKGEsYixjKXtyKGZ1bmN0aW9uKGEpe3ZhciBlPSExLGY9SihjLGIsZnVuY3Rpb24oYyl7ZXx8KGU9ITAsYiE9PWM/cShhLGMpOm0oYSxjKSl9LGZ1bmN0aW9uKGIpe2V8fChlPSEwLGcoYSxiKSl9KTshZSYmZiYmKGU9ITAsZyhhLGYpKX0sYSl9ZnVuY3Rpb24gTChhLGIpezE9PT1iLmE/bShhLGIuYik6Mj09PWEuYT9nKGEsYi5iKTp1KGIsdm9pZCAwLGZ1bmN0aW9uKGIpe3EoYSxiKX0sZnVuY3Rpb24oYil7ZyhhLGIpfSl9ZnVuY3Rpb24gcShhLGIpe2lmKGE9PT1iKWcoYSxuZXcgVHlwZUVycm9yKFwiWW91IGNhbm5vdCByZXNvbHZlIGEgcHJvbWlzZSB3aXRoIGl0c2VsZlwiKSk7ZWxzZSBpZihcImZ1bmN0aW9uXCI9PT10eXBlb2YgYnx8XCJvYmplY3RcIj09PXR5cGVvZiBiJiZudWxsIT09YilpZihiLmNvbnN0cnVjdG9yPT09YS5jb25zdHJ1Y3RvcilMKGEsXG5iKTtlbHNle3ZhciBjO3RyeXtjPWIudGhlbn1jYXRjaChkKXt2LmVycm9yPWQsYz12fWM9PT12P2coYSx2LmVycm9yKTp2b2lkIDA9PT1jP20oYSxiKTpzKGMpP0soYSxiLGMpOm0oYSxiKX1lbHNlIG0oYSxiKX1mdW5jdGlvbiBNKGEpe2EuZiYmYS5mKGEuYik7eChhKX1mdW5jdGlvbiBtKGEsYil7dm9pZCAwPT09YS5hJiYoYS5iPWIsYS5hPTEsMCE9PWEuZS5sZW5ndGgmJnIoeCxhKSl9ZnVuY3Rpb24gZyhhLGIpe3ZvaWQgMD09PWEuYSYmKGEuYT0yLGEuYj1iLHIoTSxhKSl9ZnVuY3Rpb24gdShhLGIsYyxkKXt2YXIgZT1hLmUsZj1lLmxlbmd0aDthLmY9bnVsbDtlW2ZdPWI7ZVtmKzFdPWM7ZVtmKzJdPWQ7MD09PWYmJmEuYSYmcih4LGEpfWZ1bmN0aW9uIHgoYSl7dmFyIGI9YS5lLGM9YS5hO2lmKDAhPT1iLmxlbmd0aCl7Zm9yKHZhciBkLGUsZj1hLmIsZz0wO2c8Yi5sZW5ndGg7Zys9MylkPWJbZ10sZT1iW2crY10sZD9DKGMsZCxlLGYpOmUoZik7YS5lLmxlbmd0aD0wfX1mdW5jdGlvbiBEKCl7dGhpcy5lcnJvcj1cbm51bGx9ZnVuY3Rpb24gQyhhLGIsYyxkKXt2YXIgZT1zKGMpLGYsayxoLGw7aWYoZSl7dHJ5e2Y9YyhkKX1jYXRjaChuKXt5LmVycm9yPW4sZj15fWY9PT15PyhsPSEwLGs9Zi5lcnJvcixmPW51bGwpOmg9ITA7aWYoYj09PWYpe2coYixuZXcgVHlwZUVycm9yKFwiQSBwcm9taXNlcyBjYWxsYmFjayBjYW5ub3QgcmV0dXJuIHRoYXQgc2FtZSBwcm9taXNlLlwiKSk7cmV0dXJufX1lbHNlIGY9ZCxoPSEwO3ZvaWQgMD09PWIuYSYmKGUmJmg/cShiLGYpOmw/ZyhiLGspOjE9PT1hP20oYixmKToyPT09YSYmZyhiLGYpKX1mdW5jdGlvbiBOKGEsYil7dHJ5e2IoZnVuY3Rpb24oYil7cShhLGIpfSxmdW5jdGlvbihiKXtnKGEsYil9KX1jYXRjaChjKXtnKGEsYyl9fWZ1bmN0aW9uIGsoYSxiLGMsZCl7dGhpcy5uPWE7dGhpcy5jPW5ldyBhKHAsZCk7dGhpcy5pPWM7dGhpcy5vKGIpPyh0aGlzLm09Yix0aGlzLmQ9dGhpcy5sZW5ndGg9Yi5sZW5ndGgsdGhpcy5sKCksMD09PXRoaXMubGVuZ3RoP20odGhpcy5jLFxudGhpcy5iKToodGhpcy5sZW5ndGg9dGhpcy5sZW5ndGh8fDAsdGhpcy5rKCksMD09PXRoaXMuZCYmbSh0aGlzLmMsdGhpcy5iKSkpOmcodGhpcy5jLHRoaXMucCgpKX1mdW5jdGlvbiBoKGEpe08rKzt0aGlzLmI9dGhpcy5hPXZvaWQgMDt0aGlzLmU9W107aWYocCE9PWEpe2lmKCFzKGEpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJZb3UgbXVzdCBwYXNzIGEgcmVzb2x2ZXIgZnVuY3Rpb24gYXMgdGhlIGZpcnN0IGFyZ3VtZW50IHRvIHRoZSBwcm9taXNlIGNvbnN0cnVjdG9yXCIpO2lmKCEodGhpcyBpbnN0YW5jZW9mIGgpKXRocm93IG5ldyBUeXBlRXJyb3IoXCJGYWlsZWQgdG8gY29uc3RydWN0ICdQcm9taXNlJzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3IsIHRoaXMgb2JqZWN0IGNvbnN0cnVjdG9yIGNhbm5vdCBiZSBjYWxsZWQgYXMgYSBmdW5jdGlvbi5cIik7Tih0aGlzLGEpfX12YXIgRT1BcnJheS5pc0FycmF5P0FycmF5LmlzQXJyYXk6ZnVuY3Rpb24oYSl7cmV0dXJuXCJbb2JqZWN0IEFycmF5XVwiPT09XG5PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYSl9LGw9MCx3PVwidW5kZWZpbmVkXCIhPT10eXBlb2Ygd2luZG93P3dpbmRvdzp7fSxCPXcuTXV0YXRpb25PYnNlcnZlcnx8dy5XZWJLaXRNdXRhdGlvbk9ic2VydmVyLHc9XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBVaW50OENsYW1wZWRBcnJheSYmXCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBpbXBvcnRTY3JpcHRzJiZcInVuZGVmaW5lZFwiIT09dHlwZW9mIE1lc3NhZ2VDaGFubmVsLG49QXJyYXkoMUUzKSxBO0E9XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBwcm9jZXNzJiZcIltvYmplY3QgcHJvY2Vzc11cIj09PXt9LnRvU3RyaW5nLmNhbGwocHJvY2Vzcyk/RigpOkI/RygpOnc/SCgpOkkoKTt2YXIgdj1uZXcgRCx5PW5ldyBEO2sucHJvdG90eXBlLm89ZnVuY3Rpb24oYSl7cmV0dXJuIEUoYSl9O2sucHJvdG90eXBlLnA9ZnVuY3Rpb24oKXtyZXR1cm4gRXJyb3IoXCJBcnJheSBNZXRob2RzIG11c3QgYmUgcHJvdmlkZWQgYW4gQXJyYXlcIil9O2sucHJvdG90eXBlLmw9XG5mdW5jdGlvbigpe3RoaXMuYj1BcnJheSh0aGlzLmxlbmd0aCl9O2sucHJvdG90eXBlLms9ZnVuY3Rpb24oKXtmb3IodmFyIGE9dGhpcy5sZW5ndGgsYj10aGlzLmMsYz10aGlzLm0sZD0wO3ZvaWQgMD09PWIuYSYmZDxhO2QrKyl0aGlzLmooY1tkXSxkKX07ay5wcm90b3R5cGUuaj1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMubjtcIm9iamVjdFwiPT09dHlwZW9mIGEmJm51bGwhPT1hP2EuY29uc3RydWN0b3I9PT1jJiZ2b2lkIDAhPT1hLmE/KGEuZj1udWxsLHRoaXMuZyhhLmEsYixhLmIpKTp0aGlzLnEoYy5yZXNvbHZlKGEpLGIpOih0aGlzLmQtLSx0aGlzLmJbYl09dGhpcy5oKGEpKX07ay5wcm90b3R5cGUuZz1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5jO3ZvaWQgMD09PWQuYSYmKHRoaXMuZC0tLHRoaXMuaSYmMj09PWE/ZyhkLGMpOnRoaXMuYltiXT10aGlzLmgoYykpOzA9PT10aGlzLmQmJm0oZCx0aGlzLmIpfTtrLnByb3RvdHlwZS5oPWZ1bmN0aW9uKGEpe3JldHVybiBhfTtcbmsucHJvdG90eXBlLnE9ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzO3UoYSx2b2lkIDAsZnVuY3Rpb24oYSl7Yy5nKDEsYixhKX0sZnVuY3Rpb24oYSl7Yy5nKDIsYixhKX0pfTt2YXIgTz0wO2guYWxsPWZ1bmN0aW9uKGEsYil7cmV0dXJuKG5ldyBrKHRoaXMsYSwhMCxiKSkuY307aC5yYWNlPWZ1bmN0aW9uKGEsYil7ZnVuY3Rpb24gYyhhKXtxKGUsYSl9ZnVuY3Rpb24gZChhKXtnKGUsYSl9dmFyIGU9bmV3IHRoaXMocCxiKTtpZighRShhKSlyZXR1cm4gKGcoZSxuZXcgVHlwZUVycm9yKFwiWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLlwiKSksIGUpO2Zvcih2YXIgZj1hLmxlbmd0aCxoPTA7dm9pZCAwPT09ZS5hJiZoPGY7aCsrKXUodGhpcy5yZXNvbHZlKGFbaF0pLHZvaWQgMCxjLGQpO3JldHVybiBlfTtoLnJlc29sdmU9ZnVuY3Rpb24oYSxiKXtpZihhJiZcIm9iamVjdFwiPT09dHlwZW9mIGEmJmEuY29uc3RydWN0b3I9PT10aGlzKXJldHVybiBhO3ZhciBjPW5ldyB0aGlzKHAsYik7XG5xKGMsYSk7cmV0dXJuIGN9O2gucmVqZWN0PWZ1bmN0aW9uKGEsYil7dmFyIGM9bmV3IHRoaXMocCxiKTtnKGMsYSk7cmV0dXJuIGN9O2gucHJvdG90eXBlPXtjb25zdHJ1Y3RvcjpoLHRoZW46ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLmE7aWYoMT09PWMmJiFhfHwyPT09YyYmIWIpcmV0dXJuIHRoaXM7dmFyIGQ9bmV3IHRoaXMuY29uc3RydWN0b3IocCksZT10aGlzLmI7aWYoYyl7dmFyIGY9YXJndW1lbnRzW2MtMV07cihmdW5jdGlvbigpe0MoYyxkLGYsZSl9KX1lbHNlIHUodGhpcyxkLGEsYik7cmV0dXJuIGR9LFwiY2F0Y2hcIjpmdW5jdGlvbihhKXtyZXR1cm4gdGhpcy50aGVuKG51bGwsYSl9fTt2YXIgej17UHJvbWlzZTpoLHBvbHlmaWxsOmZ1bmN0aW9uKCl7dmFyIGE7YT1cInVuZGVmaW5lZFwiIT09dHlwZW9mIGdsb2JhbD9nbG9iYWw6XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiB3aW5kb3cmJndpbmRvdy5kb2N1bWVudD93aW5kb3c6c2VsZjtcIlByb21pc2VcImluIGEmJlwicmVzb2x2ZVwiaW5cbmEuUHJvbWlzZSYmXCJyZWplY3RcImluIGEuUHJvbWlzZSYmXCJhbGxcImluIGEuUHJvbWlzZSYmXCJyYWNlXCJpbiBhLlByb21pc2UmJmZ1bmN0aW9uKCl7dmFyIGI7bmV3IGEuUHJvbWlzZShmdW5jdGlvbihhKXtiPWF9KTtyZXR1cm4gcyhiKX0oKXx8KGEuUHJvbWlzZT1oKX19O1wiZnVuY3Rpb25cIj09PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQ/ZGVmaW5lKGZ1bmN0aW9uKCl7cmV0dXJuIHp9KTpcInVuZGVmaW5lZFwiIT09dHlwZW9mIG1vZHVsZSYmbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9ejpcInVuZGVmaW5lZFwiIT09dHlwZW9mIHRoaXMmJih0aGlzLkVTNlByb21pc2U9eil9KS5jYWxsKHRoaXMpO1xuIiwiLyoqXG4gKiBAbmFtZSBqYW1lcyBvciB0b2JpXG4gKiBAbW9kdWxlIGphbWVzXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiAjIGphbWVzIC0gdG9iaXQgaGVscGVyIGxpYnJhcnlcbiAqIEhlbHBlciBsaWJyYXJ5IHN1cHBvcnRpbmcgdGhlIENoYXlucyBBUElcbiAqL1xuXG4vLyBUT0RPOiBtb3ZlIGFsbCB0byBoZWxwZXIuanMgb3IgdG9iaS9qYW1zXG4vLyBUT0RPOiBoZWxwZXIuanMgd2l0aCBFUzYgYW5kIGphc21pbmUgKGFuZCBvciB0YXBlKVxuLy8gaW5jbHVkZSBoZWxwZXIgYXMgbWFpbiBtb2R1bGVcblxuLy8gaW1wb3J0YW50IGlzKiBmdW5jdGlvbnNcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvaXMnO1xuXG4vLyBleHRlbmQgb2JqZWN0IGZ1bmN0aW9uXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2V4dGVuZCc7XG5cbi8vIExvZ2dlclxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9sb2dnZXInO1xuXG4vLyBUT0RPOiBkbyB3ZSBldmVuIG5lZWQgbW9kZXJuaXplcj9cbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9tb2Rlcm5pemVyJztcblxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9odHRwJztcblxuLy8gQnJvd3NlciBBUElzICh3aW5kb3csIGRvY3VtZW50LCBsb2NhdGlvbilcbi8vIFRPRE86IGNvbnNpZGVyIHRvIG5vdCBiaW5kIGJyb3dzZXIgdG8gdGhlIHV0aWxzIGBPYmplY3RgXG4vKiBqc2hpbnQgLVcxMTYgKi9cbi8qIGpzaGludCAtVzAzMyAqL1xuLy8ganNjczpkaXNhYmxlIHBhcnNlRXJyb3JcbmltcG9ydCAqIGFzIGJyb3dzZXIgZnJvbSAnLi91dGlscy9icm93c2VyJzsgLy9ub2luc3BlY3Rpb24gQmFkRXhwcmVzc2lvblN0YXRlbWVudEpTIGpzaGludCBpZ25vcmU6IGxpbmVcbi8vIGpzY3M6ZW5hYmxlIHBhcnNlRXJyb3Jcbi8qIGpzaGludCArVzAzMyAqL1xuLyoganNoaW50ICtXMTE2ICovXG5leHBvcnQge2Jyb3dzZXJ9O1xuXG4vLyBET01cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZG9tJztcblxuLy8gQW5hbHl0aWNzXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvYW5hbHl0aWNzJztcblxuLy8gUmVtb3RlXG4vLyByZW1vdGUgZGVidWdnaW5nIGFuZCBhbmFseXNpc1xuXG4vLyBmcm9udC1lbmQgRXJyb3IgSGFuZGxlciAoY2F0Y2hlcyBlcnJvcnMsIGlkZW50aWZ5IGFuZCBhbmFseXNlcyB0aGVtKVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9lcnJvcic7XG5cbi8vIGF1dGggJiBKV1QgaGFuZGxlclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2p3dCc7XG5cbi8vIGNvb2tpZSBoYW5kbGVyICh3aWxsIGJlIHVzZWQgaW4gdGhlIGxvY2FsX3N0b3JhZ2UgYXMgZmFsbGJhY2spXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvY29va2llX2hhbmRsZXInO1xuXG4vLyBsb2NhbFN0b3JhZ2UgaGVscGVyICh3aGljaCBjb29raWUgZmFsbGJhY2spXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbG9jYWxfc3RvcmFnZSc7XG5cbi8vIG1pY3JvIGV2ZW50IGxpYnJhcnlcbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXZlbnRzJztcblxuLy8gb2ZmbGluZSBjYWNoZSBoZWxwZXJcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9vZmZsaW5lX2NhY2hlJztcblxuLy8gbm90aWZpY2F0aW9uczogdG9hc3RzLCBhbGVydHMsIG1vZGFsIHBvcHVwcywgbmF0aXZlIHB1c2hcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9ub3RpZmljYXRpb25zJztcblxuLy8gaWZyYW1lIGNvbW11bmljYXRpb24gYW5kIGhlbHBlciAoQ09SUylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9pZnJhbWUnO1xuXG4vLyBwYWdlIHZpc2liaWxpdHkgQVBJXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvcGFnZV92aXNpYmlsaXR5JztcblxuLy8gRGF0ZVRpbWUgaGVscGVyIChjb252ZXJ0cyBkYXRlcywgQyMgZGF0ZSwgdGltZXN0YW1wcywgaTE4biwgdGltZSBhZ28pXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvZGF0ZXRpbWUnO1xuXG5cbi8vIGxhbmd1YWdlIEFQSSBpMThuXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvbGFuZ3VhZ2UnO1xuXG4vLyBjcml0aWNhbCBjc3NcblxuLy8gbG9hZENTU1xuXG4vLyBsYXp5IGxvYWRpbmdcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sYXp5X2xvYWRpbmcnO1xuXG4vLyAoaW1hZ2UpIHByZWxvYWRlclxuLy9leHBvcnQgKiBmcm9tICcvdXRpbHMvcHJlbG9hZGVyJztcblxuLy8gaXNQZW1pdHRlZCBBcHAgVmVyc2lvbiBjaGVja1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9pc19wZXJtaXR0ZWQnO1xuXG5cbi8vIGluIEZ1dHVyZVxuLy8gaW1tdXRhYmxlXG4vLyB3ZWFrIG1hcHNcbi8vIG9ic2VydmVyXG4vLyB3ZWIgc29ja2V0cyAod3MsIFNpZ25hbFIpXG4vLyB3b3JrZXIgKHNoYXJlZCB3b3JrZXIsIGxhdGVyIHNlcnZpY2Ugd29ya2VyIGFzIHdlbGwpXG4vLyBsb2NhdGlvbiwgcHVzaFN0YXRlLCBoaXN0b3J5IGhhbmRsZXJcbi8vIGNoYXlucyBzaXRlIGFuZCBjb2RlIGFuYWx5c2VyOiBmaW5kIGRlcHJlY2F0ZWQgbWV0aG9kcywgYmFkIGNvZGUsIGlzc3VlcyBhbmQgYm90dGxlbmVja3NcblxuIiwiLyoqXG4gKiBUaGlzIG1vZHVsZSBjb250YWlucyB0aGUgQnJvd3NlciBBUElzXG4gKlxuICovXG4vLyBUT0RPOiBtb3ZlIG91dCBvZiB1dGlsc1xudmFyIHdpbiA9IHdpbmRvdztcblxuLy8gdXNpbmcgbm9kZSBnbG9iYWwgKG1haW5seSBmb3IgdGVzdGluZywgZGVwZW5kZW5jeSBtYW5hZ2VtZW50KVxudmFyIF9nbG9iYWwgPSB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHdpbmRvdztcbmV4cG9ydCB7X2dsb2JhbCBhcyBnbG9iYWx9O1xuXG5leHBvcnQge3dpbiBhcyB3aW5kb3d9O1xuZXhwb3J0IHZhciBkb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudDtcbmV4cG9ydCB2YXIgbG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb247XG5leHBvcnQgdmFyIG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3I7XG5leHBvcnQgdmFyIGNoYXlucyA9IHdpbmRvdy5jaGF5bnM7XG5leHBvcnQgdmFyIGNoYXluc0NhbGxiYWNrcyA9IHdpbmRvdy5fY2hheW5zQ2FsbGJhY2tzO1xuZXhwb3J0IHZhciBjaGF5bnNSb290ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXlucy1yb290Jyk7XG5leHBvcnQgdmFyIHBhcmVudCA9IHdpbmRvdy5wYXJlbnQ7XG5leHBvcnQgdmFyIGNvbnNvbGUgPSB3aW5kb3cuY29uc29sZTsgLy8gTk9URTogc2hvdWxkIG5vdCBiZSB1c2VkLiB1c2UgbG9nZ2VyIGluc3RlYWRcbmV4cG9ydCB2YXIgZ2MgPSB3aW5kb3cuZ2MgPyAoKSA9PiB3aW5kb3cuZ2MoKSA6ICgpID0+IG51bGw7XG5cbiIsIi8vIGluc3BpcmVkIGJ5IEFuZ3VsYXIyJ3MgRE9NXG5cbmltcG9ydCB7ZG9jdW1lbnR9IGZyb20gJy4vYnJvd3Nlcic7XG5pbXBvcnQge2lzVW5kZWZpbmVkfSBmcm9tICcuL2lzJztcblxuZXhwb3J0IGNsYXNzIERPTSB7XG5cbiAgLy8gTk9URTogYWx3YXlzIHJldHVybnMgYW4gYXJyYXlcbiAgc3RhdGljICQoc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbC5iaW5kKGRvY3VtZW50KTtcbiAgfVxuXG4gIC8vIHNlbGVjdG9yc1xuICBzdGF0aWMgcXVlcnkoc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5U2VsZWN0b3IoZWwsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGVsLnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBxdWVyeVNlbGVjdG9yQWxsKGVsLCBzZWxlY3Rvcikge1xuICAgIHJldHVybiBlbC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgb24oZWwsIGV2dCwgbGlzdGVuZXIpIHtcbiAgICBlbC5hZGRFdmVudExpc3RlbmVyKGV2dCwgbGlzdGVuZXIsIGZhbHNlKTtcbiAgfVxuXG4gIC8vIG5vZGVzICYgZWxlbWVudHNcbiAgc3RhdGljIGNsb25lKG5vZGUpIHtcbiAgICByZXR1cm4gbm9kZS5jbG9uZU5vZGUodHJ1ZSk7XG4gIH1cbiAgc3RhdGljIGhhc1Byb3BlcnR5KGVsZW1lbnQsIG5hbWUpIHtcbiAgICByZXR1cm4gbmFtZSBpbiBlbGVtZW50O1xuICB9XG4gIHN0YXRpYyBnZXRFbGVtZW50c0J5Q2xhc3NOYW1lKGVsZW1lbnQsIG5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKG5hbWUpO1xuICB9XG4gIHN0YXRpYyBnZXRFbGVtZW50c0J5VGFnTmFtZShlbGVtZW50LCBuYW1lKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUobmFtZSk7XG4gIH1cblxuICAvLyBpbnB1dFxuICBzdGF0aWMgZ2V0SW5uZXJIVE1MKGVsKSB7XG4gICAgcmV0dXJuIGVsLmlubmVySFRNTDtcbiAgfVxuICBzdGF0aWMgZ2V0T3V0ZXJIVE1MKGVsKSB7XG4gICAgcmV0dXJuIGVsLm91dGVySFRNTDtcbiAgfVxuICBzdGF0aWMgc2V0SFRNTChlbCwgdmFsdWUpIHtcbiAgICBlbC5pbm5lckhUTUwgPSB2YWx1ZTtcbiAgfVxuICBzdGF0aWMgZ2V0VGV4dChlbCkge1xuICAgIHJldHVybiBlbC50ZXh0Q29udGVudDtcbiAgfVxuICBzdGF0aWMgc2V0VGV4dChlbCwgdmFsdWUpIHtcbiAgICBlbC50ZXh0Q29udGVudCA9IHZhbHVlO1xuICB9XG5cbiAgLy8gaW5wdXQgdmFsdWVcbiAgc3RhdGljIGdldFZhbHVlKGVsKSB7XG4gICAgcmV0dXJuIGVsLnZhbHVlO1xuICB9XG4gIHN0YXRpYyBzZXRWYWx1ZShlbCwgdmFsdWUpIHtcbiAgICBlbC52YWx1ZSA9IHZhbHVlO1xuICB9XG5cbiAgLy8gY2hlY2tib3hlc1xuICBzdGF0aWMgZ2V0Q2hlY2tlZChlbCkge1xuICAgIHJldHVybiBlbC5jaGVja2VkO1xuICB9XG4gIHN0YXRpYyBzZXRDaGVja2VkKGVsLCB2YWx1ZSkge1xuICAgIGVsLmNoZWNrZWQgPSB2YWx1ZTtcbiAgfVxuXG4gIC8vIGNsYXNzXG4gIHN0YXRpYyBjbGFzc0xpc3QoZWxlbWVudCkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlbGVtZW50LmNsYXNzTGlzdCwgMCk7XG4gIH1cbiAgc3RhdGljIGFkZENsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICBlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoY2xhc3NOYW1lKTtcbiAgfVxuICBzdGF0aWMgaGFzQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSk7XG4gIH1cblxuICAvLyBjc3NcbiAgc3RhdGljIGNzcyhlbGVtZW50LCBzdHlsZU5hbWUsIHN0eWxlVmhhc2FsdWUpIHtcbiAgICBpZihpc1VuZGVmaW5lZChzdHlsZVZhbHVlKSkge1xuICAgICAgcmV0dXJuIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXTtcbiAgICB9XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gc3R5bGVWYWx1ZTtcbiAgfVxuICBzdGF0aWMgc2V0Q1NTKGVsZW1lbnQsIHN0eWxlTmFtZSwgc3R5bGVWYWx1ZSkge1xuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IHN0eWxlVmFsdWU7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUNTUyhlbGVtZW50LCBzdHlsZU5hbWUpIHtcbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBudWxsO1xuICB9XG4gIHN0YXRpYyBnZXRDU1MoZWxlbWVudCwgc3R5bGVOYW1lKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXTtcbiAgfVxuXG4gIC8vIG5vZGVzICYgZWxlbWVudHNcbiAgc3RhdGljIGNyZWF0ZUVsZW1lbnQodGFnTmFtZSwgZG9jPWRvY3VtZW50KSB7XG4gICAgcmV0dXJuIGRvYy5jcmVhdGVFbGVtZW50KHRhZ05hbWUpO1xuICB9XG5cbiAgc3RhdGljIHJlbW92ZShlbCkge1xuICAgIHZhciBwYXJlbnQgPSBlbC5wYXJlbnROb2RlO1xuICAgIHBhcmVudC5yZW1vdmVDaGlsZChlbCk7XG4gICAgcmV0dXJuIGVsO1xuICB9XG5cbiAgc3RhdGljIGFwcGVuZENoaWxkKGVsLCBub2RlKSB7XG4gICAgZWwuYXBwZW5kQ2hpbGQobm9kZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUNoaWxkKGVsLCBub2RlKSB7XG4gICAgZWwucmVtb3ZlQ2hpbGQobm9kZSk7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0QmVmb3JlKGVsLCBub2RlKSB7XG4gICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgZWwpO1xuICB9XG5cbiAgc3RhdGljIGluc2VydEFmdGVyKGVsLCBub2RlKSB7XG4gICAgZWwucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgZWwubmV4dFNpYmxpbmcpO1xuICB9XG5cbiAgc3RhdGljIHRhZ05hbWUoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50LnRhZ05hbWU7XG4gIH1cblxuICAvLyBhdHRyaWJ1dGVzXG4gIHN0YXRpYyBnZXRBdHRyaWJ1dGUoZWxlbWVudCwgYXR0cmlidXRlKSB7XG4gICAgcmV0dXJuIGVsZW1lbnQuZ2V0QXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gIH1cbiAgc3RhdGljIHNldEF0dHJpYnV0ZShlbGVtZW50LCBuYW1lLCB2YWx1ZSkge1xuICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQXR0cmlidXRlKGVsZW1lbnQsIGF0dHJpYnV0ZSkge1xuICAgIGlmICghZWxlbWVudCkge1xuICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICB9XG59XG4iLCIvKipcbiAqIEVycm9yIEhhbmRsZXIgTW9kdWxlXG4gKi9cblxuLy8gVE9ETzogY29uc2lkZXIgaW1wb3J0aW5nIGZyb20gJy4vdXRpbHMnIG9ubHlcbmltcG9ydCB7d2luZG93IGFzIHdpbn0gZnJvbSAnLi9icm93c2VyJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQge0NvbmZpZ30gZnJvbSAnLi4vY2hheW5zL2NvbmZpZyc7XG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5lcnJvcicpO1xuXG53aW4uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcbiAgbGV0IGxpbmVBbmRDb2x1bW5JbmZvID1cbiAgICBlcnIuY29sbm9cbiAgICAgID8gJyBsaW5lOicgKyBlcnIubGluZW5vICsgJywgY29sdW1uOicgKyBlcnIuY29sbm9cbiAgICAgIDogJyBsaW5lOicgKyBlcnIubGluZW5vO1xuXG4gIGxldCBmaW5hbEVycm9yID0gW1xuICAgICAgJ0phdmFTY3JpcHQgRXJyb3InLFxuICAgICAgZXJyLm1lc3NhZ2UsXG4gICAgICBlcnIuZmlsZW5hbWUgKyBsaW5lQW5kQ29sdW1uSW5mbyArICcgLT4gJyArICBuYXZpZ2F0b3IudXNlckFnZW50LFxuICAgICAgMCxcbiAgICAgIHRydWVcbiAgXTtcblxuICAvLyBUT0RPOiBhZGQgcHJvcGVyIEVycm9yIEhhbmRsZXJcbiAgbG9nLndhcm4oZmluYWxFcnJvcik7XG4gIGlmKENvbmZpZy5nZXQoJ3ByZXZlbnRFcnJvcnMnKSkge1xuICAgIGVyci5wcmV2ZW50RGVmYXVsdCgpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn0pO1xuIiwiLy8gVE9ETzogcmVmYWN0b3IgYW5kIHdyaXRlIHRlc3RzXG4vLyBUT0RPOiBhZGQgZXhhbXBsZVxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiBgYGBqc1xuIC8vIERlbW9cblxuIGV2ZW50cy5wdWJsaXNoKCcvcGFnZS9sb2FkJywge1xuXHR1cmw6ICcvc29tZS91cmwvcGF0aCcgLy8gYW55IGFyZ3VtZW50XG59KTtcblxuIHZhciBzdWJzY3JpcHRpb24gPSBldmVudHMuc3Vic2NyaWJlKCcvcGFnZS9sb2FkJywgZnVuY3Rpb24ob2JqKSB7XG5cdC8vIERvIHNvbWV0aGluZyBub3cgdGhhdCB0aGUgZXZlbnQgaGFzIG9jY3VycmVkXG59KTtcblxuIC8vIC4uLnNvbWV0aW1lIGxhdGVyIHdoZXJlIEkgbm8gbG9uZ2VyIHdhbnQgc3Vic2NyaXB0aW9uLi4uXG4gc3Vic2NyaXB0aW9uLnJlbW92ZSgpO1xuXG4gLy8gIHZhciB0YXJnZXQgPSB3aW5kb3cuZXZlbnQgPyB3aW5kb3cuZXZlbnQuc3JjRWxlbWVudCA6IGUgPyBlLnRhcmdldCA6IG51bGw7XG4gYGBgXG4gKi9cbmV4cG9ydCB2YXIgZXZlbnRzID0gKGZ1bmN0aW9uKCkge1xuICBsZXQgdG9waWNzID0ge307XG4gIGxldCBvd25Qcm9wZXJ0eSA9IHRvcGljcy5oYXNPd25Qcm9wZXJ0eTtcblxuICByZXR1cm4ge1xuICAgIHN1YnNjcmliZTogZnVuY3Rpb24odG9waWMsIGxpc3RlbmVyKSB7XG4gICAgICAvLyBDcmVhdGUgdGhlIHRvcGljJ3Mgb2JqZWN0IGlmIG5vdCB5ZXQgY3JlYXRlZFxuICAgICAgaWYgKCFvd25Qcm9wZXJ0eS5jYWxsKHRvcGljcywgdG9waWMpKSB7XG4gICAgICAgIHRvcGljc1t0b3BpY10gPSBbXTtcbiAgICAgIH1cblxuICAgICAgLy8gQWRkIHRoZSBsaXN0ZW5lciB0byBxdWV1ZVxuICAgICAgbGV0IGluZGV4ID0gdG9waWNzW3RvcGljXS5wdXNoKGxpc3RlbmVyKSAtMTtcblxuICAgICAgLy8gUHJvdmlkZSBoYW5kbGUgYmFjayBmb3IgcmVtb3ZhbCBvZiB0b3BpY1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBkZWxldGUgdG9waWNzW3RvcGljXVtpbmRleF07XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSxcblxuICAgIHB1Ymxpc2g6IGZ1bmN0aW9uKHRvcGljLCBpbmZvKSB7XG4gICAgICAvLyBJZiB0aGUgdG9waWMgZG9lc24ndCBleGlzdCwgb3IgdGhlcmUncyBubyBsaXN0ZW5lcnMgaW4gcXVldWUsIGp1c3QgbGVhdmVcbiAgICAgIGlmICghb3duUHJvcGVydHkuY2FsbCh0b3BpY3MsIHRvcGljKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIEN5Y2xlIHRocm91Z2ggdG9waWNzIHF1ZXVlLCBmaXJlIVxuICAgICAgdG9waWNzW3RvcGljXS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgaXRlbShpbmZvICE9PSB1bmRlZmluZWQgPyBpbmZvIDoge30pO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG59KSgpO1xuIiwiLyoqXG4gKiBAbmFtZSBqYW1lcy5leHRlbmRcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEV4dGVuZHMgdGhlIGRlc3RpbmF0aW9uIG9iamVjdCBieSBjb3B5aW5nIHByb3BlcnRpZXMgZnJvbSB0aGUgc3JjIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuXG5pbXBvcnQge2lzT2JqZWN0fSBmcm9tICcuL2lzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGV4dGVuZChvYmopIHtcbiAgaWYgKCFpc09iamVjdChvYmopKSB7XG4gICAgcmV0dXJuIG9iajtcbiAgfVxuICB2YXIgc291cmNlLCBwcm9wO1xuICBmb3IgKHZhciBpID0gMSwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgc291cmNlID0gYXJndW1lbnRzW2ldO1xuICAgIGZvciAocHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cbiIsIi8vaW1wb3J0IHt3aW5kb3d9IGZyb20gJy4vYnJvd3Nlcic7XG4vKiBnbG9iYWwgZmV0Y2ggKi9cbmltcG9ydCB7XG4gIGdldExvZ2dlcixcbiAgaXNGb3JtRWxlbWVudCxcbiAgaXNTdHJpbmcsXG4gIGlzT2JqZWN0LFxuICBpc0Zvcm1EYXRhXG4gIH0gZnJvbSAnLi4vdXRpbHMnO1xuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMudXRpbHMuaHR0cCcpO1xuLy9sZXQgUHJvbWlzZSA9IHdpbmRvdy5Qcm9taXNlOyAvLyBvdGhlcndpc2UgaW1wb3J0IFByb21pc2Vcbi8vbGV0IGZldGNoID0gd2luZG93LmZldGNoOyAvLyBvdGhlcndpc2UgVE9ETzogaW1wb3J0IGZldGNoXG5cblxuXG5cbi8qKlxuICogRmV0Y2ggSlNPTiB2aWEgR0VUXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHJldHVybnMge1Byb21pc2V9IGpzb24gcmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmZXRjaEpTT04odXJsKSB7XG4gIHJldHVybiBmZXRjaCh1cmwpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgIHJldHVybiByZXNwb25zZS5qc29uKCk7XG4gICAgfSk7XG59XG5cbi8qKlxuICogUGVyZm9ybXMgUE9TVCBSZXF1ZXN0XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtIVE1MRm9ybUVsZW1lbnRcXEZvcm1EYXRhXFxVUkxTZWFyY2hQYXJhbXNcXFVTVlN0cmluZ1xcQmxvYnxCdWZmZXJTb3VyY2V9IGZvcm1cbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdEZvcm0odXJsLCBmb3JtKSB7XG4gIGlmIChpc0Zvcm1FbGVtZW50KGZvcm0pKSB7XG4gICAgZm9ybSA9IG5ldyBGb3JtRGF0YShmb3JtKTtcbiAgfVxuICByZXR1cm4gZmV0Y2godXJsLCB7XG4gICAgbWV0aG9kOiAncG9zdCcsXG4gICAgYm9keTogZm9ybVxuICB9KTtcbn1cblxuLyoqXG4gKiBQb3N0IEpTT05cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge2BPYmplY3RgfSBkYXRhIEVpdGhlciBPYmplY3Qgb3IgSlNPTiBTdHJpbmdcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5leHBvcnQgZnVuY3Rpb24gcG9zdCh1cmwsIGRhdGEpIHtcbiAgaWYgKGlzT2JqZWN0KGRhdGEpKSB7XG4gICAgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICB9IGVsc2UgaWYgKCFpc1N0cmluZyhkYXRhKSkge1xuICAgIGxvZy53YXJuKCdwb3N0SlNPTjogaW52YWxpZCBkYXRhJyk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHBvc3QgZGF0YScpO1xuICB9XG4gIHJldHVybiBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIH0sXG4gICAgYm9keTogZGF0YVxuICB9KTtcbn1cblxuLyoqXG4gKiBVcGxvYWQgZmlsZVxuICogVE9ETzogYWRkIGFkZGl0aW9uYWwgcGFyYW1zIG9wdGlvbnNcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7SW5wdXQuZmlsZXxGb3JtRGF0YX0gZGF0YVxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBsb2FkKHVybCwgZGF0YSwgbmFtZSkge1xuICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpO1xuICBpZiAoIWlzRm9ybURhdGEoZGF0YSkpIHtcbiAgICBmb3JtLmFwcGVuZChuYW1lIHx8ICdmaWxlJywgZGF0YSk7XG4gIH0gZWxzZSB7XG4gICAgZm9ybSA9IGRhdGE7XG4gIH1cblxuICByZXR1cm4gZmV0Y2godXJsLCB7XG4gICAgbWV0aG9kOiAncG9zdCcsXG4gICAgYm9keTogZm9ybVxuICB9KTtcbn1cblxuLyoqXG4gKiBGZXRjaCB0ZXh0IG9yIEhUTUwgdmlhIEdFVFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEByZXR1cm5zIHtQcm9taXNlfSB3aXRoIHRlc3QgcmVzdWx0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXQodXJsKSB7XG4gIHJldHVybiBmZXRjaCh1cmwpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgIHJldHVybiByZXNwb25zZS50ZXh0KCk7XG4gICAgfSk7XG59XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmlzVW5kZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyB1bmRlZmluZWQuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHVuZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzRGVmaW5lZFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgZGVmaW5lZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGVmaW5lZCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlICE9PSAndW5kZWZpbmVkJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc1ByZXNlbnRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIG5laXRoZXIgdW5kZWZpbmVkIG5vciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBwcmVzZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcmVzZW50KG9iaikge1xuICByZXR1cm4gb2JqICE9PSB1bmRlZmluZWQgJiYgb2JqICE9PSBudWxsO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQmxhbmtcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGVpdGhlciB1bmRlZmluZWQgb3IgbnVsbC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYmxhbmsuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0JsYW5rKG9iaikge1xuICByZXR1cm4gb2JqID09PSB1bmRlZmluZWQgfHwgb2JqID09PSBudWxsO1xufVxuXG5cbi8qKlxuKiBAbmFtZSBqYW1lcy5pc1N0cmluZ1xuKiBAbW9kdWxlIGphbWVzXG4qIEBraW5kIGZ1bmN0aW9uXG4qXG4qIEBkZXNjcmlwdGlvblxuKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFN0cmluZ2AuXG4qXG4qIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYFN0cmluZ2AuXG4qL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzTnVtYmVyXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBOdW1iZXJgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBOdW1iZXJgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNPYmplY3RcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYE9iamVjdGAuXG4gKiBudWxsIGlzIG5vdCB0cmVhdGVkIGFzIGFuIG9iamVjdC5cbiAqIEluIEpTIGFycmF5cyBhcmUgb2JqZWN0c1xuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYE9iamVjdGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0FycmF5XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGFuIGBBcnJheWAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGFuIGBBcnJheWAuXG4gKi9cbmV4cG9ydCB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNGdW5jdGlvblxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgRnVuY3Rpb25gLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBGdW5jdGlvbmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEYXRlXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHZhbHVlIGlzIGEgZGF0ZS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgRGF0ZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0RhdGUodmFsdWUpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5cbi8vIFRPRE86IGRvZXMgbm90IGJlbG9uZyBpbiBoZXJlXG4vKipcbiAqIEBuYW1lIHV0aWxzLnRyaW1cbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUmVtb3ZlcyB3aGl0ZXNwYWNlcy5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtTdHJpbmd8Kn0gVHJpbW1lZCAgdmFsdWVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyaW0odmFsdWUpIHtcbiAgcmV0dXJuIGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKSA6IHZhbHVlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzVVVJRFxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYFVVSURgIChPU0YpLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBVVUlEYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzVVVJRCh2YWx1ZSkge1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFsdWUgPSB0cmltKHZhbHVlKTtcbiAgICByZXR1cm4gdmFsdWUubWF0Y2goL15bMC05YS1mXXs0fShbMC05YS1mXXs0fS0pezR9WzAtOWEtel17MTJ9JC9pKSAhPT0gbnVsbDtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNHVUlEXG4gKiBAYWxpYXMgdXRpbHMuaXNVVUlEXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgR1VJRGAgKE1pY3Jvc29mdCBTdGFuZGFyZCkuXG4gKiBJcyBhbiBhbGlhcyB0byBpc1VVSURcbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgR1VJRGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0dVSUQodmFsdWUpIHtcbiAgcmV0dXJuIGlzVVVJRCh2YWx1ZSk7XG59XG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzTWFjQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE1BQyBBZGRyZXNzYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNYWNBZGRyZXNzKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXihbMC05YS1mXXsyfVstOl0pezV9WzAtOWEtZl17Mn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0JMRUFkZHJlc3NcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBCTEUgQWRkcmVzc2BcbiAqXG4gKiBAcGFyYW0geyp9IG9iaiBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEJMRSBBZGRyZXNzYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQkxFQWRkcmVzcyh2YWx1ZSkge1xuICByZXR1cm4gaXNVVUlEKHZhbHVlKSB8fCBpc01hY0FkZHJlc3ModmFsdWUpO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzRm9ybURhdGFcbiAqIEBtb2R1bGUgdXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgRm9ybURhdGEgYE9iamVjdGAuXG4gKlxuICogQHBhcmFtIHsqfSBvYmogUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYG9iamAgaXMgYSBgRm9ybURhdGFgIE9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRm9ybURhdGEob2JqKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEZvcm1EYXRhXSc7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNGb3JtRWxlbWVudFxuICogQG1vZHVsZSB1dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBGb3JtRWxlbWVudC5cbiAqXG4gKiBAcGFyYW0geyp9IG9iaiBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgb2JqYCBpcyBhIGBIVE1MRm9ybUVsZW1lbnRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGb3JtRWxlbWVudChvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgSFRNTEZvcm1FbGVtZW50XSc7XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3R9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5pc19wZXJtaXR0ZWQnKTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBjdXJyZW50IHVzZXIncyBPUyBhbmQgT1MgVmVyc2lvbiBpcyBoaWdoZXJcbiAqIG9yIGVxdWFsIHRvIHRoZSBwYXNzZWQgcmVmZXJlbmNlIGBPYmplY3RgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJzaW9ucyBWZXJzaW9ucyBgT2JqZWN0YCB3aXRoIHBlcm1pdHRlZCBPU3MgYW5kIHRoZWlyIHZlcnNpb24uXG4gKiBAcGFyYW0ge3N0cmluZ30gb3MgT1MgTmFtZSBhcyBsb3dlcmNhc2Ugc3RyaW5nLlxuICogQHBhcmFtIHtJbnRlZ2VyfSBhcHBWZXJzaW9uIEFwcCBWZXJzaW9uIE51bWJlciBhcyBJbnRlZ2VyICBUT0RPOiBmb3JtYXQgUkZDP1xuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGN1cnJlbnQgT1MgJiBWZXJzaW9uIGFyZSBkZWZpbmVkIGluIHRoZSB2ZXJzaW9ucyBgT2JqZWN0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIG9zLCBhcHBWZXJzaW9uKSB7XG5cbiAgaWYgKCF2ZXJzaW9ucyB8fCAhaXNPYmplY3QodmVyc2lvbnMpKSB7XG4gICAgbG9nLndhcm4oJ25vIHZlcnNpb25zIGBPYmplY3RgIHdhcyBwYXNzZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbnNbb3NdICYmIGFwcFZlcnNpb24gPj0gdmVyc2lvbnNbb3NdO1xufVxuIiwiLyoqXG4gKiBMb2dMZXZlbCBFbnVtXG4gKiBub25lIGlzIDBcbiAqIGRlYnVnIGlzIDRcbiAqIEB0eXBlIEVudW1cbiAqL1xuZXhwb3J0IHZhciBsZXZlbHMgPSB7XG4gIG5vbmU6IDAsXG4gIGVycm9yOjEsXG4gIHdhcm46MixcbiAgaW5mbzozLFxuICBkZWJ1Zzo0XG59O1xuXG4vKipcbiAqIENhbiBzdG9yZSBtdWx0aXBsZSBsb2dnZXJzXG4gKiBAdHlwZSB7YE9iamVjdGB9IGxvZ2dlcnNcbiAqL1xubGV0IGxvZ2dlcnMgPSB7fTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEFzc2lnbiB0aGUgbG9nZ2VyIG1ldGhvZC5cbiAqIEJ5IGRlZmF1bHQgdGhlIHdpbmRvdy5jb25zb2xlIGBPYmplY3RgXG4gKiBAdHlwZSBgd2luZG93LmNvbnNvbGVgXG4gKi9cbmxldCBsb2dnZXIgPSB3aW5kb3cuY29uc29sZTtcblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nIExldmVsXG4gKiB1c2UgYHNldExldmVsKG5ld0xvZ0xldmVsKWAgdG8gb3ZlcndyaXRlIHRoaXMgdmFsdWUuXG4gKiBUT0RPOiBlYWNoIGxvZ2dlciBnZXRzIGFuIG93biBsb2dMZXZlbFxuICovXG5sZXQgbG9nTGV2ZWwgPSBsZXZlbHMubm9uZTtcblxuLyoqXG4gKlxuICogQHBhcmFtIGxldmVsXG4gKiBAcGFyYW0gYXJnc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gbG9nKGxldmVsLCBhcmdzLCBwcmVmaXgpIHtcbiAgbGV0IHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICBpZiAocHJlZml4KSB7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJncyk7XG4gICAgLy9hcmdzLnVuc2hpZnQodGltZSk7IC8vIFRPRE86IGNvbnNpZGVyIHRvZ2dsZWFibGUgdGltZVxuICAgIGFyZ3MudW5zaGlmdChwcmVmaXgpO1xuICB9XG4gIGxvZ2dlcltsZXZlbCB8fCAnbG9nJ10uYXBwbHkoY29uc29sZSwgYXJncyk7XG59XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IGxvZ0xldmVsXG4gKiBpbiBvcmRlciB0byBzaG93IG9yIG5vdCBzaG93IGxvZ3NcbiAqIEBwYXJhbSBsZXZlbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TGV2ZWwobGV2ZWwpIHtcbiAgbG9nTGV2ZWwgPSBsZXZlbDtcbn1cblxuLyoqXG4gKiBHZXQgTG9nZ2VyIFNpbmdsZXRvbiBJbnN0YW5jZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIFRoZSBMb2dnZXIncyBuYW1lXG4gKiBAcmV0dXJucyB7TG9nZ2VyfSBMb2dnZXIgaW5zdGFuY2UsIGVpdGhlciBleGlzdGluZyBvbmUgb3IgY3JlYXRlcyBhIG5ldyBvbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XG4gIHJldHVybiBsb2dnZXJzW25hbWVdIHx8IChsb2dnZXJzW25hbWVdID0gbmV3IExvZ2dlcihuYW1lKSk7XG59XG5cbi8qKlxuICogTG9nZ2VyIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuXG4gIC8qKlxuICAgKiBFYWNoIGxvZ2dlciBpcyBpZGVudGlmaWVkIGJ5IGl0J3MgbmFtZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbG9nZ2VyIChlLmcuIGBjaGF5bnMuY29yZWApXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gJ1snICsgbmFtZSArICddOiAnO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlYnVnXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZGVidWcoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2RlYnVnJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgaW5mby5cbiAgICpcbiAgICogQG1ldGhvZCBpbmZvXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgaW5mbygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnaW5mbycsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nLlxuICAgKlxuICAgKiBAbWV0aG9kIHdhcm5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICB3YXJuKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2coJ3dhcm4nLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvci5cbiAgICpcbiAgICogQG1ldGhvZCBlcnJvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGVycm9yKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdlcnJvcicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuTXV0YXRpb25PYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG5cbiAgICBpZiAoY2FuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICB2YXIgaGlkZGVuRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHF1ZXVlTGlzdCA9IHF1ZXVlLnNsaWNlKCk7XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgcXVldWVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCd5ZXMnLCAnbm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIlxuaW1wb3J0IHtjaGF5bnN9IGZyb20gJy4vY2hheW5zJztcbmV4cG9ydCBkZWZhdWx0IGNoYXlucztcbiJdfQ==
  return require('chayns');

});
