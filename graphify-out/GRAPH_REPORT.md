# Graph Report - procurement-system\\frontend  (2026-04-21)

## Corpus Check
- Corpus is ~47,893 words - fits in a single context window. You may not need a graph.

## Summary
- 294 nodes · 260 edges · 72 communities detected
- Extraction: 72% EXTRACTED · 27% INFERRED · 1% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_useAuth|useAuth]]
- [[_COMMUNITY_Auth Provider Context|Auth Provider Context]]
- [[_COMMUNITY_Shared Axios API Client|Shared Axios API Client]]
- [[_COMMUNITY_Application Router|Application Router]]
- [[_COMMUNITY_RFQ Operations|RFQ Operations]]
- [[_COMMUNITY_Admin Gated Warranty Console|Admin Gated Warranty Console]]
- [[_COMMUNITY_billing api js|billing api js]]
- [[_COMMUNITY_workorders api js|workorders api js]]
- [[_COMMUNITY_quotations api js|quotations api js]]
- [[_COMMUNITY_SVG Icon Sprite|SVG Icon Sprite]]
- [[_COMMUNITY_Billing jsx|Billing jsx]]
- [[_COMMUNITY_Procurement Workflow Monitor|Procurement Workflow Monitor]]
- [[_COMMUNITY_Interactive InventBot Login Prototype|Interactive InventBot Login Prototype]]
- [[_COMMUNITY_gateentry api js|gateentry api js]]
- [[_COMMUNITY_rfq api js|rfq api js]]
- [[_COMMUNITY_Favicon Primary Mark|Favicon Primary Mark]]
- [[_COMMUNITY_UsersPage jsx|UsersPage jsx]]
- [[_COMMUNITY_WorkflowStatus jsx|WorkflowStatus jsx]]
- [[_COMMUNITY_React Logo|React Logo]]
- [[_COMMUNITY_router jsx|router jsx]]
- [[_COMMUNITY_auth api js|auth api js]]
- [[_COMMUNITY_ChatbotWidget jsx|ChatbotWidget jsx]]
- [[_COMMUNITY_Bottom Layer|Bottom Layer]]
- [[_COMMUNITY_Dark Mode Adaptive Parenthesis|Dark Mode Adaptive Parenthesis]]
- [[_COMMUNITY_App|App]]
- [[_COMMUNITY_sendMessage|sendMessage]]
- [[_COMMUNITY_FileLink|FileLink]]
- [[_COMMUNITY_RobotAssistant jsx|RobotAssistant jsx]]
- [[_COMMUNITY_WorkflowTracker jsx|WorkflowTracker jsx]]
- [[_COMMUNITY_Button|Button]]
- [[_COMMUNITY_ChatbotPage|ChatbotPage]]
- [[_COMMUNITY_GoodsReceiptPage|GoodsReceiptPage]]
- [[_COMMUNITY_InventoryPage|InventoryPage]]
- [[_COMMUNITY_InvoicesPage|InvoicesPage]]
- [[_COMMUNITY_NotificationsPage|NotificationsPage]]
- [[_COMMUNITY_ProductsPage jsx|ProductsPage jsx]]
- [[_COMMUNITY_PurchaseOrderPage jsx|PurchaseOrderPage jsx]]
- [[_COMMUNITY_PurchaseRequests jsx|PurchaseRequests jsx]]
- [[_COMMUNITY_RFQPage jsx|RFQPage jsx]]
- [[_COMMUNITY_Quotations jsx|Quotations jsx]]
- [[_COMMUNITY_QuotationsPage jsx|QuotationsPage jsx]]
- [[_COMMUNITY_RFQ jsx|RFQ jsx]]
- [[_COMMUNITY_AuditLogsPage|AuditLogsPage]]
- [[_COMMUNITY_Vendors jsx|Vendors jsx]]
- [[_COMMUNITY_VendorsPage jsx|VendorsPage jsx]]
- [[_COMMUNITY_WarrantiesPage jsx|WarrantiesPage jsx]]
- [[_COMMUNITY_WorkOrders jsx|WorkOrders jsx]]
- [[_COMMUNITY_Audit Logs|Audit Logs]]
- [[_COMMUNITY_Store Hooks Placeholder Module|Store Hooks Placeholder Module]]
- [[_COMMUNITY_Frontend App Bootstrap Entry|Frontend App Bootstrap Entry]]
- [[_COMMUNITY_eslint config js|eslint config js]]
- [[_COMMUNITY_postcss config js|postcss config js]]
- [[_COMMUNITY_tailwind config js|tailwind config js]]
- [[_COMMUNITY_vite config js|vite config js]]
- [[_COMMUNITY_main jsx|main jsx]]
- [[_COMMUNITY_axios js|axios js]]
- [[_COMMUNITY_index js|index js]]
- [[_COMMUNITY_validation js|validation js]]
- [[_COMMUNITY_ErrorBoundary jsx|ErrorBoundary jsx]]
- [[_COMMUNITY_Layout jsx|Layout jsx]]
- [[_COMMUNITY_UIComponents jsx|UIComponents jsx]]
- [[_COMMUNITY_Chatbot jsx|Chatbot jsx]]
- [[_COMMUNITY_GoodsReceipts jsx|GoodsReceipts jsx]]
- [[_COMMUNITY_Invoices jsx|Invoices jsx]]
- [[_COMMUNITY_Notifications jsx|Notifications jsx]]
- [[_COMMUNITY_Users jsx|Users jsx]]
- [[_COMMUNITY_Warranties jsx|Warranties jsx]]
- [[_COMMUNITY_Users jsx|Users jsx]]
- [[_COMMUNITY_auth store js|auth store js]]
- [[_COMMUNITY_chatbot store js|chatbot store js]]
- [[_COMMUNITY_hooks js|hooks js]]
- [[_COMMUNITY_notification store js|notification store js]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 22 edges
2. `Shared Axios API Client` - 11 edges
3. `Auth Provider Context` - 7 edges
4. `SVG Icon Sprite` - 6 edges
5. `Admin Gated Warranty Console` - 5 edges
6. `getBillingChecklist()` - 4 edges
7. `Favicon Primary Mark` - 4 edges
8. `Discord Icon Symbol` - 4 edges
9. `Application Router` - 4 edges
10. `Role Guard Policy` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Dedicated Auth API Client` --semantically_similar_to--> `Shared Axios API Client`  [INFERRED] [semantically similar]
  procurement-system\frontend\src\api\auth.api.js → procurement-system\frontend\src\api\axios.js
- `RoleBasedRedirect()` --calls--> `useAuth()`  [INFERRED]
  procurement-system\frontend\src\router.jsx → procurement-system\frontend\src\context\AuthContext.jsx
- `Billing()` --calls--> `useAuth()`  [INFERRED]
  procurement-system\frontend\src\pages\billing\Billing.jsx → procurement-system\frontend\src\context\AuthContext.jsx
- `Auth API Token Injector` --semantically_similar_to--> `Bearer Token Injector Interceptor`  [INFERRED] [semantically similar]
  procurement-system\frontend\src\api\auth.api.js → procurement-system\frontend\src\api\axios.js
- `Vendor Quotation Workflow API` --semantically_similar_to--> `RFQ Comparison Workflow API`  [INFERRED] [semantically similar]
  procurement-system\frontend\src\api\quotations.api.js → procurement-system\frontend\src\api\rfq.api.js

## Hyperedges (group relationships)
- **Social Media Brand Icon Set** — icons_bluesky_icon, icons_discord_icon, icons_github_icon, icons_x_icon [INFERRED 0.84]
- **Layered Stack Composition** — hero_top_layer, hero_bottom_layer, hero_connector_block [INFERRED 0.74]
- **Chatbot Runtime Pipeline** — dashboardlayout_chatbot_access_rule, chatbotwidget_message_dispatch_flow, index_chatbot_query_adapter, axios_shared_api_client [INFERRED 0.88]
- **Shared HTTP Client Fabric** — index_domain_api_registry, billingapi_document_approval_workflow, gateentryapi_gate_log_workflow, quotationsapi_vendor_quote_workflow, rfqapi_quote_comparison_workflow, workordersapi_work_order_lifecycle, axios_shared_api_client [INFERRED 0.90]
- **Role Aware Navigation Contract** — app_auth_router_shell, router_app_router, router_role_based_redirect, router_role_guard_policy, dashboardlayout_chatbot_access_rule [INFERRED 0.86]
- **Auth Access Control Flow** — authcontext_auth_provider, authcontext_role_homes_map, protectedroute_route_guard, requirerole_role_gate, login_login_flow [INFERRED 0.88]
- **Chatbot Entrypoint Pattern** — topbar_chatbot_shortcut, chatbotpage_widget_launcher, chatbot_conversation_ui [INFERRED 0.82]
- **Bill Release Governance Flow** — workflowtracker_procurement_steps, billing_document_checklist, billing_release_bill_action, dashboard_procurement_metrics [INFERRED 0.76]
- **Procurement Lifecycle Flow** — purchaserequestpage_purchase_request_workflow, purchase_requests_rfqpage_rfq_operations, quotationspage_vendor_quotation_review, purchaseorderpage_purchase_orders, vendorportal_vendor_dashboard, gateentry_gate_entry, goodsreceiptpage_goods_receipts, invoicespage_invoices [INFERRED 0.86]
- **Vendor Portal Feature Set** — vendorportal_vendor_dashboard, vendorquotations_vendor_operations, purchaseorderpage_purchase_orders [INFERRED 0.80]
- **Procurement Workflow Visibility Loop** — workorders_work_order_management, workflowstatus_procurement_workflow_monitor, workflowstatus_cross_module_data_join, workflowstatus_status_to_step_mapping, workflowstatus_workflowtracker_integration [INFERRED 0.88]
- **Warranty And Subscription Coverage Management** — warrantiespage_warranty_subscription_dashboard, warranties_admin_gated_warranty_console, warranties_warranty_status_analytics, warranties_subscription_registry_table, warrantiespage_expiry_risk_indicator [INFERRED 0.84]
- **InventBot Interaction Experience** — chatbot_store_chatbot_session_store, chatbot_store_inventbot_assistant_persona, inventbot_login_demo_interactive_login_prototype, inventbot_login_demo_mascot_state_machine, inventbot_login_demo_privacy_peek_interaction, inventbot_login_demo_mock_auth_feedback [INFERRED 0.80]

## Communities

### Community 0 - "useAuth"
Cohesion: 0.04
Nodes (20): useAuth(), Chatbot(), Dashboard(), DashboardLayout(), GateEntry(), Inventory(), Login(), PurchaseRequestPage() (+12 more)

### Community 1 - "Auth Provider Context"
Cohesion: 0.14
Nodes (20): Admin Users Alias Export, UsersPage Module Reference, Auth Provider Context, Role Home Route Map, Billing Document Checklist, Accountant Bill Release Action, Reusable Design System Button, Chatbot Purchase-Request Action Card (+12 more)

### Community 2 - "Shared Axios API Client"
Cohesion: 0.18
Nodes (15): Auth API Token Injector, Dedicated Auth API Client, 401 Forced Reauthentication Handler, Bearer Token Injector Interceptor, Shared Axios API Client, Billing Document Approval Workflow API, Direct Chatbot Message Sender, API Origin Deriver (+7 more)

### Community 3 - "Application Router"
Cohesion: 0.19
Nodes (13): Auth and Router Application Shell, Chatbot Conversation Widget, Chatbot Message Dispatch Flow, Chatbot Access Rule, Dashboard Layout Shell, React ESLint Profile, React Bootstrap Entrypoint, Tailwind Autoprefixer Pipeline (+5 more)

### Community 4 - "RFQ Operations"
Cohesion: 0.2
Nodes (12): Gate Entry, Goods Receipts, Invoices, RFQ Operations, Purchase Orders, Purchase Request Workflow, Vendor Quotation Review, RFQ Management (+4 more)

### Community 5 - "Admin Gated Warranty Console"
Cohesion: 0.21
Nodes (12): AuthContext Single Source Of Truth, Vendor API Operations, Vendor Creation Flow, Vendor Management Page, Admin Gated Warranty Console, Subscription Registry Table, Vendor Enriched Warranty Flow, Warranty Status Analytics (+4 more)

### Community 6 - "billing api js"
Cohesion: 0.22
Nodes (0): 

### Community 7 - "workorders api js"
Cohesion: 0.25
Nodes (0): 

### Community 8 - "quotations api js"
Cohesion: 0.29
Nodes (0): 

### Community 9 - "SVG Icon Sprite"
Cohesion: 0.48
Nodes (7): Bluesky Icon Symbol, Discord Icon Symbol, Documentation Icon Symbol, GitHub Icon Symbol, Social Profile Icon Symbol, SVG Icon Sprite, X Icon Symbol

### Community 10 - "Billing jsx"
Cohesion: 0.53
Nodes (5): allChecklistComplete(), Billing(), formatDate(), formatDateTime(), getBillingChecklist()

### Community 11 - "Procurement Workflow Monitor"
Cohesion: 0.47
Nodes (6): Cross Module Data Join, Procurement Workflow Monitor, Status To Step Mapping, Workflow Tracker Integration, Approved Quotation Gate, Work Order Management

### Community 12 - "Interactive InventBot Login Prototype"
Cohesion: 0.4
Nodes (6): Chatbot Session Store, InventBot Assistant Persona, Interactive InventBot Login Prototype, Mascot Interaction State Machine, Mock Authentication Success Feedback, Password Privacy Peek Interaction

### Community 13 - "gateentry api js"
Cohesion: 0.4
Nodes (0): 

### Community 14 - "rfq api js"
Cohesion: 0.4
Nodes (0): 

### Community 15 - "Favicon Primary Mark"
Cohesion: 0.5
Nodes (5): Cyan Accent Orbs, Lightning Bolt Motif, Favicon Primary Mark, Purple Base Shape, Soft Lavender Glow

### Community 16 - "UsersPage jsx"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "WorkflowStatus jsx"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "React Logo"
Cohesion: 0.5
Nodes (4): Cyan Brand Color (#00D8FF), Iconify Logos Set, React JavaScript Library, React Logo

### Community 19 - "router jsx"
Cohesion: 0.67
Nodes (1): RoleBasedRedirect()

### Community 20 - "auth api js"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "ChatbotWidget jsx"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Bottom Layer"
Cohesion: 1.0
Nodes (3): Bottom Layer, Central Connector Block, Top Layer

### Community 23 - "Dark Mode Adaptive Parenthesis"
Cohesion: 1.0
Nodes (3): Dark-Mode Adaptive Parenthesis Motif, Vite Frontend Tooling Brand, Vite Logo Mark

### Community 24 - "App"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "sendMessage"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "FileLink"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "RobotAssistant jsx"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "WorkflowTracker jsx"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Button"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "ChatbotPage"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "GoodsReceiptPage"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "InventoryPage"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "InvoicesPage"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "NotificationsPage"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "ProductsPage jsx"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "PurchaseOrderPage jsx"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "PurchaseRequests jsx"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "RFQPage jsx"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Quotations jsx"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "QuotationsPage jsx"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "RFQ jsx"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "AuditLogsPage"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Vendors jsx"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "VendorsPage jsx"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "WarrantiesPage jsx"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "WorkOrders jsx"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Audit Logs"
Cohesion: 1.0
Nodes (2): Audit Logs, User Administration

### Community 48 - "Store Hooks Placeholder Module"
Cohesion: 1.0
Nodes (2): Store Hooks Placeholder Module, Notification Store Placeholder Module

### Community 49 - "Frontend App Bootstrap Entry"
Cohesion: 1.0
Nodes (2): Frontend App Bootstrap Entry, Vite Template Guidance

### Community 50 - "eslint config js"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "postcss config js"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "tailwind config js"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "vite config js"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "main jsx"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "axios js"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "index js"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "validation js"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "ErrorBoundary jsx"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Layout jsx"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "UIComponents jsx"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Chatbot jsx"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "GoodsReceipts jsx"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Invoices jsx"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Notifications jsx"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Users jsx"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Warranties jsx"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Users jsx"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "auth store js"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "chatbot store js"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "hooks js"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "notification store js"
Cohesion: 1.0
Nodes (0): 

## Ambiguous Edges - Review These
- `InventBot Theme Palette` → `Chatbot Conversation Widget`  [AMBIGUOUS]
  procurement-system\frontend\tailwind.config.js · relation: conceptually_related_to
- `Work Order Lifecycle API` → `Upload URL Resolver`  [AMBIGUOUS]
  procurement-system\frontend\src\components\FileLink.jsx · relation: conceptually_related_to
- `Animated Login Flow` → `Reusable Design System Button`  [AMBIGUOUS]
  procurement-system/frontend/src/components/ui/Button.jsx · relation: semantically_similar_to

## Knowledge Gaps
- **31 isolated node(s):** `Purple Base Shape`, `Lightning Bolt Motif`, `Documentation Icon Symbol`, `Iconify Logos Set`, `React JavaScript Library` (+26 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `App`** (2 nodes): `App()`, `App.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `sendMessage`** (2 nodes): `sendMessage()`, `chatbot.api.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `FileLink`** (2 nodes): `FileLink()`, `FileLink.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `RobotAssistant jsx`** (2 nodes): `RobotAssistant.jsx`, `RobotAssistant()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WorkflowTracker jsx`** (2 nodes): `WorkflowTracker.jsx`, `WorkflowTracker()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button`** (2 nodes): `Button()`, `Button.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ChatbotPage`** (2 nodes): `ChatbotPage()`, `ChatbotPage.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `GoodsReceiptPage`** (2 nodes): `GoodsReceiptPage()`, `GoodsReceiptPage.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `InventoryPage`** (2 nodes): `InventoryPage()`, `InventoryPage.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `InvoicesPage`** (2 nodes): `InvoicesPage()`, `InvoicesPage.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `NotificationsPage`** (2 nodes): `NotificationsPage()`, `NotificationsPage.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ProductsPage jsx`** (2 nodes): `ProductsPage.jsx`, `ProductsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PurchaseOrderPage jsx`** (2 nodes): `PurchaseOrderPage.jsx`, `PurchaseOrderPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PurchaseRequests jsx`** (2 nodes): `PurchaseRequests.jsx`, `PurchaseRequests()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `RFQPage jsx`** (2 nodes): `RFQPage.jsx`, `RFQPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Quotations jsx`** (2 nodes): `Quotations.jsx`, `Quotations()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `QuotationsPage jsx`** (2 nodes): `QuotationsPage.jsx`, `QuotationsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `RFQ jsx`** (2 nodes): `RFQ.jsx`, `RFQPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AuditLogsPage`** (2 nodes): `AuditLogsPage()`, `AuditLogsPage.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vendors jsx`** (2 nodes): `Vendors.jsx`, `Vendors()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `VendorsPage jsx`** (2 nodes): `VendorsPage.jsx`, `VendorsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WarrantiesPage jsx`** (2 nodes): `WarrantiesPage.jsx`, `WarrantiesPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WorkOrders jsx`** (2 nodes): `WorkOrders.jsx`, `WorkOrders()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit Logs`** (2 nodes): `Audit Logs`, `User Administration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Store Hooks Placeholder Module`** (2 nodes): `Store Hooks Placeholder Module`, `Notification Store Placeholder Module`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend App Bootstrap Entry`** (2 nodes): `Frontend App Bootstrap Entry`, `Vite Template Guidance`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `eslint config js`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `postcss config js`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `tailwind config js`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `vite config js`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `main jsx`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `axios js`** (1 nodes): `axios.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `index js`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `validation js`** (1 nodes): `validation.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ErrorBoundary jsx`** (1 nodes): `ErrorBoundary.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout jsx`** (1 nodes): `Layout.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UIComponents jsx`** (1 nodes): `UIComponents.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Chatbot jsx`** (1 nodes): `Chatbot.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `GoodsReceipts jsx`** (1 nodes): `GoodsReceipts.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Invoices jsx`** (1 nodes): `Invoices.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Notifications jsx`** (1 nodes): `Notifications.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Users jsx`** (1 nodes): `Users.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Warranties jsx`** (1 nodes): `Warranties.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Users jsx`** (1 nodes): `Users.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `auth store js`** (1 nodes): `auth.store.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `chatbot store js`** (1 nodes): `chatbot.store.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `hooks js`** (1 nodes): `hooks.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `notification store js`** (1 nodes): `notification.store.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `InventBot Theme Palette` and `Chatbot Conversation Widget`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Work Order Lifecycle API` and `Upload URL Resolver`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Animated Login Flow` and `Reusable Design System Button`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `useAuth()` connect `useAuth` to `Billing jsx`, `router jsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `Billing()` connect `Billing jsx` to `useAuth`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 21 inferred relationships involving `useAuth()` (e.g. with `RoleBasedRedirect()` and `DashboardLayout()`) actually correct?**
  _`useAuth()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Purple Base Shape`, `Lightning Bolt Motif`, `Documentation Icon Symbol` to the rest of the system?**
  _31 weakly-connected nodes found - possible documentation gaps or missing edges._