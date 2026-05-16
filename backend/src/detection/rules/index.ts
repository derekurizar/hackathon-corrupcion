// Side-effect imports: each module calls `registerRule(...)` on load, so
// importing this file populates the `RULES` registry with all 23 rules.
// Order mirrors the RULE_CATALOG ordinals (F1 1-6, F2 7-12, F3 13-17, F4
// 18-23) for deterministic registry order.

// F1 — Competition & method abuse
import './single_bidder.js';
import './low_competition_vs_category.js';
import './direct_award_overreliance.js';
import './highvalue_noncompetitive_method.js';
import './disqualification_clears_field.js';
import './failed_then_single_award.js';

// F2 — Supplier concentration & networks
import './supplier_concentration_per_buyer.js';
import './buyer_dependence_on_supplier.js';
import './supplier_cross_categories.js';
import './repeat_winner_same_competitors.js';
import './new_supplier_large_first_award.js';
import './individual_large_contract.js';

// F3 — Pricing anomalies
import './price_outlier_vs_category.js';
import './buyer_overpays_vs_peers.js';
import './threshold_hugging.js';
import './above_supplier_history_avg.js';
import './low_discount_winner.js';

// F4 — Timing, splitting & integrity
import './contract_splitting.js';
import './burst_clustering.js';
import './short_tender_period.js';
import './fast_award_after_publication.js';
import './weak_documentation.js';
import './cancelled_then_reaward.js';
