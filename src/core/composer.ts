// ============================================================
// CodeSonify - Composition Engine
// Orchestrates code analysis and music generation
// ============================================================

import { CodeParser } from './parser.js';
import { MusicMapper, MusicStyle, SCALES, NOTE_NAMES, DURATION_VALUES } from './mapper.js';
import {
  CodeAnalysis,
  CodeLanguage,
  CompositionMetadata,
  FrequencyBand,
  InstrumentType,
  MusicComposition,
  MusicNote,
  MusicTrack,
  ScaleType,
  SonifyRequest,
  SonifyResponse,
  TokenColorMapping,
  TrackEffect,
  VisualizationData,
  Waveform,
} from './types.js';

// --- Instrument Configuration ---

interface InstrumentConfig {
  waveform: Waveform;
  volume: number;
  effects: TrackEffect[];
}

const INSTRUMENT_CONFIGS: Record<InstrumentType, InstrumentConfig> = {
  melody: {
    waveform: 'triangle',
    volume: 0.7,
    effects: [
      { type: 'reverb', params: { decay: 2.5, wet: 0.3 } },
    ],
  },
  bass: {
    waveform: 'sine',
    volume: 0.5,
    effects: [
      { type: 'filter', params: { frequency: 400, type: 0 } },
    ],
  },
  harmony: {
    waveform: 'sine',
    volume: 0.4,
    effects: [
      { type: 'reverb', params: { decay: 4, wet: 0.5 } },
      { type: 'chorus', params: { frequency: 1.5, depth: 0.7 } },
    ],
  },
  percussion: {
    waveform: 'square',
    volume: 0.5,
    effects: [
      { type: 'distortion', params: { amount: 0.2 } },
    ],
  },
  ambient: {
    waveform: 'sine',
    volume: 0.2,
    effects: [
      { type: 'reverb', params: { decay: 6, wet: 0.7 } },
      { type: 'delay', params: { time: 0.4, feedback: 0.3 } },
    ],
  },
  dissonance: {
    waveform: 'sawtooth',
    volume: 0.6,
    effects: [
      { type: 'distortion', params: { amount: 0.5 } },
      { type: 'filter', params: { frequency: 2000, type: 1 } },
    ],
  },
};

// --- Color Mapping for Visualization ---

const TOKEN_COLORS: Record<string, string> = {
  function: '#4FC3F7',    // blue
  loop: '#FFB74D',        // orange
  conditional: '#81C784', // green
  variable: '#CE93D8',    // purple
  class: '#F06292',       // pink
  string: '#A5D6A7',      // light green
  number: '#FFD54F',      // yellow
  operator: '#90A4AE',    // gray
  comment: '#78909C',     // dark gray
  import: '#4DD0E1',      // cyan
  return: '#EF5350',      // red
  error: '#FF1744',       // bright red
  bracket_open: '#546E7A',
  bracket_close: '#546E7A',
  whitespace: '#263238',
  keyword: '#BA68C8',     // purple
  unknown: '#455A64',     // dark gray
};

// --- Musical Interpretation Generator ---

function generateInterpretation(analysis: CodeAnalysis, style: MusicStyle): string {
  const { metrics } = analysis;
  const parts: string[] = [];

  // Overall vibe
  if (metrics.complexity > 70) {
    parts.push('A complex, intense composition reflecting deeply nested logic');
  } else if (metrics.complexity > 40) {
    parts.push('A balanced piece with moderate complexity');
  } else {
    parts.push('A clean, minimalist arrangement reflecting simple, elegant code');
  }

  // Functions
  if (metrics.functionCount > 5) {
    parts.push(`with ${metrics.functionCount} melodic phrases representing well-organized functions`);
  } else if (metrics.functionCount > 0) {
    parts.push(`featuring ${metrics.functionCount} melodic theme${metrics.functionCount > 1 ? 's' : ''}`);
  }

  // Loops
  if (metrics.loopCount > 3) {
    parts.push('driven by strong, repetitive rhythmic patterns');
  } else if (metrics.loopCount > 0) {
    parts.push('with subtle rhythmic elements');
  }

  // Conditionals
  if (metrics.conditionalCount > 5) {
    parts.push('rich harmonic changes reflecting branching logic');
  } else if (metrics.conditionalCount > 0) {
    parts.push('and gentle harmonic shifts');
  }

  // Errors
  if (metrics.errorCount > 0) {
    parts.push(`— with ${metrics.errorCount} dissonant moment${metrics.errorCount > 1 ? 's' : ''} signaling potential issues`);
  }

  // Style
  parts.push(`Rendered in ${style} style`);

  // Language
  parts.push(`from ${analysis.language} source code (${metrics.totalLines} lines)`);

  return parts.join(', ') + '.';
}

// --- Simple Hash Function ---

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// --- Main Composer Class ---

export class Composer {
  private parser: CodeParser;

  constructor() {
    this.parser = new CodeParser();
  }

  /**
   * Main entry point: takes a SonifyRequest and produces a full SonifyResponse.
   */
  sonify(request: SonifyRequest): SonifyResponse {
    const { code, language, style = 'classical' } = request;

    // Step 1: Analyze the code
    const analysis = this.parser.analyze(code, language);

    // Step 2: Map to musical notes
    const mapper = new MusicMapper(style);
    const notes = mapper.mapToNotes(analysis);
    const tempo = mapper.calculateTempo(analysis.metrics.complexity);
    const totalDuration = mapper.getTotalDuration();

    // Step 3: Organize notes into tracks
    const tracks = this.organizeTracks(notes, style);

    // Step 4: Build the composition
    const composition = this.buildComposition(
      code, analysis, tracks, tempo, totalDuration, style
    );

    // Step 5: Generate visualization data
    const visualization = this.generateVisualization(analysis, notes);

    return {
      composition,
      analysis,
      visualization,
    };
  }

  /**
   * Organize notes into separate tracks by instrument type.
   */
  private organizeTracks(notes: MusicNote[], style: MusicStyle): MusicTrack[] {
    const trackMap = new Map<InstrumentType, MusicNote[]>();

    for (const note of notes) {
      if (!trackMap.has(note.instrument)) {
        trackMap.set(note.instrument, []);
      }
      trackMap.get(note.instrument)!.push(note);
    }

    const tracks: MusicTrack[] = [];
    for (const [instrument, trackNotes] of trackMap) {
      const config = INSTRUMENT_CONFIGS[instrument];
      tracks.push({
        name: this.getTrackName(instrument),
        instrument,
        waveform: config.waveform,
        volume: config.volume,
        notes: trackNotes,
        effects: config.effects,
      });
    }

    return tracks;
  }

  /**
   * Get a human-readable name for each track.
   */
  private getTrackName(instrument: InstrumentType): string {
    const names: Record<InstrumentType, string> = {
      melody: '🎵 Melody (Functions & Logic)',
      bass: '🎸 Bass (Variables & Data)',
      harmony: '🎹 Harmony (Conditionals & Branches)',
      percussion: '🥁 Rhythm (Loops & Iterations)',
      ambient: '🌊 Ambient (Comments & Structure)',
      dissonance: '⚡ Dissonance (Errors & Warnings)',
    };
    return names[instrument];
  }

  /**
   * Build the final MusicComposition object.
   */
  private buildComposition(
    code: string,
    analysis: CodeAnalysis,
    tracks: MusicTrack[],
    tempo: number,
    totalDuration: number,
    style: MusicStyle,
  ): MusicComposition {
    // Determine key based on language
    const languageKeys: Record<string, { key: number; scale: ScaleType }> = {
      javascript: { key: 0, scale: 'mixolydian' },  // C Mixolydian
      typescript: { key: 2, scale: 'major' },        // D Major
      python: { key: 5, scale: 'pentatonic' },       // F Pentatonic
      java: { key: 7, scale: 'minor' },              // G Minor
      csharp: { key: 4, scale: 'lydian' },           // E Lydian
      go: { key: 9, scale: 'dorian' },               // A Dorian
      rust: { key: 11, scale: 'blues' },             // B Blues
      unknown: { key: 0, scale: 'major' },           // C Major
    };

    const langConfig = languageKeys[analysis.language] || languageKeys['unknown'];

    const metadata: CompositionMetadata = {
      sourceLanguage: analysis.language,
      linesAnalyzed: analysis.metrics.totalLines,
      complexity: analysis.metrics.complexity,
      generatedAt: new Date().toISOString(),
      codeHash: simpleHash(code),
      musicalInterpretation: generateInterpretation(analysis, style),
    };

    return {
      title: `CodeSonify: ${analysis.language} composition`,
      tempo,
      timeSignature: [4, 4],
      key: NOTE_NAMES[langConfig.key],
      scale: langConfig.scale,
      duration: totalDuration,
      tracks,
      metadata,
    };
  }

  /**
   * Generate visualization data for the web app.
   */
  private generateVisualization(analysis: CodeAnalysis, notes: MusicNote[]): VisualizationData {
    // Generate waveform preview (simplified)
    const waveformPoints: number[] = [];
    const totalPoints = 200;
    for (let i = 0; i < totalPoints; i++) {
      const t = i / totalPoints;
      // Create a visual waveform based on note density at each point
      const nearbyNotes = notes.filter(n => {
        const totalDuration = notes.length > 0 ? notes[notes.length - 1].time + 1 : 1;
        const normalizedTime = n.time / totalDuration;
        return Math.abs(normalizedTime - t) < 0.05;
      });
      const amplitude = Math.min(1, nearbyNotes.length * 0.2);
      waveformPoints.push(amplitude * Math.sin(t * Math.PI * 8 + nearbyNotes.length));
    }

    // Generate frequency bands
    const frequencyBands: FrequencyBand[] = notes.slice(0, 100).map(note => ({
      frequency: this.noteToFrequency(note.note),
      amplitude: note.velocity,
      time: note.time,
    }));

    // Map tokens to colors
    const tokenColorMap: TokenColorMapping[] = analysis.tokens
      .filter(t => t.type !== 'whitespace')
      .map((token, index) => ({
        token,
        color: TOKEN_COLORS[token.type] || TOKEN_COLORS['unknown'],
        noteIndex: Math.min(index, notes.length - 1),
      }));

    return {
      waveformPoints,
      frequencyBands,
      tokenColorMap,
    };
  }

  /**
   * Convert note string (e.g., "C4") to frequency in Hz.
   */
  private noteToFrequency(noteStr: string): number {
    const match = noteStr.match(/^([A-G]#?)(\d+)$/);
    if (!match) return 440;

    const noteName = match[1];
    const octave = parseInt(match[2]);
    const noteIndex = NOTE_NAMES.indexOf(noteName as any);
    if (noteIndex === -1) return 440;

    // A4 = 440 Hz, MIDI note 69
    const midiNote = (octave + 1) * 12 + noteIndex;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }
}

export default Composer;
