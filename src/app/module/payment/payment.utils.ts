import { envVars } from "@/app/config/env";
import { createPdfBuffer, formatDateTime, PDF_COLORS } from "@/app/utils/pdf";

export interface IInvoicePdfData {
	invoiceId: string;
	transactionId: string;
	paymentDate: Date;
	patientName: string;
	patientEmail: string;
	doctorName: string;
	appointmentDate: Date;
	amount: number;
	currency: string;
}

// 1500, "bdt" → "1500.00 BDT"
export const formatAmount = (amount: number, currency: string): string =>
	`${amount.toFixed(2)} ${currency.toUpperCase()}`;

export const generateInvoicePdf = (data: IInvoicePdfData): Promise<Buffer> =>
	createPdfBuffer(`Invoice - ${data.invoiceId}`, (pdf) => {
		const { doc, left, right } = pdf;
		const amountText = formatAmount(data.amount, data.currency);

		pdf.header("INVOICE");

		pdf.sectionTitle("Invoice Information");
		pdf.infoRow("Invoice ID", data.invoiceId);
		pdf.infoRow("Transaction ID", data.transactionId);
		pdf.infoRow("Payment Date", formatDateTime(data.paymentDate));
		pdf.infoRow("Status", "PAID");
		doc.moveDown(0.8);

		pdf.sectionTitle("Billed To");
		pdf.infoRow("Name", data.patientName);
		pdf.infoRow("Email", data.patientEmail);
		doc.moveDown(0.8);

		pdf.sectionTitle("Appointment Details");
		pdf.infoRow("Doctor", `Dr. ${data.doctorName}`);
		pdf.infoRow("Appointment Date", formatDateTime(data.appointmentDate));
		pdf.divider();

		// ---------- Payment Summary table ----------
		pdf.sectionTitle("Payment Summary");

		const amountColWidth = 150;
		const amountX = right - amountColWidth;

		const tableRow = (label: string, value: string, bold = false) => {
			const y = doc.y;
			doc
				.font(bold ? "Helvetica-Bold" : "Helvetica")
				.fontSize(bold ? 11 : 10)
				.fillColor(PDF_COLORS.text);
			doc.text(label, left, y);
			doc.text(value, amountX, y, { width: amountColWidth, align: "right" });
			doc.x = left; // ⚠️ না হলে পরের সব লেখা amountX থেকে শুরু হবে
			doc.moveDown(0.4);
		};

		const tableLine = () => {
			doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(0.5).strokeColor(PDF_COLORS.border).stroke();
			doc.moveDown(0.4);
		};

		tableRow("Description", "Amount", true);
		tableLine();
		tableRow(`Consultation Fee (Dr. ${data.doctorName})`, amountText);
		tableLine();
		tableRow("Total Paid", amountText, true);
		pdf.divider();

		pdf.footer([
			"Thank you for choosing PH Doc. This is an electronically generated invoice.",
			"Payment processed securely through Stripe.",
			`For more information, visit: ${envVars.FRONTEND_URL}`,
		]);
	});
