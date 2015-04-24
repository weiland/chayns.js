import {forEach} from './each';
export function adjustWidth(selector) {

  let nodes = document.querySelectorAll(selector);
  let maxWidth;
  forEach(nodes, function(key, value) {
    let width = value.style.width;
    if (!maxWidth) {
      maxWidth = width; // TODO(pascal): max width
    }
    if (width > maxWidth) {
      maxWidth = width;
    }
  });
  nodes.forEach(function(key, value) {
    value.style.width = maxWidth + 'px';
  });
}
