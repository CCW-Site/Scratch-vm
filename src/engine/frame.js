const Clone = require('../util/clone');

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
        const currTarget = this.runtime.getEditingTarget();
        if (!currTarget) return;
        // Frame create/update/destroy
        switch (e.type) {
        case 'frame_create':
            if (this.createFrame(e)) {
                this.runtime.emitTargetFramesChanged(currTarget.id, ['add', e.frameId, this._frames[e.frameId]]);
            }
            break;
        case 'frame_delete':
            if (this.deleteFrame(e.frameId)) {
                this.runtime.emitTargetFramesChanged(currTarget.id, ['delete', e.frameId]);
            }
            break;
        case 'frame_retitle':
            if (this.retitleFrame(e.frameId, e.newTitle)) {
                this.runtime.emitTargetFramesChanged(currTarget.id, ['update', e.frameId, {title: e.newTitle}]);
            }
            break;
        case 'frame_change':
            if (this.changeFrame(e.frameId, e.element, e.newValue)) {
                this.runtime.emitTargetFramesChanged(currTarget.id, ['update', e.frameId, {...e.newValue}]);
            }
            this.changeFrame(e.frameId, e.element, e.newValue);
            break;
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
        if (this._frames.hasOwnProperty(e.frameId)) {
            return false;
        }
        // Create new frame.
        this._frames[e.frameId] = {
            id: e.frameId,
            title: e.title,
            blocks: e.blocks,
            x: e.x,
            y: e.y,
            width: e.width,
            height: e.height
        };
        return true;
    }

    /**
     * Frame management: delete frame. Does nothing if a frame with the given ID does not exist.
     * @param {!string} frameId Id of frame to delete
     */
    deleteFrame (frameId) {
        // Get frame
        const frame = this._frames[frameId];
        if (!frame) {
            // No frame with the given ID exists
            return false;
        }
    
        // Delete frame itself.
        delete this._frames[frameId];
        this.emitProjectChanged();
        return true;
    }

    /**
     * Frame management: delete frame. Does nothing if a frame with the given ID does not exist.
     * @param {!string} frameId Id of frame to delete
     * @param {!string} newTitle New title
     */
    retitleFrame (frameId, newTitle) {
        // Get frame
        const frame = this._frames[frameId];
        if (!frame) {
            // No frame with the given ID exists
            return false;
        }
    
        // Retitle this frame
        this._frames[frameId].title = newTitle;
        this.emitProjectChanged();
        return true;
    }

    /**
     * Frame management: change frame field values
     * @param {!string} frameId Id of the frame
     * @param {string} element One of 'rect', 'blocks', 'disabled', etc.
     * @param {*} value Previous value of element.
     */
    changeFrame (frameId, element, value) {
        const frame = this._frames[frameId];
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
        default:
            break;
        }
        if (didChange) this.emitProjectChanged();
        return didChange;
    }

    /**
     * Recursively encode an individual frame into a Blockly/scratch-block XML string.
     * @param {!string} frameId ID of frame to encode.
     * @return {string} String of XML representing this frame.
     */
    toXML (frameId) {
        const frame = this._frames[frameId];
        // frame should exist, but currently some frames' next property point
        // to a frameId for non-existent frames. Until we track down that behavior,
        // this early exit allows the project to load.
        if (!frame) return;
        return `<frame
                id="${frame.id}"
                title="${frame.title}"
                ${frame.blocks ? `blocks="${JSON.stringify(frame.blocks)}"` : ''}
                x="${frame.x}"
                y="${frame.y}"
                width="${frame.width}"
                height="${frame.height}"
            ></frame>`;
    }

    frameToXML (frame) {
        return `<frame
                id="${frame.id}"
                title="${frame.title}"
                ${frame.blocks ? `blocks="${frame.blocks.join(' ')}"` : ''}
                x="${frame.x}"
                y="${frame.y}"
                width="${frame.width}"
                height="${frame.height}"
            ></frame>`;
    }
}

module.exports = Frames;
