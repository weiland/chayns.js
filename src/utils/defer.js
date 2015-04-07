export var defer = function() {
  let deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

/**
 * Returns resolved Promise.
 * @param param
 * @returns {*}
 */
defer.resolve = function(param) {
  var dfd = defer();
  dfd.resolve(param);
  return dfd.promise;
};

/**
 * Returns rejected Promise.
 * @param param
 * @returns {*}
 */
defer.reject = function(param) {
  var dfd = defer();
  dfd.reject(param);
  return dfd.promise;
};
