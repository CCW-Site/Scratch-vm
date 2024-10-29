/**
 * @fileoverview
 * The new URL() and fetch() provided by the browser tend to buckle when dealing with URLs that are
 * tens of megabytes in length, which can be common when working with data: URLs in extensions.
 *
 * To help avoid that, this file can "statically" parse some data: URLs without going through
 * unreliable browser APIs.
 */

const Base64Util = require('./base64-util');

/**
 * @param {string} url
 * @returns {Response|null}
 */
const staticFetch = url => {
    try {
        const simpleDataUrlMatch = url.match(/^data:([/-\w\d]*);base64,/i);
        if (simpleDataUrlMatch) {
            const contentType = simpleDataUrlMatch[1].toLowerCase();
            const base64 = url.substring(simpleDataUrlMatch[0].length);
            const decoded = Base64Util.base64ToUint8Array(base64);
            return new Response(decoded, {
                headers: {
                    'content-type': contentType,
                    'content-length': decoded.byteLength
                }
            });
        }
    } catch (e) {
        // not robust enough yet to care about these errors
    }
    return null;
};

module.exports = staticFetch;
