import {apiCall} from './chayns_calls';
import {getLogger, isObject, isArray, isNumber, isDate, isFunction, defer} from '../utils';
import {environment} from './environment';

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

/**
 * Dialogs - American notation
 */
export var dialogs = {

  alert: function alert(title, message) {
    return chaynsDialog({
      type: dialogType.ALERT,
      title: title || 'Alert Modal Dialog',
      message: message || '',
      buttons: [{
        type: buttonType.SUCCESS,
        title: 'OK'
      }]
    });
  },

  confirm: function confirm(title, message) {
    return chaynsDialog({
      type: dialogType.CONFIRM,
      title: title || 'Confirm Modal Dialog',
      message: message || '',
      buttons: [{
        type: buttonType.CANCEL,
        title: 'No'
      }, {
        type: buttonType.SUCCESS,
        title: 'Yes'
      }]
    });
  },

  select: function select(config) {
    if (!config || !isObject(config)) {
      return Promise.reject(new Error('Invalid Parameters'));
    }
    return chaynsSelectDialog({
      title: config.title || 'Select Modal Dialog',
      message: config.message || '',
      buttons: [ {
        title: 'Cancel',
        type: buttonType.CANCEL
      }, {
        title: 'Ok',
        type: buttonType.SUCCESS
      }],
      list: config.list || [],
      multiselect: config.multiselect, // enable multiple selection
      quickfind: config.quickfind  // allow quickfind
    });
  },

  facebook: function facebookSelect(config) {
    if (!config || !isObject(config)) {
      return Promise.reject(new Error('Invalid Parameters'));
    }
    return chaynsSelectDialog({
      title: config.title || 'Friends Select Modal Dialog',
      message: config.message || '',
      // TODO: right order of buttons, in app only the second is visible
      buttons: [{
        title: 'Cancel',
        type: buttonType.CANCEL
      },{
        title: 'Ok',
        type: buttonType.OK
      }],
      preSelected: config.preSelected,
      multiselect: config.multiselect, // enable multiple selection
      quickfind: config.quickfind,  // allow quickfind
      includeMyself: true,
      isFacebook: true
    });
  },

  /**
   *
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
   * TODO: reconsider order etc
   * @param {dateType|Number} dateType Enum 1-2: time, date, datetime. use chayns.dateType
   * @param {Number|Date} preSelect Preset the Date (e.g. current Date)
   * @param {Function} callback Function that receives the chosen Date as Timestamp
   * @param {Number|Date} minDate Minimum StartDate
   * @param {Number|Date} maxDate Maximum EndDate
   */
  date: function selectDate(options) {
    //let [ preSelect, callback, minDate, maxDate] = arguments;
    let {dateType, preSelect, minDate, maxDate} = options;

    //if (!isFunction(callback)) {
    //  log.warn('selectDate: callback is no `Function`.');
    //  return false;
    //}
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

    return apiCall({
      app: {
        cmd: 30,
        params: [
          `'window._chaynsCallbacks.${callbackName}'`,
          dateType,
          `'${preSelect + dateRange}'`
        ],
        support: {android: 3072, ios: 3062, wp: 3030}
      },
      web: {
        fnName: 'datepicker',
        params: [callbackName, dateType, preSelect]
      },
      callbackName: callbackName
    });
  },

  html: function html(config) {
    return new Promise(function(resolve, reject) {
      return fallbackDialog(config, resolve, reject);
    });
  },

  close: function close() {
    Dialog.hide();
    window._chaynsCallbacks.closeCb(arguments);
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
  // TODO: should only have one button?!
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
    Quickfind: config.quickfind || 0,
    Selection: config.multiselect || 0
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

  return apiCall({
    app: {
      cmd: isFacebook ? 51 : 50, // 50 is standard, 51 FB Dialog
      params: [
        `'window._chaynsCallbacks.${fnName}()'`,
        `'${JSON.stringify(setup)}'`,
        `'${JSON.stringify(list)}'`
      ],
      support: { android: 4651, ios: 4238 }, // new
      fallbackFn: fallbackDialog.bind(undefined, {title: config.title, message: config.message})
    },
    web: {
      fnName: fnName,
      params: [fnName, setup, list],
      fn: fallbackDialog.bind(undefined, {title: config.title, message: config.message})
    },
    callbackName: fnName
  });
}

function chaynsDialog(config) {

    let buttons = [
      {
        Text: config.buttons[0].title,
        Value: config.buttons[0].type
      }
    ];

    let fallbackButtons = [
      {
        name: config.buttons[0].title,
        value: config.buttons[0].type
      }
    ];

    let params = [
      `'window._chaynsCallbacks.multiselectdialog()'`,
      `'${config.title}'`,
      `'${config.message}'`,
      `'${config.buttons[0].title}'` // TODO: needs encodeURI?
    ];

    if (config.buttons[1]) {
      buttons.push({
        Text: config.buttons[1].title,
        Value: config.buttons[1].type
      });
      params.push({
        'string': config.buttons[1].title
      });
      fallbackButtons.push({
        name: config.buttons[1].title,
        value: config.buttons[1].type
      });
    }

    return apiCall({
      app: {
        cmd: 16, // 16 works also on older devices, but shows old dialog
        params: params,
        support: { android: 4649, ios: 4119, wp: 4076 },
        fallbackFn: fallbackDialog.bind(undefined, {title: config.title, message: config.message, buttons:fallbackButtons})
      },
      web: {
        fnName: 'multiselectdialog',
        params: ['multiselectdialog', {
          Headline: config.title,
          Text: config.message,
          Buttons: buttons
        }]
      },
      callbackName: 'multiselectdialog'
    });

}

function fallbackDialog(config) {
  log.info('fallback popup', arguments);
  let deferred = defer();
  // get window metrics
  let metrics;
  chayns
    .getWindowMetrics()
    .then(function onSuccess(data) {
      metrics = data;
    })
    .catch(function onError() {
      // we are not on chayns web desktop
    }).then(function always() {

      // create callbacks
      window._chaynsCallbacks.closeCb = deferred.resolve;
      window._chaynsCallbacks.closeCbError = deferred.reject; // is not used

      // create Dialog Object
      let dialog = new Dialog(config.title, config.message, config.buttons);
      dialog.render();
      dialog.show();

      // get the dialog's height
      let dialogHeight = dialog.contentBox().offsetHeight || 55;
      let viewportHeight = window.innerHeight; // the users browser's viewport

      //let documentHeight = window.outerHeight; // entire document
      log.debug('dialog height', dialogHeight);
      log.debug('window metrics', metrics);
      // adjust the top position
      let topPosition = viewportHeight / 2 - dialogHeight;
      // subtract the banner-height on desktop TODO(pascal): always 450?
      if (environment.isChaynsWebDesktop) {
        topPosition = topPosition - 450;
      }
      topPosition = topPosition > 50 ? topPosition : 50;
      dialog.contentBox().style.top = topPosition + 'px';
    });

  return deferred.promise;
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
  constructor(title, message, buttons, customChaynsRoot) {
    this.title = title || '';
    this.message = message || '';
    this.buttons = buttons || [{name:'Ok',value:1}];
    this.chaynsRoot = customChaynsRoot || document.getElementById('chayns-root');
  }

  getButtons() {
    var html = [];
    this.buttons.forEach(function(button) {
      html.push( `<button class="button button--dialog" onclick="chayns.dialog.close({name: '${button.name}', value: '${button.value}'});">${button.name}</button>` );
    });
    return html.join('');
  }

  show() {
    this.chaynsRoot.querySelector('.chayns__dialog').classList.add('chayns__dialog--visible');
  }

  contentBox() {
    return this.chaynsRoot.querySelector('.dialog__content');
  }

  render() {
    this.chaynsRoot.innerHTML = this.toHTML();
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

  /**
   * public static method hide()
   * TODO(pascal): remove element from DOM
   */
  static hide() {
    // TODO(pascal): support custom selector and multiple dialogs
    document.querySelector('.chayns__dialog').classList.remove('chayns__dialog--visible');
  }
}

