import { prisma } from '../config/prisma';
import { CreateCustomerDto, UpdateCustomerDto, CreateAddressDto, UpdateAddressDto } from '../dtos/customer.dto';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { resolveAddressDetails } from '../utils/address-resolver';

export class CustomerService {
  /**
   * Create a new customer profile
   */
  public async createCustomer(dto: CreateCustomerDto) {
    // Check if userId is already associated with another customer
    if (dto.userId) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { userId: dto.userId },
      });
      if (existingCustomer) {
        throw new BadRequestException('Tài khoản này đã được liên kết với một hồ sơ khách hàng khác');
      }
    }

    // Generate unique customer code
    const count = await prisma.customer.count();
    const customerCode = `CUST-${String(count + 1).padStart(6, '0')}`;

    return await prisma.customer.create({
      data: {
        userId: dto.userId || null,
        customerCode,
        customerType: dto.customerType,
        companyName: dto.companyName || null,
        taxCode: dto.taxCode || null,
        note: dto.note || null,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Get list of customers with pagination and search
   */
  public async getCustomers(query: { page?: string; limit?: string; search?: string }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { customerCode: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { taxCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, customers] = await prisma.$transaction([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    return {
      customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get customer details by ID
   */
  public async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        addresses: {
          include: {
            address: true,
          },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng');
    }

    return customer;
  }

  /**
   * Update customer profile
   */
  public async updateCustomer(id: string, dto: UpdateCustomerDto) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng để cập nhật');
    }

    return await prisma.customer.update({
      where: { id },
      data: {
        customerType: dto.customerType ?? customer.customerType,
        companyName: dto.companyName !== undefined ? dto.companyName : customer.companyName,
        taxCode: dto.taxCode !== undefined ? dto.taxCode : customer.taxCode,
        status: dto.status ?? customer.status,
        note: dto.note !== undefined ? dto.note : customer.note,
      },
    });
  }

  /**
   * Soft delete customer (checking active orders)
   */
  public async deleteCustomer(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng để xóa');
    }

    // Check if customer has any active orders (non-completed orders)
    // Active orders are defined as orders still in the processing cycle
    const activeOrder = await prisma.order.findFirst({
      where: {
        customerId: id,
        deletedAt: null,
      },
    });

    if (activeOrder) {
      throw new BadRequestException('Không thể xóa khách hàng đang có đơn hàng trong hệ thống');
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  /**
   * Add address to customer address book
   */
  public async addAddress(customerId: string, dto: CreateAddressDto) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng');
    }

    const resolved = await resolveAddressDetails(dto);
    const formattedAddress = `${dto.addressLine1}, ${resolved.ward}, ${resolved.district}, ${resolved.province}, ${dto.country || 'Vietnam'}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Create Address record
      const address = await tx.address.create({
        data: {
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2 || null,
          ward: resolved.ward,
          district: resolved.district,
          province: resolved.province,
          country: dto.country || 'Vietnam',
          postalCode: dto.postalCode || null,
          latitude: dto.latitude,
          longitude: dto.longitude,
          formattedAddress,
          wardCode: resolved.wardCode,
        },
      });

      // 2. If this is default address, set others to not default
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      // 3. Create link record
      const customerAddress = await tx.customerAddress.create({
        data: {
          customerId,
          addressId: address.id,
          addressType: dto.addressType,
          isDefault: dto.isDefault || false,
        },
        include: {
          address: true,
        },
      });

      return customerAddress;
    });
  }

  /**
   * Get address book of a customer
   */
  public async getAddresses(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng');
    }

    return await prisma.customerAddress.findMany({
      where: { customerId },
      include: {
        address: true,
      },
      orderBy: { isDefault: 'desc' },
    });
  }

  /**
   * Update address book entry
   */
  public async updateAddress(customerId: string, addressId: string, dto: UpdateAddressDto) {
    const customerAddress = await prisma.customerAddress.findUnique({
      where: {
        customerId_addressId: {
          customerId,
          addressId,
        },
      },
      include: {
        address: true,
      },
    });

    if (!customerAddress) {
      throw new NotFoundException('Không tìm thấy địa chỉ trong sổ địa chỉ của khách hàng');
    }

    return await prisma.$transaction(async (tx) => {
      const updatedAddressLine1 = dto.addressLine1 ?? customerAddress.address.addressLine1;
      const updatedCountry = dto.country ?? customerAddress.address.country;

      // Resolve address details if wardCode is provided, or fallback to input/existing values
      const resolved = await resolveAddressDetails({
        addressLine1: updatedAddressLine1,
        ward: dto.ward ?? customerAddress.address.ward,
        district: dto.district ?? customerAddress.address.district,
        province: dto.province ?? customerAddress.address.province,
        wardCode: dto.wardCode ?? (customerAddress.address.wardCode || undefined),
      });

      const formattedAddress = `${updatedAddressLine1}, ${resolved.ward}, ${resolved.district}, ${resolved.province}, ${updatedCountry}`;

      await tx.address.update({
        where: { id: addressId },
        data: {
          addressLine1: updatedAddressLine1,
          addressLine2: dto.addressLine2 !== undefined ? dto.addressLine2 : customerAddress.address.addressLine2,
          ward: resolved.ward,
          district: resolved.district,
          province: resolved.province,
          country: updatedCountry,
          postalCode: dto.postalCode !== undefined ? dto.postalCode : customerAddress.address.postalCode,
          latitude: dto.latitude ?? customerAddress.address.latitude,
          longitude: dto.longitude ?? customerAddress.address.longitude,
          formattedAddress,
          wardCode: resolved.wardCode,
        },
      });

      // 2. If isDefault is changing to true, update all other customer addresses to false
      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      // 3. Update customer link
      const updatedCustomerAddress = await tx.customerAddress.update({
        where: {
          customerId_addressId: {
            customerId,
            addressId,
          },
        },
        data: {
          addressType: dto.addressType ?? customerAddress.addressType,
          isDefault: dto.isDefault !== undefined ? dto.isDefault : customerAddress.isDefault,
        },
        include: {
          address: true,
        },
      });

      return updatedCustomerAddress;
    });
  }

  /**
   * Delete address book entry
   */
  public async deleteAddress(customerId: string, addressId: string) {
    const customerAddress = await prisma.customerAddress.findUnique({
      where: {
        customerId_addressId: {
          customerId,
          addressId,
        },
      },
    });

    if (!customerAddress) {
      throw new NotFoundException('Không tìm thấy địa chỉ trong sổ địa chỉ của khách hàng');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete link
      await tx.customerAddress.delete({
        where: {
          customerId_addressId: {
            customerId,
            addressId,
          },
        },
      });

      // 2. Delete actual address
      await tx.address.delete({
        where: { id: addressId },
      });
    });

    return { success: true };
  }
}
