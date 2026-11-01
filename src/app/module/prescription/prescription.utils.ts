import { envVars } from "@/app/config/env";
import { createPdfBuffer, formatDate, formatDateTime, PDF_COLORS } from "@/app/utils/pdf";

export interface IPrescriptionPdfData {
	prescriptionId: string;
	doctorName: string;
	doctorEmail: string;
	specialization: string;
	patientName: string;
	patientEmail: string;
	appointmentDate: Date;
	issuedDate: Date;
	followUpDate: Date | null;
	instructions: string;
}

export const generatePrescriptionPdf = (data: IPrescriptionPdfData): Promise<Buffer> =>
	createPdfBuffer(`Prescription - ${data.patientName}`, (pdf) => {
		const { doc, left, contentWidth } = pdf;

		pdf.header("PRESCRIPTION");

		pdf.sectionTitle("Doctor Information");
		pdf.infoRow("Name", `Dr. ${data.doctorName}`);
		pdf.infoRow("Specialization", data.specialization);
		pdf.infoRow("Email", data.doctorEmail);
		doc.moveDown(0.8);

		pdf.sectionTitle("Patient Information");
		pdf.infoRow("Name", data.patientName);
		pdf.infoRow("Email", data.patientEmail);
		doc.moveDown(0.8);

		pdf.sectionTitle("Prescription Details");
		pdf.infoRow("Prescription ID", data.prescriptionId);
		pdf.infoRow("Appointment Date", formatDateTime(data.appointmentDate));
		pdf.infoRow("Issued Date", formatDate(data.issuedDate));
		if (data.followUpDate) {
			pdf.infoRow("Follow-up Date", formatDate(data.followUpDate));
		}
		pdf.divider();

		pdf.sectionTitle("Instructions & Medications");
		doc
			.font("Helvetica")
			.fontSize(11)
			.fillColor(PDF_COLORS.text)
			.text(data.instructions, left, doc.y, { width: contentWidth, lineGap: 4 });
		pdf.divider();

		pdf.footer([
			"This is an electronically generated prescription and does not require a signature.",
			`For more information, visit: ${envVars.FRONTEND_URL}`,
		]);
	});
