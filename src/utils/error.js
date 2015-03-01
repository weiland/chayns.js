/**
 * Error Handler Module
 */

// TODO: consider importing from './utils' only
import {window as win} from './browser';
import {getLogger} from './logger';

let log = getLogger('chayns.error');

win.addEventListener('error', function(err) {
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
  log.error(finalError);
});
