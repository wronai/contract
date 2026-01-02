/**
 * Code Analysis Module
 * 
 * Exports code analysis and refactoring tools.
 */

export { CodeAnalyzer } from './code-analyzer';
export type { 
  FunctionInfo, 
  FileInfo, 
  DuplicateGroup, 
  AnalysisReport 
} from './code-analyzer';

export { RefactoringContractGenerator } from './refactoring-contract';
export type {
  RefactoringIssue,
  RefactoringType,
  RefactoringContract
} from './refactoring-contract';

export { ProjectStateGenerator } from './project-state';
export type {
  ProjectState,
  ModuleInfo,
  EntityInfo,
  EndpointInfo,
  HotspotInfo
} from './project-state';
