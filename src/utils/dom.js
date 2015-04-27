// TODO(pascal): useful refactoring

import {isUndefined} from './is';

export class DOM {

  // NOTE: always returns an NodeList
  static $(selector) {
    return document.querySelectorAll.bind(document);
  }

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
    if(!element){
      return element;
    }
    return Array.prototype.slice.call(element.classList, 0);
  }
  static addClass(element, className) {
    if(element){
      element.classList.add(className);
    }
  }
  static removeClass(element, className) {
    if(element){
      element.classList.remove(className);
    }
  }
  static hasClass(element, className) {
    if(!element){
      return element;
    }
    return element.classList.contains(className);
  }

  // css
  static css(element, styleName, styleValue) {
    if(isUndefined(styleValue)) {
      return element.style[styleName];
    }
    element.style[styleName] = styleValue;
  }
  static setCSS(element, styleName, styleValue) {
    element.style[styleName] = styleValue;
  }
  static removeCSS(element, styleName) {
    element.style[styleName] = null;
  }
  static getCSS(element, styleName) {
    return element.style[styleName];
  }

  // nodes & elements
  static createElement(tagName, doc=document) {
    return doc.createElement(tagName);
  }

  static remove(el) {
    var parent = el.parentNode;
    parent.removeChild(el);
    return el;
  }

  static appendChild(el, node) {
    el.appendChild(node);
  }
  static removeChild(el, node) {
    el.removeChild(node);
  }

  static insertBefore(el, node) {
    el.parentNode.insertBefore(node, el);
  }

  static insertAfter(el, node) {
    el.parentNode.insertBefore(node, el.nextSibling);
  }

  static tagName(element) {
    return element.tagName;
  }

  // attributes
  static getAttribute(element, attribute) {
    return element.getAttribute(attribute);
  }
  static setAttribute(element, name, value) {
    element.setAttribute(name, value);
  }
  static removeAttribute(element, attribute) {
    if (!element) {
      return element;
    }
    return element.removeAttribute(attribute);
  }
}
