/**
 * Example:
 *  live('click', '.list li', );
 * @param {String} eventType Event Name e.g. 'click', 'change' etc
 * @param {String} elementQuerySelector Query selector String of the target element
 * @param {Function} callback Callback Function
 */
//export function live(eventType, elementQuerySelector, callback) {
//  document.addEventListener(eventType, function(event) {
//
//    var qs = document.querySelectorAll(elementQuerySelector);
//
//    if (qs) {
//      let eventTarget = event.target;
//      let index = -1;
//      while (eventTarget && ((index = Array.prototype.indexOf.call(qs, eventTarget)) === -1)) {
//        eventTarget = eventTarget.parentElement;
//      }
//
//      if (index > -1) {
//        callback.call(eventTarget, event);
//      }
//    }
//  });
//}

// TODO(pascal): move to delegate.js, refactor internal usage and remove this file
export function delegate(target, selector, type, handler) {
  function dispatchEvent(event) {
    var targetElement = event.target;
    var potentialElements = qsa(selector, target);
    var hasMatch = Array.prototype.indexOf.call(potentialElements, targetElement) >= 0;

    if (hasMatch) {
      handler.call(targetElement, event);
    }
  }

  var useCapture = type === 'blur' || type === 'focus';

  on(target, type, dispatchEvent, useCapture);
}

export function on(target, type, callback, useCapture) {
  target.addEventListener(type, callback, !!useCapture);
}

function qsa(selector, scope) {
  return (scope || document).querySelectorAll(selector);
}
