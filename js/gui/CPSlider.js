/*
    ChickenPaint
    
    ChickenPaint is a translation of ChibiPaint from Java to JavaScript
    by Nicholas Sherlock / Chicken Smoothie.
    
    ChibiPaint is Copyright (c) 2006-2008 Marc Schefer

    ChickenPaint is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    ChickenPaint is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with ChickenPaint. If not, see <http://www.gnu.org/licenses/>.
*/

/**
 * A simple slider control.
 * 
 * The title property can be set to either a string to draw on the slider, or can be set to a function(value) which
 * receives the current value of the slider and should return the string to be painted to the slider. 
 */
export default function CPSlider(minValue, maxValue, centerMode) {
    var 
        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),
        
        valueRange = maxValue - minValue,
        
        dragNormal = false, dragPrecise = false,
        dragPreciseX,
        
        doneInitialPaint = false,
        
        that = this;
    
    this.value = undefined;
    this.title = "";
    
    centerMode = centerMode || false;

    function paint() {
        var
            width = canvas.width,
            height = canvas.height,
            title = typeof that.title === "string" ? that.title : that.title(that.value),
            textX = 2 * window.devicePixelRatio,
            textY = canvas.height * 0.75;

        if (centerMode) {
            canvasContext.save();
            
            canvasContext.fillStyle = 'white';

            canvasContext.fillRect(0, 0, width, height);
            
            canvasContext.fillStyle = 'black';

            canvasContext.fillText(title, textX, textY);
            canvasContext.beginPath();
            
            if (that.value >= valueRange / 2) {
                canvasContext.rect(width / 2, 0, (that.value - valueRange / 2) * width / valueRange, height);
            } else {
                canvasContext.rect(that.value * width / valueRange, 0, (valueRange / 2 - that.value) * width / valueRange, height);
            }
            
            canvasContext.fill();
            canvasContext.clip();
            
            canvasContext.fillStyle = 'white';
            canvasContext.fillText(title, textX, textY);
            
            canvasContext.restore();
        } else {
            canvasContext.save();
            canvasContext.save();
            
            canvasContext.fillStyle = 'black';

            canvasContext.beginPath();
            canvasContext.rect(0, 0, that.value * width / valueRange, height);
            canvasContext.fill();
            
            canvasContext.clip();
            
            canvasContext.fillStyle = 'white';
            canvasContext.fillText(title, textX, textY);
            
            // Remove the clip region
            canvasContext.restore();
            
            canvasContext.fillStyle = 'white';

            canvasContext.beginPath();
            canvasContext.rect(that.value * width / valueRange, 0, width, height);
            canvasContext.fill();
            
            canvasContext.clip();
            
            canvasContext.fillStyle = 'black';
            canvasContext.fillText(title, textX, textY);
            
            canvasContext.restore();
        }
    }

    function mouseSelect(e) {
        var 
            width = $(canvas).width(),
            left = $(canvas).offset().left;

        that.setValue((e.pageX - left) * valueRange / width);
    }
        
    function mouseDragged(e) {
        if (dragNormal) {
            mouseSelect(e);
        } else if (dragPrecise) {
            var
                diff = (e.pageX - dragPreciseX) / 4;
            
            if (diff != 0) {
                that.setValue(that.value + diff);
                dragPreciseX = e.pageX;
            }
        }
    }

    function mouseUp(e) {
        if (dragNormal && e.button == 0) {
            dragNormal = false;
        } else if (dragPrecise && e.button == 2) {
            dragPrecise = false;
        } else {
            return;
        }
        
        window.removeEventListener("mouseup", mouseUp);
        window.removeEventListener("mousemove", mouseDragged);
    }
    
    this.setValue = function(_value) {
        _value = ~~Math.max(minValue, Math.min(maxValue, _value));
        
        if (this.value != _value) {
            this.value = _value;
            
            // The event listeners might like to update our title property at this point to reflect the new value
            this.emitEvent('valueChange', [this.value]);
        
            if (doneInitialPaint) {
                paint();
            } else {
                // We don't bother to do our canvas dimensioning until we're supplied with an initial value
                doneInitialPaint = true;
                this.resize();
            }
        }
    };
    
    /**
     * Get the DOM element for the slider component.
     */
    this.getElement = function() {
        return canvas;
    };
    
    this.resize = function() {
        canvas.width = $(canvas).width() || 150;
        canvas.height = $(canvas).height() || 20;
        
        if (window.devicePixelRatio > 1) {
            // Assume our width is set to 100% or similar, so we only need to the fix the height
            canvas.style.height = canvas.height + 'px';
            
            canvas.width = canvas.width * window.devicePixelRatio;
            canvas.height = canvas.height * window.devicePixelRatio;
        }
        
        canvasContext.font = (canvas.height * 0.47) + 'pt sans-serif';
        
        paint();
    };
    
    canvas.addEventListener("mousedown", function(e) {
        var 
            dragging = dragNormal || dragPrecise;
        
        if (!dragging) {
            switch (e.button) {
                case 0: // Left
                    dragNormal = true;
                    mouseSelect(e);
                break;
                case 2: // Right
                    dragPrecise = true;
                    dragPreciseX = e.pageX;
                break;
                default:
                    return;
            }
            
            window.addEventListener("mouseup", mouseUp);
            window.addEventListener("mousemove", mouseDragged);
        }
    });
    
    canvas.addEventListener("contextmenu", function(e) {
        e.preventDefault()
    });;
    
    canvas.className = 'chickenpaint-slider';
    
    if (!window.devicePixelRatio) {
        // Old browsers
        window.devicePixelRatio = 1.0;
    }
}

CPSlider.prototype = Object.create(EventEmitter.prototype);
CPSlider.prototype.constructor = CPSlider;
