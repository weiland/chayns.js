import {Config} from '../chayns/config';
let localStorage = window.localStorage;
// TODO: write tests
// TODO: add keys, values, map methods
// TODO: consider cookie fallback? no
// TODO: import app name

let prefix = (Config.get('appName') || 'chayns_').replace(' ', '_') + '__';

export var ls = {};

ls.set = function(key, value) {
  if (!key || !value) {
    return;
  }
  localStorage[prefix + key] = JSON.stringify(value);
};

ls.get = function(key) {
  let value = localStorage[prefix + key];
  if (!value) {
    return;
  }
  return JSON.parse(value);
};

ls.remove = function(key) {
  if (!localStorage[prefix + key]) {
    return;
  }
  localStorage.removeItem(prefix + key);
};

/**
 * Removes entire localStorage
 */
ls.removeAll = function() {
  localStorage.clear();
};
