# Loomipaw — SEO Growth Plan

The technical SEO foundation is in place: server-rendered product **and**
collection meta + JSON-LD (`Product`, `FAQPage`, `BreadcrumbList`,
`ItemList`), dynamic `sitemap.xml` (with image entries), `robots.txt`,
canonicals, OG/Twitter, fast Core-Web-Vitals-friendly delivery. This plan is
about **growth**: keywords, content, and internal linking to earn organic
traffic.

Product context (real catalog): premium dog apparel, harnesses/leads,
orthopedic beds, leather collars, ID tags, matching human+pet sets. Positioning:
luxury, sustainable (OEKO-TEX®, carbon-neutral), comfort-tested.

---

## 1. Keyword strategy

Three intent tiers — build pages for each:

1. **Transactional** (bottom-funnel) → product + collection pages.
2. **Commercial investigation** ("best…", "vs", "for [breed]") → buying guides.
3. **Informational** (top-funnel) → blog/journal, captures early demand + links.

Map every target keyword to exactly one canonical URL to avoid cannibalization.

### 20 high-intent target keywords

| # | Keyword | Intent | Target page |
|---|---------|--------|-------------|
| 1 | luxury dog harness | Transactional | `/collection.html?category=walking` |
| 2 | orthopedic dog bed | Transactional | Cloud Orthopedic Lounger PDP |
| 3 | merino wool dog sweater | Transactional | Aspen Merino Knit PDP |
| 4 | waterproof dog coat | Transactional | Storm Weatherproof Coat PDP |
| 5 | leather dog collar personalized | Transactional | Heritage Leather Collar PDP |
| 6 | matching dog and owner scarf | Transactional | Duo Matching Scarf Set PDP |
| 7 | no pull dog harness | Commercial | Trailhead Harness PDP + guide |
| 8 | best dog harness for hiking | Commercial | Buying guide → Trailhead |
| 9 | brass dog id tag | Transactional | Explorer Brass ID Tag PDP |
| 10 | dog paw protectors for hot pavement | Commercial | Field Paw Protectors PDP + guide |
| 11 | washable orthopedic dog bed | Commercial | Cloud Lounger / Nap Nest |
| 12 | cashmere dog blanket | Transactional | Cashmere-Blend Throw PDP |
| 13 | sustainable dog accessories | Commercial | `/collection.html?category=accessories` |
| 14 | designer dog clothes | Transactional | `/collection.html?category=apparel` |
| 15 | rope dog leash | Transactional | City Rope Lead PDP |
| 16 | dog bandana linen | Transactional | Sunday Linen Bandana PDP |
| 17 | best dog bed for large dogs | Commercial | Buying guide → beds |
| 18 | how to measure dog for harness | Informational | Blog → Trailhead |
| 19 | winter gear for dogs | Commercial | Seasonal collection/guide |
| 20 | eco friendly pet brand | Commercial | Sustainability page |

**Process:** validate volume/difficulty in your keyword tool, prioritize
low-difficulty + commercial intent first (guides 7, 8, 10, 11, 17 convert fast).

---

## 2. Collection (category) SEO

Now server-rendered per category. To rank, each collection needs **≥150 words
of unique intro copy** above/below the grid (buyer-useful, keyword-natural):
what's in the category, how to choose, materials, sizing, care. Store this in
the category `description` (already surfaced) and expand it.

- Add category-specific FAQ blocks (→ `FAQPage` schema).
- Ensure one H1 per collection reflecting the primary keyword ("Luxury Dog
  Harnesses & Walking Essentials").
- Interlink to the top 3 products and the relevant buying guide.

## 3. Product SEO

- **Titles:** `{Product} — {primary benefit/keyword} | Loomipaw` (unique,
  ≤60 chars). E.g. "Trailhead No-Pull Dog Harness — Adventure-Ready | Loomipaw".
- **Descriptions:** benefit-led, ≤155 chars, one keyword, one hook.
- Keep `Product` + `FAQPage` + `Breadcrumb` schema (done). Add review count to
  schema as reviews accrue (already conditional).
- **Alt text:** descriptive + natural keyword (mostly present).
- Unique body copy per PDP (avoid template-duplicated descriptions).

## 4. Blog / journal strategy

The footer already references a **Journal** — build it. Blog earns top-funnel
traffic and the internal links that lift PDPs. Cadence: **2 posts/week**,
each linking to ≥2 products and ≥1 collection.

### 10 blog topics (mapped to keywords + products)

1. *How to Measure Your Dog for a Harness (Without the Guesswork)* → Trailhead, City Rope Lead.
2. *No-Pull Harness vs. Collar: What's Actually Better for Your Dog?* → Trailhead, Heritage Collar.
3. *The Best Dog Beds for Big Dogs & Senior Joints* → Cloud Orthopedic, Nap Nest.
4. *Merino vs. Fleece: Choosing a Winter Sweater for Your Dog* → Aspen Knit, Storm Coat.
5. *Hot Pavement & Rough Trails: When Your Dog Needs Paw Protection* → Field Paw Protectors.
6. *How to Wash & Care for an Orthopedic Dog Bed* → Cloud Lounger, Cashmere Throw.
7. *What OEKO-TEX® Certified Actually Means for Your Pet's Safety* → brand/sustainability.
8. *A Sustainable Pet Parent's Starter Kit* → accessories collection, bundles.
9. *Matching With Your Dog: Styling Human + Pet Looks* → Duo Scarf Set, Bandana.
10. *Gifts for Dog Lovers: The Loomipaw Guide* → gift bundles, ID tag, collar.

## 5. Internal linking plan

- **Hub-and-spoke:** each collection is a hub; PDPs and guides are spokes that
  link back to the hub and to 2–3 sibling products.
- **PDP → PDP:** "Frequently bought together" + "You may also love" (both live)
  already create contextual product links — good for crawl depth and rankings.
- **Blog → money pages:** every post links to its mapped products + collection
  with descriptive anchor text (not "click here").
- **Breadcrumbs** (schema live) reinforce hierarchy.
- Add footer links to top collections + journal (partials footer already links
  collections; add Journal once built).

## 6. Content calendar (first 8 weeks)

| Week | Blog (2/wk) | On-page task |
|------|-------------|--------------|
| 1 | #1, #2 | Expand walking + apparel collection copy (150+ words) |
| 2 | #3, #4 | Expand beds collection copy; PDP title/description rewrite (beds) |
| 3 | #5, #6 | PDP rewrites (walking); add category FAQs |
| 4 | #7, #8 | Sustainability page; internal-link audit |
| 5 | #9, #10 | PDP rewrites (accessories, matching) |
| 6 | 2 seasonal | Seasonal collection landing (Winter Warmth) |
| 7 | 2 guides | Backlink outreach to pet blogs/press |
| 8 | 2 guides | Review & double down on top performers |

## 7. Off-page (brief)

- Digital PR / guest posts on pet + sustainability blogs (topics above).
- Get listed in "best luxury dog brand" roundups.
- Encourage UGC + reviews (schema-eligible) — social proof compounds rankings.

## 8. Measurement

- Google Search Console: verify (GA method or DNS), submit `/sitemap.xml`,
  track impressions/clicks/position per target keyword.
- GA4: organic landing-page → `purchase` conversion rate.
- Target: **rank page 1** for 5 low-difficulty commercial keywords within 90
  days; grow non-brand organic sessions **month over month** (estimate, not a
  guarantee — depends on competition and content velocity).
