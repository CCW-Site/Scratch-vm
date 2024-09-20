const test = require('tap').test;
const path = require('path');
const sb3 = require('../../src/serialization/sb3');
const RenderedTarget = require('../../src/sprites/rendered-target');
const VirtualMachine = require('../../src/index');
const readFileToBuffer = require('../fixtures/readProjectFile').readFileToBuffer;
const SuperManyAssetsSB3ProjectPath = path.resolve(__dirname, '../fixtures/super-many-assets.sb3');

test('async load project all assets', t => {
    const uri = path.resolve(__dirname, '../fixtures/example_sprite.sprite2');
    const sprite = readFileToBuffer(uri);

    const vm = new VirtualMachine();
    vm.asyncLoadingProjectAssetsSupported = true;

    // vm.start();
    // vm.clear();
    // vm.setCompatibilityMode(false);
    // vm.setTurboMode(false);

    vm.loadProject(readFileToBuffer(SuperManyAssetsSB3ProjectPath))
            .then(() => {
                const runtime = vm.runtime;
                // Load project information of the project
                t.type(runtime.targets, 'object');
                t.equal(Array.isArray(runtime.targets), true);
                t.equal(runtime.targets.length, 32);

                // Add another sprite
                vm.addSprite(sprite).then(() => {
                    const targets = vm.runtime.targets;

                    // Test
                    t.type(targets, 'object');
                    t.equal(targets.length, 33);

                    const newTarget = targets[32];

                    t.ok(newTarget instanceof RenderedTarget);
                    t.type(newTarget.id, 'string');
                    t.type(newTarget.blocks, 'object');
                    t.type(newTarget.variables, 'object');
                    const varIds = Object.keys(newTarget.variables);
                    t.type(varIds.length, 1);
                    const variable = newTarget.variables[varIds[0]];
                    t.equal(variable.name, 'foo');
                    t.equal(variable.value, 0);

                    t.equal(newTarget.isOriginal, true);
                    t.equal(newTarget.currentCostume, 0);
                    t.equal(newTarget.isOriginal, true);
                    t.equal(newTarget.isStage, false);
                    t.equal(newTarget.sprite.name, 'Apple');

                    // Delete sprite
                    vm.deleteSprite(runtime.targets[1].id);

                    const result = sb3.serialize(vm.runtime);
                    t.type(JSON.stringify(result), 'string');
                    t.equal(result.targets.length, 32);

                    t.equal(result.targets[1].name, 'Lime_Bat');
                    t.equal(result.targets[1].costumes.length, 12);
                    t.equal(result.targets[1].costumes[0].assetId, '68c8a4bd27ded94c041a4ac65889cbd2');

                    t.equal(result.targets[31].name, 'Apple');
                    t.equal(result.targets[31].costumes[0].assetId, '831ccd4741a7a56d85f6698a21f4ca69');
                    t.end();
                });
            });

});
