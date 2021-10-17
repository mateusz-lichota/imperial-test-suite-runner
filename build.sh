#!/bin/bash
cabal build --ghcjs

JSEXE="dist-newstyle/build/x86_64-linux/ghcjs-8.4.0.1/haskel-parser-js-0.1.0.0/x/haskell-parser-js/build/haskell-parser-js/haskell-parser-js.jsexe"

google-closure-compiler --js "$JSEXE/rts.js" --js_output_file "$JSEXE/rts.compiled.js"  --jscomp_off uselessCode --jscomp_off duplicateMessage
google-closure-compiler --js "$JSEXE/out.js" --js_output_file "$JSEXE/out.compiled.js"
# google-closure-compiler --js "$JSEXE/lib.js" --js_output_file "$JSEXE/lib.js"


cat > "parser/parser.js" <<- EOM
exports = module.exports = function bootAndRunHaskellModule(onLoaded) {
    var md = exports.boot();

    md.emitter.on('ghcjs-require:loaded', function() {
    md.wrapped = md.wrappedExports.reduce(function(memo, key) {
        memo[key] = function() {
        var args = Array.prototype.slice.apply(arguments);
        return new Promise(function(resolve, reject) {
            md.emitter.emit('ghcjs-require:runexport', key, args, function(err, result) {
            if (err) return reject(err);
            resolve(result);
            });
        });
        };
        return memo;
    }, {});

    if (onLoaded) onLoaded(md);
    });

    // Wait a tick so JavaScript land can bootstrap to the load event
    process.nextTick(function() {
    md.run();
    });

    return md;
};

exports.boot = function bootHaskellModule() {
    var global = {};
    global.exports = {};
    global.wrappedExports = [];
    return (function(global, exports, module) {

//rts starts here
$(cat "$JSEXE/rts.compiled.js")
//lib starts here
$(cat "$JSEXE/lib.js")
//out starts here
$(cat "$JSEXE/out.compiled.js")

    var EventEmitter = require('events');

    global.emitter = new EventEmitter();
    global.run = function() {
        return h\$run(h\$mainZCMainzimain);
    };

    global.runSync = function() {
        return h\$runSync(h\$mainZCMainzimain);
    };

    return global;
    })(global, global.exports, module);
};
EOM


