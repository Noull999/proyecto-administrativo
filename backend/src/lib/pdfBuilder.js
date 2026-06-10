import PDFDocument from 'pdfkit';
import { computeStatus } from './invoiceHelpers.js';

const fmtMXN = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/**
 * Genera el PDF de una factura y devuelve un Buffer.
 * El invoice debe incluir: client, items, payments, workspace.
 */
export function buildPdfBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const estadoReal = computeStatus(invoice);
    const totalPagado = invoice.payments.reduce((s, p) => s + p.monto, 0);
    const tipo = invoice.tipo === 'factura' ? 'FACTURA' : 'COTIZACIÓN';
    const ws = invoice.workspace;

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Encabezado empresa
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b').text(ws.nombre, 50, 50);
    const wsInfo = [ws.telefono, ws.rfc].filter(Boolean).join('  |  ');
    if (wsInfo) doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text(wsInfo, 50, 75);

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e293b')
      .text(tipo, 400, 50, { width: 160, align: 'right' });
    doc.fontSize(12).font('Helvetica').fillColor('#374151')
      .text(invoice.folio, 400, 78, { width: 160, align: 'right' });

    doc.moveTo(50, 100).lineTo(562, 100).strokeColor('#e5e7eb').lineWidth(1).stroke();

    // Info cliente / fechas
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('CLIENTE', 50, 115);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(invoice.client?.nombre ?? '—', 50, 128);
    if (invoice.client?.rfc) doc.fontSize(9).font('Helvetica').fillColor('#374151').text(`RFC: ${invoice.client.rfc}`, 50, 143);
    if (invoice.client?.email) doc.fontSize(9).font('Helvetica').fillColor('#374151').text(invoice.client.email, 50, 155);

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('FECHA EMISIÓN', 400, 115, { width: 160, align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#374151').text(fmtDate(invoice.fecha), 400, 128, { width: 160, align: 'right' });
    if (invoice.fechaVencimiento) {
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('VENCIMIENTO', 400, 145, { width: 160, align: 'right' });
      doc.fontSize(10).font('Helvetica').fillColor('#374151').text(fmtDate(invoice.fechaVencimiento), 400, 157, { width: 160, align: 'right' });
    }

    // Tabla de conceptos
    let y = 195;
    doc.rect(50, y, 512, 18).fill('#1e293b');
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('DESCRIPCIÓN', 56, y + 5);
    doc.text('CANT.', 330, y + 5, { width: 50, align: 'right' });
    doc.text('PRECIO UNIT.', 385, y + 5, { width: 85, align: 'right' });
    doc.text('IMPORTE', 473, y + 5, { width: 85, align: 'right' });

    y += 18;
    let rowBg = false;
    for (const item of invoice.items) {
      if (rowBg) doc.rect(50, y, 512, 18).fill('#f9fafb');
      doc.fontSize(9).font('Helvetica').fillColor('#374151');
      doc.text(item.descripcion, 56, y + 4, { width: 268 });
      doc.text(String(item.cantidad), 330, y + 4, { width: 50, align: 'right' });
      doc.text(fmtMXN(item.precioUnitario), 385, y + 4, { width: 85, align: 'right' });
      doc.text(fmtMXN(item.importe), 473, y + 4, { width: 85, align: 'right' });
      y += 18;
      rowBg = !rowBg;
    }

    doc.moveTo(50, y).lineTo(562, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

    // Totales
    y += 12;
    const totX = 380;
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
      .text('Subtotal', totX, y, { width: 90, align: 'right' })
      .text(fmtMXN(invoice.subtotal), 473, y, { width: 85, align: 'right' });
    y += 14;
    doc.text('IVA (16%)', totX, y, { width: 90, align: 'right' })
      .text(fmtMXN(invoice.impuesto), 473, y, { width: 85, align: 'right' });
    y += 14;
    doc.moveTo(380, y).lineTo(562, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    y += 6;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827')
      .text('TOTAL', totX, y, { width: 90, align: 'right' })
      .text(fmtMXN(invoice.total), 473, y, { width: 85, align: 'right' });

    y += 30;
    const estadoColors = { pagada: '#166534', enviada: '#1d4ed8', vencida: '#991b1b', borrador: '#6b7280' };
    doc.rect(50, y, 200, 30).fill(estadoColors[estadoReal] ?? '#6b7280');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
      .text(`Estado: ${estadoReal.toUpperCase()}`, 60, y + 10, { width: 180 });

    if (estadoReal !== 'pagada' && totalPagado > 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#374151')
        .text(`Pagado: ${fmtMXN(totalPagado)}  |  Saldo: ${fmtMXN(invoice.total - totalPagado)}`, 260, y + 10);
    }

    if (invoice.notas) {
      y += 45;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#9ca3af').text('NOTAS', 50, y);
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text(invoice.notas, 50, y + 12, { width: 512 });
    }

    doc.end();
  });
}
