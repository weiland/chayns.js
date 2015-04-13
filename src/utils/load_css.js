// TODO: refactor
// TODO: consider whether required
// TODO: move to fetch

//https://github.com/filamentgroup/loadCSS <3
function loadCSS(href, before, media, callback) {
  //'use strict';
  // Arguments explained:
  // `href` is the URL for your CSS file.
  // `before` optionally defines the element we'll use as a reference for injecting our <link>
  // By default, `before` uses the first <script> element in the page.
  // However, since the order in which stylesheets are referenced matters, you might need a more specific location in your document.
  // If so, pass a different reference element to the `before` argument and it'll insert before that instead
  // note: `insertBefore` is used instead of `appendChild`, for safety re: http://www.paulirish.com/2011/surefire-dom-element-insertion/
  var cssLink = document.createElement('link');
  var ref = before || window.document.getElementsByTagName('script')[0];
  var sheets = window.document.styleSheets;
  cssLink.rel = 'stylesheet';
  cssLink.href = href;
  // temporarily, set media to something non-matching to ensure it'll fetch without blocking render
  cssLink.media = 'only x';
  if (callback) {
    cssLink.onload = callback;
  }
  // inject link
  ref.parentNode.insertBefore(cssLink, ref);
  // This function sets the link's media back to `all` so that the stylesheet applies once it loads
  // It is designed to poll until document.styleSheets includes the new sheet.
  function toggleMedia() {
    var defined, i, l;
    for (i = 0, l = sheets.length; i < l; i++) {
      if (sheets[i].href && sheets[i].href.indexOf(cssLink.href) > -1) {
        defined = true;
      }
    }
    if (defined) {
      cssLink.media = media || 'all';
    } else {
      setTimeout(toggleMedia, 0);
    }
  }
  toggleMedia();
  return cssLink;
}
