import CPChibiFile from "./CPChibiFile";
import CPArtwork from "./CPArtwork";
import CPLayer from "./CPLayer";
import AdobeColorTable from "../util/AdobeColorTable";

/**
 * Loads ChickenPaint resources from a remote server and emits progress events.
 *
 * loadImageURL - URL of PNG/JPEG image to load for editing (optional)
 * loadChibiFileURL - URL of .chi file to load for editing (optional). Used in preference to loadImage.
 * loadSwatchesURL - URL of an .aco palette to load (optional)
 */
export default function CPResourceLoader(options) {
    var
        resources = [],
        completed = {},
        that = this;

    if (options.loadChibiFileUrl) {
        resources.push({
            url: options.loadChibiFileUrl,
            friendly: "drawing layers",
            name: "layers",
            required: true
        });
    }
    
    if (options.loadImageUrl) {
        resources.push({
            url: options.loadImageUrl,
            friendly: "drawing",
            name: "flat",
            required: true
        });
    }
    
    if (options.loadSwatchesUrl) {
        resources.push({
            url: options.loadSwatchesUrl,
            friendly: "color swatches",
            name: "swatches",
            required: false
        });
    }

    function decodeResource(resource, resourceData) {
        return new Promise(function(resolve, reject) {
            switch (resource.name) {
                case "flat":
                    var 
                        blob = new Blob([resourceData], {type: "image/png"}),
                        imageUrl = window.URL.createObjectURL(blob);
                    
                    if (imageUrl) {
                        var 
                            image = new Image();
                        
                        image.onload = function() {
                            var
                                artwork = new CPArtwork(this.width, this.height),
                                layer = new CPLayer(this.width, this.height, "Layer 1");
                            
                            layer.loadFromImage(image);
                            artwork.addLayerObject(layer);
                            
                            image = null;
                            window.URL.revokeObjectURL(imageUrl);
                            
                            resolve(artwork);
                        };
                        
                        image.src = imageUrl;
                    } else {
                        resolve(null);
                    }
                break;
                case "swatches":
                    var
                        reader = new AdobeColorTable(),
                        colors = reader.read(resourceData);
                    
                    resolve(colors);
                break;
                case "layers":
                    var
                        reader = new CPChibiFile(),
                        artwork = reader.read(resourceData);
    
                    resolve(artwork);
                break;
                default:
                    resolve(null);
                break;
            }
        });
    }

    this.load = function() {
        if (resources.length == 0) {
            that.emitEvent("loadingComplete", [completed]);
            return;
        }

        var
            resource = resources.shift(),
            xhr = new XMLHttpRequest();

        xhr.responseType = 'arraybuffer';

        xhr.addEventListener("progress", function(evt) {
            if (evt.lengthComputable) {
                var
                    progress = evt.loaded / evt.total;

                that.emitEvent("loadingProgress", [progress, "Loading your " + resource.friendly + " (" + Math.round(progress * 100) + "%)..."]);
            }
        }, false);

        function handleFatal() {
            if (resource.required) {
                that.emitEvent("loadingFailure", ["Failed to load your " + resource.friendly + ", please try again later."]);
            } else {
                // Skip unimportant resources
                that.load();
            }
        }
        
        xhr.addEventListener("load", function(evt) {
            if (this.status == 200) {
                that.emitEvent("loadingProgress", [1.0, "Loading your " + resource.friendly + " (100%)..."]);
    
                decodeResource(resource, this.response).then(function(decoded) {
                    if (decoded) {
                        completed[resource.name] = decoded;
                        
                        // Move on to the next file
                        that.load();
                    } else {
                        that.emitEvent("loadingFailure", ["Failed to read your " + resource.friendly]);
                    }
                });
            } else {
                handleFatal();
            }
        }, false);

        xhr.addEventListener("error", handleFatal);

        that.emitEvent("loadingProgress", [0.0, "Loading your " + resource.friendly + " (0%)..."]);

        xhr.open("GET", resource.url, true);
        xhr.send();
    }
}

CPResourceLoader.prototype = Object.create(EventEmitter.prototype);
CPResourceLoader.prototype.constructor = CPResourceLoader;
