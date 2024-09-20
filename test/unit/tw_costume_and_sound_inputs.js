const {test} = require('tap');
const Runtime = require('../../src/engine/runtime');
const BlockType = require('../../src/extension-support/block-type');
const ArgumentType = require('../../src/extension-support/argument-type');

const extension = {
    id: 'costumesoundtest',
    name: 'Costume & Sound',
    blocks: [
        {
            blockType: BlockType.COMMAND,
            opcode: 'costume',
            text: 'costume [a] [b]',
            arguments: {
                a: {
                    type: ArgumentType.COSTUME
                },
                b: {
                    type: ArgumentType.COSTUME,
                    defaultValue: 'default costume'
                }
            }
        },
        {
            blockType: BlockType.COMMAND,
            opcode: 'sound',
            text: 'sound [a] [b]',
            arguments: {
                a: {
                    type: ArgumentType.SOUND
                },
                b: {
                    type: ArgumentType.SOUND,
                    defaultValue: 'default sound'
                }
            }
        }
    ]
};

test('COSTUME and SOUND inputs generate correct scratch-blocks XML', t => {
    const rt = new Runtime();
    rt.on('EXTENSION_ADDED', info => {
        /* eslint-disable max-len */
        t.equal(
            info.blocks[0].xml,
            '<block type="costumesoundtest_costume"><value name="a"><shadow type="looks_costume"></shadow></value><value name="b"><shadow type="looks_costume"><field name="COSTUME">default costume</field></shadow></value></block>'
        );
        t.equal(
            info.blocks[1].xml,
            '<block type="costumesoundtest_sound"><value name="a"><shadow type="sound_sounds_menu"></shadow></value><value name="b"><shadow type="sound_sounds_menu"><field name="SOUND_MENU">default sound</field></shadow></value></block>'
        );
        /* eslint-enable max-len */
        t.end();
    });
    rt._registerExtensionPrimitives(extension);
});
