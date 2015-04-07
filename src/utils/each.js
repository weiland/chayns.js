//export var each = Function.prototype.call.bind([].forEach); // does not work and below is better
export var forEach = function(array, callback, scope) {
  for (var i = 0, l = array.length; i < l; i++) {
    callback.call(scope, i, array[i]);
  }
};
