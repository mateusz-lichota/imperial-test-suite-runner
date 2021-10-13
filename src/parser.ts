import * as vscode from 'vscode';
import { execSync } from 'child_process';

const testRe = /TestCase\s*"([^"]*)"/;

interface TCimport {
  name: string;
  rangeStart: number;
  rangeStop: number;
  command: string;
}

const myExtDir = vscode.extensions.getExtension ("mateusz-lichota.imperial-test-suite-runner")!.extensionPath;

export const parseHaskell = (text: string, events: {
  onTest(range: vscode.Range, name: string, testcaseCMD: string): void;
  }) => {
    const result = execSync(`${myExtDir}/src/parser`, {input: text}).toString();
    let tcs: [TCimport] = JSON.parse(result);
    tcs.forEach(tc => {
      vscode.window.showInformationMessage(JSON.stringify(tc));
      events.onTest(new vscode.Range(new vscode.Position(tc.rangeStart-1, 0), new vscode.Position(tc.rangeStop-1, 0)), tc.name, tc.command);
    });
};
