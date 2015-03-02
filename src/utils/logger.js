/**
 * LogLevel Enum
 * none is 0
 * debug is 4
 * @type Enum
 */
export var levels = {
  none: 0,
  error:1,
  warn:2,
  info:3,
  debug:4
};

/**
 * Can store multiple loggers
 * @type {`Object`} loggers
 */
let loggers = {};

/**
 * @description
 * Assign the logger method.
 * By default the window.console `Object`
 * @type `window.console`
 */
let logger = window.console;

/**
 * Set the current log Level
 * use `setLevel(newLogLevel)` to overwrite this value.
 * TODO: each logger gets an own logLevel
 */
let logLevel = levels.none;

/**
 *
 * @param level
 * @param args
 * @private
 */
function log(level, args){
  logger[level || 'log'].apply(console, args);
}

/**
 * Set the current logLevel
 * in order to show or not show logs
 * @param level
 */
export function setLevel(level) {
  logLevel = level;
}

/**
 * Get Logger Singleton Instance
 * @param  {string} name The Logger's name
 * @returns {Logger} Logger instance, either existing one or creates a new one
 */
export function getLogger(name) {
  return loggers[name] || (loggers[name] = new Logger(name));
}

/**
 * Logger class
 */
export class Logger {

  /**
   * Each logger is identified by it's name.
   * @param {string} name Name of the logger (e.g. `chayns.core`)
   */
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
