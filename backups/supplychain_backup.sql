--
-- PostgreSQL database dump
--

-- Dumped from database version 15.10 (Homebrew)
-- Dumped by pg_dump version 15.10 (Homebrew)

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
-- Name: ImportStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ImportStatus" AS ENUM (
    'SUCCESS',
    'PARTIAL',
    'FAILED'
);


ALTER TYPE public."ImportStatus" OWNER TO postgres;

--
-- Name: JobStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."JobStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'CANCELED'
);


ALTER TYPE public."JobStatus" OWNER TO postgres;

--
-- Name: MaterialCategory; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MaterialCategory" AS ENUM (
    'RAW_MATERIAL',
    'MACHINE_PART',
    'CONVEYOR_COMPONENT',
    'OFFICE_SUPPLY',
    'KITCHEN_SUPPLY',
    'SAFETY_EQUIPMENT',
    'CLEANING_SUPPLY',
    'ELECTRICAL_COMPONENT',
    'MECHANICAL_COMPONENT',
    'OTHER'
);


ALTER TYPE public."MaterialCategory" OWNER TO postgres;

--
-- Name: MilestoneStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MilestoneStatus" AS ENUM (
    'PENDING',
    'OVERDUE',
    'PAID',
    'CANCELLED'
);


ALTER TYPE public."MilestoneStatus" OWNER TO postgres;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'DECLINED',
    'IN_PRODUCTION',
    'ON_HOLD',
    'READY_FOR_DELIVERY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."OrderStatus" OWNER TO postgres;

--
-- Name: OrderType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OrderType" AS ENUM (
    'JOB_LINKED',
    'CUSTOMER_LINKED',
    'INTERNAL'
);


ALTER TYPE public."OrderType" OWNER TO postgres;

--
-- Name: PaymentTerms; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentTerms" AS ENUM (
    'WITH_ORDER',
    'PRIOR_TO_DISPATCH',
    'THIRTY_DAYS',
    'SIXTY_DAYS',
    'NINETY_DAYS',
    'CUSTOM'
);


ALTER TYPE public."PaymentTerms" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."Role" OWNER TO postgres;

--
-- Name: SupplierStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SupplierStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'BLACKLISTED',
    'SUSPENDED',
    'UNDER_REVIEW'
);


ALTER TYPE public."SupplierStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: CurrencyRate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CurrencyRate" (
    id text NOT NULL,
    "fromCurrency" text NOT NULL,
    "toCurrency" text NOT NULL,
    rate double precision NOT NULL,
    "validFrom" timestamp(3) without time zone NOT NULL,
    "validTo" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CurrencyRate" OWNER TO postgres;

--
-- Name: Customer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    "importSource" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastOrderDate" timestamp(3) without time zone,
    status text,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    "totalSpent" double precision DEFAULT 0 NOT NULL
);


ALTER TABLE public."Customer" OWNER TO postgres;

--
-- Name: ImportLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ImportLog" (
    id text NOT NULL,
    filename text NOT NULL,
    status public."ImportStatus" NOT NULL,
    records integer NOT NULL,
    errors jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ImportLog" OWNER TO postgres;

--
-- Name: Job; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Job" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    status public."JobStatus" DEFAULT 'ACTIVE'::public."JobStatus" NOT NULL,
    "customerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Job" OWNER TO postgres;

--
-- Name: Material; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Material" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "unitPrice" double precision NOT NULL,
    unit text NOT NULL,
    "supplierId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "currentStockLevel" integer DEFAULT 0 NOT NULL,
    "leadTimeInDays" integer DEFAULT 0 NOT NULL,
    "minStockLevel" integer DEFAULT 0 NOT NULL,
    "reorderPoint" integer DEFAULT 0 NOT NULL,
    category public."MaterialCategory" DEFAULT 'OTHER'::public."MaterialCategory" NOT NULL,
    manufacturer text,
    "productSpecifications" jsonb,
    "customerId" text
);


ALTER TABLE public."Material" OWNER TO postgres;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "projectTitle" text NOT NULL,
    "quoteRef" text NOT NULL,
    "orderType" public."OrderType" DEFAULT 'CUSTOMER_LINKED'::public."OrderType" NOT NULL,
    status public."OrderStatus" DEFAULT 'DRAFT'::public."OrderStatus" NOT NULL,
    "customerName" text NOT NULL,
    "contactPerson" text NOT NULL,
    "contactPhone" text NOT NULL,
    "contactEmail" text NOT NULL,
    "projectValue" double precision NOT NULL,
    "marginPercent" double precision NOT NULL,
    "leadTimeWeeks" integer NOT NULL,
    items jsonb NOT NULL,
    "costBreakdown" jsonb,
    "paymentTerms" public."PaymentTerms" DEFAULT 'THIRTY_DAYS'::public."PaymentTerms" NOT NULL,
    "customPaymentTerms" text,
    currency text DEFAULT 'GBP'::text NOT NULL,
    "exchangeRate" double precision,
    "vatRate" double precision,
    "subTotal" double precision DEFAULT 0 NOT NULL,
    "totalTax" double precision DEFAULT 0 NOT NULL,
    "totalAmount" double precision DEFAULT 0 NOT NULL,
    "profitMargin" double precision DEFAULT 0 NOT NULL,
    discounts jsonb,
    "paymentSchedule" jsonb,
    "budgetAllocations" jsonb,
    "customerId" text,
    "jobId" text,
    "projectOwnerId" text NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    notes text
);


ALTER TABLE public."Order" OWNER TO postgres;

--
-- Name: PaymentMilestone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PaymentMilestone" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    description text NOT NULL,
    amount double precision NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    status public."MilestoneStatus" DEFAULT 'PENDING'::public."MilestoneStatus" NOT NULL,
    "paidDate" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PaymentMilestone" OWNER TO postgres;

--
-- Name: RegionalTaxSetting; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RegionalTaxSetting" (
    id text NOT NULL,
    country text NOT NULL,
    region text,
    "standardVatRate" double precision NOT NULL,
    "reducedVatRate" double precision,
    "taxCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RegionalTaxSetting" OWNER TO postgres;

--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    rating double precision,
    status public."SupplierStatus" DEFAULT 'ACTIVE'::public."SupplierStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "averageDeliveryTime" double precision DEFAULT 0 NOT NULL,
    "completedOrders" integer DEFAULT 0 NOT NULL,
    "lastOrderDate" timestamp(3) without time zone,
    "performanceHistory" jsonb,
    "totalOrders" integer DEFAULT 0 NOT NULL,
    notes text
);


ALTER TABLE public."Supplier" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: CurrencyRate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CurrencyRate" (id, "fromCurrency", "toCurrency", rate, "validFrom", "validTo", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Customer" (id, name, email, phone, address, "importSource", "createdAt", "updatedAt", "lastOrderDate", status, "totalOrders", "totalSpent") FROM stdin;
cm708x9gu0000kddcq3ow8hm8	Example Customer	customer@example.com	1234567890	123 Example St, Example City, EX 12345	\N	2025-02-11 08:54:35.31	2025-02-11 08:54:35.31	\N	\N	0	0
cm70rlysv0003kddc6m6ykn2l	Test Customer Company	testcustomer@example.com	1234567890	\N	\N	2025-02-11 17:37:40.975	2025-02-11 17:37:40.975	\N	\N	0	0
cm74nn80n0001kdu275q23z55	Test Company Ltd	test@company.com	07979690284	22 Rearsby Road	\N	2025-02-14 10:57:45.815	2025-02-14 10:57:45.815	\N	\N	0	0
cm752bj1j0000kdyk6gxg1i44	James oflynn	jamesoflynn@hotmail.com	07979690284	\N	\N	2025-02-14 17:48:34.471	2025-02-14 17:48:34.471	\N	\N	0	0
\.


--
-- Data for Name: ImportLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ImportLog" (id, filename, status, records, errors, "createdAt") FROM stdin;
\.


--
-- Data for Name: Job; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Job" (id, title, description, status, "customerId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Material; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Material" (id, code, name, description, "unitPrice", unit, "supplierId", "createdAt", "updatedAt", "currentStockLevel", "leadTimeInDays", "minStockLevel", "reorderPoint", category, manufacturer, "productSpecifications", "customerId") FROM stdin;
cm6wb74ok0000kdrv2lzzzm8i	CU-WIRE-001	Copper Wire	High-quality electrical copper wire	25.5	meter	cm6t602q00001kdba1gbigu3n	2025-02-08 14:47:10.197	2025-02-08 14:47:10.197	500	14	100	200	OTHER	\N	\N	\N
cm7b14jir0000kdb5xi13eyt2	c	c	c	0	c	\N	2025-02-18 22:01:45.939	2025-02-18 22:01:45.939	0	0	0	0	MECHANICAL_COMPONENT	\N	\N	\N
cm7c2hpgp0000kdfje503n84k	dd	dd	dd	0	dd	\N	2025-02-19 15:27:45.961	2025-02-19 15:27:45.961	0	0	0	0	MECHANICAL_COMPONENT	\N	\N	\N
cm7oml6o30001kdqbyuhm4fey	coffe 1	Coffee 	coffee 	3	1	cm6t602q00001kdba1gbigu3n	2025-02-28 10:23:34.656	2025-02-28 10:23:34.656	3	2	2	2	OFFICE_SUPPLY	\N	\N	\N
cm6uz7btz0002kdxdt1ai84ew	MAT001	Test Material	A test material	50	piece	cm6t602q00001kdba1gbigu3n	2025-02-07 16:23:37.894	2025-03-01 21:26:41.106	0	0	0	0	OTHER	\N	\N	\N
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Order" (id, "projectTitle", "quoteRef", "orderType", status, "customerName", "contactPerson", "contactPhone", "contactEmail", "projectValue", "marginPercent", "leadTimeWeeks", items, "costBreakdown", "paymentTerms", "customPaymentTerms", currency, "exchangeRate", "vatRate", "subTotal", "totalTax", "totalAmount", "profitMargin", discounts, "paymentSchedule", "budgetAllocations", "customerId", "jobId", "projectOwnerId", "createdById", "createdAt", "updatedAt", notes) FROM stdin;
cm7b2mkn00000kdbihocmcu1y	c	cccccc	CUSTOMER_LINKED	IN_PRODUCTION	Example Customer	cccc	1234567890	customer@example.com	0.03	20	1	[{}]	null	THIRTY_DAYS	\N	GBP	1	20	0.03	0.006	0.036	0.006	null	null	null	\N	\N	cm6t5yzhd0000kdbaja4sj59q	cm6t5yzhd0000kdbaja4sj59q	2025-02-18 22:43:46.812	2025-02-24 18:27:31.967	ccc
cm6uz85th0003kdxd5bshlnu1	Test Project	Q12345	CUSTOMER_LINKED	IN_PRODUCTION	Example Customer	James oflynn	1234567890	jamesoflynn@hotmail.com	1000	20	2	[{"quantity": 10, "unitPrice": 50, "materialId": "cm6uz7btz0002kdxdt1ai84ew"}]	\N	THIRTY_DAYS	\N	USD	\N	0	1000	0	1000	200	\N	\N	\N	\N	\N	cm6t5yzhd0000kdbaja4sj59q	cm6t5yzhd0000kdbaja4sj59q	2025-02-07 16:24:16.757	2025-02-24 18:27:35.372	vvvvv
cm7d7r30l0000kdqj7ww1lhd6	FFFF	FFFF	CUSTOMER_LINKED	IN_PRODUCTION	Example Customer	James oflynn	1234567890	jamesoflynn@hotmail.com	0.02	21	2	[{}]	\N	THIRTY_DAYS	\N	GBP	\N	20	0.02	0.004	0.024	0.0042	\N	\N	\N	\N	\N	cm73uw8tr0000kdu23b26hryz	cm73uw8tr0000kdu23b26hryz	2025-02-20 10:42:47.683	2025-02-24 18:27:37.297	\N
cm7cfdwdu0000kdoo7qeqbju6	eee	eeee	CUSTOMER_LINKED	IN_PRODUCTION	Test Customer Company	James oflynn	1234567890	jamesoflynn@hotmail.com	0.01	21	2	[{}]	\N	THIRTY_DAYS	\N	GBP	\N	20	0.01	0.002	0.012	0.0021	\N	\N	\N	\N	\N	cm6t5yzhd0000kdbaja4sj59q	cm6t5yzhd0000kdbaja4sj59q	2025-02-19 21:28:43.313	2025-02-24 18:27:39.799	fffff
cm7je33on0000kda2c08fbmhg	yo 2	yo2 	CUSTOMER_LINKED	COMPLETED	Test Company Ltd	Phillippa oflynn	07979690284	jamesoflynn@hotmail.com	0.03	20	1	[{}]	\N	THIRTY_DAYS	\N	GBP	\N	20	0.03	0.006	0.036	0.006	\N	\N	\N	\N	\N	cm6t5yzhd0000kdbaja4sj59q	cm6t5yzhd0000kdbaja4sj59q	2025-02-24 18:26:43.175	2025-02-24 18:26:51.035	\N
cm7jdw1q10000kdcq5b8s7e5a	yo 	yo 	CUSTOMER_LINKED	COMPLETED	James oflynn	James oflynn	07979690284	jamesoflynn@hotmail.com	0.03	20	1	[{}]	\N	THIRTY_DAYS	\N	GBP	\N	20	0.03	0.006	0.036	0.006	\N	\N	\N	\N	\N	cm6t5yzhd0000kdbaja4sj59q	cm6t5yzhd0000kdbaja4sj59q	2025-02-24 18:21:14.041	2025-02-24 18:27:19.344	\N
\.


--
-- Data for Name: PaymentMilestone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PaymentMilestone" (id, "orderId", description, amount, "dueDate", status, "paidDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RegionalTaxSetting; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RegionalTaxSetting" (id, country, region, "standardVatRate", "reducedVatRate", "taxCode", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Supplier" (id, name, email, phone, address, rating, status, "createdAt", "updatedAt", "averageDeliveryTime", "completedOrders", "lastOrderDate", "performanceHistory", "totalOrders", notes) FROM stdin;
cm6t602q00001kdba1gbigu3n	ABC Supplies Ltd	contact@abcsupplies.com	020-7123-4567	123 Supply Street, London	4.5	ACTIVE	2025-02-06 09:58:24.456	2025-02-06 09:58:24.456	0	0	\N	\N	0	\N
cm7j7d3f90000kds7bfu6tfrj	James O'Flynn 	jamesoflynn@hotmail.com	07979690284	22 Rearsby Road	5	ACTIVE	2025-02-24 15:18:32.085	2025-02-28 21:05:50.616	0	0	\N	\N	0	\N
cm7p9x0ns0000kdlfv8g1g64x	You (him and i) 	barry@fish.com	07979690284	22 Rearsby Road	5	ACTIVE	2025-02-28 21:16:37.912	2025-02-28 21:16:37.912	0	0	\N	\N	0	\N
cm7qpmpwr0000kdp3qc8x0zqp	zzzz	bob@bobby.com	07979690284	22 Rearsby Road	5	INACTIVE	2025-03-01 21:24:17.451	2025-03-01 21:24:17.451	0	0	\N	\N	0	\N
cm7qpnkxx0001kdp3ujbl6ddl	jimmys shut	jim@jim.com	07979690284	22 Rearsby Road	5	ACTIVE	2025-03-01 21:24:57.669	2025-03-01 21:24:57.669	0	0	\N	\N	0	\N
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, name, password, role, "createdAt", "updatedAt") FROM stdin;
cm6t5yzhd0000kdbaja4sj59q	test@example.com	Test User	$2a$10$ja6Dlr1I1zMdnvmIEqqPseHyHTJogCpbVK3wZs740O1MXcvUJCXOq	USER	2025-02-06 09:57:33.602	2025-02-06 09:57:33.602
cm73uw8tr0000kdu23b26hryz	admin@bonescrm.com	 Admin User	$2a$10$MqZan2AT8ceZwFK1e9fqYezd/G84Xg1cLNTQvupvuutnawzcZUDZ6	USER	2025-02-13 21:32:57.901	2025-02-13 21:32:57.901
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
b4bde33c-dd05-45d2-9f0b-83982f5aca79	fa5b638dfc79fb5dcf2f4d28397053fb328d6002ab2a2786fb4bdad77a1fe905	2025-02-06 09:56:33.879773+00	20250130180609_init	\N	\N	2025-02-06 09:56:33.842396+00	1
192bf8ad-15b3-4ff4-ae9a-9ad45a24de56	2d763414fa71ca064f175747fb0babaf1ce5073f4698487a664ba41b9e11dbb2	2025-02-06 12:37:51.016728+00	20250206123751_update_supplier_status_enum	\N	\N	2025-02-06 12:37:51.01459+00	1
a6ed5775-2a3e-4235-b453-f3f56cb7e306	4e36010bcbd0732421441382cb0bb94af9d9eb7d9609816fee0f0cf6d891576a	2025-02-07 16:35:36.463974+00	20250207163536_update_material_tracking_fields	\N	\N	2025-02-07 16:35:36.461606+00	1
67ef9095-388a-4b3e-bb5c-981c025b01df	51c7d38af46349865830b4a00dd7f529c643d193ae5ba3ad279b5fdffe19585e	2025-02-10 11:04:05.352227+00	20250210110405_add_material_category	\N	\N	2025-02-10 11:04:05.349412+00	1
09cda1c8-ff21-4f1b-8161-24c304313344	91f2f49a717969d44c04eae24bdf97f015be4e6ce7e4da7eb4c300d905a7a3c4	2025-02-10 20:59:04.270428+00	20250210205309_add_optional_customer_materials	\N	\N	2025-02-10 20:59:04.265918+00	1
3f62cdf5-bfb3-4aab-ab46-13052915d56f	3ae745398915d200475ea51325eca4591c580c1279356d095036c0745018a625	2025-02-19 17:18:12.416249+00	20250219171812_add_notes_to_order	\N	\N	2025-02-19 17:18:12.413862+00	1
fe99af1b-ef1b-43d2-b53b-875c2f330fd9	32e4d9792f38702cd859dd78c197fdb5350e48b2a5177ffa6afc8de97de783c6	2025-02-22 15:01:19.62181+00	20250222150119_add_status_to_customer	\N	\N	2025-02-22 15:01:19.617938+00	1
ed355186-3625-4a85-b5f7-f37dd0e38981	cc553b13af8723fe03df9b35dd0614894828806e154de059d919de542ae5145a	2025-02-28 21:11:01.160168+00	20250228211101_add_supplier_notes	\N	\N	2025-02-28 21:11:01.15802+00	1
\.


--
-- Name: CurrencyRate CurrencyRate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CurrencyRate"
    ADD CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: ImportLog ImportLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ImportLog"
    ADD CONSTRAINT "ImportLog_pkey" PRIMARY KEY (id);


--
-- Name: Job Job_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Job"
    ADD CONSTRAINT "Job_pkey" PRIMARY KEY (id);


--
-- Name: Material Material_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Material"
    ADD CONSTRAINT "Material_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: PaymentMilestone PaymentMilestone_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentMilestone"
    ADD CONSTRAINT "PaymentMilestone_pkey" PRIMARY KEY (id);


--
-- Name: RegionalTaxSetting RegionalTaxSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RegionalTaxSetting"
    ADD CONSTRAINT "RegionalTaxSetting_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Customer_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Customer_email_key" ON public."Customer" USING btree (email);


--
-- Name: Material_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Material_code_key" ON public."Material" USING btree (code);


--
-- Name: Order_quoteRef_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Order_quoteRef_key" ON public."Order" USING btree ("quoteRef");


--
-- Name: Supplier_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Supplier_email_key" ON public."Supplier" USING btree (email);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Job Job_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Job"
    ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Material Material_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Material"
    ADD CONSTRAINT "Material_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Material Material_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Material"
    ADD CONSTRAINT "Material_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."Job"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_projectOwnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_projectOwnerId_fkey" FOREIGN KEY ("projectOwnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PaymentMilestone PaymentMilestone_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PaymentMilestone"
    ADD CONSTRAINT "PaymentMilestone_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

