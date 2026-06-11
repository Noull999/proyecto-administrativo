import nodemailer from 'nodemailer';

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn('Email: faltan variables SMTP_HOST o SMTP_USER');
    return null;
  }
  const port = Number(SMTP_PORT) || 587;
  const secure = port === 465;
  console.log(`Email: conectando a ${SMTP_HOST}:${port} (secure=${secure}, user=${SMTP_USER})`);
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    family: 4,           // Forzar IPv4: Railway no tiene salida IPv6
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: { rejectUnauthorized: false },
  });
}

const from = () => process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

const fmtMXN = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/**
 * Envía la factura/cotización al cliente con el PDF adjunto.
 * Si SMTP no está configurado, registra un warning y no falla.
 */
export async function sendInvoiceEmail({ invoice, pdfBuffer }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('Email: SMTP no configurado — omitiendo envío de factura');
    return { sent: false, reason: 'El servidor de correo no está configurado.' };
  }

  const clientEmail = invoice.client?.email;
  if (!clientEmail) {
    console.warn(`Email: el cliente "${invoice.client?.nombre}" no tiene email — omitiendo envío`);
    return { sent: false, reason: 'El cliente no tiene correo registrado.' };
  }

  const tipo = invoice.tipo === 'factura' ? 'Factura' : 'Cotización';
  const wsNombre = invoice.workspace?.nombre ?? 'Servicios';

  await transporter.sendMail({
    from: `"${wsNombre}" <${from()}>`,
    to: clientEmail,
    subject: `${tipo} ${invoice.folio} — ${wsNombre}`,
    html: `
      <p>Estimado/a <strong>${invoice.client.nombre}</strong>,</p>
      <p>Adjuntamos la ${tipo.toLowerCase()} <strong>${invoice.folio}</strong> por un total de <strong>${fmtMXN(invoice.total)}</strong>.</p>
      ${invoice.fechaVencimiento ? `<p>Fecha de vencimiento: <strong>${fmtDate(invoice.fechaVencimiento)}</strong></p>` : ''}
      ${invoice.notas ? `<p>Notas: ${invoice.notas}</p>` : ''}
      <p>Saludos,<br/>${wsNombre}</p>
    `,
    attachments: pdfBuffer
      ? [{ filename: `${invoice.folio}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      : [],
  });

  console.log(`Email: factura ${invoice.folio} enviada a ${clientEmail}`);
  return { sent: true, email: clientEmail };
}

/**
 * Envía recordatorio de factura próxima a vencer o ya vencida
 * a los usuarios ADMIN/CONTABLE del workspace.
 */
export async function sendReminderEmail({ invoice, recipients, diasRestantes }) {
  const transporter = getTransporter();
  if (!transporter || recipients.length === 0) return;

  const vencida = diasRestantes < 0;
  const asunto = vencida
    ? `⚠️ Factura ${invoice.folio} vencida hace ${Math.abs(diasRestantes)} día(s)`
    : `Recordatorio: Factura ${invoice.folio} vence en ${diasRestantes} día(s)`;

  const wsNombre = invoice.workspace?.nombre ?? 'Sistema';

  await transporter.sendMail({
    from: `"${wsNombre}" <${from()}>`,
    to: recipients.join(', '),
    subject: asunto,
    html: `
      <p>${vencida ? '⚠️ La siguiente factura está <strong>vencida</strong>:' : 'La siguiente factura vence pronto:'}</p>
      <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        <tr><td style="padding:4px 12px;color:#6b7280">Folio</td><td style="padding:4px 12px"><strong>${invoice.folio}</strong></td></tr>
        <tr><td style="padding:4px 12px;color:#6b7280">Cliente</td><td style="padding:4px 12px">${invoice.client?.nombre ?? '—'}</td></tr>
        <tr><td style="padding:4px 12px;color:#6b7280">Total</td><td style="padding:4px 12px">${fmtMXN(invoice.total)}</td></tr>
        <tr><td style="padding:4px 12px;color:#6b7280">Vencimiento</td><td style="padding:4px 12px">${fmtDate(invoice.fechaVencimiento)}</td></tr>
      </table>
      <p style="margin-top:16px;color:#6b7280;font-size:12px">— ${wsNombre}</p>
    `,
  });
}
