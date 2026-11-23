# ثبت دسترسی زودهنگام در Google Sheet (Google Drive)

هر درخواست دسترسی زودهنگام (پنجرهٔ هدر، فرم پایین صفحه، بلاگ) اول در سرور ذخیره می‌شود
(`/var/lib/claudeiran/waitlist.json` — رکورد اصلی) و بلافاصله در شیت گوگل صاحب سایت هم نوشته می‌شود.

```
مرورگر → POST /api/waitlist → server.mjs → waitlist.json (اصلی)
                                         ↘ Apps Script Web App → Google Sheet «ClaudeIran - Early access»
```

- هر ردیف با کلید **ایمیل** درج یا به‌روز می‌شود؛ تلاش دوباره هیچ‌وقت ردیف تکراری نمی‌سازد.
- اگر گوگل در دسترس نباشد چیزی از دست نمی‌رود: ردیف‌های همگام‌نشده با فاصلهٔ فزاینده (۳۰ ثانیه تا ۳۰ دقیقه) و هر ۱۰ دقیقه دوباره فرستاده می‌شوند.
- وضعیت آخرین همگام‌سازی: `/var/lib/claudeiran/sheet-sync.json` و `journalctl -u claudeiran | grep sheet`.
- موبایل‌ها به شکل بین‌المللی ذخیره می‌شوند (`+98912…`)، آمادهٔ ارسال پیامک.

## راه‌اندازی (یک بار)

1. شیت: «ClaudeIran - Early access (claudeiran.com)» در Google Drive صاحب سایت.
2. Extensions → Apps Script → محتوای `Code.gs` همین پوشه.
3. تابع `setup` را Run کنید و مجوز را تأیید کنید. در Execution log مقدار `SHEETS_WEBHOOK_SECRET=…` چاپ می‌شود.
4. Deploy → New deployment → Web app → Execute as: **Me** · Who has access: **Anyone** → نشانی `…/exec`.
   («Anyone» فقط یعنی سرور بدون ورود به گوگل می‌تواند POST کند؛ بدون رمز مشترک هیچ ردیفی نوشته نمی‌شود و GET هیچ داده‌ای برنمی‌گرداند.)
5. روی سرور ایران (`/etc/claudeiran.env`، دسترسی 600، root):
   ```
   SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/…/exec
   SHEETS_WEBHOOK_SECRET=…
   ```
   و `systemctl restart claudeiran`. سرویس با `EnvironmentFile=-/etc/claudeiran.env` این فایل را می‌خواند.
   ردیف‌های قبلی خودکار به شیت فرستاده می‌شوند.

## تغییر کد اسکریپت

بعد از ویرایش `Code.gs`: Deploy → Manage deployments → ✏️ → Version: New version → Deploy (نشانی ثابت می‌ماند).
