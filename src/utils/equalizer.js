/**
 * Created by LEngelke on 29.04.2015.
 */
export var equalizer = (function() {

    function init(){
        var parents = document.querySelectorAll('[data-equalize]');
        for(var i = 0, l = parents.length; i < l; i++){
            let equalizeId = parents[i].dataset.equalize || '';
            equalizeWidth(parents[i], equalizeId);
            equalizeHeight(parents[i], equalizeId);
            equalizeBoth(parents[i], equalizeId);
        }
    }

    function equalizeWidth(parent, equalizeId){
        var elements = parent.querySelectorAll(`[data-equalize-width="${equalizeId}"]`);
        if(elements && elements.length > 0){
            let maxWidth = 0;
            let length = elements.length;
            for(let i = 0; i < length; i++){
                if(elements[i].clientWidth > maxWidth){
                    maxWidth = elements[i].clientWidth;
                }
            }
            for(let i = 0, l = elements.length; i < l; i++){
                elements[i].style.width = maxWidth + 'px';
            }
        }
    }

    function equalizeHeight(parent, equalizeId){
        var elements = parent.querySelectorAll(`[data-equalize-height="${equalizeId}"]`);
        if(elements && elements.length > 0){
            let maxHeight = 0;
            let length = elements.length;
            for(let i = 0; i < length; i++){
                if(elements[i].clientHeight > maxHeight){
                    maxHeight = elements[i].clientHeight;
                }
            }
            for(let i = 0; i < length; i++){
                elements[i].style.height = maxHeight + 'px';
            }
        }
    }

    function equalizeBoth(parent, equalizeId){
        var elements = parent.querySelectorAll(`[data-equalize-both="${equalizeId}"]`);
        if(elements && elements.length > 0) {
            let maxWidth = 0;
            let maxHeight = 0;
            let length = elements.length;
            for (let i = 0; i < length; i++) {
                if (elements[i].clientWidth > maxWidth) {
                    maxWidth = elements[i].clientWidth;
                }
                if (elements[i].clientHeight > maxHeight) {
                    maxHeight = elements[i].clientHeight;
                }
            }
            for (let i = 0; i < length; i++) {
                elements[i].style.width = maxWidth + 'px';
                elements[i].style.height = maxHeight + 'px';
            }
        }
    }

    return {
        init: init
    };
})();