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

// TODO: import './lib/formdata_polyfill';

require("./lib/fetch_polyfill");

require("./lib/raf_polyfill");

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

},{"./chayns/chayns_api_interface":3,"./chayns/chayns_calls":4,"./chayns/config":5,"./chayns/core":6,"./chayns/environment":7,"./chayns/tapp_api_interface":8,"./lib/fetch_polyfill":9,"./lib/promise_polyfill":10,"./lib/raf_polyfill":11,"./utils":12}],2:[function(require,module,exports){
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
   * TODO: deprecated
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
  },

  /* ----- Chayns Web Only ------ */

  /**
   * Set the height to the frame container
   * Chayns Web only
   * @params [height] Set custom height. Default is body's scrollHeight or offsetHeight
   */
  setHeight: function setHeight(height) {
    return apiCall({
      webFn: "height",
      webParams: height || document.body.scrollHeight || document.body.offsetHeight
    });
  },

  /**
   * Set fixec height
   * Chayns Web only
   * TODO: does the name match?
   * @params [height = 500]
   * @returns {*}
   */
  setFixedHeight: function setFixedHeight(height) {
    return apiCall({
      webFn: "forceHeight",
      webParams: height || 500
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
      log.info("executeCall: neither chayns call nor chayns web");
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

    // resize listener
    var heightCache = undefined;
    if (environment.isChaynsWebDesktop) {
      window.addEventListener("resize", resizeHandler);
      // TODO: is there any alternative to the DOMSubtree event?
      document.body.addEventListener("DOMSubtreeModified", resizeHandler.bind(true));
      chaynsApiInterface.setFixedHeight(); // default value is 500
      resizeHandler();
    }
    function resizeHandler(isDomMod) {
      window.requestAnimationFrame(function () {
        log.debug(isDomMod ? "DOMSubtreeModified" : "resize");
        if (heightCache === document.body.scrollHeight) {
          return;
        }
        heightCache = document.body.scrollHeight;
        chaynsApiInterface.setHeight();
      }, true);
    }
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
          colorScheme: appInfo.ColorScheme || environment.site.colorScheme || 0,
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

  // chayns is ready
  DOM.addClass(html, "chayns-ready");
  DOM.removeAttribute(DOM.query("[chayns-cloak]"), "chayns-cloak");
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":12,"./callbacks":2,"./chayns_api_interface":3,"./config":5,"./environment":7}],7:[function(require,module,exports){
"use strict";

// TODO: chayns web fix

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

environment.debugMode = debugMode;

environment.site = {};
environment.site.colorScheme = parameters.colorscheme;function setEnv(key, value) {
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

//import {window} from '../utils/browser'; // due to window.open and location.href

var log = getLogger("tapp_api");

console.debug(environment, "evn");

// TODO: force SSL?
var tappApiRoot = "//chayns1.tobit.com/TappApi/";
//let resultType = { // TODO: ResultEnum is not used, consider removing or adjusting the API
//  error: -1,
//  success: 0
//};

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
 * @private
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

},{"../utils":12,"./environment":7}],9:[function(require,module,exports){
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
},{"_process":22}],11:[function(require,module,exports){
"use strict";

(function () {
  var lastTime = 0;
  var vendors = ["webkit", "moz"];
  for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
    window.cancelAnimationFrame = window[vendors[x] + "CancelAnimationFrame"] || window[vendors[x] + "CancelRequestAnimationFrame"];
  }

  if (!window.requestAnimationFrame) window.requestAnimationFrame = function (callback, element) {
    var currTime = new Date().getTime();
    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
    var id = window.setTimeout(function () {
      callback(currTime + timeToCall);
    }, timeToCall);
    lastTime = currTime + timeToCall;
    return id;
  };

  if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) {
    clearTimeout(id);
  };
})();

},{}],12:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdGFwcF9hcGlfaW50ZXJmYWNlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2xpYi9mZXRjaF9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9saWIvcHJvbWlzZV9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9saWIvcmFmX3BvbHlmaWxsLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2Jyb3dzZXIuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZG9tLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2Vycm9yLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2V2ZW50cy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9leHRlbmQuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvaHR0cC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9pcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9pc19wZXJtaXR0ZWQuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvbG9nZ2VyLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy11bWQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztJQ09ZLEtBQUssbUNBQW9CLFNBQVM7O0FBQzlDLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7OztBQUcxQixLQUFLLENBQUMsUUFBUSxDQUFDLENB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QyxTQUFTLEdBQUMsQ0FBQyxDQUFDLE9BQU8sWUFBVTtBQUFDLE9BQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsV0FBTyxZQUFVO0FBQUMsZ0JBQVUsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsSUFBRSxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNmLEtBQUMsR0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUc7QUFBQyxPQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsYUFBTyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksU0FBUyxDQUFDLDBDQUEwQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUcsVUFBVSxLQUFHLE9BQU8sQ0FBQyxJQUFFLFFBQVEsS0FBRyxPQUFPLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxFQUFDLElBQUcsQ0FBQyxDQUFDLFdBQVcsS0FBRyxDQUFDLENBQUMsV0FBVyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQzlmLENBQUMsQ0FBQyxDQUFDLEtBQUk7QUFBQyxVQUFJLENBQUMsQ0FBQyxJQUFHO0FBQUMsU0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7T0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxNQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxLQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxTQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUM7UUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLENBQUMsTUFBTSxFQUFDO0FBQUMsV0FBSSxJQUFJLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFBO0tBQUM7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFFBQUksQ0FBQyxLQUFLLEdBQ3pnQixJQUFJLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxFQUFDO0FBQUMsVUFBRztBQUFDLFNBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxDQUFBLE9BQU0sQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsS0FBSyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUEsR0FBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLFNBQVMsQ0FBQyxzREFBc0QsQ0FBQyxDQUFDLENBQUMsT0FBTTtPQUFDO0tBQUMsTUFBSyxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHO0FBQUMsT0FBQyxDQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxTQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUMzZixJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLE1BQU0sR0FBQyxJQUFJLENBQUMsTUFBTSxJQUFFLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQSxHQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsRUFBRSxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFVBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxvRkFBb0YsQ0FBQyxDQUFDLElBQUcsRUFBRSxJQUFJLFlBQVksQ0FBQyxDQUFBLEFBQUMsRUFBQyxNQUFNLElBQUksU0FBUyxDQUFDLHVIQUF1SCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsSUFBSSxDQUFDLEdBQUMsS0FBSyxDQUFDLE9BQU8sR0FBQyxLQUFLLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxnQkFBZ0IsS0FDamdCLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDO01BQUMsQ0FBQyxHQUFDLENBQUM7TUFBQyxDQUFDLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxHQUFDLE1BQU0sR0FBQyxFQUFFO01BQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxnQkFBZ0IsSUFBRSxDQUFDLENBQUMsc0JBQXNCO01BQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLGlCQUFpQixJQUFFLFdBQVcsS0FBRyxPQUFPLGFBQWEsSUFBRSxXQUFXLEtBQUcsT0FBTyxjQUFjO01BQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFHLENBQUM7TUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLE9BQU8sSUFBRSxrQkFBa0IsS0FBRyxDQUFBLEdBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLEVBQUE7TUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLEVBQUEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxZQUFVO0FBQUMsV0FBTyxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQzVmLFlBQVU7QUFBQyxRQUFJLENBQUMsQ0FBQyxHQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFlBQVU7QUFBQyxTQUFJLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFHLE9BQU8sQ0FBQyxJQUFFLElBQUksS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLFdBQVcsS0FBRyxDQUFDLElBQUUsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxHQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsSUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUMsSUFBSSxDQUFDLENBQUMsSUFBRSxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQTtHQUFDLENBQUM7QUFDdGYsR0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxXQUFNLEFBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsYUFBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxTQUFTLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQSxDQUFFLEtBQUksSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRyxDQUFDLElBQUUsUUFBUSxLQUFHLE9BQU8sQ0FBQyxJQUFFLENBQUMsQ0FBQyxXQUFXLEtBQUcsSUFBSSxFQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQztBQUN6ZixLQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFDLEVBQUMsV0FBVyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsY0FBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsVUFBSSxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsSUFBRSxDQUFDLENBQUM7QUFBQyxlQUFPLElBQUksQ0FBQztPQUFBLElBQUksQ0FBQyxHQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7VUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFlBQUksQ0FBQyxHQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVU7QUFBQyxXQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7U0FBQyxDQUFDLENBQUE7T0FBQyxNQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtLQUFDLEVBQUMsT0FBTyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsYUFBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxFQUFDLE9BQU8sRUFBQyxDQUFDLEVBQUMsUUFBUSxFQUFDLG9CQUFVO0FBQUMsVUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLE1BQU0sR0FBQyxNQUFNLEdBQUMsV0FBVyxLQUFHLE9BQU8sTUFBTSxJQUFFLE1BQU0sQ0FBQyxRQUFRLEdBQUMsTUFBTSxHQUFDLElBQUksQ0FBQyxTQUFTLElBQUcsQ0FBQyxJQUFFLFNBQVMsSUFDcmYsQ0FBQyxDQUFDLE9BQU8sSUFBRSxRQUFRLElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBRSxLQUFLLElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBRSxNQUFNLElBQUcsQ0FBQyxDQUFDLE9BQU8sSUFBRSxDQUFBLFlBQVU7QUFBQyxZQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFDLEdBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQSxFQUFFLEtBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO0tBQUMsRUFBQyxDQUFDLFVBQVUsS0FBRyxPQUFPLE1BQU0sSUFB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LE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO09BQ25DOzs7O0FBUUQsU0FBSzs7Ozs7Ozs7O2FBQUEsaUJBQUc7QUFDTixZQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUU7QUFDaEIsaUJBQU87U0FDUjtBQUNELFdBQUcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztPQUNwQzs7Ozs7O1NBOURVLE1BQU07Ozs7Ozs7O0FDeEVuQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7SUNyRlEsTUFBTSxXQUFPLFVBQVUsRUFBdkIsTUFBTTs7aUJBQ0MsTUFBTSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIEBuYW1lIGNoYXlucyBBUElcbiAqIEBtb2R1bGUgY2hheW5zXG4gKi9cblxuLy8gaGVscGVyXG4vLyBUT0RPOiBlaXRoZXIgaW5kZXguanMsIHV0aWxzLmpzIG9yIGp1c3QgdGhlIHNpbmdsZSBmaWxlc1xuaW1wb3J0ICogYXMgdXRpbHMgICAgICAgICAgICAgICBmcm9tICcuL3V0aWxzJztcbnZhciBleHRlbmQgPSB1dGlscy5leHRlbmQ7XG5cbi8vIHNldCBsb2dMZXZlbCB0byBpbmZvXG51dGlscy5zZXRMZXZlbCg0KTsgLy8gVE9ETzogZG9uJ3Qgc2V0IHRoZSBsZXZlbCBoZXJlXG5cbi8vIGJhc2ljIGNvbmZpZ1xuaW1wb3J0IHtjb25maWd9ICAgICAgICAgICAgICAgICBmcm9tICcuL2NoYXlucy9jb25maWcnO1xuXG4vLyBlbnZpcm9ubWVudFxuaW1wb3J0IHtlbnZpcm9ubWVudH0gICAgICAgICAgICBmcm9tICcuL2NoYXlucy9lbnZpcm9ubWVudCc7XG5cbmltcG9ydCBQcm9taXNlIGZyb20gICcuL2xpYi9wcm9taXNlX3BvbHlmaWxsJztcblByb21pc2UucG9seWZpbGwoKTsgLy8gYXV0b2xvYWQgUHJvbWlzZSBwb2x5ZmlsbFxuLy8gVE9ETzogYWRkIERlZmVycmVkP1xuXG4vLyBUT0RPOiBpbXBvcnQgJy4vbGliL2Zvcm1kYXRhX3BvbHlmaWxsJzsgXG5pbXBvcnQgJy4vbGliL2ZldGNoX3BvbHlmaWxsJztcbmltcG9ydCAnLi9saWIvcmFmX3BvbHlmaWxsJztcblxuLy8gY29yZSBmdW5jdGlvbnNcbmltcG9ydCB7cmVhZHksIHJlZ2lzdGVyLCBzZXR1cH0gZnJvbSAnLi9jaGF5bnMvY29yZSc7XG5cbi8vIGNoYXlucyBjYWxsc1xuXG5pbXBvcnQge2FwaUNhbGx9ICAgICAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2NoYXluc19jYWxscyc7XG5cbmltcG9ydCB7Y2hheW5zQXBpSW50ZXJmYWNlfSAgICAgZnJvbSAnLi9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuXG5pbXBvcnQge3RhcHBBcGlJbnRlcmZhY2V9ICAgICAgIGZyb20gJy4vY2hheW5zL3RhcHBfYXBpX2ludGVyZmFjZSc7XG5cblxuLy8gcHVibGljIGNoYXlucyBvYmplY3RcbmV4cG9ydCB2YXIgY2hheW5zID0ge307XG5cbi8vIFRPRE86IHVzZSBleHRlbmQgbWV0aG9kIG9ubHkgb25lIHRpbWVcblxuZXh0ZW5kKGNoYXlucywge2dldExvZ2dlcjogdXRpbHMuZ2V0TG9nZ2VyfSk7IC8vIGpzaGludCBpZ25vcmU6IGxpbmVcbmV4dGVuZChjaGF5bnMsIHt1dGlsc30pO1xuZXh0ZW5kKGNoYXlucywge1ZFUlNJT046ICcwLjEuMCd9KTtcbi8vZXh0ZW5kKGNoYXlucywge2NvbmZpZ30pOyAvLyBUT0RPOiB0aGUgY29uZmlnIGBPYmplY3RgIHNob3VsZCBub3QgYmUgZXhwb3NlZFxuXG5leHRlbmQoY2hheW5zLCB7ZW52OiBlbnZpcm9ubWVudH0pOyAvLyBUT0RPOiBnZW5lcmFsbHkgcmVuYW1lXG5cbmV4dGVuZChjaGF5bnMsIHtyZWdpc3Rlcn0pO1xuZXh0ZW5kKGNoYXlucywge3JlYWR5fSk7XG5cbi8vIFRPRE86IHJlbW92ZSBsaW5lIGJlbG93XG5leHRlbmQoY2hheW5zLCB7YXBpQ2FsbH0pO1xuXG4vLyBhZGQgYWxsIGNoYXluc0FwaUludGVyZmFjZSBtZXRob2RzIGRpcmVjdGx5IHRvIHRoZSBgY2hheW5zYCBPYmplY3RcbmV4dGVuZChjaGF5bnMsIGNoYXluc0FwaUludGVyZmFjZSk7XG5cbmV4dGVuZChjaGF5bnMsIHRhcHBBcGlJbnRlcmZhY2UpO1xuXG4vLyBzZXR1cCBjaGF5bnNcbnNldHVwKCk7XG5cblxuLy8gY2hheW5zIHB1Ymxpc2ggbm8gVU1EXG4vL3dpbmRvdy5jaGF5bnMgPSBjaGF5bnM7XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNGdW5jdGlvbiwgaXNVbmRlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93fSBmcm9tICcuLi91dGlscy9icm93c2VyJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jYWxsYmFja3MnKTtcblxubGV0IG5vb3AgPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbmxldCBjYWxsYmFja3MgPSB7fTtcbi8qKlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBGdW5jdGlvbiB0byBiZSBpbnZva2VkXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzQ2hheW5zQ2FsbCBJZiB0cnVlIHRoZW4gdGhlIGNhbGwgd2lsbCBiZSBhc3NpZ25lZCB0byBgY2hheW5zLl9jYWxsYmFja3NgXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBwYXJhbWV0ZXJzIGFyZSB2YWxpZCBhbmQgdGhlIGNhbGxiYWNrIHdhcyBzYXZlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0Q2FsbGJhY2sobmFtZSwgZm4sIGlzQ2hheW5zQ2FsbCkge1xuXG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogbmFtZSBpcyB1bmRlZmluZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFpc0Z1bmN0aW9uKGZuKSkge1xuICAgIGxvZy53YXJuKCdzZXRDYWxsYmFjazogZm4gaXMgbm8gRnVuY3Rpb24nKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAobmFtZS5pbmRleE9mKCcoKScpICE9PSAtMSkgeyAvLyBzdHJpcCAnKCknXG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgnKCknLCAnJyk7XG4gIH1cblxuICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiBzZXQgQ2FsbGJhY2s6ICcgKyBuYW1lKTtcbiAgLy9pZiAobmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgLy8gIGNhbGxiYWNrc1tuYW1lXS5wdXNoKGZuKTsgLy8gVE9ETzogcmVjb25zaWRlciBBcnJheSBzdXBwb3J0XG4gIC8vfSBlbHNlIHtcbiAgICBjYWxsYmFja3NbbmFtZV0gPSBmbjsgLy8gQXR0ZW50aW9uOiB3ZSBzYXZlIGFuIEFycmF5XG4gIC8vfVxuXG4gIGlmIChpc0NoYXluc0NhbGwpIHtcbiAgICBsb2cuZGVidWcoJ3NldENhbGxiYWNrOiByZWdpc3RlciBmbiBhcyBnbG9iYWwgY2FsbGJhY2snKTtcbiAgICB3aW5kb3cuX2NoYXluc0NhbGxiYWNrc1tuYW1lXSA9IGNhbGxiYWNrKG5hbWUsICdDaGF5bnNDYWxsJyk7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZWdpc3RlciBjYWxsYmFja3MgZm9yIENoYXluc0NhbGxzIGFuZCBDaGF5bnNXZWJDYWxsc1xuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gY2FsbGJhY2tOYW1lIE5hbWUgb2YgdGhlIEZ1bmN0aW9uXG4gKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBFaXRoZXIgJ0NoYXluc1dlYkNhbGwnIG9yICdDaGF5bnNDYWxsJ1xuICogQHJldHVybnMge0Z1bmN0aW9ufSBoYW5kbGVEYXRhIFJlY2VpdmVzIGNhbGxiYWNrIGRhdGFcbiAqL1xuZnVuY3Rpb24gY2FsbGJhY2soY2FsbGJhY2tOYW1lLCB0eXBlKSB7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGhhbmRsZURhdGEoKSB7XG5cbiAgICBpZiAoY2FsbGJhY2tOYW1lIGluIGNhbGxiYWNrcykge1xuICAgICAgbG9nLmRlYnVnKCdpbnZva2UgY2FsbGJhY2s6ICcsIGNhbGxiYWNrTmFtZSwgJ3R5cGU6JywgdHlwZSk7XG4gICAgICB2YXIgZm4gPSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTtcbiAgICAgIGlmIChpc0Z1bmN0aW9uKGZuKSkge1xuICAgICAgICBmbi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICAvL2RlbGV0ZSBjYWxsYmFja3NbY2FsbGJhY2tOYW1lXTsgLy8gVE9ETzogY2Fubm90IGJlIGxpa2UgdGhhdCwgcmVtb3ZlIGFycmF5P1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLndhcm4oJ2NhbGxiYWNrIGlzIG5vIGZ1bmN0aW9uJywgY2FsbGJhY2tOYW1lLCBmbik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5pbmZvKCdjYWxsYmFjayAnICsgY2FsbGJhY2tOYW1lICsgJyBkaWQgbm90IGV4aXN0IGluIGNhbGxiYWNrcyBhcnJheScpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMuX2NhbGxiYWNrc1xuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIENoYXlucyBDYWxsIENhbGxiYWNrc1xuICogd2lsbCBiZSBhc3NpZ25lZCB0byB0aGUgYGNoYXlucy5fY2FsbGJhY2tzYCBvYmplY3RcbiAqXG4gKiBAdHlwZSB7T2JqZWN0fSBjaGF5bnNDYWxsc0NhbGxiYWNrc1xuICovXG53aW5kb3cuX2NoYXluc0NhbGxiYWNrcyA9IHtcbiAgLy8vLyBUT0RPOiB3cmFwIGNhbGxiYWNrIGZ1bmN0aW9uIChEUlkpXG4gIC8vZ2V0R2xvYmFsRGF0YTogY2FsbGJhY2soJ2dldEdsb2JhbERhdGEnLCAnQ2hheW5zQ2FsbCcpIC8vIGV4YW1wbGVcbiAgZ2V0R2VvTG9jYXRpb25DYWxsYmFjazogbm9vcFxufTtcblxuXG4vLyBUT0RPOiBtb3ZlIHRvIGFub3RoZXIgZmlsZT8gY29yZSwgY2hheW5zX2NhbGxzXG52YXIgbWVzc2FnZUxpc3RlbmluZyA9IGZhbHNlO1xuZXhwb3J0IGZ1bmN0aW9uIG1lc3NhZ2VMaXN0ZW5lcigpIHtcbiAgaWYgKG1lc3NhZ2VMaXN0ZW5pbmcpIHtcbiAgICBsb2cuaW5mbygndGhlcmUgaXMgYWxyZWFkeSBvbmUgbWVzc2FnZSBsaXN0ZW5lciBvbiB3aW5kb3cnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgbWVzc2FnZUxpc3RlbmluZyA9IHRydWU7XG4gIGxvZy5kZWJ1ZygnbWVzc2FnZSBsaXN0ZW5lciBpcyBzdGFydGVkJyk7XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiBvbk1lc3NhZ2UoZSkge1xuXG4gICAgbG9nLmRlYnVnKCduZXcgbWVzc2FnZSAnKTtcblxuICAgIHZhciBuYW1lc3BhY2UgPSAnY2hheW5zLmN1c3RvbVRhYi4nLFxuICAgICAgZGF0YSA9IGUuZGF0YTtcblxuICAgIGlmICh0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gc3RyaXAgbmFtZXNwYWNlIGZyb20gZGF0YVxuICAgIGRhdGEgPSBkYXRhLnN1YnN0cihuYW1lc3BhY2UubGVuZ3RoLCBkYXRhLmxlbmd0aCAtIG5hbWVzcGFjZS5sZW5ndGgpO1xuICAgIHZhciBtZXRob2QgPSBkYXRhLm1hdGNoKC9bXjpdKjovKTsgLy8gZGV0ZWN0IG1ldGhvZFxuICAgIGlmIChtZXRob2QgJiYgbWV0aG9kLmxlbmd0aCA+IDApIHtcbiAgICAgIG1ldGhvZCA9IG1ldGhvZFswXTtcblxuICAgICAgdmFyIHBhcmFtcyA9IGRhdGEuc3Vic3RyKG1ldGhvZC5sZW5ndGgsIGRhdGEubGVuZ3RoIC0gbWV0aG9kLmxlbmd0aCk7XG4gICAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFyYW1zID0gSlNPTi5wYXJzZShwYXJhbXMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgfVxuXG4gICAgICAvLyByZW1vdmUgdGhlIGxhc3QgJyknXG4gICAgICBtZXRob2QgPSBtZXRob2Quc3Vic3RyKDAsIG1ldGhvZC5sZW5ndGggLSAxKTtcblxuICAgICAgLy8gdGhlIGNhbGxiYWNrIGZ1bmN0aW9uIGNhbiBiZSBpbnZva2VkIGRpcmVjdGx5XG4gICAgICBjYWxsYmFjayhtZXRob2QsICdDaGF5bnNXZWJDYWxsJykocGFyYW1zKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiLyoqXG4gKiBDaGF5bnMgQVBJIEludGVyZmFjZVxuICogQVBJIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIEFQUCBhbmQgdGhlIENoYXlucyBXZWJcbiAqL1xuXG5pbXBvcnQge2FwaUNhbGx9IGZyb20gJy4vY2hheW5zX2NhbGxzJztcbmltcG9ydCB7Z2V0TG9nZ2VyLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzQkxFQWRkcmVzcyxcbiAgaXNEYXRlLCBpc09iamVjdCwgaXNBcnJheSwgdHJpbSwgRE9NfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvdywgbG9jYXRpb259IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInOyAvLyBkdWUgdG8gd2luZG93Lm9wZW4gYW5kIGxvY2F0aW9uLmhyZWZcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zX2FwaV9pbnRlcmZhY2UnKTtcblxuLyoqXG4gKiBORkMgUmVzcG9uc2UgRGF0YSBTdG9yYWdlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5sZXQgTmZjUmVzcG9uc2VEYXRhID0ge1xuICBSRklkOiAwLFxuICBQZXJzb25JZDogMFxufTtcblxuLyoqXG4gKiBQb3B1cCBCdXR0b25cbiAqIEBjbGFzcyBQb3B1cEJ1dHRvblxuICovXG5jbGFzcyBQb3B1cEJ1dHRvbiB7XG4gIC8qKlxuICAgKiBQb3B1cCBCdXR0b24gQ29uc3RydWN0b3JcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgUG9wdXAgQnV0dG9uIG5hbWVcbiAgICovXG4gIGNvbnN0cnVjdG9yKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgbGV0IGVsID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGVsLnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLXBvcHVwJyk7XG4gICAgZWwuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3BvcHVwJyk7XG4gICAgdGhpcy5lbGVtZW50ID0gZWw7XG4gIH1cbiAgLyoqXG4gICAqIEdldCBQb3B1cCBCdXR0b24gbmFtZVxuICAgKiBAcmV0dXJucyB7bmFtZX1cbiAgICovXG4gIG5hbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsYmFja1xuICAgKi9cbiAgY2FsbGJhY2soKSB7XG4gICAgbGV0IGNiID0gdGhpcy5jYWxsYmFjaztcbiAgICBsZXQgbmFtZSA9IGNiLm5hbWU7XG4gICAgaWYgKGlzRnVuY3Rpb24oY2IpKSB7XG4gICAgICBjYi5jYWxsKG51bGwsIG5hbWUpO1xuICAgIH1cbiAgfVxuICAvKipcbiAgICogQG5hbWUgdG9IVE1MXG4gICAqIFJldHVybnMgSFRNTCBOb2RlIGNvbnRhaW5pbmcgdGhlIFBvcHVwQnV0dG9uLlxuICAgKiBAcmV0dXJucyB7UG9wdXBCdXR0b24uZWxlbWVudHxIVE1MTm9kZX1cbiAgICovXG4gIHRvSFRNTCgpIHtcbiAgICByZXR1cm4gdGhpcy5lbGVtZW50O1xuICB9XG59XG5cbi8qKlxuICogQmVhY29uIExpc3RcbiAqIEB0eXBlIHtBcnJheXxudWxsfVxuICovXG5sZXQgYmVhY29uTGlzdCA9IG51bGw7XG5cbi8qKlxuICogR2xvYmFsIERhdGEgU3RvcmFnZVxuICogQHR5cGUge2Jvb2xlYW58T2JqZWN0fVxuICovXG5sZXQgZ2xvYmFsRGF0YSA9IGZhbHNlO1xuXG4vKipcbiAqIEFsbCBwdWJsaWMgY2hheW5zIG1ldGhvZHMgdG8gaW50ZXJhY3Qgd2l0aCAqQ2hheW5zIEFwcCogb3IgKkNoYXlucyBXZWIqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5leHBvcnQgdmFyIGNoYXluc0FwaUludGVyZmFjZSA9IHtcblxuXG4gIC8qKlxuICAgKiBFbmFibGUgb3IgZGlzYWJsZSBQdWxsVG9SZWZyZXNoXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gYWxsb3dQdWxsIEFsbG93IFB1bGxUb1JlZnJlc2hcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjZWVkZWRcbiAgICovXG4gIHNldFB1bGxUb1JlZnJlc2g6IGZ1bmN0aW9uKGFsbG93UHVsbCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMCxcbiAgICAgIHdlYkZuOiBmYWxzZSwgLy8gY291bGQgYmUgb21pdHRlZFxuICAgICAgcGFyYW1zOiBbeydib29sJzogYWxsb3dQdWxsfV1cbiAgICB9KTtcbiAgfSxcbiAgLy8gVE9ETzogcmVuYW1lIHRvIGVuYWJsZVB1bGxUb1JlZnJlc2hcbiAgYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaCh0cnVlKTtcbiAgfSxcbiAgZGlzYWxsb3dSZWZyZXNoU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0UHVsbFRvUmVmcmVzaChmYWxzZSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gW3Nob3dDdXJzb3JdIElmIHRydWUgdGhlIHdhaXRjdXJzb3Igd2lsbCBiZSBzaG93blxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdGhlcndpc2UgaXQgd2lsbCBiZSBoaWRkZW5cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZXRXYWl0Y3Vyc29yOiBmdW5jdGlvbihzaG93Q3Vyc29yKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxLFxuICAgICAgd2ViRm46IChzaG93Q3Vyc29yID8gJ3Nob3cnIDogJ2hpZGUnKSArICdMb2FkaW5nQ3Vyc29yJyxcbiAgICAgIHBhcmFtczogW3snYm9vbCc6IHNob3dDdXJzb3J9XVxuICAgIH0pO1xuICB9LFxuICBzaG93V2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKHRydWUpO1xuICB9LFxuICBoaWRlV2FpdGN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5zZXRXYWl0Y3Vyc29yKGZhbHNlKTtcbiAgfSxcblxuICAvLyBUT0RPOiByZW5hbWUgaXQgdG8gb3BlblRhcHA/XG4gIC8qKlxuICAgKiBTZWxlY3QgZGlmZmVyZW50IFRhcHAgaWRlbnRpZmllZCBieSBUYXBwSUQgb3IgSW50ZXJuYWxUYXBwTmFtZVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGFiIFRhcHAgTmFtZSBvciBUYXBwIElEXG4gICAqIEBwYXJhbSB7U3RyaW5nfSAob3B0aW9uYWwpIHBhcmFtIFVSTCBQYXJhbWV0ZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZWxlY3RUYWI6IGZ1bmN0aW9uKHRhYiwgcGFyYW0pIHtcblxuICAgIGxldCBjbWQgPSAxMzsgLy8gc2VsZWN0VGFiIHdpdGggcGFyYW0gQ2hheW5zQ2FsbFxuXG4gICAgLy8gdXBkYXRlIHBhcmFtOiBzdHJpcCA/IGFuZCBlbnN1cmUgJiBhdCB0aGUgYmVnaW5cbiAgICBpZiAocGFyYW0gJiYgIXBhcmFtLm1hdGNoKC9eWyZ8XFw/XS8pKSB7IC8vIG5vICYgYW5kIG5vID9cbiAgICAgIHBhcmFtID0gJyYnICsgcGFyYW07XG4gICAgfSBlbHNlIGlmIChwYXJhbSkge1xuICAgICAgcGFyYW0gPSBwYXJhbS5yZXBsYWNlKCc/JywgJyYnKTtcbiAgICB9IGVsc2UgeyAvLyBubyBwYXJhbXMsIGRpZmZlcmVudCBDaGF5bnNDYWxsXG4gICAgICBjbWQgPSAyO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgd2ViRm46ICdzZWxlY3RvdGhlcnRhYicsXG4gICAgICBwYXJhbXM6IGNtZCA9PT0gMTNcbiAgICAgICAgPyBbeydzdHJpbmcnOiB0YWJ9LCB7J3N0cmluZyc6IHBhcmFtfV1cbiAgICAgICAgOiBbeydzdHJpbmcnOiB0YWJ9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBUYWI6IHRhYixcbiAgICAgICAgUGFyYW1ldGVyOiBwYXJhbVxuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwMiwgaW9zOiAxMzgzLCB3cDogMjQ2OSB9IC8vIGZvciBuYXRpdmUgYXBwcyBvbmx5XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBBbGJ1bVxuICAgKiBUT0RPOiByZW5hbWUgdG8gb3BlblxuICAgKlxuICAgKiBAcGFyYW0ge2lkfHN0cmluZ30gaWQgQWxidW0gSUQgKEFsYnVtIE5hbWUgd2lsbCB3b3JrIGFzIHdlbGwsIGJ1dCBkbyBwcmVmZXIgSURzKVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNlbGVjdEFsYnVtOiBmdW5jdGlvbihpZCkge1xuICAgIGlmICghaXNTdHJpbmcoaWQpICYmICFpc051bWJlcihpZCkpIHtcbiAgICAgIGxvZy5lcnJvcignc2VsZWN0QWxidW06IGludmFsaWQgYWxidW0gbmFtZScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMsXG4gICAgICB3ZWJGbjogJ3NlbGVjdEFsYnVtJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogaWR9XSxcbiAgICAgIHdlYlBhcmFtczogaWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBQaWN0dXJlXG4gICAqIChvbGQgU2hvd1BpY3R1cmUpXG4gICAqIEFuZHJvaWQgZG9lcyBub3Qgc3VwcG9ydCBnaWZzIDooXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgSW1hZ2UgVVJMIHNob3VsZCBjb3RhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuUGljdHVyZTogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goL2pwZyR8cG5nJHxnaWYkL2kpKSB7IC8vIFRPRE86IG1vcmUgaW1hZ2UgdHlwZXM/XG4gICAgICBsb2cuZXJyb3IoJ29wZW5QaWN0dXJlOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDQsXG4gICAgICB3ZWJGbjogJ3Nob3dQaWN0dXJlJyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICB3ZWJQYXJhbXM6IHVybCxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjUwMSwgaW9zOiAyNjM2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICogVE9ETzogaW1wbGVtZW50IGludG8gQ2hheW5zIFdlYj9cbiAgICogVE9ETzogcmVuYW1lIHRvIHNldD9cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRleHQgVGhlIEJ1dHRvbidzIHRleHRcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgY2FwdGlvbiBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBjcmVhdGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbih0ZXh0LCBjYWxsYmFjaykge1xuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgLy9sb2cuZXJyb3IoJ1RoZXJlIGlzIG5vIHZhbGlkIGNhbGxiYWNrIEZ1bmN0aW9uLicpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGVyZSBpcyBubyB2YWxpZCBjYWxsYmFjayBGdW5jdGlvbi4nKTtcbiAgICAgIC8vcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NhcHRpb25CdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNSxcbiAgICAgIHBhcmFtczogW3tzdHJpbmc6IHRleHR9LCB7Y2FsbGJhY2s6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIGEgQ2FwdGlvbiBCdXR0b24uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqIFRoZSBjYXB0aW9uIGJ1dHRvbiBpcyB0aGUgdGV4dCBhdCB0aGUgdG9wIHJpZ2h0IG9mIHRoZSBhcHAuXG4gICAqIChtYWlubHkgdXNlZCBmb3IgbG9naW4gb3IgdGhlIHVzZXJuYW1lKVxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGhpZGVDYXB0aW9uQnV0dG9uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDYsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDEzNTgsIGlvczogMTM2Niwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBGYWNlYm9vayBDb25uZWN0XG4gICAqIE5PVEU6IHByZWZlciBgY2hheW5zLmxvZ2luKClgIG92ZXIgdGhpcyBtZXRob2QgdG8gcGVyZm9ybSBhIHVzZXIgbG9naW4uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJ10gRmFjZWJvb2sgUGVybWlzc2lvbnMsIHNlcGFyYXRlZCBieSBjb21tYVxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3JlbG9hZFBhcmFtID0gJ2NvbW1lbnQnXSBSZWxvYWQgUGFyYW1cbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAvLyBUT0RPOiB0ZXN0IHBlcm1pc3Npb25zXG4gIGZhY2Vib29rQ29ubmVjdDogZnVuY3Rpb24ocGVybWlzc2lvbnMgPSAndXNlcl9mcmllbmRzJywgcmVsb2FkUGFyYW0gPSAnY29tbWVudCcpIHtcbiAgICByZWxvYWRQYXJhbSA9IHJlbG9hZFBhcmFtO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNyxcbiAgICAgIHdlYkZuOiAnZmFjZWJvb2tDb25uZWN0JyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogcGVybWlzc2lvbnN9LCB7J0Z1bmN0aW9uJzogJ0V4ZWNDb21tYW5kPVwiJyArIHJlbG9hZFBhcmFtICsgJ1wiJ31dLFxuICAgICAgd2ViUGFyYW1zOiB7XG4gICAgICAgIFJlbG9hZFBhcmFtZXRlcjogJ0V4ZWNDb21tYW5kPScgKyByZWxvYWRQYXJhbSxcbiAgICAgICAgUGVybWlzc2lvbnM6IHBlcm1pc3Npb25zXG4gICAgICB9LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU5LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH0sXG4gICAgICBmYWxsYmFja0NtZDogOCAvLyBpbiBjYXNlIHRoZSBhYm92ZSBpcyBub3Qgc3VwcG9ydCB0aGUgZmFsbGJhY2tDbWQgd2lsbCByZXBsYWNlIHRoZSBjbWRcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBMaW5rIGluIEJyb3dzZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBVUkxcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBvcGVuTGlua0luQnJvd3NlcjogZnVuY3Rpb24odXJsKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA5LFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAodXJsLmluZGV4T2YoJzovLycpID09PSAtMSkge1xuICAgICAgICAgIHVybCA9ICcvLycgKyB1cmw7IC8vIG9yIGFkZCBsb2NhdGlvbi5wcm90b2NvbCBwcmVmaXggYW5kIC8vIFRPRE86IHRlc3RcbiAgICAgICAgfVxuICAgICAgICB3aW5kb3cub3Blbih1cmwsICdfYmxhbmsnKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNDY2LCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNob3cgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgYmFjayBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzaG93QmFja0J1dHRvbjogZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGNhbGxiYWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgICBjaGF5bnNBcGlJbnRlcmZhY2UuaGlkZUJhY2tCdXR0b24oKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmFja0J1dHRvbkNhbGxiYWNrKCknO1xuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhpZGUgQmFja0J1dHRvbi5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBoaWRlQmFja0J1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwNSwgaW9zOiAyNjM2LCB3cDogMjQ2OSB9XG4gICAgfSk7XG4gIH0sXG5cblxuICAvKipcbiAgICogT3BlbiBJbnRlckNvbS5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICogVE9ETzogZGVwcmVjYXRlZFxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gRmFsc2Ugb24gZXJyb3IsIHRydWUgaWYgY2FsbCBzdWNjZWVkZWRcbiAgICovXG4gIG9wZW5JbnRlckNvbTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxMixcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMjQwMiwgaW9zOiAxMzgzLCB3cDogMjU0MyB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBHZW9sb2NhdGlvbi5cbiAgICogbmF0aXZlIGFwcHMgb25seSAoYnV0IGNvdWxkIHdvcmsgaW4gd2ViIGFzIHdlbGwsIG5hdmlnYXRvci5nZW9sb2NhdGlvbilcbiAgICpcbiAgICogVE9ETzogY29udGludW91c1RyYWNraW5nIHdhcyByZW1vdmVkXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGJhY2sgYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgZ2V0R2VvTG9jYXRpb246IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2dldEdlb0xvY2F0aW9uQ2FsbGJhY2soKSc7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAvLyBUT0RPOiByZW1vdmUgY29uc29sZVxuICAgICAgLy8gVE9ETzogYWxsb3cgZW1wdHkgY2FsbGJhY2tzIHdoZW4gaXQgaXMgYWxyZWFkeSBzZXRcbiAgICAgIGNvbnNvbGUud2Fybignbm8gY2FsbGJhY2sgZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE0LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNTAxLCBpb3M6IDI0NjYsIHdwOiAyNDY5IH0sXG4gICAgICAvL3dlYkZuOiBmdW5jdGlvbigpIHsgbmF2aWdhdG9yLmdlb2xvY2F0aW9uOyB9XG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogT3BlbiBWaWRlb1xuICAgKiAob2xkIFNob3dWaWRlbylcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBWaWRlbyBVUkwgc2hvdWxkIGNvdGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIG9wZW5WaWRlbzogZnVuY3Rpb24odXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpIHx8ICF1cmwubWF0Y2goLy4qXFwuLnsyLH0vKSkgeyAvLyBUT0RPOiBXVEYgUmVnZXhcbiAgICAgIGxvZy5lcnJvcignb3BlblZpZGVvOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDE1LFxuICAgICAgd2ViRm46ICdzaG93VmlkZW8nLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9XSxcbiAgICAgIHdlYlBhcmFtczogdXJsXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNob3cgRGlhbG9nXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB7Y29udGVudDp7U3RyaW5nfSAsIGhlYWRsaW5lOiAsYnV0dG9uczp7QXJyYXl9LCBub0NvbnRlbnRuUGFkZGluZzosIG9uTG9hZDp9XG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc2hvd0RpYWxvZzogZnVuY3Rpb24gc2hvd0RpYWxvZyhvYmopIHtcbiAgICBpZiAoIW9iaiB8fCAhaXNPYmplY3Qob2JqKSkge1xuICAgICAgbG9nLndhcm4oJ3Nob3dEaWFsb2c6IGludmFsaWQgcGFyYW1ldGVycycpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoaXNTdHJpbmcob2JqLmNvbnRlbnQpKSB7XG4gICAgICBvYmouY29udGVudCA9IHRyaW0ob2JqLmNvbnRlbnQucmVwbGFjZSgvPGJyWyAvXSo/Pi9nLCAnXFxuJykpO1xuICAgIH1cbiAgICBpZiAoIWlzQXJyYXkob2JqLmJ1dHRvbnMpIHx8IG9iai5idXR0b25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgb2JqLmJ1dHRvbnMgPSBbKG5ldyBQb3B1cEJ1dHRvbignT0snKSkudG9IVE1MKCldO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnQ2hheW5zRGlhbG9nQ2FsbEJhY2soKSc7XG4gICAgZnVuY3Rpb24gY2FsbGJhY2tGbihidXR0b25zLCBpZCkge1xuICAgICAgaWQgPSBwYXJzZUludChpZCwgMTApIC0gMTtcbiAgICAgIGlmIChidXR0b25zW2lkXSkge1xuICAgICAgICBidXR0b25zW2lkXS5jYWxsYmFjay5jYWxsKG51bGwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTYsIC8vIFRPRE86IGlzIHNsaXR0ZTovL1xuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5oZWFkbGluZX0sXG4gICAgICAgIHsnc3RyaW5nJzogb2JqLmNvbnRlbnR9LFxuICAgICAgICB7J3N0cmluZyc6IG9iai5idXR0b25zWzBdLm5hbWV9IC8vIFRPRE86IG5lZWRzIGVuY29kZVVSST9cbiAgICAgICAgLy97J3N0cmluZyc6IG9iai5idXR0b25zWzFdLm5hbWV9LCAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICAgIC8veydzdHJpbmcnOiBvYmouYnV0dG9uc1syXS5uYW1lfSAvLyBUT0RPOiBuZWVkcyBlbmNvZGVVUkk/XG4gICAgICBdLFxuICAgICAgY2I6IGNhbGxiYWNrRm4uYmluZChudWxsLCBvYmouYnV0dG9ucyksXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjYwNn0sXG4gICAgICBmYWxsYmFja0ZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2ZhbGxiYWNrIHBvcHVwJywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuXG4gIC8qKlxuICAgKiBGb3JtZXJseSBrbm93biBhcyBnZXRBcHBJbmZvc1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBpbnZva2VkIHdpdGggdGhlIEFwcERhdGFcbiAgICogQHJldHVybnMge1Byb21pc2V9IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgICAvLyBUT0RPOiB1c2UgZm9yY2VSZWxvYWQgYW5kIGNhY2hlIEFwcERhdGFcbiAgZ2V0R2xvYmFsRGF0YTogZnVuY3Rpb24oZm9yY2VSZWxvYWQpIHtcbiAgICBpZiAoIWZvcmNlUmVsb2FkICYmIGdsb2JhbERhdGEpIHtcbiAgICAgIGxvZy5kZWJ1ZygnZ2V0R2xvYmFsRGF0YTogcmV0dXJuIGNhY2hlZCBkYXRhJyk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGdsb2JhbERhdGEpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDE4LFxuICAgICAgICB3ZWJGbjogJ2dldEFwcEluZm9zJyxcbiAgICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdnZXRHbG9iYWxEYXRhKCknfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICAgIGNiOiByZXNvbHZlLFxuICAgICAgICBvbkVycm9yOiByZWplY3RcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFZpYnJhdGVcbiAgICogQHBhcmFtIHtJbnRlZ2VyfSBkdXJhdGlvbiBUaW1lIGluIG1pbGxpc2Vjb25kc1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICB2aWJyYXRlOiBmdW5jdGlvbihkdXJhdGlvbikge1xuICAgIGlmICghaXNOdW1iZXIoZHVyYXRpb24pIHx8IGR1cmF0aW9uIDwgMikge1xuICAgICAgZHVyYXRpb24gPSAxNTA7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTksXG4gICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiBkdXJhdGlvbi50b1N0cmluZygpfV0sXG4gICAgICB3ZWJGbjogZnVuY3Rpb24gbmF2aWdhdG9yVmlicmF0ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBuYXZpZ2F0b3IudmlicmF0ZSgxMDApO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ3ZpYnJhdGU6IHRoZSBkZXZpY2UgZG9lcyBub3Qgc3VwcG9ydCB2aWJyYXRlJyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjY5NSwgaW9zOiAyNTk2LCB3cDogMjUxNX1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogTmF2aWdhdGUgQmFjay5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEZhbHNlIG9uIGVycm9yLCB0cnVlIGlmIGNhbGwgc3VjY2VlZGVkXG4gICAqL1xuICBuYXZpZ2F0ZUJhY2s6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjAsXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGhpc3RvcnkuYmFjaygpO1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNjk2LCBpb3M6IDI2MDAsIHdwOiAyNTE1fVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbWFnZSBVcGxvYWRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aXRoIGltYWdlIHVybCBhZnRlciB1cGxvYWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgdXBsb2FkSW1hZ2U6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3VwbG9hZEltYWdlOiBubyB2YWxpZCBjYWxsYmFjaycpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2ltYWdlVXBsb2FkQ2FsbGJhY2soKSc7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAyMSxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGlucHV0ID0gRE9NLmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgndHlwZScsICdmaWxlJyk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgndmFsdWUnLCAnJyk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgnYWNjZXB0JywgJ2ltYWdlLyonKTtcbiAgICAgICAgLy9pbnB1dC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2NoYXlucy1pbWFnZS11cGxvYWQtZmllbGQpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ29uY2hhbmdlJywgJ2ltYWdlQ2hvc2VuKCknKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCdjbGFzcycsICdjaGF5bnNfX3VwbG9hZC1pbWFnZScpO1xuICAgICAgICBET00ucXVlcnkoJyNjaGF5bnMtcm9vdCcpLmFwcGVuZENoaWxkKGlucHV0KTtcbiAgICAgICAgLy92YXIgZmQgPSBuZXcgRm9ybURhdGEoKTtcbiAgICAgICAgLy9mZC5hcHBlbmQoXCJJbWFnZVwiLCBmaWxlWzBdKTtcbiAgICAgICAgLy93aW5kb3cuaW1hZ2VDaG9zZW4gPSB3aW5kb3cuZmV0Y2goe1xuICAgICAgICAvLyAgdHlwZTogXCJQT1NUXCIsXG4gICAgICAgIC8vICB1cmw6IFwiLy9jaGF5bnMxLnRvYml0LmNvbS9UYXBwQXBpL0ZpbGUvSW1hZ2VcIixcbiAgICAgICAgLy8gIGNvbnRlbnRUeXBlOiBmYWxzZSxcbiAgICAgICAgLy8gIHByb2Nlc3NEYXRhOiBmYWxzZSxcbiAgICAgICAgLy8gIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgLy8gIGRhdGE6IGZkXG4gICAgICAgIC8vfSkudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vICBkZWxldGUgd2luZG93LmltYWdlQ2hvc2VuO1xuICAgICAgICAvLyAgY2FsbGJhY2suY2FsbChudWxsLCBkYXRhKTtcbiAgICAgICAgLy99KTtcbiAgICAgICAgLy8kKFwiI0NoYXluc0ltYWdlVXBsb2FkXCIpLmNsaWNrKCk7XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3MDUsIHdwOiAyNTM4LCBpb3M6IDI2NDJ9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBORkMgQ2FsbGJhY2tcbiAgICogVE9ETzogcmVmYWN0b3IgYW5kIHRlc3RcbiAgICogVE9ETzogd2h5IHR3byBjYWxscz9cbiAgICogQ2FuIHdlIGltcHJvdmUgdGhpcyBzaGl0PyBzcGxpdCBpbnRvIHR3byBtZXRob2RzXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIGZvciBORkNcbiAgICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGNhbGwgc3VjY2VlZGVkIG9yIGlzIGFzeW5jLCBmYWxzZSBvbiBlcnJvclxuICAgKi9cbiAgc2V0TmZjQ2FsbGJhY2s6IGZ1bmN0aW9uKGNhbGxiYWNrLCByZXNwb25zZSkge1xuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAzNyxcbiAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICB9KSAmJiBhcGlDYWxsKHtcbiAgICAgICAgICBjbWQ6IDM3LFxuICAgICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2YXIgY21kID0gKHJlc3BvbnNlID09PSBuZmNSZXNwb25zZURhdGEuUGVyc29uSWQpID8gMzcgOiAzODtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogY21kID09PSAzNyA/IDM4IDogMzcsXG4gICAgICAgIHBhcmFtczogW3snRnVuY3Rpb24nOiAnbnVsbCd9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxfVxuICAgICAgfSkgJiYgYXBpQ2FsbCh7XG4gICAgICBjbWQ6IGNtZCxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiAnTmZjQ2FsbGJhY2snfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2ssXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDMyMzQsIHdwOiAzMTIxIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVmlkZW8gUGxheWVyIENvbnRyb2xzXG4gICAqIEFjdXRhbGx5IG5hdGl2ZSBvbmx5XG4gICAqIFRPRE86IGNvdWxkIHRoZW9yZXRpY2FsbHkgd29yayBpbiBDaGF5bnMgV2ViXG4gICAqIFRPRE86IGV4YW1wbGU/IHdoZXJlIGRvZXMgdGhpcyB3b3JrP1xuICAgKi9cbiAgcGxheWVyOiB7XG4gICAgdXNlRGVmYXVsdFVybDogZnVuY3Rpb24gdXNlRGVmYXVsdFVybCgpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMixcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgY2hhbmdlVXJsOiBmdW5jdGlvbiBjaGFuZ2VVcmwodXJsKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjIsXG4gICAgICAgIHBhcmFtczogW3snU3RyaW5nJzogdXJsfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBoaWRlQnV0dG9uOiBmdW5jdGlvbiBoaWRlQnV0dG9uKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIzLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBzaG93QnV0dG9uOiBmdW5jdGlvbiBzaG93QnV0dG9uKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIzLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAxfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwYXVzZTogZnVuY3Rpb24gcGF1c2VWaWRlbygpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNCxcbiAgICAgICAgcGFyYW1zOiBbeydJbnRlZ2VyJzogMH1dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc1MiwgaW9zOiAyNjQ0LCB3cDogMjU0M31cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgcGxheTogZnVuY3Rpb24gcGxheVZpZGVvKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI0LFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAxfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwbGF5YmFja1N0YXR1czogZnVuY3Rpb24gcGxheWJhY2tTdGF0dXMoY2FsbGJhY2spIHtcblxuICAgICAgcmV0dXJuIGNoYXluc0FwaUludGVyZmFjZS5nZXRHbG9iYWxEYXRhKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwobnVsbCwge1xuICAgICAgICAgIEFwcENvbnRyb2xWaXNpYmxlOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLklzQXBwQ29udHJvbFZpc2libGUsXG4gICAgICAgICAgU3RhdHVzOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLlBsYXliYWNrU3RhdHVzLFxuICAgICAgICAgIFVybDogZGF0YS5BcHBJbmZvLlBsYXliYWNrSW5mby5TdHJlYW1VcmxcbiAgICAgICAgfSk7XG4gICAgICB9LCB0cnVlKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEJsdWV0b290aFxuICAgKiBPbmx5IGluIG5hdGl2ZSBBcHBzIChpb3MgYW5kIGFuZHJvaWQpXG4gICAqL1xuICBibHVldG9vdGg6IHtcbiAgICBMRVNlbmRTdHJlbmd0aDogeyAvLyBUT0RPOiB3aGF0IGlzIHRoYXQ/XG4gICAgICBBZGphY2VudDogMCxcbiAgICAgIE5lYXJieTogMSxcbiAgICAgIERlZmF1bHQ6IDIsXG4gICAgICBGYXI6IDNcbiAgICB9LFxuICAgIExFU2NhbjogZnVuY3Rpb24gTEVTY2FuKGNhbGxiYWNrKSB7XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRVNjYW46IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGxldCBjYWxsYmFja05hbWUgPSAnYmxlUmVzcG9uc2VDYWxsYmFjayc7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjYsXG4gICAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBMRUNvbm5lY3Q6IGZ1bmN0aW9uIExFQ29ubmVjdChhZGRyZXNzLCBjYWxsYmFjaywgcGFzc3dvcmQpIHtcbiAgICAgIGlmICghaXNTdHJpbmcoYWRkcmVzcykgfHwgIWlzQkxFQWRkcmVzcyhhZGRyZXNzKSkge1xuICAgICAgICBsb2cud2FybignTEVDb25uZWN0OiBubyB2YWxpZCBhZGRyZXNzIHBhcmFtZXRlcicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRUNvbm5lY3Q6IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNTdHJpbmcocGFzc3dvcmQpIHx8ICFwYXNzd29yZC5tYXRjaCgvXlswLTlhLWZdezYsMTJ9JC9pKSkge1xuICAgICAgICBwYXNzd29yZCA9ICcnO1xuICAgICAgfVxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJztcblxuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI3LFxuICAgICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGFkZHJlc3N9LCB7J3N0cmluZyc6IHBhc3N3b3JkfV0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFRPRE86IGNvbnNpZGVyIE9iamVjdCBhcyBwYXJhbWV0ZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRkcmVzc1xuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc3ViSWRcbiAgICAgKiBAcGFyYW0ge0ludGVnZXJ9IG1lYXN1cmVQb3dlclxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gc2VuZFN0cmVuZ3RoXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgKi9cbiAgICBMRVdyaXRlOiBmdW5jdGlvbiBMRVdyaXRlKGFkZHJlc3MsIHN1YklkLCBtZWFzdXJlUG93ZXIsIHNlbmRTdHJlbmd0aCwgY2FsbGJhY2spIHtcbiAgICAgIGlmICghaXNTdHJpbmcoYWRkcmVzcykgfHwgIWlzQkxFQWRkcmVzcyhhZGRyZXNzKSkge1xuICAgICAgICBsb2cud2FybignTEVXcml0ZTogbm8gdmFsaWQgYWRkcmVzcyBwYXJhbWV0ZXInKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihzdWJJZCkgfHwgc3ViSWQgPCAwIHx8IHN1YklkID4gNDA5NSkge1xuICAgICAgICBzdWJJZCA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNOdW1iZXIobWVhc3VyZVBvd2VyKSB8fCBtZWFzdXJlUG93ZXIgPCAtMTAwIHx8IG1lYXN1cmVQb3dlciA+IDApIHtcbiAgICAgICAgbWVhc3VyZVBvd2VyID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihzZW5kU3RyZW5ndGgpIHx8IHNlbmRTdHJlbmd0aCA8IDAgfHwgc2VuZFN0cmVuZ3RoID4gMykge1xuICAgICAgICBzZW5kU3RyZW5ndGggPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICAgIGNhbGxiYWNrID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJyxcbiAgICAgICAgdWlkID0gJzdBMDdFMTdBLUExODgtNDE2RS1CN0EwLTVBMzYwNjUxM0U1Nyc7XG5cbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyOCxcbiAgICAgICAgcGFyYW1zOiBbXG4gICAgICAgICAgeydzdHJpbmcnOiBhZGRyZXNzfSxcbiAgICAgICAgICB7J3N0cmluZyc6IHVpZH0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogc3ViSWR9LFxuICAgICAgICAgIHsnSW50ZWdlcic6IG1lYXN1cmVQb3dlcn0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogc2VuZFN0cmVuZ3RofVxuICAgICAgICBdLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjc3MSwgaW9zOiAyNjUxfVxuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIC8vIFRPRE87IHVzZSBgT2JqZWN0YCBhcyBwYXJhbXNcbiAgLy8gVE9ETzogd2hhdCBhcmUgb3B0aW9uYWwgcGFyYW1zPyB2YWxpZGF0ZSBuYW1lIGFuZCBsb2NhdGlvbj9cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIEFwcG9pbnRtZW50J3MgbmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gbG9jYXRpb24gQXBwb2ludG1lbnQncyBsb2NhdGlvblxuICAgKiBAcGFyYW0ge1N0cmluZ30gW2Rlc2NyaXB0aW9uXSBBcHBvaW50bWVudCdzIGRlc2NyaXB0aW9uXG4gICAqIEBwYXJhbSB7RGF0ZX0gc3RhcnQgQXBwb2ludG1lbnRzJ3MgU3RhcnREYXRlXG4gICAqIEBwYXJhbSB7RGF0ZX0gZW5kIEFwcG9pbnRtZW50cydzIEVuZERhdGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzYXZlQXBwb2ludG1lbnQ6IGZ1bmN0aW9uIHNhdmVBcHBvaW50bWVudChuYW1lLCBsb2NhdGlvbiwgZGVzY3JpcHRpb24sIHN0YXJ0LCBlbmQpIHtcbiAgICBpZiAoIWlzU3RyaW5nKG5hbWUpIHx8ICFpc1N0cmluZyhsb2NhdGlvbikpIHtcbiAgICAgIGxvZy53YXJuKCdzYXZlQXBwb2ludG1lbnQ6IG5vIHZhbGlkIG5hbWUgYW5kL29yIGxvY2F0aW9uJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghaXNEYXRlKHN0YXJ0KSB8fCAhaXNEYXRlKGVuZCkpIHtcbiAgICAgIGxvZy53YXJuKCdzYXZlQXBwb2ludG1lbnQ6IHN0YXJ0IGFuZC9vciBlbmREYXRlIGlzIG5vIHZhbGlkIERhdGUgYE9iamVjdGAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHN0YXJ0ID0gcGFyc2VJbnQoc3RhcnQuZ2V0VGltZSgpIC8gMTAwMCwgMTApO1xuICAgIGVuZCA9IHBhcnNlSW50KGVuZC5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDI5LFxuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnc3RyaW5nJzogbmFtZX0sXG4gICAgICAgIHsnc3RyaW5nJzogbG9jYXRpb259LFxuICAgICAgICB7J3N0cmluZyc6IGRlc2NyaXB0aW9ufSxcbiAgICAgICAgeydJbnRlZ2VyJzogc3RhcnR9LFxuICAgICAgICB7J0ludGVnZXInOiBlbmR9XG4gICAgICBdLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMwNTQsIGlvczogMzA2Nywgd3A6IDMwMzB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIERhdGVUeXBlcyBFbnVtXG4gICAqIHN0YXJ0cyBhdCAxXG4gICAqL1xuICBkYXRlVHlwZToge1xuICAgIGRhdGU6IDEsXG4gICAgdGltZTogMixcbiAgICBkYXRlVGltZTogM1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZWxlY3QgRGF0ZVxuICAgKiBPbGQ6IERhdGVTZWxlY3RcbiAgICogTmF0aXZlIEFwcHMgb25seS4gVE9ETzogYWxzbyBpbiBDaGF5bnMgV2ViPyBIVE1MNSBEYXRlcGlja2VyIGV0Y1xuICAgKiBUT0RPOyByZWNvbnNpZGVyIG9yZGVyIGV0Y1xuICAgKiBAcGFyYW0ge2RhdGVUeXBlfE51bWJlcn0gZGF0ZVR5cGUgRW51bSAxLTI6IHRpbWUsIGRhdGUsIGRhdGV0aW1lLiB1c2UgY2hheW5zLmRhdGVUeXBlXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IHByZVNlbGVjdCBQcmVzZXQgdGhlIERhdGUgKGUuZy4gY3VycmVudCBEYXRlKVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB0aGF0IHJlY2VpdmVzIHRoZSBjaG9zZW4gRGF0ZSBhcyBUaW1lc3RhbXBcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gbWluRGF0ZSBNaW5pbXVtIFN0YXJ0RGF0ZVxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBtYXhEYXRlIE1heGltdW0gRW5kRGF0ZVxuICAgKi9cbiAgc2VsZWN0RGF0ZTogZnVuY3Rpb24gc2VsZWN0RGF0ZShkYXRlVHlwZSwgcHJlU2VsZWN0LCBjYWxsYmFjaywgbWluRGF0ZSwgbWF4RGF0ZSkge1xuXG4gICAgaWYgKCFpc051bWJlcihkYXRlVHlwZSkgfHwgZGF0ZVR5cGUgPD0gMCkge1xuICAgICAgbG9nLndhcm4oJ3NlbGVjdERhdGU6IHdyb25nIGRhdGVUeXBlJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdzZWxlY3REYXRlOiBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZVZhbHVlKHZhbHVlKSB7XG4gICAgICBpZiAoIWlzTnVtYmVyKHZhbHVlKSkge1xuICAgICAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBwYXJzZUludCh2YWx1ZS5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICBwcmVTZWxlY3QgPSB2YWxpZGF0ZVZhbHVlKHByZVNlbGVjdCk7XG4gICAgbWluRGF0ZSA9IHZhbGlkYXRlVmFsdWUobWluRGF0ZSk7XG4gICAgbWF4RGF0ZSA9IHZhbGlkYXRlVmFsdWUobWF4RGF0ZSk7XG5cbiAgICBsZXQgZGF0ZVJhbmdlID0gJyc7XG4gICAgaWYgKG1pbkRhdGUgPiAtMSAmJiBtYXhEYXRlID4gLTEpIHtcbiAgICAgIGRhdGVSYW5nZSA9ICcsJyArIG1pbkRhdGUgKyAnLCcgKyBtYXhEYXRlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnc2VsZWN0RGF0ZUNhbGxiYWNrJztcbiAgICBmdW5jdGlvbiBjYWxsYmFja0ZuKGNhbGxiYWNrLCBkYXRlVHlwZSwgcHJlU2VsZWN0LCB0aW1lKSB7XG4gICAgICAvLyBUT0RPOiBpbXBvcnRhbnQgdmFsaWRhdGUgRGF0ZVxuICAgICAgLy8gVE9ETzogY2hvb3NlIHJpZ2h0IGRhdGUgYnkgZGF0ZVR5cGVFbnVtXG4gICAgICBsb2cuZGVidWcoZGF0ZVR5cGUsIHByZVNlbGVjdCk7XG4gICAgICBjYWxsYmFjay5jYWxsKG51bGwsIHRpbWUgPyBuZXcgRGF0ZSh0aW1lKSA6IC0xKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMwLFxuICAgICAgcGFyYW1zOiBbXG4gICAgICAgIHsnY2FsbGJhY2snOiBjYWxsYmFja05hbWV9LFxuICAgICAgICB7J0ludGVnZXInOiBkYXRlVHlwZX0sXG4gICAgICAgIHsnSW50ZWdlcic6IHByZVNlbGVjdCArIGRhdGVSYW5nZX1cbiAgICAgIF0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIGNhbGxiYWNrLCBkYXRlVHlwZSwgcHJlU2VsZWN0KSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMDcyLCBpb3M6IDMwNjIsIHdwOiAzMDMwfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFVSTCBpbiBBcHBcbiAgICogKG9sZCBTaG93VVJMSW5BcHApXG4gICAqIG5vdCB0byBjb25mdXNlIHdpdGggb3BlbkxpbmtJbkJyb3dzZXJcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBWaWRlbyBVUkwgc2hvdWxkIGNvbnRhaW4ganBnLHBuZyBvciBnaWZcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICAgIC8vIFRPRE86IGltcGxlbWVudCBDaGF5bnMgV2ViIE1ldGhvZCBhcyB3ZWxsIChuYXZpZ2F0ZSBiYWNrIHN1cHBvcnQpXG4gIG9wZW5Vcmw6IGZ1bmN0aW9uIG9wZW5VcmwodXJsLCB0aXRsZSkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSkge1xuICAgICAgbG9nLmVycm9yKCdvcGVuVXJsOiBpbnZhbGlkIHVybCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzEsXG4gICAgICB3ZWJGbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIGxvY2F0aW9uLmhyZWYgPSB1cmw7IC8vIFRPRE86IG1ha2Ugc3VyZSBpdCB3b3Jrc1xuICAgICAgfSxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfSwgeydzdHJpbmcnOiB0aXRsZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMxMTAsIGlvczogMzA3NCwgd3A6IDMwNjN9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIGNyZWF0ZSBRUiBDb2RlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfE9iamVjdH0gZGF0YSBRUiBDb2RlIGRhdGFcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIGJhc2U2NCBlbmNvZGVkIElNRyBUT0RPOiB3aGljaCB0eXBlP1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGNyZWF0ZVFSQ29kZTogZnVuY3Rpb24gY3JlYXRlUVJDb2RlKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFpc1N0cmluZyhkYXRhKSkge1xuICAgICAgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuICAgIH1cblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdjcmVhdGVRUkNvZGU6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdjcmVhdGVRUkNvZGVDYWxsYmFjaygpJztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDMzLFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiBkYXRhfSwgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6ICAzMjIwLCBpb3M6IDEzNzIsIHdwOiAzMTA2fSxcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIGNhbGxiYWNrTmFtZTogY2FsbGJhY2tOYW1lXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHNjYW4gUVIgQ29kZVxuICAgKiBTY2FucyBRUiBDb2RlIGFuZCByZWFkIGl0XG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSByZXN1bHRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzY2FuUVJDb2RlOiBmdW5jdGlvbiBzY2FuUVJDb2RlKGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2Fybignc2NhblFSQ29kZTogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ3NjYW5RUkNvZGVDYWxsYmFjaygpJztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDM0LFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6ICAzMjIwLCBpb3M6IDEzNzIsIHdwOiAzMTA2fSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBzY2FuIFFSIENvZGVcbiAgICogU2NhbnMgUVIgQ29kZSBhbmQgcmVhZCBpdFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgcmVzdWx0XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgZ2V0TG9jYXRpb25CZWFjb25zOiBmdW5jdGlvbiBnZXRMb2NhdGlvbkJlYWNvbnMoY2FsbGJhY2ssIGZvcmNlUmVsb2FkKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignZ2V0TG9jYXRpb25CZWFjb25zOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnZ2V0QmVhY29uc0NhbGxCYWNrKCknO1xuICAgIGlmIChiZWFjb25MaXN0ICYmICFmb3JjZVJlbG9hZCkgeyAvLyBUT0RPOiBtYWtlIHN1cmUgaXQgaXMgZ29vZCB0byBjYWNoZSB0aGUgbGlzdFxuICAgICAgbG9nLmRlYnVnKCdnZXRMb2NhdGlvbkJlYWNvbnM6IHRoZXJlIGlzIGFscmVhZHkgb25lIGJlYWNvbkxpc3QnKTtcbiAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKG51bGwsIGJlYWNvbkxpc3QpO1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tGbiA9IGZ1bmN0aW9uIGdldExvY2F0aW9uQmVhY29uQ2FsbGJhY2soY2FsbGJhY2ssIGxpc3QpIHtcbiAgICAgIGJlYWNvbkxpc3QgPSBsaXN0O1xuICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBsaXN0KTtcbiAgICB9O1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzksXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDQwNDUsIGlvczogNDA0OH0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIGNhbGxiYWNrKVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGQgdG8gUGFzc2Jvb2tcbiAgICogaU9TIG9ubHlcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHVybCBQYXRoIHRvIFBhc3Nib29rIGZpbGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBhZGRUb1Bhc3Nib29rOiBmdW5jdGlvbiBhZGRUb1Bhc3Nib29rKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSkge1xuICAgICAgbG9nLndhcm4oJ2FkZFRvUGFzc2Jvb2s6IHVybCBpcyBpbnZhbGlkLicpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNDcsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgc3VwcG9ydDoge2lvczogNDA0NX0sXG4gICAgICB3ZWJGbjogY2hheW5zQXBpSW50ZXJmYWNlLm9wZW5MaW5rSW5Ccm93c2VyLmJpbmQobnVsbCwgdXJsKSxcbiAgICAgIGZhbGxiYWNrRm46IGNoYXluc0FwaUludGVyZmFjZS5vcGVuTGlua0luQnJvd3Nlci5iaW5kKG51bGwsIHVybClcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVG9iaXQgTG9naW5cbiAgICogV2l0aCBGYWNlYm9va0Nvbm5lY3QgRmFsbGJhY2tcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhcmFtcyBSZWxvYWQgUGFyYW1ldGVyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgbG9naW46IGZ1bmN0aW9uIGxvZ2luKHBhcmFtcykge1xuICAgIHBhcmFtcyA9ICdFeGVjQ29tbWFuZD0nICsgcGFyYW1zO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogNTQsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHBhcmFtc31dLFxuICAgICAgc3VwcG9ydDoge2lvczogNDI0MCwgd3A6IDQwOTl9LFxuICAgICAgZmFsbGJhY2tGbjogY2hheW5zQXBpSW50ZXJmYWNlLmZhY2Vib29rQ29ubmVjdC5iaW5kKG51bGwsICd1c2VyX2ZyaWVuZHMnLCBwYXJhbXMpLFxuICAgICAgd2ViRm46ICd0b2JpdGNvbm5lY3QnLFxuICAgICAgd2ViUGFyYW1zOiBwYXJhbXNcbiAgICB9KTtcbiAgfSxcblxuICAvKiAtLS0tLSBDaGF5bnMgV2ViIE9ubHkgLS0tLS0tICovXG5cbiAgLyoqXG4gICAqIFNldCB0aGUgaGVpZ2h0IHRvIHRoZSBmcmFtZSBjb250YWluZXJcbiAgICogQ2hheW5zIFdlYiBvbmx5XG4gICAqIEBwYXJhbXMgW2hlaWdodF0gU2V0IGN1c3RvbSBoZWlnaHQuIERlZmF1bHQgaXMgYm9keSdzIHNjcm9sbEhlaWdodCBvciBvZmZzZXRIZWlnaHRcbiAgICovXG4gIHNldEhlaWdodDogZnVuY3Rpb24gc2V0SGVpZ2h0KGhlaWdodCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIHdlYkZuOiAnaGVpZ2h0JyxcbiAgICAgIHdlYlBhcmFtczogaGVpZ2h0IHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0IHx8IGRvY3VtZW50LmJvZHkub2Zmc2V0SGVpZ2h0XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBmaXhlYyBoZWlnaHRcbiAgICogQ2hheW5zIFdlYiBvbmx5XG4gICAqIFRPRE86IGRvZXMgdGhlIG5hbWUgbWF0Y2g/XG4gICAqIEBwYXJhbXMgW2hlaWdodCA9IDUwMF1cbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBzZXRGaXhlZEhlaWdodDogZnVuY3Rpb24gc2V0Rml4ZWRIZWlnaHQoaGVpZ2h0KSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgd2ViRm46ICdmb3JjZUhlaWdodCcsXG4gICAgICB3ZWJQYXJhbXM6IGhlaWdodCB8fCA1MDBcbiAgICB9KTtcbiAgfVxuXG59O1xuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzUGVybWl0dGVkLCBpc0Z1bmN0aW9uLCBpc0JsYW5rLCBpc0FycmF5LCBpc09iamVjdCwgaXNEZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvdywgcGFyZW50fSBmcm9tICcuLi91dGlscy9icm93c2VyJztcbmltcG9ydCB7ZW52aXJvbm1lbnR9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHtzZXRDYWxsYmFja30gZnJvbSAnLi9jYWxsYmFja3MnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmNvcmUuY2hheW5zX2NhbGxzJyk7XG5cblxuZnVuY3Rpb24gY2FuKHZlcnNpb25zKSB7XG4gIHJldHVybiBpc1Blcm1pdHRlZCh2ZXJzaW9ucywgZW52aXJvbm1lbnQub3MsIGVudmlyb25tZW50LmFwcFZlcnNpb24pO1xufVxuXG4vLyBPUyBBcHAgVmVyc2lvbiBNYXAgZm9yIENoYXlucyBDYWxscyBTdXBwb3J0XG4vLyBUT0RPOiBtb3ZlIGludG8gZW52aXJvbm1lbnQ/IChvciBqdXN0IHJlbW92ZSBjYXVzZSBpdCBpcyBvbmx5IHVzZWQgb25lIHRpbWUgaW4gaGVyZSlcbmxldCBvc01hcCA9IHtcbiAgY2hheW5zQ2FsbDogeyBhbmRyb2lkOiAyNTEwLCBpb3M6IDI0ODMsIHdwOiAyNDY5LCBiYjogMTE4IH1cbn07XG5cbi8qKlxuICogUHVibGljIENoYXlucyBJbnRlcmZhY2VcbiAqIEV4ZWN1dGUgQVBJIENhbGxcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gcGFyYW1zXG4gKiBAcGFyYW0gZGVib3VuY2VcbiAqIC8vIFRPRE86IGxlZnQgb2YgY2FsbGJhY2sgYXMgcHJvbWlzZVxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBpQ2FsbChvYmopIHtcblxuICBsZXQgZGVib3VuY2UgPSBvYmouZGVib3VuY2UgfHwgZmFsc2U7XG5cbiAgLy8gVE9ETzogY2hlY2sgb2JqLm9zIFZFUlNJT05cblxuICBmdW5jdGlvbiBleGVjdXRlQ2FsbChjaGF5bnNDYWxsT2JqKSB7XG5cbiAgICBpZiAoZW52aXJvbm1lbnQuY2FuQ2hheW5zQ2FsbCAmJiBjYW4ob3NNYXAuY2hheW5zQ2FsbCkpIHtcbiAgICAgIC8vIFRPRE86IGNvbnNpZGVyIGNhbGxRdWV1ZSBhbmQgSW50ZXJ2YWwgdG8gcHJldmVudCBlcnJvcnNcbiAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZUNhbGw6IGNoYXlucyBjYWxsICcsIGNoYXluc0NhbGxPYmouY21kKTtcblxuICAgICAgaWYgKCdjYicgaW4gY2hheW5zQ2FsbE9iaiAmJiBpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouY2IpKSB7XG4gICAgICAgIHNldENhbGxiYWNrKGNoYXluc0NhbGxPYmouY2FsbGJhY2tOYW1lIHx8IGNoYXluc0NhbGxPYmoucGFyYW1zWzBdLmNhbGxiYWNrLCBjaGF5bnNDYWxsT2JqLmNiLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGlmIChpc09iamVjdChjaGF5bnNDYWxsT2JqLnN1cHBvcnQpICYmICFjYW4oY2hheW5zQ2FsbE9iai5zdXBwb3J0KSkge1xuICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IHRoZSBjaGF5bnMgdmVyc2lvbiBpcyBub3Qgc3VwcG9ydGVkJyk7XG4gICAgICAgIGlmIChjaGF5bnNDYWxsT2JqLmZhbGxiYWNrQ21kKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBmYWxsYmFjayBjaGF5bnMgY2FsbCB3aWxsIGJlIGludm9rZWQnKTtcbiAgICAgICAgICByZXR1cm4gY2hheW5zQ2FsbChjaGF5bnNDYWxsT2JqLmZhbGxiYWNrQ21kKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNGdW5jdGlvbihjaGF5bnNDYWxsT2JqLmZhbGxiYWNrRm4pKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBmYWxsYmFja0ZuIHdpbGwgYmUgaW52b2tlZCcpO1xuICAgICAgICAgIHJldHVybiBjaGF5bnNDYWxsT2JqLmZhbGxiYWNrRm4uY2FsbChudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gY2hheW5zQ2FsbChjaGF5bnNDYWxsT2JqLmNtZCwgY2hheW5zQ2FsbE9iai5wYXJhbXMpO1xuXG4gICAgfSBlbHNlIGlmIChlbnZpcm9ubWVudC5jYW5DaGF5bnNXZWJDYWxsKSB7XG5cbiAgICAgIGlmICgnY2InIGluIGNoYXluc0NhbGxPYmogJiYgaXNGdW5jdGlvbihjaGF5bnNDYWxsT2JqLmNiKSkge1xuICAgICAgICBzZXRDYWxsYmFjayhjaGF5bnNDYWxsT2JqLndlYkZuLCBjaGF5bnNDYWxsT2JqLmNiKTtcbiAgICAgIH1cbiAgICAgIGlmICghY2hheW5zQ2FsbE9iai53ZWJGbikge1xuICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IFRoaXMgQ2FsbCBoYXMgbm8gd2ViRm4nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBsb2cuZGVidWcoJ2V4ZWN1dGVDYWxsOiBjaGF5bnMgd2ViIGNhbGwgJywgY2hheW5zQ2FsbE9iai53ZWJGbi5uYW1lIHx8IGNoYXluc0NhbGxPYmoud2ViRm4pO1xuXG4gICAgICByZXR1cm4gY2hheW5zV2ViQ2FsbChjaGF5bnNDYWxsT2JqLndlYkZuLCBjaGF5bnNDYWxsT2JqLndlYlBhcmFtcyB8fCBjaGF5bnNDYWxsT2JqLnBhcmFtcyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmluZm8oJ2V4ZWN1dGVDYWxsOiBuZWl0aGVyIGNoYXlucyBjYWxsIG5vciBjaGF5bnMgd2ViJyk7XG4gICAgICBpZiAoaXNGdW5jdGlvbihvYmoub25FcnJvcikpIHtcbiAgICAgICAgb2JqLm9uRXJyb3IuY2FsbCh1bmRlZmluZWQsIG5ldyBFcnJvcignTmVpdGhlciBpbiBDaGF5bnMgV2ViIG5vciBpbiBDaGF5bnMgQXBwJykpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChkZWJvdW5jZSkge1xuICAgIHNldFRpbWVvdXQoZXhlY3V0ZUNhbGwuYmluZChudWxsLCBvYmopLCAxMDApOyAvLyBUT0RPOiBlcnJvcj9cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZXhlY3V0ZUNhbGwob2JqKTtcbiAgfVxufVxuXG4vKipcbiAqIEJ1aWxkIENoYXlucyBDYWxsIChvbmx5IGZvciBuYXRpdmUgQXBwcylcbiAqIEBwcml2YXRlXG5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIGNoYXlucyBjYWxsIHN1Y2NlZWRlZCwgZmFsc2Ugb24gZXJyb3IgKG5vIHVybCBldGMpXG4gKi9cbmZ1bmN0aW9uIGNoYXluc0NhbGwoY21kLCBwYXJhbXMpIHtcblxuICBpZiAoaXNCbGFuayhjbWQpKSB7IC8vIDAgaXMgYSB2YWxpZCBjYWxsLCB1bmRlZmluZWQgYW5kIG51bGwgYXJlIG5vdFxuICAgIGxvZy53YXJuKCdjaGF5bnNDYWxsOiBtaXNzaW5nIGNtZCBmb3IgY2hheW5zQ2FsbCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBsZXQgdXJsID0gbnVsbDtcblxuICAvLyBpZiB0aGVyZSBpcyBubyBwYXJhbSBvciAnbm9uZScgd2hpY2ggbWVhbnMgbm8gY2FsbGJhY2tcbiAgaWYgKCFwYXJhbXMpIHtcblxuICAgIHVybCA9ICdjaGF5bnM6Ly9jaGF5bnNDYWxsKCcgKyBjbWQgKyAnKSc7XG5cbiAgfSBlbHNlIHtcblxuICAgIC8vIHBhcmFtcyBleGlzdCBob3dldmVyLCBpdCBpcyBubyBhcnJheVxuICAgIGlmICghaXNBcnJheShwYXJhbXMpKSB7XG4gICAgICBsb2cuZXJyb3IoJ2NoYXluc0NhbGw6IHBhcmFtcyBhcmUgbm8gQXJyYXknKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBhZGQgdGhlIHBhcmFtcyB0byB0aGUgY2hheW5zIGNhbGxcbiAgICBsZXQgY2FsbGJhY2tQcmVmaXggPSAnX2NoYXluc0NhbGxiYWNrcy4nO1xuICAgIGxldCBjYWxsU3RyaW5nID0gJyc7XG4gICAgaWYgKHBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICBsZXQgY2FsbEFyZ3MgPSBbXTtcbiAgICAgIHBhcmFtcy5mb3JFYWNoKGZ1bmN0aW9uKHBhcmFtKSB7XG4gICAgICAgIGxldCBuYW1lID0gT2JqZWN0LmtleXMocGFyYW0pWzBdO1xuICAgICAgICBsZXQgdmFsdWUgPSBwYXJhbVtuYW1lXTtcbiAgICAgICAgaWYgKG5hbWUgPT09ICdjYWxsYmFjaycpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKCdcXCcnICsgY2FsbGJhY2tQcmVmaXggKyB2YWx1ZSArICdcXCcnKTtcbiAgICAgICAgfSBlbHNlIGlmIChuYW1lID09PSAnYm9vbCcgfHwgbmFtZSA9PT0gJ0Z1bmN0aW9uJyB8fCBuYW1lID09PSAnSW50ZWdlcicpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKHZhbHVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0RlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgY2FsbEFyZ3MucHVzaCgnXFwnJyArIHZhbHVlICsgJ1xcJycpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNhbGxTdHJpbmcgPSAnLCcgKyBjYWxsQXJncy5qb2luKCcsJyk7XG4gICAgfVxuXG4gICAgLy8gYWRkIGNoYXlucyBwcm90b2NvbCBhbmQgaG9zdCBhbmQgam9pbiBhcnJheVxuICAgIHVybCA9ICdjaGF5bnM6Ly9jaGF5bnNDYWxsKCcgKyBjbWQgKyBjYWxsU3RyaW5nICsgJyknO1xuICB9XG5cbiAgbG9nLmRlYnVnKCdjaGF5bnNDYWxsOiB1cmw6ICcsIHVybCk7XG5cbiAgdHJ5IHtcbiAgICAvLyBUT0RPOiBjcmVhdGUgYW4gZWFzaWVyIGlkZW50aWZpY2F0aW9uIG9mIHRoZSByaWdodCBlbnZpcm9ubWVudFxuICAgIC8vIFRPRE86IGNvbnNpZGVyIHRvIGV4ZWN1dGUgdGhlIGJyb3dzZXIgZmFsbGJhY2sgaW4gaGVyZSBhcyB3ZWxsXG4gICAgaWYgKCdjaGF5bnNDYWxsJyBpbiB3aW5kb3cgJiYgaXNGdW5jdGlvbih3aW5kb3cuY2hheW5zQ2FsbC5ocmVmKSkge1xuICAgICAgd2luZG93LmNoYXluc0NhbGwuaHJlZih1cmwpO1xuICAgIH0gZWxzZSBpZiAoJ3dlYmtpdCcgaW4gd2luZG93XG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVyc1xuICAgICAgJiYgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMuY2hheW5zQ2FsbFxuICAgICAgJiYgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMuY2hheW5zQ2FsbC5wb3N0TWVzc2FnZSkge1xuICAgICAgd2luZG93LndlYmtpdC5tZXNzYWdlSGFuZGxlcnMuY2hheW5zQ2FsbC5wb3N0TWVzc2FnZSh1cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IHVybDtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cud2FybignY2hheW5zQ2FsbDogRXJyb3I6IGNvdWxkIG5vdCBleGVjdXRlIENoYXluc0NhbGw6ICcsIGUpO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogRXhlY3V0ZSBhIENoYXluc1dlYiBDYWxsIGluIHRoZSBwYXJlbnQgd2luZG93LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBmbiBGdW5jdGlvbiBuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1zIEFkZGl0aW9uYWxcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGNoYXluc1dlYmJDYWxsIHN1Y2NlZWRlZFxuICovXG5mdW5jdGlvbiBjaGF5bnNXZWJDYWxsKGZuLCBwYXJhbXMpIHtcbiAgaWYgKCFmbikge1xuICAgIGxvZy5pbmZvKCdjaGF5bnNXZWJDYWxsOiBubyBDaGF5bnNXZWJDYWxsIGZuJyk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgaWYgKCFwYXJhbXMgfHwgaXNBcnJheShwYXJhbXMpKSB7IC8vIEFycmF5IGluZGljYXRlcyB0aGF0IHRoZXNlIGFyZSBjaGF5bnNDYWxscyBwYXJhbXMgVE9ETzogcmVmYWN0b3JcbiAgICBwYXJhbXMgPSAnJztcbiAgfVxuICBpZiAoaXNPYmplY3QocGFyYW1zKSkgeyAvLyBhbiBBcnJheSBpcyBhbHNvIHNlZW4gYXMgT2JqZWN0LCBob3dldmVyIGl0IHdpbGwgYmUgcmVzZXQgYmVmb3JlXG4gICAgcGFyYW1zID0gSlNPTi5zdHJpbmdpZnkocGFyYW1zKTtcbiAgfVxuXG4gIGlmIChpc0Z1bmN0aW9uKGZuKSkge1xuICAgIHJldHVybiBmbi5jYWxsKG51bGwpO1xuICB9XG5cbiAgdmFyIG5hbWVzcGFjZSA9ICdjaGF5bnMuY3VzdG9tVGFiLic7XG4gIHZhciB1cmwgPSBuYW1lc3BhY2UgKyBmbiArICc6JyArIHBhcmFtcztcblxuICBsb2cuZGVidWcoJ2NoYXluc1dhYkNhbGw6ICcgKyB1cmwpO1xuXG4gIHRyeSB7XG4gICAgcGFyZW50LnBvc3RNZXNzYWdlKHVybCwgJyonKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy53YXJuKCdjaGF5bnNXZWJDYWxsOiBwb3N0TWVzc2dhZSBmYWlsZWQnKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG4iLCIvKipcbiAqIEBtb2R1bGUgY29uZmlnXG4gKiBAcHJpdmF0ZVxuICovXG5cbmltcG9ydCB7aXNQcmVzZW50LCBpc0JsYW5rLCBpc1VuZGVmaW5lZCwgaXNBcnJheSwgZXh0ZW5kfSBmcm9tICcuLi91dGlscyc7XG5cbi8qKlxuICogU3RvcmUgaW50ZXJuYWwgY2hheW5zIGNvbmZpZ3VyYXRpb25cbiAqIEB0eXBlIHt7YXBwTmFtZTogc3RyaW5nLCBhcHBWZXJzaW9uOiBudW1iZXIsIGxvYWRNb2Rlcm5pemVyOiBib29sZWFuLCBsb2FkUG9seWZpbGxzOiBib29sZWFuLCB1c2VGZXRjaDogYm9vbGVhbiwgcHJvbWlzZXM6IHN0cmluZywgdXNlT2ZmbGluZUNhY2hpbmc6IGJvb2xlYW4sIHVzZUxvY2FsU3RvcmFnZTogYm9vbGVhbiwgaGFzQWRtaW46IGJvb2xlYW4sIG11bHRpTGluZ3VhbDogYm9vbGVhbiwgaXNQdWJsaXNoZWQ6IGJvb2xlYW4sIGRlYnVnTW9kZTogYm9vbGVhbiwgdXNlQWpheDogYm9vbGVhbn19XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgX2NvbmZpZyA9IHtcbiAgYXBwTmFtZTogJ0NoYXlucyBBcHAnLCAgIC8vIGFwcCBOYW1lXG4gIGFwcFZlcnNpb246IDEsICAgICAgICAgICAvLyBhcHAgVmVyc2lvblxuICBwcmV2ZW50RXJyb3JzOiB0cnVlLCAgICAgICAgLy8gZXJyb3IgaGFuZGxlciBjYW4gaGlkZSBlcnJvcnMgKGNhbiBiZSBvdmVyd3RpdHRlbiBieSBpc1Byb2R1Y3Rpb24pXG4gIGlzUHJvZHVjdGlvbjogdHJ1ZSwgICAgICAvLyBwcm9kdWN0aW9uLCBkZXZlbG9wbWVudCBhbmQgdGVzdCBFTlZcbiAgbG9hZE1vZGVybml6ZXI6IHRydWUsICAgIC8vIGxvYWQgbW9kZXJuaXplclxuICBsb2FkUG9seWZpbGxzOiB0cnVlLCAgICAgLy8gbG9hZCBwb2x5ZmlsbHNcbiAgdXNlRmV0Y2g6IHRydWUsICAgICAgICAgIC8vIHVzZSB3aW5kb3cuZmV0Y2ggYW5kIGl0J3MgcG9seWZpbGxzXG4gIHByb21pc2VzOiAncScsICAgICAgICAgICAvLyBwcm9taXNlIFNlcnZpY2U6IFEgaXMgc3RhbmRhcmRcbiAgdXNlT2ZmbGluZUNhY2hpbmc6IGZhbHNlLC8vIGlzIG9mZmxpbmUgY2FjaGluZyB1c2VkPyBpbmxjdWRlIG9mZmxpbmUgaGVscGVyXG4gIHVzZUxvY2FsU3RvcmFnZTogZmFsc2UsICAvLyBpcyBsb2NhbFN0b3JhZ2UgdXNlZD8gaW5jbHVkZSBoZWxwZXJcbiAgaGFzQWRtaW46IGZhbHNlLCAgICAgICAgIC8vIGRvZXMgdGhpcyBhcHAvcGFnZSBoYXZlIGFuIGFkbWluP1xuICBtdWx0aUxpbmd1YWw6IHRydWUsICAgICAgLy8gZW5hYmxlIGkxOG4/XG4gIGlzUHVibGlzaGVkOiB0cnVlLCAgICAgICAvLyBvbmx5IGluIGludGVybmFsIHRvYml0IGF2YWlsYWJsZVxuICBkZWJ1Z01vZGU6IHRydWUsICAgICAgICAgLy8gc2hvdyBjb25zb2xlIG91dHB1dCwgZGVidWcgcGFyYW0gZm9yIGxvZ2dpbmdcbiAgdXNlQWpheDogZmFsc2UsXG4gIGlzSW50ZXJuYWw6IGZhbHNlICAgICAgICAvLyB1c2UgaW50ZXJuYWwgcm91dGluZ1xuICAvL2ZyYW1ld29yazogWydFbWJlcicsICdBbmd1bGFyJywgJ0JhY2tib25lJywgJ0FtcGVyc2FuZCcsICdSZWFjdCcsICdqUXVlcnknXVxufTtcblxuLy8gVE9ETzogcmVtb3ZlXG4vKmV4cG9ydCBmdW5jdGlvbiBjb25maWcoKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIENvbmZpZy5zZXQoYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pOyAvLyBUT0RPOiByZWZhY3RvciB0aGlzXG4gIH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBDb25maWcuZ2V0KGFyZ3VtZW50cyk7XG4gIH1cbiAgcmV0dXJuIENvbmZpZy5nZXQoKTtcbn0qL1xuXG4vLyBUT0RPOiByZWZhY3RvciB0byBNYXBcbmV4cG9ydCBjbGFzcyBDb25maWcge1xuXG4gIC8qKlxuICAgKiBAbWV0aG9kIGdldFxuICAgKiBAY2xhc3MgQ29uZmlnXG4gICAqIEBtb2R1bGUgY2hheW5zLmNvbmZpZ1xuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFJlZmVyZW5jZSB0aGUgYGtleWAgaW4gdGhlIGNvbmZpZyBgT2JqZWN0YFxuICAgKiBAcmV0dXJucyB7bnVsbH0gVmFsdWUgb2YgdGhlIGBrZXlgIGluIHRoZSBjb25maWcgYE9iamVjdGBcbiAgICogICAgICAgICAgICAgICAgIGB1bmRlZmluZWRgIGlmIHRoZSBga2V5YCB3YXMgbm90IGZvdW5kXG4gICAqL1xuICBzdGF0aWMgZ2V0KGtleSkge1xuICAgIGlmIChpc1ByZXNlbnQoa2V5KSkge1xuICAgICAgcmV0dXJuIF9jb25maWdba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEBwYXJhbSB2YWx1ZVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHN0YXRpYyBzZXQoa2V5LCB2YWx1ZSkge1xuICAgIGlmIChpc0JsYW5rKGtleSkgfHwgaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIFRPRE86IGdvb2QgaWRlYT8gb25lIHNob3VsZCBiZSBjYXJlZnVsIGkgc3VwcG9zZVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgZXh0ZW5kKF9jb25maWcsIHZhbHVlKTtcbiAgICB9XG4gICAgX2NvbmZpZ1trZXldID0gdmFsdWU7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGtleVxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIHN0YXRpYyBoYXMoa2V5KSB7XG4gICAgcmV0dXJuICEha2V5ICYmIChrZXkgaW4gX2NvbmZpZyk7XG4gIH1cbn1cbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc09iamVjdCwgRE9NfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge0NvbmZpZ30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHttZXNzYWdlTGlzdGVuZXJ9IGZyb20gJy4vY2FsbGJhY2tzJztcbmltcG9ydCB7Y2hheW5zQXBpSW50ZXJmYWNlfSBmcm9tICcuL2NoYXluc19hcGlfaW50ZXJmYWNlJztcbmltcG9ydCB7ZW52aXJvbm1lbnQsIHNldEVudn0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5cbi8vIGNyZWF0ZSBuZXcgTG9nZ2VyIGluc3RhbmNlXG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY29yZScpO1xuXG4vLyBlbmFibGUgSlMgRXJyb3JzIGluIHRoZSBjb25zb2xlXG5Db25maWcuc2V0KCdwcmV2ZW50RXJyb3JzJywgZmFsc2UpO1xuXG52YXIgZG9tUmVhZHlQcm9taXNlO1xudmFyIGNoYXluc1JlYWR5UHJvbWlzZTtcblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMucHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyKGNvbmZpZykge1xuICBsb2cuaW5mbygnY2hheW5zLnJlZ2lzdGVyJyk7XG4gIENvbmZpZy5zZXQoY29uZmlnKTsgLy8gdGhpcyByZWZlcmVuY2UgdG8gdGhlIGNoYXlucyBvYmpcbiAgcmV0dXJuIHRoaXM7XG59XG5cbi8vIFRPRE86IHJlZ2lzdGVyIGBGdW5jdGlvbmAgb3IgcHJlQ2hheW5zIGBPYmplY3RgP1xuZXhwb3J0IGZ1bmN0aW9uIHByZUNoYXlucygpIHtcbiAgaWYgKCdwcmVDaGF5bnMnIGluIHdpbmRvdyAmJiBpc09iamVjdCh3aW5kb3cucHJlQ2hheW5zKSkge1xuICAgIE9iamVjdC5rZXlzKHdpbmRvdy5wcmVDaGF5bnMpLmZvckVhY2goZnVuY3Rpb24oc2V0dGluZykge1xuICAgICAgbG9nLmRlYnVnKCdwcmUgY2hheW5zOiAnLCBzZXR0aW5nKTtcbiAgICB9KTtcbiAgfVxufVxuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5wcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZHkoKSB7XG4gIGxvZy5kZWJ1ZygnY2hheW5zLnJlYWR5KCknKTtcbiAgcmV0dXJuIGNoYXluc1JlYWR5UHJvbWlzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSBwcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0gb2JqIFJlZmVyZW5jZSB0byBjaGF5bnMgT2JqZWN0XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwKCkge1xuICBsb2cuaW5mbygnc3RhcnQgY2hheW5zIHNldHVwJyk7XG5cbiAgLy8gZW5hYmxlIGBjaGF5bnMuY3NzYCBieSBhZGRpbmcgYGNoYXluc2AgY2xhc3NcbiAgLy8gcmVtb3ZlIGBuby1qc2AgY2xhc3MgYW5kIGFkZCBganNgIGNsYXNzXG4gIGxldCBib2R5ID0gZG9jdW1lbnQuYm9keTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdjaGF5bnMnKTtcbiAgRE9NLmFkZENsYXNzKGJvZHksICdqcycpO1xuICBET00ucmVtb3ZlQ2xhc3MoYm9keSwgJ25vLWpzJyk7XG5cblxuICAvLyBydW4gcG9seWZpbGwgKGlmIHJlcXVpcmVkKVxuXG4gIC8vIHJ1biBtb2Rlcm5pemVyIChmZWF0dXJlIGRldGVjdGlvbilcblxuICAvLyBydW4gZmFzdGNsaWNrXG5cbiAgLy8gKHZpZXdwb3J0IHNldHVwKVxuXG4gIC8vIGNyYXRlIG1ldGEgdGFncyAoY29sb3JzLCBtb2JpbGUgaWNvbnMgZXRjKVxuXG4gIC8vIGRvIHNvbWUgU0VPIHN0dWZmIChjYW5vbmljYWwgZXRjKVxuXG4gIC8vIGRldGVjdCB1c2VyIChsb2dnZWQgaW4/KVxuXG4gIC8vIHJ1biBjaGF5bnMgc2V0dXAgKGNvbG9ycyBiYXNlZCBvbiBlbnZpcm9ubWVudClcblxuICAvLyBET00gIHJlYWR5IHByb21pc2VcbiAgZG9tUmVhZHlQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnKSB7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkb21SZWFkeSA9IGZ1bmN0aW9uIGRvbVJlYWR5KCkge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZG9tUmVhZHksIHRydWUpO1xuICAgICAgfTtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZG9tUmVhZHksIHRydWUpO1xuICAgIH1cbiAgfSlcbiAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgLy8gRE9NIHJlYWR5IGFjdGlvbnNcbiAgICBsb2cuZGVidWcoJ0RPTSByZWFkeScpOyAvLyBUT0RPOiBhY3R1YWxseSB3ZSBjYW4gcmVtb3ZlIHRoaXNcbiAgICAvLyBkb20tcmVhZHkgY2xhc3NcbiAgICBET00uYWRkQ2xhc3MoYm9keSwgJ2RvbS1yZWFkeScpO1xuICAgIC8vIHN0YXJ0IHdpbmRvdy5vbignbWVzc2FnZScpIGxpc3RlbmVyIGZvciBpRnJhbWUgQ29tbXVuaWNhdGlvblxuICAgIG1lc3NhZ2VMaXN0ZW5lcigpO1xuXG4gICAgLy8gcmVzaXplIGxpc3RlbmVyXG4gICAgbGV0IGhlaWdodENhY2hlO1xuICAgIGlmIChlbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3ApIHtcbiAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCByZXNpemVIYW5kbGVyKTtcbiAgICAgIC8vIFRPRE86IGlzIHRoZXJlIGFueSBhbHRlcm5hdGl2ZSB0byB0aGUgRE9NU3VidHJlZSBldmVudD9cbiAgICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcignRE9NU3VidHJlZU1vZGlmaWVkJywgcmVzaXplSGFuZGxlci5iaW5kKHRydWUpKTtcbiAgICAgIGNoYXluc0FwaUludGVyZmFjZS5zZXRGaXhlZEhlaWdodCgpOyAvLyBkZWZhdWx0IHZhbHVlIGlzIDUwMFxuICAgICAgcmVzaXplSGFuZGxlcigpO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZXNpemVIYW5kbGVyKGlzRG9tTW9kKSB7XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuICAgICAgICBsb2cuZGVidWcoaXNEb21Nb2QgPyAnRE9NU3VidHJlZU1vZGlmaWVkJyA6ICdyZXNpemUnKTtcbiAgICAgICAgaWYgKGhlaWdodENhY2hlID09PSBkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBoZWlnaHRDYWNoZSA9IGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0O1xuICAgICAgICBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0SGVpZ2h0KCk7XG4gICAgICB9LCB0cnVlKTtcbiAgICB9XG5cbiAgfSk7XG5cbiAgLy8gY2hheW5zUmVhZHkgUHJvbWlzZVxuICBjaGF5bnNSZWFkeVByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAvLyBnZXQgdGhlIEFwcCBJbmZvcm1hdGlvbiAoVE9ETzogaGFzIHRvIGJlIGRvbmUgd2hlbiBkb2N1bWVudCByZWFkeT8pXG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoKS50aGVuKGZ1bmN0aW9uIHJlc29sdmVkKGRhdGEpIHtcblxuICAgICAgLy8gbm93IENoYXlucyBpcyBvZmZpY2lhbGx5IHJlYWR5XG4gICAgICAvLyBmaXJzdCBzZXQgYWxsIGVudiBzdHVmZlxuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdUaGVyZSBpcyBubyBhcHAgRGF0YScpKTtcbiAgICAgIH1cblxuICAgICAgbG9nLmRlYnVnKCdhcHBJbmZvcm1hdGlvbiBjYWxsYmFjaycsIGRhdGEpO1xuXG4gICAgICAvLyBzdG9yZSByZWNlaXZlZCBpbmZvcm1hdGlvblxuICAgICAgaWYgKGlzT2JqZWN0KGRhdGEuQXBwSW5mbykpIHtcbiAgICAgICAgbGV0IGFwcEluZm8gPSBkYXRhLkFwcEluZm87XG4gICAgICAgIGxldCBzaXRlID0ge1xuICAgICAgICAgIHNpdGVJZDogYXBwSW5mby5TaXRlSUQsXG4gICAgICAgICAgdGl0bGU6IGFwcEluZm8uVGl0bGUsXG4gICAgICAgICAgdGFwcHM6IGFwcEluZm8uVGFwcHMsXG4gICAgICAgICAgZmFjZWJvb2tBcHBJZDogYXBwSW5mby5GYWNlYm9va0FwcElELFxuICAgICAgICAgIGZhY2Vib29rUGFnZUlkOiBhcHBJbmZvLkZhY2Vib29rUGFnZUlELFxuICAgICAgICAgIGNvbG9yU2NoZW1lOiBhcHBJbmZvLkNvbG9yU2NoZW1lIHx8IGVudmlyb25tZW50LnNpdGUuY29sb3JTY2hlbWUgfHwgMCxcbiAgICAgICAgICB2ZXJzaW9uOiBhcHBJbmZvLlZlcnNpb24sXG4gICAgICAgICAgdGFwcDogYXBwSW5mby5UYXBwU2VsZWN0ZWRcbiAgICAgICAgfTtcbiAgICAgICAgc2V0RW52KCdzaXRlJywgc2l0ZSk7XG4gICAgICB9XG4gICAgICBpZiAoaXNPYmplY3QoZGF0YS5BcHBVc2VyKSkge1xuICAgICAgICBsZXQgYXBwVXNlciA9IGRhdGEuQXBwVXNlcjtcbiAgICAgICAgbGV0IHVzZXIgPSB7XG4gICAgICAgICAgbmFtZTogYXBwVXNlci5GYWNlYm9va1VzZXJOYW1lLFxuICAgICAgICAgIGlkOiBhcHBVc2VyLlRvYml0VXNlcklELFxuICAgICAgICAgIGZhY2Vib29rSWQ6IGFwcFVzZXIuRmFjZWJvb2tJRCxcbiAgICAgICAgICBwZXJzb25JZDogYXBwVXNlci5QZXJzb25JRCxcbiAgICAgICAgICBhY2Nlc3NUb2tlbjogYXBwVXNlci5Ub2JpdEFjY2Vzc1Rva2VuLFxuICAgICAgICAgIGZhY2Vib29rQWNjZXNzVG9rZW46IGFwcFVzZXIuRmFjZWJvb2tBY2Nlc3NUb2tlbixcbiAgICAgICAgICBncm91cHM6IGFwcFVzZXIuVUFDR3JvdXBzXG4gICAgICAgIH07XG4gICAgICAgIHNldEVudigndXNlcicsIHVzZXIpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGRhdGEuRGV2aWNlKSkge1xuICAgICAgICBsZXQgZGV2aWNlID0gZGF0YS5EZXZpY2U7XG4gICAgICAgIGxldCBhcHAgPSB7XG4gICAgICAgICAgbGFuZ3VhZ2VJZDogZGV2aWNlLkxhbmd1YWdlSUQsXG4gICAgICAgICAgbW9kZWw6IGRldmljZS5Nb2RlbCxcbiAgICAgICAgICBuYW1lOiBkZXZpY2UuU3lzdGVtTmFtZSxcbiAgICAgICAgICB2ZXJzaW9uOiBkZXZpY2UuU3lzdGVtVmVyc2lvbixcbiAgICAgICAgICB1aWQ6IGRldmljZS5VSUQsIC8vIFRPRE8gdXVpZD8gaXMgaXQgZXZlbiB1c2VkP1xuICAgICAgICAgIG1ldHJpY3M6IGRldmljZS5NZXRyaWNzIC8vIFRPRE86IHVzZWQ/XG4gICAgICAgIH07XG4gICAgICAgIHNldEVudignYXBwJywgYXBwKTtcbiAgICAgIH1cblxuICAgICAgLy8gZG9uJ3Qgd29ycnkgdGhpcyBpcyBubyB2MiB0aGluZ1xuICAgICAgY3NzU2V0dXAoKTtcbiAgICAgIGxvZy5pbmZvKCdmaW5pc2hlZCBjaGF5bnMgc2V0dXAnKTtcblxuICAgICAgLy8gVE9ETzogY3JlYXRlIGN1c3RvbSBtb2RlbD9cbiAgICAgIHJlc29sdmUoZGF0YSk7XG5cbiAgICB9LCBmdW5jdGlvbiByZWplY3RlZCgpIHtcbiAgICAgIGxvZy5kZWJ1ZygnRXJyb3I6IFRoZSBBcHAgSW5mb3JtYXRpb24gY291bGQgbm90IGJlIHJlY2VpdmVkLicpO1xuICAgICAgcmVqZWN0KCdUaGUgQXBwIEluZm9ybWF0aW9uIGNvdWxkIG5vdCBiZSByZWNlaXZlZC4nKTtcbiAgICAgIC8vcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignVGhlIEFwcCBJbmZvcm1hdGlvbiBjb3VsZCBub3QgYmUgcmVjZWl2ZWQuJykpO1xuICAgIH0pO1xuXG4gIH0pO1xuXG59XG5cblxuLyoqXG4gKiBBZGRzIHZlbmRvciBjbGFzc2VzIHRvIHRoZSBib2R5IGluIG9yZGVyIHRvIHNob3cgdGhhdCBjaGF5bnMgaXMgcmVhZHlcbiAqIGFuZCB3aGljaCBPUywgQnJvd3NlciBhbmQgQ29sb3JTY2hlbWUgc2hvdWxkIGJlIGFwcGxpZWQuXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGludm9rZWQgd2hlbiB0aGUgRE9NIGFuZCBDaGF5bnMgaXMgcmVhZHkuXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gY3NzU2V0dXAoKSB7XG4gIGxldCBodG1sID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBsZXQgc3VmZml4ID0gJ2NoYXlucy0nO1xuXG4gIC8vIGFkZCB2ZW5kb3IgY2xhc3NlcyAoT1MsIEJyb3dzZXIsIENvbG9yU2NoZW1lKVxuICBET00uYWRkQ2xhc3MoaHRtbCwgc3VmZml4ICsgJ29zLS0nICsgZW52aXJvbm1lbnQub3MpO1xuICBET00uYWRkQ2xhc3MoaHRtbCwgc3VmZml4ICsgJ2Jyb3dzZXItLScgKyBlbnZpcm9ubWVudC5icm93c2VyKTtcbiAgRE9NLmFkZENsYXNzKGh0bWwsIHN1ZmZpeCArICdjb2xvci0tJyArIGVudmlyb25tZW50LnNpdGUuY29sb3JTY2hlbWUpO1xuXG4gIC8vIEVudmlyb25tZW50XG4gIGlmIChlbnZpcm9ubWVudC5pc0NoYXluc1dlYikge1xuICAgIERPTS5hZGRDbGFzcyhodG1sLCBzdWZmaXggKyAnLScgKyAnd2ViJyk7XG4gIH1cbiAgaWYgKGVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlKSB7XG4gICAgRE9NLmFkZENsYXNzKGh0bWwsIHN1ZmZpeCArICctJyArICdtb2JpbGUnKTtcbiAgfVxuICBpZiAoZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wKSB7XG4gICAgRE9NLmFkZENsYXNzKGh0bWwsIHN1ZmZpeCArICctJyArICdkZXNrdG9wJyk7XG4gIH1cbiAgaWYgKGVudmlyb25tZW50LmlzQXBwKSB7XG4gICAgRE9NLmFkZENsYXNzKGh0bWwsIHN1ZmZpeCArICctJyArICdhcHAnKTtcbiAgfVxuICBpZiAoZW52aXJvbm1lbnQuaXNJbkZyYW1lKSB7XG4gICAgRE9NLmFkZENsYXNzKGh0bWwsIHN1ZmZpeCArICctJyArICdmcmFtZScpO1xuICB9XG5cbiAgLy8gYWRkIGNoYXlucyByb290IGVsZW1lbnRcbiAgbGV0IGNoYXluc1Jvb3QgPSBET00uY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIGNoYXluc1Jvb3Quc2V0QXR0cmlidXRlKCdpZCcsICdjaGF5bnMtcm9vdCcpO1xuICBjaGF5bnNSb290LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2hheW5zX19yb290Jyk7XG4gIERPTS5hcHBlbmRDaGlsZChkb2N1bWVudC5ib2R5LCBjaGF5bnNSb290KTtcblxuICAvLyBjaGF5bnMgaXMgcmVhZHlcbiAgRE9NLmFkZENsYXNzKGh0bWwsICdjaGF5bnMtcmVhZHknKTtcbiAgRE9NLnJlbW92ZUF0dHJpYnV0ZShET00ucXVlcnkoJ1tjaGF5bnMtY2xvYWtdJyksICdjaGF5bnMtY2xvYWsnKTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBjaGF5bnMuZW52aXJvbm1lbnRcbiAqIEBkZXNjcmlwdGlvblxuICogQ2hheW5zIEVudmlyb25tZW50XG4gKi9cblxuaW1wb3J0IHtnZXRMb2dnZXIsIGV4dGVuZH0gZnJvbSAnLi4vdXRpbHMnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVudmlyb25tZW50Jyk7XG5cbi8vIFRPRE86IGltcG9ydCBkZXBlbmRlbmNpZXNcbnZhciB0eXBlcyA9IHt9O1xuXG50eXBlcy5icm93c2VyID0gW1xuICAnY2hyb21lJyxcbiAgJ2ZpcmVmb3gnLFxuICAnc2FmYXJpJyxcbiAgJ29wZXJhJyxcbiAgJ2Nocm9tZSBtb2JpbGUnLFxuICAnc2FmYXJpIG1vYmlsZScsXG4gICdmaXJlZm94IG1vYmlsZSdcbl07XG5cbnR5cGVzLm9zID0gW1xuICAnd2luZG93cycsXG4gICdtYWNPUycsXG4gICdhbmRyb2lkJyxcbiAgJ2lvcycsXG4gICd3cCdcbl07XG5cbnR5cGVzLmNoYXluc09TID0ge1xuICB3ZWI6ICd3ZWJzaGFkb3cnLFxuICB3ZWJNb2JpbGU6ICd3ZWJzaGFkb3dtb2JpbGUnLFxuICBhcHA6ICd3ZWJzaGFkb3dtb2JpbGUnXG59O1xuXG4vLyBUT0RPOiBoaWRlIGludGVybmFsIHBhcmFtZXRlcnMgZnJvbSB0aGUgb3RoZXJzXG4vLyBUT0RPOiBvZmZlciB1c2VyIGFuIGBPYmplY3RgIHdpdGggVVJMIFBhcmFtZXRlcnNcbi8vIGxvY2F0aW9uIHF1ZXJ5IHN0cmluZ1xudmFyIHF1ZXJ5ID0gbG9jYXRpb24uc2VhcmNoLnN1YnN0cigxKTtcbnZhciBwYXJhbWV0ZXJzID0ge307XG5xdWVyeS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24ocGFydCkge1xuICB2YXIgaXRlbSA9IHBhcnQuc3BsaXQoJz0nKTtcbiAgcGFyYW1ldGVyc1tpdGVtWzBdLnRvTG93ZXJDYXNlKCldID0gZGVjb2RlVVJJQ29tcG9uZW50KGl0ZW1bMV0pLnRvTG93ZXJDYXNlKCk7XG59KTtcblxuLy8gdmVyaWZ5IGJ5IGNoYXlucyByZXF1aXJlZCBwYXJhbWV0ZXJzIGV4aXN0XG5pZiAoIXBhcmFtZXRlcnMuYXBwdmVyc2lvbikge1xuICBsb2cud2Fybignbm8gYXBwIHZlcnNpb24gcGFyYW1ldGVyJyk7XG59XG5pZiAoIXBhcmFtZXRlcnMub3MpIHtcbiAgbG9nLndhcm4oJ25vIG9zIHBhcmFtZXRlcicpO1xufVxuXG5sZXQgZGVidWdNb2RlID0gISFwYXJhbWV0ZXJzLmRlYnVnO1xuXG4vLyBUT0RPOiBmdXJ0aGVyIHBhcmFtcyBhbmQgY29sb3JzY2hlbWVcbi8vIFRPRE86IGRpc2N1c3Mgcm9sZSBvZiBVUkwgcGFyYW1zIGFuZCB0cnkgdG8gcmVwbGFjZSB0aGVtIGFuZCBvbmx5IHVzZSBBcHBEYXRhXG5cblxuLy9mdW5jdGlvbiBnZXRGaXJzdE1hdGNoKHJlZ2V4KSB7XG4vLyAgdmFyIG1hdGNoID0gdWEubWF0Y2gocmVnZXgpO1xuLy8gIHJldHVybiAobWF0Y2ggJiYgbWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaFsxXSkgfHwgJyc7XG4vL31cblxuLy8gdXNlciBhZ2VudCBkZXRlY3Rpb25cbnZhciB1c2VyQWdlbnQgPSAod2luZG93Lm5hdmlnYXRvciAmJiBuYXZpZ2F0b3IudXNlckFnZW50KSB8fCAnJztcblxudmFyIGlzID0ge1xuICBpb3M6IC9pUGhvbmV8aVBhZHxpUG9kL2kudGVzdCh1c2VyQWdlbnQpLFxuICBhbmRyb2lkOiAvQW5kcm9pZC9pLnRlc3QodXNlckFnZW50KSxcbiAgd3A6IC93aW5kb3dzIHBob25lL2kudGVzdCh1c2VyQWdlbnQpLFxuICBiYjogL0JsYWNrQmVycnl8QkIxMHxSSU0vaS50ZXN0KHVzZXJBZ2VudCksXG5cbiAgb3BlcmE6ICghIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMCksXG4gIGZpcmVmb3g6ICh0eXBlb2YgSW5zdGFsbFRyaWdnZXIgIT09ICd1bmRlZmluZWQnKSxcbiAgc2FmYXJpOiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5IVE1MRWxlbWVudCkuaW5kZXhPZignQ29uc3RydWN0b3InKSA+IDApLFxuICBjaHJvbWU6ICghIXdpbmRvdy5jaHJvbWUgJiYgISghIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMCkpLFxuICBpZTogZmFsc2UgfHwgISFkb2N1bWVudC5kb2N1bWVudE1vZGUsXG4gIGllMTE6IC9tc2llIDExL2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTEwOiAvbXNpZSAxMC9pLnRlc3QodXNlckFnZW50KSxcbiAgaWU5OiAvbXNpZSA5L2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTg6IC9tc2llIDgvaS50ZXN0KHVzZXJBZ2VudCksXG5cbiAgbW9iaWxlOiAvKGlwaG9uZXxpcG9kfCgoPzphbmRyb2lkKT8uKj9tb2JpbGUpfGJsYWNrYmVycnl8bm9raWEpL2kudGVzdCh1c2VyQWdlbnQpLFxuICB0YWJsZXQ6IC8oaXBhZHxhbmRyb2lkKD8hLiptb2JpbGUpfHRhYmxldCkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGtpbmRsZTogL1xcVyhraW5kbGV8c2lsaylcXFcvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHR2OiAvZ29vZ2xldHZ8c29ueWR0di9pLnRlc3QodXNlckFnZW50KVxufTtcblxuLy8gVE9ETzogQnJvd3NlciBWZXJzaW9uIGFuZCBPUyBWZXJzaW9uIGRldGVjdGlvblxuXG4vLyBUT0RPOiBhZGQgZmFsbGJhY2tcbnZhciBvcmllbnRhdGlvbiA9IE1hdGguYWJzKHdpbmRvdy5vcmllbnRhdGlvbiAlIDE4MCkgPT09IDAgPyAncG9ydHJhaXQnIDogJ2xhbmRzY2FwZSc7XG52YXIgdmlld3BvcnQgPSB3aW5kb3cuaW5uZXJXaWR0aCArICd4JyArIHdpbmRvdy5pbm5lckhlaWdodDtcblxuZXhwb3J0IHZhciBlbnZpcm9ubWVudCA9IHtcblxuICBvc1ZlcnNpb246IDEsXG5cbiAgYnJvd3NlcjogJ2NjJyxcbiAgYnJvd3NlclZlcnNpb246IDFcblxufTtcblxuZW52aXJvbm1lbnQucGFyYW1ldGVycyA9IHBhcmFtZXRlcnM7IC8vIFRPRE8gc3RyaXAgJ3NlY3JldCBwYXJhbXMnXG5lbnZpcm9ubWVudC5oYXNoID0gbG9jYXRpb24uaGFzaC5zdWJzdHIoMSk7XG5cbi8vIFdBVENIIE9VVCB0aGUgT1MgaXMgc2V0IGJ5IHBhcmFtZXRlciAodW5mb3J0dW5hdGVseSlcbmVudmlyb25tZW50Lm9zID0gcGFyYW1ldGVycy5vcyB8fCAnbm9PUyc7IC8vIFRPRE86IHJlZmFjdG9yIE9TXG5pZiAoaXMubW9iaWxlICYmIFsnYW5kcm9pZCcsICdpb3MnLCAnd3AnXS5pbmRleE9mKHBhcmFtZXRlcnMub3MpICE9PSAtMSkge1xuICBwYXJhbWV0ZXJzLm9zID0gdHlwZXMuY2hheW5zT1MuYXBwO1xufVxuXG4vLyBkZXRlY3Rpb24gYnkgdXNlciBhZ2VudFxuZW52aXJvbm1lbnQuaXNJT1MgPSBpcy5pb3M7XG5lbnZpcm9ubWVudC5pc0FuZHJvaWQgPSBpcy5hbmRyb2lkO1xuZW52aXJvbm1lbnQuaXNXUCA9IGlzLndwO1xuZW52aXJvbm1lbnQuaXNCQiA9IGlzLmJiO1xuXG4vLyBUT0RPOiBtYWtlIHN1cmUgdGhhdCB0aGlzIGFsd2F5cyB3b3JrcyEgKFRTUE4sIGNyZWF0ZSBpZnJhbWUgdGVzdCBwYWdlKVxuZW52aXJvbm1lbnQuaXNJbkZyYW1lID0gKHdpbmRvdyAhPT0gd2luZG93LnRvcCk7XG5cbmVudmlyb25tZW50LmlzQXBwID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLmFwcCAmJiBpcy5tb2JpbGUgJiYgIWVudmlyb25tZW50LmlzSW5GcmFtZSk7IC8vIFRPRE86IGRvZXMgdGhpcyBhbHdheXMgd29yaz9cbmVudmlyb25tZW50LmFwcFZlcnNpb24gPSBwYXJhbWV0ZXJzLmFwcHZlcnNpb247XG5cbmVudmlyb25tZW50LmlzQnJvd3NlciA9ICFlbnZpcm9ubWVudC5pc0FwcDtcblxuZW52aXJvbm1lbnQuaXNEZXNrdG9wID0gKCFpcy5tb2JpbGUgJiYgIWlzLnRhYmxldCk7XG5cbmVudmlyb25tZW50LmlzTW9iaWxlID0gaXMubW9iaWxlO1xuZW52aXJvbm1lbnQuaXNUYWJsZXQgPSBpcy50YWJsZXQ7XG5cbmVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYk1vYmlsZSkgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wID0gKHBhcmFtZXRlcnMub3MgPT09IHR5cGVzLmNoYXluc09TLndlYikgJiYgZW52aXJvbm1lbnQuaXNJbkZyYW1lO1xuZW52aXJvbm1lbnQuaXNDaGF5bnNXZWIgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYkRlc2t0b3AgfHwgZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJNb2JpbGU7XG5cbi8vIGludGVybmFsIFRPRE86IG1ha2UgaXQgcHJpdmF0ZT9cbmVudmlyb25tZW50LmNhbkNoYXluc0NhbGwgPSBlbnZpcm9ubWVudC5pc0FwcDtcbmVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwgPSBlbnZpcm9ubWVudC5pc0NoYXluc1dlYjtcblxuZW52aXJvbm1lbnQudmlld3BvcnQgPSB2aWV3cG9ydDsgLy8gVE9ETzogdXBkYXRlIG9uIHJlc2l6ZT8gbm8sIGR1ZSBwZXJmb3JtYW5jZVxuZW52aXJvbm1lbnQub3JpZW50YXRpb24gPSBvcmllbnRhdGlvbjtcbmVudmlyb25tZW50LnJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW87XG5cbmVudmlyb25tZW50LmRlYnVnTW9kZSA9IGRlYnVnTW9kZTtcblxuZW52aXJvbm1lbnQuc2l0ZSA9IHt9O1xuZW52aXJvbm1lbnQuc2l0ZS5jb2xvclNjaGVtZSA9IHBhcmFtZXRlcnMuY29sb3JzY2hlbWU7IC8vIFRPRE86IGNoYXlucyB3ZWIgZml4XG5cbi8vZW52aXJvbm1lbnQudXNlciA9IHtcbi8vICBuYW1lOiAnUGFjYWwgV2VpbGFuZCcsXG4vLyAgZmlyc3ROYW1lOiAnUGFzY2FsJyxcbi8vICBsYXN0TmFtZTogJ1dlaWxhbmQnLFxuLy8gIHVzZXJJZDogMTIzNCxcbi8vICBmYWNlYm9va0lkOiAxMjM0NSxcbi8vICBpc0FkbWluOiB0cnVlLFxuLy8gIHVhY0dyb3VwczogW10sXG4vLyAgbGFuZ3VhZ2U6ICdkZV9ERScsXG4vLyAgdG9rZW46ICd0b2tlbicgLy8gVE9ETzogZXhjbHVkZSB0b2tlbj9cbi8vfTtcblxuXG5leHBvcnQgZnVuY3Rpb24gc2V0RW52KGtleSwgdmFsdWUpIHtcbiAgLy9leHRlbmQoZW52aXJvbm1lbnQsIHByb3ApO1xuICBlbnZpcm9ubWVudFtrZXldID0gdmFsdWU7XG59XG5cbiIsIi8qKlxuICogVGFwcCBBUEkgSW50ZXJmYWNlXG4gKiBBUEkgdG8gY29tbXVuaWNhdGUgd2l0aCB0aGUgVGFwcEFQSVxuICovXG4vKiBnbG9hYmwgZmV0Y2ggKi9cblxuaW1wb3J0IHtnZXRMb2dnZXIsIGlzUHJlc2VudCwgaXNPYmplY3QsIGlzQXJyYXksIGlzRGVmaW5lZH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtlbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG4vL2ltcG9ydCB7d2luZG93fSBmcm9tICcuLi91dGlscy9icm93c2VyJzsgLy8gZHVlIHRvIHdpbmRvdy5vcGVuIGFuZCBsb2NhdGlvbi5ocmVmXG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ3RhcHBfYXBpJyk7XG5cbmNvbnNvbGUuZGVidWcoZW52aXJvbm1lbnQsICdldm4nKTtcblxuLy8gVE9ETzogZm9yY2UgU1NMP1xubGV0IHRhcHBBcGlSb290ID0gJy8vY2hheW5zMS50b2JpdC5jb20vVGFwcEFwaS8nO1xuLy9sZXQgcmVzdWx0VHlwZSA9IHsgLy8gVE9ETzogUmVzdWx0RW51bSBpcyBub3QgdXNlZCwgY29uc2lkZXIgcmVtb3Zpbmcgb3IgYWRqdXN0aW5nIHRoZSBBUElcbi8vICBlcnJvcjogLTEsXG4vLyAgc3VjY2VzczogMFxuLy99O1xuXG5mdW5jdGlvbiBwYXJzZVVzZXIodXNlcikge1xuICByZXR1cm4ge1xuICAgIHVzZXJJZDogdXNlci5Vc2VySUQsXG4gICAgZmFjZWJvb2tJZDogdXNlci5JRCB8fCB1c2VyLkZhY2Vib29rSUQsXG4gICAgbmFtZTogdXNlci5OYW1lIHx8IHVzZXIuVXNlckZ1bGxOYW1lLFxuICAgIGZpcnN0TmFtZTogdXNlci5GaXJzdE5hbWUsXG4gICAgbGFzdE5hbWU6IHVzZXIuTGFzdG5hbWUsXG4gICAgcGljdHVyZTogJ2h0dHBzOi8vZ3JhcGguZmFjZWJvb2suY29tLycgKyB1c2VyLklEICsgJy9waWN0dXJlJyxcbiAgICBjaGF5bnNMb2dpbjogdXNlci5DaGF5bnNMb2dpblxuICB9O1xufVxuXG5mdW5jdGlvbiBwYXJzZUdyb3VwKGdyb3VwKSB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGdyb3VwLklELFxuICAgIG5hbWU6IGdyb3VwLk5hbWUsXG4gICAgc2hvd05hbWU6IGdyb3VwLlNob3dOYW1lXG4gIH07XG59XG5cbmxldCB1YWNHcm91cHNDYWNoZTtcblxuLyoqXG4gKiBAbW9kdWxlIFRhcHBBUElJbnRlcmZhY2VcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbmV4cG9ydCB2YXIgdGFwcEFwaUludGVyZmFjZSA9IHtcbiAgZ2V0SW50cm9UZXh0OiBmdW5jdGlvbiBnZXRJbnRyb1RleHQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdkZXByZWNhdGVkJyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBJbmZvXG4gICAqIFVzZXIgQmFzaWMgSW5mb3JtYXRpb25cbiAgICpcbiAgICogQHBhcmFtIG9ialxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICovXG4gIGdldFVzZXI6IGZ1bmN0aW9uIGdldFVzZXJCYXNpY0luZm8ob2JqKSB7XG4gICAgaWYgKCFvYmogfHwgIWlzT2JqZWN0KG9iaikpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ1RoZXJlIHdhcyBubyBwYXJhbWV0ZXIgT2JqZWN0JykpO1xuICAgIH1cbiAgICBsZXQgZGF0YSA9ICcnO1xuICAgIGlmIChpc1ByZXNlbnQob2JqLnVzZXJJZCkpIHtcbiAgICAgIGRhdGEgPSAnVXNlcklEPScgKyBvYmoudXNlcklkO1xuICAgIH1cbiAgICBpZiAoaXNQcmVzZW50KG9iai5mYWNlYm9va0lkKSkge1xuICAgICAgZGF0YSA9ICdGQklEPScgKyBvYmouZmFjZWJvb2tJZDtcbiAgICB9XG4gICAgaWYgKGlzUHJlc2VudChvYmoucGVyc29uSWQpKSB7XG4gICAgICBkYXRhID0gJ1BlcnNvbklEPScgKyBvYmoucGVyc29uSWQ7XG4gICAgfVxuICAgIGlmIChpc1ByZXNlbnQob2JqLmFjY2Vzc1Rva2VuKSkge1xuICAgICAgZGF0YSA9ICdBY2Nlc3NUb2tlbj0nICsgb2JqLmFjY2Vzc1Rva2VuO1xuICAgIH1cbiAgICByZXR1cm4gdGFwcEFwaSgnVXNlci9CYXNpY0luZm8/JyArIGRhdGEpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgaWYgKGlzQXJyYXkoanNvbikpIHtcbiAgICAgICAgcmV0dXJuIGpzb24ubWFwKCh1c2VyKSA9PiBwYXJzZVVzZXIodXNlcikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGpzb247XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBhbGwgdXNlcnMgb2YgYSBMb2NhdGlvbiBpZGVudGlmaWVkIGJ5IHNpdGVJZFxuICAgKlxuICAgKlxuICAgKiBAcGFyYW0gW3NpdGVJZCA9IGN1cnJlbnQgc2l0ZUlkXSBTaXRlIElkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgZ2V0TG9jYXRpb25Vc2VyczogZnVuY3Rpb24gZ2V0TG9jYXRpb25Vc2VycyhzaXRlSWQpIHtcbiAgICBpZiAoIXNpdGVJZCkge1xuICAgICAgc2l0ZUlkID0gZW52aXJvbm1lbnQuc2l0ZS5zaXRlSWQ7XG4gICAgfVxuICAgIGxldCBkYXRhID0gJz9TaXRlSUQ9JyArIHNpdGVJZDtcbiAgICByZXR1cm4gdGFwcEFwaSgnVXNlci9HZXRBbGxMb2NhdGlvblVzZXJzJyArIGRhdGEpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgcmV0dXJuIGpzb24ubWFwKCh1c2VyKSA9PiBwYXJzZVVzZXIodXNlcikpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgVUFDIEdyb3Vwc1xuICAgKlxuICAgKiBUT0RPOiByZW1vdmUgY2FjaGluZz8geWVzLCBpdCBkb2VzIG5vdCByZWFsbHkgYmVsb25nIGluIGhlcmVcbiAgICogVE9ETzogQmFja2VuZCBidWcgaHR0cDovL2NoYXluczEudG9iaXQuY29tL1RhcHBBcGkvVGFwcC9HZXRVQUNHcm91cHM/U2l0ZUlEPSBub3QgZW1wdHlcbiAgICogVE9ETzogcmVuYW1lIHRvIGdldEdyb3Vwcz8gKHVzaW5nIFVBQyBvbmx5IGludGVybmFsbHksIHRoZXJlIGFyZSBubyBvdGhlciBncm91cHMgZWl0aGVyKVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFt1cGRhdGVDYWNoZT11bmRlZmluZWRdIFRydWUgdG8gZm9yY2UgdG8gcmVjZWl2ZSBuZXcgVUFDIEdyb3Vwc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gcmVzb2x2ZSB3aXRoICBVQUMgR3JvdXBzIEFycmF5IG90aGVyd2lzZSByZWplY3Qgd2l0aCBFcnJvclxuICAgKi9cbiAgZ2V0VWFjR3JvdXBzOiBmdW5jdGlvbiBnZXRVYWNHcm91cHMoc2l0ZUlkLCB1cGRhdGVDYWNoZSkge1xuICAgIGlmICh1YWNHcm91cHNDYWNoZSAmJiAhdXBkYXRlQ2FjaGUpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodWFjR3JvdXBzQ2FjaGUpO1xuICAgIH1cbiAgICBzaXRlSWQgPSBzaXRlSWQgfHwgZW52aXJvbm1lbnQuc2l0ZS5zaXRlSWQ7XG4gICAgbGV0IGRhdGEgPSAnU2l0ZUlEPScgKyBzaXRlSWQ7XG4gICAgcmV0dXJuIHRhcHBBcGkoJ1RhcHAvR2V0VUFDR3JvdXBzPycgKyBkYXRhKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIHJldHVybiBqc29uLm1hcCgoZ3JvdXApID0+IHBhcnNlR3JvdXAoZ3JvdXApKTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVE9ETzogdXNlIHVzZXJJZCBpbnN0ZWFkIG9mIHRoZSBmYWNlYm9va0lkP1xuICAgKiBUT0RPOiByZWZhY3RvciBuYW1lPyBjYXVzZSBMb2NhdGlvbiBhbmQgU2l0ZUlkXG4gICAqIEBwYXJhbSB1c2VySWQgRmFjZWJvb2sgVXNlcklkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgaXNVc2VyQWRtaW5PZkxvY2F0aW9uOiBmdW5jdGlvbiBpc1VzZXJBZG1pbk9mTG9jYXRpb24odXNlcklkKSB7XG4gICAgaWYgKCF1c2VySWQpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChFcnJvcignTm8gdXNlcklkIHdhcyBzdXBwbGllZC4nKSk7XG4gICAgfVxuICAgIGxldCBkYXRhID0gJz9TaXRlSUQ9JyArIGVudmlyb25tZW50LnNpdGUuc2l0ZUlkICsgJyZGQklEPScgKyB1c2VySWQ7XG4gICAgcmV0dXJuIHRhcHBBcGkoJ1VzZXIvSXNVc2VyQWRtaW4nICsgZGF0YSkudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICByZXR1cm4ganNvbjtcbiAgICB9KTtcbiAgfSxcblxuICBpbnRlcmNvbToge1xuXG4gICAgLyoqXG4gICAgICogU2VuZCBtZXNzYWdlIGFzIHVzZXIgdG8gdGhlIGVudGlyZSBwYWdlLlxuICAgICAqXG4gICAgICogQHBhcmFtIG1lc3NhZ2VcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBzZW5kTWVzc2FnZUFzVXNlcjogZnVuY3Rpb24gc2VuZE1lc3NhZ2VBc1VzZXIobWVzc2FnZSkge1xuICAgICAgcmV0dXJuIHNlbmRNZXNzYWdlKHtcbiAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgdXJsOiAnSW50ZXJDb20vUGFnZSdcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIE1lc3NhZ2UgYXMgcGFnZSB0byBhIHVzZXIgaWRlbnRpZmllZCBieSBUb2JpdCBVc2VySWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqIEBwYXJhbSB1c2VySWRcbiAgICAgKiBAcmV0dXJucyB7UHJvbWlzZX1cbiAgICAgKi9cbiAgICBzZW5kTWVzc2FnZVRvVXNlcjogZnVuY3Rpb24gc2VuZE1lc3NhZ2VUb1VzZXIodXNlcklkLCBtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gc2VuZE1lc3NhZ2Uoe1xuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICB1c2VySWQ6IHVzZXJJZCxcbiAgICAgICAgdXJsOiAnSW50ZXJDb20vVXNlcidcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZW5kIG1lc3NhZ2UgYXMgcGFnZSB0byBhIHVzZXIgaWRlbnRpZmllZCBieSBGYWNlYm9vayBVc2VySWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWVzc2FnZVxuICAgICAqIEBwYXJhbSBmYWNlYm9va0lkXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgc2VuZE1lc3NhZ2VUb0ZhY2Vib29rVXNlcjogZnVuY3Rpb24gc2VuZE1lc3NhZ2VUb0ZhY2Vib29rVXNlcihmYWNlYm9va0lkLCBtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gc2VuZE1lc3NhZ2Uoe1xuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICBmYWNlYm9va0lkOiBmYWNlYm9va0lkLFxuICAgICAgICB1cmw6ICdUYXBwL1NlbmRJbnRlcmNvbU1lc3NhZ2VBc1BhZ2UnXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VuZCBtZXNzYWdlIGFzIHBhZ2UgdG8gYSBVQUMgR3JvdXAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZ3JvdXBJZFxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAgICovXG4gICAgc2VuZE1lc3NhZ2VUb0dyb3VwOiBmdW5jdGlvbiBzZW5kTWVzc2FnZVRvR3JvdXAoZ3JvdXBJZCwgbWVzc2FnZSkge1xuICAgICAgcmV0dXJuIHNlbmRNZXNzYWdlKHtcbiAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICAgICAgZ3JvdXBJZDogZ3JvdXBJZCxcbiAgICAgICAgdXJsOiAnSW50ZXJDb20vZ3JvdXAnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogU2VuZCBJbnRlcmNvbSBNZXNzYWdlXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHtQcm9taXNlfVxuICovXG4vLyBUT0RPOiByZWZhY3RvciB0byBKU09OIGluc3RlYWQgb2Ygd3d3LWZvcm0tdXJsZW5jb2RlZFxuZnVuY3Rpb24gc2VuZE1lc3NhZ2Uob2JqKSB7XG4gIGlmICghaXNPYmplY3Qob2JqKSB8fCAhb2JqLm1lc3NhZ2UgfHwgIW9iai51cmwpIHtcbiAgICBQcm9taXNlLnJlamVjdChFcnJvcignSW52YWxpZCBwYXJhbWV0ZXJzJykpO1xuICB9XG4gIGNvbnNvbGUuZGVidWcob2JqLCBlbnZpcm9ubWVudCwnYXNkZicpO1xuICBvYmouc2l0ZUlkID0gb2JqLnNpdGVJZCB8fCBlbnZpcm9ubWVudC5zaXRlLnNpdGVJZDtcbiAgb2JqLmFjY2Vzc1Rva2VuID0gb2JqLmFjY2Vzc1Rva2VuIHx8IGVudmlyb25tZW50LnVzZXIuYWNjZXNzVG9rZW47XG4gIGxldCBtYXAgPSB7XG4gICAgbWVzc2FnZTogJ01lc3NhZ2UnLFxuICAgIGFjY2Vzc1Rva2VuOiAnQWNjZXNzVG9rZW4nLFxuICAgIHVzZXJJZDogJ1VzZXJJZCcsXG4gICAgZmFjZWJvb2tJZDogJ1RvRkJJRCcsXG4gICAgZ3JvdXBJZDogJ0dyb3VwSUQnLFxuICAgIHNpdGVJZDogJ1NpdGVJRCdcbiAgfTtcbiAgbGV0IGRhdGEgPSBbXTtcbiAgT2JqZWN0LmtleXMob2JqKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmIChpc0RlZmluZWQob2JqW2tleV0pICYmIGtleSAhPT0gJ3VybCcpIHtcbiAgICAgIGRhdGEucHVzaChtYXBba2V5XSArICc9JyArICBvYmpba2V5XSk7XG4gICAgfVxuICB9KTtcbiAgbGV0IGNvbmZpZyA9IHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOCdcbiAgICB9LFxuICAgIC8vaGVhZGVyczoge1xuICAgIC8vICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIC8vICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgLy99LFxuICAgIC8vY3JlZGVudGlhbHM6ICdjb3JzJyxcbiAgICBib2R5OiBkYXRhLmpvaW4oJyYnKVxuICAgIC8vYm9keTogZGF0YVxuICB9O1xuICBsZXQgdXJsID0gdGFwcEFwaVJvb3QgKyBvYmoudXJsO1xuICBpZiAob2JqLnVybCA9PT0gJ1RhcHAvU2VuZEludGVyY29tTWVzc2FnZUFzUGFnZScpIHtcbiAgICB1cmwgKz0gJz8nICsgZGF0YS5qb2luKCcmJyk7XG4gICAgY29uZmlnID0gdW5kZWZpbmVkOyAvKntcbiAgICAgIGNyZWRlbnRpYWxzOiAnY29ycydcbiAgICB9OyovXG4gIH1cbiAgcmV0dXJuIGZldGNoKHVybCwgY29uZmlnKTtcbn1cblxuLyoqXG4gKiBUYXBwIEFQSSByZXF1ZXN0XG4gKlxuICogVE9ETzogdXNlIFBPU1QgaW5zdGVhZCBvZiBHRVRcbiAqIFRPRE86IHBvc3RpbmcgSlNPTiB3aXRoIHtjcmVkZW50aWFsczogJ2NvcnMnfVxuICogQHByaXZhdGVcbiAqIEBwYXJhbSBlbmRwb2ludFxuICogQHJldHVybnMge1Byb21pc2V9IHdpdGgganNvbiBkYXRhXG4gKi9cbmZ1bmN0aW9uIHRhcHBBcGkoZW5kcG9pbnQpIHtcbiAgbGV0IHVybCA9IHRhcHBBcGlSb290ICsgZW5kcG9pbnQ7XG4gIHJldHVybiBmZXRjaCh1cmwpXG4gICAgLnRoZW4oKHJlcykgPT4gcmVzLmpzb24oKSlcbiAgICAudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICBpZiAoanNvbi5WYWx1ZSkge1xuICAgICAgICByZXR1cm4ganNvbi5WYWx1ZTtcbiAgICAgIH0gZWxzZSBpZiAoanNvbi5EYXRhKSB7XG4gICAgICAgIHJldHVybiBqc29uLkRhdGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ganNvbjtcbiAgICAgIH1cbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iai5FcnJvcikge1xuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKG9iai5FcnJvcikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9KTtcbn1cbiIsIihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvL1xuICAvL2lmIChzZWxmLmZldGNoKSB7XG4gIC8vICByZXR1cm5cbiAgLy99XG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTmFtZShuYW1lKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgbmFtZSA9IG5hbWUudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihuYW1lLCB2YWx1ZXMpIHtcbiAgICAgICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICBzZWxmLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICBzZWxmLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgbGlzdCA9IHRoaXMubWFwW25hbWVdXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICBsaXN0ID0gW11cbiAgICAgIHRoaXMubWFwW25hbWVdID0gbGlzdFxuICAgIH1cbiAgICBsaXN0LnB1c2godmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gICAgcmV0dXJuIHZhbHVlcyA/IHZhbHVlc1swXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gfHwgW11cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBbbm9ybWFsaXplVmFsdWUodmFsdWUpXVxuICB9XG5cbiAgLy8gSW5zdGVhZCBvZiBpdGVyYWJsZSBmb3Igbm93LlxuICBIZWFkZXJzLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0aGlzLm1hcCkuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICBjYWxsYmFjayhuYW1lLCBzZWxmLm1hcFtuYW1lXSlcbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgdmFyIHN1cHBvcnQgPSB7XG4gICAgYmxvYjogJ0ZpbGVSZWFkZXInIGluIHNlbGYgJiYgJ0Jsb2InIGluIHNlbGYgJiYgKGZ1bmN0aW9uKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgbmV3IEJsb2IoKTtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICB9KSgpLFxuICAgIGZvcm1EYXRhOiAnRm9ybURhdGEnIGluIHNlbGZcbiAgfVxuXG4gIGZ1bmN0aW9uIEJvZHkoKSB7XG4gICAgdGhpcy5ib2R5VXNlZCA9IGZhbHNlXG5cbiAgICBpZiAoc3VwcG9ydC5ibG9iKSB7XG4gICAgICB0aGlzLl9pbml0Qm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlCbG9iID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoIWJvZHkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmJsb2IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyBibG9iJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBCbG9iKFt0aGlzLl9ib2R5VGV4dF0pKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuYXJyYXlCdWZmZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYmxvYigpLnRoZW4ocmVhZEJsb2JBc0FycmF5QnVmZmVyKVxuICAgICAgfVxuXG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgaWYgKHJlamVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdGVkXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5fYm9keUJsb2IpIHtcbiAgICAgICAgICByZXR1cm4gcmVhZEJsb2JBc1RleHQodGhpcy5fYm9keUJsb2IpXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fYm9keUZvcm1EYXRhKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb3VsZCBub3QgcmVhZCBGb3JtRGF0YSBib2R5IGFzIHRleHQnKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlGb3JtRGF0YSA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gJydcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICByZXR1cm4gcmVqZWN0ZWQgPyByZWplY3RlZCA6IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdCh1cmwsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIHRoaXMudXJsID0gdXJsXG5cbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gb3B0aW9ucy5jcmVkZW50aWFscyB8fCAnb21pdCdcbiAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy5tZXRob2QgPSBub3JtYWxpemVNZXRob2Qob3B0aW9ucy5tZXRob2QgfHwgJ0dFVCcpXG4gICAgdGhpcy5tb2RlID0gb3B0aW9ucy5tb2RlIHx8IG51bGxcbiAgICB0aGlzLnJlZmVycmVyID0gbnVsbFxuXG4gICAgaWYgKCh0aGlzLm1ldGhvZCA9PT0gJ0dFVCcgfHwgdGhpcy5tZXRob2QgPT09ICdIRUFEJykgJiYgb3B0aW9ucy5ib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KG9wdGlvbnMuYm9keSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29kZShib2R5KSB7XG4gICAgdmFyIGZvcm0gPSBuZXcgRm9ybURhdGEoKVxuICAgIGJvZHkudHJpbSgpLnNwbGl0KCcmJykuZm9yRWFjaChmdW5jdGlvbihieXRlcykge1xuICAgICAgaWYgKGJ5dGVzKSB7XG4gICAgICAgIHZhciBzcGxpdCA9IGJ5dGVzLnNwbGl0KCc9JylcbiAgICAgICAgdmFyIG5hbWUgPSBzcGxpdC5zaGlmdCgpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJz0nKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICBmb3JtLmFwcGVuZChkZWNvZGVVUklDb21wb25lbnQobmFtZSksIGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpXG4gICAgICB9XG4gICAgfSlcbiAgICByZXR1cm4gZm9ybVxuICB9XG5cbiAgZnVuY3Rpb24gaGVhZGVycyh4aHIpIHtcbiAgICB2YXIgaGVhZCA9IG5ldyBIZWFkZXJzKClcbiAgICB2YXIgcGFpcnMgPSB4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkudHJpbSgpLnNwbGl0KCdcXG4nKVxuICAgIHBhaXJzLmZvckVhY2goZnVuY3Rpb24oaGVhZGVyKSB7XG4gICAgICB2YXIgc3BsaXQgPSBoZWFkZXIudHJpbSgpLnNwbGl0KCc6JylcbiAgICAgIHZhciBrZXkgPSBzcGxpdC5zaGlmdCgpLnRyaW0oKVxuICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignOicpLnRyaW0oKVxuICAgICAgaGVhZC5hcHBlbmQoa2V5LCB2YWx1ZSlcbiAgICB9KVxuICAgIHJldHVybiBoZWFkXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5mZXRjaCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICBpZiAoc2VsZi5jcmVkZW50aWFscyA9PT0gJ2NvcnMnKSB7XG4gICAgICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBmdW5jdGlvbiByZXNwb25zZVVSTCgpIHtcbiAgICAgICAgaWYgKCdyZXNwb25zZVVSTCcgaW4geGhyKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5yZXNwb25zZVVSTFxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXZvaWQgc2VjdXJpdHkgd2FybmluZ3Mgb24gZ2V0UmVzcG9uc2VIZWFkZXIgd2hlbiBub3QgYWxsb3dlZCBieSBDT1JTXG4gICAgICAgIGlmICgvXlgtUmVxdWVzdC1VUkw6L20udGVzdCh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5nZXRSZXNwb25zZUhlYWRlcignWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHhoci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHN0YXR1cyA9ICh4aHIuc3RhdHVzID09PSAxMjIzKSA/IDIwNCA6IHhoci5zdGF0dXNcbiAgICAgICAgaWYgKHN0YXR1cyA8IDEwMCB8fCBzdGF0dXMgPiA1OTkpIHtcbiAgICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIHN0YXR1czogc3RhdHVzLFxuICAgICAgICAgIHN0YXR1c1RleHQ6IHhoci5zdGF0dXNUZXh0LFxuICAgICAgICAgIGhlYWRlcnM6IGhlYWRlcnMoeGhyKSxcbiAgICAgICAgICB1cmw6IHJlc3BvbnNlVVJMKClcbiAgICAgICAgfVxuICAgICAgICB2YXIgYm9keSA9ICdyZXNwb25zZScgaW4geGhyID8geGhyLnJlc3BvbnNlIDogeGhyLnJlc3BvbnNlVGV4dDtcbiAgICAgICAgcmVzb2x2ZShuZXcgUmVzcG9uc2UoYm9keSwgb3B0aW9ucykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHNlbGYubWV0aG9kLCBzZWxmLnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKCdyZXNwb25zZVR5cGUnIGluIHhociAmJiBzdXBwb3J0LmJsb2IpIHtcbiAgICAgICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdibG9iJ1xuICAgICAgfVxuXG4gICAgICBzZWxmLmhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbihuYW1lLCB2YWx1ZXMpIHtcbiAgICAgICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihuYW1lLCB2YWx1ZSlcbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIHhoci5zZW5kKHR5cGVvZiBzZWxmLl9ib2R5SW5pdCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogc2VsZi5fYm9keUluaXQpXG4gICAgfSlcbiAgfVxuXG4gIEJvZHkuY2FsbChSZXF1ZXN0LnByb3RvdHlwZSlcblxuICBmdW5jdGlvbiBSZXNwb25zZShib2R5SW5pdCwgb3B0aW9ucykge1xuICAgIGlmICghb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IHt9XG4gICAgfVxuXG4gICAgdGhpcy5faW5pdEJvZHkoYm9keUluaXQpXG4gICAgdGhpcy50eXBlID0gJ2RlZmF1bHQnXG4gICAgdGhpcy51cmwgPSBudWxsXG4gICAgdGhpcy5zdGF0dXMgPSBvcHRpb25zLnN0YXR1c1xuICAgIHRoaXMub2sgPSB0aGlzLnN0YXR1cyA+PSAyMDAgJiYgdGhpcy5zdGF0dXMgPCAzMDBcbiAgICB0aGlzLnN0YXR1c1RleHQgPSBvcHRpb25zLnN0YXR1c1RleHRcbiAgICB0aGlzLmhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnNcbiAgICB0aGlzLnVybCA9IG9wdGlvbnMudXJsIHx8ICcnXG4gIH1cblxuICBCb2R5LmNhbGwoUmVzcG9uc2UucHJvdG90eXBlKVxuXG4gIHNlbGYuSGVhZGVycyA9IEhlYWRlcnM7XG4gIHNlbGYuUmVxdWVzdCA9IFJlcXVlc3Q7XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZTtcblxuICBzZWxmLmZldGNoID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh1cmwsIG9wdGlvbnMpLmZldGNoKClcbiAgfVxuICBzZWxmLmZldGNoLnBvbHlmaWxsID0gdHJ1ZVxufSkoKTtcbiIsIi8qIVxuICogQG92ZXJ2aWV3IGVzNi1wcm9taXNlIC0gYSB0aW55IGltcGxlbWVudGF0aW9uIG9mIFByb21pc2VzL0ErLlxuICogQGNvcHlyaWdodCBDb3B5cmlnaHQgKGMpIDIwMTQgWWVodWRhIEthdHosIFRvbSBEYWxlLCBTdGVmYW4gUGVubmVyIGFuZCBjb250cmlidXRvcnMgKENvbnZlcnNpb24gdG8gRVM2IEFQSSBieSBKYWtlIEFyY2hpYmFsZClcbiAqIEBsaWNlbnNlICAgTGljZW5zZWQgdW5kZXIgTUlUIGxpY2Vuc2VcbiAqICAgICAgICAgICAgU2VlIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9qYWtlYXJjaGliYWxkL2VzNi1wcm9taXNlL21hc3Rlci9MSUNFTlNFXG4gKiBAdmVyc2lvbiAgIDIuMC4wXG4gKi9cblxuKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihhLGIpe25bbF09YTtuW2wrMV09YjtsKz0yOzI9PT1sJiZBKCl9ZnVuY3Rpb24gcyhhKXtyZXR1cm5cImZ1bmN0aW9uXCI9PT10eXBlb2YgYX1mdW5jdGlvbiBGKCl7cmV0dXJuIGZ1bmN0aW9uKCl7cHJvY2Vzcy5uZXh0VGljayh0KX19ZnVuY3Rpb24gRygpe3ZhciBhPTAsYj1uZXcgQih0KSxjPWRvY3VtZW50LmNyZWF0ZVRleHROb2RlKFwiXCIpO2Iub2JzZXJ2ZShjLHtjaGFyYWN0ZXJEYXRhOiEwfSk7cmV0dXJuIGZ1bmN0aW9uKCl7Yy5kYXRhPWE9KythJTJ9fWZ1bmN0aW9uIEgoKXt2YXIgYT1uZXcgTWVzc2FnZUNoYW5uZWw7YS5wb3J0MS5vbm1lc3NhZ2U9dDtyZXR1cm4gZnVuY3Rpb24oKXthLnBvcnQyLnBvc3RNZXNzYWdlKDApfX1mdW5jdGlvbiBJKCl7cmV0dXJuIGZ1bmN0aW9uKCl7c2V0VGltZW91dCh0LDEpfX1mdW5jdGlvbiB0KCl7Zm9yKHZhciBhPTA7YTxsO2ErPTIpKDAsblthXSkoblthKzFdKSxuW2FdPXZvaWQgMCxuW2ErMV09dm9pZCAwO1xubD0wfWZ1bmN0aW9uIHAoKXt9ZnVuY3Rpb24gSihhLGIsYyxkKXt0cnl7YS5jYWxsKGIsYyxkKX1jYXRjaChlKXtyZXR1cm4gZX19ZnVuY3Rpb24gSyhhLGIsYyl7cihmdW5jdGlvbihhKXt2YXIgZT0hMSxmPUooYyxiLGZ1bmN0aW9uKGMpe2V8fChlPSEwLGIhPT1jP3EoYSxjKTptKGEsYykpfSxmdW5jdGlvbihiKXtlfHwoZT0hMCxnKGEsYikpfSk7IWUmJmYmJihlPSEwLGcoYSxmKSl9LGEpfWZ1bmN0aW9uIEwoYSxiKXsxPT09Yi5hP20oYSxiLmIpOjI9PT1hLmE/ZyhhLGIuYik6dShiLHZvaWQgMCxmdW5jdGlvbihiKXtxKGEsYil9LGZ1bmN0aW9uKGIpe2coYSxiKX0pfWZ1bmN0aW9uIHEoYSxiKXtpZihhPT09YilnKGEsbmV3IFR5cGVFcnJvcihcIllvdSBjYW5ub3QgcmVzb2x2ZSBhIHByb21pc2Ugd2l0aCBpdHNlbGZcIikpO2Vsc2UgaWYoXCJmdW5jdGlvblwiPT09dHlwZW9mIGJ8fFwib2JqZWN0XCI9PT10eXBlb2YgYiYmbnVsbCE9PWIpaWYoYi5jb25zdHJ1Y3Rvcj09PWEuY29uc3RydWN0b3IpTChhLFxuYik7ZWxzZXt2YXIgYzt0cnl7Yz1iLnRoZW59Y2F0Y2goZCl7di5lcnJvcj1kLGM9dn1jPT09dj9nKGEsdi5lcnJvcik6dm9pZCAwPT09Yz9tKGEsYik6cyhjKT9LKGEsYixjKTptKGEsYil9ZWxzZSBtKGEsYil9ZnVuY3Rpb24gTShhKXthLmYmJmEuZihhLmIpO3goYSl9ZnVuY3Rpb24gbShhLGIpe3ZvaWQgMD09PWEuYSYmKGEuYj1iLGEuYT0xLDAhPT1hLmUubGVuZ3RoJiZyKHgsYSkpfWZ1bmN0aW9uIGcoYSxiKXt2b2lkIDA9PT1hLmEmJihhLmE9MixhLmI9YixyKE0sYSkpfWZ1bmN0aW9uIHUoYSxiLGMsZCl7dmFyIGU9YS5lLGY9ZS5sZW5ndGg7YS5mPW51bGw7ZVtmXT1iO2VbZisxXT1jO2VbZisyXT1kOzA9PT1mJiZhLmEmJnIoeCxhKX1mdW5jdGlvbiB4KGEpe3ZhciBiPWEuZSxjPWEuYTtpZigwIT09Yi5sZW5ndGgpe2Zvcih2YXIgZCxlLGY9YS5iLGc9MDtnPGIubGVuZ3RoO2crPTMpZD1iW2ddLGU9YltnK2NdLGQ/QyhjLGQsZSxmKTplKGYpO2EuZS5sZW5ndGg9MH19ZnVuY3Rpb24gRCgpe3RoaXMuZXJyb3I9XG5udWxsfWZ1bmN0aW9uIEMoYSxiLGMsZCl7dmFyIGU9cyhjKSxmLGssaCxsO2lmKGUpe3RyeXtmPWMoZCl9Y2F0Y2gobil7eS5lcnJvcj1uLGY9eX1mPT09eT8obD0hMCxrPWYuZXJyb3IsZj1udWxsKTpoPSEwO2lmKGI9PT1mKXtnKGIsbmV3IFR5cGVFcnJvcihcIkEgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS5cIikpO3JldHVybn19ZWxzZSBmPWQsaD0hMDt2b2lkIDA9PT1iLmEmJihlJiZoP3EoYixmKTpsP2coYixrKToxPT09YT9tKGIsZik6Mj09PWEmJmcoYixmKSl9ZnVuY3Rpb24gTihhLGIpe3RyeXtiKGZ1bmN0aW9uKGIpe3EoYSxiKX0sZnVuY3Rpb24oYil7ZyhhLGIpfSl9Y2F0Y2goYyl7ZyhhLGMpfX1mdW5jdGlvbiBrKGEsYixjLGQpe3RoaXMubj1hO3RoaXMuYz1uZXcgYShwLGQpO3RoaXMuaT1jO3RoaXMubyhiKT8odGhpcy5tPWIsdGhpcy5kPXRoaXMubGVuZ3RoPWIubGVuZ3RoLHRoaXMubCgpLDA9PT10aGlzLmxlbmd0aD9tKHRoaXMuYyxcbnRoaXMuYik6KHRoaXMubGVuZ3RoPXRoaXMubGVuZ3RofHwwLHRoaXMuaygpLDA9PT10aGlzLmQmJm0odGhpcy5jLHRoaXMuYikpKTpnKHRoaXMuYyx0aGlzLnAoKSl9ZnVuY3Rpb24gaChhKXtPKys7dGhpcy5iPXRoaXMuYT12b2lkIDA7dGhpcy5lPVtdO2lmKHAhPT1hKXtpZighcyhhKSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvclwiKTtpZighKHRoaXMgaW5zdGFuY2VvZiBoKSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUHJvbWlzZSc6IFBsZWFzZSB1c2UgdGhlICduZXcnIG9wZXJhdG9yLCB0aGlzIG9iamVjdCBjb25zdHJ1Y3RvciBjYW5ub3QgYmUgY2FsbGVkIGFzIGEgZnVuY3Rpb24uXCIpO04odGhpcyxhKX19dmFyIEU9QXJyYXkuaXNBcnJheT9BcnJheS5pc0FycmF5OmZ1bmN0aW9uKGEpe3JldHVyblwiW29iamVjdCBBcnJheV1cIj09PVxuT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGEpfSxsPTAsdz1cInVuZGVmaW5lZFwiIT09dHlwZW9mIHdpbmRvdz93aW5kb3c6e30sQj13Lk11dGF0aW9uT2JzZXJ2ZXJ8fHcuV2ViS2l0TXV0YXRpb25PYnNlcnZlcix3PVwidW5kZWZpbmVkXCIhPT10eXBlb2YgVWludDhDbGFtcGVkQXJyYXkmJlwidW5kZWZpbmVkXCIhPT10eXBlb2YgaW1wb3J0U2NyaXB0cyYmXCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBNZXNzYWdlQ2hhbm5lbCxuPUFycmF5KDFFMyksQTtBPVwidW5kZWZpbmVkXCIhPT10eXBlb2YgcHJvY2VzcyYmXCJbb2JqZWN0IHByb2Nlc3NdXCI9PT17fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpP0YoKTpCP0coKTp3P0goKTpJKCk7dmFyIHY9bmV3IEQseT1uZXcgRDtrLnByb3RvdHlwZS5vPWZ1bmN0aW9uKGEpe3JldHVybiBFKGEpfTtrLnByb3RvdHlwZS5wPWZ1bmN0aW9uKCl7cmV0dXJuIEVycm9yKFwiQXJyYXkgTWV0aG9kcyBtdXN0IGJlIHByb3ZpZGVkIGFuIEFycmF5XCIpfTtrLnByb3RvdHlwZS5sPVxuZnVuY3Rpb24oKXt0aGlzLmI9QXJyYXkodGhpcy5sZW5ndGgpfTtrLnByb3RvdHlwZS5rPWZ1bmN0aW9uKCl7Zm9yKHZhciBhPXRoaXMubGVuZ3RoLGI9dGhpcy5jLGM9dGhpcy5tLGQ9MDt2b2lkIDA9PT1iLmEmJmQ8YTtkKyspdGhpcy5qKGNbZF0sZCl9O2sucHJvdG90eXBlLmo9ZnVuY3Rpb24oYSxiKXt2YXIgYz10aGlzLm47XCJvYmplY3RcIj09PXR5cGVvZiBhJiZudWxsIT09YT9hLmNvbnN0cnVjdG9yPT09YyYmdm9pZCAwIT09YS5hPyhhLmY9bnVsbCx0aGlzLmcoYS5hLGIsYS5iKSk6dGhpcy5xKGMucmVzb2x2ZShhKSxiKToodGhpcy5kLS0sdGhpcy5iW2JdPXRoaXMuaChhKSl9O2sucHJvdG90eXBlLmc9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPXRoaXMuYzt2b2lkIDA9PT1kLmEmJih0aGlzLmQtLSx0aGlzLmkmJjI9PT1hP2coZCxjKTp0aGlzLmJbYl09dGhpcy5oKGMpKTswPT09dGhpcy5kJiZtKGQsdGhpcy5iKX07ay5wcm90b3R5cGUuaD1mdW5jdGlvbihhKXtyZXR1cm4gYX07XG5rLnByb3RvdHlwZS5xPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpczt1KGEsdm9pZCAwLGZ1bmN0aW9uKGEpe2MuZygxLGIsYSl9LGZ1bmN0aW9uKGEpe2MuZygyLGIsYSl9KX07dmFyIE89MDtoLmFsbD1mdW5jdGlvbihhLGIpe3JldHVybihuZXcgayh0aGlzLGEsITAsYikpLmN9O2gucmFjZT1mdW5jdGlvbihhLGIpe2Z1bmN0aW9uIGMoYSl7cShlLGEpfWZ1bmN0aW9uIGQoYSl7ZyhlLGEpfXZhciBlPW5ldyB0aGlzKHAsYik7aWYoIUUoYSkpcmV0dXJuIChnKGUsbmV3IFR5cGVFcnJvcihcIllvdSBtdXN0IHBhc3MgYW4gYXJyYXkgdG8gcmFjZS5cIikpLCBlKTtmb3IodmFyIGY9YS5sZW5ndGgsaD0wO3ZvaWQgMD09PWUuYSYmaDxmO2grKyl1KHRoaXMucmVzb2x2ZShhW2hdKSx2b2lkIDAsYyxkKTtyZXR1cm4gZX07aC5yZXNvbHZlPWZ1bmN0aW9uKGEsYil7aWYoYSYmXCJvYmplY3RcIj09PXR5cGVvZiBhJiZhLmNvbnN0cnVjdG9yPT09dGhpcylyZXR1cm4gYTt2YXIgYz1uZXcgdGhpcyhwLGIpO1xucShjLGEpO3JldHVybiBjfTtoLnJlamVjdD1mdW5jdGlvbihhLGIpe3ZhciBjPW5ldyB0aGlzKHAsYik7ZyhjLGEpO3JldHVybiBjfTtoLnByb3RvdHlwZT17Y29uc3RydWN0b3I6aCx0aGVuOmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5hO2lmKDE9PT1jJiYhYXx8Mj09PWMmJiFiKXJldHVybiB0aGlzO3ZhciBkPW5ldyB0aGlzLmNvbnN0cnVjdG9yKHApLGU9dGhpcy5iO2lmKGMpe3ZhciBmPWFyZ3VtZW50c1tjLTFdO3IoZnVuY3Rpb24oKXtDKGMsZCxmLGUpfSl9ZWxzZSB1KHRoaXMsZCxhLGIpO3JldHVybiBkfSxcImNhdGNoXCI6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMudGhlbihudWxsLGEpfX07dmFyIHo9e1Byb21pc2U6aCxwb2x5ZmlsbDpmdW5jdGlvbigpe3ZhciBhO2E9XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBnbG9iYWw/Z2xvYmFsOlwidW5kZWZpbmVkXCIhPT10eXBlb2Ygd2luZG93JiZ3aW5kb3cuZG9jdW1lbnQ/d2luZG93OnNlbGY7XCJQcm9taXNlXCJpbiBhJiZcInJlc29sdmVcImluXG5hLlByb21pc2UmJlwicmVqZWN0XCJpbiBhLlByb21pc2UmJlwiYWxsXCJpbiBhLlByb21pc2UmJlwicmFjZVwiaW4gYS5Qcm9taXNlJiZmdW5jdGlvbigpe3ZhciBiO25ldyBhLlByb21pc2UoZnVuY3Rpb24oYSl7Yj1hfSk7cmV0dXJuIHMoYil9KCl8fChhLlByb21pc2U9aCl9fTtcImZ1bmN0aW9uXCI9PT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kP2RlZmluZShmdW5jdGlvbigpe3JldHVybiB6fSk6XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiBtb2R1bGUmJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPXo6XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiB0aGlzJiYodGhpcy5FUzZQcm9taXNlPXopfSkuY2FsbCh0aGlzKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgdmFyIGxhc3RUaW1lID0gMDtcbiAgdmFyIHZlbmRvcnMgPSBbJ3dlYmtpdCcsICdtb3onXTtcbiAgZm9yICh2YXIgeCA9IDA7IHggPCB2ZW5kb3JzLmxlbmd0aCAmJiAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTsgKyt4KSB7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IHdpbmRvd1t2ZW5kb3JzW3hdKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgPVxuICAgICAgd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ10gfHwgd2luZG93W3ZlbmRvcnNbeF0rJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICB9XG5cbiAgaWYgKCF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCkge1xuICAgICAgdmFyIGN1cnJUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcbiAgICAgIHZhciBpZCA9IHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpOyB9LFxuICAgICAgICB0aW1lVG9DYWxsKTtcbiAgICAgIGxhc3RUaW1lID0gY3VyclRpbWUgKyB0aW1lVG9DYWxsO1xuICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG5cbiAgaWYgKCF3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUpXG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgIGNsZWFyVGltZW91dChpZCk7XG4gICAgfTtcbn0oKSk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzIG9yIHRvYmlcbiAqIEBtb2R1bGUgamFtZXNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgamFtZXMgLSB0b2JpdCBoZWxwZXIgbGlicmFyeVxuICogSGVscGVyIGxpYnJhcnkgc3VwcG9ydGluZyB0aGUgQ2hheW5zIEFQSVxuICovXG5cbi8vIFRPRE86IG1vdmUgYWxsIHRvIGhlbHBlci5qcyBvciB0b2JpL2phbXNcbi8vIFRPRE86IGhlbHBlci5qcyB3aXRoIEVTNiBhbmQgamFzbWluZSAoYW5kIG9yIHRhcGUpXG4vLyBpbmNsdWRlIGhlbHBlciBhcyBtYWluIG1vZHVsZVxuXG4vLyBpbXBvcnRhbnQgaXMqIGZ1bmN0aW9uc1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9pcyc7XG5cbi8vIGV4dGVuZCBvYmplY3QgZnVuY3Rpb25cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXh0ZW5kJztcblxuLy8gTG9nZ2VyXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XG5cbi8vIFRPRE86IGRvIHdlIGV2ZW4gbmVlZCBtb2Rlcm5pemVyP1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL21vZGVybml6ZXInO1xuXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2h0dHAnO1xuXG4vLyBCcm93c2VyIEFQSXMgKHdpbmRvdywgZG9jdW1lbnQsIGxvY2F0aW9uKVxuLy8gVE9ETzogY29uc2lkZXIgdG8gbm90IGJpbmQgYnJvd3NlciB0byB0aGUgdXRpbHMgYE9iamVjdGBcbi8qIGpzaGludCAtVzExNiAqL1xuLyoganNoaW50IC1XMDMzICovXG4vLyBqc2NzOmRpc2FibGUgcGFyc2VFcnJvclxuaW1wb3J0ICogYXMgYnJvd3NlciBmcm9tICcuL3V0aWxzL2Jyb3dzZXInOyAvL25vaW5zcGVjdGlvbiBCYWRFeHByZXNzaW9uU3RhdGVtZW50SlMganNoaW50IGlnbm9yZTogbGluZVxuLy8ganNjczplbmFibGUgcGFyc2VFcnJvclxuLyoganNoaW50ICtXMDMzICovXG4vKiBqc2hpbnQgK1cxMTYgKi9cbmV4cG9ydCB7YnJvd3Nlcn07XG5cbi8vIERPTVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9kb20nO1xuXG4vLyBBbmFseXRpY3Ncbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9hbmFseXRpY3MnO1xuXG4vLyBSZW1vdGVcbi8vIHJlbW90ZSBkZWJ1Z2dpbmcgYW5kIGFuYWx5c2lzXG5cbi8vIGZyb250LWVuZCBFcnJvciBIYW5kbGVyIChjYXRjaGVzIGVycm9ycywgaWRlbnRpZnkgYW5kIGFuYWx5c2VzIHRoZW0pXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Vycm9yJztcblxuLy8gYXV0aCAmIEpXVCBoYW5kbGVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvand0JztcblxuLy8gY29va2llIGhhbmRsZXIgKHdpbGwgYmUgdXNlZCBpbiB0aGUgbG9jYWxfc3RvcmFnZSBhcyBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9jb29raWVfaGFuZGxlcic7XG5cbi8vIGxvY2FsU3RvcmFnZSBoZWxwZXIgKHdoaWNoIGNvb2tpZSBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sb2NhbF9zdG9yYWdlJztcblxuLy8gbWljcm8gZXZlbnQgbGlicmFyeVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9ldmVudHMnO1xuXG4vLyBvZmZsaW5lIGNhY2hlIGhlbHBlclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL29mZmxpbmVfY2FjaGUnO1xuXG4vLyBub3RpZmljYXRpb25zOiB0b2FzdHMsIGFsZXJ0cywgbW9kYWwgcG9wdXBzLCBuYXRpdmUgcHVzaFxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL25vdGlmaWNhdGlvbnMnO1xuXG4vLyBpZnJhbWUgY29tbXVuaWNhdGlvbiBhbmQgaGVscGVyIChDT1JTKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lmcmFtZSc7XG5cbi8vIHBhZ2UgdmlzaWJpbGl0eSBBUElcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9wYWdlX3Zpc2liaWxpdHknO1xuXG4vLyBEYXRlVGltZSBoZWxwZXIgKGNvbnZlcnRzIGRhdGVzLCBDIyBkYXRlLCB0aW1lc3RhbXBzLCBpMThuLCB0aW1lIGFnbylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9kYXRldGltZSc7XG5cblxuLy8gbGFuZ3VhZ2UgQVBJIGkxOG5cbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sYW5ndWFnZSc7XG5cbi8vIGNyaXRpY2FsIGNzc1xuXG4vLyBsb2FkQ1NTXG5cbi8vIGxhenkgbG9hZGluZ1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xhenlfbG9hZGluZyc7XG5cbi8vIChpbWFnZSkgcHJlbG9hZGVyXG4vL2V4cG9ydCAqIGZyb20gJy91dGlscy9wcmVsb2FkZXInO1xuXG4vLyBpc1BlbWl0dGVkIEFwcCBWZXJzaW9uIGNoZWNrXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lzX3Blcm1pdHRlZCc7XG5cblxuLy8gaW4gRnV0dXJlXG4vLyBpbW11dGFibGVcbi8vIHdlYWsgbWFwc1xuLy8gb2JzZXJ2ZXJcbi8vIHdlYiBzb2NrZXRzICh3cywgU2lnbmFsUilcbi8vIHdvcmtlciAoc2hhcmVkIHdvcmtlciwgbGF0ZXIgc2VydmljZSB3b3JrZXIgYXMgd2VsbClcbi8vIGxvY2F0aW9uLCBwdXNoU3RhdGUsIGhpc3RvcnkgaGFuZGxlclxuLy8gY2hheW5zIHNpdGUgYW5kIGNvZGUgYW5hbHlzZXI6IGZpbmQgZGVwcmVjYXRlZCBtZXRob2RzLCBiYWQgY29kZSwgaXNzdWVzIGFuZCBib3R0bGVuZWNrc1xuXG4iLCIvKipcbiAqIFRoaXMgbW9kdWxlIGNvbnRhaW5zIHRoZSBCcm93c2VyIEFQSXNcbiAqXG4gKi9cbi8vIFRPRE86IG1vdmUgb3V0IG9mIHV0aWxzXG52YXIgd2luID0gd2luZG93O1xuXG4vLyB1c2luZyBub2RlIGdsb2JhbCAobWFpbmx5IGZvciB0ZXN0aW5nLCBkZXBlbmRlbmN5IG1hbmFnZW1lbnQpXG52YXIgX2dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93O1xuZXhwb3J0IHtfZ2xvYmFsIGFzIGdsb2JhbH07XG5cbmV4cG9ydCB7d2luIGFzIHdpbmRvd307XG5leHBvcnQgdmFyIGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xuZXhwb3J0IHZhciBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcbmV4cG9ydCB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbmV4cG9ydCB2YXIgY2hheW5zID0gd2luZG93LmNoYXlucztcbmV4cG9ydCB2YXIgY2hheW5zQ2FsbGJhY2tzID0gd2luZG93Ll9jaGF5bnNDYWxsYmFja3M7XG5leHBvcnQgdmFyIGNoYXluc1Jvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hheW5zLXJvb3QnKTtcbmV4cG9ydCB2YXIgcGFyZW50ID0gd2luZG93LnBhcmVudDtcbmV4cG9ydCB2YXIgY29uc29sZSA9IHdpbmRvdy5jb25zb2xlOyAvLyBOT1RFOiBzaG91bGQgbm90IGJlIHVzZWQuIHVzZSBsb2dnZXIgaW5zdGVhZFxuZXhwb3J0IHZhciBnYyA9IHdpbmRvdy5nYyA/ICgpID0+IHdpbmRvdy5nYygpIDogKCkgPT4gbnVsbDtcblxuIiwiLy8gaW5zcGlyZWQgYnkgQW5ndWxhcjIncyBET01cblxuaW1wb3J0IHtkb2N1bWVudH0gZnJvbSAnLi9icm93c2VyJztcbmltcG9ydCB7aXNVbmRlZmluZWR9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgY2xhc3MgRE9NIHtcblxuICAvLyBOT1RFOiBhbHdheXMgcmV0dXJucyBhbiBhcnJheVxuICBzdGF0aWMgJChzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsLmJpbmQoZG9jdW1lbnQpO1xuICB9XG5cbiAgLy8gc2VsZWN0b3JzXG4gIHN0YXRpYyBxdWVyeShzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvcihlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5U2VsZWN0b3JBbGwoZWwsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBvbihlbCwgZXZ0LCBsaXN0ZW5lcikge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZ0LCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY2xvbmUobm9kZSkge1xuICAgIHJldHVybiBub2RlLmNsb25lTm9kZSh0cnVlKTtcbiAgfVxuICBzdGF0aWMgaGFzUHJvcGVydHkoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBuYW1lIGluIGVsZW1lbnQ7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlDbGFzc05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUobmFtZSk7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlUYWdOYW1lKGVsZW1lbnQsIG5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShuYW1lKTtcbiAgfVxuXG4gIC8vIGlucHV0XG4gIHN0YXRpYyBnZXRJbm5lckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwuaW5uZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBnZXRPdXRlckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwub3V0ZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBzZXRIVE1MKGVsLCB2YWx1ZSkge1xuICAgIGVsLmlubmVySFRNTCA9IHZhbHVlO1xuICB9XG4gIHN0YXRpYyBnZXRUZXh0KGVsKSB7XG4gICAgcmV0dXJuIGVsLnRleHRDb250ZW50O1xuICB9XG4gIHN0YXRpYyBzZXRUZXh0KGVsLCB2YWx1ZSkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH1cblxuICAvLyBpbnB1dCB2YWx1ZVxuICBzdGF0aWMgZ2V0VmFsdWUoZWwpIHtcbiAgICByZXR1cm4gZWwudmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldFZhbHVlKGVsLCB2YWx1ZSkge1xuICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gIH1cblxuICAvLyBjaGVja2JveGVzXG4gIHN0YXRpYyBnZXRDaGVja2VkKGVsKSB7XG4gICAgcmV0dXJuIGVsLmNoZWNrZWQ7XG4gIH1cbiAgc3RhdGljIHNldENoZWNrZWQoZWwsIHZhbHVlKSB7XG4gICAgZWwuY2hlY2tlZCA9IHZhbHVlO1xuICB9XG5cbiAgLy8gY2xhc3NcbiAgc3RhdGljIGNsYXNzTGlzdChlbGVtZW50KSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsZW1lbnQuY2xhc3NMaXN0LCAwKTtcbiAgfVxuICBzdGF0aWMgYWRkQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUNsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICB9XG4gIHN0YXRpYyBoYXNDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgfVxuXG4gIC8vIGNzc1xuICBzdGF0aWMgY3NzKGVsZW1lbnQsIHN0eWxlTmFtZSwgc3R5bGVWaGFzYWx1ZSkge1xuICAgIGlmKGlzVW5kZWZpbmVkKHN0eWxlVmFsdWUpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICAgIH1cbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyBzZXRDU1MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZhbHVlKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gc3R5bGVWYWx1ZTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IG51bGw7XG4gIH1cbiAgc3RhdGljIGdldENTUyhlbGVtZW50LCBzdHlsZU5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBkb2M9ZG9jdW1lbnQpIHtcbiAgICByZXR1cm4gZG9jLmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIH1cblxuICBzdGF0aWMgcmVtb3ZlKGVsKSB7XG4gICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudE5vZGU7XG4gICAgcGFyZW50LnJlbW92ZUNoaWxkKGVsKTtcbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICBzdGF0aWMgYXBwZW5kQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5hcHBlbmRDaGlsZChub2RlKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5yZW1vdmVDaGlsZChub2RlKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRCZWZvcmUoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbCk7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0QWZ0ZXIoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbC5uZXh0U2libGluZyk7XG4gIH1cblxuICBzdGF0aWMgdGFnTmFtZShlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIGF0dHJpYnV0ZXNcbiAgc3RhdGljIGdldEF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxuICBzdGF0aWMgc2V0QXR0cmlidXRlKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVBdHRyaWJ1dGUoZWxlbWVudCwgYXR0cmlidXRlKSB7XG4gICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gIH1cbn1cbiIsIi8qKlxuICogRXJyb3IgSGFuZGxlciBNb2R1bGVcbiAqL1xuXG4vLyBUT0RPOiBjb25zaWRlciBpbXBvcnRpbmcgZnJvbSAnLi91dGlscycgb25seVxuaW1wb3J0IHt3aW5kb3cgYXMgd2lufSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuLi9jaGF5bnMvY29uZmlnJztcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVycm9yJyk7XG5cbndpbi5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICBsZXQgbGluZUFuZENvbHVtbkluZm8gPVxuICAgIGVyci5jb2xub1xuICAgICAgPyAnIGxpbmU6JyArIGVyci5saW5lbm8gKyAnLCBjb2x1bW46JyArIGVyci5jb2xub1xuICAgICAgOiAnIGxpbmU6JyArIGVyci5saW5lbm87XG5cbiAgbGV0IGZpbmFsRXJyb3IgPSBbXG4gICAgICAnSmF2YVNjcmlwdCBFcnJvcicsXG4gICAgICBlcnIubWVzc2FnZSxcbiAgICAgIGVyci5maWxlbmFtZSArIGxpbmVBbmRDb2x1bW5JbmZvICsgJyAtPiAnICsgIG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAwLFxuICAgICAgdHJ1ZVxuICBdO1xuXG4gIC8vIFRPRE86IGFkZCBwcm9wZXIgRXJyb3IgSGFuZGxlclxuICBsb2cud2FybihmaW5hbEVycm9yKTtcbiAgaWYoQ29uZmlnLmdldCgncHJldmVudEVycm9ycycpKSB7XG4gICAgZXJyLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufSk7XG4iLCIvLyBUT0RPOiByZWZhY3RvciBhbmQgd3JpdGUgdGVzdHNcbi8vIFRPRE86IGFkZCBleGFtcGxlXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuIGBgYGpzXG4gLy8gRGVtb1xuXG4gZXZlbnRzLnB1Ymxpc2goJy9wYWdlL2xvYWQnLCB7XG5cdHVybDogJy9zb21lL3VybC9wYXRoJyAvLyBhbnkgYXJndW1lbnRcbn0pO1xuXG4gdmFyIHN1YnNjcmlwdGlvbiA9IGV2ZW50cy5zdWJzY3JpYmUoJy9wYWdlL2xvYWQnLCBmdW5jdGlvbihvYmopIHtcblx0Ly8gRG8gc29tZXRoaW5nIG5vdyB0aGF0IHRoZSBldmVudCBoYXMgb2NjdXJyZWRcbn0pO1xuXG4gLy8gLi4uc29tZXRpbWUgbGF0ZXIgd2hlcmUgSSBubyBsb25nZXIgd2FudCBzdWJzY3JpcHRpb24uLi5cbiBzdWJzY3JpcHRpb24ucmVtb3ZlKCk7XG5cbiAvLyAgdmFyIHRhcmdldCA9IHdpbmRvdy5ldmVudCA/IHdpbmRvdy5ldmVudC5zcmNFbGVtZW50IDogZSA/IGUudGFyZ2V0IDogbnVsbDtcbiBgYGBcbiAqL1xuZXhwb3J0IHZhciBldmVudHMgPSAoZnVuY3Rpb24oKSB7XG4gIGxldCB0b3BpY3MgPSB7fTtcbiAgbGV0IG93blByb3BlcnR5ID0gdG9waWNzLmhhc093blByb3BlcnR5O1xuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlOiBmdW5jdGlvbih0b3BpYywgbGlzdGVuZXIpIHtcbiAgICAgIC8vIENyZWF0ZSB0aGUgdG9waWMncyBvYmplY3QgaWYgbm90IHlldCBjcmVhdGVkXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgdG9waWNzW3RvcGljXSA9IFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICBsZXQgaW5kZXggPSB0b3BpY3NbdG9waWNdLnB1c2gobGlzdGVuZXIpIC0xO1xuXG4gICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICByZXR1cm4ge1xuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlbGV0ZSB0b3BpY3NbdG9waWNdW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9LFxuXG4gICAgcHVibGlzaDogZnVuY3Rpb24odG9waWMsIGluZm8pIHtcbiAgICAgIC8vIElmIHRoZSB0b3BpYyBkb2Vzbid0IGV4aXN0LCBvciB0aGVyZSdzIG5vIGxpc3RlbmVycyBpbiBxdWV1ZSwganVzdCBsZWF2ZVxuICAgICAgaWYgKCFvd25Qcm9wZXJ0eS5jYWxsKHRvcGljcywgdG9waWMpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3ljbGUgdGhyb3VnaCB0b3BpY3MgcXVldWUsIGZpcmUhXG4gICAgICB0b3BpY3NbdG9waWNdLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpdGVtKGluZm8gIT09IHVuZGVmaW5lZCA/IGluZm8gOiB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbn0pKCk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmV4dGVuZFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRXh0ZW5kcyB0aGUgZGVzdGluYXRpb24gb2JqZWN0IGJ5IGNvcHlpbmcgcHJvcGVydGllcyBmcm9tIHRoZSBzcmMgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5cbmltcG9ydCB7aXNPYmplY3R9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKG9iaikge1xuICBpZiAoIWlzT2JqZWN0KG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIHZhciBzb3VyY2UsIHByb3A7XG4gIGZvciAodmFyIGkgPSAxLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgZm9yIChwcm9wIGluIHNvdXJjZSkge1xuICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufVxuIiwiLy9pbXBvcnQge3dpbmRvd30gZnJvbSAnLi9icm93c2VyJztcbi8qIGdsb2JhbCBmZXRjaCAqL1xuaW1wb3J0IHtcbiAgZ2V0TG9nZ2VyLFxuICBpc0Zvcm1FbGVtZW50LFxuICBpc1N0cmluZyxcbiAgaXNPYmplY3QsXG4gIGlzRm9ybURhdGFcbiAgfSBmcm9tICcuLi91dGlscyc7XG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5odHRwJyk7XG4vL2xldCBQcm9taXNlID0gd2luZG93LlByb21pc2U7IC8vIG90aGVyd2lzZSBpbXBvcnQgUHJvbWlzZVxuLy9sZXQgZmV0Y2ggPSB3aW5kb3cuZmV0Y2g7IC8vIG90aGVyd2lzZSBUT0RPOiBpbXBvcnQgZmV0Y2hcblxuXG5cblxuLyoqXG4gKiBGZXRjaCBKU09OIHZpYSBHRVRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0ganNvbiByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZldGNoSlNPTih1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBQT1NUIFJlcXVlc3RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge0hUTUxGb3JtRWxlbWVudFxcRm9ybURhdGFcXFVSTFNlYXJjaFBhcmFtc1xcVVNWU3RyaW5nXFxCbG9ifEJ1ZmZlclNvdXJjZX0gZm9ybVxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0Rm9ybSh1cmwsIGZvcm0pIHtcbiAgaWYgKGlzRm9ybUVsZW1lbnQoZm9ybSkpIHtcbiAgICBmb3JtID0gbmV3IEZvcm1EYXRhKGZvcm0pO1xuICB9XG4gIHJldHVybiBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBib2R5OiBmb3JtXG4gIH0pO1xufVxuXG4vKipcbiAqIFBvc3QgSlNPTlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7YE9iamVjdGB9IGRhdGEgRWl0aGVyIE9iamVjdCBvciBKU09OIFN0cmluZ1xuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0KHVybCwgZGF0YSkge1xuICBpZiAoaXNPYmplY3QoZGF0YSkpIHtcbiAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gIH0gZWxzZSBpZiAoIWlzU3RyaW5nKGRhdGEpKSB7XG4gICAgbG9nLndhcm4oJ3Bvc3RKU09OOiBpbnZhbGlkIGRhdGEnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcG9zdCBkYXRhJyk7XG4gIH1cbiAgcmV0dXJuIGZldGNoKHVybCwge1xuICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfSxcbiAgICBib2R5OiBkYXRhXG4gIH0pO1xufVxuXG4vKipcbiAqIFVwbG9hZCBmaWxlXG4gKiBUT0RPOiBhZGQgYWRkaXRpb25hbCBwYXJhbXMgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtJbnB1dC5maWxlfEZvcm1EYXRhfSBkYXRhXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGxvYWQodXJsLCBkYXRhLCBuYW1lKSB7XG4gIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKCk7XG4gIGlmICghaXNGb3JtRGF0YShkYXRhKSkge1xuICAgIGZvcm0uYXBwZW5kKG5hbWUgfHwgJ2ZpbGUnLCBkYXRhKTtcbiAgfSBlbHNlIHtcbiAgICBmb3JtID0gZGF0YTtcbiAgfVxuXG4gIHJldHVybiBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBib2R5OiBmb3JtXG4gIH0pO1xufVxuXG4vKipcbiAqIEZldGNoIHRleHQgb3IgSFRNTCB2aWEgR0VUXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHJldHVybnMge1Byb21pc2V9IHdpdGggdGVzdCByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldCh1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbiAgICB9KTtcbn1cbiIsIi8qKlxuICogQG5hbWUgamFtZXMuaXNVbmRlZmluZWRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgdW5kZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNVbmRlZmluZWQodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBkZWZpbmVkLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBkZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgIT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzUHJlc2VudFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgbmVpdGhlciB1bmRlZmluZWQgbm9yIG51bGwuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHByZXNlbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByZXNlbnQob2JqKSB7XG4gIHJldHVybiBvYmogIT09IHVuZGVmaW5lZCAmJiBvYmogIT09IG51bGw7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNCbGFua1xuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZWl0aGVyIHVuZGVmaW5lZCBvciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBibGFuay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQmxhbmsob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGw7XG59XG5cblxuLyoqXG4qIEBuYW1lIGphbWVzLmlzU3RyaW5nXG4qIEBtb2R1bGUgamFtZXNcbiogQGtpbmQgZnVuY3Rpb25cbipcbiogQGRlc2NyaXB0aW9uXG4qIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgU3RyaW5nYC5cbipcbiogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4qIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgU3RyaW5nYC5cbiovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNOdW1iZXJcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE51bWJlcmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYE51bWJlcmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc09iamVjdFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhbiBgT2JqZWN0YC5cbiAqIG51bGwgaXMgbm90IHRyZWF0ZWQgYXMgYW4gb2JqZWN0LlxuICogSW4gSlMgYXJyYXlzIGFyZSBvYmplY3RzXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhbiBgT2JqZWN0YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQXJyYXlcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYEFycmF5YC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYEFycmF5YC5cbiAqL1xuZXhwb3J0IHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0Z1bmN0aW9uXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBGdW5jdGlvbmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEZ1bmN0aW9uYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0RhdGVcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgdmFsdWUgaXMgYSBkYXRlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBEYXRlYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGF0ZSh2YWx1ZSkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuLyoqXG4gKiBAbmFtZSBpc1Byb21pc2VcbiAqIEBtb2R1bGUgdXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1uaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIHByb21pc2UuXG4gKlxuICogQHBhcmFtIHsqfSBvYmogT2JqZWN0IHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiBgb2JgIGlzIGEgcHJvbWlzZSBvciBwcm9taXNlLWxpa2Ugb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQcm9taXNlKG9iaikge1xuICByZXR1cm4gb2JqICYmIGlzRnVuY3Rpb24ob2JqLnRoZW4pO1xufVxuXG4vLyBUT0RPOiBkb2VzIG5vdCBiZWxvbmcgaW4gaGVyZVxuLyoqXG4gKiBAbmFtZSB1dGlscy50cmltXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJlbW92ZXMgd2hpdGVzcGFjZXMuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7U3RyaW5nfCp9IFRyaW1tZWQgIHZhbHVlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmltKHZhbHVlKSB7XG4gIHJldHVybiBpc1N0cmluZyh2YWx1ZSkgPyB2YWx1ZS5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJykgOiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc1VVSURcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBVVUlEYCAoT1NGKS5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgVVVJRGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1VVSUQodmFsdWUpIHtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhbHVlID0gdHJpbSh2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9eWzAtOWEtZl17NH0oWzAtOWEtZl17NH0tKXs0fVswLTlhLXpdezEyfSQvaSkgIT09IG51bGw7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzR1VJRFxuICogQGFsaWFzIHV0aWxzLmlzVVVJRFxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYEdVSURgIChNaWNyb3NvZnQgU3RhbmRhcmQpLlxuICogSXMgYW4gYWxpYXMgdG8gaXNVVUlEXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEdVSURgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNHVUlEKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzTWFjQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE1BQyBBZGRyZXNzYC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNNYWNBZGRyZXNzKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXihbMC05YS1mXXsyfVstOl0pezV9WzAtOWEtZl17Mn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0JMRUFkZHJlc3NcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBCTEUgQWRkcmVzc2BcbiAqXG4gKiBAcGFyYW0geyp9IG9iaiBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEJMRSBBZGRyZXNzYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQkxFQWRkcmVzcyh2YWx1ZSkge1xuICByZXR1cm4gaXNVVUlEKHZhbHVlKSB8fCBpc01hY0FkZHJlc3ModmFsdWUpO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzRm9ybURhdGFcbiAqIEBtb2R1bGUgdXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgRm9ybURhdGEgYE9iamVjdGAuXG4gKlxuICogQHBhcmFtIHsqfSBvYmogUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYG9iamAgaXMgYSBgRm9ybURhdGFgIE9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRm9ybURhdGEob2JqKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEZvcm1EYXRhXSc7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNGb3JtRWxlbWVudFxuICogQG1vZHVsZSB1dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBGb3JtRWxlbWVudC5cbiAqXG4gKiBAcGFyYW0geyp9IG9iaiBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgb2JqYCBpcyBhIGBIVE1MRm9ybUVsZW1lbnRgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGb3JtRWxlbWVudChvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgSFRNTEZvcm1FbGVtZW50XSc7XG59XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNPYmplY3R9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5pc19wZXJtaXR0ZWQnKTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZSB3aGV0aGVyIHRoZSBjdXJyZW50IHVzZXIncyBPUyBhbmQgT1MgVmVyc2lvbiBpcyBoaWdoZXJcbiAqIG9yIGVxdWFsIHRvIHRoZSBwYXNzZWQgcmVmZXJlbmNlIGBPYmplY3RgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJzaW9ucyBWZXJzaW9ucyBgT2JqZWN0YCB3aXRoIHBlcm1pdHRlZCBPU3MgYW5kIHRoZWlyIHZlcnNpb24uXG4gKiBAcGFyYW0ge3N0cmluZ30gb3MgT1MgTmFtZSBhcyBsb3dlcmNhc2Ugc3RyaW5nLlxuICogQHBhcmFtIHtJbnRlZ2VyfSBhcHBWZXJzaW9uIEFwcCBWZXJzaW9uIE51bWJlciBhcyBJbnRlZ2VyICBUT0RPOiBmb3JtYXQgUkZDP1xuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIGN1cnJlbnQgT1MgJiBWZXJzaW9uIGFyZSBkZWZpbmVkIGluIHRoZSB2ZXJzaW9ucyBgT2JqZWN0YFxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNQZXJtaXR0ZWQodmVyc2lvbnMsIG9zLCBhcHBWZXJzaW9uKSB7XG5cbiAgaWYgKCF2ZXJzaW9ucyB8fCAhaXNPYmplY3QodmVyc2lvbnMpKSB7XG4gICAgbG9nLndhcm4oJ25vIHZlcnNpb25zIGBPYmplY3RgIHdhcyBwYXNzZWQnKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdmVyc2lvbnNbb3NdICYmIGFwcFZlcnNpb24gPj0gdmVyc2lvbnNbb3NdO1xufVxuIiwiLyoqXG4gKiBMb2dMZXZlbCBFbnVtXG4gKiBub25lIGlzIDBcbiAqIGRlYnVnIGlzIDRcbiAqIEB0eXBlIEVudW1cbiAqL1xuZXhwb3J0IHZhciBsZXZlbHMgPSB7XG4gIG5vbmU6IDAsXG4gIGVycm9yOjEsXG4gIHdhcm46MixcbiAgaW5mbzozLFxuICBkZWJ1Zzo0XG59O1xuXG4vKipcbiAqIENhbiBzdG9yZSBtdWx0aXBsZSBsb2dnZXJzXG4gKiBAdHlwZSB7YE9iamVjdGB9IGxvZ2dlcnNcbiAqL1xubGV0IGxvZ2dlcnMgPSB7fTtcblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqIEFzc2lnbiB0aGUgbG9nZ2VyIG1ldGhvZC5cbiAqIEJ5IGRlZmF1bHQgdGhlIHdpbmRvdy5jb25zb2xlIGBPYmplY3RgXG4gKiBAdHlwZSBgd2luZG93LmNvbnNvbGVgXG4gKi9cbmxldCBsb2dnZXIgPSB3aW5kb3cuY29uc29sZTtcblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nIExldmVsXG4gKiB1c2UgYHNldExldmVsKG5ld0xvZ0xldmVsKWAgdG8gb3ZlcndyaXRlIHRoaXMgdmFsdWUuXG4gKiBUT0RPOiBlYWNoIGxvZ2dlciBnZXRzIGFuIG93biBsb2dMZXZlbFxuICovXG5sZXQgbG9nTGV2ZWwgPSBsZXZlbHMubm9uZTtcblxuLyoqXG4gKlxuICogQHBhcmFtIGxldmVsXG4gKiBAcGFyYW0gYXJnc1xuICogQHByaXZhdGVcbiAqL1xuZnVuY3Rpb24gbG9nKGxldmVsLCBhcmdzLCBwcmVmaXgpIHtcbiAgbGV0IHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xuICBpZiAocHJlZml4KSB7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJncyk7XG4gICAgLy9hcmdzLnVuc2hpZnQodGltZSk7IC8vIFRPRE86IGNvbnNpZGVyIHRvZ2dsZWFibGUgdGltZVxuICAgIGFyZ3MudW5zaGlmdChwcmVmaXgpO1xuICB9XG4gIGxvZ2dlcltsZXZlbCB8fCAnbG9nJ10uYXBwbHkoY29uc29sZSwgYXJncyk7XG59XG5cbi8qKlxuICogU2V0IHRoZSBjdXJyZW50IGxvZ0xldmVsXG4gKiBpbiBvcmRlciB0byBzaG93IG9yIG5vdCBzaG93IGxvZ3NcbiAqIEBwYXJhbSBsZXZlbFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TGV2ZWwobGV2ZWwpIHtcbiAgbG9nTGV2ZWwgPSBsZXZlbDtcbn1cblxuLyoqXG4gKiBHZXQgTG9nZ2VyIFNpbmdsZXRvbiBJbnN0YW5jZVxuICogQHBhcmFtICB7c3RyaW5nfSBuYW1lIFRoZSBMb2dnZXIncyBuYW1lXG4gKiBAcmV0dXJucyB7TG9nZ2VyfSBMb2dnZXIgaW5zdGFuY2UsIGVpdGhlciBleGlzdGluZyBvbmUgb3IgY3JlYXRlcyBhIG5ldyBvbmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldExvZ2dlcihuYW1lKSB7XG4gIHJldHVybiBsb2dnZXJzW25hbWVdIHx8IChsb2dnZXJzW25hbWVdID0gbmV3IExvZ2dlcihuYW1lKSk7XG59XG5cbi8qKlxuICogTG9nZ2VyIGNsYXNzXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuXG4gIC8qKlxuICAgKiBFYWNoIGxvZ2dlciBpcyBpZGVudGlmaWVkIGJ5IGl0J3MgbmFtZS5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbG9nZ2VyIChlLmcuIGBjaGF5bnMuY29yZWApXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lKSB7XG4gICAgdGhpcy5uYW1lID0gJ1snICsgbmFtZSArICddOiAnO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBkZWJ1ZyBtZXNzYWdlLlxuICAgKlxuICAgKiBAbWV0aG9kIGRlYnVnXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZGVidWcoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgNCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2RlYnVnJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgaW5mby5cbiAgICpcbiAgICogQG1ldGhvZCBpbmZvXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgaW5mbygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCAzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnaW5mbycsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nLlxuICAgKlxuICAgKiBAbWV0aG9kIHdhcm5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICB3YXJuKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBsb2coJ3dhcm4nLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhbiBlcnJvci5cbiAgICpcbiAgICogQG1ldGhvZCBlcnJvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIGVycm9yKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdlcnJvcicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuTXV0YXRpb25PYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG5cbiAgICBpZiAoY2FuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICB2YXIgaGlkZGVuRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHF1ZXVlTGlzdCA9IHF1ZXVlLnNsaWNlKCk7XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgcXVldWVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCd5ZXMnLCAnbm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIlxuaW1wb3J0IHtjaGF5bnN9IGZyb20gJy4vY2hheW5zJztcbmV4cG9ydCBkZWZhdWx0IGNoYXlucztcbiJdfQ==
  return require('chayns');

});
