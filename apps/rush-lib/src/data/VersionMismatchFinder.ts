// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import RushConfigurationProject from './RushConfigurationProject';

/**
 * @public
 */
export class VersionMismatchFinder {
 /* store it like this:
  * {
  *   "@types/node": {
  *     "1.0.0": [ '@ms/rush' ]
  *   }
  * }
  */
  private _mismatches: Map<string, Map<string, string[]>>;
  private _projects: RushConfigurationProject[];

  constructor(projects: RushConfigurationProject[]) {
    this._projects = projects;
    this._mismatches = new Map<string, Map<string, string[]>>();
    this._analyze();
  }

  public get numberOfMismatches(): number {
    return this._mismatches.size;
  }

  public getMismatches(): Array<string> {
    return this._getKeys(this._mismatches);
  }

  public getVersionsOfMismatch(mismatch: string): Array<string> | undefined {
    return this._mismatches.has(mismatch)
      ? this._getKeys(this._mismatches.get(mismatch))
      : undefined;
  }

  public getConsumersOfMismatch(mismatch: string, version: string): Array<string> | undefined {
    const mismatchedPackage: Map<string, string[]> | undefined = this._mismatches.get(mismatch);
    if (!mismatchedPackage) {
      return undefined;
    }

    const mismatchedVersion: string[] | undefined = mismatchedPackage.get(version);
    return mismatchedVersion;
  }

  private _analyze(): void {
    this._projects.forEach((project: RushConfigurationProject) => {
      if (!project.skipRushCheck) {
        // NOTE: We do not consider peer dependencies here.  The purpose of "rush check" is
        // mainly to avoid side-by-side duplicates in the node_modules folder, whereas
        // peer dependencies are just a compatibility statement that will be satisfied by a
        // regular dependency.  (It might be useful for Rush to help people keep their peer dependency
        // patterns consistent, but on the other hand different projects may have different
        // levels of compatibility -- we should wait for someone to actually request this feature
        // before we get into that.)
        this._addDependenciesToList(project.packageName,
          project.packageJson.dependencies, project.cyclicDependencyProjects);
        this._addDependenciesToList(project.packageName,
          project.packageJson.devDependencies, project.cyclicDependencyProjects);
        this._addDependenciesToList(project.packageName,
          project.packageJson.optionalDependencies, project.cyclicDependencyProjects);
      }
    });

    this._mismatches.forEach((mismatches: Map<string, string[]>, project: string) => {
      if (mismatches.size <= 1) {
        this._mismatches.delete(project);
      }
    });
  }

  private _addDependenciesToList(
    project: string,
    dependencyMap: { [dependency: string]: string } | undefined,
    exclude: Set<string>): void {

    if (dependencyMap) {
      Object.keys(dependencyMap).forEach((dependency: string) => {
        if (!exclude || !exclude.has(dependency)) {
          const version: string = dependencyMap[dependency];
          if (!this._mismatches.has(dependency)) {
            this._mismatches.set(dependency, new Map<string, string[]>());
          }

          const dependencyVersions: Map<string, string[]> = this._mismatches.get(dependency)!;

          if (!dependencyVersions.has(version)) {
            dependencyVersions.set(version, []);
          }
          dependencyVersions.get(version)!.push(project);
        }
      });
    }
  }

  // tslint:disable-next-line:no-any
  private _getKeys(iterable: Map<string, any> | undefined): string[] {
    const keys: string[] = [];
    if (iterable) {
      // tslint:disable-next-line:no-any
      iterable.forEach((value: any, key: string) => {
        keys.push(key);
      });
    }
    return keys;
  }
}