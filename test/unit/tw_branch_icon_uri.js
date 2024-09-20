const {test} = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('branchIconURI', t => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testextension',
            name: 'test',
            blocks: [
                {
                    blockType: BlockType.LOOP,
                    opcode: 'block1',
                    text: 'no custom icon'
                },
                {
                    blockType: BlockType.LOOP,
                    opcode: 'block2',
                    text: 'LOOP with custom icon',
                    branchIconURI: 'data:whatever1'
                },
                {
                    blockType: BlockType.CONDITIONAL,
                    opcode: 'block3',
                    text: 'CONDITIONAL with custom icon',
                    branchIconURI: 'data:whatever2'
                },
                {
                    blockType: BlockType.LOOP,
                    opcode: 'block4',
                    text: 'LOOP with no icon',
                    branchIconURI: ''
                }
            ]
        })
    });

    const blocks = vm.runtime.getBlocksJSON();
    t.equal(blocks[0].args2[0].src, 'media://repeat.svg', 'default custom icon');
    t.equal(blocks[1].args2[0].src, 'data:whatever1', 'LOOP with custom icon');
    t.equal(blocks[2].args2[0].src, 'data:whatever2', 'CONDITIONAL with custom icon');
    t.same(blocks[3].args2, null, 'LOOP with no icon');

    t.end();
});
