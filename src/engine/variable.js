/* eslint-disable no-undef */
/**
 * @fileoverview
 * Object representing a Scratch variable.
 */
const uid = require('../util/uid');
const xmlEscape = require('../util/xml-escape');
// Resolve the issue of "globalThis is not defined" error in a low version client.
require('../util/global-this-shim');

class Variable {
    /**
     * @param {string} id Id of the variable.
     * @param {string} name Name of the variable.
     * @param {string} type Type of the variable, one of '' or 'list'
     * @param {boolean} isCloud Whether the variable is stored in the cloud.
     * @constructor
     */
    constructor (id, name, type, isCloud, targetId) {
        this.id = id || uid();
        this.name = name;
        this.type = type;
        this.isCloud = isCloud;
        this.targetId = targetId;

        switch (this.type) {
        case Variable.SCALAR_TYPE:
            this.value = 0;
            break;
        case Variable.LIST_TYPE:
            this.value = [];
            break;
        case Variable.BROADCAST_MESSAGE_TYPE:
            this.value = this.name;
            break;
        default:
            throw new Error(`Invalid variable type: ${this.type}`);
        }
        if (global.$monitoringVariable) {
            // Broadcast the event after creating it to avoid the target
            // from being unable to retrieve the corresponding variable instance.
            setTimeout(() => {
                global.dispatchEvent(new CustomEvent('createVariable', {detail:
                    {...this}
                }));
            }, 1);
        }
    }

    toXML (isLocal) {
        isLocal = (isLocal === true);
        return `<variable type="${this.type}" id="${this.id}" islocal="${isLocal
        }" iscloud="${this.isCloud}">${xmlEscape(this.name)}</variable>`;
    }

    /**
     * Type representation for scalar variables.
     * This is currently represented as ''
     * for compatibility with blockly.
     * @const {string}
     */
    static get SCALAR_TYPE () {
        return ''; // used by compiler
    }

    /**
     * Type representation for list variables.
     * @const {string}
     */
    static get LIST_TYPE () {
        return 'list'; // used by compiler
    }

    /**
     * Type representation for list variables.
     * @const {string}
     */
    static get BROADCAST_MESSAGE_TYPE () {
        return 'broadcast_msg';
    }
}

module.exports = Variable;
