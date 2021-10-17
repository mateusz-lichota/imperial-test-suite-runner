const { exit } = require('process');
const parser = require('parser');

const testfile = `

module Tests where

import IC.TestSuite

import Sequences


maxOf2TestCases
  =  [ (a, b) ==> a | (a, b) <- lst] ++ [ (b, a) ==> a | (a, b) <- lst]
    where lst = [ (a, b) | a <- [1..100], b <- [0..a]] 

maxOf3TestCases
  = [ (1, 2, 3) ==> 3,
      (2, 1, 3) ==> 3,
      (3, 3, 3) ==> 3
    ]

isADigitTestCases
  = [ ('0') ==> True,
      ('9') ==> True,
      ('A') ==> False,
      ('a') ==> False,
      ('Z') ==> False,
      ('z') ==> False
    ]

isAlphaTestCases
  = [ ('1') ==> False,
      ('A') ==> True,
      ('a') ==> True,
      ('Z') ==> True,
      ('z') ==> True
    ]

digitToIntTestCases
  = [ ('0') ==> 0,
      ('1') ==> 1,
      ('2') ==> 2,
      ('3') ==> 3,
      ('4') ==> 4,
      ('5') ==> 5,
      ('6') ==> 6,
      ('7') ==> 7,
      ('8') ==> 8,
      ('9') ==> 9
    ]

toUpperTestCases
  = [ ('a') ==> 'A',
      ('A') ==> 'A',
      ('0') ==> '0',
      ('z') ==> 'Z',
      ('Z') ==> 'Z'
    ]

--
-- Sequences and series
--

aRange = [-4.0, -3.8 .. 4.0]
dRange = [-4.0, -3.8 .. 4.0]
rRange = [-3.0, -2.8 .. 3.0]
nRange = [0..8]

arithmeticSeqTestCases
  = [ (0.0, 10.0, 0) ==> 0.0,
      (10.0, 10.0, 0) ==> 10.0,
      (0.0, 10.0, 10) ==> 100.0,
      (10.0, 0.0, 10) ==> 10.0
    ]
    ++ [ (a, d, n) ==> (a + d * fromIntegral n) | a <- aRange, d <- dRange, n <- nRange]

geometricSeqTestCases
  = [ (0.0, 10.0, 0) ==> 0.0,
      (10.0, 10.0, 0) ==> 10.0,
      (0.0, 10.0, 10) ==> 0.0,
      (10.0, 0.0, 10) ==> 0.0
    ]
    ++ [ (a, r, n) ==> (a * r^n) | a <- aRange, r <- rRange, n <- nRange]

arithmeticSeriesTestCases
  = [ (0.0, 10.0, 0) ==> 0.0,
      (10.0, 10.0, 0) ==> 10.0,
      (0.0, 10.0, 10) ==> 550.0,
      (10.0, 0.0, 10) ==> 110.0
    ]
    ++ [ (a, d, n) ==> sum [a + d * fromIntegral i | i <- [0..n]] | a <- aRange, d <- dRange, n <- nRange]

geometricSeriesTestCases
  = [ (0.0, 10.0, 0) ==> 0.0,
    (10.0, 10.0, 0) ==> 10.0 
    ] 
    ++ [(a, r, n) ==> sum [a*r^i | i <- [0..n]] | a <- aRange, r <- rRange, n <- nRange]

-- You can add your own test cases above

sequencesTestCases
  = [ TestCase  "maxOf2"      (uncurry maxOf2)
                              maxOf2TestCases
     , TestCase "maxOf3"      (uncurry3 maxOf3)
                              maxOf3TestCases
     , TestCase "isADigit"    (isADigit)
                              isADigitTestCases
     , TestCase "isAlpha"     (isAlpha)
                              isAlphaTestCases
     , TestCase "digitToInt"  (digitToInt)
                              digitToIntTestCases
     , TestCase "toUpper"     (toUpper)
                              toUpperTestCases
     , TestCase "arithmeticSeq" (uncurry3 arithmeticSeq)
                                arithmeticSeqTestCases
     , TestCase "geometricSeq"  (uncurry3 geometricSeq)
                                geometricSeqTestCases
     , TestCase "arithmeticSeries"  (uncurry3 arithmeticSeries)
                                    arithmeticSeriesTestCases
     , TestCase "geometricSeries"   (uncurry3 geometricSeries)
                                    geometricSeriesTestCases
    ]

runTests = mapM_ goTest sequencesTestCases

main = runTests
`;



async function parserPromisified() {
  return new Promise((resolve, reject) => {
    parser(({ wrapped }) => {
      resolve(wrapped.extractTestCases);
    });
  });
}


async function main() {
  var etc = await parserPromisified();
  const res = await etc(testfile);

  console.log(res);
  exit(0);
  // console.log(await extractTestCases(testfile));
}

main();
