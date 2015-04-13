/**
 * This module contains the Browser APIs
 *
 */
// TODO(pascal): remove entirely
var win = window;

// using node global (mainly for testing, dependency management)
var _global = typeof window === 'undefined' ? global : window;
var _global = global;

var win  = window;
var document = window.document;
var location = window.location;
var navigator = window.navigator;
var chayns = window.chayns;
var chaynsCallbacks = window._chaynsCallbacks;
var chaynsRoot = document.getElementById('chayns-root');
var parent = window.parent;
var console = window.console; // NOTE: should not be used. use logger instead
var gc = window.gc ? () => window.gc() : () => null;

