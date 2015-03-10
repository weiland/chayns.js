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

var tappApiInterface = require("./chayns/tapp_api_interface").tappApiInterface;

// public chayns object
var chayns = exports.chayns = {};

// TODO: use extend method only one time

extend(chayns, { getLogger: utils.getLogger }); // jshint ignore: line
extend(chayns, { utils: utils });
extend(chayns, { VERSION: "0.1.0" });
//extend(chayns, {config}); // TODO: the config `Object` should not be exposed

extend(chayns, { env: environment }); // TODO: generally rename
extend(chayns, { user: user });

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

},{"./chayns/chayns_api_interface":3,"./chayns/chayns_calls":4,"./chayns/config":5,"./chayns/core":6,"./chayns/environment":7,"./chayns/tapp_api_interface":8,"./chayns/user":9,"./lib/fetch_polyfill":10,"./lib/promise_polyfill":11,"./utils":12}],2:[function(require,module,exports){
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

var _environment = require("./environment");

var environment = _environment.environment;
var setEnv = _environment.setEnv;

var user = require("./user").user;

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
    var getAppInformationCall = chaynsApiInterface.getGlobalData(function (data) {

      // now Chayns is officially ready
      // first set all env stuff
      if (!data) {
        throw new Error("There is no app Data");
      }

      if (isObject(data.AppInfo)) {
        var appInfo = data.AppInfo;
        var site = {};
        site.siteId = appInfo.SiteID;
        site.title = appInfo.title;
        site.tapps = appInfo.Tapps;
        site.facebookAppId = appInfo.FacebookAppID;
        site.facebookPageId = appInfo.FacebookPageID;
        site.colorScheme = appInfo.ColorScheme || 0;
        site.version = appInfo.Version;
        setEnv("site", site);
        //set(site);
      }
      if (isObject(data.AppUser)) {
        var appUser = data.AppUser;
        user.name = appUser.FacebookUserName;
        user.id = appUser.TobitUserID;
        user.facebookId = appUser.FacebookID;
        user.personId = appUser.PersonID;
        user.accessToken = appUser.TobitAccessToken;
        user.facebookAccessToken = appUser.FacebookAccessToken;
      }
      if (isObject(data.Device)) {}

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

// fill config

},{"../utils":12,"./callbacks":2,"./chayns_api_interface":3,"./config":5,"./environment":7,"./user":9}],7:[function(require,module,exports){
"use strict";

exports.setEnv = setEnv;
exports.getEnv = getEnv;
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

  //os: parameters.os,
  osVersion: 1,

  browser: "cc",
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

  site: {},

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

function setEnv(key, value) {
  //extend(environment, prop);
  environment[key] = value;
}

function getEnv(key) {
  environment[key];
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

// TODO: enable debug mode

//siteId: 1,
//name: 'Tobit',
//locationId: 1,
//url: 'https://tobit.com/',
//useSSL: true,
//colorscheme: 1
//editMode: false, // future edit mode for content
//isAdminMode: true

},{"../utils":12}],8:[function(require,module,exports){
"use strict";

/**
 * Tapp API Interface
 * API to communicate with the TappAPI
 */

var _utils = require("../utils");

var getLogger = _utils.getLogger;
var isPresent = _utils.isPresent;
var isObject = _utils.isObject;
var isArray = _utils.isArray;

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
   * @param obj
   * @returns {Promise}
   */
  getUser: function getUserBasicInfo(obj) {
    if (!obj || !isObject(obj)) {
      throw new Error("There was no parameter Object");
    }
    var data = "";
    if (isPresent(obj.userId)) {
      data = "UserID=" + obj.userId;
    }
    if (isPresent(obj.fbId)) {
      data = "FBID=" + obj.fbId;
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
   *
   * @param obj
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
   * @param {Boolean} [updateCache=undefined] True to force to receive new UAC Groups
   * @returns {Promise} Array with UAC Groups
   */
  getUacGroups: function getUacGroups(siteId, updateCache) {
    if (uacGroupsCache && !updateCache) {
      log.debug("returning cached UAC Groups");
      return uacGroupsCache;
    }
    if (!siteId) {
      siteId = environment.site.siteId;
      console.log(siteId);
    }
    var data = "SiteID=" + siteId;
    return tappApi("Tapp/GetUACGroups?" + data).then(function (json) {
      return json.map(function (group) {
        return parseGroup(group);
      });
    });
  },

  /**
   * TODO: use userId instead of the facebookId?
   * TODO: refactor name?
   * @param userId Facebook UserId
   * @returns {Promise}
   */
  isUserAdminOfLocation: function isUserAdminOfLocation(userId) {
    if (!userId) {
      log.error("No userId was supplied.");
      return false; // TODO: throw error?
    }
    var data = "?SiteID=" + environment.site.siteId + "&FBID=" + userId;
    return tappApi("User/IsUserAdmin" + data).then(function (json) {
      return json;
    });
  },

  intercom: {
    sendMessage: function sendMessage(obj) {
      var data = {
        SiteID: obj.siteId,
        AccessToken: obj.accessToken,
        Message: obj.message
      };
      data[obj.name] = obj.value;
      fetch("InterCom/User", 1); //TODO: left of
    },

    sendMessageAsUser: function sendMessageAsUser() {},

    sendMessageToUser: function sendMessageToUser() {},

    sendMessageToChaynsUser: function sendMessageToChaynsUser() {},

    sendMessageToGroup: function sendMessageToGroup() {}
  }
};

/**
 * Tapp API request
 *
 * TODO: use POST instead of GET
 * @param endpoint
 * @returns {Promise} with json data
 */
function tappApi(endpoint) {
  var url = tappApiRoot + endpoint;
  return fetch(url, { credentials: "cors" }).then(function (res) {
    return res.json();
  }).then(function (json) {
    if (json.Value) {
      return json.Value;
    } else if (json.Data) {
      return json.Data;
    } else {
      return json;
    }
  });
}
Object.defineProperty(exports, "__esModule", {
  value: true
});

},{"../utils":12,"./environment":7}],9:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NhbGxiYWNrcy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvY2hheW5zL2NoYXluc19jYWxscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvY29uZmlnLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9jb3JlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy9lbnZpcm9ubWVudC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMvdGFwcF9hcGlfaW50ZXJmYWNlLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2NoYXlucy91c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL2xpYi9mZXRjaF9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9saWIvcHJvbWlzZV9wb2x5ZmlsbC5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9icm93c2VyLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2RvbS5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9lcnJvci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy91dGlscy9ldmVudHMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvZXh0ZW5kLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2h0dHAuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvaXMuanMiLCIvVXNlcnMvcHcvUHJvamVjdHMvdG9iaXQvY2hheW5zL2NoYXlucy5qcy9zcmMvdXRpbHMvaXNfcGVybWl0dGVkLmpzIiwiL1VzZXJzL3B3L1Byb2plY3RzL3RvYml0L2NoYXlucy9jaGF5bnMuanMvc3JjL3V0aWxzL2xvZ2dlci5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wdy9Qcm9qZWN0cy90b2JpdC9jaGF5bnMvY2hheW5zLmpzL3NyYy9jaGF5bnMtdW1kLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7SUNPWSxLQUFLLG1DQUFvQixTQUFTOztBQUM5QyxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDOzs7QUFHMUIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENB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WUFBVTtBQUFDLGFBQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxRQUFJLENBQUMsR0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUMsR0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFDLEVBQUMsYUFBYSxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxPQUFPLFlBQVU7QUFBQyxPQUFDLENBQUMsSUFBSSxHQUFDLENBQUMsR0FBQyxFQUFFLENBQUMsR0FBQyxDQUFDLENBQUE7S0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLGNBQWMsRUFBQSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFDLENBQUMsQ0FBQyxPQUFPLFlBQVU7QUFBQyxPQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsR0FBRTtBQUFDLFdBQU8sWUFBVTtBQUFDLGdCQUFVLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxHQUFFO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLElBQUUsQ0FBQyxFQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzZixLQUFDLEdBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLEdBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHO0FBQUMsT0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsQ0FBQSxPQUFNLENBQUMsRUFBQztBQUFDLGFBQU8sQ0FBQyxDQUFBO0tBQUM7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQztVQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUEsQUFBQyxDQUFBO09BQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsS0FBRyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7T0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtLQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFHLENBQUMsS0FBRyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLFNBQVMsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFHLFVBQVUsS0FBRyxPQUFPLENBQUMsSUFBRSxRQUFRLEtBQUcsT0FBTyxDQUFDLElBQUUsSUFBSSxLQUFHLENBQUMsRUFBQyxJQUFHLENBQUMsQ0FBQyxXQUFXLEtBQUcsQ0FBQyxDQUFDLFdBQVcsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUM5ZixDQUFDLENBQUMsQ0FBQyxLQUFJO0FBQUMsVUFBSSxDQUFDLENBQUMsSUFBRztBQUFDLFNBQUMsR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO09BQUMsQ0FBQSxPQUFNLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsTUFBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQUMsS0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsU0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBQztBQUFDLFdBQUksSUFBSSxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxJQUFFLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQTtLQUFDO0dBQUMsU0FBUyxDQUFDLEdBQUU7QUFBQyxRQUFJLENBQUMsS0FBSyxHQUN6Z0IsSUFBSSxDQUFBO0dBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUFDLENBQUM7UUFBQyxDQUFDO1FBQUMsQ0FBQztRQUFDLENBQUMsQ0FBQyxJQUFHLENBQUMsRUFBQztBQUFDLFVBQUc7QUFBQyxTQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO09BQUMsQ0FBQSxPQUFNLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxLQUFLLEdBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLENBQUE7T0FBQyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQyxDQUFDLEdBQUMsSUFBSSxDQUFBLEdBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxLQUFHLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLEVBQUMsSUFBSSxTQUFTLENBQUMsc0RBQXNELENBQUMsQ0FBQyxDQUFDLE9BQU07T0FBQztLQUFDLE1BQUssQ0FBQyxHQUFDLENBQUMsRUFBQyxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEdBQUMsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsUUFBRztBQUFDLE9BQUMsQ0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFNBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7T0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsU0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtPQUFDLENBQUMsQ0FBQTtLQUFDLENBQUEsT0FBTSxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUM7R0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsTUFBTSxFQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDM2YsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFFLElBQUksQ0FBQyxNQUFNLEdBQUMsSUFBSSxDQUFDLE1BQU0sSUFBRSxDQUFDLEVBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFDLENBQUMsS0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUEsR0FBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtHQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLEtBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFDLEVBQUUsQ0FBQyxJQUFHLENBQUMsS0FBRyxDQUFDLEVBQUM7QUFBQyxVQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsb0ZBQW9GLENBQUMsQ0FBQyxJQUFHLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQSxBQUFDLEVBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyx1SEFBdUgsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQztHQUFDLElBQUksQ0FBQyxHQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUMsS0FBSyxDQUFDLE9BQU8sR0FBQyxVQUFTLENBQUMsRUFBQztBQUFDLFdBQU0sZ0JBQWdCLEtBQ2pnQixNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQztNQUFDLENBQUMsR0FBQyxDQUFDO01BQUMsQ0FBQyxHQUFDLFdBQVcsS0FBRyxPQUFPLE1BQU0sR0FBQyxNQUFNLEdBQUMsRUFBRTtNQUFDLENBQUMsR0FBQyxDQUFDLENBQUMsZ0JBQWdCLElBQUUsQ0FBQyxDQUFDLHNCQUFzQjtNQUFDLENBQUMsR0FBQyxXQUFXLEtBQUcsT0FBTyxpQkFBaUIsSUFBRSxXQUFXLEtBQUcsT0FBTyxhQUFhLElBQUUsV0FBVyxLQUFHLE9BQU8sY0FBYztNQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsSUFBRyxDQUFDO01BQUMsQ0FBQyxDQUFDLENBQUMsR0FBQyxXQUFXLEtBQUcsT0FBTyxPQUFPLElBQUUsa0JBQWtCLEtBQUcsQ0FBQSxHQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBQyxDQUFDLEVBQUUsR0FBQyxDQUFDLEdBQUMsQ0FBQyxFQUFFLEdBQUMsQ0FBQyxHQUFDLENBQUMsRUFBRSxHQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxFQUFBO01BQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxFQUFBLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsVUFBUyxDQUFDLEVBQUM7QUFBQyxXQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUMsWUFBVTtBQUFDLFdBQU8sS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUM1ZixZQUFVO0FBQUMsUUFBSSxDQUFDLENBQUMsR0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxZQUFVO0FBQUMsU0FBSSxJQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsR0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEtBQUcsQ0FBQyxDQUFDLENBQUMsSUFBRSxDQUFDLEdBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBRyxPQUFPLENBQUMsSUFBRSxJQUFJLEtBQUcsQ0FBQyxHQUFDLENBQUMsQ0FBQyxXQUFXLEtBQUcsQ0FBQyxJQUFFLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsR0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUEsR0FBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLElBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFDLElBQUksQ0FBQyxDQUFDLElBQUUsQ0FBQyxLQUFHLENBQUMsR0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsQ0FBQyxLQUFHLElBQUksQ0FBQyxDQUFDLElBQUUsQ0FBQyxDQUFDLENBQUMsRUFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7R0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsV0FBTyxDQUFDLENBQUE7R0FBQyxDQUFDO0FBQ3RmLEdBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssQ0FBQyxFQUFDLFVBQVMsQ0FBQyxFQUFDO0FBQUMsT0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQTtLQUFDLENBQUMsQ0FBQTtHQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUMsVUFBUyxDQUFDLEVBQUMsQ0FBQyxFQUFDO0FBQUMsV0FBTSxBQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLGFBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUFDLE9BQUMsQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUM7QUFBQyxPQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO0tBQUMsSUFBSSxDQUFDLEdBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLElBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFDLElBQUksU0FBUyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUEsQ0FBRSxLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUMsQ0FBQyxHQUFDLENBQUMsRUFBQyxLQUFLLENBQUMsS0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFFLENBQUMsR0FBQyxDQUFDLEVBQUMsQ0FBQyxFQUFFLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUMsS0FBSyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0dBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFFBQUcsQ0FBQyxJQUFFLFFBQVEsS0FBRyxPQUFPLENBQUMsSUFBRSxDQUFDLENBQUMsV0FBVyxLQUFHLElBQUksRUFBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUM7QUFDemYsS0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBQyxVQUFTLENBQUMsRUFBQyxDQUFDLEVBQUM7QUFBQyxRQUFJLENBQUMsR0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtHQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBQyxFQUFDLFdBQVcsRUFBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLGNBQVMsQ0FBQyxFQUFDLENBQUMsRUFBQztBQUFDLFVBQUksQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEtBQUcsQ0FBQyxJQUFFLENBQUMsQ0FBQyxJQUFFLENBQUMsS0FBRyxDQUFDLElBQUUsQ0FBQyxDQUFDO0FBQUMsZUFBTyxJQUFJLENBQUM7T0FBQSxJQUFJLENBQUMsR0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1VBQUMsQ0FBQyxHQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBRyxDQUFDLEVBQUM7QUFBQyxZQUFJLENBQUMsR0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFVO0FBQUMsV0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQyxDQUFBO1NBQUMsQ0FBQyxDQUFBO09BQUMsTUFBSyxDQUFDLENBQUMsSUFBSSxFQUFDLENBQUMsRUFBQyxDQUFDLEVBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7S0FBQyxFQUFDLE9BQU8sRUFBQyxVQUFTLENBQUMsRUFBQztBQUFDLGFBQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLENBQUE7S0FBQyxFQUFDLENBQUMsSUFBSSxDQUFDLEdBQUMsRUFBQyxPQUFPLEVBQUMsQ0FBQyxFQUFDLFFBQVEsRUFBQyxvQkFBVTtBQUFDLFVBQUksQ0FBQyxDQUFDLENBQUMsR0FBQyxXQUFXLEtBQUcsT0FBTyxNQUFNLEdBQUMsTUFBTSxHQUFDLFdBQVcsS0FBRyxPQUFPLE1BQU0sSUFBRSxN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QkFDQyxNQUFNIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQG5hbWUgY2hheW5zIEFQSVxuICogQG1vZHVsZSBjaGF5bnNcbiAqL1xuXG4vLyBoZWxwZXJcbi8vIFRPRE86IGVpdGhlciBpbmRleC5qcywgdXRpbHMuanMgb3IganVzdCB0aGUgc2luZ2xlIGZpbGVzXG5pbXBvcnQgKiBhcyB1dGlscyAgICAgICAgICAgICAgIGZyb20gJy4vdXRpbHMnO1xudmFyIGV4dGVuZCA9IHV0aWxzLmV4dGVuZDtcblxuLy8gc2V0IGxvZ0xldmVsIHRvIGluZm9cbnV0aWxzLnNldExldmVsKDQpOyAvLyBUT0RPOiBkb24ndCBzZXQgdGhlIGxldmVsIGhlcmVcblxuLy8gYmFzaWMgY29uZmlnXG5pbXBvcnQge2NvbmZpZ30gICAgICAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2NvbmZpZyc7XG5cbi8vIGVudmlyb25tZW50XG5pbXBvcnQge2Vudmlyb25tZW50fSAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2Vudmlyb25tZW50JztcblxuLy8gKGN1cnJlbnQpIHVzZXJcbmltcG9ydCB7dXNlcn0gICAgICAgICAgICAgICAgICAgZnJvbSAnLi9jaGF5bnMvdXNlcic7XG5cbmltcG9ydCBQcm9taXNlIGZyb20gICcuL2xpYi9wcm9taXNlX3BvbHlmaWxsJztcblByb21pc2UucG9seWZpbGwoKTsgLy8gYXV0b2xvYWQgUHJvbWlzZSBwb2x5ZmlsbFxuLy8gVE9ETzogYWRkIERlZmVycmVkP1xuXG5pbXBvcnQgJy4vbGliL2ZldGNoX3BvbHlmaWxsJztcblxuLy8gY29yZSBmdW5jdGlvbnNcbmltcG9ydCB7cmVhZHksIHJlZ2lzdGVyLCBzZXR1cH0gZnJvbSAnLi9jaGF5bnMvY29yZSc7XG5cbi8vIGNoYXlucyBjYWxsc1xuXG5pbXBvcnQge2FwaUNhbGx9ICAgICAgICAgICAgICAgIGZyb20gJy4vY2hheW5zL2NoYXluc19jYWxscyc7XG5cbmltcG9ydCB7Y2hheW5zQXBpSW50ZXJmYWNlfSAgICAgZnJvbSAnLi9jaGF5bnMvY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuXG5pbXBvcnQge3RhcHBBcGlJbnRlcmZhY2V9ICAgICAgIGZyb20gJy4vY2hheW5zL3RhcHBfYXBpX2ludGVyZmFjZSc7XG5cblxuLy8gcHVibGljIGNoYXlucyBvYmplY3RcbmV4cG9ydCB2YXIgY2hheW5zID0ge307XG5cbi8vIFRPRE86IHVzZSBleHRlbmQgbWV0aG9kIG9ubHkgb25lIHRpbWVcblxuZXh0ZW5kKGNoYXlucywge2dldExvZ2dlcjogdXRpbHMuZ2V0TG9nZ2VyfSk7IC8vIGpzaGludCBpZ25vcmU6IGxpbmVcbmV4dGVuZChjaGF5bnMsIHt1dGlsc30pO1xuZXh0ZW5kKGNoYXlucywge1ZFUlNJT046ICcwLjEuMCd9KTtcbi8vZXh0ZW5kKGNoYXlucywge2NvbmZpZ30pOyAvLyBUT0RPOiB0aGUgY29uZmlnIGBPYmplY3RgIHNob3VsZCBub3QgYmUgZXhwb3NlZFxuXG5leHRlbmQoY2hheW5zLCB7ZW52OiBlbnZpcm9ubWVudH0pOyAvLyBUT0RPOiBnZW5lcmFsbHkgcmVuYW1lXG5leHRlbmQoY2hheW5zLCB7dXNlcn0pO1xuXG5leHRlbmQoY2hheW5zLCB7cmVnaXN0ZXJ9KTtcbmV4dGVuZChjaGF5bnMsIHtyZWFkeX0pO1xuXG4vLyBUT0RPOiByZW1vdmUgbGluZSBiZWxvd1xuZXh0ZW5kKGNoYXlucywge2FwaUNhbGx9KTtcblxuLy8gYWRkIGFsbCBjaGF5bnNBcGlJbnRlcmZhY2UgbWV0aG9kcyBkaXJlY3RseSB0byB0aGUgYGNoYXluc2AgT2JqZWN0XG5leHRlbmQoY2hheW5zLCBjaGF5bnNBcGlJbnRlcmZhY2UpO1xuXG5leHRlbmQoY2hheW5zLCB0YXBwQXBpSW50ZXJmYWNlKTtcblxuLy8gc2V0dXAgY2hheW5zXG5zZXR1cCgpO1xuXG5cbi8vIGNoYXlucyBwdWJsaXNoIG5vIFVNRFxuLy93aW5kb3cuY2hheW5zID0gY2hheW5zO1xuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzRnVuY3Rpb24sIGlzVW5kZWZpbmVkfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge3dpbmRvd30gZnJvbSAnLi4vdXRpbHMvYnJvd3Nlcic7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY2FsbGJhY2tzJyk7XG5cbmxldCBub29wID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG5sZXQgY2FsbGJhY2tzID0ge307XG4vKipcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gQ2FsbGJhY2sgRnVuY3Rpb24gdG8gYmUgaW52b2tlZFxuICogQHBhcmFtIHtCb29sZWFufSBpc0NoYXluc0NhbGwgSWYgdHJ1ZSB0aGVuIHRoZSBjYWxsIHdpbGwgYmUgYXNzaWduZWQgdG8gYGNoYXlucy5fY2FsbGJhY2tzYFxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgcGFyYW1ldGVycyBhcmUgdmFsaWQgYW5kIHRoZSBjYWxsYmFjayB3YXMgc2F2ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldENhbGxiYWNrKG5hbWUsIGZuLCBpc0NoYXluc0NhbGwpIHtcblxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBsb2cud2Fybignc2V0Q2FsbGJhY2s6IG5hbWUgaXMgdW5kZWZpbmVkJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghaXNGdW5jdGlvbihmbikpIHtcbiAgICBsb2cud2Fybignc2V0Q2FsbGJhY2s6IGZuIGlzIG5vIEZ1bmN0aW9uJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKG5hbWUuaW5kZXhPZignKCknKSAhPT0gLTEpIHsgLy8gc3RyaXAgJygpJ1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoJygpJywgJycpO1xuICB9XG5cbiAgbG9nLmRlYnVnKCdzZXRDYWxsYmFjazogc2V0IENhbGxiYWNrOiAnICsgbmFtZSk7XG4gIC8vaWYgKG5hbWUgaW4gY2FsbGJhY2tzKSB7XG4gIC8vICBjYWxsYmFja3NbbmFtZV0ucHVzaChmbik7IC8vIFRPRE86IHJlY29uc2lkZXIgQXJyYXkgc3VwcG9ydFxuICAvL30gZWxzZSB7XG4gICAgY2FsbGJhY2tzW25hbWVdID0gZm47IC8vIEF0dGVudGlvbjogd2Ugc2F2ZSBhbiBBcnJheVxuICAvL31cblxuICBpZiAoaXNDaGF5bnNDYWxsKSB7XG4gICAgbG9nLmRlYnVnKCdzZXRDYWxsYmFjazogcmVnaXN0ZXIgZm4gYXMgZ2xvYmFsIGNhbGxiYWNrJyk7XG4gICAgd2luZG93Ll9jaGF5bnNDYWxsYmFja3NbbmFtZV0gPSBjYWxsYmFjayhuYW1lLCAnQ2hheW5zQ2FsbCcpO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogUmVnaXN0ZXIgY2FsbGJhY2tzIGZvciBDaGF5bnNDYWxscyBhbmQgQ2hheW5zV2ViQ2FsbHNcbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGNhbGxiYWNrTmFtZSBOYW1lIG9mIHRoZSBGdW5jdGlvblxuICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgRWl0aGVyICdDaGF5bnNXZWJDYWxsJyBvciAnQ2hheW5zQ2FsbCdcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gaGFuZGxlRGF0YSBSZWNlaXZlcyBjYWxsYmFjayBkYXRhXG4gKi9cbmZ1bmN0aW9uIGNhbGxiYWNrKGNhbGxiYWNrTmFtZSwgdHlwZSkge1xuXG4gIHJldHVybiBmdW5jdGlvbiBoYW5kbGVEYXRhKCkge1xuXG4gICAgaWYgKGNhbGxiYWNrTmFtZSBpbiBjYWxsYmFja3MpIHtcbiAgICAgIGxvZy5kZWJ1ZygnaW52b2tlIGNhbGxiYWNrOiAnLCBjYWxsYmFja05hbWUsICd0eXBlOicsIHR5cGUpO1xuICAgICAgdmFyIGZuID0gY2FsbGJhY2tzW2NhbGxiYWNrTmFtZV07XG4gICAgICBpZiAoaXNGdW5jdGlvbihmbikpIHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgLy9kZWxldGUgY2FsbGJhY2tzW2NhbGxiYWNrTmFtZV07IC8vIFRPRE86IGNhbm5vdCBiZSBsaWtlIHRoYXQsIHJlbW92ZSBhcnJheT9cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy53YXJuKCdjYWxsYmFjayBpcyBubyBmdW5jdGlvbicsIGNhbGxiYWNrTmFtZSwgZm4pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnY2FsbGJhY2sgJyArIGNhbGxiYWNrTmFtZSArICcgZGlkIG5vdCBleGlzdCBpbiBjYWxsYmFja3MgYXJyYXknKTtcbiAgICB9XG4gIH07XG59XG5cbi8qKlxuICogQG5hbWUgY2hheW5zLl9jYWxsYmFja3NcbiAqIEBtb2R1bGUgY2hheW5zXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBDaGF5bnMgQ2FsbCBDYWxsYmFja3NcbiAqIHdpbGwgYmUgYXNzaWduZWQgdG8gdGhlIGBjaGF5bnMuX2NhbGxiYWNrc2Agb2JqZWN0XG4gKlxuICogQHR5cGUge09iamVjdH0gY2hheW5zQ2FsbHNDYWxsYmFja3NcbiAqL1xud2luZG93Ll9jaGF5bnNDYWxsYmFja3MgPSB7XG4gIC8vLy8gVE9ETzogd3JhcCBjYWxsYmFjayBmdW5jdGlvbiAoRFJZKVxuICAvL2dldEdsb2JhbERhdGE6IGNhbGxiYWNrKCdnZXRHbG9iYWxEYXRhJywgJ0NoYXluc0NhbGwnKSAvLyBleGFtcGxlXG4gIGdldEdlb0xvY2F0aW9uQ2FsbGJhY2s6IG5vb3Bcbn07XG5cblxuLy8gVE9ETzogbW92ZSB0byBhbm90aGVyIGZpbGU/IGNvcmUsIGNoYXluc19jYWxsc1xudmFyIG1lc3NhZ2VMaXN0ZW5pbmcgPSBmYWxzZTtcbmV4cG9ydCBmdW5jdGlvbiBtZXNzYWdlTGlzdGVuZXIoKSB7XG4gIGlmIChtZXNzYWdlTGlzdGVuaW5nKSB7XG4gICAgbG9nLmluZm8oJ3RoZXJlIGlzIGFscmVhZHkgb25lIG1lc3NhZ2UgbGlzdGVuZXIgb24gd2luZG93Jyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIG1lc3NhZ2VMaXN0ZW5pbmcgPSB0cnVlO1xuICBsb2cuZGVidWcoJ21lc3NhZ2UgbGlzdGVuZXIgaXMgc3RhcnRlZCcpO1xuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gb25NZXNzYWdlKGUpIHtcblxuICAgIGxvZy5kZWJ1ZygnbmV3IG1lc3NhZ2UgJyk7XG5cbiAgICB2YXIgbmFtZXNwYWNlID0gJ2NoYXlucy5jdXN0b21UYWIuJyxcbiAgICAgIGRhdGEgPSBlLmRhdGE7XG5cbiAgICBpZiAodHlwZW9mIGRhdGEgIT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHN0cmlwIG5hbWVzcGFjZSBmcm9tIGRhdGFcbiAgICBkYXRhID0gZGF0YS5zdWJzdHIobmFtZXNwYWNlLmxlbmd0aCwgZGF0YS5sZW5ndGggLSBuYW1lc3BhY2UubGVuZ3RoKTtcbiAgICB2YXIgbWV0aG9kID0gZGF0YS5tYXRjaCgvW146XSo6Lyk7IC8vIGRldGVjdCBtZXRob2RcbiAgICBpZiAobWV0aG9kICYmIG1ldGhvZC5sZW5ndGggPiAwKSB7XG4gICAgICBtZXRob2QgPSBtZXRob2RbMF07XG5cbiAgICAgIHZhciBwYXJhbXMgPSBkYXRhLnN1YnN0cihtZXRob2QubGVuZ3RoLCBkYXRhLmxlbmd0aCAtIG1ldGhvZC5sZW5ndGgpO1xuICAgICAgaWYgKHBhcmFtcykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UocGFyYW1zKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgIH1cblxuICAgICAgLy8gcmVtb3ZlIHRoZSBsYXN0ICcpJ1xuICAgICAgbWV0aG9kID0gbWV0aG9kLnN1YnN0cigwLCBtZXRob2QubGVuZ3RoIC0gMSk7XG5cbiAgICAgIC8vIHRoZSBjYWxsYmFjayBmdW5jdGlvbiBjYW4gYmUgaW52b2tlZCBkaXJlY3RseVxuICAgICAgY2FsbGJhY2sobWV0aG9kLCAnQ2hheW5zV2ViQ2FsbCcpKHBhcmFtcyk7XG4gICAgfVxuICB9KTtcbn1cbiIsIi8qKlxuICogQ2hheW5zIEFQSSBJbnRlcmZhY2VcbiAqIEFQSSB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSBBUFAgYW5kIHRoZSBDaGF5bnMgV2ViXG4gKi9cblxuaW1wb3J0IHthcGlDYWxsfSBmcm9tICcuL2NoYXluc19jYWxscyc7XG5pbXBvcnQge2dldExvZ2dlciwgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0JMRUFkZHJlc3MsXG4gIGlzRGF0ZSwgaXNPYmplY3QsIGlzQXJyYXksIHRyaW0sIERPTX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHt3aW5kb3csIGxvY2F0aW9ufSBmcm9tICcuLi91dGlscy9icm93c2VyJzsgLy8gZHVlIHRvIHdpbmRvdy5vcGVuIGFuZCBsb2NhdGlvbi5ocmVmXG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXluc19hcGlfaW50ZXJmYWNlJyk7XG5cbi8qKlxuICogTkZDIFJlc3BvbnNlIERhdGEgU3RvcmFnZVxuICogQHR5cGUge09iamVjdH1cbiAqL1xubGV0IE5mY1Jlc3BvbnNlRGF0YSA9IHtcbiAgUkZJZDogMCxcbiAgUGVyc29uSWQ6IDBcbn07XG5cbi8qKlxuICogUG9wdXAgQnV0dG9uXG4gKiBAY2xhc3MgUG9wdXBCdXR0b25cbiAqL1xuY2xhc3MgUG9wdXBCdXR0b24ge1xuICAvKipcbiAgICogUG9wdXAgQnV0dG9uIENvbnN0cnVjdG9yXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFBvcHVwIEJ1dHRvbiBuYW1lXG4gICAqL1xuICBjb25zdHJ1Y3RvcihuYW1lLCBjYWxsYmFjaykge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGxldCBlbCA9IERPTS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBlbC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ2NoYXlucy1wb3B1cCcpO1xuICAgIGVsLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2hheW5zX19wb3B1cCcpO1xuICAgIHRoaXMuZWxlbWVudCA9IGVsO1xuICB9XG4gIC8qKlxuICAgKiBHZXQgUG9wdXAgQnV0dG9uIG5hbWVcbiAgICogQHJldHVybnMge25hbWV9XG4gICAqL1xuICBuYW1lKCkge1xuICAgIHJldHVybiB0aGlzLm5hbWU7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbGJhY2tcbiAgICovXG4gIGNhbGxiYWNrKCkge1xuICAgIGxldCBjYiA9IHRoaXMuY2FsbGJhY2s7XG4gICAgbGV0IG5hbWUgPSBjYi5uYW1lO1xuICAgIGlmIChpc0Z1bmN0aW9uKGNiKSkge1xuICAgICAgY2IuY2FsbChudWxsLCBuYW1lKTtcbiAgICB9XG4gIH1cbiAgLyoqXG4gICAqIEBuYW1lIHRvSFRNTFxuICAgKiBSZXR1cm5zIEhUTUwgTm9kZSBjb250YWluaW5nIHRoZSBQb3B1cEJ1dHRvbi5cbiAgICogQHJldHVybnMge1BvcHVwQnV0dG9uLmVsZW1lbnR8SFRNTE5vZGV9XG4gICAqL1xuICB0b0hUTUwoKSB7XG4gICAgcmV0dXJuIHRoaXMuZWxlbWVudDtcbiAgfVxufVxuXG4vKipcbiAqIEJlYWNvbiBMaXN0XG4gKiBAdHlwZSB7QXJyYXl8bnVsbH1cbiAqL1xubGV0IGJlYWNvbkxpc3QgPSBudWxsO1xuXG4vKipcbiAqIEdsb2JhbCBEYXRhIFN0b3JhZ2VcbiAqIEB0eXBlIHtib29sZWFufE9iamVjdH1cbiAqL1xubGV0IGdsb2JhbERhdGEgPSBmYWxzZTtcblxuLyoqXG4gKiBBbGwgcHVibGljIGNoYXlucyBtZXRob2RzIHRvIGludGVyYWN0IHdpdGggKkNoYXlucyBBcHAqIG9yICpDaGF5bnMgV2ViKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xuZXhwb3J0IHZhciBjaGF5bnNBcGlJbnRlcmZhY2UgPSB7XG5cblxuICAvKipcbiAgICogRW5hYmxlIG9yIGRpc2FibGUgUHVsbFRvUmVmcmVzaFxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGFsbG93UHVsbCBBbGxvdyBQdWxsVG9SZWZyZXNoXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2VlZGVkXG4gICAqL1xuICBzZXRQdWxsVG9SZWZyZXNoOiBmdW5jdGlvbihhbGxvd1B1bGwpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDAsXG4gICAgICB3ZWJGbjogZmFsc2UsIC8vIGNvdWxkIGJlIG9taXR0ZWRcbiAgICAgIHBhcmFtczogW3snYm9vbCc6IGFsbG93UHVsbH1dXG4gICAgfSk7XG4gIH0sXG4gIC8vIFRPRE86IHJlbmFtZSB0byBlbmFibGVQdWxsVG9SZWZyZXNoXG4gIGFsbG93UmVmcmVzaFNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLnNldFB1bGxUb1JlZnJlc2godHJ1ZSk7XG4gIH0sXG4gIGRpc2FsbG93UmVmcmVzaFNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgY2hheW5zQXBpSW50ZXJmYWNlLnNldFB1bGxUb1JlZnJlc2goZmFsc2UpO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtzaG93Q3Vyc29yXSBJZiB0cnVlIHRoZSB3YWl0Y3Vyc29yIHdpbGwgYmUgc2hvd25cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3RoZXJ3aXNlIGl0IHdpbGwgYmUgaGlkZGVuXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2V0V2FpdGN1cnNvcjogZnVuY3Rpb24oc2hvd0N1cnNvcikge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMSxcbiAgICAgIHdlYkZuOiAoc2hvd0N1cnNvciA/ICdzaG93JyA6ICdoaWRlJykgKyAnTG9hZGluZ0N1cnNvcicsXG4gICAgICBwYXJhbXM6IFt7J2Jvb2wnOiBzaG93Q3Vyc29yfV1cbiAgICB9KTtcbiAgfSxcbiAgc2hvd1dhaXRjdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0V2FpdGN1cnNvcih0cnVlKTtcbiAgfSxcbiAgaGlkZVdhaXRjdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBjaGF5bnNBcGlJbnRlcmZhY2Uuc2V0V2FpdGN1cnNvcihmYWxzZSk7XG4gIH0sXG5cbiAgLy8gVE9ETzogcmVuYW1lIGl0IHRvIG9wZW5UYXBwP1xuICAvKipcbiAgICogU2VsZWN0IGRpZmZlcmVudCBUYXBwIGlkZW50aWZpZWQgYnkgVGFwcElEIG9yIEludGVybmFsVGFwcE5hbWVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRhYiBUYXBwIE5hbWUgb3IgVGFwcCBJRFxuICAgKiBAcGFyYW0ge1N0cmluZ30gKG9wdGlvbmFsKSBwYXJhbSBVUkwgUGFyYW1ldGVyXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2VsZWN0VGFiOiBmdW5jdGlvbih0YWIsIHBhcmFtKSB7XG5cbiAgICBsZXQgY21kID0gMTM7IC8vIHNlbGVjdFRhYiB3aXRoIHBhcmFtIENoYXluc0NhbGxcblxuICAgIC8vIHVwZGF0ZSBwYXJhbTogc3RyaXAgPyBhbmQgZW5zdXJlICYgYXQgdGhlIGJlZ2luXG4gICAgaWYgKHBhcmFtICYmICFwYXJhbS5tYXRjaCgvXlsmfFxcP10vKSkgeyAvLyBubyAmIGFuZCBubyA/XG4gICAgICBwYXJhbSA9ICcmJyArIHBhcmFtO1xuICAgIH0gZWxzZSBpZiAocGFyYW0pIHtcbiAgICAgIHBhcmFtID0gcGFyYW0ucmVwbGFjZSgnPycsICcmJyk7XG4gICAgfSBlbHNlIHsgLy8gbm8gcGFyYW1zLCBkaWZmZXJlbnQgQ2hheW5zQ2FsbFxuICAgICAgY21kID0gMjtcbiAgICB9XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IGNtZCxcbiAgICAgIHdlYkZuOiAnc2VsZWN0b3RoZXJ0YWInLFxuICAgICAgcGFyYW1zOiBjbWQgPT09IDEzXG4gICAgICAgID8gW3snc3RyaW5nJzogdGFifSwgeydzdHJpbmcnOiBwYXJhbX1dXG4gICAgICAgIDogW3snc3RyaW5nJzogdGFifV0sXG4gICAgICB3ZWJQYXJhbXM6IHtcbiAgICAgICAgVGFiOiB0YWIsXG4gICAgICAgIFBhcmFtZXRlcjogcGFyYW1cbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDIsIGlvczogMTM4Mywgd3A6IDI0NjkgfSAvLyBmb3IgbmF0aXZlIGFwcHMgb25seVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTZWxlY3QgQWxidW1cbiAgICogVE9ETzogcmVuYW1lIHRvIG9wZW5cbiAgICpcbiAgICogQHBhcmFtIHtpZHxzdHJpbmd9IGlkIEFsYnVtIElEIChBbGJ1bSBOYW1lIHdpbGwgd29yayBhcyB3ZWxsLCBidXQgZG8gcHJlZmVyIElEcylcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBzZWxlY3RBbGJ1bTogZnVuY3Rpb24oaWQpIHtcbiAgICBpZiAoIWlzU3RyaW5nKGlkKSAmJiAhaXNOdW1iZXIoaWQpKSB7XG4gICAgICBsb2cuZXJyb3IoJ3NlbGVjdEFsYnVtOiBpbnZhbGlkIGFsYnVtIG5hbWUnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzLFxuICAgICAgd2ViRm46ICdzZWxlY3RBbGJ1bScsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGlkfV0sXG4gICAgICB3ZWJQYXJhbXM6IGlkXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gUGljdHVyZVxuICAgKiAob2xkIFNob3dQaWN0dXJlKVxuICAgKiBBbmRyb2lkIGRvZXMgbm90IHN1cHBvcnQgZ2lmcyA6KFxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIEltYWdlIFVSTCBzaG91bGQgY290YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlblBpY3R1cmU6IGZ1bmN0aW9uKHVybCkge1xuICAgIGlmICghaXNTdHJpbmcodXJsKSB8fCAhdXJsLm1hdGNoKC9qcGckfHBuZyR8Z2lmJC9pKSkgeyAvLyBUT0RPOiBtb3JlIGltYWdlIHR5cGVzP1xuICAgICAgbG9nLmVycm9yKCdvcGVuUGljdHVyZTogaW52YWxpZCB1cmwnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA0LFxuICAgICAgd2ViRm46ICdzaG93UGljdHVyZScsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgd2ViUGFyYW1zOiB1cmwsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI1MDEsIGlvczogMjYzNiwgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBDYXB0aW9uIEJ1dHRvbi5cbiAgICogV29ya3Mgb25seSBpbiBuYXRpdmUgYXBwcy5cbiAgICogVGhlIGNhcHRpb24gYnV0dG9uIGlzIHRoZSB0ZXh0IGF0IHRoZSB0b3AgcmlnaHQgb2YgdGhlIGFwcC5cbiAgICogKG1haW5seSB1c2VkIGZvciBsb2dpbiBvciB0aGUgdXNlcm5hbWUpXG4gICAqIFRPRE86IGltcGxlbWVudCBpbnRvIENoYXlucyBXZWI/XG4gICAqIFRPRE86IHJlbmFtZSB0byBzZXQ/XG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0IFRoZSBCdXR0b24ncyB0ZXh0XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGNhcHRpb24gYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgY3JlYXRlQ2FwdGlvbkJ1dHRvbjogZnVuY3Rpb24odGV4dCwgY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIC8vbG9nLmVycm9yKCdUaGVyZSBpcyBubyB2YWxpZCBjYWxsYmFjayBGdW5jdGlvbi4nKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgbm8gdmFsaWQgY2FsbGJhY2sgRnVuY3Rpb24uJyk7XG4gICAgICAvL3JldHVybiBmYWxzZTtcbiAgICB9XG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdjYXB0aW9uQnV0dG9uQ2FsbGJhY2soKSc7XG5cbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDUsXG4gICAgICBwYXJhbXM6IFt7c3RyaW5nOiB0ZXh0fSwge2NhbGxiYWNrOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OCwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9LFxuICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogSGlkZSBhIENhcHRpb24gQnV0dG9uLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKiBUaGUgY2FwdGlvbiBidXR0b24gaXMgdGhlIHRleHQgYXQgdGhlIHRvcCByaWdodCBvZiB0aGUgYXBwLlxuICAgKiAobWFpbmx5IHVzZWQgZm9yIGxvZ2luIG9yIHRoZSB1c2VybmFtZSlcbiAgICpcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBoaWRlQ2FwdGlvbkJ1dHRvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA2LFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAxMzU4LCBpb3M6IDEzNjYsIHdwOiAyNDY5IH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRmFjZWJvb2sgQ29ubmVjdFxuICAgKiBOT1RFOiBwcmVmZXIgYGNoYXlucy5sb2dpbigpYCBvdmVyIHRoaXMgbWV0aG9kIHRvIHBlcmZvcm0gYSB1c2VyIGxvZ2luLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3Blcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcyddIEZhY2Vib29rIFBlcm1pc3Npb25zLCBzZXBhcmF0ZWQgYnkgY29tbWFcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtyZWxvYWRQYXJhbSA9ICdjb21tZW50J10gUmVsb2FkIFBhcmFtXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgLy8gVE9ETzogdGVzdCBwZXJtaXNzaW9uc1xuICBmYWNlYm9va0Nvbm5lY3Q6IGZ1bmN0aW9uKHBlcm1pc3Npb25zID0gJ3VzZXJfZnJpZW5kcycsIHJlbG9hZFBhcmFtID0gJ2NvbW1lbnQnKSB7XG4gICAgcmVsb2FkUGFyYW0gPSByZWxvYWRQYXJhbTtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDcsXG4gICAgICB3ZWJGbjogJ2ZhY2Vib29rQ29ubmVjdCcsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHBlcm1pc3Npb25zfSwgeydGdW5jdGlvbic6ICdFeGVjQ29tbWFuZD1cIicgKyByZWxvYWRQYXJhbSArICdcIid9XSxcbiAgICAgIHdlYlBhcmFtczoge1xuICAgICAgICBSZWxvYWRQYXJhbWV0ZXI6ICdFeGVjQ29tbWFuZD0nICsgcmVsb2FkUGFyYW0sXG4gICAgICAgIFBlcm1pc3Npb25zOiBwZXJtaXNzaW9uc1xuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMTM1OSwgaW9zOiAxMzY2LCB3cDogMjQ2OSB9LFxuICAgICAgZmFsbGJhY2tDbWQ6IDggLy8gaW4gY2FzZSB0aGUgYWJvdmUgaXMgbm90IHN1cHBvcnQgdGhlIGZhbGxiYWNrQ21kIHdpbGwgcmVwbGFjZSB0aGUgY21kXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gTGluayBpbiBCcm93c2VyXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVVJMXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlbkxpbmtJbkJyb3dzZXI6IGZ1bmN0aW9uKHVybCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogOSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKCc6Ly8nKSA9PT0gLTEpIHtcbiAgICAgICAgICB1cmwgPSAnLy8nICsgdXJsOyAvLyBvciBhZGQgbG9jYXRpb24ucHJvdG9jb2wgcHJlZml4IGFuZCAvLyBUT0RPOiB0ZXN0XG4gICAgICAgIH1cbiAgICAgICAgd2luZG93Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjQ2Niwgd3A6IDI1NDMgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBTaG93IEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIEZ1bmN0aW9uIHdoZW4gdGhlIGJhY2sgYnV0dG9uIHdhcyBjbGlja2VkXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgc2hvd0JhY2tCdXR0b246IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBoaXN0b3J5LmJhY2soKTtcbiAgICAgICAgY2hheW5zQXBpSW50ZXJmYWNlLmhpZGVCYWNrQnV0dG9uKCk7XG4gICAgICB9O1xuICAgIH1cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JhY2tCdXR0b25DYWxsYmFjaygpJztcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTAsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfSxcbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBIaWRlIEJhY2tCdXR0b24uXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgaGlkZUJhY2tCdXR0b246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTEsXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI0MDUsIGlvczogMjYzNiwgd3A6IDI0NjkgfVxuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIE9wZW4gSW50ZXJDb20uXG4gICAqIFdvcmtzIG9ubHkgaW4gbmF0aXZlIGFwcHMuXG4gICAqXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBGYWxzZSBvbiBlcnJvciwgdHJ1ZSBpZiBjYWxsIHN1Y2NlZWRlZFxuICAgKi9cbiAgb3BlbkludGVyQ29tOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDEyLFxuICAgICAgc3VwcG9ydDogeyBhbmRyb2lkOiAyNDAyLCBpb3M6IDEzODMsIHdwOiAyNTQzIH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0IEdlb2xvY2F0aW9uLlxuICAgKiBuYXRpdmUgYXBwcyBvbmx5IChidXQgY291bGQgd29yayBpbiB3ZWIgYXMgd2VsbCwgbmF2aWdhdG9yLmdlb2xvY2F0aW9uKVxuICAgKlxuICAgKiBUT0RPOiBjb250aW51b3VzVHJhY2tpbmcgd2FzIHJlbW92ZWRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gd2hlbiB0aGUgYmFjayBidXR0b24gd2FzIGNsaWNrZWRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBnZXRHZW9Mb2NhdGlvbjogZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnZ2V0R2VvTG9jYXRpb25DYWxsYmFjaygpJztcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIC8vIFRPRE86IHJlbW92ZSBjb25zb2xlXG4gICAgICAvLyBUT0RPOiBhbGxvdyBlbXB0eSBjYWxsYmFja3Mgd2hlbiBpdCBpcyBhbHJlYWR5IHNldFxuICAgICAgY29uc29sZS53YXJuKCdubyBjYWxsYmFjayBmdW5jdGlvbicpO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7IGFuZHJvaWQ6IDI1MDEsIGlvczogMjQ2Niwgd3A6IDI0NjkgfSxcbiAgICAgIC8vd2ViRm46IGZ1bmN0aW9uKCkgeyBuYXZpZ2F0b3IuZ2VvbG9jYXRpb247IH1cbiAgICAgIGNiOiBjYWxsYmFja1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPcGVuIFZpZGVvXG4gICAqIChvbGQgU2hvd1ZpZGVvKVxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFZpZGVvIFVSTCBzaG91bGQgY290YWluIGpwZyxwbmcgb3IgZ2lmXG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgb3BlblZpZGVvOiBmdW5jdGlvbih1cmwpIHtcbiAgICBpZiAoIWlzU3RyaW5nKHVybCkgfHwgIXVybC5tYXRjaCgvLipcXC4uezIsfS8pKSB7IC8vIFRPRE86IFdURiBSZWdleFxuICAgICAgbG9nLmVycm9yKCdvcGVuVmlkZW86IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMTUsXG4gICAgICB3ZWJGbjogJ3Nob3dWaWRlbycsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IHVybH1dLFxuICAgICAgd2ViUGFyYW1zOiB1cmxcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2hvdyBEaWFsb2dcbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHtjb250ZW50OntTdHJpbmd9ICwgaGVhZGxpbmU6ICxidXR0b25zOntBcnJheX0sIG5vQ29udGVudG5QYWRkaW5nOiwgb25Mb2FkOn1cbiAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAqL1xuICBzaG93RGlhbG9nOiBmdW5jdGlvbiBzaG93RGlhbG9nKG9iaikge1xuICAgIGlmICghb2JqIHx8ICFpc09iamVjdChvYmopKSB7XG4gICAgICBsb2cud2Fybignc2hvd0RpYWxvZzogaW52YWxpZCBwYXJhbWV0ZXJzJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChpc1N0cmluZyhvYmouY29udGVudCkpIHtcbiAgICAgIG9iai5jb250ZW50ID0gdHJpbShvYmouY29udGVudC5yZXBsYWNlKC88YnJbIC9dKj8+L2csICdcXG4nKSk7XG4gICAgfVxuICAgIGlmICghaXNBcnJheShvYmouYnV0dG9ucykgfHwgb2JqLmJ1dHRvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICBvYmouYnV0dG9ucyA9IFsobmV3IFBvcHVwQnV0dG9uKCdPSycpKS50b0hUTUwoKV07XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdDaGF5bnNEaWFsb2dDYWxsQmFjaygpJztcbiAgICBmdW5jdGlvbiBjYWxsYmFja0ZuKGJ1dHRvbnMsIGlkKSB7XG4gICAgICBpZCA9IHBhcnNlSW50KGlkLCAxMCkgLSAxO1xuICAgICAgaWYgKGJ1dHRvbnNbaWRdKSB7XG4gICAgICAgIGJ1dHRvbnNbaWRdLmNhbGxiYWNrLmNhbGwobnVsbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxNiwgLy8gVE9ETzogaXMgc2xpdHRlOi8vXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX0sXG4gICAgICAgIHsnc3RyaW5nJzogb2JqLmhlYWRsaW5lfSxcbiAgICAgICAgeydzdHJpbmcnOiBvYmouY29udGVudH0sXG4gICAgICAgIHsnc3RyaW5nJzogb2JqLmJ1dHRvbnNbMF0ubmFtZX0gLy8gVE9ETzogbmVlZHMgZW5jb2RlVVJJP1xuICAgICAgICAvL3snc3RyaW5nJzogb2JqLmJ1dHRvbnNbMV0ubmFtZX0sIC8vIFRPRE86IG5lZWRzIGVuY29kZVVSST9cbiAgICAgICAgLy97J3N0cmluZyc6IG9iai5idXR0b25zWzJdLm5hbWV9IC8vIFRPRE86IG5lZWRzIGVuY29kZVVSST9cbiAgICAgIF0sXG4gICAgICBjYjogY2FsbGJhY2tGbi5iaW5kKG51bGwsIG9iai5idXR0b25zKSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNjA2fSxcbiAgICAgIGZhbGxiYWNrRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnZmFsbGJhY2sgcG9wdXAnLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG5cbiAgLyoqXG4gICAqIEZvcm1lcmx5IGtub3duIGFzIGdldEFwcEluZm9zXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgd2l0aCB0aGUgQXBwRGF0YVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICAgIC8vIFRPRE86IHVzZSBmb3JjZVJlbG9hZCBhbmQgY2FjaGUgQXBwRGF0YVxuICBnZXRHbG9iYWxEYXRhOiBmdW5jdGlvbihjYWxsYmFjaywgZm9yY2VSZWxvYWQpIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybignZ2V0R2xvYmFsRGF0YTogY2FsbGJhY2sgaXMgbm8gdmFsaWQgYEZ1bmN0aW9uYC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFmb3JjZVJlbG9hZCAmJiBnbG9iYWxEYXRhKSB7XG4gICAgICBjYWxsYmFjayhnbG9iYWxEYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxOCxcbiAgICAgIHdlYkZuOiAnZ2V0QXBwSW5mb3MnLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdnZXRHbG9iYWxEYXRhKCknfV0sIC8vIGNhbGxiYWNrIHBhcmFtIG9ubHkgb24gbW9iaWxlXG4gICAgICBjYjogY2FsbGJhY2tcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogVmlicmF0ZVxuICAgKiBAcGFyYW0ge0ludGVnZXJ9IGR1cmF0aW9uIFRpbWUgaW4gbWlsbGlzZWNvbmRzXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBjYWxsIHN1Y2NlZWRlZCBvciBpcyBhc3luYywgZmFsc2Ugb24gZXJyb3JcbiAgICovXG4gIHZpYnJhdGU6IGZ1bmN0aW9uKGR1cmF0aW9uKSB7XG4gICAgaWYgKCFpc051bWJlcihkdXJhdGlvbikgfHwgZHVyYXRpb24gPCAyKSB7XG4gICAgICBkdXJhdGlvbiA9IDE1MDtcbiAgICB9XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAxOSxcbiAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IGR1cmF0aW9uLnRvU3RyaW5nKCl9XSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbiBuYXZpZ2F0b3JWaWJyYXRlKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG5hdmlnYXRvci52aWJyYXRlKDEwMCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBsb2cuaW5mbygndmlicmF0ZTogdGhlIGRldmljZSBkb2VzIG5vdCBzdXBwb3J0IHZpYnJhdGUnKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNjk1LCBpb3M6IDI1OTYsIHdwOiAyNTE1fVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBOYXZpZ2F0ZSBCYWNrLlxuICAgKiBXb3JrcyBvbmx5IGluIG5hdGl2ZSBhcHBzLlxuICAgKlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gRmFsc2Ugb24gZXJyb3IsIHRydWUgaWYgY2FsbCBzdWNjZWVkZWRcbiAgICovXG4gIG5hdmlnYXRlQmFjazogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAyMCxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgaGlzdG9yeS5iYWNrKCk7XG4gICAgICB9LFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI2OTYsIGlvczogMjYwMCwgd3A6IDI1MTV9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEltYWdlIFVwbG9hZFxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBDYWxsYmFjayBGdW5jdGlvbiB0byBiZSBpbnZva2VkIHdpdGggaW1hZ2UgdXJsIGFmdGVyIHVwbG9hZFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICB1cGxvYWRJbWFnZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZiAoIWlzRnVuY3Rpb24oY2FsbGJhY2spKSB7XG4gICAgICBsb2cud2FybigndXBsb2FkSW1hZ2U6IG5vIHZhbGlkIGNhbGxiYWNrJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnaW1hZ2VVcGxvYWRDYWxsYmFjaygpJztcbiAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICBjbWQ6IDIxLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLCAvLyBjYWxsYmFjayBwYXJhbSBvbmx5IG9uIG1vYmlsZVxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgd2ViRm46IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgaW5wdXQgPSBET00uY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCd0eXBlJywgJ2ZpbGUnKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCd2YWx1ZScsICcnKTtcbiAgICAgICAgaW5wdXQuc2V0QXR0cmlidXRlKCdhY2NlcHQnLCAnaW1hZ2UvKicpO1xuICAgICAgICAvL2lucHV0LnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLWltYWdlLXVwbG9hZC1maWVsZCk7XG4gICAgICAgIGlucHV0LnNldEF0dHJpYnV0ZSgnb25jaGFuZ2UnLCAnaW1hZ2VDaG9zZW4oKScpO1xuICAgICAgICBpbnB1dC5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2NoYXluc19fdXBsb2FkLWltYWdlJyk7XG4gICAgICAgIERPTS5xdWVyeSgnI2NoYXlucy1yb290JykuYXBwZW5kQ2hpbGQoaW5wdXQpO1xuICAgICAgICAvL3ZhciBmZCA9IG5ldyBGb3JtRGF0YSgpO1xuICAgICAgICAvL2ZkLmFwcGVuZChcIkltYWdlXCIsIGZpbGVbMF0pO1xuICAgICAgICAvL3dpbmRvdy5pbWFnZUNob3NlbiA9IHdpbmRvdy5mZXRjaCh7XG4gICAgICAgIC8vICB0eXBlOiBcIlBPU1RcIixcbiAgICAgICAgLy8gIHVybDogXCIvL2NoYXluczEudG9iaXQuY29tL1RhcHBBcGkvRmlsZS9JbWFnZVwiLFxuICAgICAgICAvLyAgY29udGVudFR5cGU6IGZhbHNlLFxuICAgICAgICAvLyAgcHJvY2Vzc0RhdGE6IGZhbHNlLFxuICAgICAgICAvLyAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAvLyAgZGF0YTogZmRcbiAgICAgICAgLy99KS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gIGRlbGV0ZSB3aW5kb3cuaW1hZ2VDaG9zZW47XG4gICAgICAgIC8vICBjYWxsYmFjay5jYWxsKG51bGwsIGRhdGEpO1xuICAgICAgICAvL30pO1xuICAgICAgICAvLyQoXCIjQ2hheW5zSW1hZ2VVcGxvYWRcIikuY2xpY2soKTtcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMjcwNSwgd3A6IDI1MzgsIGlvczogMjY0Mn1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IE5GQyBDYWxsYmFja1xuICAgKiBUT0RPOiByZWZhY3RvciBhbmQgdGVzdFxuICAgKiBUT0RPOiB3aHkgdHdvIGNhbGxzP1xuICAgKiBDYW4gd2UgaW1wcm92ZSB0aGlzIHNoaXQ/IHNwbGl0IGludG8gdHdvIG1ldGhvZHNcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQ2FsbGJhY2sgRnVuY3Rpb24gZm9yIE5GQ1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY2FsbCBzdWNjZWVkZWQgb3IgaXMgYXN5bmMsIGZhbHNlIG9uIGVycm9yXG4gICAqL1xuICBzZXROZmNDYWxsYmFjazogZnVuY3Rpb24oY2FsbGJhY2ssIHJlc3BvbnNlKSB7XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDM3LFxuICAgICAgICBwYXJhbXM6IFt7J0Z1bmN0aW9uJzogJ251bGwnfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgIH0pICYmIGFwaUNhbGwoe1xuICAgICAgICAgIGNtZDogMzcsXG4gICAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAzMjM0LCB3cDogMzEyMX1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciBjbWQgPSAocmVzcG9uc2UgPT09IG5mY1Jlc3BvbnNlRGF0YS5QZXJzb25JZCkgPyAzNyA6IDM4O1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiBjbWQgPT09IDM3ID8gMzggOiAzNyxcbiAgICAgICAgcGFyYW1zOiBbeydGdW5jdGlvbic6ICdudWxsJ31dLFxuICAgICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzIzNCwgd3A6IDMxMjF9XG4gICAgICB9KSAmJiBhcGlDYWxsKHtcbiAgICAgIGNtZDogY21kLFxuICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6ICdOZmNDYWxsYmFjayd9XSwgLy8gY2FsbGJhY2sgcGFyYW0gb25seSBvbiBtb2JpbGVcbiAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgIHN1cHBvcnQ6IHsgYW5kcm9pZDogMzIzNCwgd3A6IDMxMjEgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBWaWRlbyBQbGF5ZXIgQ29udHJvbHNcbiAgICogQWN1dGFsbHkgbmF0aXZlIG9ubHlcbiAgICogVE9ETzogY291bGQgdGhlb3JldGljYWxseSB3b3JrIGluIENoYXlucyBXZWJcbiAgICogVE9ETzogZXhhbXBsZT8gd2hlcmUgZG9lcyB0aGlzIHdvcms/XG4gICAqL1xuICBwbGF5ZXI6IHtcbiAgICB1c2VEZWZhdWx0VXJsOiBmdW5jdGlvbiB1c2VEZWZhdWx0VXJsKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDIyLFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBjaGFuZ2VVcmw6IGZ1bmN0aW9uIGNoYW5nZVVybCh1cmwpIHtcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyMixcbiAgICAgICAgcGFyYW1zOiBbeydTdHJpbmcnOiB1cmx9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGhpZGVCdXR0b246IGZ1bmN0aW9uIGhpZGVCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDB9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHNob3dCdXR0b246IGZ1bmN0aW9uIHNob3dCdXR0b24oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjMsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBhdXNlOiBmdW5jdGlvbiBwYXVzZVZpZGVvKCkge1xuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI0LFxuICAgICAgICBwYXJhbXM6IFt7J0ludGVnZXInOiAwfV0sXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzUyLCBpb3M6IDI2NDQsIHdwOiAyNTQzfVxuICAgICAgfSk7XG4gICAgfSxcbiAgICBwbGF5OiBmdW5jdGlvbiBwbGF5VmlkZW8oKSB7XG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjQsXG4gICAgICAgIHBhcmFtczogW3snSW50ZWdlcic6IDF9XSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NTIsIGlvczogMjY0NCwgd3A6IDI1NDN9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIHBsYXliYWNrU3RhdHVzOiBmdW5jdGlvbiBwbGF5YmFja1N0YXR1cyhjYWxsYmFjaykge1xuXG4gICAgICByZXR1cm4gY2hheW5zQXBpSW50ZXJmYWNlLmdldEdsb2JhbERhdGEoZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2suY2FsbChudWxsLCB7XG4gICAgICAgICAgQXBwQ29udHJvbFZpc2libGU6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uSXNBcHBDb250cm9sVmlzaWJsZSxcbiAgICAgICAgICBTdGF0dXM6IGRhdGEuQXBwSW5mby5QbGF5YmFja0luZm8uUGxheWJhY2tTdGF0dXMsXG4gICAgICAgICAgVXJsOiBkYXRhLkFwcEluZm8uUGxheWJhY2tJbmZvLlN0cmVhbVVybFxuICAgICAgICB9KTtcbiAgICAgIH0sIHRydWUpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQmx1ZXRvb3RoXG4gICAqIE9ubHkgaW4gbmF0aXZlIEFwcHMgKGlvcyBhbmQgYW5kcm9pZClcbiAgICovXG4gIGJsdWV0b290aDoge1xuICAgIExFU2VuZFN0cmVuZ3RoOiB7IC8vIFRPRE86IHdoYXQgaXMgdGhhdD9cbiAgICAgIEFkamFjZW50OiAwLFxuICAgICAgTmVhcmJ5OiAxLFxuICAgICAgRGVmYXVsdDogMixcbiAgICAgIEZhcjogM1xuICAgIH0sXG4gICAgTEVTY2FuOiBmdW5jdGlvbiBMRVNjYW4oY2FsbGJhY2spIHtcbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFU2Nhbjogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdibGVSZXNwb25zZUNhbGxiYWNrJztcbiAgICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgICAgY21kOiAyNixcbiAgICAgICAgcGFyYW1zOiBbeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX1dLFxuICAgICAgICBjYjogY2FsbGJhY2ssXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9LFxuICAgIExFQ29ubmVjdDogZnVuY3Rpb24gTEVDb25uZWN0KGFkZHJlc3MsIGNhbGxiYWNrLCBwYXNzd29yZCkge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRUNvbm5lY3Q6IG5vIHZhbGlkIGFkZHJlc3MgcGFyYW1ldGVyJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgbG9nLndhcm4oJ0xFQ29ubmVjdDogbm8gdmFsaWQgY2FsbGJhY2snKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFpc1N0cmluZyhwYXNzd29yZCkgfHwgIXBhc3N3b3JkLm1hdGNoKC9eWzAtOWEtZl17NiwxMn0kL2kpKSB7XG4gICAgICAgIHBhc3N3b3JkID0gJyc7XG4gICAgICB9XG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snO1xuXG4gICAgICByZXR1cm4gYXBpQ2FsbCh7XG4gICAgICAgIGNtZDogMjcsXG4gICAgICAgIHBhcmFtczogW3snc3RyaW5nJzogYWRkcmVzc30sIHsnc3RyaW5nJzogcGFzc3dvcmR9XSxcbiAgICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgICBjYWxsYmFja05hbWU6IGNhbGxiYWNrTmFtZSxcbiAgICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDI3NzEsIGlvczogMjY1MX1cbiAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogVE9ETzogY29uc2lkZXIgT2JqZWN0IGFzIHBhcmFtZXRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZGRyZXNzXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzdWJJZFxuICAgICAqIEBwYXJhbSB7SW50ZWdlcn0gbWVhc3VyZVBvd2VyXG4gICAgICogQHBhcmFtIHtJbnRlZ2VyfSBzZW5kU3RyZW5ndGhcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAqL1xuICAgIExFV3JpdGU6IGZ1bmN0aW9uIExFV3JpdGUoYWRkcmVzcywgc3ViSWQsIG1lYXN1cmVQb3dlciwgc2VuZFN0cmVuZ3RoLCBjYWxsYmFjaykge1xuICAgICAgaWYgKCFpc1N0cmluZyhhZGRyZXNzKSB8fCAhaXNCTEVBZGRyZXNzKGFkZHJlc3MpKSB7XG4gICAgICAgIGxvZy53YXJuKCdMRVdyaXRlOiBubyB2YWxpZCBhZGRyZXNzIHBhcmFtZXRlcicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHN1YklkKSB8fCBzdWJJZCA8IDAgfHwgc3ViSWQgPiA0MDk1KSB7XG4gICAgICAgIHN1YklkID0gJ251bGwnO1xuICAgICAgfVxuICAgICAgaWYgKCFpc051bWJlcihtZWFzdXJlUG93ZXIpIHx8IG1lYXN1cmVQb3dlciA8IC0xMDAgfHwgbWVhc3VyZVBvd2VyID4gMCkge1xuICAgICAgICBtZWFzdXJlUG93ZXIgPSAnbnVsbCc7XG4gICAgICB9XG4gICAgICBpZiAoIWlzTnVtYmVyKHNlbmRTdHJlbmd0aCkgfHwgc2VuZFN0cmVuZ3RoIDwgMCB8fCBzZW5kU3RyZW5ndGggPiAzKSB7XG4gICAgICAgIHNlbmRTdHJlbmd0aCA9ICdudWxsJztcbiAgICAgIH1cbiAgICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2JsZVJlc3BvbnNlQ2FsbGJhY2snLFxuICAgICAgICB1aWQgPSAnN0EwN0UxN0EtQTE4OC00MTZFLUI3QTAtNUEzNjA2NTEzRTU3JztcblxuICAgICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgICBjbWQ6IDI4LFxuICAgICAgICBwYXJhbXM6IFtcbiAgICAgICAgICB7J3N0cmluZyc6IGFkZHJlc3N9LFxuICAgICAgICAgIHsnc3RyaW5nJzogdWlkfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzdWJJZH0sXG4gICAgICAgICAgeydJbnRlZ2VyJzogbWVhc3VyZVBvd2VyfSxcbiAgICAgICAgICB7J0ludGVnZXInOiBzZW5kU3RyZW5ndGh9XG4gICAgICAgIF0sXG4gICAgICAgIGNiOiBjYWxsYmFjayxcbiAgICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWUsXG4gICAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAyNzcxLCBpb3M6IDI2NTF9XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gVE9ETzsgdXNlIGBPYmplY3RgIGFzIHBhcmFtc1xuICAvLyBUT0RPOiB3aGF0IGFyZSBvcHRpb25hbCBwYXJhbXM/IHZhbGlkYXRlIG5hbWUgYW5kIGxvY2F0aW9uP1xuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQXBwb2ludG1lbnQncyBuYW1lXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsb2NhdGlvbiBBcHBvaW50bWVudCdzIGxvY2F0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBbZGVzY3JpcHRpb25dIEFwcG9pbnRtZW50J3MgZGVzY3JpcHRpb25cbiAgICogQHBhcmFtIHtEYXRlfSBzdGFydCBBcHBvaW50bWVudHMncyBTdGFydERhdGVcbiAgICogQHBhcmFtIHtEYXRlfSBlbmQgQXBwb2ludG1lbnRzJ3MgRW5kRGF0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNhdmVBcHBvaW50bWVudDogZnVuY3Rpb24gc2F2ZUFwcG9pbnRtZW50KG5hbWUsIGxvY2F0aW9uLCBkZXNjcmlwdGlvbiwgc3RhcnQsIGVuZCkge1xuICAgIGlmICghaXNTdHJpbmcobmFtZSkgfHwgIWlzU3RyaW5nKGxvY2F0aW9uKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogbm8gdmFsaWQgbmFtZSBhbmQvb3IgbG9jYXRpb24nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0RhdGUoc3RhcnQpIHx8ICFpc0RhdGUoZW5kKSkge1xuICAgICAgbG9nLndhcm4oJ3NhdmVBcHBvaW50bWVudDogc3RhcnQgYW5kL29yIGVuZERhdGUgaXMgbm8gdmFsaWQgRGF0ZSBgT2JqZWN0YC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgc3RhcnQgPSBwYXJzZUludChzdGFydC5nZXRUaW1lKCkgLyAxMDAwLCAxMCk7XG4gICAgZW5kID0gcGFyc2VJbnQoZW5kLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMjksXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydzdHJpbmcnOiBuYW1lfSxcbiAgICAgICAgeydzdHJpbmcnOiBsb2NhdGlvbn0sXG4gICAgICAgIHsnc3RyaW5nJzogZGVzY3JpcHRpb259LFxuICAgICAgICB7J0ludGVnZXInOiBzdGFydH0sXG4gICAgICAgIHsnSW50ZWdlcic6IGVuZH1cbiAgICAgIF0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzA1NCwgaW9zOiAzMDY3LCB3cDogMzAzMH1cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogRGF0ZVR5cGVzIEVudW1cbiAgICogc3RhcnRzIGF0IDFcbiAgICovXG4gIGRhdGVUeXBlOiB7XG4gICAgZGF0ZTogMSxcbiAgICB0aW1lOiAyLFxuICAgIGRhdGVUaW1lOiAzXG4gIH0sXG5cbiAgLyoqXG4gICAqIFNlbGVjdCBEYXRlXG4gICAqIE9sZDogRGF0ZVNlbGVjdFxuICAgKiBOYXRpdmUgQXBwcyBvbmx5LiBUT0RPOiBhbHNvIGluIENoYXlucyBXZWI/IEhUTUw1IERhdGVwaWNrZXIgZXRjXG4gICAqIFRPRE87IHJlY29uc2lkZXIgb3JkZXIgZXRjXG4gICAqIEBwYXJhbSB7ZGF0ZVR5cGV8TnVtYmVyfSBkYXRlVHlwZSBFbnVtIDEtMjogdGltZSwgZGF0ZSwgZGF0ZXRpbWUuIHVzZSBjaGF5bnMuZGF0ZVR5cGVcbiAgICogQHBhcmFtIHtOdW1iZXJ8RGF0ZX0gcHJlU2VsZWN0IFByZXNldCB0aGUgRGF0ZSAoZS5nLiBjdXJyZW50IERhdGUpXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgdGhlIGNob3NlbiBEYXRlIGFzIFRpbWVzdGFtcFxuICAgKiBAcGFyYW0ge051bWJlcnxEYXRlfSBtaW5EYXRlIE1pbmltdW0gU3RhcnREYXRlXG4gICAqIEBwYXJhbSB7TnVtYmVyfERhdGV9IG1heERhdGUgTWF4aW11bSBFbmREYXRlXG4gICAqL1xuICBzZWxlY3REYXRlOiBmdW5jdGlvbiBzZWxlY3REYXRlKGRhdGVUeXBlLCBwcmVTZWxlY3QsIGNhbGxiYWNrLCBtaW5EYXRlLCBtYXhEYXRlKSB7XG5cbiAgICBpZiAoIWlzTnVtYmVyKGRhdGVUeXBlKSB8fCBkYXRlVHlwZSA8PSAwKSB7XG4gICAgICBsb2cud2Fybignc2VsZWN0RGF0ZTogd3JvbmcgZGF0ZVR5cGUnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ3NlbGVjdERhdGU6IGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHZhbGlkYXRlVmFsdWUodmFsdWUpIHtcbiAgICAgIGlmICghaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlSW50KHZhbHVlLmdldFRpbWUoKSAvIDEwMDAsIDEwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHByZVNlbGVjdCA9IHZhbGlkYXRlVmFsdWUocHJlU2VsZWN0KTtcbiAgICBtaW5EYXRlID0gdmFsaWRhdGVWYWx1ZShtaW5EYXRlKTtcbiAgICBtYXhEYXRlID0gdmFsaWRhdGVWYWx1ZShtYXhEYXRlKTtcblxuICAgIGxldCBkYXRlUmFuZ2UgPSAnJztcbiAgICBpZiAobWluRGF0ZSA+IC0xICYmIG1heERhdGUgPiAtMSkge1xuICAgICAgZGF0ZVJhbmdlID0gJywnICsgbWluRGF0ZSArICcsJyArIG1heERhdGU7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdzZWxlY3REYXRlQ2FsbGJhY2snO1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrRm4oY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QsIHRpbWUpIHtcbiAgICAgIC8vIFRPRE86IGltcG9ydGFudCB2YWxpZGF0ZSBEYXRlXG4gICAgICAvLyBUT0RPOiBjaG9vc2UgcmlnaHQgZGF0ZSBieSBkYXRlVHlwZUVudW1cbiAgICAgIGxvZy5kZWJ1ZyhkYXRlVHlwZSwgcHJlU2VsZWN0KTtcbiAgICAgIGNhbGxiYWNrLmNhbGwobnVsbCwgdGltZSA/IG5ldyBEYXRlKHRpbWUpIDogLTEpO1xuICAgIH1cblxuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzAsXG4gICAgICBwYXJhbXM6IFtcbiAgICAgICAgeydjYWxsYmFjayc6IGNhbGxiYWNrTmFtZX0sXG4gICAgICAgIHsnSW50ZWdlcic6IGRhdGVUeXBlfSxcbiAgICAgICAgeydJbnRlZ2VyJzogcHJlU2VsZWN0ICsgZGF0ZVJhbmdlfVxuICAgICAgXSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2ssIGRhdGVUeXBlLCBwcmVTZWxlY3QpLFxuICAgICAgc3VwcG9ydDoge2FuZHJvaWQ6IDMwNzIsIGlvczogMzA2Miwgd3A6IDMwMzB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9wZW4gVVJMIGluIEFwcFxuICAgKiAob2xkIFNob3dVUkxJbkFwcClcbiAgICogbm90IHRvIGNvbmZ1c2Ugd2l0aCBvcGVuTGlua0luQnJvd3NlclxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFZpZGVvIFVSTCBzaG91bGQgY29udGFpbiBqcGcscG5nIG9yIGdpZlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gICAgLy8gVE9ETzogaW1wbGVtZW50IENoYXlucyBXZWIgTWV0aG9kIGFzIHdlbGwgKG5hdmlnYXRlIGJhY2sgc3VwcG9ydClcbiAgb3BlblVybDogZnVuY3Rpb24gb3BlblVybCh1cmwsIHRpdGxlKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cuZXJyb3IoJ29wZW5Vcmw6IGludmFsaWQgdXJsJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzMSxcbiAgICAgIHdlYkZuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbG9jYXRpb24uaHJlZiA9IHVybDsgLy8gVE9ETzogbWFrZSBzdXJlIGl0IHdvcmtzXG4gICAgICB9LFxuICAgICAgcGFyYW1zOiBbeydzdHJpbmcnOiB1cmx9LCB7J3N0cmluZyc6IHRpdGxlfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogMzExMCwgaW9zOiAzMDc0LCB3cDogMzA2M31cbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogY3JlYXRlIFFSIENvZGVcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBkYXRhIFFSIENvZGUgZGF0YVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBGdW5jdGlvbiB3aGljaCByZWNlaXZlcyB0aGUgYmFzZTY0IGVuY29kZWQgSU1HIFRPRE86IHdoaWNoIHR5cGU/XG4gICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgKi9cbiAgY3JlYXRlUVJDb2RlOiBmdW5jdGlvbiBjcmVhdGVRUkNvZGUoZGF0YSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWlzU3RyaW5nKGRhdGEpKSB7XG4gICAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfVxuXG4gICAgaWYgKCFpc0Z1bmN0aW9uKGNhbGxiYWNrKSkge1xuICAgICAgbG9nLndhcm4oJ2NyZWF0ZVFSQ29kZTogdGhlIGNhbGxiYWNrIGlzIG5vIGBGdW5jdGlvbmAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBsZXQgY2FsbGJhY2tOYW1lID0gJ2NyZWF0ZVFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzMsXG4gICAgICBwYXJhbXM6IFt7J3N0cmluZyc6IGRhdGF9LCB7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrLFxuICAgICAgY2FsbGJhY2tOYW1lOiBjYWxsYmFja05hbWVcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogc2NhbiBRUiBDb2RlXG4gICAqIFNjYW5zIFFSIENvZGUgYW5kIHJlYWQgaXRcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgRnVuY3Rpb24gd2hpY2ggcmVjZWl2ZXMgdGhlIHJlc3VsdFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIHNjYW5RUkNvZGU6IGZ1bmN0aW9uIHNjYW5RUkNvZGUoY2FsbGJhY2spIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdzY2FuUVJDb2RlOiB0aGUgY2FsbGJhY2sgaXMgbm8gYEZ1bmN0aW9uYCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGxldCBjYWxsYmFja05hbWUgPSAnc2NhblFSQ29kZUNhbGxiYWNrKCknO1xuICAgIHJldHVybiBhcGlDYWxsKHtcbiAgICAgIGNtZDogMzQsXG4gICAgICBwYXJhbXM6IFt7J2NhbGxiYWNrJzogY2FsbGJhY2tOYW1lfV0sXG4gICAgICBzdXBwb3J0OiB7YW5kcm9pZDogIDMyMjAsIGlvczogMTM3Miwgd3A6IDMxMDZ9LFxuICAgICAgY2I6IGNhbGxiYWNrXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIHNjYW4gUVIgQ29kZVxuICAgKiBTY2FucyBRUiBDb2RlIGFuZCByZWFkIGl0XG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEZ1bmN0aW9uIHdoaWNoIHJlY2VpdmVzIHRoZSByZXN1bHRcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBnZXRMb2NhdGlvbkJlYWNvbnM6IGZ1bmN0aW9uIGdldExvY2F0aW9uQmVhY29ucyhjYWxsYmFjaywgZm9yY2VSZWxvYWQpIHtcblxuICAgIGlmICghaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICAgIGxvZy53YXJuKCdnZXRMb2NhdGlvbkJlYWNvbnM6IHRoZSBjYWxsYmFjayBpcyBubyBgRnVuY3Rpb25gJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgbGV0IGNhbGxiYWNrTmFtZSA9ICdnZXRCZWFjb25zQ2FsbEJhY2soKSc7XG4gICAgaWYgKGJlYWNvbkxpc3QgJiYgIWZvcmNlUmVsb2FkKSB7IC8vIFRPRE86IG1ha2Ugc3VyZSBpdCBpcyBnb29kIHRvIGNhY2hlIHRoZSBsaXN0XG4gICAgICBsb2cuZGVidWcoJ2dldExvY2F0aW9uQmVhY29uczogdGhlcmUgaXMgYWxyZWFkeSBvbmUgYmVhY29uTGlzdCcpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrLmNhbGwobnVsbCwgYmVhY29uTGlzdCk7XG4gICAgfVxuICAgIGxldCBjYWxsYmFja0ZuID0gZnVuY3Rpb24gZ2V0TG9jYXRpb25CZWFjb25DYWxsYmFjayhjYWxsYmFjaywgbGlzdCkge1xuICAgICAgYmVhY29uTGlzdCA9IGxpc3Q7XG4gICAgICBjYWxsYmFjay5jYWxsKG51bGwsIGxpc3QpO1xuICAgIH07XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiAzOSxcbiAgICAgIHBhcmFtczogW3snY2FsbGJhY2snOiBjYWxsYmFja05hbWV9XSxcbiAgICAgIHN1cHBvcnQ6IHthbmRyb2lkOiAgNDA0NSwgaW9zOiA0MDQ4fSxcbiAgICAgIGNiOiBjYWxsYmFja0ZuLmJpbmQobnVsbCwgY2FsbGJhY2spXG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZCB0byBQYXNzYm9va1xuICAgKiBpT1Mgb25seVxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFBhdGggdG8gUGFzc2Jvb2sgZmlsZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICovXG4gIGFkZFRvUGFzc2Jvb2s6IGZ1bmN0aW9uIGFkZFRvUGFzc2Jvb2sodXJsKSB7XG4gICAgaWYgKCFpc1N0cmluZyh1cmwpKSB7XG4gICAgICBsb2cud2FybignYWRkVG9QYXNzYm9vazogdXJsIGlzIGludmFsaWQuJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA0NyxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogdXJsfV0sXG4gICAgICBzdXBwb3J0OiB7aW9zOiA0MDQ1fSxcbiAgICAgIHdlYkZuOiBjaGF5bnNBcGlJbnRlcmZhY2Uub3BlbkxpbmtJbkJyb3dzZXIuYmluZChudWxsLCB1cmwpLFxuICAgICAgZmFsbGJhY2tGbjogY2hheW5zQXBpSW50ZXJmYWNlLm9wZW5MaW5rSW5Ccm93c2VyLmJpbmQobnVsbCwgdXJsKVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUb2JpdCBMb2dpblxuICAgKiBXaXRoIEZhY2Vib29rQ29ubmVjdCBGYWxsYmFja1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGFyYW1zIFJlbG9hZCBQYXJhbWV0ZXJcbiAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAqL1xuICBsb2dpbjogZnVuY3Rpb24gbG9naW4ocGFyYW1zKSB7XG4gICAgcGFyYW1zID0gJ0V4ZWNDb21tYW5kPScgKyBwYXJhbXM7XG4gICAgcmV0dXJuIGFwaUNhbGwoe1xuICAgICAgY21kOiA1NCxcbiAgICAgIHBhcmFtczogW3snc3RyaW5nJzogcGFyYW1zfV0sXG4gICAgICBzdXBwb3J0OiB7aW9zOiA0MjQwLCB3cDogNDA5OX0sXG4gICAgICBmYWxsYmFja0ZuOiBjaGF5bnNBcGlJbnRlcmZhY2UuZmFjZWJvb2tDb25uZWN0LmJpbmQobnVsbCwgJ3VzZXJfZnJpZW5kcycsIHBhcmFtcyksXG4gICAgICB3ZWJGbjogJ3RvYml0Y29ubmVjdCcsXG4gICAgICB3ZWJQYXJhbXM6IHBhcmFtc1xuICAgIH0pO1xuICB9XG5cbn07XG4iLCJpbXBvcnQge2dldExvZ2dlciwgaXNQZXJtaXR0ZWQsIGlzRnVuY3Rpb24sIGlzQmxhbmssIGlzQXJyYXksIGlzT2JqZWN0LCBpc0RlZmluZWR9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7d2luZG93LCBwYXJlbnR9IGZyb20gJy4uL3V0aWxzL2Jyb3dzZXInO1xuaW1wb3J0IHtlbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG5pbXBvcnQge3NldENhbGxiYWNrfSBmcm9tICcuL2NhbGxiYWNrcyc7XG5sZXQgbG9nID0gZ2V0TG9nZ2VyKCdjaGF5bnMuY29yZS5jaGF5bnNfY2FsbHMnKTtcblxuXG5mdW5jdGlvbiBjYW4odmVyc2lvbnMpIHtcbiAgcmV0dXJuIGlzUGVybWl0dGVkKHZlcnNpb25zLCBlbnZpcm9ubWVudC5vcywgZW52aXJvbm1lbnQuYXBwVmVyc2lvbik7XG59XG5cbi8vIE9TIEFwcCBWZXJzaW9uIE1hcCBmb3IgQ2hheW5zIENhbGxzIFN1cHBvcnRcbi8vIFRPRE86IG1vdmUgaW50byBlbnZpcm9ubWVudD8gKG9yIGp1c3QgcmVtb3ZlIGNhdXNlIGl0IGlzIG9ubHkgdXNlZCBvbmUgdGltZSBpbiBoZXJlKVxubGV0IG9zTWFwID0ge1xuICBjaGF5bnNDYWxsOiB7IGFuZHJvaWQ6IDI1MTAsIGlvczogMjQ4Mywgd3A6IDI0NjksIGJiOiAxMTggfVxufTtcblxuLyoqXG4gKiBQdWJsaWMgQ2hheW5zIEludGVyZmFjZVxuICogRXhlY3V0ZSBBUEkgQ2FsbFxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqIEBwYXJhbSBkZWJvdW5jZVxuICogLy8gVE9ETzogbGVmdCBvZiBjYWxsYmFjayBhcyBwcm9taXNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcGlDYWxsKG9iaikge1xuXG4gIGxldCBkZWJvdW5jZSA9IG9iai5kZWJvdW5jZSB8fCBmYWxzZTtcblxuICAvLyBUT0RPOiBjaGVjayBvYmoub3MgVkVSU0lPTlxuXG4gIGZ1bmN0aW9uIGV4ZWN1dGVDYWxsKGNoYXluc0NhbGxPYmopIHtcblxuICAgIGlmIChlbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsICYmIGNhbihvc01hcC5jaGF5bnNDYWxsKSkge1xuICAgICAgLy8gVE9ETzogY29uc2lkZXIgY2FsbFF1ZXVlIGFuZCBJbnRlcnZhbCB0byBwcmV2ZW50IGVycm9yc1xuICAgICAgbG9nLmRlYnVnKCdleGVjdXRlQ2FsbDogY2hheW5zIGNhbGwgJywgY2hheW5zQ2FsbE9iai5jbWQpO1xuXG4gICAgICBpZiAoJ2NiJyBpbiBjaGF5bnNDYWxsT2JqICYmIGlzRnVuY3Rpb24oY2hheW5zQ2FsbE9iai5jYikpIHtcbiAgICAgICAgc2V0Q2FsbGJhY2soY2hheW5zQ2FsbE9iai5jYWxsYmFja05hbWUgfHwgY2hheW5zQ2FsbE9iai5wYXJhbXNbMF0uY2FsbGJhY2ssIGNoYXluc0NhbGxPYmouY2IsIHRydWUpO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGNoYXluc0NhbGxPYmouc3VwcG9ydCkgJiYgIWNhbihjaGF5bnNDYWxsT2JqLnN1cHBvcnQpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogdGhlIGNoYXlucyB2ZXJzaW9uIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbiAgICAgICAgaWYgKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrIGNoYXlucyBjYWxsIHdpbGwgYmUgaW52b2tlZCcpO1xuICAgICAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouZmFsbGJhY2tDbWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbikpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IGZhbGxiYWNrRm4gd2lsbCBiZSBpbnZva2VkJyk7XG4gICAgICAgICAgcmV0dXJuIGNoYXluc0NhbGxPYmouZmFsbGJhY2tGbi5jYWxsKG51bGwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjaGF5bnNDYWxsKGNoYXluc0NhbGxPYmouY21kLCBjaGF5bnNDYWxsT2JqLnBhcmFtcyk7XG5cbiAgICB9IGVsc2UgaWYgKGVudmlyb25tZW50LmNhbkNoYXluc1dlYkNhbGwpIHtcblxuICAgICAgaWYgKCdjYicgaW4gY2hheW5zQ2FsbE9iaiAmJiBpc0Z1bmN0aW9uKGNoYXluc0NhbGxPYmouY2IpKSB7XG4gICAgICAgIHNldENhbGxiYWNrKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmouY2IpO1xuICAgICAgfVxuICAgICAgaWYgKCFjaGF5bnNDYWxsT2JqLndlYkZuKSB7XG4gICAgICAgIGxvZy5pbmZvKCdleGVjdXRlQ2FsbDogVGhpcyBDYWxsIGhhcyBubyB3ZWJGbicpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZUNhbGw6IGNoYXlucyB3ZWIgY2FsbCAnLCBjaGF5bnNDYWxsT2JqLndlYkZuLm5hbWUgfHwgY2hheW5zQ2FsbE9iai53ZWJGbik7XG5cbiAgICAgIHJldHVybiBjaGF5bnNXZWJDYWxsKGNoYXluc0NhbGxPYmoud2ViRm4sIGNoYXluc0NhbGxPYmoud2ViUGFyYW1zIHx8IGNoYXluc0NhbGxPYmoucGFyYW1zKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnZXhlY3V0ZUNhbGw6IG5laXRoZXIgY2hheW5zIHdlYiBjYWxsIG5vciBjaGF5bnMgd2ViJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKGRlYm91bmNlKSB7XG4gICAgc2V0VGltZW91dChleGVjdXRlQ2FsbC5iaW5kKG51bGwsIG9iaiksIDEwMCk7IC8vIFRPRE86IGVycm9yP1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBleGVjdXRlQ2FsbChvYmopO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGQgQ2hheW5zIENhbGwgKG9ubHkgZm9yIG5hdGl2ZSBBcHBzKVxuICogQHByaXZhdGVcblxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgY2hheW5zIGNhbGwgc3VjY2VlZGVkLCBmYWxzZSBvbiBlcnJvciAobm8gdXJsIGV0YylcbiAqL1xuZnVuY3Rpb24gY2hheW5zQ2FsbChjbWQsIHBhcmFtcykge1xuXG4gIGlmIChpc0JsYW5rKGNtZCkpIHsgLy8gMCBpcyBhIHZhbGlkIGNhbGwsIHVuZGVmaW5lZCBhbmQgbnVsbCBhcmUgbm90XG4gICAgbG9nLndhcm4oJ2NoYXluc0NhbGw6IG1pc3NpbmcgY21kIGZvciBjaGF5bnNDYWxsJyk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxldCB1cmwgPSBudWxsO1xuXG4gIC8vIGlmIHRoZXJlIGlzIG5vIHBhcmFtIG9yICdub25lJyB3aGljaCBtZWFucyBubyBjYWxsYmFja1xuICBpZiAoIXBhcmFtcykge1xuXG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArICcpJztcblxuICB9IGVsc2Uge1xuXG4gICAgLy8gcGFyYW1zIGV4aXN0IGhvd2V2ZXIsIGl0IGlzIG5vIGFycmF5XG4gICAgaWYgKCFpc0FycmF5KHBhcmFtcykpIHtcbiAgICAgIGxvZy5lcnJvcignY2hheW5zQ2FsbDogcGFyYW1zIGFyZSBubyBBcnJheScpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcGFyYW1zIHRvIHRoZSBjaGF5bnMgY2FsbFxuICAgIGxldCBjYWxsYmFja1ByZWZpeCA9ICdfY2hheW5zQ2FsbGJhY2tzLic7XG4gICAgbGV0IGNhbGxTdHJpbmcgPSAnJztcbiAgICBpZiAocGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGxldCBjYWxsQXJncyA9IFtdO1xuICAgICAgcGFyYW1zLmZvckVhY2goZnVuY3Rpb24ocGFyYW0pIHtcbiAgICAgICAgbGV0IG5hbWUgPSBPYmplY3Qua2V5cyhwYXJhbSlbMF07XG4gICAgICAgIGxldCB2YWx1ZSA9IHBhcmFtW25hbWVdO1xuICAgICAgICBpZiAobmFtZSA9PT0gJ2NhbGxiYWNrJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2goJ1xcJycgKyBjYWxsYmFja1ByZWZpeCArIHZhbHVlICsgJ1xcJycpO1xuICAgICAgICB9IGVsc2UgaWYgKG5hbWUgPT09ICdib29sJyB8fCBuYW1lID09PSAnRnVuY3Rpb24nIHx8IG5hbWUgPT09ICdJbnRlZ2VyJykge1xuICAgICAgICAgIGNhbGxBcmdzLnB1c2godmFsdWUpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICBjYWxsQXJncy5wdXNoKCdcXCcnICsgdmFsdWUgKyAnXFwnJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY2FsbFN0cmluZyA9ICcsJyArIGNhbGxBcmdzLmpvaW4oJywnKTtcbiAgICB9XG5cbiAgICAvLyBhZGQgY2hheW5zIHByb3RvY29sIGFuZCBob3N0IGFuZCBqb2luIGFycmF5XG4gICAgdXJsID0gJ2NoYXluczovL2NoYXluc0NhbGwoJyArIGNtZCArIGNhbGxTdHJpbmcgKyAnKSc7XG4gIH1cblxuICBsb2cuZGVidWcoJ2NoYXluc0NhbGw6IHVybDogJywgdXJsKTtcblxuICB0cnkge1xuICAgIC8vIFRPRE86IGNyZWF0ZSBhbiBlYXNpZXIgaWRlbnRpZmljYXRpb24gb2YgdGhlIHJpZ2h0IGVudmlyb25tZW50XG4gICAgLy8gVE9ETzogY29uc2lkZXIgdG8gZXhlY3V0ZSB0aGUgYnJvd3NlciBmYWxsYmFjayBpbiBoZXJlIGFzIHdlbGxcbiAgICBpZiAoJ2NoYXluc0NhbGwnIGluIHdpbmRvdyAmJiBpc0Z1bmN0aW9uKHdpbmRvdy5jaGF5bnNDYWxsLmhyZWYpKSB7XG4gICAgICB3aW5kb3cuY2hheW5zQ2FsbC5ocmVmKHVybCk7XG4gICAgfSBlbHNlIGlmICgnd2Via2l0JyBpbiB3aW5kb3dcbiAgICAgICYmIHdpbmRvdy53ZWJraXQubWVzc2FnZUhhbmRsZXJzXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsXG4gICAgICAmJiB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKSB7XG4gICAgICB3aW5kb3cud2Via2l0Lm1lc3NhZ2VIYW5kbGVycy5jaGF5bnNDYWxsLnBvc3RNZXNzYWdlKHVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy53YXJuKCdjaGF5bnNDYWxsOiBFcnJvcjogY291bGQgbm90IGV4ZWN1dGUgQ2hheW5zQ2FsbDogJywgZSk7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogQGRlc2NyaXB0aW9uXG4gKiBFeGVjdXRlIGEgQ2hheW5zV2ViIENhbGwgaW4gdGhlIHBhcmVudCB3aW5kb3cuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGZuIEZ1bmN0aW9uIG5hbWVcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJhbXMgQWRkaXRpb25hbFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY2hheW5zV2ViYkNhbGwgc3VjY2VlZGVkXG4gKi9cbmZ1bmN0aW9uIGNoYXluc1dlYkNhbGwoZm4sIHBhcmFtcykge1xuICBpZiAoIWZuKSB7XG4gICAgbG9nLmluZm8oJ2NoYXluc1dlYkNhbGw6IG5vIENoYXluc1dlYkNhbGwgZm4nKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAoIXBhcmFtcyB8fCBpc0FycmF5KHBhcmFtcykpIHsgLy8gQXJyYXkgaW5kaWNhdGVzIHRoYXQgdGhlc2UgYXJlIGNoYXluc0NhbGxzIHBhcmFtcyBUT0RPOiByZWZhY3RvclxuICAgIHBhcmFtcyA9ICcnO1xuICB9XG4gIGlmIChpc09iamVjdChwYXJhbXMpKSB7IC8vIGFuIEFycmF5IGlzIGFsc28gc2VlbiBhcyBPYmplY3QsIGhvd2V2ZXIgaXQgd2lsbCBiZSByZXNldCBiZWZvcmVcbiAgICBwYXJhbXMgPSBKU09OLnN0cmluZ2lmeShwYXJhbXMpO1xuICB9XG5cbiAgaWYgKGlzRnVuY3Rpb24oZm4pKSB7XG4gICAgcmV0dXJuIGZuLmNhbGwobnVsbCk7XG4gIH1cblxuICB2YXIgbmFtZXNwYWNlID0gJ2NoYXlucy5jdXN0b21UYWIuJztcbiAgdmFyIHVybCA9IG5hbWVzcGFjZSArIGZuICsgJzonICsgcGFyYW1zO1xuXG4gIGxvZy5kZWJ1ZygnY2hheW5zV2FiQ2FsbDogJyArIHVybCk7XG5cbiAgdHJ5IHtcbiAgICBwYXJlbnQucG9zdE1lc3NhZ2UodXJsLCAnKicpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLndhcm4oJ2NoYXluc1dlYkNhbGw6IHBvc3RNZXNzZ2FlIGZhaWxlZCcpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbiIsIi8qKlxuICogQG1vZHVsZSBjb25maWdcbiAqIEBwcml2YXRlXG4gKi9cblxuaW1wb3J0IHtpc1ByZXNlbnQsIGlzQmxhbmssIGlzVW5kZWZpbmVkLCBpc0FycmF5LCBleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcblxuLyoqXG4gKiBTdG9yZSBpbnRlcm5hbCBjaGF5bnMgY29uZmlndXJhdGlvblxuICogQHR5cGUge3thcHBOYW1lOiBzdHJpbmcsIGFwcFZlcnNpb246IG51bWJlciwgbG9hZE1vZGVybml6ZXI6IGJvb2xlYW4sIGxvYWRQb2x5ZmlsbHM6IGJvb2xlYW4sIHVzZUZldGNoOiBib29sZWFuLCBwcm9taXNlczogc3RyaW5nLCB1c2VPZmZsaW5lQ2FjaGluZzogYm9vbGVhbiwgdXNlTG9jYWxTdG9yYWdlOiBib29sZWFuLCBoYXNBZG1pbjogYm9vbGVhbiwgbXVsdGlMaW5ndWFsOiBib29sZWFuLCBpc1B1Ymxpc2hlZDogYm9vbGVhbiwgZGVidWdNb2RlOiBib29sZWFuLCB1c2VBamF4OiBib29sZWFufX1cbiAqIEBwcml2YXRlXG4gKi9cbnZhciBfY29uZmlnID0ge1xuICBhcHBOYW1lOiAnQ2hheW5zIEFwcCcsICAgLy8gYXBwIE5hbWVcbiAgYXBwVmVyc2lvbjogMSwgICAgICAgICAgIC8vIGFwcCBWZXJzaW9uXG4gIHByZXZlbnRFcnJvcnM6IHRydWUsICAgICAgICAvLyBlcnJvciBoYW5kbGVyIGNhbiBoaWRlIGVycm9ycyAoY2FuIGJlIG92ZXJ3dGl0dGVuIGJ5IGlzUHJvZHVjdGlvbilcbiAgaXNQcm9kdWN0aW9uOiB0cnVlLCAgICAgIC8vIHByb2R1Y3Rpb24sIGRldmVsb3BtZW50IGFuZCB0ZXN0IEVOVlxuICBsb2FkTW9kZXJuaXplcjogdHJ1ZSwgICAgLy8gbG9hZCBtb2Rlcm5pemVyXG4gIGxvYWRQb2x5ZmlsbHM6IHRydWUsICAgICAvLyBsb2FkIHBvbHlmaWxsc1xuICB1c2VGZXRjaDogdHJ1ZSwgICAgICAgICAgLy8gdXNlIHdpbmRvdy5mZXRjaCBhbmQgaXQncyBwb2x5ZmlsbHNcbiAgcHJvbWlzZXM6ICdxJywgICAgICAgICAgIC8vIHByb21pc2UgU2VydmljZTogUSBpcyBzdGFuZGFyZFxuICB1c2VPZmZsaW5lQ2FjaGluZzogZmFsc2UsLy8gaXMgb2ZmbGluZSBjYWNoaW5nIHVzZWQ/IGlubGN1ZGUgb2ZmbGluZSBoZWxwZXJcbiAgdXNlTG9jYWxTdG9yYWdlOiBmYWxzZSwgIC8vIGlzIGxvY2FsU3RvcmFnZSB1c2VkPyBpbmNsdWRlIGhlbHBlclxuICBoYXNBZG1pbjogZmFsc2UsICAgICAgICAgLy8gZG9lcyB0aGlzIGFwcC9wYWdlIGhhdmUgYW4gYWRtaW4/XG4gIG11bHRpTGluZ3VhbDogdHJ1ZSwgICAgICAvLyBlbmFibGUgaTE4bj9cbiAgaXNQdWJsaXNoZWQ6IHRydWUsICAgICAgIC8vIG9ubHkgaW4gaW50ZXJuYWwgdG9iaXQgYXZhaWxhYmxlXG4gIGRlYnVnTW9kZTogdHJ1ZSwgICAgICAgICAvLyBzaG93IGNvbnNvbGUgb3V0cHV0LCBkZWJ1ZyBwYXJhbSBmb3IgbG9nZ2luZ1xuICB1c2VBamF4OiBmYWxzZSxcbiAgaXNJbnRlcm5hbDogZmFsc2UgICAgICAgIC8vIHVzZSBpbnRlcm5hbCByb3V0aW5nXG4gIC8vZnJhbWV3b3JrOiBbJ0VtYmVyJywgJ0FuZ3VsYXInLCAnQmFja2JvbmUnLCAnQW1wZXJzYW5kJywgJ1JlYWN0JywgJ2pRdWVyeSddXG59O1xuXG4vLyBUT0RPOiByZW1vdmVcbi8qZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZygpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gQ29uZmlnLnNldChhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSk7IC8vIFRPRE86IHJlZmFjdG9yIHRoaXNcbiAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIENvbmZpZy5nZXQoYXJndW1lbnRzKTtcbiAgfVxuICByZXR1cm4gQ29uZmlnLmdldCgpO1xufSovXG5cbi8vIFRPRE86IHJlZmFjdG9yIHRvIE1hcFxuZXhwb3J0IGNsYXNzIENvbmZpZyB7XG5cbiAgLyoqXG4gICAqIEBtZXRob2QgZ2V0XG4gICAqIEBjbGFzcyBDb25maWdcbiAgICogQG1vZHVsZSBjaGF5bnMuY29uZmlnXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgUmVmZXJlbmNlIHRoZSBga2V5YCBpbiB0aGUgY29uZmlnIGBPYmplY3RgXG4gICAqIEByZXR1cm5zIHtudWxsfSBWYWx1ZSBvZiB0aGUgYGtleWAgaW4gdGhlIGNvbmZpZyBgT2JqZWN0YFxuICAgKiAgICAgICAgICAgICAgICAgYHVuZGVmaW5lZGAgaWYgdGhlIGBrZXlgIHdhcyBub3QgZm91bmRcbiAgICovXG4gIHN0YXRpYyBnZXQoa2V5KSB7XG4gICAgaWYgKGlzUHJlc2VudChrZXkpKSB7XG4gICAgICByZXR1cm4gX2NvbmZpZ1trZXldO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBrZXlcbiAgICogQHBhcmFtIHZhbHVlXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIHNldChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGlzQmxhbmsoa2V5KSB8fCBpc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gVE9ETzogZ29vZCBpZGVhPyBvbmUgc2hvdWxkIGJlIGNhcmVmdWwgaSBzdXBwb3NlXG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBleHRlbmQoX2NvbmZpZywgdmFsdWUpO1xuICAgIH1cbiAgICBfY29uZmlnW2tleV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0ga2V5XG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgc3RhdGljIGhhcyhrZXkpIHtcbiAgICByZXR1cm4gISFrZXkgJiYgKGtleSBpbiBfY29uZmlnKTtcbiAgfVxufVxuIiwiaW1wb3J0IHtnZXRMb2dnZXIsIGlzT2JqZWN0LCBET019IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge21lc3NhZ2VMaXN0ZW5lcn0gZnJvbSAnLi9jYWxsYmFja3MnO1xuaW1wb3J0IHtjaGF5bnNBcGlJbnRlcmZhY2V9IGZyb20gJy4vY2hheW5zX2FwaV9pbnRlcmZhY2UnO1xuaW1wb3J0IHtlbnZpcm9ubWVudCwgc2V0RW52fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7dXNlcn0gZnJvbSAnLi91c2VyJztcblxuLy8gY3JlYXRlIG5ldyBMb2dnZXIgaW5zdGFuY2VcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5jb3JlJyk7XG5cbi8vIGRpc2FibGUgSlMgRXJyb3JzIGluIHRoZSBjb25zb2xlXG5Db25maWcuc2V0KCdwcmV2ZW50RXJyb3JzJywgZmFsc2UpO1xuXG4vKipcbiAqXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICpcbiAqIEB0eXBlIHtib29sZWFufSBUcnVlIGlmIHRoZSBET00gaXMgbG9hZGVkXG4gKiBAcHJpdmF0ZVxuICovXG52YXIgZG9tUmVhZHkgPSBmYWxzZTtcblxuLyoqXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKlxuICpcbiAqIEB0eXBlIHthcnJheX0gQ29udGFpbnMgY2FsbGJhY2tzIGZvciB0aGUgRE9NIHJlYWR5IGV2ZW50XG4gKiBAcHJpdmF0ZVxuICovXG52YXIgcmVhZHlDYWxsYmFja3MgPSBbXTtcblxuLyoqXG4gKiBAbmFtZSBjaGF5bnMucHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyKHVzZXJDb25maWcpIHtcbiAgbG9nLmluZm8oJ2NoYXlucy5yZWdpc3RlcicpO1xuICBDb25maWcuc2V0KHVzZXJDb25maWcpOyAvLyB0aGlzIHJlZmVyZW5jZSB0byB0aGUgY2hheW5zIG9ialxuICByZXR1cm4gdGhpcztcbn1cblxuLy8gVE9ETzogcmVnaXN0ZXIgYEZ1bmN0aW9uYCBvciBwcmVDaGF5bnMgYE9iamVjdGA/XG5leHBvcnQgZnVuY3Rpb24gcHJlQ2hheW5zKCkge1xuICBpZiAoJ3ByZUNoYXlucycgaW4gd2luZG93ICYmIGlzT2JqZWN0KHdpbmRvdy5wcmVDaGF5bnMpKSB7XG4gICAgLy8gZmlsbCBjb25maWdcbiAgfVxufVxuXG4vKipcbiAqIEBuYW1lIGNoYXlucy5wcmVwYXJlXG4gKiBAbW9kdWxlIGNoYXluc1xuICpcbiAqIEBkZXNjcmlwdGlvblxuICogUnVuIG5lY2Vzc2FyeSBvcGVyYXRpb25zIHRvIHByZXBhcmUgY2hheW5zLlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZHkoY2IpIHtcbiAgbG9nLmluZm8oJ2NoYXlucy5yZWFkeScpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoZG9tUmVhZHkpIHtcbiAgICAvLyBUT0RPOiByZXR1cm4gYSBjdXN0b20gTW9kZWwgT2JqZWN0IGluc3RlYWQgb2YgYGNvbmZpZ2BcbiAgICBjYih7XG4gICAgICBhcHBOYW1lOkNvbmZpZy5nZXQoJ2FwcE5hbWUnKSxcbiAgICAgIGFwcFZlcnNpb246IENvbmZpZy5nZXQoJ2FwcFZlcnNpb24nKVxuICAgIH0pO1xuICAgIHJldHVybjtcbiAgfVxuICByZWFkeUNhbGxiYWNrcy5wdXNoKGFyZ3VtZW50c1swXSk7XG59XG5cbi8qKlxuICogQG5hbWUgcHJlcGFyZVxuICogQG1vZHVsZSBjaGF5bnNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIFJ1biBuZWNlc3Nhcnkgb3BlcmF0aW9ucyB0byBwcmVwYXJlIGNoYXlucy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIG9iaiBSZWZlcmVuY2UgdG8gY2hheW5zIE9iamVjdFxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cCgpIHtcbiAgbG9nLmluZm8oJ3N0YXJ0IGNoYXlucyBzZXR1cCcpO1xuXG4gIC8vIGVuYWJsZSBgY2hheW5zLmNzc2AgYnkgYWRkaW5nIGBjaGF5bnNgIGNsYXNzXG4gIC8vIHJlbW92ZSBgbm8tanNgIGNsYXNzIGFuZCBhZGQgYGpzYCBjbGFzc1xuICBsZXQgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gIERPTS5hZGRDbGFzcyhib2R5LCAnY2hheW5zJyk7XG4gIERPTS5hZGRDbGFzcyhib2R5LCAnanMnKTtcbiAgRE9NLnJlbW92ZUNsYXNzKGJvZHksICduby1qcycpO1xuXG5cbiAgLy8gcnVuIHBvbHlmaWxsIChpZiByZXF1aXJlZClcblxuICAvLyBydW4gbW9kZXJuaXplciAoZmVhdHVyZSBkZXRlY3Rpb24pXG5cbiAgLy8gcnVuIGZhc3RjbGlja1xuXG4gIC8vICh2aWV3cG9ydCBzZXR1cClcblxuICAvLyBjcmF0ZSBtZXRhIHRhZ3MgKGNvbG9ycywgbW9iaWxlIGljb25zIGV0YylcblxuICAvLyBkbyBzb21lIFNFTyBzdHVmZiAoY2Fub25pY2FsIGV0YylcblxuICAvLyBkZXRlY3QgdXNlciAobG9nZ2VkIGluPylcblxuICAvLyBydW4gY2hheW5zIHNldHVwIChjb2xvcnMgYmFzZWQgb24gZW52aXJvbm1lbnQpXG5cblxuXG4gIC8vIHNldCBET00gcmVhZHkgZXZlbnRcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpIHtcblxuICAgIGRvbVJlYWR5ID0gdHJ1ZTtcbiAgICBsb2cuZGVidWcoJ0RPTSByZWFkeScpO1xuXG4gICAgLy8gYWRkIGNoYXlucyByb290IGVsZW1lbnRcbiAgICBsZXQgY2hheW5zUm9vdCA9IERPTS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjaGF5bnNSb290LnNldEF0dHJpYnV0ZSgnaWQnLCAnY2hheW5zLXJvb3QnKTtcbiAgICBjaGF5bnNSb290LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnY2hheW5zX19yb290Jyk7XG4gICAgRE9NLmFwcGVuZENoaWxkKGJvZHksIGNoYXluc1Jvb3QpO1xuXG4gICAgLy8gZG9tLXJlYWR5IGNsYXNzXG4gICAgRE9NLmFkZENsYXNzKGRvY3VtZW50LmJvZHksICdkb20tcmVhZHknKTtcblxuICAgIC8vIGdldCB0aGUgQXBwIEluZm9ybWF0aW9uLCBoYXMgdG8gYmUgZG9uZSB3aGVuIGRvY3VtZW50IHJlYWR5XG4gICAgbGV0IGdldEFwcEluZm9ybWF0aW9uQ2FsbCA9IGNoYXluc0FwaUludGVyZmFjZS5nZXRHbG9iYWxEYXRhKGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgLy8gbm93IENoYXlucyBpcyBvZmZpY2lhbGx5IHJlYWR5XG4gICAgICAvLyBmaXJzdCBzZXQgYWxsIGVudiBzdHVmZlxuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgbm8gYXBwIERhdGEnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzT2JqZWN0KGRhdGEuQXBwSW5mbykpIHtcbiAgICAgICAgbGV0IGFwcEluZm8gPSBkYXRhLkFwcEluZm87XG4gICAgICAgIGxldCBzaXRlID0ge307XG4gICAgICAgIHNpdGUuc2l0ZUlkID0gYXBwSW5mby5TaXRlSUQ7XG4gICAgICAgIHNpdGUudGl0bGUgPSBhcHBJbmZvLnRpdGxlO1xuICAgICAgICBzaXRlLnRhcHBzID0gYXBwSW5mby5UYXBwcztcbiAgICAgICAgc2l0ZS5mYWNlYm9va0FwcElkID0gYXBwSW5mby5GYWNlYm9va0FwcElEO1xuICAgICAgICBzaXRlLmZhY2Vib29rUGFnZUlkID0gYXBwSW5mby5GYWNlYm9va1BhZ2VJRDtcbiAgICAgICAgc2l0ZS5jb2xvclNjaGVtZSA9IGFwcEluZm8uQ29sb3JTY2hlbWUgfHwgMDtcbiAgICAgICAgc2l0ZS52ZXJzaW9uID0gYXBwSW5mby5WZXJzaW9uO1xuICAgICAgICBzZXRFbnYoJ3NpdGUnLCBzaXRlKTtcbiAgICAgICAgLy9zZXQoc2l0ZSk7XG4gICAgICB9XG4gICAgICBpZiAoaXNPYmplY3QoZGF0YS5BcHBVc2VyKSkge1xuICAgICAgICBsZXQgYXBwVXNlciA9IGRhdGEuQXBwVXNlcjtcbiAgICAgICAgdXNlci5uYW1lID0gYXBwVXNlci5GYWNlYm9va1VzZXJOYW1lO1xuICAgICAgICB1c2VyLmlkID0gYXBwVXNlci5Ub2JpdFVzZXJJRDtcbiAgICAgICAgdXNlci5mYWNlYm9va0lkID0gYXBwVXNlci5GYWNlYm9va0lEO1xuICAgICAgICB1c2VyLnBlcnNvbklkID0gYXBwVXNlci5QZXJzb25JRDtcbiAgICAgICAgdXNlci5hY2Nlc3NUb2tlbiA9IGFwcFVzZXIuVG9iaXRBY2Nlc3NUb2tlbjtcbiAgICAgICAgdXNlci5mYWNlYm9va0FjY2Vzc1Rva2VuID0gYXBwVXNlci5GYWNlYm9va0FjY2Vzc1Rva2VuO1xuICAgICAgfVxuICAgICAgaWYgKGlzT2JqZWN0KGRhdGEuRGV2aWNlKSkge1xuXG4gICAgICB9XG5cblxuICAgICAgbG9nLmRlYnVnKCdhcHBJbmZvcm1hdGlvbiBjYWxsYmFjaycsIGRhdGEpO1xuXG4gICAgICByZWFkeUNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cbiAgICAgICAgY2FsbGJhY2suY2FsbChudWxsLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgICAgcmVhZHlDYWxsYmFja3MgPSBbXTtcblxuICAgICAgRE9NLmFkZENsYXNzKGRvY3VtZW50LmJvZHksICdjaGF5bnMtcmVhZHknKTtcbiAgICAgIERPTS5yZW1vdmVBdHRyaWJ1dGUoRE9NLnF1ZXJ5KCdbY2hheW5zLWNsb2FrXScpLCAnY2hheW5zLWNsb2FrJyk7XG5cbiAgICAgIGNzc1NldHVwKCk7XG5cbiAgICAgIGxvZy5pbmZvKCdmaW5pc2hlZCBjaGF5bnMgc2V0dXAnKTtcbiAgICB9KTtcblxuICAgIGlmICghZ2V0QXBwSW5mb3JtYXRpb25DYWxsKSB7XG4gICAgICBsb2cuZXJyb3IoJ1RoZSBBcHAgSW5mb3JtYXRpb24gY291bGQgbm90IGJlIHJldHJpZXZlZC4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHN0YXJ0IHdpbmRvdy5vbignbWVzc2FnZScpIGxpc3RlbmVyIGZvciBGcmFtZSBDb21tdW5pY2F0aW9uXG4gIG1lc3NhZ2VMaXN0ZW5lcigpO1xuXG5cbn1cblxuZnVuY3Rpb24gY3NzU2V0dXAoKSB7XG4gIGxldCBib2R5ID0gZG9jdW1lbnQuYm9keTtcbiAgbGV0IHN1ZmZpeCA9ICdjaGF5bnMtJztcblxuICBET00uYWRkQ2xhc3MoYm9keSwgc3VmZml4ICsgJ29zLS0nICsgZW52aXJvbm1lbnQub3MpO1xuICBET00uYWRkQ2xhc3MoYm9keSwgc3VmZml4ICsgJ2Jyb3dzZXItLScgKyBlbnZpcm9ubWVudC5icm93c2VyKTtcbiAgRE9NLmFkZENsYXNzKGJvZHksIHN1ZmZpeCArICdjb2xvci0tJyArIGVudmlyb25tZW50LmJyb3dzZXIpO1xuXG4gIGlmIChlbnZpcm9ubWVudC5pc0NoYXluc1dlYikge1xuICAgIERPTS5hZGRDbGFzcyhib2R5LCBzdWZmaXggKyAnLScgKyAnd2ViJyk7XG4gIH1cbiAgaWYgKGVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlKSB7XG4gICAgRE9NLmFkZENsYXNzKGJvZHksIHN1ZmZpeCArICctJyArICdtb2JpbGUnKTtcbiAgfVxuICBpZiAoZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wKSB7XG4gICAgRE9NLmFkZENsYXNzKGJvZHksIHN1ZmZpeCArICctJyArICdkZXNrdG9wJyk7XG4gIH1cbiAgaWYgKGVudmlyb25tZW50LmlzQXBwKSB7XG4gICAgRE9NLmFkZENsYXNzKGJvZHksIHN1ZmZpeCArICctJyArICdhcHAnKTtcbiAgfVxuICBpZiAoZW52aXJvbm1lbnQuaXNJbkZyYW1lKSB7XG4gICAgRE9NLmFkZENsYXNzKGJvZHksIHN1ZmZpeCArICctJyArICdmcmFtZScpO1xuICB9XG59XG4iLCIvKipcbiAqIEBtb2R1bGUgY2hheW5zLmVudmlyb25tZW50XG4gKiBAZGVzY3JpcHRpb25cbiAqIENoYXlucyBFbnZpcm9ubWVudFxuICovXG5cbmltcG9ydCB7Z2V0TG9nZ2VyLCBleHRlbmR9IGZyb20gJy4uL3V0aWxzJztcbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy5lbnZpcm9ubWVudCcpO1xuXG4vLyBUT0RPOiBpbXBvcnQgZGVwZW5kZW5jaWVzXG52YXIgdHlwZXMgPSB7fTtcblxudHlwZXMuYnJvd3NlciA9IFtcbiAgJ2Nocm9tZScsXG4gICdmaXJlZm94JyxcbiAgJ3NhZmFyaScsXG4gICdvcGVyYScsXG4gICdjaHJvbWUgbW9iaWxlJyxcbiAgJ3NhZmFyaSBtb2JpbGUnLFxuICAnZmlyZWZveCBtb2JpbGUnXG5dO1xuXG50eXBlcy5vcyA9IFtcbiAgJ3dpbmRvd3MnLFxuICAnbWFjT1MnLFxuICAnYW5kcm9pZCcsXG4gICdpb3MnLFxuICAnd3AnXG5dO1xuXG50eXBlcy5jaGF5bnNPUyA9IHtcbiAgd2ViOiAnd2Vic2hhZG93JyxcbiAgd2ViTW9iaWxlOiAnd2Vic2hhZG93bW9iaWxlJyxcbiAgYXBwOiAnd2Vic2hhZG93bW9iaWxlJ1xufTtcblxuLy8gVE9ETzogaGlkZSBpbnRlcm5hbCBwYXJhbWV0ZXJzIGZyb20gdGhlIG90aGVyc1xuLy8gVE9ETzogb2ZmZXIgdXNlciBhbiBgT2JqZWN0YCB3aXRoIFVSTCBQYXJhbWV0ZXJzXG4vLyBsb2NhdGlvbiBxdWVyeSBzdHJpbmdcbnZhciBxdWVyeSA9IGxvY2F0aW9uLnNlYXJjaC5zdWJzdHIoMSk7XG52YXIgcGFyYW1ldGVycyA9IHt9O1xucXVlcnkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKHBhcnQpIHtcbiAgdmFyIGl0ZW0gPSBwYXJ0LnNwbGl0KCc9Jyk7XG4gIHBhcmFtZXRlcnNbaXRlbVswXS50b0xvd2VyQ2FzZSgpXSA9IGRlY29kZVVSSUNvbXBvbmVudChpdGVtWzFdKS50b0xvd2VyQ2FzZSgpO1xufSk7XG5cbi8vIHZlcmlmeSBieSBjaGF5bnMgcmVxdWlyZWQgcGFyYW1ldGVycyBleGlzdFxuaWYgKCFwYXJhbWV0ZXJzLmFwcHZlcnNpb24pIHtcbiAgbG9nLndhcm4oJ25vIGFwcCB2ZXJzaW9uIHBhcmFtZXRlcicpO1xufVxuaWYgKCFwYXJhbWV0ZXJzLm9zKSB7XG4gIGxvZy53YXJuKCdubyBvcyBwYXJhbWV0ZXInKTtcbn1cbmlmIChwYXJhbWV0ZXJzLmRlYnVnKSB7XG4gIC8vIFRPRE86IGVuYWJsZSBkZWJ1ZyBtb2RlXG59XG5cbi8vIFRPRE86IGZ1cnRoZXIgcGFyYW1zIGFuZCBjb2xvcnNjaGVtZVxuLy8gVE9ETzogZGlzY3VzcyByb2xlIG9mIFVSTCBwYXJhbXMgYW5kIHRyeSB0byByZXBsYWNlIHRoZW0gYW5kIG9ubHkgdXNlIEFwcERhdGFcblxuXG5mdW5jdGlvbiBnZXRGaXJzdE1hdGNoKHJlZ2V4KSB7XG4gIHZhciBtYXRjaCA9IHVhLm1hdGNoKHJlZ2V4KTtcbiAgcmV0dXJuIChtYXRjaCAmJiBtYXRjaC5sZW5ndGggPiAxICYmIG1hdGNoWzFdKSB8fCAnJztcbn1cblxuLy8gdXNlciBhZ2VudCBkZXRlY3Rpb25cbnZhciB1c2VyQWdlbnQgPSAod2luZG93Lm5hdmlnYXRvciAmJiBuYXZpZ2F0b3IudXNlckFnZW50KSB8fCAnJztcblxudmFyIGlzID0ge1xuICBpb3M6IC9pUGhvbmV8aVBhZHxpUG9kL2kudGVzdCh1c2VyQWdlbnQpLFxuICBhbmRyb2lkOiAvQW5kcm9pZC9pLnRlc3QodXNlckFnZW50KSxcbiAgd3A6IC93aW5kb3dzIHBob25lL2kudGVzdCh1c2VyQWdlbnQpLFxuICBiYjogL0JsYWNrQmVycnl8QkIxMHxSSU0vaS50ZXN0KHVzZXJBZ2VudCksXG5cbiAgb3BlcmE6ICghIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMCksXG4gIGZpcmVmb3g6ICh0eXBlb2YgSW5zdGFsbFRyaWdnZXIgIT09ICd1bmRlZmluZWQnKSxcbiAgc2FmYXJpOiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHdpbmRvdy5IVE1MRWxlbWVudCkuaW5kZXhPZignQ29uc3RydWN0b3InKSA+IDApLFxuICBjaHJvbWU6ICghIXdpbmRvdy5jaHJvbWUgJiYgISghIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMCkpLFxuICBpZTogZmFsc2UgfHwgISFkb2N1bWVudC5kb2N1bWVudE1vZGUsXG4gIGllMTE6IC9tc2llIDExL2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTEwOiAvbXNpZSAxMC9pLnRlc3QodXNlckFnZW50KSxcbiAgaWU5OiAvbXNpZSA5L2kudGVzdCh1c2VyQWdlbnQpLFxuICBpZTg6IC9tc2llIDgvaS50ZXN0KHVzZXJBZ2VudCksXG5cbiAgbW9iaWxlOiAvKGlwaG9uZXxpcG9kfCgoPzphbmRyb2lkKT8uKj9tb2JpbGUpfGJsYWNrYmVycnl8bm9raWEpL2kudGVzdCh1c2VyQWdlbnQpLFxuICB0YWJsZXQ6IC8oaXBhZHxhbmRyb2lkKD8hLiptb2JpbGUpfHRhYmxldCkvaS50ZXN0KHVzZXJBZ2VudCksXG4gIGtpbmRsZTogL1xcVyhraW5kbGV8c2lsaylcXFcvaS50ZXN0KHVzZXJBZ2VudCksXG4gIHR2OiAvZ29vZ2xldHZ8c29ueWR0di9pLnRlc3QodXNlckFnZW50KVxufTtcblxuLy8gVE9ETzogQnJvd3NlciBWZXJzaW9uIGFuZCBPUyBWZXJzaW9uIGRldGVjdGlvblxuXG4vLyBUT0RPOiBhZGQgZmFsbGJhY2tcbnZhciBvcmllbnRhdGlvbiA9IE1hdGguYWJzKHdpbmRvdy5vcmllbnRhdGlvbiAlIDE4MCkgPT09IDAgPyAncG9ydHJhaXQnIDogJ2xhbmRzY2FwZSc7XG52YXIgdmlld3BvcnQgPSB3aW5kb3cuaW5uZXJXaWR0aCArICd4JyArIHdpbmRvdy5pbm5lckhlaWdodDtcblxuZXhwb3J0IHZhciBlbnZpcm9ubWVudCA9IHtcblxuICAvL29zOiBwYXJhbWV0ZXJzLm9zLFxuICBvc1ZlcnNpb246IDEsXG5cbiAgYnJvd3NlcjogJ2NjJyxcbiAgYnJvd3NlclZlcnNpb246IDEsXG5cbiAgLy9hcHBWZXJzaW9uOiBwYXJhbWV0ZXJzLmFwcHZlcnNpb24sXG5cbiAgLy9vcmllbnRhdGlvbjogb3JpZW50YXRpb24sXG5cbiAgLy92aWV3cG9ydDogdmlld3BvcnQsIC8vIGluIDF4MSBpbiBweFxuXG4gIC8vcmF0aW86IDEsIC8vIHBpeGVsIHJhdGlvXG5cbiAgLy9pc0luRnJhbWU6IGZhbHNlLFxuXG4gIC8vaXNDaGF5bnNXZWI6IG51bGwsIC8vIGRlc2t0b3AgYnJvd3Nlciwgbm8gQXBwLCBubyBtb2JpbGVcbiAgLy9pc0NoYXluc1dlYk1vYmlsZTogbnVsbCwgLy8gbW9iaWxlIGJyb3dzZXIsIG5vIEFwcCwgbm8gZGVza3RvcFxuICAvL2lzQXBwOiBmYWxzZSwgLy8gb3RoZXJ3aXNlIEJyb3dzZXJcbiAgLy9pc01vYmlsZTogbnVsbCwgLy8gbm8gZGVza3RvcCwgYnV0IG1vYmlsZSBicm93c2VyIGFuZCBhcHBcbiAgLy9pc1RhYmxldDogbnVsbCwgLy8gbm8gZGVza3RvcCwga2luZGEgbW9iaWxlLCBtb3N0IGxpa2VseSBubyBhcHBcbiAgLy9pc0Rlc2t0b3A6IG51bGwsIC8vIG5vIGFwcCwgbm8gbW9iaWxlXG4gIC8vaXNCcm93c2VyOiBudWxsLCAvLyBvdGhlcndpc2UgQXBwXG5cbiAgLy9pc0lPUzogaXMuaW9zLFxuICAvL2lzQW5kcm9pZDogaXMuYW5kcm9pZCxcbiAgLy9pc1dQOiBpcy53cCxcbiAgLy9pc0JCOiBpcy5iYixcblxuICAvL3BhcmFtZXRlcnM6IHBhcmFtZXRlcnMsXG4gIC8vaGFzaDogbG9jYXRpb24uaGFzaC5zdWJzdHIoMSksXG5cbiAgc2l0ZToge1xuICAgIC8vc2l0ZUlkOiAxLFxuICAgIC8vbmFtZTogJ1RvYml0JyxcbiAgICAvL2xvY2F0aW9uSWQ6IDEsXG4gICAgLy91cmw6ICdodHRwczovL3RvYml0LmNvbS8nLFxuICAgIC8vdXNlU1NMOiB0cnVlLFxuICAgIC8vY29sb3JzY2hlbWU6IDFcbiAgICAvL2VkaXRNb2RlOiBmYWxzZSwgLy8gZnV0dXJlIGVkaXQgbW9kZSBmb3IgY29udGVudFxuICAgIC8vaXNBZG1pbk1vZGU6IHRydWVcbiAgfSxcblxuICAvLyBUT0RPOiBjb25zaWRlciBUYXBwXG4gIGFwcDoge1xuICAgIGFwcElkOiAxLFxuICAgIGNvbmZpZzoge30sXG4gICAgLy9kZWZhdWx0Q29udGlmOiB7fSxcbiAgICBkb21SZWFkeTogZmFsc2UsXG4gICAgbG9nczoge1xuICAgICAgbG9nOiBbXSxcbiAgICAgIGRlYnVnOiBbXSxcbiAgICAgIHdhcm46IFtdXG4gICAgfSxcbiAgICBlcnJvcnM6IFtdXG4gIH1cbn07XG5cbmVudmlyb25tZW50LnBhcmFtZXRlcnMgPSBwYXJhbWV0ZXJzOyAvLyBUT0RPIHN0cmlwICdzZWNyZXQgcGFyYW1zJ1xuZW52aXJvbm1lbnQuaGFzaCA9IGxvY2F0aW9uLmhhc2guc3Vic3RyKDEpO1xuXG4vLyBXQVRDSCBPVVQgdGhlIE9TIGlzIHNldCBieSBwYXJhbWV0ZXIgKHVuZm9ydHVuYXRlbHkpXG5lbnZpcm9ubWVudC5vcyA9IHBhcmFtZXRlcnMub3MgfHwgJ25vT1MnOyAvLyBUT0RPOiByZWZhY3RvciBPU1xuaWYgKGlzLm1vYmlsZSAmJiBbJ2FuZHJvaWQnLCAnaW9zJywgJ3dwJ10uaW5kZXhPZihwYXJhbWV0ZXJzLm9zKSAhPT0gLTEpIHtcbiAgcGFyYW1ldGVycy5vcyA9IHR5cGVzLmNoYXluc09TLmFwcDtcbn1cblxuLy8gZGV0ZWN0aW9uIGJ5IHVzZXIgYWdlbnRcbmVudmlyb25tZW50LmlzSU9TID0gaXMuaW9zO1xuZW52aXJvbm1lbnQuaXNBbmRyb2lkID0gaXMuYW5kcm9pZDtcbmVudmlyb25tZW50LmlzV1AgPSBpcy53cDtcbmVudmlyb25tZW50LmlzQkIgPSBpcy5iYjtcblxuLy8gVE9ETzogbWFrZSBzdXJlIHRoYXQgdGhpcyBhbHdheXMgd29ya3MhIChUU1BOLCBjcmVhdGUgaWZyYW1lIHRlc3QgcGFnZSlcbmVudmlyb25tZW50LmlzSW5GcmFtZSA9ICh3aW5kb3cgIT09IHdpbmRvdy50b3ApO1xuXG5lbnZpcm9ubWVudC5pc0FwcCA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy5hcHAgJiYgaXMubW9iaWxlICYmICFlbnZpcm9ubWVudC5pc0luRnJhbWUpOyAvLyBUT0RPOiBkb2VzIHRoaXMgYWx3YXlzIHdvcms/XG5lbnZpcm9ubWVudC5hcHBWZXJzaW9uID0gcGFyYW1ldGVycy5hcHB2ZXJzaW9uO1xuXG5lbnZpcm9ubWVudC5pc0Jyb3dzZXIgPSAhZW52aXJvbm1lbnQuaXNBcHA7XG5cbmVudmlyb25tZW50LmlzRGVza3RvcCA9ICghaXMubW9iaWxlICYmICFpcy50YWJsZXQpO1xuXG5lbnZpcm9ubWVudC5pc01vYmlsZSA9IGlzLm1vYmlsZTtcbmVudmlyb25tZW50LmlzVGFibGV0ID0gaXMudGFibGV0O1xuXG5lbnZpcm9ubWVudC5pc0NoYXluc1dlYk1vYmlsZSA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy53ZWJNb2JpbGUpICYmIGVudmlyb25tZW50LmlzSW5GcmFtZTtcbmVudmlyb25tZW50LmlzQ2hheW5zV2ViRGVza3RvcCA9IChwYXJhbWV0ZXJzLm9zID09PSB0eXBlcy5jaGF5bnNPUy53ZWIpICYmIGVudmlyb25tZW50LmlzSW5GcmFtZTtcbmVudmlyb25tZW50LmlzQ2hheW5zV2ViID0gZW52aXJvbm1lbnQuaXNDaGF5bnNXZWJEZXNrdG9wIHx8IGVudmlyb25tZW50LmlzQ2hheW5zV2ViTW9iaWxlO1xuXG4vLyBpbnRlcm5hbCBUT0RPOiBtYWtlIGl0IHByaXZhdGU/XG5lbnZpcm9ubWVudC5jYW5DaGF5bnNDYWxsID0gZW52aXJvbm1lbnQuaXNBcHA7XG5lbnZpcm9ubWVudC5jYW5DaGF5bnNXZWJDYWxsID0gZW52aXJvbm1lbnQuaXNDaGF5bnNXZWI7XG5cbmVudmlyb25tZW50LnZpZXdwb3J0ID0gdmlld3BvcnQ7IC8vIFRPRE86IHVwZGF0ZSBvbiByZXNpemU/IG5vLCBkdWUgcGVyZm9ybWFuY2VcbmVudmlyb25tZW50Lm9yaWVudGF0aW9uID0gb3JpZW50YXRpb247XG5lbnZpcm9ubWVudC5yYXRpbyA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0RW52KGtleSwgdmFsdWUpIHtcbiAgLy9leHRlbmQoZW52aXJvbm1lbnQsIHByb3ApO1xuICBlbnZpcm9ubWVudFtrZXldID0gdmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnYoa2V5KSB7XG4gIGVudmlyb25tZW50W2tleV07XG59XG4iLCIvKipcbiAqIFRhcHAgQVBJIEludGVyZmFjZVxuICogQVBJIHRvIGNvbW11bmljYXRlIHdpdGggdGhlIFRhcHBBUElcbiAqL1xuXG5pbXBvcnQge2dldExvZ2dlciwgaXNQcmVzZW50LCBpc09iamVjdCwgaXNBcnJheX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtlbnZpcm9ubWVudH0gZnJvbSAnLi9lbnZpcm9ubWVudCc7XG4vL2ltcG9ydCB7d2luZG93fSBmcm9tICcuLi91dGlscy9icm93c2VyJzsgLy8gZHVlIHRvIHdpbmRvdy5vcGVuIGFuZCBsb2NhdGlvbi5ocmVmXG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ3RhcHBfYXBpJyk7XG5cbmNvbnNvbGUuZGVidWcoZW52aXJvbm1lbnQsICdldm4nKTtcblxuLy8gVE9ETzogZm9yY2UgU1NMP1xubGV0IHRhcHBBcGlSb290ID0gJy8vY2hheW5zMS50b2JpdC5jb20vVGFwcEFwaS8nO1xubGV0IHJlc3VsdFR5cGUgPSB7XG4gIGVycm9yOiAtMSxcbiAgc3VjY2VzczogMFxufTtcblxuZnVuY3Rpb24gcGFyc2VVc2VyKHVzZXIpIHtcbiAgcmV0dXJuIHtcbiAgICB1c2VySWQ6IHVzZXIuVXNlcklELFxuICAgIGZhY2Vib29rSWQ6IHVzZXIuSUQgfHwgdXNlci5GYWNlYm9va0lELFxuICAgIG5hbWU6IHVzZXIuTmFtZSB8fCB1c2VyLlVzZXJGdWxsTmFtZSxcbiAgICBmaXJzdE5hbWU6IHVzZXIuRmlyc3ROYW1lLFxuICAgIGxhc3ROYW1lOiB1c2VyLkxhc3RuYW1lLFxuICAgIHBpY3R1cmU6ICdodHRwczovL2dyYXBoLmZhY2Vib29rLmNvbS8nICsgdXNlci5JRCArICcvcGljdHVyZScsXG4gICAgY2hheW5zTG9naW46IHVzZXIuQ2hheW5zTG9naW5cbiAgfTtcbn1cblxuZnVuY3Rpb24gcGFyc2VHcm91cChncm91cCkge1xuICByZXR1cm4ge1xuICAgIGlkOiBncm91cC5JRCxcbiAgICBuYW1lOiBncm91cC5OYW1lLFxuICAgIHNob3dOYW1lOiBncm91cC5TaG93TmFtZVxuICB9O1xufVxuXG5sZXQgdWFjR3JvdXBzQ2FjaGU7XG5cbi8qKlxuICogQG1vZHVsZSBUYXBwQVBJSW50ZXJmYWNlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG5leHBvcnQgdmFyIHRhcHBBcGlJbnRlcmZhY2UgPSB7XG4gIGdldEludHJvVGV4dDogZnVuY3Rpb24gZ2V0SW50cm9UZXh0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignZGVwcmVjYXRlZCcpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXQgSW5mb1xuICAgKiBVc2VyIEJhc2ljIEluZm9ybWF0aW9uXG4gICAqIEBwYXJhbSBvYmpcbiAgICogQHJldHVybnMge1Byb21pc2V9XG4gICAqL1xuICBnZXRVc2VyOiBmdW5jdGlvbiBnZXRVc2VyQmFzaWNJbmZvKG9iaikge1xuICAgIGlmICghb2JqIHx8ICFpc09iamVjdChvYmopKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIHdhcyBubyBwYXJhbWV0ZXIgT2JqZWN0Jyk7XG4gICAgfVxuICAgIGxldCBkYXRhID0gJyc7XG4gICAgaWYgKGlzUHJlc2VudChvYmoudXNlcklkKSkge1xuICAgICAgZGF0YSA9ICdVc2VySUQ9JyArIG9iai51c2VySWQ7XG4gICAgfVxuICAgIGlmIChpc1ByZXNlbnQob2JqLmZiSWQpKSB7XG4gICAgICBkYXRhID0gJ0ZCSUQ9JyArIG9iai5mYklkO1xuICAgIH1cbiAgICBpZiAoaXNQcmVzZW50KG9iai5wZXJzb25JZCkpIHtcbiAgICAgIGRhdGEgPSAnUGVyc29uSUQ9JyArIG9iai5wZXJzb25JZDtcbiAgICB9XG4gICAgaWYgKGlzUHJlc2VudChvYmouYWNjZXNzVG9rZW4pKSB7XG4gICAgICBkYXRhID0gJ0FjY2Vzc1Rva2VuPScgKyBvYmouYWNjZXNzVG9rZW47XG4gICAgfVxuICAgIHJldHVybiB0YXBwQXBpKCdVc2VyL0Jhc2ljSW5mbz8nICsgZGF0YSkudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICBpZiAoaXNBcnJheShqc29uKSkge1xuICAgICAgICByZXR1cm4ganNvbi5tYXAoICh1c2VyKSA9PiBwYXJzZVVzZXIodXNlcikgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBqc29uO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gb2JqXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgZ2V0TG9jYXRpb25Vc2VyczogZnVuY3Rpb24gZ2V0TG9jYXRpb25Vc2VycyhzaXRlSWQpIHtcbiAgICBpZiAoIXNpdGVJZCkge1xuICAgICAgc2l0ZUlkID0gZW52aXJvbm1lbnQuc2l0ZS5zaXRlSWQ7XG4gICAgfVxuICAgIGxldCBkYXRhID0gJz9TaXRlSUQ9JyArIHNpdGVJZDtcbiAgICByZXR1cm4gdGFwcEFwaSgnVXNlci9HZXRBbGxMb2NhdGlvblVzZXJzJyArIGRhdGEpLnRoZW4oZnVuY3Rpb24oanNvbikge1xuICAgICAgcmV0dXJuIGpzb24ubWFwKCAodXNlcikgPT4gcGFyc2VVc2VyKHVzZXIpICk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEdldCBVQUMgR3JvdXBzXG4gICAqXG4gICAqIFRPRE86IHJlbW92ZSBjYWNoaW5nPyB5ZXMsIGl0IGRvZXMgbm90IHJlYWxseSBiZWxvbmcgaW4gaGVyZVxuICAgKiBUT0RPOiBCYWNrZW5kIGJ1ZyBodHRwOi8vY2hheW5zMS50b2JpdC5jb20vVGFwcEFwaS9UYXBwL0dldFVBQ0dyb3Vwcz9TaXRlSUQ9IG5vdCBlbXB0eVxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IFt1cGRhdGVDYWNoZT11bmRlZmluZWRdIFRydWUgdG8gZm9yY2UgdG8gcmVjZWl2ZSBuZXcgVUFDIEdyb3Vwc1xuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gQXJyYXkgd2l0aCBVQUMgR3JvdXBzXG4gICAqL1xuICBnZXRVYWNHcm91cHM6IGZ1bmN0aW9uIGdldFVhY0dyb3VwcyhzaXRlSWQsIHVwZGF0ZUNhY2hlKSB7XG4gICAgaWYgKHVhY0dyb3Vwc0NhY2hlICYmICF1cGRhdGVDYWNoZSkge1xuICAgICAgbG9nLmRlYnVnKCdyZXR1cm5pbmcgY2FjaGVkIFVBQyBHcm91cHMnKTtcbiAgICAgIHJldHVybiB1YWNHcm91cHNDYWNoZTtcbiAgICB9XG4gICAgaWYgKCFzaXRlSWQpIHtcbiAgICAgIHNpdGVJZCA9IGVudmlyb25tZW50LnNpdGUuc2l0ZUlkO1xuICAgICAgY29uc29sZS5sb2coc2l0ZUlkKTtcbiAgICB9XG4gICAgbGV0IGRhdGEgPSAnU2l0ZUlEPScgKyBzaXRlSWQ7XG4gICAgcmV0dXJuIHRhcHBBcGkoJ1RhcHAvR2V0VUFDR3JvdXBzPycgKyBkYXRhKS50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIHJldHVybiBqc29uLm1hcCggKGdyb3VwKSA9PiBwYXJzZUdyb3VwKGdyb3VwKSApO1xuICAgIH0pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUT0RPOiB1c2UgdXNlcklkIGluc3RlYWQgb2YgdGhlIGZhY2Vib29rSWQ/XG4gICAqIFRPRE86IHJlZmFjdG9yIG5hbWU/XG4gICAqIEBwYXJhbSB1c2VySWQgRmFjZWJvb2sgVXNlcklkXG4gICAqIEByZXR1cm5zIHtQcm9taXNlfVxuICAgKi9cbiAgaXNVc2VyQWRtaW5PZkxvY2F0aW9uOiBmdW5jdGlvbiBpc1VzZXJBZG1pbk9mTG9jYXRpb24odXNlcklkKSB7XG4gICAgaWYgKCF1c2VySWQpIHtcbiAgICAgIGxvZy5lcnJvcignTm8gdXNlcklkIHdhcyBzdXBwbGllZC4nKTtcbiAgICAgIHJldHVybiBmYWxzZTsgLy8gVE9ETzogdGhyb3cgZXJyb3I/XG4gICAgfVxuICAgIGxldCBkYXRhID0gJz9TaXRlSUQ9JyArIGVudmlyb25tZW50LnNpdGUuc2l0ZUlkICsgJyZGQklEPScgKyB1c2VySWQ7XG4gICAgcmV0dXJuIHRhcHBBcGkoJ1VzZXIvSXNVc2VyQWRtaW4nICsgZGF0YSkudGhlbihmdW5jdGlvbihqc29uKSB7XG4gICAgICByZXR1cm4ganNvbjtcbiAgICB9KTtcbiAgfSxcblxuICBpbnRlcmNvbToge1xuICAgIHNlbmRNZXNzYWdlOiBmdW5jdGlvbihvYmopIHtcbiAgICAgIGxldCBkYXRhID0ge1xuICAgICAgICBTaXRlSUQ6IG9iai5zaXRlSWQsXG4gICAgICAgIEFjY2Vzc1Rva2VuOiBvYmouYWNjZXNzVG9rZW4sXG4gICAgICAgIE1lc3NhZ2U6IG9iai5tZXNzYWdlXG4gICAgICB9O1xuICAgICAgZGF0YVtvYmoubmFtZV0gPSBvYmoudmFsdWU7XG4gICAgICBmZXRjaCgnSW50ZXJDb20vVXNlcicsIDEpOy8vVE9ETzogbGVmdCBvZlxuICAgIH0sXG5cbiAgICBzZW5kTWVzc2FnZUFzVXNlcjogZnVuY3Rpb24gc2VuZE1lc3NhZ2VBc1VzZXIoKSB7XG5cbiAgICB9LFxuXG4gICAgc2VuZE1lc3NhZ2VUb1VzZXI6IGZ1bmN0aW9uIHNlbmRNZXNzYWdlVG9Vc2VyKCkge1xuXG4gICAgfSxcblxuICAgIHNlbmRNZXNzYWdlVG9DaGF5bnNVc2VyOiBmdW5jdGlvbiBzZW5kTWVzc2FnZVRvQ2hheW5zVXNlcigpIHtcblxuICAgIH0sXG5cbiAgICBzZW5kTWVzc2FnZVRvR3JvdXA6IGZ1bmN0aW9uIHNlbmRNZXNzYWdlVG9Hcm91cCgpIHtcblxuICAgIH1cbiAgfVxufTtcblxuXG5cbi8qKlxuICogVGFwcCBBUEkgcmVxdWVzdFxuICpcbiAqIFRPRE86IHVzZSBQT1NUIGluc3RlYWQgb2YgR0VUXG4gKiBAcGFyYW0gZW5kcG9pbnRcbiAqIEByZXR1cm5zIHtQcm9taXNlfSB3aXRoIGpzb24gZGF0YVxuICovXG5mdW5jdGlvbiB0YXBwQXBpKGVuZHBvaW50KSB7XG4gIGxldCB1cmwgPSB0YXBwQXBpUm9vdCArIGVuZHBvaW50O1xuICByZXR1cm4gZmV0Y2godXJsLCB7Y3JlZGVudGlhbHM6ICdjb3JzJ30pXG4gICAgLnRoZW4oIChyZXMgKT0+IHJlcy5qc29uKCkgKVxuICAgIC50aGVuKGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIGlmIChqc29uLlZhbHVlKSB7XG4gICAgICAgIHJldHVybiBqc29uLlZhbHVlO1xuICAgICAgfSBlbHNlIGlmIChqc29uLkRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGpzb24uRGF0YTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBqc29uO1xuICAgICAgfVxuICAgIH0pO1xufVxuIiwiZXhwb3J0IHZhciB1c2VyID0ge1xuICBuYW1lOiAnUGFjYWwgV2VpbGFuZCcsXG4gIGZpcnN0TmFtZTogJ1Bhc2NhbCcsXG4gIGxhc3ROYW1lOiAnV2VpbGFuZCcsXG4gIHVzZXJJZDogMTIzNCxcbiAgZmFjZWJvb2tJZDogMTIzNDUsXG4gIGlzQWRtaW46IHRydWUsXG4gIHVhY0dyb3VwczogW10sXG4gIGxhbmd1YWdlOiAnZGVfREUnLFxuICB0b2tlbjogJ3Rva2VuJyAvLyBUT0RPIGluY2x1ZGUgdG9rZW4gaGVyZT9cbn07XG4iLCIoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgLy9cbiAgLy9pZiAoc2VsZi5mZXRjaCkge1xuICAvLyAgcmV0dXJuXG4gIC8vfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGlmICgvW15hLXowLTlcXC0jJCUmJyorLlxcXl9gfH5dL2kudGVzdChuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBjaGFyYWN0ZXIgaW4gaGVhZGVyIGZpZWxkIG5hbWUnKVxuICAgIH1cbiAgICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBub3JtYWxpemVWYWx1ZSh2YWx1ZSkge1xuICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZVxuICB9XG5cbiAgZnVuY3Rpb24gSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgdGhpcy5tYXAgPSB7fVxuXG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgaWYgKGhlYWRlcnMgaW5zdGFuY2VvZiBIZWFkZXJzKSB7XG4gICAgICBoZWFkZXJzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgdmFsdWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgfSBlbHNlIGlmIChoZWFkZXJzKSB7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhoZWFkZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgICAgc2VsZi5hcHBlbmQobmFtZSwgaGVhZGVyc1tuYW1lXSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24obmFtZSwgdmFsdWUpIHtcbiAgICBuYW1lID0gbm9ybWFsaXplTmFtZShuYW1lKVxuICAgIHZhbHVlID0gbm9ybWFsaXplVmFsdWUodmFsdWUpXG4gICAgdmFyIGxpc3QgPSB0aGlzLm1hcFtuYW1lXVxuICAgIGlmICghbGlzdCkge1xuICAgICAgbGlzdCA9IFtdXG4gICAgICB0aGlzLm1hcFtuYW1lXSA9IGxpc3RcbiAgICB9XG4gICAgbGlzdC5wdXNoKHZhbHVlKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGVbJ2RlbGV0ZSddID0gZnVuY3Rpb24obmFtZSkge1xuICAgIGRlbGV0ZSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB2YWx1ZXMgPSB0aGlzLm1hcFtub3JtYWxpemVOYW1lKG5hbWUpXVxuICAgIHJldHVybiB2YWx1ZXMgPyB2YWx1ZXNbMF0gOiBudWxsXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXRBbGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldIHx8IFtdXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLmhhc093blByb3BlcnR5KG5vcm1hbGl6ZU5hbWUobmFtZSkpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldID0gW25vcm1hbGl6ZVZhbHVlKHZhbHVlKV1cbiAgfVxuXG4gIC8vIEluc3RlYWQgb2YgaXRlcmFibGUgZm9yIG5vdy5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5tYXApLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgY2FsbGJhY2sobmFtZSwgc2VsZi5tYXBbbmFtZV0pXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbnN1bWVkKGJvZHkpIHtcbiAgICBpZiAoYm9keS5ib2R5VXNlZCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBUeXBlRXJyb3IoJ0FscmVhZHkgcmVhZCcpKVxuICAgIH1cbiAgICBib2R5LmJvZHlVc2VkID0gdHJ1ZVxuICB9XG5cbiAgZnVuY3Rpb24gZmlsZVJlYWRlclJlYWR5KHJlYWRlcikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVzb2x2ZShyZWFkZXIucmVzdWx0KVxuICAgICAgfVxuICAgICAgcmVhZGVyLm9uZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVqZWN0KHJlYWRlci5lcnJvcilcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc0FycmF5QnVmZmVyKGJsb2IpIHtcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKVxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVhZEJsb2JBc1RleHQoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc1RleHQoYmxvYilcbiAgICByZXR1cm4gZmlsZVJlYWRlclJlYWR5KHJlYWRlcilcbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIGJsb2I6ICdGaWxlUmVhZGVyJyBpbiBzZWxmICYmICdCbG9iJyBpbiBzZWxmICYmIChmdW5jdGlvbigpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG5ldyBCbG9iKCk7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmXG4gIH1cblxuICBmdW5jdGlvbiBCb2R5KCkge1xuICAgIHRoaXMuYm9keVVzZWQgPSBmYWxzZVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5faW5pdEJvZHkgPSBmdW5jdGlvbihib2R5KSB7XG4gICAgICAgIHRoaXMuX2JvZHlJbml0ID0gYm9keVxuICAgICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5ibG9iICYmIEJsb2IucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmZvcm1EYXRhICYmIEZvcm1EYXRhLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKGJvZHkpKSB7XG4gICAgICAgICAgdGhpcy5fYm9keUZvcm1EYXRhID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKCFib2R5KSB7XG4gICAgICAgICAgdGhpcy5fYm9keVRleHQgPSAnJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgQm9keUluaXQgdHlwZScpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgIH1cblxuICAgICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5SW5pdCA9IGJvZHlcbiAgICAgICAgaWYgKHR5cGVvZiBib2R5ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuZm9ybURhdGEgJiYgRm9ybURhdGEucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICAgIH0gZWxzZSBpZiAoIWJvZHkpIHtcbiAgICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bnN1cHBvcnRlZCBCb2R5SW5pdCB0eXBlJylcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnRleHQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlamVjdGVkID0gY29uc3VtZWQodGhpcylcbiAgICAgICAgcmV0dXJuIHJlamVjdGVkID8gcmVqZWN0ZWQgOiBQcm9taXNlLnJlc29sdmUodGhpcy5fYm9keVRleHQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuZm9ybURhdGEpIHtcbiAgICAgIHRoaXMuZm9ybURhdGEgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oZGVjb2RlKVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuanNvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudGV4dCgpLnRoZW4oSlNPTi5wYXJzZSlcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLy8gSFRUUCBtZXRob2RzIHdob3NlIGNhcGl0YWxpemF0aW9uIHNob3VsZCBiZSBub3JtYWxpemVkXG4gIHZhciBtZXRob2RzID0gWydERUxFVEUnLCAnR0VUJywgJ0hFQUQnLCAnT1BUSU9OUycsICdQT1NUJywgJ1BVVCddXG5cbiAgZnVuY3Rpb24gbm9ybWFsaXplTWV0aG9kKG1ldGhvZCkge1xuICAgIHZhciB1cGNhc2VkID0gbWV0aG9kLnRvVXBwZXJDYXNlKClcbiAgICByZXR1cm4gKG1ldGhvZHMuaW5kZXhPZih1cGNhc2VkKSA+IC0xKSA/IHVwY2FzZWQgOiBtZXRob2RcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXVlc3QodXJsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cbiAgICB0aGlzLnVybCA9IHVybFxuXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMob3B0aW9ucy5oZWFkZXJzKVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCBudWxsXG4gICAgdGhpcy5yZWZlcnJlciA9IG51bGxcblxuICAgIGlmICgodGhpcy5tZXRob2QgPT09ICdHRVQnIHx8IHRoaXMubWV0aG9kID09PSAnSEVBRCcpICYmIG9wdGlvbnMuYm9keSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQm9keSBub3QgYWxsb3dlZCBmb3IgR0VUIG9yIEhFQUQgcmVxdWVzdHMnKVxuICAgIH1cbiAgICB0aGlzLl9pbml0Qm9keShvcHRpb25zLmJvZHkpXG4gIH1cblxuICBmdW5jdGlvbiBkZWNvZGUoYm9keSkge1xuICAgIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKClcbiAgICBib2R5LnRyaW0oKS5zcGxpdCgnJicpLmZvckVhY2goZnVuY3Rpb24oYnl0ZXMpIHtcbiAgICAgIGlmIChieXRlcykge1xuICAgICAgICB2YXIgc3BsaXQgPSBieXRlcy5zcGxpdCgnPScpXG4gICAgICAgIHZhciBuYW1lID0gc3BsaXQuc2hpZnQoKS5yZXBsYWNlKC9cXCsvZywgJyAnKVxuICAgICAgICB2YXIgdmFsdWUgPSBzcGxpdC5qb2luKCc9JykucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgZm9ybS5hcHBlbmQoZGVjb2RlVVJJQ29tcG9uZW50KG5hbWUpLCBkZWNvZGVVUklDb21wb25lbnQodmFsdWUpKVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIGZvcm1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhlYWRlcnMoeGhyKSB7XG4gICAgdmFyIGhlYWQgPSBuZXcgSGVhZGVycygpXG4gICAgdmFyIHBhaXJzID0geGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgUmVxdWVzdC5wcm90b3R5cGUuZmV0Y2ggPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuICAgICAgaWYgKHNlbGYuY3JlZGVudGlhbHMgPT09ICdjb3JzJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gcmVzcG9uc2VVUkwoKSB7XG4gICAgICAgIGlmICgncmVzcG9uc2VVUkwnIGluIHhocikge1xuICAgICAgICAgIHJldHVybiB4aHIucmVzcG9uc2VVUkxcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF2b2lkIHNlY3VyaXR5IHdhcm5pbmdzIG9uIGdldFJlc3BvbnNlSGVhZGVyIHdoZW4gbm90IGFsbG93ZWQgYnkgQ09SU1xuICAgICAgICBpZiAoL15YLVJlcXVlc3QtVVJMOi9tLnRlc3QoeGhyLmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSkge1xuICAgICAgICAgIHJldHVybiB4aHIuZ2V0UmVzcG9uc2VIZWFkZXIoJ1gtUmVxdWVzdC1VUkwnKVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBzdGF0dXMgPSAoeGhyLnN0YXR1cyA9PT0gMTIyMykgPyAyMDQgOiB4aHIuc3RhdHVzXG4gICAgICAgIGlmIChzdGF0dXMgPCAxMDAgfHwgc3RhdHVzID4gNTk5KSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBUeXBlRXJyb3IoJ05ldHdvcmsgcmVxdWVzdCBmYWlsZWQnKSlcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHN0YXR1cyxcbiAgICAgICAgICBzdGF0dXNUZXh0OiB4aHIuc3RhdHVzVGV4dCxcbiAgICAgICAgICBoZWFkZXJzOiBoZWFkZXJzKHhociksXG4gICAgICAgICAgdXJsOiByZXNwb25zZVVSTCgpXG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJvZHkgPSAncmVzcG9uc2UnIGluIHhociA/IHhoci5yZXNwb25zZSA6IHhoci5yZXNwb25zZVRleHQ7XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub3BlbihzZWxmLm1ldGhvZCwgc2VsZi51cmwsIHRydWUpXG5cbiAgICAgIGlmICgncmVzcG9uc2VUeXBlJyBpbiB4aHIgJiYgc3VwcG9ydC5ibG9iKSB7XG4gICAgICAgIHhoci5yZXNwb25zZVR5cGUgPSAnYmxvYidcbiAgICAgIH1cblxuICAgICAgc2VsZi5oZWFkZXJzLmZvckVhY2goZnVuY3Rpb24obmFtZSwgdmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIobmFtZSwgdmFsdWUpXG4gICAgICAgIH0pXG4gICAgICB9KVxuXG4gICAgICB4aHIuc2VuZCh0eXBlb2Ygc2VsZi5fYm9keUluaXQgPT09ICd1bmRlZmluZWQnID8gbnVsbCA6IHNlbGYuX2JvZHlJbml0KVxuICAgIH0pXG4gIH1cblxuICBCb2R5LmNhbGwoUmVxdWVzdC5wcm90b3R5cGUpXG5cbiAgZnVuY3Rpb24gUmVzcG9uc2UoYm9keUluaXQsIG9wdGlvbnMpIHtcbiAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSB7fVxuICAgIH1cblxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICAgIHRoaXMudHlwZSA9ICdkZWZhdWx0J1xuICAgIHRoaXMudXJsID0gbnVsbFxuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXNcbiAgICB0aGlzLm9rID0gdGhpcy5zdGF0dXMgPj0gMjAwICYmIHRoaXMuc3RhdHVzIDwgMzAwXG4gICAgdGhpcy5zdGF0dXNUZXh0ID0gb3B0aW9ucy5zdGF0dXNUZXh0XG4gICAgdGhpcy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBzZWxmLkhlYWRlcnMgPSBIZWFkZXJzO1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0O1xuICBzZWxmLlJlc3BvbnNlID0gUmVzcG9uc2U7XG5cbiAgc2VsZi5mZXRjaCA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgICByZXR1cm4gbmV3IFJlcXVlc3QodXJsLCBvcHRpb25zKS5mZXRjaCgpXG4gIH1cbiAgc2VsZi5mZXRjaC5wb2x5ZmlsbCA9IHRydWVcbn0pKCk7XG4iLCIvKiFcbiAqIEBvdmVydmlldyBlczYtcHJvbWlzZSAtIGEgdGlueSBpbXBsZW1lbnRhdGlvbiBvZiBQcm9taXNlcy9BKy5cbiAqIEBjb3B5cmlnaHQgQ29weXJpZ2h0IChjKSAyMDE0IFllaHVkYSBLYXR6LCBUb20gRGFsZSwgU3RlZmFuIFBlbm5lciBhbmQgY29udHJpYnV0b3JzIChDb252ZXJzaW9uIHRvIEVTNiBBUEkgYnkgSmFrZSBBcmNoaWJhbGQpXG4gKiBAbGljZW5zZSAgIExpY2Vuc2VkIHVuZGVyIE1JVCBsaWNlbnNlXG4gKiAgICAgICAgICAgIFNlZSBodHRwczovL3Jhdy5naXRodWJ1c2VyY29udGVudC5jb20vamFrZWFyY2hpYmFsZC9lczYtcHJvbWlzZS9tYXN0ZXIvTElDRU5TRVxuICogQHZlcnNpb24gICAyLjAuMFxuICovXG5cbihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoYSxiKXtuW2xdPWE7bltsKzFdPWI7bCs9MjsyPT09bCYmQSgpfWZ1bmN0aW9uIHMoYSl7cmV0dXJuXCJmdW5jdGlvblwiPT09dHlwZW9mIGF9ZnVuY3Rpb24gRigpe3JldHVybiBmdW5jdGlvbigpe3Byb2Nlc3MubmV4dFRpY2sodCl9fWZ1bmN0aW9uIEcoKXt2YXIgYT0wLGI9bmV3IEIodCksYz1kb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShcIlwiKTtiLm9ic2VydmUoYyx7Y2hhcmFjdGVyRGF0YTohMH0pO3JldHVybiBmdW5jdGlvbigpe2MuZGF0YT1hPSsrYSUyfX1mdW5jdGlvbiBIKCl7dmFyIGE9bmV3IE1lc3NhZ2VDaGFubmVsO2EucG9ydDEub25tZXNzYWdlPXQ7cmV0dXJuIGZ1bmN0aW9uKCl7YS5wb3J0Mi5wb3N0TWVzc2FnZSgwKX19ZnVuY3Rpb24gSSgpe3JldHVybiBmdW5jdGlvbigpe3NldFRpbWVvdXQodCwxKX19ZnVuY3Rpb24gdCgpe2Zvcih2YXIgYT0wO2E8bDthKz0yKSgwLG5bYV0pKG5bYSsxXSksblthXT12b2lkIDAsblthKzFdPXZvaWQgMDtcbmw9MH1mdW5jdGlvbiBwKCl7fWZ1bmN0aW9uIEooYSxiLGMsZCl7dHJ5e2EuY2FsbChiLGMsZCl9Y2F0Y2goZSl7cmV0dXJuIGV9fWZ1bmN0aW9uIEsoYSxiLGMpe3IoZnVuY3Rpb24oYSl7dmFyIGU9ITEsZj1KKGMsYixmdW5jdGlvbihjKXtlfHwoZT0hMCxiIT09Yz9xKGEsYyk6bShhLGMpKX0sZnVuY3Rpb24oYil7ZXx8KGU9ITAsZyhhLGIpKX0pOyFlJiZmJiYoZT0hMCxnKGEsZikpfSxhKX1mdW5jdGlvbiBMKGEsYil7MT09PWIuYT9tKGEsYi5iKToyPT09YS5hP2coYSxiLmIpOnUoYix2b2lkIDAsZnVuY3Rpb24oYil7cShhLGIpfSxmdW5jdGlvbihiKXtnKGEsYil9KX1mdW5jdGlvbiBxKGEsYil7aWYoYT09PWIpZyhhLG5ldyBUeXBlRXJyb3IoXCJZb3UgY2Fubm90IHJlc29sdmUgYSBwcm9taXNlIHdpdGggaXRzZWxmXCIpKTtlbHNlIGlmKFwiZnVuY3Rpb25cIj09PXR5cGVvZiBifHxcIm9iamVjdFwiPT09dHlwZW9mIGImJm51bGwhPT1iKWlmKGIuY29uc3RydWN0b3I9PT1hLmNvbnN0cnVjdG9yKUwoYSxcbmIpO2Vsc2V7dmFyIGM7dHJ5e2M9Yi50aGVufWNhdGNoKGQpe3YuZXJyb3I9ZCxjPXZ9Yz09PXY/ZyhhLHYuZXJyb3IpOnZvaWQgMD09PWM/bShhLGIpOnMoYyk/SyhhLGIsYyk6bShhLGIpfWVsc2UgbShhLGIpfWZ1bmN0aW9uIE0oYSl7YS5mJiZhLmYoYS5iKTt4KGEpfWZ1bmN0aW9uIG0oYSxiKXt2b2lkIDA9PT1hLmEmJihhLmI9YixhLmE9MSwwIT09YS5lLmxlbmd0aCYmcih4LGEpKX1mdW5jdGlvbiBnKGEsYil7dm9pZCAwPT09YS5hJiYoYS5hPTIsYS5iPWIscihNLGEpKX1mdW5jdGlvbiB1KGEsYixjLGQpe3ZhciBlPWEuZSxmPWUubGVuZ3RoO2EuZj1udWxsO2VbZl09YjtlW2YrMV09YztlW2YrMl09ZDswPT09ZiYmYS5hJiZyKHgsYSl9ZnVuY3Rpb24geChhKXt2YXIgYj1hLmUsYz1hLmE7aWYoMCE9PWIubGVuZ3RoKXtmb3IodmFyIGQsZSxmPWEuYixnPTA7ZzxiLmxlbmd0aDtnKz0zKWQ9YltnXSxlPWJbZytjXSxkP0MoYyxkLGUsZik6ZShmKTthLmUubGVuZ3RoPTB9fWZ1bmN0aW9uIEQoKXt0aGlzLmVycm9yPVxubnVsbH1mdW5jdGlvbiBDKGEsYixjLGQpe3ZhciBlPXMoYyksZixrLGgsbDtpZihlKXt0cnl7Zj1jKGQpfWNhdGNoKG4pe3kuZXJyb3I9bixmPXl9Zj09PXk/KGw9ITAsaz1mLmVycm9yLGY9bnVsbCk6aD0hMDtpZihiPT09Zil7ZyhiLG5ldyBUeXBlRXJyb3IoXCJBIHByb21pc2VzIGNhbGxiYWNrIGNhbm5vdCByZXR1cm4gdGhhdCBzYW1lIHByb21pc2UuXCIpKTtyZXR1cm59fWVsc2UgZj1kLGg9ITA7dm9pZCAwPT09Yi5hJiYoZSYmaD9xKGIsZik6bD9nKGIsayk6MT09PWE/bShiLGYpOjI9PT1hJiZnKGIsZikpfWZ1bmN0aW9uIE4oYSxiKXt0cnl7YihmdW5jdGlvbihiKXtxKGEsYil9LGZ1bmN0aW9uKGIpe2coYSxiKX0pfWNhdGNoKGMpe2coYSxjKX19ZnVuY3Rpb24gayhhLGIsYyxkKXt0aGlzLm49YTt0aGlzLmM9bmV3IGEocCxkKTt0aGlzLmk9Yzt0aGlzLm8oYik/KHRoaXMubT1iLHRoaXMuZD10aGlzLmxlbmd0aD1iLmxlbmd0aCx0aGlzLmwoKSwwPT09dGhpcy5sZW5ndGg/bSh0aGlzLmMsXG50aGlzLmIpOih0aGlzLmxlbmd0aD10aGlzLmxlbmd0aHx8MCx0aGlzLmsoKSwwPT09dGhpcy5kJiZtKHRoaXMuYyx0aGlzLmIpKSk6Zyh0aGlzLmMsdGhpcy5wKCkpfWZ1bmN0aW9uIGgoYSl7TysrO3RoaXMuYj10aGlzLmE9dm9pZCAwO3RoaXMuZT1bXTtpZihwIT09YSl7aWYoIXMoYSkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIllvdSBtdXN0IHBhc3MgYSByZXNvbHZlciBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQgdG8gdGhlIHByb21pc2UgY29uc3RydWN0b3JcIik7aWYoISh0aGlzIGluc3RhbmNlb2YgaCkpdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtOKHRoaXMsYSl9fXZhciBFPUFycmF5LmlzQXJyYXk/QXJyYXkuaXNBcnJheTpmdW5jdGlvbihhKXtyZXR1cm5cIltvYmplY3QgQXJyYXldXCI9PT1cbk9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhKX0sbD0wLHc9XCJ1bmRlZmluZWRcIiE9PXR5cGVvZiB3aW5kb3c/d2luZG93Ont9LEI9dy5NdXRhdGlvbk9ic2VydmVyfHx3LldlYktpdE11dGF0aW9uT2JzZXJ2ZXIsdz1cInVuZGVmaW5lZFwiIT09dHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5JiZcInVuZGVmaW5lZFwiIT09dHlwZW9mIGltcG9ydFNjcmlwdHMmJlwidW5kZWZpbmVkXCIhPT10eXBlb2YgTWVzc2FnZUNoYW5uZWwsbj1BcnJheSgxRTMpLEE7QT1cInVuZGVmaW5lZFwiIT09dHlwZW9mIHByb2Nlc3MmJlwiW29iamVjdCBwcm9jZXNzXVwiPT09e30udG9TdHJpbmcuY2FsbChwcm9jZXNzKT9GKCk6Qj9HKCk6dz9IKCk6SSgpO3ZhciB2PW5ldyBELHk9bmV3IEQ7ay5wcm90b3R5cGUubz1mdW5jdGlvbihhKXtyZXR1cm4gRShhKX07ay5wcm90b3R5cGUucD1mdW5jdGlvbigpe3JldHVybiBFcnJvcihcIkFycmF5IE1ldGhvZHMgbXVzdCBiZSBwcm92aWRlZCBhbiBBcnJheVwiKX07ay5wcm90b3R5cGUubD1cbmZ1bmN0aW9uKCl7dGhpcy5iPUFycmF5KHRoaXMubGVuZ3RoKX07ay5wcm90b3R5cGUuaz1mdW5jdGlvbigpe2Zvcih2YXIgYT10aGlzLmxlbmd0aCxiPXRoaXMuYyxjPXRoaXMubSxkPTA7dm9pZCAwPT09Yi5hJiZkPGE7ZCsrKXRoaXMuaihjW2RdLGQpfTtrLnByb3RvdHlwZS5qPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5uO1wib2JqZWN0XCI9PT10eXBlb2YgYSYmbnVsbCE9PWE/YS5jb25zdHJ1Y3Rvcj09PWMmJnZvaWQgMCE9PWEuYT8oYS5mPW51bGwsdGhpcy5nKGEuYSxiLGEuYikpOnRoaXMucShjLnJlc29sdmUoYSksYik6KHRoaXMuZC0tLHRoaXMuYltiXT10aGlzLmgoYSkpfTtrLnByb3RvdHlwZS5nPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD10aGlzLmM7dm9pZCAwPT09ZC5hJiYodGhpcy5kLS0sdGhpcy5pJiYyPT09YT9nKGQsYyk6dGhpcy5iW2JdPXRoaXMuaChjKSk7MD09PXRoaXMuZCYmbShkLHRoaXMuYil9O2sucHJvdG90eXBlLmg9ZnVuY3Rpb24oYSl7cmV0dXJuIGF9O1xuay5wcm90b3R5cGUucT1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXM7dShhLHZvaWQgMCxmdW5jdGlvbihhKXtjLmcoMSxiLGEpfSxmdW5jdGlvbihhKXtjLmcoMixiLGEpfSl9O3ZhciBPPTA7aC5hbGw9ZnVuY3Rpb24oYSxiKXtyZXR1cm4obmV3IGsodGhpcyxhLCEwLGIpKS5jfTtoLnJhY2U9ZnVuY3Rpb24oYSxiKXtmdW5jdGlvbiBjKGEpe3EoZSxhKX1mdW5jdGlvbiBkKGEpe2coZSxhKX12YXIgZT1uZXcgdGhpcyhwLGIpO2lmKCFFKGEpKXJldHVybiAoZyhlLG5ldyBUeXBlRXJyb3IoXCJZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIHJhY2UuXCIpKSwgZSk7Zm9yKHZhciBmPWEubGVuZ3RoLGg9MDt2b2lkIDA9PT1lLmEmJmg8ZjtoKyspdSh0aGlzLnJlc29sdmUoYVtoXSksdm9pZCAwLGMsZCk7cmV0dXJuIGV9O2gucmVzb2x2ZT1mdW5jdGlvbihhLGIpe2lmKGEmJlwib2JqZWN0XCI9PT10eXBlb2YgYSYmYS5jb25zdHJ1Y3Rvcj09PXRoaXMpcmV0dXJuIGE7dmFyIGM9bmV3IHRoaXMocCxiKTtcbnEoYyxhKTtyZXR1cm4gY307aC5yZWplY3Q9ZnVuY3Rpb24oYSxiKXt2YXIgYz1uZXcgdGhpcyhwLGIpO2coYyxhKTtyZXR1cm4gY307aC5wcm90b3R5cGU9e2NvbnN0cnVjdG9yOmgsdGhlbjpmdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuYTtpZigxPT09YyYmIWF8fDI9PT1jJiYhYilyZXR1cm4gdGhpczt2YXIgZD1uZXcgdGhpcy5jb25zdHJ1Y3RvcihwKSxlPXRoaXMuYjtpZihjKXt2YXIgZj1hcmd1bWVudHNbYy0xXTtyKGZ1bmN0aW9uKCl7QyhjLGQsZixlKX0pfWVsc2UgdSh0aGlzLGQsYSxiKTtyZXR1cm4gZH0sXCJjYXRjaFwiOmZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLnRoZW4obnVsbCxhKX19O3ZhciB6PXtQcm9taXNlOmgscG9seWZpbGw6ZnVuY3Rpb24oKXt2YXIgYTthPVwidW5kZWZpbmVkXCIhPT10eXBlb2YgZ2xvYmFsP2dsb2JhbDpcInVuZGVmaW5lZFwiIT09dHlwZW9mIHdpbmRvdyYmd2luZG93LmRvY3VtZW50P3dpbmRvdzpzZWxmO1wiUHJvbWlzZVwiaW4gYSYmXCJyZXNvbHZlXCJpblxuYS5Qcm9taXNlJiZcInJlamVjdFwiaW4gYS5Qcm9taXNlJiZcImFsbFwiaW4gYS5Qcm9taXNlJiZcInJhY2VcImluIGEuUHJvbWlzZSYmZnVuY3Rpb24oKXt2YXIgYjtuZXcgYS5Qcm9taXNlKGZ1bmN0aW9uKGEpe2I9YX0pO3JldHVybiBzKGIpfSgpfHwoYS5Qcm9taXNlPWgpfX07XCJmdW5jdGlvblwiPT09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoZnVuY3Rpb24oKXtyZXR1cm4gen0pOlwidW5kZWZpbmVkXCIhPT10eXBlb2YgbW9kdWxlJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz16OlwidW5kZWZpbmVkXCIhPT10eXBlb2YgdGhpcyYmKHRoaXMuRVM2UHJvbWlzZT16KX0pLmNhbGwodGhpcyk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzIG9yIHRvYmlcbiAqIEBtb2R1bGUgamFtZXNcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqICMgamFtZXMgLSB0b2JpdCBoZWxwZXIgbGlicmFyeVxuICogSGVscGVyIGxpYnJhcnkgc3VwcG9ydGluZyB0aGUgQ2hheW5zIEFQSVxuICovXG5cbi8vIFRPRE86IG1vdmUgYWxsIHRvIGhlbHBlci5qcyBvciB0b2JpL2phbXNcbi8vIFRPRE86IGhlbHBlci5qcyB3aXRoIEVTNiBhbmQgamFzbWluZSAoYW5kIG9yIHRhcGUpXG4vLyBpbmNsdWRlIGhlbHBlciBhcyBtYWluIG1vZHVsZVxuXG4vLyBpbXBvcnRhbnQgaXMqIGZ1bmN0aW9uc1xuZXhwb3J0ICogZnJvbSAnLi91dGlscy9pcyc7XG5cbi8vIGV4dGVuZCBvYmplY3QgZnVuY3Rpb25cbmV4cG9ydCAqIGZyb20gJy4vdXRpbHMvZXh0ZW5kJztcblxuLy8gTG9nZ2VyXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xvZ2dlcic7XG5cbi8vIFRPRE86IGRvIHdlIGV2ZW4gbmVlZCBtb2Rlcm5pemVyP1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL21vZGVybml6ZXInO1xuXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2h0dHAnO1xuXG4vLyBCcm93c2VyIEFQSXMgKHdpbmRvdywgZG9jdW1lbnQsIGxvY2F0aW9uKVxuLy8gVE9ETzogY29uc2lkZXIgdG8gbm90IGJpbmQgYnJvd3NlciB0byB0aGUgdXRpbHMgYE9iamVjdGBcbi8qIGpzaGludCAtVzExNiAqL1xuLyoganNoaW50IC1XMDMzICovXG4vLyBqc2NzOmRpc2FibGUgcGFyc2VFcnJvclxuaW1wb3J0ICogYXMgYnJvd3NlciBmcm9tICcuL3V0aWxzL2Jyb3dzZXInOyAvL25vaW5zcGVjdGlvbiBCYWRFeHByZXNzaW9uU3RhdGVtZW50SlMganNoaW50IGlnbm9yZTogbGluZVxuLy8ganNjczplbmFibGUgcGFyc2VFcnJvclxuLyoganNoaW50ICtXMDMzICovXG4vKiBqc2hpbnQgK1cxMTYgKi9cbmV4cG9ydCB7YnJvd3Nlcn07XG5cbi8vIERPTVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9kb20nO1xuXG4vLyBBbmFseXRpY3Ncbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9hbmFseXRpY3MnO1xuXG4vLyBSZW1vdGVcbi8vIHJlbW90ZSBkZWJ1Z2dpbmcgYW5kIGFuYWx5c2lzXG5cbi8vIGZyb250LWVuZCBFcnJvciBIYW5kbGVyIChjYXRjaGVzIGVycm9ycywgaWRlbnRpZnkgYW5kIGFuYWx5c2VzIHRoZW0pXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2Vycm9yJztcblxuLy8gYXV0aCAmIEpXVCBoYW5kbGVyXG4vL2V4cG9ydCAqIGZyb20gJy4vdXRpbHMvand0JztcblxuLy8gY29va2llIGhhbmRsZXIgKHdpbGwgYmUgdXNlZCBpbiB0aGUgbG9jYWxfc3RvcmFnZSBhcyBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9jb29raWVfaGFuZGxlcic7XG5cbi8vIGxvY2FsU3RvcmFnZSBoZWxwZXIgKHdoaWNoIGNvb2tpZSBmYWxsYmFjaylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sb2NhbF9zdG9yYWdlJztcblxuLy8gbWljcm8gZXZlbnQgbGlicmFyeVxuZXhwb3J0ICogZnJvbSAnLi91dGlscy9ldmVudHMnO1xuXG4vLyBvZmZsaW5lIGNhY2hlIGhlbHBlclxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL29mZmxpbmVfY2FjaGUnO1xuXG4vLyBub3RpZmljYXRpb25zOiB0b2FzdHMsIGFsZXJ0cywgbW9kYWwgcG9wdXBzLCBuYXRpdmUgcHVzaFxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL25vdGlmaWNhdGlvbnMnO1xuXG4vLyBpZnJhbWUgY29tbXVuaWNhdGlvbiBhbmQgaGVscGVyIChDT1JTKVxuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lmcmFtZSc7XG5cbi8vIHBhZ2UgdmlzaWJpbGl0eSBBUElcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9wYWdlX3Zpc2liaWxpdHknO1xuXG4vLyBEYXRlVGltZSBoZWxwZXIgKGNvbnZlcnRzIGRhdGVzLCBDIyBkYXRlLCB0aW1lc3RhbXBzLCBpMThuLCB0aW1lIGFnbylcbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9kYXRldGltZSc7XG5cblxuLy8gbGFuZ3VhZ2UgQVBJIGkxOG5cbi8vZXhwb3J0ICogZnJvbSAnLi91dGlscy9sYW5ndWFnZSc7XG5cbi8vIGNyaXRpY2FsIGNzc1xuXG4vLyBsb2FkQ1NTXG5cbi8vIGxhenkgbG9hZGluZ1xuLy9leHBvcnQgKiBmcm9tICcuL3V0aWxzL2xhenlfbG9hZGluZyc7XG5cbi8vIChpbWFnZSkgcHJlbG9hZGVyXG4vL2V4cG9ydCAqIGZyb20gJy91dGlscy9wcmVsb2FkZXInO1xuXG4vLyBpc1BlbWl0dGVkIEFwcCBWZXJzaW9uIGNoZWNrXG5leHBvcnQgKiBmcm9tICcuL3V0aWxzL2lzX3Blcm1pdHRlZCc7XG5cblxuLy8gaW4gRnV0dXJlXG4vLyBpbW11dGFibGVcbi8vIHdlYWsgbWFwc1xuLy8gb2JzZXJ2ZXJcbi8vIHdlYiBzb2NrZXRzICh3cywgU2lnbmFsUilcbi8vIHdvcmtlciAoc2hhcmVkIHdvcmtlciwgbGF0ZXIgc2VydmljZSB3b3JrZXIgYXMgd2VsbClcbi8vIGxvY2F0aW9uLCBwdXNoU3RhdGUsIGhpc3RvcnkgaGFuZGxlclxuLy8gY2hheW5zIHNpdGUgYW5kIGNvZGUgYW5hbHlzZXI6IGZpbmQgZGVwcmVjYXRlZCBtZXRob2RzLCBiYWQgY29kZSwgaXNzdWVzIGFuZCBib3R0bGVuZWNrc1xuXG4iLCIvKipcbiAqIFRoaXMgbW9kdWxlIGNvbnRhaW5zIHRoZSBCcm93c2VyIEFQSXNcbiAqXG4gKi9cbi8vIFRPRE86IG1vdmUgb3V0IG9mIHV0aWxzXG52YXIgd2luID0gd2luZG93O1xuXG4vLyB1c2luZyBub2RlIGdsb2JhbCAobWFpbmx5IGZvciB0ZXN0aW5nLCBkZXBlbmRlbmN5IG1hbmFnZW1lbnQpXG52YXIgX2dsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogd2luZG93O1xuZXhwb3J0IHtfZ2xvYmFsIGFzIGdsb2JhbH07XG5cbmV4cG9ydCB7d2luIGFzIHdpbmRvd307XG5leHBvcnQgdmFyIGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xuZXhwb3J0IHZhciBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcbmV4cG9ydCB2YXIgbmF2aWdhdG9yID0gd2luZG93Lm5hdmlnYXRvcjtcbmV4cG9ydCB2YXIgY2hheW5zID0gd2luZG93LmNoYXlucztcbmV4cG9ydCB2YXIgY2hheW5zQ2FsbGJhY2tzID0gd2luZG93Ll9jaGF5bnNDYWxsYmFja3M7XG5leHBvcnQgdmFyIGNoYXluc1Jvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hheW5zLXJvb3QnKTtcbmV4cG9ydCB2YXIgcGFyZW50ID0gd2luZG93LnBhcmVudDtcbmV4cG9ydCB2YXIgY29uc29sZSA9IHdpbmRvdy5jb25zb2xlOyAvLyBOT1RFOiBzaG91bGQgbm90IGJlIHVzZWQuIHVzZSBsb2dnZXIgaW5zdGVhZFxuZXhwb3J0IHZhciBnYyA9IHdpbmRvdy5nYyA/ICgpID0+IHdpbmRvdy5nYygpIDogKCkgPT4gbnVsbDtcblxuIiwiLy8gaW5zcGlyZWQgYnkgQW5ndWxhcjIncyBET01cblxuaW1wb3J0IHtkb2N1bWVudH0gZnJvbSAnLi9icm93c2VyJztcbmltcG9ydCB7aXNVbmRlZmluZWR9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgY2xhc3MgRE9NIHtcblxuICAvLyBOT1RFOiBhbHdheXMgcmV0dXJucyBhbiBhcnJheVxuICBzdGF0aWMgJChzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsLmJpbmQoZG9jdW1lbnQpO1xuICB9XG5cbiAgLy8gc2VsZWN0b3JzXG4gIHN0YXRpYyBxdWVyeShzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgfVxuICBzdGF0aWMgcXVlcnlTZWxlY3RvcihlbCwgc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZWwucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIH1cbiAgc3RhdGljIHF1ZXJ5U2VsZWN0b3JBbGwoZWwsIHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGVsLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xuICB9XG4gIHN0YXRpYyBvbihlbCwgZXZ0LCBsaXN0ZW5lcikge1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZ0LCBsaXN0ZW5lciwgZmFsc2UpO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY2xvbmUobm9kZSkge1xuICAgIHJldHVybiBub2RlLmNsb25lTm9kZSh0cnVlKTtcbiAgfVxuICBzdGF0aWMgaGFzUHJvcGVydHkoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBuYW1lIGluIGVsZW1lbnQ7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlDbGFzc05hbWUoZWxlbWVudCwgbmFtZSkge1xuICAgIHJldHVybiBlbGVtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUobmFtZSk7XG4gIH1cbiAgc3RhdGljIGdldEVsZW1lbnRzQnlUYWdOYW1lKGVsZW1lbnQsIG5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShuYW1lKTtcbiAgfVxuXG4gIC8vIGlucHV0XG4gIHN0YXRpYyBnZXRJbm5lckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwuaW5uZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBnZXRPdXRlckhUTUwoZWwpIHtcbiAgICByZXR1cm4gZWwub3V0ZXJIVE1MO1xuICB9XG4gIHN0YXRpYyBzZXRIVE1MKGVsLCB2YWx1ZSkge1xuICAgIGVsLmlubmVySFRNTCA9IHZhbHVlO1xuICB9XG4gIHN0YXRpYyBnZXRUZXh0KGVsKSB7XG4gICAgcmV0dXJuIGVsLnRleHRDb250ZW50O1xuICB9XG4gIHN0YXRpYyBzZXRUZXh0KGVsLCB2YWx1ZSkge1xuICAgIGVsLnRleHRDb250ZW50ID0gdmFsdWU7XG4gIH1cblxuICAvLyBpbnB1dCB2YWx1ZVxuICBzdGF0aWMgZ2V0VmFsdWUoZWwpIHtcbiAgICByZXR1cm4gZWwudmFsdWU7XG4gIH1cbiAgc3RhdGljIHNldFZhbHVlKGVsLCB2YWx1ZSkge1xuICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gIH1cblxuICAvLyBjaGVja2JveGVzXG4gIHN0YXRpYyBnZXRDaGVja2VkKGVsKSB7XG4gICAgcmV0dXJuIGVsLmNoZWNrZWQ7XG4gIH1cbiAgc3RhdGljIHNldENoZWNrZWQoZWwsIHZhbHVlKSB7XG4gICAgZWwuY2hlY2tlZCA9IHZhbHVlO1xuICB9XG5cbiAgLy8gY2xhc3NcbiAgc3RhdGljIGNsYXNzTGlzdChlbGVtZW50KSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGVsZW1lbnQuY2xhc3NMaXN0LCAwKTtcbiAgfVxuICBzdGF0aWMgYWRkQ2xhc3MoZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gIH1cbiAgc3RhdGljIHJlbW92ZUNsYXNzKGVsZW1lbnQsIGNsYXNzTmFtZSkge1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShjbGFzc05hbWUpO1xuICB9XG4gIHN0YXRpYyBoYXNDbGFzcyhlbGVtZW50LCBjbGFzc05hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcbiAgfVxuXG4gIC8vIGNzc1xuICBzdGF0aWMgY3NzKGVsZW1lbnQsIHN0eWxlTmFtZSwgc3R5bGVWaGFzYWx1ZSkge1xuICAgIGlmKGlzVW5kZWZpbmVkKHN0eWxlVmFsdWUpKSB7XG4gICAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICAgIH1cbiAgICBlbGVtZW50LnN0eWxlW3N0eWxlTmFtZV0gPSBzdHlsZVZhbHVlO1xuICB9XG4gIHN0YXRpYyBzZXRDU1MoZWxlbWVudCwgc3R5bGVOYW1lLCBzdHlsZVZhbHVlKSB7XG4gICAgZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdID0gc3R5bGVWYWx1ZTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ1NTKGVsZW1lbnQsIHN0eWxlTmFtZSkge1xuICAgIGVsZW1lbnQuc3R5bGVbc3R5bGVOYW1lXSA9IG51bGw7XG4gIH1cbiAgc3RhdGljIGdldENTUyhlbGVtZW50LCBzdHlsZU5hbWUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5zdHlsZVtzdHlsZU5hbWVdO1xuICB9XG5cbiAgLy8gbm9kZXMgJiBlbGVtZW50c1xuICBzdGF0aWMgY3JlYXRlRWxlbWVudCh0YWdOYW1lLCBkb2M9ZG9jdW1lbnQpIHtcbiAgICByZXR1cm4gZG9jLmNyZWF0ZUVsZW1lbnQodGFnTmFtZSk7XG4gIH1cblxuICBzdGF0aWMgcmVtb3ZlKGVsKSB7XG4gICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudE5vZGU7XG4gICAgcGFyZW50LnJlbW92ZUNoaWxkKGVsKTtcbiAgICByZXR1cm4gZWw7XG4gIH1cblxuICBzdGF0aWMgYXBwZW5kQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5hcHBlbmRDaGlsZChub2RlKTtcbiAgfVxuICBzdGF0aWMgcmVtb3ZlQ2hpbGQoZWwsIG5vZGUpIHtcbiAgICBlbC5yZW1vdmVDaGlsZChub2RlKTtcbiAgfVxuXG4gIHN0YXRpYyBpbnNlcnRCZWZvcmUoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbCk7XG4gIH1cblxuICBzdGF0aWMgaW5zZXJ0QWZ0ZXIoZWwsIG5vZGUpIHtcbiAgICBlbC5wYXJlbnROb2RlLmluc2VydEJlZm9yZShub2RlLCBlbC5uZXh0U2libGluZyk7XG4gIH1cblxuICBzdGF0aWMgdGFnTmFtZShlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQudGFnTmFtZTtcbiAgfVxuXG4gIC8vIGF0dHJpYnV0ZXNcbiAgc3RhdGljIGdldEF0dHJpYnV0ZShlbGVtZW50LCBhdHRyaWJ1dGUpIHtcbiAgICByZXR1cm4gZWxlbWVudC5nZXRBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgfVxuICBzdGF0aWMgc2V0QXR0cmlidXRlKGVsZW1lbnQsIG5hbWUsIHZhbHVlKSB7XG4gICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICB9XG4gIHN0YXRpYyByZW1vdmVBdHRyaWJ1dGUoZWxlbWVudCwgYXR0cmlidXRlKSB7XG4gICAgaWYgKCFlbGVtZW50KSB7XG4gICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gIH1cbn1cbiIsIi8qKlxuICogRXJyb3IgSGFuZGxlciBNb2R1bGVcbiAqL1xuXG4vLyBUT0RPOiBjb25zaWRlciBpbXBvcnRpbmcgZnJvbSAnLi91dGlscycgb25seVxuaW1wb3J0IHt3aW5kb3cgYXMgd2lufSBmcm9tICcuL2Jyb3dzZXInO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJy4vbG9nZ2VyJztcbmltcG9ydCB7Q29uZmlnfSBmcm9tICcuLi9jaGF5bnMvY29uZmlnJztcblxubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLmVycm9yJyk7XG5cbndpbi5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICBsZXQgbGluZUFuZENvbHVtbkluZm8gPVxuICAgIGVyci5jb2xub1xuICAgICAgPyAnIGxpbmU6JyArIGVyci5saW5lbm8gKyAnLCBjb2x1bW46JyArIGVyci5jb2xub1xuICAgICAgOiAnIGxpbmU6JyArIGVyci5saW5lbm87XG5cbiAgbGV0IGZpbmFsRXJyb3IgPSBbXG4gICAgICAnSmF2YVNjcmlwdCBFcnJvcicsXG4gICAgICBlcnIubWVzc2FnZSxcbiAgICAgIGVyci5maWxlbmFtZSArIGxpbmVBbmRDb2x1bW5JbmZvICsgJyAtPiAnICsgIG5hdmlnYXRvci51c2VyQWdlbnQsXG4gICAgICAwLFxuICAgICAgdHJ1ZVxuICBdO1xuXG4gIC8vIFRPRE86IGFkZCBwcm9wZXIgRXJyb3IgSGFuZGxlclxuICBsb2cud2FybihmaW5hbEVycm9yKTtcbiAgaWYoQ29uZmlnLmdldCgncHJldmVudEVycm9ycycpKSB7XG4gICAgZXJyLnByZXZlbnREZWZhdWx0KCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufSk7XG4iLCIvLyBUT0RPOiByZWZhY3RvciBhbmQgd3JpdGUgdGVzdHNcbi8vIFRPRE86IGFkZCBleGFtcGxlXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuIGBgYGpzXG4gLy8gRGVtb1xuXG4gZXZlbnRzLnB1Ymxpc2goJy9wYWdlL2xvYWQnLCB7XG5cdHVybDogJy9zb21lL3VybC9wYXRoJyAvLyBhbnkgYXJndW1lbnRcbn0pO1xuXG4gdmFyIHN1YnNjcmlwdGlvbiA9IGV2ZW50cy5zdWJzY3JpYmUoJy9wYWdlL2xvYWQnLCBmdW5jdGlvbihvYmopIHtcblx0Ly8gRG8gc29tZXRoaW5nIG5vdyB0aGF0IHRoZSBldmVudCBoYXMgb2NjdXJyZWRcbn0pO1xuXG4gLy8gLi4uc29tZXRpbWUgbGF0ZXIgd2hlcmUgSSBubyBsb25nZXIgd2FudCBzdWJzY3JpcHRpb24uLi5cbiBzdWJzY3JpcHRpb24ucmVtb3ZlKCk7XG5cbiAvLyAgdmFyIHRhcmdldCA9IHdpbmRvdy5ldmVudCA/IHdpbmRvdy5ldmVudC5zcmNFbGVtZW50IDogZSA/IGUudGFyZ2V0IDogbnVsbDtcbiBgYGBcbiAqL1xuZXhwb3J0IHZhciBldmVudHMgPSAoZnVuY3Rpb24oKSB7XG4gIGxldCB0b3BpY3MgPSB7fTtcbiAgbGV0IG93blByb3BlcnR5ID0gdG9waWNzLmhhc093blByb3BlcnR5O1xuXG4gIHJldHVybiB7XG4gICAgc3Vic2NyaWJlOiBmdW5jdGlvbih0b3BpYywgbGlzdGVuZXIpIHtcbiAgICAgIC8vIENyZWF0ZSB0aGUgdG9waWMncyBvYmplY3QgaWYgbm90IHlldCBjcmVhdGVkXG4gICAgICBpZiAoIW93blByb3BlcnR5LmNhbGwodG9waWNzLCB0b3BpYykpIHtcbiAgICAgICAgdG9waWNzW3RvcGljXSA9IFtdO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgdGhlIGxpc3RlbmVyIHRvIHF1ZXVlXG4gICAgICBsZXQgaW5kZXggPSB0b3BpY3NbdG9waWNdLnB1c2gobGlzdGVuZXIpIC0xO1xuXG4gICAgICAvLyBQcm92aWRlIGhhbmRsZSBiYWNrIGZvciByZW1vdmFsIG9mIHRvcGljXG4gICAgICByZXR1cm4ge1xuICAgICAgICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRlbGV0ZSB0b3BpY3NbdG9waWNdW2luZGV4XTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9LFxuXG4gICAgcHVibGlzaDogZnVuY3Rpb24odG9waWMsIGluZm8pIHtcbiAgICAgIC8vIElmIHRoZSB0b3BpYyBkb2Vzbid0IGV4aXN0LCBvciB0aGVyZSdzIG5vIGxpc3RlbmVycyBpbiBxdWV1ZSwganVzdCBsZWF2ZVxuICAgICAgaWYgKCFvd25Qcm9wZXJ0eS5jYWxsKHRvcGljcywgdG9waWMpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gQ3ljbGUgdGhyb3VnaCB0b3BpY3MgcXVldWUsIGZpcmUhXG4gICAgICB0b3BpY3NbdG9waWNdLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICBpdGVtKGluZm8gIT09IHVuZGVmaW5lZCA/IGluZm8gOiB7fSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbn0pKCk7XG4iLCIvKipcbiAqIEBuYW1lIGphbWVzLmV4dGVuZFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRXh0ZW5kcyB0aGUgZGVzdGluYXRpb24gb2JqZWN0IGJ5IGNvcHlpbmcgcHJvcGVydGllcyBmcm9tIHRoZSBzcmMgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5cbmltcG9ydCB7aXNPYmplY3R9IGZyb20gJy4vaXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW5kKG9iaikge1xuICBpZiAoIWlzT2JqZWN0KG9iaikpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG4gIHZhciBzb3VyY2UsIHByb3A7XG4gIGZvciAodmFyIGkgPSAxLCBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgZm9yIChwcm9wIGluIHNvdXJjZSkge1xuICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb2JqO1xufVxuIiwiLy9pbXBvcnQge3dpbmRvd30gZnJvbSAnLi9icm93c2VyJztcbi8qIGdsb2JhbCBmZXRjaCAqL1xuaW1wb3J0IHtcbiAgZ2V0TG9nZ2VyLFxuICBpc0Zvcm1FbGVtZW50LFxuICBpc1N0cmluZyxcbiAgaXNPYmplY3QsXG4gIGlzRm9ybURhdGFcbiAgfSBmcm9tICcuLi91dGlscyc7XG5cbmxldCBsb2cgPSBnZXRMb2dnZXIoJ2NoYXlucy51dGlscy5odHRwJyk7XG4vL2xldCBQcm9taXNlID0gd2luZG93LlByb21pc2U7IC8vIG90aGVyd2lzZSBpbXBvcnQgUHJvbWlzZVxuLy9sZXQgZmV0Y2ggPSB3aW5kb3cuZmV0Y2g7IC8vIG90aGVyd2lzZSBUT0RPOiBpbXBvcnQgZmV0Y2hcblxuXG5cblxuLyoqXG4gKiBGZXRjaCBKU09OIHZpYSBHRVRcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0ganNvbiByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZldGNoSlNPTih1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBQT1NUIFJlcXVlc3RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge0hUTUxGb3JtRWxlbWVudFxcRm9ybURhdGFcXFVSTFNlYXJjaFBhcmFtc1xcVVNWU3RyaW5nXFxCbG9ifEJ1ZmZlclNvdXJjZX0gZm9ybVxuICogQHJldHVybnMge1Byb21pc2V9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0Rm9ybSh1cmwsIGZvcm0pIHtcbiAgaWYgKGlzRm9ybUVsZW1lbnQoZm9ybSkpIHtcbiAgICBmb3JtID0gbmV3IEZvcm1EYXRhKGZvcm0pO1xuICB9XG4gIHJldHVybiBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBib2R5OiBmb3JtXG4gIH0pO1xufVxuXG4vKipcbiAqIFBvc3QgSlNPTlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAqIEBwYXJhbSB7YE9iamVjdGB9IGRhdGEgRWl0aGVyIE9iamVjdCBvciBKU09OIFN0cmluZ1xuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0KHVybCwgZGF0YSkge1xuICBpZiAoaXNPYmplY3QoZGF0YSkpIHtcbiAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gIH0gZWxzZSBpZiAoIWlzU3RyaW5nKGRhdGEpKSB7XG4gICAgbG9nLndhcm4oJ3Bvc3RKU09OOiBpbnZhbGlkIGRhdGEnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcG9zdCBkYXRhJyk7XG4gIH1cbiAgcmV0dXJuIGZldGNoKHVybCwge1xuICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgfSxcbiAgICBib2R5OiBkYXRhXG4gIH0pO1xufVxuXG4vKipcbiAqIFVwbG9hZCBmaWxlXG4gKiBUT0RPOiBhZGQgYWRkaXRpb25hbCBwYXJhbXMgb3B0aW9uc1xuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHBhcmFtIHtJbnB1dC5maWxlfEZvcm1EYXRhfSBkYXRhXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICogQHJldHVybnMgeyp9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGxvYWQodXJsLCBkYXRhLCBuYW1lKSB7XG4gIHZhciBmb3JtID0gbmV3IEZvcm1EYXRhKCk7XG4gIGlmICghaXNGb3JtRGF0YShkYXRhKSkge1xuICAgIGZvcm0uYXBwZW5kKG5hbWUgfHwgJ2ZpbGUnLCBkYXRhKTtcbiAgfSBlbHNlIHtcbiAgICBmb3JtID0gZGF0YTtcbiAgfVxuXG4gIHJldHVybiBmZXRjaCh1cmwsIHtcbiAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICBib2R5OiBmb3JtXG4gIH0pO1xufVxuXG4vKipcbiAqIEZldGNoIHRleHQgb3IgSFRNTCB2aWEgR0VUXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVybFxuICogQHJldHVybnMge1Byb21pc2V9IHdpdGggdGVzdCByZXN1bHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldCh1cmwpIHtcbiAgcmV0dXJuIGZldGNoKHVybClcbiAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnRleHQoKTtcbiAgICB9KTtcbn1cbiIsIi8qKlxuICogQG5hbWUgamFtZXMuaXNVbmRlZmluZWRcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIHVuZGVmaW5lZC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgdW5kZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNVbmRlZmluZWQodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNEZWZpbmVkXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBkZWZpbmVkLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBkZWZpbmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNEZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgIT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzUHJlc2VudFxuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgbmVpdGhlciB1bmRlZmluZWQgbm9yIG51bGwuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIHByZXNlbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1ByZXNlbnQob2JqKSB7XG4gIHJldHVybiBvYmogIT09IHVuZGVmaW5lZCAmJiBvYmogIT09IG51bGw7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNCbGFua1xuICogQG1vZHVsZSBqYW1lc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgZWl0aGVyIHVuZGVmaW5lZCBvciBudWxsLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBibGFuay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQmxhbmsob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHVuZGVmaW5lZCB8fCBvYmogPT09IG51bGw7XG59XG5cblxuLyoqXG4qIEBuYW1lIGphbWVzLmlzU3RyaW5nXG4qIEBtb2R1bGUgamFtZXNcbiogQGtpbmQgZnVuY3Rpb25cbipcbiogQGRlc2NyaXB0aW9uXG4qIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgU3RyaW5nYC5cbipcbiogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4qIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgU3RyaW5nYC5cbiovXG5leHBvcnQgZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7XG59XG5cbi8qKlxuICogQG5hbWUgamFtZXMuaXNOdW1iZXJcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYE51bWJlcmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYE51bWJlcmAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc051bWJlcih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc09iamVjdFxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhbiBgT2JqZWN0YC5cbiAqIG51bGwgaXMgbm90IHRyZWF0ZWQgYXMgYW4gb2JqZWN0LlxuICogSW4gSlMgYXJyYXlzIGFyZSBvYmplY3RzXG4gKlxuICogQHBhcmFtIG9ialxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhbiBgT2JqZWN0YC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIEBuYW1lIGphbWVzLmlzQXJyYXlcbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYW4gYEFycmF5YC5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbHVlIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYW4gYEFycmF5YC5cbiAqL1xuZXhwb3J0IHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0Z1bmN0aW9uXG4gKiBAbW9kdWxlIGphbWVzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBGdW5jdGlvbmAuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYEZ1bmN0aW9uYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAbmFtZSBqYW1lcy5pc0RhdGVcbiAqIEBtb2R1bGUgamFtZXNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgdmFsdWUgaXMgYSBkYXRlLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBEYXRlYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRGF0ZSh2YWx1ZSkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuLy8gVE9ETzogZG9lcyBub3QgYmVsb25nIGluIGhlcmVcbi8qKlxuICogQG5hbWUgdXRpbHMudHJpbVxuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZW1vdmVzIHdoaXRlc3BhY2VzLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge1N0cmluZ3wqfSBUcmltbWVkICB2YWx1ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gdHJpbSh2YWx1ZSkge1xuICByZXR1cm4gaXNTdHJpbmcodmFsdWUpID8gdmFsdWUucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpIDogdmFsdWU7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNVVUlEXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgVVVJRGAgKE9TRikuXG4gKlxuICogQHBhcmFtIHsqfSB2YWx1ZSBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgdmFsdWVgIGlzIGEgYFVVSURgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNVVUlEKHZhbHVlKSB7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YWx1ZSA9IHRyaW0odmFsdWUpO1xuICAgIHJldHVybiB2YWx1ZS5tYXRjaCgvXlswLTlhLWZdezR9KFswLTlhLWZdezR9LSl7NH1bMC05YS16XXsxMn0kL2kpICE9PSBudWxsO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0dVSURcbiAqIEBhbGlhcyB1dGlscy5pc1VVSURcbiAqIEBtb2R1bGUgY2hheW5zLnV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIGBHVUlEYCAoTWljcm9zb2Z0IFN0YW5kYXJkKS5cbiAqIElzIGFuIGFsaWFzIHRvIGlzVVVJRFxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBHVUlEYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzR1VJRCh2YWx1ZSkge1xuICByZXR1cm4gaXNVVUlEKHZhbHVlKTtcbn1cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNNYWNBZGRyZXNzXG4gKiBAbW9kdWxlIGNoYXlucy51dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBgTUFDIEFkZHJlc3NgLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgUmVmZXJlbmNlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgYHZhbHVlYCBpcyBhIGBNQUMgQWRkcmVzc2AuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc01hY0FkZHJlc3ModmFsdWUpIHtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhbHVlID0gdHJpbSh2YWx1ZSk7XG4gICAgcmV0dXJuIHZhbHVlLm1hdGNoKC9eKFswLTlhLWZdezJ9Wy06XSl7NX1bMC05YS1mXXsyfSQvaSkgIT09IG51bGw7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIEBuYW1lIHV0aWxzLmlzQkxFQWRkcmVzc1xuICogQG1vZHVsZSBjaGF5bnMudXRpbHNcbiAqIEBraW5kIGZ1bmN0aW9uXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBEZXRlcm1pbmVzIGlmIGEgcmVmZXJlbmNlIGlzIGEgYEJMRSBBZGRyZXNzYFxuICpcbiAqIEBwYXJhbSB7Kn0gb2JqIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGB2YWx1ZWAgaXMgYSBgQkxFIEFkZHJlc3NgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNCTEVBZGRyZXNzKHZhbHVlKSB7XG4gIHJldHVybiBpc1VVSUQodmFsdWUpIHx8IGlzTWFjQWRkcmVzcyh2YWx1ZSk7XG59XG5cbi8qKlxuICogQG5hbWUgdXRpbHMuaXNGb3JtRGF0YVxuICogQG1vZHVsZSB1dGlsc1xuICogQGtpbmQgZnVuY3Rpb25cbiAqXG4gKiBAZGVzY3JpcHRpb25cbiAqIERldGVybWluZXMgaWYgYSByZWZlcmVuY2UgaXMgYSBGb3JtRGF0YSBgT2JqZWN0YC5cbiAqXG4gKiBAcGFyYW0geyp9IG9iaiBSZWZlcmVuY2UgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBgb2JqYCBpcyBhIGBGb3JtRGF0YWAgT2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNGb3JtRGF0YShvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgRm9ybURhdGFdJztcbn1cblxuLyoqXG4gKiBAbmFtZSB1dGlscy5pc0Zvcm1FbGVtZW50XG4gKiBAbW9kdWxlIHV0aWxzXG4gKiBAa2luZCBmdW5jdGlvblxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lcyBpZiBhIHJlZmVyZW5jZSBpcyBhIEZvcm1FbGVtZW50LlxuICpcbiAqIEBwYXJhbSB7Kn0gb2JqIFJlZmVyZW5jZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGBvYmpgIGlzIGEgYEhUTUxGb3JtRWxlbWVudGAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Zvcm1FbGVtZW50KG9iaikge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBIVE1MRm9ybUVsZW1lbnRdJztcbn1cbiIsImltcG9ydCB7Z2V0TG9nZ2VyLCBpc09iamVjdH0gZnJvbSAnLi4vdXRpbHMnO1xubGV0IGxvZyA9IGdldExvZ2dlcignY2hheW5zLnV0aWxzLmlzX3Blcm1pdHRlZCcpO1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogRGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGN1cnJlbnQgdXNlcidzIE9TIGFuZCBPUyBWZXJzaW9uIGlzIGhpZ2hlclxuICogb3IgZXF1YWwgdG8gdGhlIHBhc3NlZCByZWZlcmVuY2UgYE9iamVjdGAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZlcnNpb25zIFZlcnNpb25zIGBPYmplY3RgIHdpdGggcGVybWl0dGVkIE9TcyBhbmQgdGhlaXIgdmVyc2lvbi5cbiAqIEBwYXJhbSB7c3RyaW5nfSBvcyBPUyBOYW1lIGFzIGxvd2VyY2FzZSBzdHJpbmcuXG4gKiBAcGFyYW0ge0ludGVnZXJ9IGFwcFZlcnNpb24gQXBwIFZlcnNpb24gTnVtYmVyIGFzIEludGVnZXIgIFRPRE86IGZvcm1hdCBSRkM/XG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgY3VycmVudCBPUyAmIFZlcnNpb24gYXJlIGRlZmluZWQgaW4gdGhlIHZlcnNpb25zIGBPYmplY3RgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1Blcm1pdHRlZCh2ZXJzaW9ucywgb3MsIGFwcFZlcnNpb24pIHtcblxuICBpZiAoIXZlcnNpb25zIHx8ICFpc09iamVjdCh2ZXJzaW9ucykpIHtcbiAgICBsb2cud2Fybignbm8gdmVyc2lvbnMgYE9iamVjdGAgd2FzIHBhc3NlZCcpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB2ZXJzaW9uc1tvc10gJiYgYXBwVmVyc2lvbiA+PSB2ZXJzaW9uc1tvc107XG59XG4iLCIvKipcbiAqIExvZ0xldmVsIEVudW1cbiAqIG5vbmUgaXMgMFxuICogZGVidWcgaXMgNFxuICogQHR5cGUgRW51bVxuICovXG5leHBvcnQgdmFyIGxldmVscyA9IHtcbiAgbm9uZTogMCxcbiAgZXJyb3I6MSxcbiAgd2FybjoyLFxuICBpbmZvOjMsXG4gIGRlYnVnOjRcbn07XG5cbi8qKlxuICogQ2FuIHN0b3JlIG11bHRpcGxlIGxvZ2dlcnNcbiAqIEB0eXBlIHtgT2JqZWN0YH0gbG9nZ2Vyc1xuICovXG5sZXQgbG9nZ2VycyA9IHt9O1xuXG4vKipcbiAqIEBkZXNjcmlwdGlvblxuICogQXNzaWduIHRoZSBsb2dnZXIgbWV0aG9kLlxuICogQnkgZGVmYXVsdCB0aGUgd2luZG93LmNvbnNvbGUgYE9iamVjdGBcbiAqIEB0eXBlIGB3aW5kb3cuY29uc29sZWBcbiAqL1xubGV0IGxvZ2dlciA9IHdpbmRvdy5jb25zb2xlO1xuXG4vKipcbiAqIFNldCB0aGUgY3VycmVudCBsb2cgTGV2ZWxcbiAqIHVzZSBgc2V0TGV2ZWwobmV3TG9nTGV2ZWwpYCB0byBvdmVyd3JpdGUgdGhpcyB2YWx1ZS5cbiAqIFRPRE86IGVhY2ggbG9nZ2VyIGdldHMgYW4gb3duIGxvZ0xldmVsXG4gKi9cbmxldCBsb2dMZXZlbCA9IGxldmVscy5ub25lO1xuXG4vKipcbiAqXG4gKiBAcGFyYW0gbGV2ZWxcbiAqIEBwYXJhbSBhcmdzXG4gKiBAcHJpdmF0ZVxuICovXG5mdW5jdGlvbiBsb2cobGV2ZWwsIGFyZ3MsIHByZWZpeCkge1xuICBsZXQgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG4gIGlmIChwcmVmaXgpIHtcbiAgICBhcmdzID0gc2xpY2UuY2FsbChhcmdzKTtcbiAgICAvL2FyZ3MudW5zaGlmdCh0aW1lKTsgLy8gVE9ETzogY29uc2lkZXIgdG9nZ2xlYWJsZSB0aW1lXG4gICAgYXJncy51bnNoaWZ0KHByZWZpeCk7XG4gIH1cbiAgbG9nZ2VyW2xldmVsIHx8ICdsb2cnXS5hcHBseShjb25zb2xlLCBhcmdzKTtcbn1cblxuLyoqXG4gKiBTZXQgdGhlIGN1cnJlbnQgbG9nTGV2ZWxcbiAqIGluIG9yZGVyIHRvIHNob3cgb3Igbm90IHNob3cgbG9nc1xuICogQHBhcmFtIGxldmVsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRMZXZlbChsZXZlbCkge1xuICBsb2dMZXZlbCA9IGxldmVsO1xufVxuXG4vKipcbiAqIEdldCBMb2dnZXIgU2luZ2xldG9uIEluc3RhbmNlXG4gKiBAcGFyYW0gIHtzdHJpbmd9IG5hbWUgVGhlIExvZ2dlcidzIG5hbWVcbiAqIEByZXR1cm5zIHtMb2dnZXJ9IExvZ2dlciBpbnN0YW5jZSwgZWl0aGVyIGV4aXN0aW5nIG9uZSBvciBjcmVhdGVzIGEgbmV3IG9uZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9nZ2VyKG5hbWUpIHtcbiAgcmV0dXJuIGxvZ2dlcnNbbmFtZV0gfHwgKGxvZ2dlcnNbbmFtZV0gPSBuZXcgTG9nZ2VyKG5hbWUpKTtcbn1cblxuLyoqXG4gKiBMb2dnZXIgY2xhc3NcbiAqL1xuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG5cbiAgLyoqXG4gICAqIEVhY2ggbG9nZ2VyIGlzIGlkZW50aWZpZWQgYnkgaXQncyBuYW1lLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBsb2dnZXIgKGUuZy4gYGNoYXlucy5jb3JlYClcbiAgICovXG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSAnWycgKyBuYW1lICsgJ106ICc7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBhIGRlYnVnIG1lc3NhZ2UuXG4gICAqXG4gICAqIEBtZXRob2QgZGVidWdcbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICBkZWJ1ZygpIHtcbiAgICBpZiAobG9nTGV2ZWwgPCA0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZygnZGVidWcnLCBhcmd1bWVudHMsIHRoaXMubmFtZSk7XG4gIH1cblxuICAvKipcbiAgICogTG9ncyBpbmZvLlxuICAgKlxuICAgKiBAbWV0aG9kIGluZm9cbiAgICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gbG9nXG4gICAqL1xuICBpbmZvKCkge1xuICAgIGlmIChsb2dMZXZlbCA8IDMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nKCdpbmZvJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG5cblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcuXG4gICAqXG4gICAqIEBtZXRob2Qgd2FyblxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSB0byBsb2dcbiAgICovXG4gIHdhcm4oKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgMikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxvZygnd2FybicsIGFyZ3VtZW50cywgdGhpcy5uYW1lKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yLlxuICAgKlxuICAgKiBAbWV0aG9kIGVycm9yXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIFRoZSBtZXNzYWdlIHRvIGxvZ1xuICAgKi9cbiAgZXJyb3IoKSB7XG4gICAgaWYgKGxvZ0xldmVsIDwgMSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2coJ2Vycm9yJywgYXJndW1lbnRzLCB0aGlzLm5hbWUpO1xuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiXG5pbXBvcnQge2NoYXluc30gZnJvbSAnLi9jaGF5bnMnO1xuZXhwb3J0IGRlZmF1bHQgY2hheW5zO1xuIl19
  return require('chayns');

});
