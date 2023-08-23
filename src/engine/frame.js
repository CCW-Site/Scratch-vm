const Clone = require('../util/clone');
const xmlEscape = require('../util/xml-escape');
const adapter = require('./adapter');

/**
 * @fileoverview
 * Store and mutate the VM frame representation,
 * and handle updates from Scratch Frames events.
 */

/**
 * Create a frame container.
 * @param {Runtime} runtime The runtime this frame container operates within
 */
class Frames {
    constructor (runtime) {
        this.runtime = runtime;

        /**
         * All frames in the workspace.
         * Keys are frame IDs, values are metadata about the frame.
         * @type {Object.<string, Object>}
         */
        this._frames = {};
    }

    /**
     * Provide an object with metadata for the requested frame ID.
     * @param {!string} frameId ID of frame we have stored.
     * @return {?object} Metadata about the frame, if it exists.
     */
    getFrame (frameId) {
        return this._frames[frameId];
    }

    duplicate () {
        const newFrames = new Frames(this.runtime);
        newFrames._frames = Clone.simple(this._frames);
        return newFrames;
    }

    /**
     * Create event listener for frames. Handles validation and
     * serves as a generic adapter between the frames, variables, and the
     * runtime interface.
     * @param {object} e Blockly "frame" event
     */
    blocklyListen (e) {
        // Validate event
        if (typeof e !== 'object' || typeof e.frameId !== 'string') {
            return;
        }

        e.id = e.frameId;

        const currTarget = this.runtime.getEditingTarget();
        if (currTarget) {
            const targetId = currTarget.originalTargetId;
            switch (e.type) {
            case 'frame_end_drag':
                this.runtime.emitFrameDragUpdate(false /* areBlocksOverGui */);
                // Drag frame into another sprite
                if (e.isOutside) {
                    const newFrame = adapter(e);
                    const newBatchElements = e.batchElements.map(elements => elements.map(xml => adapter({xml: xml})));
                    this.runtime.emitFrameEndDrag(newFrame[0], e.id, newBatchElements);
                }
                break;
            case 'frame_drag_outside':
                this.runtime.emitFrameDragUpdate(e.isOutside);
                break;
            case 'frame_create':
                if (this.createFrame(e)) {
                    this.runtime.emitTargetFramesChanged(targetId, ['add', e.id, this._frames[e.id]]);
                }
                break;
            case 'frame_delete':
                if (this.deleteFrame(e.id)) {
                    this.runtime.emitTargetFramesChanged(targetId, ['delete', e.id]);
                }
                break;
            case 'frame_retitle':
                if (this.retitleFrame(e.id, e.newTitle)) {
                    this.runtime.emitTargetFramesChanged(targetId, ['update', e.id, {title: e.newTitle}]);
                }
                break;
            case 'frame_change':
                if (this.changeFrame(e.id, e.element, e.newValue)) {
                    this.runtime.emitTargetFramesChanged(targetId, ['update', e.id, {...e.newValue}]);
                }
                break;
            }
        }


    }

    /**
     * Emit a project changed event
     * that can affect the project state.
     */
    emitProjectChanged () {
        this.runtime.emitProjectChanged();
    }

    /**
     * Frame management: create frames from a `create` event
     * @param {!object} e Blockly create event to be processed
     */
    createFrame (e) {
        // Does the frame already exist?
        // Could happen, e.g., for an unobscured shadow.
        if (this._frames.hasOwnProperty(e.id)) {
            return false;
        }
        // Create new frame.
        this._frames[e.id] = {
            id: e.id,
            title: e.title,
            color: e.color,
            locked: e.locked,
            collapsed: e.collapsed,
            blocks: e.blocks,
            x: e.x,
            y: e.y,
            width: e.width,
            height: e.height
        };
        this.emitProjectChanged();
        return true;
    }

    /**
     * Frame management: delete frame. Does nothing if a frame with the given ID does not exist.
     * @param {!string} id Id of frame to delete
     */
    deleteFrame (id) {
        // Get frame
        const frame = this._frames[id];
        if (!frame) {
            // No frame with the given ID exists
            return false;
        }
    
        // Delete frame itself.
        delete this._frames[id];
        this.emitProjectChanged();
        return true;
    }

    /**
     * Frame management: delete frame. Does nothing if a frame with the given ID does not exist.
     * @param {!string} id Id of frame to delete
     * @param {!string} newTitle New title
     */
    retitleFrame (id, newTitle) {
        // Get frame
        const frame = this._frames[id];
        if (!frame) {
            // No frame with the given ID exists
            return false;
        }
    
        // Retitle this frame
        this._frames[id].title = newTitle;
        this.emitProjectChanged();
        return true;
    }

    /**
     * Frame management: change frame field values
     * @param {!string} id Id of the frame
     * @param {string} element One of 'rect', 'blocks', 'disabled', etc.
     * @param {*} value Previous value of element.
     */
    changeFrame (id, element, value) {
        const frame = this._frames[id];
        let didChange = false;
        if (typeof frame === 'undefined') return didChange;
        switch (element) {
        case 'blocks':
            didChange = value.blocks.length !== frame.blocks.length ||
                !value.blocks.every(ele => frame.blocks.includes(ele));
            frame.blocks = value.blocks;
            break;
        case 'rect':
            didChange = (frame.x !== value.x) || (frame.y !== value.y) ||
                (frame.width !== value.width) || (frame.height !== value.height);
            frame.x = value.x;
            frame.y = value.y;
            frame.width = value.width;
            frame.height = value.height;
            break;
        case 'color':
            didChange = frame.color !== value;
            frame.color = value.color;
            break;
        case 'locked':
            didChange = frame.locked !== value;
            frame.locked = value.locked;
            break;
        case 'collapsed':
            didChange = frame.collapsed !== value;
            frame.collapsed = value.collapsed;
            break;
        default:
            break;
        }
        if (didChange) this.emitProjectChanged();
        return didChange;
    }

    /**
     * Recursively encode an individual frame into a Blockly/scratch-block XML string.
     * @param {!string} id ID of frame to encode.
     * @return {string} String of XML representing this frame.
     */
    toXML (id) {
        const frame = this._frames[id];
        // frame should exist, but currently some frames' next property point
        // to a frameId for non-existent frames. Until we track down that behavior,
        // this early exit allows the project to load.
        if (!frame) return;
        return `<custom-frame
                id="${frame.id}"
                title="${xmlEscape(frame.title)}"
                color="${frame.color}"
                locked="${frame.locked}"
                collapsed="${frame.collapsed}"
                ${frame.blocks ? `blocks="${JSON.stringify(frame.blocks)}"` : ''}
                x="${frame.x}"
                y="${frame.y}"
                width="${frame.width}"
                height="${frame.height}"
            ></custom-frame>`;
    }

    frameToXML (frame) {
        return `<custom-frame
                id="${frame.id}"
                title="${xmlEscape(frame.title)}"
                color="${frame.color}"
                locked="${frame.locked}"
                collapsed="${frame.collapsed}"
                ${frame.blocks ? `blocks="${frame.blocks.join(' ')}"` : ''}
                x="${frame.x}"
                y="${frame.y}"
                width="${frame.width}"
                height="${frame.height}"
            ></custom-frame>`;
    }
}

module.exports = Frames;
