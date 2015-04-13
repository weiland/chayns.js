import {isArray, isPresent, isString} from './is';
import {DOM} from './dom';

let domScope = document.body;
let domElements = [];

/**
 * @name utils.lang
 * @module utils
 *
 * Language and i18n
 * lang.init
 * lang.get
 *
 * @type {{init: Function, get: Function}}
 */
export var lang = {


  /**
   *
   * @param {String} [attrName = 'lang'] e.g. <span data-lang='hello'><span>
   * @param {HTMLElement} [customScope = document.body]
   */
  domLookup(attrName, customScope) {
    let nodes = DOM.querySelectorAll(customScope || domScope, `[data-${attrName || 'lang'}]`);
    domElements = Array.prototype.slice(nodes);
    lang.translateDomString();
  },

  translateDomStrings() {
    domElements.forEach(function(node) {
      let name = node.dataset['lang'];
      let value = resolveLangString(name);
      if (isPresent(value)) {
        node.textContent = value;
      }
    });
  },

  /**
   * Get Language String
   *
   * @param {String|Array<String>} strName Language String name(s)
   * @param {String} lang Language name
  */
  get(strName, lang) {
    if (isArray(strName)) {
      return strName.map((str) => resolveLangString(str, lang));
    } else if (isString(strName)) {
      return resolveLangString(strName, lang);
    }
  }
};

// TODO(pascal): Access via LangRes API
let langMap = {
  de: {
    hello: 'Hallo'
  },
  en: {
    hello: 'Hello'
  }
};

/**
 * Get matching language string
 *
 * @private
 * @param {String} str Language text string name
 * @param {String} [lang = 'en] Language name. English is the default language.
 */
function resolveLangString(str, lang = 'en') {
  return langMap[lang][str];
}
