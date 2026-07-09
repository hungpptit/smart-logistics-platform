import { IsString, IsOptional, IsUUID, IsEnum, IsNotEmpty, IsDateString, IsBoolean, IsEmail } from 'class-validator';
import { DriverEmploymentStatus } from '@prisma/client';

export class CreateDriverDto {
  @IsEmail({}, { message: 'Địa chỉ email tài khoản không hợp lệ' })
  @IsNotEmpty({ message: 'Địa chỉ email tài khoản không được để trống' })
  email!: string;

  @IsString({ message: 'Họ và tên tài xế không được để trống' })
  @IsNotEmpty({ message: 'Họ và tên tài xế không được để trống' })
  fullName!: string;

  @IsString({ message: 'Số điện thoại không được để trống' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone!: string;

  @IsString({ message: 'Số bằng lái xe không được để trống' })
  @IsNotEmpty({ message: 'Số bằng lái xe không được để trống' })
  driverLicenseNumber!: string;

  @IsString({ message: 'Hạng bằng lái xe không được để trống' })
  @IsNotEmpty({ message: 'Hạng bằng lái xe không được để trống' })
  driverLicenseClass!: string;

  @IsDateString({}, { message: 'Ngày ký hợp đồng phải đúng định dạng ngày ISO' })
  hireDate!: string;

  @IsString({ message: 'Số CCCD phải là chuỗi ký tự' })
  @IsOptional()
  citizenId?: string;

  @IsEnum(DriverEmploymentStatus, { message: 'Trạng thái hoạt động không hợp lệ' })
  @IsOptional()
  employmentStatus?: DriverEmploymentStatus;

  @IsUUID('4', { message: 'ID kho bãi phải là UUID hợp lệ' })
  @IsOptional()
  homeFacilityId?: string;

  @IsString({ message: 'Ghi chú phải là một chuỗi ký tự' })
  @IsOptional()
  note?: string;
}

export class UpdateDriverDto {
  @IsUUID('4', { message: 'ID tài khoản người dùng phải là UUID hợp lệ' })
  @IsOptional()
  userId?: string;

  @IsString({ message: 'Họ và tên tài xế phải là chuỗi ký tự' })
  @IsOptional()
  fullName?: string;

  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @IsOptional()
  phone?: string;

  @IsString({ message: 'Số bằng lái xe phải là chuỗi ký tự' })
  @IsOptional()
  driverLicenseNumber?: string;

  @IsString({ message: 'Hạng bằng lái xe phải là chuỗi ký tự' })
  @IsOptional()
  driverLicenseClass?: string;

  @IsDateString({}, { message: 'Ngày ký hợp đồng phải đúng định dạng ngày ISO' })
  @IsOptional()
  hireDate?: string;

  @IsString({ message: 'Số CCCD phải là chuỗi ký tự' })
  @IsOptional()
  citizenId?: string;

  @IsEnum(DriverEmploymentStatus, { message: 'Trạng thái hoạt động không hợp lệ' })
  @IsOptional()
  employmentStatus?: DriverEmploymentStatus;

  @IsUUID('4', { message: 'ID kho bãi phải là UUID hợp lệ' })
  @IsOptional()
  homeFacilityId?: string;

  @IsString({ message: 'Ghi chú phải là một chuỗi ký tự' })
  @IsOptional()
  note?: string;
}
