// ============================================================
// CodeSonify - Type Definitions
// Transform source code into music
// ============================================================

// --- Code Analysis Types ---

export type CodeLanguage = 'javascript' | 'typescript' | 'python' | 'java' | 'csharp' | 'go' | 'rust' | 'unknown';

export interface CodeToken {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  depth: number; // nesting depth
}

export type TokenType =
  | 'function'
  | 'loop'
  | 'conditional'
  | 'variable'
  | 'operator'
  | 'string'
  | 'number'
  | 'comment'
  | 'class'
  | 'import'
  | 'return'
  | 'error'
  | 'bracket_open'
  | 'bracket_close'
  | 'whitespace'
  | 'keyword'
  | 'unknown';

export interface CodeAnalysis {
  language: CodeLanguage;
  tokens: CodeToken[];
  metrics: CodeMetrics;
  structures: CodeStructure[];
}

export interface CodeMetrics {
  totalLines: number;
  codeLines: number;
  commentLines: number;
  emptyLines: number;
  functionCount: number;
  loopCount: number;
  conditionalCount: number;
  variableCount: number;
  maxNestingDepth: number;
  complexity: number; // 0-100 score
  classCount: number;
  importCount: number;
  errorCount: number;
}

export interface CodeStructure {
  type: TokenType;
  name: string;
  startLine: number;
  endLine: number;
  depth: number;
  children: CodeStructure[];
}

// --- Music Types ---

export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type Octave = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Duration = '16n' | '8n' | '8n.' | '4n' | '4n.' | '2n' | '2n.' | '1n';
export type ScaleType = 'major' | 'minor' | 'pentatonic' | 'blues' | 'chromatic' | 'dorian' | 'mixolydian' | 'lydian';
export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface MusicNote {
  note: string;       // e.g., "C4", "D#5"
  duration: Duration;
  velocity: number;   // 0.0 - 1.0
  time: number;       // start time in seconds
  instrument: InstrumentType;
}

export type InstrumentType =
  | 'melody'      // functions, main logic
  | 'bass'        // variables, declarations
  | 'harmony'     // conditionals, branches
  | 'percussion'  // loops, repetition
  | 'ambient'     // comments, whitespace
  | 'dissonance'; // errors, warnings

export interface MusicComposition {
  title: string;
  tempo: number;          // BPM
  timeSignature: [number, number]; // e.g., [4, 4]
  key: NoteName;
  scale: ScaleType;
  duration: number;       // total duration in seconds
  tracks: MusicTrack[];
  metadata: CompositionMetadata;
}

export interface MusicTrack {
  name: string;
  instrument: InstrumentType;
  waveform: Waveform;
  volume: number;         // 0.0 - 1.0
  notes: MusicNote[];
  effects: TrackEffect[];
}

export interface TrackEffect {
  type: 'reverb' | 'delay' | 'distortion' | 'chorus' | 'filter';
  params: Record<string, number>;
}

export interface CompositionMetadata {
  sourceLanguage: CodeLanguage;
  linesAnalyzed: number;
  complexity: number;
  generatedAt: string;
  codeHash: string;
  musicalInterpretation: string; // human-readable description
}

// --- Mapping Configuration ---

export interface MappingConfig {
  // How code structures map to musical elements
  functionToMelody: {
    baseOctave: Octave;
    scaleType: ScaleType;
    noteDuration: Duration;
  };
  loopToRhythm: {
    basePattern: Duration[];
    intensityMultiplier: number;
  };
  conditionalToHarmony: {
    ifChord: NoteName[];
    elseChord: NoteName[];
    switchScale: ScaleType;
  };
  variableToBass: {
    baseOctave: Octave;
    noteDuration: Duration;
  };
  complexityToTempo: {
    minBPM: number;
    maxBPM: number;
  };
  depthToOctave: {
    baseOctave: Octave;
    maxOctaveShift: number;
  };
  errorToDissonance: {
    chordIntervals: number[];
    waveform: Waveform;
  };
}

// --- MCP Server Types ---

export interface SonifyRequest {
  code: string;
  language?: CodeLanguage;
  style?: 'classical' | 'electronic' | 'ambient' | 'jazz' | 'rock';
}

export interface SonifyResponse {
  composition: MusicComposition;
  analysis: CodeAnalysis;
  visualization: VisualizationData;
}

export interface VisualizationData {
  waveformPoints: number[];
  frequencyBands: FrequencyBand[];
  tokenColorMap: TokenColorMapping[];
}

export interface FrequencyBand {
  frequency: number;
  amplitude: number;
  time: number;
}

export interface TokenColorMapping {
  token: CodeToken;
  color: string;      // hex color
  noteIndex: number;   // index into composition notes
}
