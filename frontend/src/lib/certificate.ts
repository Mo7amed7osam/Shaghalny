import jsPDF from 'jspdf';

const APP_BRAND_NAME = 'Shaghalny';
const BRAND_INDIGO: [number, number, number] = [79, 70, 229];
const BRAND_INDIGO_DARK: [number, number, number] = [49, 46, 129];
const GOLD_ACCENT: [number, number, number] = [180, 150, 60];
const INK_900: [number, number, number] = [15, 23, 42];
const INK_500: [number, number, number] = [100, 116, 139];

interface CertificateInput {
  studentName: string;
  internshipTitle: string;
  clientName: string;
  duration?: string;
  completedDate?: string;
}

function generateCertificateId(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `SGH-${hash.toString(36).toUpperCase().slice(0, 8)}`;
}

function spacedText(text: string, gap = ' ') {
  return text.split('').join(gap);
}

export function downloadInternshipCertificate({
  studentName,
  internshipTitle,
  clientName,
  duration,
  completedDate,
}: CertificateInput) {
  const doc = new jsPDF({ format: 'a4', orientation: 'landscape', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  const formattedDate =
    completedDate ||
    new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const certificateId = generateCertificateId(`${studentName}-${internshipTitle}-${clientName}`);

  // ===== Background watermark (subtle, lower half) =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(60);
  doc.setTextColor(248, 248, 252);
    doc.text('VERIFIED', centerX, pageHeight / 2 + 50, { align: 'center', angle: 18 });

  // ===== Outer border (brand indigo) =====
  doc.setDrawColor(...BRAND_INDIGO);
  doc.setLineWidth(1.4);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // ===== Inner border (gold accent) =====
  doc.setDrawColor(...GOLD_ACCENT);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // ===== Corner ornaments =====
  const cornerSize = 6;
  const corners: Array<[number, number, number, number]> = [
    [14, 14, 1, 1],
    [pageWidth - 14, 14, -1, 1],
    [14, pageHeight - 14, 1, -1],
    [pageWidth - 14, pageHeight - 14, -1, -1],
  ];
  doc.setDrawColor(...BRAND_INDIGO);
  doc.setLineWidth(0.6);
  corners.forEach(([x, y, dx, dy]) => {
    doc.line(x, y, x + cornerSize * dx, y);
    doc.line(x, y, x, y + cornerSize * dy);
  });

  // ===== Brand name (manual letter spacing, width-matched underline) =====
  const brandLabel = spacedText(APP_BRAND_NAME.toUpperCase());
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_INDIGO_DARK);
  doc.text(brandLabel, centerX, 30, { align: 'center' });
  const brandWidth = doc.getTextWidth(brandLabel);

  doc.setDrawColor(...GOLD_ACCENT);
  doc.setLineWidth(0.4);
  doc.line(centerX - brandWidth / 2 - 4, 34, centerX + brandWidth / 2 + 4, 34);

  // ===== Title =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(...INK_900);
  doc.text('Certificate of Internship Completion', centerX, 52, { align: 'center' });

  // ===== Decorative divider with diamond =====
  const dividerY = 60;
  doc.setDrawColor(...GOLD_ACCENT);
  doc.setLineWidth(0.35);
  doc.line(centerX - 55, dividerY, centerX - 6, dividerY);
  doc.line(centerX + 6, dividerY, centerX + 55, dividerY);
  doc.setFillColor(...GOLD_ACCENT);
  doc.triangle(centerX - 3, dividerY, centerX + 3, dividerY, centerX, dividerY - 3, 'F');
  doc.triangle(centerX - 3, dividerY, centerX + 3, dividerY, centerX, dividerY + 3, 'F');

  // ===== Subtext =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...INK_500);
  doc.text('This certificate is proudly presented to', centerX, 72, { align: 'center' });

   // ===== Student name (auto-shrinks for long names) =====
  doc.setFont('helvetica', 'bold');
  let studentNameFontSize = 26;
  const maxNameWidth = pageWidth - 70;
  doc.setFontSize(studentNameFontSize);
  while (doc.getTextWidth(studentName) > maxNameWidth && studentNameFontSize > 14) {
    studentNameFontSize -= 1;
    doc.setFontSize(studentNameFontSize);
  }
  doc.setTextColor(...BRAND_INDIGO);
  doc.text(studentName, centerX, 88, { align: 'center' });
  const studentNameWidth = doc.getTextWidth(studentName);

  doc.setDrawColor(...BRAND_INDIGO);
  doc.setLineWidth(0.25);
  doc.line(centerX - studentNameWidth / 2 - 8, 92, centerX + studentNameWidth / 2 + 8, 92);

  // ===== Body =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12.5);
  doc.setTextColor(55, 65, 81);
  const bodyLines = doc.splitTextToSize(
    `for successfully completing the internship "${internshipTitle}" with ${clientName}${
      duration ? `, over a duration of ${duration}` : ''
    }, verified through the ${APP_BRAND_NAME} platform.`,
    pageWidth - 90
  ) as string[];
  doc.text(bodyLines, centerX, 104, { align: 'center' });

    // ===== Middle filler: verified badge pill =====
    const fillerY = 138;
  const fillerText = 'SKILL VERIFIED   \u2022   AI-ASSISTED REVIEW   \u2022   HUMAN APPROVED';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const fillerTextWidth = doc.getTextWidth(fillerText);

  const badgePaddingX = 10;
  const badgeHeight = 11;
  const badgeWidth = fillerTextWidth + badgePaddingX * 2;
  const badgeX = centerX - badgeWidth / 2;
  const badgeY = fillerY - badgeHeight / 2 - 2;

  doc.setFillColor(247, 245, 255);
  doc.setDrawColor(...GOLD_ACCENT);
  doc.setLineWidth(0.4);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2, badgeHeight / 2, 'FD');

    doc.setTextColor(...BRAND_INDIGO_DARK);
  doc.text(fillerText, centerX, fillerY, { align: 'center' });

  // ===== Seal (bottom right) =====
    const sealX = pageWidth - 42;
  const sealY = pageHeight - 46;
  doc.setFillColor(...BRAND_INDIGO);
  doc.circle(sealX, sealY, 12, 'F');
  doc.setDrawColor(...GOLD_ACCENT);
  doc.setLineWidth(0.6);
  doc.circle(sealX, sealY, 12, 'S');
  doc.circle(sealX, sealY, 9.5, 'S');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.line(sealX - 4, sealY, sealX - 1, sealY + 3.5);
  doc.line(sealX - 1, sealY + 3.5, sealX + 5, sealY - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND_INDIGO_DARK);
  doc.text('VERIFIED', sealX, sealY + 17, { align: 'center' });

  // ===== Signature line (bottom left/center) =====
    const sigX = centerX - 20;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sigX - 32, pageHeight - 46, sigX + 32, pageHeight - 46);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...INK_900);
  doc.text(`${APP_BRAND_NAME} Platform`, sigX, pageHeight - 40, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_500);
  doc.text('Authorized Issuer', sigX, pageHeight - 35.5, { align: 'center' });

  // ===== Footer: date + certificate ID =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK_500);
  doc.text(`Issued on ${formattedDate}`, 20, pageHeight - 16);
  doc.text(`Certificate ID: ${certificateId}`, pageWidth - 20, pageHeight - 16, { align: 'right' });

  const fileSafeTitle = internshipTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`shaghalny-internship-certificate-${fileSafeTitle}.pdf`);
}