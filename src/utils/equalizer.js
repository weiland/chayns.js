/**
 * Created by LEngelke on 29.04.2015.
 */
let dimension = {
    WIDTH: {
        clientDim: 'clientWidth',
        dim: 'width'
    },
    HEIGHT: {
        clientDim: 'clientHeight',
        dim: 'height'
    }
};

export var equalizer = (function() {

    function init(){
        var parents = document.querySelectorAll('[data-equalize]');
        for (var i = 0, l = parents.length; i < l; i++) {
            let parent = parents[i];
            let equalizeId = parent.dataset['equalize'] || '';
            //equalize width
            let elements = parent.querySelectorAll(`[data-equalize-width="${equalizeId}"]`);
            if(elements.length){
                equalize(elements, dimension.WIDTH);
            }
            //equalize height
            elements = parent.querySelectorAll(`[data-equalize-height="${equalizeId}"]`);
            if(elements.length){
                equalize(elements, dimension.HEIGHT);
            }
            //equalize both
            elements = parent.querySelectorAll(`[data-equalize-both="${equalizeId}"]`);
            if(elements.length){
                equalize(elements, dimension.WIDTH);
                equalize(elements, dimension.HEIGHT);
            }
        }
    }

    function equalize(elements, dimension){
        var max = 0;
        var length = elements.length;
        for (let i = 0; i < length; i++) {
            if(max < elements[i][dimension.clientDim]){
                max = elements[i][dimension.clientDim]; //find maximum dimension
            }
        }
        for (let i = 0; i < length; i++) {
            elements[i].style[dimension.dim] = max + 'px'; //set all elements to max dimension
        }
    }

    return {
        init: init
    };
})();