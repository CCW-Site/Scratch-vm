const BlockType = require('../extension-support/block-type');
const ArgumentType = require('../extension-support/argument-type');

/* eslint-disable-next-line max-len */
const blockIconURI = 'data:image/svg+xml,%3Csvg id="rotate-counter-clockwise" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill:%233d79cc;%7D.cls-2%7Bfill:%23fff;%7D%3C/style%3E%3C/defs%3E%3Ctitle%3Erotate-counter-clockwise%3C/title%3E%3Cpath class="cls-1" d="M22.68,12.2a1.6,1.6,0,0,1-1.27.63H13.72a1.59,1.59,0,0,1-1.16-2.58l1.12-1.41a4.82,4.82,0,0,0-3.14-.77,4.31,4.31,0,0,0-2,.8,4.25,4.25,0,0,0-1.34,1.73,5.06,5.06,0,0,0,.54,4.62A5.58,5.58,0,0,0,12,17.74h0a2.26,2.26,0,0,1-.16,4.52A10.25,10.25,0,0,1,3.74,18,10.14,10.14,0,0,1,2.25,8.78,9.7,9.7,0,0,1,5.08,4.64,9.92,9.92,0,0,1,9.66,2.5a10.66,10.66,0,0,1,7.72,1.68l1.08-1.35a1.57,1.57,0,0,1,1.24-.6,1.6,1.6,0,0,1,1.54,1.21l1.7,7.37A1.57,1.57,0,0,1,22.68,12.2Z"/%3E%3Cpath class="cls-2" d="M21.38,11.83H13.77a.59.59,0,0,1-.43-1l1.75-2.19a5.9,5.9,0,0,0-4.7-1.58,5.07,5.07,0,0,0-4.11,3.17A6,6,0,0,0,7,15.77a6.51,6.51,0,0,0,5,2.92,1.31,1.31,0,0,1-.08,2.62,9.3,9.3,0,0,1-7.35-3.82A9.16,9.16,0,0,1,3.17,9.12,8.51,8.51,0,0,1,5.71,5.4,8.76,8.76,0,0,1,9.82,3.48a9.71,9.71,0,0,1,7.75,2.07l1.67-2.1a.59.59,0,0,1,1,.21L22,11.08A.59.59,0,0,1,21.38,11.83Z"/%3E%3C/svg%3E';

/**
 * An example core block implemented using the extension spec.
 * This is not loaded as part of the core blocks in the VM but it is provided
 * and used as part of tests.
 */
class Scratch3CoreExample {

    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this.NS = 'coreExample';
    }
    handleCCWHat (args, util) {
        console.log('handleCCWHat', args);
        return true;
    }
    triggerCCWHat (args, util) {
        console.log('triggerCCWHat', args);
        util.startHatsWithParams('coreExample_handleCCWHat', {parameters: {Msg: args.Msg}, fields: {Data: args.Data}});

    }


    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        const handleCCWHat = {
            opcode: 'handleCCWHat',
            text: 'ccw hat with [Data] [Msg]',
            blockType: BlockType.HAT,
            isEdgeActivated: false,
            arguments: {
                Data: {
                    type: ArgumentType.STRING,
                    menu: 'hatMenu'
                },
                Msg: {
                    type: 'ccw_hat_parameter'
                }
            }
        };

        const triggerCCWHat = {
            opcode: 'triggerCCWHat',
            text: 'triggerCCWHat [Data] [Msg]',
            blockType: BlockType.COMMAND,
            arguments: {
                Data: {
                    type: ArgumentType.STRING,
                    menu: 'hatMenu'
                },
                Msg: {
                    type: ArgumentType.STRING,
                    defaultValue: 'key'
                }
            }
        };

        const makeVarBtn = {
            func: 'MAKE_A_VARIABLE',
            blockType: BlockType.BUTTON,
            text: 'make a variable (CoreEx)'
        };

        const exampleOpcode = {
            opcode: 'exampleOpcode',
            blockType: BlockType.REPORTER,
            text: 'example block'
        };

        const exampleWithInlineImage = {
            opcode: 'exampleWithInlineImage',
            blockType: BlockType.COMMAND,
            text: 'block with image [CLOCKWISE] inline',
            arguments: {
                CLOCKWISE: {
                    type: ArgumentType.IMAGE,
                    dataURI: blockIconURI
                }
            }
        };

        const dynamicBlock = {
            opcode: 'dynamicBlock',
            blockType: BlockType.REPORTER,
            text: 'dynamic Block [B]',
            isDynamic: true,
            arguments: {
                // A: {
                //     type: ArgumentType.STRING,
                //     defaultValue: '1',
                //     dynamicArguments: {
                //         hideAddButton: false,
                //         hideDeleteButton: false,
                //         seperator: ',',
                //         defaultValues: '1'
                //     }
                //     type: ArgumentType.STRING,
                //     defaultValue: '1'
                // },
                B: {
                    type: ArgumentType.STRING,
                    menu: 'dynamicMenu'
                }
            }
        };

        const staticBlock = {
            opcode: 'staticBlockOp',
            blockType: BlockType.REPORTER,
            text: 'staticBlock'
        };

        const arrayBuilderBlock = {
            opcode: 'arrayBuilderBlock',
            blockType: BlockType.REPORTER,
            text: 'arrayBuilderBlock [A] [B]',
            arguments: {
                A: {
                    type: ArgumentType.ARRAY,
                    mutation: {
                        items: 2,
                        movable: false,
                        hideAddButton: true
                    }
                },
                B: {
                    type: ArgumentType.ARRAY,
                    mutation: {
                        items: 2,
                        movable: false,
                        hideAddButton: true
                    }
                }
            }
        };

        const menuBlock = {
            opcode: 'menuBlock',
            blockType: BlockType.COMMAND,
            text: 'menuBlock [DATA]',
            arguments: {
                DATA: {
                    type: ArgumentType.STRING,
                    menu: 'dynamicMenu'
                }
            }
        };

        const button = {
            blockType: 'button',
            text: 'updateExtension',
            onClick: this.updateExtension.bind(this)
        };

        return {
            id: this.NS,
            name: 'CoreEx', // This string does not need to be translated as this extension is only used as an example.
            blocks: [
                // button,
                // arrayBuilderBlock,
                // triggerCCWHat,
                // handleCCWHat,
                // makeVarBtn,
                // exampleOpcode,
                // exampleWithInlineImage,
                dynamicBlock,
                // staticBlock,
                // menuBlock
            ],
            menus: {
                // hatMenu: [
                //     {text: '*', value: '*'},
                //     {text: 'a', value: 'a'},
                //     {text: 'b', value: 'b'}
                // ]
                dynamicMenu: {items: 'buildDynamicMenu'}
            }
        };
    }

    /**
     * Example opcode just returns the name of the stage target.
     * @returns {string} The name of the first target in the project.
     */
    exampleOpcode () {
        const stage = this.runtime.getTargetForStage();
        return stage ? stage.getName() : 'no stage yet';
    }

    exampleWithInlineImage (args) {
        return;
    }
    staticBlockOp (args) {

    }

    menuBlock (args) {
        console.log('menuBlock', ...args);
    }

    dynamicBlock (args) {
        console.log('dynamic block', args);
        return 'dynamic block';
    }

    buildDynamicMenu () {
        return [{text: '1', value: '1'}];
    }

    arrayBuilderBlock (args) {
        console.log('A :', args.A);
        console.log('B :', args.B);
    }

    updateExtension () {
        const dynamicBlock = {
            opcode: 'dynamicBlock',
            blockType: BlockType.REPORTER,
            text: 'dynamic Block [A][B][C]',
            isDynamic: true,
            disableMonitor: true,
            arguments: {
                A: {
                    type: ArgumentType.STRING,
                    defaultValue: '1'
                },
                B: {
                    type: ArgumentType.STRING,
                    defaultValue: '2'
                },
                C: {
                    type: ArgumentType.STRING,
                    defaultValue: '3'
                }
            }
        };

        const newInfo = this.getInfo();
        newInfo.blocks = newInfo.blocks.concat(dynamicBlock);
        const categoryInfo = this.runtime._blockInfo.find(info => info.id === this.NS);
        (categoryInfo ? this.runtime._refreshExtensionPrimitives : this.runtime._registerExtensionPrimitives).bind(this.runtime)(newInfo);
    }
}

module.exports = Scratch3CoreExample;
