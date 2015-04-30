// TODO(pascal): remvoe, since this is solved in the chayns.css
/**
 * ColorScheme Enum
 * @type {Object}
 */
/*export var colors = {
  tobit: 0, // tobit.software
  forest: 1,
  raspberry: 2,
  lavender: 3,
  orange: 4, // pure orange
  ice: 5,
  desert: 6,
  stone: 7
  //,red: 8,
  //blue: 9
};*/

/**
 * RGB colors
 * @type {Array}
 */
/*export var colors = [
  '112,127,175',
  '55,145,60',
  '170,0,0',
  '94,72,131',
  '255,152,0',
  '0,85,164',
  '159,113,58',
  '130,130,130'
  //,'168,61,46',
  //'72,109,131'
];*/

//function rgbToHex(color) {
//  let [r,g,b] = color.split(',').map((i) => parseInt(i, 10));
//  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); // jshint ignore: line
//}

import {environment} from './environment';

let schemeColors = {
    '1': '#828282',
    '4': '#0055A4',
    '5': '#37913C',
    '6': '#AA0000',
    '7': '#9F713A',
    '8': '#FF9800',
    '9': '#5E4883'
};

export var colors = function(saturation) {
    var color = schemeColors[environment.site.colorScheme || '1'];

    if (typeof saturation === 'number' && saturation > 0 && saturation < 100) {
        saturation = 1 - (saturation / 100);
        let rgb = color.match(/[0-9A-F]{2}/gi),
            retColor = '#';
        for (var i = 0, l = rgb.length; i < l; i++) {
            let colorPart = parseInt(rgb[i], 16);
            let diff = 255 - colorPart;
            diff = Math.floor(diff * saturation);
            colorPart += diff;
            retColor += colorPart.toString(16);
        }
        return retColor;
    }

    return color;
};