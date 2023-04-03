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

        // Frame create/update/destroy
        switch (e.type) {
        case 'frame_create':
            this.createFrame(e);
            break;
        case 'frame_delete':
            this.deleteFrame(e.frameId);
            break;
        case 'frame_retitle':
            this.retitleFrame(e.frameId, e.newTitle);
            break;
        case 'frame_change':
            this.changeFrame(e.frameId, e.newProperties);
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
     * Frame management: create/delete/change/move frame;
     * @param {!object} e Blockly move event to be processed
     */
    updateFrame (frame) {
        // Maybe the frame already exists, but we need to update it anyway
        this._frames[frame.id] = frame;

        // A new frame was actually added to the frame container or updated
        // emit a project changed event
        this.emitProjectChanged();
    }

    /**
     * Frame management: create frames from a `create` event
     * @param {!object} e Blockly create event to be processed
     */
    createFrame (e) {
        // Does the frame already exist?
        // Could happen, e.g., for an unobscured shadow.
        if (this._frames.hasOwnProperty(e.frameId)) {
            return;
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
            return;
        }
    
        // Delete frame itself.
        delete this._frames[frameId];
    
        this.emitProjectChanged();
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
            return;
        }
    
        // Retitle this frame
        this._frames[frameId].title = newTitle;
    
        this.emitProjectChanged();
    }

    /**
     * Frame management: change frame field values
     * @param {!string} frameId Id of the frame
     * @param {!object} args Blockly change event to be processed
     */
    changeFrame (frameId, args) {
        const frame = this._frames[frameId];
        let didChange = false;
        if (typeof frame === 'undefined') return;
        if (args.blocks) {
            didChange = true;
            frame.blocks = args.blocks;
        } else {
            didChange = (frame.x !== args.x) || (frame.y !== args.y) ||
                (frame.width !== args.width) || (frame.height !== args.height);
            frame.x = args.x;
            frame.y = args.y;
            frame.width = args.width;
            frame.height = args.height;
        }

        if (didChange) this.emitProjectChanged();
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
