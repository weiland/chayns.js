var browser = [
  'chrome',
  'firefox',
  'safari',
  'opera',
  'chrome mobile',
  'safari mobile',
  'firefox mobile'
];

var os = [
  'windows',
  'macOS',
  'android',
  'ios',
  'wp'
];

export var environment = {

  os: {},
  osVersion: 1,

  browser: {},
  browserVersion: 1,

  appVersion: 1,

  orientation: 'landscape',

  viewport: '1',

  isApp: true,
  isMobile: true,
  isTablet: true,
  isDesktop: false,
  isBrowser: true,

  isIOS: true,
  isAndroid: true,
  isWP: true,

  site: {
    siteId: 1,
    name: 'Tobit',
    locationId: 1,
    url: 'https://tobit.com/',
    useSSL: true,
    colorscheme: 1
    //editMode: false, // future edit mode for content
    //isAdminMode: true
  },

  // TODO: consider Tapp
  app: {
    appId: 1,
    config: {},
    //defaultContif: {},
    domReady: false,
    logs: {
      log: [],
      debug: [],
      warn: []
    },
    errors: []
  }
};

// TODO consider getters and setters
// export set
// export get
