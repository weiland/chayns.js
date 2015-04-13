/**
 * @description
 * Add the matching browser prefix to a CSS property
 * @param propName
 * @returns {*}
 */
export function getBrowserPrefix(propName) {

  var prefixes = ['Moz','Webkit','ms']; // also possible: O and Khtml

  for (var len = prefixes.length; len--;) {
    if ((prefixes[len] + 'Transform') in document.body.style) {
      return '-' + prefixes[len].toLowerCase() + '-' + propName;
    }
  }

  return propName;
}
