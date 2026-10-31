import { stripe } from "@/app/config/stripe.config";
import { prisma } from "@/app/lib/prisma";
import { AppointmentStatus, PaymentStatus } from "@/generated/prisma/enums";
import type { Stripe } from "stripe";

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

const handleCheckoutSessionCompleted = async (session: Stripe.Checkout.Session, eventId: string) => {
	const appointmentId = session.metadata?.appointmentId;
	const paymentId = session.metadata?.paymentId;

	if (!appointmentId || !paymentId) {
		console.error(`Missing appointmentId or paymentId in metadata of session ${session.id}`);
		return { message: "Missing appointmentId or paymentId in session metadata" };
	}

	const appointment = await prisma.appointment.findUnique({
		where: { id: appointmentId },
		include: { payment: true },
	});

	if (!appointment) {
		console.error(`Appointment ${appointmentId} not found for session ${session.id}`);
		return { message: `Appointment ${appointmentId} not found` };
	}

	// Cancel হয়ে গেছে (cron payment delete করে দিয়েছে), অথবা আগেই paid (দুই tab-এ দুইবার pay)
	const isInvalidPayment =
		appointment.status === AppointmentStatus.CANCELED ||
		!appointment.payment ||
		appointment.payment.id !== paymentId ||
		appointment.payment.status === PaymentStatus.PAID;

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
