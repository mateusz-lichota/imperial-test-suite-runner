/* 
Copyright (c) 2021, Mateusz Lichota
All rights reserved.

This source code is licensed under the BSD-style license found in the
LICENSE.txt file in the root directory of this source tree. 
*/

import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import { parseHaskell } from './parser';
import fs = require('fs');
import path = require('path');
import { v4 as uuidV4 } from 'uuid';
import { execFile } from 'child_process';


const textDecoder = new TextDecoder('utf-8');

export type HaskellTestData = TestFile | TestHeading | TestCase;

export const testData = new WeakMap<vscode.TestItem, HaskellTestData>();

let generationCounter = 0;

export const getContentFromFilesystem = async (uri: vscode.Uri) => {
  try {
    const rawContent = await vscode.workspace.fs.readFile(uri);
    return textDecoder.decode(rawContent);
  } catch (e) {
    console.warn(`Error providing tests for ${uri.fsPath}`, e);
    return '';
  }
};

export class TestFile {
  public didResolve = false;

  public async updateFromDisk(controller: vscode.TestController, item: vscode.TestItem) {
    try {
      const content = await getContentFromFilesystem(item.uri!);
      item.error = undefined;
      this.updateFromContents(controller, content, item);
    } catch (e: any) {
      item.error = e.stack;
    }
  }

  /**
   * Parses the tests from the input text, and updates the tests contained
   * by this file to be those from the text,
   */
  public updateFromContents(controller: vscode.TestController, content: string, item: vscode.TestItem) {
    const ancestors = [{ item, children: [] as vscode.TestItem[] }];
    const thisGeneration = generationCounter++;
    this.didResolve = true;

    const ascend = (depth: number) => {
      while (ancestors.length > depth) {
        const finished = ancestors.pop()!;
        finished.item.children.replace(finished.children);
      }
    };

    parseHaskell(content, {
      onTest: (range: vscode.Range, name: string, testcaseCMD: string) => {
        const parent = ancestors[ancestors.length - 1];
        const data = new TestCase(name, testcaseCMD, thisGeneration);
        const id = `${item.uri}/${data.getLabel()}`;


        const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
        testData.set(tcase, data);
        tcase.range = range;
        parent.children.push(tcase);
      },
    });

    ascend(0); // finish and assign children for all remaining items
  }
}

export class TestHeading {
  constructor(public generation: number) { }
}


export class TestCase {
  constructor(
    private readonly name: string,
    private readonly testcaseCMD: string,
    public generation: number
  ) { }

  getLabel() {
    return `${this.name}`;
  }

  async run(item: vscode.TestItem, run: vscode.TestRun): Promise<void> {
    return new Promise((resolve, reject) => {
      const runghcPath: string = vscode.workspace.getConfiguration('imperialTestSuiteRunner').get('runghcPath')!;

      const mainCommand = 'goTest $ ' + this.testcaseCMD;

      const filePath = item.uri!.fsPath;
      const dir = path.dirname(filePath);
      const newPath = `/tmp/${uuidV4()}`;

      const start = Date.now();

      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
          run.errored(item, new vscode.TestMessage(`error testing ${this.name}: "${err.name}: ${err.message}"`), Date.now() - start);
          return resolve();
        }

        fs.writeFile(newPath, data.replace(/main = (.*)/, `main = ${mainCommand}`), (err) => {
          if (err) {
            run.errored(item, new vscode.TestMessage(`error testing ${this.name}: "${err.name}: ${err.message}"`), Date.now() - start);
            return resolve();
          }

          execFile(runghcPath,  [newPath], { cwd: dir, timeout: 2000, killSignal: "SIGTERM" }, (err, stdout, stderr) => {
            if (err) {
              if (err.signal === "SIGTERM") {
                run.failed(item, new vscode.TestMessage(`timeout while testing ${this.name}`), Date.now() - start);
              } else {
                run.errored(item, new vscode.TestMessage(`error testing ${this.name}: "${err.name}: ${err.message}"`), Date.now() - start);
              }
              return fs.unlink(newPath, () => resolve());
            }

            const failureRegexp = new RegExp(`> ${this.name} ([^=]+) = (.+)(\n.+)*test case expected: (.+)`, 'g');
            const failures = Array.from(stdout.matchAll(failureRegexp));

            const resultsRegexp = new RegExp(`${this.name}: ([0-9]+) / ([0-9]+)`, 'g');
            const results = stdout.match(resultsRegexp)!;

            if (failures.length === 0) {
              run.passed(item, Date.now() - start);
            } else {
              const received = failures.map(x => `${this.name} ${x[1]} = ${x[2]}`).join('\n');
              const expected = failures.map(x => `${this.name} ${x[1]} = ${x[4]}`).join('\n');
              const message = vscode.TestMessage.diff(results[0], expected, received);
              message.location = new vscode.Location(item.uri!, item.range!);
              run.failed(item, message, Date.now() - start);
            }

            return fs.unlink(newPath, () => resolve());
          });
        });
      });
    });
  }
}
