import {getLogger, isObject} from '../utils';
let log = getLogger('chayns.utils.is_permitted');

/**
 * @description
 * Determine whether the current user's OS and OS Version is higher
 * or equal to the passed reference `Object`.
 *
 * @param {Object} versions Versions `Object` with permitted OSs and their version.
 * @param {string} os OS Name as lowercase string.
 * @param {Integer} appVersion App Version Number as Integer  TODO: format RFC?
 * @returns {Boolean} True if the current OS & Version are defined in the versions `Object`
 */
export function isPermitted(versions, os, appVersion) {

  if (!versions || !isObject(versions)) {
    log.warn('no versions `Object` was passed');
    return false;
  }

  return versions[os] && appVersion >= versions[os];
}
