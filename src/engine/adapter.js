const mutationAdapter = require('./mutation-adapter');
const html = require('htmlparser2');
const uid = require('../util/uid');

/**
 * Convert and an individual block DOM to the representation tree.
 * Based on Blockly's `domToBlockHeadless_`.
 * @param {Element} blockDOM DOM tree for an individual block.
 * @param {object} blocks Collection of blocks to add to.
 * @param {boolean} isTopBlock Whether blocks at this level are "top blocks."
 * @param {?string} parent Parent block ID.
 * @return {undefined}
 */
const domToBlock = function (blockDOM, blocks, isTopBlock, parent) {
    if (!blockDOM.attribs.id) {
        blockDOM.attribs.id = uid();
    }

    // Block skeleton.
    const block = {
        id: blockDOM.attribs.id, // Block ID
        opcode: blockDOM.attribs.type, // For execution, "event_whengreenflag".
        inputs: {}, // Inputs to this block and the blocks they point to.
        fields: {}, // Fields on this block and their values.
        next: null, // Next block in the stack, if one exists.
        topLevel: isTopBlock, // If this block starts a stack.
        parent: parent, // Parent block ID, if available.
        shadow: blockDOM.name === 'shadow', // If this represents a shadow/slot.
        // powered by xigua start
        hidden: blockDOM.attribs.hidden === 'true',
        locked: blockDOM.attribs.locked === 'true',
        collapsed: blockDOM.attribs.collapsed === 'true',
        // powered by xigua end
        x: blockDOM.attribs.x, // X position of script, if top-level.
        y: blockDOM.attribs.y // Y position of script, if top-level.
    };

    // Add the block to the representation tree.
    blocks[block.id] = block;

    // Process XML children and find enclosed blocks, fields, etc.
    for (let i = 0; i < blockDOM.children.length; i++) {
        const xmlChild = blockDOM.children[i];
        // Enclosed blocks and shadows
        let childBlockNode = null;
        let childShadowNode = null;
        for (let j = 0; j < xmlChild.children.length; j++) {
            const grandChildNode = xmlChild.children[j];
            if (!grandChildNode.name) {
                // Non-XML tag node.
                continue;
            }
            const grandChildNodeName = grandChildNode.name.toLowerCase();
            if (grandChildNodeName === 'block') {
                childBlockNode = grandChildNode;
            } else if (grandChildNodeName === 'shadow') {
                childShadowNode = grandChildNode;
            }
        }

        // Use shadow block only if there's no real block node.
        if (!childBlockNode && childShadowNode) {
            childBlockNode = childShadowNode;
        }

        // Not all Blockly-type blocks are handled here,
        // as we won't be using all of them for Scratch.
        switch (xmlChild.name.toLowerCase()) {
        case 'field':
        {
            // Add the field to this block.
            const fieldName = xmlChild.attribs.name;
            // Add id in case it is a variable field
            const fieldId = xmlChild.attribs.id;
            let fieldData = '';
            if (xmlChild.children.length > 0 && xmlChild.children[0].data) {
                fieldData = xmlChild.children[0].data;
            } else {
                // If the child of the field with a data property
                // doesn't exist, set the data to an empty string.
                fieldData = '';
            }
            block.fields[fieldName] = {
                name: fieldName,
                id: fieldId,
                value: fieldData
            };
            const fieldVarType = xmlChild.attribs.variabletype;
            if (typeof fieldVarType === 'string') {
                block.fields[fieldName].variableType = fieldVarType;
            }
            break;
        }
        case 'comment':
        {
            block.comment = xmlChild.attribs.id;
            break;
        }
        case 'value':
        case 'statement':
        {
            if (childShadowNode && childBlockNode !== childShadowNode) {
                // Also generate the shadow block.
                domToBlock(childShadowNode, blocks, false, block.id);
            }
            // Recursively generate block structure for input block.
            domToBlock(childBlockNode, blocks, false, block.id);
            // Link this block's input to the child block.
            const inputName = xmlChild.attribs.name;
            block.inputs[inputName] = {
                name: inputName,
                block: childBlockNode.attribs.id,
                shadow: childShadowNode ? childShadowNode.attribs.id : null
            };
            break;
        }
        case 'next':
        {
            if (!childBlockNode || !childBlockNode.attribs) {
                // Invalid child block.
                continue;
            }
            // Recursively generate block structure for next block.
            domToBlock(childBlockNode, blocks, false, block.id);
            // Link next block to this block.
            block.next = childBlockNode.attribs.id;
            break;
        }
        case 'mutation':
        {
            block.mutation = mutationAdapter(xmlChild);
            break;
        }
        }
    }
};

/**
 * Convert and an individual frame DOM to the representation tree.
 * @param {Element} frameDOM DOM tree for an individual frame.
 * @param {object} frames Collection of frames to add to.
 * @return {undefined}
 */
const domToFrame = function (frameDOM, frames) {
    if (!frameDOM.attribs.id) {
        frameDOM.attribs.id = uid();
    }
    const frame = {
        id: frameDOM.attribs.id,
        title: frameDOM.attribs.title,
        color: frameDOM.attribs.color,
        locked: frameDOM.attribs.locked === 'true',
        collapsed: frameDOM.attribs.collapsed === 'true',
        blocks: frameDOM.attribs.blocks.split(' '),
        width: frameDOM.attribs.width,
        height: frameDOM.attribs.height,
        x: frameDOM.attribs.x,
        y: frameDOM.attribs.y,
        blockElements: {}
    };

    for (let i = 0; i < frameDOM.children.length; i++) {
        const element = frameDOM.children[i];
        const tagName = element.name.toLowerCase();
        if (tagName === 'block' || tagName === 'shadow') {
            domToBlock(element, frame.blockElements, true, null);
        }
    }

    // Add the block to the representation tree.
    frames[frame.id] = frame;
};

/**
 * Convert outer elements DOM from a Blockly CREATE event
 * to a usable form for the Scratch runtime.
 * This structure is based on Blockly xml.js:`domToFrame` and `domToBlock`.
 * @param {Element} elementsDOM DOM tree for this event.
 * @return {Array.<object>} Usable list of elements from this CREATE event.
 */
const domToBlocksOrFrames = function (elementsDOM) {
    // At this level, there could be multiple elements adjacent in the DOM tree.
    const elements = {};
    for (let i = 0; i < elementsDOM.length; i++) {
        const element = elementsDOM[i];
        if (!element.name || !element.attribs) {
            continue;
        }
        const tagName = element.name.toLowerCase();
        if (tagName === 'block' || tagName === 'shadow') {
            domToBlock(element, elements, true, null);
        } else if (tagName === 'custom-frame') {
            domToFrame(element, elements);
        }
    }
    // Flatten elements object into a list.
    const elementsList = [];
    for (const b in elements) {
        if (!elements.hasOwnProperty(b)) continue;
        elementsList.push(elements[b]);
    }
    return elementsList;
};

/**
 * Adapter between block creation events and block representation which can be
 * used by the Scratch runtime.
 * @param {object} e `Blockly.events.create` or `Blockly.events.endDrag`
 * @return {Array.<object>} List of blocks from this CREATE event.
 */
const adapter = function (e) {
    // Validate input
    if (typeof e !== 'object') return;
    if (typeof e.xml !== 'object') return;

    return domToBlocksOrFrames(html.parseDOM(e.xml.outerHTML, {decodeEntities: true}));
};

module.exports = adapter;
