import { envVars } from "@/app/config/env";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/generated/prisma/enums";

const SUPER_ADMIN_NAME = "Super Admin";
// Admin model-এ contactNumber required; পরে super admin নিজে profile update করে নেবে
const SUPER_ADMIN_CONTACT_PLACEHOLDER = "N/A";

export const seedSuperAdmin = async () => {
	const { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = envVars;

	const superAdminExists = await prisma.user.findFirst({
		where: { role: Role.SUPER_ADMIN },
		select: { id: true },
	});

	if (superAdminExists) {
		return;
	}

	// এই email দিয়ে অন্য কেউ আগে থেকে account খুলে থাকলে তাকে ছোঁয়া যাবে না
	const emailTaken = await prisma.user.findUnique({
		where: { email: SUPER_ADMIN_EMAIL },
		select: { role: true },
	});

	if (emailTaken) {
		throw new Error(`Cannot seed super admin: ${SUPER_ADMIN_EMAIL} is already used by a ${emailTaken.role} account`);
	}

	// Password hash + account তৈরি Better Auth করবে
	const { user } = await auth.api.signUpEmail({
		body: {
			name: SUPER_ADMIN_NAME,
			email: SUPER_ADMIN_EMAIL,
			password: SUPER_ADMIN_PASSWORD,
		},
	});

	try {
		await prisma.$transaction([
			// role এখানে set করা হচ্ছে, যাতে auth.ts-এ role: { input: false } দিলেও seed কাজ করে
			prisma.user.update({
				where: { id: user.id },
				data: {
					role: Role.SUPER_ADMIN,
					emailVerified: true,
					needPasswordChange: false,
				},
			}),
			prisma.admin.create({
				data: {
					userId: user.id,
					name: SUPER_ADMIN_NAME,
					email: SUPER_ADMIN_EMAIL,
					contactNumber: SUPER_ADMIN_CONTACT_PLACEHOLDER,
				},
			}),
			// signUp কোনো session বানিয়ে থাকলে মুছে ফেলা (createAdmin-এর মতো)
			prisma.session.deleteMany({
				where: { userId: user.id },
			}),
		]);
	} catch (error) {
		// শুধু এইমাত্র বানানো user-টাই মোছা হচ্ছে, id দিয়ে
		await prisma.user.delete({ where: { id: user.id } });
		throw error;
	}

	console.warn(`Super admin created: ${SUPER_ADMIN_EMAIL}`);
};
