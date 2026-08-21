--
-- PostgreSQL database dump
--

\restrict OadhYR35HkkEU4QQeRfDovbqeW5Buu1fergvpoFjVqdmXrRuh8dpUZ88aE3l7VY

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.achs (
    id integer NOT NULL,
    bank_name text NOT NULL,
    balance text NOT NULL,
    full_item text NOT NULL,
    price integer NOT NULL,
    is_sold boolean DEFAULT false NOT NULL,
    seller_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.achs OWNER TO postgres;

--
-- Name: achs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.achs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.achs_id_seq OWNER TO postgres;

--
-- Name: achs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.achs_id_seq OWNED BY public.achs.id;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    content text NOT NULL,
    link text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.announcements_id_seq OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: card_bases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.card_bases (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.card_bases OWNER TO postgres;

--
-- Name: card_bases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.card_bases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.card_bases_id_seq OWNER TO postgres;

--
-- Name: card_bases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.card_bases_id_seq OWNED BY public.card_bases.id;


--
-- Name: cards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cards (
    id integer NOT NULL,
    card_number text NOT NULL,
    masked_card text NOT NULL,
    expiry text NOT NULL,
    cvv text NOT NULL,
    country text NOT NULL,
    extras text DEFAULT ''::text,
    price integer NOT NULL,
    is_first_hand boolean DEFAULT false NOT NULL,
    is_sold boolean DEFAULT false NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    hr_percent integer DEFAULT 80 NOT NULL,
    bin_data jsonb,
    base_id integer
);


ALTER TABLE public.cards OWNER TO postgres;

--
-- Name: cards_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cards_id_seq OWNER TO postgres;

--
-- Name: cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cards_id_seq OWNED BY public.cards.id;


--
-- Name: crypto_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crypto_addresses (
    id integer NOT NULL,
    user_id integer NOT NULL,
    currency text NOT NULL,
    address text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.crypto_addresses OWNER TO postgres;

--
-- Name: crypto_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crypto_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crypto_addresses_id_seq OWNER TO postgres;

--
-- Name: crypto_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crypto_addresses_id_seq OWNED BY public.crypto_addresses.id;


--
-- Name: crypto_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crypto_payments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    forebit_payment_id text NOT NULL,
    amount integer NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    purpose text DEFAULT 'deposit'::text NOT NULL,
    order_id integer,
    checkout_url text,
    metadata text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.crypto_payments OWNER TO postgres;

--
-- Name: crypto_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.crypto_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.crypto_payments_id_seq OWNER TO postgres;

--
-- Name: crypto_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.crypto_payments_id_seq OWNED BY public.crypto_payments.id;


--
-- Name: discount_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.discount_codes (
    id integer NOT NULL,
    code text NOT NULL,
    type text NOT NULL,
    value integer NOT NULL,
    min_order integer DEFAULT 0,
    max_uses integer,
    used_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.discount_codes OWNER TO postgres;

--
-- Name: discount_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.discount_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.discount_codes_id_seq OWNER TO postgres;

--
-- Name: discount_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.discount_codes_id_seq OWNED BY public.discount_codes.id;


--
-- Name: mail_reads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mail_reads (
    id integer NOT NULL,
    mail_id integer NOT NULL,
    user_id integer NOT NULL,
    read_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mail_reads OWNER TO postgres;

--
-- Name: mail_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mail_reads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mail_reads_id_seq OWNER TO postgres;

--
-- Name: mail_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mail_reads_id_seq OWNED BY public.mail_reads.id;


--
-- Name: mails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mails (
    id integer NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    sender_id integer NOT NULL,
    recipient_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.mails OWNER TO postgres;

--
-- Name: mails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mails_id_seq OWNER TO postgres;

--
-- Name: mails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mails_id_seq OWNED BY public.mails.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    variant_id integer,
    stock_item_id integer,
    card_id integer,
    item_type text DEFAULT 'product'::text NOT NULL,
    price integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_id text NOT NULL,
    user_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total integer NOT NULL,
    paid_amount integer DEFAULT 0 NOT NULL,
    delivery_content text DEFAULT ''::text NOT NULL,
    payment_method text DEFAULT ''::text NOT NULL,
    payment_note text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    image text DEFAULT ''::text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    pinned boolean DEFAULT false NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: redeem_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.redeem_codes (
    id integer NOT NULL,
    code text NOT NULL,
    amount integer NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    used_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.redeem_codes OWNER TO postgres;

--
-- Name: redeem_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.redeem_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.redeem_codes_id_seq OWNER TO postgres;

--
-- Name: redeem_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.redeem_codes_id_seq OWNED BY public.redeem_codes.id;


--
-- Name: referral_usages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_usages (
    id integer NOT NULL,
    referrer_id integer NOT NULL,
    redeemer_id integer NOT NULL,
    code text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.referral_usages OWNER TO postgres;

--
-- Name: referral_usages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.referral_usages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referral_usages_id_seq OWNER TO postgres;

--
-- Name: referral_usages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.referral_usages_id_seq OWNED BY public.referral_usages.id;


--
-- Name: seller_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seller_applications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    seller_code text NOT NULL,
    note text DEFAULT ''::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.seller_applications OWNER TO postgres;

--
-- Name: seller_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.seller_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seller_applications_id_seq OWNER TO postgres;

--
-- Name: seller_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.seller_applications_id_seq OWNED BY public.seller_applications.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_settings (
    key text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.site_settings OWNER TO postgres;

--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_items (
    id integer NOT NULL,
    variant_id integer NOT NULL,
    content text NOT NULL,
    is_sold boolean DEFAULT false NOT NULL,
    is_reserved boolean DEFAULT false NOT NULL,
    order_id integer,
    replacement_for_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    seller_id integer
);


ALTER TABLE public.stock_items OWNER TO postgres;

--
-- Name: stock_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_items_id_seq OWNER TO postgres;

--
-- Name: stock_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_items_id_seq OWNED BY public.stock_items.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    order_id text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    image_url text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    admin_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'refunded'::text, 'replaced'::text, 'resolved'::text])))
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_tickets_id_seq OWNER TO postgres;

--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: telegram_link_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telegram_link_tokens (
    id integer NOT NULL,
    token text NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.telegram_link_tokens OWNER TO postgres;

--
-- Name: telegram_link_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.telegram_link_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.telegram_link_tokens_id_seq OWNER TO postgres;

--
-- Name: telegram_link_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.telegram_link_tokens_id_seq OWNED BY public.telegram_link_tokens.id;


--
-- Name: telegram_referral_pending; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telegram_referral_pending (
    chat_id text NOT NULL,
    referrer_user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.telegram_referral_pending OWNER TO postgres;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    payment_method text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: uploaded_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.uploaded_images (
    id integer NOT NULL,
    filename text NOT NULL,
    mime_type text NOT NULL,
    data text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.uploaded_images OWNER TO postgres;

--
-- Name: uploaded_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.uploaded_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.uploaded_images_id_seq OWNER TO postgres;

--
-- Name: uploaded_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.uploaded_images_id_seq OWNED BY public.uploaded_images.id;


--
-- Name: user_ips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_ips (
    id integer NOT NULL,
    user_id integer NOT NULL,
    ip text NOT NULL,
    logged_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_ips OWNER TO postgres;

--
-- Name: user_ips_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_ips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_ips_id_seq OWNER TO postgres;

--
-- Name: user_ips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_ips_id_seq OWNED BY public.user_ips.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    email text NOT NULL,
    telegram_username text DEFAULT ''::text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_banned boolean DEFAULT false NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    protected_balance integer DEFAULT 0 NOT NULL,
    last_daily_spin timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_seller boolean DEFAULT false NOT NULL,
    seller_balance integer DEFAULT 0 NOT NULL,
    total_seller_earned integer DEFAULT 0 NOT NULL,
    login_code text DEFAULT ''::text NOT NULL,
    seller_type text DEFAULT 'bronze'::text NOT NULL,
    seller_display_name text DEFAULT ''::text NOT NULL,
    telegram_id text,
    telegram_connected boolean DEFAULT false NOT NULL,
    referral_code text,
    is_worker boolean DEFAULT false NOT NULL,
    telegram_chat_id text,
    last_telegram_name_reward timestamp without time zone,
    telegram_referred_by integer,
    telegram_referral_bonus_paid boolean DEFAULT false,
    telegram_name_active boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: variants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.variants (
    id integer NOT NULL,
    product_id integer NOT NULL,
    name text NOT NULL,
    price integer NOT NULL,
    min_quantity integer DEFAULT 1 NOT NULL,
    compare_price integer
);


ALTER TABLE public.variants OWNER TO postgres;

--
-- Name: variants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.variants_id_seq OWNER TO postgres;

--
-- Name: variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.variants_id_seq OWNED BY public.variants.id;


--
-- Name: verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    telegram_username text NOT NULL,
    channel_link text NOT NULL,
    channel_name text NOT NULL,
    agreed_to_terms boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_note text DEFAULT ''::text,
    term_message text DEFAULT ''::text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.verifications OWNER TO postgres;

--
-- Name: verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.verifications_id_seq OWNER TO postgres;

--
-- Name: verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.verifications_id_seq OWNED BY public.verifications.id;


--
-- Name: achs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achs ALTER COLUMN id SET DEFAULT nextval('public.achs_id_seq'::regclass);


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: card_bases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.card_bases ALTER COLUMN id SET DEFAULT nextval('public.card_bases_id_seq'::regclass);


--
-- Name: cards id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cards ALTER COLUMN id SET DEFAULT nextval('public.cards_id_seq'::regclass);


--
-- Name: crypto_addresses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_addresses ALTER COLUMN id SET DEFAULT nextval('public.crypto_addresses_id_seq'::regclass);


--
-- Name: crypto_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_payments ALTER COLUMN id SET DEFAULT nextval('public.crypto_payments_id_seq'::regclass);


--
-- Name: discount_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_codes ALTER COLUMN id SET DEFAULT nextval('public.discount_codes_id_seq'::regclass);


--
-- Name: mail_reads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mail_reads ALTER COLUMN id SET DEFAULT nextval('public.mail_reads_id_seq'::regclass);


--
-- Name: mails id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mails ALTER COLUMN id SET DEFAULT nextval('public.mails_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: redeem_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.redeem_codes ALTER COLUMN id SET DEFAULT nextval('public.redeem_codes_id_seq'::regclass);


--
-- Name: referral_usages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_usages ALTER COLUMN id SET DEFAULT nextval('public.referral_usages_id_seq'::regclass);


--
-- Name: seller_applications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_applications ALTER COLUMN id SET DEFAULT nextval('public.seller_applications_id_seq'::regclass);


--
-- Name: stock_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items ALTER COLUMN id SET DEFAULT nextval('public.stock_items_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: telegram_link_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_link_tokens ALTER COLUMN id SET DEFAULT nextval('public.telegram_link_tokens_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: uploaded_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_images ALTER COLUMN id SET DEFAULT nextval('public.uploaded_images_id_seq'::regclass);


--
-- Name: user_ips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_ips ALTER COLUMN id SET DEFAULT nextval('public.user_ips_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: variants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variants ALTER COLUMN id SET DEFAULT nextval('public.variants_id_seq'::regclass);


--
-- Name: verifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verifications ALTER COLUMN id SET DEFAULT nextval('public.verifications_id_seq'::regclass);


--
-- Data for Name: achs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.achs (id, bank_name, balance, full_item, price, is_sold, seller_id, created_at) FROM stdin;
1	Bank Of America	688756	Jbvg	200	f	\N	2026-05-10 20:20:27.710308
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, content, link, active, created_at) FROM stdin;
\.


--
-- Data for Name: card_bases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.card_bases (id, name, created_at) FROM stdin;
1	Best	2026-06-24 16:51:36.104817
\.


--
-- Data for Name: cards; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cards (id, card_number, masked_card, expiry, cvv, country, extras, price, is_first_hand, is_sold, user_id, created_at, hr_percent, bin_data, base_id) FROM stdin;
\.


--
-- Data for Name: crypto_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.crypto_addresses (id, user_id, currency, address, created_at) FROM stdin;
\.


--
-- Data for Name: crypto_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.crypto_payments (id, user_id, forebit_payment_id, amount, currency, status, purpose, order_id, checkout_url, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: discount_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.discount_codes (id, code, type, value, min_order, max_uses, used_count, is_active, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: mail_reads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mail_reads (id, mail_id, user_id, read_at) FROM stdin;
\.


--
-- Data for Name: mails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mails (id, title, body, sender_id, recipient_id, created_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, variant_id, stock_item_id, card_id, item_type, price, quantity) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_id, user_id, status, total, paid_amount, delivery_content, payment_method, payment_note, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, image, active, created_at, pinned) FROM stdin;
\.


--
-- Data for Name: redeem_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.redeem_codes (id, code, amount, is_used, used_by, created_at) FROM stdin;
1	VOUCH-FT4VW6GO	50000	t	3	2026-05-02 13:51:40.055863
\.


--
-- Data for Name: referral_usages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referral_usages (id, referrer_id, redeemer_id, code, created_at) FROM stdin;
\.


--
-- Data for Name: seller_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seller_applications (id, user_id, status, seller_code, note, created_at) FROM stdin;
1	3	approved	TRENT-JZN4-ME5V		2026-05-01 01:12:22.671169
2	4	approved	TRENT-A96T-IWFB		2026-05-02 21:01:29.789459
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session (sid, sess, expire) FROM stdin;
92F3PgV3w_zoXOGo9XoVcubB9nCiL3xy	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-09-18T18:56:14.192Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"}}	2026-09-18 18:56:15
rP19oO74JutO_g8Vwdu0miHndZ_8M3y7	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-09-18T18:59:22.529Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":32}}	2026-09-18 18:59:38
T5KcRUp0MakS-SxT75O9l9Cfi_a6S0ks	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-09-18T19:00:59.305Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":18}}	2026-09-18 21:54:37
LExQAQtj8ml31EX2n2NM_ABC3ACZgU50	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-09-15T03:24:36.900Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":31}}	2026-09-15 03:31:25
J6JJilJ-xExcxOETkk8_h9NxABk9aKZa	{"cookie":{"originalMaxAge":86400000,"expires":"2026-08-21T16:44:10.604Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":8}}	2026-08-21 16:44:16
FpPLPaXRZalcPUeED9SX94V_vOr1zAfg	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-09-18T18:59:10.151Z","secure":false,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":18}}	2026-09-18 20:35:14
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.site_settings (key, value) FROM stdin;
min_deposit_chime	10
cashapp_fee	0
payment_method_cashapp	true
payment_method_crypto	true
payment_method_chime	false
payment_method_zelle	false
cashapp_tag	$Jacobgettinmotionx
feature_logs	false
feature_cards	true
feature_checker	false
feature_reseller	false
feature_ranks	true
\.


--
-- Data for Name: stock_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_items (id, variant_id, content, is_sold, is_reserved, order_id, replacement_for_id, created_at, seller_id) FROM stdin;
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_tickets (id, user_id, order_id, subject, description, image_url, status, admin_message, created_at) FROM stdin;
1	18	ORD8228	Refund	Invalid		refunded	\N	2026-08-16 18:37:53.29444
\.


--
-- Data for Name: telegram_link_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telegram_link_tokens (id, token, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: telegram_referral_pending; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telegram_referral_pending (chat_id, referrer_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, user_id, amount, type, description, payment_method, created_at) FROM stdin;
12	18	25	telegram_name_reward	Daily foodplug.lol name reward	\N	2026-08-16 21:01:41.054823
13	18	200	telegram_name_reward	Daily unitedcards.cc name reward	\N	2026-08-19 22:34:45.013364
14	18	200	telegram_name_reward	Daily unitedcards.cc name reward	\N	2026-08-20 00:43:19.114294
\.


--
-- Data for Name: uploaded_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.uploaded_images (id, filename, mime_type, data, created_at) FROM stdin;
\.


--
-- Data for Name: user_ips; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_ips (id, user_id, ip, logged_at) FROM stdin;
1	2	127.0.0.1	2026-04-19 18:23:18.25647
2	2	127.0.0.1	2026-04-19 18:23:56.640146
3	2	127.0.0.1	2026-04-19 18:24:03.753027
4	2	127.0.0.1	2026-04-19 19:07:57.30929
5	7	38.68.134.29	2026-06-23 15:18:41.026509
6	7	38.68.134.29	2026-06-24 13:39:56.246867
7	7	38.68.134.29	2026-06-28 23:05:08.534857
8	7	38.68.134.29	2026-06-28 23:38:00.872032
9	7	38.68.134.29	2026-06-28 23:41:55.951437
10	7	38.68.134.29	2026-06-29 06:52:03.201394
11	7	66.9.166.107	2026-07-08 16:59:37.062907
12	14	172.219.87.189	2026-07-16 18:47:35.855119
13	18	162.157.98.241	2026-08-16 18:08:51.695438
14	18	162.157.98.241	2026-08-19 18:59:10.140671
15	18	162.157.98.241	2026-08-19 19:00:59.302238
16	8	127.0.0.1	2026-08-20 16:42:52.48179
17	8	127.0.0.1	2026-08-20 16:44:10.50419
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password, email, telegram_username, role, is_banned, balance, protected_balance, last_daily_spin, created_at, is_seller, seller_balance, total_seller_earned, login_code, seller_type, seller_display_name, telegram_id, telegram_connected, referral_code, is_worker, telegram_chat_id, last_telegram_name_reward, telegram_referred_by, telegram_referral_bonus_paid, telegram_name_active) FROM stdin;
18	noitactv	5ff50f85afbd6f8d657cb3f0fe07fcf9d3e7e997eeb76013645da0d5850042cbd69b92b47fda544ee841271bdece63cc2cc99b9abbfc974241faad008c529e2c.62950648414c3c945f23285630f0b3a0	noitactv@gmail.com	vehicuh	admin	f	425	0	\N	2026-07-16 19:41:44.238622	f	0	0		bronze		\N	f	\N	f	8770123112	2026-08-20 00:43:19.107692	\N	f	t
5	anon_9c8037a950		anon_9c8037a950@acctplug.fo		admin	f	0	0	\N	2026-06-04 04:38:25.462895	f	0	0	WF87883E9KVB	bronze		\N	f	\N	f	\N	\N	\N	f	f
7	anon-a396dd12	f40abe1a5e7b5ce147edc37b832bbd4a4505d3715112bac2fe66846cd5f7062c03d9f8393df393edea1199b5ac7807eee5290c0fbbccff095b711ad341bbaa73.a21ee2a5e9c03cbe3ecbb778ff1d240b	borelandomario8@gmail.com		admin	f	0	0	\N	2026-06-23 14:24:52.66251	f	0	0		bronze		\N	f	\N	f	\N	\N	\N	f	f
8	anon-7ae62b56	e18e862e0fccbca7e3861cf72de99f0a8d6d20c92d23f8fdaaf5ab74a025ff8914377a956355da60ace0f78baa740f11538f700b6340958ff71dd36bdd5cae08.927ae0f4f995144cf59698f097bc35e9	ashhtentv@gmail.com		user	f	0	0	\N	2026-06-23 18:55:07.384372	f	0	0		bronze		\N	f	\N	f	\N	\N	\N	f	f
9	anon-b94fd1ec	afd224b8bae381d1498e3e64bf34d36799dd1478d9f2bc84851473cb86c9ed16ad0a6cdc413941d5094d82a2fb0e7ac38dd8fada411cfd752941e52d8931e57f.475f172efff0c273d1f4ae56f11e4775	agenttest@test.com		user	f	0	0	\N	2026-07-08 16:36:33.61545	f	0	0		bronze		\N	f	\N	f	\N	\N	\N	f	f
1	admin	ce6bb8cbb02a0c68f1b26a8362a9afccdae1a4fe421cb8ce4dc65273d870400937122c363af128c4510a04cb741b710bc31b7f45bb8ee2af154788d72dfbc676.676faed1237ae612f4c5d3d7136b3fa8	admin@store.com		admin	f	0	0	\N	2026-04-18 15:30:50.926034	f	0	0	ZQWWXU7NF7K4	bronze		\N	f	C823BC69	f	\N	\N	\N	f	f
2	demo	be40442ba685f1dc0670678c57b8dbe8738bbd7a40f143744c8d2b0b7d4ba5faa709c069cda03fed984b891296053adaa4401c94bf0ea74f343b5c7af547eedc.dd9e50d2f853b696eda02746a2dee38d	demo@user.com		user	f	0	0	\N	2026-04-18 15:30:50.97721	f	0	0	AL3ZPCFS2QEJ	bronze		\N	f	10F9468E	f	\N	\N	\N	f	f
3	Test	8844f4b4b275f2b52aa05c07a34d1c1db6ae113bf1c7dae95b8f7722017d0a4a0c8192d796e45052916c73dd8e372f98ef952718f84e01c93cdb7a1324f9b82f.37823707ace6f1d454277b9a2a892450	Lifeanime886@gmail.com	Test	admin	f	0	0	\N	2026-05-01 01:11:50.062547	t	0	0	EEMVGYV24RUB	bronze		\N	f	123C80C9	f	\N	\N	\N	f	f
4	Lifeanime8864393f4		lifeanime886@gmail.com		admin	f	0	0	\N	2026-05-02 15:01:37.2584	t	0	0	R5N5MH2FSK4P	bronze		\N	f	25EDD550	f	\N	\N	\N	f	f
6	anon_9be1d90039		anon_9be1d90039@gmail.com		user	f	0	0	\N	2026-06-04 05:14:47.626397	f	0	0	RMN6944TVGL5	bronze		\N	f	\N	f	\N	\N	\N	f	f
31	anon-d1874081	ea12975f3343621c7c17de759068d1607900051135c09dbb457d2234eb39169c97160ac8b0d4cd46043ebb1e8fffafe85d2a51f21354efed3dc9822467c8ba0c.8f7083bc4ec1b8698e7a477b097d7c76	bobfreak199@gmail.com		user	f	0	0	\N	2026-08-16 03:24:36.84066	f	0	0		bronze		\N	f	\N	f	\N	\N	\N	f	f
13	anon-8a0c1095	9db7e113c95a32fa89699716c1eab58d4d63ee070c37ef6a93143c96d9da54e48f37d7d7b3f352a4e47e429b4b14cab103cbc540c667eb187070bea535c1345a.3237f46d4f4191fad30b83da8ef3c3a8	testuser_dep@example.com		user	f	0	0	\N	2026-07-08 17:23:54.568698	f	0	0		bronze		\N	f	\N	f	\N	\N	\N	f	f
14	anon-0acac48b	7157a4a0b740758cb4eb088dbacf511dc2554c99c92c913decee926cc55a43fa347933178a3e28080fcc330cefd14212cdf501106cb4b2b87ad21b14ede740a0.2c62189d74a8fda2e548eb8ce63841ba	noitactv@icloud.com		user	f	0	0	\N	2026-07-16 18:47:28.370192	f	0	0		bronze		\N	f	\N	f	\N	\N	\N	f	f
32	anon-faa39beb	4557ba8085cf55d20dcf67a9feb963a2d61b45c063e539ece15ae57f381b99d14712b8574ab5f4e01f2aa3a7c8d927e6622e6df68ccee1eeb96e759ec477ad27.bf7cef73d9272913e56a57126f30f612	samboosak764@proton.me		user	f	0	0	\N	2026-08-19 18:59:22.518881	f	0	0		bronze		\N	f	\N	f	\N	\N	\N	f	f
\.


--
-- Data for Name: variants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.variants (id, product_id, name, price, min_quantity, compare_price) FROM stdin;
\.


--
-- Data for Name: verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.verifications (id, user_id, telegram_username, channel_link, channel_name, agreed_to_terms, status, admin_note, term_message, created_at) FROM stdin;
\.


--
-- Name: achs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.achs_id_seq', 1, true);


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.announcements_id_seq', 1, false);


--
-- Name: card_bases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.card_bases_id_seq', 1, true);


--
-- Name: cards_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cards_id_seq', 10, true);


--
-- Name: crypto_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.crypto_addresses_id_seq', 1, false);


--
-- Name: crypto_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.crypto_payments_id_seq', 1, false);


--
-- Name: discount_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.discount_codes_id_seq', 1, false);


--
-- Name: mail_reads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mail_reads_id_seq', 1, false);


--
-- Name: mails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.mails_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 9, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 21, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 5, true);


--
-- Name: redeem_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.redeem_codes_id_seq', 1, true);


--
-- Name: referral_usages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.referral_usages_id_seq', 1, false);


--
-- Name: seller_applications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.seller_applications_id_seq', 2, true);


--
-- Name: stock_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_items_id_seq', 6, true);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_tickets_id_seq', 1, true);


--
-- Name: telegram_link_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.telegram_link_tokens_id_seq', 4, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 14, true);


--
-- Name: uploaded_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.uploaded_images_id_seq', 1, false);


--
-- Name: user_ips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_ips_id_seq', 17, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 32, true);


--
-- Name: variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.variants_id_seq', 5, true);


--
-- Name: verifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.verifications_id_seq', 1, false);


--
-- Name: achs achs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achs
    ADD CONSTRAINT achs_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: card_bases card_bases_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.card_bases
    ADD CONSTRAINT card_bases_name_key UNIQUE (name);


--
-- Name: card_bases card_bases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.card_bases
    ADD CONSTRAINT card_bases_pkey PRIMARY KEY (id);


--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);


--
-- Name: crypto_addresses crypto_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_addresses
    ADD CONSTRAINT crypto_addresses_pkey PRIMARY KEY (id);


--
-- Name: crypto_addresses crypto_addresses_user_id_currency_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_addresses
    ADD CONSTRAINT crypto_addresses_user_id_currency_key UNIQUE (user_id, currency);


--
-- Name: crypto_payments crypto_payments_forebit_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_forebit_payment_id_key UNIQUE (forebit_payment_id);


--
-- Name: crypto_payments crypto_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_pkey PRIMARY KEY (id);


--
-- Name: discount_codes discount_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_code_key UNIQUE (code);


--
-- Name: discount_codes discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_pkey PRIMARY KEY (id);


--
-- Name: mail_reads mail_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mail_reads
    ADD CONSTRAINT mail_reads_pkey PRIMARY KEY (id);


--
-- Name: mails mails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mails
    ADD CONSTRAINT mails_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_id_key UNIQUE (order_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: redeem_codes redeem_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.redeem_codes
    ADD CONSTRAINT redeem_codes_code_key UNIQUE (code);


--
-- Name: redeem_codes redeem_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.redeem_codes
    ADD CONSTRAINT redeem_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_usages referral_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_usages
    ADD CONSTRAINT referral_usages_pkey PRIMARY KEY (id);


--
-- Name: referral_usages referral_usages_redeemer_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_usages
    ADD CONSTRAINT referral_usages_redeemer_code_unique UNIQUE (redeemer_id, code);


--
-- Name: seller_applications seller_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_applications
    ADD CONSTRAINT seller_applications_pkey PRIMARY KEY (id);


--
-- Name: seller_applications seller_applications_seller_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_applications
    ADD CONSTRAINT seller_applications_seller_code_key UNIQUE (seller_code);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (key);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: telegram_link_tokens telegram_link_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_link_tokens
    ADD CONSTRAINT telegram_link_tokens_pkey PRIMARY KEY (id);


--
-- Name: telegram_link_tokens telegram_link_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_link_tokens
    ADD CONSTRAINT telegram_link_tokens_token_key UNIQUE (token);


--
-- Name: telegram_referral_pending telegram_referral_pending_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_referral_pending
    ADD CONSTRAINT telegram_referral_pending_pkey PRIMARY KEY (chat_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: uploaded_images uploaded_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_images
    ADD CONSTRAINT uploaded_images_pkey PRIMARY KEY (id);


--
-- Name: user_ips user_ips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_ips
    ADD CONSTRAINT user_ips_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_pkey PRIMARY KEY (id);


--
-- Name: verifications verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_pkey PRIMARY KEY (id);


--
-- Name: verifications verifications_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_user_id_key UNIQUE (user_id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: achs achs_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achs
    ADD CONSTRAINT achs_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: cards cards_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.card_bases(id);


--
-- Name: cards cards_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: crypto_addresses crypto_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_addresses
    ADD CONSTRAINT crypto_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: crypto_payments crypto_payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: crypto_payments crypto_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crypto_payments
    ADD CONSTRAINT crypto_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: mail_reads mail_reads_mail_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mail_reads
    ADD CONSTRAINT mail_reads_mail_id_fkey FOREIGN KEY (mail_id) REFERENCES public.mails(id);


--
-- Name: mail_reads mail_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mail_reads
    ADD CONSTRAINT mail_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: mails mails_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mails
    ADD CONSTRAINT mails_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: order_items order_items_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: redeem_codes redeem_codes_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.redeem_codes
    ADD CONSTRAINT redeem_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id);


--
-- Name: referral_usages referral_usages_redeemer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_usages
    ADD CONSTRAINT referral_usages_redeemer_id_fkey FOREIGN KEY (redeemer_id) REFERENCES public.users(id);


--
-- Name: referral_usages referral_usages_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_usages
    ADD CONSTRAINT referral_usages_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id);


--
-- Name: seller_applications seller_applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seller_applications
    ADD CONSTRAINT seller_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: stock_items stock_items_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);


--
-- Name: stock_items stock_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.variants(id);


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: telegram_link_tokens telegram_link_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_link_tokens
    ADD CONSTRAINT telegram_link_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_ips user_ips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_ips
    ADD CONSTRAINT user_ips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_telegram_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_referred_by_fkey FOREIGN KEY (telegram_referred_by) REFERENCES public.users(id);


--
-- Name: variants variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: verifications verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verifications
    ADD CONSTRAINT verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict OadhYR35HkkEU4QQeRfDovbqeW5Buu1fergvpoFjVqdmXrRuh8dpUZ88aE3l7VY

