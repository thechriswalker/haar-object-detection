# haar-loader

Allows wepback to import haar cascade xml (as produced by `opencv_traincascade`) as a JS module compatible with the `haar-detect` package (and https://github.com/mtschirs/js-objectdetect from which it is forked). The logic for the conversion was taken from [this gist](https://gist.github.com/mtschirs/df8d8dc5ff56cc7187b1).

## usage 

```javascript
// webpack config (provided you have no other XML files)
... 
  module: {
    rules: [
      {test: /\.xml$/, use: 'haar-loader'},
      ...

// inline
import classifier from "haar!cascade.xml";
```

### footnotes

Webpack best practice says that loaders should do **one** thing only, and this kinda does two, parse XML, convert data to a classifier. Perhaps I should have used the `xml-loader` in a chain, but that seems excessive to require it of the users. This loader has a very specific use-case.
