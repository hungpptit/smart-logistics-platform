import { IsString, IsOptional, IsUUID, IsEnum, IsNotEmpty, IsNumber, IsBoolean } from 'class-validator';
import { VehicleOperatingStatus } from '@prisma/client';

export class CreateVehicleDto {
  @IsString({ message: 'Mã phương tiện không được để trống' })
  @IsNotEmpty({ message: 'Mã phương tiện không được để trống' })
  vehicleCode!: string;

  @IsString({ message: 'Biển số xe không được để trống' })
  @IsNotEmpty({ message: 'Biển số xe không được để trống' })
  plateNumber!: string;

  @IsUUID('4', { message: 'ID loại xe phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'Loại xe không được để trống' })
  vehicleTypeId!: string;

  @IsUUID('4', { message: 'ID kho bãi phải là UUID hợp lệ' })
  @IsOptional()
  assignedFacilityId?: string;

  @IsNumber({}, { message: 'Tải trọng tối đa phải là một số thực' })
  @IsNotEmpty({ message: 'Tải trọng tối đa không được để trống' })
  maxWeight!: number;

  @IsNumber({}, { message: 'Thể tích tối đa phải là một số thực' })
  @IsNotEmpty({ message: 'Thể tích tối đa không được để trống' })
  maxVolume!: number;

  @IsNumber({}, { message: 'Chiều dài tối đa phải là một số thực' })
  @IsOptional()
  maxLength?: number;

  @IsBoolean({ message: 'Bảo quản lạnh phải là giá trị boolean' })
  @IsOptional()
  isRefrigerated?: boolean;

  @IsEnum(VehicleOperatingStatus, { message: 'Trạng thái hoạt động của xe không hợp lệ' })
  @IsOptional()
  operatingStatus?: VehicleOperatingStatus;
}

export class UpdateVehicleDto {
  @IsString({ message: 'Mã phương tiện phải là chuỗi ký tự' })
  @IsOptional()
  vehicleCode?: string;

  @IsString({ message: 'Biển số xe phải là chuỗi ký tự' })
  @IsOptional()
  plateNumber?: string;

  @IsUUID('4', { message: 'ID loại xe phải là UUID hợp lệ' })
  @IsOptional()
  vehicleTypeId?: string;

  @IsUUID('4', { message: 'ID kho bãi phải là UUID hợp lệ' })
  @IsOptional()
  assignedFacilityId?: string;

  @IsNumber({}, { message: 'Tải trọng tối đa phải là một số thực' })
  @IsOptional()
  maxWeight?: number;

  @IsNumber({}, { message: 'Thể tích tối đa phải là một số thực' })
  @IsOptional()
  maxVolume?: number;

  @IsNumber({}, { message: 'Chiều dài tối đa phải là một số thực' })
  @IsOptional()
  maxLength?: number;

  @IsBoolean({ message: 'Bảo quản lạnh phải là giá trị boolean' })
  @IsOptional()
  isRefrigerated?: boolean;

  @IsEnum(VehicleOperatingStatus, { message: 'Trạng thái hoạt động của xe không hợp lệ' })
  @IsOptional()
  operatingStatus?: VehicleOperatingStatus;
}
