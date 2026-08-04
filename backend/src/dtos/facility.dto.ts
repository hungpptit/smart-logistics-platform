import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsBoolean, ValidateNested, IsNotEmpty, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { FacilityStatus, FacilityZoneType } from '@prisma/client';

export class FacilityAddressDto {
  @IsString({ message: 'Địa chỉ dòng 1 không được để trống' })
  @IsNotEmpty({ message: 'Địa chỉ dòng 1 không được để trống' })
  addressLine1!: string;

  @IsString({ message: 'Địa chỉ dòng 2 phải là một chuỗi ký tự' })
  @IsOptional()
  addressLine2?: string;

  @IsString({ message: 'Phường/Xã không được để trống' })
  @IsNotEmpty({ message: 'Phường/Xã không được để trống' })
  ward!: string;

  @IsString({ message: 'Tỉnh/Thành phố không được để trống' })
  @IsNotEmpty({ message: 'Tỉnh/Thành phố không được để trống' })
  province!: string;

  @IsString({ message: 'Quốc gia phải là một chuỗi ký tự' })
  @IsOptional()
  country?: string;

  @IsString({ message: 'Mã bưu điện phải là một chuỗi ký tự' })
  @IsOptional()
  postalCode?: string;

  @IsNumber({}, { message: 'Vĩ độ phải là một số thực' })
  latitude!: number;

  @IsNumber({}, { message: 'Kinh độ phải là một số thực' })
  longitude!: number;

  @IsString({ message: 'Mã Phường/Xã phải là một chuỗi ký tự' })
  @IsOptional()
  wardCode?: string;
}

export class CreateFacilityDto {
  @IsString({ message: 'Tên kho bãi không được để trống' })
  @IsNotEmpty({ message: 'Tên kho bãi không được để trống' })
  facilityName!: string;

  @IsUUID('4', { message: 'ID loại kho bãi phải là UUID hợp lệ' })
  facilityTypeId!: string;

  @IsUUID('4', { message: 'ID kho bãi cha phải là UUID hợp lệ' })
  @IsOptional()
  parentFacilityId?: string;

  @IsString({ message: 'Mã Tỉnh/Thành phố phải là một chuỗi ký tự' })
  @IsOptional()
  provinceCode?: string;

  @IsUUID('4', { message: 'ID người quản lý phải là UUID hợp lệ' })
  @IsOptional()
  managerUserId?: string;

  @IsEnum(FacilityStatus, { message: 'Trạng thái hoạt động không hợp lệ' })
  @IsOptional()
  operatingStatus?: FacilityStatus;

  @IsDateString({}, { message: 'Ngày mở cửa phải đúng định dạng ngày ISO' })
  openedAt!: string;

  @IsString({ message: 'Ghi chú phải là một chuỗi ký tự' })
  @IsOptional()
  note?: string;

  @ValidateNested({ message: 'Thông tin địa chỉ kho không hợp lệ' })
  @Type(() => FacilityAddressDto)
  address!: FacilityAddressDto;
}

export class UpdateFacilityDto {
  @IsString({ message: 'Tên kho bãi phải là một chuỗi ký tự' })
  @IsOptional()
  facilityName?: string;

  @IsUUID('4', { message: 'ID loại kho bãi phải là UUID hợp lệ' })
  @IsOptional()
  facilityTypeId?: string;

  @IsUUID('4', { message: 'ID kho bãi cha phải là UUID hợp lệ' })
  @IsOptional()
  parentFacilityId?: string;

  @IsString({ message: 'Mã Tỉnh/Thành phố phải là một chuỗi ký tự' })
  @IsOptional()
  provinceCode?: string;

  @IsUUID('4', { message: 'ID người quản lý phải là UUID hợp lệ' })
  @IsOptional()
  managerUserId?: string;

  @IsEnum(FacilityStatus, { message: 'Trạng thái hoạt động không hợp lệ' })
  @IsOptional()
  operatingStatus?: FacilityStatus;

  @IsDateString({}, { message: 'Ngày đóng cửa phải đúng định dạng ngày ISO' })
  @IsOptional()
  closedAt?: string;

  @IsString({ message: 'Ghi chú phải là một chuỗi ký tự' })
  @IsOptional()
  note?: string;
}

export class CreateFacilityZoneDto {
  @IsString({ message: 'Mã phân khu không được để trống' })
  @IsNotEmpty({ message: 'Mã phân khu không được để trống' })
  zoneCode!: string;

  @IsString({ message: 'Tên phân khu không được để trống' })
  @IsNotEmpty({ message: 'Tên phân khu không được để trống' })
  zoneName!: string;

  @IsEnum(FacilityZoneType, { message: 'Loại phân khu không hợp lệ' })
  zoneType!: FacilityZoneType;

  @IsNumber({}, { message: 'Sức chứa phải là số nguyên' })
  @IsOptional()
  capacity?: number;
}

export class UpdateFacilityZoneDto {
  @IsString({ message: 'Tên phân khu phải là một chuỗi ký tự' })
  @IsOptional()
  zoneName?: string;

  @IsEnum(FacilityZoneType, { message: 'Loại phân khu không hợp lệ' })
  @IsOptional()
  zoneType?: FacilityZoneType;

  @IsNumber({}, { message: 'Sức chứa phải là số nguyên' })
  @IsOptional()
  capacity?: number;
}
