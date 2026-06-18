import {
  ArrowLeft,
  ArrowRight,
  Baby,
  BadgeCheck,
  BookmarkCheck,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Heart,
  Info,
  Mail,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Timer,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";

type Priority = "Best option" | "Good with caveats" | "Probably skip";
type RecStatus = "Recommended for you" | "Good with caveats" | "Not our top pick for you";

type Profile = {
  stage: string;
  space: string;
  needs: string[];
  budget: string;
  priorities: string[];
  urgency: string;
};

type Product = {
  id: string;
  name: string;
  image: string;
  price: string;
  priceSource: string;
  status: RecStatus;
  priority: Priority;
  score: number;
  shortReason: string;
  summary: string;
  attributes: string[];
  matches: string[];
  tradeoffs: string[];
  reviewSummary: string[];
  reviewEvidence: { source: string; url: string; summary: string }[];
  sourceLinks: { label: string; url: string }[];
  expertFit: string;
  timing: string;
  reasoning: string[];
};

type SurveyQuestion = {
  key: keyof Profile;
  eyebrow: string;
  title: string;
  helper: string;
  type: "single" | "multi";
  options: { value: string; label: string; description: string }[];
};

type RetailerName = "Amazon" | "Target" | "Walmart" | "IKEA";

type ProductSeed = Omit<
  Product,
  "matches" | "tradeoffs" | "reviewSummary" | "reviewEvidence" | "sourceLinks" | "reasoning"
> & {
  retailerSources: RetailerName[];
  strengths: string[];
  caveats: string[];
  reviewThemes: string[];
};

const defaultProfile: Profile = {
  stage: "starting-solids",
  space: "small-apartment",
  needs: ["easy-cleanup", "compact-storage", "grows-with-child"],
  budget: "mid-range",
  priorities: ["safety", "parent-reviews", "minimal-clutter"],
  urgency: "need-now",
};

const surveyQuestions: SurveyQuestion[] = [
  {
    key: "stage",
    eyebrow: "Baby's stage",
    title: "Where are you in the feeding timeline?",
    helper: "This changes whether we prioritize buying now or researching ahead.",
    type: "single",
    options: [
      { value: "expecting", label: "Expecting", description: "You are planning ahead before baby arrives." },
      { value: "newborn", label: "Newborn", description: "You have time, but want to understand the category." },
      { value: "starting-solids", label: "Starting solids soon", description: "A high chair decision is becoming timely." },
      { value: "eating-solids", label: "Already eating solids", description: "You likely need a practical answer now." },
    ],
  },
  {
    key: "space",
    eyebrow: "Home setup",
    title: "What kind of space will this chair live in?",
    helper: "We use this to avoid recommending beautiful chairs that will annoy you daily.",
    type: "single",
    options: [
      { value: "small-apartment", label: "Small apartment", description: "Every inch and storage decision matters." },
      { value: "house", label: "House", description: "You have more room for a larger footprint." },
      { value: "shared-space", label: "Shared space", description: "You want something easy to move or tuck away." },
      { value: "frequent-travel", label: "Frequent travel", description: "Portability matters more than a permanent setup." },
    ],
  },
  {
    key: "needs",
    eyebrow: "Daily needs",
    title: "What matters most when feeding gets messy?",
    helper: "Choose as many as feel true. These become the recommendation filters.",
    type: "multi",
    options: [
      { value: "easy-cleanup", label: "Easy cleanup", description: "Smooth surfaces, fewer food traps, simple tray." },
      { value: "compact-storage", label: "Compact storage", description: "Folds or tucks away between meals." },
      { value: "grows-with-child", label: "Adjusts as child grows", description: "Longer use window and better value." },
      { value: "aesthetic-design", label: "Aesthetic design", description: "Looks good in your kitchen or dining area." },
      { value: "budget-friendly", label: "Budget-friendly", description: "Keeps cost down without losing basics." },
      { value: "travel-friendly", label: "Travel-friendly", description: "Useful for visiting family or restaurants." },
    ],
  },
  {
    key: "budget",
    eyebrow: "Budget",
    title: "What price range feels comfortable?",
    helper: "We still show tradeoffs when a pricier chair may or may not be worth it.",
    type: "single",
    options: [
      { value: "low", label: "Low", description: "Under roughly $100." },
      { value: "mid-range", label: "Mid-range", description: "Roughly $100 to $250." },
      { value: "premium", label: "Premium", description: "Over roughly $250." },
      { value: "flexible", label: "Flexible", description: "Open to spending more if the fit is strong." },
    ],
  },
  {
    key: "priorities",
    eyebrow: "Decision style",
    title: "What helps you feel confident choosing?",
    helper: "This lets the app show the kind of evidence you care about first.",
    type: "multi",
    options: [
      { value: "safety", label: "Safety", description: "Stable seating, harness, and positioning." },
      { value: "expert-recommended", label: "Expert guidance", description: "Pediatric feeding principles and source links." },
      { value: "parent-reviews", label: "Parent reviews", description: "Common themes from families using it daily." },
      { value: "long-term-value", label: "Long-term value", description: "Use beyond the first feeding phase." },
      { value: "easy-assembly", label: "Easy assembly", description: "Few parts and low setup friction." },
      { value: "minimal-clutter", label: "Minimal clutter", description: "Keeps your home feeling less crowded." },
    ],
  },
  {
    key: "urgency",
    eyebrow: "Timing",
    title: "How soon do you need to decide?",
    helper: "This becomes the buy now, later, or skip guidance.",
    type: "single",
    options: [
      { value: "need-now", label: "Need now", description: "You want a shortlist you can act on." },
      { value: "researching-ahead", label: "Researching ahead", description: "You want clarity before buying later." },
      { value: "unsure", label: "Unsure", description: "You need help deciding whether to prioritize this." },
    ],
  },
];

function retailerUrl(retailer: RetailerName, productName: string) {
  const query = encodeURIComponent(productName);
  if (retailer === "Amazon") return `https://www.amazon.com/s?k=${query}`;
  if (retailer === "Target") return `https://www.target.com/s?searchTerm=${query}`;
  if (retailer === "Walmart") return `https://www.walmart.com/search?q=${query}`;
  return "https://www.ikea.com/us/en/p/antilop-high-chair-with-safety-belt-white-white-s09597514/";
}

function retailerEvidence(productName: string, retailers: RetailerName[], themes: string[]) {
  return retailers.map((retailer) => ({
    source: `${retailer} customer reviews`,
    url: retailerUrl(retailer, productName),
    summary: themes.slice(0, 2).join(" "),
  }));
}

const productSeeds: ProductSeed[] = [
  {
    id: "lalo-chair",
    name: "Lalo The Chair",
    image: "images/lalo-chair.jpg",
    price: "$225",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Recommended for you",
    priority: "Best option",
    score: 91,
    shortReason: "Best current fit for easy cleanup, small-space living, and starting solids soon.",
    summary:
      "We recommend this first because it combines a wipeable chair, adjustable footrest, five-point harness, and a mid-range price without the visual bulk of many multi-stage chairs.",
    attributes: ["Adjustable footrest", "Five-point harness", "Wipeable surfaces", "Mid-range"],
    strengths: [
      "An adjustable footrest and five-point harness align with your safety and positioning priorities.",
      "Smooth surfaces and removable components make this more cleanup-friendly than heavily padded chairs.",
      "The footprint and design are calmer for a small apartment than larger recline-style high chairs.",
      "The $225 price sits inside the mid-range budget you selected.",
    ],
    caveats: [
      "Some retailer-review themes mention checking stability on your own flooring before committing.",
      "It does not fold flat, so it is compact-looking rather than truly stowaway.",
    ],
    reviewThemes: [
      "Retailer shoppers often focus on easy cleanup and a small visual footprint.",
      "Caveat themes tend to mention price and whether the chair feels sturdy enough for the family’s space.",
      "The strongest fit is as a primary everyday chair, not a travel chair.",
    ],
    retailerSources: ["Target", "Amazon"],
    expertFit:
      "This option checks several expert-informed boxes: upright feeding setup, harness use, foot support, and a surface caregivers are more likely to clean consistently.",
    timing:
      "Best option because you said baby is starting solids soon and you need an everyday chair that balances cleanup, support, and apartment-friendly design.",
  },
  {
    id: "ikea-antilop",
    name: "IKEA ANTILOP High Chair",
    image: "images/ikea-antilop.jpg",
    price: "$18.99",
    priceSource: "IKEA U.S. retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 84,
    shortReason: "Excellent budget and cleanup pick, but it needs caveats around foot support and add-ons.",
    summary:
      "This is the strongest value choice if budget and wipe-down cleanup matter most. It is real, widely reviewed, and dramatically cheaper than the rest of the shortlist.",
    attributes: ["Budget-friendly", "Easy cleanup", "Lightweight", "Tray sold separately"],
    strengths: [
      "The IKEA retail page lists the high chair at $18.99 and includes customer reviews.",
      "The hard plastic seat is easy to wipe after messy meals.",
      "The simple frame keeps visual clutter low in a small home.",
      "The low price leaves room for an add-on footrest or cushion if needed.",
    ],
    caveats: [
      "It does not include a footrest, which matters for stable feeding posture.",
      "The tray is a separate purchase depending on configuration.",
      "It is basic and short-lived compared with chairs that convert into toddler or child seating.",
    ],
    reviewThemes: [
      "Retailer reviews commonly center on low price, simple setup, and easy wipe-down cleaning.",
      "The most important caveat is the missing footrest.",
      "Best use case: budget primary chair or backup chair with positioning add-ons considered.",
    ],
    retailerSources: ["IKEA", "Amazon"],
    expertFit:
      "The simple shell is easy to clean, but the missing footrest means caregivers may want an add-on so baby can sit with better body stability.",
    timing:
      "Good with caveats if budget becomes the deciding factor or if you want a backup chair. It is not the top pick because your profile also values expert-informed positioning.",
  },
  {
    id: "stokke-tripp-trapp",
    name: "Stokke Tripp Trapp High Chair 2",
    image: "images/stokke-tripp-trapp.jpg",
    price: "$349",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 82,
    shortReason: "Excellent long-term and expert-aligned chair, but it is premium for your stated budget.",
    summary:
      "This is the strongest long-term option if you decide longevity and table-level ergonomics are worth paying more for.",
    attributes: ["Adjustable footrest", "Grows with child", "300 lb capacity", "Premium"],
    strengths: [
      "The adjustable footrest and seat support better positioning as your child grows.",
      "Retailer reviews consistently discuss long-term use and sturdy construction.",
      "It can come right up to the table, which supports family meals and reduces tray dependence.",
      "The slim wooden frame has a smaller visual footprint than many padded high chairs.",
    ],
    caveats: [
      "At $349, it is above the mid-range budget you chose.",
      "Accessories can increase the total cost depending on the bundle.",
      "Retailer review caveats often mention assembly, add-on costs, and cleaning around straps.",
    ],
    reviewThemes: [
      "Retailer shoppers emphasize long use, stability, and table integration.",
      "Caveats cluster around price, accessories, and assembly time.",
      "Best use case: families who want one chair to last beyond the baby stage.",
    ],
    retailerSources: ["Amazon", "Target"],
    expertFit:
      "Adjustability and foot support are meaningful strengths because they help babies maintain a more stable posture while learning to eat.",
    timing:
      "Good with caveats because it could be a better long-term investment if your budget becomes flexible or if you want one chair to last for years.",
  },
  {
    id: "lalo-hook-on",
    name: "Lalo The Hook-On Chair",
    image: "images/lalo-hook-on.webp",
    price: "$89.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 70,
    shortReason: "A real travel-friendly add-on, not the best everyday first chair.",
    summary:
      "This is a smart secondary chair for restaurants, grandparents' houses, or very tight spaces, but it is not the best primary high chair for early solids at home.",
    attributes: ["Travel-friendly", "Compact", "Machine-washable fabric", "No footrest"],
    strengths: [
      "It saves floor space by attaching to a table or counter.",
      "The official price is under $100, which makes it easier to add later.",
      "Retailer-review themes are strongest around travel and small-space convenience.",
    ],
    caveats: [
      "Clip-on chairs depend on table compatibility and correct installation.",
      "They do not provide the same built-in foot support as a full high chair.",
      "Fabric is more involved to clean than smooth plastic after very messy meals.",
    ],
    reviewThemes: [
      "Retailer shoppers tend to like the portability and small footprint.",
      "Caveats focus on table compatibility, fabric cleanup, and lack of foot support.",
      "Best use case: travel or occasional meals away from your main feeding setup.",
    ],
    retailerSources: ["Amazon", "Target"],
    expertFit:
      "Portable seats can be useful, but a full high chair is often easier for consistent upright positioning, caregiver control, and foot support during early feeding.",
    timing:
      "Good with caveats because your current need is an everyday home setup, not a travel-only solution.",
  },
  {
    id: "graco-table2table",
    name: "Graco Table2Table Premier Fold 7-in-1",
    image: "images/graco-table2table.jpg",
    price: "$199.99",
    priceSource: "Walmart product page, checked June 16, 2026",
    status: "Not our top pick for you",
    priority: "Probably skip",
    score: 56,
    shortReason: "Real and well-reviewed, but too bulky for your small-space, easy-cleanup profile.",
    summary:
      "This is a legitimate multi-stage high chair with strong retailer reviews, but it solves a different problem than yours: versatility over compact simplicity.",
    attributes: ["7-in-1", "Foldable", "Padded seat", "Multi-stage"],
    strengths: [
      "The Walmart product page shows a high customer rating and many reviews.",
      "It folds and converts through multiple seating modes.",
      "It may work well for families who want one bigger system for several stages.",
    ],
    caveats: [
      "The 25-pound product weight and larger frame conflict with minimal clutter.",
      "Padded pieces create more cleaning work than simple plastic or wood surfaces.",
      "A three-point harness is less aligned with your safety-first preference than five-point options.",
      "The $199.99 price is close to the Lalo recommendation without matching its simpler profile.",
    ],
    reviewThemes: [
      "Walmart shows a 4.7-star rating with more than 300 reviews.",
      "Review themes are strongest around value, versatility, and multi-stage use.",
      "The product specs show a larger, heavier chair than the top recommendation.",
      "For your profile, the likely downsides are footprint and cleanup complexity.",
    ],
    retailerSources: ["Walmart", "Target"],
    expertFit:
      "For feeding solids, expert-informed guidance favors upright support, restraint use, and a setup caregivers can use consistently; this chair is capable, but adds bulk and cleaning complexity.",
    timing:
      "Probably skip because it adds bulk and cleaning work without matching your main small-space needs.",
  },
  {
    id: "stokke-clikk",
    name: "Stokke Clikk High Chair",
    image:
      "https://www.stokke.com/dw/image/v2/AAQF_PRD/on/demandware.static/-/Sites-stokke-master-catalog/default/dwe32dcd32/images/inriverimages/mainview/Clikk_Tray_Natural_GlacierGreen_Harness_Cnfg-2_eCom.jpg",
    price: "$179",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Recommended for you",
    priority: "Best option",
    score: 88,
    shortReason: "A strong simple-cleaning alternative with foot support and less long-term cost than Tripp Trapp.",
    summary: "A minimalist full high chair for families who want easy assembly, wipeable parts, and built-in foot support.",
    attributes: ["Footrest", "Easy assembly", "Wipeable", "Mid-range"],
    strengths: [
      "Smooth surfaces and fewer crevices support your cleanup priority.",
      "The included footrest helps with stable seated positioning.",
      "It is lighter and simpler than many multi-stage padded chairs.",
    ],
    caveats: [
      "It is less convertible than grow-with-child wooden chairs.",
      "The footprint is still a full high chair footprint.",
    ],
    reviewThemes: [
      "Retailer review themes usually highlight fast assembly and easy cleanup.",
      "Caveats tend to mention price compared with budget plastic chairs.",
      "Best use case: simple everyday feeding with fewer parts.",
    ],
    retailerSources: ["Amazon", "Target"],
    expertFit: "The Clikk scores well for upright seating, a footrest, and straightforward caregiver use.",
    timing: "Best option if you want a simpler, less expensive alternative to premium grow-with-me chairs.",
  },
  {
    id: "ergobaby-evolve",
    name: "Ergobaby Evolve 3-in-1 High Chair",
    image:
      "https://www.lagoonbaby.com/cdn/shop/products/ergo-evolve-3-in-1-high-chair-natural-wood-alt1_large.jpg?v=1698437733",
    price: "$299",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 80,
    shortReason: "Strong grow-with-child design, but pricey for a first high chair decision.",
    summary: "A convertible high chair that can move from baby feeding to toddler use and helper-style configurations.",
    attributes: ["3-in-1", "Adjustable footrest", "Wood frame", "Premium"],
    strengths: [
      "Multiple configurations support long-term value.",
      "Foot support and harnessing align with expert-informed positioning.",
      "The cleaner modern frame is less visually bulky than padded recliners.",
    ],
    caveats: [
      "The price is above your stated mid-range preference.",
      "Conversion features may matter later more than they matter right now.",
    ],
    reviewThemes: [
      "Retailer shoppers tend to discuss the premium build and long-term versatility.",
      "Caveats center on price and whether every conversion mode is needed.",
      "Best use case: families willing to invest in a longer-use system.",
    ],
    retailerSources: ["Amazon", "Target"],
    expertFit: "Its foot support and upright configuration make it a solid expert-aligned option.",
    timing: "Good with caveats because it is more investment than immediate necessity.",
  },
  {
    id: "peg-perego-siesta",
    name: "Peg Perego Siesta",
    image:
      "https://www.pegperego.com/media/catalog/product/I/M/IMSIESNA01BL06_MAIN_3.jpg?bg-color=255%2C255%2C255&canvas=1092%3A908&fit=bounds&height=908&optimize=medium&width=1092",
    price: "$329.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Not our top pick for you",
    priority: "Probably skip",
    score: 52,
    shortReason: "Feature-rich and comfortable, but too padded and bulky for your cleanup-first profile.",
    summary: "A premium padded chair with recline and wheels that fits families wanting comfort features more than compact simplicity.",
    attributes: ["Recline", "Padded", "Wheels", "Premium"],
    strengths: [
      "Retailer shoppers often like the comfort and adjustability.",
      "It can work for families wanting recline and a more cushioned setup.",
      "The wheeled base helps move it around a larger kitchen.",
    ],
    caveats: [
      "Padding creates more food-trap and laundry work.",
      "The larger frame conflicts with your minimal-clutter answer.",
      "Recline is less relevant once upright solids feeding is the main job.",
    ],
    reviewThemes: [
      "Retailer review themes often praise comfort and sturdiness.",
      "Caveats focus on weight, size, and cleaning around padding.",
      "Best use case: larger homes where comfort features matter more than storage.",
    ],
    retailerSources: ["Amazon", "Target"],
    expertFit: "For starting solids, upright support and ease of consistent cleaning matter more than recline features.",
    timing: "Probably skip because it adds bulk and cleaning work for your current needs.",
  },
  {
    id: "inglesina-fast",
    name: "Inglesina Fast Table Chair",
    image: "https://inglesina.us/cdn/shop/products/InglesinaFastTableChairBlack-Main.jpg?v=1746562396",
    price: "$79-$99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 68,
    shortReason: "Great travel and restaurant option, but not a first everyday feeding chair.",
    summary: "A popular hook-on table chair for small spaces, travel, and occasional meals away from home.",
    attributes: ["Hook-on", "Portable", "Travel-friendly", "No footrest"],
    strengths: [
      "Very compact for small apartments and travel.",
      "Retailer reviews often emphasize restaurant and grandparent-house usefulness.",
      "Lower price makes it easier to add as a second chair.",
    ],
    caveats: [
      "It depends on table compatibility and correct installation.",
      "It does not offer the same foot support as a full chair.",
      "Fabric cleanup can take more work after messy solids.",
    ],
    reviewThemes: [
      "Retailer shoppers tend to praise portability and restaurant use.",
      "Caveats mention table fit, fabric crumbs, and no footrest.",
      "Best use case: secondary chair for travel or occasional meals.",
    ],
    retailerSources: ["Amazon", "Target", "Walmart"],
    expertFit: "Useful for travel, but a full chair is usually better for consistent early-feeding posture.",
    timing: "Good with caveats because your current need is a primary home chair.",
  },
  {
    id: "munchkin-360-cloud",
    name: "Munchkin 360 Cloud High Chair",
    image:
      "https://cdn.shopify.com/s/files/1/0790/4172/4704/files/us-360-cloud-01.jpg?v=1707185444",
    price: "$199.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 74,
    shortReason: "Rotating seat is convenient, but it is not as compact as the top picks.",
    summary: "A modern high chair with a rotating seat that can help caregivers position baby without dragging the chair.",
    attributes: ["360 seat", "Modern design", "Easy wipe", "Mid-range"],
    strengths: [
      "The rotating seat may reduce caregiver friction during meals.",
      "Smooth surfaces help with wipe-down cleaning.",
      "The design is more home-friendly than many padded chairs.",
    ],
    caveats: [
      "Rotation is convenient but not essential to safe feeding.",
      "It is not a fold-flat solution for minimal storage.",
    ],
    reviewThemes: [
      "Retailer shoppers often mention the rotating seat and modern look.",
      "Caveats tend to mention footprint and whether the rotation feature is worth the price.",
      "Best use case: families who like the swivel convenience.",
    ],
    retailerSources: ["Amazon", "Target", "Walmart"],
    expertFit: "It can support upright feeding, but the swivel feature is a convenience rather than an expert requirement.",
    timing: "Good with caveats if swivel access matters more than compact storage.",
  },
  {
    id: "chicco-zest",
    name: "Chicco Zest 4-in-1 High Chair",
    image:
      "https://www.chiccousa.com/dw/image/v2/BLNH_PRD/on/demandware.static/-/Sites-chicco_catalog/default/dwb36b3d83/images/products/Gear/zest/chicco-zest-seasalt-high-chair.jpg?sw=100",
    price: "$109.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 79,
    shortReason: "Good practical value with simpler cleanup, but less premium support than the top pick.",
    summary: "A lightweight multi-use chair that can work as a budget-conscious everyday option.",
    attributes: ["4-in-1", "Lightweight", "Budget-friendly", "Easy wipe"],
    strengths: [
      "Lower price supports value-conscious shopping.",
      "The simple surfaces are easier to wipe than cushioned recliners.",
      "Multi-use modes extend value beyond the first stage.",
    ],
    caveats: [
      "It is less design-forward than premium options.",
      "Foot support and long-term ergonomics are less compelling than Stokke-style chairs.",
    ],
    reviewThemes: [
      "Retailer shoppers often mention value, easy cleanup, and light weight.",
      "Caveats focus on basic materials and fewer premium adjustments.",
      "Best use case: practical mid-budget everyday feeding.",
    ],
    retailerSources: ["Amazon", "Target", "Walmart"],
    expertFit: "A practical chair can still be a good fit if baby is upright, secure, and easy for caregivers to clean.",
    timing: "Good with caveats as a value-oriented backup to the top recommendation.",
  },
  {
    id: "maxi-cosi-moa",
    name: "Maxi-Cosi Moa 8-in-1 High Chair",
    image: "https://maxicosi.com/cdn/shop/files/01-03145CGMT_Main.jpg?v=1757361015&width=5000",
    price: "$179.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 77,
    shortReason: "Versatile and reasonably priced, but conversion complexity may be more than you need.",
    summary: "A multi-mode high chair designed to convert through baby, toddler, and child seating stages.",
    attributes: ["8-in-1", "Convertible", "Mid-range", "Modern"],
    strengths: [
      "Multiple modes support long-term value.",
      "The price is more accessible than premium wood systems.",
      "A modern frame may feel calmer in shared living spaces.",
    ],
    caveats: [
      "Many modes can mean more parts to manage.",
      "Not as compact as hook-on or very simple full-chair options.",
    ],
    reviewThemes: [
      "Retailer shoppers often discuss versatility and value.",
      "Caveats mention setup complexity and whether all modes are useful.",
      "Best use case: families wanting one flexible chair for multiple stages.",
    ],
    retailerSources: ["Amazon", "Target", "Walmart"],
    expertFit: "It can fit expert-informed criteria if configured for upright, supported feeding.",
    timing: "Good with caveats because versatility is useful, but not your highest stated priority.",
  },
  {
    id: "baby-jogger-city-bistro",
    name: "Baby Jogger City Bistro High Chair",
    image:
      "https://i5.walmartimages.com/seo/Baby-Jogger-City-Bistro-High-Chair-Paloma_b8d8479d-db1d-49eb-b2a5-9793846985cf.a2fd837ff324f2be223c694d6f5b9725.jpeg?odnBg=FFFFFF&odnHeight=640&odnWidth=640",
    price: "$279.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 76,
    shortReason: "Compact fold is attractive, but the price is high for a storage-focused pick.",
    summary: "A folding high chair for families who need real storage capability but still want a full chair.",
    attributes: ["Compact fold", "Full chair", "Premium", "Apartment-friendly"],
    strengths: [
      "The compact fold directly supports small-space living.",
      "A full chair gives more structure than a hook-on chair.",
      "Retailer reviews often focus on storage convenience.",
    ],
    caveats: [
      "The price is above many simpler full chairs.",
      "Folding mechanisms can add cleaning and maintenance points.",
    ],
    reviewThemes: [
      "Retailer shoppers tend to like the fold and apartment friendliness.",
      "Caveats center on cost and cleaning around moving parts.",
      "Best use case: families who truly need fold-away storage.",
    ],
    retailerSources: ["Amazon", "Target", "Walmart"],
    expertFit: "A foldable chair can still be expert-aligned when it supports upright feeding and secure restraint use.",
    timing: "Good with caveats if fold-away storage is more important than price.",
  },
  {
    id: "abiie-beyond-junior",
    name: "Abiie Beyond Junior Y High Chair",
    image:
      "https://www.abiie.com/cdn/shop/files/BJRFrontTOPtray_blackpearl_NormalNoFeet_fd514f72-79c9-4fcb-913c-6cacfb3ec138.jpg?v=1761177060&width=1080",
    price: "$219.95",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 78,
    shortReason: "Strong adjustable wood option, but less minimal than the top recommendation.",
    summary: "A wooden grow-with-child chair with adjustability and a more moderate price than some premium systems.",
    attributes: ["Wood", "Adjustable", "Grows with child", "Mid-range"],
    strengths: [
      "Adjustable seat and foot support fit expert-informed feeding priorities.",
      "Longer use can make the price feel more reasonable.",
      "Retailer reviews often focus on sturdiness and convertibility.",
    ],
    caveats: [
      "Wood frames can need more detailed wiping around joints.",
      "It has a more visible furniture presence than very minimal chairs.",
    ],
    reviewThemes: [
      "Retailer shoppers tend to mention sturdiness, adjustability, and long-term use.",
      "Caveats include assembly and cleaning around wood joints.",
      "Best use case: value-minded families who want adjustable wood.",
    ],
    retailerSources: ["Amazon", "Walmart"],
    expertFit: "Adjustable foot support and upright positioning make this a credible expert-aligned option.",
    timing: "Good with caveats if long-term value matters more than ultra-simple cleanup.",
  },
  {
    id: "joovy-nook-nb",
    name: "Joovy Nook NB High Chair",
    image:
      "https://www.joovy.com/cdn/shop/files/joovy_nook_NB_slate_aac2f520-1647-4b5c-838b-6c442f138657.png?v=1749017140&width=1000",
    price: "$149.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 71,
    shortReason: "Foldable and convenient, but padding and tray seams add cleanup caveats.",
    summary: "A foldable high chair with a swing-open tray and more traditional padded-chair feel.",
    attributes: ["Foldable", "Swing tray", "Padded", "Mid-range"],
    strengths: [
      "Foldability helps with storage compared with fixed padded chairs.",
      "The swing-open tray can simplify getting baby in and out.",
      "Retailer reviews often mention convenience and value.",
    ],
    caveats: [
      "Padding is usually harder to clean than one-piece plastic.",
      "It is still bulkier than compact minimalist options.",
    ],
    reviewThemes: [
      "Retailer shoppers often like the fold and tray access.",
      "Caveats mention cleaning fabric and overall footprint.",
      "Best use case: families wanting convenience features at a moderate price.",
    ],
    retailerSources: ["Amazon", "Target", "Walmart"],
    expertFit: "It can support safe feeding, but cleanup consistency may be harder than with wipeable-first picks.",
    timing: "Good with caveats if fold and tray access matter to you.",
  },
  {
    id: "skip-hop-eon",
    name: "Skip Hop Eon 4-in-1 High Chair",
    image:
      "https://dw.cartersstorefront.com/dw/image/v2/AAMK_PRD/on/demandware.static/-/Sites-carters_master_catalog/default/dw10f3500a/productimages/9M494410.jpg?sw=470",
    price: "$175",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 73,
    shortReason: "Stylish and convertible, but not the strongest foot-support pick.",
    summary: "A design-forward convertible chair for families who want baby gear to blend into the home.",
    attributes: ["4-in-1", "Design-forward", "Convertible", "Mid-range"],
    strengths: [
      "The look is calmer than many plastic high chairs.",
      "Convertible modes extend use beyond first solids.",
      "Retailer reviews often mention aesthetics and value.",
    ],
    caveats: [
      "Foot support and adjustability are less compelling than the highest-scoring options.",
      "Convertible parts may add storage complexity.",
    ],
    reviewThemes: [
      "Retailer shoppers tend to like the look and multi-use design.",
      "Caveats focus on support details and parts management.",
      "Best use case: design-conscious families with moderate budgets.",
    ],
    retailerSources: ["Amazon", "Target"],
    expertFit: "It can work, but support details matter more than aesthetics when starting solids.",
    timing: "Good with caveats if aesthetic design is a bigger priority.",
  },
  {
    id: "ingenuity-smartclean-trio",
    name: "Ingenuity SmartClean Trio Elite 3-in-1",
    image:
      "https://www.kids2.com/cdn/shop/files/46b4166c406c6afe3c7dde5ff5244a8dcad5a42c.jpg?crop=center&height=3000&v=1775233787&width=3000",
    price: "$109.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 72,
    shortReason: "Good budget versatility, but not the most compact or expert-aligned option.",
    summary: "A multi-use budget high chair that can convert into booster and toddler seating modes.",
    attributes: ["3-in-1", "Budget-friendly", "Booster mode", "Easy wipe"],
    strengths: [
      "The price is accessible for a multi-use chair.",
      "Retailer reviews often discuss easy wipe-down surfaces.",
      "Conversion modes can add value for families on a budget.",
    ],
    caveats: [
      "It is more utilitarian than design-forward.",
      "Support and footprint are less tailored to your small-space priorities.",
    ],
    reviewThemes: [
      "Retailer shoppers often mention value and multi-use function.",
      "Caveats include size, basic materials, and long-term durability questions.",
      "Best use case: budget-minded families wanting conversion modes.",
    ],
    retailerSources: ["Amazon", "Walmart", "Target"],
    expertFit: "It can be practical if used upright and cleaned consistently, but it is not the strongest support-focused pick.",
    timing: "Good with caveats if price is more important than compact design.",
  },
  {
    id: "fisher-price-spacesaver",
    name: "Fisher-Price SpaceSaver Simple Clean",
    image:
      "https://i5.walmartimages.com/seo/Fisher-Price-SpaceSaver-Simple-Clean-High-Chair-Baby-to-Toddler-Portable-Dining-Seat-Pacific-Pebble_319787c7-a7d3-4b05-8e0b-95f334b08377.7bd8790d6bc8106f3d51b680165942ee.jpeg?odnBg=FFFFFF&odnHeight=573&odnWidth=573",
    price: "$49.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 69,
    shortReason: "Small-space friendly, but better as a chair-mounted booster than a primary full chair.",
    summary: "A chair-mounted high chair/booster that saves floor space and works for compact homes.",
    attributes: ["Space-saving", "Chair-mounted", "Budget", "Booster"],
    strengths: [
      "It avoids a separate floor footprint.",
      "The price is accessible for a secondary setup.",
      "Retailer reviews often mention small-space convenience.",
    ],
    caveats: [
      "It depends on your dining chair and setup.",
      "It may not feel as stable or supportive as a full high chair.",
    ],
    reviewThemes: [
      "Retailer shoppers tend to praise the space savings and price.",
      "Caveats mention chair compatibility and cleaning straps.",
      "Best use case: tight spaces or secondary feeding setup.",
    ],
    retailerSources: ["Amazon", "Target", "Walmart"],
    expertFit: "Chair-mounted boosters can work when securely installed, but full chairs often offer more consistent support.",
    timing: "Good with caveats if saving floor space outweighs full-chair support.",
  },
  {
    id: "evenflo-eat-grow",
    name: "Evenflo 4-in-1 Eat & Grow",
    image: "https://www.evenflo.com/cdn/shop/products/bqzbtckgkrwjmwqe0fdm.jpg?v=1735941029&width=1445",
    price: "$69.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 67,
    shortReason: "Very affordable multi-stage choice, but less refined for cleanup and support.",
    summary: "A low-cost convertible high chair aimed at families who want basic functionality without premium pricing.",
    attributes: ["4-in-1", "Budget", "Lightweight", "Convertible"],
    strengths: [
      "Low price supports budget-conscious shopping.",
      "Multiple modes can extend use.",
      "Retailer reviews often mention value for the money.",
    ],
    caveats: [
      "It is less compact and less polished than higher-scoring picks.",
      "Support features are more basic.",
    ],
    reviewThemes: [
      "Retailer shoppers usually mention affordability and simple function.",
      "Caveats mention basic construction and cleanup around parts.",
      "Best use case: low-cost starter chair.",
    ],
    retailerSources: ["Amazon", "Target", "Walmart"],
    expertFit: "It may be acceptable if baby is upright and secure, but it is not the strongest support or cleanup pick.",
    timing: "Good with caveats if budget becomes the deciding factor.",
  },
  {
    id: "boon-grub",
    name: "Boon Grub Adjustable High Chair",
    image:
      "https://www.albeebaby.com/cdn/shop/files/boon-grub-dishwasher-safe-adjustable-baby-high-chair-white-245.jpg?v=1763805532&width=1946",
    price: "$219.99",
    priceSource: "Retailer price snapshot, checked June 16, 2026",
    status: "Good with caveats",
    priority: "Good with caveats",
    score: 75,
    shortReason: "Adjustable and modern, but not clearly stronger than the top recommendation.",
    summary: "A modern adjustable high chair with a cleanable design and grow-with-child positioning.",
    attributes: ["Adjustable", "Modern", "Easy clean", "Mid-range"],
    strengths: [
      "Adjustability supports better fit over time.",
      "The clean modern build aligns with minimal-clutter priorities.",
      "Retailer reviews often mention appearance and wipeability.",
    ],
    caveats: [
      "It is not as established as some category classics.",
      "Price is close to the top recommendation without clearly beating it.",
    ],
    reviewThemes: [
      "Retailer shoppers tend to mention modern design and wipeability.",
      "Caveats focus on price and whether the feature set stands out.",
      "Best use case: families who want a modern adjustable chair.",
    ],
    retailerSources: ["Amazon", "Target"],
    expertFit: "Adjustability can help with posture, but the chair still needs to fit your baby and space well.",
    timing: "Good with caveats as a comparison option near the top pick.",
  },
];

const products: Product[] = productSeeds.map((seed) => {
  const reviewEvidence = retailerEvidence(seed.name, seed.retailerSources, seed.reviewThemes);
  return {
    ...seed,
    matches: seed.strengths,
    tradeoffs: seed.caveats,
    reviewSummary: seed.reviewThemes,
    reviewEvidence,
    sourceLinks: reviewEvidence.map((source) => ({ label: source.source, url: source.url })),
    reasoning: [
      "Your profile emphasizes easy cleanup, small-space living, safety, and confidence from parent reviews.",
      `${seed.name} scores ${seed.score}% because it matches ${seed.attributes.slice(0, 3).join(", ").toLowerCase()}.`,
      seed.reviewThemes[0],
      seed.caveats[0],
    ],
  };
});

const labelDescription: Record<Priority, string> = {
  "Best option": "A strong match for your stage, budget, and daily constraints. Worth acting on first.",
  "Good with caveats": "A useful option with a real caveat, or a better fit if your needs change.",
  "Probably skip": "A mismatch for your stated priorities, even if it may be good for someone else.",
};

function App() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [sourceModal, setSourceModal] = useState<string | null>(null);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [reviewsFor, setReviewsFor] = useState<Product | null>(null);
  const [saveFor, setSaveFor] = useState<Product | null>(null);

  return (
    <>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/survey/:step" element={<Survey profile={profile} setProfile={setProfile} />} />
        <Route path="/loading" element={<Loading profile={profile} />} />
        <Route
          path="/shortlist"
          element={
            <Shortlist
              profile={profile}
              onPriority={() => setPriorityOpen(true)}
              onSource={setSourceModal}
            />
          }
        />
        <Route
          path="/marketplace"
          element={
            <Marketplace
              profile={profile}
              onPriority={() => setPriorityOpen(true)}
              onSource={setSourceModal}
            />
          }
        />
        <Route
          path="/product/:id"
          element={
            <ProductDetail
              profile={profile}
              onSource={setSourceModal}
              onReviews={setReviewsFor}
              onSave={setSaveFor}
            />
          }
        />
      </Routes>

      {sourceModal && <SourceModal source={sourceModal} onClose={() => setSourceModal(null)} />}
      {priorityOpen && <PriorityModal onClose={() => setPriorityOpen(false)} />}
      {reviewsFor && <ReviewsModal product={reviewsFor} onClose={() => setReviewsFor(null)} />}
      {saveFor && <SaveModal product={saveFor} onClose={() => setSaveFor(null)} />}
    </>
  );
}

function Welcome() {
  return (
    <main className="welcome-page">
      <section className="welcome-shell">
        <div className="welcome-copy">
          <div className="brand-lockup">
            <span className="brand-mark">
              <Baby size={22} />
            </span>
            <span>High Chair Match</span>
          </div>
          <h1>Find the high chair that fits your actual life.</h1>
          <p>
            Answer a few questions about your baby, home, budget, and feeding priorities. Then get a
            focused shortlist with clear reasons, review themes, and expert-informed guidance.
          </p>
          <div className="welcome-actions">
            <Link className="button primary" to="/survey/0">
              Start matching <ArrowRight size={18} />
            </Link>
            <Link className="button ghost" to="/shortlist">
              View demo shortlist <ChevronRight size={18} />
            </Link>
          </div>
        </div>
        <div className="product-ribbon" aria-label="Preview of high chair options">
          {products.slice(0, 3).map((product) => (
            <div className="ribbon-item" key={product.id}>
              <img src={product.image} alt="" />
              <span>{product.priority}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Survey({ profile, setProfile }: { profile: Profile; setProfile: (profile: Profile) => void }) {
  const { step = "0" } = useParams();
  const navigate = useNavigate();
  const index = Math.min(Number(step), surveyQuestions.length - 1);
  const question = surveyQuestions[index];
  const progress = ((index + 1) / surveyQuestions.length) * 100;

  const selectedValue = profile[question.key];

  function updateSingle(value: string) {
    setProfile({ ...profile, [question.key]: value });
  }

  function updateMulti(value: string) {
    const current = profile[question.key] as string[];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    setProfile({ ...profile, [question.key]: next });
  }

  function goNext() {
    if (index === surveyQuestions.length - 1) {
      navigate("/loading");
      return;
    }
    navigate(`/survey/${index + 1}`);
  }

  return (
    <main className="app-page">
      <TopBar />
      <section className="survey-layout">
        <div className="survey-aside">
          <div className="progress-label">
            Step {index + 1} of {surveyQuestions.length}
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <h2>Your answers shape the shortlist.</h2>
          <p>
            The prototype uses each choice to make tradeoffs visible: what to buy now, what to wait on,
            and what probably creates more work than value.
          </p>
        </div>

        <div className="survey-panel">
          <span className="eyebrow">{question.eyebrow}</span>
          <h1>{question.title}</h1>
          <p>{question.helper}</p>
          <div className="option-grid">
            {question.options.map((option) => {
              const active =
                question.type === "single"
                  ? selectedValue === option.value
                  : (selectedValue as string[]).includes(option.value);
              return (
                <button
                  className={`choice ${active ? "active" : ""}`}
                  key={option.value}
                  onClick={() =>
                    question.type === "single" ? updateSingle(option.value) : updateMulti(option.value)
                  }
                  type="button"
                >
                  <span className="choice-check">{active && <Check size={16} />}</span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </button>
              );
            })}
          </div>
          <div className="survey-nav">
            <button
              className="button secondary"
              disabled={index === 0}
              onClick={() => navigate(`/survey/${index - 1}`)}
              type="button"
            >
              <ArrowLeft size={18} /> Back
            </button>
            <button className="button primary" onClick={goNext} type="button">
              {index === surveyQuestions.length - 1 ? "Find my shortlist" : "Next"} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Loading({ profile }: { profile: Profile }) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => navigate("/shortlist"), 1400);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="app-page centered-page">
      <div className="loading-card">
        <div className="spinner">
          <Sparkles size={30} />
        </div>
        <h1>Based on your needs, we found the most relevant chairs for your family.</h1>
        <p>
          Prioritizing {humanize(profile.stage)}, {humanize(profile.space)}, {humanize(profile.budget)} budget,
          and {profile.needs.slice(0, 2).map(humanize).join(" + ")}.
        </p>
      </div>
    </main>
  );
}

function Shortlist({
  profile,
  onPriority,
  onSource,
}: {
  profile: Profile;
  onPriority: () => void;
  onSource: (source: string) => void;
}) {
  const shortlist = products.filter(
    (product) =>
      ["Best option", "Good with caveats"].includes(product.priority) &&
      ["lalo-chair", "ikea-antilop", "stokke-tripp-trapp", "stokke-clikk"].includes(product.id),
  );

  return (
    <main className="app-page">
      <TopBar />
      <section className="results-header">
        <div>
          <span className="eyebrow">Personalized shortlist</span>
          <h1>Start with these 4, not every high chair on the internet.</h1>
          <p>
            We narrowed the category around your stage, space, cleanup needs, budget, and confidence signals.
          </p>
        </div>
        <ProfileSnapshot profile={profile} />
      </section>

      <ExpertGuidancePreview onSource={onSource} />

      <div className="utility-row">
        <button className="inline-button" onClick={onPriority} type="button">
          <Info size={17} /> What do these priority labels mean?
        </button>
        <Link className="inline-button" to="/marketplace">
          <Search size={17} /> See more high chair options
        </Link>
      </div>

      <section className="product-grid shortlist-grid">
        {shortlist.map((product) => (
          <ProductCard product={product} key={product.id} />
        ))}
      </section>
    </main>
  );
}

function Marketplace({
  profile,
  onPriority,
  onSource,
}: {
  profile: Profile;
  onPriority: () => void;
  onSource: (source: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | Priority>("all");
  const shown = filter === "all" ? products : products.filter((product) => product.priority === filter);

  return (
    <main className="app-page">
      <TopBar />
      <section className="market-header">
        <Link className="back-link" to="/shortlist">
          <ArrowLeft size={17} /> Back to shortlist
        </Link>
        <div className="market-copy">
          <span className="eyebrow">Expanded marketplace</span>
          <h1>More options, still sorted by fit.</h1>
          <p>
            The app can expand the category, but keeps the recommendation logic visible so browsing does not
            become another open-ended research spiral.
          </p>
        </div>
        <ProfileSnapshot profile={profile} />
      </section>

      <ExpertGuidancePreview onSource={onSource} />

      <div className="filter-row">
        {(["all", "Best option", "Good with caveats", "Probably skip"] as const).map((item) => (
          <button className={filter === item ? "filter active" : "filter"} key={item} onClick={() => setFilter(item)} type="button">
            {item}
          </button>
        ))}
        <button className="inline-button priority-help" onClick={onPriority} type="button">
          <Info size={17} /> Priority guide
        </button>
      </div>

      <section className="product-grid">
        {shown.map((product) => (
          <ProductCard product={product} key={product.id} compact />
        ))}
      </section>
    </main>
  );
}

function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <article className={`product-card ${product.priority === "Probably skip" ? "muted-card" : ""}`}>
      <div className="product-image-wrap">
        <img src={product.image} alt={`${product.name} product render`} />
        <span className={`priority-badge ${priorityClass(product.priority)}`}>{product.priority}</span>
      </div>
      <div className="product-content">
        <div className="status-line">
          <BadgeCheck size={16} />
          <span>{product.status}</span>
        </div>
        <h2>{product.name}</h2>
        <div className="price-row">
          <span>{product.price}</span>
          <span>{product.score}% fit</span>
        </div>
        <small className="price-source">{product.priceSource}</small>
        <p>{product.shortReason}</p>
        <div className="tag-row">
          {product.attributes.slice(0, compact ? 3 : 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <Link className="button card-button" to={`/product/${product.id}`}>
          View details <ChevronRight size={17} />
        </Link>
      </div>
    </article>
  );
}

function ProductDetail({
  profile,
  onSource,
  onReviews,
  onSave,
}: {
  profile: Profile;
  onSource: (source: string) => void;
  onReviews: (product: Product) => void;
  onSave: (product: Product) => void;
}) {
  const { id } = useParams();
  const product = products.find((item) => item.id === id) ?? products[0];
  const related = products.filter((item) => item.id !== product.id).slice(0, 2);
  const [hasPromptedSave, setHasPromptedSave] = useState(false);

  function openSaveModal() {
    setHasPromptedSave(true);
    onSave(product);
  }

  useEffect(() => {
    setHasPromptedSave(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [product.id]);

  useEffect(() => {
    if (hasPromptedSave) return;

    const timer = window.setTimeout(() => openSaveModal(), 20000);
    return () => window.clearTimeout(timer);
  }, [hasPromptedSave, product.id]);

  return (
    <main className="app-page detail-page">
      <TopBar />
      <Link className="back-link" to="/shortlist">
        <ArrowLeft size={17} /> Back to recommendations
      </Link>

      <section className="detail-hero">
        <div className="detail-image">
          <img src={product.image} alt={`${product.name} product render`} />
        </div>
        <div className="detail-summary">
          <span className={`priority-badge static ${priorityClass(product.priority)}`}>{product.priority}</span>
          <h1>{product.name}</h1>
          <div className="detail-meta">
            <span>{product.price}</span>
            <span>{product.score}% fit</span>
            <span>{product.status}</span>
          </div>
          <p>{product.summary}</p>
          <div className="detail-actions">
            <button className="button primary" onClick={openSaveModal} type="button">
              <BookmarkCheck size={18} /> Save recommendation
            </button>
            <button className="button secondary" onClick={() => onReviews(product)} type="button">
              <ClipboardList size={18} /> Show review evidence
            </button>
          </div>
        </div>
      </section>

      <section className="section-band source-link-band">
        <div className="section-heading">
          <span className="eyebrow">Product sources</span>
          <h2>Price and review receipts</h2>
        </div>
        <div className="source-link-list">
          {product.sourceLinks.map((source) => (
            <a href={source.url} key={source.url} rel="noreferrer" target="_blank">
              {source.label}
              <ChevronRight size={17} />
            </a>
          ))}
        </div>
      </section>

      <section className="detail-grid">
        <InfoBlock title="Why it matches" icon={<Check size={18} />} items={product.matches} />
        <InfoBlock title="Why it might not" icon={<Info size={18} />} items={product.tradeoffs} subtle />
      </section>

      <section className="section-band">
        <div className="section-heading">
          <span className="eyebrow">Parent review summary</span>
          <h2>What parents commonly mention</h2>
        </div>
        <div className="review-list">
          {product.reviewSummary.map((item) => (
            <div className="review-theme" key={item}>
              <Star size={17} />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <button className="inline-button" onClick={() => onReviews(product)} type="button">
          <ClipboardList size={17} /> Open review evidence
        </button>
      </section>

      <section className="section-band expert-band">
        <div>
          <span className="eyebrow">Expert guidance</span>
          <h2>What matters in a high chair</h2>
          <p>{product.expertFit}</p>
          <p>
            Pediatric feeding experts generally emphasize safe, upright positioning, stable support,
            appropriate harness use, and a chair caregivers can clean and use consistently.
          </p>
        </div>
        <div className="source-buttons">
          <button className="source-button" onClick={() => onSource("scientific")} type="button">
            <ShieldCheck size={18} /> View scientific source
          </button>
          <button className="source-button" onClick={() => onSource("pediatric")} type="button">
            <Heart size={18} /> View pediatric guidance
          </button>
          <button className="source-button" onClick={() => onSource("foot-support")} type="button">
            <Baby size={18} /> Why foot support matters
          </button>
        </div>
      </section>

      <section className="reasoning-section">
        <div className="section-heading">
          <span className="eyebrow">Why we picked this</span>
          <h2>Recommendation reasoning and sourcing</h2>
          <p>
            We combined your stated needs with product attributes, review themes, expert-informed criteria,
            budget fit, and lifestyle fit.
          </p>
        </div>
        <div className="reasoning-grid">
          <ReasoningCard icon={<Baby size={19} />} title="Your needs" items={[humanize(profile.stage), humanize(profile.space), ...profile.needs.slice(0, 2).map(humanize)]} />
          <ReasoningCard icon={<ShoppingBag size={19} />} title="Product fit" items={product.attributes.slice(0, 4)} />
          <ReasoningCard icon={<Star size={19} />} title="Review themes" items={product.reviewSummary.slice(0, 3)} />
          <ReasoningCard icon={<ShieldCheck size={19} />} title="Expert criteria" items={["Upright posture", "Stable support", "Caregiver usability"]} />
        </div>
        <div className="picked-copy">
          {product.reasoning.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section className="section-band timing-band">
        <div>
          <span className="eyebrow">Buy timing</span>
          <h2>{product.priority}</h2>
          <p>{product.timing}</p>
        </div>
        <button className="button primary" onClick={openSaveModal} type="button">
          <Mail size={18} /> Email this recommendation
        </button>
      </section>

      <section className="related-section">
        <div className="section-heading">
          <span className="eyebrow">Compare next</span>
          <h2>Other recommendations nearby</h2>
        </div>
        <div className="mini-grid">
          {related.map((item) => (
            <ProductCard compact key={item.id} product={item} />
          ))}
        </div>
      </section>
    </main>
  );
}

function TopBar() {
  return (
    <header className="top-bar">
      <Link className="brand-lockup small" to="/">
        <span className="brand-mark">
          <Baby size={18} />
        </span>
        <span>High Chair Match</span>
      </Link>
      <nav>
        <Link to="/survey/0">Survey</Link>
        <Link to="/shortlist">Shortlist</Link>
        <Link to="/marketplace">More options</Link>
      </nav>
    </header>
  );
}

function ProfileSnapshot({ profile }: { profile: Profile }) {
  const chips = [humanize(profile.stage), humanize(profile.space), humanize(profile.budget), humanize(profile.urgency)];
  return (
    <aside className="profile-snapshot">
      <div>
        <Timer size={18} />
        <strong>Your match inputs</strong>
      </div>
      <div className="snapshot-chips">
        {chips.map((chip) => (
          <span key={chip}>{chip}</span>
        ))}
      </div>
    </aside>
  );
}

function InfoBlock({
  title,
  icon,
  items,
  subtle = false,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  subtle?: boolean;
}) {
  return (
    <section className={`info-block ${subtle ? "subtle" : ""}`}>
      <h2>
        {icon}
        {title}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ReasoningCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="reasoning-card">
      <h3>
        {icon}
        {title}
      </h3>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function ExpertGuidancePreview({ onSource }: { onSource: (source: string) => void }) {
  return (
    <section className="section-band expert-band shortlist-expert-band">
      <div className="shortlist-expert-copy">
        <span className="eyebrow">Expert guidance</span>
        <h2>What matters in a high chair</h2>
        <p>
          The shortest version: upright posture, stable support, harness use, easy cleanup, and foot support
          when possible.
        </p>
      </div>
      <div className="expert-guidance-points">
        {[
          "Upright, stable seating for solids",
          "Harness use at every meal",
          "Easy-to-clean surfaces parents will actually maintain",
          "Foot support helps babies stay more grounded",
        ].map((point) => (
          <div className="review-theme" key={point}>
            <ShieldCheck size={17} />
            <span>{point}</span>
          </div>
        ))}
        <div className="source-buttons compact-source-buttons">
          <button className="source-button" onClick={() => onSource("scientific")} type="button">
            <ShieldCheck size={18} /> View scientific source
          </button>
          <button className="source-button" onClick={() => onSource("pediatric")} type="button">
            <Heart size={18} /> View pediatric guidance
          </button>
          <button className="source-button" onClick={() => onSource("foot-support")} type="button">
            <Baby size={18} /> Why foot support matters
          </button>
        </div>
      </div>
    </section>
  );
}

function SourceModal({ source, onClose }: { source: string; onClose: () => void }) {
  const content = {
    scientific: {
      title: "CDC and CPSC safety context",
      copy:
        "The CDC readiness guidance emphasizes head and neck control plus sitting alone or with support before solids. CPSC's high chair safety standard focuses on reducing injuries from falls and restraint/structural failures.",
      links: [
        {
          label: "CDC: when and how to introduce solid foods",
          url: "https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/when-what-and-how-to-introduce-solid-foods.html",
        },
        {
          label: "CPSC high chair safety standard",
          url: "https://www.cpsc.gov/Newsroom/News-Releases/2018/CPSC-Approves-New-Federal-Safety-Standard-for-High-Chairs",
        },
      ],
    },
    pediatric: {
      title: "Pediatric and feeding-expert guidance",
      copy:
        "The app prioritizes upright seated support, harness use, caregiver supervision, and chairs that parents can clean consistently. These are product-choice signals, not medical advice.",
      links: [
        {
          label: "CDC: introducing solid foods",
          url: "https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/when-what-and-how-to-introduce-solid-foods.html",
        },
        {
          label: "CPSC: high chair safety standard",
          url: "https://www.cpsc.gov/Newsroom/News-Releases/2018/CPSC-Approves-New-Federal-Safety-Standard-for-High-Chairs",
        },
      ],
    },
    "foot-support": {
      title: "Why foot support matters",
      copy:
        "Stable foot support can help babies maintain posture while learning to eat. That is why chairs with adjustable footrests score better for early feeding than options with dangling feet.",
      links: [
        {
          label: "CDC: introducing solid foods",
          url: "https://www.cdc.gov/infant-toddler-nutrition/foods-and-drinks/when-what-and-how-to-introduce-solid-foods.html",
        },
        {
          label: "CPSC: high chair safety standard",
          url: "https://www.cpsc.gov/Newsroom/News-Releases/2018/CPSC-Approves-New-Federal-Safety-Standard-for-High-Chairs",
        },
      ],
    },
  }[source] ?? {
    title: "Source",
    copy: "This prototype links recommendation claims back to product, review, and expert sources.",
    links: [],
  };

  return (
    <Modal onClose={onClose}>
      <span className="modal-icon">
        <ShieldCheck size={22} />
      </span>
      <h2>{content.title}</h2>
      <p>{content.copy}</p>
      {"links" in content && content.links.length > 0 && (
        <div className="modal-link-list">
          {content.links.map((link) => (
            <a href={link.url} key={link.url} rel="noreferrer" target="_blank">
              {link.label}
              <ChevronRight size={17} />
            </a>
          ))}
        </div>
      )}
      <button className="button primary full" onClick={onClose} type="button">
        Got it
      </button>
    </Modal>
  );
}

function PriorityModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <span className="modal-icon">
        <Clock size={22} />
      </span>
      <h2>Priority labels</h2>
      <div className="priority-explainers">
        {(Object.keys(labelDescription) as Priority[]).map((label) => (
          <div key={label}>
            <span className={`priority-badge static ${priorityClass(label)}`}>{label}</span>
            <p>{labelDescription[label]}</p>
          </div>
        ))}
      </div>
      <button className="button primary full" onClick={onClose} type="button">
        Back to recommendations
      </button>
    </Modal>
  );
}

function ReviewsModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <span className="modal-icon">
        <ClipboardList size={22} />
      </span>
      <h2>Review evidence</h2>
      <p className="modal-subtitle">{product.name}</p>
      <p>
        These are paraphrased review themes and source notes from real retailer product pages and customer
        review listings.
      </p>
      <div className="evidence-list">
        {product.reviewEvidence.map((evidence) => (
          <article className="evidence-card" key={evidence.url + evidence.source}>
            <h3>{evidence.source}</h3>
            <p>{evidence.summary}</p>
            <a href={evidence.url} rel="noreferrer" target="_blank">
              View source <ChevronRight size={16} />
            </a>
          </article>
        ))}
      </div>
      <button className="button primary full" onClick={onClose} type="button">
        Close evidence
      </button>
    </Modal>
  );
}

function SaveModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <Modal onClose={onClose}>
      <span className="modal-icon">
        <Mail size={22} />
      </span>
      {sent ? (
        <>
          <h2>Recommendation saved</h2>
          <p>Thank you! You will receive your recommendation via email shortly.</p>
          <button className="button primary full" onClick={onClose} type="button">
            Done
          </button>
        </>
      ) : (
        <>
          <h2>Send this recommendation to yourself</h2>
          <p>Enter an email to save {product.name}, review themes, and why it matched your profile.</p>
          <form className="email-form" onSubmit={submit}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />
            <button className="button primary full" type="submit">
              Save recommendation
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal" role="dialog">
        <button aria-label="Close modal" className="icon-button modal-close" onClick={onClose} type="button">
          <X size={19} />
        </button>
        {children}
      </section>
    </div>
  );
}

function humanize(value: string) {
  return value
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function priorityClass(priority: Priority) {
  if (priority === "Best option") return "buy";
  if (priority === "Good with caveats") return "later";
  return "skip";
}

export default App;
