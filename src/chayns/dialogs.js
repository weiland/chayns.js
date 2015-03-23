import {apiCall} from './chayns_calls';
import {getLogger, isObject, isArray} from '../utils';
//import {window, location} from '../utils/browser'; // due to window.open and location.href

//let log = getLogger('chayns_dialogs');

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

  date: function dateSelect() {

  },

  reset: function reset() {

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
      fallbackFn: function() {
        console.log('fallback popup', arguments);
      }
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
      fallbackFn: function() {
        console.log('fallback popup', arguments);
      }
    });
  };

  var promise = new Promise(thenable);

  return promise;
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
  constructor(name, callback) {
    this.name = name;
    this.callback = callback;
    //let el = DOM.createElement('div');
    //el.setAttribute('id', 'chayns-popup');
    //el.setAttribute('class', 'chayns__popup');
    //this.element = el;
  }
  /**
   * Get Popup Button name
   * @returns {name}
   */
  name() {
    return this.name;
  }

  /**
   * Callback
   */
  callback() {
    //let cb = this.callback;
    //let name = cb.name;
    //if (isFunction(cb)) {
    //  cb.call(null, name);
    //}
  }
  /**
   * @name toHTML
   * Returns HTML Node containing the PopupButton.
   * @returns {PopupButton.element|HTMLNode}
   */
  toHTML() {
    return this.element;
  }
}
