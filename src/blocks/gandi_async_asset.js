const BlockType = require('../extension-support/block-type');
const ArgumentType = require('../extension-support/argument-type');
const Cast = require('../util/cast');

class GandiAsyncAssetManager {

    constructor (runtime) {
        this.runtime = runtime;
        this.NS = 'GandiAsyncAssetManager';
        this.formatMessage = runtime.getFormatMessage();
        this.loadedAssets = [];
        this.runtime.on('PROJECT_RUN_STOP', this.autoClearAsyncCostume.bind(this));

        const config = runtime.ccwAPI?.getOnlineExtensionsConfig && runtime.ccwAPI?.getOnlineExtensionsConfig();
        const extConfig = config && config[this.NS];
        this.apis = extConfig?.api;

        this.formatMessage = runtime.getFormatMessage({
            'zh-cn': {
                'GandiAsyncAssetManager.categoryName': '动态资源管理',
                'GandiAsyncAssetManager.clearAsyncAsset': '清理动态资源',
                'GandiAsyncAssetManager.loadAsyncAsset': '加载图片 [IMG] 作为 [TARGET] 的造型, 并 [SHOW]',
                'GandiAsyncAssetManager.uploadSnapshot': '上传舞台截图, 用于 [DESC]',
                'GandiAsyncAssetManager.menu.show': '马上显示',
                'GandiAsyncAssetManager.menu.doNothing': '不显示',
                'GandiAsyncAssetManager.autoClearSwitcher.on': '自动清理: 已开启',
                'GandiAsyncAssetManager.autoClearSwitcher.off': '自动清理: 已关闭',
                'GandiAsyncAssetManager.noneSprite': '没有角色'
            },
            'en': {
                'GandiAsyncAssetManager.categoryName': 'Async Asset Management',
                'GandiAsyncAssetManager.clearAsyncAsset': 'Clear Async Asset',
                'GandiAsyncAssetManager.autoClearSwitcher': 'Auto Clear Async Asset',
                'GandiAsyncAssetManager.loadAsyncAsset': 'Load image [IMG] as [TARGET] costume , and [SHOW]',
                'GandiAsyncAssetManager.uploadSnapshot': 'Upload stage screenshot, for [DESC]',
                'GandiAsyncAssetManager.menu.show': 'Show it',
                'GandiAsyncAssetManager.menu.doNothing': 'Do Not Show',
                'GandiAsyncAssetManager.autoClearSwitcher.on': 'Auto Clear When Stop: Enabled',
                'GandiAsyncAssetManager.autoClearSwitcher.off': 'Auto Clear When Stop: Disabled',
                'GandiAsyncAssetManager.noneSprite': 'None Sprite'
            }
        });
    }

    getInfo () {

        const loadImageAsCustomBlock = {
            opcode: 'loadImageAsCustomBlock',
            blockType: BlockType.COMMAND,
            text: this.formatMessage('GandiAsyncAssetManager.loadAsyncAsset'),
            arguments: {
                IMG: {
                    type: ArgumentType.STRING
                },
                TARGET: {
                    type: ArgumentType.STRING,
                    menu: 'targetListMenu'
                },
                SHOW: {
                    type: ArgumentType.BOOLEAN,
                    defaultValue: this.formatMessage('GandiAsyncAssetManager.menu.show'),
                    menu: 'showCustomMenu'
                }
            }
        };

        const clearAsyncCostume = {
            blockType: 'button',
            text: this.formatMessage('GandiAsyncAssetManager.clearAsyncAsset'),
            onClick: this.clearAsyncCostume.bind(this)
        };

        const switchAutoClearAsyncCostume = {
            blockType: 'button',
            text: this.formatMessage('GandiAsyncAssetManager.autoClearSwitcher.Off'),
            onClick: this.switchAutoClearAsyncCostume.bind(this)
        };

        const uploadSnapshot = {
            opcode: 'uploadSnapshot',
            blockType: BlockType.REPORTER,
            text: this.formatMessage('GandiAsyncAssetManager.uploadSnapshot'),
            arguments: {
                DESC: {
                    type: ArgumentType.STRING,
                    defaultValue: 'purposes'
                }
            }
        };

        return {
            id: this.NS,
            name: this.formatMessage('GandiAsyncAssetManager.categoryName'), // This string does not need to be translated as this extension is only used as an example.
            blocks: [
                clearAsyncCostume,
                switchAutoClearAsyncCostume,
                loadImageAsCustomBlock,
                uploadSnapshot
            ],
            menus: {
                dynamicMenu: {items: 'buildDynamicMenu'},
                showCustomMenu: {
                    items: [
                        {text: this.formatMessage('GandiAsyncAssetManager.menu.show'), value: true},
                        {text: this.formatMessage('GandiAsyncAssetManager.menu.doNothing'), value: false}
                    ]
                },
                targetListMenu: {items: 'buildTargetListMenu'}
            }
        };
    }

    /** loadImageAsCustomBlock block functions */
    switchAutoClearAsyncCostume (btn) {
        this.isAutoClearAsyncCostume = !this.isAutoClearAsyncCostume;
        const autoClearBtn = btn.svgGroup_.querySelector('.blocklyText');
        autoClearBtn.textContent = this.isAutoClearAsyncCostume ?
            this.formatMessage('GandiAsyncAssetManager.autoClearSwitcher.on') :
            this.formatMessage('GandiAsyncAssetManager.autoClearSwitcher.off');
    }

    autoClearAsyncCostume () {
        if (this.isAutoClearAsyncCostume) {
            setTimeout(() => {
                this.clearAsyncCostume();
            }, 1000);
        }
    }

    clearAsyncCostume () {
        this.runtime.targets.forEach(target => {
            target.sprite.costumes = target.sprite.costumes.filter(costume => !costume.isRuntimeAsyncLoad);
            target.setCostume(0);
        });
    }

    loadCostume (url) {
        let imgURL = url;
        if (!imgURL.startsWith('http')) {
            imgURL = `https://m.ccw.site/${imgURL}`;
        }
        const isFromCCW = imgURL.startsWith('https://m.ccw.site/') || imgURL.startsWith('http://m.ccw.site/');
        if (!isFromCCW) {
            console.error('load async costume: Invalid URL, must be from ccw.site');
            return Promise.reject();
        }

        const fileExt = /\.(\w{3,4})($|\?)/gm.exec(Cast.toString(imgURL));
        if (fileExt === null) {
            console.error('load async costume: Invalid file type, must be SVG, PNG, JPG, or JPEG');
            return Promise.reject();
        }

        const file = Cast.toString(imgURL);
        let assetId;
        if (file.indexOf('http') > -1) {
            assetId = file.replace(/[:\/\.]|\?.+/gm, '');
        } else {
            assetId = file.split('.')[0];
        }
        const ext = fileExt[1].toLowerCase();
        if (ext !== 'svg' && ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') {
            console.error('load async costume: Invalid file type, must be SVG, PNG, JPG, or JPEG');
            return Promise.reject();
        }
        const assetType =
            ext === 'svg' ? this.runtime.storage.AssetType.ImageVector : this.runtime.storage.AssetType.ImageBitmap;
        if (file.indexOf('http') > -1) {
            // raw url;
            return fetch(file, {
                method: 'GET'
            }).then(res => res.arrayBuffer())
                .then(buffer => {
                    const asset = this.runtime.storage.createAsset(
                        assetType,
                        ext,
                        new Uint8Array(buffer),
                        null,
                        true // generate md5
                    );
                    const costumeData = {
                        name: 'gandiAsyncCostume', // Needs to be set by caller
                        dataFormat: ext,
                        asset: asset,
                        md5: `${asset.assetId}.${ext}`,
                        assetId: asset.assetId,
                        isRuntimeAsyncLoad: true
                    };
                    this.loadedAssets[assetId] = asset.assetId;
                    return costumeData;
                })
                .catch(err => console.error(err));
        }
        return this.runtime.storage.load(assetType, this.loadedAssets[assetId], ext).then(asset => {
            const costumeData = {
                name: 'gandiAsyncCostume', // Needs to be set by caller
                dataFormat: ext,
                asset: asset,
                md5: `${asset.assetId}.${ext}`,
                assetId: asset.assetId,
                isRuntimeAsyncLoad: true
            };
            this.loadedAssets[assetId] = asset.assetId;
            return costumeData;
        });
    }

    loadImageAsCustomBlock (args) {
        this.loadCostume(args.IMG).then(costume => this.runtime.addAsyncCostumeToTarget(costume.md5, costume, this.runtime.getTargetById(args.TARGET), true))
            .catch(err => console.error(err));
    }

    uploadSnapshot (args) {
        return this.apis?.requestSaveAndUploadSnapshot(args.DESC);
    }

    buildTargetListMenu () {
        return this.__spriteMenu();
    }

    __spriteMenu () {
        const sprites = [];
        this.runtime.targets.forEach(item => {
            if (item.isOriginal && !item.isStage) {
                sprites.push({
                    text: item.sprite.name,
                    value: item.id
                });
            }
        });
        if (sprites.length === 0) {
            sprites.push({
                text: this.formatMessage({
                    id: 'GandiAsyncAssetManager.noneSprite',
                    default: 'none sprite'
                }),
                value: ''
            });
        }
        return sprites;
    }
}

module.exports = GandiAsyncAssetManager;
