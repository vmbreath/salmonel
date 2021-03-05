
const zlib = require('zlib');
const stream = require('stream');

exports.gzip =  (input, options)=>{
    const promise = new Promise((resolve, reject) => {
        zlib.gzip(input, options,(error, result) => {
            if(!error) resolve(result);
            else reject(Error(error));
        });
    });
    return promise
}
exports.ungzip = (input, options) => {
    const promise = new Promise(function(resolve, reject) {
        zlib.gunzip(input, options, function (error, result) {
            if(!error) resolve(result);
            else reject(Error(error));
        });
    });
    return promise;
}

// const src = "// console.log(crypto.createHash('sha256').update('qwerty').digest('base64'))";
//
// gzip(src, {}).then(value => {
//     console.log(value);
//     ungzip(value, {}).then(it => console.log(it.toString('utf-8')))
// }).catch(reason => console.error(reason))
