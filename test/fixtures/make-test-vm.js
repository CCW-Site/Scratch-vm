const makeTestStorage = require('./make-test-storage');
const VirtualMachine = require('../../src/virtual-machine');
const makeTestVM = function () {
    const vm = new VirtualMachine();
    const storage = makeTestStorage();
    vm.attachStorage(storage);
    const AssetType = storage.AssetType;
    vm.runtime.gandi.supportedAssetTypes = [AssetType.Python, AssetType.Json, AssetType.GLSL, AssetType.Extension];
    return vm;
};

module.exports = makeTestVM;
