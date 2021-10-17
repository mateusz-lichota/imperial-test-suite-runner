/* 
Copyright (c) 2021, Mateusz Lichota
All rights reserved.

This source code is licensed under the BSD-style license found in the
LICENSE.txt file in the root directory of this source tree. 
*/

import * as vscode from 'vscode';

const parser = require('parser');

var extractTestCases: Function;
async function parserPromisified() : Promise<Function> {
  return new Promise((resolve, reject) => {
    parser(({ wrapped }: any) => {
      resolve(wrapped.extractTestCases);
    });
  });
}

interface TCimport {
  name: string;
  rowStart: number;
  rowStop: number;
  colStart: number;
  colStop: number;
  command: string;
}


export async function parseHaskell(text: string, events: {
  onTest(range: vscode.Range, name: string, testcaseCMD: string): void;
}) {
  if (!extractTestCases) {
    extractTestCases = await parserPromisified();
  }
  const result = await extractTestCases(text);
  let tcs: [TCimport] = JSON.parse(result);
  tcs.forEach(tc => {
    events.onTest(new vscode.Range(new vscode.Position(tc.rowStart - 1, tc.colStart), new vscode.Position(tc.rowStop - 1, tc.colStop)), tc.name, tc.command);
  });
};
