#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { MultiProjectDashboardServer } from './multi-server';

const program = new Command();

program
  .name('claude-spec-dashboard')
  .description('Launch a real-time dashboard for Claude Code Spec Workflow')
  .version('1.3.0');

program
  .option('-p, --port <port>', 'Port to run the dashboard on', '3000')
  .option('-d, --dir <path>', 'Project directory containing .claude', process.cwd())
  .option('-o, --open', 'Open dashboard in browser automatically')
  .option('-m, --multi', 'Launch multi-project dashboard (deprecated - always uses multi-project mode)')
  .action(async (options) => {
    // Always use multi-project dashboard (it handles single projects too)
    console.log(chalk.cyan.bold('🚀 Claude Code Dashboard'));
    console.log(chalk.gray('Monitoring Claude projects'));
    console.log();

    const spinner = ora('Starting dashboard...').start();

    try {
      const server = new MultiProjectDashboardServer({
        port: parseInt(options.port),
        autoOpen: options.open,
      });

      await server.start();

      spinner.succeed(
        chalk.green(`Dashboard running at http://localhost:${options.port}`)
      );
      console.log();
      console.log(chalk.gray('Press Ctrl+C to stop the server'));
      console.log();

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\nShutting down dashboard...'));

        const forceExitTimeout = setTimeout(() => {
          console.log(chalk.red('Force exiting...'));
          process.exit(1);
        }, 5000);

        try {
          await server.stop();
          clearTimeout(forceExitTimeout);
          process.exit(0);
        } catch (error) {
          console.error(chalk.red('Error during shutdown:'), error);
          process.exit(1);
        }
      });
    } catch (error) {
      spinner.fail('Failed to start dashboard');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
