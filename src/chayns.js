/**
 * @name chayns API
 * @module chayns
 */

// helper
// TODO: either index.js, utils.js or just the single files
import * as utils               from './utils';
var extend = utils.extend;

// set logLevel to info
utils.setLevel(4); // TODO: don't set the level here

// basic config
import {config}                 from './chayns/config';

// environment
import {environment}            from './chayns/environment';

// (current) user
import {user}                   from './chayns/user';

import './lib/fetch_polyfill';

// core functions
import {ready, register, setup} from './chayns/core';

// chayns calls

import {apiCall}                from './chayns/chayns_calls';

import {chaynsApiInterface}     from './chayns/chayns_api_interface';


// public chayns object
export var chayns = {};

extend(chayns, {getLogger: utils.getLogger}); // jshint ignore: line
extend(chayns, {utils});
extend(chayns, {VERSION: '0.1.0'});
//extend(chayns, {config}); // TODO: the config `Object` should not be exposed

extend(chayns, {env: environment}); // TODO: generally rename
extend(chayns, {user});

extend(chayns, {register});
extend(chayns, {ready});

extend(chayns, {apiCall});

// add all chaynsApiInterface methods directly to the `chayns` Object
extend(chayns, chaynsApiInterface);

// setup chayns
setup();


// chayns publish no UMD
//window.chayns = chayns;
