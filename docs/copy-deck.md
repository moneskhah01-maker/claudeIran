> **یادداشت راهبردی**
> ۱. **اعتماد از راه جزئیات:** به‌جای صفت، سازوکار نشان می‌دهیم. چهار واژهٔ «رزرو، یک بار ارسال، تسویه، در انتظار تطبیق» در هیرو، صورت‌حساب و پرسش‌ها عیناً تکرار می‌شوند تا خواننده یک مدل ذهنی ثابت بسازد.
> ۲. **کاهش ریسک ادراک‌شده:** بخش مقایسه سه ترس واقعی مخاطب (حساب اشتراکی، کلید مشترک تیم، بستهٔ مبهم و کسر دوباره) را بی‌نام‌بردن از کسی بیان می‌کند و کنار هر کدام پاسخی می‌گذارد که قابل بررسی است.
> ۳. **حس کنترل:** دموی تنظیمات کلید اجازه می‌دهد کاربر پیش از عضویت مدلی را خاموش کند، بودجه بگذارد و کلید را باطل کند؛ تجربهٔ «مهار دست من است» پیش از هر وعده‌ای ساخته می‌شود.
> ۴. **صراحت دربارهٔ محدودیت‌ها:** آنچه نیستیم و نمی‌فروشیم (وابستگی به Anthropic، حساب Pro/Max، طرح نامحدود، سازگاری کامل با OpenAI، حذف آنی از نسخهٔ پشتیبان) آشکارا گفته می‌شود؛ همین صراحت، باورپذیری بقیهٔ ادعاها را بالا می‌برد.
> ۵. **اثبات به‌جای شاهد اجتماعی:** مشتری، نظر و لوگو نداریم و نمی‌سازیم؛ دموی زندهٔ هیرو، قرارداد خطا و چرخهٔ صورت‌حساب نقش «خودتان ببینید و قضاوت کنید» را دارند.
> ۶. **کمیابی واقعی، اصطکاک کم:** فقط محدودبودن ظرفیت پایلوت گفته می‌شود، بی‌عدد و بی‌شمارش معکوس. فرم چهار خانهٔ اجباری دارد، موبایل اختیاری است و نام اقدام در سربرگ، هیرو، دکمهٔ فرم و پیام موفقیت یکی است.
> ۷. **خودشناسایی مخاطب:** بخش مخاطبان برای هر گروه یک درد آشنا و یک نتیجهٔ مشخص می‌گذارد تا هر خواننده خودش را پیدا کند.
> ۸. **آینده بدون پیش‌فروش:** فاز دوم با برچسب ثابت و بدون تاریخ معرفی می‌شود تا انگیزهٔ پیوستن بماند و انتظار نادرست ساخته نشود.

---

**How to use this deck (for the developer)**

- Every line `key: value` is one field. Paste the Persian value verbatim; the key is only for mapping.
- Text inside backticks in a value (for example `POST /v1/messages`, `402`, `request_id`) is code: render it as `<code dir="ltr">` and drop the backticks themselves.
- Persian digits everywhere in prose. Latin digits only inside code, HTTP status codes, paths and model names (Claude Sonnet 5.5).
- Brand swap: the working name «محور» appears in meta (title, og title), hero subline, the contrast column label, the desktop mock title, FAQ 1, the consent line, footer (disclaimer, copyright) and alt texts. The key prefix `mhv_` (key demo) and `$MEHVAR_API_KEY` (dev note) derive from it. Search for «محور», «Mehvar», `MEHVAR` and `mhv_` to rename.
- Lines starting with "Dev note" are instructions, not copy.
- Canonical terms (do not paraphrase anywhere on the page):
  - Primary action: «عضویت در فهرست دسترسی زودهنگام»
  - Billing lifecycle: «رزرو» · «یک بار ارسال» · «تسویه» · «در انتظار تطبیق»
  - Key actions: «ابطال کلید» (revoke) · «جایگزینی کلید» (rotate)
  - Limits: «بودجهٔ ماهانه» · «سقف خروجی»
  - Wallet: «کیف پول پیش‌پرداخت» · «موجودی در دسترس» · «مبلغ رزروشده»
  - Roles: «مالک (Owner)» · «مدیر (Admin)» · «توسعه‌دهنده (Developer)» · «مالی (Billing)» · «مشاهده‌گر (Viewer)»
  - Products: «پلتفرم API» · «فضای کار وب» · «اپ دسکتاپ»
  - Status chips: phase 1 = «فاز اول · پایلوت محدود»؛ phase 2 = «فاز دوم · بعد از پلتفرم API»
  - Spelling: «گفت‌وگو» (Academy form, not «گفتگو»), «صورت‌حساب», «دفتر کل»

---

## meta

- `meta.title`: محور | دسترسی کنترل‌شده به Claude API برای تیم‌ها
- `meta.description`: کلید جدا برای هر پروژه، بودجه و سقف خروجی، هزینهٔ تخمینی پیش از ارسال و تسویهٔ دقیق مصرف. عضویت در فهرست دسترسی زودهنگام پایلوت باز است.
- `meta.og_title`: محور: دسترسی کنترل‌شده به مدل‌های Claude از راه API
- `meta.og_description`: کلید مجازی جدا برای هر پروژه، کیف پول پیش‌پرداخت و صورت‌حسابی که هر توکن را نشان می‌دهد. ظرفیت پایلوت محدود است.

## nav

- `nav.items`:
  - `#products`: محصولات
  - `#control`: کلید و بودجه
  - `#billing`: صورت‌حساب
  - `#developers`: توسعه‌دهندگان
  - `#security`: امنیت
  - `#faq`: پرسش‌ها
- `nav.cta`: عضویت در فهرست دسترسی زودهنگام
- Dev note: the header CTA scrolls to `#cta` and keeps the full name. On narrow screens hide it instead of shortening it (the hero CTA is visible there).

## hero

- `hero.status`: پایلوت محدود · عضویت در فهرست دسترسی زودهنگام باز است
- `hero.h1`: دسترسی کنترل‌شده به Claude برای تیم و پروژهٔ شما
- `hero.sub`: محور دسترسی به مدل‌های Claude را فقط از راه API و بر پایهٔ تأمین مورد تأیید و قرارداد فراهم می‌کند. برای هر پروژه کلید جدا، بودجهٔ مشخص و صورت‌حسابی دقیق به تومان دارید.
- `hero.cta_primary`: عضویت در فهرست دسترسی زودهنگام
- `hero.cta_secondary`: دیدن جزئیات فنی API
- Dev note: `hero.cta_secondary` scrolls to `#developers`.
- `hero.proof`:
  1. کلید جدا برای هر پروژه، با بودجه و سقف خروجی
  2. هزینهٔ تخمینی پیش از ارسال، هزینهٔ دقیق بعد از آن
  3. قطع استریم؛ نه ارسال دوباره، نه کسر دوباره

### hero.demo (animated live demo)

- `hero.demo.badge`: نمونهٔ نمایشی
- `hero.demo.model`: Claude Sonnet 5.5
- `hero.demo.endpoint`: `POST /v1/messages` · استریم
- `hero.demo.user_label`: شما
- `hero.demo.assistant_label`: Claude Sonnet 5.5
- `hero.demo.prompt`: ربات پشتیبانی ما با API کار می‌کند و هزینه‌اش این ماه بالا رفته. سه راه بگو که هزینه کم شود ولی جواب‌ها بدتر نشوند.
- `hero.demo.answer` (streams in; keep the line breaks):

  سه پیشنهاد عملی:
  ۱. پرسش‌های ساده و تکراری را به مدل سبک‌تر بسپارید و مدل قوی‌تر را برای موارد پیچیده نگه دارید.
  ۲. برای طول پاسخ سقف بگذارید تا جواب‌ها بی‌دلیل بلند نشوند.
  ۳. به‌جای کل تاریخچهٔ گفت‌وگو، فقط چند پیام آخر و اطلاعات لازم را بفرستید.
  با این سه تغییر، توکن‌های ورودی و خروجی هر گفت‌وگو کم می‌شود و در بیشتر موارد کیفیت پاسخ‌ها هم حفظ می‌شود.

- `hero.demo.replay`: پخش دوباره
- `hero.demo.pause`: توقف نمایش

**Side ledger**

- `hero.demo.ledger.title`: دفتر این درخواست
- `hero.demo.ledger.request_id`: شناسهٔ درخواست
- `hero.demo.ledger.price_version`: نسخهٔ نرخ: قفل شد
- `hero.demo.ledger.reserve`: رزرو سقف هزینه
- `hero.demo.ledger.reserve_done`: رزرو شد
- `hero.demo.ledger.sent`: یک بار ارسال شد
- `hero.demo.ledger.streaming`: در حال استریم
- `hero.demo.ledger.settled`: تسویه شد
- `hero.demo.ledger.settled_note`: فقط مصرف واقعی کسر شد و باقی‌ماندهٔ رزرو به موجودی در دسترس برگشت.
- `hero.demo.ledger.tokens_in`: توکن ورودی
- `hero.demo.ledger.tokens_out`: توکن خروجی
- `hero.demo.ledger.wallet`: کیف پول
- `hero.demo.ledger.wallet_available`: موجودی در دسترس
- `hero.demo.ledger.wallet_held`: مبلغ رزروشده
- `hero.demo.ledger.pending` (optional alternate ending): در انتظار تطبیق
- `hero.demo.ledger.pending_note` (optional): نتیجه روشن نیست؛ درخواست تکرار نمی‌شود و مبلغ رزرو تا بررسی کنار می‌ماند.
- `hero.demo.caption`: نمونهٔ نمایشی؛ اعداد واقعی نیستند.
- Illustrative values (safe to use): request id `req_7f3a…`؛ توکن ورودی ۹۴؛ توکن خروجی از ۰ تا ۳۱۲ هم‌پای متن بالا می‌رود.
- Dev note: do not show Toman amounts in this demo; any per-request figure reads as a price. Show the wallet as a bar whose «مبلغ رزروشده» segment appears at reserve and shrinks back into «موجودی در دسترس» at settle.

## contrast

- `contrast.h2`: سه راه رایج و ریسکی که با خود دارند
- `contrast.lead`: این روش‌ها در شروع ساده‌اند؛ هزینه‌شان معمولاً وقتی معلوم می‌شود که محصول به آن‌ها وابسته شده است.
- `contrast.col_common`: روش رایج
- `contrast.col_risk`: ریسک
- `contrast.col_answer`: در محور

- `contrast.row1.approach`: حساب اشتراکی یا «فعال‌شده»
- `contrast.row1.risk`: مالکیت و شرایط استفادهٔ حساب روشن نیست و دسترسی ممکن است بی‌خبر قطع شود.
- `contrast.row1.answer`: دسترسی فقط از راه API و با تأمین مورد تأیید و قرارداد؛ حسابی خرید و فروش نمی‌شود.

- `contrast.row2.approach`: یک کلید برای کل تیم
- `contrast.row2.risk`: معلوم نیست چه کسی چقدر مصرف کرده و با لو رفتن کلید، همهٔ سرویس‌ها با هم متوقف می‌شوند.
- `contrast.row2.answer`: کلید جدا برای هر پروژه، با نقش، بودجه و مدل‌های مجاز؛ کلید لورفته را همان لحظه باطل می‌کنید.

- `contrast.row3.approach`: بستهٔ «۱ میلیون توکن» یا طرح «نامحدود»
- `contrast.row3.risk`: سهم ورودی و خروجی معلوم نیست و وقتی استریم قطع شود، روشن نیست چه چیزی حساب شده است.
- `contrast.row3.answer`: نرخ نسخه‌دار برای ورودی و خروجی، هزینهٔ تخمینی پیش از ارسال و کسر فقط مصرف واقعی.

## products

- `products.h2`: یک هسته، سه راه استفاده
- `products.lead`: همه‌چیز روی یک هستهٔ مشترک ساخته می‌شود: حساب، کیف پول، دفتر کل و پشتیبانی. فاز اول پلتفرم API است و فضای کار وب و اپ دسکتاپ بعد از آن به همین حساب اضافه می‌شوند.

### products.api

- `products.api.name`: پلتفرم API
- `products.api.purpose`: Claude را با کلید، بودجه و صورت‌حساب خودتان به محصولتان وصل کنید.
- `products.api.features`:
  1. Messages API متنی، با پاسخ استریم یا یکجا
  2. کلید جدا برای هر پروژه، با محدودیت مدل، IP، بودجه و سقف خروجی
  3. نقش‌های تیمی، داشبورد مصرف تا سطح توکن و گزارش ممیزی
  4. کیف پول پیش‌پرداخت، فاکتور و رسید، تیکت پشتیبانی و صفحهٔ وضعیت
- `products.api.status`: فاز اول · پایلوت محدود

### products.workspace

- `products.workspace.name`: فضای کار وب
- `products.workspace.purpose`: گفت‌وگو با مدل‌ها در مرورگر، با هزینهٔ هر نوبت جلوی چشمتان.
- `products.workspace.features`:
  1. گفت‌وگوها و پروژه‌ها، با فایل‌های محدود
  2. ویرایش یا تولید دوباره در شاخهٔ تازه، بدون ازدست‌رفتن نسخهٔ قبلی
  3. هزینهٔ تخمینی پیش از ارسال و هزینهٔ واقعی بعد از هر نوبت
  4. جستجو، خروجی گرفتن و حذف گفت‌وگو
- `products.workspace.status`: فاز دوم · بعد از پلتفرم API

### products.desktop

- `products.desktop.name`: اپ دسکتاپ
- `products.desktop.purpose`: همان فضای کار روی Windows و macOS، با ورود امن و پیش‌نویس آفلاین.
- `products.desktop.features`:
  1. ورود از مرورگر سیستم با PKCE
  2. نگه‌داری توکن ورود در انبار امن سیستم‌عامل (Keychain)
  3. پیش‌نویس آفلاین و همگام‌سازی بر پایهٔ نسخه
  4. به‌روزرسانی فقط با بستهٔ امضاشده
- `products.desktop.status`: فاز دوم · بعد از پلتفرم API

## control

- `control.h2`: هر کلید، مرز مشخص خودش را دارد
- `control.lead`: برای هر پروژه کلید جدا بسازید، مدل‌های مجاز و سقف هزینه‌اش را تعیین کنید و هر وقت لازم شد باطلش کنید. کلید کامل فقط یک بار، همان لحظهٔ ساخت، نمایش داده می‌شود.

### control.demo (interactive key settings)

- `control.demo.title`: تنظیمات کلید
- `control.demo.project`: پروژه: ربات پشتیبانی
- `control.demo.disclaimer`: این یک نمونهٔ نمایشی است و به حساب واقعی وصل نیست.

**Key name**
- `control.demo.key_name.label`: نام کلید
- `control.demo.key_name.value`: `support-bot-prod`
- `control.demo.key_name.hint`: نامی بگذارید که بعداً بدانید این کلید کجا استفاده می‌شود.
- `control.demo.key_value.label`: کلید
- `control.demo.key_value.value`: `mhv_••••••••3f9a`
- `control.demo.key_value.hint`: کلید کامل فقط هنگام ساخت نمایش داده می‌شود.

**Model access**
- `control.demo.models.label`: مدل‌های مجاز
- `control.demo.models.hint`: درخواست به مدلی که اینجا خاموش است، پیش از ارسال رد می‌شود.
- `control.demo.models.haiku`: Claude Haiku 5.5
- `control.demo.models.sonnet`: Claude Sonnet 5.5
- `control.demo.models.opus`: Claude Opus 5.5
- `control.demo.models.on`: روشن
- `control.demo.models.off`: خاموش
- Suggested initial state: Haiku روشن، Sonnet روشن، Opus خاموش.

**Monthly budget**
- `control.demo.budget.label`: بودجهٔ ماهانه
- `control.demo.budget.unit`: تومان
- `control.demo.budget.value`: ۲٬۰۰۰٬۰۰۰
- `control.demo.budget.hint`: با رسیدن مصرف به این سقف، درخواست‌های تازه پیش از ارسال به مدل رد می‌شوند.
- `control.demo.budget.error`: یک عدد بزرگ‌تر از صفر وارد کنید.

**Output cap**
- `control.demo.output_cap.label`: سقف خروجی هر درخواست
- `control.demo.output_cap.unit`: توکن
- `control.demo.output_cap.value`: ۲٬۰۴۸
- `control.demo.output_cap.hint`: پاسخ‌ها از این طول بلندتر نمی‌شوند و سقف هزینهٔ هر درخواست هم با همین عدد حساب می‌شود.
- `control.demo.output_cap.error`: یک عدد صحیح بزرگ‌تر از صفر وارد کنید.

**Role**
- `control.demo.role.label`: نقش عضو در این پروژه
- `control.demo.role.member`: سارا
- `control.demo.role.options` (label / hint):
  - `owner`: مالک (Owner) / همهٔ تنظیمات، از جمله پرداخت و اعضا.
  - `admin`: مدیر (Admin) / مدیریت پروژه‌ها و کلیدها.
  - `developer`: توسعه‌دهنده (Developer) / ساخت و استفاده از کلید در محدودهٔ پروژه.
  - `billing`: مالی (Billing) / پرداخت، فاکتور و صورت‌حساب؛ بدون دسترسی به کلیدها.
  - `viewer`: مشاهده‌گر (Viewer) / فقط مشاهده، بدون امکان تغییر.
- Dev note: the text before « / » is the option label, the text after it is the hint shown under the select.
- Suggested initial value: توسعه‌دهنده (Developer)

**Buttons**
- `control.demo.save`: ذخیرهٔ تغییرات
- `control.demo.rotate`: جایگزینی کلید
- `control.demo.revoke`: ابطال کلید
- `control.demo.revoked_badge`: باطل‌شده

**Revoke confirmation dialog**
- `control.demo.revoke_dialog.title`: این کلید باطل شود؟
- `control.demo.revoke_dialog.body`: از همین لحظه هر درخواستی که با این کلید فرستاده شود، با خطای `401` رد می‌شود.
- `control.demo.revoke_dialog.confirm`: ابطال کلید
- `control.demo.revoke_dialog.cancel`: انصراف

**Rotate result dialog**
- `control.demo.rotate_dialog.title`: کلید جایگزین آماده است
- `control.demo.rotate_dialog.body`: این کلید فقط همین یک بار نمایش داده می‌شود. آن را همین حالا در جای امنی مثل متغیرهای محیطی یا مدیر رمز ذخیره کنید.
- `control.demo.rotate_dialog.value`: `mhv_••••••••••••c21e`
- `control.demo.rotate_dialog.copy`: کپی کلید
- `control.demo.rotate_dialog.done`: ذخیره کردم

**Toasts**
- `control.toast.saved`: تغییرات کلید ذخیره شد.
- `control.toast.model_on`: دسترسی {مدل} برای این کلید روشن شد.
- `control.toast.model_off`: دسترسی {مدل} برای این کلید خاموش شد؛ درخواست به این مدل پیش از ارسال رد می‌شود.
- `control.toast.budget`: بودجهٔ ماهانه روی {مبلغ} تومان تنظیم شد.
- `control.toast.output_cap`: سقف خروجی روی {عدد} توکن تنظیم شد.
- `control.toast.role`: نقش {نام} به «{نقش}» تغییر کرد.
- `control.toast.revoked`: کلید باطل شد. درخواست‌های بعدی با این کلید با خطای `401` رد می‌شوند.
- `control.toast.rotated`: کلید جایگزین ساخته شد. آن را همین حالا کپی کنید؛ دوباره نمایش داده نمی‌شود.
- `control.toast.copied`: کلید کپی شد.
- Dev note: `{مدل}`, `{مبلغ}`, `{عدد}`, `{نام}`, `{نقش}` are placeholders; fill numbers with Persian digits and «٬» as the thousands separator.

## billing

- `billing.h2`: هر درخواست یک بار ارسال، یک بار تسویه
- `billing.lead`: پیش از ارسال، سقف هزینه رزرو می‌شود و بعد از پاسخ فقط مصرف واقعی کسر می‌شود. اگر نتیجه روشن نباشد، حدس نمی‌زنیم؛ با شواهد بررسی می‌کنیم.

### billing.stages

1. - `billing.stage1.title`: رزرو
   - `billing.stage1.text`: سقف هزینهٔ درخواست با نرخ همان لحظه حساب و از موجودی در دسترس کنار گذاشته می‌شود؛ اگر موجودی کافی نباشد، درخواست اصلاً فرستاده نمی‌شود.
2. - `billing.stage2.title`: یک بار ارسال
   - `billing.stage2.text`: درخواست فقط یک بار به مدل فرستاده و شناسه‌اش ثبت می‌شود، و پاسخ به‌صورت استریم یا یکجا به شما می‌رسد.
3. - `billing.stage3.title`: تسویه
   - `billing.stage3.text`: مصرف واقعی توکن‌ها با همان نسخهٔ نرخ در دفتر کل دوطرفه ثبت و باقی‌ماندهٔ رزرو به موجودی در دسترس برگردانده می‌شود.
4. - `billing.stage4.title`: در انتظار تطبیق
   - `billing.stage4.text`: اگر ارتباط قطع شود و نتیجه نامعلوم بماند، درخواست کورکورانه تکرار نمی‌شود و مبلغ رزرو تا روشن‌شدن نتیجه با شواهد کنار می‌ماند؛ هیچ تخمینی خودکار به هزینهٔ قطعی تبدیل نمی‌شود.

### billing.rules (guarantees by design)

- `billing.rules.title`: قاعده‌هایی که در خود سیستم ثابت‌اند
- `billing.rules.items`:
  1. نرخ در لحظهٔ پذیرش درخواست قفل می‌شود؛ تغییر تعرفه فقط روی درخواست‌های بعدی اثر دارد.
  2. تکرار همان درخواست با همان کلید یکتاسازی، دوباره هزینه کسر نمی‌کند.
  3. هیچ سند مالی پاک یا ویرایش نمی‌شود؛ هر اصلاح با سند برگشت ثبت می‌شود.
  4. بستهٔ مبهم «۱ میلیون توکن» و طرح «نامحدود» نداریم.

## developers

- `developers.h2`: قرارداد روشن، خطاهای قابل‌پیش‌بینی
- `developers.lead`: مسیرها نسخه‌دارند، هر خطا کد ثابت دارد و هر پاسخ با `request_id` قابل پیگیری است. ورودی پشتیبانی‌نشده بی‌صدا نادیده گرفته نمی‌شود.

### developers.tabs

- `developers.tabs.endpoints`: مسیرها
- `developers.tabs.errors`: قرارداد خطا
- `developers.tabs.sample`: نمونهٔ درخواست
- `developers.code_tabs`: `cURL` · `Python` · `Node.js`
- `developers.copy`: کپی
- `developers.copied`: کپی شد
- Dev note: write the code samples as plain HTTP calls (curl, `requests`, `fetch`), not an official SDK with a swapped base URL, so the page never implies drop-in SDK compatibility. Use placeholders for the key (`$MEHVAR_API_KEY`) and do not invent model ID strings beyond the display names.

### developers.endpoints

- `developers.endpoints.col_route`: متد و مسیر
- `developers.endpoints.col_use`: کاربرد
1. - `route`: `GET /v1/models`
   - `desc`: فهرست مدل‌هایی که کلید شما به آن‌ها دسترسی دارد، با قابلیت‌ها و نرخ نسخه‌دار هر کدام.
2. - `route`: `POST /v1/messages`
   - `desc`: ارسال پیام متنی به مدل، با پاسخ استریم (SSE) یا یکجا؛ زیرمجموعه‌ای هم‌شکل با قالب Messages API.
3. - `route`: `GET /v1/usage`
   - `desc`: گزارش مصرف توکن و هزینه برای پروژه‌ها و کلیدهای شما.
4. - `route`: `GET /v1/wallet`
   - `desc`: موجودی ثبت‌شده، مبلغ رزروشده و موجودی در دسترس کیف پول.
5. - `route`: `POST /v1/chat/completions`
   - `desc`: زیرمجموعهٔ اختیاری با قالب OpenAI برای مهاجرت ساده‌تر کدهای موجود؛ جایگزین کامل نیست.
   - `tag`: اختیاری · زیرمجموعه

### developers.errors

- `developers.errors.col_code`: کد
- `developers.errors.col_title`: عنوان
- `developers.errors.col_meaning`: معنی
1. - `code`: `402`
   - `title`: موجودی کافی نیست
   - `meaning`: موجودی در دسترس کیف پول برای سقف هزینهٔ این درخواست کافی نیست؛ درخواست به مدل فرستاده نمی‌شود و هزینه‌ای ندارد.
2. - `code`: `409`
   - `title`: تعارض کلید یکتاسازی
   - `meaning`: همان `Idempotency-Key` با محتوای متفاوت فرستاده شده است؛ درخواست اجرا نمی‌شود و چیزی کسر نمی‌شود.
3. - `code`: `422`
   - `title`: ورودی پشتیبانی‌نشده
   - `meaning`: پارامتر یا قابلیتی فرستاده‌اید که این مسیر یا مدل پشتیبانی نمی‌کند؛ به‌جای نادیده‌گرفتن بی‌صدا، صریح رد می‌شود.
4. - `code`: `429`
   - `title`: سقف نرخ درخواست
   - `meaning`: به سقف تعداد درخواست یا توکن در این بازهٔ زمانی رسیده‌اید؛ زمان مناسب برای تلاش دوباره در هدر `Retry-After` آمده است.

### developers.notes

- `developers.note_compat`: سازگاری با قالب OpenAI فقط برای زیرمجموعه‌ای از قابلیت‌هاست؛ آنچه پشتیبانی نشود با خطای `422` برمی‌گردد و ادعای جایگزینی کامل برای همهٔ SDKها نداریم.
- `developers.note_idempotency`: با هدر `Idempotency-Key`، تکرار همان درخواست دوباره هزینه کسر نمی‌کند.
- `developers.note_stream`: در استریم، خطایی که بعد از شروع پاسخ رخ دهد به‌صورت رویداد `error` می‌آید، نه با تغییر کد HTTP.

## models

- `models.h2`: سه مدل Claude، یک کاتالوگ نسخه‌دار
- `models.lead`: برای هر کلید تعیین کنید به کدام مدل دسترسی داشته باشد. نرخ ورودی و خروجی هر مدل در کاتالوگ پنل نمایش داده می‌شود.
1. - `name`: Claude Haiku 5.5
   - `best_for`: کارهای سبک و پرتکرار، مثل دسته‌بندی، استخراج و پاسخ‌های کوتاه، که هزینهٔ هر درخواست در آن‌ها تعیین‌کننده است.
2. - `name`: Claude Sonnet 5.5
   - `best_for`: بیشتر کارهای روزمرهٔ تولید متن، تحلیل و کدنویسی، با توازن میان کیفیت، سرعت و هزینه.
3. - `name`: Claude Opus 5.5
   - `best_for`: پیچیده‌ترین کارهای تحلیلی و چندمرحله‌ای، وقتی دقت بیشتر ارزش هزینهٔ بالاتر را دارد.
- `models.note`: نرخ‌ها نسخه‌دارند: نرخ هر درخواست در لحظهٔ پذیرش قفل می‌شود و تغییر تعرفه پیش از اعمال در پنل اعلام می‌شود. وضعیت هر مدل، از جمله منسوخ‌شدن، در کاتالوگ آمده است.
- Dev note: no prices in this section, not even "from …".

## security

- `security.h2`: هشت کنترل امنیتی، از کلید تا فایل
- `security.lead`: کلید اصلی تأمین‌کننده از زیرساخت ما بیرون نمی‌رود و دادهٔ هر سازمان از بقیه جداست. این هشت کنترل در معماری سرویس پیش‌بینی شده‌اند.
1. - `title`: کلید اصلی، همیشه پشت سرور
   - `text`: کلید تأمین‌کننده فقط در زیرساخت امن نگه داشته می‌شود و هرگز به کلاینت، مرورگر یا لاگ‌ها نمی‌رسد.
2. - `title`: کلید شما، فقط به‌صورت هش
   - `text`: کلیدهای مجازی به‌صورت HMAC digest ذخیره می‌شوند؛ برای همین فقط یک بار نمایش داده می‌شوند و قابل بازیابی نیستند.
3. - `title`: جداسازی داده‌های هر سازمان
   - `text`: جدایی داده‌ها با Row Level Security در خود پایگاه داده اعمال می‌شود و سازمان از روی کلید و در سمت سرور تشخیص داده می‌شود، نه از ادعای کلاینت.
4. - `title`: پرامپت‌ها در لاگ نمی‌مانند
   - `text`: محتوای درخواست و پاسخ به‌طور پیش‌فرض در لاگ‌ها و داده‌های ردگیری ثبت نمی‌شود.
5. - `title`: رمزگذاری ارتباطات، فایل‌ها و اسرار
   - `text`: همهٔ ارتباطات عمومی روی HTTPS است و فایل‌ها و اسرار رمزگذاری‌شده نگه‌داری می‌شوند.
6. - `title`: لینک فایل، امضاشده و کوتاه‌عمر
   - `text`: فایل‌ها فقط با لینک امضاشده و کوتاه‌عمر در دسترس‌اند، نه با آدرس عمومی ثابت.
7. - `title`: ردپای ممیزی تغییرناپذیر
   - `text`: ساخت و ابطال کلید، تغییر نقش‌ها و هر رویداد مالی با زمان، انجام‌دهنده و شناسهٔ درخواست ثبت می‌شود.
8. - `title`: حذف داده، با مرز روشن
   - `text`: درخواست حذف را اجرا می‌کنیم و می‌گوییم چه چیزی کجا حذف می‌شود؛ حذف آنی از نسخه‌های پشتیبان تغییرناپذیر را وعده نمی‌دهیم.

## workspace

- `workspace.chip`: فاز دوم · بعد از پلتفرم API
- `workspace.h2`: فضای کار وب و اپ دسکتاپ
- `workspace.lead`: این بخش هنوز در دسترس نیست و بعد از پلتفرم API عرضه می‌شود. آنچه اینجا می‌بینید طرح اولیه است.

### workspace.chat_features

- `workspace.chat.title`: فضای کار وب
- `workspace.chat.features`:
  1. فهرست گفت‌وگوها، با ساخت و بایگانی
  2. انتخاب مدل در هر گفت‌وگو
  3. پاسخ زنده با امکان توقف؛ ممکن است هزینهٔ بخش تولیدشده حساب شود
  4. ویرایش یا تولید دوباره در شاخهٔ تازه، بدون ازدست‌رفتن نسخهٔ قبلی
  5. هزینهٔ تخمینی پیش از ارسال و هزینهٔ واقعی پس از هر نوبت
  6. پروژه‌ها، فایل‌های محدود و جستجو
  7. خروجی گرفتن و حذف گفت‌وگو

### workspace.desktop_features

- `workspace.desktop.title`: اپ دسکتاپ
- `workspace.desktop.features`:
  1. برای Windows و macOS
  2. ورود از مرورگر سیستم با PKCE
  3. نگه‌داری توکن ورود در انبار امن سیستم‌عامل (Keychain)
  4. پیش‌نویس آفلاین
  5. همگام‌سازی بر پایهٔ نسخه؛ در تعارض، پیش‌نویس شما بی‌صدا رونویسی نمی‌شود
  6. به‌روزرسانی فقط با بستهٔ امضاشده
  7. خروج واقعی و امکان ابطال دسترسی هر دستگاه

### workspace.mock (web chat UI mock)

- `workspace.mock.badge`: طرح اولیهٔ فاز دوم
- `workspace.mock.new_chat`: گفت‌وگوی تازه
- `workspace.mock.search`: جستجو
- `workspace.mock.projects`: پروژه‌ها
- `workspace.mock.sidebar_items`:
  1. توضیح خطای `429`
  2. خلاصهٔ جلسهٔ محصول
  3. پیش‌نویس ایمیل به مشتری
- `workspace.mock.model`: Claude Sonnet 5.5
- `workspace.mock.user_message`: خطای `429 Too Many Requests` یعنی چه؟ کوتاه توضیح بده.
- `workspace.mock.assistant_reply`: یعنی در زمانی کوتاه بیش از سقف مجاز درخواست فرستاده‌اید. به اندازهٔ `Retry-After` صبر کنید، دوباره امتحان کنید و درخواست‌های همزمان را کم کنید.
- `workspace.mock.cost_label`: هزینهٔ این نوبت
- `workspace.mock.cost_estimated`: تخمینی پیش از ارسال
- `workspace.mock.cost_actual`: واقعی پس از پاسخ
- `workspace.mock.cost_pending`: در حال تسویه
- `workspace.mock.cost_sample`: ۳۸ توکن ورودی · ۶۴ توکن خروجی
- `workspace.mock.branch`: شاخهٔ ۲ از ۲
- `workspace.mock.branch_tip`: با ویرایش یا تولید دوباره، شاخهٔ تازه ساخته می‌شود و نسخهٔ قبلی سر جایش می‌ماند.
- `workspace.mock.edit`: ویرایش
- `workspace.mock.regenerate`: تولید دوباره
- `workspace.mock.stop`: توقف
- `workspace.mock.export`: خروجی گرفتن
- `workspace.mock.delete`: حذف گفت‌وگو
- `workspace.mock.composer`: پیامتان را بنویسید…
- Dev note: show tokens (`cost_sample`) rather than a Toman amount next to `cost_label`, for the same no-implied-price reason as the hero demo.

### workspace.desktop_mock

- `workspace.desktop_mock.window_title`: محور
- `workspace.desktop_mock.sign_in`: ورود با مرورگر
- `workspace.desktop_mock.sign_in_hint`: صفحهٔ ورود در مرورگر سیستم باز می‌شود.
- `workspace.desktop_mock.synced`: همگام است
- `workspace.desktop_mock.syncing`: در حال همگام‌سازی…
- `workspace.desktop_mock.offline`: آفلاین؛ پیش‌نویس روی همین دستگاه ذخیره شد.
- `workspace.desktop_mock.conflict`: این گفت‌وگو روی دستگاه دیگری تغییر کرده است. پیش‌نویس شما محفوظ است.
- `workspace.desktop_mock.conflict_action`: دیدن نسخهٔ تازه
- `workspace.desktop_mock.update`: به‌روزرسانی امضاشده آمادهٔ نصب است.
- `workspace.desktop_mock.update_action`: نصب و اجرای دوباره

## audiences

- `audiences.h2`: برای توسعه‌دهنده، تیم محصول و سازمان
1. - `title`: توسعه‌دهندگان و فریلنسرها
   - `pain`: هزینهٔ پروژه‌های مشتریان مختلف با هم قاطی می‌شود و معلوم نیست هر کار دقیقاً چقدر خرج داشته است.
   - `outcome`: برای هر مشتری پروژه و کلید جدا می‌سازید و مصرف هر کدام را تا سطح توکن می‌بینید.
2. - `title`: استارتاپ‌ها و تیم‌های محصول
   - `pain`: یک کلید دست همه است و یک حلقهٔ معیوب در کد می‌تواند بودجهٔ ماه را در یک شب تمام کند.
   - `outcome`: هر سرویس کلید و بودجهٔ خودش را دارد و با رسیدن به سقف، درخواست‌ها پیش از ارسال به مدل متوقف می‌شوند.
3. - `title`: سازمان‌ها و مدیران فناوری و مالی
   - `pain`: بدون فاکتور، رسید و ردپای ممیزی، هزینهٔ هوش مصنوعی در گزارش مالی جا نمی‌افتد.
   - `outcome`: نقش مالی جدا، فاکتور و رسید برای هر شارژ و گزارش ممیزی برای هر تغییر کلید و هر رویداد مالی دارید.

## roadmap

- `roadmap.h2`: مسیر ساخت، مرحله به مرحله
- `roadmap.lead`: هر مرحله فقط وقتی شروع می‌شود که مرحلهٔ قبل با شواهد واقعی پذیرفته شده باشد. برای همین تاریخ اعلام نمی‌کنیم.
1. - `title`: کشف و مجوزها
   - `text`: روشن‌کردن تأمین مورد تأیید، قرارداد، پرداخت و قواعد پردازش داده، پیش از هر عرضه.
   - `group`: فاز اول
2. - `title`: پایلوت محدود
   - `text`: استفادهٔ گروه کوچکی از کاربران از پلتفرم API، برای آزمودن تسویه، بار، بازیابی و پشتیبانی در شرایط واقعی.
   - `group`: فاز اول
3. - `title`: عرضهٔ پلتفرم API
   - `text`: کاتالوگ مدل‌ها، کلیدها، سهمیه، مصرف، صورت‌حساب، مستندات و پنل مدیریت، برای عرضهٔ عمومی فاز اول.
   - `group`: فاز اول
4. - `title`: فضای کار وب
   - `text`: گفت‌وگو، پروژه، فایل‌های محدود و جستجو، روی همان حساب و کیف پول.
   - `group`: فاز دوم
5. - `title`: بتای اپ دسکتاپ
   - `text`: اپ Windows و macOS با ورود امن، همگام‌سازی و به‌روزرسانی امضاشده.
   - `group`: فاز دوم
- Dev note: no dates, no percentages, no "now" marker unless the client confirms which stage is current.

## faq

- `faq.h2`: پرسش‌هایی که حق دارید بپرسید

1. - `q`: آیا محور سرویس رسمی Anthropic است؟
   - `a`: نه. محور سرویسی مستقل است و وابسته به Anthropic، نمایندهٔ مجاز یا شریک آن نیست. Claude و Anthropic نشان‌های تجاری Anthropic هستند و ما این نام‌ها را فقط برای معرفی مدل‌هایی می‌آوریم که از راه API به آن‌ها دسترسی می‌دهیم.

2. - `q`: دسترسی به Claude از کجا تأمین می‌شود؟
   - `a`: فقط از راه API و بر پایهٔ تأمین مورد تأیید و قرارداد. حساب مصرف‌کننده مثل Pro یا Max، اشتراک مشترک یا فعال‌سازی حساب نمی‌فروشیم و کلید اصلی تأمین‌کننده هرگز به دست کاربر نمی‌رسد؛ شما کلید مجازی پروژهٔ خودتان را می‌گیرید.

3. - `q`: هزینه چطور حساب می‌شود و اگر استریم قطع شود چه؟
   - `a`: پیش از ارسال، سقف هزینهٔ درخواست با نرخ همان لحظه از کیف پول رزرو می‌شود، درخواست یک بار به مدل می‌رود و بعد فقط مصرف واقعی کسر و باقی رزرو آزاد می‌شود. اگر استریم قطع شود و مصرف نهایی معلوم باشد، همان ثبت می‌شود؛ اگر معلوم نباشد، درخواست «در انتظار تطبیق» می‌ماند و نه دوباره فرستاده می‌شود، نه تخمینی به‌عنوان بدهی قطعی از شما کسر می‌شود. نتیجهٔ بررسی با شواهد در پنل ثبت می‌شود و اگر با آن موافق نباشید، می‌توانید اعتراض کنید.

4. - `q`: اعضای تیم می‌توانند از یک کلید مشترک استفاده کنند؟
   - `a`: پیشنهادش نمی‌کنیم و لازم هم نیست. هر پروژه کلید مجازی خودش را دارد و هر عضو با نقش خودش کار می‌کند: مالک، مدیر، توسعه‌دهنده، مالی یا مشاهده‌گر. اگر کلیدی لو برود، همان یکی را باطل یا جایگزین می‌کنید و بقیهٔ پروژه‌ها کارشان را ادامه می‌دهند.

5. - `q`: با چه روشی پرداخت می‌کنم؟
   - `a`: روش‌های پرداخت هنوز نهایی نشده‌اند و پیش از راه‌اندازی اعلام می‌شوند. آنچه از حالا روشن است: کیف پول پیش‌پرداخت، مبالغ با واحد مشخص به تومان یا ریال، فاکتور و رسید برای هر شارژ، و ثبت هر پرداخت فقط یک بار، حتی اگر تأییدیه‌اش چند بار برسد.

6. - `q`: داده‌های من ذخیره می‌شود یا در لاگ می‌ماند؟
   - `a`: در پلتفرم API، محتوای پرامپت و پاسخ به‌طور پیش‌فرض در لاگ‌ها ثبت نمی‌شود؛ برای صورت‌حساب و ممیزی، داده‌هایی مثل تعداد توکن‌ها، مدل و شناسهٔ درخواست نگه داشته می‌شود. درخواست‌ها طبق شروط تأمین‌کننده پردازش می‌شوند و جزئیات نگه‌داری داده در سیاست حریم خصوصی می‌آید.

7. - `q`: با SDK و کدهای OpenAI سازگار است؟
   - `a`: تا حدی. مسیر اختیاری `POST /v1/chat/completions` زیرمجموعه‌ای از قالب OpenAI را پشتیبانی می‌کند تا مهاجرت کدهای ساده آسان‌تر شود، اما جایگزین کامل نیست، چون دو قالب در نقش‌ها، ابزارها و جزئیات استریم یکسان نیستند. ورودی پشتیبانی‌نشده با خطای `422` برمی‌گردد و ادعای سازگاری کامل با همهٔ SDKها یا ابزارهایی مثل Claude Code نداریم.

8. - `q`: فضای کار وب و اپ دسکتاپ کی می‌آیند؟
   - `a`: تاریخی اعلام نکرده‌ایم. هر دو روی همان هستهٔ پلتفرم API ساخته می‌شوند و عرضهٔ عمومی‌شان فقط بعد از راه‌اندازی موفق فاز اول شروع می‌شود. اعضای فهرست دسترسی زودهنگام خبرش را با ایمیل می‌گیرند.

9. - `q`: پایلوت چیست و چطور پذیرفته می‌شوم؟
   - `a`: پایلوت دوره‌ای محدود است که در آن گروه کوچکی از کاربران از پلتفرم API استفاده می‌کنند تا تسویهٔ مالی، پایداری و پشتیبانی پیش از عرضهٔ عمومی در شرایط واقعی آزموده شود. ظرفیت محدود است و پذیرش مرحله‌ای از میان اعضای فهرست دسترسی زودهنگام انجام می‌شود؛ عضویت به معنی پذیرش قطعی نیست.

10. - `q`: پشتیبانی فارسی دارید؟
    - `a`: بله، از راه تیکت داخل پنل و به زبان فارسی. هر درخواست API یک `request_id` دارد؛ با فرستادن آن، پشتیبانی خطا را بدون نیاز به متن پرامپت شما بررسی می‌کند. وضعیت سرویس هم در صفحهٔ وضعیت نمایش داده می‌شود، جدا برای سرویس ما و تأمین‌کننده.

## cta

- `cta.h2`: ظرفیت پایلوت محدود است
- `cta.lead`: با عضویت در فهرست دسترسی زودهنگام، خبر پذیرش مرحله‌ای پایلوت را به ایمیلتان می‌فرستیم. عضویت هزینه‌ای ندارد و برای شما تعهدی ایجاد نمی‌کند.

### cta.form

- `cta.form.name.label`: نام و نام خانوادگی
- `cta.form.name.placeholder`: مثلاً سارا احمدی
- `cta.form.email.label`: ایمیل
- `cta.form.email.placeholder`: name@example.com
- `cta.form.mobile.label`: شمارهٔ موبایل (اختیاری)
- `cta.form.mobile.placeholder`: مثلاً ۰۹۱۲۰۰۰۰۰۰۰
- `cta.form.mobile.hint`: برای هماهنگی سریع‌تر پایلوت.
- `cta.form.role.label`: نقش شما
- `cta.form.role.placeholder`: انتخاب کنید
- `cta.form.role.options`:
  1. توسعه‌دهنده یا فریلنسر
  2. مدیر فنی یا سرپرست تیم (CTO / Tech Lead)
  3. مدیر محصول
  4. مدیر فناوری اطلاعات
  5. مدیر مالی یا حسابداری
  6. سایر
- `cta.form.use_case.label`: می‌خواهید از API برای چه کاری استفاده کنید؟
- `cta.form.use_case.placeholder`: مثلاً پاسخ‌گویی خودکار به تیکت‌های پشتیبانی، یا خلاصه‌سازی گزارش‌های داخلی
- `cta.form.use_case.hint`: یکی دو جمله کافی است؛ حداکثر ۵۰۰ نویسه.
- `cta.form.consent`: می‌پذیرم که محور برای هماهنگی پایلوت و خبرهای راه‌اندازی با من تماس بگیرد. اطلاعاتم فقط برای همین کار استفاده می‌شود.
- `cta.form.consent_link`: سیاست حریم خصوصی
- `cta.form.submit`: عضویت در فهرست دسترسی زودهنگام
- `cta.form.submitting`: در حال ثبت عضویت…
- `cta.form.note`: ظرفیت پایلوت محدود است و پذیرش مرحله‌ای انجام می‌شود.
- Dev note: required = name, email, role, use case, consent. The mobile field must accept Persian and Latin digits and normalize them. Keep entered values after any error.

### cta.success

- `cta.success.title`: عضویت شما در فهرست دسترسی زودهنگام ثبت شد.
- `cta.success.text`: هر خبری دربارهٔ پذیرش پایلوت را به همین ایمیل می‌فرستیم.
- `cta.success.duplicate`: این ایمیل از قبل در فهرست دسترسی زودهنگام است؛ لازم نیست دوباره عضو شوید.

### cta.errors

- `cta.errors.name_required`: نام خود را بنویسید.
- `cta.errors.name_short`: نام باید دست‌کم ۲ حرف باشد.
- `cta.errors.email_required`: ایمیل را وارد کنید.
- `cta.errors.email_invalid`: این ایمیل درست به نظر نمی‌رسد؛ نمونهٔ درست: name@example.com
- `cta.errors.mobile_invalid`: شمارهٔ موبایل را ۱۱ رقمی و با ۰۹ وارد کنید، یا این خانه را خالی بگذارید.
- `cta.errors.role_required`: نقش خود را انتخاب کنید.
- `cta.errors.use_case_required`: در یکی دو جمله بنویسید از API برای چه کاری استفاده می‌کنید.
- `cta.errors.use_case_long`: متن طولانی است؛ حداکثر ۵۰۰ نویسه.
- `cta.errors.consent_required`: برای عضویت، این گزینه را تأیید کنید.
- `cta.errors.network`: ارسال انجام نشد. اتصال اینترنت را بررسی کنید و دوباره روی «عضویت در فهرست دسترسی زودهنگام» بزنید؛ اطلاعاتی که وارد کرده‌اید پاک نمی‌شود.
- `cta.errors.server` (optional): مشکلی در سمت ما پیش آمد و عضویت ثبت نشد. چند دقیقه بعد دوباره امتحان کنید.
- `cta.errors.rate_limited` (optional): تعداد تلاش‌ها زیاد بود. کمی بعد دوباره امتحان کنید.

## footer

- `footer.brand_line`: دسترسی کنترل‌شده به مدل‌های Claude از راه API؛ با کلید جدا، بودجهٔ مشخص و صورت‌حساب شفاف.
- `footer.groups`:
  - `product`: محصول
    - پلتفرم API · فضای کار وب (فاز دوم) · اپ دسکتاپ (فاز دوم) · مدل‌ها
  - `developers`: توسعه‌دهندگان
    - مسیرهای API · قرارداد خطا · صفحهٔ وضعیت
  - `trust`: اعتماد و قوانین
    - امنیت · حریم خصوصی · شرایط استفاده
  - `contact`: ارتباط
    - پرسش‌های پرتکرار · تماس با ما
- `footer.disclaimer`: Claude و Anthropic نشان‌های تجاری Anthropic هستند. محور سرویسی مستقل است و وابسته به Anthropic، نمایندهٔ مجاز یا شریک آن نیست.
- `footer.copyright`: © ۱۴۰۵ محور. همهٔ حقوق محفوظ است.
- Dev note: link «صفحهٔ وضعیت», «حریم خصوصی» and «شرایط استفاده» only once those pages exist; otherwise drop the item rather than linking to `#`. Render the year dynamically (۱۴۰۵ is the current Solar Hijri year).

## alt

- `alt.skip_link`: رفتن به محتوای اصلی
- `alt.logo`: محور
- `alt.logo_link`: محور، صفحهٔ اصلی
- `alt.menu_open`: باز کردن منو
- `alt.menu_close`: بستن منو
- `alt.hero_demo`: نمونهٔ نمایشی: یک پیام به Claude Sonnet 5.5 فرستاده می‌شود و پاسخ فارسی به‌صورت استریم نوشته می‌شود؛ دفتر کناری مراحل رزرو سقف هزینه، استریم و تسویهٔ مصرف واقعی را همراه با تعداد توکن‌های ورودی و خروجی نشان می‌دهد.
- `alt.hero_demo_live_region`: وضعیت درخواست: {وضعیت}
- `alt.key_demo`: نمونهٔ تعاملی تنظیمات کلید، به حساب واقعی وصل نیست: نام کلید، روشن و خاموش‌کردن دسترسی به سه مدل، بودجهٔ ماهانه، سقف خروجی، نقش عضو، و دکمه‌های جایگزینی و ابطال کلید.
- `alt.key_demo_toggle`: دسترسی این کلید به {مدل}
- `alt.toast_region`: اعلان‌ها
- `alt.workspace_mock`: طرح اولیهٔ فضای کار وب در فاز دوم: فهرست گفت‌وگوها در کنار صفحه، گفت‌وگویی کوتاه دربارهٔ خطای 429، برچسب هزینهٔ این نوبت و نشانگر شاخهٔ ۲ از ۲.
- `alt.desktop_mock`: طرح اولیهٔ اپ دسکتاپ محور برای Windows و macOS در فاز دوم، با وضعیت همگام‌سازی و پیام ذخیرهٔ پیش‌نویس آفلاین.
- `alt.dialog_close`: بستن
- `alt.copy_code`: کپی نمونهٔ کد
