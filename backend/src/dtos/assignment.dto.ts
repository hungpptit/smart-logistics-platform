import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignVehicleDto {
  @IsUUID('4', { message: 'ID tài xế phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'ID tài xế không được để trống' })
  driverId!: string;

  @IsUUID('4', { message: 'ID phương tiện phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'ID phương tiện không được để trống' })
  vehicleId!: string;
}

export class TerminateAssignmentDto {
  @IsUUID('4', { message: 'ID tài xế phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'ID tài xế không được để trống' })
  driverId!: string;
}
