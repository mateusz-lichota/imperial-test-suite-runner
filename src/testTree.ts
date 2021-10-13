import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import { parseHaskell } from './parser';
import fs = require('fs');
import path = require('path');
import { v4 as uuidV4 } from 'uuid';
import { exec } from 'child_process';


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
      const newPath = `${dir}/${uuidV4()}`;

      const start = Date.now();

      fs.createReadStream(filePath).pipe(fs.createWriteStream(newPath));

      fs.readFile(newPath, 'utf-8', (err, data) => {
        
        data.replace(/main = (.*)/, `main = ${mainCommand}`);
        fs.writeFile(newPath, data, (err) => {
          
          exec(`cd ${dir} && ${runghcPath} ${newPath}`, {}, (err, stdout, stderr) => {
            
            const failureRegexp = new RegExp(`> ${this.name} ([^=]+) = (.+)\n *test case expected: (.+)`, 'g');
            const failures = Array.from(stdout.matchAll(failureRegexp));
            
            
            const resultsRegexp = new RegExp(`${this.name}: ([0-9]+) / ([0-9]+)`, 'g');
            const results = stdout.match(resultsRegexp)!;
            
            const duration = Date.now() - start;

            if (failures.length === 0) {
              run.passed(item, duration);
            } else {
              const received = failures.map(x => x[2]).join('\n');
              const expected = failures.map(x => x[3]).join('\n');
              const message = vscode.TestMessage.diff(results[0], received, expected);
              message.location = new vscode.Location(item.uri!, item.range!);
              run.failed(item, message, duration);
            }

            // fs.unlinkSync(newPath);
            resolve();
          });
        });
      });
    });
  }
}
