import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { CreateCustomerDto, UpdateCustomerDto, CreateAddressDto, UpdateAddressDto } from '../dtos/customer.dto';
import { BadRequestException, NotFoundException } from '../middlewares/error.middleware';
import { resolveAddressDetails } from '../utils/address-resolver';
import { rabbitMQService } from './rabbitmq.service';

export class CustomerService {
  /**
   * Create a new customer profile
   */
  public async createCustomer(dto: CreateCustomerDto) {
    // Check if email already exists in customers
    if (dto.email) {
      const emailExists = await prisma.customer.findFirst({
        where: {
          email: dto.email,
          status: { not: 'DISABLED' },
        },
      });
      if (emailExists) {
        throw new BadRequestException('Địa chỉ email tài khoản đã được đăng ký');
      }
    }

    // Check if phone already exists in customers (if provided)
    if (dto.phone) {
      const phoneExists = await prisma.customer.findFirst({
        where: {
          phone: dto.phone,
          status: { not: 'DISABLED' },
        },
      });
      if (phoneExists) {
        throw new BadRequestException('Số điện thoại đã được đăng ký');
      }
    }

    // Generate unique customer code
    const count = await prisma.customer.count();
    const customerCode = `CUST-${String(count + 1).padStart(6, '0')}`;

    // Generate or check unique username
    let username = dto.username?.trim();
    if (username) {
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        throw new BadRequestException('Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.');
      }
    } else {
      let slug = dto.fullName.toLowerCase();
      slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      slug = slug.replace(/[đĐ]/g, "d");
      slug = slug.replace(/\s+/g, "");
      slug = slug.replace(/[^a-z0-9_]/g, "");
      const usernamePrefix = slug.substring(0, 20) || 'cust';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      username = `${usernamePrefix}_${randomSuffix}`;
    }

    const role = await prisma.role.findUnique({
      where: { roleCode: 'CUSTOMER' },
    });
    if (!role) {
      throw new BadRequestException("Vai trò 'CUSTOMER' không tồn tại trên hệ thống");
    }

    // Generate a secure random password: Cust@ + 6 random digits
    const rawPassword = `Cust@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Create User and Customer in a transaction
    const customer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          status: 'ACTIVE',
          roleId: role.id,
        },
      });

      return await tx.customer.create({
        data: {
          userId: user.id,
          customerCode,
          fullName: dto.fullName,
          phone: dto.phone || null,
          email: dto.email || null,
          customerType: dto.customerType,
          companyName: dto.companyName || null,
          taxCode: dto.taxCode || null,
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: {
              username: true,
              status: true,
            },
          },
        },
      });
    });

    // Publish notification message to RabbitMQ mail_queue
    await rabbitMQService.publishToQueue('mail_queue', {
      type: 'CUSTOMER_CREATED',
      email: dto.email,
      username,
      fullName: dto.fullName,
      phone: dto.phone || undefined,
      password: rawPassword,
      customerCode,
    });

    return customer;
  }

  /**
   * Get list of customers with pagination and search
   */
  public async getCustomers(query: { page?: string; limit?: string; search?: string; customerType?: string; status?: string }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = { status: { not: 'DISABLED' } };

    if (query.search) {
      where.OR = [
        { customerCode: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { taxCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.customerType) {
      where.customerType = query.customerType;
    }

    if (query.status) {
      where.status = query.status;
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
              status: true,
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
            status: true,
          },
        },
        addresses: {
          include: {
            address: true,
          },
        },
      },
    });

    if (!customer || customer.status === 'DISABLED') {
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

    if (!customer || customer.status === 'DISABLED') {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng để cập nhật');
    }

    return await prisma.customer.update({
      where: { id },
      data: {
        customerType: dto.customerType ?? customer.customerType,
        companyName: dto.companyName !== undefined ? dto.companyName : customer.companyName,
        taxCode: dto.taxCode !== undefined ? dto.taxCode : customer.taxCode,
        status: dto.status ?? customer.status,
      },
    });
  }

  /**
   * Soft hide customer (checking active orders)
   */
  public async deleteCustomer(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!customer || customer.status === 'DISABLED') {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng để xóa');
    }

    const activeOrder = await prisma.order.findFirst({
      where: {
        customerId: id,
      },
    });

    if (activeOrder) {
      throw new BadRequestException('Không thể xóa khách hàng đang có đơn hàng trong hệ thống');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Soft delete customer status
      await tx.customer.update({
        where: { id },
        data: { status: 'DISABLED' },
      });

      // 2. Disable associated User
      if (customer.userId) {
        await tx.user.update({
          where: { id: customer.userId },
          data: {
            status: 'DISABLED',
          },
        });
      }
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

    if (!customer) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng');
    }

    const resolved = await resolveAddressDetails(dto);
    const formattedAddress = `${dto.addressLine1}, ${resolved.ward}, ${resolved.province}, ${dto.country || 'Vietnam'}`;

    return await prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          addressLine1: dto.addressLine1,
          ward: resolved.ward,
          province: resolved.province,
          country: dto.country || 'Vietnam',
          latitude: dto.latitude,
          longitude: dto.longitude,
          formattedAddress,
          wardCode: resolved.wardCode,
        },
      });

      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      return await tx.customerAddress.create({
        data: {
          customerId,
          addressId: address.id,
          addressType: dto.addressType,
          isDefault: dto.isDefault || false,
          contactName: dto.contactName || null,
          contactPhone: dto.contactPhone || null,
        },
        include: {
          address: true,
        },
      });
    });
  }

  /**
   * Get all addresses for a customer
   */
  public async getAddresses(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        addresses: {
          include: {
            address: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng');
    }

    return customer.addresses;
  }

  /**
   * Update customer address
   */
  public async updateAddress(customerId: string, addressId: string, dto: UpdateAddressDto) {
    const customerAddress = await prisma.customerAddress.findUnique({
      where: {
        customerId_addressId: {
          customerId,
          addressId,
        },
      },
    });

    if (!customerAddress) {
      throw new NotFoundException('Không tìm thấy địa chỉ của khách hàng');
    }

    const resolved = await resolveAddressDetails({
      addressLine1: dto.addressLine1 || '',
      ward: dto.ward || '',
      province: dto.province || '',
      country: dto.country,
    });
    const formattedAddress = `${dto.addressLine1 || ''}, ${resolved.ward}, ${resolved.province}, ${dto.country || 'Vietnam'}`;

    return await prisma.$transaction(async (tx) => {
      const address = await tx.address.update({
        where: { id: addressId },
        data: {
          addressLine1: dto.addressLine1 !== undefined ? dto.addressLine1 : undefined,
          ward: resolved.ward,
          province: resolved.province,
          country: dto.country !== undefined ? dto.country : undefined,
          latitude: dto.latitude !== undefined ? dto.latitude : undefined,
          longitude: dto.longitude !== undefined ? dto.longitude : undefined,
          formattedAddress,
          wardCode: resolved.wardCode,
        },
      });

      if (dto.isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      }

      const updatedCustomerAddress = await tx.customerAddress.update({
        where: {
          customerId_addressId: {
            customerId,
            addressId,
          },
        },
        data: {
          addressType: dto.addressType !== undefined ? dto.addressType : undefined,
          isDefault: dto.isDefault !== undefined ? dto.isDefault : undefined,
          contactName: dto.contactName !== undefined ? dto.contactName : undefined,
          contactPhone: dto.contactPhone !== undefined ? dto.contactPhone : undefined,
        },
        include: {
          address: true,
        },
      });

      return updatedCustomerAddress;
    });
  }

  /**
   * Delete customer address
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
      throw new NotFoundException('Không tìm thấy địa chỉ của khách hàng');
    }

    await prisma.customerAddress.delete({
      where: {
        customerId_addressId: {
          customerId,
          addressId,
        },
      },
    });

    return { success: true };
  }
}
