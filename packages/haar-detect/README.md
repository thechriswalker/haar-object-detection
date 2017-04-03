# haar-detect

The module exposes a single function `createDetector` which accepts a `classifier` and options and returns a function that will perform the detection.

```javascript
import { createDetector } from "haar-detect";
import classifier from "haar!./my-trained-cascade.xml";

const detect = createDetector(classifier, { width: 640, height: 480, scale: 1.2 });

const img = document.images[0];

const rectangles = detect(img);

```

## classifiers

This module doesn't ship with any classifiers, but instead you could use the modules from [mtschirs/js-objectdetect](https://github.com/mtschirs/js-objectdetect) or with the `haar-loader` you can use any XML classifier, such as the [banana classifier](https://github.com/mrnugget/opencv-haar-classifier-training/blob/master/trained_classifiers/banana_classifier.xml) from [coding-robin.de](http://coding-robin.de/2013/07/22/train-your-own-opencv-haar-classifier.html) or those that are part of the [OpenCV project](http://opencv.org) at [alereimondo.no-ip.org](http://alereimondo.no-ip.org/OpenCV/34).
