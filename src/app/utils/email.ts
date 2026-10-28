import { envVars } from "@/app/config/env";
import AppError from "@/app/errorHelpers/AppError";
import ejs from "ejs";
import httpStatus from "http-status";
import path from "node:path";
import { createTransport, type Attachment } from "nodemailer";

const smtpPort = Number(envVars.EMAIL_SENDER.SMTP_PORT);

const transporter = createTransport({
	host: envVars.EMAIL_SENDER.SMTP_HOST,
	port: smtpPort,
	secure: smtpPort === 465, // 465 → SSL, 587 → STARTTLS
	auth: {
		user: envVars.EMAIL_SENDER.SMTP_USER,
		pass: envVars.EMAIL_SENDER.SMTP_PASS,
	},
});

// dev-এ src থেকে, production build-এ dist থেকে template পড়বে
const templateDir =
	envVars.NODE_ENV === "production"
		? path.join(process.cwd(), "dist/templates")
		: path.join(process.cwd(), "src/app/templates");

// নতুন .ejs template বানালে তার নাম এখানে যোগ করবে
type EmailTemplate = "otp";

interface SendEmailOptions {
	to: string;
	subject: string;
	templateName: EmailTemplate;
	templateData: Record<string, unknown>;
	attachments?: Attachment[];
}

export const sendEmail = async ({
	to,
	subject,
	templateName,
	templateData,
	attachments,
}: SendEmailOptions): Promise<void> => {
	try {
		const templatePath = path.join(templateDir, `${templateName}.ejs`);
		const html = await ejs.renderFile(templatePath, templateData);

		await transporter.sendMail({
			from: envVars.EMAIL_SENDER.SMTP_FROM,
			to,
			subject,
			html,
			attachments,
		});
	} catch (error) {
		console.error("Email sending error:", error);
		throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to send email");
	}
};
