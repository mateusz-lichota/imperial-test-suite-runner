# Imperial Test Suite Runner

This extension integrates the IC/TestSuite.hs provided with many haskell exercises with VSCode Testing API.


Important remarks: 
- for the extension to activate your working directory has to contain a Tests.hs file
- in your Tests.hs file the third top-level declaration from the bottom has to be a list
of TestCase objects (this is the default, so if you don't make massive changes to Tests.hs
the extension will most likely work)
