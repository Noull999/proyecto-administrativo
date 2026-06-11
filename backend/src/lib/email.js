import { Resend } from 'resend';

const fmtMXN = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('Email: RESEND_API_KEY no configurado');
    return null;
  }
  return new Resend(key);
}

const from = () => process.env.SMTP_FROM || 'onboarding@resend.dev';

export async function sendInvoiceEmail({ invoice, pdfBuffer }) {
  const resend = getResend();
  if (!resend) return { sent: false, reason: 'El servidor de correo no está configurado.' };

  const clientEmail = invoice.client?.email;
  if (!clientEmail) {
    console.warn(`Email: el cliente "${invoice.client?.nombre}" no tiene email`);
    return { sent: false, reason: 'El cliente no tiene correo registrado.' };
  }

  const tipo = invoice.tipo === 'factura' ? 'Factura' : 'Cotización';
  const wsNombre = invoice.workspace?.nombre ?? 'Servicios';

  try {
    const { error } = await resend.emails.send({
      from: `${wsNombre} <${from()}>`,
      to: [clientEmail],
      subject: `${tipo} ${invoice.folio} — ${wsNombre}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
          <h2 style="color:#dc2626;margin-bottom:4px">${wsNombre}</h2>
          <p>Estimado/a <strong>${invoice.client.nombre}</strong>,</p>
          <p>Adjuntamos la ${tipo.toLowerCase()} <strong>${invoice.folio}</strong> por un total de <strong>${fmtMXN(invoice.total)}</strong>.</p>
          ${invoice.fechaVencimiento ? `<p>Fecha de vencimiento: <strong>${fmtDate(invoice.fechaVencimiento)}</strong></p>` : ''}
          ${invoice.notas ? `<p>Notas: ${invoice.notas}</p>` : ''}
          <p style="margin-top:24px;color:#666">Saludos,<br/><strong>${wsNombre}</strong></p>
        </div>
      `,
      attachments: pdfBuffer
        ? [{ filename: `${invoice.folio}.pdf`, content: pdfBuffer }]
        : [],
    });

    if (error) {
      console.error('Resend error:', error);
      return { sent: false, reason: error.message };
    }

    console.log(`Email: ${invoice.folio} enviado a ${clientEmail}`);
    return { sent: true, email: clientEmail };
  } catch (err) {
    console.error('Resend exception:', err.message);
    return { sent: false, reason: err.message };
  }
}

export async function sendReminderEmail({ invoice, recipients, diasRestantes }) {
  const resend = getResend();
  if (!resend || recipients.length === 0) return;

  const vencida = diasRestantes < 0;
  const wsNombre = invoice.workspace?.nombre ?? 'Sistema';

  await resend.emails.send({
    from: `${wsNombre} <${from()}>`,
    to: recipients,
    subject: vencida
      ? `⚠️ Factura ${invoice.folio} vencida hace ${Math.abs(diasRestantes)} día(s)`
      : `Recordatorio: Factura ${invoice.folio} vence en ${diasRestantes} día(s)`,
    html: `
      <div style="font-family:sans-serif;color:#1a1a1a">
        <p>${vencida ? '⚠️ La siguiente factura está <strong>vencida</strong>:' : 'La siguiente factura vence pronto:'}</p>
        <table style="border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 12px;color:#666">Folio</td><td style="padding:4px 12px"><strong>${invoice.folio}</strong></td></tr>
          <tr><td style="padding:4px 12px;color:#666">Cliente</td><td style="padding:4px 12px">${invoice.client?.nombre ?? '—'}</td></tr>
          <tr><td style="padding:4px 12px;color:#666">Total</td><td style="padding:4px 12px">${fmtMXN(invoice.total)}</td></tr>
          <tr><td style="padding:4px 12px;color:#666">Vencimiento</td><td style="padding:4px 12px">${fmtDate(invoice.fechaVencimiento)}</td></tr>
        </table>
        <p style="margin-top:16px;color:#999;font-size:12px">— ${wsNombre}</p>
      </div>
    `,
  });
}
