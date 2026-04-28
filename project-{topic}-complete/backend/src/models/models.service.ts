import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from './entities/model.entity';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { FilesService } from '../files/files.service';
import { Role } from '../common/enums/role.enum';
import * as fs from 'fs';
import { AppLogger } from '../common/logger/app-logger.service';

@Injectable()
export class ModelsService {
  private readonly MODELS_SUBFOLDER = 'models';

  constructor(
    @InjectRepository(Model)
    private modelsRepository: Repository<Model>,
    private filesService: FilesService,
    private readonly logger: AppLogger,
  ) {}

  async create(createModelDto: CreateModelDto, file: Express.Multer.File, userId: string): Promise<Model> {
    this.logger.log(`User ${userId} attempting to upload model: ${createModelDto.name} (v${createModelDto.version})`, ModelsService.name);
    if (!file) {
      throw new BadRequestException('Model file is required.');
    }

    try {
      const relativeFilePath = await this.filesService.saveFile(file, this.MODELS_SUBFOLDER);

      const model = this.modelsRepository.create({
        ...createModelDto,
        filePath: relativeFilePath,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
        createdById: userId,
        deployed: false, // Newly uploaded models are not deployed by default
      });

      return await this.modelsRepository.save(model);
    } catch (error) {
      this.logger.error(`Failed to create model for user ${userId}: ${error.message}`, error.stack, ModelsService.name);
       // If file was saved but DB save failed, attempt to delete the file
      if (error instanceof InternalServerErrorException && error.message === 'Failed to save file.') {
          throw error; // Re-throw file saving error
      }
      if (file && error) {
        // Attempt to cleanup the file if DB transaction fails
        const relativeFilePath = path.join(this.MODELS_SUBFOLDER, path.basename(file.originalname));
        await this.filesService.deleteFile(relativeFilePath).catch(cleanupErr => {
          this.logger.error(`Failed to clean up file after model creation error: ${cleanupErr.message}`, cleanupErr.stack, ModelsService.name);
        });
      }
      throw new InternalServerErrorException('Failed to create model due to a server error.');
    }
  }

  async findAll(userId?: string): Promise<Model[]> {
    this.logger.log(`Fetching all models for user ${userId || 'admin'}`, ModelsService.name);
    const findOptions = userId ? { where: { createdById: userId } } : {};
    return this.modelsRepository.find(findOptions);
  }

  async findOne(id: string, userId: string, userRole: Role): Promise<Model> {
    this.logger.log(`Fetching model ${id} for user ${userId} with role ${userRole}`, ModelsService.name);
    const model = await this.modelsRepository.findOne({ where: { id } });

    if (!model) {
      throw new NotFoundException(`Model with ID "${id}" not found.`);
    }

    if (userRole !== Role.Admin && model.createdById !== userId) {
      throw new ForbiddenException('You do not have permission to access this model.');
    }

    return model;
  }

  async update(id: string, updateModelDto: UpdateModelDto, userId: string, userRole: Role): Promise<Model> {
    this.logger.log(`User ${userId} attempting to update model ${id}`, ModelsService.name);
    const model = await this.findOne(id, userId, userRole); // Checks permissions

    this.modelsRepository.merge(model, updateModelDto);
    return this.modelsRepository.save(model);
  }

  async deploy(id: string, deploymentUrl: string, userId: string, userRole: Role): Promise<Model> {
    this.logger.log(`User ${userId} attempting to deploy model ${id}`, ModelsService.name);
    const model = await this.findOne(id, userId, userRole); // Checks permissions

    model.deployed = true;
    model.deploymentUrl = deploymentUrl; // Can be a placeholder or actual URL
    return this.modelsRepository.save(model);
  }

  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    this.logger.log(`User ${userId} attempting to delete model ${id}`, ModelsService.name);
    const model = await this.findOne(id, userId, userRole); // Checks permissions

    await this.filesService.deleteFile(model.filePath);
    await this.modelsRepository.delete(id);
  }

  async downloadFile(id: string, userId: string, userRole: Role): Promise<{ stream: fs.ReadStream; fileName: string; fileType: string }> {
    this.logger.log(`User ${userId} attempting to download file for model ${id}`, ModelsService.name);
    const model = await this.findOne(id, userId, userRole); // Checks permissions

    try {
      const absolutePath = await this.filesService.getFilePath(model.filePath);
      const fileStream = fs.createReadStream(absolutePath);
      return { stream: fileStream, fileName: model.fileName, fileType: model.fileType };
    } catch (error) {
      this.logger.error(`Failed to read file for model ${id}: ${error.message}`, error.stack, ModelsService.name);
      throw new InternalServerErrorException('Could not read the model file.');
    }
  }
}