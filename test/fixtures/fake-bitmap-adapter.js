const FakeBitmapAdapter = require('@turbowarp/scratch-svg-renderer').BitmapAdapter;

FakeBitmapAdapter.prototype.resize = function (canvas) {
    return canvas;
};

module.exports = FakeBitmapAdapter;
