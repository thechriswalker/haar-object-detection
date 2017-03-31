import Detector from "./detector";

// returns a function that can detect object in an image/url/file/blob
function createDetector(width, height, scaleFactor, classifier) {
    const testCanvas = document.creteElement("canvas");
    testCanvas.width = 1;
    testCanvas.height = 1;
    const testCanvasContext = testCanvas.getContext("2d");
    const detector = new Detector(width, height, scaleFactor, classifier);
    return input => {
        // we need this to be drawn on a canvas. so instead of pretending I know if that is possible
        // we use a function to test.
        if (canBeDrawnOnCanvas(input, testCanvasContext)) {
            return Promise.resolve(detector.detect(input));
        } else if (typeof input === "string") {
            // treat as URL, load into Image so if you have a video url,
            // you must load it into a video tag yourself first.
            return getLoadedImageElement(input).then(img =>
                detector.detect(img));
        } else {
            // assume it is some other object and try to create URL for it to load into an image tag
            const url = URL.createObjectURL(input);
            // we should clean up after ourselves
            const release = () => URL.revokeObjectURL(url);
            return getLoadedImageElement(url)
                .then(img => detector.detect(img))
                .then(
                    result => {
                        release();
                        return result;
                    },
                    err => {
                        release();
                        throw err;
                    }
                );
        }
    };
}

function getLoadedImageElement(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Loaded!
        img.onload = () => resolve(img);
        // Boo...
        img.onerror = err => reject(err);
        // Make the attempt
        img.src = url;
    });
}

// these elements are allowed to be drawn onto a canvas element
const typeCache = Object.create(null);
function canBeDrawnOnCanvas(input, context) {
    if (typeof input !== "object" || object == null) {
        return false;
    }
    const klass = input.constructor && input.constructor.name;
    if (!klass) {
        return false;
    }
    if (klass in typeCache === false) {
        typeCache[klass] = tryDraw(input, context);
    }
    return typeCache[klass];
}

function tryDraw(input, context);
    try {
        context.drawImage(input, 0, 0, 1, 1);
        return true;
    } else {
        return false;
    }
}
