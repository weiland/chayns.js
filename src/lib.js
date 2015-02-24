/**
 * @name james
 * @module james
 *
 * @description
 * # james - tobit helper library
 * Helper library supporting the Chayns API
 */

var james = (function() {

  /**
   * @name james.isObject
   *
   * @description
   * Determine if a reference is an `Object`.
   * null is not treated as an object.
   * In JS arrays are objects
   *
   * @param obj
   * @returns {boolean} True if `value` is an `Object`.
   */
  function isObject(value) {
    return value !== null && typeof value === 'object';
  }

  /**
   * @name james.isArray
   *
   * @description
   * Determines if a reference is an `Array`.
   *
   * @param {*} value Reference to check.
   * @returns {boolean} True if `value` is an `Array`.
   */
  var isArray = Array.isArray;

  /**
   * @name james.extend
   *
   * @description
   * Extends the destination object by copying properties from the src object.
   *
   * @param obj
   * @returns {*}
   */
  function extend(obj) {
    if (!isObject(obj)) {
      return obj;
    }
    var source, prop;
    for (var i = 1, length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        obj[prop] = source[prop];
      }
    }
    return obj;
  }

  // publish public API
  return {
    isObject: isObject,
    isArray: isArray,
    extend: extend
  };
})();


module.exports = james;
