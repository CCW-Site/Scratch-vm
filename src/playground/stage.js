import ScratchRender from '@xigua/scratch-render';
import {BitmapAdapter as V2BitmapAdapter} from 'scratch-svg-renderer';
import ScratchStorage from 'scratch-storage';
import VirtualMachine from '../index';
import Runtime from '../engine/runtime';
import AudioEngine from 'scratch-audio';
import AssetType from 'scratch-storage/src/AssetType';
import {decodeString} from '@teana/scratch-analyzer';
import jszip from 'jszip';
import lodash from 'lodash';

const Scratch = window.Scratch = window.Scratch || {vm: null, render: null};
const USER_PROJECTS_ASSETS = 'user_projects_assets';
const PROJECT_JSON = 'Project.json';
const XIGUA_ENCODE_HEADER = '{';


const concatTypedArray = (resultConstructor, ...arrays) => {
    let totalLength = 0;
    for (const arr of arrays) {
        totalLength += arr.length;
    }
    const result = new resultConstructor(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
};

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


const NewAssetType = Object.assign(AssetType, {
    ImageJpgmap: ImageJpgmap,
    SoundMp3: SoundMp3
});


class CCWStorage extends ScratchStorage {
    constructor () {
        console.log('CCWStorage constructor');
        super();
        // webp 支持检测
        try {
            this.isWebpSupport = document.createElement('canvas').toDataURL('image/webp', 0.5)
                .startsWith('data:image/webp');
        } catch (e) {
            this.isWebpSupport = false;
        }
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

class CCWStorageWithOSSStore extends CCWStorage {
    load (...args) {
        return super.load(...args).then(result => {
            const {name, runtimeFormat} = result.assetType;
            const assetName = `${name}.${runtimeFormat}`;
            // 当读取的 asset 是 project.json 时并且data type 不是 string，需要对其进行解压解密处理
            // 默认 data 为 string 时，直接读取到了工程的 json
            if (assetName === PROJECT_JSON && typeof result.data !== 'string') {
                // 还原混淆的 zip 算法头
                // 使用前8个字节判断是否是混淆的 zip 算法
                const prefix = Array.from(result.data.slice(0, 8));
                const isChaos = lodash.isEqual(prefix, [55, 122, 188, 175, 9, 5, 2, 7]);
                const data = isChaos ? concatTypedArray(Uint8Array, new Uint8Array([80, 75, 3, 4, 10, 0, 0, 0]), result.data.slice(8)) : result.data;
                result.data = data;
                return jszip.loadAsync(data).then(zip => {
                    const jsonFile = zip.files[PROJECT_JSON.toLocaleLowerCase()];
                    return zip.file(jsonFile.name).async('text')
                        .then(jsonStr => {

                            if (!jsonStr.startsWith(XIGUA_ENCODE_HEADER)) {
                                const decodeStr = decodeURIComponent(atob(decodeString(jsonStr)));
                                zip.file(PROJECT_JSON.toLocaleLowerCase(), decodeStr);
                                return zip.generateAsync({
                                    type: 'uint8array'
                                }).then(data => ({...result, data}));
                            }
                            return result;
                        });
                })
                    .catch(() => {
                        if (assetName === PROJECT_JSON && typeof result.data !== 'string') {
                            result.data = result.decodeText();
                        }
                        return result;
                    });
            }
            return result;
        });
    }
}


const run = function () {
    // Lots of global variables to make debugging easier
    // Instantiate the VM.
    const vm = new VirtualMachine();
    Scratch.vm = vm;

    // vm.setTurboMode(true);

    const storage = new CCWStorageWithOSSStore();
    vm.attachStorage(storage);

    // Instantiate the renderer and connect it to the VM.
    let canvas = document.getElementsByTagName('canvas')[0];
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'width:1440px;height:720px;border: 1px solid #000;';
        document.body.appendChild(canvas);
    }
    const size = {width: 1440, height: 720};
    const renderer = new ScratchRender(
        canvas,
        -size.width / 2,
        size.width / 2,
        -size.height / 2,
        size.height / 2
    );
    vm.runtime.stageWidth = size.width;
    vm.runtime.stageHeight = size.height;

    vm.attachRenderer(renderer);
    vm.renderer.draw();

    // const renderer = new ScratchRender(canvas);
    // vm.attachRenderer(renderer);
    Scratch.renderer = renderer;

    const audioEngine = new AudioEngine();
    vm.attachAudioEngine(audioEngine);
    vm.attachV2BitmapAdapter(new V2BitmapAdapter());

    // Feed mouse events as VM I/O events.
    document.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const coordinates = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            canvasWidth: rect.width,
            canvasHeight: rect.height
        };
        vm.postIOData('mouse', coordinates);
    });
    canvas.addEventListener('mousedown', e => {
        const rect = canvas.getBoundingClientRect();
        const data = {
            isDown: true,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            canvasWidth: rect.width,
            canvasHeight: rect.height
        };
        vm.postIOData('mouse', data);
        e.preventDefault();
    });
    canvas.addEventListener('mouseup', e => {
        const rect = canvas.getBoundingClientRect();
        const data = {
            isDown: false,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            canvasWidth: rect.width,
            canvasHeight: rect.height
        };
        vm.postIOData('mouse', data);
        e.preventDefault();
    });

    // Feed keyboard events as VM I/O events.
    document.addEventListener('keydown', e => {
        // Don't capture keys intended for Blockly inputs.
        if (e.target !== document && e.target !== document.body) {
            return;
        }
        vm.postIOData('keyboard', {
            keyCode: e.keyCode,
            isDown: true
        });
        e.preventDefault();
    });
    document.addEventListener('keyup', e => {
        // Always capture up events,
        // even those that have switched to other targets.
        vm.postIOData('keyboard', {
            keyCode: e.keyCode,
            isDown: false
        });
        // E.g., prevent scroll.
        if (e.target !== document && e.target !== document.body) {
            e.preventDefault();
        }
    });

    console.log('load project');

    vm.downloadProjectId('https://m.xiguacity.cn/user_projects_sb3/203524981/40c2e5ee70103516d62bfe9d128f4e57.sb3?t=1664249224306');

    vm.runtime.on(Runtime.PROJECT_LOADED, () => {
        console.log('Runtime.PROJECT_LOADED');
        // Run threads
        vm.start();
        vm.greenFlag();
        console.log('vm started');
    });

};

window.onload = () => {
    console.log('window loaded');
    run();
};
