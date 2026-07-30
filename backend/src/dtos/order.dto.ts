import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, IsBoolean, ValidateNested, IsNotEmpty, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { FeePayer, PaymentMethod, OrderStatus, PickupType } from '@prisma/client';

export class OrderAddressDto {
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

  @IsNumber({}, { message: 'Vĩ độ phải là một số thực' })
  @IsOptional()
  latitude?: number;

  @IsNumber({}, { message: 'Kinh độ phải là một số thực' })
  @IsOptional()
  longitude?: number;

  @IsString({ message: 'Mã Phường/Xã phải là một chuỗi ký tự' })
  @IsOptional()
  wardCode?: string;
}

export class OrderContactDto {
  @IsString({ message: 'Họ tên liên hệ không được để trống' })
  @IsNotEmpty({ message: 'Họ tên liên hệ không được để trống' })
  fullName!: string;

  @IsString({ message: 'Số điện thoại liên hệ không được để trống' })
  @IsNotEmpty({ message: 'Số điện thoại liên hệ không được để trống' })
  phone!: string;

  @IsString({ message: 'Email liên hệ phải là một chuỗi ký tự' })
  @IsOptional()
  email?: string;
}

export class CreateOrderPackageDto {
  @IsNumber({}, { message: 'Trọng lượng (weight) phải là một số thực' })
  weight!: number;

  @IsNumber({}, { message: 'Chiều dài (length) phải là một số thực' })
  length!: number;

  @IsNumber({}, { message: 'Chiều rộng (width) phải là một số thực' })
  width!: number;

  @IsNumber({}, { message: 'Chiều cao (height) phải là một số thực' })
  height!: number;

  @IsBoolean({ message: 'Trường hàng dễ vỡ (isFragile) phải là Boolean' })
  @IsOptional()
  isFragile?: boolean;

  @IsString({ message: 'Yêu cầu nhiệt độ phải là một chuỗi ký tự' })
  @IsOptional()
  temperatureRequirement?: string;

  @IsString({ message: 'Mô tả hàng hóa phải là một chuỗi ký tự' })
  @IsOptional()
  description?: string;

  @IsNumber({}, { message: 'Giá trị khai giá phải là một số thực' })
  @IsOptional()
  declaredValue?: number;

  @IsUUID('4', { message: 'ID loại xe yêu cầu phải là UUID hợp lệ' })
  @IsOptional()
  requiredVehicleTypeId?: string;
}

export class CreateOrderDto {
  @IsUUID('4', { message: 'ID khách hàng phải là UUID hợp lệ' })
  @IsOptional()
  customerId?: string;

  @IsString({ message: 'Mã dịch vụ không được để trống' })
  @IsNotEmpty({ message: 'Mã dịch vụ không được để trống' })
  serviceCode!: string;

  // Địa chỉ lấy hàng (có thể chọn từ Address Book hoặc tạo mới)
  @IsUUID('4', { message: 'ID địa chỉ lấy hàng phải là UUID hợp lệ' })
  @IsOptional()
  pickupAddressId?: string;

  @ValidateNested({ message: 'Thông tin địa chỉ lấy hàng không hợp lệ' })
  @Type(() => OrderAddressDto)
  @IsOptional()
  pickupAddress?: OrderAddressDto;

  // Địa chỉ giao hàng (có thể chọn từ Address Book hoặc tạo mới)
  @IsUUID('4', { message: 'ID địa chỉ giao hàng phải là UUID hợp lệ' })
  @IsOptional()
  deliveryAddressId?: string;

  @ValidateNested({ message: 'Thông tin địa chỉ giao hàng không hợp lệ' })
  @Type(() => OrderAddressDto)
  @IsOptional()
  deliveryAddress?: OrderAddressDto;

  // Thông tin liên hệ
  @ValidateNested({ message: 'Thông tin người gửi không hợp lệ' })
  @Type(() => OrderContactDto)
  @IsOptional()
  senderContact?: OrderContactDto;

  @ValidateNested({ message: 'Thông tin người nhận không hợp lệ' })
  @Type(() => OrderContactDto)
  @IsOptional()
  receiverContact?: OrderContactDto;

  // Thông tin thanh toán và phụ phí
  @IsNumber({}, { message: 'Số tiền COD phải là một số thực' })
  @IsOptional()
  codAmount?: number;

  @IsEnum(FeePayer, { message: 'Người chịu phí không hợp lệ (SENDER hoặc RECEIVER)' })
  feePayer!: FeePayer;

  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  paymentMethod!: PaymentMethod;

  @IsEnum(PickupType, { message: 'Hình thức gửi hàng không hợp lệ (PICKUP hoặc DROP_OFF)' })
  @IsOptional()
  pickupType?: PickupType;

  @IsString({ message: 'Lịch hẹn lấy hàng phải là một chuỗi ký tự ISO Date' })
  @IsOptional()
  scheduledPickupAt?: string;

  // Danh sách gói hàng/kiện hàng
  @IsArray({ message: 'Danh sách gói hàng phải là một mảng' })
  @ValidateNested({ each: true, message: 'Kiện hàng không hợp lệ' })
  @Type(() => CreateOrderPackageDto)
  packages!: CreateOrderPackageDto[];
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status!: OrderStatus;

  @IsString({ message: 'Lý do thay đổi trạng thái phải là một chuỗi ký tự' })
  @IsOptional()
  reason?: string;
}
