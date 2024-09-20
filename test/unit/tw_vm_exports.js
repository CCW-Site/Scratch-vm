const {test} = require('tap');
const VM = require('../../src/virtual-machine');

test('exports exist', t => {
    const vm = new VM();
    t.type(vm.exports.Sprite, 'function');
    t.type(vm.exports.RenderedTarget, 'function');
    t.end();
});

test('JSZip', t => {
    const JSZip = new VM().exports.JSZip;
    const zip = new JSZip();
    t.type(zip.file, 'function');
    t.end();
});
