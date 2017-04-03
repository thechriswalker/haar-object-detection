# haar-detect

In-browser object detection. If you are server-side any opencv binding would be better, even if I made this node.js compatible.

This library base on code from https://github.com/mtschirs/js-objectdetect.

However for me that library did not provide what I wanted.

  - I did not want all the classifiers it provides (I want to train my own, or make it easy to import from XML)
  - I wanted commonjs, and npm-able module structure.

So this repo contains the following packages:

  - ![haar-convert](https://img.shields.io/npm/v/haar-convert.svg) `haar-convert`: function to convert the haar cascade XML to JS modules
  - ![haar-loader](https://img.shields.io/npm/v/haar-loader.svg) `haar-loader`: a webpack2 loader that uses the `haar-convert` to import cascades
  - ![haar-detect](https://img.shields.io/npm/v/haar-detect.svg) `haar-detect`: uses the compiled cascades to detect objects in images/urls/files/blobs.

With  them your project can load XML cascade files as javascript during the bundling and use the `haar-detect` module to perform client-side object detections.
