/**
 * Chayns Web Only
 **/

import {apiCall} from './chayns_calls';

export var chaynsWebInterface = {

  /**
   * Set the height to the iframe container

   * Sets height of the iframe and min-height of Navigation
   *
   * @params [height] Set custom height. Default is body's offsetHeight over scrolllHeight
   */
  setHeight: function setHeight(height) {
    return apiCall({
      webFn: 'height',
      webParams: height
    });
  },

  /**
   * Set fixed height
   *
   * Sets the height of the iframe
   *
   * TODO: does the name match?
   * @params [height = 500]
   * @returns {*}
   */
  setFixedHeight: function setFixedHeight(height) {
    return apiCall({
      webFn: 'forceHeight',
      webParams: height
    });
  },

  /**
   * Set full height
   *
   * Always sets full height of iframe and sends event to us
   * adds scroll and resize listener so use seldomly :(
   *
   * TODO: does the name match?
   * @returns {*}
   */
  setFullHeight: function setFullHeight() {
    return apiCall({
      webFn: 'setiframefullheight'
    });
  }

};

