const test = require('tap').test;
const VirtualMachine = require('../../src/virtual-machine');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const path = require('path');

const makeTestStorage = require('../fixtures/make-test-storage');

// test('#init uid with no uid project', async t => {
//     //从没有 uid 的 project.json 读取工程，保存所有 asset 都生成 uid
//     const vm = new VirtualMachine();
//     vm.attachStorage(makeTestStorage());
//     const uri = path.resolve(__dirname, '../fixtures/gandi/gandi_asset_no_uid.sb3');
//     const projectData = readFileToBuffer(uri);
//     await vm.loadProject(projectData);
//     const uidArray = [];
//     let assetCount = 0;
//     vm.assets.forEach(asset => {
//         if (asset.uid && uidArray.includes(asset.uid)) {
//             uidArray.push(asset.uid);
//             assetCount++;
//         }
//     });
//     t.equal(uidArray.length, assetCount, 'init all uid success');
//     t.end();
// });

// test('#keep uid constant when save', async t => {
//     // 保证 uid 保存前后不会发生改变
//     const projectObj = require('../fixtures/gandi/gandi_asset_uid.js');
//     const assets = {};
//     projectObj.targets.forEach(target => {
//         target.costumes.forEach(obj => {
//             assets[obj.uid] = obj.assetId;
//         });
//         target.sounds.forEach(obj => {
//             assets[obj.uid] = obj.assetId;
//         });
//     });
//     if (projectObj.gandi) {
//         projectObj.gandi.assets(obj => {
//             assets[obj.uid] = obj.assetId;
//         });
//     }

//     const vm = new VirtualMachine();
//     vm.attachStorage(makeTestStorage());
//     const uri = path.resolve(__dirname, '../fixtures/gandi/gandi_asset_uid.sb3');
//     const projectData = readFileToBuffer(uri);
//     await vm.loadProject(projectData);
//     const vmAssets = {};
//     vm.runtime.targets.forEach(target => {
//         target.sprite.costumes.forEach(obj => {
//             vmAssets[obj.uid] = obj.assetId;
//         });
//         target.sprite.sounds.forEach(obj => {
//             vmAssets[obj.uid] = obj.assetId;
//         });
//     });
//     t.same(assets, vmAssets, 'uid should be same after saved');
//     t.end();
// });

test('#new & duplicate asset with new uid', async t => {
    const vm = new VirtualMachine();
    vm.attachStorage(makeTestStorage());
    const uri = path.resolve(__dirname, '../fixtures/gandi/gandi_asset_uid.sb3');
    const projectData = readFileToBuffer(uri);
    await vm.loadProject(projectData);

    const newCostume = {
        name: 'newCostume',
        baseLayerID: 0,
        baseLayerMD5: 'f9a1c175dbe2e5dee472858dd30d16bb.svg',
        bitmapResolution: 1,
        rotationCenterX: 47,
        rotationCenterY: 55
    };

    const newSound = {
        name: 'newSound',
        soundName: 'meow',
        soundID: 0,
        md5: '83c36d806dc92327b9e7049a565c6bff.wav',
        sampleCount: 18688,
        rate: 22050
    };

    await vm.addSound(newSound);
    await vm.addCostume('f9a1c175dbe2e5dee472858dd30d16bb.svg', newCostume);
    await vm.duplicateCostume(0);
    await vm.duplicateSound(0);

    const vmAssets = {};
    let count = 0;
    vm.runtime.targets.forEach(target => {
        target.sprite.costumes.forEach(obj => {
            vmAssets[obj.uid] = obj.name;
            count++;
        });
        target.sprite.sounds.forEach(obj => {
            vmAssets[obj.uid] = obj.name;
            count++;
        });
    });
    t.equal(count, Object.keys(vmAssets).length, 'all asset has different uid');
    t.ok(newCostume.hasOwnProperty('uid'), 'addCostume has uid property');
    t.ok(newSound.hasOwnProperty('uid'), 'addSound has uid property');
    t.end();
});
