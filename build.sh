#!/bin/bash
cabal build --ghcjs
mkdir bin 2> /dev/null
echo "#!/usr/bin/env node" > bin/parser
cat dist-newstyle/build/x86_64-linux/ghcjs-8.4.0.1/haskel-parser-js-0.1.0.0/x/haskell-parser-js/build/haskell-parser-js/haskell-parser-js.jsexe/all.js >> bin/parser
chmod +x bin/parser

