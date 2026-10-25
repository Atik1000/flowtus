import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UPLOAD, rid } from '@flowtus/core';
import { config } from '../common/config';
import { PrismaService } from '../common/prisma.service';

/** Magic-byte sniffing: the client-declared mime type is never trusted on its own. */
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1)/.test(buf.subarray(8, 12).toString('ascii'))) return 'image/heic';
  return null;
}
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };

@Injectable()
export class UploadsService {
  constructor(private prisma: PrismaService) {}

  async save(file: { originalname: string; buffer: Buffer; size: number }) {
    if (!file || !file.size) throw new BadRequestException('This file is empty.');
    if (file.size > UPLOAD.maxBytes) throw new BadRequestException('Photo must be 5 MB or smaller.');
    const mime = sniff(file.buffer);
    if (!mime || !UPLOAD.types.includes(mime)) throw new BadRequestException('Use a JPG, PNG, WEBP or HEIC photo.');
    const id = rid(16);
    await mkdir(config.uploadDir, { recursive: true });
    // The stored name is generated; the customer's filename is kept only as metadata and never reaches the filesystem.
    const path = `${id}.${EXT[mime]}`;
    await writeFile(join(config.uploadDir, path), file.buffer, { mode: 0o600 });
    const name = file.originalname.replace(/[^\w.\- ]+/g, '_').slice(0, 80) || 'photo';
    await this.prisma.upload.create({ data: { id, filename: name, mime, size: file.size, path } });
    return { id, name, size: file.size };
  }

  async meta(id: string) {
    const up = await this.prisma.upload.findUnique({ where: { id } });
    if (!up) throw new BadRequestException('That photo could not be found. Upload it again.');
    return { id: up.id, name: up.filename, size: up.size };
  }

  private sig(id: string, exp: number) {
    return createHmac('sha256', config.jwtSecret).update(`${id}.${exp}`).digest('hex');
  }
  /** Short-lived signed link for staff. Uploads are never public. */
  signedUrl(id: string, ttlSeconds = 600) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    return `/api/uploads/${id}/file?exp=${exp}&sig=${this.sig(id, exp)}`;
  }
  async read(id: string, exp: number, sig: string) {
    const expected = Buffer.from(this.sig(id, exp));
    const given = Buffer.from(String(sig || ''));
    if (!exp || exp < Date.now() / 1000 || expected.length !== given.length || !timingSafeEqual(expected, given)) throw new NotFoundException();
    const up = await this.prisma.upload.findUnique({ where: { id } });
    if (!up) throw new NotFoundException();
    return { mime: up.mime, filename: up.filename, data: await readFile(join(config.uploadDir, up.path)) };
  }
}

