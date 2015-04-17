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
      web: {
        fnName: 'height',
        params: height
      }
    });
  },

  /**
   * Set fixed height
   *
   * Sets the height of the iframe
   *
   * TODO(pascal/development): does the name match?
   * @params [height = 500]
   * @returns {*}
   */
  setFixedHeight: function setFixedHeight(height) {
    return apiCall({
      web: {
        fnName: 'forceHeight',
        params: height
      }
    });
  },

  /**
   * Set full height
   *
   * Always sets full height of iframe and sends event to us
   * adds scroll and resize listener so use seldomly :(
   *
   * TODO(pascal/development): does the name match?
   * @returns {*}
   */
  setFullHeight: function setFullHeight() {
    return apiCall({
      web: {
        fnName: 'setIFrameFullHeight'
      }
    });
  },

  getWindowMetrics: function getWindowMetrics() {
    return apiCall({
      web: {
        fnName: 'getWindowMetrics',
        fn: function getHeight() {
          console.info('getHeight fallback');
        }
      },
      callbackName: 'getWindowMetrics'
    });
  }

};

