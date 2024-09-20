const path = require('path');
const test = require('tap').test;
const makeTestStorage = require('../fixtures/make-test-storage');

const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');
const VirtualMachine = require('../../src/virtual-machine');

const project = require('../fixtures/gandi/project.json');
const window = global;
global.prompt == "function" || (function(window) {
    window.prompt = function prompt(title) {
      // title element
      // create input with default text
      // overlay
      // dialog
      // OK white on blue
      // Cancel black on white
      // return value of OK (value of input) or Cancel (null)
    }
  })(global);

const initVM = function () {
    const vm = new VirtualMachine();
    const storage = makeTestStorage();
    vm.attachStorage(storage);
    const AssetType = storage.AssetType;
    vm.runtime.gandi.supportedAssetTypes = [AssetType.Python, AssetType.Json, AssetType.GLSL, AssetType.Extension];
    return vm;
}

test('init Gandi Object', t => {
    const vm = initVM();
    vm.loadProject(project).then(()=> {
        const gandiObject = vm.runtime.gandi;
        t.type(gandiObject, 'object');
        t.type(gandiObject.assets, 'Array');
        t.equal(gandiObject.assets.length, 0);
        t.type(gandiObject.wildExtensions, 'object');
        t.end();
    })
});
