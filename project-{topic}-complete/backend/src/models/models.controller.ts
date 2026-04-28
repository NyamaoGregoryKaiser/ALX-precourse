import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile, Res, HttpStatus } from '@nestjs/common';
import { ModelsService } from './models.service';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Model } from './entities/model.entity';
import { Response } from 'express';

@ApiTags('models')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Post()
  @Roles(Role.User, Role.Admin)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The ML model file (e.g., .pkl, .h5, .pt)',
        },
        name: { type: 'string', description: 'Name of the model' },
        description: { type: 'string', description: 'Description of the model', required: false },
        version: { type: 'string', description: 'Version of the model (e.g., v1.0)' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a new ML model' })
  @ApiResponse({ status: 201, description: 'Model uploaded successfully.', type: Model })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() createModelDto: CreateModelDto,
    @Request() req,
  ) {
    return this.modelsService.create(createModelDto, file, req.user.id);
  }

  @Get()
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Get all ML models' })
  @ApiResponse({ status: 200, description: 'List of all models.', type: [Model] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Request() req) {
    return this.modelsService.findAll(req.user.role === Role.Admin ? undefined : req.user.id);
  }

  @Get(':id')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Get an ML model by ID' })
  @ApiResponse({ status: 200, description: 'The found model.', type: Model })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.modelsService.findOne(id, req.user.id, req.user.role);
  }

  @Get(':id/download')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Download an ML model file by ID' })
  @ApiResponse({ status: 200, description: 'Model file.', type: 'string', format: 'binary' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Model not found or file not found on server.' })
  async download(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const { stream, fileName, fileType } = await this.modelsService.downloadFile(id, req.user.id, req.user.role);
    res.setHeader('Content-Type', fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    stream.pipe(res);
  }


  @Patch(':id')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Update an ML model by ID' })
  @ApiResponse({ status: 200, description: 'The updated model.', type: Model })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  update(
    @Param('id') id: string,
    @Body() updateModelDto: UpdateModelDto,
    @Request() req,
  ) {
    return this.modelsService.update(id, updateModelDto, req.user.id, req.user.role);
  }

  @Post(':id/deploy')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Deploy an ML model by ID (marks as deployed, can update deploymentUrl)' })
  @ApiResponse({ status: 200, description: 'Model marked as deployed.', type: Model })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  deploy(@Param('id') id: string, @Body('deploymentUrl') deploymentUrl: string, @Request() req) {
    return this.modelsService.deploy(id, deploymentUrl, req.user.id, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Delete an ML model by ID' })
  @ApiResponse({ status: 204, description: 'Model deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Model not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error (e.g., failed to delete file).' })
  async remove(@Param('id') id: string, @Request() req, @Res() res: Response) {
    await this.modelsService.remove(id, req.user.id, req.user.role);
    res.status(HttpStatus.NO_CONTENT).send();
  }
}