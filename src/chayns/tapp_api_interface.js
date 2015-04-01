/**
 * Tapp API Interface
 * API to communicate with the TappAPI
 */
/* gloabl fetch */

import {getLogger, isPresent, isObject, isArray, isDefined} from '../utils';
import {environment} from './environment';
//import {window} from '../utils/browser'; // due to window.open and location.href

let log = getLogger('tapp_api');

console.debug(environment, 'evn');

// TODO: force SSL?
let tappApiRoot = '//chayns1.tobit.com/TappApi/';
//let resultType = { // TODO: ResultEnum is not used, consider removing or adjusting the API
//  error: -1,
//  success: 0
//};

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
   *
   * @param obj
   * @returns {Promise}
   */
  getUser: function getUserBasicInfo(obj) {
    if (!obj || !isObject(obj)) {
      return Promise.reject(new Error('There was no parameter Object'));
    }
    let data = '';
    if (isPresent(obj.userId)) {
      data = 'UserID=' + obj.userId;
    }
    if (isPresent(obj.facebookId)) {
      data = 'FBID=' + obj.facebookId;
    }
    if (isPresent(obj.personId)) {
      data = 'PersonID=' + obj.personId;
    }
    if (isPresent(obj.accessToken)) {
      data = 'AccessToken=' + obj.accessToken;
    }
    return tappApi('User/BasicInfo?' + data).then(function(json) {
      if (isArray(json)) {
        return json.map((user) => parseUser(user));
      } else {
        return json;
      }
    });
  },

  /**
   * Get all users of a Location identified by siteId
   *
   *
   * @param [siteId = current siteId] Site Id
   * @returns {Promise}
   */
  getLocationUsers: function getLocationUsers(siteId) {
    if (!siteId) {
      siteId = environment.site.siteId;
    }
    let data = '?SiteID=' + siteId;
    return tappApi('User/GetAllLocationUsers' + data).then(function(json) {
      return json.map((user) => parseUser(user));
    });
  },

  /**
   * Get UAC Groups
   *
   * TODO: remove caching? yes, it does not really belong in here
   * TODO: Backend bug http://chayns1.tobit.com/TappApi/Tapp/GetUACGroups?SiteID= not empty
   * TODO: rename to getGroups? (using UAC only internally, there are no other groups either)
   * @param {Boolean} [updateCache=undefined] True to force to receive new UAC Groups
   * @returns {Promise} resolve with  UAC Groups Array otherwise reject with Error
   */
  getUacGroups: function getUacGroups(siteId, updateCache) {
    if (uacGroupsCache && !updateCache) {
      return Promise.resolve(uacGroupsCache);
    }
    siteId = siteId || environment.site.siteId;
    let data = 'SiteID=' + siteId;
    return tappApi('Tapp/GetUACGroups?' + data).then(function(json) {
      return json.map((group) => parseGroup(group));
    });
  },

  /**
   * TODO: use userId instead of the facebookId?
   * TODO: refactor name? cause Location and SiteId
   * @param userId Facebook UserId
   * @returns {Promise}
   */
  isUserAdminOfLocation: function isUserAdminOfLocation(userId) {
    if (!userId) {
      return Promise.reject(Error('No userId was supplied.'));
    }
    let data = '?SiteID=' + environment.site.siteId + '&FBID=' + userId;
    return tappApi('User/IsUserAdmin' + data).then(function(json) {
      return json;
    });
  },

  intercom: {

    /**
     * Send message as user to the entire page.
     *
     * @param message
     * @returns {Promise}
     */
    sendMessageToPage: function sendMessageAsUser(message) {
      return sendMessage({
        message: message,
        url: 'InterCom/Page'
      });
    },

    /**
     * Send Message as page to a user identified by Tobit UserId.
     *
     * @param message
     * @param userId
     * @returns {Promise}
     */
    sendMessageToUser: function sendMessageToUser(userId, message) {
      return sendMessage({
        message: message,
        userId: userId,
        url: 'InterCom/User'
      });
    },

    /**
     * Send message as page to a user identified by Facebook UserId.
     *
     * @param message
     * @param facebookId
     * @returns {Promise}
     */
    sendMessageToFacebookUser: function sendMessageToFacebookUser(facebookId, message) {
      return sendMessage({
        message: message,
        facebookId: facebookId,
        url: 'Tapp/SendIntercomMessageAsPage'
      });
    },

    /**
     * Send message as page to a UAC Group.
     *
     * @param groupId
     * @param {String} message
     * @returns {Promise}
     */
    sendMessageToGroup: function sendMessageToGroup(groupId, message) {
      return sendMessage({
        message: message,
        groupId: groupId,
        url: 'InterCom/group'
      });
    }
  }
};

/**
 * Send Intercom Message
 *
 * @private
 * @param obj
 * @returns {Promise}
 */
// TODO: refactor to JSON instead of www-form-urlencoded
function sendMessage(obj) {
  if (!isObject(obj) || !obj.message || !obj.url) {
    return Promise.reject(Error('Invalid parameters'));
  }
  console.debug(obj, environment,'asdf');
  obj.siteId = obj.siteId || environment.site.siteId;
  obj.accessToken = obj.accessToken || environment.user.accessToken;
  let map = {
    message: 'Message',
    accessToken: 'AccessToken',
    userId: 'UserId',
    facebookId: 'ToFBID',
    groupId: 'GroupID',
    siteId: 'SiteID'
  };
  let data = [];
  Object.keys(obj).forEach(function(key) {
    if (isDefined(obj[key]) && key !== 'url') {
      data.push(map[key] + '=' +  obj[key]);
    }
  });
  let config = {
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    //headers: {
    //  'Accept': 'application/json',
    //  'Content-Type': 'application/json'
    //},
    //credentials: 'cors',
    body: data.join('&')
    //body: data
  };
  let url = tappApiRoot + obj.url;
  if (obj.url === 'Tapp/SendIntercomMessageAsPage') {
    url += '?' + data.join('&');
    config = undefined; /*{
      credentials: 'cors'
    };*/
  }
  return fetch(url, config);
}

/**
 * Tapp API request
 *
 * TODO: use POST instead of GET
 * TODO: posting JSON with {credentials: 'cors'}
 * @private
 * @param endpoint
 * @returns {Promise} with json data
 */
function tappApi(endpoint) {
  let url = tappApiRoot + endpoint;
  return fetch(url)
    .then((res) => res.json())
    .then(function(json) {
      if (json.Value) {
        return json.Value;
      } else if (json.Data) {
        return json.Data;
      } else {
        return json;
      }
    })
    .then(function(obj) {
      if (obj.Error) {
        return Promise.reject(new Error(obj.Error));
      }
      return obj;
    });
}
