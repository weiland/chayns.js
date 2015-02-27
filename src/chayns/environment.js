
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
    useSSL: true
    //editMode: false, // future edit mode for content
    //isAdminMode: true
  },

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
