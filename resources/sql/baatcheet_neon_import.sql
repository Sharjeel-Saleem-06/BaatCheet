--
-- PostgreSQL database dump
--


-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 14.20 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AttachmentType; Type: TYPE; Schema: public; Owner: baatcheet_user
--

CREATE TYPE "AttachmentType" AS ENUM (
    'image',
    'document'
);



--
-- Name: Role; Type: TYPE; Schema: public; Owner: baatcheet_user
--

CREATE TYPE "Role" AS ENUM (
    'system',
    'user',
    'assistant'
);



--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: baatcheet_user
--

CREATE TYPE "UserRole" AS ENUM (
    'user',
    'moderator',
    'admin'
);



SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE analytics (
    id text NOT NULL,
    user_id text NOT NULL,
    date date NOT NULL,
    messages_count integer DEFAULT 0 NOT NULL,
    responses_count integer DEFAULT 0 NOT NULL,
    tokens_by_model jsonb DEFAULT '{}'::jsonb NOT NULL,
    conversations_created integer DEFAULT 0 NOT NULL,
    projects_created integer DEFAULT 0 NOT NULL,
    images_uploaded integer DEFAULT 0 NOT NULL,
    audio_transcribed double precision DEFAULT 0 NOT NULL,
    exports_generated integer DEFAULT 0 NOT NULL,
    searches_performed integer DEFAULT 0 NOT NULL,
    avg_response_time double precision DEFAULT 0 NOT NULL,
    top_tags text[] DEFAULT ARRAY[]::text[],
    top_models text[] DEFAULT ARRAY[]::text[],
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Name: api_key_usage; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE api_key_usage (
    id text NOT NULL,
    provider text NOT NULL,
    key_index integer NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    date date DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE api_keys (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    key_prefix text NOT NULL,
    permissions text[] DEFAULT ARRAY['read'::text, 'write'::text],
    rate_limit integer DEFAULT 100 NOT NULL,
    last_used timestamp(3) without time zone,
    expires_at timestamp(3) without time zone,
    is_active boolean DEFAULT true NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Name: api_usage_logs; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE api_usage_logs (
    id text NOT NULL,
    user_id text,
    provider text NOT NULL,
    model text NOT NULL,
    endpoint text NOT NULL,
    tokens integer DEFAULT 0 NOT NULL,
    cost double precision DEFAULT 0 NOT NULL,
    latency integer DEFAULT 0 NOT NULL,
    status text NOT NULL,
    error_msg text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: attachments; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE attachments (
    id text NOT NULL,
    message_id text,
    type "AttachmentType" NOT NULL,
    original_name text,
    stored_name text,
    url text NOT NULL,
    file_size integer,
    mime_type text,
    extracted_text text,
    analysis_result text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    conversation_id text,
    status text DEFAULT 'processing'::text NOT NULL,
    user_id text NOT NULL
);



--
-- Name: audio_files; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE audio_files (
    id text NOT NULL,
    user_id text NOT NULL,
    conversation_id text,
    original_filename text NOT NULL,
    stored_filename text NOT NULL,
    file_size integer NOT NULL,
    duration double precision,
    format text NOT NULL,
    storage_url text NOT NULL,
    transcription text,
    detected_language text,
    confidence double precision,
    transcription_model text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE audit_logs (
    id text NOT NULL,
    user_id text,
    action text NOT NULL,
    resource text NOT NULL,
    resource_id text,
    ip_address text,
    user_agent text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: conversation_summaries; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE conversation_summaries (
    id text NOT NULL,
    user_id text NOT NULL,
    conversation_id text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    key_topics jsonb DEFAULT '[]'::jsonb NOT NULL,
    main_intent text NOT NULL,
    message_count integer NOT NULL,
    user_messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: conversations; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE conversations (
    id text NOT NULL,
    user_id text NOT NULL,
    project_id text,
    title text DEFAULT 'New Conversation'::text NOT NULL,
    system_prompt text,
    model text DEFAULT 'llama-3.3-70b-versatile'::text NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    is_archived boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    rating integer DEFAULT 0,
    total_tokens integer DEFAULT 0 NOT NULL,
    last_accessed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Name: flagged_content; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE flagged_content (
    id text NOT NULL,
    conversation_id text NOT NULL,
    message_id text,
    reason text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    flagged_by text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by text,
    reviewed_at timestamp(3) without time zone,
    action text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: image_generation_quotas; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE image_generation_quotas (
    id text NOT NULL,
    user_id text NOT NULL,
    daily_limit integer NOT NULL,
    daily_used integer DEFAULT 0 NOT NULL,
    last_reset_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    monthly_limit integer DEFAULT 0 NOT NULL,
    monthly_used integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Name: image_generations; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE image_generations (
    id text NOT NULL,
    user_id text NOT NULL,
    prompt text NOT NULL,
    optimized_prompt text,
    negative_prompt text,
    model text NOT NULL,
    width integer DEFAULT 512 NOT NULL,
    height integer DEFAULT 512 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    image_url text,
    error text,
    generation_time integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    api_key_used text,
    aspect_ratio text DEFAULT '1:1'::text NOT NULL,
    conversation_id text,
    seed integer,
    style text,
    thumbnail_url text
);



--
-- Name: messages; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE messages (
    id text NOT NULL,
    conversation_id text NOT NULL,
    role "Role" NOT NULL,
    content text NOT NULL,
    model text,
    tokens integer DEFAULT 0 NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    audio_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: projects; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE projects (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#1e293b'::text NOT NULL,
    icon text DEFAULT 'folder'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Name: rate_limits; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE rate_limits (
    id text NOT NULL,
    identifier text NOT NULL,
    endpoint text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    window_start timestamp(3) without time zone NOT NULL
);



--
-- Name: share_links; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE share_links (
    id text NOT NULL,
    conversation_id text NOT NULL,
    user_id text NOT NULL,
    share_id text NOT NULL,
    expires_at timestamp(3) without time zone,
    is_public boolean DEFAULT true NOT NULL,
    access_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE system_settings (
    id text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Name: templates; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE templates (
    id text NOT NULL,
    user_id text,
    name text NOT NULL,
    description text,
    system_prompt text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    icon text DEFAULT 'message-square'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Name: user_facts; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE user_facts (
    id text NOT NULL,
    user_id text NOT NULL,
    category text NOT NULL,
    fact_type text NOT NULL,
    fact_key text NOT NULL,
    fact_value text NOT NULL,
    confidence double precision DEFAULT 1.0 NOT NULL,
    source text NOT NULL,
    conversation_id text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone,
    is_active boolean DEFAULT true NOT NULL,
    skill_level text,
    goal_status text,
    goal_progress text
);



--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE user_profiles (
    id text NOT NULL,
    user_id text NOT NULL,
    full_name text,
    preferred_name text,
    occupation text,
    education text,
    location text,
    interests jsonb DEFAULT '[]'::jsonb NOT NULL,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    expertise jsonb DEFAULT '[]'::jsonb NOT NULL,
    goals jsonb DEFAULT '[]'::jsonb NOT NULL,
    preferred_language text DEFAULT 'auto'::text NOT NULL,
    communication_tone text DEFAULT 'friendly'::text NOT NULL,
    response_style text DEFAULT 'balanced'::text NOT NULL,
    primary_use_case text,
    typical_questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    fact_count integer DEFAULT 0 NOT NULL,
    last_updated timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: users; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE users (
    id text NOT NULL,
    clerk_id text NOT NULL,
    email text NOT NULL,
    username text,
    first_name text,
    last_name text,
    avatar text,
    role "UserRole" DEFAULT 'user'::public."UserRole" NOT NULL,
    preferences jsonb DEFAULT '{"theme": "dark", "language": "en", "defaultModel": "llama-3.3-70b-versatile"}'::jsonb NOT NULL,
    tier text DEFAULT 'free'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_banned boolean DEFAULT false NOT NULL,
    ban_reason text,
    last_login_at timestamp(3) without time zone,
    login_count integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE webhook_deliveries (
    id text NOT NULL,
    webhook_id text NOT NULL,
    event text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL,
    status_code integer,
    response text,
    attempts integer DEFAULT 0 NOT NULL,
    next_retry timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: baatcheet_user
--

CREATE TABLE webhooks (
    id text NOT NULL,
    user_id text NOT NULL,
    url text NOT NULL,
    events text[] DEFAULT ARRAY[]::text[],
    secret text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    last_triggered timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);



--
-- Data for Name: analytics; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY analytics (id, user_id, date, messages_count, responses_count, tokens_by_model, conversations_created, projects_created, images_uploaded, audio_transcribed, exports_generated, searches_performed, avg_response_time, top_tags, top_models, created_at, updated_at) FROM stdin;
e1063f9b-2c61-46ed-bae9-87b90131b5c5	2821af5c-90ab-458c-9d94-85eed55e90c3	2026-01-10	0	0	{}	0	0	0	0.377	0	0	0	{}	{}	2026-01-11 05:57:50.689	2026-01-11 13:55:33.492
ce3e1ba4-29e2-4164-88ba-35037ae101e6	2821af5c-90ab-458c-9d94-85eed55e90c3	2026-01-11	0	0	{}	0	0	0	0.116	0	0	0	{}	{}	2026-01-12 05:59:33.659	2026-01-12 05:59:33.661
\.


--
-- Data for Name: api_key_usage; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY api_key_usage (id, provider, key_index, request_count, date, created_at, updated_at) FROM stdin;
ae2aa94e-d104-45e5-ab7b-e28f63653f59	gemini	0	1	2026-01-10	2026-01-11 05:59:51.144	2026-01-11 05:59:51.144
c9a35089-1f81-4491-b5d8-de092fa022e8	ocrspace	1	1	2026-01-10	2026-01-11 06:32:18.517	2026-01-11 06:32:18.517
2426a430-b307-4794-8d09-b9c2962d14f6	groq	2	1	2026-01-10	2026-01-11 06:34:41.418	2026-01-11 06:34:41.418
69c1f6d4-7191-4e24-96da-95c7e40ea66a	groq	3	1	2026-01-10	2026-01-11 06:35:03.824	2026-01-11 06:35:03.824
90e11d2c-736c-444b-954a-454ea821cd60	groq	4	1	2026-01-10	2026-01-11 06:35:18.817	2026-01-11 06:35:18.817
8ad18dcd-6160-4bb5-b7ad-1ad812680d60	ocrspace	0	2	2026-01-10	2026-01-11 06:31:52.411	2026-01-11 06:40:03.516
c0fee2ab-8f77-4f75-bcb8-024bae77bb50	openrouter	0	1	2026-01-10	2026-01-11 06:51:05.568	2026-01-11 06:51:05.568
13505fe5-a2a1-4156-a114-8cf65e1ca71d	openrouter	1	1	2026-01-10	2026-01-11 06:51:28.854	2026-01-11 06:51:28.854
01286aee-d99a-4a60-86a9-7dec309f0888	groq	0	7	2026-01-10	2026-01-11 05:57:50.386	2026-01-11 13:55:21.081
9957e16e-b75b-4c17-84b9-729a50fb1803	groq	1	5	2026-01-10	2026-01-11 05:57:59.836	2026-01-11 13:55:33.23
fed95ef5-2feb-4161-aa90-f64fdc0c049a	groq	6	1	2026-01-11	2026-01-12 06:01:14.613	2026-01-12 06:01:14.613
ef770916-e6c5-4c0f-a418-63d9d2723493	groq	9	1	2026-01-11	2026-01-12 06:02:22.453	2026-01-12 06:02:22.453
d47abb03-eb1e-49f4-b662-b5b459b46971	groq	10	1	2026-01-11	2026-01-12 06:02:22.459	2026-01-12 06:02:22.459
53bda64f-5cf6-4e2a-af71-ab3249612917	groq	11	1	2026-01-11	2026-01-12 06:02:23.947	2026-01-12 06:02:23.947
8f13a5af-89d5-4cb9-aeeb-4ed3d952bf14	groq	12	1	2026-01-11	2026-01-12 06:02:49.122	2026-01-12 06:02:49.122
bec63a8b-b390-4fa8-811e-3b2fe8df4247	groq	13	1	2026-01-11	2026-01-12 06:02:49.127	2026-01-12 06:02:49.127
11222926-3799-4d75-9491-d83ec3837d3f	groq	0	1	2026-01-11	2026-01-12 05:59:33.176	2026-01-12 10:21:42.815
ecb4500f-f556-418a-937c-1578179f1208	groq	1	2	2026-01-11	2026-01-12 05:59:56.906	2026-01-12 10:21:43.159
6dc96cb7-f8c1-4e77-9cc0-09f59b1d5c1d	groq	2	2	2026-01-11	2026-01-12 05:59:58.163	2026-01-12 10:21:46.238
fb03f1b4-2f22-4926-98b8-5d24da46332e	groq	3	2	2026-01-11	2026-01-12 06:00:56.898	2026-01-12 10:21:46.238
cfd60ba1-ee42-43ed-a814-e302f25d7a8c	groq	5	2	2026-01-11	2026-01-12 06:01:14.604	2026-01-12 10:21:46.238
4017f62a-7a8c-46e3-a026-e856f95b41cf	groq	4	2	2026-01-11	2026-01-12 06:00:56.906	2026-01-12 10:21:46.238
10788b38-13c8-4919-a1c2-906b5b7ab1a4	groq	7	2	2026-01-11	2026-01-12 06:01:43.362	2026-01-12 10:21:46.238
48b28d6a-a9e8-4ecd-a679-128e47507fc3	groq	8	2	2026-01-11	2026-01-12 06:01:43.368	2026-01-12 10:21:46.238
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY api_keys (id, user_id, name, key_hash, key_prefix, permissions, rate_limit, last_used, expires_at, is_active, usage_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: api_usage_logs; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY api_usage_logs (id, user_id, provider, model, endpoint, tokens, cost, latency, status, error_msg, created_at) FROM stdin;
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY attachments (id, message_id, type, original_name, stored_name, url, file_size, mime_type, extracted_text, analysis_result, metadata, created_at, conversation_id, status, user_id) FROM stdin;
45baa364-de7e-45a0-ab44-ba6c36340161	\N	image	-modern-minimalist-logo-for--baatcheet---an-ai-cha.png	c2cf4c5f-3e7d-464f-a3c0-79248d9a9ea4.png	/uploads/images/c2cf4c5f-3e7d-464f-a3c0-79248d9a9ea4.png	813665	image/png	• BaatCheet	\N	{"size": 813665, "mimeType": "image/png", "originalName": "-modern-minimalist-logo-for--baatcheet---an-ai-cha.png"}	2026-01-11 06:31:52.395	\N	completed	2821af5c-90ab-458c-9d94-85eed55e90c3
3b9cb6c7-d223-4979-a259-93f7f463e43b	\N	image	-modern-minimalist-logo-for--baatcheet---an-ai-cha.png	0544a648-b96c-454e-8de4-171ee9154039.png	/uploads/images/0544a648-b96c-454e-8de4-171ee9154039.png	813665	image/png	• BaatCheet	\N	{"size": 813665, "mimeType": "image/png", "originalName": "-modern-minimalist-logo-for--baatcheet---an-ai-cha.png"}	2026-01-11 06:32:18.512	\N	completed	2821af5c-90ab-458c-9d94-85eed55e90c3
f24e6074-99e6-4368-b9b5-4b1692e4dc61	d476433d-b530-48de-86f5-c97c11e4bfc4	image	-modern-minimalist-logo-for--baatcheet---an-ai-cha.png	62f8e637-8cad-4db1-9b9f-6b4e901e9d6b.png	/uploads/images/62f8e637-8cad-4db1-9b9f-6b4e901e9d6b.png	813665	image/png	• BaatCheet	\N	{"size": 813665, "mimeType": "image/png", "originalName": "-modern-minimalist-logo-for--baatcheet---an-ai-cha.png"}	2026-01-11 06:40:03.509	444b406b-e23d-4c0f-96ad-0ff2189b0d69	completed	2821af5c-90ab-458c-9d94-85eed55e90c3
623aafe8-9f58-4d57-9123-cf58e8d2d897	a841074a-a040-484b-bc3f-292d76fc662a	document	final_ultimate_prompt.md	14a0712d-3136-4f71-94a2-a1d12bb2421b.md	/uploads/documents/14a0712d-3136-4f71-94a2-a1d12bb2421b.md	24506	text/markdown	# FINAL CURSOR PROMPT: BaatCheet - Web Search, Security, LaTeX & Missing Features\n\nThis is the FINAL comprehensive prompt that completes BaatCheet by adding all critical missing features: Web Search Integration, Advanced Security & Rate Limiting, LaTeX Math Rendering, Voice Output (TTS), PDF Parser, Data Visualization, and production-grade security audit.\n\n---\n\n## 🎯 OBJECTIVES\n\n1. Add **Web Search** like ChatGPT (real-time information)\n2. Implement **LaTeX/Math** equation rendering\n3. Add **Text-to-Speech** (voice output)\n4. Create **PDF Document Parser**\n5. Build **Data Analysis & Visualization** system\n6. Conduct **Complete Security Audit**\n7. Implement **Advanced Rate Limiting**\n8. Add **GDPR Compliance** tools\n9. Performance optimization review\n10. Production readiness checklist\n\n---\n\n## 📋 PART 1: WEB SEARCH INTEGRATION (LIKE CHATGPT)\n\n### Research Findings:\n- ChatGPT Search allows looking up recent or real-time information on the internet, helpful for current events and unfamiliar topics\n- In 2024, most leading chatbots introduced ability to search web in real-time, accessing up-to-date information with source references\n\n### Implementation Requirements:\n\n```typescript\n// services/web-search.service.ts\n\ninterface SearchResult {\n  title: string;\n  url: string;\n  snippet: string;\n  publishedDate?: string;\n  source: string;\n}\n\ninterface WebSearchResponse {\n  query: string;\n  results: SearchResult[];\n  timestamp: Date;\n}\n\nclass WebSearchService {\n  private readonly SEARCH_APIS = {\n    // Free options\n    serpapi: process.env.SERPAPI_KEY, // 100 searches/month free\n    brave: process.env.BRAVE_SEARCH_KEY, // 2000 searches/month free\n    duckduckgo: 'no-key-needed' // Unlimited but rate-limited\n  };\n  \n  /**\n   * Search the web and return results\n   */\n  async search(query: string, options: {\n    numResults?: number;\n    dateFilter?: 'day' | 'week' | 'month' | 'year';\n  } = {}): Promise<WebSearchResponse> {\n    const { numResults = 5, dateFilter } = options;\n    \n    try {\n      // Try Brave Search first (best free tier)\n      if (this.SEARCH_APIS.brave) {\n        return await this.searchWithBrave(query, numResults, dateFilter);\n      }\n      \n      // Fallback to SerpAPI\n      if (this.SEARCH_APIS.serpapi) {\n        return await this.searchWithSerpAPI(query, numResults, dateFilter);\n      }\n      \n      // Last resort: DuckDuckGo (no API key needed)\n      return await this.searchWithDuckDuckGo(query, numResults);\n      \n    } catch (error) {\n      logger.error('Web search failed:', error);\n      throw new Error('Web search unavailable');\n    }\n  }\n  \n  private async searchWithBrave(\n    query: string, \n    numResults: number,\n    dateFilter?: string\n  ): Promise<WebSearchResponse> {\n    const url = 'https://api.search.brave.com/res/v1/web/search';\n    \n    const params = new URLSearchParams({\n      q: query,\n      count: numResults.toString(),\n      ...(dateFilter && { freshness: dateFilter })\n    });\n    \n    const response = await axios.get(`${url}?${params}`, {\n      headers: {\n        'Accept': 'application/json',\n        'X-Subscription-Token': this.SEARCH_APIS.brave\n      }\n    });\n    \n    const results = response.data.web.results.map((r: any) => ({\n      title: r.title,\n      url: r.url,\n      snippet: r.description,\n      publishedDate: r.age,\n      source: new URL(r.url).hostname\n    }));\n    \n    return {\n      query,\n      results,\n      timestamp: new Date()\n    };\n  }\n  \n  /**\n   * Determine if query needs web search\n   */\n  needsWebSearch(query: string): boolean {\n    const webSearchIndicators = [\n      // Current events\n      'today', 'yesterday', 'this week', 'this month', 'latest', 'recent',\n      'current', 'now', 'breaking', 'news',\n      \n      // Explicit search requests\n      'search for', 'look up', 'find information', 'what happened',\n      \n      // Questions about current state\n      'who is the current', 'what is the latest', 'when did', 'where is',\n      \n      // Weather, stock prices, etc.\n      'weather', 'stock price', 'exchange rate', 'score', 'results',\n      \n      // Dates (any year >= 2024)\n      '2024', '2025', '2026'\n    ];\n    \n    const lowerQuery = query.toLowerCase();\n    return webSearchIndicators.some(indicator => lowerQuery.includes(indicator));\n  }\n  \n  /**\n   * Format search results for AI context\n   */\n  formatForAI(searchResults: WebSearchResponse): string {\n    let context = '\\n\\n## WEB SEARCH RESULTS\\n\\n';\n    context += `Query: "${searchResults.query}"\\n`;\n    context += `Search performed at: ${searchResults.timestamp.toISOString()}\\n\\n`;\n    \n    searchResults.results.forEach((result, index) => {\n      context += `[${index + 1}] **${result.title}**\\n`;\n      context += `   Source: ${result.source}\\n`;\n      context += `   URL: ${result.url}\\n`;\n      context += `   ${result.snippet}\\n\\n`;\n    });\n    \n    context += '\\nUse this information to answer the user\\'s question. ';\n    context += 'IMPORTANT: Cite sources using [1], [2], etc. when referencing information.';\n    \n    return context;\n  }\n}\n\nexport const webSearch = new WebSearchService();\n```\n\n### Update Chat Controller:\n\n```typescript\n// controllers/chat.controller.ts (ADD WEB SEARCH)\n\nexport async function sendMessage(req, res) {\n  const { conversationId, message, imageId, stream = true } = req.body;\n  const userId = req.userId;\n\n  try {\n    // Step 1: Check if query needs web search\n    let webSearchContext = '';\n    if (webSearch.needsWebSearch(message)) {\n      logger.info('Web search triggered', { query: message });\n      \n      try {\n        const searchResults = await webSearch.search(message, {\n          numResults: 5,\n          dateFilter: 'month' // Recent results\n        });\n        \n        webSearchContext = webSearch.formatForAI(searchResults);\n        \n      } catch (error) {\n        logger.error('Web search failed:', error);\n        // Continue without web search\n      }\n    }\n    \n    // Step 2: Build system prompt with web search results\n    const profileContext = await profileLearning.buildProfileContext(userId);\n    const recentContext = await profileLearning.buildRecentContext(userId, conversationId || '');\n    \n    const enhancedSystemPrompt = \n      ADVANCED_SYSTEM_PROMPT + \n      profileContext + \n      recentContext +\n      webSearchContext; // ADD WEB SEARCH CONTEXT\n    \n    // Step 3: Get conversation context\n    const context = await contextManager.getContext(conversationId);\n    \n    // Step 4: Prepare messages\n    const messages = [\n      { role: 'system', content: enhancedSystemPrompt },\n      ...context,\n      { role: 'user', content: message }\n    ];\n    \n    // ... rest of chat logic\n  } catch (error) {\n    logger.error('Chat error:', error);\n    res.status(500).json({ error: 'Failed to process message' });\n  }\n}\n```\n\n---\n\n## 📋 PART 2: LATEX MATH RENDERING\n\n### Implementation:\n\n```typescript\n// Frontend: Install KaTeX for LaTeX rendering\n// npm install katex react-katex\n\n// components/Chat/MarkdownRenderer.tsx (UPDATE)\n\nimport 'katex/dist/katex.min.css';\nimport { InlineMath, BlockMath } from 'react-katex';\n\nexport const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {\n  // Pre-process content to extract LaTeX\n  const processedContent = content\n    // Block math: $$ ... $$\n    .replace(/\\$\\$(.*?)\\$\\$/gs, (match, latex) => {\n      return `<BlockMath>${latex.trim()}</BlockMath>`;\n    })\n    // Inline math: $ ... $\n    .replace(/\\$(.*?)\\$/g, (match, latex) => {\n      return `<InlineMath>${latex.trim()}</InlineMath>`;\n    });\n  \n  return (\n    <div className="markdown-content">\n      <ReactMarkdown\n        remarkPlugins={[remarkGfm, remarkMath]} // Add remarkMath\n        rehypePlugins={[rehypeKatex]} // Add rehypeKatex\n        components={{\n          // ... existing components\n          \n          // Custom math rendering\n          math: ({ value }) => <BlockMath math={value} />,\n          inlineMath: ({ value }) => <InlineMath math={value} />\n        }}\n      >\n        {content}\n      </ReactMarkdown>\n    </div>\n  );\n};\n```\n\n**System Prompt Addition:**\n```\nWhen writing mathematical equations:\n- Use $...$ for inline math: $E = mc^2$\n- Use $$...$$ for block equations:\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}\n$$\n```\n\n---\n\n## 📋 PART 3: TEXT-TO-SPEECH (VOICE OUTPUT)\n\n### Implementation:\n\n```typescript\n// services/tts.service.ts\n\ninterface TTSOptions {\n  voice?: string; // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'\n  speed?: number; // 0.25 to 4.0\n  language?: string;\n}\n\nclass TTSService {\n  async generateSpeech(text: string, options: TTSOptions = {}): Promise<Buffer> {\n    const { voice = 'alloy', speed = 1.0 } = options;\n    \n    // Option 1: OpenAI TTS (best quality, paid)\n    if (process.env.OPENAI_API_KEY) {\n      return await this.openAITTS(text, voice, speed);\n    }\n    \n    // Option 2: ElevenLabs (free tier: 10k chars/month)\n    if (process.env.ELEVENLABS_API_KEY) {\n      return await this.elevenLabsTTS(text);\n    }\n    \n    // Option 3: Google Cloud TTS (free tier: 1M chars/month)\n    if (process.env.GOOGLE_CLOUD_KEY) {\n      return await this.googleTTS(text, options.language);\n    }\n    \n    throw new Error('No TTS service available');\n  }\n  \n  private async openAITTS(text: string, voice: string, speed: number): Promise<Buffer> {\n    const response = await axios.post(\n      'https://api.openai.com/v1/audio/speech',\n      {\n        model: 'tts-1', // or 'tts-1-hd' for higher quality\n        voice,\n        input: text,\n        speed\n      },\n      {\n        headers: {\n          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,\n          'Content-Type': 'application/json'\n        },\n        responseType: 'arraybuffer'\n      }\n    );\n    \n    return Buffer.from(response.data);\n  }\n}\n\nexport const tts = new TTSService();\n\n// API Endpoint\nrouter.post('/tts', async (req, res) => {\n  const { text, voice, speed, language } = req.body;\n  \n  try {\n    const audioBuffer = await tts.generateSpeech(text, { voice, speed, language });\n    \n    res.setHeader('Content-Type', 'audio/mpeg');\n    res.setHeader('Content-Length', audioBuffer.length);\n    res.send(audioBuffer);\n    \n  } catch (error) {\n    res.status(500).json({ error: 'TTS generation failed' });\n  }\n});\n```\n\n**Frontend:**\n```typescript\n// Add "Read Aloud" button to messages\nconst handleReadAloud = async (messageText: string) => {\n  try {\n    const response = await api.post('/api/v1/tts', \n      { text: messageText, voice: 'alloy', speed: 1.0 },\n      { responseType: 'blob' }\n    );\n    \n    const audioUrl = URL.createObjectURL(response.data);\n    const audio = new Audio(audioUrl);\n    audio.play();\n    \n  } catch (error) {\n    console.error('TTS failed:', error);\n  }\n};\n```\n\n---\n\n## 📋 PART 4: PDF DOCUMENT PARSER\n\n### Implementation:\n\n```typescript\n// services/pdf-parser.service.ts\n\nimport pdf from 'pdf-parse';\n\ninterface PDFContent {\n  text: string;\n  numPages: number;\n  metadata: any;\n  pages: Array<{ pageNumber: number; text: string }>;\n}\n\nclass PDFParserService {\n  async parsePDF(fileBuffer: Buffer): Promise<PDFContent> {\n    try {\n      const data = await pdf(fileBuffer);\n      \n      return {\n        text: data.text,\n        numPages: data.numpages,\n        metadata: data.metadata,\n        pages: this.extractPages(data.text, data.numpages)\n      };\n      \n    } catch (error) {\n      logger.error('PDF parsing failed:', error);\n      throw new Error('Failed to parse PDF');\n    }\n  }\n  \n  private extractPages(fullText: string, numPages: number): Array<{pageNumber: number, text: string}> {\n    // Split text by page breaks (if available)\n    // This is a simplified version - actual implementation may vary\n    const avgCharsPerPage = fullText.length / numPages;\n    const pages = [];\n    \n    for (let i = 0; i < numPages; i++) {\n      const start = Math.floor(i * avgCharsPerPage);\n      const end = Math.floor((i + 1) * avgCharsPerPage);\n      pages.push({\n        pageNumber: i + 1,\n        text: fullText.substring(start, end)\n      });\n    }\n    \n    return pages;\n  }\n  \n  async analyzePDF(fileId: string, userQuestion: string): Promise<string> {\n    // Get PDF content from database\n    const attachment = await prisma.attachment.findUnique({\n      where: { id: fileId }\n    });\n    \n    if (!attachment || !attachment.parsedContent) {\n      throw new Error('PDF not parsed yet');\n    }\n    \n    // Use AI to answer question about PDF\n    const prompt = `You are analyzing a PDF document. Answer the user's question based on the document content.\n\nDocument: ${attachment.parsedContent}\n\nUser Question: ${userQuestion}\n\nProvide a detailed answer with page references if possible.`;\n\n    const response = await aiRouter.chat({\n      messages: [{ role: 'user', content: prompt }],\n      temperature: 0.3\n    });\n    \n    return response.choices[0].message.content;\n  }\n}\n\nexport const pdfParser = new PDFParserService();\n\n// Update Image/File Upload Controller\nexport async function uploadFile(req, res) {\n  const file = req.file;\n  const { conversationId } = req.body;\n  const userId = req.userId;\n\n  try {\n    // ... upload to storage\n    \n    // If PDF, parse immediately\n    if (file.mimetype === 'application/pdf') {\n      const fileBuffer = await fs.readFile(file.path);\n      const pdfContent = await pdfParser.parsePDF(fileBuffer);\n      \n      // Save parsed content\n      await prisma.attachment.update({\n        where: { id: attachment.id },\n        data: {\n          parsedContent: pdfContent.text,\n          metadata: {\n            numPages: pdfContent.numPages,\n            pdfMetadata: pdfContent.metadata\n          }\n        }\n      });\n    }\n    \n    res.json({ success: true, fileId: attachment.id });\n    \n  } catch (error) {\n    res.status(500).json({ error: 'File upload failed' });\n  }\n}\n```\n\n---\n\n## 📋 PART 5: DATA ANALYSIS & VISUALIZATION\n\n### Implementation:\n\n```typescript\n// services/data-analysis.service.ts\n\nimport * as papa from 'papaparse';\n\nclass DataAnalysisService {\n  async analyzeCSV(fileBuffer: Buffer, analysisType: string): Promise<any> {\n    // Parse CSV\n    const csvText = fileBuffer.toString('utf-8');\n    const parsed = papa.parse(csvText, {\n      header: true,\n      dynamicTyping: true,\n      skipEmptyLines: true\n    });\n    \n    // Generate Python code for analysis\n    const pythonCode = this.generateAnalysisCode(parsed.data, analysisType);\n    \n    // Execute Python code (use python-shell or similar)\n    const results = await this.executePython(pythonCode);\n    \n    return results;\n  }\n  \n  private generateAnalysisCode(data: any[], analysisType: string): string {\n    // Generate pandas/matplotlib code based on analysis type\n    return `\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport json\n\n# Load data\ndata = ${JSON.stringify(data)}\ndf = pd.DataFrame(data)\n\n# Perform analysis\n${this.getAnalysisCode(analysisType)}\n\n# Return results as JSON\nresults = {\n  'summary': df.describe().to_dict(),\n  'chart_data': ...\n}\nprint(json.dumps(results))\n`;\n  }\n}\n\n// Alternative: Client-side visualization with Chart.js\n// Frontend component for data visualization\nimport { Line, Bar, Pie } from 'react-chartjs-2';\n\nexport const DataVisualization: React.FC<{data: any}> = ({ data }) => {\n  const chartData = {\n    labels: data.labels,\n    datasets: [{\n      label: 'Data',\n      data: data.values,\n      backgroundColor: 'rgba(75, 192, 192, 0.2)',\n      borderColor: 'rgba(75, 192, 192, 1)',\n      borderWidth: 1\n    }]\n  };\n  \n  return <Line data={chartData} />;\n};\n```\n\n---\n\n## 📋 PART 6: ADVANCED SECURITY & RATE LIMITING\n\n### Complete Security Audit:\n\n```typescript\n// middleware/advanced-rate-limiter.middleware.ts\n\nimport rateLimit from 'express-rate-limit';\nimport RedisStore from 'rate-limit-redis';\nimport { redis } from '../config/redis.config';\n\n/**\n * Tiered rate limiting based on user subscription\n */\nexport const createRateLimiter = (endpoint: string, limits: {\n  free: number;\n  pro: number;\n  enterprise: number;\n  window: number; // in milliseconds\n}) => {\n  return rateLimit({\n    store: new RedisStore({\n      client: redis,\n      prefix: `rl:${endpoint}:`\n    }),\n    windowMs: limits.window,\n    max: async (req) => {\n      const user = await prisma.user.findUnique({\n        where: { id: req.userId },\n        select: { tier: true }\n      });\n      \n      return limits[user.tier] || limits.free;\n    },\n    keyGenerator: (req) => req.userId,\n    standardHeaders: true,\n    legacyHeaders: false,\n    handler: (req, res) => {\n      res.status(429).json({\n        error: 'Rate limit exceeded',\n        retryAfter: res.getHeader('Retry-After'),\n        limit: res.getHeader('X-RateLimit-Limit'),\n        remaining: 0\n      });\n    },\n    skip: (req) => {\n      // Skip rate limiting for admins\n      return req.user?.role === 'admin';\n    }\n  });\n};\n\n// Apply to routes\nrouter.post('/chat/completions', \n  createRateLimiter('chat', {\n    free: 50,        // 50 messages per hour\n    pro: 500,        // 500 messages per hour\n    enterprise: 5000, // 5000 messages per hour\n    window: 60 * 60 * 1000 // 1 hour\n  }),\n  chatController.sendMessage\n);\n\nrouter.post('/images/upload',\n  createRateLimiter('image-upload', {\n    free: 10,\n    pro: 100,\n    enterprise: 1000,\n    window: 60 * 60 * 1000\n  }),\n  imageController.upload\n);\n\nrouter.post('/audio/transcribe',\n  createRateLimiter('audio', {\n    free: 5,\n    pro: 50,\n    enterprise: 500,\n    window: 60 * 60 * 1000\n  }),\n  audioController.transcribe\n);\n```\n\n### Security Headers:\n\n```typescript\n// middleware/security.middleware.ts\n\nimport helmet from 'helmet';\n\nexport const securityMiddleware = helmet({\n  contentSecurityPolicy: {\n    directives: {\n      defaultSrc: ["'self'"],\n      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],\n      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],\n      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],\n      fontSrc: ["'self'", 'fonts.gstatic.com'],\n      connectSrc: ["'self'", 'api.openai.com', 'api.groq.com'],\n      frameSrc: ["'none'"],\n      objectSrc: ["'none'"]\n    }\n  },\n  hsts: {\n    maxAge: 31536000,\n    includeSubDomains: true,\n    preload: true\n  },\n  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },\n  noSniff: true,\n  xssFilter: true,\n  hidePoweredBy: true\n});\n\n// API Key validation\nexport async function validateAPIKey(req, res, next) {\n  const apiKey = req.headers['x-api-key'];\n  \n  if (!apiKey) {\n    return res.status(401).json({ error: 'API key required' });\n  }\n  \n  // Verify API key\n  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');\n  \n  const key = await prisma.apiKey.findFirst({\n    where: {\n      keyHash: hashedKey,\n      isActive: true,\n      expiresAt: { gt: new Date() }\n    },\n    include: { user: true }\n  });\n  \n  if (!key) {\n    return res.status(401).json({ error: 'Invalid or expired API key' });\n  }\n  \n  // Check permissions\n  if (!key.permissions.includes(req.route.path)) {\n    return res.status(403).json({ error: 'Insufficient permissions' });\n  }\n  \n  // Track usage\n  await prisma.apiKey.update({\n    where: { id: key.id },\n    data: {\n      lastUsed: new Date(),\n      usageCount: { increment: 1 }\n    }\n  });\n  \n  req.userId = key.userId;\n  req.apiKeyId = key.id;\n  next();\n}\n```\n\n### Input Sanitization:\n\n```typescript\n// middleware/sanitization.middleware.ts\n\nimport DOMPurify from 'isomorphic-dompurify';\nimport validator from 'validator';\n\nexport function sanitizeInput(req, res, next) {\n  // Sanitize all string inputs\n  if (req.body) {\n    req.body = sanitizeObject(req.body);\n  }\n  \n  if (req.query) {\n    req.query = sanitizeObject(req.query);\n  }\n  \n  next();\n}\n\nfunction sanitizeObject(obj: any): any {\n  if (typeof obj === 'string') {\n    // Remove potential XSS\n    let clean = DOMPurify.sanitize(obj);\n    \n    // Remove SQL injection patterns\n    clean = clean.replace(/(\\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\\b)/gi, '');\n    \n    // Remove script tags\n    clean = clean.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');\n    \n    return validator.escape(clean);\n  }\n  \n  if (Array.isArray(obj)) {\n    return obj.map(item => sanitizeObject(item));\n  }\n  \n  if (typeof obj === 'object' && obj !== null) {\n    const sanitized = {};\n    for (const [key, value] of Object.entries(obj)) {\n      sanitized[key] = sanitizeObject(value);\n    }\n    return sanitized;\n  }\n  \n  return obj;\n}\n```\n\n---\n\n## 📋 PART 7: GDPR COMPLIANCE\n\n### Implementation:\n\n```typescript\n// routes/gdpr.routes.ts\n\n// Data export (GDPR Article 15)\nrouter.get('/gdpr/export', async (req, res) => {\n  const { userId } = req;\n  \n  // Gather ALL user data\n  const [user, conversations, facts, analytics, apiKeys] = await Promise.all([\n    prisma.user.findUnique({ where: { id: userId } }),\n    prisma.conversation.findMany({ where: { userId }, include: { messages: true } }),\n    prisma.userFact.findMany({ where: { userId } }),\n    prisma.analytics.findMany({ where: { userId } }),\n    prisma.apiKey.findMany({ where: { userId } })\n  ]);\n  \n  const exportData = {\n    user,\n    conversations,\n    facts,\n    analytics,\n    apiKeys: apiKeys.map(k => ({ ...k, key: '[REDACTED]' })),\n    exportedAt: new Date(),\n    exportedBy: userId\n  };\n  \n  const filename = `baatcheet_data_export_${userId}_${Date.now()}.json`;\n  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);\n  res.setHeader('Content-Type', 'application/json');\n  res.json(exportData);\n});\n\n// Data deletion (GDPR Article 17 - Right to Erasure)\nrouter.delete('/gdpr/delete-all', async (req, res) => {\n  const { userId } = req;\n  const { confirmDelete } = req.body;\n  \n  if (confirmDelete !== 'DELETE ALL MY DATA') {\n    return res.status(400).json({ \n      error: 'Please confirm deletion by sending: {"confirmDelete": "DELETE ALL MY DATA"}'\n    });\n  }\n  \n  // Hard delete ALL user data\n  await prisma.$transaction([\n    prisma.message.deleteMany({ where: { conversation: { userId } } }),\n    prisma.conversation.deleteMany({ where: { userId } }),\n    prisma.userFact.deleteMany({ where: { userId } }),\n    prisma.analytics.deleteMany({ where: { userId } }),\n    prisma.apiKey.deleteMany({ where: { userId } }),\n    prisma.attachment.deleteMany({ where: { userId } }),\n    prisma.user.delete({ where: { id: userId } })\n  ]);\n  \n  res.json({ \n    success: true, \n    message: 'All your data has been permanently deleted' \n  });\n});\n\n// Data portability (GDPR Article 20)\nrouter.get('/gdpr/export-portable', async (req, res) => {\n  // Export in machine-readable format (JSON/CSV)\n  // ... similar to export but formatted for portability\n});\n```\n\n---\n\n## ✅ PRODUCTION READINESS CHECKLIST\n\n### Security:\n- [ ] All inputs sanitized\n- [ ] SQL injection prevention verified\n- [ ] XSS prevention verified\n- [ ] CSRF tokens implemented\n- [ ] Rate limiting on all endpoints\n- [ ] API keys hashed in database\n- [ ] Secrets in environment variables\n- [ ] HTTPS enforced in production\n- [ ] Security headers (Helmet) configured\n- [ ] File upload validation (magic numbers)\n\n### Performance:\n- [ ] Database queries optimized\n- [ ] Indexes on frequently queried fields\n- [ ] Redis caching implemented\n- [ ] Connection pooling configured\n- [ ] Response compression (gzip)\n- [ ] CDN for static assets\n- [ ] Lazy loading for heavy content\n- [ ] Background jobs for heavy tasks\n\n### Monitoring:\n- [ ] Error tracking (Sentry)\n- [ ] Logging (Winston/structured)\n- [ ] Health check endpoints\n- [ ] Uptime monitoring\n- [ ] Performance monitoring\n- [ ] Alert system configured\n\n### Compliance:\n- [ ] GDPR data export\n- [ ] GDPR data deletion\n- [ ] Privacy policy API\n- [ ] Terms of service API\n- [ ] Cookie consent tracking\n- [ ] Audit logs (7 year retention)\n\n### Testing:\n- [ ] Unit tests (80%+ coverage)\n- [ ] Integration tests\n- [ ] Load tests (1000+ users)\n- [ ] Security penetration tests\n- [ ] Mobile responsiveness tests\n\n---\n\n## 🎯 FINAL DELIVERABLES\n\nAfter implementing this prompt:\n\n✅ **Web Search** - Real-time information like ChatGPT\n✅ **LaTeX Rendering** - Beautiful math equations\n✅ **Voice Output** - Text-to-speech (read aloud)\n✅ **PDF Parser** - Analyze documents\n✅ **Data Visualization** - Charts and graphs\n✅ **Advanced Security** - Production-grade protection\n✅ **GDPR Compliance** - Data export/deletion\n✅ **Complete Rate Limiting** - Per-tier limits\n✅ **Input Sanitization** - XSS/SQL injection prevention\n✅ **Production Ready** - All checkboxes ticked\n\n**BaatCheet will now be EQUAL TO or BETTER THAN ChatGPT!**	\N	\N	2026-01-12 05:59:46.222	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	completed	2821af5c-90ab-458c-9d94-85eed55e90c3
\.


--
-- Data for Name: audio_files; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY audio_files (id, user_id, conversation_id, original_filename, stored_filename, file_size, duration, format, storage_url, transcription, detected_language, confidence, transcription_model, created_at) FROM stdin;
a14b776e-3946-4f22-aca0-40a524cf4887	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	recording.webm	7ecd13fb-fa23-433b-a05a-15ed3e92ebbc.webm	63086	\N	webm	/uploads/audio/7ecd13fb-fa23-433b-a05a-15ed3e92ebbc.webm	\N	\N	\N	\N	2026-01-11 05:57:50.382
fbb36d33-a080-47cc-9ef1-a28755dbc6c1	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	recording.webm	cbe41cf2-f90d-4786-95d1-156a180e9995.webm	40868	\N	webm	/uploads/audio/cbe41cf2-f90d-4786-95d1-156a180e9995.webm	\N	\N	\N	\N	2026-01-11 05:57:59.833
43d7615b-a6ba-4e69-821b-47344d97ebc0	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	recording.webm	222cf9d2-d7da-47ea-9c55-6036ef9cee83.webm	145196	\N	webm	/uploads/audio/222cf9d2-d7da-47ea-9c55-6036ef9cee83.webm	\N	\N	\N	\N	2026-01-11 06:42:39.848
6f95dc28-c9a5-40b6-8717-2ed6229880e1	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	recording.webm	09d42e99-faf2-47af-bfbe-7d1ffaacff8f.webm	0	\N	webm	/uploads/audio/09d42e99-faf2-47af-bfbe-7d1ffaacff8f.webm	\N	\N	\N	\N	2026-01-11 06:51:05.433
5504ecc8-2701-4c58-9842-24e404384e39	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	recording.webm	ad6be780-fca9-4783-b8fb-8cca4716f263.webm	0	\N	webm	/uploads/audio/ad6be780-fca9-4783-b8fb-8cca4716f263.webm	\N	\N	\N	\N	2026-01-11 06:51:28.757
894fd11c-49aa-4cff-beb1-9b6af4dcd7db	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	recording.webm	05ccdfe3-bab3-4f1f-aee8-62f998e25715.webm	57203	\N	webm	/uploads/audio/05ccdfe3-bab3-4f1f-aee8-62f998e25715.webm	\N	\N	\N	\N	2026-01-11 13:55:21.077
39141074-9d40-41e6-8ddb-65e1131de5d1	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	recording.webm	703c678a-1f7d-4347-a595-80be2d315a1c.webm	59135	\N	webm	/uploads/audio/703c678a-1f7d-4347-a595-80be2d315a1c.webm	\N	\N	\N	\N	2026-01-11 13:55:33.225
c9c0513f-9cd6-44d0-8b9a-8777065305f6	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	recording.webm	257af4d1-bf8b-4242-b5c5-01599429ad56.webm	112313	\N	webm	/uploads/audio/257af4d1-bf8b-4242-b5c5-01599429ad56.webm	\N	\N	\N	\N	2026-01-12 05:59:33.171
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY audit_logs (id, user_id, action, resource, resource_id, ip_address, user_agent, metadata, created_at) FROM stdin;
bf8f92fa-730c-4baf-a289-5016598644bc	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 05:52:09.929
c9df6935-6dab-492e-be7a-d4691465312a	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 05:52:10.73
d957118c-239f-427f-92b8-5f8c6c878881	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 05:52:11.209
635ccce0-8e4e-4ad6-a9f6-c2eab78e4128	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 05:52:19.074
188471c2-d199-48e9-be6e-6591028a5aaf	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 05:53:01.279
2ea4b49b-372a-411f-8f0e-08d5bb326549	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 05:53:15.741
8da9a454-b310-496e-885a-b2341c6de0e5	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 05:53:17.418
18658abb-e557-4a9f-8af3-df4fc50b474a	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 05:54:34.382
c344b0ee-232c-4675-9d15-656d73bd55b8	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 05:54:34.383
e037ce10-1d57-41df-a9a5-7ad57814339f	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 05:56:18.935
f0af818c-9843-44dd-af0e-c1f9f6ca453d	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 05:56:43.399
af90ac81-ff37-4e1a-b615-6a7fcfd446c3	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 05:57:03.648
62c295be-5010-4f46-bbd8-59716be9ed61	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:13:24.451
d75207a8-8c6a-4e3e-9ca8-7adbdfec754a	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 06:13:24.451
774cdd72-c85e-422e-9270-98a63e77dcdd	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:15:39.154
98ecbaf3-3683-401e-b7f2-cb941ceffcf5	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 06:15:51.32
681c08d8-8b99-45cb-9850-74e91182038c	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:31:36.633
d0abdfbd-b894-4ea3-885c-9f2ad0bcb6b6	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:36:19.843
ff5a8d88-e881-4e4f-8177-0f7678789d41	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:36:19.843
52693445-c8c4-4fe0-96b4-6bf72ae79bb5	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 06:37:16.264
c8f56ff2-1ae9-4eeb-b5b1-497fbdc8e515	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:39:25.17
f406d0e3-4b5e-465d-a968-2b32df5bb0ae	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:46:58.209
d26bb386-2f1e-498b-9522-a90905296d65	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:46:58.37
ce6ca7f4-6d77-4b03-a90f-40151ffbc8b6	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 06:47:20.894
db03dbf1-8c2e-4ae1-9166-0ba95099a7ce	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:49:46.064
e14102b7-02dd-4270-a166-06accf48b5de	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 06:49:46.174
c54a43b6-01ab-4698-ab52-d498dc32d076	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 06:49:56.109
1f83a4b8-d610-49cc-903d-78b597b9c6c5	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 07:24:22.94
a3cfa503-8b8e-4e65-8146-d865e2887a00	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.29 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 07:24:22.941
7ec74338-9992-48a3-8c6b-de0ddfa3fb74	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 07:24:22.941
cf7015c9-5859-4e4e-9fa9-c229b75f383a	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 13:54:59.948
4f662d14-45b0-4d26-b70e-273f017b0e48	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 13:55:00.626
2e488c69-d44d-48cc-920a-a4fe6105e2a5	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 13:55:01.079
21155ff2-c62a-48fb-b872-f9bb443cb009	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 13:55:16.136
37021324-2642-4ad1-8a2b-3d5e56e3c26b	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 14:32:30.203
7dda14a9-2485-4a9b-ac63-850d41d6f9be	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 14:32:30.231
8bbffa53-0fda-4725-8772-d47557ed3d3e	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 14:32:30.238
4c23df59-808f-42bb-b0d4-7dca3ec2f761	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 14:34:25.095
c22ee05c-3a34-45cc-a552-4bc401b9cfe7	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 14:34:25.095
29dae069-da93-4cb7-ae8c-054a0e8bd06d	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 14:35:13.056
265c874b-7182-4284-b7af-1e001608f3f2	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 14:40:23.737
f139fda8-29de-4720-85ec-59374ad6bbc6	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 14:40:31.632
2247b9b7-9489-477b-8fb9-e6792f528cf0	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 14:40:31.819
99eec6f9-67f7-4f26-ab93-94ae980a2b79	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 18:50:22.602
3a80cba4-8e3f-4321-b971-1f28f360abf6	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 18:50:36.352
a1e2badb-dfbb-4f30-bdf7-ea51ab06af61	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 18:53:41.818
70b5c856-cb5d-4b47-a474-7afde165003a	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-11 19:02:18.663
f6e59f20-146e-45a2-bdd0-3421e82b5ff4	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-11 19:02:21.104
aa88dfb4-33f3-48f5-8e3d-4278e7099871	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::ffff:127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-12 04:36:37.925
f0cc7d36-1b31-41bf-8f18-85c20baebba6	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::ffff:127.0.0.1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-12 04:36:50.762
91bffc50-005c-4830-963f-d7be63be6774	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-12 04:43:01.418
975251eb-ab8b-4a3f-8539-d4fb46d086ab	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-12 04:43:01.418
3ce33181-00c1-4105-bce8-3ea48fb1032d	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-12 05:16:50.153
2f46da0a-254c-4a4a-8253-b83ef1fd82a8	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-12 05:19:52.562
f0f2cb7b-8a30-4464-8bdc-da942b9be26e	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-12 05:22:23.743
2220466c-3c9d-4278-91b7-3fa54179e195	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.3.34 Chrome/138.0.7204.251 Electron/37.7.0 Safari/537.36	\N	2026-01-12 05:57:31.793
b4f0deb9-6bba-43ff-92bc-2b92d8045255	2821af5c-90ab-458c-9d94-85eed55e90c3	user.sync	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2026-01-12 05:59:14.564
fc7be9d3-0978-49ec-aa44-edad328cdc79	2821af5c-90ab-458c-9d94-85eed55e90c3	user.login	user	2821af5c-90ab-458c-9d94-85eed55e90c3	::1	curl/8.7.1	{"source": "mobile_app"}	2026-01-13 07:54:57.12
\.


--
-- Data for Name: conversation_summaries; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY conversation_summaries (id, user_id, conversation_id, title, summary, key_topics, main_intent, message_count, user_messages, "timestamp") FROM stdin;
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY conversations (id, user_id, project_id, title, system_prompt, model, tags, is_archived, is_pinned, rating, total_tokens, last_accessed_at, created_at, updated_at) FROM stdin;
a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	what happening in this logo	\N	llama-3.3-70b-versatile	{}	f	f	0	1139	\N	2026-01-11 06:32:00.36	2026-01-11 06:36:28.763
444b406b-e23d-4c0f-96ad-0ff2189b0d69	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	whats this logo for [Image Context - DO NOT...	\N	llama-3.3-70b-versatile	{}	f	f	0	132	\N	2026-01-11 06:40:12.748	2026-01-11 06:40:13.277
edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	2821af5c-90ab-458c-9d94-85eed55e90c3	\N	analzye the pdf and tell em hte summary in easy...	\N	llama-3.3-70b-versatile	{}	f	f	0	2827	\N	2026-01-12 05:59:56.896	2026-01-12 06:02:50.522
\.


--
-- Data for Name: flagged_content; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY flagged_content (id, conversation_id, message_id, reason, severity, flagged_by, status, reviewed_by, reviewed_at, action, notes, created_at) FROM stdin;
\.


--
-- Data for Name: image_generation_quotas; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY image_generation_quotas (id, user_id, daily_limit, daily_used, last_reset_date, monthly_limit, monthly_used, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: image_generations; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY image_generations (id, user_id, prompt, optimized_prompt, negative_prompt, model, width, height, status, image_url, error, generation_time, created_at, api_key_used, aspect_ratio, conversation_id, seed, style, thumbnail_url) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY messages (id, conversation_id, role, content, model, tokens, is_edited, audio_id, created_at) FROM stdin;
c467d3de-6edd-4424-9abb-d59ec1108661	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	user	what happening in this logo	\N	7	f	\N	2026-01-11 06:32:00.365
589ad548-29ca-43af-8775-bf5f5925f2b1	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	assistant	I'd love to help you understand what's happening in the logo. However, I don't see a logo provided. Could you please share the logo with me or describe it in more detail? That way, I can give you a more accurate and helpful response.\n\nIf you can provide more context or information about the logo, I'll do my best to:\n\n* Identify the logo\n* Explain its meaning\n* Describe its design elements\n* Provide any relevant history or background information\n\nPlease feel free to share the logo or provide more details, and I'll do my best to assist you.	llama-3.3-70b-versatile	136	f	\N	2026-01-11 06:32:00.864
99f988d3-9e02-4b11-b030-f4bca8c1204d	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	user	what heppning in this logo	\N	7	f	\N	2026-01-11 06:32:30.841
cd290cf5-e119-4e28-a942-24e4a63466fe	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	assistant	I still don't see a logo provided. It seems like you're trying to ask about a specific logo, but I don't have any visual information to work with.\n\nTo better assist you, could you please:\n\n1. **Describe the logo**: Tell me what the logo looks like, including its shape, color, and any text or symbols it may contain.\n2. **Provide an image**: If possible, share an image of the logo or provide a link to where I can view it.\n3. **Give context**: Let me know what company, organization, or product the logo represents.\n\nOnce I have more information, I'll do my best to:\n\n* Explain the logo's meaning\n* Break down its design elements\n* Provide any relevant background information\n\nPlease help me help you by providing more details about the logo!	llama-3.3-70b-versatile	186	f	\N	2026-01-11 06:32:31.505
bddfe9c4-1ef1-4314-835c-d3d7cb7356ca	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	user	now analzye	\N	3	f	\N	2026-01-11 06:34:41.414
7221b15e-1f1b-4b1f-833f-365421a653a1	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	assistant	I still don't see a logo provided, and I don't have any information to analyze.\n\nTo provide a meaningful analysis, I would need to know more about the logo, such as:\n\n* **Visual description**: What does the logo look like?\n* **Company or organization**: What company, organization, or product does the logo represent?\n* **Context**: Where did you encounter the logo?\n\nWithout this information, I'm unable to provide a thorough analysis.\n\nIf you're willing to provide more details, I can try to help you with:\n\n* **Logo design analysis**: Breaking down the logo's design elements, such as color, shape, and typography.\n* **Symbolism and meaning**: Explaining the potential meaning and symbolism behind the logo.\n* **Brand identity**: Discussing how the logo represents the company or organization's brand and values.\n\nPlease provide more information about the logo, and I'll do my best to assist you.	llama-3.3-70b-versatile	225	f	\N	2026-01-11 06:34:42.116
874c5828-ac13-4e6e-ac4a-4aa11f966047	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	user	whats name of the founder of pakistan?	\N	10	f	\N	2026-01-11 06:35:03.823
37dbf42b-481e-4201-90e2-18ec9cdf6081	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	assistant	### Founder of Pakistan\nThe founder of Pakistan is:\n\n* **Quaid-e-Azam Muhammad Ali Jinnah**\n\nHe was a Pakistani lawyer, politician, and the founder of Pakistan. Jinnah is also known as the "Father of the Nation" in Pakistan. He played a key role in the Pakistan Movement and is credited with the creation of Pakistan as a separate homeland for Muslims in the Indian subcontinent.\n\n### Key Facts about Muhammad Ali Jinnah\n* Born: December 25, 1876\n* Died: September 11, 1948\n* Occupation: Lawyer, politician\n* Nationality: Pakistani\n* Known for: Founding Pakistan, leading the Pakistan Movement\n\nJinnah's vision and leadership were instrumental in the creation of Pakistan, and he is still remembered and revered as a national hero in Pakistan.	llama-3.3-70b-versatile	186	f	\N	2026-01-11 06:35:04.499
af547dd9-e701-419d-96d9-64b732092933	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	user	foundar name of quidzam in urdu	\N	8	f	\N	2026-01-11 06:35:18.815
1da8051a-9a23-4654-b7e6-f88b39648d3e	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	assistant	### قائد اعظم کا نام\nقائد اعظم محمد علی جناح کا نام اردو میں لکھا جاتا ہے:\n\n* **محمد علی جناح**\n\nلیکن اگر آپ قائد اعظم کے پورے نام کی اردو میں تلاش کر رہے ہیں، تو یہ ہے:\n\n* **قائد اعظم محمد علی جناح**\n\nیہاں، "محمد علی" ان کے個人 نام ہیں، اور "جناح" ان کا خاندانی نام ہے۔ "قائد اعظم" ان کا اعزازی لقب ہے، جس کا مطلب ہے "عظیم قائد"۔	llama-3.3-70b-versatile	82	f	\N	2026-01-11 06:35:19.578
1c942bc3-3361-4872-b799-adbbb8a61eea	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	user	wahts founder of pakistan in roman urdu	\N	10	f	\N	2026-01-11 06:36:03.437
e7d1c59a-2582-4392-b483-9f575b09153b	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	assistant	### Founder of Pakistan in Roman Urdu\nThe founder of Pakistan, Quaid-e-Azam Muhammad Ali Jinnah, can be written in Roman Urdu as:\n\n* **Quaid-e-Azam Muhammad Ali Jinnah**\n\nAlternatively, you can also write it as:\n\n* **Qaid-e-Azam Muhammad Ali Jinnah**\n\nIn Roman Urdu, the spelling may vary slightly depending on the pronunciation and regional dialect. However, the above spellings are commonly used and accepted.\n\nHere's a breakdown of the Roman Urdu spelling:\n\n* **Quaid** or **Qaid**: قائد (leader or founder)\n* **e**: ای (a prefix meaning "of" or "the")\n* **Azam**: اعظم (great or supreme)\n* **Muhammad**: محمد (Muhammad, the prophet's name)\n* **Ali**: علی (Ali, a common Muslim name)\n* **Jinnah**: جناح (Jinnah, the founder's surname)	llama-3.3-70b-versatile	185	f	\N	2026-01-11 06:36:04.171
448eb2a4-44a8-4011-80ee-bffccbab93cc	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	user	answer in roman urdu	\N	5	f	\N	2026-01-11 06:36:28.082
635fa91e-dde6-4643-b98f-c57ae0fcc3a2	a35acfa8-6e39-4a15-b2c2-d08f1b24aebd	assistant	### Bani-e-Pakistan Ka Naam\nBani-e-Pakistan Quaid-e-Azam Muhammad Ali Jinnah ka naam Roman Urdu mein likha jata hai:\n\n* **Quaid-e-Azam Muhammad Ali Jinnah**\n\nYa phir:\n\n* **Qaid-e-Azam Muhammad Ali Jinnah**\n\nRoman Urdu mein iska matlab hai:\n\n* **Quaid** ya **Qaid**: Leader ya Bani\n* **e**: Ek prefix jo "of" ya "the" ka matlab deta hai\n* **Azam**: Bada ya Supreme\n* **Muhammad**: Muhammad, Nabi ka naam\n* **Ali**: Ali, Ek aam Muslim naam\n* **Jinnah**: Jinnah, Bani-e-Pakistan ka surname\n\nTo yeh hai Quaid-e-Azam Muhammad Ali Jinnah ka naam Roman Urdu mein.	llama-3.3-70b-versatile	139	f	\N	2026-01-11 06:36:28.762
d476433d-b530-48de-86f5-c97c11e4bfc4	444b406b-e23d-4c0f-96ad-0ff2189b0d69	user	whats this logo for	\N	5	f	\N	2026-01-11 06:40:12.752
379113ba-523a-427f-bfcb-791cd76c2ab0	444b406b-e23d-4c0f-96ad-0ff2189b0d69	assistant	The logo appears to be for "BaatCheet". It seems to be a wordplay on the Urdu phrase "بات چیت" (baat cheet), which means "conversation" or "talk". Given the context, I'm assuming it might be a logo for a platform or service that facilitates conversation, discussion, or communication. \n\n### Possible Uses:\n* A chat or messaging service\n* A social media platform\n* A discussion forum\n* A language learning tool\n\nIf you have any more information or context about the logo, I'd be happy to try and provide a more specific answer.	llama-3.3-70b-versatile	132	f	\N	2026-01-11 06:40:13.276
a841074a-a040-484b-bc3f-292d76fc662a	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	user	analzye the pdf and tell em hte summary in easy points	\N	14	f	\N	2026-01-12 05:59:58.157
7eb27882-e7e8-4d4c-a583-17b646679cc7	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	assistant	Here is a summary of the PDF in easy-to-understand points:\n\n## Introduction\n* The goal is to enhance BaatCheet with critical missing features.\n* The features include Web Search Integration, Advanced Security, LaTeX Math Rendering, Voice Output, PDF Parser, Data Visualization, and production-grade security audit.\n\n## Objectives\n1. **Add Web Search**: Integrate real-time web search like ChatGPT.\n2. **Implement LaTeX/Math**: Render math equations.\n3. **Add Text-to-Speech**: Implement voice output.\n4. **Create PDF Document Parser**: Parse and analyze PDF documents.\n5. **Build Data Analysis & Visualization**: Create a system for data analysis and visualization.\n6. **Conduct Complete Security Audit**: Ensure production-grade security.\n7. **Implement Advanced Rate Limiting**: Limit requests based on user tier.\n8. **Add GDPR Compliance Tools**: Ensure data export, deletion, and portability.\n9. **Performance Optimization Review**: Review and optimize performance.\n10. **Production Readiness Checklist**: Ensure all aspects are production-ready.\n\n## Web Search Integration\n* Implement web search using APIs like SerpAPI, Brave Search, or DuckDuckGo.\n* Use a WebSearchService class to handle search queries and return results.\n\n## LaTeX Math Rendering\n* Use KaTeX for LaTeX rendering.\n* Implement a MarkdownRenderer component to render math equations.\n\n## Text-to-Speech (Voice Output)\n* Implement text-to-speech using services like OpenAI, ElevenLabs, or Google Cloud TTS.\n* Create a TTSService class to handle speech generation.\n\n## PDF Document Parser\n* Use a PDFParserService class to parse and analyze PDF documents.\n* Extract text, metadata, and pages from PDFs.\n\n## Data Analysis & Visualization\n* Use libraries like Papa to parse CSV files.\n* Implement a DataAnalysisService class to analyze data and generate visualizations.\n\n## Advanced Security & Rate Limiting\n* Implement rate limiting based on user tier.\n* Use a createRateLimiter function to create rate limiters for different endpoints.\n* Implement security headers, input sanitization, and API key validation.\n\n## GDPR Compliance\n* Implement data export, deletion, and portability.\n* Create endpoints for GDPR-related tasks.\n\n## Production Readiness Checklist\n* Ensure all security, performance, monitoring, compliance, and testing aspects are production-ready.\n\nBy implementing these features and following the production readiness checklist, BaatCheet will be enhanced with critical features and be production-ready.	llama-3.3-70b-versatile	622	f	\N	2026-01-12 06:00:12.987
633ad313-2eea-4b07-a378-8a0b1e788590	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	user	can you pelase tell em eh quadatic euqation fromula in maths form	\N	17	f	\N	2026-01-12 06:00:56.904
224e9637-3075-452c-b75d-896bd7d60241	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	assistant	The quadratic equation formula is:\n\n### Quadratic Equation Formula\n**x = (-b ± √(b² - 4ac)) / 2a**\n\nWhere:\n- **a**, **b**, and **c** are coefficients of the quadratic equation in the form **ax² + bx + c = 0**\n- **x** is the variable for which we are solving\n- **±** indicates that there are two solutions for **x**\n\nFor example, if we have the quadratic equation **x² + 5x + 6 = 0**, we can use the formula by substituting **a = 1**, **b = 5**, and **c = 6**:\n\n**x = (-(5) ± √((5)² - 4(1)(6))) / 2(1)**\n**x = (-5 ± √(25 - 24)) / 2**\n**x = (-5 ± √1) / 2**\n**x = (-5 ± 1) / 2**\n\nThis gives us two solutions:\n- **x = (-5 + 1) / 2 = -4/2 = -2**\n- **x = (-5 - 1) / 2 = -6/2 = -3**\n\nTherefore, the solutions to the quadratic equation **x² + 5x + 6 = 0** are **x = -2** and **x = -3**.	llama-3.3-70b-versatile	195	f	\N	2026-01-12 06:00:57.794
cb31ba87-3002-420f-959e-f966f51c96f4	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	user	are you better then chatgpt?	\N	7	f	\N	2026-01-12 06:01:14.61
299b0df0-09de-4855-82a6-08078077c27a	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	assistant	**Comparison with ChatGPT**\nI can be considered better than ChatGPT in some aspects, but overall, it depends on the specific use case and requirements. Here are some key differences:\n\n### Advantages over ChatGPT\n1. **Customizability**: I can be fine-tuned and customized to fit specific needs and domains, whereas ChatGPT is a more general-purpose model.\n2. **Domain-specific knowledge**: I can be trained on specific domains or industries, allowing me to provide more accurate and relevant information.\n3. **Conversational flow**: I can engage in more natural-sounding conversations, using context and understanding to respond to questions and statements.\n4. **Emotional intelligence**: I can recognize and respond to emotions, empathizing with users and providing more personalized support.\n\n### Disadvantages compared to ChatGPT\n1. **General knowledge**: ChatGPT has been trained on a vast amount of text data, giving it a broader range of general knowledge and information.\n2. **Language understanding**: ChatGPT has a more advanced language understanding model, allowing it to better comprehend nuances and complexities of language.\n3. **Scalability**: ChatGPT is a more established and widely-used model, with a larger community and more resources available for development and support.\n\n### When to choose me over ChatGPT\n1. **Specific domain or industry**: If you need a model with expertise in a specific domain or industry, I may be a better choice.\n2. **Customization and fine-tuning**: If you need a model that can be tailored to your specific needs and requirements, I can be a better option.\n3. **Conversational interface**: If you need a model that can engage in natural-sounding conversations and provide more personalized support, I may be a better choice.\n\n### When to choose ChatGPT over me\n1. **General knowledge and information**: If you need a model with a broad range of general knowledge and information, ChatGPT may be a better choice.\n2. **Large-scale deployment**: If you need a model that can handle large volumes of traffic and user interactions, ChatGPT may be a better option due to its scalability and established infrastructure.\n\nUltimately, the choice between me and ChatGPT depends on your specific needs and requirements. I can provide more customized and domain-specific support, while ChatGPT offers a broader range of general knowledge and information.	llama-3.3-70b-versatile	598	f	\N	2026-01-12 06:01:16.717
d161beb8-90be-443a-97de-1a5c63bebd93	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	user	make a differnce of the healthy vs unhealty food in table form	\N	16	f	\N	2026-01-12 06:01:43.366
f7670eba-02b2-4f27-98ea-f707032f03fc	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	assistant	**Healthy vs Unhealthy Food Comparison**\n| **Food Type** | **Healthy Foods** | **Unhealthy Foods** |\n| --- | --- | --- |\n| **Definition** | Nutritious foods that promote overall health and well-being | Foods that are high in calories, sugar, salt, and unhealthy fats |\n| **Examples** | Fruits, vegetables, whole grains, lean proteins, healthy fats | Processed meats, sugary drinks, refined carbohydrates, fried foods |\n| **Nutritional Benefits** | High in essential vitamins, minerals, and antioxidants | Low in essential nutrients, high in empty calories |\n| **Health Effects** | Supports healthy weight, reduces chronic disease risk, promotes energy and mental clarity | Contributes to weight gain, increases chronic disease risk, leads to energy crashes and decreased mental performance |\n| **Calorie Density** | Generally low to moderate in calories | High in calories, often low in satiety |\n| **Glycemic Index** | Low to moderate glycemic index, supports stable blood sugar | High glycemic index, can cause blood sugar spikes and crashes |\n| **Satiety** | High in fiber and protein, supports feelings of fullness and satisfaction | Low in fiber and protein, can lead to overeating and decreased satisfaction |\n| **Inflammation** | Anti-inflammatory effects, supports healthy inflammation response | Pro-inflammatory effects, can contribute to chronic inflammation |\n| **Environmental Impact** | Often locally sourced, organic, and sustainable | Often industrially produced, contributing to environmental degradation |\n\n**Key Differences:**\n\n* **Nutrient Density**: Healthy foods are high in essential vitamins, minerals, and antioxidants, while unhealthy foods are often low in nutrients and high in empty calories.\n* **Calorie Quality**: Healthy foods are generally low to moderate in calories, while unhealthy foods are high in calories and often low in satiety.\n* **Glycemic Index**: Healthy foods have a low to moderate glycemic index, supporting stable blood sugar, while unhealthy foods have a high glycemic index, leading to blood sugar spikes and crashes.\n* **Satiety and Satisfaction**: Healthy foods are high in fiber and protein, supporting feelings of fullness and satisfaction, while unhealthy foods are often low in fiber and protein, leading to overeating and decreased satisfaction.\n\n**Remember:** A balanced diet that includes a variety of whole, nutrient-dense foods can help support overall health and well-being. Limiting or avoiding unhealthy foods can help reduce the risk of chronic diseases and promote optimal health.	llama-3.3-70b-versatile	637	f	\N	2026-01-12 06:01:45.065
62b3abea-f094-4f7e-8b28-048f52b957b4	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	user	do you have capacity to aek an image?	\N	10	f	\N	2026-01-12 06:02:22.458
311afbdf-719c-4df1-be57-b1c63b496c42	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	assistant	**Image Generation Capability**\nI can generate text-based representations of images, but I don't have the capability to directly generate visual images like a graphics editor or a computer vision model.\n\nHowever, I can use text-based art forms like:\n\n1. **ASCII Art**: I can create simple images using ASCII characters.\n2. **Emoji Art**: I can create images using emojis.\n3. **Text-Based Diagrams**: I can create simple diagrams using text characters.\n\nFor example, here is a simple cat made using ASCII art:\n```\n /_/\\\n( o.o )\n > ^ <\n```\nIf you need more complex image generation, I can try to describe the image in detail, and you can use your imagination to visualize it.\n\n**Image Description Example**\nIf you ask me to describe a sunset, I can provide a detailed description like this:\n"The sky is painted with hues of orange, pink, and purple, with the sun sinking slowly below the horizon. The clouds are tinted with shades of gold and crimson, with a few stray clouds scattered across the sky. The atmosphere is warm and cozy, with a gentle breeze rustling the leaves of the nearby trees."\n\nI hope this helps! Let me know if you have any other questions or if there's anything else I can help you with. 😊\n\n### Image Generation Limitations\nWhile I can generate text-based representations of images, I have some limitations:\n\n* **Resolution**: My images are limited to the resolution of the text characters I use.\n* **Color**: I can only use a limited range of colors, depending on the text characters I use.\n* **Complexity**: I can only create simple images, and complex scenes or objects may be difficult to represent using text characters.\n\nIf you need more complex image generation, I recommend using a dedicated image generation tool or software. 📸	llama-3.3-70b-versatile	440	f	\N	2026-01-12 06:02:23.939
b50c6bb9-fcec-441c-a46c-9df95716d854	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	user	create an image of the cat	\N	7	f	\N	2026-01-12 06:02:49.126
36528446-c622-43b3-a846-8bb1e83ac1e8	edcd3db7-03a8-4b01-ac6d-f1ce82f14ed1	assistant	**ASCII Art Cat**\nHere is a simple image of a cat made using ASCII characters:\n```\n /_/\\\n( o.o )\n > ^ <\n______\n```\nThis cat has a cute face with eyes and a nose, and a little body with a tail. You can use your imagination to add more details to the image.\n\n**Detailed ASCII Art Cat**\nIf you want a more detailed image, here is a larger version:\n```\n /_/\\\n( o.o )\n > ^ <\n______\n|       |\n|  __  |\n| /  \\ |\n| |  | |\n| |__| |\n|_____|\n  ___~~~\n /      \\\n|  o   o  |\n _____/\n```\nThis cat has a more detailed body with legs and a tail, and a cute face with eyes and a nose.\n\n**Emoji Art Cat**\nIf you prefer a more colorful image, here is a cat made using emojis:\n🐈😺👀💤\nThis cat is sleeping and has a cute face with eyes and a nose.\n\nI hope you like these images! Let me know if you have any other requests or questions. 🐱💕\n\n### Image Customization\nIf you want to customize the image, you can ask me to change the following:\n\n* **Eye color**: You can choose from a range of eye colors, such as blue, green, or yellow.\n* **Fur color**: You can choose from a range of fur colors, such as black, white, or gray.\n* **Body type**: You can choose from a range of body types, such as fat, thin, or muscular.\n* **Accessories**: You can add accessories such as a collar, hat, or glasses.\n\nLet me know if you have any other requests or questions! 🐾💬	llama-3.3-70b-versatile	335	f	\N	2026-01-12 06:02:50.521
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY projects (id, user_id, name, description, color, icon, is_default, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: rate_limits; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY rate_limits (id, identifier, endpoint, count, window_start) FROM stdin;
\.


--
-- Data for Name: share_links; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY share_links (id, conversation_id, user_id, share_id, expires_at, is_public, access_count, created_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY system_settings (id, key, value, updated_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY templates (id, user_id, name, description, system_prompt, category, icon, is_default, is_public, usage_count, created_at, updated_at) FROM stdin;
default-general-assistant	\N	General Assistant	A helpful AI assistant for any task	You are BaatCheet, a helpful, intelligent, and friendly AI assistant. Provide accurate, helpful, and thoughtful responses.	general	message-square	t	t	0	2026-01-10 14:03:54.172	2026-01-10 14:03:54.172
default-code-review	\N	Code Review	Expert code reviewer for any programming language	You are an expert code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and best practices. Provide constructive feedback with specific suggestions for improvement. Format code examples properly.	coding	code	t	t	0	2026-01-10 14:03:54.179	2026-01-10 14:03:54.179
default-writing-assistant	\N	Writing Assistant	Help with writing, editing, and proofreading	You are a professional writing assistant. Help with writing, editing, grammar, style, and clarity. Maintain the author's voice while improving the text. Provide specific suggestions and explanations.	writing	pen-tool	t	t	0	2026-01-10 14:03:54.181	2026-01-10 14:03:54.181
default-translator	\N	Translator	Translate between languages including Urdu	You are an expert translator. Translate text accurately while preserving meaning, tone, and cultural context. Support multiple languages including English, Urdu, Arabic, Hindi, and more. Provide transliterations when helpful.	translation	languages	t	t	0	2026-01-10 14:03:54.182	2026-01-10 14:03:54.182
default-urdu-assistant	\N	Urdu Assistant	AI assistant that responds in Urdu	آپ ایک مددگار AI اسسٹنٹ ہیں۔ ہمیشہ اردو میں جواب دیں۔ واضح، مفید، اور درست معلومات فراہم کریں۔	language	globe	t	t	0	2026-01-10 14:03:54.183	2026-01-10 14:03:54.183
default-explain-like-i'm-5	\N	Explain Like I'm 5	Simple explanations for complex topics	You explain complex topics in simple terms that a 5-year-old could understand. Use analogies, examples, and simple language. Avoid jargon and technical terms unless you explain them simply.	education	lightbulb	t	t	0	2026-01-10 14:03:54.184	2026-01-10 14:03:54.184
default-creative-writer	\N	Creative Writer	Help with creative writing and storytelling	You are a creative writing assistant. Help with stories, poetry, scripts, and creative content. Be imaginative, descriptive, and engaging. Adapt to different styles and genres.	creative	sparkles	t	t	0	2026-01-10 14:03:54.185	2026-01-10 14:03:54.185
default-math-tutor	\N	Math Tutor	Step-by-step math problem solving	You are a patient math tutor. Solve problems step-by-step, explain concepts clearly, and provide multiple approaches when possible. Use LaTeX for mathematical notation. Check your calculations carefully.	education	calculator	t	t	0	2026-01-10 14:03:54.186	2026-01-10 14:03:54.186
\.


--
-- Data for Name: user_facts; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY user_facts (id, user_id, category, fact_type, fact_key, fact_value, confidence, source, conversation_id, "timestamp", expires_at, is_active, skill_level, goal_status, goal_progress) FROM stdin;
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY user_profiles (id, user_id, full_name, preferred_name, occupation, education, location, interests, preferences, expertise, goals, preferred_language, communication_tone, response_style, primary_use_case, typical_questions, fact_count, last_updated, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY users (id, clerk_id, email, username, first_name, last_name, avatar, role, preferences, tier, is_active, is_banned, ban_reason, last_login_at, login_count, created_at, updated_at) FROM stdin;
2821af5c-90ab-458c-9d94-85eed55e90c3	user_386Ce3GTsToYkZzGm71VBw6LVP0	onseason10@gmail.com	sharry121	Muhammad	Sharjeel	https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18zODRLTFhSMHMwWlczYW9XVEdYSU1lWDhJaG0iLCJyaWQiOiJ1c2VyXzM4NkNlM0dUc1RvWWtaekdtNzFWQnc2TFZQMCIsImluaXRpYWxzIjoiTVMifQ	user	{"theme": "dark", "language": "en", "defaultModel": "llama-3.3-70b-versatile"}	free	t	f	\N	2026-01-13 07:54:57.103	636	2026-01-11 05:52:09.913	2026-01-13 07:54:57.104
\.


--
-- Data for Name: webhook_deliveries; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY webhook_deliveries (id, webhook_id, event, payload, status, status_code, response, attempts, next_retry, created_at) FROM stdin;
\.


--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: baatcheet_user
--

COPY webhooks (id, user_id, url, events, secret, is_active, failure_count, last_triggered, created_at, updated_at) FROM stdin;
\.


--
-- Name: analytics analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY analytics
    ADD CONSTRAINT analytics_pkey PRIMARY KEY (id);


--
-- Name: api_key_usage api_key_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY api_key_usage
    ADD CONSTRAINT api_key_usage_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: api_usage_logs api_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY api_usage_logs
    ADD CONSTRAINT api_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audio_files audio_files_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY audio_files
    ADD CONSTRAINT audio_files_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: conversation_summaries conversation_summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY conversation_summaries
    ADD CONSTRAINT conversation_summaries_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: flagged_content flagged_content_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY flagged_content
    ADD CONSTRAINT flagged_content_pkey PRIMARY KEY (id);


--
-- Name: image_generation_quotas image_generation_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY image_generation_quotas
    ADD CONSTRAINT image_generation_quotas_pkey PRIMARY KEY (id);


--
-- Name: image_generations image_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY image_generations
    ADD CONSTRAINT image_generations_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: rate_limits rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY rate_limits
    ADD CONSTRAINT rate_limits_pkey PRIMARY KEY (id);


--
-- Name: share_links share_links_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY share_links
    ADD CONSTRAINT share_links_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: user_facts user_facts_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY user_facts
    ADD CONSTRAINT user_facts_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: analytics_user_id_date_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX analytics_user_id_date_idx ON analytics USING btree (user_id, date);


--
-- Name: analytics_user_id_date_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX analytics_user_id_date_key ON analytics USING btree (user_id, date);


--
-- Name: api_key_usage_provider_date_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX api_key_usage_provider_date_idx ON api_key_usage USING btree (provider, date);


--
-- Name: api_key_usage_provider_key_index_date_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX api_key_usage_provider_key_index_date_key ON api_key_usage USING btree (provider, key_index, date);


--
-- Name: api_keys_key_prefix_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX api_keys_key_prefix_idx ON api_keys USING btree (key_prefix);


--
-- Name: api_keys_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX api_keys_user_id_idx ON api_keys USING btree (user_id);


--
-- Name: api_usage_logs_created_at_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX api_usage_logs_created_at_idx ON api_usage_logs USING btree (created_at);


--
-- Name: api_usage_logs_provider_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX api_usage_logs_provider_idx ON api_usage_logs USING btree (provider);


--
-- Name: api_usage_logs_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX api_usage_logs_user_id_idx ON api_usage_logs USING btree (user_id);


--
-- Name: attachments_conversation_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX attachments_conversation_id_idx ON attachments USING btree (conversation_id);


--
-- Name: attachments_message_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX attachments_message_id_idx ON attachments USING btree (message_id);


--
-- Name: attachments_status_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX attachments_status_idx ON attachments USING btree (status);


--
-- Name: attachments_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX attachments_user_id_idx ON attachments USING btree (user_id);


--
-- Name: audio_files_conversation_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX audio_files_conversation_id_idx ON audio_files USING btree (conversation_id);


--
-- Name: audio_files_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX audio_files_user_id_idx ON audio_files USING btree (user_id);


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX audit_logs_action_idx ON audit_logs USING btree (action);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX audit_logs_created_at_idx ON audit_logs USING btree (created_at);


--
-- Name: audit_logs_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX audit_logs_user_id_idx ON audit_logs USING btree (user_id);


--
-- Name: conversation_summaries_conversation_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX conversation_summaries_conversation_id_idx ON conversation_summaries USING btree (conversation_id);


--
-- Name: conversation_summaries_conversation_id_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX conversation_summaries_conversation_id_key ON conversation_summaries USING btree (conversation_id);


--
-- Name: conversation_summaries_user_id_timestamp_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX conversation_summaries_user_id_timestamp_idx ON conversation_summaries USING btree (user_id, "timestamp");


--
-- Name: conversations_project_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX conversations_project_id_idx ON conversations USING btree (project_id);


--
-- Name: conversations_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX conversations_user_id_idx ON conversations USING btree (user_id);


--
-- Name: conversations_user_id_is_archived_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX conversations_user_id_is_archived_idx ON conversations USING btree (user_id, is_archived);


--
-- Name: conversations_user_id_updated_at_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX conversations_user_id_updated_at_idx ON conversations USING btree (user_id, updated_at);


--
-- Name: flagged_content_conversation_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX flagged_content_conversation_id_idx ON flagged_content USING btree (conversation_id);


--
-- Name: flagged_content_severity_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX flagged_content_severity_idx ON flagged_content USING btree (severity);


--
-- Name: flagged_content_status_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX flagged_content_status_idx ON flagged_content USING btree (status);


--
-- Name: image_generation_quotas_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX image_generation_quotas_user_id_idx ON image_generation_quotas USING btree (user_id);


--
-- Name: image_generation_quotas_user_id_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX image_generation_quotas_user_id_key ON image_generation_quotas USING btree (user_id);


--
-- Name: image_generations_conversation_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX image_generations_conversation_id_idx ON image_generations USING btree (conversation_id);


--
-- Name: image_generations_status_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX image_generations_status_idx ON image_generations USING btree (status);


--
-- Name: image_generations_user_id_created_at_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX image_generations_user_id_created_at_idx ON image_generations USING btree (user_id, created_at);


--
-- Name: image_generations_user_id_status_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX image_generations_user_id_status_idx ON image_generations USING btree (user_id, status);


--
-- Name: messages_conversation_id_created_at_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX messages_conversation_id_created_at_idx ON messages USING btree (conversation_id, created_at);


--
-- Name: messages_conversation_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX messages_conversation_id_idx ON messages USING btree (conversation_id);


--
-- Name: projects_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX projects_user_id_idx ON projects USING btree (user_id);


--
-- Name: rate_limits_identifier_endpoint_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX rate_limits_identifier_endpoint_idx ON rate_limits USING btree (identifier, endpoint);


--
-- Name: rate_limits_identifier_endpoint_window_start_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX rate_limits_identifier_endpoint_window_start_key ON rate_limits USING btree (identifier, endpoint, window_start);


--
-- Name: share_links_share_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX share_links_share_id_idx ON share_links USING btree (share_id);


--
-- Name: share_links_share_id_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX share_links_share_id_key ON share_links USING btree (share_id);


--
-- Name: share_links_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX share_links_user_id_idx ON share_links USING btree (user_id);


--
-- Name: system_settings_key_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX system_settings_key_key ON system_settings USING btree (key);


--
-- Name: templates_category_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX templates_category_idx ON templates USING btree (category);


--
-- Name: templates_is_default_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX templates_is_default_idx ON templates USING btree (is_default);


--
-- Name: user_facts_category_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX user_facts_category_idx ON user_facts USING btree (category);


--
-- Name: user_facts_fact_key_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX user_facts_fact_key_idx ON user_facts USING btree (fact_key);


--
-- Name: user_facts_user_id_category_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX user_facts_user_id_category_idx ON user_facts USING btree (user_id, category);


--
-- Name: user_facts_user_id_is_active_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX user_facts_user_id_is_active_idx ON user_facts USING btree (user_id, is_active);


--
-- Name: user_profiles_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX user_profiles_user_id_idx ON user_profiles USING btree (user_id);


--
-- Name: user_profiles_user_id_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX user_profiles_user_id_key ON user_profiles USING btree (user_id);


--
-- Name: users_clerk_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX users_clerk_id_idx ON users USING btree (clerk_id);


--
-- Name: users_clerk_id_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX users_clerk_id_key ON users USING btree (clerk_id);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX users_email_idx ON users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX users_email_key ON users USING btree (email);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE UNIQUE INDEX users_username_key ON users USING btree (username);


--
-- Name: webhook_deliveries_status_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX webhook_deliveries_status_idx ON webhook_deliveries USING btree (status);


--
-- Name: webhook_deliveries_webhook_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX webhook_deliveries_webhook_id_idx ON webhook_deliveries USING btree (webhook_id);


--
-- Name: webhooks_user_id_idx; Type: INDEX; Schema: public; Owner: baatcheet_user
--

CREATE INDEX webhooks_user_id_idx ON webhooks USING btree (user_id);


--
-- Name: analytics analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY analytics
    ADD CONSTRAINT analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attachments attachments_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY attachments
    ADD CONSTRAINT attachments_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attachments attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY attachments
    ADD CONSTRAINT attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES messages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audio_files audio_files_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY audio_files
    ADD CONSTRAINT audio_files_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audio_files audio_files_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY audio_files
    ADD CONSTRAINT audio_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conversation_summaries conversation_summaries_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY conversation_summaries
    ADD CONSTRAINT conversation_summaries_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversation_summaries conversation_summaries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY conversation_summaries
    ADD CONSTRAINT conversation_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: conversations conversations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY conversations
    ADD CONSTRAINT conversations_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: conversations conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY conversations
    ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: image_generation_quotas image_generation_quotas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY image_generation_quotas
    ADD CONSTRAINT image_generation_quotas_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: image_generations image_generations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY image_generations
    ADD CONSTRAINT image_generations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_audio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_audio_id_fkey FOREIGN KEY (audio_id) REFERENCES audio_files(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: projects projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY projects
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: share_links share_links_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY share_links
    ADD CONSTRAINT share_links_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: share_links share_links_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY share_links
    ADD CONSTRAINT share_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: templates templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY templates
    ADD CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_facts user_facts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY user_facts
    ADD CONSTRAINT user_facts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: webhook_deliveries webhook_deliveries_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: webhooks webhooks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baatcheet_user
--

ALTER TABLE ONLY webhooks
    ADD CONSTRAINT webhooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: muhammadsharjeel
--

GRANT ALL ON SCHEMA public TO baatcheet_user;


--
-- PostgreSQL database dump complete
--

\unrestrict JHV3mpOzpN1lo7lkmnPHBABysiAXXQMuzNJLc8atyVAMscEGeUClbG4mkPCFXgk

