
// best practises
//let sizeBudget = 3072; // max page size in kb
//let timeBudget = 1000; // max loading time in ms
//let serverTimeBudget = 200; // max response time in ms

let performance = window.performance;
let perfSupport = !!performance;

/**
 * Receive Serve, DomComplete and PageLoaded timings
 * @returns {Object}
 */
export function laodTimes() {
  if (!perfSupport) {
    return;
  }
  let t = performance.timing;
  let navi = performance.navigation;
  return {
    redirectCount: navi.redirectCount,
    //loadType: navi.type, // 0:user action(typing, link), 1:reload, 2: history move
    latency: t.responseEnd - t.fetchStart,
    serverTime: t.responseEnd - t.requestStart,
    domComplete: t.domComplete - t.responseEnd,
    pageLoad: t.loadEventEnd - t.responseEnd
  };
}

/**
 * Detect amount of all assets
 * Also see which assets are to huge and loading time
 *
 * returns {Array} Containing to big assets
 */
export function badAssets() {
  let assets = performance.getEntries();

}

/**
 * Too many images
 *
 * Analyses images amount
 */
export function tmi() {
  return false;
}

/**
 * To many scripts
 *
 * Analyses scripts amount
 */
export function tms() {
  return false;
}

/**
 * Too many requests
 *
 * Attempts to detect whether there are too many requests
 */
export function tmr() {
  return false;
}

// TODO(pascal): move this below to separeted file
// add kinda blacklist of old events to see usage and display warnings
/**
 * Detect usage of old and soon deprecated APIs
 * such as XHR, no Promises, className instead of classList
 * etc
 */
export function oldApis() {
  return false;
}
