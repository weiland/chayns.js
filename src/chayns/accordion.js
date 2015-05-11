import {forEach, delegate} from '../utils';
export var accordion = (function(window, document) {

  let clickTriggers = [
    '.accordion .accordion__head',
    '.accordion .accordion__head .arrow',
    '.accordion .accordion__head .accordion--trigger',
    '.accordion .accordion__head .ellipsis' // since we need that for mobile
  ];

  function init(selector) {
    selector = selector || clickTriggers.join(', ');
    delegate(document, selector, 'click',  handleClickEvent);
  }

  function handleClickEvent(e) {
    let target = e.target; // `e` is equal to `this`
    if (target.classList.contains('arrow')) { // also include the arrow as a trigger
      target = target.parentElement.parentElement; // .arrow is in .right
    } else if(target.classList.contains('accordion--trigger')) { //also include elements with .accordion--trigger
      target = target.parentElement;
    }
    let accordion = target.parentElement;
    toggleAccordion(accordion, target);
    e.preventDefault();
    e.stopPropagation();
  }

  function toggleAccordion(accordion, target) {
    var body = accordion.querySelector('.accordion__body');
    var classList = accordion.classList;
    // skip choosebutton and box fields
    if (target.classList.contains('choosebutton') || target.classList.contains('box')) {
      return;
    }
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
    if (classList.contains('accordion--fixed')) {
      //log.debug('Accordion is fixed');
      return;
    }
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


  return {
    init: init
  };
})(window, document);
