/**
 * Chayns API Interface
 * API to communicate with the APP and the Chayns Web
 */

import {apiCall} from './chayns_calls';
import {getLogger, isFunction, isString, isNumber, isBLEAddress,
  isDate, isObject, isArray, trim, DOM} from '../utils';
import {window, location} from '../utils/browser'; // due to window.open and location.href

let log = getLogger('chayns_api_interface');

/**
 * NFC Response Data Storage
 * @type {Object}
 */
// TODO: can be removed since it is not used
let NfcResponseData = {
  RFId: 0,
  PersonId: 0
};

/**
 * Beacon List
 * @type {Array|null}
 */
let beaconList = null;

/**
 * Global Data Storage
 * @type {boolean|Object}
 */
let globalData = false;

/**
 * All public chayns methods to interact with *Chayns App* or *Chayns Web*
 * @type {Object}
 */
export var chaynsApiInterface = {

  /**
   * Enable or disable PullToRefresh
   *
   * @param {Boolean} allowPull Allow PullToRefresh
   * @returns {Boolean} True if the call suceeded
   */
  setPullToRefresh: function(allowPull) {
    return apiCall({
      cmd: 0,
      webFn: false, // could be omitted
      params: [{'bool': allowPull}]
    });
  },
  // TODO: rename to enablePullToRefresh
  allowRefreshScroll: function() {
    chaynsApiInterface.setPullToRefresh(true);
  },
  disallowRefreshScroll: function() {
    chaynsApiInterface.setPullToRefresh(false);
  },

  /**
   *
   * @param {Boolean} [showCursor] If true the waitcursor will be shown
   *                               otherwise it will be hidden
   * @returns {Boolean}
   */
  setWaitCursor: function(showCursor) {
    return apiCall({
      cmd: 1,
      webFn: (showCursor ? 'show' : 'hide') + 'LoadingCursor',
      params: [{'bool': showCursor}]
    });
  },
  showWaitCursor: function() {
    return chaynsApiInterface.setWaitCursor(true);
  },
  hideWaitCursor: function() {
    return chaynsApiInterface.setWaitCursor(false);
  },

  /**
   * Select different Tapp identified by TappID or InternalTappName
   *
   * @param {String} tab Tapp Name or Tapp ID
   * @param {String} (optional) param URL Parameter
   * @returns {Boolean}
   */
  selectTapp: function(tab, param) {

    let cmd = 13; // selectTab with param ChaynsCall

    // update param: strip ? and ensure & at the begin
    if (param && !param.match(/^[&|\?]/)) { // no & and no ?
      param = '&' + param;
    } else if (param) {
      param = param.replace('?', '&');
    } else { // no params, different ChaynsCall
      cmd = 2;
    }

    return apiCall({
      cmd: cmd,
      webFn: 'selectothertab',
      params: cmd === 13
        ? [{'string': tab}, {'string': param}]
        : [{'string': tab}],
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
  selectAlbum: function(id) {
    if (!isString(id) && !isNumber(id)) {
      log.error('selectAlbum: invalid album name');
      return false;
    }
    return apiCall({
      cmd: 3,
      webFn: 'selectAlbum',
      params: [{'string': id}],
      webParams: id
    });
  },

  /**
   * Open Image
   * (old ShowPicture)
   * Android does not support gifs :(
   *
   * @param {string} url Image URL should cotain jpg,png or gif
   * @returns {Boolean}
   */
  openImage: function(url) {
    if (!isString(url) || !url.match(/jpg$|png$|gif$/i)) { // TODO: more image types?
      log.error('openPicture: invalid url');
      return false;
    }
    return apiCall({
      cmd: 4,
      webFn: 'showPicture',
      params: [{'string': url}],
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
   *
   * @param {String} text The Button's text
   * @param {Function} callback Callback Function when the caption button was clicked
   * @returns {Boolean}
   */
  setCaptionButton: function(text, callback) {

    if (!isFunction(callback)) {
      //log.error('There is no valid callback Function.');
      throw new Error('There is no valid callback Function.');
      //return false;
    }
    let callbackName = 'captionButtonCallback()';

    return apiCall({
      cmd: 5,
      params: [{string: text}, {callback: callbackName}],
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
  hideCaptionButton: function() {
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
  facebookConnect: function(permissions = 'user_friends', reloadParam = 'comment') {
    reloadParam = reloadParam;
    return apiCall({
      cmd: 7,
      webFn: 'facebookConnect',
      params: [{'string': permissions}, {'Function': 'ExecCommand="' + reloadParam + '"'}],
      webParams: {
        ReloadParameter: 'ExecCommand=' + reloadParam,
        Permissions: permissions
      },
      support: { android: 1359, ios: 1366, wp: 2469 },
      fallbackCmd: 8 // in case the above is not support the fallbackCmd will replace the cmd
    });
  },

  /**
   * Open URL in Browser
   *
   * @param {string} url URL
   * @returns {Boolean}
   */
  openUrlInBrowser: function(url) {
    return apiCall({
      cmd: 9,
      webFn: function() {
        if (url.indexOf('://') === -1) {
          url = '//' + url; // or add location.protocol prefix and // TODO: test
        }
        window.open(url, '_blank');
        return true;
      },
      params: [{'string': url}],
      support: { android: 2405, ios: 2466, wp: 2543 }
    });
  },

  /**
   * Show BackButton.
   *
   * @param {Function} callback Callback Function when the back button was clicked
   * @returns {Boolean}
   */
  showBackButton: function(callback) {

    if (!isFunction(callback)) {
      callback = function() {
        history.back();
        chaynsApiInterface.hideBackButton();
      };
    }
    let callbackName = 'backButtonCallback()';

    return apiCall({
      cmd: 10,
      params: [{'callback': callbackName}],
      support: { android: 2405, ios: 2636, wp: 2469 },
      cb: callback
    });
  },

  /**
   * Hide BackButton.
   *
   * @returns {Boolean} False on error, true if call succeeded
   */
  hideBackButton: function() {
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
  openInterCom: function() {
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
  getGeoLocation: function(callback) {

    let callbackName = 'getGeoLocationCallback()';

    if (!isFunction(callback)) {
      // TODO: remove console
      // TODO: allow empty callbacks when it is already set
      console.warn('no callback function');
    }

    return apiCall({
      cmd: 14,
      params: [{'callback': callbackName}],
      support: { android: 2501, ios: 2466, wp: 2469 },
      //webFn: function() { navigator.geolocation; } // TODO: implement
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
  openVideo: function(url) {
    if (!isString(url) || !url.match(/.*\..{2,}/)) { // TODO: WTF Regex
      log.error('openVideo: invalid url');
      return false;
    }
    return apiCall({
      cmd: 15,
      webFn: 'showVideo',
      params: [{'string': url}],
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
      log.warn('showDialog: invalid parameters');
      return false;
    }
    if (isString(obj.content)) {
      obj.content = trim(obj.content.replace(/<br[ /]*?>/g, '\n'));
    }
    if (!isArray(obj.buttons) || obj.buttons.length === 0) {
      obj.buttons = [(new PopupButton('OK')).toHTML()];
    }

    let callbackName = 'ChaynsDialogCallBack()';
    function callbackFn(buttons, id) {
      id = parseInt(id, 10) - 1;
      if (buttons[id]) {
        buttons[id].callback.call(null);
      }
    }

    return apiCall({
      cmd: 16, // TODO: is slitte://
      params: [
        {'callback': callbackName},
        {'string': obj.headline},
        {'string': obj.content},
        {'string': obj.buttons[0].name} // TODO: needs encodeURI?
        //{'string': obj.buttons[1].name}, // TODO: needs encodeURI?
        //{'string': obj.buttons[2].name} // TODO: needs encodeURI?
      ],
      cb: callbackFn.bind(null, obj.buttons),
      support: {android: 2606},
      fallbackFn: function() {
        console.log('fallback popup', arguments);
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
  getGlobalData: function(forceReload) {
    if (!forceReload && globalData) {
      log.debug('getGlobalData: return cached data');
      return Promise.resolve(globalData);
    }
    return new Promise(function(resolve, reject) {

      apiCall({
        cmd: 18,
        webFn: 'getAppInfos',
        params: [{'callback': 'getGlobalData()'}], // callback param only on mobile
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
  vibrate: function(duration) {
    if (!isNumber(duration) || duration < 2) {
      duration = 150;
    }
    return apiCall({
      cmd: 19,
      params: [{'Integer': duration.toString()}],
      webFn: function navigatorVibrate() {
        try {
          navigator.vibrate(100);
        } catch (e) {
          log.info('vibrate: the device does not support vibrate');
        }
      },
      support: {android: 2695, ios: 2596, wp: 2515}
    });
  },

  /**
   * Navigate Back.
   * Works only in native apps.
   *
   * @returns {Boolean} False on error, true if call succeeded
   */
  navigateBack: function() {
    return apiCall({
      cmd: 20,
      webFn: function() {
        history.back();
      },
      support: {android: 2696, ios: 2600, wp: 2515}
    });
  },

  /**
   * Image Upload
   *
   * @param {Function} callback Callback Function to be invoked with image url after upload
   * @returns {Boolean} True if the call succeeded or is async, false on error
   */
  uploadImage: function(callback) {
    if (!isFunction(callback)) {
      log.warn('uploadImage: no valid callback');
      return false;
    }
    let callbackName = 'imageUploadCallback()';
    return apiCall({
      cmd: 21,
      params: [{'callback': callbackName}], // callback param only on mobile
      cb: callback,
      webFn: function() {
        var input = DOM.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('value', '');
        input.setAttribute('accept', 'image/*');
        //input.setAttribute('id', 'chayns-image-upload-field);
        input.setAttribute('onchange', 'imageChosen()');
        input.setAttribute('class', 'chayns__upload-image');
        DOM.query('#chayns-root').appendChild(input);
        // TODO: solve with window.fetch()
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
      support: {android: 2705, wp: 2538, ios: 2642}
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
  setNfcCallback: function(callback, response) {
    if (!isFunction(callback)) {
      return apiCall({
        cmd: 37,
        params: [{'Function': 'null'}],
        support: {android: 3234, wp: 3121}
      }) && apiCall({
          cmd: 37,
          params: [{'Function': 'null'}],
          support: {android: 3234, wp: 3121}
        });
    }
    var cmd = (response === nfcResponseData.PersonId) ? 37 : 38;
    return apiCall({
        cmd: cmd === 37 ? 38 : 37,
        params: [{'Function': 'null'}],
        support: {android: 3234, wp: 3121}
      }) && apiCall({
      cmd: cmd,
      params: [{'callback': 'NfcCallback'}], // callback param only on mobile
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
        params: [{'Integer': 0}],
        support: {android: 2752, ios: 2644, wp: 2543}
      });
    },
    changeUrl: function changeUrl(url) {
      return apiCall({
        cmd: 22,
        params: [{'String': url}],
        support: {android: 2752, ios: 2644, wp: 2543}
      });
    },
    hideButton: function hideButton() {
      return apiCall({
        cmd: 23,
        params: [{'Integer': 0}],
        support: {android: 2752, ios: 2644, wp: 2543}
      });
    },
    showButton: function showButton() {
      return apiCall({
        cmd: 23,
        params: [{'Integer': 1}],
        support: {android: 2752, ios: 2644, wp: 2543}
      });
    },
    pause: function pauseVideo() {
      return apiCall({
        cmd: 24,
        params: [{'Integer': 0}],
        support: {android: 2752, ios: 2644, wp: 2543}
      });
    },
    play: function playVideo() {
      return apiCall({
        cmd: 24,
        params: [{'Integer': 1}],
        support: {android: 2752, ios: 2644, wp: 2543}
      });
    },
    playbackStatus: function playbackStatus(callback) {

      return chaynsApiInterface.getGlobalData(function(data) {
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
   * TODO: add modern bluetooth chayns calls
   */
  bluetooth: {
    LESendStrength: { // TODO: what is that?
      Adjacent: 0,
      Nearby: 1,
      Default: 2,
      Far: 3
    },
    scan: function LEScan(callback) {
      if (!isFunction(callback)) {
        log.warn('LEScan: no valid callback');
        return false;
      }
      let callbackName = 'bleResponseCallback';
      return apiCall({
        cmd: 26,
        params: [{'callback': callbackName}],
        cb: callback,
        support: {android: 2771, ios: 2651}
      });
    },
    connect: function LEConnect(address, callback, password) {
      if (!isString(address) || !isBLEAddress(address)) {
        log.warn('LEConnect: no valid address parameter');
        return false;
      }
      if (!isFunction(callback)) {
        log.warn('LEConnect: no valid callback');
        return false;
      }
      if (!isString(password) || !password.match(/^[0-9a-f]{6,12}$/i)) {
        password = '';
      }
      let callbackName = 'bleResponseCallback';

      return apiCall({
        cmd: 27,
        params: [{'string': address}, {'string': password}],
        cb: callback,
        callbackName: callbackName,
        support: {android: 2771, ios: 2651}
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
    write: function LEWrite(address, subId, measurePower, sendStrength, callback) {
      if (!isString(address) || !isBLEAddress(address)) {
        log.warn('LEWrite: no valid address parameter');
        return false;
      }
      if (!isNumber(subId) || subId < 0 || subId > 4095) {
        subId = 'null';
      }
      if (!isNumber(measurePower) || measurePower < -100 || measurePower > 0) {
        measurePower = 'null';
      }
      if (!isNumber(sendStrength) || sendStrength < 0 || sendStrength > 3) {
        sendStrength = 'null';
      }
      if (!isFunction(callback)) {
        callback = null;
      }

      let callbackName = 'bleResponseCallback',
        uid = '7A07E17A-A188-416E-B7A0-5A3606513E57';

      return apiCall({
        cmd: 28,
        params: [
          {'string': address},
          {'string': uid},
          {'Integer': subId},
          {'Integer': measurePower},
          {'Integer': sendStrength}
        ],
        cb: callback,
        callbackName: callbackName,
        support: {android: 2771, ios: 2651}
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
      log.warn('saveAppointment: no valid name and/or location');
      return false;
    }
    if (!isDate(start) || !isDate(end)) {
      log.warn('saveAppointment: start and/or endDate is no valid Date `Object`.');
      return false;
    }
    start = parseInt(start.getTime() / 1000, 10);
    end = parseInt(end.getTime() / 1000, 10);

    return apiCall({
      cmd: 29,
      params: [
        {'string': name},
        {'string': location},
        {'string': description},
        {'Integer': start},
        {'Integer': end}
      ],
      support: {android: 3054, ios: 3067, wp: 3030}
    });
  },

  /**
   * Open URL in App
   * (old ShowURLInApp)
   * not to confuse with openUrlInBrowser
   *
   * @param {string} url Video URL should contain jpg,png or gif
   * @returns {Boolean}
   */
  openUrl: function openUrl(url, title) {
    if (!isString(url)) {
      log.error('openUrl: invalid url');
      return false;
    }

    return apiCall({
      cmd: 31,
      fallbackFn: function() {
        location.href = url;
      },
      params: [{'string': url}, {'string': title}],
      webFn: 'overlay',
      webParams: {src: url},
      support: {android: 3110, ios: 3074, wp: 3063}
    });
  },

  /**
   * create QR Code
   * TODO: show QR Code in Dialog when there is no callback
   * @param {String|Object} data QR Code data
   * @param {Function} callback Function which receives the base64 encoded IMG TODO: which type?
   * @returns {Boolean}
   */
  createQRCode: function createQRCode(data, callback) {
    if (!isString(data)) {
      data = JSON.stringify(data);
    }

    if (!isFunction(callback)) {
      log.warn('createQRCode: the callback is no `Function`');
      return false;
    }

    let callbackName = 'createQRCodeCallback()';
    return apiCall({
      cmd: 33,
      params: [{'string': data}, {'callback': callbackName}],
      support: {android:  3220, ios: 1372, wp: 3106},
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
      log.warn('scanQRCode: the callback is no `Function`');
      return false;
    }

    let callbackName = 'scanQRCodeCallback()';
    return apiCall({
      cmd: 34,
      params: [{'callback': callbackName}],
      support: {android:  3220, ios: 1372, wp: 3106},
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
      log.warn('getLocationBeacons: the callback is no `Function`');
      return false;
    }

    let callbackName = 'getBeaconsCallBack()';
    if (beaconList && !forceReload) { // TODO: make sure it is good to cache the list
      log.debug('getLocationBeacons: there is already one beaconList');
      return callback.call(null, beaconList);
    }
    let callbackFn = function getLocationBeaconCallback(callback, list) {
      beaconList = list;
      callback.call(null, list);
    };
    return apiCall({
      cmd: 39,
      params: [{'callback': callbackName}],
      support: {android:  4045, ios: 4048},
      cb: callbackFn.bind(null, callback)
    });
  },

  /**
   * Add to Passbook
   * iOS only
   * TODO: consider removal
   *
   * @param {String} url Path to Passbook file
   * @returns {Boolean}
   */
  addToPassbook: function addToPassbook(url) {
    if (!isString(url)) {
      log.warn('addToPassbook: url is invalid.');
      return false;
    }

    return apiCall({
      cmd: 47,
      params: [{'string': url}],
      support: {ios: 4045},
      webFn: chaynsApiInterface.openUrlInBrowser.bind(null, url),
      fallbackFn: chaynsApiInterface.openUrlInBrowser.bind(null, url)
    });
  },

  /**
   * Tobit Login
   * With FacebookConnect Fallback
   * TODO: support
   *
   * @param {String} params Reload Parameter
   * @returns {Boolean}
   */
  login: function login(params) {
    params = 'ExecCommand=' + params;
    return apiCall({
      cmd: 54,
      params: [{'string': params}],
      support: {ios: 4240, wp: 4099, android: 4670},
      fallbackFn: chaynsApiInterface.facebookConnect.bind(null, 'user_friends', params),
      webFn: 'tobitconnect',
      webParams: params
    });
  },

  /**
   * Tobit Logout
   * TODO: find out app support
   *
   * @returns {Boolean}
   */
  logout: function logout() {
    return apiCall({
      cmd: 56,
      support: {ios: 4240, wp: 4099},
      webFn: 'logout'
    });
  }



};
