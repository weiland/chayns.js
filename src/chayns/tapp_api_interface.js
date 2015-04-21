/**
 * Tapp API Interface
 * API to communicate with the TappAPI
 */
/* global fetch */

import {getLogger, isPresent, isObject, isArray, isDefined} from '../utils';
import {environment} from './environment';

let log = getLogger('tapp_api');

let tappApiRoot = '//chayns1.tobit.com/TappApi/';

let uacGroupsCache;

/**
 * @module TappAPIInterface
 * @type {Object}
 */
export var tappApiInterface = {

  /**
   * Get Info
   * User Basic Information
   *
   * @param obj
   * @returns {Promise}
   */
  getUser: function getUserBasicInfo(obj) {
    if (!obj || !isObject(obj)) {
      log.warn('Error while getting basic information');
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
   * TODO(pascal): remove caching? yes, it does not really belong in here
   * TODO(pascal): Backend bug http://chayns1.tobit.com/TappApi/Tapp/GetUACGroups?SiteID= not empty
   * TODO(pascal): rename to getGroups? (using UAC only internally, there are no other groups either)
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
   * TODO(pascal): use userId instead of the facebookId?
   * TODO(pascal): refactor name? cause Location and SiteId
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
// TODO(pascal/development): refactor to JSON instead of www-form-urlencoded
function sendMessage(obj) {
  if (!isObject(obj) || !obj.message || !obj.url) {
    return Promise.reject(Error('Invalid parameters'));
  }
  obj.siteId = obj.siteId || environment.site.siteId;
  obj.accessToken = obj.accessToken || environment.user.tobitAccessToken;
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
 * TODO(development): use POST instead of GET
 * TODO(pascal): posting JSON with {credentials: 'cors'}
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

// helper parser methods

/**
 * Parse received User Object to a readable and formative format
 * @param user
 */
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

/**
 * Parse received Group Object to a readable and formative format
 * @param user
 */
function parseGroup(group) {
  return {
    id: group.ID,
    name: group.Name,
    showName: group.ShowName
  };
}
