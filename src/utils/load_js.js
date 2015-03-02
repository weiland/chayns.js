// TODO: refactor
// TODO: consider whether required
// TOOD: move to fetch
// put tis at the end of the body
function loadDeferred( ) {
  var s = document.createElement( 'script' );
  s.src = 'defer.js'; // concat all scripts which can be loaded deferred (listeners etc)
  document.body.appendChild( s );
}

if ( window.addEventListener ) {
  window.addEventListener( "load", loadDeferred, false );
}
else if ( window.attachEvent ) {
  window.attachEvent( "onload", loadDeferred );
}
else {
  window.onload = loadDeferred;
}
