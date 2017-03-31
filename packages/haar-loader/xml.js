var sax = require("sax");
var noop = function() {};

function parse(xmlString, callback) {
    var strict = true;
    var parser = sax.parser(strict);
    var tagStack = [{ children: [], content: "" }];
    var currentTag = tagStack[0];
    var _cb = callback;
    parser.on("error", function(e) {
        // an error happened.
        _cb(e);
        _cb = noop;
    });
    parser.on("text", function(t) {
        currentTag.content += t;
    });
    parser.on("opentag", function(node) {
        // opened a tag.  node has "name" and "attributes"
        var tag = newTag(node.name, node.attributes);
        currentTag.children.push(tag);
        tagStack.push(tag);
        currentTag = tag;
    });
    parser.on("closetag", function() {
        tagStack.pop();
        currentTag = tagStack[tagStack.length - 1];
    });
    parser.on("end", function() {
        // parser stream is done, and ready to have more stuff written to it.
        _cb(null, currentTag); //the root tag single child
        _cb = noop;
    });
    parser.write(xmlString);
}

function slice(arrayLike, a, b) {
    return Array.prototype.slice.call(arrayLike, a, b);
}
function filter(arr, predicate) {
    var r = [], i = 0, l = arr.length;
    for (; i < l; i++) {
        if (predicate(arr[i])) {
            r.push(arr[i]);
        }
    }
    return r;
}

function path(startNode /*,  ...path*/) {
    var path = slice(arguments, 1);
    return path.reduce(
        (node, next) => {
            //descned first-children only
            var child = children(node, next)[0];
            if (!child) {
                throw new Error(
                    "Could not find tag " + next + " in xml " + node.name
                );
            }
            return child;
        },
        startNode
    );
}

// get children with given tags.
function children(node /*, ...tags*/) {
    var tags = slice(arguments, 1);
    if (tags.length === 0) {
        return node.children;
    }
    if (tags.length === 1) {
        var tag = tags[0];
        return filter(object.children, function(child) {
            return child.name === tag;
        });
    }
    return filter(object.children, function(child) {
        return tags.indexOf(child.name) > -1;
    });
}

module.exports = (exports = {
    parse: parse,
    chidlren: children,
    path: path
});
