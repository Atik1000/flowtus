import { BadRequestException, Controller, Get, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { UPLOAD } from '@flowtus/core';
import { AdminGuard } from '../auth/admin.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: UPLOAD.maxBytes, files: 1 } }))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Choose a photo to upload.');
    return this.uploads.save(file);
  }

  /** Staff-only: returns a short-lived signed link to a customer's reference photo. */
  @Get(':id/link')
  @UseGuards(AdminGuard)
  link(@Param('id') id: string) {
    return { url: this.uploads.signedUrl(id) };
  }

  @Get(':id/file')
  async file(@Param('id') id: string, @Query('exp') exp: string, @Query('sig') sig: string, @Res() res: Response) {
    const f = await this.uploads.read(id, Number(exp), sig);
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(f.data);
  }
}
