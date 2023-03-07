const path = require('path');
const test = require('tap').test;
const makeTestStorage = require('../fixtures/make-test-storage');

const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');
const VirtualMachine = require('../../src/virtual-machine');

const project = require('../fixtures/gandi/project.json');

test('loadAndParseGandiAssets', t => {

    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());

    vm.loadProject(project).then(()=> {
        const gandiObject = vm.runtime.gandi;
        // console.log('test loadAndParseGandiAssets >> gandiObject: ', gandiObject);
        t.type(gandiObject, 'object');
        t.type(gandiObject.assets, 'array');
        t.type(gandiObject.wildExtensions, 'object');

        t.equal(gandiObject.assets[0].name, 'main');
        t.equal(gandiObject.assets.length, 2);
        t.deepEqual(Object.keys(gandiObject.wildExtensions), ['unitTestExt1', 'unitTestExt2']);
        t.end();
    })
});

test('collectGandiAssets', t => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());
    vm.loadProject(project).then(()=> {
        const allAssets = vm.assets;
        // console.log('test collectGandiAssets >> gandiObject: ', allAssets);
        t.end();
    })
});
