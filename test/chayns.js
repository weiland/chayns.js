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

},{"./chayns/chayns_api_interface":3,"./chayns/chayns_calls":4,"./chayns/config":5,"./chayns/core":6,"./chayns/environment":7,"./chayns/tapp_api_interface":8,"./lib/fetch_polyfill":9,"./lib/promise_polyfill":10,"./utils":11}],2:[function(require,module,exports){
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
  var html = document.documentElement;
  var suffix = "chayns-";

  DOM.addClass(html, "chayns-ready");
  DOM.removeAttribute(DOM.query("[chayns-cloak]"), "chayns-cloak");

  // add vendor classes (OS, Browser, ColorScheme)
  DOM.addClass(html, suffix + "os--" + environment.os);
  DOM.addClass(html, suffix + "browser--" + environment.browser);
  DOM.addClass(html, suffix + "color--" + environment.site.colorScheme);

  // Environment
  if (environment.isChaynsWeb) {
    DOM.addClass(html, suffix + "-" + "web");
  }
  if (environment.isChaynsWebMobile) {
    DOM.addClass(html, suffix + "-" + "mobile");
  }
  if (environment.isChaynsWebDesktop) {
    DOM.addClass(html, suffix + "-" + "desktop");
  }
  if (environment.isApp) {
    DOM.addClass(html, suffix + "-" + "app");
  }
  if (environment.isInFrame) {
    DOM.addClass(html, suffix + "-" + "frame");
  }

  // add chayns root element
  var chaynsRoot = DOM.createElement("div");
  chaynsRoot.setAttribute("id", "chayns-root");
  chaynsRoot.setAttribute("class", "chayns__root");
  DOM.appendChild(document.body, chaynsRoot);
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":11,"./callbacks":2,"./chayns_api_interface":3,"./config":5,"./environment":7}],7:[function(require,module,exports){
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

},{"../utils":11}],8:[function(require,module,exports){
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
  console.debug(obj, environment, "asdf");
  obj.siteId = obj.siteId || environment.site.siteId;
  obj.accessToken = obj.accessToken || environment.user.accessToken;
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

},{"../utils":11,"./environment":7}],9:[function(require,module,exports){
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

/**
 * @name isPromise
 * @module utils
 * @kind function
 *
 * @description
 * Determnines if a reference is a promise.
 *
 * @param {*} obj Object to check.
 * @returns {boolean} Returns true if `ob` is a promise or promise-like object.
 */
exports.isPromise = isPromise;

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
}function isPromise(obj) {
  return obj && isFunction(obj.then);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdGFwcF9hcGlfaW50ZXJmYWNlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2xpYi9mZXRjaF9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9saWIvcHJvbWlzZV9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9icm93c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9lcnJvci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9ldmVudHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXh0ZW5kLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2h0dHAuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvaXMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvaXNfcGVybWl0dGVkLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2xvZ2dlci5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMtdW1kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7SUNPWSxLQUFLLG1DQUFvQixTQUFTOztBQUM5QyxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDOzs7QUFHMUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7OztJQUdWLE1BQU0sV0FBdUIsaUJBQWlCLEVBQTlDLE1BQU07Ozs7SUFHTixXQUFXLFdBQWtC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USxHQUFHLElBQUksQ0FBQTtDQUMzQixDQUFBLEVBQUcsQ0FBQzs7Ozs7Ozs7Ozs7OztBQy9VTCxDQUFDLFlBQVU7QUFBQyxXQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxFQUFFLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLFVBQVUsS0FBRyxPQUFPLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTyxZQUFVO0FBQUMsYUFBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsRUFBQyxhQUFhLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLE9BQU8sWUFBVTtBQUFDLE9BQUMsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksY0FBYyxFQUFBLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUMsQ0FBQyxDQUFDLE9BQU8sWUFBVTtBQUFDLE9BQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTyxZQUFVO0FBQUMsZ0JBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNmLEtBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUc7QUFBQyxPQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksU0FBUyxDQUFDLDBDQUEwQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUcsVUFBVSxLQUFHLE9BQU8sQ0FBQyxJQUFFLFFBQVEsS0FBRyxPQUFPLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxFQUFDLElBQUcsQ0FBQyxDQUFDLFdBQVcsS0FBRyxDQUFDLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzlmLENBQUMsQ0FBQyxDQUFDLEtBQUk7QUFBQyxVQUFJLENBQUMsQ0FBQyxJQUFHO0FBQUMsU0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7T0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxNQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBO0tBQUM7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQ3pnQixJQUFJLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRztBQUFDLFNBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLFNBQVMsQ0FBQyxzREFBc0QsQ0FBQyxDQUFDLENBQUMsT0FBTTtPQUFDO0tBQUMsTUFBSyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHO0FBQUMsT0FBQyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUMzZixJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLE1BQU0sR0FBQyxJQUFJLENBQUMsTUFBTSxJQUFFLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxvRkFBb0YsQ0FBQyxDQUFDLElBQUcsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFBLEFBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLHVIQUF1SCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLE9BQU8sR0FBQyxLQUFLLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxnQkFBZ0IsS0FDamdCLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDO01BQUMsQ0FBQyxHQUFDLENBQUM7TUFBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxHQUFDLE1BQU0sR0FBQyxFQUFFO01BQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxnQkFBZ0IsSUFBRSxDQUFDLENBQUMsc0JBQXNCO01BQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLGlCQUFpQixJQUFFLFdBQVcsS0FBRyxPQUFPLGFBQWEsSUFBRSxXQUFXLEtBQUcsT0FBTyxjQUFjO01BQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFHLENBQUM7TUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLE9BQU8sSUFBRSxrQkFBa0IsS0FBRyxDQUFBLEdBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEVBQUE7TUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEVBQUEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxZQUFVO0FBQUMsV0FBTyxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQzVmLFlBQVU7QUFBQyxRQUFJLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFlBQVU7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFHLE9BQU8sQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxHQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQTtHQUFDLENBQUM7QUFDdGYsR0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEFBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxTQUFTLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxDQUFFLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUUsUUFBUSxLQUFHLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxXQUFXLEtBQUcsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN6ZixLQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLEVBQUMsV0FBVyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUM7QUFBQyxlQUFPLElBQUksQ0FBQztPQUFBLElBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVU7QUFBQyxXQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxNQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsVUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLE1BQU0sR0FBQyxNQUFNLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxRQUFRLEdBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUcsQ0FBQyxJQUFFLFNBQVMsSUFDcmYsQ0FBQyxDQUFDLE9BQU8sSUFBRSxRQUFRLElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBRSxLQUFLLElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBRSxNQUFNLElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBRSxDQUFBLFlBQVU7QUFBQyxZQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFDLEdBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQSxFQUFFLEtBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLFVBQVUsS0FBRyxPQUFPLE1BQU0sSUFBRSxNQUFNLENBQUMsR0FBRyxHQUFDLE1BQU0sQ0FBQyxZQUFVO0FBQUMsV0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxPQUFPLEdBQUMsTUFBTSxDQUFDLE9BQU8sR0FBQyxDQUFD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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztJQ3JGUSxNQUFNLFdBQU8sVUFBVSxFQUF2QixNQUFNOztpQkFDQyxNQUFNIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQG5hbWUgY2hheW5zIEFQSVxuICogQG1vZHVsZSBjaGF5bnNcbiAqL1xuXG4vLyBoZWxwZXJcbi8vIFRPRE86IGVpdGhlciBpbmRleC5qcywgdXRpbHMuanMgb3IganVzdCB0aGUgc2luZ2xlIGZpbGVzXG5pbXBvcnQgKiBhcyB1dGlscyAgICAgICAgICAgICAgIGZyb20gJy4vdXRpbHMnO1xudmFyIGV4dGVuZCA9IHV0aWxzLmV4dGVuZDtcblxuLy8gc2V0IGxvZ0xldmVsIHRvIGluZm9cbnV0aWxzLnNldExldmVsKDQpOyAvLyBUT0RPOiBkb24ndCBzZXQgdGhlIGxldmVsIGhlcmVcblxuLy8gYmFzaWMgY29uZmlnXG5pbXBvcnQge2NvbmZpZ30gICAgICAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2NvbmZpZyc7XG5cbi8vIGVudmlyb25tZW50XG5pbXBvcnQge2Vudmlyb25tZW50fSAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2Vudmlyb25tZW50JztcblxuaW1wb3J0IFByb21pc2UgZnJvbSAgJy4vbGliL3Byb21pc2VfcG9seWZpbGwnO1xuUHJvbWlzZS5wb2x5ZmlsbCgpOyAvLyBhdXRvbG9hZCBQcm9taXNlIHBvbHlmaWxsXG4vLyBUT0RPOiBhZGQgRGVmZXJyZWQ/XG5cbmltcG9ydCAnLi9saWIvZmV0Y2hfcG9seWZpbGwnO1xuXG4vLyBjb3JlIGZ1bmN0aW9uc1xuaW1wb3J0IHtyZWFkeSwgcmVnaXN0ZXIsIHNldHVwfSBmcm9tICcuL2NoYXlucy9jb3JlJztcblxuLy8gY2hheW5zIGNhbGxzXG5cbmltcG9ydCB7YXBpQ2FsbH0gICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvY2hheW5zX2NhbGxzJztcblxuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9ICAgICBmcm9tICcuL2NoYXlucy9jaGF5bnNfYXBpX2ludGVyZmFjZSc7XG5cbmltcG9ydCB7dGFwcEFwaUludGVyZmFjZX0gICAgICAgZnJvbSAnLi9jaGF5bnMvdGFwcF9hcGlfaW50ZXJmYWNlJztcblxuXG4vLyBwdWJsaWMgY2hheW5zIG9iamVjdFxuZXhwb3J0IHZhciBjaGF5bnMgPSB7fTtcblxuLy8gVE9ETzogdXNlIGV4dGVuZCBtZXRob2Qgb25seSBvbmUgdGltZVxuXG5leHRlbmQoY2hheW5zLCB7Z2V0TG9nZ2VyOiB1dGlscy5nZXRMb2dnZXJ9KTsgLy8ganNoaW50IGlnbm9yZTogbGluZVxuZXh0ZW5kKGNoYXlucywge3V0aWxzfSk7XG5leHRlbmQoY2hheW5zLCB7VkVSU0lPTjogJzAuMS4wJ30pO1xuLy9leHRlbmQoY2hheW5zLCB7Y29uZmlnfSk7IC8vIFRPRE86IHRoZSBjb25maWcgYE9iamVjdGAgc2hvdWxkIG5vdCBiZSBleHBvc2VkXG5cbmV4dGVuZChjaGF5bnMsIHtlbnY6IGVudmlyb25tZW50fSk7IC8vIFRPRE86IGdlbmVyYWxseSByZW5hbWVcblxuZXh0ZW5kKGNoYXlucywge3JlZ2lzdGVyfSk7XG5leHRlbmQoY2hheW5zLCB7cmVhZHl9KTtcblxuLy8gVE9ETzogcmVtb3ZlIGxpbmUgYmVsb3dcbmV4dGVuZChjaGF5bnMsIHthcGlDYWxsfSk7XG5cbi8vIGFkZCBhbGwgY2hheW5zQXBpSW50ZXJmYWNlIG1ldGhvZHMgZGlyZWN0bHkgdG8gdGhlIGBjaGF5bnNgIE9iamVjdFxuZXh0ZW5kKGNoYXlucywgY2hheW5zQXBpSW50ZXJmYWNlKTtcblxuZXh0ZW5kKGNoYXlucywgdGFwcEFwaUludGVyZmFjZSk7XG5cbi8vIHNldHVwIGNoYXluc1xuc2V0dXAoKTtcblxuXG4vLyBjaGF5bnMgcHVibGlzaCBubyBVTURcbi8vd2luZG93LmNoYXlucyA9IGNoYXlucztcbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc0Z1bmN0aW9uLCBpc1VuZGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHt3aW5kb3d9IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNhbGxiYWNrcycpO1xuXG5sZXQgbm9vcCA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxubGV0IGNhbGxiYWNrcyA9IHt9O1xuLyoqXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGludm9rZWRcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNDaGF5bnNDYWxsIElmIHRydWUgdGhlbiB0aGUgY2FsbCB3aWxsIGJlIGFzc2lnbmVkIHRvIGBjaGF5bnMuX2NhbGxiYWNrc2BcbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHBhcmFtZXRlcnMgYXJlIHZhbGlkIGFuZCB0aGUgY2FsbGJhY2sgd2FzIHNhdmVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRDYWxsYmFjayhuYW1lLCBmbiwgaXNDaGF5bnNDYWxsKSB7XG5cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgbG9nLndhcm4oJ3NldENhbGxiYWNrOiBuYW1lIGlzIHVuZGVmaW5lZCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoIWlzRnVuY3Rpb24oZm4pKSB7XG4gICAgbG9nLndhcm4oJ3NldENhbGxiYWNrOiBmbiBpcyBubyBGdW5jdGlvbicpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChuYW1lLmluZGV4T2YoJygpJykgIT09IC0xKSB7IC8vIHN0cmlwICcoKSdcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKCcoKScsICcnKTtcbiAgfVxuXG4gIGxvZy5kZWJ1Zygnc2V0Q2FsbGJhY2s6IHNldCBDYWxsYmFjazogJyArIG5hbWUpO1xuICAvL2lmIChuYW1lIGluIGNhbGxiYWNrcykge1xuICAvLyAgY2FsbGJhY2tzW25hbWVdLnB1c2goZm4pOyAvLyBUT0RPOiByZWNvbnNpZGVyIEFycmF5IHN1cHBvcnRcbiAgLy99IGVsc2Uge1xuICAgIGNhbGxiYWNrc1tuYW1lXSA9IGZuOyAvLyBBdHRlbnRpb246IHdlIHNhdmUgYW4gQXJyYXlcbiAgLy99XG5cbiAgaWYgKGlzQ2hheW5zQ2FsbCkge1xuICAgIGxvZy5kZWJ1Zygnc2V0Q2FsbGJhY2s6IHJlZ2lzdGVyIGZuIGFzIGdsb2JhbCBjYWxsYmFjaycpO1xuICAgIHdpbmRvdy5fY2hheW5zQ2FsbGJhY2tzW25hbWVdID0gY2FsbGJhY2sobmFtZSwgJ0NoYXluc0NhbGwnKTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJlZ2lzdGVyIGNhbGxiYWNrcyBmb3IgQ2hheW5zQ2FsbHMgYW5kIENoYXluc1dlYkNhbGxzXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYWxsYmFja05hbWUgTmFtZSBvZiB0aGUgRnVuY3Rpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIEVpdGhlciAnQ2hheW5zV2ViQ2FsbCcgb3IgJ0NoYXluc0NhbGwnXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IGhhbmRsZURhdGEgUmVjZWl2ZXMgY2FsbGJhY2sgZGF0YVxuICovXG5mdW5jdGlvbiBjYWxsYmFjayhjYWxsYmFja05hbWUsIHR5cGUpIHtcblxuICByZXR1cm4gZnVuY3Rpb24gaGFuZGxlRGF0YSgpIHtcblxuICAgIGlmIChjYWxsYmFja05hbWUgaW4gY2FsbGJhY2tzKSB7XG4gICAgICBsb2cuZGVidWcoJ2ludm9rZSBjYWxsYmFjazogJywgY2FsbGJhY2tOYW1lLCAndHlwZTonLCB0eXBlKTtcbiAgICAgIHZhciBmbiA9IGNhbGxiYWNrc1tjYWxsYmFja05hbWVdO1xuICAgICAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICAgIC8vZGVsZXRlIGNhbGxiYWNrc1tjYWxsYmFja05hbWVdOyAvLyBUT0RPOiBjYW5ub3QgYmUgbGlrZSB0aGF0LCByZW1vdmUgYXJyYXk/XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cud2FybignY2FsbGJhY2sgaXMgbm8gZnVuY3Rpb24nLCBjYWxsYmFja05hbWUsIGZuKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmluZm8oJ2NhbGxiYWNrICcgKyBjYWxsYmFja05hbWUgKyAnIGRpZCBub3QgZXhpc3QgaW4gY2FsbGJhY2tzIGFycmF5Jyk7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5fY2FsbGJhY2tzXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQ2hheW5zIENhbGwgQ2FsbGJhY2tzXG4gKiB3aWxsIGJlIGFzc2lnbmVkIHRvIHRoZSBgY2hheW5zLl9jYWxsYmFja3NgIG9iamVjdFxuICpcbiAqIEB0eXBlIHtPYmplY3R9IGNoYXluc0NhbGxzQ2FsbGJhY2tzXG4gKi9cbndpbmRvdy5fY2hheW5zQ2FsbGJhY2tzID0ge1xuICAvLy8vIFRPRE86IHdyYXAgY2FsbGJhY2sgZnVuY3Rpb24gKERSWSlcbiAgLy9nZXRHbG9iYWxEYXRhOiBjYWxsYmFjaygnZ2V0R2xvYmFsRGF0YScsICdDaGF5bnNDYWxsJykgLy8gZXhhbXBsZVxuICBnZXRHZW9Mb2NhdGlvbkNhbGxiYWNrOiBub29wXG59O1xuXG5cbi8vIFRPRE86IG1vdmUgdG8gYW5vdGhlciBmaWxlPyBjb3JlLCBjaGF5bnNfY2FsbHNcbnZhciBtZXNzYWdlTGlzdGVuaW5nID0gZmFsc2U7XG5leHBvcnQgZnVuY3Rpb24gbWVzc2FnZUxpc3RlbmVyKCkge1xuICBpZiAobWVzc2FnZUxpc3RlbmluZykge1xuICAgIGxvZy5pbmZvKCd0aGVyZSBpcyBhbHJlYWR5IG9uZSBtZXNzYWdlIGxpc3RlbmVyIG9uIHdpbmRvdycpO1xuICAgIHJldHVybjtcbiAgfVxuICBtZXNzYWdlTGlzdGVuaW5nID0gdHJ1ZTtcbiAgbG9nLmRlYnVnKCdtZXNzYWdlIGxpc3RlbmVyIGlzIHN0YXJ0ZWQnKTtcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIG9uTWVzc2FnZShlKSB7XG5cbiAgICBsb2cuZGVidWcoJ25ldyBtZXNzYWdlICcpO1xuXG4gICAgdmFyIG5hbWVzcGFjZSA9ICdjaGF5bnMuY3VzdG9tVGFiLicsXG4gICAgICBkYXRhID0gZS5kYXRhO1xuXG4gICAgaWYgKHR5cGVvZiBkYXRhICE9PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBzdHJpcCBuYW1lc3BhY2UgZnJvbSBkYXRhXG4gICAgZGF0YSA9IGRhdGEuc3Vic3RyKG5hbWVzcGFjZS5sZW5ndGgsIGRhdGEubGVuZ3RoIC0gbmFtZXNwYWNlLmxlbmd0aCk7XG4gICAgdmFyIG1ldGhvZCA9IGRhdGEubWF0Y2goL1teOl0qOi8pOyAvLyBkZXRlY3QgbWV0aG9kXG4gICAgaWYgKG1ldGhvZCAmJiBtZXRob2QubGVuZ3RoID4gMCkge1xuICAgICAgbWV0aG9kID0gbWV0aG9kWzBdO1xuXG4gICAgICB2YXIgcGFyYW1zID0gZGF0YS5zdWJzdHIobWV0aG9kLmxlbmd0aCwgZGF0YS5sZW5ndGggLSBtZXRob2QubGVuZ3RoKTtcbiAgICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwYXJhbXMgPSBKU09OLnBhcnNlKHBhcmFtcyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICB9XG5cbiAgICAgIC8vIHJlbW92ZSB0aGUgbGFzdCAnKSdcbiAgICAgIG1ldGhvZCA9IG1ldGhvZC5zdWJzdHIoMCwgbWV0aG9kLmxlbmd0aCAtIDEpO1xuXG4gICAgICAvLyB0aGUgY2FsbGJhY2sgZnVuY3Rpb24gY2FuIGJlIGludm9rZWQgZGlyZWN0bHlcbiAgICAgIGNhbGxiYWNrKG1ldGhvZCwgJ0NoYXluc1dlYkNhbGwnKShwYXJhbXMpO1xuICAgIH1cbiAgfSk7XG59XG4iLCIvKipcbiAqIENoYXlucyBBUEkgSW50ZXJmYWNlXG4gKiBBUEkgdG8gY29tbXVuaWNhdGUgd2l0aCB0aGUgQVBQIGFuZCB0aGUgQ2hheW5zIFdlYlxuICovXG5cbmltcG9ydCB7YXBpQ2FsbH0gZnJvbSAnLi9jaGF5bnNfY2FsbHMnO1xuaW1wb3J0IHtnZXRMb2dnZXIsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNCTEVBZGRyZXNzLFxuICBpc0RhdGUsIGlzT2JqZWN0LCBpc0FycmF5LCB0cmltLCBET019IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93LCBsb2NhdGlvbn0gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7IC8vIGR1ZSB0byB3aW5kb3cub3BlbiBhbmQgbG9jYXRpb24uaHJlZlxuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnNfYXBpX2ludGVyZmFjZScpO1xuXG4vKipcbiAqIE5GQyBSZXNwb25zZSBEYXRhIFN0b3JhZ2VcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmxldCBOZmNSZXNwb25zZURhdGEgPSB7XG4gIFJGSWQ6IDAsXG4gIFBlcnNvbklkOiAwXG59O1xuXG4vKipcbiAqIFBvcHVwIEJ1dHRvblxuICogQGNsYXNzIFBvcHVwQnV0dG9uXG4gKi9cbmNsYXNzIFBvcHVwQnV0dG9uIHtcbiAgLyoqXG4gICAqIFBvcHVwIEJ1dHRvbiBDb25zdHJ1Y3RvclxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBQb3B1cCBCdXR0b24gbmFtZVxuICAgKi9cbiAgY29uc3RydWN0b3IobmFtZSwgY2FsbGJhY2spIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBsZXQgZWwgPSBET00uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZWwuc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtcG9wdXAnKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NoYXluc19fcG9wdXAnKTtcbiAgICB0aGlzLmVsZW1lbnQgPSBlbDtcbiAgfVxuICAvKipcbiAgICogR2V0IFBvcHVwIEJ1dHRvbiBuYW1lXG4gICAqIEByZXR1cm5zIHtuYW1lfVxuICAgKi9cbiAgbmFtZSgpIHtcbiAgICByZXR1cm4gdGhpcy5uYW1lO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxiYWNrXG4gICAqL1xuICBjYWxsYmFjaygpIHtcbiAgICBsZXQgY2IgPSB0aGlzLmNhbGxiYWNrO1xuICAgIGxldCBuYW1lID0gY2IubmFtZTtcbiAgICBpZiAoaXNGdW5jdGlvbihjYikpIHtcbiAgICAgIGNiLmNhbGwobnVsbCwgbmFtZSk7XG4gICAgfVxuICB9XG4gIC8qKlxuICAgKiBAbmFtZSB0b0hUTUxcbiAgICogUmV0dXJucyBIVE1MIE5vZGUgY29udGFpbmluZyB0aGUgUG9wdXBCdXR0b24uXG4gICAqIEByZXR1cm5zIHtQb3B1cEJ1dHRvbi5lbGVtZW50fEhUTUxOb2RlfVxuICAgKi9cbiAgdG9IVE1MKCkge1xuICAgIHJldHVybiB0aGlzLmVsZW1lbnQ7XG4gIH1cbn1cblxuLyoqXG4gKiBCZWFjb24gTGlzdFxuICogQHR5cGUge0FycmF5fG51bGx9XG4gKi9cbmxldCBiZWFjb25MaXN0ID0gbnVsbDtcblxuLyoqXG4gKiBHbG9iYWwgRGF0YSBTdG9yYWdlXG4gKiBAdHlwZSB7Ym9vbGVhbnxPYmplY3R9XG4gKi9cbmxldCBnbG9iYWxEYXRhID0gZmFsc2U7XG5cbi8qKlxuICogQWxsIHB1YmxpYyBjaGF5bnMgbWV0aG9kcyB0byBpbnRlcmFjdCB3aXRoICpDaGF5bnMgQXBwKiBvciAqQ2hheW5zIFdlYipcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmV4cG9ydCB2YXIgY2hheW5zQXBpSW50ZXJmYWNlID0ge1xuXG5cbiAgLyoqXG4gICAqIEVuYWJsZSBvciBkaXNhYmxlIFB1bGxUb1JlZnJlc2hcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBhbGxvd1B1bGwgQWxsb3cgUHVsbFRvUmVmcmVzaFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNlZWRlZFxuICAgKi9cbiAgc2V0UHVsbFRvUmVmcmVzaDogZnVuY3Rpb24oYWxsb3dQdWxsKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAwLFxuICAgICAgd2ViRm46IGZhbHNlLCAvLyBjb3VsZCBiZSBvbWl0dGVkXG4gICAgICBwYXJhbXM6IFt7J2Jvb2wnOiBhbGxvd1B1bGx9XVxuICAgIH0pO1xuICB9LFxuICAvLyBUT0RPOiByZW5hbWUgdG8gZW5hYmxlUHVsbFRvUmVmcmVzaFxuICBhbGxvd1JlZnJlc2hTY3JvbGw6IGZ1bmN0aW9uKCkge1xuICAgIGNoYXluc0FwaUludGVyZmFjZS5zZXRQdWxsVG9SZWZyZXNoKHRydWUpO1xuICB9LFxuICBkaXNhbGxvd1JlZnJlc2hTY3JvbGw6IGZ1bmN0aW9uKCkge1xuICAgIGNoYXluc0FwaUludGVyZmFjZS5zZXRQdWxsVG9SZWZyZXNoKGZhbHNlKTtcbiAgfSxcblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHtCb29sZWFufSBbc2hvd0N1cnNvcl0gSWYgdHJ1ZSB0aGUgd2FpdGN1cnNvciB3aWxsIGJlIHNob3duXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG90aGVyd2lzZSBpdCB3aWxsIGJlIGhpZGRlblxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNldFdhaXRjdXJzb3I6IGZ1bmN0aW9uKHNob3dDdXJzb3IpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEsXG4gICAgICB3ZWJGbjogKHNob3dDdXJzb3IgPyAnc2hvdycgOiAnaGlkZScpICsgJ0xvYWRpbmdDdXJzb3InLFxuICAgICAgcGFyYW1zOiBbeydib29sJzogc2hvd0N1cnNvcn1dXG4gICAgfSk7XG4gIH0sXG4gIHNob3dXYWl0Y3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLnNldFdhaXRjdXJzb3IodHJ1ZSk7XG4gIH0sXG4gIGhpZGVXYWl0Y3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLnNldFdhaXRjdXJzb3IoZmFsc2UpO1xuICB9LFxuXG4gIC8vIFRPRE86IHJlbmFtZSBpdCB0byBvcGVuVGFwcD9cbiAgLyoqXG4gICAqIFNlbGVjdCBkaWZmZXJlbnQgVGFwcCBpZGVudGlmaWVkIGJ5IFRhcHBJRCBvciBJbnRlcm5hbFRhcHBOYW1lXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0YWIgVGFwcCBOYW1lIG9yIFRhcHAgSURcbiAgICogQHBhcmFtIHtTdHJpbmd9IChvcHRpb25hbCkgcGFyYW0gVVJMIFBhcmFtZXRlclxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNlbGVjdFRhYjogZnVuY3Rpb24odGFiLCBwYXJhbSkge1xuXG4gICAgbGV0IGNtZCA9IDEzOyAvLyBzZWxlY3RUYWIgd2l0aCBwYXJhbSBDaGF5bnNDYWxsXG5cbiAgICAvLyB1cGRhdGUgcGFyYW06IHN0cmlwID8gYW5kIGVuc3VyZSAmIGF0IHRoZSBiZWdpblxuICAgIGlmIChwYXJhbSAmJiAhcGFyYW0ubWF0Y2goL15bJnxcXD9dLykpIHsgLy8gbm8gJiBhbmQgbm8gP1xuICAgICAgcGFyYW0gPSAnJicgKyBwYXJhbTtcbiAgICB9IGVsc2UgaWYgKHBhcmFtKSB7XG4gICAgICBwYXJhbSA9IHBhcmFtLnJlcGxhY2UoJz8nLCAnJicpO1xuICAgIH0gZWxzZSB7IC8vIG5vIHBhcmFtcywgZGlmZmVyZW50IENoYXluc0NhbGxcbiAgICAgIGNtZCA9IDI7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiBjbWQsXG4gICAgICB3ZWJGbjogJ3NlbGVjdG90aGVydGFiJyxcbiAgICAgIHBhcmFtczogY21kID09PSAxM1xuICAgICAgICA/IFt7J3N0cmluZyc6IHRhYn0sIHsnc3RyaW5nJzogcGFyYW19XVxuICAgICAgICA6IFt7J3N0cmluZyc6IHRhYn1dLFxuICAgICAgd2ViUGFyYW1zOiB7XG4gICAgICAgIFRhYjogdGFiLFxuICAgICAgICBQYXJhbWV0ZXI6IHBhcmFtXG4gICAgICB9LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDAyLCBpb3M6IDEzODMsIHdwOiAyNDY5IH0gLy8gZm9yIG5hdGl2ZSBhcHBzIG9ubHlcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2VsZWN0IEFsYnVtXG4gICAqIFRPRE86IHJlbmFtZSB0byBvcGVuXG4gICAqXG4gICAqIEBwYXJhbSB7aWR8c3RyaW5nfSBpZCBBbGJ1bSBJRCAoQWxidW0gTmFtZSB3aWxsIHdvcmsgYXMgd2VsbCwgYnV0IGRvIHByZWZlciBJRHMpXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2VsZWN0QWxidW06IGZ1bmN0aW9uKGlkKSB7XG4gICAgaWYgKCFpc1N0cmluZyhpZCkgJiYgIWlzTnVtYmVyKGlkKSkge1xuICAgICAgbG9nLmVycm9yKCdzZWxlY3RBbGJ1bTogaW52YWxpZCBhbGJ1bSBuYW1lJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMyxcbiAgICAgIHdlYkZuOiAnc2VsZWN0QWxidW0nLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBpZH1dLFxuICAgICAgd2ViUGFyYW1zOiBpZFxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFBpY3R1cmVcbiAgICogKG9sZCBTaG93UGljdHVyZSlcbiAgICogQW5kcm9pZCBkb2VzIG5vdCBzdXBwb3J0IGdpZnMgOihcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBJbWFnZSBVUkwgc2hvdWxkIGNvdGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9wZW5QaWN0dXJlOiBmdW5jdGlvbih1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkgfHwgIXVybC5tYXRjaCgvanBnJHxwbmckfGdpZiQvaSkpIHsgLy8gVE9ETzogbW9yZSBpbWFnZSB0eXBlcz9cbiAgICAgIGxvZy5lcnJvcignb3BlblBpY3R1cmU6IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNCxcbiAgICAgIHdlYkZuOiAnc2hvd1BpY3R1cmUnLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHdlYlBhcmFtczogdXJsLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNTAxLCBpb3M6IDI2MzYsIHdwOiAyNTQzIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogQ3JlYXRlIGEgQ2FwdGlvbiBCdXR0b24uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqIFRoZSBjYXB0aW9uIGJ1dHRvbiBpcyB0aGUgdGV4dCBhdCB0aGUgdG9wIHJpZ2h0IG9mIHRoZSBhcHAuXG4gICAqIChtYWlubHkgdXNlZCBmb3IgbG9naW4gb3IgdGhlIHVzZXJuYW1lKVxuICAgKiBUT0RPOiBpbXBsZW1lbnQgaW50byBDaGF5bnMgV2ViP1xuICAgKiBUT0RPOiByZW5hbWUgdG8gc2V0P1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGV4dCBUaGUgQnV0dG9uJ3MgdGV4dFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB3aGVuIHRoZSBjYXB0aW9uIGJ1dHRvbiB3YXMgY2xpY2tlZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGNyZWF0ZUNhcHRpb25CdXR0b246IGZ1bmN0aW9uKHRleHQsIGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAvL2xvZy5lcnJvcignVGhlcmUgaXMgbm8gdmFsaWQgY2FsbGJhY2sgRnVuY3Rpb24uJyk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzIG5vIHZhbGlkIGNhbGxiYWNrIEZ1bmN0aW9uLicpO1xuICAgICAgLy9yZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnY2FwdGlvbkJ1dHRvbkNhbGxiYWNrKCknO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA1LFxuICAgICAgcGFyYW1zOiBbe3N0cmluZzogdGV4dH0sIHtjYWxsYmFjazogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTgsIGlvczogMTM2Niwgd3A6IDI0NjkgfSxcbiAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhpZGUgYSBDYXB0aW9uIEJ1dHRvbi5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICogVGhlIGNhcHRpb24gYnV0dG9uIGlzIHRoZSB0ZXh0IGF0IHRoZSB0b3AgcmlnaHQgb2YgdGhlIGFwcC5cbiAgICogKG1haW5seSB1c2VkIGZvciBsb2dpbiBvciB0aGUgdXNlcm5hbWUpXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgaGlkZUNhcHRpb25CdXR0b246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNixcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OCwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEZhY2Vib29rIENvbm5lY3RcbiAgICogTk9URTogcHJlZmVyIGBjaGF5bnMubG9naW4oKWAgb3ZlciB0aGlzIG1ldGhvZCB0byBwZXJmb3JtIGEgdXNlciBsb2dpbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtwZXJtaXNzaW9ucyA9ICd1c2VyX2ZyaWVuZHMnXSBGYWNlYm9vayBQZXJtaXNzaW9ucywgc2VwYXJhdGVkIGJ5IGNvbW1hXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcmVsb2FkUGFyYW0gPSAnY29tbWVudCddIFJlbG9hZCBQYXJhbVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIC8vIFRPRE86IHRlc3QgcGVybWlzc2lvbnNcbiAgZmFjZWJvb2tDb25uZWN0OiBmdW5jdGlvbihwZXJtaXNzaW9ucyA9ICd1c2VyX2ZyaWVuZHMnLCByZWxvYWRQYXJhbSA9ICdjb21tZW50Jykge1xuICAgIHJlbG9hZFBhcmFtID0gcmVsb2FkUGFyYW07XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA3LFxuICAgICAgd2ViRm46ICdmYWNlYm9va0Nvbm5lY3QnLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBwZXJtaXNzaW9uc30sIHsnRnVuY3Rpb24nOiAnRXhlY0NvbW1hbmQ9XCInICsgcmVsb2FkUGFyYW0gKyAnXCInfV0sXG4gICAgICB3ZWJQYXJhbXM6IHtcbiAgICAgICAgUmVsb2FkUGFyYW1ldGVyOiAnRXhlY0NvbW1hbmQ9JyArIHJlbG9hZFBhcmFtLFxuICAgICAgICBQZXJtaXNzaW9uczogcGVybWlzc2lvbnNcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTksIGlvczogMTM2Niwgd3A6IDI0NjkgfSxcbiAgICAgIGZhbGxiYWNrQ21kOiA4IC8vIGluIGNhc2UgdGhlIGFib3ZlIGlzIG5vdCBzdXBwb3J0IHRoZSBmYWxsYmFja0NtZCB3aWxsIHJlcGxhY2UgdGhlIGNtZFxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIExpbmsgaW4gQnJvd3NlclxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFVSTFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9wZW5MaW5rSW5Ccm93c2VyOiBmdW5jdGlvbih1cmwpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDksXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh1cmwuaW5kZXhPZignOi8vJykgPT09IC0xKSB7XG4gICAgICAgICAgdXJsID0gJy8vJyArIHVybDsgLy8gb3IgYWRkIGxvY2F0aW9uLnByb3RvY29sIHByZWZpeCBhbmQgLy8gVE9ETzogdGVzdFxuICAgICAgICB9XG4gICAgICAgIHdpbmRvdy5vcGVuKHVybCwgJ19ibGFuaycpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDA1LCBpb3M6IDI0NjYsIHdwOiAyNTQzIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2hvdyBCYWNrQnV0dG9uLlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB3aGVuIHRoZSBiYWNrIGJ1dHRvbiB3YXMgY2xpY2tlZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNob3dCYWNrQnV0dG9uOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgY2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICAgIGNoYXluc0FwaUludGVyZmFjZS5oaWRlQmFja0J1dHRvbigpO1xuICAgICAgfTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdiYWNrQnV0dG9uQ2FsbGJhY2soKSc7XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEwLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDA1LCBpb3M6IDI2MzYsIHdwOiAyNDY5IH0sXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSGlkZSBCYWNrQnV0dG9uLlxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gRmFsc2Ugb24gZXJyb3IsIHRydWUgaWYgY2FsbCBzdWNjZWVkZWRcbiAgICovXG4gIGhpZGVCYWNrQnV0dG9uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDExLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDA1LCBpb3M6IDI2MzYsIHdwOiAyNDY5IH1cbiAgICB9KTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBPcGVuIEludGVyQ29tLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gRmFsc2Ugb24gZXJyb3IsIHRydWUgaWYgY2FsbCBzdWNjZWVkZWRcbiAgICovXG4gIG9wZW5JbnRlckNvbTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMixcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwMiwgaW9zOiAxMzgzLCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBHZW9sb2NhdGlvbi5cbiAgICogbmF0aXZlIGFwcHMgb25seSAoYnV0IGNvdWxkIHdvcmsgaW4gd2ViIGFzIHdlbGwsIG5hdmlnYXRvci5nZW9sb2NhdGlvbilcbiAgICpcbiAgICogVE9ETzogY29udGludW91c1RyYWNraW5nIHdhcyByZW1vdmVkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGJhY2sgYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgZ2V0R2VvTG9jYXRpb246IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2dldEdlb0xvY2F0aW9uQ2FsbGJhY2soKSc7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAvLyBUT0RPOiByZW1vdmUgY29uc29sZVxuICAgICAgLy8gVE9ETzogYWxsb3cgZW1wdHkgY2FsbGJhY2tzIHdoZW4gaXQgaXMgYWxyZWFkeSBzZXRcbiAgICAgIGNvbnNvbGUud2Fybignbm8gY2FsbGJhY2sgZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE0LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNTAxLCBpb3M6IDI0NjYsIHdwOiAyNDY5IH0sXG4gICAgICAvL3dlYkZuOiBmdW5jdGlvbigpIHsgbmF2aWdhdG9yLmdlb2xvY2F0aW9uOyB9XG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBWaWRlb1xuICAgKiAob2xkIFNob3dWaWRlbylcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBWaWRlbyBVUkwgc2hvdWxkIGNvdGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9wZW5WaWRlbzogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goLy4qXFwuLnsyLH0vKSkgeyAvLyBUT0RPOiBXVEYgUmVnZXhcbiAgICAgIGxvZy5lcnJvcignb3BlblZpZGVvOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE1LFxuICAgICAgd2ViRm46ICdzaG93VmlkZW8nLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHdlYlBhcmFtczogdXJsXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNob3cgRGlhbG9nXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB7Y29udGVudDp7U3RyaW5nfSAsIGhlYWRsaW5lOiAsYnV0dG9uczp7QXJyYXl9LCBub0NvbnRlbnRuUGFkZGluZzosIG9uTG9hZDp9XG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc2hvd0RpYWxvZzogZnVuY3Rpb24gc2hvd0RpYWxvZyhvYmopIHtcbiAgICBpZiAoIW9iaiB8fCAhaXNPYmplY3Qob2JqKSkge1xuICAgICAgbG9nLndhcm4oJ3Nob3dEaWFsb2c6IGludmFsaWQgcGFyYW1ldGVycycpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoaXNTdHJpbmcob2JqLmNvbnRlbnQpKSB7XG4gICAgICBvYmouY29udGVudCA9IHRyaW0ob2JqLmNvbnRlbnQucmVwbGFjZSgvPGJyWyAvXSo/Pi9nLCAnXFxuJykpO1xuICAgIH1cbiAgICBpZiAoIWlzQXJyYXkob2JqLmJ1dHRvbnMpIHx8IG9iai5idXR0b25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgb2JqLmJ1dHRvbnMgPSBbKG5ldyBQb3B1cEJ1dHRvbignT0snKSkudG9IVE1MKCldO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnQ2hheW5zRGlhbG9nQ2FsbEJhY2soKSc7XG4gICAgZnVuY3Rpb24gY2FsbGJhY2tGbihidXR0b25zLCBpZCkge1xuICAgICAgaWQgPSBwYXJzZUludChpZCwgMTApIC0gMTtcbiAgICAgIGlmIChidXR0b25zW2lkXSkge1xuICAgICAgICBidXR0b25zW2lkXS5jYWxsYmFjay5jYWxsKG51bGwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTYsIC8vIFRPRE86IGlzIHNsaXR0ZTovL1xuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5oZWFkbGluZX0sXG4gICAgICAgIHsnc3RyaW5nJzogb2JqLmNvbnRlbnR9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5idXR0b25zWzBdLm5hbWV9IC8vIFRPRE86IG5lZWRzIGVuY29kZVVSST9cbiAgICAgICAgLy97J3N0cmluZyc6IG9iai5idXR0b25zWzFdLm5hbWV9LCAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICAgIC8veydzdHJpbmcnOiBvYmouYnV0dG9uc1syXS5uYW1lfSAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICBdLFxuICAgICAgY2I6IGNhbGxiYWNrRm4uYmluZChudWxsLCBvYmouYnV0dG9ucyksXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjYwNn0sXG4gICAgICBmYWxsYmFja0ZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2ZhbGxiYWNrIHBvcHVwJywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBGb3JtZXJseSBrbm93biBhcyBnZXRBcHBJbmZvc1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBpbnZva2VkIHdpdGggdGhlIEFwcERhdGFcbiAgICogQHJldHVybnMge1Byb21pc2V9IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgICAvLyBUT0RPOiB1c2UgZm9yY2VSZWxvYWQgYW5kIGNhY2hlIEFwcERhdGFcbiAgZ2V0R2xvYmFsRGF0YTogZnVuY3Rpb24oZm9yY2VSZWxvYWQpIHtcbiAgICBpZiAoIWZvcmNlUmVsb2FkICYmIGdsb2JhbERhdGEpIHtcbiAgICAgIGxvZy5kZWJ1ZygnZ2V0R2xvYmFsRGF0YTogcmV0dXJuIGNhY2hlZCBkYXRhJyk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGdsb2JhbERhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDE4LFxuICAgICAgICB3ZWJGbjogJ2dldEFwcEluZm9zJyxcbiAgICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdnZXRHbG9iYWxEYXRhKCknfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICAgIGNiOiByZXNvbHZlLFxuICAgICAgICBvbkVycm9yOiByZWplY3RcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFZpYnJhdGVcbiAgICogQHBhcmFtIHtJbnRlZ2VyfSBkdXJhdGlvbiBUaW1lIGluIG1pbGxpc2Vjb25kc1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICB2aWJyYXRlOiBmdW5jdGlvbihkdXJhdGlvbikge1xuICAgIGlmICghaXNOdW1iZXIoZHVyYXRpb24pIHx8IGR1cmF0aW9uIDwgMikge1xuICAgICAgZHVyYXRpb24gPSAxNTA7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTksXG4gICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiBkdXJhdGlvbi50b1N0cmluZygpfV0sXG4gICAgICB3ZWJGbjogZnVuY3Rpb24gbmF2aWdhdG9yVmlicmF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBuYXZpZ2F0b3IudmlicmF0ZSgxMDApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ3ZpYnJhdGU6IHRoZSBkZXZpY2UgZG9lcyBub3Qgc3VwcG9ydCB2aWJyYXRlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjY5NSwgaW9zOiAyNTk2LCB3cDogMjUxNX1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogTmF2aWdhdGUgQmFjay5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBuYXZpZ2F0ZUJhY2s6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjAsXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNjk2LCBpb3M6IDI2MDAsIHdwOiAyNTE1fVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbWFnZSBVcGxvYWRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aXRoIGltYWdlIHVybCBhZnRlciB1cGxvYWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgdXBsb2FkSW1hZ2U6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3VwbG9hZEltYWdlOiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2ltYWdlVXBsb2FkQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAyMSxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgndHlwZScsICdmaWxlJyk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgndmFsdWUnLCAnJyk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgnYWNjZXB0JywgJ2ltYWdlLyonKTtcbiAgICAgICAgLy9pbnB1dC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2NoYXlucy1pbWFnZS11cGxvYWQtZmllbGQpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ29uY2hhbmdlJywgJ2ltYWdlQ2hvc2VuKCknKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3VwbG9hZC1pbWFnZScpO1xuICAgICAgICBET00ucXVlcnkoJyNjaGF5bnMtcm9vdCcpLmFwcGVuZENoaWxkKGlucHV0KTtcbiAgICAgICAgLy92YXIgZmQgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgLy9mZC5hcHBlbmQoXCJJbWFnZVwiLCBmaWxlWzBdKTtcbiAgICAgICAgLy93aW5kb3cuaW1hZ2VDaG9zZW4gPSB3aW5kb3cuZmV0Y2goe1xuICAgICAgICAvLyAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIC8vICB1cmw6IFwiLy9jaGF5bnMxLnRvYml0LmNvbS9UYXBwQXBpL0ZpbGUvSW1hZ2VcIixcbiAgICAgICAgLy8gIGNvbnRlbnRUeXBlOiBmYWxzZSxcbiAgICAgICAgLy8gIHByb2Nlc3NEYXRhOiBmYWxzZSxcbiAgICAgICAgLy8gIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgLy8gIGRhdGE6IGZkXG4gICAgICAgIC8vfSkudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vICBkZWxldGUgd2luZG93LmltYWdlQ2hvc2VuO1xuICAgICAgICAvLyAgY2FsbGJhY2suY2FsbChudWxsLCBkYXRhKTtcbiAgICAgICAgLy99KTtcbiAgICAgICAgLy8kKFwiI0NoYXluc0ltYWdlVXBsb2FkXCIpLmNsaWNrKCk7XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3MDUsIHdwOiAyNTM4LCBpb3M6IDI2NDJ9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBORkMgQ2FsbGJhY2tcbiAgICogVE9ETzogcmVmYWN0b3IgYW5kIHRlc3RcbiAgICogVE9ETzogd2h5IHR3byBjYWxscz9cbiAgICogQ2FuIHdlIGltcHJvdmUgdGhpcyBzaGl0PyBzcGxpdCBpbnRvIHR3byBtZXRob2RzXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIGZvciBORkNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgc2V0TmZjQ2FsbGJhY2s6IGZ1bmN0aW9uKGNhbGxiYWNrLCByZXNwb25zZSkge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAzNyxcbiAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICB9KSAmJiBhcGlDYWxsKHtcbiAgICAgICAgICBjbWQ6IDM3LFxuICAgICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2YXIgY21kID0gKHJlc3BvbnNlID09PSBuZmNSZXNwb25zZURhdGEuUGVyc29uSWQpID8gMzcgOiAzODtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogY21kID09PSAzNyA/IDM4IDogMzcsXG4gICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgfSkgJiYgYXBpQ2FsbCh7XG4gICAgICBjbWQ6IGNtZCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiAnTmZjQ2FsbGJhY2snfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVmlkZW8gUGxheWVyIENvbnRyb2xzXG4gICAqIEFjdXRhbGx5IG5hdGl2ZSBvbmx5XG4gICAqIFRPRE86IGNvdWxkIHRoZW9yZXRpY2FsbHkgd29yayBpbiBDaGF5bnMgV2ViXG4gICAqIFRPRE86IGV4YW1wbGU/IHdoZXJlIGRvZXMgdGhpcyB3b3JrP1xuICAgKi9cbiAgcGxheWVyOiB7XG4gICAgdXNlRGVmYXVsdFVybDogZnVuY3Rpb24gdXNlRGVmYXVsdFVybCgpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMixcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgY2hhbmdlVXJsOiBmdW5jdGlvbiBjaGFuZ2VVcmwodXJsKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjIsXG4gICAgICAgIHBhcmFtczogW3snU3RyaW5nJzogdXJsfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBoaWRlQnV0dG9uOiBmdW5jdGlvbiBoaWRlQnV0dG9uKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIzLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBzaG93QnV0dG9uOiBmdW5jdGlvbiBzaG93QnV0dG9uKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIzLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAxfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwYXVzZTogZnVuY3Rpb24gcGF1c2VWaWRlbygpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNCxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGxheTogZnVuY3Rpb24gcGxheVZpZGVvKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI0LFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAxfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwbGF5YmFja1N0YXR1czogZnVuY3Rpb24gcGxheWJhY2tTdGF0dXMoY2FsbGJhY2spIHtcblxuICAgICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5nZXRHbG9iYWxEYXRhKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwobnVsbCwge1xuICAgICAgICAgIEFwcENvbnRyb2xWaXNpYmxlOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLklzQXBwQ29udHJvbFZpc2libGUsXG4gICAgICAgICAgU3RhdHVzOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLlBsYXliYWNrU3RhdHVzLFxuICAgICAgICAgIFVybDogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5TdHJlYW1VcmxcbiAgICAgICAgfSk7XG4gICAgICB9LCB0cnVlKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEJsdWV0b290aFxuICAgKiBPbmx5IGluIG5hdGl2ZSBBcHBzIChpb3MgYW5kIGFuZHJvaWQpXG4gICAqL1xuICBibHVldG9vdGg6IHtcbiAgICBMRVNlbmRTdHJlbmd0aDogeyAvLyBUT0RPOiB3aGF0IGlzIHRoYXQ/XG4gICAgICBBZGphY2VudDogMCxcbiAgICAgIE5lYXJieTogMSxcbiAgICAgIERlZmF1bHQ6IDIsXG4gICAgICBGYXI6IDNcbiAgICB9LFxuICAgIExFU2NhbjogZnVuY3Rpb24gTEVTY2FuKGNhbGxiYWNrKSB7XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRVNjYW46IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjayc7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjYsXG4gICAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBMRUNvbm5lY3Q6IGZ1bmN0aW9uIExFQ29ubmVjdChhZGRyZXNzLCBjYWxsYmFjaywgcGFzc3dvcmQpIHtcbiAgICAgIGlmICghaXNTdHJpbmcoYWRkcmVzcykgfHwgIWlzQkxFQWRkcmVzcyhhZGRyZXNzKSkge1xuICAgICAgICBsb2cud2FybignTEVDb25uZWN0OiBubyB2YWxpZCBhZGRyZXNzIHBhcmFtZXRlcicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRUNvbm5lY3Q6IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNTdHJpbmcocGFzc3dvcmQpIHx8ICFwYXNzd29yZC5tYXRjaCgvXlswLTlhLWZdezYsMTJ9JC9pKSkge1xuICAgICAgICBwYXNzd29yZCA9ICcnO1xuICAgICAgfVxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJztcblxuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI3LFxuICAgICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGFkZHJlc3N9LCB7J3N0cmluZyc6IHBhc3N3b3JkfV0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRPRE86IGNvbnNpZGVyIE9iamVjdCBhcyBwYXJhbWV0ZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRkcmVzc1xuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc3ViSWRcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG1lYXN1cmVQb3dlclxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc2VuZFN0cmVuZ3RoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBMRVdyaXRlOiBmdW5jdGlvbiBMRVdyaXRlKGFkZHJlc3MsIHN1YklkLCBtZWFzdXJlUG93ZXIsIHNlbmRTdHJlbmd0aCwgY2FsbGJhY2spIHtcbiAgICAgIGlmICghaXNTdHJpbmcoYWRkcmVzcykgfHwgIWlzQkxFQWRkcmVzcyhhZGRyZXNzKSkge1xuICAgICAgICBsb2cud2FybignTEVXcml0ZTogbm8gdmFsaWQgYWRkcmVzcyBwYXJhbWV0ZXInKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihzdWJJZCkgfHwgc3ViSWQgPCAwIHx8IHN1YklkID4gNDA5NSkge1xuICAgICAgICBzdWJJZCA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIobWVhc3VyZVBvd2VyKSB8fCBtZWFzdXJlUG93ZXIgPCAtMTAwIHx8IG1lYXN1cmVQb3dlciA+IDApIHtcbiAgICAgICAgbWVhc3VyZVBvd2VyID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihzZW5kU3RyZW5ndGgpIHx8IHNlbmRTdHJlbmd0aCA8IDAgfHwgc2VuZFN0cmVuZ3RoID4gMykge1xuICAgICAgICBzZW5kU3RyZW5ndGggPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJyxcbiAgICAgICAgdWlkID0gJzdBMDdFMTdBLUExODgtNDE2RS1CN0EwLTVBMzYwNjUxM0U1Nyc7XG5cbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyOCxcbiAgICAgICAgcGFyYW1zOiBbXG4gICAgICAgICAgeydzdHJpbmcnOiBhZGRyZXNzfSxcbiAgICAgICAgICB7J3N0cmluZyc6IHVpZH0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogc3ViSWR9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IG1lYXN1cmVQb3dlcn0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogc2VuZFN0cmVuZ3RofVxuICAgICAgICBdLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFRPRE87IHVzZSBgT2JqZWN0YCBhcyBwYXJhbXNcbiAgLy8gVE9ETzogd2hhdCBhcmUgb3B0aW9uYWwgcGFyYW1zPyB2YWxpZGF0ZSBuYW1lIGFuZCBsb2NhdGlvbj9cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIEFwcG9pbnRtZW50J3MgbmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbG9jYXRpb24gQXBwb2ludG1lbnQncyBsb2NhdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2Rlc2NyaXB0aW9uXSBBcHBvaW50bWVudCdzIGRlc2NyaXB0aW9uXG4gICAqIEBwYXJhbSB7RGF0ZX0gc3RhcnQgQXBwb2ludG1lbnRzJ3MgU3RhcnREYXRlXG4gICAqIEBwYXJhbSB7RGF0ZX0gZW5kIEFwcG9pbnRtZW50cydzIEVuZERhdGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzYXZlQXBwb2ludG1lbnQ6IGZ1bmN0aW9uIHNhdmVBcHBvaW50bWVudChuYW1lLCBsb2NhdGlvbiwgZGVzY3JpcHRpb24sIHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoIWlzU3RyaW5nKG5hbWUpIHx8ICFpc1N0cmluZyhsb2NhdGlvbikpIHtcbiAgICAgIGxvZy53YXJuKCdzYXZlQXBwb2ludG1lbnQ6IG5vIHZhbGlkIG5hbWUgYW5kL29yIGxvY2F0aW9uJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghaXNEYXRlKHN0YXJ0KSB8fCAhaXNEYXRlKGVuZCkpIHtcbiAgICAgIGxvZy53YXJuKCdzYXZlQXBwb2ludG1lbnQ6IHN0YXJ0IGFuZC9vciBlbmREYXRlIGlzIG5vIHZhbGlkIERhdGUgYE9iamVjdGAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHN0YXJ0ID0gcGFyc2VJbnQoc3RhcnQuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuICAgIGVuZCA9IHBhcnNlSW50KGVuZC5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDI5LFxuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnc3RyaW5nJzogbmFtZX0sXG4gICAgICAgIHsnc3RyaW5nJzogbG9jYXRpb259LFxuICAgICAgICB7J3N0cmluZyc6IGRlc2NyaXB0aW9ufSxcbiAgICAgICAgeydJbnRlZ2VyJzogc3RhcnR9LFxuICAgICAgICB7J0ludGVnZXInOiBlbmR9XG4gICAgICBdLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMwNTQsIGlvczogMzA2Nywgd3A6IDMwMzB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERhdGVUeXBlcyBFbnVtXG4gICAqIHN0YXJ0cyBhdCAxXG4gICAqL1xuICBkYXRlVHlwZToge1xuICAgIGRhdGU6IDEsXG4gICAgdGltZTogMixcbiAgICBkYXRlVGltZTogM1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZWxlY3QgRGF0ZVxuICAgKiBPbGQ6IERhdGVTZWxlY3RcbiAgICogTmF0aXZlIEFwcHMgb25seS4gVE9ETzogYWxzbyBpbiBDaGF5bnMgV2ViPyBIVE1MNSBEYXRlcGlja2VyIGV0Y1xuICAgKiBUT0RPOyByZWNvbnNpZGVyIG9yZGVyIGV0Y1xuICAgKiBAcGFyYW0ge2RhdGVUeXBlfE51bWJlcn0gZGF0ZVR5cGUgRW51bSAxLTI6IHRpbWUsIGRhdGUsIGRhdGV0aW1lLiB1c2UgY2hheW5zLmRhdGVUeXBlXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IHByZVNlbGVjdCBQcmVzZXQgdGhlIERhdGUgKGUuZy4gY3VycmVudCBEYXRlKVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB0aGF0IHJlY2VpdmVzIHRoZSBjaG9zZW4gRGF0ZSBhcyBUaW1lc3RhbXBcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gbWluRGF0ZSBNaW5pbXVtIFN0YXJ0RGF0ZVxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBtYXhEYXRlIE1heGltdW0gRW5kRGF0ZVxuICAgKi9cbiAgc2VsZWN0RGF0ZTogZnVuY3Rpb24gc2VsZWN0RGF0ZShkYXRlVHlwZSwgcHJlU2VsZWN0LCBjYWxsYmFjaywgbWluRGF0ZSwgbWF4RGF0ZSkge1xuXG4gICAgaWYgKCFpc051bWJlcihkYXRlVHlwZSkgfHwgZGF0ZVR5cGUgPD0gMCkge1xuICAgICAgbG9nLndhcm4oJ3NlbGVjdERhdGU6IHdyb25nIGRhdGVUeXBlJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdzZWxlY3REYXRlOiBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZVZhbHVlKHZhbHVlKSB7XG4gICAgICBpZiAoIWlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBwYXJzZUludCh2YWx1ZS5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBwcmVTZWxlY3QgPSB2YWxpZGF0ZVZhbHVlKHByZVNlbGVjdCk7XG4gICAgbWluRGF0ZSA9IHZhbGlkYXRlVmFsdWUobWluRGF0ZSk7XG4gICAgbWF4RGF0ZSA9IHZhbGlkYXRlVmFsdWUobWF4RGF0ZSk7XG5cbiAgICBsZXQgZGF0ZVJhbmdlID0gJyc7XG4gICAgaWYgKG1pbkRhdGUgPiAtMSAmJiBtYXhEYXRlID4gLTEpIHtcbiAgICAgIGRhdGVSYW5nZSA9ICcsJyArIG1pbkRhdGUgKyAnLCcgKyBtYXhEYXRlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnc2VsZWN0RGF0ZUNhbGxiYWNrJztcbiAgICBmdW5jdGlvbiBjYWxsYmFja0ZuKGNhbGxiYWNrLCBkYXRlVHlwZSwgcHJlU2VsZWN0LCB0aW1lKSB7XG4gICAgICAvLyBUT0RPOiBpbXBvcnRhbnQgdmFsaWRhdGUgRGF0ZVxuICAgICAgLy8gVE9ETzogY2hvb3NlIHJpZ2h0IGRhdGUgYnkgZGF0ZVR5cGVFbnVtXG4gICAgICBsb2cuZGVidWcoZGF0ZVR5cGUsIHByZVNlbGVjdCk7XG4gICAgICBjYWxsYmFjay5jYWxsKG51bGwsIHRpbWUgPyBuZXcgRGF0ZSh0aW1lKSA6IC0xKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMwLFxuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9LFxuICAgICAgICB7J0ludGVnZXInOiBkYXRlVHlwZX0sXG4gICAgICAgIHsnSW50ZWdlcic6IHByZVNlbGVjdCArIGRhdGVSYW5nZX1cbiAgICAgIF0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIGNhbGxiYWNrLCBkYXRlVHlwZSwgcHJlU2VsZWN0KSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMDcyLCBpb3M6IDMwNjIsIHdwOiAzMDMwfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFVSTCBpbiBBcHBcbiAgICogKG9sZCBTaG93VVJMSW5BcHApXG4gICAqIG5vdCB0byBjb25mdXNlIHdpdGggb3BlbkxpbmtJbkJyb3dzZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBWaWRlbyBVUkwgc2hvdWxkIGNvbnRhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAgIC8vIFRPRE86IGltcGxlbWVudCBDaGF5bnMgV2ViIE1ldGhvZCBhcyB3ZWxsIChuYXZpZ2F0ZSBiYWNrIHN1cHBvcnQpXG4gIG9wZW5Vcmw6IGZ1bmN0aW9uIG9wZW5VcmwodXJsLCB0aXRsZSkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSkge1xuICAgICAgbG9nLmVycm9yKCdvcGVuVXJsOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzEsXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvY2F0aW9uLmhyZWYgPSB1cmw7IC8vIFRPRE86IG1ha2Ugc3VyZSBpdCB3b3Jrc1xuICAgICAgfSxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfSwgeydzdHJpbmcnOiB0aXRsZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMxMTAsIGlvczogMzA3NCwgd3A6IDMwNjN9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIGNyZWF0ZSBRUiBDb2RlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gZGF0YSBRUiBDb2RlIGRhdGFcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIGJhc2U2NCBlbmNvZGVkIElNRyBUT0RPOiB3aGljaCB0eXBlP1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGNyZWF0ZVFSQ29kZTogZnVuY3Rpb24gY3JlYXRlUVJDb2RlKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFpc1N0cmluZyhkYXRhKSkge1xuICAgICAgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgIH1cblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdjcmVhdGVRUkNvZGU6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdjcmVhdGVRUkNvZGVDYWxsYmFjaygpJztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMzLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBkYXRhfSwgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6ICAzMjIwLCBpb3M6IDEzNzIsIHdwOiAzMTA2fSxcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHNjYW4gUVIgQ29kZVxuICAgKiBTY2FucyBRUiBDb2RlIGFuZCByZWFkIGl0XG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSByZXN1bHRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzY2FuUVJDb2RlOiBmdW5jdGlvbiBzY2FuUVJDb2RlKGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2Fybignc2NhblFSQ29kZTogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ3NjYW5RUkNvZGVDYWxsYmFjaygpJztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDM0LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6ICAzMjIwLCBpb3M6IDEzNzIsIHdwOiAzMTA2fSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBzY2FuIFFSIENvZGVcbiAgICogU2NhbnMgUVIgQ29kZSBhbmQgcmVhZCBpdFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgcmVzdWx0XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgZ2V0TG9jYXRpb25CZWFjb25zOiBmdW5jdGlvbiBnZXRMb2NhdGlvbkJlYWNvbnMoY2FsbGJhY2ssIGZvcmNlUmVsb2FkKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignZ2V0TG9jYXRpb25CZWFjb25zOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnZ2V0QmVhY29uc0NhbGxCYWNrKCknO1xuICAgIGlmIChiZWFjb25MaXN0ICYmICFmb3JjZVJlbG9hZCkgeyAvLyBUT0RPOiBtYWtlIHN1cmUgaXQgaXMgZ29vZCB0byBjYWNoZSB0aGUgbGlzdFxuICAgICAgbG9nLmRlYnVnKCdnZXRMb2NhdGlvbkJlYWNvbnM6IHRoZXJlIGlzIGFscmVhZHkgb25lIGJlYWNvbkxpc3QnKTtcbiAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKG51bGwsIGJlYWNvbkxpc3QpO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tGbiA9IGZ1bmN0aW9uIGdldExvY2F0aW9uQmVhY29uQ2FsbGJhY2soY2FsbGJhY2ssIGxpc3QpIHtcbiAgICAgIGJlYWNvbkxpc3QgPSBsaXN0O1xuICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBsaXN0KTtcbiAgICB9O1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzksXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDQwNDUsIGlvczogNDA0OH0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIGNhbGxiYWNrKVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGQgdG8gUGFzc2Jvb2tcbiAgICogaU9TIG9ubHlcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVybCBQYXRoIHRvIFBhc3Nib29rIGZpbGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBhZGRUb1Bhc3Nib29rOiBmdW5jdGlvbiBhZGRUb1Bhc3Nib29rKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSkge1xuICAgICAgbG9nLndhcm4oJ2FkZFRvUGFzc2Jvb2s6IHVybCBpcyBpbnZhbGlkLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNDcsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgc3VwcG9ydDoge2lvczogNDA0NX0sXG4gICAgICB3ZWJGbjogY2hheW5zQXBpSW50ZXJmYWNlLm9wZW5MaW5rSW5Ccm93c2VyLmJpbmQobnVsbCwgdXJsKSxcbiAgICAgIGZhbGxiYWNrRm46IGNoYXluc0FwaUludGVyZmFjZS5vcGVuTGlua0luQnJvd3Nlci5iaW5kKG51bGwsIHVybClcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVG9iaXQgTG9naW5cbiAgICogV2l0aCBGYWNlYm9va0Nvbm5lY3QgRmFsbGJhY2tcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhcmFtcyBSZWxvYWQgUGFyYW1ldGVyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgbG9naW46IGZ1bmN0aW9uIGxvZ2luKHBhcmFtcykge1xuICAgIHBhcmFtcyA9ICdFeGVjQ29tbWFuZD0nICsgcGFyYW1zO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNTQsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHBhcmFtc31dLFxuICAgICAgc3VwcG9ydDoge2lvczogNDI0MCwgd3A6IDQwOTl9LFxuICAgICAgZmFsbGJhY2tGbjogY2hheW5zQXBpSW50ZXJmYWNlLmZhY2Vib29rQ29ubmVjdC5iaW5kKG51bGwsICd1c2VyX2ZyaWVuZHMnLCBwYXJhbXMpLFxuICAgICAgd2ViRm46ICd0b2JpdGNvbm5lY3QnLFxuICAgICAgd2ViUGFyYW1zOiBwYXJhbXNcbiAgICB9KTtcbiAgfVxuXG59O1xuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzUGVybWl0dGVkLCBpc0Z1bmN0aW9uLCBpc0JsYW5rLCBpc0FycmF5LCBpc09iamVjdCwgaXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvdywgcGFyZW50fSBmcm9tICcuLi91dGlscy9icm93c2VyJztcbmltcG9ydCB7ZW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtzZXRDYWxsYmFja30gZnJvbSAnLi9jYWxsYmFja3MnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNvcmUuY2hheW5zX2NhbGxzJyk7XG5cblxuZnVuY3Rpb24gY2FuKHZlcnNpb25zKSB7XG4gIHJldHVybiBpc1Blcm1pdHRlZCh2ZXJzaW9ucywgZW52aXJvbm1lbnQub3MsIGVudmlyb25tZW50LmFwcFZlcnNpb24pO1xufVxuXG4vLyBPUyBBcHAgVmVyc2lvbiBNYXAgZm9yIENoYXlucyBDYWxscyBTdXBwb3J0XG4vLyBUT0RPOiBtb3ZlIGludG8gZW52aXJvbm1lbnQ/IChvciBqdXN0IHJlbW92ZSBjYXVzZSBpdCBpcyBvbmx5IHVzZWQgb25lIHRpbWUgaW4gaGVyZSlcbmxldCBvc01hcCA9IHtcbiAgY2hheW5zQ2FsbDogeyBhbmRyb2lkOiAyNTEwLCBpb3M6IDI0ODMsIHdwOiAyNDY5LCBiYjogMTE4IH1cbn07XG5cbi8qKlxuICogUHVibGljIENoYXlucyBJbnRlcmZhY2VcbiAqIEV4ZWN1dGUgQVBJIENhbGxcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gcGFyYW1zXG4gKiBAcGFyYW0gZGVib3VuY2VcbiAqIC8vIFRPRE86IGxlZnQgb2YgY2FsbGJhY2sgYXMgcHJvbWlzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBpQ2FsbChvYmopIHtcblxuICBsZXQgZGVib3VuY2UgPSBvYmouZGVib3VuY2UgfHwgZmFsc2U7XG5cbiAgLy8gVE9ETzogY2hlY2sgb2JqLm9zIFZFUlNJT05cblxuICBmdW5jdGlvbiBleGVjdXRlQ2FsbChjaGF5bnNDYWxsT2JqKSB7XG5cbiAgICBpZiAoZW52aXJvbm1lbnQuY2FuQ2hheW5zQ2FsbCAmJiBjYW4ob3NNYXAuY2hheW5zQ2FsbCkpIHtcbiAgICAgIC8vIFRPRE86IGNvbnNpZGVyIGNhbGxRdWV1ZSBhbmQgSW50ZXJ2YWwgdG8gcHJldmVudCBlcnJvcnNcbiAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZUNhbGw6IGNoYXlucyBjYWxsICcsIGNoYXluc0NhbGxPYmouY21kKTtcblxuICAgICAgaWYgKCdjYicgaW4gY2hheW5zQ2FsbE9iaiAmJiBpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouY2IpKSB7XG4gICAgICAgIHNldENhbGxiYWNrKGNoYXluc0NhbGxPYmouY2FsbGJhY2tOYW1lIHx8IGNoYXluc0NhbGxPYmoucGFyYW1zWzBdLmNhbGxiYWNrLCBjaGF5bnNDYWxsT2JqLmNiLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc09iamVjdChjaGF5bnNDYWxsT2JqLnN1cHBvcnQpICYmICFjYW4oY2hheW5zQ2FsbE9iai5zdXBwb3J0KSkge1xuICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IHRoZSBjaGF5bnMgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICAgIGlmIChjaGF5bnNDYWxsT2JqLmZhbGxiYWNrQ21kKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBmYWxsYmFjayBjaGF5bnMgY2FsbCB3aWxsIGJlIGludm9rZWQnKTtcbiAgICAgICAgICByZXR1cm4gY2hheW5zQ2FsbChjaGF5bnNDYWxsT2JqLmZhbGxiYWNrQ21kKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihjaGF5bnNDYWxsT2JqLmZhbGxiYWNrRm4pKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBmYWxsYmFja0ZuIHdpbGwgYmUgaW52b2tlZCcpO1xuICAgICAgICAgIHJldHVybiBjaGF5bnNDYWxsT2JqLmZhbGxiYWNrRm4uY2FsbChudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gY2hheW5zQ2FsbChjaGF5bnNDYWxsT2JqLmNtZCwgY2hheW5zQ2FsbE9iai5wYXJhbXMpO1xuXG4gICAgfSBlbHNlIGlmIChlbnZpcm9ubWVudC5jYW5DaGF5bnNXZWJDYWxsKSB7XG5cbiAgICAgIGlmICgnY2InIGluIGNoYXluc0NhbGxPYmogJiYgaXNGdW5jdGlvbihjaGF5bnNDYWxsT2JqLmNiKSkge1xuICAgICAgICBzZXRDYWxsYmFjayhjaGF5bnNDYWxsT2JqLndlYkZuLCBjaGF5bnNDYWxsT2JqLmNiKTtcbiAgICAgIH1cbiAgICAgIGlmICghY2hheW5zQ2FsbE9iai53ZWJGbikge1xuICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IFRoaXMgQ2FsbCBoYXMgbm8gd2ViRm4nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBsb2cuZGVidWcoJ2V4ZWN1dGVDYWxsOiBjaGF5bnMgd2ViIGNhbGwgJywgY2hheW5zQ2FsbE9iai53ZWJGbi5uYW1lIHx8IGNoYXluc0NhbGxPYmoud2ViRm4pO1xuXG4gICAgICByZXR1cm4gY2hheW5zV2ViQ2FsbChjaGF5bnNDYWxsT2JqLndlYkZuLCBjaGF5bnNDYWxsT2JqLndlYlBhcmFtcyB8fCBjaGF5bnNDYWxsT2JqLnBhcmFtcyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBuZWl0aGVyIGNoYXlucyB3ZWIgY2FsbCBub3IgY2hheW5zIHdlYicpO1xuICAgICAgaWYgKGlzRnVuY3Rpb24ob2JqLm9uRXJyb3IpKSB7XG4gICAgICAgIG9iai5vbkVycm9yLmNhbGwodW5kZWZpbmVkLCBuZXcgRXJyb3IoJ05laXRoZXIgaW4gQ2hheW5zIFdlYiBub3IgaW4gQ2hheW5zIEFwcCcpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZGVib3VuY2UpIHtcbiAgICBzZXRUaW1lb3V0KGV4ZWN1dGVDYWxsLmJpbmQobnVsbCwgb2JqKSwgMTAwKTsgLy8gVE9ETzogZXJyb3I/XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGV4ZWN1dGVDYWxsKG9iaik7XG4gIH1cbn1cblxuLyoqXG4gKiBCdWlsZCBDaGF5bnMgQ2FsbCAob25seSBmb3IgbmF0aXZlIEFwcHMpXG4gKiBAcHJpdmF0ZVxuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBjaGF5bnMgY2FsbCBzdWNjZWVkZWQsIGZhbHNlIG9uIGVycm9yIChubyB1cmwgZXRjKVxuICovXG5mdW5jdGlvbiBjaGF5bnNDYWxsKGNtZCwgcGFyYW1zKSB7XG5cbiAgaWYgKGlzQmxhbmsoY21kKSkgeyAvLyAwIGlzIGEgdmFsaWQgY2FsbCwgdW5kZWZpbmVkIGFuZCBudWxsIGFyZSBub3RcbiAgICBsb2cud2FybignY2hheW5zQ2FsbDogbWlzc2luZyBjbWQgZm9yIGNoYXluc0NhbGwnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgbGV0IHVybCA9IG51bGw7XG5cbiAgLy8gaWYgdGhlcmUgaXMgbm8gcGFyYW0gb3IgJ25vbmUnIHdoaWNoIG1lYW5zIG5vIGNhbGxiYWNrXG4gIGlmICghcGFyYW1zKSB7XG5cbiAgICB1cmwgPSAnY2hheW5zOi8vY2hheW5zQ2FsbCgnICsgY21kICsgJyknO1xuXG4gIH0gZWxzZSB7XG5cbiAgICAvLyBwYXJhbXMgZXhpc3QgaG93ZXZlciwgaXQgaXMgbm8gYXJyYXlcbiAgICBpZiAoIWlzQXJyYXkocGFyYW1zKSkge1xuICAgICAgbG9nLmVycm9yKCdjaGF5bnNDYWxsOiBwYXJhbXMgYXJlIG5vIEFycmF5Jyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gYWRkIHRoZSBwYXJhbXMgdG8gdGhlIGNoYXlucyBjYWxsXG4gICAgbGV0IGNhbGxiYWNrUHJlZml4ID0gJ19jaGF5bnNDYWxsYmFja3MuJztcbiAgICBsZXQgY2FsbFN0cmluZyA9ICcnO1xuICAgIGlmIChwYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgbGV0IGNhbGxBcmdzID0gW107XG4gICAgICBwYXJhbXMuZm9yRWFjaChmdW5jdGlvbihwYXJhbSkge1xuICAgICAgICBsZXQgbmFtZSA9IE9iamVjdC5rZXlzKHBhcmFtKVswXTtcbiAgICAgICAgbGV0IHZhbHVlID0gcGFyYW1bbmFtZV07XG4gICAgICAgIGlmIChuYW1lID09PSAnY2FsbGJhY2snKSB7XG4gICAgICAgICAgY2FsbEFyZ3MucHVzaCgnXFwnJyArIGNhbGxiYWNrUHJlZml4ICsgdmFsdWUgKyAnXFwnJyk7XG4gICAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gJ2Jvb2wnIHx8IG5hbWUgPT09ICdGdW5jdGlvbicgfHwgbmFtZSA9PT0gJ0ludGVnZXInKSB7XG4gICAgICAgICAgY2FsbEFyZ3MucHVzaCh2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1xcJycgKyB2YWx1ZSArICdcXCcnKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjYWxsU3RyaW5nID0gJywnICsgY2FsbEFyZ3Muam9pbignLCcpO1xuICAgIH1cblxuICAgIC8vIGFkZCBjaGF5bnMgcHJvdG9jb2wgYW5kIGhvc3QgYW5kIGpvaW4gYXJyYXlcbiAgICB1cmwgPSAnY2hheW5zOi8vY2hheW5zQ2FsbCgnICsgY21kICsgY2FsbFN0cmluZyArICcpJztcbiAgfVxuXG4gIGxvZy5kZWJ1ZygnY2hheW5zQ2FsbDogdXJsOiAnLCB1cmwpO1xuXG4gIHRyeSB7XG4gICAgLy8gVE9ETzogY3JlYXRlIGFuIGVhc2llciBpZGVudGlmaWNhdGlvbiBvZiB0aGUgcmlnaHQgZW52aXJvbm1lbnRcbiAgICAvLyBUT0RPOiBjb25zaWRlciB0byBleGVjdXRlIHRoZSBicm93c2VyIGZhbGxiYWNrIGluIGhlcmUgYXMgd2VsbFxuICAgIGlmICgnY2hheW5zQ2FsbCcgaW4gd2luZG93ICYmIGlzRnVuY3Rpb24od2luZG93LmNoYXluc0NhbGwuaHJlZikpIHtcbiAgICAgIHdpbmRvdy5jaGF5bnNDYWxsLmhyZWYodXJsKTtcbiAgICB9IGVsc2UgaWYgKCd3ZWJraXQnIGluIHdpbmRvd1xuICAgICAgJiYgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnNcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLmNoYXluc0NhbGxcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLmNoYXluc0NhbGwucG9zdE1lc3NhZ2UpIHtcbiAgICAgIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzLmNoYXluc0NhbGwucG9zdE1lc3NhZ2UodXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSB1cmw7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IEVycm9yOiBjb3VsZCBub3QgZXhlY3V0ZSBDaGF5bnNDYWxsOiAnLCBlKTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEV4ZWN1dGUgYSBDaGF5bnNXZWIgQ2FsbCBpbiB0aGUgcGFyZW50IHdpbmRvdy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZm4gRnVuY3Rpb24gbmFtZVxuICogQHBhcmFtIHtTdHJpbmd9IHBhcmFtcyBBZGRpdGlvbmFsXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBjaGF5bnNXZWJiQ2FsbCBzdWNjZWVkZWRcbiAqL1xuZnVuY3Rpb24gY2hheW5zV2ViQ2FsbChmbiwgcGFyYW1zKSB7XG4gIGlmICghZm4pIHtcbiAgICBsb2cuaW5mbygnY2hheW5zV2ViQ2FsbDogbm8gQ2hheW5zV2ViQ2FsbCBmbicpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmICghcGFyYW1zIHx8IGlzQXJyYXkocGFyYW1zKSkgeyAvLyBBcnJheSBpbmRpY2F0ZXMgdGhhdCB0aGVzZSBhcmUgY2hheW5zQ2FsbHMgcGFyYW1zIFRPRE86IHJlZmFjdG9yXG4gICAgcGFyYW1zID0gJyc7XG4gIH1cbiAgaWYgKGlzT2JqZWN0KHBhcmFtcykpIHsgLy8gYW4gQXJyYXkgaXMgYWxzbyBzZWVuIGFzIE9iamVjdCwgaG93ZXZlciBpdCB3aWxsIGJlIHJlc2V0IGJlZm9yZVxuICAgIHBhcmFtcyA9IEpTT04uc3RyaW5naWZ5KHBhcmFtcyk7XG4gIH1cblxuICBpZiAoaXNGdW5jdGlvbihmbikpIHtcbiAgICByZXR1cm4gZm4uY2FsbChudWxsKTtcbiAgfVxuXG4gIHZhciBuYW1lc3BhY2UgPSAnY2hheW5zLmN1c3RvbVRhYi4nO1xuICB2YXIgdXJsID0gbmFtZXNwYWNlICsgZm4gKyAnOicgKyBwYXJhbXM7XG5cbiAgbG9nLmRlYnVnKCdjaGF5bnNXYWJDYWxsOiAnICsgdXJsKTtcblxuICB0cnkge1xuICAgIHBhcmVudC5wb3N0TWVzc2FnZSh1cmwsICcqJyk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cud2FybignY2hheW5zV2ViQ2FsbDogcG9zdE1lc3NnYWUgZmFpbGVkJyk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuIiwiLyoqXG4gKiBAbW9kdWxlIGNvbmZpZ1xuICogQHByaXZhdGVcbiAqL1xuXG5pbXBvcnQge2lzUHJlc2VudCwgaXNCbGFuaywgaXNVbmRlZmluZWQsIGlzQXJyYXksIGV4dGVuZH0gZnJvbSAnLi4vdXRpbHMnO1xuXG4vKipcbiAqIFN0b3JlIGludGVybmFsIGNoYXlucyBjb25maWd1cmF0aW9uXG4gKiBAdHlwZSB7e2FwcE5hbWU6IHN0cmluZywgYXBwVmVyc2lvbjogbnVtYmVyLCBsb2FkTW9kZXJuaXplcjogYm9vbGVhbiwgbG9hZFBvbHlmaWxsczogYm9vbGVhbiwgdXNlRmV0Y2g6IGJvb2xlYW4sIHByb21pc2VzOiBzdHJpbmcsIHVzZU9mZmxpbmVDYWNoaW5nOiBib29sZWFuLCB1c2VMb2NhbFN0b3JhZ2U6IGJvb2xlYW4sIGhhc0FkbWluOiBib29sZWFuLCBtdWx0aUxpbmd1YWw6IGJvb2xlYW4sIGlzUHVibGlzaGVkOiBib29sZWFuLCBkZWJ1Z01vZGU6IGJvb2xlYW4sIHVzZUFqYXg6IGJvb2xlYW59fVxuICogQHByaXZhdGVcbiAqL1xudmFyIF9jb25maWcgPSB7XG4gIGFwcE5hbWU6ICdDaGF5bnMgQXBwJywgICAvLyBhcHAgTmFtZVxuICBhcHBWZXJzaW9uOiAxLCAgICAgICAgICAgLy8gYXBwIFZlcnNpb25cbiAgcHJldmVudEVycm9yczogdHJ1ZSwgICAgICAgIC8vIGVycm9yIGhhbmRsZXIgY2FuIGhpZGUgZXJyb3JzIChjYW4gYmUgb3Zlcnd0aXR0ZW4gYnkgaXNQcm9kdWN0aW9uKVxuICBpc1Byb2R1Y3Rpb246IHRydWUsICAgICAgLy8gcHJvZHVjdGlvbiwgZGV2ZWxvcG1lbnQgYW5kIHRlc3QgRU5WXG4gIGxvYWRNb2Rlcm5pemVyOiB0cnVlLCAgICAvLyBsb2FkIG1vZGVybml6ZXJcbiAgbG9hZFBvbHlmaWxsczogdHJ1ZSwgICAgIC8vIGxvYWQgcG9seWZpbGxzXG4gIHVzZUZldGNoOiB0cnVlLCAgICAgICAgICAvLyB1c2Ugd2luZG93LmZldGNoIGFuZCBpdCdzIHBvbHlmaWxsc1xuICBwcm9taXNlczogJ3EnLCAgICAgICAgICAgLy8gcHJvbWlzZSBTZXJ2aWNlOiBRIGlzIHN0YW5kYXJkXG4gIHVzZU9mZmxpbmVDYWNoaW5nOiBmYWxzZSwvLyBpcyBvZmZsaW5lIGNhY2hpbmcgdXNlZD8gaW5sY3VkZSBvZmZsaW5lIGhlbHBlclxuICB1c2VMb2NhbFN0b3JhZ2U6IGZhbHNlLCAgLy8gaXMgbG9jYWxTdG9yYWdlIHVzZWQ/IGluY2x1ZGUgaGVscGVyXG4gIGhhc0FkbWluOiBmYWxzZSwgICAgICAgICAvLyBkb2VzIHRoaXMgYXBwL3BhZ2UgaGF2ZSBhbiBhZG1pbj9cbiAgbXVsdGlMaW5ndWFsOiB0cnVlLCAgICAgIC8vIGVuYWJsZSBpMThuP1xuICBpc1B1Ymxpc2hlZDogdHJ1ZSwgICAgICAgLy8gb25seSBpbiBpbnRlcm5hbCB0b2JpdCBhdmFpbGFibGVcbiAgZGVidWdNb2RlOiB0cnVlLCAgICAgICAgIC8vIHNob3cgY29uc29sZSBvdXRwdXQsIGRlYnVnIHBhcmFtIGZvciBsb2dnaW5nXG4gIHVzZUFqYXg6IGZhbHNlLFxuICBpc0ludGVybmFsOiBmYWxzZSAgICAgICAgLy8gdXNlIGludGVybmFsIHJvdXRpbmdcbiAgLy9mcmFtZXdvcms6IFsnRW1iZXInLCAnQW5ndWxhcicsICdCYWNrYm9uZScsICdBbXBlcnNhbmQnLCAnUmVhY3QnLCAnalF1ZXJ5J11cbn07XG5cbi8vIFRPRE86IHJlbW92ZVxuLypleHBvcnQgZnVuY3Rpb24gY29uZmlnKCkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIHJldHVybiBDb25maWcuc2V0KGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdKTsgLy8gVE9ETzogcmVmYWN0b3IgdGhpc1xuICB9IGVsc2UgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gQ29uZmlnLmdldChhcmd1bWVudHMpO1xuICB9XG4gIHJldHVybiBDb25maWcuZ2V0KCk7XG59Ki9cblxuLy8gVE9ETzogcmVmYWN0b3IgdG8gTWFwXG5leHBvcnQgY2xhc3MgQ29uZmlnIHtcblxuICAvKipcbiAgICogQG1ldGhvZCBnZXRcbiAgICogQGNsYXNzIENvbmZpZ1xuICAgKiBAbW9kdWxlIGNoYXlucy5jb25maWdcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBSZWZlcmVuY2UgdGhlIGBrZXlgIGluIHRoZSBjb25maWcgYE9iamVjdGBcbiAgICogQHJldHVybnMge251bGx9IFZhbHVlIG9mIHRoZSBga2V5YCBpbiB0aGUgY29uZmlnIGBPYmplY3RgXG4gICAqICAgICAgICAgICAgICAgICBgdW5kZWZpbmVkYCBpZiB0aGUgYGtleWAgd2FzIG5vdCBmb3VuZFxuICAgKi9cbiAgc3RhdGljIGdldChrZXkpIHtcbiAgICBpZiAoaXNQcmVzZW50KGtleSkpIHtcbiAgICAgIHJldHVybiBfY29uZmlnW2tleV07XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcGFyYW0gdmFsdWVcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzdGF0aWMgc2V0KGtleSwgdmFsdWUpIHtcbiAgICBpZiAoaXNCbGFuayhrZXkpIHx8IGlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBUT0RPOiBnb29kIGlkZWE/IG9uZSBzaG91bGQgYmUgY2FyZWZ1bCBpIHN1cHBvc2VcbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGV4dGVuZChfY29uZmlnLCB2YWx1ZSk7XG4gICAgfVxuICAgIF9jb25maWdba2V5XSA9IHZhbHVlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzdGF0aWMgaGFzKGtleSkge1xuICAgIHJldHVybiAhIWtleSAmJiAoa2V5IGluIF9jb25maWcpO1xuICB9XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3QsIERPTX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtDb25maWd9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7bWVzc2FnZUxpc3RlbmVyfSBmcm9tICcuL2NhbGxiYWNrcyc7XG5pbXBvcnQge2NoYXluc0FwaUludGVyZmFjZX0gZnJvbSAnLi9jaGF5bnNfYXBpX2ludGVyZmFjZSc7XG5pbXBvcnQge2Vudmlyb25tZW50LCBzZXRFbnZ9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuXG4vLyBjcmVhdGUgbmV3IExvZ2dlciBpbnN0YW5jZVxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNvcmUnKTtcblxuLy8gZW5hYmxlIEpTIEVycm9ycyBpbiB0aGUgY29uc29sZVxuQ29uZmlnLnNldCgncHJldmVudEVycm9ycycsIGZhbHNlKTtcblxudmFyIGRvbVJlYWR5UHJvbWlzZTtcbnZhciBjaGF5bnNSZWFkeVByb21pc2U7XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLnByZXBhcmVcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSdW4gbmVjZXNzYXJ5IG9wZXJhdGlvbnMgdG8gcHJlcGFyZSBjaGF5bnMuXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlcihjb25maWcpIHtcbiAgbG9nLmluZm8oJ2NoYXlucy5yZWdpc3RlcicpO1xuICBDb25maWcuc2V0KGNvbmZpZyk7IC8vIHRoaXMgcmVmZXJlbmNlIHRvIHRoZSBjaGF5bnMgb2JqXG4gIHJldHVybiB0aGlzO1xufVxuXG4vLyBUT0RPOiByZWdpc3RlciBgRnVuY3Rpb25gIG9yIHByZUNoYXlucyBgT2JqZWN0YD9cbmV4cG9ydCBmdW5jdGlvbiBwcmVDaGF5bnMoKSB7XG4gIGlmICgncHJlQ2hheW5zJyBpbiB3aW5kb3cgJiYgaXNPYmplY3Qod2luZG93LnByZUNoYXlucykpIHtcbiAgICBPYmplY3Qua2V5cyh3aW5kb3cucHJlQ2hheW5zKS5mb3JFYWNoKGZ1bmN0aW9uKHNldHRpbmcpIHtcbiAgICAgIGxvZy5kZWJ1ZygncHJlIGNoYXluczogJywgc2V0dGluZyk7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMucHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWR5KCkge1xuICBsb2cuZGVidWcoJ2NoYXlucy5yZWFkeSgpJyk7XG4gIHJldHVybiBjaGF5bnNSZWFkeVByb21pc2U7XG59XG5cbi8qKlxuICogQG5hbWUgcHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIG9iaiBSZWZlcmVuY2UgdG8gY2hheW5zIE9iamVjdFxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cCgpIHtcbiAgbG9nLmluZm8oJ3N0YXJ0IGNoYXlucyBzZXR1cCcpO1xuXG4gIC8vIGVuYWJsZSBgY2hheW5zLmNzc2AgYnkgYWRkaW5nIGBjaGF5bnNgIGNsYXNzXG4gIC8vIHJlbW92ZSBgbm8tanNgIGNsYXNzIGFuZCBhZGQgYGpzYCBjbGFzc1xuICBsZXQgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gIERPTS5hZGRDbGFzcyhib2R5LCAnY2hheW5zJyk7XG4gIERPTS5hZGRDbGFzcyhib2R5LCAnanMnKTtcbiAgRE9NLnJlbW92ZUNsYXNzKGJvZHksICduby1qcycpO1xuXG5cbiAgLy8gcnVuIHBvbHlmaWxsIChpZiByZXF1aXJlZClcblxuICAvLyBydW4gbW9kZXJuaXplciAoZmVhdHVyZSBkZXRlY3Rpb24pXG5cbiAgLy8gcnVuIGZhc3RjbGlja1xuXG4gIC8vICh2aWV3cG9ydCBzZXR1cClcblxuICAvLyBjcmF0ZSBtZXRhIHRhZ3MgKGNvbG9ycywgbW9iaWxlIGljb25zIGV0YylcblxuICAvLyBkbyBzb21lIFNFTyBzdHVmZiAoY2Fub25pY2FsIGV0YylcblxuICAvLyBkZXRlY3QgdXNlciAobG9nZ2VkIGluPylcblxuICAvLyBydW4gY2hheW5zIHNldHVwIChjb2xvcnMgYmFzZWQgb24gZW52aXJvbm1lbnQpXG5cbiAgLy8gRE9NICByZWFkeSBwcm9taXNlXG4gIGRvbVJlYWR5UHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJykge1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZG9tUmVhZHkgPSBmdW5jdGlvbiBkb21SZWFkeSgpIHtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGRvbVJlYWR5LCB0cnVlKTtcbiAgICAgIH07XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGRvbVJlYWR5LCB0cnVlKTtcbiAgICB9XG4gIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgLy8gRE9NIHJlYWR5IGFjdGlvbnNcbiAgICBsb2cuZGVidWcoJ0RPTSByZWFkeScpOyAvLyBUT0RPOiBhY3R1YWxseSB3ZSBjYW4gcmVtb3ZlIHRoaXNcbiAgICAvLyBkb20tcmVhZHkgY2xhc3NcbiAgICBET00uYWRkQ2xhc3MoYm9keSwgJ2RvbS1yZWFkeScpO1xuICAgIC8vIHN0YXJ0IHdpbmRvdy5vbignbWVzc2FnZScpIGxpc3RlbmVyIGZvciBpRnJhbWUgQ29tbXVuaWNhdGlvblxuICAgIG1lc3NhZ2VMaXN0ZW5lcigpO1xuICB9KTtcblxuICAvLyBjaGF5bnNSZWFkeSBQcm9taXNlXG4gIGNoYXluc1JlYWR5UHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIC8vIGdldCB0aGUgQXBwIEluZm9ybWF0aW9uIChUT0RPOiBoYXMgdG8gYmUgZG9uZSB3aGVuIGRvY3VtZW50IHJlYWR5PylcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2UuZ2V0R2xvYmFsRGF0YSgpLnRoZW4oZnVuY3Rpb24gcmVzb2x2ZWQoZGF0YSkge1xuXG4gICAgICAvLyBub3cgQ2hheW5zIGlzIG9mZmljaWFsbHkgcmVhZHlcbiAgICAgIC8vIGZpcnN0IHNldCBhbGwgZW52IHN0dWZmXG4gICAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ1RoZXJlIGlzIG5vIGFwcCBEYXRhJykpO1xuICAgICAgfVxuXG4gICAgICBsb2cuZGVidWcoJ2FwcEluZm9ybWF0aW9uIGNhbGxiYWNrJywgZGF0YSk7XG5cbiAgICAgIC8vIHN0b3JlIHJlY2VpdmVkIGluZm9ybWF0aW9uXG4gICAgICBpZiAoaXNPYmplY3QoZGF0YS5BcHBJbmZvKSkge1xuICAgICAgICBsZXQgYXBwSW5mbyA9IGRhdGEuQXBwSW5mbztcbiAgICAgICAgbGV0IHNpdGUgPSB7XG4gICAgICAgICAgc2l0ZUlkOiBhcHBJbmZvLlNpdGVJRCxcbiAgICAgICAgICB0aXRsZTogYXBwSW5mby5UaXRsZSxcbiAgICAgICAgICB0YXBwczogYXBwSW5mby5UYXBwcyxcbiAgICAgICAgICBmYWNlYm9va0FwcElkOiBhcHBJbmZvLkZhY2Vib29rQXBwSUQsXG4gICAgICAgICAgZmFjZWJvb2tQYWdlSWQ6IGFwcEluZm8uRmFjZWJvb2tQYWdlSUQsXG4gICAgICAgICAgY29sb3JTY2hlbWU6IGFwcEluZm8uQ29sb3JTY2hlbWUgfHwgMCxcbiAgICAgICAgICB2ZXJzaW9uOiBhcHBJbmZvLlZlcnNpb24sXG4gICAgICAgICAgdGFwcDogYXBwSW5mby5UYXBwU2VsZWN0ZWRcbiAgICAgICAgfTtcbiAgICAgICAgc2V0RW52KCdzaXRlJywgc2l0ZSk7XG4gICAgICB9XG4gICAgICBpZiAoaXNPYmplY3QoZGF0YS5BcHBVc2VyKSkge1xuICAgICAgICBsZXQgYXBwVXNlciA9IGRhdGEuQXBwVXNlcjtcbiAgICAgICAgbGV0IHVzZXIgPSB7XG4gICAgICAgICAgbmFtZTogYXBwVXNlci5GYWNlYm9va1VzZXJOYW1lLFxuICAgICAgICAgIGlkOiBhcHBVc2VyLlRvYml0VXNlcklELFxuICAgICAgICAgIGZhY2Vib29rSWQ6IGFwcFVzZXIuRmFjZWJvb2tJRCxcbiAgICAgICAgICBwZXJzb25JZDogYXBwVXNlci5QZXJzb25JRCxcbiAgICAgICAgICBhY2Nlc3NUb2tlbjogYXBwVXNlci5Ub2JpdEFjY2Vzc1Rva2VuLFxuICAgICAgICAgIGZhY2Vib29rQWNjZXNzVG9rZW46IGFwcFVzZXIuRmFjZWJvb2tBY2Nlc3NUb2tlbixcbiAgICAgICAgICBncm91cHM6IGFwcFVzZXIuVUFDR3JvdXBzXG4gICAgICAgIH07XG4gICAgICAgIHNldEVudigndXNlcicsIHVzZXIpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGRhdGEuRGV2aWNlKSkge1xuICAgICAgICBsZXQgZGV2aWNlID0gZGF0YS5EZXZpY2U7XG4gICAgICAgIGxldCBhcHAgPSB7XG4gICAgICAgICAgbGFuZ3VhZ2VJZDogZGV2aWNlLkxhbmd1YWdlSUQsXG4gICAgICAgICAgbW9kZWw6IGRldmljZS5Nb2RlbCxcbiAgICAgICAgICBuYW1lOiBkZXZpY2UuU3lzdGVtTmFtZSxcbiAgICAgICAgICB2ZXJzaW9uOiBkZXZpY2UuU3lzdGVtVmVyc2lvbixcbiAgICAgICAgICB1aWQ6IGRldmljZS5VSUQsIC8vIFRPRE8gdXVpZD8gaXMgaXQgZXZlbiB1c2VkP1xuICAgICAgICAgIG1ldHJpY3M6IGRldmljZS5NZXRyaWNzIC8vIFRPRE86IHVzZWQ/XG4gICAgICAgIH07XG4gICAgICAgIHNldEVudignYXBwJywgYXBwKTtcbiAgICAgIH1cblxuICAgICAgLy8gZG9uJ3Qgd29ycnkgdGhpcyBpcyBubyB2MiB0aGluZ1xuICAgICAgY3NzU2V0dXAoKTtcbiAgICAgIGxvZy5pbmZvKCdmaW5pc2hlZCBjaGF5bnMgc2V0dXAnKTtcblxuICAgICAgLy8gVE9ETzogY3JlYXRlIGN1c3RvbSBtb2RlbD9cbiAgICAgIHJlc29sdmUoZGF0YSk7XG5cbiAgICB9LCBmdW5jdGlvbiByZWplY3RlZCgpIHtcbiAgICAgIGxvZy5kZWJ1ZygnRXJyb3I6IFRoZSBBcHAgSW5mb3JtYXRpb24gY291bGQgbm90IGJlIHJlY2VpdmVkLicpO1xuICAgICAgcmVqZWN0KCdUaGUgQXBwIEluZm9ybWF0aW9uIGNvdWxkIG5vdCBiZSByZWNlaXZlZC4nKTtcbiAgICAgIC8vcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignVGhlIEFwcCBJbmZvcm1hdGlvbiBjb3VsZCBub3QgYmUgcmVjZWl2ZWQuJykpO1xuICAgIH0pO1xuXG4gIH0pO1xuXG59XG5cblxuLyoqXG4gKiBBZGRzIHZlbmRvciBjbGFzc2VzIHRvIHRoZSBib2R5IGluIG9yZGVyIHRvIHNob3cgdGhhdCBjaGF5bnMgaXMgcmVhZHlcbiAqIGFuZCB3aGljaCBPUywgQnJvd3NlciBhbmQgQ29sb3JTY2hlbWUgc2hvdWxkIGJlIGFwcGxpZWQuXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGludm9rZWQgd2hlbiB0aGUgRE9NIGFuZCBDaGF5bnMgaXMgcmVhZHkuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gY3NzU2V0dXAoKSB7XG4gIGxldCBodG1sID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBsZXQgc3VmZml4ID0gJ2NoYXlucy0nO1xuXG4gIERPTS5hZGRDbGFzcyhodG1sLCAnY2hheW5zLXJlYWR5Jyk7XG4gIERPTS5yZW1vdmVBdHRyaWJ1dGUoRE9NLnF1ZXJ5KCdbY2hheW5zLWNsb2FrXScpLCAnY2hheW5zLWNsb2FrJyk7XG5cbiAgLy8gYWRkIHZlbmRvciBjbGFzc2VzIChPUywgQnJvd3NlciwgQ29sb3JTY2hlbWUpXG4gIERPTS5hZGRDbGFzcyhodG1sLCBzdWZmaXggKyAnb3MtLScgKyBlbnZpcm9ubWVudC5vcyk7XG4gIERPTS5hZGRDbGFzcyhodG1sLCBzdWZmaXggKyAnYnJvd3Nlci0tJyArIGVudmlyb25tZW50LmJyb3dzZXIpO1xuICBET00uYWRkQ2xhc3MoaHRtbCwgc3VmZml4ICsgJ2NvbG9yLS0nICsgZW52aXJvbm1lbnQuc2l0ZS5jb2xvclNjaGVtZSk7XG5cbiAgLy8gRW52aXJvbm1lbnRcbiAgaWYgKGVudmlyb25tZW50LmlzQ2hheW5zV2ViKSB7XG4gICAgRE9NLmFkZENsYXNzKGh0bWwsIHN1ZmZpeCArICctJyArICd3ZWInKTtcbiAgfVxuICBpZiAoZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGUpIHtcbiAgICBET00uYWRkQ2xhc3MoaHRtbCwgc3VmZml4ICsgJy0nICsgJ21vYmlsZScpO1xuICB9XG4gIGlmIChlbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3ApIHtcbiAgICBET00uYWRkQ2xhc3MoaHRtbCwgc3VmZml4ICsgJy0nICsgJ2Rlc2t0b3AnKTtcbiAgfVxuICBpZiAoZW52aXJvbm1lbnQuaXNBcHApIHtcbiAgICBET00uYWRkQ2xhc3MoaHRtbCwgc3VmZml4ICsgJy0nICsgJ2FwcCcpO1xuICB9XG4gIGlmIChlbnZpcm9ubWVudC5pc0luRnJhbWUpIHtcbiAgICBET00uYWRkQ2xhc3MoaHRtbCwgc3VmZml4ICsgJy0nICsgJ2ZyYW1lJyk7XG4gIH1cblxuICAvLyBhZGQgY2hheW5zIHJvb3QgZWxlbWVudFxuICBsZXQgY2hheW5zUm9vdCA9IERPTS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgY2hheW5zUm9vdC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2NoYXlucy1yb290Jyk7XG4gIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3Jvb3QnKTtcbiAgRE9NLmFwcGVuZENoaWxkKGRvY3VtZW50LmJvZHksIGNoYXluc1Jvb3QpO1xufVxuIiwiLyoqXG4gKiBAbW9kdWxlIGNoYXlucy5lbnZpcm9ubWVudFxuICogQGRlc2NyaXB0aW9uXG4gKiBDaGF5bnMgRW52aXJvbm1lbnRcbiAqL1xuXG5pbXBvcnQge2dldExvZ2dlciwgZXh0ZW5kfSBmcm9tICcuLi91dGlscyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuZW52aXJvbm1lbnQnKTtcblxuLy8gVE9ETzogaW1wb3J0IGRlcGVuZGVuY2llc1xudmFyIHR5cGVzID0ge307XG5cbnR5cGVzLmJyb3dzZXIgPSBbXG4gICdjaHJvbWUnLFxuICAnZmlyZWZveCcsXG4gICdzYWZhcmknLFxuICAnb3BlcmEnLFxuICAnY2hyb21lIG1vYmlsZScsXG4gICdzYWZhcmkgbW9iaWxlJyxcbiAgJ2ZpcmVmb3ggbW9iaWxlJ1xuXTtcblxudHlwZXMub3MgPSBbXG4gICd3aW5kb3dzJyxcbiAgJ21hY09TJyxcbiAgJ2FuZHJvaWQnLFxuICAnaW9zJyxcbiAgJ3dwJ1xuXTtcblxudHlwZXMuY2hheW5zT1MgPSB7XG4gIHdlYjogJ3dlYnNoYWRvdycsXG4gIHdlYk1vYmlsZTogJ3dlYnNoYWRvd21vYmlsZScsXG4gIGFwcDogJ3dlYnNoYWRvd21vYmlsZSdcbn07XG5cbi8vIFRPRE86IGhpZGUgaW50ZXJuYWwgcGFyYW1ldGVycyBmcm9tIHRoZSBvdGhlcnNcbi8vIFRPRE86IG9mZmVyIHVzZXIgYW4gYE9iamVjdGAgd2l0aCBVUkwgUGFyYW1ldGVyc1xuLy8gbG9jYXRpb24gcXVlcnkgc3RyaW5nXG52YXIgcXVlcnkgPSBsb2NhdGlvbi5zZWFyY2guc3Vic3RyKDEpO1xudmFyIHBhcmFtZXRlcnMgPSB7fTtcbnF1ZXJ5LnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihwYXJ0KSB7XG4gIHZhciBpdGVtID0gcGFydC5zcGxpdCgnPScpO1xuICBwYXJhbWV0ZXJzW2l0ZW1bMF0udG9Mb3dlckNhc2UoKV0gPSBkZWNvZGVVUklDb21wb25lbnQoaXRlbVsxXSkudG9Mb3dlckNhc2UoKTtcbn0pO1xuXG4vLyB2ZXJpZnkgYnkgY2hheW5zIHJlcXVpcmVkIHBhcmFtZXRlcnMgZXhpc3RcbmlmICghcGFyYW1ldGVycy5hcHB2ZXJzaW9uKSB7XG4gIGxvZy53YXJuKCdubyBhcHAgdmVyc2lvbiBwYXJhbWV0ZXInKTtcbn1cbmlmICghcGFyYW1ldGVycy5vcykge1xuICBsb2cud2Fybignbm8gb3MgcGFyYW1ldGVyJyk7XG59XG5cbmxldCBkZWJ1Z01vZGUgPSAhIXBhcmFtZXRlcnMuZGVidWc7XG5cbi8vIFRPRE86IGZ1cnRoZXIgcGFyYW1zIGFuZCBjb2xvcnNjaGVtZVxuLy8gVE9ETzogZGlzY3VzcyByb2xlIG9mIFVSTCBwYXJhbXMgYW5kIHRyeSB0byByZXBsYWNlIHRoZW0gYW5kIG9ubHkgdXNlIEFwcERhdGFcblxuXG4vL2Z1bmN0aW9uIGdldEZpcnN0TWF0Y2gocmVnZXgpIHtcbi8vICB2YXIgbWF0Y2ggPSB1YS5tYXRjaChyZWdleCk7XG4vLyAgcmV0dXJuIChtYXRjaCAmJiBtYXRjaC5sZW5ndGggPiAxICYmIG1hdGNoWzFdKSB8fCAnJztcbi8vfVxuXG4vLyB1c2VyIGFnZW50IGRldGVjdGlvblxudmFyIHVzZXJBZ2VudCA9ICh3aW5kb3cubmF2aWdhdG9yICYmIG5hdmlnYXRvci51c2VyQWdlbnQpIHx8ICcnO1xuXG52YXIgaXMgPSB7XG4gIGlvczogL2lQaG9uZXxpUGFkfGlQb2QvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGFuZHJvaWQ6IC9BbmRyb2lkL2kudGVzdCh1c2VyQWdlbnQpLFxuICB3cDogL3dpbmRvd3MgcGhvbmUvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGJiOiAvQmxhY2tCZXJyeXxCQjEwfFJJTS9pLnRlc3QodXNlckFnZW50KSxcblxuICBvcGVyYTogKCEhd2luZG93Lm9wZXJhIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignIE9QUi8nKSA+PSAwKSxcbiAgZmlyZWZveDogKHR5cGVvZiBJbnN0YWxsVHJpZ2dlciAhPT0gJ3VuZGVmaW5lZCcpLFxuICBzYWZhcmk6IChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93LkhUTUxFbGVtZW50KS5pbmRleE9mKCdDb25zdHJ1Y3RvcicpID4gMCksXG4gIGNocm9tZTogKCEhd2luZG93LmNocm9tZSAmJiAhKCEhd2luZG93Lm9wZXJhIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignIE9QUi8nKSA+PSAwKSksXG4gIGllOiBmYWxzZSB8fCAhIWRvY3VtZW50LmRvY3VtZW50TW9kZSxcbiAgaWUxMTogL21zaWUgMTEvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllMTA6IC9tc2llIDEwL2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTk6IC9tc2llIDkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGllODogL21zaWUgOC9pLnRlc3QodXNlckFnZW50KSxcblxuICBtb2JpbGU6IC8oaXBob25lfGlwb2R8KCg/OmFuZHJvaWQpPy4qP21vYmlsZSl8YmxhY2tiZXJyeXxub2tpYSkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHRhYmxldDogLyhpcGFkfGFuZHJvaWQoPyEuKm1vYmlsZSl8dGFibGV0KS9pLnRlc3QodXNlckFnZW50KSxcbiAga2luZGxlOiAvXFxXKGtpbmRsZXxzaWxrKVxcVy9pLnRlc3QodXNlckFnZW50KSxcbiAgdHY6IC9nb29nbGV0dnxzb255ZHR2L2kudGVzdCh1c2VyQWdlbnQpXG59O1xuXG4vLyBUT0RPOiBCcm93c2VyIFZlcnNpb24gYW5kIE9TIFZlcnNpb24gZGV0ZWN0aW9uXG5cbi8vIFRPRE86IGFkZCBmYWxsYmFja1xudmFyIG9yaWVudGF0aW9uID0gTWF0aC5hYnMod2luZG93Lm9yaWVudGF0aW9uICUgMTgwKSA9PT0gMCA/ICdwb3J0cmFpdCcgOiAnbGFuZHNjYXBlJztcbnZhciB2aWV3cG9ydCA9IHdpbmRvdy5pbm5lcldpZHRoICsgJ3gnICsgd2luZG93LmlubmVySGVpZ2h0O1xuXG5leHBvcnQgdmFyIGVudmlyb25tZW50ID0ge1xuXG4gIG9zVmVyc2lvbjogMSxcblxuICBicm93c2VyOiAnY2MnLFxuICBicm93c2VyVmVyc2lvbjogMVxuXG59O1xuXG5lbnZpcm9ubWVudC5wYXJhbWV0ZXJzID0gcGFyYW1ldGVyczsgLy8gVE9ETyBzdHJpcCAnc2VjcmV0IHBhcmFtcydcbmVudmlyb25tZW50Lmhhc2ggPSBsb2NhdGlvbi5oYXNoLnN1YnN0cigxKTtcblxuLy8gV0FUQ0ggT1VUIHRoZSBPUyBpcyBzZXQgYnkgcGFyYW1ldGVyICh1bmZvcnR1bmF0ZWx5KVxuZW52aXJvbm1lbnQub3MgPSBwYXJhbWV0ZXJzLm9zIHx8ICdub09TJzsgLy8gVE9ETzogcmVmYWN0b3IgT1NcbmlmIChpcy5tb2JpbGUgJiYgWydhbmRyb2lkJywgJ2lvcycsICd3cCddLmluZGV4T2YocGFyYW1ldGVycy5vcykgIT09IC0xKSB7XG4gIHBhcmFtZXRlcnMub3MgPSB0eXBlcy5jaGF5bnNPUy5hcHA7XG59XG5cbi8vIGRldGVjdGlvbiBieSB1c2VyIGFnZW50XG5lbnZpcm9ubWVudC5pc0lPUyA9IGlzLmlvcztcbmVudmlyb25tZW50LmlzQW5kcm9pZCA9IGlzLmFuZHJvaWQ7XG5lbnZpcm9ubWVudC5pc1dQID0gaXMud3A7XG5lbnZpcm9ubWVudC5pc0JCID0gaXMuYmI7XG5cbi8vIFRPRE86IG1ha2Ugc3VyZSB0aGF0IHRoaXMgYWx3YXlzIHdvcmtzISAoVFNQTiwgY3JlYXRlIGlmcmFtZSB0ZXN0IHBhZ2UpXG5lbnZpcm9ubWVudC5pc0luRnJhbWUgPSAod2luZG93ICE9PSB3aW5kb3cudG9wKTtcblxuZW52aXJvbm1lbnQuaXNBcHAgPSAocGFyYW1ldGVycy5vcyA9PT0gdHlwZXMuY2hheW5zT1MuYXBwICYmIGlzLm1vYmlsZSAmJiAhZW52aXJvbm1lbnQuaXNJbkZyYW1lKTsgLy8gVE9ETzogZG9lcyB0aGlzIGFsd2F5cyB3b3JrP1xuZW52aXJvbm1lbnQuYXBwVmVyc2lvbiA9IHBhcmFtZXRlcnMuYXBwdmVyc2lvbjtcblxuZW52aXJvbm1lbnQuaXNCcm93c2VyID0gIWVudmlyb25tZW50LmlzQXBwO1xuXG5lbnZpcm9ubWVudC5pc0Rlc2t0b3AgPSAoIWlzLm1vYmlsZSAmJiAhaXMudGFibGV0KTtcblxuZW52aXJvbm1lbnQuaXNNb2JpbGUgPSBpcy5tb2JpbGU7XG5lbnZpcm9ubWVudC5pc1RhYmxldCA9IGlzLnRhYmxldDtcblxuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGUgPSAocGFyYW1ldGVycy5vcyA9PT0gdHlwZXMuY2hheW5zT1Mud2ViTW9iaWxlKSAmJiBlbnZpcm9ubWVudC5pc0luRnJhbWU7XG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3AgPSAocGFyYW1ldGVycy5vcyA9PT0gdHlwZXMuY2hheW5zT1Mud2ViKSAmJiBlbnZpcm9ubWVudC5pc0luRnJhbWU7XG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYiA9IGVudmlyb25tZW50LmlzQ2hheW5zV2ViRGVza3RvcCB8fCBlbnZpcm9ubWVudC5pc0NoYXluc1dlYk1vYmlsZTtcblxuLy8gaW50ZXJuYWwgVE9ETzogbWFrZSBpdCBwcml2YXRlP1xuZW52aXJvbm1lbnQuY2FuQ2hheW5zQ2FsbCA9IGVudmlyb25tZW50LmlzQXBwO1xuZW52aXJvbm1lbnQuY2FuQ2hheW5zV2ViQ2FsbCA9IGVudmlyb25tZW50LmlzQ2hheW5zV2ViO1xuXG5lbnZpcm9ubWVudC52aWV3cG9ydCA9IHZpZXdwb3J0OyAvLyBUT0RPOiB1cGRhdGUgb24gcmVzaXplPyBubywgZHVlIHBlcmZvcm1hbmNlXG5lbnZpcm9ubWVudC5vcmllbnRhdGlvbiA9IG9yaWVudGF0aW9uO1xuZW52aXJvbm1lbnQucmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbztcblxuZW52aXJvbm1lbnQuZGVidWdNb2RlID0gZGVidWdNb2RlO1xuXG4vL2Vudmlyb25tZW50LnVzZXIgPSB7XG4vLyAgbmFtZTogJ1BhY2FsIFdlaWxhbmQnLFxuLy8gIGZpcnN0TmFtZTogJ1Bhc2NhbCcsXG4vLyAgbGFzdE5hbWU6ICdXZWlsYW5kJyxcbi8vICB1c2VySWQ6IDEyMzQsXG4vLyAgZmFjZWJvb2tJZDogMTIzNDUsXG4vLyAgaXNBZG1pbjogdHJ1ZSxcbi8vICB1YWNHcm91cHM6IFtdLFxuLy8gIGxhbmd1YWdlOiAnZGVfREUnLFxuLy8gIHRva2VuOiAndG9rZW4nIC8vIFRPRE86IGV4Y2x1ZGUgdG9rZW4/XG4vL307XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEVudihrZXksIHZhbHVlKSB7XG4gIC8vZXh0ZW5kKGVudmlyb25tZW50LCBwcm9wKTtcbiAgZW52aXJvbm1lbnRba2V5XSA9IHZhbHVlO1xufVxuXG4iLCIvKipcbiAqIFRhcHAgQVBJIEludGVyZmFjZVxuICogQVBJIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIFRhcHBBUElcbiAqL1xuLyogZ2xvYWJsIGZldGNoICovXG5cbmltcG9ydCB7Z2V0TG9nZ2VyLCBpc1ByZXNlbnQsIGlzT2JqZWN0LCBpc0FycmF5LCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7ZW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuLy9pbXBvcnQge3dpbmRvd30gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7IC8vIGR1ZSB0byB3aW5kb3cub3BlbiBhbmQgbG9jYXRpb24uaHJlZlxuXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCd0YXBwX2FwaScpO1xuXG5jb25zb2xlLmRlYnVnKGVudmlyb25tZW50LCAnZXZuJyk7XG5cbi8vIFRPRE86IGZvcmNlIFNTTD9cbmxldCB0YXBwQXBpUm9vdCA9ICcvL2NoYXluczEudG9iaXQuY29tL1RhcHBBcGkvJztcbmxldCByZXN1bHRUeXBlID0ge1xuICBlcnJvcjogLTEsXG4gIHN1Y2Nlc3M6IDBcbn07XG5cbmZ1bmN0aW9uIHBhcnNlVXNlcih1c2VyKSB7XG4gIHJldHVybiB7XG4gICAgdXNlcklkOiB1c2VyLlVzZXJJRCxcbiAgICBmYWNlYm9va0lkOiB1c2VyLklEIHx8IHVzZXIuRmFjZWJvb2tJRCxcbiAgICBuYW1lOiB1c2VyLk5hbWUgfHwgdXNlci5Vc2VyRnVsbE5hbWUsXG4gICAgZmlyc3ROYW1lOiB1c2VyLkZpcnN0TmFtZSxcbiAgICBsYXN0TmFtZTogdXNlci5MYXN0bmFtZSxcbiAgICBwaWN0dXJlOiAnaHR0cHM6Ly9ncmFwaC5mYWNlYm9vay5jb20vJyArIHVzZXIuSUQgKyAnL3BpY3R1cmUnLFxuICAgIGNoYXluc0xvZ2luOiB1c2VyLkNoYXluc0xvZ2luXG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhcnNlR3JvdXAoZ3JvdXApIHtcbiAgcmV0dXJuIHtcbiAgICBpZDogZ3JvdXAuSUQsXG4gICAgbmFtZTogZ3JvdXAuTmFtZSxcbiAgICBzaG93TmFtZTogZ3JvdXAuU2hvd05hbWVcbiAgfTtcbn1cblxubGV0IHVhY0dyb3Vwc0NhY2hlO1xuXG4vKipcbiAqIEBtb2R1bGUgVGFwcEFQSUludGVyZmFjZVxuICogQHR5cGUge09iamVjdH1cbiAqL1xuZXhwb3J0IHZhciB0YXBwQXBpSW50ZXJmYWNlID0ge1xuICBnZXRJbnRyb1RleHQ6IGZ1bmN0aW9uIGdldEludHJvVGV4dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2RlcHJlY2F0ZWQnKTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IEluZm9cbiAgICogVXNlciBCYXNpYyBJbmZvcm1hdGlvblxuICAgKlxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgZ2V0VXNlcjogZnVuY3Rpb24gZ2V0VXNlckJhc2ljSW5mbyhvYmopIHtcbiAgICBpZiAoIW9iaiB8fCAhaXNPYmplY3Qob2JqKSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignVGhlcmUgd2FzIG5vIHBhcmFtZXRlciBPYmplY3QnKSk7XG4gICAgfVxuICAgIGxldCBkYXRhID0gJyc7XG4gICAgaWYgKGlzUHJlc2VudChvYmoudXNlcklkKSkge1xuICAgICAgZGF0YSA9ICdVc2VySUQ9JyArIG9iai51c2VySWQ7XG4gICAgfVxuICAgIGlmIChpc1ByZXNlbnQob2JqLmZhY2Vib29rSWQpKSB7XG4gICAgICBkYXRhID0gJ0ZCSUQ9JyArIG9iai5mYWNlYm9va0lkO1xuICAgIH1cbiAgICBpZiAoaXNQcmVzZW50KG9iai5wZXJzb25JZCkpIHtcbiAgICAgIGRhdGEgPSAnUGVyc29uSUQ9JyArIG9iai5wZXJzb25JZDtcbiAgICB9XG4gICAgaWYgKGlzUHJlc2VudChvYmouYWNjZXNzVG9rZW4pKSB7XG4gICAgICBkYXRhID0gJ0FjY2Vzc1Rva2VuPScgKyBvYmouYWNjZXNzVG9rZW47XG4gICAgfVxuICAgIHJldHVybiB0YXBwQXBpKCdVc2VyL0Jhc2ljSW5mbz8nICsgZGF0YSkudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICBpZiAoaXNBcnJheShqc29uKSkge1xuICAgICAgICByZXR1cm4ganNvbi5tYXAoKHVzZXIpID0+IHBhcnNlVXNlcih1c2VyKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ganNvbjtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IGFsbCB1c2VycyBvZiBhIExvY2F0aW9uIGlkZW50aWZpZWQgYnkgc2l0ZUlkXG4gICAqXG4gICAqXG4gICAqIEBwYXJhbSBbc2l0ZUlkID0gY3VycmVudCBzaXRlSWRdIFNpdGUgSWRcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBnZXRMb2NhdGlvblVzZXJzOiBmdW5jdGlvbiBnZXRMb2NhdGlvblVzZXJzKHNpdGVJZCkge1xuICAgIGlmICghc2l0ZUlkKSB7XG4gICAgICBzaXRlSWQgPSBlbnZpcm9ubWVudC5zaXRlLnNpdGVJZDtcbiAgICB9XG4gICAgbGV0IGRhdGEgPSAnP1NpdGVJRD0nICsgc2l0ZUlkO1xuICAgIHJldHVybiB0YXBwQXBpKCdVc2VyL0dldEFsbExvY2F0aW9uVXNlcnMnICsgZGF0YSkudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICByZXR1cm4ganNvbi5tYXAoKHVzZXIpID0+IHBhcnNlVXNlcih1c2VyKSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBVQUMgR3JvdXBzXG4gICAqXG4gICAqIFRPRE86IHJlbW92ZSBjYWNoaW5nPyB5ZXMsIGl0IGRvZXMgbm90IHJlYWxseSBiZWxvbmcgaW4gaGVyZVxuICAgKiBUT0RPOiBCYWNrZW5kIGJ1ZyBodHRwOi8vY2hheW5zMS50b2JpdC5jb20vVGFwcEFwaS9UYXBwL0dldFVBQ0dyb3Vwcz9TaXRlSUQ9IG5vdCBlbXB0eVxuICAgKiBUT0RPOiByZW5hbWUgdG8gZ2V0R3JvdXBzPyAodXNpbmcgVUFDIG9ubHkgaW50ZXJuYWxseSwgdGhlcmUgYXJlIG5vIG90aGVyIGdyb3VwcyBlaXRoZXIpXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3VwZGF0ZUNhY2hlPXVuZGVmaW5lZF0gVHJ1ZSB0byBmb3JjZSB0byByZWNlaXZlIG5ldyBVQUMgR3JvdXBzXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfSByZXNvbHZlIHdpdGggIFVBQyBHcm91cHMgQXJyYXkgb3RoZXJ3aXNlIHJlamVjdCB3aXRoIEVycm9yXG4gICAqL1xuICBnZXRVYWNHcm91cHM6IGZ1bmN0aW9uIGdldFVhY0dyb3VwcyhzaXRlSWQsIHVwZGF0ZUNhY2hlKSB7XG4gICAgaWYgKHVhY0dyb3Vwc0NhY2hlICYmICF1cGRhdGVDYWNoZSkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh1YWNHcm91cHNDYWNoZSk7XG4gICAgfVxuICAgIHNpdGVJZCA9IHNpdGVJZCB8fCBlbnZpcm9ubWVudC5zaXRlLnNpdGVJZDtcbiAgICBsZXQgZGF0YSA9ICdTaXRlSUQ9JyArIHNpdGVJZDtcbiAgICByZXR1cm4gdGFwcEFwaSgnVGFwcC9HZXRVQUNHcm91cHM/JyArIGRhdGEpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgcmV0dXJuIGpzb24ubWFwKChncm91cCkgPT4gcGFyc2VHcm91cChncm91cCkpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUT0RPOiB1c2UgdXNlcklkIGluc3RlYWQgb2YgdGhlIGZhY2Vib29rSWQ/XG4gICAqIFRPRE86IHJlZmFjdG9yIG5hbWU/IGNhdXNlIExvY2F0aW9uIGFuZCBTaXRlSWRcbiAgICogQHBhcmFtIHVzZXJJZCBGYWNlYm9vayBVc2VySWRcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBpc1VzZXJBZG1pbk9mTG9jYXRpb246IGZ1bmN0aW9uIGlzVXNlckFkbWluT2ZMb2NhdGlvbih1c2VySWQpIHtcbiAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KEVycm9yKCdObyB1c2VySWQgd2FzIHN1cHBsaWVkLicpKTtcbiAgICB9XG4gICAgbGV0IGRhdGEgPSAnP1NpdGVJRD0nICsgZW52aXJvbm1lbnQuc2l0ZS5zaXRlSWQgKyAnJkZCSUQ9JyArIHVzZXJJZDtcbiAgICByZXR1cm4gdGFwcEFwaSgnVXNlci9Jc1VzZXJBZG1pbicgKyBkYXRhKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIHJldHVybiBqc29uO1xuICAgIH0pO1xuICB9LFxuXG4gIGludGVyY29tOiB7XG5cbiAgICAvKipcbiAgICAgKiBTZW5kIG1lc3NhZ2UgYXMgdXNlciB0byB0aGUgZW50aXJlIHBhZ2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHNlbmRNZXNzYWdlQXNVc2VyOiBmdW5jdGlvbiBzZW5kTWVzc2FnZUFzVXNlcihtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gc2VuZE1lc3NhZ2Uoe1xuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICB1cmw6ICdJbnRlckNvbS9QYWdlJ1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgTWVzc2FnZSBhcyBwYWdlIHRvIGEgdXNlciBpZGVudGlmaWVkIGJ5IFRvYml0IFVzZXJJZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogQHBhcmFtIHVzZXJJZFxuICAgICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIHNlbmRNZXNzYWdlVG9Vc2VyOiBmdW5jdGlvbiBzZW5kTWVzc2FnZVRvVXNlcih1c2VySWQsIG1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBzZW5kTWVzc2FnZSh7XG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgIHVzZXJJZDogdXNlcklkLFxuICAgICAgICB1cmw6ICdJbnRlckNvbS9Vc2VyJ1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlbmQgbWVzc2FnZSBhcyBwYWdlIHRvIGEgdXNlciBpZGVudGlmaWVkIGJ5IEZhY2Vib29rIFVzZXJJZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXNzYWdlXG4gICAgICogQHBhcmFtIGZhY2Vib29rSWRcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBzZW5kTWVzc2FnZVRvRmFjZWJvb2tVc2VyOiBmdW5jdGlvbiBzZW5kTWVzc2FnZVRvRmFjZWJvb2tVc2VyKGZhY2Vib29rSWQsIG1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBzZW5kTWVzc2FnZSh7XG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgICAgIGZhY2Vib29rSWQ6IGZhY2Vib29rSWQsXG4gICAgICAgIHVybDogJ1RhcHAvU2VuZEludGVyY29tTWVzc2FnZUFzUGFnZSdcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIG1lc3NhZ2UgYXMgcGFnZSB0byBhIFVBQyBHcm91cC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBncm91cElkXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IG1lc3NhZ2VcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBzZW5kTWVzc2FnZVRvR3JvdXA6IGZ1bmN0aW9uIHNlbmRNZXNzYWdlVG9Hcm91cChncm91cElkLCBtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gc2VuZE1lc3NhZ2Uoe1xuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICBncm91cElkOiBncm91cElkLFxuICAgICAgICB1cmw6ICdJbnRlckNvbS9ncm91cCdcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBTZW5kIEludGVyY29tIE1lc3NhZ2VcbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbi8vIFRPRE86IHJlZmFjdG9yIHRvIEpTT04gaW5zdGVhZCBvZiB3d3ctZm9ybS11cmxlbmNvZGVkXG5mdW5jdGlvbiBzZW5kTWVzc2FnZShvYmopIHtcbiAgaWYgKCFpc09iamVjdChvYmopIHx8ICFvYmoubWVzc2FnZSB8fCAhb2JqLnVybCkge1xuICAgIFByb21pc2UucmVqZWN0KEVycm9yKCdJbnZhbGlkIHBhcmFtZXRlcnMnKSk7XG4gIH1cbiAgY29uc29sZS5kZWJ1ZyhvYmosIGVudmlyb25tZW50LCdhc2RmJyk7XG4gIG9iai5zaXRlSWQgPSBvYmouc2l0ZUlkIHx8IGVudmlyb25tZW50LnNpdGUuc2l0ZUlkO1xuICBvYmouYWNjZXNzVG9rZW4gPSBvYmouYWNjZXNzVG9rZW4gfHwgZW52aXJvbm1lbnQudXNlci5hY2Nlc3NUb2tlbjtcbiAgbGV0IG1hcCA9IHtcbiAgICBtZXNzYWdlOiAnTWVzc2FnZScsXG4gICAgYWNjZXNzVG9rZW46ICdBY2Nlc3NUb2tlbicsXG4gICAgdXNlcklkOiAnVXNlcklkJyxcbiAgICBmYWNlYm9va0lkOiAnVG9GQklEJyxcbiAgICBncm91cElkOiAnR3JvdXBJRCcsXG4gICAgc2l0ZUlkOiAnU2l0ZUlEJ1xuICB9O1xuICBsZXQgZGF0YSA9IFtdO1xuICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKGlzRGVmaW5lZChvYmpba2V5XSkgJiYga2V5ICE9PSAndXJsJykge1xuICAgICAgZGF0YS5wdXNoKG1hcFtrZXldICsgJz0nICsgIG9ialtrZXldKTtcbiAgICB9XG4gIH0pO1xuICBsZXQgY29uZmlnID0ge1xuICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkOyBjaGFyc2V0PVVURi04J1xuICAgIH0sXG4gICAgLy9oZWFkZXJzOiB7XG4gICAgLy8gICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgLy8gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAvL30sXG4gICAgLy9jcmVkZW50aWFsczogJ2NvcnMnLFxuICAgIGJvZHk6IGRhdGEuam9pbignJicpXG4gICAgLy9ib2R5OiBkYXRhXG4gIH07XG4gIGxldCB1cmwgPSB0YXBwQXBpUm9vdCArIG9iai51cmw7XG4gIGlmIChvYmoudXJsID09PSAnVGFwcC9TZW5kSW50ZXJjb21NZXNzYWdlQXNQYWdlJykge1xuICAgIHVybCArPSAnPycgKyBkYXRhLmpvaW4oJyYnKTtcbiAgICBjb25maWcgPSB1bmRlZmluZWQ7IC8qe1xuICAgICAgY3JlZGVudGlhbHM6ICdjb3JzJ1xuICAgIH07Ki9cbiAgfVxuICByZXR1cm4gZmV0Y2godXJsLCBjb25maWcpO1xufVxuXG4vKipcbiAqIFRhcHAgQVBJIHJlcXVlc3RcbiAqXG4gKiBUT0RPOiB1c2UgUE9TVCBpbnN0ZWFkIG9mIEdFVFxuICogVE9ETzogcG9zdGluZyBKU09OIHdpdGgge2NyZWRlbnRpYWxzOiAnY29ycyd9XG4gKiBAcGFyYW0gZW5kcG9pbnRcbiAqIEByZXR1cm5zIHtQcm9taXNlfSB3aXRoIGpzb24gZGF0YVxuICovXG5mdW5jdGlvbiB0YXBwQXBpKGVuZHBvaW50KSB7XG4gIGxldCB1cmwgPSB0YXBwQXBpUm9vdCArIGVuZHBvaW50O1xuICByZXR1cm4gZmV0Y2godXJsKVxuICAgIC50aGVuKChyZXMpID0+IHJlcy5qc29uKCkpXG4gICAgLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgaWYgKGpzb24uVmFsdWUpIHtcbiAgICAgICAgcmV0dXJuIGpzb24uVmFsdWU7XG4gICAgICB9IGVsc2UgaWYgKGpzb24uRGF0YSkge1xuICAgICAgICByZXR1cm4ganNvbi5EYXRhO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGpzb247XG4gICAgICB9XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmouRXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihvYmouRXJyb3IpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmo7XG4gICAgfSk7XG59XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgLy9cbiAgLy9pZiAoc2VsZi5mZXRjaCkge1xuICAvLyAgcmV0dXJuXG4gIC8vfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIC8vIEluc3RlYWQgb2YgaXRlcmFibGUgZm9yIG5vdy5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5tYXApLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgY2FsbGJhY2sobmFtZSwgc2VsZi5tYXBbbmFtZV0pXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKCk7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKCFib2R5KSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgIH1cblxuICAgICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoIWJvZHkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QodXJsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB0aGlzLnVybCA9IHVybFxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIG9wdGlvbnMuYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShvcHRpb25zLmJvZHkpXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhlYWRlcnMoeGhyKSB7XG4gICAgdmFyIGhlYWQgPSBuZXcgSGVhZGVycygpXG4gICAgdmFyIHBhaXJzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuZmV0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgaWYgKHNlbGYuY3JlZGVudGlhbHMgPT09ICdjb3JzJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVzcG9uc2VVUkwoKSB7XG4gICAgICAgIGlmICgncmVzcG9uc2VVUkwnIGluIHhocikge1xuICAgICAgICAgIHJldHVybiB4aHIucmVzcG9uc2VVUkxcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF2b2lkIHNlY3VyaXR5IHdhcm5pbmdzIG9uIGdldFJlc3BvbnNlSGVhZGVyIHdoZW4gbm90IGFsbG93ZWQgYnkgQ09SU1xuICAgICAgICBpZiAoL15YLVJlcXVlc3QtVVJMOi9tLnRlc3QoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSkge1xuICAgICAgICAgIHJldHVybiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0dXMgPSAoeGhyLnN0YXR1cyA9PT0gMTIyMykgPyAyMDQgOiB4aHIuc3RhdHVzXG4gICAgICAgIGlmIChzdGF0dXMgPCAxMDAgfHwgc3RhdHVzID4gNTk5KSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBoZWFkZXJzKHhociksXG4gICAgICAgICAgdXJsOiByZXNwb25zZVVSTCgpXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHQ7XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihzZWxmLm1ldGhvZCwgc2VsZi51cmwsIHRydWUpXG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgc2VsZi5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2Ygc2VsZi5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHNlbGYuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMudXJsID0gbnVsbFxuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXNcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gb3B0aW9ucy5zdGF0dXNUZXh0XG4gICAgdGhpcy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzO1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0O1xuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodXJsLCBvcHRpb25zKS5mZXRjaCgpXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKCk7XG4iLCIvKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vamFrZWFyY2hpYmFsZC9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICAyLjAuMFxuICovXG5cbihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoYSxiKXtuW2xdPWE7bltsKzFdPWI7bCs9MjsyPT09bCYmQSgpfWZ1bmN0aW9uIHMoYSl7cmV0dXJuXCJmdW5jdGlvblwiPT09dHlwZW9mIGF9ZnVuY3Rpb24gRigpe3JldHVybiBmdW5jdGlvbigpe3Byb2Nlc3MubmV4dFRpY2sodCl9fWZ1bmN0aW9uIEcoKXt2YXIgYT0wLGI9bmV3IEIodCksYz1kb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIlwiKTtiLm9ic2VydmUoYyx7Y2hhcmFjdGVyRGF0YTohMH0pO3JldHVybiBmdW5jdGlvbigpe2MuZGF0YT1hPSsrYSUyfX1mdW5jdGlvbiBIKCl7dmFyIGE9bmV3IE1lc3NhZ2VDaGFubmVsO2EucG9ydDEub25tZXNzYWdlPXQ7cmV0dXJuIGZ1bmN0aW9uKCl7YS5wb3J0Mi5wb3N0TWVzc2FnZSgwKX19ZnVuY3Rpb24gSSgpe3JldHVybiBmdW5jdGlvbigpe3NldFRpbWVvdXQodCwxKX19ZnVuY3Rpb24gdCgpe2Zvcih2YXIgYT0wO2E8bDthKz0yKSgwLG5bYV0pKG5bYSsxXSksblthXT12b2lkIDAsblthKzFdPXZvaWQgMDtcbmw9MH1mdW5jdGlvbiBwKCl7fWZ1bmN0aW9uIEooYSxiLGMsZCl7dHJ5e2EuY2FsbChiLGMsZCl9Y2F0Y2goZSl7cmV0dXJuIGV9fWZ1bmN0aW9uIEsoYSxiLGMpe3IoZnVuY3Rpb24oYSl7dmFyIGU9ITEsZj1KKGMsYixmdW5jdGlvbihjKXtlfHwoZT0hMCxiIT09Yz9xKGEsYyk6bShhLGMpKX0sZnVuY3Rpb24oYil7ZXx8KGU9ITAsZyhhLGIpKX0pOyFlJiZmJiYoZT0hMCxnKGEsZikpfSxhKX1mdW5jdGlvbiBMKGEsYil7MT09PWIuYT9tKGEsYi5iKToyPT09YS5hP2coYSxiLmIpOnUoYix2b2lkIDAsZnVuY3Rpb24oYil7cShhLGIpfSxmdW5jdGlvbihiKXtnKGEsYil9KX1mdW5jdGlvbiBxKGEsYil7aWYoYT09PWIpZyhhLG5ldyBUeXBlRXJyb3IoXCJZb3UgY2Fubm90IHJlc29sdmUgYSBwcm9taXNlIHdpdGggaXRzZWxmXCIpKTtlbHNlIGlmKFwiZnVuY3Rpb25cIj09PXR5cGVvZiBifHxcIm9iamVjdFwiPT09dHlwZW9mIGImJm51bGwhPT1iKWlmKGIuY29uc3RydWN0b3I9PT1hLmNvbnN0cnVjdG9yKUwoYSxcbmIpO2Vsc2V7dmFyIGM7dHJ5e2M9Yi50aGVufWNhdGNoKGQpe3YuZXJyb3I9ZCxjPXZ9Yz09PXY/ZyhhLHYuZXJyb3IpOnZvaWQgMD09PWM/bShhLGIpOnMoYyk/SyhhLGIsYyk6bShhLGIpfWVsc2UgbShhLGIpfWZ1bmN0aW9uIE0oYSl7YS5mJiZhLmYoYS5iKTt4KGEpfWZ1bmN0aW9uIG0oYSxiKXt2b2lkIDA9PT1hLmEmJihhLmI9YixhLmE9MSwwIT09YS5lLmxlbmd0aCYmcih4LGEpKX1mdW5jdGlvbiBnKGEsYil7dm9pZCAwPT09YS5hJiYoYS5hPTIsYS5iPWIscihNLGEpKX1mdW5jdGlvbiB1KGEsYixjLGQpe3ZhciBlPWEuZSxmPWUubGVuZ3RoO2EuZj1udWxsO2VbZl09YjtlW2YrMV09YztlW2YrMl09ZDswPT09ZiYmYS5hJiZyKHgsYSl9ZnVuY3Rpb24geChhKXt2YXIgYj1hLmUsYz1hLmE7aWYoMCE9PWIubGVuZ3RoKXtmb3IodmFyIGQsZSxmPWEuYixnPTA7ZzxiLmxlbmd0aDtnKz0zKWQ9YltnXSxlPWJbZytjXSxkP0MoYyxkLGUsZik6ZShmKTthLmUubGVuZ3RoPTB9fWZ1bmN0aW9uIEQoKXt0aGlzLmVycm9yPVxubnVsbH1mdW5jdGlvbiBDKGEsYixjLGQpe3ZhciBlPXMoYyksZixrLGgsbDtpZihlKXt0cnl7Zj1jKGQpfWNhdGNoKG4pe3kuZXJyb3I9bixmPXl9Zj09PXk/KGw9ITAsaz1mLmVycm9yLGY9bnVsbCk6aD0hMDtpZihiPT09Zil7ZyhiLG5ldyBUeXBlRXJyb3IoXCJBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuXCIpKTtyZXR1cm59fWVsc2UgZj1kLGg9ITA7dm9pZCAwPT09Yi5hJiYoZSYmaD9xKGIsZik6bD9nKGIsayk6MT09PWE/bShiLGYpOjI9PT1hJiZnKGIsZikpfWZ1bmN0aW9uIE4oYSxiKXt0cnl7YihmdW5jdGlvbihiKXtxKGEsYil9LGZ1bmN0aW9uKGIpe2coYSxiKX0pfWNhdGNoKGMpe2coYSxjKX19ZnVuY3Rpb24gayhhLGIsYyxkKXt0aGlzLm49YTt0aGlzLmM9bmV3IGEocCxkKTt0aGlzLmk9Yzt0aGlzLm8oYik/KHRoaXMubT1iLHRoaXMuZD10aGlzLmxlbmd0aD1iLmxlbmd0aCx0aGlzLmwoKSwwPT09dGhpcy5sZW5ndGg/bSh0aGlzLmMsXG50aGlzLmIpOih0aGlzLmxlbmd0aD10aGlzLmxlbmd0aHx8MCx0aGlzLmsoKSwwPT09dGhpcy5kJiZtKHRoaXMuYyx0aGlzLmIpKSk6Zyh0aGlzLmMsdGhpcy5wKCkpfWZ1bmN0aW9uIGgoYSl7TysrO3RoaXMuYj10aGlzLmE9dm9pZCAwO3RoaXMuZT1bXTtpZihwIT09YSl7aWYoIXMoYSkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIllvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3JcIik7aWYoISh0aGlzIGluc3RhbmNlb2YgaCkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtOKHRoaXMsYSl9fXZhciBFPUFycmF5LmlzQXJyYXk/QXJyYXkuaXNBcnJheTpmdW5jdGlvbihhKXtyZXR1cm5cIltvYmplY3QgQXJyYXldXCI9PT1cbk9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhKX0sbD0wLHc9XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiB3aW5kb3c/d2luZG93Ont9LEI9dy5NdXRhdGlvbk9ic2VydmVyfHx3LldlYktpdE11dGF0aW9uT2JzZXJ2ZXIsdz1cInVuZGVmaW5lZFwiIT09dHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5JiZcInVuZGVmaW5lZFwiIT09dHlwZW9mIGltcG9ydFNjcmlwdHMmJlwidW5kZWZpbmVkXCIhPT10eXBlb2YgTWVzc2FnZUNoYW5uZWwsbj1BcnJheSgxRTMpLEE7QT1cInVuZGVmaW5lZFwiIT09dHlwZW9mIHByb2Nlc3MmJlwiW29iamVjdCBwcm9jZXNzXVwiPT09e30udG9TdHJpbmcuY2FsbChwcm9jZXNzKT9GKCk6Qj9HKCk6dz9IKCk6SSgpO3ZhciB2PW5ldyBELHk9bmV3IEQ7ay5wcm90b3R5cGUubz1mdW5jdGlvbihhKXtyZXR1cm4gRShhKX07ay5wcm90b3R5cGUucD1mdW5jdGlvbigpe3JldHVybiBFcnJvcihcIkFycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheVwiKX07ay5wcm90b3R5cGUubD1cbmZ1bmN0aW9uKCl7dGhpcy5iPUFycmF5KHRoaXMubGVuZ3RoKX07ay5wcm90b3R5cGUuaz1mdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLmxlbmd0aCxiPXRoaXMuYyxjPXRoaXMubSxkPTA7dm9pZCAwPT09Yi5hJiZkPGE7ZCsrKXRoaXMuaihjW2RdLGQpfTtrLnByb3RvdHlwZS5qPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5uO1wib2JqZWN0XCI9PT10eXBlb2YgYSYmbnVsbCE9PWE/YS5jb25zdHJ1Y3Rvcj09PWMmJnZvaWQgMCE9PWEuYT8oYS5mPW51bGwsdGhpcy5nKGEuYSxiLGEuYikpOnRoaXMucShjLnJlc29sdmUoYSksYik6KHRoaXMuZC0tLHRoaXMuYltiXT10aGlzLmgoYSkpfTtrLnByb3RvdHlwZS5nPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmM7dm9pZCAwPT09ZC5hJiYodGhpcy5kLS0sdGhpcy5pJiYyPT09YT9nKGQsYyk6dGhpcy5iW2JdPXRoaXMuaChjKSk7MD09PXRoaXMuZCYmbShkLHRoaXMuYil9O2sucHJvdG90eXBlLmg9ZnVuY3Rpb24oYSl7cmV0dXJuIGF9O1xuay5wcm90b3R5cGUucT1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXM7dShhLHZvaWQgMCxmdW5jdGlvbihhKXtjLmcoMSxiLGEpfSxmdW5jdGlvbihhKXtjLmcoMixiLGEpfSl9O3ZhciBPPTA7aC5hbGw9ZnVuY3Rpb24oYSxiKXtyZXR1cm4obmV3IGsodGhpcyxhLCEwLGIpKS5jfTtoLnJhY2U9ZnVuY3Rpb24oYSxiKXtmdW5jdGlvbiBjKGEpe3EoZSxhKX1mdW5jdGlvbiBkKGEpe2coZSxhKX12YXIgZT1uZXcgdGhpcyhwLGIpO2lmKCFFKGEpKXJldHVybiAoZyhlLG5ldyBUeXBlRXJyb3IoXCJZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuXCIpKSwgZSk7Zm9yKHZhciBmPWEubGVuZ3RoLGg9MDt2b2lkIDA9PT1lLmEmJmg8ZjtoKyspdSh0aGlzLnJlc29sdmUoYVtoXSksdm9pZCAwLGMsZCk7cmV0dXJuIGV9O2gucmVzb2x2ZT1mdW5jdGlvbihhLGIpe2lmKGEmJlwib2JqZWN0XCI9PT10eXBlb2YgYSYmYS5jb25zdHJ1Y3Rvcj09PXRoaXMpcmV0dXJuIGE7dmFyIGM9bmV3IHRoaXMocCxiKTtcbnEoYyxhKTtyZXR1cm4gY307aC5yZWplY3Q9ZnVuY3Rpb24oYSxiKXt2YXIgYz1uZXcgdGhpcyhwLGIpO2coYyxhKTtyZXR1cm4gY307aC5wcm90b3R5cGU9e2NvbnN0cnVjdG9yOmgsdGhlbjpmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuYTtpZigxPT09YyYmIWF8fDI9PT1jJiYhYilyZXR1cm4gdGhpczt2YXIgZD1uZXcgdGhpcy5jb25zdHJ1Y3RvcihwKSxlPXRoaXMuYjtpZihjKXt2YXIgZj1hcmd1bWVudHNbYy0xXTtyKGZ1bmN0aW9uKCl7QyhjLGQsZixlKX0pfWVsc2UgdSh0aGlzLGQsYSxiKTtyZXR1cm4gZH0sXCJjYXRjaFwiOmZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLnRoZW4obnVsbCxhKX19O3ZhciB6PXtQcm9taXNlOmgscG9seWZpbGw6ZnVuY3Rpb24oKXt2YXIgYTthPVwidW5kZWZpbmVkXCIhPT10eXBlb2YgZ2xvYmFsP2dsb2JhbDpcInVuZGVmaW5lZFwiIT09dHlwZW9mIHdpbmRvdyYmd2luZG93LmRvY3VtZW50P3dpbmRvdzpzZWxmO1wiUHJvbWlzZVwiaW4gYSYmXCJyZXNvbHZlXCJpblxuYS5Qcm9taXNlJiZcInJlamVjdFwiaW4gYS5Qcm9taXNlJiZcImFsbFwiaW4gYS5Qcm9taXNlJiZcInJhY2VcImluIGEuUHJvbWlzZSYmZnVuY3Rpb24oKXt2YXIgYjtuZXcgYS5Qcm9taXNlKGZ1bmN0aW9uKGEpe2I9YX0pO3JldHVybiBzKGIpfSgpfHwoYS5Qcm9taXNlPWgpfX07XCJmdW5jdGlvblwiPT09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gen0pOlwidW5kZWZpbmVkXCIhPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz16OlwidW5kZWZpbmVkXCIhPT10eXBlb2YgdGhpcyYmKHRoaXMuRVM2UHJvbWlzZT16KX0pLmNhbGwodGhpcyk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzIG9yIHRvYmlcbiAqIEBtb2R1bGUgamFtZXNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgamFtZXMgLSB0b2JpdCBoZWxwZXIgbGlicmFyeVxuICogSGVscGVyIGxpYnJhcnkgc3VwcG9ydGluZyB0aGUgQ2hheW5zIEFQSVxuICovXG5cbi8vIFRPRE86IG1vdmUgYWxsIHRvIGhlbHBlci5qcyBvciB0b2JpL2phbXNcbi8vIFRPRE86IGhlbHBlci5qcyB3aXRoIEVTNiBhbmQgamFzbWluZSAoYW5kIG9yIHRhcGUpXG4vLyBpbmNsdWRlIGhlbHBlciBhcyBtYWluIG1vZHVsZVxuXG4vLyBpbXBvcnRhbnQgaXMqIGZ1bmN0aW9uc1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9pcyc7XG5cbi8vIGV4dGVuZCBvYmplY3QgZnVuY3Rpb25cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXh0ZW5kJztcblxuLy8gTG9nZ2VyXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XG5cbi8vIFRPRE86IGRvIHdlIGV2ZW4gbmVlZCBtb2Rlcm5pemVyP1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL21vZGVybml6ZXInO1xuXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2h0dHAnO1xuXG4vLyBCcm93c2VyIEFQSXMgKHdpbmRvdywgZG9jdW1lbnQsIGxvY2F0aW9uKVxuLy8gVE9ETzogY29uc2lkZXIgdG8gbm90IGJpbmQgYnJvd3NlciB0byB0aGUgdXRpbHMgYE9iamVjdGBcbi8qIGpzaGludCAtVzExNiAqL1xuLyoganNoaW50IC1XMDMzICovXG4vLyBqc2NzOmRpc2FibGUgcGFyc2VFcnJvclxuaW1wb3J0ICogYXMgYnJvd3NlciBmcm9tICcuL3V0aWxzL2Jyb3dzZXInOyAvL25vaW5zcGVjdGlvbiBCYWRFeHByZXNzaW9uU3RhdGVtZW50SlMganNoaW50IGlnbm9yZTogbGluZVxuLy8ganNjczplbmFibGUgcGFyc2VFcnJvclxuLyoganNoaW50ICtXMDMzICovXG4vKiBqc2hpbnQgK1cxMTYgKi9cbmV4cG9ydCB7YnJvd3Nlcn07XG5cbi8vIERPTVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9kb20nO1xuXG4vLyBBbmFseXRpY3Ncbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9hbmFseXRpY3MnO1xuXG4vLyBSZW1vdGVcbi8vIHJlbW90ZSBkZWJ1Z2dpbmcgYW5kIGFuYWx5c2lzXG5cbi8vIGZyb250LWVuZCBFcnJvciBIYW5kbGVyIChjYXRjaGVzIGVycm9ycywgaWRlbnRpZnkgYW5kIGFuYWx5c2VzIHRoZW0pXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Vycm9yJztcblxuLy8gYXV0aCAmIEpXVCBoYW5kbGVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvand0JztcblxuLy8gY29va2llIGhhbmRsZXIgKHdpbGwgYmUgdXNlZCBpbiB0aGUgbG9jYWxfc3RvcmFnZSBhcyBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9jb29raWVfaGFuZGxlcic7XG5cbi8vIGxvY2FsU3RvcmFnZSBoZWxwZXIgKHdoaWNoIGNvb2tpZSBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sb2NhbF9zdG9yYWdlJztcblxuLy8gbWljcm8gZXZlbnQgbGlicmFyeVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9ldmVudHMnO1xuXG4vLyBvZmZsaW5lIGNhY2hlIGhlbHBlclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL29mZmxpbmVfY2FjaGUnO1xuXG4vLyBub3RpZmljYXRpb25zOiB0b2FzdHMsIGFsZXJ0cywgbW9kYWwgcG9wdXBzLCBuYXRpdmUgcHVzaFxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL25vdGlmaWNhdGlvbnMnO1xuXG4vLyBpZnJhbWUgY29tbXVuaWNhdGlvbiBhbmQgaGVscGVyIChDT1JTKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lmcmFtZSc7XG5cbi8vIHBhZ2UgdmlzaWJpbGl0eSBBUElcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9wYWdlX3Zpc2liaWxpdHknO1xuXG4vLyBEYXRlVGltZSBoZWxwZXIgKGNvbnZlcnRzIGRhdGVzLCBDIyBkYXRlLCB0aW1lc3RhbXBzLCBpMThuLCB0aW1lIGFnbylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9kYXRldGltZSc7XG5cblxuLy8gbGFuZ3VhZ2UgQVBJIGkxOG5cbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sYW5ndWFnZSc7XG5cbi8vIGNyaXRpY2FsIGNzc1xuXG4vLyBsb2FkQ1NTXG5cbi8vIGxhenkgbG9hZGluZ1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xhenlfbG9hZGluZyc7XG5cbi8vIChpbWFnZSkgcHJlbG9hZGVyXG4vL2V4cG9ydCAqIGZyb20gJy91dGlscy9wcmVsb2FkZXInO1xuXG4vLyBpc1BlbWl0dGVkIEFwcCBWZXJzaW9uIGNoZWNrXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lzX3Blcm1pdHRlZCc7XG5cblxuLy8gaW4gRnV0dXJlXG4vLyBpbW11dGFibGVcbi8vIHdlYWsgbWFwc1xuLy8gb2JzZXJ2ZXJcbi8vIHdlYiBzb2NrZXRzICh3cywgU2lnbmFsUilcbi8vIHdvcmtlciAoc2hhcmVkIHdvcmtlciwgbGF0ZXIgc2VydmljZSB3b3JrZXIgYXMgd2VsbClcbi8vIGxvY2F0aW9uLCBwdXNoU3RhdGUsIGhpc3RvcnkgaGFuZGxlclxuLy8gY2hheW5zIHNpdGUgYW5kIGNvZGUgYW5hbHlzZXI6IGZpbmQgZGVwcmVjYXRlZCBtZXRob2RzLCBiYWQgY29kZSwgaXNzdWVzIGFuZCBib3R0bGVuZWNrc1xuXG4iLCIvKipcbiAqIFRoaXMgbW9kdWxlIGNvbnRhaW5zIHRoZSBCcm93c2VyIEFQSXNcbiAqXG4gKi9cbi8vIFRPRE86IG1vdmUgb3V0IG9mIHV0aWxzXG52YXIgd2luID0gd2luZG93O1xuXG4vLyB1c2luZyBub2RlIGdsb2JhbCAobWFpbmx5IGZvciB0ZXN0aW5nLCBkZXBlbmRlbmN5IG1hbmFnZW1lbnQpXG52YXIgX2dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93O1xuZXhwb3J0IHtfZ2xvYmFsIGFzIGdsb2JhbH07XG5cbmV4cG9ydCB7d2luIGFzIHdpbmRvd307XG5leHBvcnQgdmFyIGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xuZXhwb3J0IHZhciBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcbmV4cG9ydCB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbmV4cG9ydCB2YXIgY2hheW5zID0gd2luZG93LmNoYXlucztcbmV4cG9ydCB2YXIgY2hheW5zQ2FsbGJhY2tzID0gd2luZG93Ll9jaGF5bnNDYWxsYmFja3M7XG5leHBvcnQgdmFyIGNoYXluc1Jvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hheW5zLXJvb3QnKTtcbmV4cG9ydCB2YXIgcGFyZW50ID0gd2luZG93LnBhcmVudDtcbmV4cG9ydCB2YXIgY29uc29sZSA9IHdpbmRvdy5jb25zb2xlOyAvLyBOT1RFOiBzaG91bGQgbm90IGJlIHVzZWQuIHVzZSBsb2dnZXIgaW5zdGVhZFxuZXhwb3J0IHZhciBnYyA9IHdpbmRvdy5nYyA/ICgpID0+IHdpbmRvdy5nYygpIDogKCkgPT4gbnVsbDtcblxuIiwiLy8gaW5zcGlyZWQgYnkgQW5ndWxhcjIncyBET01cblxuaW1wb3J0IHtkb2N1bWVudH0gZnJvbSAnLi9icm93c2VyJztcbmltcG9ydCB7aXNVbmRlZmluZWR9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgY2xhc3MgRE9NIHtcblxuICAvLyBOT1RFOiBhbHdheXMgcmV0dXJucyBhbiBhcnJheVxuICBzdGF0aWMgJChzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsLmJpbmQoZG9jdW1lbnQpO1xuICB9XG5cbiAgLy8gc2VsZWN0b3JzXG4gIHN0YXRpYyBxdWVyeShzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvcihlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5U2VsZWN0b3JBbGwoZWwsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBvbihlbCwgZXZ0LCBsaXN0ZW5lcikge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZ0LCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY2xvbmUobm9kZSkge1xuICAgIHJldHVybiBub2RlLmNsb25lTm9kZSh0cnVlKTtcbiAgfVxuICBzdGF0aWMgaGFzUHJvcGVydHkoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBuYW1lIGluIGVsZW1lbnQ7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlDbGFzc05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUobmFtZSk7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlUYWdOYW1lKGVsZW1lbnQsIG5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShuYW1lKTtcbiAgfVxuXG4gIC8vIGlucHV0XG4gIHN0YXRpYyBnZXRJbm5lckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwuaW5uZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBnZXRPdXRlckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwub3V0ZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBzZXRIVE1MKGVsLCB2YWx1ZSkge1xuICAgIGVsLmlubmVySFRNTCA9IHZhbHVlO1xuICB9XG4gIHN0YXRpYyBnZXRUZXh0KGVsKSB7XG4gICAgcmV0dXJuIGVsLnRleHRDb250ZW50O1xuICB9XG4gIHN0YXRpYyBzZXRUZXh0KGVsLCB2YWx1ZSkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH1cblxuICAvLyBpbnB1dCB2YWx1ZVxuICBzdGF0aWMgZ2V0VmFsdWUoZWwpIHtcbiAgICByZXR1cm4gZWwudmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldFZhbHVlKGVsLCB2YWx1ZSkge1xuICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gIH1cblxuICAvLyBjaGVja2JveGVzXG4gIHN0YXRpYyBnZXRDaGVja2VkKGVsKSB7XG4gICAgcmV0dXJuIGVsLmNoZWNrZWQ7XG4gIH1cbiAgc3RhdGljIHNldENoZWNrZWQoZWwsIHZhbHVlKSB7XG4gICAgZWwuY2hlY2tlZCA9IHZhbHVlO1xuICB9XG5cbiAgLy8gY2xhc3NcbiAgc3RhdGljIGNsYXNzTGlzdChlbGVtZW50KSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsZW1lbnQuY2xhc3NMaXN0LCAwKTtcbiAgfVxuICBzdGF0aWMgYWRkQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUNsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICB9XG4gIHN0YXRpYyBoYXNDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgfVxuXG4gIC8vIGNzc1xuICBzdGF0aWMgY3NzKGVsZW1lbnQsIHN0eWxlTmFtZSwgc3R5bGVWaGFzYWx1ZSkge1xuICAgIGlmKGlzVW5kZWZpbmVkKHN0eWxlVmFsdWUpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICAgIH1cbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyBzZXRDU1MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZhbHVlKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gc3R5bGVWYWx1ZTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IG51bGw7XG4gIH1cbiAgc3RhdGljIGdldENTUyhlbGVtZW50LCBzdHlsZU5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBkb2M9ZG9jdW1lbnQpIHtcbiAgICByZXR1cm4gZG9jLmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIH1cblxuICBzdGF0aWMgcmVtb3ZlKGVsKSB7XG4gICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudE5vZGU7XG4gICAgcGFyZW50LnJlbW92ZUNoaWxkKGVsKTtcbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICBzdGF0aWMgYXBwZW5kQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5hcHBlbmRDaGlsZChub2RlKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5yZW1vdmVDaGlsZChub2RlKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRCZWZvcmUoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbCk7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0QWZ0ZXIoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbC5uZXh0U2libGluZyk7XG4gIH1cblxuICBzdGF0aWMgdGFnTmFtZShlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIGF0dHJpYnV0ZXNcbiAgc3RhdGljIGdldEF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxuICBzdGF0aWMgc2V0QXR0cmlidXRlKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVBdHRyaWJ1dGUoZWxlbWVudCwgYXR0cmlidXRlKSB7XG4gICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gIH1cbn1cbiIsIi8qKlxuICogRXJyb3IgSGFuZGxlciBNb2R1bGVcbiAqL1xuXG4vLyBUT0RPOiBjb25zaWRlciBpbXBvcnRpbmcgZnJvbSAnLi91dGlscycgb25seVxuaW1wb3J0IHt3aW5kb3cgYXMgd2lufSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuLi9jaGF5bnMvY29uZmlnJztcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVycm9yJyk7XG5cbndpbi5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICBsZXQgbGluZUFuZENvbHVtbkluZm8gPVxuICAgIGVyci5jb2xub1xuICAgICAgPyAnIGxpbmU6JyArIGVyci5saW5lbm8gKyAnLCBjb2x1bW46JyArIGVyci5jb2xub1xuICAgICAgOiAnIGxpbmU6JyArIGVyci5saW5lbm87XG5cbiAgbGV0IGZpbmFsRXJyb3IgPSBbXG4gICAgICAnSmF2YVNjcmlwdCBFcnJvcicsXG4gICAgICBlcnIubWVzc2FnZSxcbiAgICAgIGVyci5maWxlbmFtZSArIGxpbmVBbmRDb2x1bW5JbmZvICsgJyAtPiAnICsgIG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAwLFxuICAgICAgdHJ1ZVxuICBdO1xuXG4gIC8vIFRPRE86IGFkZCBwcm9wZXIgRXJyb3IgSGFuZGxlclxuICBsb2cud2FybihmaW5hbEVycm9yKTtcbiAgaWYoQ29uZmlnLmdldCgncHJldmVudEVycm9ycycpKSB7XG4gICAgZXJyLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufSk7XG4iLCIvLyBUT0RPOiByZWZhY3RvciBhbmQgd3JpdGUgdGVzdHNcbi8vIFRPRE86IGFkZCBleGFtcGxlXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuIGBgYGpzXG4gLy8gRGVtb1xuXG4gZXZlbnRzLnB1Ymxpc2goJy9wYWdlL2xvYWQnLCB7XG5cdHVybDogJy9zb21lL3VybC9wYXRoJyAvLyBhbnkgYXJndW1lbnRcbn0pO1xuXG4gdmFyIHN1YnNjcmlwdGlvbiA9IGV2ZW50cy5zdWJzY3JpYmUoJy9wYWdlL2xvYWQnLCBmdW5jdGlvbihvYmopIHtcblx0Ly8gRG8gc29tZXRoaW5nIG5vdyB0aGF0IHRoZSBldmVudCBoYXMgb2NjdXJyZWRcbn0pO1xuXG4gLy8gLi4uc29tZXRpbWUgbGF0ZXIgd2hlcmUgSSBubyBsb25nZXIgd2FudCBzdWJzY3JpcHRpb24uLi5cbiBzdWJzY3JpcHRpb24ucmVtb3ZlKCk7XG5cbiAvLyAgdmFyIHRhcmdldCA9IHdpbmRvdy5ldmVudCA/IHdpbmRvdy5ldmVudC5zcmNFbGVtZW50IDogZSA/IGUudGFyZ2V0IDogbnVsbDtcbiBgYGBcbiAqL1xuZXhwb3J0IHZhciBldmVudHMgPSAoZnVuY3Rpb24oKSB7XG4gIGxldCB0b3BpY3MgPSB7fTtcbiAgbGV0IG93blByb3BlcnR5ID0gdG9waWNzLmhhc093blByb3BlcnR5O1xuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlOiBmdW5jdGlvbih0b3BpYywgbGlzdGVuZXIpIHtcbiAgICAgIC8vIENyZWF0ZSB0aGUgdG9waWMncyBvYmplY3QgaWYgbm90IHlldCBjcmVhdGVkXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgdG9waWNzW3RvcGljXSA9IFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICBsZXQgaW5kZXggPSB0b3BpY3NbdG9waWNdLnB1c2gobGlzdGVuZXIpIC0xO1xuXG4gICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICByZXR1cm4ge1xuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlbGV0ZSB0b3BpY3NbdG9waWNdW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9LFxuXG4gICAgcHVibGlzaDogZnVuY3Rpb24odG9waWMsIGluZm8pIHtcbiAgICAgIC8vIElmIHRoZSB0b3BpYyBkb2Vzbid0IGV4aXN0LCBvciB0aGVyZSdzIG5vIGxpc3RlbmVycyBpbiBxdWV1ZSwganVzdCBsZWF2ZVxuICAgICAgaWYgKCFvd25Qcm9wZXJ0eS5jYWxsKHRvcGljcywgdG9waWMpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3ljbGUgdGhyb3VnaCB0b3BpY3MgcXVldWUsIGZpcmUhXG4gICAgICB0b3BpY3NbdG9waWNdLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpdGVtKGluZm8gIT09IHVuZGVmaW5lZCA/IGluZm8gOiB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbn0pKCk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmV4dGVuZFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRXh0ZW5kcyB0aGUgZGVzdGluYXRpb24gb2JqZWN0IGJ5IGNvcHlpbmcgcHJvcGVydGllcyBmcm9tIHRoZSBzcmMgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5cbmltcG9ydCB7aXNPYmplY3R9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKG9iaikge1xuICBpZiAoIWlzT2JqZWN0KG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIHZhciBzb3VyY2UsIHByb3A7XG4gIGZvciAodmFyIGkgPSAxLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgZm9yIChwcm9wIGluIHNvdXJjZSkge1xuICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufVxuIiwiLy9pbXBvcnQge3dpbmRvd30gZnJvbSAnLi9icm93c2VyJztcbi8qIGdsb2JhbCBmZXRjaCAqL1xuaW1wb3J0IHtcbiAgZ2V0TG9nZ2VyLFxuICBpc0Zvcm1FbGVtZW50LFxuICBpc1N0cmluZyxcbiAgaXNPYmplY3QsXG4gIGlzRm9ybURhdGFcbiAgfSBmcm9tICcuLi91dGlscyc7XG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5odHRwJyk7XG4vL2xldCBQcm9taXNlID0gd2luZG93LlByb21pc2U7IC8vIG90aGVyd2lzZSBpbXBvcnQgUHJvbWlzZVxuLy9sZXQgZmV0Y2ggPSB3aW5kb3cuZmV0Y2g7IC8vIG90aGVyd2lzZSBUT0RPOiBpbXBvcnQgZmV0Y2hcblxuXG5cblxuLyoqXG4gKiBGZXRjaCBKU09OIHZpYSBHRVRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0ganNvbiByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZldGNoSlNPTih1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBQT1NUIFJlcXVlc3RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge0hUTUxGb3JtRWxlbWVudFxcRm9ybURhdGFcXFVSTFNlYXJjaFBhcmFtc1xcVVNWU3RyaW5nXFxCbG9ifEJ1ZmZlclNvdXJjZX0gZm9ybVxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0Rm9ybSh1cmwsIGZvcm0pIHtcbiAgaWYgKGlzRm9ybUVsZW1lbnQoZm9ybSkpIHtcbiAgICBmb3JtID0gbmV3IEZvcm1EYXRhKGZvcm0pO1xuICB9XG4gIHJldHVybiBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBib2R5OiBmb3JtXG4gIH0pO1xufVxuXG4vKipcbiAqIFBvc3QgSlNPTlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7YE9iamVjdGB9IGRhdGEgRWl0aGVyIE9iamVjdCBvciBKU09OIFN0cmluZ1xuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0KHVybCwgZGF0YSkge1xuICBpZiAoaXNPYmplY3QoZGF0YSkpIHtcbiAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gIH0gZWxzZSBpZiAoIWlzU3RyaW5nKGRhdGEpKSB7XG4gICAgbG9nLndhcm4oJ3Bvc3RKU09OOiBpbnZhbGlkIGRhdGEnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcG9zdCBkYXRhJyk7XG4gIH1cbiAgcmV0dXJuIGZldGNoKHVybCwge1xuICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfSxcbiAgICBib2R5OiBkYXRhXG4gIH0pO1xufVxuXG4vKipcbiAqIFVwbG9hZCBmaWxlXG4gKiBUT0RPOiBhZGQgYWRkaXRpb25hbCBwYXJhbXMgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtJbnB1dC5maWxlfEZvcm1EYXRhfSBkYXRhXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGxvYWQodXJsLCBkYXRhLCBuYW1lKSB7XG4gIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKCk7XG4gIGlmICghaXNGb3JtRGF0YShkYXRhKSkge1xuICAgIGZvcm0uYXBwZW5kKG5hbWUgfHwgJ2ZpbGUnLCBkYXRhKTtcbiAgfSBlbHNlIHtcbiAgICBmb3JtID0gZGF0YTtcbiAgfVxuXG4gIHJldHVybiBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBib2R5OiBmb3JtXG4gIH0pO1xufVxuXG4vKipcbiAqIEZldGNoIHRleHQgb3IgSFRNTCB2aWEgR0VUXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHJldHVybnMge1Byb21pc2V9IHdpdGggdGVzdCByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldCh1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbiAgICB9KTtcbn1cbiIsIi8qKlxuICogQG5hbWUgamFtZXMuaXNVbmRlZmluZWRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgdW5kZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNVbmRlZmluZWQodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBkZWZpbmVkLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBkZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgIT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzUHJlc2VudFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgbmVpdGhlciB1bmRlZmluZWQgbm9yIG51bGwuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHByZXNlbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByZXNlbnQob2JqKSB7XG4gIHJldHVybiBvYmogIT09IHVuZGVmaW5lZCAmJiBvYmogIT09IG51bGw7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNCbGFua1xuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZWl0aGVyIHVuZGVmaW5lZCBvciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBibGFuay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQmxhbmsob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGw7XG59XG5cblxuLyoqXG4qIEBuYW1lIGphbWVzLmlzU3RyaW5nXG4qIEBtb2R1bGUgamFtZXNcbiogQGtpbmQgZnVuY3Rpb25cbipcbiogQGRlc2NyaXB0aW9uXG4qIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgU3RyaW5nYC5cbipcbiogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4qIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgU3RyaW5nYC5cbiovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNOdW1iZXJcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE51bWJlcmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYE51bWJlcmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc09iamVjdFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhbiBgT2JqZWN0YC5cbiAqIG51bGwgaXMgbm90IHRyZWF0ZWQgYXMgYW4gb2JqZWN0LlxuICogSW4gSlMgYXJyYXlzIGFyZSBvYmplY3RzXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhbiBgT2JqZWN0YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQXJyYXlcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYEFycmF5YC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYEFycmF5YC5cbiAqL1xuZXhwb3J0IHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0Z1bmN0aW9uXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBGdW5jdGlvbmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEZ1bmN0aW9uYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0RhdGVcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgdmFsdWUgaXMgYSBkYXRlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBEYXRlYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGF0ZSh2YWx1ZSkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuLyoqXG4gKiBAbmFtZSBpc1Byb21pc2VcbiAqIEBtb2R1bGUgdXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1uaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIHByb21pc2UuXG4gKlxuICogQHBhcmFtIHsqfSBvYmogT2JqZWN0IHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiBgb2JgIGlzIGEgcHJvbWlzZSBvciBwcm9taXNlLWxpa2Ugb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcm9taXNlKG9iaikge1xuICByZXR1cm4gb2JqICYmIGlzRnVuY3Rpb24ob2JqLnRoZW4pO1xufVxuXG4vLyBUT0RPOiBkb2VzIG5vdCBiZWxvbmcgaW4gaGVyZVxuLyoqXG4gKiBAbmFtZSB1dGlscy50cmltXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJlbW92ZXMgd2hpdGVzcGFjZXMuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7U3RyaW5nfCp9IFRyaW1tZWQgIHZhbHVlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmltKHZhbHVlKSB7XG4gIHJldHVybiBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJykgOiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc1VVSURcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBVVUlEYCAoT1NGKS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgVVVJRGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1VVSUQodmFsdWUpIHtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhbHVlID0gdHJpbSh2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9eWzAtOWEtZl17NH0oWzAtOWEtZl17NH0tKXs0fVswLTlhLXpdezEyfSQvaSkgIT09IG51bGw7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzR1VJRFxuICogQGFsaWFzIHV0aWxzLmlzVVVJRFxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYEdVSURgIChNaWNyb3NvZnQgU3RhbmRhcmQpLlxuICogSXMgYW4gYWxpYXMgdG8gaXNVVUlEXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEdVSURgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNHVUlEKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzTWFjQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE1BQyBBZGRyZXNzYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNYWNBZGRyZXNzKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXihbMC05YS1mXXsyfVstOl0pezV9WzAtOWEtZl17Mn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0JMRUFkZHJlc3NcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBCTEUgQWRkcmVzc2BcbiAqXG4gKiBAcGFyYW0geyp9IG9iaiBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEJMRSBBZGRyZXNzYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQkxFQWRkcmVzcyh2YWx1ZSkge1xuICByZXR1cm4gaXNVVUlEKHZhbHVlKSB8fCBpc01hY0FkZHJlc3ModmFsdWUpO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzRm9ybURhdGFcbiAqIEBtb2R1bGUgdXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgRm9ybURhdGEgYE9iamVjdGAuXG4gKlxuICogQHBhcmFtIHsqfSBvYmogUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYG9iamAgaXMgYSBgRm9ybURhdGFgIE9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRm9ybURhdGEob2JqKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEZvcm1EYXRhXSc7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNGb3JtRWxlbWVudFxuICogQG1vZHVsZSB1dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBGb3JtRWxlbWVudC5cbiAqXG4gKiBAcGFyYW0geyp9IG9iaiBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgb2JqYCBpcyBhIGBIVE1MRm9ybUVsZW1lbnRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGb3JtRWxlbWVudChvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgSFRNTEZvcm1FbGVtZW50XSc7XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3R9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5pc19wZXJtaXR0ZWQnKTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBjdXJyZW50IHVzZXIncyBPUyBhbmQgT1MgVmVyc2lvbiBpcyBoaWdoZXJcbiAqIG9yIGVxdWFsIHRvIHRoZSBwYXNzZWQgcmVmZXJlbmNlIGBPYmplY3RgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJzaW9ucyBWZXJzaW9ucyBgT2JqZWN0YCB3aXRoIHBlcm1pdHRlZCBPU3MgYW5kIHRoZWlyIHZlcnNpb24uXG4gKiBAcGFyYW0ge3N0cmluZ30gb3MgT1MgTmFtZSBhcyBsb3dlcmNhc2Ugc3RyaW5nLlxuICogQHBhcmFtIHtJbnRlZ2VyfSBhcHBWZXJzaW9uIEFwcCBWZXJzaW9uIE51bWJlciBhcyBJbnRlZ2VyICBUT0RPOiBmb3JtYXQgUkZDP1xuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGN1cnJlbnQgT1MgJiBWZXJzaW9uIGFyZSBkZWZpbmVkIGluIHRoZSB2ZXJzaW9ucyBgT2JqZWN0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIG9zLCBhcHBWZXJzaW9uKSB7XG5cbiAgaWYgKCF2ZXJzaW9ucyB8fCAhaXNPYmplY3QodmVyc2lvbnMpKSB7XG4gICAgbG9nLndhcm4oJ25vIHZlcnNpb25zIGBPYmplY3RgIHdhcyBwYXNzZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbnNbb3NdICYmIGFwcFZlcnNpb24gPj0gdmVyc2lvbnNbb3NdO1xufVxuIiwiLyoqXG4gKiBMb2dMZXZlbCBFbnVtXG4gKiBub25lIGlzIDBcbiAqIGRlYnVnIGlzIDRcbiAqIEB0eXBlIEVudW1cbiAqL1xuZXhwb3J0IHZhciBsZXZlbHMgPSB7XG4gIG5vbmU6IDAsXG4gIGVycm9yOjEsXG4gIHdhcm46MixcbiAgaW5mbzozLFxuICBkZWJ1Zzo0XG59O1xuXG4vKipcbiAqIENhbiBzdG9yZSBtdWx0aXBsZSBsb2dnZXJzXG4gKiBAdHlwZSB7YE9iamVjdGB9IGxvZ2dlcnNcbiAqL1xubGV0IGxvZ2dlcnMgPSB7fTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEFzc2lnbiB0aGUgbG9nZ2VyIG1ldGhvZC5cbiAqIEJ5IGRlZmF1bHQgdGhlIHdpbmRvdy5jb25zb2xlIGBPYmplY3RgXG4gKiBAdHlwZSBgd2luZG93LmNvbnNvbGVgXG4gKi9cbmxldCBsb2dnZXIgPSB3aW5kb3cuY29uc29sZTtcblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nIExldmVsXG4gKiB1c2UgYHNldExldmVsKG5ld0xvZ0xldmVsKWAgdG8gb3ZlcndyaXRlIHRoaXMgdmFsdWUuXG4gKiBUT0RPOiBlYWNoIGxvZ2dlciBnZXRzIGFuIG93biBsb2dMZXZlbFxuICovXG5sZXQgbG9nTGV2ZWwgPSBsZXZlbHMubm9uZTtcblxuLyoqXG4gKlxuICogQHBhcmFtIGxldmVsXG4gKiBAcGFyYW0gYXJnc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gbG9nKGxldmVsLCBhcmdzLCBwcmVmaXgpIHtcbiAgbGV0IHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICBpZiAocHJlZml4KSB7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJncyk7XG4gICAgLy9hcmdzLnVuc2hpZnQodGltZSk7IC8vIFRPRE86IGNvbnNpZGVyIHRvZ2dsZWFibGUgdGltZVxuICAgIGFyZ3MudW5zaGlmdChwcmVmaXgpO1xuICB9XG4gIGxvZ2dlcltsZXZlbCB8fCAnbG9nJ10uYXBwbHkoY29uc29sZSwgYXJncyk7XG59XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IGxvZ0xldmVsXG4gKiBpbiBvcmRlciB0byBzaG93IG9yIG5vdCBzaG93IGxvZ3NcbiAqIEBwYXJhbSBsZXZlbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TGV2ZWwobGV2ZWwpIHtcbiAgbG9nTGV2ZWwgPSBsZXZlbDtcbn1cblxuLyoqXG4gKiBHZXQgTG9nZ2VyIFNpbmdsZXRvbiBJbnN0YW5jZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIFRoZSBMb2dnZXIncyBuYW1lXG4gKiBAcmV0dXJucyB7TG9nZ2VyfSBMb2dnZXIgaW5zdGFuY2UsIGVpdGhlciBleGlzdGluZyBvbmUgb3IgY3JlYXRlcyBhIG5ldyBvbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XG4gIHJldHVybiBsb2dnZXJzW25hbWVdIHx8IChsb2dnZXJzW25hbWVdID0gbmV3IExvZ2dlcihuYW1lKSk7XG59XG5cbi8qKlxuICogTG9nZ2VyIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuXG4gIC8qKlxuICAgKiBFYWNoIGxvZ2dlciBpcyBpZGVudGlmaWVkIGJ5IGl0J3MgbmFtZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbG9nZ2VyIChlLmcuIGBjaGF5bnMuY29yZWApXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gJ1snICsgbmFtZSArICddOiAnO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlYnVnXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZGVidWcoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2RlYnVnJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgaW5mby5cbiAgICpcbiAgICogQG1ldGhvZCBpbmZvXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgaW5mbygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnaW5mbycsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nLlxuICAgKlxuICAgKiBAbWV0aG9kIHdhcm5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICB3YXJuKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2coJ3dhcm4nLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvci5cbiAgICpcbiAgICogQG1ldGhvZCBlcnJvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGVycm9yKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdlcnJvcicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuTXV0YXRpb25PYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG5cbiAgICBpZiAoY2FuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICB2YXIgaGlkZGVuRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHF1ZXVlTGlzdCA9IHF1ZXVlLnNsaWNlKCk7XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgcXVldWVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCd5ZXMnLCAnbm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIlxuaW1wb3J0IHtjaGF5bnN9IGZyb20gJy4vY2hheW5zJztcbmV4cG9ydCBkZWZhdWx0IGNoYXlucztcbiJdfQ==
  return require('chayns');

});
