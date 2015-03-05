/**
 * This module contains the Browser APIs
 *
 */
// TODO: move out of utils
var win = window;

// using node global (mainly for testing, dependency management)
var _global = typeof window === 'undefined' ? global : window;
export {_global as global};

export {win as window};
export var document = window.document;
export var location = window.location;
export var navigator = window.navigator;
export var chayns = window.chayns;
export var chaynsCallbacks = window._chaynsCallbacks;
export var chaynsRoot = document.getElementById('chayns-root');
export var parent = window.parent;
export var console = window.console; // NOTE: should not be used. use logger instead
export var gc = window.gc ? () => window.gc() : () => null;

