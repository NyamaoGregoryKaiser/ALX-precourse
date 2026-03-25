/**
 * Defines the possible statuses a task can have.
 * This enum helps standardize task progress tracking.
 */
export enum TaskStatus {
  TODO = 'TODO',              // Task is planned but not yet started.
  IN_PROGRESS = 'IN_PROGRESS', // Task is currently being worked on.
  DONE = 'DONE',              // Task has been completed.
  BLOCKED = 'BLOCKED',        // Task is blocked by an external factor or dependency.
  CANCELED = 'CANCELED',      // Task has been cancelled and will not be completed.
}