import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (elementId, filename = 'Payslip.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 300 DPI high resolution scaling
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024 // standard width for consistent desktop layout in print
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297; // A4 height in mm

    // Fit single page
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(pageHeight, imgHeight));
    
    pdf.save(filename);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
  }
};

export default generatePDF;
