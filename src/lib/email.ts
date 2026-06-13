import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://diario-obras-kappa.vercel.app'
const FROM = process.env.RESEND_FROM ?? 'CMR Empreendimentos <noreply@cmrempreendimentos.com.br>'

export async function enviarBoasVindas({
  nome,
  email,
  senha,
}: {
  nome: string
  email: string
  senha: string
}) {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Seu acesso ao Diário de Obras — CMR Empreendimentos',
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;max-width:560px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:#dc2626;padding:24px 32px;text-align:center">
            <p style="margin:0;font-size:13px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:.1em;text-transform:uppercase">CMR Empreendimentos</p>
            <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#fff">Diário de Obras</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 8px;font-size:15px;color:#94a3b8">Olá, <strong style="color:#f1f5f9">${nome}</strong>!</p>
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6">
              Seu acesso ao sistema de Diário de Obras foi criado. Use as credenciais abaixo para entrar.
            </p>

            <!-- Credentials box -->
            <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px 24px;margin-bottom:28px">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.08em">Suas credenciais</p>

              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:6px 0">
                    <span style="font-size:12px;color:#64748b;display:block;margin-bottom:2px">E-mail</span>
                    <span style="font-size:14px;color:#e2e8f0;font-weight:600">${email}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.06)">
                    <span style="font-size:12px;color:#64748b;display:block;margin-bottom:2px">Senha provisória</span>
                    <span style="font-size:14px;color:#e2e8f0;font-weight:600;letter-spacing:.05em;font-family:monospace">${senha}</span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${APP_URL}/login"
                     style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 32px;border-radius:8px">
                    Acessar o sistema →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:28px 0 0;font-size:12px;color:#475569;text-align:center;line-height:1.6">
              Recomendamos trocar sua senha após o primeiro acesso.<br>
              Em caso de dúvidas, entre em contato com o administrador.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:rgba(0,0,0,0.2);padding:16px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
            <p style="margin:0;font-size:11px;color:#334155">CMR Empreendimentos · Diário de Obras</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim(),
  })

  if (error) throw new Error(error.message)
}
