// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as os from 'os';
import * as path from 'path';

import {
  CommandLineAction,
  ICommandLineActionOptions
} from '@microsoft/ts-command-line';

import { LockFile } from '@microsoft/node-core-library';

import RushConfiguration from '../../data/RushConfiguration';
import EventHooksManager from '../logic/EventHooksManager';
import RushCommandLineParser from './RushCommandLineParser';

export interface IRushCommandLineActionOptions extends ICommandLineActionOptions {
  /**
   * If true, no locking mechanism will be enforced when this action is run.
   * Note this defaults to false (which is a safer assumption in case this value
   *  is omitted).
   */
  safeForSimultaneousRushProcesses?: boolean;

  /**
   * The rush parser.
   */
  parser: RushCommandLineParser;
}

/**
 * The base Rush action that all Rush actions should extend.
 */
export abstract class BaseRushAction extends CommandLineAction {
  private _parser: RushCommandLineParser;
  private _eventHooksManager: EventHooksManager;
  private _safeForSimultaneousRushProcesses: boolean;

  protected get rushConfiguration(): RushConfiguration {
    return this._parser.rushConfiguration;
  }

  protected get parser(): RushCommandLineParser {
    return this._parser;
  }

  constructor(options: IRushCommandLineActionOptions) {
    super(options);

    this._parser = options.parser;
    this._safeForSimultaneousRushProcesses = !!options.safeForSimultaneousRushProcesses;
  }

  protected onExecute(): Promise<void> {
    this._ensureEnvironment();

    if (!this._safeForSimultaneousRushProcesses) {
      if (!LockFile.tryAcquire(this.rushConfiguration.commonTempFolder, 'rush')) {
        console.log(`Another rush command is already running in this repository.`);
        process.exit(1);
      }
    }

    console.log(`Starting "rush ${this.options.actionVerb}"${os.EOL}`);
    return this.run();
  }

  /**
   * All Rush actions need to implement this method. This method runs after
   * environment has been set up by the base class.
   */
  protected abstract run(): Promise<void>;

  protected get eventHooksManager(): EventHooksManager {
    if (!this._eventHooksManager) {
      this._eventHooksManager = new EventHooksManager(this.rushConfiguration.eventHooks);
    }
    return this._eventHooksManager;
  }

  private _ensureEnvironment(): void {
    /* tslint:disable-next-line:no-string-literal */
    let environmentPath: string | undefined = process.env['PATH'];
    environmentPath = path.join(this.rushConfiguration.commonTempFolder, 'node_modules', '.bin') +
      path.delimiter + environmentPath;
    /* tslint:disable-next-line:no-string-literal */
    process.env['PATH'] = environmentPath;
  }
}