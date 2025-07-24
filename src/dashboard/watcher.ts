import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { join } from 'path';
import { SpecParser } from './parser';

export interface SpecChangeEvent {
  type: 'added' | 'changed' | 'removed';
  spec: string;
  file: string;
  data?: any;
}

export class SpecWatcher extends EventEmitter {
  private watcher?: FSWatcher;
  private projectPath: string;
  private parser: SpecParser;

  constructor(projectPath: string, parser: SpecParser) {
    super();
    this.projectPath = projectPath;
    this.parser = parser;
  }

  async start() {
    const specsPath = join(this.projectPath, '.claude', 'specs');

    console.log(`[Watcher] Starting to watch: ${specsPath}`);
    
    // Try to use FSEvents on macOS, fall back to polling if needed
    const isMacOS = process.platform === 'darwin';
    
    this.watcher = watch('.', {
      cwd: specsPath,
      ignored: /(^|[\\/])\.DS_Store/, // Only ignore .DS_Store
      persistent: true,
      ignoreInitial: true,
      // Use FSEvents on macOS if available, otherwise poll
      usePolling: !isMacOS,
      useFsEvents: isMacOS,
      // Polling fallback settings
      interval: isMacOS ? 100 : 1000,
      binaryInterval: 300,
      // Don't wait for write to finish - report changes immediately
      awaitWriteFinish: false,
      // Follow symlinks
      followSymlinks: true,
      // Emit all events
      ignorePermissionErrors: false,
      atomic: true
    });

    this.watcher
      .on('add', (path) => {
        console.log(`[Watcher] File added: ${path}`);
        this.handleFileChange('added', path);
      })
      .on('change', (path) => {
        console.log(`[Watcher] File changed: ${path}`);
        this.handleFileChange('changed', path);
      })
      .on('unlink', (path) => {
        console.log(`[Watcher] File removed: ${path}`);
        this.handleFileChange('removed', path);
      })
      .on('addDir', (path) => {
        console.log(`[Watcher] Directory added: ${path}`);
        // When a new directory is added, we should check for .md files in it
        if (path && !path.includes('/')) {
          // This is a top-level directory (spec directory)
          this.checkNewSpecDirectory(path);
        }
      })
      .on('unlinkDir', (path) => {
        console.log(`[Watcher] Directory removed: ${path}`);
        // Emit a remove event for the spec
        if (path && !path.includes('/')) {
          this.emit('change', {
            type: 'removed',
            spec: path,
            file: 'directory',
            data: null,
          } as SpecChangeEvent);
        }
      })
      .on('ready', () => console.log('[Watcher] Initial scan complete. Ready for changes.'))
      .on('error', (error) => console.error('[Watcher] Error:', error));
  }

  private async handleFileChange(type: 'added' | 'changed' | 'removed', filePath: string) {
    console.log(`File change detected: ${type} - ${filePath}`);
    const parts = filePath.split(/[\\/]/);
    const specName = parts[0];

    if (parts.length === 2 && parts[1].match(/^(requirements|design|tasks)\.md$/)) {
      // Add a small delay to ensure file write is complete
      if (type === 'changed') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const spec = await this.parser.getSpec(specName);
      console.log(`Emitting change for spec: ${specName}, file: ${parts[1]}`);
      
      // Log approval status for debugging
      if (parts[1] === 'tasks.md' && spec && spec.tasks) {
        console.log(`Tasks approved: ${spec.tasks.approved}`);
      }

      this.emit('change', {
        type,
        spec: specName,
        file: parts[1],
        data: spec,
      } as SpecChangeEvent);
    }
  }

  private async checkNewSpecDirectory(dirPath: string) {
    // When a new directory is created, check for any .md files already in it
    const specName = dirPath;
    const spec = await this.parser.getSpec(specName);
    
    if (spec) {
      console.log(`Found spec in new directory: ${specName}`);
      this.emit('change', {
        type: 'added',
        spec: specName,
        file: 'directory',
        data: spec,
      } as SpecChangeEvent);
    }
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
    }
  }
}
