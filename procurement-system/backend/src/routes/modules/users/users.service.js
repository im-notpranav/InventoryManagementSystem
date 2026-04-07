import prisma from '../../../config/db.js';

const usersService = {
  async getAll() {
    return prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(id) {
    return prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: { role: true },
    });
  },

  async update(id, data) {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.department) updateData.department = data.department;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.role) {
      const role = await prisma.role.findUnique({ where: { name: data.role } });
      if (role) updateData.roleId = role.id;
    }
    return prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { role: true },
    });
  },

  async remove(id) {
    return prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });
  },
};

export default usersService;
