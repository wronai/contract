/**
 * Shell Renderer
 * 
 * @description Renders markdown codeblocks with ANSI colors in terminal.
 *              Provides syntax highlighting for YAML, JSON, TypeScript, JavaScript, Bash, Markdown.
 * 
 * @usage
 *   const renderer = new ShellRenderer();
 *   renderer.codeblock('yaml', 'key: value');
 *   renderer.heading(2, 'Title');
 *   renderer.task('Task name', 'running');
 * 
 * @supported_formats
 *   - yaml, yml     : Key highlighting (cyan), values (green), numbers (magenta)
 *   - json          : Key highlighting (cyan), string values (green), numbers (magenta)
 *   - bash, sh      : Commands (green), comments (gray)
 *   - typescript, ts: Keywords (magenta), strings (green), comments (gray)
 *   - javascript, js: Keywords (magenta), strings (green), comments (gray)
 *   - markdown, md  : Headers (cyan), bold, links
 *   - text, txt, log: Plain white text
 * 
 * @color_scheme
 *   - cyan:    Keys, headers, identifiers
 *   - green:   String values, commands
 *   - magenta: Numbers, keywords
 *   - yellow:  Booleans, warnings
 *   - gray:    Comments, borders, dim text
 *   - red:     Errors
 *   - blue:    Links
 * 
 * @version 1.0.0
 */

// ANSI Color Codes - Standard terminal escape sequences
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background
  bgBlack: '\x1b[40m',
  bgBlue: '\x1b[44m',
  bgGray: '\x1b[100m',
};

export class ShellRenderer {
  private useColors: boolean;

  constructor(useColors = true) {
    this.useColors = useColors && process.stdout.isTTY !== false;
  }

  // Color helpers
  private c(color: keyof typeof COLORS, text: string): string {
    if (!this.useColors) return text;
    return `${COLORS[color]}${text}${COLORS.reset}`;
  }

  // Render a heading
  heading(level: number, text: string): void {
    const prefix = '#'.repeat(level);
    console.log(`\n${this.c('bold', this.c('cyan', `${prefix} ${text}`))}\n`);
  }

  // Render a codeblock with syntax highlighting
  codeblock(lang: string, content: string): void {
    const border = this.c('gray', '```' + lang);
    const borderEnd = this.c('gray', '```');
    
    console.log(border);
    
    const lines = content.split('\n');
    for (const line of lines) {
      console.log(this.highlightLine(lang, line));
    }
    
    console.log(borderEnd);
  }

  // Highlight a single line based on language
  private highlightLine(lang: string, line: string): string {
    switch (lang.toLowerCase()) {
      case 'yaml':
      case 'yml':
        return this.highlightYaml(line);
      case 'json':
        return this.highlightJson(line);
      case 'bash':
      case 'sh':
      case 'shell':
        return this.highlightBash(line);
      case 'typescript':
      case 'ts':
      case 'javascript':
      case 'js':
        return this.highlightJs(line);
      case 'text':
      case 'txt':
      case 'log':
        return this.c('white', line);
      case 'markdown':
      case 'md':
        return this.highlightMarkdown(line);
      default:
        return this.c('white', line);
    }
  }

  // JavaScript/TypeScript syntax highlighting
  private highlightJs(line: string): string {
    let result = line;
    
    // Comments
    if (line.trim().startsWith('//')) {
      return this.c('gray', line);
    }
    
    // Keywords
    const keywords = ['const', 'let', 'var', 'function', 'async', 'await', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'class', 'interface', 'type'];
    for (const kw of keywords) {
      result = result.replace(new RegExp(`\\b${kw}\\b`, 'g'), this.c('magenta', kw));
    }
    
    // Strings
    result = result.replace(/'([^']*)'/g, this.c('green', "'$1'"));
    result = result.replace(/"([^"]*)"/g, this.c('green', '"$1"'));
    result = result.replace(/`([^`]*)`/g, this.c('green', '`$1`'));
    
    return result;
  }

  // Markdown syntax highlighting
  private highlightMarkdown(line: string): string {
    // Headers
    if (line.match(/^#{1,6}\s/)) {
      return this.c('cyan', line);
    }
    // Bold
    if (line.includes('**')) {
      return line.replace(/\*\*([^*]+)\*\*/g, this.c('bold', '$1'));
    }
    // Links
    if (line.includes('[')) {
      return line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `${this.c('blue', '[$1]')}(${this.c('gray', '$2')})`);
    }
    return line;
  }

  // YAML syntax highlighting
  private highlightYaml(line: string): string {
    // Comments
    if (line.trim().startsWith('#')) {
      return this.c('gray', line);
    }
    
    // Key: value pairs
    const keyMatch = line.match(/^(\s*)([^:]+)(:)(.*)$/);
    if (keyMatch) {
      const [, indent, key, colon, value] = keyMatch;
      const coloredKey = this.c('cyan', key);
      const coloredColon = this.c('white', colon);
      let coloredValue = value;
      
      // Color values based on type
      const trimmedValue = value.trim();
      if (trimmedValue === 'true' || trimmedValue === 'false') {
        coloredValue = this.c('yellow', value);
      } else if (trimmedValue.match(/^\d+$/)) {
        coloredValue = this.c('magenta', value);
      } else if (trimmedValue.startsWith('"') || trimmedValue.startsWith("'")) {
        coloredValue = this.c('green', value);
      } else if (trimmedValue === 'null' || trimmedValue === '~') {
        coloredValue = this.c('gray', value);
      } else {
        coloredValue = this.c('green', value);
      }
      
      return `${indent}${coloredKey}${coloredColon}${coloredValue}`;
    }
    
    // List items
    if (line.trim().startsWith('-')) {
      const match = line.match(/^(\s*)(-)(.*)$/);
      if (match) {
        const [, indent, dash, rest] = match;
        return `${indent}${this.c('white', dash)}${this.c('green', rest)}`;
      }
    }
    
    return line;
  }

  // JSON syntax highlighting
  private highlightJson(line: string): string {
    // Simple JSON highlighting
    let result = line;
    
    // Keys
    result = result.replace(/"([^"]+)":/g, (_, key) => 
      `${this.c('cyan', `"${key}"`)}:`
    );
    
    // String values
    result = result.replace(/: "([^"]+)"/g, (_, val) => 
      `: ${this.c('green', `"${val}"`)}`
    );
    
    // Numbers
    result = result.replace(/: (\d+)/g, (_, num) => 
      `: ${this.c('magenta', num)}`
    );
    
    // Booleans
    result = result.replace(/: (true|false)/g, (_, bool) => 
      `: ${this.c('yellow', bool)}`
    );
    
    // null
    result = result.replace(/: null/g, `: ${this.c('gray', 'null')}`);
    
    return result;
  }

  // Bash syntax highlighting
  private highlightBash(line: string): string {
    // Comments
    if (line.trim().startsWith('#')) {
      return this.c('gray', line);
    }
    
    // Commands
    const words = line.split(' ');
    if (words.length > 0) {
      const cmd = words[0];
      const args = words.slice(1).join(' ');
      return `${this.c('green', cmd)} ${this.c('white', args)}`;
    }
    
    return line;
  }

  // Render status icons with colors
  status(icon: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const colors: Record<string, keyof typeof COLORS> = {
      info: 'blue',
      success: 'green',
      warning: 'yellow',
      error: 'red'
    };
    console.log(`${icon} ${this.c(colors[type], message)}`);
  }

  // Render a key-value line
  kv(key: string, value: string | number | boolean): void {
    console.log(`  ${this.c('cyan', key)}: ${this.c('white', String(value))}`);
  }

  // Render progress
  progress(done: number, total: number, label?: string): void {
    const pct = Math.round((done / total) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
    const labelStr = label ? ` ${label}` : '';
    console.log(`${this.c('gray', '[')}${this.c('green', bar)}${this.c('gray', ']')} ${this.c('cyan', `${pct}%`)}${labelStr}`);
  }

  // Render a separator
  separator(): void {
    console.log(this.c('gray', '─'.repeat(60)));
  }

  // Render inline code
  inline(text: string): string {
    return this.c('cyan', text);
  }

  // Render a task status
  task(name: string, status: 'pending' | 'running' | 'done' | 'failed', duration?: number): void {
    const icons: Record<string, string> = {
      pending: '⏳',
      running: '🔄',
      done: '✅',
      failed: '❌'
    };
    const colors: Record<string, keyof typeof COLORS> = {
      pending: 'gray',
      running: 'yellow',
      done: 'green',
      failed: 'red'
    };
    
    const durationStr = duration !== undefined ? this.c('gray', ` (${duration}s)`) : '';
    console.log(`${icons[status]} ${this.c(colors[status], name)}${durationStr}`);
  }
}

// Singleton instance
let renderer: ShellRenderer | null = null;

export function getRenderer(): ShellRenderer {
  if (!renderer) {
    renderer = new ShellRenderer();
  }
  return renderer;
}

// Convenience functions
export const render = {
  heading: (level: number, text: string) => getRenderer().heading(level, text),
  code: (lang: string, content: string) => getRenderer().codeblock(lang, content),
  status: (icon: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => getRenderer().status(icon, msg, type),
  kv: (key: string, value: string | number | boolean) => getRenderer().kv(key, value),
  progress: (done: number, total: number, label?: string) => getRenderer().progress(done, total, label),
  separator: () => getRenderer().separator(),
  task: (name: string, status: 'pending' | 'running' | 'done' | 'failed', duration?: number) => getRenderer().task(name, status, duration),
  inline: (text: string) => getRenderer().inline(text),
};

// Helper to wrap console.log with markdown rendering
export function renderMarkdown(text: string): void {
  const r = getRenderer();
  const lines = text.split('\n');
  let inCodeblock = false;
  let codeblockLang = '';
  let codeblockContent: string[] = [];

  for (const line of lines) {
    // Check for codeblock start/end
    if (line.startsWith('```')) {
      if (inCodeblock) {
        // End of codeblock
        r.codeblock(codeblockLang, codeblockContent.join('\n'));
        inCodeblock = false;
        codeblockLang = '';
        codeblockContent = [];
      } else {
        // Start of codeblock
        inCodeblock = true;
        codeblockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeblock) {
      codeblockContent.push(line);
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      r.heading(headingMatch[1].length, headingMatch[2]);
      continue;
    }

    // Regular text
    console.log(line);
  }
}
