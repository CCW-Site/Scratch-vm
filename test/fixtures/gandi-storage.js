const ScratchStorage = require('scratch-storage');
const USER_PROJECTS_ASSETS = 'user_projects_assets';

const ImageJpgmap = {
    contentType: 'image/jpeg',
    name: 'ImageBitmap',
    runtimeFormat: 'jpg',
    immutable: true
};

const SoundMp3 = {
    contentType: 'audio/mpeg',
    name: 'sound',
    runtimeFormat: 'mp3',
    immutable: true
};


const NewAssetType = Object.assign(ScratchStorage.AssetType, {
    ImageJpgmap: ImageJpgmap,
    SoundMp3: SoundMp3
});


class GandiStorage extends ScratchStorage {
    constructor () {
        super();
        this.addWebStores();
    }

    set ccwCDNHost (host) {
        this._CDNHost = host;
    }

    get ccwCDNHost () {
        return this._CDNHost ? this._CDNHost : 'https://m.ccw.site';
    }

    get projectAssetCDNHost () {
        return `${this.ccwCDNHost}/${USER_PROJECTS_ASSETS}`;
    }

    addWebStores () {
        this.addWebStore(
            [this.AssetType.Project],
            this.getProjectGetConfig.bind(this)
        );

        this.addWebStore(
            [
                NewAssetType.ImageVector,
                NewAssetType.ImageBitmap,
                NewAssetType.ImageJpgmap,
                NewAssetType.Sound,
                NewAssetType.SoundMp3
            ],
            ({assetId, dataFormat}) => {
                const unprocessed = `${this.projectAssetCDNHost}/${assetId}.${dataFormat}`;
                if (dataFormat === 'png' || dataFormat === 'jpg' || dataFormat === 'jpeg') {
                    // fix: 有些资源图片可能已经被保存为 webp 格式，导致在 Safari 上无法正常加载
                    // 对于不支持 webp 格式的设备，强制转换成可用类型
                    return this.isWebpSupport ?
                        `${unprocessed}?x-oss-process=image/format,webp` :
                        `${unprocessed}?x-oss-process=image/format,${dataFormat}`;
                }

                return unprocessed;
            }
        );

        this.addWebStore(
            [this.AssetType.SoundMp3],
            asset => `${this.ccwCDNHost}/internalapi/asset/${asset.assetId}.${asset.dataFormat}`
        );
    }

    getProjectGetConfig (projectAsset) {
        if (/^https?:\/\//.test(projectAsset.assetId)) { // 当 assetId 为 URL 时加上时间戳保证读取最新文件
            return `${projectAsset.assetId}?t=${Date.now()}`;
        }

        return super.getProjectGetConfig(projectAsset);
    }
}

module.exports = GandiStorage;
