import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsUUID, IsNotEmpty, IsEmail } from 'class-validator';
import { CustomerType, UserStatus, CustomerAddressType } from '@prisma/client';

export class CreateCustomerDto {
  @IsString({ message: 'Tên đăng nhập phải là một chuỗi ký tự' })
  @IsOptional()
  username?: string;

  @IsString({ message: 'Họ và tên không được để trống' })
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  fullName!: string;

  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ' })
  @IsNotEmpty({ message: 'Địa chỉ email không được để trống' })
  email!: string;

  @IsString({ message: 'Số điện thoại phải là một chuỗi ký tự' })
  @IsOptional()
  phone?: string;

  @IsEnum(CustomerType, { message: 'Loại khách hàng không hợp lệ (INDIVIDUAL hoặc BUSINESS)' })
  customerType!: CustomerType;

  @IsString({ message: 'Tên công ty phải là một chuỗi ký tự' })
  @IsOptional()
  companyName?: string;

  @IsString({ message: 'Mã số thuế phải là một chuỗi ký tự' })
  @IsOptional()
  taxCode?: string;

  @IsString({ message: 'Ghi chú phải là một chuỗi ký tự' })
  @IsOptional()
  note?: string;
}

export class UpdateCustomerDto {
  @IsEnum(CustomerType, { message: 'Loại khách hàng không hợp lệ' })
  @IsOptional()
  customerType?: CustomerType;

  @IsString({ message: 'Tên công ty phải là một chuỗi ký tự' })
  @IsOptional()
  companyName?: string;

  @IsString({ message: 'Mã số thuế phải là một chuỗi ký tự' })
  @IsOptional()
  taxCode?: string;

  @IsEnum(UserStatus, { message: 'Trạng thái tài khoản không hợp lệ' })
  @IsOptional()
  status?: UserStatus;

  @IsString({ message: 'Ghi chú phải là một chuỗi ký tự' })
  @IsOptional()
  note?: string;
}

export class CreateAddressDto {
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

  @IsNumber({}, { message: 'Vĩ độ (latitude) phải là một số thực' })
  latitude!: number;

  @IsNumber({}, { message: 'Kinh độ (longitude) phải là một số thực' })
  longitude!: number;

  @IsEnum(CustomerAddressType, { message: 'Loại địa chỉ không hợp lệ' })
  addressType!: CustomerAddressType;

  @IsBoolean({ message: 'Trường địa chỉ mặc định phải là Boolean' })
  @IsOptional()
  isDefault?: boolean;

  @IsString({ message: 'Mã Phường/Xã phải là một chuỗi ký tự' })
  @IsOptional()
  wardCode?: string;

  @IsString({ message: 'Tên người liên hệ kho phải là chuỗi' })
  @IsOptional()
  contactName?: string;

  @IsString({ message: 'Số điện thoại người liên hệ kho phải là chuỗi' })
  @IsOptional()
  contactPhone?: string;
}

export class UpdateAddressDto {
  @IsString({ message: 'Địa chỉ dòng 1 phải là một chuỗi ký tự' })
  @IsOptional()
  addressLine1?: string;

  @IsString({ message: 'Địa chỉ dòng 2 phải là một chuỗi ký tự' })
  @IsOptional()
  addressLine2?: string;

  @IsString({ message: 'Phường/Xã phải là một chuỗi ký tự' })
  @IsOptional()
  ward?: string;

  @IsString({ message: 'Tỉnh/Thành phố phải là một chuỗi ký tự' })
  @IsOptional()
  province?: string;

  @IsString({ message: 'Quốc gia phải là một chuỗi ký tự' })
  @IsOptional()
  country?: string;

  @IsString({ message: 'Mã bưu điện phải là một chuỗi ký tự' })
  @IsOptional()
  postalCode?: string;

  @IsNumber({}, { message: 'Vĩ độ phải là một số thực' })
  @IsOptional()
  latitude?: number;

  @IsNumber({}, { message: 'Kinh độ phải là một số thực' })
  @IsOptional()
  longitude?: number;

  @IsEnum(CustomerAddressType, { message: 'Loại địa chỉ không hợp lệ' })
  @IsOptional()
  addressType?: CustomerAddressType;

  @IsBoolean({ message: 'Trường địa chỉ mặc định phải là Boolean' })
  @IsOptional()
  isDefault?: boolean;

  @IsString({ message: 'Mã Phường/Xã phải là một chuỗi ký tự' })
  @IsOptional()
  wardCode?: string;

  @IsString({ message: 'Tên người liên hệ kho phải là chuỗi' })
  @IsOptional()
  contactName?: string;

  @IsString({ message: 'Số điện thoại người liên hệ kho phải là chuỗi' })
  @IsOptional()
  contactPhone?: string;
}
