import { ForbiddenException, Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dataset } from './entities/dataset.entity';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { FilesService } from '../files/files.service';
import { Role } from '../common/enums/role.enum';
import * as fs from 'fs';
import { AppLogger } from '../common/logger/app-logger.service';

@Injectable()
export class DatasetsService {
  private readonly DATASETS_SUBFOLDER = 'datasets';

  constructor(
    @InjectRepository(Dataset)
    private datasetsRepository: Repository<Dataset>,
    private filesService: FilesService,
    private readonly logger: AppLogger,
  ) {}

  async create(createDatasetDto: CreateDatasetDto, file: Express.Multer.File, userId: string): Promise<Dataset> {
    this.logger.log(`User ${userId} attempting to upload dataset: ${createDatasetDto.name}`, DatasetsService.name);
    if (!file) {
      throw new BadRequestException('Dataset file is required.');
    }

    try {
      const relativeFilePath = await this.filesService.saveFile(file, this.DATASETS_SUBFOLDER);

      const dataset = this.datasetsRepository.create({
        ...createDatasetDto,
        filePath: relativeFilePath,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
        createdById: userId,
      });

      return await this.datasetsRepository.save(dataset);
    } catch (error) {
      this.logger.error(`Failed to create dataset for user ${userId}: ${error.message}`, error.stack, DatasetsService.name);
      // If file was saved but DB save failed, attempt to delete the file
      if (error instanceof InternalServerErrorException && error.message === 'Failed to save file.') {
          throw error; // Re-throw file saving error
      }
      if (file && error) {
        // Attempt to cleanup the file if DB transaction fails
        const relativeFilePath = path.join(this.DATASETS_SUBFOLDER, path.basename(file.originalname)); // This might need careful adjustment based on file naming convention
        await this.filesService.deleteFile(relativeFilePath).catch(cleanupErr => {
          this.logger.error(`Failed to clean up file after dataset creation error: ${cleanupErr.message}`, cleanupErr.stack, DatasetsService.name);
        });
      }
      throw new InternalServerErrorException('Failed to create dataset due to a server error.');
    }
  }

  async findAll(userId?: string): Promise<Dataset[]> {
    this.logger.log(`Fetching all datasets for user ${userId || 'admin'}`, DatasetsService.name);
    const findOptions = userId ? { where: { createdById: userId } } : {};
    return this.datasetsRepository.find(findOptions);
  }

  async findOne(id: string, userId: string, userRole: Role): Promise<Dataset> {
    this.logger.log(`Fetching dataset ${id} for user ${userId} with role ${userRole}`, DatasetsService.name);
    const dataset = await this.datasetsRepository.findOne({ where: { id } });

    if (!dataset) {
      throw new NotFoundException(`Dataset with ID "${id}" not found.`);
    }

    if (userRole !== Role.Admin && dataset.createdById !== userId) {
      throw new ForbiddenException('You do not have permission to access this dataset.');
    }

    return dataset;
  }

  async update(id: string, updateDatasetDto: UpdateDatasetDto, userId: string, userRole: Role): Promise<Dataset> {
    this.logger.log(`User ${userId} attempting to update dataset ${id}`, DatasetsService.name);
    const dataset = await this.findOne(id, userId, userRole); // Checks permissions

    this.datasetsRepository.merge(dataset, updateDatasetDto);
    return this.datasetsRepository.save(dataset);
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    this.logger.log(`User ${userId} attempting to delete dataset ${id}`, DatasetsService.name);
    const dataset = await this.findOne(id, userId, userRole); // Checks permissions

    await this.filesService.deleteFile(dataset.filePath);
    await this.datasetsRepository.delete(id);
  }

  async downloadFile(id: string, userId: string, userRole: Role): Promise<{ stream: fs.ReadStream; fileName: string; fileType: string }> {
    this.logger.log(`User ${userId} attempting to download file for dataset ${id}`, DatasetsService.name);
    const dataset = await this.findOne(id, userId, userRole); // Checks permissions

    try {
      const absolutePath = await this.filesService.getFilePath(dataset.filePath);
      const fileStream = fs.createReadStream(absolutePath);
      return { stream: fileStream, fileName: dataset.fileName, fileType: dataset.fileType };
    } catch (error) {
      this.logger.error(`Failed to read file for dataset ${id}: ${error.message}`, error.stack, DatasetsService.name);
      throw new InternalServerErrorException('Could not read the dataset file.');
    }
  }
}