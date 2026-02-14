import { OLLAMA_API_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT_MS, SYSTEM_PROMPT } from './constants';
import { retrieveContext } from './rag';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  message: { role: string; content: string };
  done: boolean;
}

// ─── Smart fallback engine ──────────────────────────────────────
// When Ollama is down, provide intelligent context-aware responses
// based on keyword matching against our full product knowledge.

interface FallbackEntry {
  patterns: RegExp[];
  reply: string;
  intent: string;
  questions: string[];
  actions: { label: string; url?: string; type: 'link' | 'info' | 'action' }[];
}

const SITE_URL = 'https://uchooseweprint.com';

const SMART_FALLBACKS: FallbackEntry[] = [
  // ── Greetings ──
  {
    patterns: [/^(hi|hello|hey|sup|yo|what'?s up|greetings|good (morning|afternoon|evening))/i],
    reply: "Hey there! I'm Ava, your U Choose We Print assistant. I can help you with DTF printing, custom apparel, gang sheets, file prep, pricing, shipping, and more. What can I help you with today?",
    intent: 'greeting',
    questions: [
      'What products do you offer?',
      'How does DTF printing work?',
      'How do I place an order?',
    ],
    actions: [
      { label: 'Browse Shop', url: `${SITE_URL}/shop`, type: 'link' },
      { label: 'Build a Gang Sheet', url: `${SITE_URL}/builder`, type: 'link' },
    ],
  },

  // ── Product catalog / what do you sell ──
  {
    patterns: [
      /what (do you|products?|items?).*(sell|offer|have|carry|make)/i,
      /product(s| catalog| list)?/i,
      /what can (i|you) (get|order|buy|print)/i,
      /show me.*(products?|catalog|shop)/i,
      /browse|shop|store/i,
    ],
    reply: "We offer a full range of custom print products! Here's what we carry:\n\n**DTF Transfers** — Custom gang sheets for heat-press transfers. Upload your designs and arrange them on 22\" wide sheets.\n\n**Custom Apparel** — T-shirts, hoodies, tank tops, and more from brands like Gildan, Next Level, Bella+Canvas, and Comfort Colors. Available in dozens of colors and sizes.\n\n**Sublimation Prints** — For mugs, tumblers, and polyester items.\n\n**Home Decor** — Canvas prints, wall art, and accessories.\n\n**Promotional Products** — Custom items for businesses and events.\n\nEverything is customizable with your own designs!",
    intent: 'general',
    questions: [
      'Tell me more about DTF transfers',
      'What apparel brands do you carry?',
      'How does gang sheet pricing work?',
    ],
    actions: [
      { label: 'Browse All Products', url: `${SITE_URL}/shop`, type: 'link' },
      { label: 'Custom Apparel', url: `${SITE_URL}/category/apparel`, type: 'link' },
      { label: 'DTF Transfers', url: `${SITE_URL}/category/dtf-transfers`, type: 'link' },
    ],
  },

  // ── Pricing ──
  {
    patterns: [
      /pric|cost|how much|rate|fee|cheap|expensive|afford|budget/i,
      /what (does|do|will).*(cost|charge|price)/i,
      /quote|estimate/i,
    ],
    reply: "Our pricing depends on the product type:\n\n**Gang Sheets** — Priced by sheet size (not per design!). Sheets are 22\" wide with lengths from 12\" to 48\"+. The more designs you pack on a sheet, the better value. Starting around $8/ft.\n\n**Custom Apparel** — Pricing varies by garment brand, style, and size. T-shirts start around $8-15 each depending on brand and quantity.\n\n**Rush Processing** — Available for an extra $15 fee to jump to the front of the queue.\n\n**Business/Wholesale** — Approved business accounts get special wholesale pricing on all products. Apply for a business account to unlock bulk discounts!\n\nVisit our shop for current prices on specific items.",
    intent: 'pricing',
    questions: [
      'What gang sheet sizes are available?',
      'How do I get wholesale pricing?',
      'Is rush processing worth it?',
    ],
    actions: [
      { label: 'View Pricing', url: `${SITE_URL}/shop`, type: 'link' },
      { label: 'Gang Sheet Builder', url: `${SITE_URL}/builder`, type: 'link' },
    ],
  },

  // ── Wholesale / Business ──
  {
    patterns: [
      /wholesale|business (account|pricing|customer)|bulk (order|discount|pricing)/i,
      /resell|resale|b2b|distributor/i,
    ],
    reply: "We offer special wholesale/business pricing for approved accounts! Here's how it works:\n\n1. **Create an account** on our site and select 'Business' as your customer type\n2. **Apply for approval** — we review business accounts within 1-2 business days\n3. **Once approved**, you'll see discounted wholesale prices on all products\n4. **Wholesale mode** lets you compare your business price vs retail price right on the product page\n\nBusiness accounts typically save 20-30% compared to retail pricing. Great for print shops, resellers, and bulk orders!",
    intent: 'pricing',
    questions: [
      'How do I create a business account?',
      'What are the wholesale prices?',
      'Is there a minimum order for wholesale?',
    ],
    actions: [
      { label: 'Create Account', url: `${SITE_URL}/register`, type: 'link' },
      { label: 'Browse Products', url: `${SITE_URL}/shop`, type: 'link' },
    ],
  },

  // ── Gang sheets ──
  {
    patterns: [
      /gang\s*sheet/i,
      /sheet (builder|size|dimension)/i,
      /arrange.*(design|image)/i,
      /builder|canvas/i,
    ],
    reply: "Gang sheets are a great way to maximize your DTF print value! Here's how they work:\n\n**What is it?** A single 22\"-wide print sheet where you arrange multiple designs together. You pay per sheet size, NOT per design.\n\n**Available Sizes:**\n- Small: 22\" x 12\" — great for 1-4 small designs\n- Medium: 22\" x 24\" — fits 5-10 designs\n- Large: 22\" x 36\" — fits 10-20 designs\n- XL: 22\" x 48\" — maximum value for bulk\n\n**How to use:** Open our Gang Sheet Builder, upload your PNG designs, drag them onto the canvas, arrange and resize, then checkout. The transfers come pre-cut for easy heat-pressing!\n\n**Pro tip:** Rotate designs and fill every gap to get the most out of your sheet!",
    intent: 'gang_sheet',
    questions: [
      'What file format should I use?',
      'How do I use the gang sheet builder?',
      'What is the spacing between designs?',
    ],
    actions: [
      { label: 'Open Builder', url: `${SITE_URL}/builder`, type: 'link' },
      { label: 'View Gang Sheet Product', url: `${SITE_URL}/product/custom-dtf-gang-sheet`, type: 'link' },
    ],
  },

  // ── DTF info / how it works ──
  {
    patterns: [
      /dtf|direct.to.film/i,
      /how (does|do).*(print|transfer|work)/i,
      /what is (dtf|direct)/i,
      /heat.?press|transfer (paper|sheet|film)/i,
    ],
    reply: "DTF (Direct-to-Film) printing is our specialty! Here's how it works:\n\n1. **Your design is printed** onto special PET film using CMYK + white pigment inks\n2. **Hot-melt adhesive powder** is applied to the printed film\n3. **You heat-press** the transfer onto your garment at 300-325°F for 10-15 seconds\n\n**Why DTF is awesome:**\n- Works on **any fabric**: cotton, polyester, blends, nylon, denim, leather\n- Works on **any garment color** including black and dark colors\n- Produces **vibrant, durable prints** that last 50+ washes\n- **No weeding required** — unlike vinyl\n- **No minimum order** — print just one design if you want\n\nCompared to sublimation, DTF is more versatile since sublimation only works on white polyester.",
    intent: 'dtf_info',
    questions: [
      'DTF vs sublimation — which is better?',
      'What temperature for heat pressing?',
      'How long do DTF transfers last?',
    ],
    actions: [
      { label: 'Browse DTF Transfers', url: `${SITE_URL}/category/dtf-transfers`, type: 'link' },
      { label: 'Start a Gang Sheet', url: `${SITE_URL}/builder`, type: 'link' },
    ],
  },

  // ── DTF vs Sublimation ──
  {
    patterns: [
      /sublimation/i,
      /dtf vs|vs dtf|compare|difference between/i,
      /which.*better|better.*which/i,
    ],
    reply: "Great question! Here's the key difference:\n\n**DTF (our specialty):**\n- Works on ANY fabric & ANY color\n- Thin flexible film on top of fabric\n- 50+ wash durability\n- Best for: mixed orders, dark garments, cotton\n\n**Sublimation:**\n- ONLY works on white/light polyester\n- Becomes part of the fabric (zero hand-feel)\n- Extremely durable\n- Best for: white polyester, all-over prints, mugs\n\n**Bottom line:** If you're printing on cotton, dark garments, or mixed fabrics — go with DTF. If you're doing white polyester items exclusively, sublimation is great too. We offer both!",
    intent: 'dtf_info',
    questions: [
      'What fabrics work with DTF?',
      'Do you offer sublimation printing?',
      'What about screen printing?',
    ],
    actions: [
      { label: 'DTF Transfers', url: `${SITE_URL}/category/dtf-transfers`, type: 'link' },
      { label: 'Sublimation Products', url: `${SITE_URL}/category/sublimation-prints`, type: 'link' },
    ],
  },

  // ── File preparation ──
  {
    patterns: [
      /file|image|png|dpi|resolution|upload|format|prepare|prep/i,
      /transparent|background|quality/i,
      /photoshop|gimp|canva|design software/i,
    ],
    reply: "Here's what you need for the best DTF prints:\n\n**File Format:** PNG with transparent background (strongly recommended)\n\n**Resolution:** 300 DPI at print size for sharpest results (minimum 150 DPI)\n\n**Color Mode:** RGB (we handle CMYK conversion)\n\n**Max File Size:** 15 MB per image\n\n**Important Tips:**\n- Transparent backgrounds = clean transfers (white backgrounds print as white rectangles!)\n- Minimum 8pt font for text readability\n- Avoid very thin lines under 1pt\n- No need to mirror/flip — we handle that automatically\n- No bleed needed — designs are cut to contour\n\n**Quick Reference:**\n- 3\" x 3\" print → at least 900 x 900 px\n- 10\" x 10\" print → at least 3000 x 3000 px\n\nUse our built-in **Image Preflight Checker** to verify your files before uploading!",
    intent: 'file_prep',
    questions: [
      'Can I upload JPEG files?',
      'How do I remove a white background?',
      'Can you check my image quality?',
    ],
    actions: [
      { label: 'Check My Image', type: 'action' },
      { label: 'Start Uploading', url: `${SITE_URL}/builder`, type: 'link' },
    ],
  },

  // ── Turnaround / shipping ──
  {
    patterns: [
      /turnaround|shipping|delivery|how long|when.*arriv|time|days|rush|fast|quick|track/i,
      /how (soon|fast|quickly)/i,
      /ship|deliver|mail|usps|fedex/i,
    ],
    reply: "Here's our production and shipping timeline:\n\n**Production:**\n- Standard: 2-3 business days\n- Rush: 1 business day (+$15 fee)\n- Orders before 12 PM EST start same day\n\n**Shipping Options:**\n- USPS Ground Advantage: 3-5 business days\n- USPS Priority Mail: 2-3 business days\n- USPS Priority Express: 1-2 business days\n\n**Example:** Standard production (3 days) + Priority Mail (3 days) = ~6 business days total.\n\n**Rush orders** jump to the front of the production queue, but you still need to choose shipping speed separately.\n\n**Tracking:** You'll get a tracking number by email once your order ships. You can also track orders in your account under My Orders.",
    intent: 'turnaround',
    questions: [
      'How do I track my order?',
      'Is rush processing worth it?',
      'What about holiday shipping times?',
    ],
    actions: [
      { label: 'Track Order', url: `${SITE_URL}/track`, type: 'link' },
      { label: 'My Orders', url: `${SITE_URL}/account/orders`, type: 'link' },
    ],
  },

  // ── Order status / tracking ──
  {
    patterns: [
      /order (status|number|track|where)|track.*order|where.*(my|order|package)/i,
      /shipped|delivered|package/i,
      /my order/i,
    ],
    reply: "You can check your order status in a few ways:\n\n1. **My Orders page** — Log into your account and go to Account → My Orders to see all your orders and their current status\n2. **Email tracking** — We send tracking numbers by email as soon as your order ships\n3. **Track page** — Use our tracking page with your order number\n\nOrder statuses: Pending → Processing → Printed → Shipped → Delivered\n\nTracking updates may take up to 24 hours to appear after label creation. If you have any issues with your order, contact us at support@uchooseweprint.com with your order number.",
    intent: 'order_status',
    questions: [
      'When will my order ship?',
      'I need to change my order',
      'What if my order is wrong?',
    ],
    actions: [
      { label: 'My Orders', url: `${SITE_URL}/account/orders`, type: 'link' },
      { label: 'Track Shipment', url: `${SITE_URL}/track`, type: 'link' },
      { label: 'Contact Support', url: 'mailto:support@uchooseweprint.com', type: 'link' },
    ],
  },

  // ── Refunds / returns ──
  {
    patterns: [
      /refund|return|cancel|wrong|defect|damage|money back|complaint|exchange/i,
    ],
    reply: "We stand behind our quality! Here's our policy:\n\n**Eligible for refund/reprint:**\n- Print defects (color shifts, smearing, adhesion failure)\n- Damaged in transit (torn, creased, water-damaged)\n- Wrong order received\n\n**NOT eligible:**\n- Customer design errors (low-res images, wrong colors)\n- Already applied transfers (heat-pressed onto garments)\n- Change of mind after production started\n\n**How to request:**\n1. Contact us within 7 days of receiving your order\n2. Provide order number + photos of the issue\n3. We review within 1-2 business days\n4. Choose reprint or full refund\n\n**Cancellation:** Orders can be cancelled within 1 hour of placement if production hasn't started.\n\nEmail us at **support@uchooseweprint.com** with your order number and photos.",
    intent: 'refund',
    questions: [
      'How long does a refund take?',
      'Can I cancel my order?',
      'My transfer has a defect',
    ],
    actions: [
      { label: 'Contact Support', url: 'mailto:support@uchooseweprint.com', type: 'link' },
      { label: 'My Orders', url: `${SITE_URL}/account/orders`, type: 'link' },
    ],
  },

  // ── Custom apparel ──
  {
    patterns: [
      /t-?shirt|hoodie|sweatshirt|tank top|apparel|clothing|garment|jersey/i,
      /gildan|next level|bella.?canvas|comfort colors|champion/i,
      /custom (shirt|hoodie|apparel|clothing)/i,
      /brand|color|size/i,
    ],
    reply: "We carry a wide selection of premium apparel brands for custom printing!\n\n**Popular Brands:**\n- **Gildan** — Affordable classic tees, hoodies, and crews\n- **Next Level** — Soft retail-fit tees and tanks\n- **Bella+Canvas** — Premium fashion-forward blanks\n- **Comfort Colors** — Vintage-washed, heavyweight styles\n- **Champion** — Athletic & streetwear hoodies/crews\n\n**Available Styles:** T-shirts, long sleeves, hoodies, crewnecks, tank tops, polos, and more.\n\n**Colors:** Dozens of colors per style — from classic black/white to trendy washes and neons.\n\n**Sizes:** Youth through 5XL (varies by style).\n\nBrowse our apparel section to see all available options with pricing!",
    intent: 'general',
    questions: [
      'What are your most popular shirts?',
      'Do you carry plus sizes?',
      'Can I customize the design placement?',
    ],
    actions: [
      { label: 'Browse Apparel', url: `${SITE_URL}/category/apparel`, type: 'link' },
      { label: 'Customize a Product', url: `${SITE_URL}/shop`, type: 'link' },
    ],
  },

  // ── Customization / design tool ──
  {
    patterns: [
      /customiz|design (tool|editor|placement)|mockup|preview|personali/i,
      /add (text|logo|image)|place.*(design|logo)/i,
    ],
    reply: "Yes! We have a built-in customization tool for all our products:\n\n**Product Customizer:**\n- Add your own images/logos to any product\n- Add custom text with various fonts\n- Position and resize your design exactly where you want it\n- Preview a mockup before ordering\n\n**Gang Sheet Builder:**\n- Upload multiple designs at once\n- Drag, resize, and rotate on a 22\" canvas\n- Fit as many designs as possible to maximize value\n- Real-time pricing based on sheet size\n\nJust browse to any product and click 'Customize This Product' to get started!",
    intent: 'general',
    questions: [
      'Can I see a preview before ordering?',
      'What file formats do you accept?',
      'Can I add text to my design?',
    ],
    actions: [
      { label: 'Browse Products', url: `${SITE_URL}/shop`, type: 'link' },
      { label: 'Gang Sheet Builder', url: `${SITE_URL}/builder`, type: 'link' },
    ],
  },

  // ── Account / login ──
  {
    patterns: [
      /account|login|sign (up|in)|register|password|profile/i,
      /create.*account|make.*account/i,
    ],
    reply: "Here's how to manage your account:\n\n**New customer?** Create a free account to track orders, save designs, and access faster checkout. Business accounts get wholesale pricing!\n\n**Existing customer?** Log in to view your order history, track shipments, and reorder.\n\n**Account features:**\n- Order history & tracking\n- Saved addresses for faster checkout\n- Business/wholesale pricing (after approval)\n- Design history",
    intent: 'general',
    questions: [
      'How do I create a business account?',
      'I forgot my password',
      'How do I track my order?',
    ],
    actions: [
      { label: 'Login', url: `${SITE_URL}/login`, type: 'link' },
      { label: 'Create Account', url: `${SITE_URL}/register`, type: 'link' },
      { label: 'My Account', url: `${SITE_URL}/account`, type: 'link' },
    ],
  },

  // ── Contact / support / help ──
  {
    patterns: [
      /contact|support|help|email|phone|reach|talk to (human|person|someone|agent)/i,
      /customer service/i,
    ],
    reply: "I'd be happy to help, and if you need to reach our team directly:\n\n**Email:** support@uchooseweprint.com\n**Response time:** Within 24 business hours\n\n**What I can help with right now:**\n- Product information and recommendations\n- File preparation guidance\n- Pricing and sizing questions\n- Order process walkthrough\n- DTF printing information\n\nFor order-specific issues (tracking, refunds, changes), include your order number when emailing support.",
    intent: 'general',
    questions: [
      'How do I prepare my files?',
      'What are your prices?',
      'How long does shipping take?',
    ],
    actions: [
      { label: 'Email Support', url: 'mailto:support@uchooseweprint.com', type: 'link' },
      { label: 'Browse Products', url: `${SITE_URL}/shop`, type: 'link' },
    ],
  },

  // ── How to order / process ──
  {
    patterns: [
      /how (do i|to|can i).*(order|buy|purchase|checkout|place)/i,
      /ordering process|checkout|payment/i,
      /step.?by.?step|walk.*through/i,
    ],
    reply: "Ordering is easy! Here's the step-by-step:\n\n**For Gang Sheets (DTF Transfers):**\n1. Open the Gang Sheet Builder\n2. Choose your sheet size\n3. Upload your PNG designs (300 DPI, transparent background)\n4. Arrange designs on the canvas\n5. Add to cart and checkout\n\n**For Custom Apparel:**\n1. Browse our apparel section\n2. Select a product (brand, color, size)\n3. Click 'Customize This Product' to add your design\n4. Choose quantity, turnaround, and add-ons\n5. Add to cart and checkout\n\n**Payment:** We accept all major credit cards via Square secure checkout.\n**Shipping:** Calculated at checkout based on weight and destination.",
    intent: 'general',
    questions: [
      'What payment methods do you accept?',
      'Is there a minimum order?',
      'How do I upload my design?',
    ],
    actions: [
      { label: 'Start Shopping', url: `${SITE_URL}/shop`, type: 'link' },
      { label: 'Gang Sheet Builder', url: `${SITE_URL}/builder`, type: 'link' },
    ],
  },

  // ── Heat press instructions ──
  {
    patterns: [
      /heat press|pressing|apply|application|temperature|temp|how to press/i,
      /wash|care|laundry|durable|durability|last/i,
    ],
    reply: "Here are the heat press instructions for DTF transfers:\n\n**Application:**\n- Temperature: 300-325°F (150-165°C)\n- Pressure: Medium-firm\n- Time: 10-15 seconds\n- Peel: Warm peel (wait ~5 seconds after pressing)\n- Optional: Re-press for 5 seconds after peeling for extra adhesion\n\n**Care Instructions (for customers):**\n- Wait 24 hours before first wash\n- Wash inside-out in cold water\n- Tumble dry low or hang dry\n- Do NOT iron directly over the transfer\n- Do NOT dry clean\n\n**Durability:** DTF transfers last 50+ washes when applied and cared for properly!",
    intent: 'dtf_info',
    questions: [
      'What heat press do you recommend?',
      'Can I iron DTF transfers?',
      'How long do the prints last?',
    ],
    actions: [
      { label: 'Order Transfers', url: `${SITE_URL}/category/dtf-transfers`, type: 'link' },
    ],
  },
];

// Default fallback when nothing matches
const DEFAULT_FALLBACK: FallbackEntry = {
  patterns: [],
  reply: "Great question! While I think about that, here's what I can help you with:\n\n- **Products & Pricing** — DTF transfers, custom apparel, gang sheets\n- **File Preparation** — Format, resolution, and transparency tips\n- **Order Help** — Tracking, turnaround times, shipping\n- **DTF Info** — How DTF printing works, vs sublimation\n- **Returns** — Our refund and reprint policy\n\nJust ask me about any of these topics, or browse our shop to get started!",
  intent: 'general',
  questions: [
    'What products do you offer?',
    'How does DTF printing work?',
    'What are your prices?',
    'How long does shipping take?',
  ],
  actions: [
    { label: 'Browse Shop', url: `${SITE_URL}/shop`, type: 'link' },
    { label: 'Gang Sheet Builder', url: `${SITE_URL}/builder`, type: 'link' },
    { label: 'Contact Support', url: 'mailto:support@uchooseweprint.com', type: 'link' },
  ],
};

function findBestFallback(message: string): FallbackEntry {
  const lower = message.toLowerCase().trim();

  // Score each fallback by number of matching patterns
  let bestMatch: FallbackEntry | null = null;
  let bestScore = 0;

  for (const entry of SMART_FALLBACKS) {
    let score = 0;
    for (const pattern of entry.patterns) {
      if (pattern.test(lower)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch || DEFAULT_FALLBACK;
}

function fallbackToJson(entry: FallbackEntry): string {
  return JSON.stringify({
    reply: entry.reply,
    intent: entry.intent,
    questions: entry.questions,
    actions: entry.actions,
  });
}

// ─── Main Ollama chat function ──────────────────────────────────

export async function chatWithOllama(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  // Retrieve relevant knowledge
  const context = retrieveContext(userMessage);
  const contextBlock =
    context.length > 0
      ? `\n\nRelevant knowledge base context:\n${context
          .map((c) => `[Source: ${c.source} — ${c.heading}]\n${c.content}`)
          .join('\n\n')}`
      : '';

  const systemMessage = SYSTEM_PROMPT + contextBlock;

  const messages: OllamaMessage[] = [
    { role: 'system', content: systemMessage },
    ...history.slice(-10).map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user', content: userMessage },
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 512,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = (await response.json()) as OllamaResponse;
    return data.message.content;
  } catch {
    // Ollama is down — use smart fallback with full product knowledge
    const match = findBestFallback(userMessage);
    return fallbackToJson(match);
  }
}

export async function checkOllamaHealth(): Promise<{ status: 'ok' | 'down'; model?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${OLLAMA_API_URL}/api/tags`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return { status: 'down' };

    const data = await response.json();
    const models = (data.models || []) as { name: string }[];
    const hasModel = models.some((m) => m.name.startsWith(OLLAMA_MODEL.split(':')[0]));

    return { status: 'ok', model: hasModel ? OLLAMA_MODEL : 'model not found' };
  } catch {
    return { status: 'down' };
  }
}
