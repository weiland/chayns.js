/**
 * Chayns API Interface
 * API to communicate with the APP and the Chayns Web
 */

import {apiCall} from './chayns_calls';
import {getLogger, isFunction, isString, isNumber, isBLEAddress,
  isDate, DOM, defer} from '../utils';
import {Config} from './config';

let log = getLogger('chayns_api_interface');

/**
 * chayns call callback obj name (is assigned to window)
 * @type {string}
 */
let callbackPrefix = Config.get('callbackPrefix'); // TODO(pascal): Config required? even used?
function callbackName(fnName) {
  return `'window.${callbackPrefix}.${fnName}()'`;
}
/**
 * Beacon List
 * @type {Array|null}
 */
//let beaconList = null;

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
   * App only
   *
   * @param {Boolean} allowPull Allow PullToRefresh
   * @returns {Boolean} True if the call suceeded
   */
  setPullToRefresh: function(allowPull) {
    return apiCall({
      app: {
        cmd: 0,
        params: [allowPull]
      }
    }).then(log.debug.bind(log), log.debug.bind(log));
  },
  allowRefreshScroll: () => chaynsApiInterface.setPullToRefresh(true),
  disallowRefreshScroll: () => chaynsApiInterface.setPullToRefresh(false),

  /**
   *
   * @param {Boolean} [showCursor] If true the waitCursor will be shown
   *                               otherwise it will be hidden
   * @returns {Boolean}
   */
  setWaitCursor: function(showCursor) {
    return apiCall({
      app: {
        cmd: 1,
        params: [showCursor]
      },
      web: {
        fnName: (showCursor ? 'show' : 'hide') + 'LoadingCursor'
      }
    }).then(log.debug.bind(log), log.debug.bind(log));
  },
  showWaitCursor: () => chaynsApiInterface.setWaitCursor(true),
  hideWaitCursor: () => chaynsApiInterface.setWaitCursor(false),

  /**
   * Select different Tapp identified by TappID or InternalTappName
   *
   * @param {String} tapp Tapp Name or Tapp ID
   * @param {String} param (optional) param URL Parameter (ExecCommand=param)
   * @returns {Boolean}
   */
  selectTapp: function(tapp, param) {

    if (!tapp) {
      return Promise.reject(new Error('Missing Tapp parameter'));
    }

    let cmd = 13; // selectTab with param ChaynsCall

    // update param: strip ? and ensure & at the begin
    if (param && !param.match(/^[&|\?]/)) { // no & and no ?
      param = '&' + param;
    } else if (param) {
      param = param.replace('?', '&');
    } else { // no params, different ChaynsCall
      cmd = 2;
    }
    let params = [`'${tapp}'`];
    if (cmd === 13) {
      params.push(`'${param}'`);
    }
    return apiCall({
      app: {
        cmd: cmd,
        params: params,
        support: { android: 2402, ios: 1383, wp: 2469 } // for native apps only
      },
      web: {
        fnName: 'selectOtherTab',
        params: {
          Tab: tapp,
          Parameter: param
        }
      }
    });
  },

  /**
   * Select Album
   * TODO(pascal/v2): get versions
   *
   * @param {id|string} id Album ID (Album Name will work as well, but do prefer IDs)
   * @returns {Boolean}
   */
  selectAlbum: function(id) {
    if (!isString(id) && !isNumber(id)) {
      return Promise.reject(new Error('Invalid album name'));
    }
    return apiCall({
      app: {
        cmd: 3,
        params: [`'${id}'`]
      },
      web: {
        fnName: 'selectAlbum',
        params: id
      }
    });
  },

  /**
   * Open Image
   * (old ShowPicture)
   * Android does not support gifs :(
   *
   * @param {string} url Image URL should contain jpg,png or gif
   * @returns {Boolean}
   */
  openImage: function(url) {
    if (!isString(url) || !url.match(/jpg$|png$|gif$/i)) { // TODO(pascal/uwe): more image types?
      return Promise.reject(new Error('Invalid image url'));
    }
    return apiCall({
      app: {
        cmd: 4,
        params: [`'${url}'`],
        support: { android: 2501, ios: 2636, wp: 2543 }
      },
      web: {
        fnName: 'showPicture',
        params: url
      }
    });
  },

  /**
   * Create a Caption Button.
   * Works only in native apps.
   * The caption button is the text at the top right of the app.
   * (mainly used for login or the username)
   * TODO(uwe): implement into Chayns Web? (not really possible)
   *
   * @param {String} text The Button's text
   * @param {Function} callback Callback Function when the caption button was clicked
   * @returns {Promise}
   */
  setCaptionButton: function(text, callbackFn) {
    if (!isFunction(callbackFn)) {
      callbackFn = Function.prototype;// TODO(pascal/uwe): ok or reject Promise?
    }
    return apiCall({
      app: {
        cmd: 5,
        params: [`'${text}'`, callbackName('captionButtonCallback')],
        support: { android: 1358, ios: 1366, wp: 2469 }
      },
      callbackName: 'captionButtonCallback',
      callbackFunction: callbackFn
    }).then(log.debug.bind(log), log.debug.bind(log));
  },

  /**
   * Hide a Caption Button.
   * Works only in native apps.
   * The caption button is the text at the top right of the app.
   * (mainly used for login or the username)
   *
   * @returns {Promise}
   */
  hideCaptionButton: function() {
    return apiCall({
      app: {
        cmd: 6,
        support: { android: 1358, ios: 1366, wp: 2469 }
      }
    });
  },

  /**
   * Facebook Connect with requesting permissions
   * NOTE: prefer `chayns.login()` over this method to perform a user login.
   *
   * @param {string} [permissions = 'user_friends'] Facebook Permissions, separated by comma
   * @param {string} [reloadParam = 'comment'] Reload Param
   * @returns {Promise}
   */
  // TODO(pascal/v2): test permissions
  facebookRequestPermissions: function(permissions = 'user_friends', reloadParam = 'comment') {
    reloadParam = reloadParam;
    return apiCall({
      app: {
        cmd: 7,
        params: [`'${permissions}'`, `'ExecCommand=${reloadParam}'`],
        support: { android: 1359, ios: 1366, wp: 2469 },
        fallbackFn: chaynsApiInterface.facebookConnect.bind(chaynsApiInterface)
      },
      web: {
        fnName: 'facebookConnect',
        params: {
          ReloadParameter: 'ExecCommand=' + reloadParam,
          Permissions: permissions
        }
      }
    });
  },

  /**
   * Facebook Connect
   * NOTE: prefer `chayns.login()` over this method to perform a user login.
   * This should be used if certain facebook permission are required
   *
   * @returns {Promise}
   */
  facebookConnect: function(reloadParam) {
    return apiCall({
      app: {
        cmd: 8
        //,support: { android: 1359, ios: 1366, wp: 2469 } // TODO(pascal/v2): test support
      },
      web: {
        fnName: 'facebookConnect',
        params: {
          ReloadParameter: 'ExecCommand=' + (reloadParam || '')
        }
      }
    });
  },

  /**
   * Open URL in Browser
   * App: opens browser window on the smartphone
   * ChaynsWeb: opens new Window/Tab
   *
   * @param {string} url URL
   * @returns {Boolean}
   */
  openUrlInBrowser: function(url) {
    return apiCall({
      app: {
        cmd: 9,
        params: [`'${url}'`],
        support: { android: 2405, ios: 2466, wp: 2543 }
      },
      web: {
        fn: function openPopup() {
          if (url.indexOf('://') === -1) {
            url = '//' + url; // or add location.protocol prefix and // TODO(pascal/uwe): parent.location.href due to popup blocker?
          }
          window.open(url, '_blank');
          return true;
        }
      }
    });
  },

  /**
   * Show BackButton.
   * and set it's callback function
   * @param {Function} callback Optional callback Function when the back button was clicked
   * @returns {Boolean}
   */
  showBackButton: function(callback) {

    if (!isFunction(callback)) {
      callback = function() {
        history.back();
        chaynsApiInterface.hideBackButton();
      };
    }

    return apiCall({
      app: {
        cmd: 10,
        params: [callbackName('backButtonCallback')],
        support: { android: 2405, ios: 2636, wp: 2469 }
      },
      callbackName: 'backButtonCallback',
      callbackFunction: callback
    });
  },

  /**
   * Hide BackButton.
   *
   * @returns {Boolean} False on error, true if call succeeded
   */
  hideBackButton: function() {
    return apiCall({
      app: {
        cmd: 11,
        support: { android: 2405, ios: 2636, wp: 2469 }
      }
    }).then(log.debug.bind(log), log.debug.bind(log));
  },


  /**
   * Open InterCom.
   * Works only in native apps.
   * TODO(pascal): remove since deprecated
   *
   * @returns {Boolean} False on error, true if call succeeded
   */
  openInterCom: function() {
    return Promise.reject(new Error('This function should not be used any longer'));
    //return apiCall({
    //  cmd: 12,
    //  support: { android: 2402, ios: 1383, wp: 2543 }
    //});
  },

  /**
   * Get Geolocation.
   * native apps only (but could work in web as well, navigator.geolocation)
   *
   * NOTE: continuousTracking was removed
   * TODO(pascal): does not work in iOS App
   *
   * @param {Function} callback Callback Function when the back button was clicked
   * @returns {Boolean}
   */
  getGeoLocation: function(callback) {

    if (!isFunction(callback)) {
      log.warn('no callback function');
      return Promise.reject(new Error('There is no callback function.'));
    }

    return apiCall({
      app: {
        cmd: 14,
        params: [callbackName('getGeoLocationCallback')],
        support: { android: 2501, ios: 2466, wp: 2469 }
      },
      web: {
        fn: function() {
          let deferred = defer();
          let geoCallback = function(geoposition) {
            let coords = geoposition.coords;
            if (!isFunction(callback)) {
              callback = deferred.resolve();
            } else {
              deferred.resolve();
            }
            callback([
              coords.latitude,
              coords.longitude,
              coords.accuracy
            ]);
          };
          navigator.geolocation.getCurrentPosition(geoCallback);
          return deferred.promise;
        }
      },
      callbackName: 'getGeoLocationCallback',
      callbackFunction: callback
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
    if (!isString(url) || !url.match(/.*\..{2,}/)) { // anyCharExceptNewLine . AnyCharExceptNewLine more than 2 times
      return Promise.reject(new Error('invalid url'));
    }
    return apiCall({
      app: {
        cmd: 15,
        params: [`'${url}'`]
      },
      web: {
        fnName: 'showVideo',
        params: url
      }
    });
  },

  /**
   * Show Dialog
   * @deprecated
   *
   * NOTE: chayns.dialogs
   * TODO(pascal): remove this method
   *
   * @param {Object} {content:{String} , headline: ,buttons:{Array}, noContentnPadding:, onLoad:}
   * @returns {boolean}
   */
  showDialog: function showDialog() {
    return Promise.reject(new Error('This function should not be used any longer'));
    //log.warn('method should not be used i assume');
    //if (!obj || !isObject(obj)) {
    //  return defer.reject(new Error('showDialog: invalid parameters'));
    //}
    //if (isString(obj.content)) {
    //  obj.content = trim(obj.content.replace(/<br[ /]*?>/g, '\n'));
    //}
    //if (!isArray(obj.buttons) || obj.buttons.length === 0) {
    //  obj.buttons = [(new PopupButton('OK')).toHTML()];
    //}
    //
    //let callbackName = 'ChaynsDialogCallBack()';
    //function callbackFn(buttons, id) {
    //  id = parseInt(id, 10) - 1;
    //  if (buttons[id]) {
    //    buttons[id].callback.call(null);
    //  }
    //}
    //
    //return apiCall({
    //  cmd: 16,
    //  params: [
    //    {'callback': callbackName},
    //    {'string': obj.headline},
    //    {'string': obj.content},
    //    {'string': obj.buttons[0].name}
    //    //{'string': obj.buttons[1].name},
    //    //{'string': obj.buttons[2].name}
    //  ],
    //  cb: callbackFn.bind(null, obj.buttons),
    //  support: {android: 2606},
    //  fallbackFn: function() {
    //    console.log('fallback popup', arguments);
    //  }
    //});
  },

/**
 * Formerly known as getAppInfos
 *
 * @param {Boolean} [forceReload True if cached data should be skipped]
 * @returns {Promise}
 */
  // This example uses a deferred and a callbackFunction to be able
  // to cache the data
  getGlobalData: function(forceReload) {
    if (!forceReload && globalData) {
      log.debug('getGlobalData: return cached data');
      return Promise.resolve(globalData);
    }
    let deferred = defer();
    apiCall({
      app: {
        cmd: 18,
        params: [callbackName('getAppInfos')]
      },
      web: {
        fnName: 'getAppInfos'
      },
      callbackName: 'getAppInfos',
      callbackFunction: function(data) {
        globalData = data;
        deferred.resolve(data);
        return 'test me';
      }
    })
      .catch(deferred.reject);
    return deferred.promise;
  },

  /**
   * Vibrate
   * @param {Integer} Duration time in milliseconds
   * @returns {Promise}
   */
  vibrate: function(duration) {
    if (!isNumber(duration) || duration < 2) {
      duration = 150;
    }
    return apiCall({
      app: {
        cmd: 19,
        params: [duration],
        support: {android: 2695, ios: 2596, wp: 2515}
      },
      web: {
        fn: function navigatorVibrate() {
          try {
            navigator.vibrate(100);
          } catch (e) {
            log.info('vibrate: the device does not support vibrate');
          }
        }
      }
    });
  },

  /**
   * Navigate Back.
   * Works only in native apps.
   *
   * @returns {Promise}
   */
  navigateBack: function() {
    return apiCall({
      app: {
        cmd: 20,
        support: {android: 2696, ios: 2600, wp: 2515}
      },
      web: {
        fn: function() {
          history.back();
        }
      }
    });
  },

  /**
   * Image Upload
   *
   * @returns {Promise}
   */
  // TODO(pascal): Fix Browser click
  uploadImage: function() {
    return apiCall({
      app: {
        cmd: 21,
        params: [callbackName('imageUploadCallback')], // callback param only on mobile
        support: {android: 2705, wp: 2538, ios: 2642}
      },
      web: {
        fn: function webUpload() {
          let deferred = defer();

          // create input file element
          let input = DOM.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('value', '');
          input.setAttribute('accept', 'image/*');
          //input.setAttribute('id', 'chayns-image-upload-field);
          input.setAttribute('onchange', 'imageChosen()');
          input.setAttribute('class', 'chayns__upload-image');
          DOM.query('#chayns-root').appendChild(input);
          setTimeout(function() {
            input = document.querySelector('input');
            input.click();
          }, 1000);

          // get form data
          var form = new FormData();
          form.append('file', input.files[0]);

          // define callback
          window.imageChosen = function() {
            window.fetch('//chayns1.tobit.com/TappApi/File/Image', {
              method: 'post',
              body: form
            })
              .then(function(response) {
                return deferred.resolve(response.text());
                // delete window.imageChosen
              })
              .catch(deferred.reject);
          };

          // trigger click event

          //document.querySelector('input').click();
          //var event = document.createEvent('MouseEvents');
          //event.initEvent('click', true, true);
          //event.synthetic = true;
          //input.dispatchEvent(event, true);

          return deferred.promise;
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
        }
      },
      callbackName: 'imageUploadCallback'
    });
  },

  /**
   * Set NFC Callback
   * TODO(pascal): test why RFID does not work on Android
   * @param {Function} callback Callback Function for NFC
   * @param {Boolean} isPersonData Callback Function for NFC
   * @returns {Boolean} True if the call succeeded or is async, false on error
   */
  setNfcCallback: function(callback, isPersonData) {
    // if there is no callback function, the NFC callbacks will be reset
    if (!isFunction(callback)) {
      chaynsApiInterface._setPersonDataCallback();
      chaynsApiInterface._setRFIDNFCCallback();
      return Promise.resolve();
    }
    if (isPersonData) {
      chaynsApiInterface._setPersonDataCallback(callback);
      chaynsApiInterface._setRFIDNFCCallback();
    } else {
      chaynsApiInterface._setPersonDataCallback();
      chaynsApiInterface._setRFIDNFCCallback(callback);
    }

    return Promise.resolve();
  },
  _setPersonDataCallback: (callback) =>
                            chaynsApiInterface._setNfcCallback(37, 'NfcCallbackPersonData', callback),
  _setRFIDNFCCallback: (callback) =>
                            chaynsApiInterface._setNfcCallback(38, 'NfcCallbackRfid', callback),
  _setNfcCallback: function(cmd, cbName, callback) {
    let params = ['null'];
    if (isFunction(callback)) {
      params = [callbackName(cbName)];
    }
    return apiCall({
      app: {
        cmd: cmd,
        params: params,
        support: { android: 3234, wp: 3121 }
      },
      callbackName: cbName,
      callbackFunction: callback
    });
  },

  /**
   * Video Player Controls
   * Acutally native only
   */
  player: {
    useDefaultUrl: function useDefaultUrl() {
      return apiCall({
        app: {
          cmd: 22,
          params: [0],
          support: {android: 2752, ios: 2644, wp: 2543}
        }
      });
    },
    changeUrl: function changeUrl(url) {
      return apiCall({
        app: {
          cmd: 22,
          params: [`'${url}'`],
          support: {android: 2752, ios: 2644, wp: 2543}
        }
      });
    },
    hideButton: function hideButton() {
      return apiCall({
        app: {
          cmd: 23,
          params: [0],
          support: {android: 2752, ios: 2644, wp: 2543}
        }
      });
    },
    showButton: function showButton() {
      return apiCall({
        app: {
          cmd: 23,
          params: [1],
          support: {android: 2752, ios: 2644, wp: 2543}
        }
      });
    },
    pause: function pauseVideo() {
      return apiCall({
        app: {
          cmd: 24,
          params: [0],
          support: {android: 2752, ios: 2644, wp: 2543}
        }
      });
    },
    play: function playVideo() {
      return apiCall({
        app: {
          cmd: 24,
          params: [1],
          support: {android: 2752, ios: 2644, wp: 2543}
        }
      });
    },
    playbackStatus: function playbackStatus() {
      return chaynsApiInterface
        .getGlobalData(true)
        .then(function(data) {
        return {
          AppControlVisible: data.AppInfo.PlaybackInfo.IsAppControlVisible,
          Status: data.AppInfo.PlaybackInfo.PlaybackStatus,
          Url: data.AppInfo.PlaybackInfo.StreamUrl
        };
      });
    }
  },

  /**
   * Bluetooth
   * Only in native Apps (ios and android)
   * TODO(pascal/georg/v3.1): add modern bluetooth chayns calls
   */
  bluetooth: {
    LESendStrength: {
      Adjacent: 0,
      Nearby: 1,
      Default: 2,
      Far: 3
    },
    scan: function LEScan(callback) {
      //if (!isFunction(callback)) {
      //  log.warn('LEScan: no valid callback');
      //  return Promise.reject(new Error(''));
      //}
      return apiCall({
        app: {
          cmd: 26,
          params: [callbackName('bleResponseCallback')],
          support: {android: 2771, ios: 2651}
        },
        callbackName: 'bleResponseCallback'
        //cb: callback,
      });
    },
    connect: function LEConnect(address, callback, password) {
      if (!isString(address) || !isBLEAddress(address)) {
        log.warn('LEConnect: no valid address parameter');
        return Promise.reject(new Error('Invalid bluetooth address'));
      }
      //if (!isFunction(callback)) {
      //  log.warn('LEConnect: no valid callback');
      //  return Promise.reject(new Error('Invalid bluetooth address'));;
      //}
      if (!isString(password) || !password.match(/^[0-9a-f]{6,12}$/i)) {
        password = '';
      }

      return apiCall({
        app: {
          cmd: 27,
          params: [`'${address}'`, `'${password}'`],
          support: {android: 2771, ios: 2651}
        },
        callbackFunction: callback,
        callbackName: 'bleResponseCallback'
      });
    },
    /**
     * TODO(pascal/unimportant): consider Object as parameter
     * @param {string} address
     * @param {Integer} subId
     * @param {Integer} measurePower
     * @param {Integer} sendStrength
     * @constructor
     */
    write: function LEWrite(address, subId, measurePower, sendStrength) {
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

      let uid = '7A07E17A-A188-416E-B7A0-5A3606513E57';

      return apiCall({
        app: {
          cmd: 28,
          params: [
            `'${address}'`,
            `'${uid}'`,
            subId,
            measurePower,
            sendStrength
          ],
          support: {android: 2771, ios: 2651}
        },
        callbackName: 'bleResponseCallback'
      });
    }
  },


  /**
   *
   * @param {String} name Appointment's name
   * @param {String} location Appointment's location
   * @param {String} [description] Appointment's description
   * @param {Date} start Appointments's StartDate
   * @param {Date} end Appointments's EndDate
   * @returns {Boolean}
   */
  // TODO(pascal/uwe): what are optional params? validate name and location?
  // TODO(pascal/uwe): maybe create .ical for web?
  saveAppointment: function saveAppointment(config) {
    let {name, location, description, start, end} = config;
    if (!isString(name) || !isString(location)) {
      log.warn('saveAppointment: no valid name and/or location');
      return Promise.reject(new Error('Invalid Name and/or Location'));
    }
    if (!isDate(start) || !isDate(end)) {
      log.warn('saveAppointment: start and/or endDate is no valid Date `Object`.');
      return Promise.reject(new Error('Start and/or End-Date is invalid'));
    }
    start = parseInt(start.getTime() / 1000, 10);
    end = parseInt(end.getTime() / 1000, 10);

    return apiCall({
      app: {
        cmd: 29,
        params: [
          `'${name}'`,
          `'${location}'`,
          `'${description}'`,
          start,
          end
        ],
        support: {android: 3054, ios: 3067, wp: 3030}
      }
    });
  },

  /**
   * Open URL in App
   * (old ShowURLInApp)
   * not to confuse with openUrlInBrowser
   *
   * @param {string} url
   * @returns {Promise}
   */
  openUrl: function openUrl(url, title) {
    if (!isString(url)) {
      log.error('openUrl: invalid url');
      return Promise.reject(new Error('Invalid URL'));
    }
    return apiCall({
      app: {
        cmd: 31,
        params: [`'${url}'`, `'${title}'`],
        support: {android: 3110, ios: 3074, wp: 3063},
        fallbackFn: function() {
          location.href = url;
        }
      },
      web: {
        fnName: 'overlay',
        params: {
          src: url
        }
      }
    });
  },

  /**
   * create QR Code
   * @param {String} data QR Code data
   * @param {Boolean} [preventDialog=undefined] True to not show a dialog
   * @returns {Boolean}
   */
  createQRCode: function createQRCode(data, preventDialog) {
    if (!isString(data)) {
      return Promise.reject(new Error('No data'));
    }
    return apiCall({
      app: {
        cmd: 33,
        params: [`'${data}'`, callbackName('createQRCodeCallback')],
        support: {android:  3220, ios: 1372, wp: 3106}
      },
      web: {
        fn: function createQrCode() {
          let url = '//qr.tobit.com/?SizeStrategy=FIXEDCODESIZE&width=250&value=' + data;
          if (preventDialog) {
            return Promise.resolve(url);
          }
          return window.chayns.dialog.html({
            title: 'QR Code',
            message: `<img src="${url}" style="width:100%" alt="qr code" />`,
            buttons: [
              {
                name: 'Schließen', // TODO(pascal): i18n
                value: 1
              }
            ]
          });
        }
      },
      callbackName: 'createQRCodeCallback'
    });
  },

  /**
   * scan QR Code
   * Scans QR Code and read it
   *
   * @param {Function} callback Function which receives the result
   * @returns {Promise}
   */
  scanQRCode: function scanQRCode() {
    return apiCall({
      app: {
        cmd: 34,
        params: [callbackName('scanQRCodeCallback')],
        support: {android:  3220, ios: 1372, wp: 3106}
      },
      callbackName: 'scanQRCodeCallback'
    });
  },

  /**
   * scan QR Code
   * Scans QR Code and read it
   *
   * @param {Boolean} forceReload Function which receives the result
   * @returns {Promise}
   */
  getLocationBeacons: function getLocationBeacons(forceReload) {
    //if (beaconList && !forceReload) { // TODO(pascal/v3.1): make sure it is good to cache the list
    //  log.debug('getLocationBeacons: there is already one beaconList');
    //  return defer.resolve(beaconList);
    //}
    //let callbackFn = function getLocationBeaconCallback(list) {
    //  beaconList = list;
    //  deferred.resolve(list);
    //};
    return apiCall({
      app: {
        cmd: 39,
        params: [callbackName('getBeaconsCallBack')],
        support: {android: 4045, ios: 4048}
      },
      callbackName: 'getBeaconsCallBack'
    });
  },

  /**
   * Add to Passbook
   * iOS only
   * TODO(pascal): consider removal since it only opens a URL on iOS
   *
   * @param {String} url Path to Passbook file
   * @returns {Boolean}
   */
  addToPassbook: function addToPassbook(url) {
    if (!isString(url)) {
      return Promise.reject(new Error('addToPassbook: url is invalid.'));
    }

    return apiCall({
      app: {
        cmd: 47,
        params: [`'${url}'`],
        support: {ios: 4045},
        fallbackFn: chaynsApiInterface.openUrlInBrowser.bind(null, url)
      },
      web: {
        fn: chaynsApiInterface.openUrlInBrowser.bind(null, url)
      }
    });
  },

  /**
   * Tobit Login
   * With FacebookConnect Fallback
   * TODO(pascal/lucas/timo): test and check support
   *
   * @param {String} params Reload Parameter
   * @returns {Boolean}
   */
  login: function login(params) {
    params = 'ExecCommand=' + params;
    return apiCall({
      app: {
        cmd: 54,
        params: [`'${params}'`],
        support: {ios: 4240, wp: 4099, android: 4670},
        fallbackFn: chaynsApiInterface.facebookConnect.bind(null, 'user_friends', params)
      },
      web: {
        fnName: 'tobitConnect',
        params: params
      }
    });
  },

  /**
   * Tobit Logout
   * TODO(pascal/development): find out app support
   *
   * @returns {Boolean}
   */
  logout: function logout() {
    return apiCall({
      app: {
        cmd: 56,
        support: {ios: 4240, wp: 4099, android: 4670}
      },
      web: {
        fnName: 'logout'
      }
    });
  }

};
