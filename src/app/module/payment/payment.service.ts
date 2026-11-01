import { deleteFileFromCloudinary, uploadFileToCloudinary } from "@/app/config/cloudinary.config";
import { stripe } from "@/app/config/stripe.config";
import { prisma } from "@/app/lib/prisma";
import { sendEmail } from "@/app/utils/email";
import { formatDateTime } from "@/app/utils/pdf";
import { AppointmentStatus, PaymentStatus } from "@/generated/prisma/enums";
import type { Stripe } from "stripe";
import { formatAmount, generateInvoicePdf, type IInvoicePdfData } from "./payment.utils";

const getPaymentIntentId = (session: Stripe.Checkout.Session) => {
	if (!session.payment_intent) return null;
	return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
};

// টাকা কেটে গেছে কিন্তু appointment আর valid না → Stripe-কে refund করতে বলো।
// idempotencyKey দেওয়ায় Stripe retry করলেও দুইবার refund হবে না।
const refundCheckoutSession = async (session: Stripe.Checkout.Session, eventId: string) => {
	const paymentIntentId = getPaymentIntentId(session);

	if (session.payment_status !== "paid" || !paymentIntentId) {
		return false;
	}

	await stripe.refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `refund-${eventId}` });

	return true;
};

// PDF → upload → invoiceUrl save → email
// payment ততক্ষণে PAID হয়ে গেছে, তাই এখানে কিছু fail করলেও payment-এর ক্ষতি নেই
const processInvoice = async (data: IInvoicePdfData) => {
	const pdfBuffer = await generateInvoicePdf(data);
	const fileName = `invoice-${data.invoiceId}.pdf`;
	const { secure_url: invoiceUrl } = await uploadFileToCloudinary(pdfBuffer, fileName);

	try {
		await prisma.payment.update({
			where: { id: data.invoiceId },
			data: { invoiceUrl },
		});
	} catch (error) {
		// DB-তে save না হলে file রেখে লাভ নেই
		await deleteFileFromCloudinary(invoiceUrl).catch((deleteError: unknown) => {
			console.error("Failed to delete orphan invoice:", deleteError);
		});
		throw error;
	}

	await sendEmail({
		to: data.patientEmail,
		subject: `Payment Confirmation & Invoice - Appointment with Dr. ${data.doctorName}`,
		templateName: "invoice",
		templateData: {
			patientName: data.patientName,
			doctorName: data.doctorName,
			invoiceId: data.invoiceId,
			transactionId: data.transactionId,
			paymentDate: formatDateTime(data.paymentDate),
			appointmentDate: formatDateTime(data.appointmentDate),
			amount: formatAmount(data.amount, data.currency),
			invoiceUrl,
		},
		attachments: [{ filename: fileName, content: pdfBuffer, contentType: "application/pdf" }],
	});
};

const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session, eventId: string) => {
	const appointmentId = session.metadata?.appointmentId;
	const paymentId = session.metadata?.paymentId;

	if (!appointmentId || !paymentId) {
		console.error(`Missing appointmentId or paymentId in metadata of session ${session.id}`);
		return { message: "Missing appointmentId or paymentId in session metadata" };
	}

	const appointment = await prisma.appointment.findUnique({
		where: { id: appointmentId },
		include: {
			payment: true,
			patient: { select: { name: true, email: true } },
			doctor: { select: { name: true } },
			schedule: { select: { startDateTime: true } },
		},
	});

	if (!appointment) {
		console.error(`Appointment ${appointmentId} not found for session ${session.id}`);
		return { message: `Appointment ${appointmentId} not found` };
	}

	// আলাদা const-এ রাখলাম, যাতে নিচের check-এর পরে TypeScript বোঝে payment আর null না
	const payment = appointment.payment;

	// Cancel হয়ে গেছে (cron payment delete করে দিয়েছে), অথবা আগেই paid (দুই tab-এ দুইবার pay)
	const isInvalidPayment =
		appointment.status === AppointmentStatus.CANCELED ||
		!payment ||
		payment.id !== paymentId ||
		payment.status === PaymentStatus.PAID;

	if (isInvalidPayment) {
		const refunded = await refundCheckoutSession(session, eventId);
		console.warn(`Invalid payment for appointment ${appointmentId}. Refunded: ${refunded}`);
		return { message: `Appointment is not payable. Refunded: ${refunded}` };
	}

	const paymentStatus = session.payment_status === "paid" ? PaymentStatus.PAID : PaymentStatus.UNPAID;

	await prisma.$transaction([
		// ✅ appointment-এর paymentStatus update, যাতে cron আর এটা cancel না করে
		prisma.appointment.update({
			where: { id: appointmentId },
			data: { paymentStatus },
		}),
		prisma.payment.update({
			where: { id: paymentId },
			data: {
				status: paymentStatus,
				stripeEventId: eventId,
				paymentGatewayData: {
					sessionId: session.id,
					paymentIntentId: getPaymentIntentId(session),
					amountTotal: session.amount_total,
					currency: session.currency,
					paymentStatus: session.payment_status,
					customerEmail: session.customer_details?.email ?? null,
				},
			},
		}),
	]);

	// টাকা সত্যিই কাটা গেলে invoice। await করছি না, যাতে Stripe সাথে সাথে 200 পায়।
	// stripeEventId আগেই save হয়েছে → Stripe retry করলেও invoice দুইবার হবে না।
	if (paymentStatus === PaymentStatus.PAID) {
		processInvoice({
			invoiceId: payment.id,
			transactionId: payment.transactionId,
			paymentDate: new Date(),
			patientName: appointment.patient.name,
			patientEmail: appointment.patient.email,
			doctorName: appointment.doctor.name,
			appointmentDate: appointment.schedule.startDateTime,
			amount: payment.amount,
			currency: session.currency ?? "bdt",
		}).catch((error: unknown) => {
			console.error(`Failed to process invoice for payment ${payment.id}:`, error);
		});
	}

	return { message: `Payment ${paymentStatus} for appointment ${appointmentId}` };
};

const handleStripeWebhookEvent = async (event: Stripe.Event) => {
	// Idempotency: Stripe একই event আবার পাঠালে skip
	const alreadyProcessed = await prisma.payment.findUnique({
		where: { stripeEventId: event.id },
		select: { id: true },
	});

	if (alreadyProcessed) {
		return { message: `Event ${event.id} already processed. Skipping` };
	}

	switch (event.type) {
		case "checkout.session.completed":
			// event.type দেখে TypeScript নিজেই বোঝে এখানে object হলো Checkout.Session
			return handleCheckoutSessionCompleted(event.data.object, event.id);

		case "checkout.session.expired":
			// কিছু করার দরকার নেই: appointment UNPAID থাকবে, cron পরে cancel করবে
			return { message: `Checkout session ${event.data.object.id} expired` };

		case "payment_intent.payment_failed":
			return { message: `Payment intent ${event.data.object.id} failed` };

		default:
			return { message: `Unhandled event type ${event.type}` };
	}
};

export const PaymentService = {
	handleStripeWebhookEvent,
};
