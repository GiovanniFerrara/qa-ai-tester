export class RunCancelledError extends Error {
  constructor(message = 'Run cancelled by user') {
    super(message);
    this.name = 'RunCancelledError';
  }
}
