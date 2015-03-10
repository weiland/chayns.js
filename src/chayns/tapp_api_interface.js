/**
 * Tapp API Interface
 * API to communicate with the TappAPI
 */

import {getLogger, isPresent, isObject, isArray} from '../utils';
import {environment} from './environment';
//import {window} from '../utils/browser'; // due to window.open and location.href

let log = getLogger('tapp_api');

console.debug(environment, 'evn');

// TODO: force SSL?
let tappApiRoot = '//chayns1.tobit.com/TappApi/';
let resultType = {
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
    picture: 'https://graph.facebook.com/' + user.ID + '/picture',
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

let uacGroupsCache;

/**
 * @module TappAPIInterface
 * @type {Object}
 */
export var tappApiInterface = {
  getIntroText: function getIntroText() {
    throw new Error('deprecated');
  },

  /**
   * Get Info
   * User Basic Information
   * @param obj
   * @returns {Promise}
   */
  getUser: function getUserBasicInfo(obj) {
    if (!obj || !isObject(obj)) {
      throw new Error('There was no parameter Object');
    }
    let data = '';
    if (isPresent(obj.userId)) {
      data = 'UserID=' + obj.userId;
    }
    if (isPresent(obj.fbId)) {
      data = 'FBID=' + obj.fbId;
    }
    if (isPresent(obj.personId)) {
      data = 'PersonID=' + obj.personId;
    }
    if (isPresent(obj.accessToken)) {
      data = 'AccessToken=' + obj.accessToken;
    }
    return tappApi('User/BasicInfo?' + data).then(function(json) {
      if (isArray(json)) {
        return json.map( (user) => parseUser(user) );
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
    let data = '?SiteID=' + siteId;
    return tappApi('User/GetAllLocationUsers' + data).then(function(json) {
      return json.map( (user) => parseUser(user) );
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
      log.debug('returning cached UAC Groups');
      return uacGroupsCache;
    }
    if (!siteId) {
      siteId = environment.site.siteId;
      console.log(siteId);
    }
    let data = 'SiteID=' + siteId;
    return tappApi('Tapp/GetUACGroups?' + data).then(function(json) {
      return json.map( (group) => parseGroup(group) );
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
      log.error('No userId was supplied.');
      return false; // TODO: throw error?
    }
    let data = '?SiteID=' + environment.site.siteId + '&FBID=' + userId;
    return tappApi('User/IsUserAdmin' + data).then(function(json) {
      return json;
    });
  },

  intercom: {
    sendMessage: function(obj) {
      let data = {
        SiteID: obj.siteId,
        AccessToken: obj.accessToken,
        Message: obj.message
      };
      data[obj.name] = obj.value;
      fetch('InterCom/User', 1);//TODO: left of
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



/**
 * Tapp API request
 *
 * TODO: use POST instead of GET
 * @param endpoint
 * @returns {Promise} with json data
 */
function tappApi(endpoint) {
  let url = tappApiRoot + endpoint;
  return fetch(url, {credentials: 'cors'})
    .then( (res )=> res.json() )
    .then(function(json) {
      if (json.Value) {
        return json.Value;
      } else if (json.Data) {
        return json.Data;
      } else {
        return json;
      }
    });
}
