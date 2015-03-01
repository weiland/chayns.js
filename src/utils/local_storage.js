import {window as win} from './browser';

let localStorage = win.localStorage;
// TODO: write tests
// TODO: add keys, values, map methods
// TODO: consider cookie fallback? no
export var ls = {};

ls.set = function(key, value) {
  if (!key || !value) {
    return;
  }
  localStorage[key] = JSON.stringify(value);
};

ls.get = function(key) {
  var value = localStorage[key];
  if (!value) {
    return;
  }
  return JSON.parse(value);
};

ls.remove = function(key) {
  if (!localStorage[key]) {
    return;
  }
  delete localStorage[key];
};

ls.removeAll = function() {
  for (var key in localStorage) {
    // TODO: hasOwnProperty
    ls.remove(key);
  }
};
