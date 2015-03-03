import {chaynsCalls, apiCall} from './chayns_calls';

/**
 * All public chayns methods to interact with *Chayns App* or *Chayns Web*
 * @type {{showWaitcursor: Function, hideWaitcursor: Function}}
 */
  // TODO: rename, since this also invokes Chayns Web Functions
export var chaynsApiInterface = {

  getAppInfos: function() {
    return apiCall(chaynsCalls.getGlobalData);
  },

  showWaitcursor: function() {
    chaynsCalls.setWaitcursor(true);
  },
  hideWaitcursor: function() {
    chaynsCalls.setWaitcursor(false);
  }
};
