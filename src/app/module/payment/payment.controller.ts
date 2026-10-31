import { envVars } from "@/app/config/env";
import { stripe } from "@/app/config/stripe.config";
import AppError from "@/app/errorHelpers/AppError";
import { catchAsync } from "@/app/shared/catchAsync";
import { sendResponse } from "@/app/shared/sendResponse";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import type Stripe from "stripe";
import { PaymentService } from "./payment.service";

const handleStripeWebhookEvent = catchAsync(async (req: Request, res: Response) => {
	const signature = req.headers["stripe-signature"];

	if (typeof signature !== "string") {
		throw new AppError(httpStatus.BAD_REQUEST, "Missing Stripe signature");
	}

	let event: Stripe.Event;

	try {
		// req.body এখানে Buffer (express.raw), না হলে verify fail করবে
		event = stripe.webhooks.constructEvent(req.body, signature, envVars.STRIPE.STRIPE_WEBHOOK_SECRET);
	} catch (error) {
		console.error("Stripe webhook signature verification failed:", error);
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid Stripe webhook signature");
	}

	// এখানে error হলে globalErrorHandler 500 দেবে, আর Stripe নিজে retry করবে
	const result = await PaymentService.handleStripeWebhookEvent(event);

	sendResponse(res, {
		httpStatusCode: httpStatus.OK,
		success: true,
		message: "Stripe webhook event processed successfully",
		data: result,
	});
});

export const PaymentController = {
	handleStripeWebhookEvent,
};
