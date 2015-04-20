//import Config from '../chayns/config';
let localStorage = window.localStorage;
// TODO: write tests
// TODO: add keys, values, map methods
// TODO: consider cookie fallback? no
// TODO: import app name
export var ls = {};

ls.set = function(key, value) {
  if (!key || !value) {
    return;
  }
  localStorage[key] = JSON.stringify(value);
};

ls.get = function(key) {
  let value = localStorage[key];
  if (!value) {
    return;
  }
  return JSON.parse(value);
};

ls.remove = function(key) {
  if (!localStorage[key]) {
    return;
  }
  localStorage.removeItem(key);
};

ls.removeAll = function() {
  localStorage.clear();
};
