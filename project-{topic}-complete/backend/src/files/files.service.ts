import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly uploadPath: string;
  private readonly logger = new Logger(FilesService.name);

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
    this.ensureUploadDirectoryExists();
  }

  private ensureUploadDirectoryExists(): void {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadPath}`);
    }
  }

  async saveFile(file: Express.Multer.File, subfolder: string): Promise<string> {
    const targetFolder = path.join(this.uploadPath, subfolder);
    this.ensureDirectoryExists(targetFolder);

    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(targetFolder, uniqueFileName);

    try {
      await fs.promises.writeFile(filePath, file.buffer);
      this.logger.log(`File saved: ${filePath}`);
      // Return path relative to the upload root for storage in DB
      return path.join(subfolder, uniqueFileName);
    } catch (error) {
      this.logger.error(`Failed to save file: ${file.originalname}`, error.stack);
      throw new InternalServerErrorException('Failed to save file.');
    }
  }

  async getFilePath(relativePath: string): Promise<string> {
    const absolutePath = path.join(this.uploadPath, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new InternalServerErrorException('File not found on server.');
    }
    return absolutePath;
  }

  async deleteFile(relativePath: string): Promise<void> {
    const absolutePath = path.join(this.uploadPath, relativePath);
    try {
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
        this.logger.log(`File deleted: ${absolutePath}`);
      } else {
        this.logger.warn(`Attempted to delete non-existent file: ${absolutePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${absolutePath}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file.');
    }
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}