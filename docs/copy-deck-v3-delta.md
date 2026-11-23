> **یادداشت نسخهٔ ۳ (دلتا)**
> این فایل فقط کلیدهای تازهٔ چیدمان روشن و داشبوردی را اضافه می‌کند و چند اصلاح سفر کاربر را پیشنهاد می‌دهد. هر چیزی که اینجا نیامده، همان `copy-deck-v2.md` و متن زندهٔ `index.html` است. نام برند همه‌جا «کلاود ایران» است، نه «محور».

---

**How to use this delta (for the developer)**

- Same conventions as `copy-deck-v2.md`: `key: value`, paste the Persian value verbatim, backticks = `<code dir="ltr">`, Persian digits in prose, "Dev note" lines are instructions.
- Every number in `hero.widgets` is sample data. Every number in `facts` is a count of things the product has by design. Neither may be turned into a metric, a saving or a customer claim.
- Where v2 still says «محور» (meta, FAQ, footer, alt), the live page already says «کلاود ایران»; the live page wins.

---

## hero.widgets

- `hero.widgets.sample_tag`: نمونه
- `hero.widgets.caption`: نمونهٔ نمایشی؛ اعداد واقعی نیستند.
- Dev note: show `caption` once under the widget cluster and `sample_tag` as a small pill on every card. Each card's `aria` starts with «نمونهٔ نمایشی».

### hero.widgets.wallet

- `hero.widgets.wallet.title`: کیف پول پیش‌پرداخت
- `hero.widgets.wallet.balance_label`: موجودی در دسترس
- `hero.widgets.wallet.balance_value`: ۸٬۴۵۰٬۰۰۰ تومان
- `hero.widgets.wallet.reserved_line`: مبلغ رزروشده: ۱۲۰٬۰۰۰ تومان
- `hero.widgets.wallet.legend`:
  1. موجودی در دسترس
  2. مبلغ رزروشده
- `hero.widgets.wallet.aria`: نمونهٔ نمایشی کیف پول پیش‌پرداخت، با موجودی در دسترس و مبلغ رزروشده؛ اعداد واقعی نیستند.
- Dev note: toman amounts appear only on this card. Never put a toman amount and a token count on the same card: together they imply a rate before prices are announced.

### hero.widgets.usage

- `hero.widgets.usage.title`: مصرف بودجهٔ ماهانه
- `hero.widgets.usage.scope`: پروژه: ربات پشتیبانی
- `hero.widgets.usage.value`: ۶۸٪
- `hero.widgets.usage.hint`: با رسیدن به ۱۰۰٪، درخواست‌های تازه پیش از ارسال متوقف می‌شوند.
- `hero.widgets.usage.aria`: نمونهٔ نمایشی مصرف بودجهٔ ماهانهٔ یک پروژه؛ اعداد واقعی نیستند.

### hero.widgets.key

- `hero.widgets.key.title`: کلید پروژه
- `hero.widgets.key.name`: `support-bot-prod`
- `hero.widgets.key.status`: فعال
- `hero.widgets.key.models_label`: مدل‌های مجاز
- `hero.widgets.key.chips`:
  1. Claude Haiku 5.5
  2. Claude Sonnet 5.5
- `hero.widgets.key.aria`: نمونهٔ نمایشی کلید پروژهٔ support-bot-prod، فعال، با دسترسی به Claude Haiku 5.5 و Claude Sonnet 5.5.
- Dev note: same two models the key-settings demo starts with (Opus off). No key value or prefix on this card until the Latin key prefix is decided.

### hero.widgets.tokens

- `hero.widgets.tokens.title`: توکن خروجی، ۷ روز اخیر
- `hero.widgets.tokens.pill`: ۸٪ بیشتر از هفتهٔ قبل
- `hero.widgets.tokens.axis`: ش · ی · د · س · چ · پ · ج
- `hero.widgets.tokens.aria`: نمونهٔ نمایشی نمودار توکن‌های خروجی در ۷ روز اخیر؛ اعداد واقعی نیستند.
- Dev note: keep the pill a neutral usage change in neutral colour. Never word or colour it as a saving.

## facts

- `facts.aria`: چهار عدد از طراحی کلاود ایران
1. - `value`: ۳
   - `label`: مدل Claude در کاتالوگ نسخه‌دار
2. - `value`: ۵
   - `label`: نقش تیمی، از مالک تا مشاهده‌گر
3. - `value`: ۸
   - `label`: کنترل امنیتی در معماری سرویس
4. - `value`: ۱
   - `label`: بار ارسال برای هر درخواست
- `facts.alternates` (if one does not fit the layout):
  1. `value`: ۴ · `label`: مرحله در چرخهٔ صورت‌حساب
  2. `value`: ۳ · `label`: محصول روی یک هسته
- Dev note: no «+», no «٪», no count-up from a bigger or smaller number; these are counts, not results.

## eyebrows

- `eyebrows.contrast`: مقایسهٔ راه‌ها
- `eyebrows.products`: محصولات
- `eyebrows.how`: روش کار
- `eyebrows.control`: کنترل کلید
- `eyebrows.billing`: صورت‌حساب
- `eyebrows.usecases`: کاربردها
- `eyebrows.audiences`: مخاطبان
- `eyebrows.developers`: توسعه‌دهندگان
- `eyebrows.models`: مدل‌ها
- `eyebrows.security`: امنیت
- `eyebrows.pricing`: قیمت‌گذاری
- `eyebrows.workspace`: فاز دوم
- `eyebrows.roadmap`: مسیر ساخت
- `eyebrows.faq`: پرسش‌ها
- `eyebrows.cta`: دسترسی زودهنگام
- Dev note: where a nav label exists, the eyebrow repeats it word for word. In `workspace`, if the chip «فاز دوم · بعد از پلتفرم API» stays, it replaces this eyebrow; never show both.

## contrast.labels

- `contrast.labels.common`: راه رایج
- `contrast.labels.ours`: در کلاود ایران
- `contrast.labels.risk_tags`:
  1. قطع بی‌خبر دسترسی
  2. یک نشت، توقف همه
  3. محاسبهٔ مبهم هزینه
- Dev note: the tag replaces the inline «ریسک:» prefix; the risk sentence under it stays as in v2.

## cta.next_steps

- `cta.next_steps.title`: بعد از عضویت
1. - `title`: درخواستتان ثبت می‌شود
   - `text`: اطلاعات فرم را فقط برای هماهنگی پایلوت در فهرست دسترسی زودهنگام نگه می‌داریم. فعلاً کار دیگری لازم نیست.
2. - `title`: خبر پایلوت با ایمیل
   - `text`: پایلوت پس از قطعی‌شدن تأمین مورد تأیید و قرارداد آغاز می‌شود و هر خبری دربارهٔ پذیرش مرحله‌ای را به ایمیلتان می‌فرستیم. عضویت به معنی پذیرش قطعی نیست.
3. - `title`: قیمت و پرداخت، پیش از عرضه
   - `text`: قیمت‌ها و روش‌های پرداخت پیش از عرضه اعلام می‌شوند. عضویت هزینه‌ای ندارد و پیش از اعلام قیمت‌ها پرداختی از شما خواسته نمی‌شود.
- Dev note: ordered list with numbers, not check marks (a tick reads as "done"). No dates, no "within … days".

## cs_review

1. - `where`: hero, new key `hero.independence` (one small line under `hero.ctas`)
   - `issue`: The brand name echoes «Claude» and the non-affiliation line only appears in FAQ 1 and the footer, so first-time visitors can take this for an Anthropic service.
   - `replace_with`: کلاود ایران سرویسی مستقل است و وابسته به Anthropic نیست.
2. - `where`: `cta.lead`
   - `issue`: «خبر پذیرش … را به ایمیلتان می‌فرستیم» reads as promised acceptance, and the launch condition is missing at the moment of decision.
   - `replace_with`: با عضویت در فهرست دسترسی زودهنگام، درخواستتان ثبت می‌شود. پایلوت پس از قطعی‌شدن تأمین مورد تأیید و قرارداد آغاز می‌شود و هر خبری دربارهٔ پذیرش مرحله‌ای را به ایمیلتان می‌فرستیم. عضویت هزینه و تعهدی ندارد و به معنی پذیرش قطعی نیست.
3. - `where`: `cta.success.text`
   - `issue`: No email is sent on sign-up, so without a "nothing else to do" line people wait for one or submit again.
   - `replace_with`: فعلاً کار دیگری لازم نیست. هر خبری دربارهٔ پذیرش مرحله‌ای پایلوت را به همین ایمیل می‌فرستیم؛ عضویت به معنی پذیرش قطعی نیست.
4. - `where`: `cta.form.privacy_text`
   - `issue`: Deletion "by replying to our email" is a dead end: the visitor has no email from us and the page has no contact address (add one to the footer «ارتباط» group before publishing).
   - `replace_with`: نام، ایمیل، موبایل (اگر بنویسید)، نقش و کاربرد مورد نظرتان فقط برای هماهنگی پایلوت و خبرهای راه‌اندازی نگه داشته می‌شود و به کسی فروخته یا داده نمی‌شود. هر زمان بخواهید، با نوشتن به نشانی ایمیلی که در پانویس آمده است، اطلاعاتتان را از فهرست حذف می‌کنیم.
5. - `where`: FAQ 8, last sentence
   - `issue`: It points to a privacy policy that does not exist yet on the site.
   - `replace_with`: درخواست‌ها طبق شروط تأمین‌کننده پردازش می‌شوند و سیاست حریم خصوصی، با جزئیات نگه‌داری داده، پیش از عرضه منتشر می‌شود.
6. - `where`: FAQ 12 answer
   - `issue`: Present tense describes a panel, ticketing and a status page that do not exist yet (README also asks to confirm Persian support with the owner before publishing).
   - `replace_with`: بله؛ پس از عرضه، پشتیبانی از راه تیکت داخل پنل و به زبان فارسی انجام می‌شود. هر درخواست API یک `request_id` دارد و پشتیبانی با همین شناسه، بدون نیاز به متن پرامپت شما، خطا را بررسی می‌کند. صفحهٔ وضعیت هم وضعیت سرویس کلاود ایران و تأمین‌کننده را جدا نشان خواهد داد.
7. - `where`: developer code tabs, key demo, rotate dialog, `src/main.js` key masks
   - `issue`: The old name still shows to developers (`api.mehvar.example`, `MEHVAR_API_KEY`, `mhv_`, `mhv_live_demo_`); use neutral placeholders until a Latin slug is approved.
   - `replace_with`: `https://api.example.com/v1/messages` · `$API_KEY` (Python `os.environ['API_KEY']`, Node `process.env.API_KEY`) · `key_••••••••3f9a` · `key_••••••••••••c21e` · `key_demo_••••••••••••`
8. - `where`: `cta.form` mobile hint (`#h-mobile`)
   - `issue`: «برای هماهنگی سریع‌تر پایلوت» suggests that giving a phone number gets you in faster, which pressures an optional field.
   - `replace_with`: فقط اگر می‌خواهید برای هماهنگی پایلوت تلفنی هم با شما در تماس باشیم.
