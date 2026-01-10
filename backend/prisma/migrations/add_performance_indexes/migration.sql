-- Performance Indexes Migration
-- Run: npx prisma migrate dev --name add_performance_indexes

-- ============================================
-- Conversation Indexes
-- ============================================

-- Fast user conversation listing
CREATE INDEX IF NOT EXISTS idx_conversation_user_updated 
ON "conversations"("user_id", "updated_at" DESC);

-- Project-based conversation listing
CREATE INDEX IF NOT EXISTS idx_conversation_project_updated 
ON "conversations"("project_id", "updated_at" DESC);

-- Archived conversations filter
CREATE INDEX IF NOT EXISTS idx_conversation_archived 
ON "conversations"("user_id", "is_archived");

-- Pinned conversations
CREATE INDEX IF NOT EXISTS idx_conversation_pinned 
ON "conversations"("user_id", "is_pinned");

-- ============================================
-- Message Indexes
-- ============================================

-- Message listing by conversation (chronological)
CREATE INDEX IF NOT EXISTS idx_message_conversation_created 
ON "messages"("conversation_id", "created_at" DESC);

-- Message role filtering
CREATE INDEX IF NOT EXISTS idx_message_role 
ON "messages"("conversation_id", "role");

-- ============================================
-- Full-Text Search Indexes
-- ============================================

-- Conversation title search
CREATE INDEX IF NOT EXISTS idx_conversation_title_search 
ON "conversations" USING GIN(to_tsvector('english', "title"));

-- Message content search
CREATE INDEX IF NOT EXISTS idx_message_content_search 
ON "messages" USING GIN(to_tsvector('english', "content"));

-- ============================================
-- Analytics Indexes
-- ============================================

-- User analytics by date
CREATE INDEX IF NOT EXISTS idx_analytics_user_date 
ON "analytics"("user_id", "date" DESC);

-- ============================================
-- Webhook Indexes
-- ============================================

-- Active webhooks for user
CREATE INDEX IF NOT EXISTS idx_webhook_user_active 
ON "webhooks"("user_id", "is_active");

-- Webhook delivery history
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_created 
ON "webhook_deliveries"("webhook_id", "created_at" DESC);

-- Pending webhook deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_status 
ON "webhook_deliveries"("status", "next_retry");

-- ============================================
-- API Key Indexes
-- ============================================

-- API key lookup by prefix
CREATE INDEX IF NOT EXISTS idx_apikey_prefix 
ON "api_keys"("key_prefix");

-- Active API keys for user
CREATE INDEX IF NOT EXISTS idx_apikey_user_active 
ON "api_keys"("user_id", "is_active");

-- ============================================
-- Audit Log Indexes
-- ============================================

-- Audit log by user
CREATE INDEX IF NOT EXISTS idx_auditlog_user 
ON "audit_logs"("user_id", "created_at" DESC);

-- Audit log by action
CREATE INDEX IF NOT EXISTS idx_auditlog_action 
ON "audit_logs"("action", "created_at" DESC);

-- Audit log by resource
CREATE INDEX IF NOT EXISTS idx_auditlog_resource 
ON "audit_logs"("resource", "resource_id");

-- ============================================
-- Share Link Indexes
-- ============================================

-- Share link lookup
CREATE INDEX IF NOT EXISTS idx_sharelink_shareid 
ON "share_links"("share_id");

-- User's share links
CREATE INDEX IF NOT EXISTS idx_sharelink_user 
ON "share_links"("user_id", "created_at" DESC);

-- ============================================
-- Audio Indexes
-- ============================================

-- User's audio files
CREATE INDEX IF NOT EXISTS idx_audio_user 
ON "audio_files"("user_id", "created_at" DESC);

-- Audio by conversation
CREATE INDEX IF NOT EXISTS idx_audio_conversation 
ON "audio_files"("conversation_id");

-- ============================================
-- Template Indexes
-- ============================================

-- Default templates
CREATE INDEX IF NOT EXISTS idx_template_default 
ON "templates"("is_default", "category");

-- User templates
CREATE INDEX IF NOT EXISTS idx_template_user 
ON "templates"("user_id", "category");

-- Public templates
CREATE INDEX IF NOT EXISTS idx_template_public 
ON "templates"("is_public", "usage_count" DESC);
