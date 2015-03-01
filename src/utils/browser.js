/**
 * This module contains the Browser APIs
 *
 */

var win = window;

var _global = typeof window === 'undefined' ? global : window;
export {_global as global};

export {win as window};
export var document = window.document;
export var location = window.location;
export var console = window.console; // NOTE: should not be used. use logger instead
export var gc = window.gc ? () => window.gc() : () => null;
