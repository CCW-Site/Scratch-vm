class Gandi {
    constructor (runtime) {
        this.runtime = runtime;

        this.properties = [];

        this.initProperties([
            ['assets', []],
            ['wildExtensions', {}],
            ['configs', {}]
        ]);
    }

    initProperties (properties) {
        this.properties = properties.map(([key, val]) => {
            this[key] = val;
            return key;
        });
    }

    isEmpty () {
        return this.properties.every(key => this.isEmptyObject(this[key]));
    }

    istPropertyEmpty (propertyName) {
        return this.isEmptyObject(this[propertyName]);
    }

    serializeAssets (extensions) {
        return this.assets.reduce((acc, gandiAsset) => {
            const item = Object.create(null);
            item.uid = gandiAsset.uid;
            item.assetId = gandiAsset.assetId;
            item.name = gandiAsset.name;
            item.md5ext = gandiAsset.md5;
            item.dataFormat = gandiAsset.dataFormat.toLowerCase();
            if (item.dataFormat === 'py' || item.dataFormat === 'json') {
                // py and json file need GandiPython extension to run
                extensions.add('GandiPython');
            }
            return Array.isArray(acc) ? [...acc, item] : {...acc, [item.assetId]: item};
        }, this.runtime.isTeamworkMode ? Object.create(null) : []);
    }

    isEmptyObject (object) {
        return typeof object === 'object' ? Object.keys(object).length === 0 : Boolean(object);
    }

    serialize (object, extensions) {
        if (!this.isEmpty()) {
            object.gandi = {
                assets: this.serializeAssets(extensions),
                wildExtensions: this.wildExtensions,
                configs: this.configs
            };
        }
    }
}

module.exports = Gandi;
