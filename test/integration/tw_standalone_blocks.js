const {test, skip} = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const RenderedTarget = require('../../src/sprites/rendered-target');
const Sprite = require('../../src/sprites/sprite');

test('Serializes standalone blocks', t => {
    t.plan(4);

    const vm = new VirtualMachine();

    vm.extensionManager.workerURLs[0] = 'https://example.com/test1.js';
    vm.extensionManager.workerURLs[1] = 'https://example.com/test2.js';
    vm.extensionManager._loadedExtensions.set('test1', 'test.0.0');
    vm.extensionManager._loadedExtensions.set('test2', 'test.1.0');

    // we save extension url in info
    vm.runtime.gandi.addWildExtension({url:'https://example.com/test1.js', id:'test1'});
    vm.runtime.gandi.addWildExtension({url:'https://example.com/test2.js', id:'test2'});
    vm.extensionManager._customExtensionInfo['test1'] = {url:'https://example.com/test1.js', id:'test1'};
    vm.extensionManager._customExtensionInfo['test2'] = {url:'https://example.com/test2.js', id:'test2'}


    const primitiveBlock = {
        id: 'donotcompress1',
        opcode: 'control_if'
    };
    const extensionBlock1 = {
        id: 'donotcompress2',
        opcode: 'test1_something'
    };
    const extensionBlock2 = {
        id: 'donotcompress3',
        opcode: 'test2_something'
    };

    t.same(vm.exportStandaloneBlocks([]), []);
    t.same(vm.exportStandaloneBlocks([primitiveBlock]), [primitiveBlock]);
    t.same(vm.exportStandaloneBlocks([extensionBlock1, extensionBlock2]), {
        blocks: [extensionBlock1, extensionBlock2],
        extensionURLs: {
            test1: 'https://example.com/test1.js',
            test2: 'https://example.com/test2.js'
        }
    });
    t.same(vm.exportStandaloneBlocks([primitiveBlock, extensionBlock2]), {
        blocks: [primitiveBlock, extensionBlock2],
        extensionURLs: {
            test2: 'https://example.com/test2.js'
        }
    });

    t.end();
});

test('Deserializes vanilla standalone blocks', t => {
    t.plan(2);

    const vm = new VirtualMachine();
    const target = new RenderedTarget(new Sprite(null, vm.runtime), vm.runtime);
    vm.runtime.addTarget(target);

    vm.shareBlocksToTarget([
        {
            id: 'abcdef',
            opcode: 'control_if'
        }
    ], target.id).then(() => {
        const createdBlock = Object.values(target.sprite.blocks._blocks)[0];
        t.equal(createdBlock.opcode, 'control_if');
        t.not(createdBlock.id, 'abcdef', 'opcode changed');

        t.end();
    });
});

return;
//TODO - don't support extensionURLs yet
skip('Deserializes standalone blocks with extensions', t => {
    t.plan(3);

    const vm = new VirtualMachine();
    const target = new RenderedTarget(new Sprite(null, vm.runtime), vm.runtime);
    vm.runtime.addTarget(target);

    const events = [];
    vm.securityManager.canLoadExtensionFromProject = url => {
        events.push(`canLoadExtensionFromProject ${url}`);
        return true;
    };
    vm.extensionManager.loadExtensionURL = url => {
        events.push(`loadExtensionURL ${url}`);
        return Promise.resolve();
    };

    vm.shareBlocksToTarget({
        blocks: [
            {
                id: 'fruit',
                opcode: 'pen_clear'
            },
            {
                id: 'vegetable',
                opcode: 'test1_something'
            }
        ],
        extensionURLs: {
            test1: 'https://example.com/test1.js',
            test2: 'https://example.com/should.be.discarded.js',
            pen: 'https://example.com/should.also.be.discarded.js'
        }
    }, target.id).then(() => {
        t.same(events, [
            'canLoadExtensionFromProject https://example.com/test1.js',
            'loadExtensionURL https://example.com/test1.js'
        ]);

        const penBlock = Object.values(target.sprite.blocks._blocks).find(i => i.opcode === 'pen_clear');
        t.not(penBlock.id, 'fruit', 'changed pen block id');

        const extensionBlock = Object.values(target.sprite.blocks._blocks).find(i => i.opcode === 'test1_something');
        t.not(extensionBlock.id, 'vegetable', 'changed extension block id');

        t.end();
    });
});
