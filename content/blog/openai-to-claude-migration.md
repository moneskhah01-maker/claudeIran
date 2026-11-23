---
slug: openai-to-claude-migration
title: مهاجرت از OpenAI API به Claude: تفاوت‌ها، نگاشت پارامترها و چک‌لیست
seoTitle: مهاجرت از OpenAI API به Claude: تفاوت‌ها و چک‌لیست
description: کد OpenAI دارید و می‌خواهید Claude را امتحان کنید؟ تفاوت system prompt، max_tokens، هدرها، tool use و خروجی JSON، به‌علاوهٔ چک‌لیست مهاجرت مرحله‌ای.
excerpt: از تغییر base_url در SDK اوپن‌ای‌آی تا Messages API بومی: جدول نگاشت پارامترها، کد قبل و بعد، دام‌های رایج و چک‌لیست مهاجرت.
cluster: توسعه
keywords: مهاجرت از OpenAI به Claude, API سازگار با OpenAI, تفاوت API کلاد و OpenAI, system prompt در Claude, تغییر base_url
date: 2026-11-23
updated: 2026-11-23
---

برای مهاجرت از OpenAI به Claude دو راه دارید. راه سریع این است که در همان SDK اوپن‌ای‌آی، `base_url`، کلید و نام مدل را عوض کنید و از لایهٔ سازگار با OpenAI استفاده کنید؛ این راه برای آزمایش و مقایسه خوب است. راه پایدار، بازنویسی فراخوانی‌ها با SDK رسمی Anthropic و Messages API است که همهٔ قابلیت‌ها را در اختیارتان می‌گذارد. تفاوت‌های اصلی هم محدودند: `system` پارامتر جداست، `max_tokens` اجباری است، پاسخ فهرستی از بلوک‌های محتواست و ابزارها قالب `tool_use` و `tool_result` دارند.

این راهنما هر دو مسیر را با کد پایتون «قبل و بعد» نشان می‌دهد، یک جدول نگاشت پارامتر به پارامتر می‌دهد و در پایان یک چک‌لیست قابل‌کپی دارد. اگر هنوز با خود API آشنا نیستید، از [Claude API چیست](/blog/claude-api/) شروع کنید. در نمونه‌کدها نام مدل را از متغیر محیطی می‌خوانیم، چون فهرست مدل‌ها مرتب تغییر می‌کند؛ شناسهٔ مدل‌های فعلی را از [مستندات رسمی](https://docs.claude.com) بردارید.

## دو مسیر: لایهٔ سازگار با OpenAI یا Messages API بومی

Anthropic یک لایهٔ سازگاری دارد که endpoint معروف Chat Completions را می‌پذیرد. یعنی کد موجودتان با همان SDK اوپن‌ای‌آی و با سه تغییر به Claude وصل می‌شود: آدرس پایه، کلید API و نام مدل.

```python
# Path 1: keep the OpenAI SDK, point it at the Claude API
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ["ANTHROPIC_API_KEY"],   # a Claude API key, not an OpenAI key
    base_url="https://api.anthropic.com/v1/",
)

response = client.chat.completions.create(
    model=os.environ["CLAUDE_MODEL"],
    max_tokens=800,
    messages=[
        {"role": "system", "content": "You are a concise support assistant."},
        {"role": "user", "content": "How do I reset my password?"},
    ],
)
print(response.choices[0].message.content)
```

خود مستندات Anthropic صریح می‌گوید این لایه بیشتر برای آزمایش و مقایسهٔ توانایی مدل‌ها ساخته شده و برای بیشتر کاربردها راه‌حل بلندمدت یا آمادهٔ تولید به حساب نمی‌آید. بخشی از قابلیت‌ها، از جمله کش پرامپت (prompt caching)، در آن پشتیبانی نمی‌شود. پس توصیهٔ عملی این است: با لایهٔ سازگار ظرف یک بعدازظهر کیفیت را روی دادهٔ خودتان بسنجید و اگر نتیجه قانع‌کننده بود، مسیر تولید را با SDK بومی بنویسید.

```python
# Path 2: native Anthropic SDK (pip install anthropic)
import os
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY

response = client.messages.create(
    model=os.environ["CLAUDE_MODEL"],
    max_tokens=800,                                   # required
    system="You are a concise support assistant.",    # top-level, not a message
    messages=[{"role": "user", "content": "How do I reset my password?"}],
)

text = "".join(b.text for b in response.content if b.type == "text")
print(text, response.stop_reason)
print(response.usage.input_tokens, response.usage.output_tokens)
```

## جدول نگاشت پارامترها

| OpenAI (Chat Completions) | Claude (Messages API) | نکته |
|---|---|---|
| `client.chat.completions.create` | `client.messages.create` | endpoint بومی `/v1/messages` است |
| پیام با نقش `system` یا `developer` | پارامتر سطح بالای `system` | در لایهٔ سازگار همهٔ این پیام‌ها به هم چسبانده و به ابتدا منتقل می‌شوند |
| `max_tokens` یا `max_completion_tokens` (اختیاری) | `max_tokens` (اجباری) | نبودنش خطای ۴۰۰ می‌دهد |
| `stop` | `stop_sequences` | فهرستی از رشته‌ها |
| `temperature`، `top_p` | در نسخهٔ `2026-10-21` API و در مدل‌های جدید (از نسل ۴٫۷ به بعد) خطای ۴۰۰ می‌دهند | پیش از مهاجرت حذفشان کنید |
| `n` بزرگ‌تر از ۱ | معادل ندارد | چند پاسخ یعنی چند درخواست |
| `tools[].function.parameters` | `tools[].input_schema` | `name` و `description` در سطح خود ابزار می‌آیند |
| `tool_choice`: `auto` / `required` / `none` / تابع مشخص | `{"type": "auto"}` / `{"type": "any"}` / `{"type": "none"}` / `{"type": "tool", "name": ...}` | `claude-opus-5-5` و `claude-sonnet-5-5` اجبار به ابزار (`any` و `tool`) را با خطای ۴۰۰ رد می‌کنند |
| `parallel_tool_calls=False` | `disable_parallel_tool_use: true` داخل `tool_choice` | فراخوانی موازی به‌طور پیش‌فرض روشن است |
| `response_format` با `json_schema` | `output_config.format` با `json_schema` | حالت `json_object` معادل مستقیم ندارد |
| `choices[0].message.content` | `content`: فهرست بلوک‌ها | بلوک‌های `type == "text"` را جدا کنید |
| `message.tool_calls[].function.arguments` (رشتهٔ JSON) | بلوک `tool_use` با `input` (شیء آماده) | نیازی به `json.loads` نیست |
| پیام با نقش `tool` و `tool_call_id` | پیام `user` با بلوک `tool_result` و `tool_use_id` | همهٔ نتایج در یک پیام |
| `finish_reason` | `stop_reason` | مقادیر: `end_turn`، `max_tokens`، `stop_sequence`، `tool_use`، `pause_turn`، `refusal` |
| `usage.prompt_tokens` / `completion_tokens` | `usage.input_tokens` / `output_tokens` | به‌علاوهٔ فیلدهای کش |
| بخش `image_url` | بلوک `image` با `source` از نوع `url` یا `base64` | PDF هم با بلوک `document` پشتیبانی می‌شود |
| هدر `Authorization: Bearer` | همان `Authorization: Bearer` یا هدر `x-api-key`، به‌علاوهٔ `anthropic-version` | SDK رسمی خودش می‌فرستد |
| `logprobs`، `seed`، `logit_bias`، `presence_penalty` | معادل ندارند | در لایهٔ سازگار بی‌صدا نادیده گرفته می‌شوند |

## تفاوت‌های اصلی

### `system` جداست

در OpenAI دستورهای سیستمی پیام‌هایی داخل آرایهٔ `messages` هستند و می‌شود آن‌ها را هر جای گفت‌وگو گذاشت. در Claude دستور اصلی پارامتر جدای `system` است و آرایهٔ `messages` فقط نوبت‌های `user` و `assistant` را دارد. لایهٔ سازگار این تفاوت را با «بالا بردن» پنهان می‌کند: همهٔ پیام‌های system و developer را، هر جای گفت‌وگو که باشند، با یک خط جدید به هم می‌چسباند و در `system` می‌گذارد. اگر کد شما وسط گفت‌وگو دستور سیستمی تازه اضافه می‌کند، این رفتار می‌تواند معنای آن دستور را عوض کند. در API بومی، برخی مدل‌های جدیدتر پیام `system` وسط گفت‌وگو را هم می‌پذیرند؛ فهرست مدل‌ها در مستندات آمده است.

### `max_tokens` اجباری است

در OpenAI می‌شود سقف خروجی را نگذاشت. در Claude درخواستِ بدون `max_tokens` خطای ۴۰۰ می‌گیرد. این عدد سقف سخت است: مدل آن را نمی‌بیند و اگر به آن برسد، پاسخ وسط جمله قطع می‌شود و `stop_reason` برابر `max_tokens` برمی‌گردد. در مدل‌هایی که تفکر (thinking) دارند، توکن‌های تفکر هم از همین سقف کم می‌شوند، پس سقف را خیلی تنگ نگیرید. برای `max_tokens` بزرگ، استریم کنید تا درخواست به timeout نخورد. اثر این عدد روی بودجه را در [کنترل هزینهٔ API هوش مصنوعی](/blog/ai-api-cost-control/) توضیح داده‌ایم.

### هدرهای احراز هویت و نسخه

API بومی کلید را در هدر `x-api-key` یا به‌صورت `Authorization: Bearer` می‌گیرد و نسخهٔ API را در هدر `anthropic-version`. مقدار این هدر یک تاریخ است و رفتار API به آن بستگی دارد، پس عوض کردنش می‌تواند تغییر شکننده باشد؛ مثلاً در نسخهٔ `2026-10-21` پارامترهای `temperature`، `top_p` و `top_k` دیگر پذیرفته نمی‌شوند. SDK رسمی هر دو را خودش تنظیم می‌کند و کلید را از متغیر محیطی `ANTHROPIC_API_KEY` می‌خواند. اگر با HTTP خام کار می‌کنید:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2026-10-21" \
  -d '{
    "model": "'"$CLAUDE_MODEL"'",
    "max_tokens": 800,
    "system": "You are a concise support assistant.",
    "messages": [{"role": "user", "content": "How do I reset my password?"}]
  }'
```

لایهٔ سازگار هدر `Authorization` را می‌پذیرد و شناسهٔ درخواست را در `x-request-id` برمی‌گرداند. پیام‌های خطایش هم قالب OpenAI را حفظ می‌کنند، اما متن جزئیات یکی نیست و فقط برای لاگ و اشکال‌زدایی به درد می‌خورد. کلید Claude را مثل هر کلید دیگری پشت سرور و در متغیر محیطی نگه دارید؛ نکاتش در [امنیت کلید API](/blog/api-key-security/) آمده است.

### ترتیب نقش‌ها

اولین پیام آرایه باید از `user` باشد و نقش‌ها یکی‌درمیان می‌آیند؛ پیام‌های پشت‌سرهمِ هم‌نقش را پیش از ارسال خودتان ادغام کنید. نقش جدایی به اسم `tool` هم وجود ندارد و نتیجهٔ ابزار در یک پیام `user` برمی‌گردد. اگر کد OpenAI شما تاریخچه را با نقش‌های `system`، `tool` یا `function` در میانه ذخیره می‌کند، تابع تبدیل‌گر بنویسید که پیش از هر درخواست آن را به قالب Claude برگرداند. یک تفاوت ظریف دیگر: در مدل‌های فعلی Claude (از نسل ۴٫۶ به بعد)، پیش‌پر کردن ابتدای پاسخ دستیار (prefill) خطای ۴۰۰ می‌دهد. برای کنترل قالب پاسخ به‌جای آن از خروجی ساختاریافته یا دستور روشن در `system` استفاده کنید.

### Tool use در برابر function calling

مفهوم یکی است و شکل فرق دارد. در OpenAI تعریف ابزار داخل یک لفافهٔ `function` است و آرگومان‌ها به‌صورت رشتهٔ JSON برمی‌گردند:

```python
# Before: OpenAI function calling
import json

tools = [{
    "type": "function",
    "function": {
        "name": "get_order_status",
        "description": "Look up the status of an order by its ID",
        "parameters": {
            "type": "object",
            "properties": {"order_id": {"type": "string"}},
            "required": ["order_id"],
        },
    },
}]

msg = response.choices[0].message
if msg.tool_calls:
    messages.append(msg)
    for call in msg.tool_calls:
        args = json.loads(call.function.arguments)  # arguments is a JSON string
        messages.append({
            "role": "tool",
            "tool_call_id": call.id,
            "content": json.dumps(get_order_status(**args)),
        })
```

در Claude ابزار مستقیم `name`، `description` و `input_schema` دارد. فراخوانی ابزار یک بلوک `tool_use` در محتوای پاسخ است که `input` آن از قبل یک شیء پایتونی است. کل نوبت دستیار، شامل همین بلوک‌ها، باید به تاریخچه برگردد و همهٔ نتیجه‌ها با هم در **یک** پیام `user` فرستاده شوند:

```python
# After: Claude tool use
tools = [{
    "name": "get_order_status",
    "description": "Look up the status of an order by its ID",
    "input_schema": {
        "type": "object",
        "properties": {"order_id": {"type": "string"}},
        "required": ["order_id"],
    },
}]

response = client.messages.create(
    model=os.environ["CLAUDE_MODEL"],
    max_tokens=2000,
    tools=tools,
    messages=messages,
)

if response.stop_reason == "tool_use":
    messages.append({"role": "assistant", "content": response.content})  # keep tool_use blocks
    results = []
    for block in response.content:
        if block.type == "tool_use":
            results.append({
                "type": "tool_result",
                "tool_use_id": block.id,               # must match the tool_use id
                "content": json.dumps(get_order_status(**block.input)),
            })
    messages.append({"role": "user", "content": results})  # all results in ONE message
```

سه نکتهٔ عملی. اگر ابزاری خطا داد، نتیجه را با `"is_error": True` برگردانید و حذفش نکنید. فرستادن نتیجه‌های یک نوبت در چند پیام جداگانه، مدل را از فراخوانی موازی دور می‌کند. و ورودی ابزار خروجی مدل است، پس پیش از اجرا اعتبارسنجی‌اش کنید و هرگز روی متن سریال‌شدهٔ آن تطبیق رشته‌ای انجام ندهید. اگر باید ورودی دقیقاً با schema بخواند، روی تعریف ابزار `"strict": True` بگذارید. این گزینه در لایهٔ سازگار نادیده گرفته می‌شود و فقط در API بومی کار می‌کند.

### خروجی JSON

در OpenAI خروجی ساختاریافته با `response_format` گرفته می‌شود. معادل بومی Claude پارامتر `output_config.format` است:

```python
import json

response = client.messages.create(
    model=os.environ["CLAUDE_MODEL"],
    max_tokens=1000,
    messages=[{"role": "user", "content": "Extract the customer name and order ID: ..."}],
    output_config={
        "format": {
            "type": "json_schema",
            "schema": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string"},
                    "order_id": {"type": "string"},
                },
                "required": ["customer_name", "order_id"],
                "additionalProperties": False,
            },
        }
    },
)

if response.stop_reason in ("max_tokens", "refusal"):
    raise RuntimeError(f"no usable JSON: {response.stop_reason}")
data = json.loads(next(b.text for b in response.content if b.type == "text"))
```

دام رایج اینجاست: حالت `json_object` که در کد قدیمی OpenAI زیاد دیده می‌شود، در لایهٔ سازگار Claude خطای ۴۰۰ می‌دهد. آنجا فقط `json_schema` همراه با `strict: true` پذیرفته می‌شود. پیش از `json.loads` هم همیشه `stop_reason` را چک کنید؛ پاسخی که به سقف خورده، JSON کامل ندارد.

### رویدادهای استریم

استریم OpenAI تکه‌هایی (chunk) با `choices[0].delta.content` می‌فرستد. استریم Claude رویدادهای نام‌دار دارد: `message_start`، بعد برای هر بلوک `content_block_start`، `content_block_delta` و `content_block_stop`، سپس `message_delta` که `stop_reason` و مصرف توکن را دارد، و در آخر `message_stop`. لازم نیست این رویدادها را دستی تجزیه کنید؛ SDK یک کمک‌کار دارد:

```python
with client.messages.stream(
    model=os.environ["CLAUDE_MODEL"],
    max_tokens=4000,
    messages=[{"role": "user", "content": "Write a short onboarding email."}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    final = stream.get_final_message()  # full message, stop_reason and usage

print(final.stop_reason, final.usage.output_tokens)
```

اگر رابط کاربری شما فقط متن را نشان می‌دهد، `text_stream` همان رفتار آشنای OpenAI را می‌دهد. اگر ابزار یا تفکر دارید، روی خود رویدادها کار کنید تا بلوک‌های غیرمتنی را از دست ندهید.

## محدودیت‌های لایهٔ سازگار و کی سراغ API بومی برویم

طبق مستندات رسمی، این‌ها مهم‌ترین تفاوت‌های لایهٔ سازگار با OpenAI واقعی‌اند:

- پارامتر `strict` در تعریف تابع نادیده گرفته می‌شود و انطباق ورودی ابزار با schema تضمین نمی‌شود.
- `response_format` فقط `json_schema` با `strict: true` را می‌پذیرد و `json_object` یا `text` خطای ۴۰۰ می‌دهند.
- ورودی صوتی و فایل پشتیبانی نمی‌شود و خطای ۴۰۰ می‌دهد.
- prompt caching پشتیبانی نمی‌شود.
- متن تفکر مدل در پاسخ برنمی‌گردد.
- `n` باید دقیقاً ۱ باشد.
- بسیاری از فیلدها مثل `logprobs`، `seed`، `presence_penalty`، `frequency_penalty`، `logit_bias`، `user` و `reasoning_effort` بی‌صدا نادیده گرفته می‌شوند و جزئیات مصرف توکن (`prompt_tokens_details` و `completion_tokens_details`) همیشه خالی‌اند.
- `tool_choice` اجباری (`required` یا تابع مشخص) روی برخی مدل‌های جدید خطا می‌دهد.

نادیده گرفتن بی‌صدا از همه خطرناک‌تر است، چون کد بدون خطا اجرا می‌شود و فقط رفتارش فرق می‌کند. پس هر پارامتری را که کدتان می‌فرستد با جدول مستندات چک کنید. سقف نرخ درخواست در هر دو مسیر همان سقف استاندارد endpoint بومی است. وقتی به یکی از این‌ها نیاز دارید، سراغ API بومی بروید: prompt caching برای کاهش هزینه، Message Batches برای کارهای انبوه، شمارش توکن پیش از ارسال، PDF و ارجاع به منبع (citations)، خروجی ساختاریافتهٔ تضمین‌شده، یا خلاصهٔ تفکر مدل.

> **هشدار:** برای برآورد توکن و هزینهٔ Claude از tiktoken یا tokenizer دیگر ارائه‌دهنده‌ها استفاده نکنید. این ابزارها توکن‌های Claude را کمتر از واقع می‌شمارند، به‌خصوص روی کد و متن غیرانگلیسی. بعد از مهاجرت، برآوردها را با endpoint شمارش توکن (`count_tokens`) از نو بسازید.

## پرامپت‌ها را بازبینی کنید، نه فقط کد را

پرامپتی که ماه‌ها روی یک مدل تنظیم شده، معمولاً به عادت‌های همان مدل گره خورده است. کد را می‌شود در یک روز مهاجرت داد، ولی کیفیت خروجی را پرامپت تعیین می‌کند. هنگام بازبینی این‌ها را چک کنید:

- **ترفندهای مخصوص مدل قبلی را بردارید.** مثلاً تکرار چندبارهٔ «فقط JSON بده» وقتی از خروجی ساختاریافته استفاده می‌کنید، یا جمله‌هایی که برای جبران رفتاری خاص اضافه شده بودند.
- **داده را از دستور جدا کنید.** Claude با برچسب‌های XML مثل `<document>` و `<instructions>` بهتر می‌فهمد کدام بخش داده است و کدام دستور.
- **قالب خروجی را صریح بگویید،** ترجیحاً با یک نمونهٔ کوتاه.
- **وابستگی به `temperature` را بازبینی کنید.** اگر یکنواختی پاسخ‌ها را با این پارامتر کنترل می‌کردید و در مدل جدید باید حذفش کنید، یکنواختی را از راه دستور روشن و نمونه بگیرید.
- **برای متن فارسی،** لحن، نیم‌فاصله، اعداد و اصطلاحات تخصصی را در چند نمونهٔ واقعی بسنجید.

راهنمای کامل را در [پرامپت‌نویسی برای Claude](/blog/claude-prompt-engineering/) و مقایسهٔ رفتار دو مدل را در [Claude یا ChatGPT](/blog/claude-vs-chatgpt/) بخوانید.

## راهبرد مهاجرت کم‌ریسک: یک سرویس در هر نوبت، fallback و eval

مهاجرت یک‌شبهٔ همهٔ سرویس‌ها ریسک بی‌دلیل است. این ترتیب امن‌تر است:

1. **لایهٔ انتزاع بسازید.** همهٔ فراخوانی‌های مدل را پشت یک تابع یا کلاس داخلی ببرید که ورودی و خروجی خنثی دارد. تبدیل قالب پیام‌ها، ابزارها و `usage` فقط همین‌جا انجام می‌شود.
2. **مجموعهٔ ارزیابی (eval) بسازید.** سی تا پنجاه نمونهٔ واقعی از ترافیک هر سرویس جمع کنید، همراه با معیار پذیرش (پاسخ مرجع، روبریک یا بررسی خودکار مثل اعتبار JSON).
3. **کم‌ریسک‌ترین سرویس را اول ببرید.** مثلاً یک کار داخلی مثل خلاصه‌سازی، نه مسیر پرداخت یا چت مشتری.
4. **ترافیک سایه (shadow) اجرا کنید.** درخواست‌ها را به هر دو مدل بفرستید و فقط پاسخ مدل قبلی را به کاربر نشان دهید. کیفیت، تأخیر و هزینه به ازای کار موفق را مقایسه کنید.
5. **با پرچم ویژگی (feature flag) تدریجی جابه‌جا کنید** و fallback به مسیر قبلی را برای خطاهای ماندگار نگه دارید. SDK خطاهای ۴۲۹ و ۵۲۹ (بار زیاد) و خطاهای سمت سرور را خودش چند بار تکرار می‌کند؛ fallback برای وقتی است که این تکرارها هم جواب ندهند.
6. **پایش کنید:** نسبت `stop_reason`ها (به‌خصوص `max_tokens` و `refusal`)، کدهای خطا و مصرف توکن به تفکیک سرویس.

## چک‌لیست مهاجرت از OpenAI به Claude (قابل کپی)

- [ ] SDK رسمی Anthropic را نصب کنید و `ANTHROPIC_API_KEY` را در secret manager یا متغیر محیطی بگذارید.
- [ ] برای هر سرویس و محیط کلید جدا بسازید.
- [ ] شناسهٔ مدل را از مستندات رسمی بگیرید و در پیکربندی نگه دارید، نه وسط کد.
- [ ] پیام‌های `system` و `developer` را به پارامتر `system` منتقل کنید.
- [ ] برای هر درخواست `max_tokens` متناسب بگذارید.
- [ ] `temperature`، `top_p`، `n`، `logprobs`، `seed` و penaltyها را بازبینی یا حذف کنید.
- [ ] `stop` را به `stop_sequences` تبدیل کنید.
- [ ] تعریف ابزارها را به قالب `name` / `description` / `input_schema` برگردانید.
- [ ] حلقهٔ ابزار را به `tool_use` و `tool_result` تبدیل کنید و همهٔ نتایج را در یک پیام `user` بفرستید.
- [ ] `tool_choice` اجباری را با مدل مقصد تست کنید.
- [ ] `response_format` را به `output_config.format` تبدیل کنید و حالت `json_object` را کنار بگذارید.
- [ ] خواندن پاسخ را از `choices[0].message.content` به فهرست بلوک‌ها تغییر دهید.
- [ ] منطق `finish_reason` را به `stop_reason` نگاشت کنید، از جمله `refusal` و `pause_turn`.
- [ ] کد استریم را به رویدادهای Claude یا `text_stream` منتقل کنید.
- [ ] فیلدهای `usage` و محاسبهٔ هزینه را به‌روز کنید و توکن‌ها را با `count_tokens` از نو برآورد کنید.
- [ ] مدیریت خطا را با کلاس‌های خطای SDK بنویسید (۴۰۰، ۴۰۱، ۴۲۹، ۵۲۹).
- [ ] پرامپت‌ها را بازبینی و روی مجموعهٔ ارزیابی تست کنید.
- [ ] ترافیک سایه، پرچم ویژگی و fallback را راه بیندازید.
- [ ] برای پرامپت‌های ثابت و بلند، کش پرامپت را فعال و با `cache_read_input_tokens` تأیید کنید.

## سازگاری بخشی با قالب OpenAI: انتظار درست

هر سرویسی که «سازگار با OpenAI» معرفی می‌شود، در عمل زیرمجموعه‌ای از آن قالب را پیاده می‌کند. حتی لایهٔ رسمی Anthropic هم همین‌طور است. این زیرمجموعه برای شروع سریع و کم کردن هزینهٔ مهاجرت عالی است، ولی جایگزین کامل API بومی نیست. در کلاود ایران، که سرویسی مستقل و غیروابسته به Anthropic و در مرحلهٔ پیش‌عرضه است، هم برنامه همین است: Messages API مسیر اصلی می‌ماند و یک زیرمجموعهٔ اختیاری با قالب OpenAI فقط برای ساده‌تر کردن مهاجرت کد موجود در نظر گرفته شده است. اصل طراحی هم این است که ورودی پشتیبانی‌نشده بی‌صدا نادیده گرفته نشود و خطای روشن بدهد. جزئیات برنامه‌ریزی‌شده در [بخش توسعه‌دهندگان](/#developers) و پاسخ پرسش‌های رایج در [سؤالات متداول](/#faq) آمده است.

## سؤالات متداول

### آیا SDK اوپن‌ای‌آی با Claude کار می‌کند؟
بله، از راه لایهٔ سازگار Anthropic. کافی است در SDK اوپن‌ای‌آی آدرس پایه را به API کلاد تغییر دهید، کلید Claude بگذارید و نام یک مدل Claude را بدهید. خود Anthropic این لایه را بیشتر برای آزمایش و مقایسه توصیه می‌کند، چون بخشی از قابلیت‌ها مثل کش پرامپت در آن نیست و برخی پارامترها بی‌صدا نادیده گرفته می‌شوند. برای محصول تولیدی، SDK رسمی Anthropic و Messages API انتخاب بهتری است.

### مهم‌ترین تفاوت قالب پیام‌ها چیست؟
در Claude دستور سیستمی پارامتر جدای `system` است و داخل آرایهٔ پیام‌ها نمی‌آید. پاسخ هم به‌جای یک رشتهٔ متنی، فهرستی از بلوک‌های محتواست که می‌تواند متن، فراخوانی ابزار یا تفکر باشد. نتیجهٔ ابزار هم به‌جای نقش جدای `tool`، در یک پیام `user` با بلوک `tool_result` برمی‌گردد.

### باید پرامپت‌ها را بازنویسی کنیم؟
معمولاً بازنویسی کامل لازم نیست، اما بازبینی لازم است. پرامپت‌هایی که برای مدل دیگری تنظیم شده‌اند، اغلب ترفندهایی دارند که در Claude بی‌فایده یا حتی مضرند. جدا کردن داده با برچسب‌های XML، تعیین صریح قالب خروجی و تست روی نمونه‌های واقعی معمولاً بیشترین اثر را دارد.

### چطور ریسک مهاجرت را کم کنیم؟
فراخوانی‌های مدل را پشت یک لایهٔ داخلی ببرید، یک مجموعهٔ ارزیابی از ترافیک واقعی بسازید و هر بار فقط یک سرویس را منتقل کنید. پیش از جابه‌جایی کامل، ترافیک سایه اجرا کنید و کیفیت و هزینه به ازای کار موفق را بسنجید. با پرچم ویژگی تدریجی جلو بروید و تا پایان دورهٔ پایش، مسیر قبلی را به‌عنوان fallback نگه دارید.
