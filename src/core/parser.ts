// ============================================================
// CodeSonify - Code Parser
// Analyzes source code structure for musical transformation
// ============================================================

import {
  CodeAnalysis,
  CodeLanguage,
  CodeMetrics,
  CodeStructure,
  CodeToken,
  TokenType,
} from './types.js';

// --- Language Detection ---

const LANGUAGE_SIGNATURES: Record<CodeLanguage, RegExp[]> = {
  typescript: [/:\s*(string|number|boolean|any|void|never)/, /interface\s+\w+/, /import\s+.*from\s+['"]/, /\?\.\w+/, /<\w+>/],
  javascript: [/const\s+\w+\s*=/, /let\s+\w+/, /=>\s*{?/, /require\(/, /module\.exports/],
  python: [/def\s+\w+\(/, /import\s+\w+/, /class\s+\w+:/, /if\s+.*:$/, /print\(/],
  java: [/public\s+(static\s+)?class/, /System\.out/, /void\s+main/, /private\s+\w+/, /import\s+java\./],
  csharp: [/using\s+System/, /namespace\s+\w+/, /public\s+class/, /Console\.Write/, /\[.*\]\s*$/],
  go: [/func\s+\w+\(/, /package\s+\w+/, /import\s+\(/, /fmt\.Print/, /:=\s*/],
  rust: [/fn\s+\w+\(/, /let\s+mut\s+/, /impl\s+\w+/, /pub\s+fn/, /use\s+\w+::/],
  unknown: [],
};

// Keyword mappings per language
const LANGUAGE_KEYWORDS: Record<string, TokenType> = {
  // Functions
  'function': 'function', 'def': 'function', 'fn': 'function', 'func': 'function',
  'async': 'function', 'await': 'function', 'lambda': 'function',
  // Loops
  'for': 'loop', 'while': 'loop', 'do': 'loop', 'foreach': 'loop',
  'loop': 'loop', 'each': 'loop', 'map': 'loop', 'filter': 'loop',
  'reduce': 'loop', 'forEach': 'loop',
  // Conditionals
  'if': 'conditional', 'else': 'conditional', 'elif': 'conditional',
  'switch': 'conditional', 'case': 'conditional', 'match': 'conditional',
  'when': 'conditional', 'unless': 'conditional', 'ternary': 'conditional',
  // Variables
  'var': 'variable', 'let': 'variable', 'const': 'variable',
  'val': 'variable', 'mut': 'variable', 'static': 'variable',
  // Classes
  'class': 'class', 'struct': 'class', 'interface': 'class',
  'enum': 'class', 'trait': 'class', 'type': 'class',
  // Imports
  'import': 'import', 'require': 'import', 'use': 'import',
  'using': 'import', 'include': 'import', 'from': 'import',
  // Return
  'return': 'return', 'yield': 'return', 'throw': 'return',
  // Other keywords
  'new': 'keyword', 'this': 'keyword', 'self': 'keyword',
  'super': 'keyword', 'null': 'keyword', 'nil': 'keyword',
  'true': 'keyword', 'false': 'keyword', 'undefined': 'keyword',
  'try': 'keyword', 'catch': 'keyword', 'finally': 'keyword',
  'public': 'keyword', 'private': 'keyword', 'protected': 'keyword',
  'export': 'keyword', 'default': 'keyword', 'extends': 'keyword',
  'implements': 'keyword', 'abstract': 'keyword', 'override': 'keyword',
};

// --- Main Parser Class ---

export class CodeParser {

  /**
   * Detect the programming language of the given source code.
   */
  detectLanguage(code: string): CodeLanguage {
    const scores: Partial<Record<CodeLanguage, number>> = {};

    for (const [lang, patterns] of Object.entries(LANGUAGE_SIGNATURES)) {
      if (lang === 'unknown') continue;
      const language = lang as CodeLanguage;
      scores[language] = 0;
      for (const pattern of patterns) {
        if (pattern.test(code)) {
          scores[language] = (scores[language] || 0) + 1;
        }
      }
    }

    let bestLang: CodeLanguage = 'unknown';
    let bestScore = 0;
    for (const [lang, score] of Object.entries(scores)) {
      if (score! > bestScore) {
        bestScore = score!;
        bestLang = lang as CodeLanguage;
      }
    }

    return bestScore > 0 ? bestLang : 'unknown';
  }

  /**
   * Main analysis entry point: parse code into a full CodeAnalysis.
   */
  analyze(code: string, language?: CodeLanguage): CodeAnalysis {
    const detectedLanguage = language || this.detectLanguage(code);
    const lines = code.split('\n');
    const tokens = this.tokenize(code, lines);
    const structures = this.extractStructures(tokens, lines);
    const metrics = this.calculateMetrics(tokens, lines, structures);

    return {
      language: detectedLanguage,
      tokens,
      metrics,
      structures,
    };
  }

  /**
   * Tokenize source code into an array of CodeTokens.
   */
  private tokenize(code: string, lines: string[]): CodeToken[] {
    const tokens: CodeToken[] = [];
    let currentDepth = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const trimmed = line.trim();

      // Skip empty lines
      if (trimmed.length === 0) {
        tokens.push({
          type: 'whitespace',
          value: '',
          line: lineIdx + 1,
          column: 0,
          depth: currentDepth,
        });
        continue;
      }

      // Comments (single-line)
      if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        tokens.push({
          type: 'comment',
          value: trimmed,
          line: lineIdx + 1,
          column: line.indexOf(trimmed.charAt(0)),
          depth: currentDepth,
        });
        continue;
      }

      // Track depth by brackets
      const openBrackets = (trimmed.match(/[{(\[]/g) || []).length;
      const closeBrackets = (trimmed.match(/[})\]]/g) || []).length;

      // Process the line word by word
      const words = trimmed.split(/(\s+|[{}()\[\];,.:=<>+\-*\/!&|^~?@#$%])/g).filter(w => w.trim().length > 0);
      let columnOffset = line.length - line.trimStart().length;

      for (const word of words) {
        const cleanWord = word.trim();
        if (!cleanWord) continue;

        // Check for string literals
        if (/^['"`]/.test(cleanWord)) {
          tokens.push({
            type: 'string',
            value: cleanWord,
            line: lineIdx + 1,
            column: columnOffset,
            depth: currentDepth,
          });
        }
        // Check for numbers
        else if (/^\d+(\.\d+)?$/.test(cleanWord)) {
          tokens.push({
            type: 'number',
            value: cleanWord,
            line: lineIdx + 1,
            column: columnOffset,
            depth: currentDepth,
          });
        }
        // Check for operators
        else if (/^[=+\-*\/%<>!&|^~?]+$/.test(cleanWord)) {
          tokens.push({
            type: 'operator',
            value: cleanWord,
            line: lineIdx + 1,
            column: columnOffset,
            depth: currentDepth,
          });
        }
        // Check for brackets
        else if (/^[{(\[]$/.test(cleanWord)) {
          tokens.push({
            type: 'bracket_open',
            value: cleanWord,
            line: lineIdx + 1,
            column: columnOffset,
            depth: currentDepth,
          });
        }
        else if (/^[})\]]$/.test(cleanWord)) {
          tokens.push({
            type: 'bracket_close',
            value: cleanWord,
            line: lineIdx + 1,
            column: columnOffset,
            depth: currentDepth,
          });
        }
        // Check for known keywords
        else if (LANGUAGE_KEYWORDS[cleanWord]) {
          tokens.push({
            type: LANGUAGE_KEYWORDS[cleanWord],
            value: cleanWord,
            line: lineIdx + 1,
            column: columnOffset,
            depth: currentDepth,
          });
        }
        // Check if it looks like a function call
        else if (/\w+\s*$/.test(cleanWord) && lineIdx < lines.length && lines[lineIdx].includes(cleanWord + '(')) {
          tokens.push({
            type: 'function',
            value: cleanWord,
            line: lineIdx + 1,
            column: columnOffset,
            depth: currentDepth,
          });
        }
        // Default to unknown
        else {
          tokens.push({
            type: 'unknown',
            value: cleanWord,
            line: lineIdx + 1,
            column: columnOffset,
            depth: currentDepth,
          });
        }

        columnOffset += cleanWord.length + 1;
      }

      // Update depth after processing line
      currentDepth += openBrackets - closeBrackets;
      if (currentDepth < 0) currentDepth = 0;
    }

    return tokens;
  }

  /**
   * Extract high-level code structures (functions, classes, loops, etc.)
   */
  private extractStructures(tokens: CodeToken[], lines: string[]): CodeStructure[] {
    const structures: CodeStructure[] = [];
    const structureTypes: TokenType[] = ['function', 'class', 'loop', 'conditional'];

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (structureTypes.includes(token.type)) {
        // Find the name (next meaningful token)
        let name = token.value;
        if (i + 1 < tokens.length && tokens[i + 1].type === 'unknown') {
          name = tokens[i + 1].value;
        }

        // Find the end of this structure (matching bracket or same depth)
        let endLine = token.line;
        for (let j = i + 1; j < tokens.length; j++) {
          if (tokens[j].depth < token.depth && tokens[j].line > token.line) {
            endLine = tokens[j].line - 1;
            break;
          }
          endLine = tokens[j].line;
        }

        structures.push({
          type: token.type,
          name,
          startLine: token.line,
          endLine,
          depth: token.depth,
          children: [],
        });
      }
      i++;
    }

    // Nest children inside parent structures
    return this.nestStructures(structures);
  }

  /**
   * Organize flat structures into a nested tree.
   */
  private nestStructures(structures: CodeStructure[]): CodeStructure[] {
    const root: CodeStructure[] = [];

    for (const struct of structures) {
      let placed = false;
      // Try to place inside an existing structure
      for (let i = root.length - 1; i >= 0; i--) {
        if (this.isInsideStructure(struct, root[i])) {
          root[i].children.push(struct);
          placed = true;
          break;
        }
      }
      if (!placed) {
        root.push(struct);
      }
    }

    return root;
  }

  private isInsideStructure(child: CodeStructure, parent: CodeStructure): boolean {
    return child.startLine > parent.startLine && child.endLine <= parent.endLine;
  }

  /**
   * Calculate code metrics from tokens and structures.
   */
  private calculateMetrics(tokens: CodeToken[], lines: string[], structures: CodeStructure[]): CodeMetrics {
    const totalLines = lines.length;
    const emptyLines = lines.filter(l => l.trim().length === 0).length;
    const commentLines = tokens.filter(t => t.type === 'comment').length;
    const codeLines = totalLines - emptyLines - commentLines;

    const functionCount = tokens.filter(t => t.type === 'function').length;
    const loopCount = tokens.filter(t => t.type === 'loop').length;
    const conditionalCount = tokens.filter(t => t.type === 'conditional').length;
    const variableCount = tokens.filter(t => t.type === 'variable').length;
    const classCount = tokens.filter(t => t.type === 'class').length;
    const importCount = tokens.filter(t => t.type === 'import').length;
    const errorCount = tokens.filter(t => t.type === 'error').length;

    const maxNestingDepth = Math.max(0, ...tokens.map(t => t.depth));

    // Complexity score: based on nesting, conditionals, loops, and size
    const nestingScore = Math.min(maxNestingDepth * 10, 30);
    const branchScore = Math.min((conditionalCount + loopCount) * 5, 30);
    const sizeScore = Math.min(codeLines * 0.5, 20);
    const functionScore = Math.min(functionCount * 3, 20);
    const complexity = Math.min(100, nestingScore + branchScore + sizeScore + functionScore);

    return {
      totalLines,
      codeLines,
      commentLines,
      emptyLines,
      functionCount,
      loopCount,
      conditionalCount,
      variableCount,
      maxNestingDepth,
      complexity: Math.round(complexity),
      classCount,
      importCount,
      errorCount,
    };
  }
}

export default CodeParser;
