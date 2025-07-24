import { readFile, readdir, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  requirements: string[];
  leverage?: string;
  subtasks?: Task[];
}

export interface RequirementDetail {
  id: string;
  title: string;
  userStory?: string;
  acceptanceCriteria: string[];
}

export interface Spec {
  name: string;
  displayName: string;
  status: 'not-started' | 'requirements' | 'design' | 'tasks' | 'in-progress' | 'completed';
  requirements?: {
    exists: boolean;
    userStories: number;
    approved: boolean;
    content?: RequirementDetail[];
  };
  design?: {
    exists: boolean;
    approved: boolean;
    hasCodeReuseAnalysis: boolean;
    codeReuseContent?: string[];
  };
  tasks?: {
    exists: boolean;
    approved: boolean;
    total: number;
    completed: number;
    inProgress?: string;
    taskList: Task[];
  };
  lastModified?: Date;
}

export class SpecParser {
  private projectPath: string;
  private specsPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.specsPath = join(projectPath, '.claude', 'specs');
  }

  async getAllSpecs(): Promise<Spec[]> {
    try {
      // Check if specs directory exists first
      try {
        await access(this.specsPath, constants.F_OK);
      } catch {
        // Specs directory doesn't exist, return empty array
        return [];
      }
      
      console.log('Reading specs from:', this.specsPath);
      const dirs = await readdir(this.specsPath);
      console.log('Found directories:', dirs);
      const specs = await Promise.all(
        dirs.filter((dir) => !dir.startsWith('.')).map((dir) => this.getSpec(dir))
      );
      const validSpecs = specs.filter((spec) => spec !== null) as Spec[];
      console.log('Parsed specs:', validSpecs.length);
      // Sort by last modified date, newest first
      validSpecs.sort((a, b) => {
        const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
        const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
        return dateB - dateA;
      });
      return validSpecs;
    } catch (error) {
      console.error('Error reading specs from', this.specsPath, ':', error);
      return [];
    }
  }

  async getSpec(name: string): Promise<Spec | null> {
    const specPath = join(this.specsPath, name);

    try {
      await access(specPath, constants.F_OK);
    } catch {
      return null;
    }

    const spec: Spec = {
      name,
      displayName: this.formatDisplayName(name),
      status: 'not-started',
    };

    // Check requirements
    const requirementsPath = join(specPath, 'requirements.md');
    if (await this.fileExists(requirementsPath)) {
      const content = await readFile(requirementsPath, 'utf-8');
      spec.requirements = {
        exists: true,
        userStories: (content.match(/(\*\*User Story:\*\*|## User Story \d+)/g) || []).length,
        approved: content.includes('✅ APPROVED') || content.includes('**Approved:** ✓'),
        content: this.extractRequirements(content),
      };
      // Set initial status
      spec.status = 'requirements';
      
      // If requirements are approved, we move to design phase
      if (spec.requirements.approved) {
        spec.status = 'design';
      }
    }

    // Check design
    const designPath = join(specPath, 'design.md');
    if (await this.fileExists(designPath)) {
      const content = await readFile(designPath, 'utf-8');
      spec.design = {
        exists: true,
        approved: content.includes('✅ APPROVED'),
        hasCodeReuseAnalysis: content.includes('## Code Reuse Analysis'),
        codeReuseContent: this.extractCodeReuseAnalysis(content),
      };
      // If design is approved, we move to tasks phase
      if (spec.design.approved) {
        spec.status = 'tasks';
      }
    }

    // Check tasks
    const tasksPath = join(specPath, 'tasks.md');
    if (await this.fileExists(tasksPath)) {
      console.log(`Reading tasks from: ${tasksPath}`);
      const content = await readFile(tasksPath, 'utf-8');
      console.log('Tasks file content length:', content.length);
      console.log('Tasks file includes APPROVED:', content.includes('✅ APPROVED'));
      
      const taskList = this.parseTasks(content);
      const completed = this.countCompletedTasks(taskList);
      const total = this.countTotalTasks(taskList);
      
      console.log('Parsed task counts - Total:', total, 'Completed:', completed);

      spec.tasks = {
        exists: true,
        approved: content.includes('✅ APPROVED'),
        total,
        completed,
        taskList,
      };

      if (spec.tasks.approved) {
        if (completed === 0) {
          spec.status = 'tasks';
        } else if (completed < total) {
          spec.status = 'in-progress';
          // Find current task
          spec.tasks.inProgress = this.findInProgressTask(taskList);
        } else {
          spec.status = 'completed';
        }
      }
    }

    // Get last modified time
    const files = ['requirements.md', 'design.md', 'tasks.md'];
    let lastModified = new Date(0);
    for (const file of files) {
      const filePath = join(specPath, file);
      if (await this.fileExists(filePath)) {
        const stats = await import('fs').then((fs) => fs.promises.stat(filePath));
        if (stats.mtime > lastModified) {
          lastModified = stats.mtime;
        }
      }
    }
    spec.lastModified = lastModified;

    return spec;
  }

  private parseTasks(content: string): Task[] {
    console.log('Parsing tasks from content...');
    const tasks: Task[] = [];
    const lines = content.split('\n');
    console.log('Total lines:', lines.length);
    
    // Let's test what the actual lines look like
    lines.slice(0, 20).forEach((line, i) => {
      if (line.includes('[') && line.includes(']')) {
        console.log(`Line ${i}: "${line}"`);
      }
    });
    
    // Match the actual format: "- [x] 1. Create GraphQL queries..."
    const taskRegex = /^(\s*)- \[([ x])\] (\d+(?:\.\d+)*)\. (.+)$/;
    const requirementsRegex = /_Requirements: ([\d., ]+)/;
    const leverageRegex = /_Leverage: (.+)$/;

    let currentTask: Task | null = null;
    let parentStack: { level: number; task: Task }[] = [];

    for (const line of lines) {
      const match = line.match(taskRegex);
      if (match) {
        const [, indent, checked, id, description] = match;
        const level = indent.length / 2;

        currentTask = {
          id,
          description: description.trim(),
          completed: checked === 'x',
          requirements: [],
        };

        // Find parent based on level
        while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
          parentStack.pop();
        }

        if (parentStack.length > 0) {
          const parent = parentStack[parentStack.length - 1].task;
          if (!parent.subtasks) parent.subtasks = [];
          parent.subtasks.push(currentTask);
        } else {
          tasks.push(currentTask);
        }

        parentStack.push({ level, task: currentTask });
      } else if (currentTask) {
        // Check for requirements
        const reqMatch = line.match(requirementsRegex);
        if (reqMatch) {
          currentTask.requirements = reqMatch[1].split(',').map((r) => r.trim());
        }

        // Check for leverage
        const levMatch = line.match(leverageRegex);
        if (levMatch) {
          currentTask.leverage = levMatch[1].trim();
        }
      }
    }

    return tasks;
  }

  private countCompletedTasks(tasks: Task[]): number {
    let count = 0;
    for (const task of tasks) {
      if (task.completed) count++;
      if (task.subtasks) {
        count += this.countCompletedTasks(task.subtasks);
      }
    }
    return count;
  }

  private countTotalTasks(tasks: Task[]): number {
    let count = tasks.length;
    for (const task of tasks) {
      if (task.subtasks) {
        count += this.countTotalTasks(task.subtasks);
      }
    }
    return count;
  }

  private findInProgressTask(tasks: Task[]): string | undefined {
    for (const task of tasks) {
      if (!task.completed) {
        return task.id;
      }
      if (task.subtasks) {
        const subTaskId = this.findInProgressTask(task.subtasks);
        if (subTaskId) return subTaskId;
      }
    }
    return undefined;
  }

  private formatDisplayName(name: string): string {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractRequirements(content: string): RequirementDetail[] {
    const requirements: RequirementDetail[] = [];
    const lines = content.split('\n');
    let currentRequirement: RequirementDetail | null = null;
    let inAcceptanceCriteria = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line contains a numbered requirement
      if (line.match(/^### Requirement \d+:/)) {
        // Save previous requirement
        if (currentRequirement) {
          requirements.push(currentRequirement);
        }
        
        // Extract requirement number and title
        const match = line.match(/^### Requirement (\d+): (.+)/);
        if (match) {
          currentRequirement = {
            id: match[1],
            title: match[2].trim(),
            acceptanceCriteria: []
          };
        }
        inAcceptanceCriteria = false;
      } 
      // Look for user story
      else if (currentRequirement && line.includes('**User Story:**')) {
        currentRequirement.userStory = line.replace('**User Story:**', '').trim();
      }
      // Look for acceptance criteria section
      else if (currentRequirement && line.includes('#### Acceptance Criteria')) {
        inAcceptanceCriteria = true;
      }
      // Collect acceptance criteria items
      else if (currentRequirement && inAcceptanceCriteria && line.match(/^\d+\. /)) {
        currentRequirement.acceptanceCriteria.push(line.replace(/^\d+\. /, '').trim());
      }
      // Stop at next major section
      else if (line.startsWith('### Requirement') || line.startsWith('## ')) {
        inAcceptanceCriteria = false;
      }
    }

    // Don't forget the last requirement
    if (currentRequirement) {
      requirements.push(currentRequirement);
    }

    return requirements;
  }

  private extractUserStories(content: string): string[] {
    const stories: string[] = [];
    const lines = content.split('\n');
    let currentStory = '';
    let inStorySection = false;

    for (const line of lines) {
      // Check if line contains a user story
      if (line.includes('**User Story:**')) {
        if (currentStory) {
          stories.push(currentStory.trim());
        }
        // Extract the story content after "**User Story:**"
        currentStory = line.replace('**User Story:**', '').trim();
        inStorySection = true;
      } else if (inStorySection && line.trim()) {
        // Stop at next major section (### or ##) or next user story
        if (line.startsWith('###') || line.startsWith('##') || line.includes('**User Story:**')) {
          if (currentStory) {
            stories.push(currentStory.trim());
            currentStory = '';
          }
          // If this line is another user story, process it
          if (line.includes('**User Story:**')) {
            currentStory = line.replace('**User Story:**', '').trim();
          } else {
            inStorySection = false;
          }
        } else if (!line.startsWith('#') && line.trim()) {
          // Continue building the story if it's not a heading
          currentStory += ' ' + line.trim();
        }
      }
    }

    // Don't forget the last story
    if (currentStory) {
      stories.push(currentStory.trim());
    }

    return stories; // Return all stories
  }

  private extractCodeReuseAnalysis(content: string): string[] {
    const analysis: string[] = [];
    const lines = content.split('\n');
    let inCodeReuseSection = false;
    let currentItem = '';

    for (const line of lines) {
      if (line.includes('## Code Reuse Analysis')) {
        inCodeReuseSection = true;
        continue;
      }

      if (inCodeReuseSection) {
        // Stop at next major section
        if (line.startsWith('## ') && !line.includes('Code Reuse')) {
          break;
        }

        // Collect bullet points and key information
        if (line.startsWith('- ') || line.startsWith('* ')) {
          if (currentItem) {
            analysis.push(currentItem.trim());
          }
          currentItem = line.replace(/^[-*]\s*/, '');
        } else if (line.trim() && currentItem) {
          currentItem += ' ' + line.trim();
        } else if (line.trim() && !line.startsWith('#')) {
          analysis.push(line.trim());
        }
      }
    }

    // Don't forget the last item
    if (currentItem) {
      analysis.push(currentItem.trim());
    }

    return analysis; // Return all analysis items
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
