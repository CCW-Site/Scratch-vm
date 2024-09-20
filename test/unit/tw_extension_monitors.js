const {test} = require('tap');
const Runtime = require('../../src/engine/runtime');
const BlockType = require('../../src/extension-support/block-type');
const ArgumentType = require('../../src/extension-support/argument-type');

test('Boolean blocks can be monitors', t => {
    const rt = new Runtime();
    rt._registerExtensionPrimitives({
        id: 'testextension',
        blocks: [
            {
                blockType: BlockType.REPORTER,
                opcode: 'reporter1',
                text: 'reporter 1'
            },
            {
                blockType: BlockType.REPORTER,
                opcode: 'reporter2',
                text: 'reporter 2',
                disableMonitor: true
            },
            {
                blockType: BlockType.REPORTER,
                opcode: 'reporter3',
                text: 'reporter 3 [INPUT]',
                arguments: {
                    type: ArgumentType.STRING,
                    defaultValue: ''
                }
            },
            {
                blockType: BlockType.BOOLEAN,
                opcode: 'boolean1',
                text: 'boolean 1'
            },
            {
                blockType: BlockType.BOOLEAN,
                opcode: 'boolean2',
                text: 'boolean 2',
                disableMonitor: true
            },
            {
                blockType: BlockType.BOOLEAN,
                opcode: 'boolean3',
                text: 'boolean 3 [INPUT]',
                arguments: {
                    type: ArgumentType.STRING,
                    defaultValue: ''
                }
            }
        ]
    });

    const json = rt.getBlocksJSON();
    t.equal(json.length, 6);
    t.equal(json[0].checkboxInFlyout, true);
    t.equal(json[1].checkboxInFlyout, undefined);
    t.equal(json[2].checkboxInFlyout, undefined);
    t.equal(json[3].checkboxInFlyout, true);
    t.equal(json[4].checkboxInFlyout, undefined);
    t.equal(json[5].checkboxInFlyout, undefined);
    t.end();
});
