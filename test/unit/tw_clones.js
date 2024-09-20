const Runtime = require('../../src/engine/runtime');
const Sprite = require('../../src/sprites/sprite');

const {test} = require('tap');

test('clone counter', t => {
    const rt = new Runtime();
    const sprite = new Sprite(null, rt);
    const original = sprite.createClone();
    t.equal(rt._cloneCounter, 0);
    const clone = original.makeClone();
    t.equal(rt._cloneCounter, 1);
    clone.dispose();
    t.equal(rt._cloneCounter, 0);
    original.dispose();
    t.equal(rt._cloneCounter, 0);
    t.end();
});
