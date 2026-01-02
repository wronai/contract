/**
 * Contract Parser Module
 * Exports markdown parser and related functions
 */

export { 
  parseContractMarkdown, 
  validateContract 
} from './markdown-parser';

export type { 
  ContractMarkdown, 
  ContractFrontmatter, 
  MarkdownEntityDefinition 
} from './markdown-parser';
