/**
 * Tapp API Interface
 * API to communicate with the TappAPI
 */

import {getLogger} from '../utils';
import {window} from '../utils/browser'; // due to window.open and location.href

let log = getLogger('tapp_api');

export var tappApiInterface = {
  getIntroText: function getIntroText() {

  },

  getLocationUsers: function getLocationUsers() {

  },

  getUacGroups: function getUacGroups() {

  },

  isUserAdminOfLocation: function isUserAdminOfLocation() {

  },

  intercom: {
    sendMessage: function() {

    },

    sendMessageAsUser: function sendMessageAsUser() {

    },

    sendMessageToUser: function sendMessageToUser() {

    },

    sendMessageToChaynsUser: function sendMessageToChaynsUser() {

    },

    sendMessageToGroup: function sendMessageToGroup() {

    }
  }
};
