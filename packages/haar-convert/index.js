var xmlUtils = require("./xml");
var parse = xmlUtils.parse;
var children = xmlUtils.children;
var path = xmlUtils.path;

// 2 arbitrary but unique and distinguishable object refs
var opencv_haartraining = {};
var opencv_traincascade = {};

// This is the workhorse
function convertToModule(xmlString, callback, resourcePath) {
    parse(xmlString, function(err, xml) {
        if (err) {
            callback(err);
        }
        // OK let's get started.
        // first we do a small check to see wether this is the format produced by
        // `opencv_haartraining` or `opencv_traincascade`
        try {
            let output;
            const producer = detectProducer(xml);
            if (producer === opencv_haartraining) {
                output = createClassifierModuleFromHaarTraining(xml);
            } else if (producer === opencv_traincascade) {
                output = createClassifierModuleFromTrainCascade(xml);
            } else {
                throw new Error("Unrecognised cascade XML");
            }
            // prettier-ignore
            var moduleSource = (resourcePath ? "/* converted from: " + resourcePath + " */\n" : "") +
                "var classifier = new Float32Array([" + output + "]);\n" +
                "classifier.tilted = false;\n" +
                "module.exports = (exports = classifier);\n";

            callback(null, moduleSource);
        } catch (e) {
            callback(e);
        }
    });
}

//detect format
function detectProducer(xml) {
    // first they both should have an `opencv_storage` tag
    var s = path(xml, "opencv_storage");
    // now the next is *always* cascade in the new format, but the cascade name in the old.
    // that name could be "cascade" so we can'#t rely on this field.
    if (s.children.length > 1) {
        return; //if there is more than one child here, this is not the type we are looking for.
    }
    s = s.children[0];
    //now if we have a "size" child -> haartraining, if width/height/features -> traincascade
    for (var i = 0; i < s.children.length; i++) {
        switch (s.children[i].name) {
            case "size":
                return opencv_haartraining;
            case "width":
            // falls through
            case "height":
            // falls through
            case "features":
                return opencv_traincascade;
            default:
                continue;
        }
    }
    return; //unknown
}

// the newer format XML
function createClassifierModuleFromTrainCascade(xml) {
    var cascade = path(xml, "opencv_storage", "cascade");
    var features = parseFeatures(path(cascade, "features"));

    //Classifier - array layout:
    // [width, height, threshold, num_simple_classifiers, tilted, num_features, f1, f2, f3, f4, f_weight, simple_threshold, left_val, right, val, ...]
    var arrayContent = [
        path(cascade, "width").content.trim(),
        path(cascade, "height").content.trim()
    ].concat(parseClassifiers(path(cascade, "stages"), features));

    return arrayContent.join(",");
}

// parses the features->_->rects->_ features
function parseFeatures(featureTag) {
    return children(featureTag, "_").map(f =>
        children(path(f, "rects"), "_").map(r =>
            r.content.trim().split(" ").join(",")));
}

// parses the classifiers from the "stages" tag using the "features" we already extracted
function parseClassifiers(stagesTag, features) {
    return children(stagesTag, "_").map(stage => {
        var threshold = path(stage, "stageThreshold").content.trim();
        var weakClassifiers = children(stage, "weakClassifiers").reduce(
            (acc, w) =>
                acc.concat(
                    children(w, "_").map(weak => {
                        var internalNodes = path(weak, "internalNodes").content
                            .trim()
                            .split(" ");
                        var tilted = internalNodes[0];
                        var featureIndex = internalNodes[2];
                        var simpleThreshold = internalNodes[3];
                        var leafValues = path(weak, "leafValues").content
                            .trim()
                            .split(" ");
                        var leftVal = leafValues[0];
                        var rightVal = leafValues[1];
                        var feature = features[parseInt(featureIndex, 10)];
                        //tilted, num_features, f1, f2, f3, f4, f_weight, simple_threshold, left_val, right_val
                        return [
                            tilted,
                            feature.length,
                            feature.join(","),
                            simpleThreshold,
                            leftVal,
                            rightVal
                        ].join(",");
                    })
                ),
            []
        );
        return [
            threshold,
            weakClassifiers.length,
            weakClassifiers.join(",")
        ].join(",");
    });
}

// the older format XML
function createClassifierModuleFromHaarTraining(xml) {
    // the output will be the same as the previous. but I haven't implemented it yet.
    throw new Error(
        "XML cascades produced by `opencv_haartraining` are not yet supported"
    );
}

// export the converter
module.exports = (exports = convertToModule);
