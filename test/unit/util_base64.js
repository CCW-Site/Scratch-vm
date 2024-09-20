const test = require('tap').test;
const Base64Util = require('../../src/util/base64-util');

test('uint8ArrayToBase64', t => {
    t.equal(Base64Util.uint8ArrayToBase64(new Uint8Array([0, 50, 80, 200])), 'ADJQyA==');
    t.equal(Base64Util.uint8ArrayToBase64([0, 50, 80, 200]), 'ADJQyA==');
    t.end();
});

test('arrayBufferToBase64', t => {
    t.equal(Base64Util.arrayBufferToBase64(new Uint8Array([0, 50, 80, 200]).buffer), 'ADJQyA==');
    t.end();
});

test('base64ToUint8Array', t => {
    t.same(Base64Util.base64ToUint8Array('ADJQyA=='), new Uint8Array([0, 50, 80, 200]));
    t.end();
});

test('round trips', t => {
    const data = [
        new Uint8Array(new Array(255)
            .fill()
            .map((_, index) => index)
        ),
        new Uint8Array(0),
        new Uint8Array([10, 90, 0, 255, 255, 255, 10, 2]),
        new Uint8Array(10000),
        new Uint8Array(100000)
    ];
    for (const uint8array of data) {
        const uint8ToBase64 = Base64Util.uint8ArrayToBase64(uint8array);
        const arrayToBase64 = Base64Util.uint8ArrayToBase64(Array.from(uint8array));
        const bufferToBase64 = Base64Util.arrayBufferToBase64(uint8array.buffer);
        t.equal(uint8ToBase64, arrayToBase64);
        t.equal(uint8ToBase64, bufferToBase64);
        const decoded = Base64Util.base64ToUint8Array(uint8ToBase64);
        t.same(uint8array, decoded);
    }
    t.end();
});
