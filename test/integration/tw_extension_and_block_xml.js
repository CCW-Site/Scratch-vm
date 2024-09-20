const fs = require('fs');
const pathUtil = require('path');
const htmlparser = require('htmlparser2');
const {test} = require('tap');
const VirtualMachine = require('../../src/virtual-machine');
const Runtime = require('../../src/engine/runtime');
const ArgumentType = require('../../src/extension-support/argument-type');
const BlockType = require('../../src/extension-support/block-type');

const baseExtensionInfo = {
    id: 'xmltest',
    name: `<>"'&& Name`,
    docsURI: `https://example.com/&''""<<>>`,
    menuIconURI: `data:<>&"' category icon`,
    blocks: [
        {
            blockType: `block type <>&"'`,
            opcode: `opcode <>&"'`,
            text: `<>&"' [string argument <>&"'] [inputMenu <"'&>] [fieldMenu <"'&>] [image <"'&>]`,
            blockIconURI: `'data:<>&"' block icon`,
            arguments: {
                [`string argument <>&"'`]: {
                    type: ArgumentType.STRING,
                    defaultValue: `default string <>&"'`
                },
                [`inputMenu <"'&>`]: {
                    type: ArgumentType.STRING,
                    menu: `input <>&"'`,
                    defaultValue: `default input <>&"'`
                },
                [`fieldMenu <"'&>`]: {
                    type: `argument type <>&"'`,
                    menu: `field <>&"'`,
                    defaultValue: `default field <>&"'`
                },
                [`image <"'&>`]: {
                    type: ArgumentType.IMAGE,
                    dataURI: `data:<>&"' image input`
                }
            }
        },
        {
            opcode: 'button',
            blockType: BlockType.BUTTON,
            text: `'"><& button text`,
            func: `'"><& func`
        }
    ],
    menus: {
        [`input <>&"'`]: {
            acceptReporters: true,
            items: [
                `1 <>&"`,
                `2 <>&"`,
                `3 <>&"`
            ]
        },
        [`field <>&"'`]: {
            acceptReporters: false,
            items: [
                `1 <>&"`,
                `2 <>&"`,
                `3 <>&"`
            ]
        }
    }
};

test('XML escaped in Runtime.getBlocksXML()', t => {
    // While these changes will make the extension unusable in a real editor environment, we still
    // want to make sure that these fields are actually being escaped.
    const mangledExtension = JSON.parse(JSON.stringify(baseExtensionInfo));
    mangledExtension.color1 = `<"'&amp;amp;color1>`;
    mangledExtension.color2 = `<"'&amp;amp;color2>`;
    mangledExtension.color3 = `<"'&amp;amp;color3>`;

    const vm = new VirtualMachine();
    vm.extensionManager._registerInternalExtension({
        getInfo: () => mangledExtension
    });

    const xmlList = vm.runtime.getBlocksXML();
    t.type(xmlList, Array, 'getBlocksXML returns array');
    t.equal(xmlList.length, 1, 'array has 1 item');

    const xmlEntry = xmlList[0];
    t.equal(xmlEntry.id, `xmltest`, 'id worked');

    const parsedXml = htmlparser.parseDOM(xmlEntry.xml);
    t.equal(parsedXml.length, 1, 'xml has 1 root node');

    /*
    Expected XML structure:

    <category name="..." colour="..." secondaryColour="..." iconURI="...">
        <button ... web-class="..."></button>
        <block type="...">
            <value name="...">
                <shadow type="text">
                    <field name="TEXT">default value</field>
                </shadow>
            </value>
            <value name="...">
                <shadow type="...">
                    <field name="...">default value</field>
                </shadow>
            </value>
            <field name="...">default value</field>
        </block>
        <button text="..." callbackKey="..."></button>
    </category>
    */

    const category = parsedXml[0];
    t.equal(category.name, 'category', 'has <category>');
    t.equal(category.attribs.name, '&lt;&gt;&quot;&apos;&amp;&amp; Name', 'escaped category name');
    t.equal(category.attribs.id, 'xmltest', 'category id');
    t.equal(category.attribs.colour, '&lt;&quot;&apos;&amp;amp;amp;color1&gt;', 'escaped category color');
    t.equal(category.attribs.secondarycolour, '&lt;&quot;&apos;&amp;amp;amp;color2&gt;', 'escaped category color 2');
    t.equal(category.attribs.iconuri, 'data:&lt;&gt;&amp;&quot;&apos; category icon', 'escaped category icon');
    t.equal(category.children.length, 3, 'category has 3 children');

    // Check docsURI
    const docsButton = category.children[0];
    t.equal(docsButton.name, 'button', 'has docs <button>');
    t.equal(docsButton.attribs.callbackkey, 'OPEN_DOCUMENTATION');
    t.equal(
        docsButton.attribs.callbackdata,
        'https://example.com/&amp;&apos;&apos;&quot;&quot;&lt;&lt;&gt;&gt;',
        'escaped docs callback data'
    );
    t.equal(docsButton.children.length, 0, 'docs button has 0 children');

    // Check the block
    const block = category.children[1];
    t.equal(block.name, 'block', 'has <block>');
    t.equal(
        block.attribs.type,
        'xmltest_opcode &lt;&gt;&amp;&quot;&apos;',
        'escaped block id'
    );
    t.equal(block.children.length, 3, 'block has 3 children');

    // Check the block's string input
    const stringInput = block.children[0];
    t.equal(stringInput.name, 'value', 'string input is <value>');
    t.equal(stringInput.attribs.name, 'string argument &lt;&gt;&amp;&quot;&apos;', 'escaped string input id');
    t.equal(stringInput.children.length, 1, 'string input has 1 child');

    const stringInputShadow = stringInput.children[0];
    t.equal(stringInputShadow.name, 'shadow', 'string input shadow is <shadow>');
    t.equal(stringInputShadow.attribs.type, 'text', 'string input shadow is of type text');
    t.equal(stringInputShadow.children.length, 1, 'string input shadow has 1 child');

    const stringInputField = stringInputShadow.children[0];
    t.equal(stringInputField.name, 'field', 'string input field is <field>');
    t.equal(stringInputField.children.length, 1, 'field input has 1 child');

    const stringInputFieldContent = stringInputField.children[0];
    t.equal(
        stringInputFieldContent.data,
        'default string &lt;&gt;&amp;&quot;&apos;',
        'escaped string input default value'
    );

    // Check the block's menu input
    const menuInput = block.children[1];
    t.equal(menuInput.name, 'value', 'menu input is <value>');
    t.equal(menuInput.attribs.name, 'inputMenu &lt;&quot;&apos;&amp;&gt;', 'escaped menu input id');
    t.equal(menuInput.children.length, 1, 'menu input has 1 child');

    const inputShadow = menuInput.children[0];
    t.equal(inputShadow.name, 'shadow', 'input shadow is <shadow>');
    t.equal(
        inputShadow.attribs.type,
        'xmltest_menu_input &lt;&gt;&amp;&quot;&apos;',
        'escaped menu id'
    );
    t.equal(inputShadow.children.length, 1, 'input shadow has 1 child');

    const inputField = inputShadow.children[0];
    t.equal(inputField.name, 'field', 'input field is <field>');
    t.equal(inputField.children.length, 1, 'input field has 1 child');

    const inputFieldContent = inputField.children[0];
    t.equal(inputFieldContent.data, 'default input &lt;&gt;&amp;&quot;&apos;', 'escaped input default value');

    // Check the block's menu field
    const menuField = block.children[2];
    t.equal(menuField.name, 'field', 'menu field is <field>');
    t.equal(menuField.attribs.name, 'fieldMenu &lt;&quot;&apos;&amp;&gt;', 'escaped field menu id');
    t.equal(menuField.children.length, 1, 'menu field has 1 child');

    const menuFieldContent = menuField.children[0];
    t.equal(menuFieldContent.data, 'default field &lt;&gt;&amp;&quot;&apos;', 'escaped field default value');

    // Check the button block
    const button = category.children[2];
    t.equal(button.name, 'button', 'button is <button>');
    t.equal(button.attribs.text, '&apos;&quot;&gt;&lt;&amp; button text', 'escaped button text');

    t.end();
});

test('ID escaped in Runtime.getBlocksXML()', t => {
    // Previous test needs to use an actually valid extension ID. For this test we will
    // register an invalid extension just to make sure that the ID ends up being escaped.

    const rt = new Runtime();
    rt._registerExtensionPrimitives({
        id: `id <>&"'`,
        name: 'name',
        blocks: []
    });

    const xmlList = rt.getBlocksXML();
    const xmlEntry = xmlList[0];
    t.equal(xmlEntry.id, `id <>&"'`, 'extension id outside of xml unchanged');

    const parsedXML = htmlparser.parseDOM(xmlEntry.xml);
    t.equal(parsedXML.length, 1, 'XML has 1 root node');

    const category = parsedXML[0];
    t.equal(category.name, 'category', 'category is <category>');
    t.equal(category.attribs.id, 'id &lt;&gt;&amp;&quot;&apos;', 'escaped extension id');
    t.equal(category.children.length, 0, 'category has no children');

    t.end();
});

test('XML escaped in Blocks.toXML()', async t => {
    const vm = new VirtualMachine();
    const serviceName = vm.extensionManager._registerInternalExtension({
        getInfo: () => baseExtensionInfo
    });
    // override clear as default implementation disposes of the runtime
    vm.clear = () => {
        vm.runtime.dispose();
        vm.editingTarget = null;
        vm.emitTargetsUpdate(false /* Don't emit project change */);
    }

    vm.extensionManager._loadedExtensions.set(baseExtensionInfo.id, serviceName);

    const fixturePath = pathUtil.join(__dirname, '..', 'fixtures', 'tw-project-using-xml-extension.sb3');

    const checkVM = () => {
        const generatedXML = vm.runtime.targets[0].blocks.toXML();
        const parsedXML = htmlparser.parseDOM(generatedXML);

        /*
        Example expected XML:

        <block id="..." type="xmltest_opcode" x="..." y="...">
            <value name="string argument">
                <shadow id="..." type="text">
                    <field name="TEXT">default string</field>
                </shadow>
            </value>
            <value name="inputMenu">
                <shadow id="..." type="xmltest_menu_input">
                    <field name="input">default input</field>
                </shadow>
            </value>
            <field name="fieldMenu">default field</field>
        </block>
        */

        t.equal(parsedXML.length, 1, 'XML has 1 root');

        // Check the block itself
        const block = parsedXML[0];
        t.equal(block.name, 'block', 'block is <block>');
        t.equal(
            block.attribs.type,
            'xmltest_opcode &lt;&gt;&amp;&quot;&apos;',
            'escaped block opcode'
        );
        t.equal(block.children.length, 3, 'block has 3 children');

        // Check the string input
        const stringInputValue = block.children[0];
        t.equal(stringInputValue.name, 'value', 'string input is <value>');
        t.equal(
            stringInputValue.attribs.name,
            'string argument &lt;&gt;&amp;&quot;&apos;',
            'escaped string input name'
        );
        t.equal(stringInputValue.children.length, 1, 'string input has 1 child');

        const stringInputShadow = stringInputValue.children[0];
        t.equal(stringInputShadow.name, 'shadow', 'string input shadow is <shadow>');
        t.equal(stringInputValue.children.length, 1, 'string input shadow has 1 child');

        const stringInputField = stringInputShadow.children[0];
        t.equal(stringInputField.name, 'field', 'string input field is <field>');
        t.equal(stringInputField.children.length, 1, 'string input field has 1 child');

        const stringInputFieldContent = stringInputField.children[0];
        t.equal(stringInputFieldContent.data, `default string &lt;&gt;&amp;&quot;&apos;`, 'escaped string input value');

        // Check the input menu
        const inputMenuValue = block.children[1];
        t.equal(inputMenuValue.name, 'value', 'input menu is <value>');
        t.equal(inputMenuValue.attribs.name, 'inputMenu &lt;&quot;&apos;&amp;&gt;', 'escaped input menu name');
        t.equal(inputMenuValue.children.length, 1, 'input menu has 1 child');

        const inputMenuShadow = inputMenuValue.children[0];
        t.equal(inputMenuShadow.name, 'shadow', 'input menu shadow is <shadow>');
        t.equal(inputMenuValue.children.length, 1, 'input menu shadow has 1 child');

        const inputMenuField = inputMenuShadow.children[0];
        t.equal(inputMenuField.name, 'field', 'input menu field is <field>');
        t.equal(inputMenuField.children.length, 1, 'input menu field has 1 child');

        const inputMenuFieldContent = inputMenuField.children[0];
        t.equal(inputMenuFieldContent.data, `default input &lt;&gt;&amp;&quot;&apos;`, 'escaped input menu value');

        // Check the field menu
        const fieldMenu = block.children[2];
        t.equal(fieldMenu.name, 'field', 'field menu is <field>');
        t.equal(fieldMenu.attribs.name, 'fieldMenu &lt;&quot;&apos;&amp;&gt;', 'escaped field menu name');
        t.equal(fieldMenu.children.length, 1, 'field menu has 1 child');

        const fieldMenuContent = fieldMenu.children[0];
        t.equal(fieldMenuContent.data, `default field &lt;&gt;&amp;&quot;&apos;`, 'escaped input menu value');
    };

    // Check that we can deserialize a project using this extension.
    await vm.loadProject(fs.readFileSync(fixturePath));
    checkVM();

    // Check that it still works after serialization and deserialization.
    const serialized = await vm.saveProjectSb3('uint8array');
    await vm.loadProject(serialized);
    checkVM();

    t.end();
});
