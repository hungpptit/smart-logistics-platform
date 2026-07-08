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
    // Check if email already exists
    const emailExists = await prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
      },
    });
    if (emailExists) {
      throw new BadRequestException('Địa chỉ email tài khoản đã được đăng ký');
    }

    // Check if phone already exists
    const phoneExists = await prisma.user.findFirst({
      where: {
        phone: dto.phone,
        deletedAt: null,
      },
    });
    if (phoneExists) {
      throw new BadRequestException('Số điện thoại đã được đăng ký');
    }

    // Generate unique customer code
    const count = await prisma.customer.count();
    const customerCode = `CUST-${String(count + 1).padStart(6, '0')}`;

    // Generate unique username from Full Name (lower case, remove accents/diacritics/spaces, append random number)
    let slug = dto.fullName.toLowerCase();
    slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    slug = slug.replace(/[đĐ]/g, "d");
    slug = slug.replace(/\s+/g, "");
    slug = slug.replace(/[^a-z0-9_]/g, "");
    const usernamePrefix = slug.substring(0, 20);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${usernamePrefix}_${randomSuffix}`;

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
          email: dto.email,
          passwordHash,
          phone: dto.phone,
          status: 'ACTIVE',
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      return await tx.customer.create({
        data: {
          userId: user.id,
          customerCode,
          customerType: dto.customerType,
          companyName: dto.companyName || null,
          taxCode: dto.taxCode || null,
          note: dto.note || null,
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: {
              username: true,
              email: true,
              phone: true,
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

    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { customerCode: { contains: query.search, mode: 'insensitive' } },
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
      include: { user: true },
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

    const timestamp = Date.now();

    await prisma.$transaction(async (tx) => {
      // 1. Soft delete the customer
      await tx.customer.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // 2. Soft delete the associated User and release username/email
      if (customer.userId && customer.user) {
        const deletedEmail = `del_${timestamp}_${customer.user.email.slice(0, 50)}@deleted.com`;
        const deletedUsername = `del_${timestamp.toString().slice(-6)}_${customer.user.username.slice(0, 30)}`;

        await tx.user.update({
          where: { id: customer.userId },
          data: {
            deletedAt: new Date(),
            status: 'LOCKED',
            email: deletedEmail.slice(0, 255),
            username: deletedUsername.slice(0, 50),
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

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng');
    }

    const resolved = await resolveAddressDetails(dto);
    const formattedAddress = `${dto.addressLine1}, ${resolved.ward}, ${resolved.province}, ${dto.country || 'Vietnam'}`;

    return await prisma.$transaction(async (tx) => {
      // 1. Create Address record
      const address = await tx.address.create({
        data: {
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2 || null,
          ward: resolved.ward,
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
        province: dto.province ?? customerAddress.address.province,
        wardCode: dto.wardCode ?? (customerAddress.address.wardCode || undefined),
      });

      const formattedAddress = `${updatedAddressLine1}, ${resolved.ward}, ${resolved.province}, ${updatedCountry}`;

      await tx.address.update({
        where: { id: addressId },
        data: {
          addressLine1: updatedAddressLine1,
          addressLine2: dto.addressLine2 !== undefined ? dto.addressLine2 : customerAddress.address.addressLine2,
          ward: resolved.ward,
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
