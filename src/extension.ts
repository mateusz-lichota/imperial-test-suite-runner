/* 
Copyright (c) 2021, Mateusz Lichota
All rights reserved.

This source code is licensed under the BSD-style license found in the
LICENSE.txt file in the root directory of this source tree. 
*/

import * as vscode from 'vscode';
import { TestCase, testData, TestFile } from './testTree';
import { execFileSync } from 'child_process';
import fs = require('fs');


export async function activate(context: vscode.ExtensionContext) {

  buildParserIfNonexistent();

  const ctrl = vscode.tests.createTestController('imperialTestController', 'Imperial Test Suite');
  context.subscriptions.push(ctrl);

  const runHandler = (request: vscode.TestRunRequest, cancellation: vscode.CancellationToken) => {
    const queue: { test: vscode.TestItem; data: TestCase }[] = [];
    const run = ctrl.createTestRun(request);

    const discoverTests = async (tests: Iterable<vscode.TestItem>) => {
      for (const test of tests) {
        if (request.exclude?.includes(test)) {
          continue;
        }

        const data = testData.get(test);
        if (data instanceof TestCase) {
          run.enqueued(test);
          queue.push({ test, data });
        } else {
          if (data instanceof TestFile && !data.didResolve) {
            await data.updateFromDisk(ctrl, test);
          }

          await discoverTests(gatherTestItems(test.children));
        }
      }
    };

    const runTestQueue = async () => {
      for (const { test, data } of queue) {
        run.appendOutput(`Running ${test.id}\r\n`);
        if (cancellation.isCancellationRequested) {
          run.skipped(test);
        } else {
          run.started(test);
          await data.run(test, run);
        }

        const lineNo = test.range!.start.line;
        // const fileCoverage = coveredLines.get(test.uri!.toString());
        // if (fileCoverage) {
        //   fileCoverage[lineNo]!.executionCount++;
        // }

        run.appendOutput(`Completed ${test.id}\r\n`);
      }

      run.end();
    };

    discoverTests(request.include ?? gatherTestItems(ctrl.items)).then(runTestQueue);
  };
  
  ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, runHandler, true);

  ctrl.resolveHandler = async item => {
    if (!item) {
      context.subscriptions.push(...startWatchingWorkspace(ctrl));
      return;
    }

    const data = testData.get(item);
    if (data instanceof TestFile) {
      await data.updateFromDisk(ctrl, item);
    }
  };

  function updateNodeForDocument(e: vscode.TextDocument) {
    if (e.uri.scheme !== 'file') {
      return;
    }
    
    if (!e.uri.path.endsWith('.hs')) {
      return;
    }

    const { file, data } = getOrCreateFile(ctrl, e.uri);
    data.updateFromContents(ctrl, e.getText(), file);
  }

  for (const document of vscode.workspace.textDocuments) {
    updateNodeForDocument(document);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(updateNodeForDocument),
    vscode.workspace.onDidChangeTextDocument(e => updateNodeForDocument(e.document)),
  );
}

function buildParserIfNonexistent() {
  const myExtDir = vscode.extensions.getExtension("mateusz-lichota.imperial-test-suite-runner")!.extensionPath;

  if (!fs.existsSync(`${myExtDir}/parser`)) {
    const ghcPath: string = vscode.workspace.getConfiguration('imperialTestSuiteRunner').get('ghcPath')!;
    try {
      execFileSync(ghcPath, ["-no-keep-hi-files", "-no-keep-o-files", `${myExtDir}/src/parser.hs`, "-o", `${myExtDir}/parser`], {});
    } catch (err: any) {
      vscode.window.showErrorMessage("Imperial Test Suite Runner: building parser failed: " + err.message);
    }
  }
}

function getOrCreateFile(controller: vscode.TestController, uri: vscode.Uri) {
  const existing = controller.items.get(uri.toString());
  if (existing) {
    return { file: existing, data: testData.get(existing) as TestFile };
  }

  const file = controller.createTestItem(uri.toString(), uri.path.split('/').pop()!, uri);
  controller.items.add(file);

  const data = new TestFile();
  testData.set(file, data);

  file.canResolveChildren = true;
  return { file, data };
}

function gatherTestItems(collection: vscode.TestItemCollection) {
  const items: vscode.TestItem[] = [];
  collection.forEach(item => items.push(item));
  return items;
}

function startWatchingWorkspace(controller: vscode.TestController) {
  if (!vscode.workspace.workspaceFolders) {
    return [];
  }

  return vscode.workspace.workspaceFolders.map(workspaceFolder => {
    const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.hs');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(uri => getOrCreateFile(controller, uri));
    watcher.onDidChange(uri => {
      const { file, data } = getOrCreateFile(controller, uri);
      if (data.didResolve) {
        data.updateFromDisk(controller, file);
      }
    });
    watcher.onDidDelete(uri => controller.items.delete(uri.toString()));

    vscode.workspace.findFiles(pattern).then(files => {
      for (const file of files) {
        getOrCreateFile(controller, file);
      }
    });

    return watcher;
  });
}
