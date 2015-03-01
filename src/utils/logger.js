
export var levels = {
  none: 0,
  error:1,
  warn:2,
  info:3,
  debug:4
};

let loggers = {};
let logger = window.console;
//let slice = Array.prototype.slice; // TODO: remove
let logLevel = levels.none;

function log(level, args){
  logger[level || 'log'].apply(console, args);
}

export function setLevel(level) {
  logLevel = level;
}

export function getLogger(name) {
  return loggers[name] || (loggers[name] = new Logger(name));
}

export class Logger {
  constructor(name) {
    this.name = '[' + name + ']: ';
  }

  /**
   * Logs a debug message.
   *
   * @method debug
   * @param {string} message The message to log
   */
  debug() {
    if (logLevel < 4) {
      return;
    }
    log('debug', arguments);
  }

  /**
   * Logs info.
   *
   * @method info
   * @param {string} message The message to log
   */
  info() {
    if (logLevel < 3) {
      return;
    }
    log('info', arguments);
  }


  /**
   * Logs a warning.
   *
   * @method warn
   * @param {string} message The message to log
   */
  warn() {
    if (logLevel < 2) {
      return;
    }

    log('warn', arguments);
  }

  /**
   * Logs an error.
   *
   * @method error
   * @param {string} message The message to log
   */
  error() {
    if (logLevel < 1) {
      return;
    }
    log('error', arguments);
  }
}
