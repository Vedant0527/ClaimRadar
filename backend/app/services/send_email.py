"""
Standalone email sender script.
Called via subprocess from the FastAPI backend to avoid Windows socket
timeout issues that occur when smtplib runs inside a long-lived uvicorn process.

Usage:
    python send_email.py <to_email> <otp_code> <smtp_host> <smtp_port> <smtp_user> <smtp_password> <from_email>
"""
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def main():
    if len(sys.argv) != 8:
        print("ERROR: Expected 7 arguments", file=sys.stderr)
        sys.exit(1)

    to_email = sys.argv[1]
    otp_code = sys.argv[2]
    smtp_host = sys.argv[3]
    smtp_port = int(sys.argv[4])
    smtp_user = sys.argv[5]
    smtp_password = sys.argv[6]
    from_email = sys.argv[7]

    subject = "FormZero — Your Email Verification Code"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6f8; margin: 0; padding: 0; }}
        .container {{ max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }}
        .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 24px; text-align: center; }}
        .header h1 {{ color: #e0c097; font-size: 22px; margin: 0; letter-spacing: 1px; }}
        .body {{ padding: 32px 24px; text-align: center; }}
        .body p {{ color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; }}
        .otp-box {{ display: inline-block; background: #f0f4ff; border: 2px dashed #4a6cf7; border-radius: 12px; padding: 16px 32px; margin: 8px 0 24px 0; }}
        .otp-code {{ font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; color: #1a1a2e; letter-spacing: 8px; }}
        .footer {{ background: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; }}
        .footer p {{ color: #999; font-size: 12px; margin: 0; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FormZero</h1>
        </div>
        <div class="body">
          <p>Your email verification code is:</p>
          <div class="otp-box">
            <span class="otp-code">{otp_code}</span>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.<br/>If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 FormZero. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    plain_body = f"Your FormZero verification code is: {otp_code}\n\nThis code expires in 10 minutes."
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
            server.ehlo()
            server.starttls()
            server.ehlo()

        with server:
            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, to_email, msg.as_string())
        print("OK")
        sys.exit(0)
    except Exception as exc:
        print(f"FAIL: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
