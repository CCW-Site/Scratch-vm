const test = require('tap').test;
const Mouse = require('../../src/io/mouse');
const Runtime = require('../../src/engine/runtime');

test('position clamping', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    const BIG = 9999;
    m.postData({
        x: BIG,
        y: BIG,
        canvasWidth: 480,
        canvasHeight: 360
    });
    t.strictEquals(m.getClientX(), BIG);
    t.strictEquals(m.getClientY(), BIG);
    t.strictEquals(m.getScratchX(), 240);
    t.strictEquals(m.getScratchY(), -180);
    t.end();
});

test('mouseButtonDown', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    t.strictEquals(m.getButtonIsDown(0), false);
    t.strictEquals(m.getButtonIsDown(1), false);
    t.strictEquals(m.getButtonIsDown(2), false);
    m.postData({
        isDown: true,
        button: 0
    });
    t.strictEquals(m.getButtonIsDown(0), true);
    t.strictEquals(m.getButtonIsDown(1), false);
    t.strictEquals(m.getButtonIsDown(2), false);
    m.postData({
        isDown: true,
        button: 2
    });
    t.strictEquals(m.getButtonIsDown(0), true);
    t.strictEquals(m.getButtonIsDown(1), false);
    t.strictEquals(m.getButtonIsDown(2), true);
    m.postData({
        isDown: false,
        button: 2
    });
    t.strictEquals(m.getButtonIsDown(0), true);
    t.strictEquals(m.getButtonIsDown(1), false);
    t.strictEquals(m.getButtonIsDown(2), false);
    t.end();
});

test('mouseDown with buttons', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    t.strictEquals(m.getIsDown(), false);
    m.postData({
        isDown: true,
        button: 0
    });
    t.strictEquals(m.getIsDown(), true);
    m.postData({
        isDown: true,
        button: 2
    });
    t.strictEquals(m.getIsDown(), true);
    m.postData({
        isDown: false,
        button: 2
    });
    t.strictEquals(m.getIsDown(), false);
    t.end();
});

test('missing button is treated as left', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    t.strictEquals(m.getButtonIsDown(0), false);
    m.postData({
        isDown: true
    });
    t.strictEquals(m.getButtonIsDown(0), true);
    m.postData({
        isDown: false
    });
    t.strictEquals(m.getButtonIsDown(0), false);
    t.end();
});

test('usesRightClickDown', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    t.strictEquals(m.usesRightClickDown, false);
    t.strictEquals(m.getButtonIsDown(2), false);
    t.strictEquals(m.usesRightClickDown, true);
    t.end();
});

test('no rounding when misc limits disabled', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 241,
        y: 541,
        canvasWidth: 960,
        canvasHeight: 720
    });
    t.equal(m.getScratchX(), -119);
    t.equal(m.getScratchY(), -90);

    rt.setRuntimeOptions({
        miscLimits: false
    });
    t.equal(m.getScratchX(), -119.5);
    t.equal(m.getScratchY(), -90.5);

    t.end();
});

test('accepts 0 as x and y position', t => {
    const rt = new Runtime();
    const m = new Mouse(rt);

    m.postData({
        x: 1,
        y: 2,
        canvasWidth: 480,
        canvasHeight: 360
    });
    t.equal(m.getClientX(), 1);
    t.equal(m.getClientY(), 2);

    m.postData({
        x: 0,
        y: 0,
        canvasWidth: 480,
        canvasHeight: 360
    });
    t.equal(m.getClientX(), 0);
    t.equal(m.getClientY(), 0);

    t.end();
});
