import {isArray, isPresent, isString, isObject} from './is';
import {DOM} from './dom';
import {getLogger} from './logger';

let log = getLogger('chayns.utils.language');

let langUrl = 'https://chayns-res.tobit.com/LangStrings/';
let projectName = 'Global';
let language = 'en';
let prefix = 'txt_';

let domScope = document.body;

let langMap = {};

// this is really sad :(
let langStringMap = {
  en: 'Eng',
  de: 'Ger',
  fr: 'Fra'
};

//let permittedLanguages = ['de', 'en', 'nl'];

/**
 * init
 * Update the parameter which also includes the language
 * @param {Object} config {projectName, language, prefix}
 */
function init(config) {
  if (!isObject(config)) {
    return Promise.reject(new Error('Invalid config object'));
  }
  projectName = config.projectName || projectName;
  language = config.language || language;
  prefix = config.prefix || prefix;
  return fetchStrings();
}

/**
 * Fetches the Textstrings for the current language
 * @returns {*}
 */
function fetchStrings() {
  var url = languagesEndpointUrl(language);
  return window.fetch(url, {mode: 'cors'})
    .then((response) => response.json())
    .then(storeLangStrings)
    .then(undefined, (e)=> log.error('error while receiving lang strings', e));
}

/**
 * Stores strings nested under the current language
 * @private
 * @param {Object} strings
 * @returns {*}
 */
function storeLangStrings(strings) {
  if (!isObject(strings)) {
    return;
  }
  Object.keys(strings).forEach(function(key) {
    let oldKey = key;
    key = key.replace(prefix + projectName + '_', '').replace(prefix, '');
    langMap[language] = langMap[language] || {};
    langMap[language][key] = (strings[oldKey] || '');
  });
  return strings;
}

/**
 * Build URL to the LangRes JSON files which should be created before
 * optional possible parameters: projectName and language
 */
function languagesEndpointUrl(lang) {
  return langUrl + projectName + '/' + projectName + 'LangRes_' + langStringMap[lang] + '.json';
}

/**
 *
 * @param {String} [attrName = 'lang'] e.g. <span data-lang='hello'><span>
 * @param {HTMLElement} [customScope = document.body]
 */
function translateDomStrings(attrName, customScope) {
  let nodes = DOM.querySelectorAll(customScope || domScope, `[data-${attrName || 'lang'}]`);
  let domElements = Array.prototype.slice.call(nodes);
  domElements.forEach(function(node) {
    let name = node.dataset['lang'];
    let value = resolveLangString(name, language);
    if (isPresent(value)) {
      node.textContent = value;
    }
  });
}

/**
 * Get Language String
 *
 * @param {String|Array<String>} strName Language String name(s)
 * @param {String} lang Language name
*/
function get(strName, lang) {
  lang = lang || language;
  if (isArray(strName)) {
    let strMap = {};
    strName.forEach((str) => {
      strMap[str] = resolveLangString(str, lang);
    });
    return strMap;
  } else if (isString(strName)) {
    return resolveLangString(strName, lang);
  } else {
    return langMap[lang];
  }
}

/**
 * Get matching language string
 *
 * @private
 * @param {String} str Language text string name
 * @param {String} [lang = 'en] Language name. English is the default language.
 */
function resolveLangString(str, lang) {
  return langMap[lang] ? langMap[lang][str] : '';
}

/**
 * @name utils.lang
 * @module utils
 *
 * Language and i18n
 * lang.init
 * lang.get
 *
 */
export var lang = {init, translateDomStrings, get};
