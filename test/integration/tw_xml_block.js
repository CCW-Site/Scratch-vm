const htmlparser = require('htmlparser2');
const {test} = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('XML blocks', t => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testxml',
            name: 'XML Test',
            blocks: [
                {
                    blockType: BlockType.XML,
                    xml: '<test it="works">!</test>'
                }
            ]
        })
    });

    const xmlList = vm.runtime.getBlocksXML();
    t.equal(xmlList.length, 1);

    const parsedXML = htmlparser.parseDOM(xmlList[0].xml);
    t.equal(parsedXML.length, 1);

    const category = parsedXML[0];
    t.equal(category.name, 'category');
    t.equal(category.children.length, 1);

    const label = category.children[0];
    t.equal(label.name, 'test');
    t.equal(label.attribs.it, 'works');
    t.equal(label.children.length, 1);
    t.equal(label.children[0].data, '!');

    t.end();
});
