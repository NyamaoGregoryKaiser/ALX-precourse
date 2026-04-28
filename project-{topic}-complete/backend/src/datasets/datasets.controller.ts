import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile, Res, HttpStatus } from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { Dataset } from './entities/dataset.entity';
import { Response } from 'express';

@ApiTags('datasets')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Post()
  @Roles(Role.User, Role.Admin) // Both users and admins can upload datasets
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The dataset file (e.g., CSV, JSON)',
        },
        name: {
          type: 'string',
          description: 'Name of the dataset',
        },
        description: {
          type: 'string',
          description: 'Description of the dataset',
          required: false,
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a new dataset' })
  @ApiResponse({ status: 201, description: 'Dataset uploaded successfully.', type: Dataset })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., missing file, validation errors).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDatasetDto: CreateDatasetDto,
    @Request() req,
  ) {
    return this.datasetsService.create(createDatasetDto, file, req.user.id);
  }

  @Get()
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Get all datasets' })
  @ApiResponse({ status: 200, description: 'List of all datasets.', type: [Dataset] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Request() req) {
    return this.datasetsService.findAll(req.user.role === Role.Admin ? undefined : req.user.id);
  }

  @Get(':id')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Get a dataset by ID' })
  @ApiResponse({ status: 200, description: 'The found dataset.', type: Dataset })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner or admin).' })
  @ApiResponse({ status: 404, description: 'Dataset not found.' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.datasetsService.findOne(id, req.user.id, req.user.role);
  }

  @Get(':id/download')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Download a dataset file by ID' })
  @ApiResponse({ status: 200, description: 'Dataset file.', type: 'string', format: 'binary' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner or admin).' })
  @ApiResponse({ status: 404, description: 'Dataset not found or file not found on server.' })
  async download(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const { stream, fileName, fileType } = await this.datasetsService.downloadFile(id, req.user.id, req.user.role);
    res.setHeader('Content-Type', fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    stream.pipe(res);
  }

  @Patch(':id')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Update a dataset by ID' })
  @ApiResponse({ status: 200, description: 'The updated dataset.', type: Dataset })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner or admin).' })
  @ApiResponse({ status: 404, description: 'Dataset not found.' })
  update(
    @Param('id') id: string,
    @Body() updateDatasetDto: UpdateDatasetDto,
    @Request() req,
  ) {
    return this.datasetsService.update(id, updateDatasetDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.User, Role.Admin)
  @ApiOperation({ summary: 'Delete a dataset by ID' })
  @ApiResponse({ status: 204, description: 'Dataset deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not owner or admin).' })
  @ApiResponse({ status: 404, description: 'Dataset not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error (e.g., failed to delete file).' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.datasetsService.remove(id, req.user.id, req.user.role);
    res.status(HttpStatus.NO_CONTENT).send();
  }
}