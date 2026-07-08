import { prisma } from '../config/prisma';

interface AddressInput {
  addressLine1: string;
  addressLine2?: string;
  ward: string;
  province: string;
  country?: string;
  wardCode?: string;
}

export async function resolveAddressDetails(dto: AddressInput) {
  let resolvedWard = dto.ward;
  let resolvedProvince = dto.province;
  let wardCodeVal: string | null = dto.wardCode || null;

  if (dto.wardCode) {
    const wardData = await prisma.ward.findUnique({
      where: { code: dto.wardCode },
      include: { province: true },
    });
    if (wardData) {
      resolvedWard = wardData.fullName || wardData.name;
      resolvedProvince = wardData.province ? (wardData.province.fullName || wardData.province.name) : dto.province;
      wardCodeVal = wardData.code;
    }
  }

  return {
    ward: resolvedWard,
    province: resolvedProvince,
    wardCode: wardCodeVal,
  };
}
