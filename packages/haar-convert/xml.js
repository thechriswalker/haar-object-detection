var sax = require("sax");
var noop = function() {};

function newTag(name, attrs) {
    return { name: name, children: [], content: "", attrs: attrs };
}

function parse(xmlString, callback) {
    var strict = true;
    var parser = sax.parser(strict);
    var tagStack = [newTag("__root__")];
    var currentTag = tagStack[0];
    var _cb = callback;
    parser.onerror = function(e) {
        // an error happened.
        _cb(e);
        _cb = noop;
    };
    parser.ontext = function(t) {
        currentTag.content += t;
    };
    parser.onopentag = function(node) {
        // opened a tag.  node has "name" and "attributes"
        var tag = newTag(node.name, node.attributes);
        currentTag.children.push(tag);
        tagStack.push(tag);
        currentTag = tag;
    };
    parser.onclosetag = function() {
        tagStack.pop();
        currentTag = tagStack[tagStack.length - 1];
    };
    parser.onend = function() {
        // parser stream is done, and ready to have more stuff written to it.
        _cb(null, currentTag); //the root tag single child
        _cb = noop;
    };
    parser.write(xmlString).close();
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
        return filter(node.children, function(child) {
            return child.name === tag;
        });
    }
    return filter(node.children, function(child) {
        return tags.indexOf(child.name) > -1;
    });
}

module.exports = (exports = {
    parse: parse,
    children: children,
    path: path
});
