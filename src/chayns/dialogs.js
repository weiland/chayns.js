import {apiCall} from './chayns_calls';
import {getLogger, isObject, isArray, isNumber, isDate, isFunction} from '../utils';
import {chaynsRoot} from '../utils/browser';
//import {window, location} from '../utils/browser'; // due to window.open and location.href

let log = getLogger('chayns_dialogs');

let buttonType = {
  SUCCESS: 1,
  OK: 1,
  ERROR: 2,
  CANCEL: 2
};
let dialogType = {
  ALERT: 0,
  CONFIRM: 1,
  SELECT: 2,
  FACEBOOK: 3,
  DATE: 4
};

// Boolean, true if a dialog is opened
let openDialog = false;

/**
 * Dialogs - American notation
 */
export var dialogs = {

  alert: function alert(title) {
    return chaynsDialog({
      type: dialogType.ALERT,
      title: title || 'Alert Modal Dialog',
      message: 'My <i>message</i>',
      buttons: [{
        type: buttonType.SUCCESS,
        title: 'OK'
      }]
    });
  },

  confirm: function confirm(title) {
    return chaynsDialog({
      type: dialogType.CONFIRM,
      title: title || 'Confirm Modal Dialog',
      message: 'My <i>confirm</i>',
      buttons: [{
        type: buttonType.SUCCESS,
        title: 'YES'
      }, {
        type: buttonType.CANCEL,
        title: 'NO'
      }]
    });
  },

  select: function select(config) {
    if (!config || !isObject(config)) {
      return Promise.reject(new Error('Invalid Parameters'));
    }
    return chaynsSelectDialog({
      title: config.title || 'Select Modal Dialog',
      message: 'My <i>select</i>',
      buttons: [{
        title: 'Confirm',
        type: buttonType.SUCCESS
      }, {
        title: 'Cancel',
        type: buttonType.CANCEL
      }],
      list: config.list || [],
      selection: config.multiselect || 1, // enable multiple selection
      quickfind: config.quickfind || 1  // allow quickfind
    });
  },

  facebook: function facebookSelect(config) {
    if (!config || !isObject(config)) {
      return Promise.reject(new Error('Invalid Parameters'));
    }
    return chaynsSelectDialog({
      title: config.title || 'Friends Select Modal Dialog',
      message: 'My <i>friends</i>',
      // TODO: right order of buttons, in app only the second is visible
      buttons: [{
        title: 'Ok',
        type: buttonType.OK
      }, {
        title: 'Cancel',
        type: buttonType.CANCEL
      }],
      preSelected: config.preSelected,
      multiselect: config.multiselect || 1, // enable multiple selection
      quickfind: config.quickfind || 1,  // allow quickfind
      includeMyself: true,
      isFacebook: true
    });
  },


  /**
   * Select Date
   * Old: DateSelect
   * Native Apps only. TODO: also in Chayns Web? HTML5 Datepicker etc
   * TODO: reconsider order etc
   * @param {dateType|Number} dateType Enum 1-2: time, date, datetime. use chayns.dateType
   * @param {Number|Date} preSelect Preset the Date (e.g. current Date)
   * @param {Function} callback Function that receives the chosen Date as Timestamp
   * @param {Number|Date} minDate Minimum StartDate
   * @param {Number|Date} maxDate Maximum EndDate
   */
  date: function selectDate() {
    let [ preSelect, callback, minDate, maxDate] = arguments;
    //let {dateType, preSelect, callback, minDate, maxDate} = arguments;

    if (!isFunction(callback)) {
      log.warn('selectDate: callback is no `Function`.');
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

    let dateRange = '';
    if (minDate > -1 && maxDate > -1) {
      dateRange = ',' + minDate + ',' + maxDate;
    }

    let callbackName = 'selectDateCallback';
    function callbackFn(callback, preSelect, time) {
      // TODO: important validate Date
      // TODO: choose right date by dateTypeEnum
      log.debug(preSelect);
      callback.call(null, time ? new Date(time) : -1);
    }

    return apiCall({
      cmd: 30,
      params: [
        {'callback': callbackName},
        {'Integer': 1},
        {'Integer': preSelect + dateRange}
      ],
      webFn: 'datepicker',
      webParams: ['datepicker', preSelect],
      cb: callbackFn.bind(null, callback, preSelect),
      callbackName: callbackName,
      support: {android: 3072, ios: 3062, wp: 3030}
    });
  },

  html: function html(config) {
    var promise = new Promise(function(resolve, reject) {
      return fallbackDialog(config, resolve, reject);
    });
    return promise;
  },

  close: function close() {
    document.querySelector('.chayns__dialog').style.display = 'none';
    window._chaynsCallbacks.closeCb.apply(window._chaynsCallbacks, arguments);
  },

  reset: function reset() {
    document.querySelector('.chayns__dialog').style.display = 'none';
    window._chaynsCallbacks.closeCbError.apply(window._chaynsCallbacks, arguments);
  }

};


// TODO: strip or encode quotes and html which can be contained in text and desc
// TODO: implement fallback
// TODO: combine both methods
// The dialogs should always work in Chayns Web and for the newer iOS & Android Apps
// In old Android Apps the HTML fallback will be shown instead of old dialogs
function chaynsSelectDialog(config) {

  let {isFacebook} = config;
  let buttons = [
    {
      Text: config.buttons[0].title,
      Value: config.buttons[0].type
    }
  ];

  if (config.buttons[1]) {
    buttons.push({
      Text: config.buttons[1].title,
      Value: config.buttons[1].type
    });
  }

  let setup = {
    Headline: config.title,
    Text: config.message,
    Buttons: buttons,
    Quickfind: config.quickselect,
    Selection: config.multiselect
  };
  if ('includeMyself' in config) { // Facebook Dialog only
    setup.DisplayMe = config.includeMyself;
  }

  let list = '';
  if (isArray(config.list) && config.list.length > 0) {
    list = [];
    config.list.forEach(function(item) {
      list.push({
        Text: item.name,
        Value: item.value,
        Preselect: !!item.isSelected,
        Image: item.image
      });
    });
  }
  if (isArray(config.preSelected)) {
    list = config.preSelected;
  }

  let fnName = isFacebook ? 'selectfacebookfriends' : 'multiselectdialog';
  var thenable = function(resolve, reject) {

    return apiCall({
      cmd: isFacebook ? 51 : 50, // 50 is standard, 51 FB Dialog
      params: [
        {'callback': fnName + '()'},
        {'string': JSON.stringify(setup)},
        {'string': JSON.stringify(list)}
      ],
      cb: resolve,
      onError: reject,
      webFn: fnName,
      webParams: [fnName, setup, list],
      support: { android: 4651, ios: 4238 }, // new
      fallbackFn: fallbackDialog.bind(undefined, {title: config.title, message: config.message}, resolve)
    });
  };

  var promise = new Promise(thenable);

  return promise;
}

function chaynsDialog(config) {


  var thenable = function(resolve, reject) {

    let buttons = [
      {
        Text: config.buttons[0].title,
        Value: config.buttons[0].type
      }
    ];

    let params = [
      {'callback': 'multiselectdialog'},
      {'string': config.title},
      {'string': config.message},
      {'string': config.buttons[0].title} // TODO: needs encodeURI?
    ];

    if (config.buttons[1]) {
      buttons.push({
        Text: config.buttons[1].title,
        Value: config.buttons[1].type
      });
      params.push({
        'string': config.buttons[1].title
      });
    }

    return apiCall({
      cmd: 16, // 16 works also on older devices, but shows old dialog
      params: params,
      cb: resolve,
      onError: reject,
      webFn: 'multiselectdialog',
      webParams: ['multiselectdialog', {
        Headline: config.title,
        Text: config.message,
        Buttons: buttons
      }],
      support: { android: 4649, ios: 4119, wp: 4076 },
      // support: {android: 2606}, // old dialog
      fallbackFn: fallbackDialog.bind(undefined, {title: config.title, message: config.message}, resolve)
      //fallbackFn: resolve
    });
  };

  var promise = new Promise(thenable);

  return promise;
}

function fallbackDialog(config, resolve, reject) {
  log.info('fallback popup', arguments);

  // create callbacks
  window._chaynsCallbacks.closeCb = resolve;
  window._chaynsCallbacks.closeCbError = reject; // is not used

  // create Dialog Object
  let dialog = new Dialog(config.title, config.message, config.buttons);
  let chaynsRoot = document.getElementById('chayns-root');
  chaynsRoot.innerHTML = dialog.toHTML(); // assing the Dialog's HTML to the chayns-root
  // show the dialog
  chaynsRoot.querySelector('.chayns__dialog').style.display = 'block';
  chaynsRoot.querySelector('.chayns__dialog').style.opacity = '1';
  // get the dialog's height
  let height = chaynsRoot.querySelector('.dialog__content').offsetHeight || 55;
  log.debug('height', height);
  // adjust the top position
  chaynsRoot.querySelector('.dialog__content').style.top = window.innerHeight / 2 - height + 'px';

}

// Chayns Dialog HTML setup
/**
 * Modal Dialog
 * @class PopupButton
 */
class Dialog {
  /**
   * Dialog Constructor
   * @param {String} name Popup Button name
   */
  constructor(title, message, buttons) {
    this.title = title || '';
    this.message = message || '';
    this.buttons = buttons || [{name:'OK',value:1}];
  }

  getButtons() {
    var html = [];
    this.buttons.forEach(function(button) {
      html.push( `<button class="button button--dialog" onclick="chayns.dialog.close({name: '${button.name}', value: '${button.value}'});">${button.name}</button>` );
    });
    return html.join('');
  }

  toHTML() {
    return `<div class="chayns__dialog">
  <div class="dialog__background"></div>
  <div class="dialog__content">
    <div class="dialog__box">
      <div class="dialog__headline"><h1 class="headline">${this.title}</h1></div>
      <div class="dialog__body">${this.message}</div>
      <div class="dialog__buttons">
        ${this.getButtons()}
      </div>
   </div>
  </div>`;
  }
}

