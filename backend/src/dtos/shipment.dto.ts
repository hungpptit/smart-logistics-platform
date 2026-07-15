import { IsArray, IsUUID, IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ShipmentStatus } from '@prisma/client';

export class CreateShipmentDto {
  @IsArray({ message: 'Danh sách kiện hàng phải là một mảng' })
  @IsUUID('4', { each: true, message: 'Mỗi ID kiện hàng phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Danh sách kiện hàng không được để trống' })
  packageIds!: string[];

  @IsUUID('4', { message: 'ID lộ trình phải là UUID hợp lệ' })
  @IsOptional()
  routeId?: string;

  @IsEnum(ShipmentStatus, { message: 'Trạng thái vận đơn không hợp lệ' })
  @IsOptional()
  status?: ShipmentStatus;
}

export class UpdateShipmentStatusDto {
  @IsEnum(ShipmentStatus, { message: 'Trạng thái vận đơn không hợp lệ' })
  @IsNotEmpty({ message: 'Trạng thái vận đơn không được để trống' })
  status!: ShipmentStatus;

  @IsUUID('4', { message: 'ID kho bãi phải là UUID hợp lệ' })
  @IsOptional()
  facilityId?: string;

  @IsNumber({}, { message: 'Vĩ độ phải là số thực' })
  @IsOptional()
  latitude?: number;

  @IsNumber({}, { message: 'Kinh độ phải là số thực' })
  @IsOptional()
  longitude?: number;

  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  @IsOptional()
  notes?: string;
}
