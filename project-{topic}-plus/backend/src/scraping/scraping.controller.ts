```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { CreateScrapingJobDto } from './dto/create-scraping-job.dto';
import { UpdateScrapingJobDto } from './dto/update-scraping-job.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { ScrapingJob } from './entities/scraping-job.entity';
import { ScrapingResult } from './entities/scraping-result.entity';
import { ScrapingTask } from './entities/scraping-task.entity';
import { CacheTTL } from '../common/decorators/cache-ttl.decorator';

@ApiBearerAuth('accessToken')
@ApiTags('Scraping Jobs')
@Controller('scraping-jobs')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new scraping job' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The scraping job has been successfully created and enqueued/scheduled.',
    type: ScrapingJob,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input.' })
  create(@Request() req, @Body() createScrapingJobDto: CreateScrapingJobDto) {
    return this.scrapingService.createScrapingJob(req.user.userId, createScrapingJobDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve all scraping jobs for the authenticated user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of scraping jobs.', type: [ScrapingJob] })
  @CacheTTL(30) // Cache this endpoint for 30 seconds
  findAll(@Request() req) {
    return this.scrapingService.findAllScrapingJobs(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific scraping job by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'The scraping job details.', type: ScrapingJob })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Scraping job not found.' })
  @CacheTTL(15)
  findOne(@Request() req, @Param('id') id: string) {
    return this.scrapingService.findOneScrapingJob(id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a scraping job by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The scraping job has been successfully updated.',
    type: ScrapingJob,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Scraping job not found.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input.' })
  update(@Request() req, @Param('id') id: string, @Body() updateScrapingJobDto: UpdateScrapingJobDto) {
    return this.scrapingService.updateScrapingJob(id, req.user.userId, updateScrapingJobDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a scraping job by ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The scraping job has been successfully deleted.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Scraping job not found.' })
  delete(@Request() req, @Param('id') id: string) {
    return this.scrapingService.deleteScrapingJob(id, req.user.userId);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Manually enqueue a scraping task for an existing job' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Scraping task enqueued.',
    type: ScrapingTask,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Scraping job not found.' })
  runNow(@Request() req, @Param('id') id: string) {
    return this.scrapingService.enqueueScrapingTask(id);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get all scraping tasks for a specific job' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of tasks for the job.', type: [ScrapingTask] })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Scraping job not found.' })
  @CacheTTL(15)
  getTasks(@Request() req, @Param('id') id: string) {
    return this.scrapingService.getScrapingTasks(id, req.user.userId);
  }

  @Get('tasks/:taskId/results')
  @ApiOperation({ summary: 'Get results for a specific scraping task' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of results for the task.', type: [ScrapingResult] })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Scraping task or job not found.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Permission denied.' })
  @CacheTTL(60)
  getTaskResults(@Request() req, @Param('taskId') taskId: string) {
    return this.scrapingService.getScrapingResults(taskId, req.user.userId);
  }

  @Get(':id/results/latest')
  @ApiOperation({ summary: 'Get the latest results for a specific scraping job' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Latest results for the job.', type: [ScrapingResult] })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Scraping job not found.' })
  @CacheTTL(60)
  getLatestJobResults(@Request() req, @Param('id') jobId: string) {
    return this.scrapingService.getLatestScrapingResultsForJob(jobId, req.user.userId);
  }
}
```