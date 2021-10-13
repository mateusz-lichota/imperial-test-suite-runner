/* 
Copyright (c) 2021, Mateusz Lichota
All rights reserved.

This source code is licensed under the BSD-style license found in the
LICENSE.txt file in the root directory of this source tree. 
*/

import * as vscode from 'vscode';
import { execSync } from 'child_process';

const testRe = /TestCase\s*"([^"]*)"/;

interface TCimport {
  name: string;
  rowStart: number;
  rowStop: number;
  colStart: number;
  colStop: number;
  command: string;
}

const myExtDir = vscode.extensions.getExtension ("mateusz-lichota.imperial-test-suite-runner")!.extensionPath;

export const parseHaskell = (text: string, events: {
  onTest(range: vscode.Range, name: string, testcaseCMD: string): void;
  }) => {
    const result = execSync(`${myExtDir}/parser`, {input: text}).toString();
    let tcs: [TCimport] = JSON.parse(result);
    tcs.forEach(tc => {
      events.onTest(new vscode.Range(new vscode.Position(tc.rowStart-1, tc.colStart), new vscode.Position(tc.rowStop-1, tc.colStop)), tc.name, tc.command);
    });
};
