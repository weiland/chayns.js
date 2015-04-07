import {forEach} from '../utils';
export var accordion = (function(window, document) {
  var accordions;

  function init(selector) {
    accordions = document.querySelectorAll(selector || '.accordion .accordion__head');

    var i, l;
    for (i = 0, l = accordions.length; i < l; i++) {
      var accordion = accordions[i];
      accordion.addEventListener('click', handleClickEvent);
    }
  }

  function handleClickEvent(e) {
    var accordion = e.currentTarget.parentElement;
    toggleAccordion(accordion);
    e.preventDefault();
    e.stopPropagation();
  }

  function toggleAccordion(accordion) {
    var body = accordion.querySelector('.accordion__body');
    var classList = accordion.classList;
    if (!classList.contains('accordion--open')) {
      let groupId = accordion.dataset.group;
      if (groupId) {
        let elements = document.querySelectorAll(`.accordion[data-group="${groupId}"]`);
        if (elements && elements.length) {
          forEach(elements, function(i, element) {
            element.classList.remove('accordion--open');
            //closeAccordion(accordion.querySelector('.accordion__body'), accordion, accordion.classList);
          });
        }
      }
      openAccordion(body, accordion, classList);
    } else {
      closeAccordion(body, accordion, classList);
    }
    //classList.toggle('accordion--open'); // old simple toggle method
  }

  function openAccordion(body, accordion, classList) {
    trigger(accordion, 'open');
    function listener() {
      trigger(accordion, 'opened');
      body.removeEventListener('transitionend', listener);
    }
    body.addEventListener('transitionend', listener, false);
    classList.add('accordion--open');
  }

  function closeAccordion(body, accordion, classList) {
    trigger(accordion, 'close');
    function listener() {
      body.removeEventListener('transitionend', listener);
      trigger(accordion, 'closed');
    }
    body.addEventListener('transitionend', listener, false);
    classList.remove('accordion--open');
  }

  function trigger(element, eventName) {
    //var event = new CustomEvent(eventName); // CustomEvent constructor is not supported in IE
    var event = document.createEvent('CustomEvent');
    event.initEvent(eventName, false, true);
    return !element.dispatchEvent(event); // returns cancelled
  }

  function dispose() {
    accordions.forEach(function(listener) {
      listener.removeEventListener('click', handleClickEvent);
    });
  }

  return {
    init: init,
    dispose: dispose
  };
})(window, document);
