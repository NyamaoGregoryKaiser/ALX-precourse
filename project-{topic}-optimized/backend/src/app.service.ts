import { Injectable } from '@nestjs/common';

/**
 * Basic service for the root controller.
 */
@Injectable()
export class AppService {
  /**
   * Provides a simple greeting message.
   * @returns {string} The greeting message.
   */
  getHello(): string {
    return 'Welcome to Task Management API!';
  }
}