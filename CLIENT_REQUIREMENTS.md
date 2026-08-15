# AutoWork Client Requirements

Final client acceptance workflow and production requirements. No credentials are stored in this file.

Target workflow: REAL LOGIN -> REAL PCLOUD -> REAL FILE -> REAL IMPORT -> REAL CONTACTS -> REAL AUTHENTICATED SENDER -> REAL RECIPIENT -> REAL TEMPLATE -> REAL COMPONENT -> REAL CAMPAIGN -> REAL QUEUE -> REAL WORKER -> REAL PROVIDER OPERATION -> REAL RESULT -> REAL LOG -> REAL ANALYTICS.

No fake/mock production success, no arbitrary sender spoofing, no secret exposure, no MFA/OAuth bypass, and no destructive pCloud validation. Removing a pCloud connection must not delete the external pCloud account/files. AutoWork resource deletion is permanent after explicit confirmation.

Required areas: authentication, tenant isolation, RBAC, pCloud, imports, contacts, authenticated sender accounts, templates, attachments, campaigns, Redis/BullMQ, realtime automation, analytics, logs, Docker and production configuration.

pCloud: verify the documented production authentication method and exact business operation (share, transfer or another official operation). Validate real account, folders, files, metadata, selection and one controlled real operation before multi-recipient testing.

Imports: parse supported CSV/XLS/XLSX/TXT/structured input, detect email columns, extract contacts, validate syntax and duplicates, preview and selection.

Sender accounts: a typed email address is never a sender. Gmail/Google Workspace requires official OAuth 2.0, mailbox verification, sending permission and a controlled test email before Verified. Other providers require genuine authenticated paths.

Campaign: import -> sender -> recipients -> template -> preview -> components -> review -> launch. Launch revalidates sender, recipients, template, attachments, pCloud account/file, permissions and tenant ownership.

Variables: #NAME#, #FIRSTNAME#, #LASTNAME#, #EMAIL#, #PHONE#, #COMPANY#, #TARGET#, #RANDOM#.

Workers: large campaigns use Redis/BullMQ. Each recipient goes through authenticated account/provider selection, variable resolution, attachment/pCloud file selection, provider execution, result persistence and realtime progress. External side effects must be duplicate-safe and retry-aware.

First real acceptance test: one sender, one recipient, one message/template, one file/component, one real provider/pCloud operation. Verify external result, provider reference, queue, worker, execution log and analytics. Only then run a controlled 2-5 recipient test.

Open clarifications: exact mandatory pCloud operation; production pCloud authentication architecture; existing pCloud developer/application registration and any paid API/developer agreement; whether email is required in addition to pCloud; required email provider(s); expected campaign/recipient volume; required automation examples; production deployment target.

Definition of done: the agreed real workflow succeeds end-to-end with authorized accounts, without mock/fake fallback, and provider, worker, database, logs and analytics all reflect the same real execution.
