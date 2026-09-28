-- LOCAL-ONLY maintenance script.
-- Run only after exporting a local D1 backup. This removes the obsolete
-- finance/bookkeeping prototype that was explicitly excluded from the church
-- website. It does not touch prayer, content, inquiries, staff, or public
-- PayMongo checkout records in active website schema.

DROP TRIGGER IF EXISTS adjustments_authorized_approver;
DROP TRIGGER IF EXISTS adjustments_confirmed_contribution_insert;
DROP TRIGGER IF EXISTS adjustments_no_delete;
DROP TRIGGER IF EXISTS adjustments_positive_balance_approval;
DROP TRIGGER IF EXISTS adjustments_request_immutable;
DROP TRIGGER IF EXISTS adjustments_single_decision;
DROP TRIGGER IF EXISTS contributors_no_delete;
DROP TRIGGER IF EXISTS contributions_active_category_insert;
DROP TRIGGER IF EXISTS contributions_immutable_after_confirmation;
DROP TRIGGER IF EXISTS contributions_no_delete;
DROP TRIGGER IF EXISTS giving_categories_active_treasurer_insert;
DROP TRIGGER IF EXISTS giving_categories_code_immutable;
DROP TRIGGER IF EXISTS giving_categories_no_delete;
DROP TRIGGER IF EXISTS offline_details_active_treasurer_insert;
DROP TRIGGER IF EXISTS offline_details_active_treasurer_verify;
DROP TRIGGER IF EXISTS offline_details_entry_immutable;
DROP TRIGGER IF EXISTS offline_details_no_delete;
DROP TRIGGER IF EXISTS offline_details_single_decision;
DROP TRIGGER IF EXISTS offline_details_source_guard;
DROP TRIGGER IF EXISTS online_transactions_no_delete;
DROP TRIGGER IF EXISTS online_transactions_source_guard;
DROP TRIGGER IF EXISTS receipt_request_immutable;
DROP TRIGGER IF EXISTS receipts_confirmed_contribution_insert;
DROP TRIGGER IF EXISTS receipts_no_delete;
DROP TRIGGER IF EXISTS receipts_requester_immutable;
DROP TRIGGER IF EXISTS refunds_authorized_approver;
DROP TRIGGER IF EXISTS refunds_balance_recheck_approval;
DROP TRIGGER IF EXISTS refunds_completion_identity_immutable;
DROP TRIGGER IF EXISTS refunds_confirmed_contribution_insert;
DROP TRIGGER IF EXISTS refunds_no_delete;
DROP TRIGGER IF EXISTS refunds_prevent_over_refund_insert;
DROP TRIGGER IF EXISTS refunds_request_immutable;
DROP TRIGGER IF EXISTS refunds_valid_transitions;

DROP TABLE IF EXISTS contribution_adjustments;
DROP TABLE IF EXISTS contribution_refunds;
DROP TABLE IF EXISTS offline_contribution_details;
DROP TABLE IF EXISTS online_payment_transactions;
DROP TABLE IF EXISTS receipt_requests;
DROP TABLE IF EXISTS contributions;
DROP TABLE IF EXISTS giving_categories;
DROP TABLE IF EXISTS contributors;
