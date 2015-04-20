let types = {
  category: 'eventCategory',
  action: 'eventAction',
  label: 'eventLabel',
  value: 'eventValue'
};

export function track(info) {
  let track = {
    hitType: 'event'
  };
  info.forEach(function(key) {
    if (types[key]) {
      track[types[key]] = info[key];
    }
  });

  try {
    ga('send', track);
  } catch (e) {
    //log.warn('no google analytics method');
  }
}

export function initTrack() {
  let nodes = document.querySelector('[data-track}');
  let i = nodes.length;
  let callback = function() {
    track(JSON.parse(this.getAttribute('data-track')));
  };
  while (i--) {
    nodes[i].addEventListener(
      (nodes[i].getAttribute('data-track-event') || 'click'),
      callback,
      false
    );
  }
}

export function send(name, data) {
  let evt = {name, data};
  navigator.sendBeacon('https://res-chayns.tobit.com/tracking/', JSON.stringify(evt));
}
