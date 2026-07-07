import { prisma } from '../config/prisma';

interface AddressInput {
  addressLine1: string;
  addressLine2?: string;
  ward: string;
  district: string;
  province: string;
  country?: string;
  wardCode?: string;
}

export async function resolveAddressDetails(dto: AddressInput) {
  let resolvedWard = dto.ward;
  let resolvedDistrict = dto.district;
  let resolvedProvince = dto.province;
  let wardCodeVal: string | null = dto.wardCode || null;

  if (dto.wardCode) {
    const wardData = await prisma.ward.findUnique({
      where: { code: dto.wardCode },
      include: { province: true },
    });
    if (wardData) {
      resolvedWard = wardData.fullName || wardData.name;
      // For simplified schema without district, we set district as the short name of the ward/commune
      resolvedDistrict = wardData.name;
      resolvedProvince = wardData.province ? (wardData.province.fullName || wardData.province.name) : dto.province;
      wardCodeVal = wardData.code;
    }
  }

  return {
    ward: resolvedWard,
    district: resolvedDistrict,
    province: resolvedProvince,
    wardCode: wardCodeVal,
  };
}
