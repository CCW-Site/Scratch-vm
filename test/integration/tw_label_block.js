const htmlparser = require('htmlparser2');
const {test} = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');

test('Label blocks', t => {
    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => ({
            id: 'testlabel',
            name: `Label Test`,
            blocks: [
                {
                    blockType: BlockType.LABEL,
                    text: 'test <>&"\''
                }
            ]
        })
    });

    const xmlList = vm.runtime.getBlocksXML();
    t.equal(xmlList.length, 1);

    const parsedXML = htmlparser.parseDOM(xmlList[0].xml);
    // Expecting something like this:
    // <category name="Label Test" id="testlabel" colour="#0FBD8C" secondaryColour="#0DA57A">
    //   <label text="&lt;&gt;&amp;&quot;&apos;"></label>
    // </category>
    t.equal(parsedXML.length, 1);

    const category = parsedXML[0];
    t.equal(category.name, 'category');
    t.equal(category.children.length, 1);

    const label = category.children[0];
    t.equal(label.name, 'label');
    t.equal(label.children.length, 0);
    t.equal(label.attribs.text, 'test &lt;&gt;&amp;&quot;&apos;');

    t.end();
});
