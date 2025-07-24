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

    this.watcher = watch('**/*.md', {
      cwd: specsPath,
      ignored: /(^|[\\/])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (path) => this.handleFileChange('added', path))
      .on('change', (path) => this.handleFileChange('changed', path))
      .on('unlink', (path) => this.handleFileChange('removed', path))
      .on('error', (error) => console.error('Watcher error:', error));

    // Also watch for Claude hook files
    this.watchHookFiles();
  }

  private watchHookFiles() {
    const hooksPath = join(this.projectPath, '.claude', 'hooks');

    // Watch for hook activity files that Claude might create
    const hookWatcher = watch('**/*', {
      cwd: hooksPath,
      persistent: true,
      ignoreInitial: true,
    });

    hookWatcher
      .on('add', (path) => {
        if (path.includes('task-started') || path.includes('task-completed')) {
          this.handleHookEvent(path);
        }
      })
      .on('change', (path) => {
        if (path.includes('task-started') || path.includes('task-completed')) {
          this.handleHookEvent(path);
        }
      });
  }

  private async handleFileChange(type: 'added' | 'changed' | 'removed', filePath: string) {
    const parts = filePath.split(/[\\/]/);
    const specName = parts[0];

    if (parts.length === 2 && parts[1].match(/^(requirements|design|tasks)\.md$/)) {
      const spec = await this.parser.getSpec(specName);

      this.emit('change', {
        type,
        spec: specName,
        file: parts[1],
        data: spec,
      } as SpecChangeEvent);
    }
  }

  private async handleHookEvent(filePath: string) {
    // Parse hook event to determine which task is being worked on
    const match = filePath.match(/(\w+)-(task-\d+(?:\.\d+)?)-(\w+)/);
    if (match) {
      const [, specName, taskId, action] = match;

      this.emit('change', {
        type: 'changed',
        spec: specName,
        file: 'hook',
        data: {
          taskId,
          action,
          timestamp: new Date(),
        },
      } as SpecChangeEvent);
    }
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
    }
  }
}
