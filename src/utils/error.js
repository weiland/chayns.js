/**
 * Error Handler Module
 */

import {getLogger} from './logger';
import {Config} from '../chayns/config';

let log = getLogger('chayns.error');

window.addEventListener('error', function(err) {
  let lineAndColumnInfo =
    err.colno
      ? ' line:' + err.lineno + ', column:' + err.colno
      : ' line:' + err.lineno;

  let finalError = [
      'JavaScript Error',
      err.message,
      err.filename + lineAndColumnInfo + ' -> ' +  navigator.userAgent,
      0,
      true
  ];

  // TODO: add proper Error Handler
  log.debug(finalError);
  if (Config.get('preventErrors')) {
    err.preventDefault();
  }
  return false;
});
