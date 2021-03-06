/**
 * @name chayns API v3
 * @module chayns
 */

// helper
// TODO: either index.js, utils.js or just the single files
import * as utils               from './utils';
let extend = utils.extend;

// set logLevel to info
let logLevel = window.preChayns ? (window.preChayns.logLevel || 4) : 4;
utils.setLevel(logLevel); // TODO: don't set the level here, refactor name

// environment
import {environment}            from './chayns/environment';

// core functions
import {ready, register, setup} from './chayns/core';

// chayns communication (chayns calls, tapp api, chayns web)
import {chaynsApiInterface}     from './chayns/chayns_api_interface';
import {tappApiInterface}       from './chayns/tapp_api_interface';
import {chaynsWebInterface}     from './chayns/chayns_web_interface';
import {dialogs}                from './chayns/dialogs';

// public chayns object
export var chayns = {};

// TODO(pascal): use extend method only one time
extend(chayns, {getLogger: utils.getLogger}); // jshint ignore: line
extend(chayns, {'$': utils.DOM}); // jshint ignore: line
extend(chayns, {utils});
extend(chayns, {VERSION: '0.1.0'});

extend(chayns, {env: environment});

extend(chayns, {register});
extend(chayns, {ready});

// add all chaynsApiInterface methods directly to the `chayns` Object
extend(chayns, chaynsApiInterface);
extend(chayns, tappApiInterface);
extend(chayns, chaynsWebInterface);
extend(chayns, {dialog: dialogs});

// setup chayns
setup();

// chayns publish no UMD
global.chayns = chayns;
