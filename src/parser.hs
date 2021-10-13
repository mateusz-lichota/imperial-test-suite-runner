{- 
Copyright (c) 2021, Mateusz Lichota
All rights reserved.

This source code is licensed under the BSD-style license found in the
LICENSE.txt file in the root directory of this source tree. 
-}

{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE ScopedTypeVariables #-}
module Main
  ( main )
where

import qualified Data.ByteString.Lazy.Char8 as B

import System.Environment

import Data.Aeson

import GHC.Generics

import Text.Regex.TDFA

{- External Library Modules Imported -}
import qualified Language.Haskell.Exts.Parser as Parser
import Language.Haskell.Exts.Parser
  ( ParseMode   ( .. )
  , defaultParseMode
  , ParseResult ( .. )
  )

import Language.Haskell.Exts.Syntax
import Language.Haskell.Exts.SrcLoc


-- import qualified Language.Haskell.Exts.Pretty as Pretty
import Language.Haskell.Exts.Pretty
  ( prettyPrintWithMode
  , Pretty
  , PPHsMode              ( .. )
  , PPLayout              ( .. )
  , defaultMode
  )
import TcRnMonad (ContainsCostCentreState(extractCostCentreState))
import System.Directory.Internal.Prelude (exitFailure)

{- Local Modules Imported -}
{- End of Imports -}

toBS = B.unpack

-- parseTests :: Maybe 
parseAndDisplay =
  do contents <- readFile "Tests.hs"
     let pResult = parseContents contents
     case pResult of
       ParseOk hModule            ->
         printParsed hModule
       ParseFailed srcLoc message ->
         putStrLn "parsing error"

parseContents = Parser.parseModuleWithMode parseMode
  where parseMode = defaultParseMode { parseFilename = "Tests.hs" }


extractDeclarations :: Module l -> [Decl l]
extractDeclarations (Module l mh mp id d) = d
extractDeclarations _ = []

extractTestList :: Decl l -> Maybe [Exp l]
extractTestList (PatBind l0 name (UnGuardedRhs l1 (List l2 exps)) _) = Just exps
extractTestList _ = Nothing





data TestCaseStruct = TestCaseStruct {
      name  :: String,
      rowStart :: Int,
      rowStop :: Int,
      colStart :: Int,
      colStop :: Int,
      command :: String
    } deriving (Show, Generic)

instance ToJSON TestCaseStruct

testCaseNameRegexp = "TestCase \"([^\"]*)\""

expToTestCase :: Exp SrcSpanInfo -> TestCaseStruct
expToTestCase e@(App (SrcSpanInfo (SrcSpan _ rowStart colStart rowStop colStop) _) _ _) = TestCaseStruct name rowStart rowStop colStart colStop pp
  where pp = prettyPrintWithMode defaultMode e :: String
        name = head (pp =~ testCaseNameRegexp :: [[String]]) !! 1
        
expToTestCase _ = undefined
        


printParsed :: Pretty a => a -> IO ()
printParsed ssi = print $ prettyPrintWithMode defaultMode ssi

main = do
  args <- getArgs
  contents <- getContents
  let parseResult = parseContents contents
  
  case parseResult of
    ParseFailed _ _ -> putStrLn "[]" 
    ParseOk parsed -> do
      let declarations = extractDeclarations parsed
      let testcases = extractTestList $ declarations!!(length declarations - 3)

      case testcases of
        Nothing -> putStrLn "[]"
        Just tcs -> putStrLn $ toBS $ encode $ map expToTestCase tcs

  
