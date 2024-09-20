const {test} = require('tap');
const htmlparser = require('htmlparser2');
const VM = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('buttons', t => {
    const vm = new VM();
    let buttonRunCount = 0;
    vm.extensionManager._registerInternalExtension({
        'getInfo': () => ({
            id: 'test',
            name: 'Test',
            blocks: [
                {
                    blockType: BlockType.BUTTON,
                    text: 'button text <>',
                    func: 'callback &"\'<>'
                },
                {
                    blockType: BlockType.BUTTON,
                    text: 'make variable <>',
                    func: 'MAKE_A_VARIABLE'
                },
                {
                    blockType: BlockType.BUTTON,
                    text: 'make procedure ""',
                    func: 'MAKE_A_PROCEDURE'
                },
                {
                    blockType: BlockType.BUTTON,
                    text: 'make list &&',
                    func: 'MAKE_A_LIST'
                }
            ]
        }),
        'callback &"\'<>': () => {
            buttonRunCount++;
        }
    });

    const xml = vm.runtime.getBlocksXML();
    t.equal(xml.length, 1);

    const parsed = htmlparser.parseDOM(xml[0].xml, {
        decodeEntities: true
    });
    t.equal(parsed.length, 1);

    const category = parsed[0];
    t.equal(category.children.length, 4);

    const customButton = category.children[0];
    t.equal(customButton.name, 'button');
    t.equal(customButton.attribs.text, 'button text <>');
    t.equal(customButton.attribs.callbackkey, 'EXTENSION_CALLBACK');
    t.equal(customButton.attribs.callbackdata, 'test_callback &"\'<>');

    const makeVariable = category.children[1];
    t.equal(makeVariable.attribs.text, 'make variable <>');
    t.equal(makeVariable.attribs.callbackkey, 'MAKE_A_VARIABLE');

    const makeProcedure = category.children[2];
    t.equal(makeProcedure.attribs.text, 'make procedure ""');
    t.equal(makeProcedure.attribs.callbackkey, 'MAKE_A_PROCEDURE');

    const makeList = category.children[3];
    t.equal(makeList.attribs.text, 'make list &&');
    t.equal(makeList.attribs.callbackkey, 'MAKE_A_LIST');

    for (let i = 1; i <= 3; i++) {
        const builtinButton = category.children[i];
        t.equal(builtinButton.name, 'button');
        t.equal(builtinButton.attribs.callbackdata, undefined);
    }

    t.equal(buttonRunCount, 0);
    vm.handleExtensionButtonPress(customButton.attribs.callbackdata);
    t.equal(buttonRunCount, 1);
    vm.handleExtensionButtonPress(customButton.attribs.callbackdata);
    t.equal(buttonRunCount, 2);

    t.end();
});
