/**
 * @name chayns API
 */

// helper
import {extend, getLogger} from './utils';

// basic config
import {config} from './chayns/config';

// environment
import {environment} from './chayns/environment';

// (current) user
import {user} from './chayns/user';

// prepare function
import {ready, register, setup} from './chayns/core';

import {chaynsCall} from './chayns/chayns_calls';

import {chaynsCallsInterface} from './chayns/chayns_calls_interface';


export var chayns = {};

function extendChayns(value) {
  extend(chayns, value);
}

extend(chayns, {getLogger});
// TODO write extra extend method to simplify the extend below
extend(chayns, {VERSION: '0.1.0'});
extendChayns({config});

extend(chayns, {environment});
extend(chayns, {user});

extend(chayns, {register});
extend(chayns, {ready});

// TODO: should be hidden
extend(chayns, {chaynsCall});

// add all chayns calls directly to the `chayns` Object
extend(chayns, chaynsCallsInterface);

// setup chayns
setup(chayns);
