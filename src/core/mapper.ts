// ============================================================
// CodeSonify - Music Mapper
// Maps code analysis results to musical elements
// ============================================================

import {
  CodeAnalysis,
  CodeToken,
  Duration,
  InstrumentType,
  MappingConfig,
  MusicNote,
  NoteName,
  Octave,
  ScaleType,
  TokenType,
  Waveform,
} from './types.js';

// --- Musical Scales (semitone intervals from root) ---

const SCALES: Record<ScaleType, number[]> = {
  major:      [0, 2, 4, 5, 7, 9, 11],
  minor:      [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  blues:      [0, 3, 5, 6, 7, 10],
  chromatic:  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  dorian:     [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian:     [0, 2, 4, 6, 7, 9, 11],
};

const NOTE_NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Duration in seconds at 120 BPM
const DURATION_VALUES: Record<Duration, number> = {
  '16n': 0.125,
  '8n': 0.25,
  '8n.': 0.375,
  '4n': 0.5,
  '4n.': 0.75,
  '2n': 1.0,
  '2n.': 1.5,
  '1n': 2.0,
};

// --- Style presets ---

export type MusicStyle = 'classical' | 'electronic' | 'ambient' | 'jazz' | 'rock';

interface StylePreset {
  baseKey: NoteName;
  scaleType: ScaleType;
  tempoRange: [number, number];
  preferredWaveforms: Waveform[];
  noteDurationBias: Duration[];
  reverbAmount: number;
}

const STYLE_PRESETS: Record<MusicStyle, StylePreset> = {
  classical: {
    baseKey: 'C',
    scaleType: 'major',
    tempoRange: [80, 130],
    preferredWaveforms: ['sine', 'triangle'],
    noteDurationBias: ['4n', '2n', '8n'],
    reverbAmount: 0.5,
  },
  electronic: {
    baseKey: 'A',
    scaleType: 'minor',
    tempoRange: [110, 150],
    preferredWaveforms: ['square', 'sawtooth'],
    noteDurationBias: ['8n', '16n', '4n'],
    reverbAmount: 0.3,
  },
  ambient: {
    baseKey: 'D',
    scaleType: 'pentatonic',
    tempoRange: [60, 90],
    preferredWaveforms: ['sine', 'triangle'],
    noteDurationBias: ['2n', '1n', '4n.'],
    reverbAmount: 0.8,
  },
  jazz: {
    baseKey: 'F',
    scaleType: 'dorian',
    tempoRange: [90, 140],
    preferredWaveforms: ['sine', 'triangle'],
    noteDurationBias: ['8n.', '4n', '8n'],
    reverbAmount: 0.4,
  },
  rock: {
    baseKey: 'E',
    scaleType: 'blues',
    tempoRange: [100, 150],
    preferredWaveforms: ['sawtooth', 'square'],
    noteDurationBias: ['8n', '4n', '16n'],
    reverbAmount: 0.2,
  },
};

// --- Default mapping configuration ---

const DEFAULT_CONFIG: MappingConfig = {
  functionToMelody: {
    baseOctave: 4,
    scaleType: 'major',
    noteDuration: '4n',
  },
  loopToRhythm: {
    basePattern: ['8n', '8n', '16n', '16n', '8n'],
    intensityMultiplier: 1.2,
  },
  conditionalToHarmony: {
    ifChord: ['C', 'E', 'G'],
    elseChord: ['A', 'C', 'E'],
    switchScale: 'mixolydian',
  },
  variableToBass: {
    baseOctave: 2,
    noteDuration: '2n',
  },
  complexityToTempo: {
    minBPM: 70,
    maxBPM: 160,
  },
  depthToOctave: {
    baseOctave: 4,
    maxOctaveShift: 2,
  },
  errorToDissonance: {
    chordIntervals: [1, 6, 11], // tritone + semitone clusters
    waveform: 'sawtooth',
  },
};

// --- Music Mapper Class ---

export class MusicMapper {
  private config: MappingConfig;
  private style: StylePreset;
  private currentTime: number = 0;
  private tempoMultiplier: number = 1;

  constructor(style: MusicStyle = 'classical', config?: Partial<MappingConfig>) {
    this.style = STYLE_PRESETS[style];
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Map a complete code analysis to an array of MusicNotes.
   */
  mapToNotes(analysis: CodeAnalysis): MusicNote[] {
    const allNotes: MusicNote[] = [];
    this.currentTime = 0;

    // Calculate tempo from complexity
    const tempo = this.calculateTempo(analysis.metrics.complexity);
    this.tempoMultiplier = 120 / tempo; // normalize to 120 BPM base

    // Process tokens in order (line by line)
    for (const token of analysis.tokens) {
      const notes = this.mapToken(token, analysis);
      allNotes.push(...notes);
    }

    return allNotes;
  }

  /**
   * Calculate tempo based on code complexity.
   * More complex code = faster tempo (more "intense" music).
   */
  calculateTempo(complexity: number): number {
    const { minBPM, maxBPM } = this.config.complexityToTempo;
    const range = maxBPM - minBPM;
    return Math.round(minBPM + (complexity / 100) * range);
  }

  /**
   * Map a single token to one or more MusicNotes.
   */
  private mapToken(token: CodeToken, analysis: CodeAnalysis): MusicNote[] {
    switch (token.type) {
      case 'function':
        return this.mapFunction(token);
      case 'loop':
        return this.mapLoop(token);
      case 'conditional':
        return this.mapConditional(token);
      case 'variable':
        return this.mapVariable(token);
      case 'class':
        return this.mapClass(token);
      case 'string':
        return this.mapString(token);
      case 'number':
        return this.mapNumber(token);
      case 'operator':
        return this.mapOperator(token);
      case 'comment':
        return this.mapComment(token);
      case 'import':
        return this.mapImport(token);
      case 'return':
        return this.mapReturn(token);
      case 'error':
        return this.mapError(token);
      case 'bracket_open':
        return this.mapBracketOpen(token);
      case 'bracket_close':
        return this.mapBracketClose(token);
      case 'whitespace':
        return this.mapWhitespace();
      default:
        return this.mapDefault(token);
    }
  }

  // --- Token Mapping Functions ---

  /**
   * Functions → Ascending melodic phrases
   * Each function creates a small melody climbing up the scale.
   */
  private mapFunction(token: CodeToken): MusicNote[] {
    const notes: MusicNote[] = [];
    const scale = SCALES[this.style.scaleType];
    const octave = this.getOctaveForDepth(token.depth);
    const baseNoteIndex = NOTE_NAMES.indexOf(this.style.baseKey);

    // Generate a 3-5 note ascending phrase
    const phraseLength = 3 + (token.value.length % 3);
    for (let i = 0; i < phraseLength; i++) {
      const scaleIndex = i % scale.length;
      const semitone = (baseNoteIndex + scale[scaleIndex]) % 12;
      const noteOctave = octave + Math.floor((baseNoteIndex + scale[scaleIndex]) / 12);

      notes.push({
        note: `${NOTE_NAMES[semitone]}${noteOctave}`,
        duration: '8n',
        velocity: 0.7 + (i * 0.05),
        time: this.currentTime,
        instrument: 'melody',
      });
      this.currentTime += DURATION_VALUES['8n'] * this.tempoMultiplier;
    }

    return notes;
  }

  /**
   * Loops → Repeating rhythmic patterns
   * Creates a percussive pattern that repeats based on the loop type.
   */
  private mapLoop(token: CodeToken): MusicNote[] {
    const notes: MusicNote[] = [];
    const pattern = this.config.loopToRhythm.basePattern;
    const octave = this.getOctaveForDepth(token.depth);

    // Determine number of repetitions (more for 'for' loops, fewer for 'while')
    const reps = token.value === 'for' ? 2 : token.value === 'while' ? 3 : 1;

    for (let r = 0; r < reps; r++) {
      for (const dur of pattern) {
        const duration = dur as Duration;
        notes.push({
          note: `${this.style.baseKey}${octave}`,
          duration,
          velocity: 0.6 + (r * 0.1),
          time: this.currentTime,
          instrument: 'percussion',
        });
        this.currentTime += DURATION_VALUES[duration] * this.tempoMultiplier * 0.5;
      }
    }

    return notes;
  }

  /**
   * Conditionals → Harmonic chord changes
   * 'if' uses major feel, 'else' uses minor feel.
   */
  private mapConditional(token: CodeToken): MusicNote[] {
    const notes: MusicNote[] = [];
    const octave = this.getOctaveForDepth(token.depth);
    const isElse = token.value === 'else' || token.value === 'elif';
    const chordNotes = isElse
      ? this.config.conditionalToHarmony.elseChord
      : this.config.conditionalToHarmony.ifChord;

    // Play chord notes simultaneously
    for (const chordNote of chordNotes) {
      notes.push({
        note: `${chordNote}${octave}`,
        duration: '4n',
        velocity: 0.5,
        time: this.currentTime,
        instrument: 'harmony',
      });
    }
    this.currentTime += DURATION_VALUES['4n'] * this.tempoMultiplier;

    return notes;
  }

  /**
   * Variables → Deep bass notes
   * Declaration creates a sustained low note.
   */
  private mapVariable(token: CodeToken): MusicNote[] {
    const baseOctave = this.config.variableToBass.baseOctave;
    // Map variable name to a note using character codes
    const charCode = token.value.charCodeAt(0) || 67; // default to 'C'
    const noteIndex = charCode % 12;

    const note: MusicNote = {
      note: `${NOTE_NAMES[noteIndex]}${baseOctave}`,
      duration: '2n',
      velocity: 0.4,
      time: this.currentTime,
      instrument: 'bass',
    };
    this.currentTime += DURATION_VALUES['4n'] * this.tempoMultiplier;

    return [note];
  }

  /**
   * Classes → Rich chord progression (power chords)
   */
  private mapClass(token: CodeToken): MusicNote[] {
    const notes: MusicNote[] = [];
    const octave = this.getOctaveForDepth(token.depth) as number;
    const baseNoteIndex = NOTE_NAMES.indexOf(this.style.baseKey);

    // Power chord: root + fifth + octave
    const intervals = [0, 7, 12];
    for (const interval of intervals) {
      const semitone = (baseNoteIndex + interval) % 12;
      const noteOctave = octave + Math.floor((baseNoteIndex + interval) / 12);
      notes.push({
        note: `${NOTE_NAMES[semitone]}${noteOctave}`,
        duration: '2n',
        velocity: 0.65,
        time: this.currentTime,
        instrument: 'melody',
      });
    }
    this.currentTime += DURATION_VALUES['2n'] * this.tempoMultiplier;

    return notes;
  }

  /**
   * Strings → Gentle, singing tones
   */
  private mapString(token: CodeToken): MusicNote[] {
    const scale = SCALES.pentatonic;
    const octave = 5;
    // Use string length to determine the note in the scale
    const scaleIndex = token.value.length % scale.length;
    const baseNoteIndex = NOTE_NAMES.indexOf(this.style.baseKey);
    const semitone = (baseNoteIndex + scale[scaleIndex]) % 12;

    const note: MusicNote = {
      note: `${NOTE_NAMES[semitone]}${octave}`,
      duration: '4n',
      velocity: 0.35,
      time: this.currentTime,
      instrument: 'ambient',
    };
    this.currentTime += DURATION_VALUES['8n'] * this.tempoMultiplier;

    return [note];
  }

  /**
   * Numbers → Precise, staccato notes mapped to pitch
   */
  private mapNumber(token: CodeToken): MusicNote[] {
    const num = parseFloat(token.value) || 0;
    const noteIndex = Math.abs(Math.round(num)) % 12;
    const octave = Math.min(7, Math.max(2, 3 + Math.floor(num / 100))) as Octave;

    const note: MusicNote = {
      note: `${NOTE_NAMES[noteIndex]}${octave}`,
      duration: '16n',
      velocity: 0.5,
      time: this.currentTime,
      instrument: 'melody',
    };
    this.currentTime += DURATION_VALUES['16n'] * this.tempoMultiplier;

    return [note];
  }

  /**
   * Operators → Quick percussive hits
   */
  private mapOperator(token: CodeToken): MusicNote[] {
    const operatorMap: Record<string, string> = {
      '=': 'C3', '+': 'D3', '-': 'E3', '*': 'F3',
      '/': 'G3', '%': 'A3', '!': 'B3', '&': 'C4',
      '|': 'D4', '^': 'E4', '<': 'F4', '>': 'G4',
      '?': 'A4',
    };

    const mappedNote = operatorMap[token.value] || 'C3';

    const note: MusicNote = {
      note: mappedNote,
      duration: '16n',
      velocity: 0.3,
      time: this.currentTime,
      instrument: 'percussion',
    };
    this.currentTime += DURATION_VALUES['16n'] * this.tempoMultiplier * 0.5;

    return [note];
  }

  /**
   * Comments → Soft ambient pads (rest in the music)
   */
  private mapComment(token: CodeToken): MusicNote[] {
    const scale = SCALES.pentatonic;
    const octave = 5;
    const baseNoteIndex = NOTE_NAMES.indexOf(this.style.baseKey);
    const scaleIndex = (token.line % scale.length);
    const semitone = (baseNoteIndex + scale[scaleIndex]) % 12;

    const note: MusicNote = {
      note: `${NOTE_NAMES[semitone]}${octave}`,
      duration: '2n',
      velocity: 0.15,
      time: this.currentTime,
      instrument: 'ambient',
    };
    this.currentTime += DURATION_VALUES['4n'] * this.tempoMultiplier;

    return [note];
  }

  /**
   * Imports → Rising arpeggio (like opening a door)
   */
  private mapImport(token: CodeToken): MusicNote[] {
    const notes: MusicNote[] = [];
    const scale = SCALES[this.style.scaleType];
    const baseNoteIndex = NOTE_NAMES.indexOf(this.style.baseKey);

    for (let i = 0; i < 3; i++) {
      const semitone = (baseNoteIndex + scale[i % scale.length]) % 12;
      notes.push({
        note: `${NOTE_NAMES[semitone]}${4 + i}`,
        duration: '16n',
        velocity: 0.3,
        time: this.currentTime,
        instrument: 'ambient',
      });
      this.currentTime += DURATION_VALUES['16n'] * this.tempoMultiplier;
    }

    return notes;
  }

  /**
   * Return → Descending resolution
   */
  private mapReturn(token: CodeToken): MusicNote[] {
    const notes: MusicNote[] = [];
    const baseNoteIndex = NOTE_NAMES.indexOf(this.style.baseKey);

    // Descending two notes to root
    notes.push({
      note: `${NOTE_NAMES[(baseNoteIndex + 4) % 12]}4`,
      duration: '8n',
      velocity: 0.5,
      time: this.currentTime,
      instrument: 'melody',
    });
    this.currentTime += DURATION_VALUES['8n'] * this.tempoMultiplier;

    notes.push({
      note: `${NOTE_NAMES[baseNoteIndex]}4`,
      duration: '4n',
      velocity: 0.6,
      time: this.currentTime,
      instrument: 'melody',
    });
    this.currentTime += DURATION_VALUES['4n'] * this.tempoMultiplier;

    return notes;
  }

  /**
   * Errors → Dissonant, jarring sounds
   */
  private mapError(token: CodeToken): MusicNote[] {
    const notes: MusicNote[] = [];
    const intervals = this.config.errorToDissonance.chordIntervals;
    const baseNoteIndex = NOTE_NAMES.indexOf(this.style.baseKey);

    for (const interval of intervals) {
      const semitone = (baseNoteIndex + interval) % 12;
      notes.push({
        note: `${NOTE_NAMES[semitone]}3`,
        duration: '8n',
        velocity: 0.8,
        time: this.currentTime,
        instrument: 'dissonance',
      });
    }
    this.currentTime += DURATION_VALUES['8n'] * this.tempoMultiplier;

    return notes;
  }

  /**
   * Opening brackets → Quick ascending grace note
   */
  private mapBracketOpen(token: CodeToken): MusicNote[] {
    const octave = this.getOctaveForDepth(token.depth);
    return [{
      note: `${this.style.baseKey}${octave}`,
      duration: '16n',
      velocity: 0.2,
      time: this.currentTime,
      instrument: 'ambient',
    }];
    // No time advance - grace note
  }

  /**
   * Closing brackets → Quick descending grace note
   */
  private mapBracketClose(token: CodeToken): MusicNote[] {
    const octave = Math.max(2, this.getOctaveForDepth(token.depth) - 1);
    return [{
      note: `${this.style.baseKey}${octave}`,
      duration: '16n',
      velocity: 0.2,
      time: this.currentTime,
      instrument: 'ambient',
    }];
    // No time advance - grace note
  }

  /**
   * Whitespace → Musical rest (silence)
   */
  private mapWhitespace(): MusicNote[] {
    this.currentTime += DURATION_VALUES['8n'] * this.tempoMultiplier * 0.3;
    return [];
  }

  /**
   * Default/Unknown tokens → Subtle background note
   */
  private mapDefault(token: CodeToken): MusicNote[] {
    const charCode = (token.value.charCodeAt(0) || 0) % 12;
    const octave = this.getOctaveForDepth(token.depth);

    const note: MusicNote = {
      note: `${NOTE_NAMES[charCode]}${octave}`,
      duration: '16n',
      velocity: 0.15,
      time: this.currentTime,
      instrument: 'ambient',
    };
    this.currentTime += DURATION_VALUES['16n'] * this.tempoMultiplier * 0.3;

    return [note];
  }

  // --- Helper Functions ---

  /**
   * Get the musical octave based on code nesting depth.
   * Deeper nesting = higher pitch (more tension).
   */
  private getOctaveForDepth(depth: number): number {
    const { baseOctave, maxOctaveShift } = this.config.depthToOctave;
    const shift = Math.min(depth, maxOctaveShift);
    return Math.min(7, Math.max(1, baseOctave + shift));
  }

  /**
   * Get total duration of all mapped notes.
   */
  getTotalDuration(): number {
    return this.currentTime;
  }
}

export { STYLE_PRESETS, SCALES, NOTE_NAMES, DURATION_VALUES };
export default MusicMapper;
