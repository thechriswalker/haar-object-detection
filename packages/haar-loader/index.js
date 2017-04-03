var convertToModule = require("haar-convert");

// This is the webpack compatible function.
function loader(xmlString) {
    this.cacheable && this.cacheable();
    var callback = this.async();
    convertToModule(xmlString, callback, this.resourcePath);
    return;
}

module.exports = (exports = loader);
