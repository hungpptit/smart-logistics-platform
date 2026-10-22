import { prisma } from '../config/prisma';

export interface CameraFilterOptions {
  city?: string;
  district?: string;
  isActive?: boolean;
}

export class CameraService {
  /**
   * Lấy danh sách camera giao thông đang hoạt động
   */
  async getActiveCameras(options?: CameraFilterOptions) {
    const where: any = {
      isActive: options?.isActive !== undefined ? options.isActive : true,
    };

    if (options?.city) {
      where.city = { contains: options.city, mode: 'insensitive' };
    }

    if (options?.district) {
      where.district = { contains: options.district, mode: 'insensitive' };
    }

    const cameras = await prisma.trafficCamera.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        warningDistance: true,
        bearing: true,
        district: true,
        city: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      total: cameras.length,
      cameras,
    };
  }

  /**
   * Lấy chi tiết camera theo ID hoặc Code
   */
  async getCameraByIdOrCode(idOrCode: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
    return prisma.trafficCamera.findFirst({
      where: isUuid ? { id: idOrCode } : { code: idOrCode },
    });
  }
}

export const cameraService = new CameraService();
