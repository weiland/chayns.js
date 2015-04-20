
// TODO(pascal): refactor to Set
let assets = [];

function add(asset) {
  assets.push(asset);
}

function preload(url) {
  let image = new Image();
  return new Promise(function(resolve, reject) {
    image.src = url;
    if (image.complete) {
      resolve();
    } else {
      image.addEventListener('load', resolve, false);
      image.addEventListener('error', reject, false);
    }
  });
}

function preloadAll() {
  let current;
  let i = assets.length;
  let all = [];
  while(i--) {
    current = assets[i];
    all.push(preload(current));
  }
  return Promise.all(all);
}

export var preloader = {
  add,
  preload,
  preloadAll
};
