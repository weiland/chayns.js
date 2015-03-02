// TODO: refactor
// TODO: do we need it?
(function( window ) {

  if ( window.console ) {
    return;
  }

  window.console = (function() {

    var methods = 'assert,clear,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,table,time,timeEnd,timeStamp,trace,warn'.split(','),
      console = {},
      index;

    while( index = methods.pop() ) {
      console[ index ] = Function.prototype;
    }

    return console;

  })() ;

} ( window ) );
