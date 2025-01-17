const uid = require('./uid');

/**
 * Mutate the given blocks to have new IDs and update all internal ID references.
 * Does not return anything to make it clear that the blocks are updated in-place.
 * @param {array} blocks - blocks to be mutated.
 */
module.exports = blocks => {
    const oldToNew = {};
    const map = {};

    // First update all top-level IDs and create old-to-new mapping
    for (let i = 0; i < blocks.length; i++) {
        const newId = uid();
        const oldId = blocks[i].id;
        map[oldId] = newId;
        blocks[i].id = oldToNew[oldId] = newId;
    }

    // Then go back through and update inputs (block/shadow)
    // and next/parent properties
    for (let i = 0; i < blocks.length; i++) {
        for (const key in blocks[i].inputs) {
            const input = blocks[i].inputs[key];
            input.block = oldToNew[input.block];
            input.shadow = oldToNew[input.shadow];
        }
        if (blocks[i].parent) {
            blocks[i].parent = oldToNew[blocks[i].parent];
        }
        if (blocks[i].next) {
            blocks[i].next = oldToNew[blocks[i].next];
        }
    }

    return map;
};
