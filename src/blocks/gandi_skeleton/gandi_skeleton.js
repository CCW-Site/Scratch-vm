const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Clone = require('../../util/clone');
const Cast = require('../../util/cast');

/* eslint-disable-next-line max-len */
const blockIconURI =
    'data:image/svg+xml,%3Csvg id="rotate-counter-clockwise" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill:%233d79cc;%7D.cls-2%7Bfill:%23fff;%7D%3C/style%3E%3C/defs%3E%3Ctitle%3Erotate-counter-clockwise%3C/title%3E%3Cpath class="cls-1" d="M22.68,12.2a1.6,1.6,0,0,1-1.27.63H13.72a1.59,1.59,0,0,1-1.16-2.58l1.12-1.41a4.82,4.82,0,0,0-3.14-.77,4.31,4.31,0,0,0-2,.8,4.25,4.25,0,0,0-1.34,1.73,5.06,5.06,0,0,0,.54,4.62A5.58,5.58,0,0,0,12,17.74h0a2.26,2.26,0,0,1-.16,4.52A10.25,10.25,0,0,1,3.74,18,10.14,10.14,0,0,1,2.25,8.78,9.7,9.7,0,0,1,5.08,4.64,9.92,9.92,0,0,1,9.66,2.5a10.66,10.66,0,0,1,7.72,1.68l1.08-1.35a1.57,1.57,0,0,1,1.24-.6,1.6,1.6,0,0,1,1.54,1.21l1.7,7.37A1.57,1.57,0,0,1,22.68,12.2Z"/%3E%3Cpath class="cls-2" d="M21.38,11.83H13.77a.59.59,0,0,1-.43-1l1.75-2.19a5.9,5.9,0,0,0-4.7-1.58,5.07,5.07,0,0,0-4.11,3.17A6,6,0,0,0,7,15.77a6.51,6.51,0,0,0,5,2.92,1.31,1.31,0,0,1-.08,2.62,9.3,9.3,0,0,1-7.35-3.82A9.16,9.16,0,0,1,3.17,9.12,8.51,8.51,0,0,1,5.71,5.4,8.76,8.76,0,0,1,9.82,3.48a9.71,9.71,0,0,1,7.75,2.07l1.67-2.1a.59.59,0,0,1,1,.21L22,11.08A.59.59,0,0,1,21.38,11.83Z"/%3E%3C/svg%3E';

/**
 * An example core block implemented using the extension spec.
 * This is not loaded as part of the core blocks in the VM but it is provided
 * and used as part of tests.
 */

const SpineEvents = {
    COMPLETE: 'SpineEvents.complete',
    DISPOSE: 'SpineEvents.dispose',
    END: 'SpineEvents.end',
    EVENT: 'SpineEvents.event',
    INTERRUPTED: 'SpineEvents.interrupted',
    START: 'SpineEvents.start'
};

const closeAutoIdleValue = 'closeAutoIdle';

class GandiSpineSkeletonExtension {
    constructor (runtime) {
        this.runtime = runtime;
        const assetHost = 'https://m.ccw.site/gandi/spine_test/';
        // const assetHost = 'http://127.0.0.1:8868/assets/';
        this.runtime.renderer.initSpineManager(assetHost);
        this.NS = 'GandiSkeleton';
        runtime.on('PROJECT_STOP_ALL', this._handleProjectStop.bind(this));
        // runtime.on('PROJECT_RUN_STOP', this._handleProjectStop.bind(this));
    }

    static get STATE_KEY () {
        return 'Gandi.Spine';
    }

    /**
     * The default pen state, to be used when a target has no existing pen state.
     * @type {SpineState}
     */
    static get DEFAULT_STATE () {
        return {
            jsonFile: '',
            atlasFile: '',
            spineSkinId: -1,
            idleAnimation: null
        };
    }


    _handleProjectStop () {
        // console.log('11111');
        this.runtime.renderer.spineManager.stopRenderSkeleton();
    }

    _getSpineSkinId (target, createIfNull = true) {
        const state = this._getSpineState(target);
        if (state.spineSkinId < 0 && this.runtime.renderer && createIfNull) {
            const [spineSkinId, skin] = this.runtime.renderer.createSpineSkin();
            state.spineSkinId = spineSkinId;
            skin.on(skin.EVENT.START, this.onAnimationStart.bind(this));
            skin.on(skin.EVENT.INTERRUPTED, this.onAnimationInterrupted.bind(this));
            skin.on(skin.EVENT.EVENT, this.onAnimationEvent.bind(this));
            skin.on(skin.EVENT.END, this.onAnimationEnd.bind(this));
            skin.on(skin.EVENT.DISPOSE, this.onAnimationDispose.bind(this));
            skin.on(skin.EVENT.COMPLETE, this.onAnimationComplete.bind(this));
        }
        return state.spineSkinId;
    }

    _getSkinByTarget (target, createIfNull = true) {
        const spineSkinId = this._getSpineSkinId(target, createIfNull);
        return this.runtime.renderer.getSkin(spineSkinId);
    }


    /**
     * @param {Target} target - collect pen state for this target. Probably, but not necessarily, a RenderedTarget.
     * @returns {SpineState} the mutable pen state associated with that target. This will be created if necessary.
     * @private
     */
    _getSpineState (target) {
        if (!target) {
            return Clone.simple(GandiSpineSkeletonExtension.DEFAULT_STATE);
        }
        let state = target.getCustomState(GandiSpineSkeletonExtension.STATE_KEY);
        if (!state) {
            state = Clone.simple(GandiSpineSkeletonExtension.DEFAULT_STATE);
            target.setCustomState(GandiSpineSkeletonExtension.STATE_KEY, state);
        }
        return state;
    }

    _getSpineStateAndSkin (target) {
        const skin = this._getSkinByTarget(target);
        const state = this._getSpineState(target);
        return [state, skin];
    }

    _showSkeletonToStage (target, skinId) {
        this.runtime.renderer.updateDrawableSkinId(target.drawableID, skinId);
        if (target.visible) {
            target.emitFast(target.EVENT_TARGET_VISUAL_CHANGE, target);
            this.runtime.requestRedraw();
        }
        this.runtime.requestTargetsUpdate(this);
        this.runtime.renderer.requestRenderSkeleton();
    }

    _setSkeletonAnimation (target, trackIndex, animationName, loop, ignoreIfPlaying = false, waiting = false, delay = 0) {
        const _skin = this._getSkinByTarget(target, false);
        if (!_skin) return;
        if (animationName === '- setup pose -') {
            _skin.clearTracks();
            _skin.setToSetupPose();
        } else if (animationName === '- stop All -') {
            _skin.clearTracks();
        } else if (waiting) {
            _skin.addAnimation(trackIndex, animationName, loop, delay);
        } else {
            // skin.play(animationName, true);
            _skin.setAnimation(trackIndex, animationName, loop, ignoreIfPlaying);
        }

        // const completeAnimationlistener = ({entry, skin}) => {
        //     // skin.removeListener(skin.EVENT.COMPLETE, completeAnimationlistener);

        //     const {trackIndex: _trackIndex, next, loop: _loop} = entry;
        //     TODO - loop animation never complete, how to handle it?
        //     skin.removeWaitForCompleteTrack(_trackIndex);
        //     console.log('animation done: trackIndex=', _trackIndex);
        //     console.log('                next=', next);
        //     console.log('                loop=', _loop);

        //     if (!next && !_loop) {
        //         console.log('                animation done: clearTrack', _trackIndex);
        //         const isMore = skin.clearTrack(_trackIndex);
        //         if (!isMore) {
        //             console.log('                no animation track any more, try auto change to idle');
        //             const state = this._getSpineState(target);
        //             if (state.idleAnimation && state.idleAnimation !== closeAutoIdleValue) {
        //                 console.log('                has a idleAnimation , auto change to idle');
        //                 skin.setAnimation(0, state.idleAnimation, true);
        //             } else {
        //                 console.log('                no idleAnimation, do nothing');
        //                 // TODO: auto setup pose?
        //             }
        //         }
        //     }
        // };
        // _skin.once(_skin.EVENT.COMPLETE, completeAnimationlistener);

        this._showSkeletonToStage(target, _skin.id);

    }

    /** event handler */
    doDispatchAnimationEvent (eventName, entry) {
        // console.log('doDispatchAnimationEvent', eventName, entry);
        this.runtime.startHatsWithParams('GandiSkeleton_dispatchAnimationEvent', {
            parameters: {eventName, eventData: entry.animation.name}
        });
    }

    onAnimationEvent ({entry, skin}, event) {
        this.doDispatchAnimationEvent(SpineEvents.EVENT, entry);
    }
    onAnimationComplete ({entry, skin}) {
        const {trackIndex: _trackIndex, next, loop: _loop} = entry;
        if (!next && !_loop) {
            console.log('animation done: trackIndex=', _trackIndex);
            console.log('                no next or loop animation');
            console.log('                clear track!');
            skin.clearTrack(_trackIndex);
        }
        this.doDispatchAnimationEvent(SpineEvents.COMPLETE, entry);
    }
    onAnimationStart ({entry, skin}) {
        this.doDispatchAnimationEvent(SpineEvents.START, entry);
    }
    onAnimationEnd ({entry, skin}) {
        this.doDispatchAnimationEvent(SpineEvents.END, entry);
    }
    onAnimationDispose ({entry, skin}) {
        this.doDispatchAnimationEvent(SpineEvents.DISPOSE, entry);
    }
    onAnimationInterrupted ({entry, skin}) {
        this.doDispatchAnimationEvent(SpineEvents.INTERRUPTED, entry);
    }

    loadSpineAsset (args, util) {
        const {atlas = 'atlas1.atlas', json = 'demos.json'} = args;
        return this.runtime.renderer.spineManager.loadAtlasAndJson(atlas, json).then(() => {
            console.log('loadAtlasAndJson done', atlas, json);
        });
    }

    loadSkeleton (args, util) {
        const {skeletonName} = args;
        const [state, skin] = this._getSpineStateAndSkin(util.target);
        const {jsonFile, atlasFile, spineSkinId} = state;
        return skin.setSkeleton(atlasFile, jsonFile, skeletonName).then(() => {
            this._showSkeletonToStage(util.target, spineSkinId);
        });

    }

    setSkeletonJSON (args, util) {
        // make sure spine skin is initialized
        const [state] = this._getSpineStateAndSkin(util.target);
        state.jsonFile = args.jsonFile;
        state.atlasFile = this.runtime.renderer.spineManager.getAtlasFileByJSONFile(state.jsonFile);
        if (!state.atlasFile) {
            console.error(`cant find atlas file connected to json file:${args.jsonFile}, check if load correct json and altas file`);
        }
    }

    playSkeletonAnimation (args, util) {
        if (util.target) {
            const {trackIndex, animation, loop, force, waiting, delay} = args;
            this._setSkeletonAnimation(util.target, trackIndex, animation, Cast.toBoolean(loop), false, Cast.toBoolean(waiting), Cast.toNumber(delay));
        }
    }

    addAnimation (args, util) {
        if (util.target) {
            const {trackIndex, animation, loop, delay} = args;
            const _skin = this._getSkinByTarget(util.target, false);
            if (!_skin) return;
            _skin.addAnimation(trackIndex, animation, Cast.toBoolean(loop), Cast.toNumber(delay));
            this._showSkeletonToStage(util.target, _skin.id);
        }
    }

    playSkeletonAnimationOnce (args, util) {
        if (util.target) {
            const {animationName} = args;
            this._setSkeletonAnimation(util.target, 0, animationName, false, true);
        }
    }

    setIdleAnimation (args, util) {
        if (util.target) {
            const {animation} = args;
            const state = this._getSpineState(util.target);
            state.idleAnimation = animation;
        }
    }

    showUniForms (args, util) {
        console.log(this.runtime.renderer._allDrawables[util.target.drawableID].getUniforms());
    }

    setRotation (args, util) {
        const {rotation} = args;
        const skin = this._getSkinByTarget(util.target, false);
        if (skin) skin.setDirection(Cast.toNumber(rotation));
    }

    setSkin (args, util) {
        const {skinName, show} = args;
        const skin = this._getSkinByTarget(util.target, false);
        if (skin) {
            skin.setSkin(skinName);
            if (show) this._showSkeletonToStage(util.target, skin.id);
        }
    }

    getBoneValue (args, util) {
        const {boneName, boneAttribute} = args;
        const skin = this._getSkinByTarget(util.target, false);
        return skin ? skin.getBoneAttribute(boneName, boneAttribute) : '';
    }

    getSkinName (args, util) {
        return args.skinName;
    }

    getCurrentAnimation (args, util) {
        const skin = this._getSkinByTarget(util.target, false);

        const anime = skin ? skin.getCurrentAnimationName(Cast.toNumber(args.trackIndex)) : null;
        return anime || '- none -';
    }

    getAABB (args, util) {
        const target = this.getSpriteTargetByNameOrId(Cast.toString(args.target));
        const key = Cast.toString(args.boundingKey);
        const skin = this._getSkinByTarget(target, false);
        const aabb = skin ? skin.getAABB() : null;
        if (key === 'rect') {
            return aabb ? `${aabb.x},${aabb.y},${aabb.width},${aabb.height}` : '';
        }
        return aabb && aabb[key];
    }

    isCurrentAnimationEquals (args, util) {
        return this.getCurrentAnimation(args, util) === args.animation;
    }

    setDebugMode (args, util) {
        const {debug} = args;
        this.runtime.renderer.spineManager.drawDebug = Boolean(debug);
    }

    dispatchAnimationEvent (args, util){
        return true;
    }
    stopAnimation (args, util) {
        const {trackIndex} = args;
        const skin = this._getSkinByTarget(util.target, false);
        if (trackIndex === 'all') {
            skin.clearTracks();
        } else {
            skin.clearTrack(Cast.toNumber(trackIndex));
        }
    }

    getInfo () {

        // const blockUpdateSkeletonAnimation = {
        //     opcode: 'updateSkeletonAnimation',
        //     blockType: BlockType.COMMAND,
        //     text: 'updateSkeleton[skeleton]Animation[animation]',
        //     arguments: {
        //         skeleton: {
        //             type: ArgumentType.STRING,
        //             defaultValue: 'spineboy'
        //         },
        //         animation: {
        //             type: ArgumentType.STRING,
        //             defaultValue: 'walk'
        //         }
        //     }
        // };

        // const blockSetPosition = {
        //     opcode: 'setPosition',
        //     blockType: BlockType.COMMAND,
        //     text: 'set X[x]Y[y]Offset[offset]]',
        //     arguments: {
        //         x: {
        //             type: ArgumentType.NUMBER,
        //             defaultValue: 0
        //         },
        //         y: {
        //             type: ArgumentType.NUMBER,
        //             defaultValue: 0
        //         },
        //         offset: {
        //             type: ArgumentType.BOOLEAN,
        //             defaultValue: false
        //         }
        //     }
        // };

        const blockLoadAsset = {
            opcode: 'loadSpineAsset',
            blockType: BlockType.COMMAND,
            text: 'loadSpineAsset atlas[atlas]json[json]',
            arguments: {
                atlas: {
                    type: ArgumentType.STRING,
                    defaultValue: 'heroes.atlas'
                },
                json: {
                    type: ArgumentType.STRING,
                    defaultValue: 'heroes.json'
                }
            }
        };

        const blockSetSkeletonJSON = {
            opcode: 'setSkeletonJSON',
            blockType: BlockType.COMMAND,
            text: 'setSkeletonJSON[jsonFile]',
            arguments: {
                jsonFile: {
                    type: ArgumentType.STRING,
                    defaultValue: 'heroes.json'
                }
            }
        };

        const blockShowSkeleton = {
            opcode: 'loadSkeleton',
            blockType: BlockType.COMMAND,
            text: 'loadSkeleton[skeletonName]',
            arguments: {
                skeletonName: {
                    type: ArgumentType.STRING,
                    menu: 'getSkeletonJSONObjectsMenu'
                }
            }
        };

        const blockPlaySkeletonAnimationOnce = {
            opcode: 'playSkeletonAnimationOnce',
            blockType: BlockType.COMMAND,
            text: 'play animation[animationName] once',
            arguments: {
                animationName: {
                    type: ArgumentType.STRING,
                    menu: 'getAnimationNamesMenu'
                }
            }
        };

        const blockShowAnimation = {
            opcode: 'playSkeletonAnimation',
            blockType: BlockType.COMMAND,
            text: 'play animation[animation]track[trackIndex]loop[loop]waitingPrevious[waiting]delay[delay]',
            arguments: {
                animation: {
                    type: ArgumentType.STRING,
                    menu: 'getAnimationNamesMenu'
                },
                trackIndex: {
                    type: ArgumentType.NUMBER,
                    defaultValue: 0
                },
                loop: {
                    type: ArgumentType.STRING,
                    menu: 'getBooleanMenu',
                    defaultValue: false
                },
                // force: {
                //     type: ArgumentType.STRING,
                //     menu: 'getBooleanMenu',
                //     defaultValue: false
                // },
                waiting: {
                    type: ArgumentType.STRING,
                    menu: 'getBooleanMenu',
                    defaultValue: false
                },
                delay: {
                    type: ArgumentType.NUMBER,
                    defaultValue: 0
                }
            }
        };

        const blockAddAnimation = {
            opcode: 'addAnimation',
            blockType: BlockType.COMMAND,
            text: 'add animation[animation]track[trackIndex]loop[loop]delay[delay]',
            arguments: {
                animation: {
                    type: ArgumentType.STRING,
                    menu: 'getAnimationNamesMenu'
                },
                trackIndex: {
                    type: ArgumentType.NUMBER,
                    defaultValue: 0
                },
                loop: {
                    type: ArgumentType.STRING,
                    menu: 'getBooleanMenu',
                    defaultValue: true
                },
                delay: {
                    type: ArgumentType.NUMBER,
                    defaultValue: 0
                }
            }
        };

        const showUniForms = {
            opcode: 'showUniForms',
            blockType: BlockType.COMMAND,
            text: 'showUniForms'
        };

        const blockSetRotation = {
            opcode: 'setRotation',
            blockType: BlockType.COMMAND,
            text: 'setRotation[rotation]',
            arguments: {
                rotation: {
                    type: ArgumentType.NUMBER,
                    defaultValue: 0
                }
            }
        };

        const blockGetBoneAttribute = {
            opcode: 'getBoneValue',
            blockType: BlockType.REPORTER,
            text: 'bone[boneName][boneAttribute]',
            arguments: {
                boneName: {
                    type: ArgumentType.STRING,
                    menu: 'getBoneNamesMenu'
                },
                boneAttribute: {
                    type: ArgumentType.STRING,
                    menu: 'getBoneAttributeKeysMenu'
                }
            }
        };
        const blockSetSkin = {
            opcode: 'setSkin',
            blockType: BlockType.COMMAND,
            text: 'set skin[skinName]show[show]',
            arguments: {
                skinName: {
                    type: ArgumentType.STRING,
                    menu: 'getSkinsMenu'
                },
                show: {
                    type: ArgumentType.STRING,
                    menu: 'getBooleanMenu',
                    defaultValue: true
                }
            }
        };

        const blockGetSkinName = {
            opcode: 'getSkinName',
            blockType: BlockType.REPORTER,
            text: 'skin[skinName]',
            arguments: {
                skinName: {
                    type: ArgumentType.STRING,
                    menu: 'getSkinsMenu'
                }
            }
        };

        const blockGetAABB = {
            opcode: 'getAABB',
            blockType: BlockType.REPORTER,
            text: 'get[target]bounding[boundingKey]',
            arguments: {
                target: {
                    type: ArgumentType.STRING,
                    menu: 'getSpriteListMenu'
                },
                boundingKey: {
                    type: ArgumentType.STRING,
                    menu: 'getBoundingKeyMenu'
                }
            }
        };

        const blockCurrentAnimationName = {
            opcode: 'getCurrentAnimation',
            blockType: BlockType.REPORTER,
            text: "track[trackIndex]'s current animation",
            arguments: {
                trackIndex: {
                    type: ArgumentType.NUMBER,
                    defaultValue: 0
                }
            }
        };

        const blockIsCurrentAnimationEquals = {
            opcode: 'isCurrentAnimationEquals',
            blockType: BlockType.BOOLEAN,
            text: "track[trackIndex]'s current animation=[animation]",
            arguments: {
                trackIndex: {
                    type: ArgumentType.NUMBER,
                    defaultValue: 0
                },
                animation: {
                    type: ArgumentType.STRING,
                    menu: 'getAnimationNamesMenu'
                }
            }
        };

        const blockSetIdleAnimation = {
            opcode: 'setIdleAnimation',
            blockType: BlockType.COMMAND,
            text: 'set auto idle animation[animation]',
            arguments: {
                animation: {
                    type: ArgumentType.STRING,
                    menu: 'getAnimationNamesMenu'
                }
            }
        };

        const blockDebug = {
            opcode: 'setDebugMode',
            blockType: BlockType.COMMAND,
            text: 'open debug render[debug]',
            arguments: {
                debug: {
                    type: ArgumentType.STRING,
                    menu: 'getBooleanMenu',
                    defaultValue: true
                }
            }
        };

        const blockAnimationEventHat = {
            opcode: 'dispatchAnimationEvent',
            blockType: BlockType.HAT,
            isEdgeActivated: false,
            text: 'when animation state change [eventName][eventData]',
            arguments: {
                eventName: {
                    type: 'ccw_hat_parameter'
                },
                eventData: {
                    type: 'ccw_hat_parameter'
                }
            }
        };

        const blockStopAnimation = {
            opcode: 'stopAnimation',
            blockType: BlockType.COMMAND,
            text: 'step [trackIndex] animation',
            arguments: {
                trackIndex: {
                    type: ArgumentType.STRING,
                    menu: 'getAnimationTrackMenu',
                    defaultValue: 'all'
                }
            }
        };


        return {
            id: this.NS,
            name: 'GandiSkeleton',
            blocks: [
                '--- 加载',
                blockLoadAsset,
                blockSetSkeletonJSON,
                blockShowSkeleton,
                '--- 动画',
                blockGetSkinName,
                blockIsCurrentAnimationEquals,
                blockCurrentAnimationName,
                blockShowAnimation,
                // blockAddAnimation,
                blockPlaySkeletonAnimationOnce,
                blockSetIdleAnimation,
                blockAnimationEventHat,
                blockStopAnimation,
                '--- 皮肤',
                blockSetSkin,
                '--- 骨骼',
                blockGetBoneAttribute,
                '--- 位置',
                blockGetAABB,
                blockSetRotation,
                '--- 调试',
                blockDebug,
                showUniForms
                //   blockUpdateSkeletonAnimation,
                //    blockSetPosition
            ],
            menus: this.buildMenus()
        };
    }

    /** Menu builders */
    buildMenus () {
        return {
            getSkeletonJSONObjectsMenu: {items: 'getSkeletonJSONObjectsMenu', acceptReporters: true},
            getAnimationNamesMenu: {items: 'getAnimationNamesMenu', acceptReporters: true},
            getAnimationTrackMenu: {items: 'getAnimationTrackMenu', acceptReporters: true},
            getBoneNamesMenu: {items: 'getBoneNamesMenu', acceptReporters: true},
            getSkinsMenu: {items: 'getSkinsMenu', acceptReporters: true},
            getSpriteListMenu: {items: 'getSpriteListMenu', acceptReporters: false},
            getBoneAttributeKeysMenu: {items: 'getBoneAttributeKeysMenu', acceptReporters: true},
            getLoopMenu: {items: [{text: 'loop', value: true}, {text: 'once', value: false}], acceptReporters: true},
            getForceMenu: {items: [{text: 'force play', value: true}, {text: 'not force', value: false}], acceptReporters: true},
            getBooleanMenu: {items: [{text: 'true', value: true}, {text: 'false', value: false}], acceptReporters: true},
            getBoundingKeyMenu: {items: [{text: 'rect', value: 'rect'}, {text: 'x', value: 'x'}, {text: 'y', value: 'y'}, {text: 'width', value: 'width'}, {text: 'height', value: 'height'}], acceptReporters: true}
        };
    }

    getSkeletonJSONObjectsMenu (editingTargetID) {
        const target = this.runtime.getTargetById(editingTargetID);
        const state = this._getSpineState(target);
        if (!state.jsonFile || state.spineSkinId < 0) {
            return [{text: 'need set jsonFile first', value: ''}];
        }
        const names = this.runtime.renderer.spineManager.getSkeletonNamesForJSON(state.jsonFile);
        return names.map(name => ({text: name, value: name}));
    }

    getAutoIdleAnimationNamesMenu (editingTargetID) {
        const menus = this.getAnimationNamesMenu(editingTargetID);
        menus.shift();
        menus.shift();
        menus.shift();
        menus.push({text: '- close -', value: closeAutoIdleValue});
    }

    getAnimationNamesMenu (editingTargetID) {
        const target = this.runtime.getTargetById(editingTargetID);
        const menus = [{text: '- stop All -', value: '- stop All -'}, {text: '- setup pose -', value: '- setup pose -'}, {text: '- none -', value: '- none -'}];
        const skin = this._getSkinByTarget(target, false);
        if (skin) {
            const names = skin.getAnimationList();
            if (names) {
                return names.length > 0 ?
                    menus.concat(names.map(name => ({text: name, value: name}))) :
                    [{text: 'no animation', value: ''}];
            }
        }
        return [{text: 'need set jsonFile first', value: ''}];
    }

    getBoneNamesMenu (editingTargetID) {
        const target = this.runtime.getTargetById(editingTargetID);
        const skin = this._getSkinByTarget(target, false);
        if (skin) {
            const names = skin.getBoneList();
            return names.length > 0 ?
                names.map(name => ({text: name, value: name})) :
                [{text: 'no bone', value: ''}];
        }
        return [{text: 'need set jsonFile first', value: ''}];
    }

    getSkinsMenu (editingTargetID) {
        const target = this.runtime.getTargetById(editingTargetID);
        const skin = this._getSkinByTarget(target, false);
        if (skin) {
            const names = skin.getSkinList();
            return names.length > 0 ?
                names.map(name => ({text: name, value: name})) :
                [{text: 'no Skins', value: ''}];
        }
        return [{text: 'need set jsonFile first', value: ''}];
    }

    getBoneAttributeKeysMenu () {
        return [
            {text: 'x', value: 'x'},
            {text: 'y', value: 'y'},
            {text: 'rotation', value: 'rotation'},
            {text: 'scaleX', value: 'scaleX'},
            {text: 'scaleY', value: 'scaleY'},
            {text: 'shearX', value: 'shearX'},
            {text: 'shearY', value: 'shearY'},
            {text: 'a', value: 'a'},
            {text: 'b', value: 'b'},
            {text: 'c', value: 'c'},
            {text: 'd', value: 'd'},
            {text: 'worldY', value: 'worldY'},
            {text: 'worldX', value: 'worldX'},
            {text: 'sorted', value: 'sorted'},
            {text: 'active', value: 'active'},
            {text: 'data', value: 'data'},
            {text: 'animation_x', value: 'ax'},
            {text: 'animation_y', value: 'ay'},
            {text: 'animation_rotation', value: 'arotation'},
            {text: 'animation_scaleX', value: 'ascaleX'},
            {text: 'animation_scaleY', value: 'ascaleY'},
            {text: 'animation_shearX', value: 'ashearX'},
            {text: 'animation_shearY', value: 'ashearY'}
            // 以下三个是对象，还没想好如何处理
            // {text: 'parent', value: 'parent'},
            // {text: 'skeleton', value: 'skeleton'},
            // {text: 'children', value: 'children'},
        ];
    }

    getSpriteListMenu () {
        const sprites = [];
        this.runtime.targets.forEach(item => {
            if (item.isOriginal && !item.isStage) {
                sprites.push({
                    text: item.sprite.name,
                    value: item.sprite.name
                });
            }
        });
        if (sprites.length === 0) {
            sprites.push({
                text: '-',
                value: ''
            });
        }
        return sprites;
    }

    getSpriteTargetByNameOrId (spriteNameOrId) {
        let spriteTarget = this.runtime.getTargetById(spriteNameOrId);
        if (!spriteTarget) {
            // try find it by name
            spriteTarget = this.runtime.getSpriteTargetByName(spriteNameOrId);
        }
        return spriteTarget;
    }

    getAnimationTrackMenu (editingTargetID) {
        const res = [{text: 'all', value: 'all'}];
        const target = this.runtime.getTargetById(editingTargetID);
        const skin = this._getSkinByTarget(target, false);
        if (skin) {
            skin.animationState.tracks.forEach(track => {
                res.push({text: `track ${track.trackIndex}`, value: track.trackIndex});
            });
        }
        return res;
    }
}

module.exports = GandiSpineSkeletonExtension;
