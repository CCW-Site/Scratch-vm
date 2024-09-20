//TODO - support 'from_extension' 'default_extension_colors'
const test = require('tap').skip;
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('does not duplicate', t => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testextension',
            name: 'test',
            blockIconURI: 'data:whatever',
            blocks: [
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'test',
                    extensions: [
                        'something_invalid',
                        'from_extension',
                        'scratch_extension',
                        'default_extension_colors'
                    ]
                }
            ]
        })
    });

    const blocks = vm.runtime.getBlocksJSON();
    t.same(
        blocks[0].extensions,
        ['from_extension', 'default_extension_colors', 'scratch_extension', 'something_invalid']
    );
    t.end();
});

test('block icon', t => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testextension',
            name: 'test',
            blocks: [
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'nothing'
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'empty',
                    extensions: []
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'iconNothing',
                    blockIconURI: 'data:whatever'
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'iconEmpty',
                    blockIconURI: 'data:whatever',
                    extensions: []
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'iconSomething',
                    blockIconURI: 'data:whatever',
                    extensions: ['colours_sensing']
                }
            ]
        })
    });

    const blocks = vm.runtime.getBlocksJSON();
    t.same(blocks[0].extensions, ['from_extension', 'default_extension_colors']);
    t.same(blocks[1].extensions, ['from_extension', 'default_extension_colors']);
    t.same(blocks[2].extensions, ['from_extension', 'default_extension_colors', 'scratch_extension']);
    t.same(blocks[3].extensions, ['from_extension', 'default_extension_colors', 'scratch_extension']);
    t.same(
        blocks[4].extensions,
        ['from_extension', 'default_extension_colors', 'scratch_extension', 'colours_sensing']
    );

    t.end();
});

test('category icon', t => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testextension',
            name: 'test',
            blockIconURI: 'data:whatever',
            blocks: [
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'nothing'
                }
            ]
        })
    });

    const blocks = vm.runtime.getBlocksJSON();
    t.same(blocks[0].extensions, ['default_extension_colors', 'scratch_extension']);
    t.end();
});

test('category color', t => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testextension',
            name: 'test',
            blockIconURI: 'data:whatever',
            color1: '#123456',
            blocks: [
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'nothing'
                }
            ]
        })
    });

    const blocks = vm.runtime.getBlocksJSON();
    t.same(blocks[0].extensions, ['from_extension', 'scratch_extension']);
    t.end();
});

test('category color', t => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testextension',
            name: 'test',
            blocks: [
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'default'
                },
                {
                    blockType: BlockType.COMMAND,
                    opcode: 'custom',
                    color3: '#123456'
                }
            ]
        })
    });

    const blocks = vm.runtime.getBlocksJSON();
    t.same(blocks[0].extensions, ['from_extension', 'default_extension_colors']);
    t.same(blocks[1].extensions, ['from_extension']);
    t.end();
});
