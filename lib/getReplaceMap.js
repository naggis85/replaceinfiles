var fs = require('fs');
var _source;

module.exports = function getReplaceMap(encoding, path, replaceMap, source = null) {
  if(source) {
    _source = source;
  }
  if (path && replaceMap) {
    return Promise.reject(new Error('Cannot specify both replaceMapPath and replaceMap.'));
  } else if (replaceMap) {
    return Promise.resolve(replaceMap);
  }
  return getReadStreamOrStdin(encoding, path)
         .then(parseStreamToJSON);
}

function getReadStreamOrStdin(encoding, path) {
  return new Promise(function(resolve, reject) {
    try {
      var sourceStream;
      if (path) {
        sourceStream = fs.createReadStream(path, {
          autoclose : true,
          encoding : encoding
        });
      } else {
        process.stdin.setEncoding(encoding);
        sourceStream = process.stdin;
      }
      resolve(sourceStream);
    } catch(error) {
      reject(error);
    }
  });
}

function parseStreamToJSON(stream) {
  return new Promise(function(resolve, reject) {
    var sourceChunks = [];
    try {
      stream.on('readable', function() {
        var chunk = stream.read();
        if (chunk) {
          if (_source) {
            var newchunk = JSON.parse(chunk);
            if (newchunk.toString().indexOf('\\') && _source.indexOf('/')) {
              Object.keys(newchunk).forEach(function(k) {
                var key = k;
                var val = newchunk[k]
                if (key.indexOf('\\') > -1) {
                  k = k.replace(/\\/g, '/');
                }
                if (val.indexOf('\\') > -1) {
                  newchunk[k] = newchunk[key].replace(/\\/g, '/');
                }
                delete newchunk[key];
              });
            }
            newchunk = JSON.stringify(newchunk);
            sourceChunks.push(newchunk);
          } else {
            sourceChunks.push(chunk);
          }
        }
      });
      stream.on('end', function() {
        var replaceMap = JSON.parse(sourceChunks.join());
        console.log('replaceMap'+replaceMap);
        resolve(replaceMap);
      });
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}