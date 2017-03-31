/**
 *  This is ammended from: https://github.com/mtschirs/js-objectdetect/blob/55b5c16f5aa61c569d0d36e5ff43e0f190ec015f/js/objectdetect.js
 *
 *  The framework was less commonjs friendly than I wanted.
 */
/**
 * Real-time object detector based on the Viola Jones Framework.
 * Compatible to OpenCV Haar Cascade Classifiers (stump based only).
 *
 * Copyright (c) 2012, Martin Tschirsich
 */
/**
 * Converts from a 4-channel RGBA source image to a 1-channel grayscale
 * image. Corresponds to the CV_RGB2GRAY OpenCV color space conversion.
 *
 * @param {Array} src   4-channel 8-bit source image
 * @param {Array} [dst] 1-channel 32-bit destination image
 *
 * @return {Array} 1-channel 32-bit destination image
 */
const convertRgbaToGrayscale = (src, dst) => {
    const srcLength = src.length;
    if (!dst) {
        dst = new Uint32Array(srcLength >> 2);
    }
    for (let i = 0; i < srcLength; i += 2) {
        dst[i >> 2] = src[i] * 4899 +
            src[++i] * 9617 +
            src[++i] * 1868 +
            8192 >>
            14;
    }
    return dst;
};

const abs = Math.abs;
/**
 * Reduces the size of a given image by the given factor. Does NOT
 * perform interpolation. If interpolation is required, prefer using
 * the drawImage() method of the <canvas> element.
 *
 * @param {Array}  src       1-channel source image
 * @param {Number} srcWidth  Width of the source image
 * @param {Number} srcHeight Height of the source image
 * @param {Number} factor    Scaling down factor (> 1.0)
 * @param {Array}  [dst]     1-channel destination image
 *
 * @return {Array} 1-channel destination image
 */
const rescaleImage = (src, srcWidth, srcHeight, factor, dst = false) => {
    const srcLength = srcHeight * srcWidth;
    const dstWidth = ~~(srcWidth / factor);
    const dstHeight = ~~(srcHeight / factor);

    if (!dst) {
        dst = new src.constructor(dstWidth * srcHeight);
    }

    let srcIndex, dstIndex, srcEnd;
    for (let x = 0; x < dstWidth; ++x) {
        dstIndex = x;
        srcIndex = ~~(x * factor);
        srcEnd = srcIndex + srcLength;
        for (; srcIndex < srcEnd; srcIndex += srcWidth) {
            dst[dstIndex] = src[srcIndex];
            dstIndex += dstWidth;
        }
    }

    dstIndex = 0;
    let y = 0;
    const yEnd = dstHeight * factor;
    for (; y < yEnd; y += factor) {
        srcIndex = ~~y * dstWidth;
        srcEnd = srcIndex + dstWidth;
        for (; srcIndex < srcEnd; ++srcIndex) {
            dst[dstIndex] = dst[srcIndex];
            ++dstIndex;
        }
    }
    return dst;
};

/**
 * Computes the gradient magnitude using a sobel filter after
 * applying gaussian smoothing (5x5 filter size). Useful for canny
 * pruning.
 *
 * @param {Array}  src      1-channel source image
 * @param {Number} srcWidth Width of the source image
 * @param {Number} srcWidth Height of the source image
 * @param {Array}  [dst]    1-channel destination image
 *
 * @return {Array} 1-channel destination image
 */
const computeCanny = (src, srcWidth, srcHeight, dst) => {
    let srcLength = srcWidth * srcHeight;
    if (!dst) dst = new src.constructor(srcLength);
    let buffer1 = dst === src ? new src.constructor(srcLength) : dst;
    let buffer2 = new src.constructor(srcLength);

    // Gaussian filter with size=5, sigma=sqrt(2) horizontal pass:
    for (let x = 2; x < srcWidth - 2; ++x) {
        let index = x;
        for (let y = 0; y < srcHeight; ++y) {
            buffer1[index] = 0.1117 * src[index - 2] +
                0.2365 * src[index - 1] +
                0.3036 * src[index] +
                0.2365 * src[index + 1] +
                0.1117 * src[index + 2];
            index += srcWidth;
        }
    }

    // Gaussian filter with size=5, sigma=sqrt(2) vertical pass:
    for (let x = 0; x < srcWidth; ++x) {
        let index = x + srcWidth;
        for (let y = 2; y < srcHeight - 2; ++y) {
            index += srcWidth;
            buffer2[index] = 0.1117 * buffer1[index - srcWidth - srcWidth] +
                0.2365 * buffer1[index - srcWidth] +
                0.3036 * buffer1[index] +
                0.2365 * buffer1[index + srcWidth] +
                0.1117 * buffer1[index + srcWidth + srcWidth];
        }
    }

    // Compute gradient:
    for (let x = 2; x < srcWidth - 2; ++x) {
        let index = x + srcWidth;
        for (let y = 2; y < srcHeight - 2; ++y) {
            index += srcWidth;

            // prettier-ignore
            dst[index] =
                abs(-     buffer2[index - 1 - srcWidth]
                    +     buffer2[index + 1 - srcWidth]
                    - 2 * buffer2[index - 1]
                    + 2 * buffer2[index + 1]
                    -     buffer2[index - 1 + srcWidth]
                    +     buffer2[index + 1 + srcWidth]) +

                abs(      buffer2[index - 1 - srcWidth]
                    + 2 * buffer2[index - srcWidth]
                    +     buffer2[index + 1 - srcWidth]
                    -     buffer2[index - 1 + srcWidth]
                    - 2 * buffer2[index + srcWidth]
                    -     buffer2[index + 1 + srcWidth]);
        }
    }
    return dst;
};

/**
 * Computes the integral image of a 1-channel image. Arithmetic
 * overflow may occur if the integral exceeds the limits for the
 * destination image values ([0, 2^32-1] for an unsigned 32-bit image).
 * The integral image is 1 pixel wider both in vertical and horizontal
 * dimension compared to the source image.
 *
 * SAT = Summed Area Table.
 *
 * @param {Array}       src       1-channel source image
 * @param {Number}      srcWidth  Width of the source image
 * @param {Number}      srcHeight Height of the source image
 * @param {Uint32Array} [dst]     1-channel destination image
 *
 * @return {Uint32Array} 1-channel destination image
 */
const computeSat = (src, srcWidth, srcHeight, dst = false) => {
    const dstWidth = srcWidth + 1;

    if (!dst) {
        dst = new Uint32Array(srcWidth * srcHeight + dstWidth + srcHeight);
    }

    for (let i = srcHeight * dstWidth; i >= 0; i -= dstWidth) {
        dst[i] = 0;
    }

    for (let x = 1; x <= srcWidth; ++x) {
        let column_sum = 0;
        let index = x;
        dst[x] = 0;

        for (let y = 1; y <= srcHeight; ++y) {
            column_sum += src[index - y];
            index += dstWidth;
            dst[index] = dst[index - 1] + column_sum;
        }
    }
    return dst;
};

/**
 * Computes the squared integral image of a 1-channel image.
 * @see computeSat()
 *
 * @param {Array}       src       1-channel source image
 * @param {Number}      srcWidth  Width of the source image
 * @param {Number}      srcHeight Height of the source image
 * @param {Uint32Array} [dst]     1-channel destination image
 *
 * @return {Uint32Array} 1-channel destination image
 */
const computeSquaredSat = (src, srcWidth, srcHeight, dst = false) => {
    const dstWidth = srcWidth + 1;

    if (!dst) {
        dst = new Uint32Array(srcWidth * srcHeight + dstWidth + srcHeight);
    }

    for (let i = srcHeight * dstWidth; i >= 0; i -= dstWidth) {
        dst[i] = 0;
    }

    for (let x = 1; x <= srcWidth; ++x) {
        let column_sum = 0;
        let index = x;
        dst[x] = 0;
        for (let y = 1; y <= srcHeight; ++y) {
            const val = src[index - y];
            column_sum += val * val;
            index += dstWidth;
            dst[index] = dst[index - 1] + column_sum;
        }
    }
    return dst;
};

/**
 * Computes the rotated / tilted integral image of a 1-channel image.
 * @see computeSat()
 *
 * @param {Array}       src       1-channel source image
 * @param {Number}      srcWidth  Width of the source image
 * @param {Number}      srcHeight Height of the source image
 * @param {Uint32Array} [dst]     1-channel destination image
 *
 * @return {Uint32Array} 1-channel destination image
 */
const computeRsat = (src, srcWidth, srcHeight, dst = false) => {
    const dstWidth = srcWidth + 1;
    const srcHeightTimesDstWidth = srcHeight * dstWidth;

    if (!dst) {
        dst = new Uint32Array(srcWidth * srcHeight + dstWidth + srcHeight);
    }

    for (let i = srcHeightTimesDstWidth; i >= 0; i -= dstWidth) {
        dst[i] = 0;
    }

    for (let i = 0; i < dstWidth; ++i) {
        dst[i] = 0;
    }

    let index = 0;
    for (let y = 0; y < srcHeight; ++y) {
        for (let x = 0; x < srcWidth; ++x) {
            dst[index + dstWidth + 1] = src[index - y] + dst[index];
            ++index;
        }
        dst[index + dstWidth] += dst[index];
        index++;
    }

    for (let x = srcWidth - 1; x > 0; --x) {
        index = x + srcHeightTimesDstWidth;
        for (let y = srcHeight; y > 0; --y) {
            index -= dstWidth;
            dst[index + dstWidth] += dst[index] + dst[index + 1];
        }
    }

    return dst;
};

/**
 * Compiles a cascade classifier to be applicable to images
 * of given dimensions. Speeds-up the actual detection process later on.
 *
 * @param {Array}        src    Cascade classifier
 * @param {Number}       width  Width of the source image
 * @param {Float32Array} [dst]  Compiled cascade classifier
 *
 * @return {Float32Array} Compiled cascade classifier
 */
const compileClassifier = (src, width, scale, dst) => {
    width += 1;
    if (!dst) dst = new Float32Array(src.length);
    let dstUint32 = new Uint32Array(dst.buffer);

    dstUint32[0] = src[0];
    dstUint32[1] = src[1];
    let dstIndex = 1;
    for (let srcIndex = 1, iEnd = src.length - 1; srcIndex < iEnd; ) {
        dst[++dstIndex] = src[++srcIndex];

        let numComplexClassifiers = (dstUint32[++dstIndex] = src[++srcIndex]);
        for (let j = 0, jEnd = numComplexClassifiers; j < jEnd; ++j) {
            let tilted = (dst[++dstIndex] = src[++srcIndex]);
            let numFeaturesTimes3 = (dstUint32[++dstIndex] = src[++srcIndex] *
                3);
            if (tilted) {
                for (
                    let kEnd = dstIndex + numFeaturesTimes3;
                    dstIndex < kEnd;
                    
                ) {
                    dstUint32[++dstIndex] = src[++srcIndex] +
                        src[++srcIndex] * width;
                    dstUint32[++dstIndex] = src[++srcIndex] * (width + 1) +
                        (src[++srcIndex] * (width - 1) << 16);
                    dst[++dstIndex] = src[++srcIndex];
                }
            } else {
                for (
                    let kEnd = dstIndex + numFeaturesTimes3;
                    dstIndex < kEnd;
                    
                ) {
                    dstUint32[++dstIndex] = src[++srcIndex] +
                        src[++srcIndex] * width;
                    dstUint32[++dstIndex] = src[++srcIndex] +
                        (src[++srcIndex] * width << 16);
                    dst[++dstIndex] = src[++srcIndex];
                }
            }

            const inverseClassifierThreshold = 1 / src[++srcIndex];
            for (let k = 0; k < numFeaturesTimes3; ) {
                dst[dstIndex - k] *= inverseClassifierThreshold;
                k += 3;
            }

            if (inverseClassifierThreshold < 0) {
                dst[dstIndex + 2] = src[++srcIndex];
                dst[dstIndex + 1] = src[++srcIndex];
                dstIndex += 2;
            } else {
                dst[++dstIndex] = src[++srcIndex];
                dst[++dstIndex] = src[++srcIndex];
            }
        }
    }
    return dst.subarray(0, dstIndex + 1);
};

/**
 * Evaluates a compiled cascade classifier. Sliding window approach.
 *
 * @param {Uint32Array}  sat        SAT of the source image
 * @param {Uint32Array}  rsat       Rotated SAT of the source image
 * @param {Uint32Array}  ssat       Squared SAT of the source image
 * @param {Uint32Array}  [cannySat] SAT of the canny source image
 * @param {Number}       width      Width of the source image
 * @param {Number}       height     Height of the source image
 * @param {Number}       step       Stepsize, increase for performance
 * @param {Float32Array} classifier Compiled cascade classifier
 *
 * @return {Array} Rectangles representing detected objects
 */
const detect = (sat, rsat, ssat, cannySat, width, height, step, classifier) => {
    width += 1;
    height += 1;

    const classifierUint32 = new Uint32Array(classifier.buffer);
    const windowWidth = classifierUint32[0];
    const windowHeight = classifierUint32[1];
    const windowHeightTimesWidth = windowHeight * width;
    const area = windowWidth * windowHeight;
    const inverseArea = 1 / area;
    const widthTimesStep = width * step;
    const rects = [];

    for (let x = 0; x + windowWidth < width; x += step) {
        let satIndex = x;
        for (let y = 0; y + windowHeight < height; y += step) {
            const satIndex1 = satIndex + windowWidth;
            const satIndex2 = satIndex + windowHeightTimesWidth;
            const satIndex3 = satIndex2 + windowWidth;

            // Canny test:
            if (cannySat) {
                const edgesDensity = (cannySat[satIndex] -
                    cannySat[satIndex1] -
                    cannySat[satIndex2] +
                    cannySat[satIndex3]) *
                    inverseArea;
                if (edgesDensity < 60 || edgesDensity > 200) {
                    satIndex += widthTimesStep;
                    continue;
                }
            }

            // Normalize mean and variance of window area:
            const mean = sat[satIndex] -
                sat[satIndex1] -
                sat[satIndex2] +
                sat[satIndex3],
                variance = (ssat[satIndex] -
                    ssat[satIndex1] -
                    ssat[satIndex2] +
                    ssat[satIndex3]) *
                    area -
                    mean * mean;
            const std = variance > 1 ? Math.sqrt(variance) : 1;
            let found = true;

            // Evaluate cascade classifier aka 'stages':
            for (let i = 1, iEnd = classifier.length - 1; i < iEnd; ) {
                const complexClassifierThreshold = classifier[++i];
                // Evaluate complex classifiers aka 'trees':
                let complexClassifierSum = 0;
                for (let j = 0, jEnd = classifierUint32[++i]; j < jEnd; ++j) {
                    // Evaluate simple classifiers aka 'nodes':
                    let simpleClassifierSum = 0;

                    if (classifierUint32[++i]) {
                        // Simple classifier is tilted:
                        for (let kEnd = i + classifierUint32[++i]; i < kEnd; ) {
                            const f1 = satIndex + classifierUint32[++i];
                            const packed = classifierUint32[++i];
                            const f2 = f1 + (packed & 0xffff);
                            const f3 = f1 + (packed >> 16 & 0xffff); //eslint-disable-line no-mixed-operators

                            simpleClassifierSum += classifier[++i] *
                                (rsat[f1] -
                                    rsat[f2] -
                                    rsat[f3] +
                                    rsat[f2 + f3 - f1]);
                        }
                    } else {
                        // Simple classifier is not tilted:
                        for (let kEnd = i + classifierUint32[++i]; i < kEnd; ) {
                            const f1 = satIndex + classifierUint32[++i];
                            const packed = classifierUint32[++i];
                            const f2 = f1 + (packed & 0xffff);
                            const f3 = f1 + (packed >> 16 & 0xffff); //eslint-disable-line no-mixed-operators

                            simpleClassifierSum += classifier[++i] *
                                (sat[f1] -
                                    sat[f2] -
                                    sat[f3] +
                                    sat[f2 + f3 - f1]);
                        }
                    }
                    complexClassifierSum += classifier[
                        i + (simpleClassifierSum > std ? 2 : 1)
                    ];
                    i += 2;
                }
                if (complexClassifierSum < complexClassifierThreshold) {
                    found = false;
                    break;
                }
            }
            if (found) {
                rects.push([x, y, windowWidth, windowHeight]);
            }
            satIndex += widthTimesStep;
        }
    }
    return rects;
};

/**
 * Groups rectangles together using a rectilinear distance metric. For
 * each group of related rectangles, a representative mean rectangle
 * is returned.
 *
 * @param {Array}  rects        Rectangles (Arrays of 4 floats)
 * @param {Number} minNeighbors Minimum neighbors for returned groups
 * @param {Number} confluence   Neighbor distance threshold factor
 * @return {Array} Mean rectangles (Arrays of 4 floats)
 */
const groupRectangles = (rects, minNeighbors, confluence = 0.25) => {
    const rectsLength = rects.length;

    // Partition rects into similarity classes:
    let numClasses = 0;
    let labels = new Array(rectsLength);
    for (let i = 0; i < rectsLength; ++i) {
        labels[i] = 0;
    }

    let abs = Math.abs, min = Math.min;
    for (let i = 0; i < rectsLength; ++i) {
        let found = false;
        for (let j = 0; j < i; ++j) {
            // Determine similarity:
            const rect1 = rects[i];
            const rect2 = rects[j];
            const delta = confluence *
                (min(rect1[2], rect2[2]) + min(rect1[3], rect2[3]));
            if (
                abs(rect1[0] - rect2[0]) <= delta &&
                abs(rect1[1] - rect2[1]) <= delta &&
                abs(rect1[0] + rect1[2] - rect2[0] - rect2[2]) <= delta &&
                abs(rect1[1] + rect1[3] - rect2[1] - rect2[3]) <= delta
            ) {
                labels[i] = labels[j];
                found = true;
                break;
            }
        }
        if (!found) {
            labels[i] = numClasses++;
        }
    }

    // Compute average rectangle (group) for each cluster:
    const groups = new Array(numClasses);

    for (let i = 0; i < numClasses; ++i) {
        groups[i] = [0, 0, 0, 0, 0];
    }

    for (let i = 0; i < rectsLength; ++i) {
        const rect = rects[i], group = groups[labels[i]];
        group[0] += rect[0];
        group[1] += rect[1];
        group[2] += rect[2];
        group[3] += rect[3];
        ++group[4];
    }

    for (let i = 0; i < numClasses; ++i) {
        let numNeighbors = groups[i][4];
        if (numNeighbors >= minNeighbors) {
            const group = groups[i];
            numNeighbors = 1 / numNeighbors;
            group[0] *= numNeighbors;
            group[1] *= numNeighbors;
            group[2] *= numNeighbors;
            group[3] *= numNeighbors;
        } else
            groups.splice(i, 1);
    }

    // Filter out small rectangles inside larger rectangles:
    const filteredGroups = [];
    for (let i = 0; i < numClasses; ++i) {
        const r1 = groups[i];
        let j = i + 1;
        for (; j < numClasses; ++j) {
            const r2 = groups[j];

            const dx = r2[2] * confluence; // * 0.2;
            const dy = r2[3] * confluence; // * 0.2;

            // Not antisymmetric, must check both r1 > r2 and r2 > r1:
            if (
                (r1[0] >= r2[0] - dx &&
                    r1[1] >= r2[1] - dy &&
                    r1[0] + r1[2] <= r2[0] + r2[2] + dx &&
                    r1[1] + r1[3] <= r2[1] + r2[3] + dy) ||
                (r2[0] >= r1[0] - dx &&
                    r2[1] >= r1[1] - dy &&
                    r2[0] + r2[2] <= r1[0] + r1[2] + dx &&
                    r2[1] + r2[3] <= r1[1] + r1[3] + dy)
            ) {
                break;
            }
        }

        if (j === numClasses) {
            filteredGroups.push(r1);
        }
    }
    return filteredGroups;
};
export default class Detector {
    constructor(width, height, scaleFactor, classifier) {
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext("2d");
        this.tilted = classifier.tilted;
        this.scaleFactor = scaleFactor;
        this.numScales = ~~(Math.log(
            Math.min(width / classifier[0], height / classifier[1])
        ) / Math.log(scaleFactor));
        this.scaledGray = new Uint32Array(width * height);
        this.compiledClassifiers = [];
        let scale = 1;
        for (let i = 0; i < this.numScales; ++i) {
            const scaledWidth = ~~(width / scale);
            this.compiledClassifiers[i] = compileClassifier(
                classifier,
                scaledWidth
            );
            scale *= scaleFactor;
        }
    }

    detect(image, group = 1, stepSize = 1, roi, canny) {
        const { width, height } = this.canvas;

        if (roi) {
            this.context.drawImage(
                image,
                roi[0],
                roi[1],
                roi[2],
                roi[3],
                0,
                0,
                width,
                height
            );
        } else {
            this.context.drawImage(image, 0, 0, width, height);
        }
        const imageData = this.context.getImageData(0, 0, width, height).data;
        this.gray = convertRgbaToGrayscale(imageData, this.gray);

        const rects = [];
        let scale = 1;
        for (let i = 0; i < this.numScales; ++i) {
            const scaledWidth = ~~(width / scale);
            const scaledHeight = ~~(height / scale);

            if (scale === 1) {
                this.scaledGray.set(this.gray);
            } else {
                this.scaledGray = rescaleImage(
                    this.gray,
                    width,
                    height,
                    scale,
                    this.scaledGray
                );
            }

            if (canny) {
                this.canny = computeCanny(
                    this.scaledGray,
                    scaledWidth,
                    scaledHeight,
                    this.canny
                );
                this.cannySat = computeSat(
                    this.canny,
                    scaledWidth,
                    scaledHeight,
                    this.cannySat
                );
            }

            this.sat = computeSat(
                this.scaledGray,
                scaledWidth,
                scaledHeight,
                this.sat
            );
            this.ssat = computeSquaredSat(
                this.scaledGray,
                scaledWidth,
                scaledHeight,
                this.ssat
            );
            if (this.tilted)
                this.rsat = computeRsat(
                    this.scaledGray,
                    scaledWidth,
                    scaledHeight,
                    this.rsat
                );

            const newRects = detect(
                this.sat,
                this.rsat,
                this.ssat,
                this.cannySat,
                scaledWidth,
                scaledHeight,
                stepSize,
                this.compiledClassifiers[i]
            );
            for (let j = newRects.length - 1; j >= 0; --j) {
                const newRect = newRects[j];
                newRect[0] *= scale;
                newRect[1] *= scale;
                newRect[2] *= scale;
                newRect[3] *= scale;
            }
            rects.push(...newRects);

            scale *= this.scaleFactor;
        }
        return (group ? groupRectangles(rects, group) : rects).sort(
            (r1, r2) => r2[4] - r1[4]
        );
    }
}
