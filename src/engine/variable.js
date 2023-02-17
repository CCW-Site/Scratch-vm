/**
 * @fileoverview
 * Object representing a Scratch variable.
 */
const debounce = require('lodash.debounce');
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
        this.debounceOnChange = debounce(this.onChange, 50);

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
    }

    get name () {
        return this._name;
    }

    set name (newName) {
        const tempName = this._name;
        this._name = newName;
        if (tempName !== newName) {
            this.onChange();
        }
    }

    get value () {
        return this._value;
    }

    set value (newValue) {
        const _this = this;
        const tempValue = this._value;
        if (newValue instanceof Array) {
            newValue = new Proxy(newValue, {
                set (list, idx, value) {
                    if (idx !== 'length') {
                        _this.debounceOnChange();
                    }
                    list[idx] = value;
                    return true;
                }
            });
        }
        _this._value = newValue;
        if (newValue !== tempValue) {
            _this.onChange();
        }
    }

    toXML (isLocal) {
        isLocal = (isLocal === true);
        return `<variable type="${this.type}" id="${this.id}" islocal="${isLocal
        }" iscloud="${this.isCloud}">${xmlEscape(this.name)}</variable>`;
    }

    onChange () {
        if (typeof globalThis.onVMTargetVariableChange === 'function') {
            globalThis.onVMTargetVariableChange({
                name: this._name,
                value: this._value,
                targetId: this.targetId,
                type: this.type,
                id: this.id
            });
        }
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
