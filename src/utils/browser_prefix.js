import {document} from './browser';

/**
 * @description
 * Add the matching browser prefix to a css Property
 * @param propName
 * @returns {*}
 */
export function getBrowserPrefix(propName) {

  var prefixes = ['Moz','Webkit','ms']; // also O and Khtml

  for (var len = prefixes.length; len--; ) {
    if (( prefixes[len] + 'Transform' ) in document.body.style) {
      return '-' + prefixes[len].toLowerCase() + '-' + propName;
    }
  }

  return propName;
}
