-- ============================================================
-- TestVocacion – Referrals table
-- Run this in Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

CREATE TABLE IF NOT EXISTS referrals (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    referrer_session TEXT    NOT NULL,
    invited_email   TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'completed',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookups by session + status (used by referral-count)
CREATE INDEX IF NOT EXISTS idx_referrals_session_status
    ON referrals (referrer_session, status);

-- Prevent the same referrer from inviting the same email twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_invite
    ON referrals (referrer_session, invited_email);

-- Allow the service-role key used by Netlify Functions to read/write
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
    ON referrals
    FOR ALL
    USING (true)
    WITH CHECK (true);
