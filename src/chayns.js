/**
 * @name chayns API
 */
var chayns = (function() {

  'use strict';

  var james = require('./lib');

  var chayns = {};

  chayns.VERSION = '1.0.0';

  james.extend(chayns, {core:require('./core')});


  return chayns;

})();

module.exports = chayns;
