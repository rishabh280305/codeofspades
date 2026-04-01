# Clinic OS - Cost Analysis & Pricing Model

## 1. Infrastructure & API Cost Breakdown

### Fixed Monthly Costs

| Component | Service | Cost/Month | Notes |
|-----------|---------|-----------|-------|
| **Hosting** | Vercel Pro | $20 | Serverless functions, auto-scaling |
| **Database** | MongoDB Atlas M2 | $57 | 10GB storage, suitable for patient files |
| **Subtotal Fixed** | | **$77** | |

### Variable Costs (Per 100 Patient Visits/Month)

#### OpenAI GPT-4o
- **Patient Summary**: ~1,000 input tokens, ~400 output tokens
  - Cost per call: $0.005 + $0.006 = **~$0.011**
  - Per 100 visits: **~$1.10**

- **Schedule Briefing** (daily): ~300 input, ~200 output
  - Cost per call: $0.002 + $0.003 = **~$0.005**
  - Per month (30 days): **~$0.15**

- **Analytics Chat** (occasional, ~20 queries/month): **~$0.10**

- **OpenAI Subtotal per 100 visits: ~$1.35**

#### Twilio WhatsApp Messaging
- **Inbound messages**: $0.0079 per message
- **Outbound (template)**: $0.0263 per message
- **Per appointment flow**: ~4 messages avg = **$0.10 per appointment**
- **Per 100 visits: ~$10**

#### ElevenLabs Text-to-Speech
- **Schedule briefing TTS** (daily): ~500 characters
- **Cost**: $0.30 per 1K characters = **$0.15/day** (if using paid)
- **Per month**: **~$4.50**
- *Alternative: Free tier for limited usage*

#### Resend Email Service
- **Free tier**: 50 emails/day = **1,500/month (FREE)**
- Typical clinic usage: 200-400 emails/month ✓ Within free tier
- **Cost: $0 (mostly)**

#### Totals per 100 Visits

| Metric | Cost |
|--------|------|
| OpenAI | $1.35 |
| Twilio | $10.00 |
| ElevenLabs | $4.50 |
| Resend | $0.00 |
| **Variable Total** | **$15.85** |

---

## 2. Monthly Cost Scenarios

### Small Clinic (50 patient visits/month)
```
Fixed costs:        $77
Variable costs:     $7.93 (50 visits × $15.85/100)
Total monthly:      ~$85
Cost per visit:     $1.70
```

### Medium Clinic (150 patient visits/month)
```
Fixed costs:        $77
Variable costs:     $23.77 (150 visits × $15.85/100)
Total monthly:      ~$101
Cost per visit:     $0.67
```

### Large Clinic (300 patient visits/month)
```
Fixed costs:        $77
Variable costs:     $47.55 (300 visits × $15.85/100)
Total monthly:      ~$125
Cost per visit:     $0.42
```

### Enterprise Clinic (800 patient visits/month)
```
Fixed costs:        $77
Variable costs:     $126.80 (800 visits × $15.85/100)
Total monthly:      ~$204
Cost per visit:     $0.26
```

---

## 3. Recommended Dynamic Pricing Tiers

### Option A: Tiered Monthly Pricing (Recommended)

#### Tier 1: Starter Clinic
- **Price**: $149/month
- **Includes**: Up to 50 patient visits
- **Margin**: ~75% (cost: $85)
- **Target**: Solo practitioners, small clinics

#### Tier 2: Growth Clinic
- **Price**: $299/month
- **Includes**: Up to 200 patient visits (50-200)
- **Margin**: ~66% (cost: ~$102)
- **Target**: 2-4 doctor clinics

#### Tier 3: Scale Clinic
- **Price**: $499/month
- **Includes**: Up to 500 patient visits (200-500)
- **Margin**: ~75% (cost: ~$126)
- **Target**: Established multi-doctor clinics

#### Tier 4: Enterprise
- **Price**: Custom (starting $999/month)
- **Includes**: 500+ visits + dedicated support
- **Margin**: ~80%
- **Target**: Hospital networks, franchise clinics

---

### Option B: Per-Visit Dynamic Pricing

```
Monthly Visits    | Price per Visit | Monthly Cost (100 visits as baseline)
0-50              | $3.00           | $150 (minimum)
51-150            | $2.50           | Scales up
151-300           | $2.00           | Scales up
301-500           | $1.50           | Scales up
500+              | $1.00           | Contact sales
```

**Example calculations:**
- 50 visits: $150
- 100 visits: $225
- 200 visits: $400
- 500 visits: $750

---

### Option C: Hybrid Model (Best)

**Base fee + Per-visit overage:**

| Tier | Base Fee | Includes Visits | Overage Rate | Max Visits |
|------|----------|-----------------|--------------|-----------|
| Starter | $99 | 50 | $2.50/extra | 100 |
| Growth | $199 | 150 | $1.75/extra | 300 |
| Scale | $349 | 300 | $1.25/extra | 600 |
| Enterprise | Custom | Unlimited | Negotiated | Unlimited |

**Examples:**
- 50 visits: $99
- 80 visits (Growth): $199 + (80-150 = 0 extra) = $199
- 200 visits (Growth): $199 + (50 extra × $1.75) = $286.50
- 400 visits (Scale): $349 + (100 extra × $1.25) = $474

---

## 4. Pricing Strategy Rationale

### Competitive Positioning
- **Market rate for clinic software**: $150-800/month (EMR, scheduling, analytics)
- **Your advantage**: AI-powered summaries, WhatsApp integration, feedback system
- **Premium positioning**: $300-500/month tier for average clinic

### Margin Analysis
- **Starter**: 75% gross margin (high volume potential)
- **Growth**: 66% gross margin (efficient scale)
- **Scale**: 75% gross margin (operational leverage)
- **Enterprise**: 80%+ gross margin (minimal support overhead at scale)

### Sensitivity
- **Cost-sensitive clinics**: Offer annual discount (15-20% off)
- **Volume discounts**: 10% off for 12-month commitment
- **Features unlock**: WhatsApp ($50/month add-on), Advanced Analytics ($30/month)

---

## 5. Additional Revenue Opportunities

### Optional Add-ons
| Feature | Cost to Build | Price | Est. Adoption |
|---------|---------------|-------|---------------|
| Advanced Doctor Dashboard | $5K | +$29/month | 20% |
| White-label Branding | $3K | +$99/month | 10% |
| SMS Reminders | $2K | +$49/month | 30% |
| Integration (DHIS2/EMR) | $8K | +$149/month | 5% |
| Prescription Module | $6K | +$39/month | 15% |
| Patient App (iOS/Android) | $20K | +$199/month | 10% |

### Support Tiers
- **Community** (Free): Email support, 48h response
- **Standard** (Included): In-app chat, 24h response
- **Priority** ($99/month): Phone/video call, 4h response, dedicated contact

---

## 6. Recommended Launch Pricing

### Go-to-Market (First 100 Customers)
**Early adopter discount: 30% off Year 1**

| Tier | Regular Price | Launch Price | Launch Margin |
|------|---------------|--------------|----------------|
| Starter | $149 | $104 | 22% |
| Growth | $299 | $209 | 51% |
| Scale | $499 | $349 | 63% |

This maintains profitability while building customer base for word-of-mouth.

---

## 7. Breakeven & Profitability Analysis

### Assumptions
- Development cost amortized: $20K over 3 years = $556/month
- Support/maintenance: 15 hours/week @ $40/hr = $2,600/month
- Total overhead: ~$3,200/month

### Breakeven Points
```
Tier 1 (Starter: $149):
  Gross margin per customer: $64
  Customers needed for breakeven: 50

Tier 2 (Growth: $299):
  Gross margin per customer: $198
  Customers needed for breakeven: 16

Tier 3 (Scale: $499):
  Gross margin per customer: $373
  Customers needed for breakeven: 9
```

### Growth Projections
- **Year 1**: 20 customers (mixed tiers) → ~$500/month MRR
- **Year 2**: 100 customers → ~$3,500/month MRR (breakeven + growth)
- **Year 3**: 300 customers → ~$12,000/month MRR

---

## 8. Recommended Pricing Model

### PRIMARY RECOMMENDATION: Hybrid Model (Option C)

**Why?**
- Incentivizes growth (clinics try your product with lower risk)
- Scales with clinic success (aligns incentives)
- Simple to understand and communicate
- Captures upside from high-volume clinics

### Pricing Table (Final)

| Tier | Base Fee/Month | Included Visits | Overage | Best For |
|------|---|---|---|---|
| **Starter** | $99 | 50 | $2.50 each | Solo docs, small clinics |
| **Growth** | $199 | 150 | $1.75 each | Growing 2-4 doc clinics |
| **Scale** | $349 | 300 | $1.25 each | Established clinics |
| **Enterprise** | Custom | Unlimited | Custom | Hospital networks |

---

## 9. Implementation Notes

### How to Track Usage
1. Count `Appointment.status == "COMPLETED"` per month per clinic
2. Send usage email on 1st of month showing visit count
3. Automated billing via Stripe: `base_fee + (overage_visits × overage_rate)`

### Pricing Page Copy
```
"Scale with your clinic. Pay only for what you use."

Starter - $99/month
Perfect for individual practitioners (up to 50 patient visits)
- Full appointment scheduling
- AI patient summaries with image analysis
- Email + WhatsApp reminders
- Patient feedback system

Growth - $199/month
For growing clinics (up to 150 patient visits)
- Everything in Starter, plus:
- WhatsApp appointment bookings
- Doctor analytics dashboard
- Multi-doctor support

Scale - $349/month
For established clinics (up to 300 patient visits)
- Everything in Growth, plus:
- Priority email & phone support
- Custom clinic branding
- Advanced analytics

Each extra visit beyond your tier: $X.XX
```

---

## 10. Payment & Billing

### Setup
- Monthly auto-billing on 1st of month
- Annual payment option: 15% discount
- 30-day free trial (limited to 10 appointments)
- Payment via Stripe (cards, bank transfers)

### Retention
- Cancel anytime (no lock-in after first month)
- Pause billing option (up to 3 months/year)
- Annual discount incentives (save $X with annual plan)
