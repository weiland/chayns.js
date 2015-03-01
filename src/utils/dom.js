// inspired by Angular2's DOM

import {document} from './browser';

export class DOM {

  // selectors
  static query(selector) {
    return document.querySelector(selector);
  }
  static querySelector(el, selector) {
    return el.querySelector(selector);
  }
  static querySelectorAll(el, selector) {
    return el.querySelectorAll(selector);
  }
  static on(el, evt, listener) {
    el.addEventListener(evt, listener, false);
  }

  // nodes & elements
  static clone(node) {
    return node.cloneNode(true);
  }
  static hasProperty(element, name) {
    return name in element;
  }
  static getElementsByClassName(element, name) {
    return element.getElementsByClassName(name);
  }
  static getElementsByTagName(element, name) {
    return element.getElementsByTagName(name);
  }

  // input
  static getInnerHTML(el) {
    return el.innerHTML;
  }
  static getOuterHTML(el) {
    return el.outerHTML;
  }
  static setHTML(el, value) {
    el.innerHTML = value;
  }
  static getText(el) {
    return el.textContent;
  }
  static setText(el, value) {
    el.textContent = value;
  }

  // input value
  static getValue(el) {
    return el.value;
  }
  static setValue(el, value) {
    el.value = value;
  }

  // checkboxes
  static getChecked(el) {
    return el.checked;
  }
  static setChecked(el, value) {
    el.checked = value;
  }

  // class
  static classList(element) {
    return Array.prototype.slice.call(element.classList, 0);
  }
  static addClass(element, classname) {
    element.classList.add(classname);
  }
  static removeClass(element, classname) {
    element.classList.remove(classname);
  }
  static hasClass(element, classname) {
    return element.classList.contains(classname);
  }

  // css
  static setCSS(element, stylename, stylevalue) {
    element.style[stylename] = stylevalue;
  }
  static removeCSS(element, stylename) {
    element.style[stylename] = null;
  }
  static getCSS(element, stylename) {
    return element.style[stylename];
  }
}
