// ============================================================
// CodeSonify - Web Server
// Express server for the web application
// ============================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Composer } from '../core/composer.js';
import { MidiGenerator } from '../core/midi.js';
import { DiffSonifier } from '../core/diff.js';
import type { MusicStyle } from '../core/mapper.js';
import type { CodeLanguage } from '../core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const composer = new Composer();
const midiGen = new MidiGenerator();
const diffSonifier = new DiffSonifier();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// API Routes
// ============================================================

/**
 * POST /api/sonify
 * Main endpoint: transform code into music
 */
app.post('/api/sonify', (req, res) => {
  try {
    const { code, language, style } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "code" field' });
      return;
    }

    if (code.length > 50000) {
      res.status(400).json({ error: 'Code too large (max 50,000 characters)' });
      return;
    }

    const result = composer.sonify({
      code,
      language: language as CodeLanguage | undefined,
      style: (style as MusicStyle) || 'classical',
    });

    res.json(result);
  } catch (error) {
    console.error('Sonify error:', error);
    res.status(500).json({
      error: 'Failed to sonify code',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'CodeSonify',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/examples
 * Return example code snippets for demo purposes
 */
app.get('/api/examples', (_req, res) => {
  res.json({
    examples: [
      {
        name: 'Simple Function (JavaScript)',
        language: 'javascript',
        code: `function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

// Calculate first 10 fibonacci numbers
const results = [];
for (let i = 0; i < 10; i++) {
  results.push(fibonacci(i));
}
console.log(results);`,
      },
      {
        name: 'Class with Methods (TypeScript)',
        language: 'typescript',
        code: `interface User {
  name: string;
  email: string;
  age: number;
}

class UserService {
  private users: Map<string, User> = new Map();

  async createUser(user: User): Promise<string> {
    const id = crypto.randomUUID();
    if (this.users.has(id)) {
      throw new Error("User already exists");
    }
    this.users.set(id, user);
    return id;
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByAge(minAge: number, maxAge: number): Promise<User[]> {
    const results: User[] = [];
    for (const user of this.users.values()) {
      if (user.age >= minAge && user.age <= maxAge) {
        results.push(user);
      }
    }
    return results;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}`,
      },
      {
        name: 'Data Processing (Python)',
        language: 'python',
        code: `import json
from collections import defaultdict

def process_sales_data(file_path):
    """Process sales data and generate summary report."""
    sales_by_region = defaultdict(float)
    sales_by_product = defaultdict(float)
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    for record in data:
        region = record.get('region', 'Unknown')
        product = record.get('product', 'Unknown')
        amount = record.get('amount', 0)
        
        if amount > 0:
            sales_by_region[region] += amount
            sales_by_product[product] += amount
        else:
            print(f"Warning: negative amount for {product}")
    
    # Find top performers
    top_region = max(sales_by_region, key=sales_by_region.get)
    top_product = max(sales_by_product, key=sales_by_product.get)
    
    return {
        'total_sales': sum(sales_by_region.values()),
        'top_region': top_region,
        'top_product': top_product,
        'regions': dict(sales_by_region),
        'products': dict(sales_by_product)
    }`,
      },
      {
        name: 'Complex Algorithm (JavaScript)',
        language: 'javascript',
        code: `// Quick Sort implementation with multiple optimizations
function quickSort(arr, left = 0, right = arr.length - 1) {
  if (left < right) {
    // Use median-of-three pivot selection
    const mid = Math.floor((left + right) / 2);
    if (arr[left] > arr[mid]) swap(arr, left, mid);
    if (arr[left] > arr[right]) swap(arr, left, right);
    if (arr[mid] > arr[right]) swap(arr, mid, right);
    
    const pivot = arr[mid];
    let i = left;
    let j = right;
    
    while (i <= j) {
      while (arr[i] < pivot) i++;
      while (arr[j] > pivot) j--;
      
      if (i <= j) {
        swap(arr, i, j);
        i++;
        j--;
      }
    }
    
    // Recursively sort partitions
    if (left < j) quickSort(arr, left, j);
    if (i < right) quickSort(arr, i, right);
  }
  return arr;
}

function swap(arr, i, j) {
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
}

// Test with random data
const data = Array.from({ length: 100 }, () => Math.floor(Math.random() * 1000));
const sorted = quickSort([...data]);
console.log("Sorted:", sorted.slice(0, 10));`,
      },
    ],
  });
});

/**
 * POST /api/export-midi
 * Export code as a downloadable MIDI file
 */
app.post('/api/export-midi', (req, res) => {
  try {
    const { code, language, style } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing or invalid "code" field' });
      return;
    }

    const result = composer.sonify({
      code,
      language: language as CodeLanguage | undefined,
      style: (style as MusicStyle) || 'classical',
    });

    const midiBuffer = midiGen.generate(result.composition);

    res.setHeader('Content-Type', 'audio/midi');
    res.setHeader('Content-Disposition', 'attachment; filename="codesonify.mid"');
    res.send(midiBuffer);
  } catch (error) {
    console.error('MIDI export error:', error);
    res.status(500).json({ error: 'Failed to generate MIDI' });
  }
});

/**
 * POST /api/sonify-diff
 * Sonify a code diff or compare two versions
 */
app.post('/api/sonify-diff', (req, res) => {
  try {
    const { diff_text, old_code, new_code, style } = req.body;
    const musicStyle = (style as MusicStyle) || 'classical';

    if (diff_text) {
      const result = diffSonifier.sonifyDiff(diff_text, musicStyle);
      res.json(result);
    } else if (old_code && new_code) {
      const result = diffSonifier.sonifyTwoVersions(old_code, new_code, musicStyle);
      res.json(result);
    } else {
      res.status(400).json({ error: 'Provide diff_text or both old_code and new_code' });
    }
  } catch (error) {
    console.error('Diff sonify error:', error);
    res.status(500).json({ error: 'Failed to sonify diff' });
  }
});

// Catch-all: serve the web app
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
  🎵 ═══════════════════════════════════════════════════
     CodeSonify - Transform Code Into Music
  ═══════════════════════════════════════════════════════
  
  🌐 Web App:    http://localhost:${PORT}
  📡 API:        http://localhost:${PORT}/api/sonify
  ❤️  Health:     http://localhost:${PORT}/api/health
  
  Ready to sonify your code! 🎶
  ═══════════════════════════════════════════════════════
  `);
});

export default app;
