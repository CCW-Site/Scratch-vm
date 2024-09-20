// We want to preserve the rotation center of exported SVGs when they are later imported.
// Unfortunately, the SVG itself does not have sufficient information to accomplish this.
// Instead we must add a small amount of extra information to the end of exported SVGs
// that can be read on import.

// Adding this comment in scratch-paint is not a viable approach because the user can
// open projects not made with TurboWarp and we want costumes exported from there to
// have their center saved even if they haven't been edited.

let _TextEncoder;
let _TextDecoder;
if (typeof TextEncoder === 'undefined') {
    _TextEncoder = require('text-encoding').TextEncoder;
    _TextDecoder = require('text-encoding').TextDecoder;
} else {
    _TextEncoder = TextEncoder;
    _TextDecoder = TextDecoder;
}

// Using literal HTML comments tokens will cause this script to be very hard to inline in
// a <script> element, so we'll instead do this terrible hack which the minifier probably
// won't be able to optimize away.
const HTML_COMMENT_START = `<!${'-'.repeat(2)}`;
const HTML_COMMENT_END = `${'-'.repeat(2)}>`;

const regex = new RegExp(
    `${HTML_COMMENT_START}rotationCenter:(-?[\\d\\.]+):(-?[\\d\\.]+)${HTML_COMMENT_END}$`
);

/**
 * @param {string} svgString SVG source
 * @returns {[number, number]|null} The detected rotation center of the SVG, if any.
 */
const parseVectorMetadata = svgString => {
    // TODO: see if this is slow on large strings
    const match = svgString.match(regex);
    if (!match) {
        return null;
    }

    const detectedX = +match[1];
    const detectedY = +match[2];
    if (Number.isNaN(detectedX) || Number.isNaN(detectedY)) {
        return null;
    }

    return [detectedX, detectedY];
};

/**
 * @param {Costume} costume scratch-vm costume object
 * @returns {Uint8Array} Binary data to export
 */
const exportCostume = costume => {
    /** @type {Uint8Array} */
    const originalData = costume.asset.data;

    if (costume.dataFormat !== 'svg') {
        return originalData;
    }

    let decodedData = new _TextDecoder().decode(originalData);

    // It's okay that the regex isn't global because it can only match one item anyways.
    decodedData = decodedData.replace(regex, '');

    const centerX = costume.rotationCenterX;
    const centerY = costume.rotationCenterY;
    const extraData = `${HTML_COMMENT_START}rotationCenter:${centerX}:${centerY}${HTML_COMMENT_END}`;
    decodedData += extraData;

    return new _TextEncoder().encode(decodedData);
};

module.exports = {
    parseVectorMetadata,
    exportCostume
};
