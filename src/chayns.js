/**
 * @name chayns API
 */

// helper
import {extend} from './utils';

// basic config
import {config} from './chayns/config';

// environment
import {environment} from './chayns/environment';

// (current) user
import {user} from './chayns/user';

// prepare function
import {ready, register, prepare} from './chayns/core';

import {chaynsCallsEnum, chaynsCalls, chaynsCall} from './chayns/chayns_calls';



export var chayns = {};

// TODO write extra extend method to simplify the extend below
extend(chayns, {VERSION: '0.1.0'});
extend(chayns, {config});

extend(chayns, {environment});
extend(chayns, {user});

extend(chayns, {register});
extend(chayns, {ready});

extend(chayns, {chaynsCalls: chaynsCalls});

// only for testing
extend(chayns, {chaynsCall});

// start chayns
prepare(chayns);
