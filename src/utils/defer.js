export var defer = function() {
  // TODO(pascal): test code below and verify it, no .defer() in polyfill
  //if (Promise.defer) {
  //  return Promise.defer;
  //}
  let deferred = {};
  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};
// TODO(pascal): better remove methods below since one should use Promise directly
///**
// * Returns resolved Promise.
// * @param param
// * @returns {*}
// */
//defer.resolve = function() {
//  return Promise.resolve(arguments);
//};
//
///**
// * Returns rejected Promise.
// * @param param
// * @returns {*}
// */
//defer.reject = function() {
//  return Promise.reject(arguments);
//};
