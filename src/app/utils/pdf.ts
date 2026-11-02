import PdfKitDocument from "pdfkit";

type PdfDocument = InstanceType<typeof PdfKitDocument>;

// server UTC-তে চললেও তারিখ বাংলাদেশের সময়ে দেখাবে
const TIME_ZONE = "Asia/Dhaka";

export const formatDate = (date: Date): string =>
	date.toLocaleDateString("en-GB", { timeZone: TIME_ZONE, day: "2-digit", month: "short", year: "numeric" });

export const formatDateTime = (date: Date): string =>
	date.toLocaleString("en-GB", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" });

export const PDF_COLORS = {
	primary: "#0b5ed7",
	text: "#222222",
	muted: "#666666",
	border: "#cccccc",
} as const;

export interface IPdfHelpers {
	doc: PdfDocument;
	left: number;
	right: number;
	contentWidth: number;
	header: (title: string) => void;
	divider: () => void;
	sectionTitle: (title: string) => void;
	infoRow: (label: string, value: string) => void;
	footer: (lines: string[]) => void;
}

// pdfkit stream-এ একটু একটু করে data দেয় → সব chunk জোড়া লাগিয়ে একটা Buffer।
// draw-এর ভেতরে শুধু "কী আঁকবো" লিখলেই হবে।
export const createPdfBuffer = (title: string, draw: (helpers: IPdfHelpers) => void): Promise<Buffer> => {
	return new Promise((resolve, reject) => {
		const doc = new PdfKitDocument({ size: "A4", margin: 50, info: { Title: title, Author: "PH Doc" } });

		const chunks: Buffer[] = [];
		doc.on("data", (chunk: Buffer) => {
			chunks.push(chunk);
		});
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		const left = doc.page.margins.left;
		const right = doc.page.width - doc.page.margins.right;
		const contentWidth = right - left;

		const divider = () => {
			doc.moveDown(0.5);
			doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(1).strokeColor(PDF_COLORS.border).stroke();
			doc.moveDown(0.8);
		};

		const header = (heading: string) => {
			doc
				.font("Helvetica-Bold")
				.fontSize(22)
				.fillColor(PDF_COLORS.primary)
				.text(heading, left, doc.y, { width: contentWidth, align: "center" });
			doc
				.font("Helvetica")
				.fontSize(10)
				.fillColor(PDF_COLORS.muted)
				.text("PH Doc - Your Health, Our Priority", left, doc.y, { width: contentWidth, align: "center" });
			divider();
		};

		const sectionTitle = (heading: string) => {
			doc.font("Helvetica-Bold").fontSize(12).fillColor(PDF_COLORS.primary).text(heading, left, doc.y);
			doc.moveDown(0.3);
		};

		// "Name: John" — label bold, value normal; প্রতিবার x = left থেকে শুরু
		const infoRow = (label: string, value: string) => {
			doc
				.font("Helvetica-Bold")
				.fontSize(10)
				.fillColor(PDF_COLORS.text)
				.text(`${label}: `, left, doc.y, { continued: true });
			doc.font("Helvetica").fillColor(PDF_COLORS.muted).text(value);
		};

		const footer = (lines: string[]) => {
			doc.font("Helvetica").fontSize(9).fillColor(PDF_COLORS.muted);
			for (const line of lines) {
				doc.text(line, left, doc.y, { width: contentWidth, align: "center" });
			}
		};

		draw({ doc, left, right, contentWidth, header, divider, sectionTitle, infoRow, footer });

		doc.end();
	});
};
