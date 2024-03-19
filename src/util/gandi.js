class Gandi {
    /**
     * Constructor for the Gandi class.
     * @constructor
     * @param {Object} runtime - The runtime object.
     */
    constructor (runtime) {
        /**
         * The runtime object.
         * @member {Object}
         */
        this.runtime = runtime;

        /**
         * Array to store properties.
         * @member {Array}
         */
        this.properties = ['assets', 'wildExtensions', 'configs', 'dynamicMenuItems', 'spine'];

        /**
         * Array to store assets.
         * @member {Array}
         */
        this.assets = [];

        /**
         * Object to store wild extensions.
         * @member {Object}
         */
        this.wildExtensions = {};

        /**
         * Object to store configurations.
         * @member {Object}
         */
        this.configs = {};

        /**
         * Object to store dynamic menu items.
         * @member {Object}
         */
        this.dynamicMenuItems = {};

        /**
         * Object to store spine data.
         * @member {Object}
         */
        this.spine = {
            heroes: {
                atlas: 'heroes.atlas',
                json: 'heroes.json'
            },
            scratchCat: {
                atlas: 'ScratchCat.atlas',
                json: 'ScratchCat.json'
            }
        };
    }
    /**
     * Checks if all properties are empty.
     * @method
     * @returns {boolean} - True if all properties are empty, false otherwise.
     */
    isEmpty () {
        return this.properties.every(key => this.isEmptyObject(this[key]));
    }

    /**
     * Checks if a specific property is empty.
     * @method
     * @param {string} propertyName - The name of the property to check.
     * @returns {boolean} - True if the property is empty, false otherwise.
     */
    istPropertyEmpty (propertyName) {
        return this.isEmptyObject(this[propertyName]);
    }

    /**
     * Serializes Gandi assets.
     * @method
     * @param {Set} extensions - Set of extensions.
     * @returns {Array} - Serialized Gandi assets.
     */
    serializeGandiAssets (extensions) {
        return this.assets.reduce(
            (acc, gandiAsset) => {
                const item = Object.create(null);
                item.id = gandiAsset.id;
                item.assetId = gandiAsset.assetId;
                item.name = gandiAsset.name;
                item.md5ext = gandiAsset.md5;
                item.dataFormat = gandiAsset.dataFormat.toLowerCase();
                if (item.dataFormat === 'py' || item.dataFormat === 'json') {
                    // py and json file need GandiPython extension to run
                    extensions.add('GandiPython');
                }
                return [...acc, item];
            }, []
        );
    }

    /**
     * Checks if an object is empty.
     * @method
     * @param {Object} object - The object to check.
     * @returns {boolean} - True if the object is empty, false otherwise.
     */
    isEmptyObject (object) {
        return typeof object === 'object' ?
            Object.keys(object).length === 0 :
            Boolean(object);
    }

    /**
     * Serializes Gandi data.
     * @method
     * @param {Object} object - The object to serialize.
     * @param {Set} extensions - Set of extensions.
     */
    serialize (object, extensions) {
        const usedExt = {};
        Object.values(this.wildExtensions).forEach(ext => {
            if (extensions.has(ext.id)) {
                usedExt[ext.id] = ext;
            }
        });
        if (!this.isEmpty()) {
            object.gandi = {
                assets: this.serializeGandiAssets(extensions),
                wildExtensions: usedExt,
                configs: this.configs,
                dynamicMenuItems: this.dynamicMenuItems,
                spine: this.spine
            };
        }
    }

    /**
     * Adds a Spine asset.
     * @method
     * @param {string} key - The key for the Spine asset.
     * @param {Object} data - The data for the Spine asset.
     */
    addSpineAsset (key, data) {
        if (!this.spine[key]) {
            this.spine[key] = data;
            this.runtime.emitGandiSpineUpdate('add', key, data);
            this.runtime.emitProjectChanged();
        }
    }

    /**
     * Deletes a Spine asset.
     * @method
     * @param {string} key - The key of the Spine asset to delete.
     */
    deleteSpineAsset (key) {
        if (this.spine[key]) {
            delete this.spine[key];
            this.runtime.emitGandiSpineUpdate('delete', key);
            this.runtime.emitProjectChanged();
        }
    }

    /**
     * Gets a Spine asset by name.
     * @method
     * @param {string} name - The name of the Spine asset.
     * @returns {Object} - The Spine asset data.
     */
    getSpineAsset (name) {
        return this.spine[name];
    }

    /**
     * Sets the value of a configuration item.
     * @param {string} key - The key of the configuration item.
     * @param {*} value - The value to set.
     * @returns {void}
     */
    setConfig (key, value) {
        if (key && this.configs[key] !== value) {
            this.configs[key] = value;
            this.runtime.emitProjectChanged();
        }
    }
    
    /**
     * Gets the value of a specified configuration item.
     * @param {string} key - The key of the configuration item to retrieve the value.
     * @returns {*} The value of the specified configuration item, or undefined if it doesn't exist.
     */
    getConfig (key) {
        return this.configs[key];
    }

    /**
     * Adds a dynamic menu item.
     * @method
     * @param {string} menuName - The name of the dynamic menu.
     * @param {Object} menuItem - The dynamic menu item to add.
     */
    addDynamicMenuItem (menuName, menuItem) {
        if (!this.dynamicMenuItems[menuName]) {
            this.dynamicMenuItems[menuName] = [];
        }
        this.dynamicMenuItems[menuName].push(menuItem);
        this.runtime.emitGandiDynamicMenuItemsUpdate('add', menuName, menuItem);
        this.runtime.emitProjectChanged();
    }

    /**
     * Gets dynamic menu items by name.
     * @method
     * @param {string} menuName - The name of the dynamic menu.
     * @returns {Array} - Array of dynamic menu items.
     */
    getDynamicMenuItems (menuName) {
        return this.dynamicMenuItems[menuName] || [];
    }

    /**
     * Deletes dynamic menu items.
     * @method
     * @param {string} menuName - The name of the dynamic menu.
     * @param {string} id - The id of the dynamic menu item to delete.
     * @throws Will throw an error if the menu name is not provided.
     */
    deleteDynamicMenuItems (menuName, id) {
        if (menuName) {
            if (id) {
                const menus = this.dynamicMenuItems[menuName];
                if (menus) {
                    const idx = menus.findIndex(i => i.value === id);
                    menus.split(idx, 1);
                } else {
                    throw new Error(`Can not find dynamic menu: ${menuName}`);
                }
            } else {
                delete this.dynamicMenuItems[menuName];
            }
            this.runtime.emitGandiDynamicMenuItemsUpdate('delete', [menuName, id]);
        } else {
            throw new Error('The menu name must be provided.');
        }
        this.runtime.emitProjectChanged();
    }
}

module.exports = Gandi;
