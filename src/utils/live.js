/**
 * Example:
 *  live('click', '.list li', );
 * @param {String} eventType Event Name e.g. 'click', 'change' etc
 * @param {String} elementQuerySelector Query selector String of the target element
 * @param {Function} callback Callback Function
 */
// TODO: performance improvements?
export function live(eventType, elementQuerySelector, callback) {
  document.addEventListener(eventType, function(event) {

    var qs = document.querySelectorAll(elementQuerySelector);

    if (qs) {
      let eventTarget = event.target;
      let index = -1;
      while (eventTarget && ((index = Array.prototype.indexOf.call(qs, eventTarget)) === -1)) {
        eventTarget = eventTarget.parentElement;
      }

      if (index > -1) {
        callback.call(eventTarget, event);
      }
    }
  });
}
