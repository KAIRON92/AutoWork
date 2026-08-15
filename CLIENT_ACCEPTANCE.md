# AutoWork Client Acceptance

Client requirements for the production validation phase. No credentials are stored here.

Target: REAL LOGIN -> REAL PCLOUD -> REAL FILE -> REAL IMPORT -> REAL CONTACTS -> REAL AUTHENTICATED SENDER -> REAL RECIPIENT -> REAL TEMPLATE -> REAL COMPONENT -> REAL CAMPAIGN -> REAL QUEUE -> REAL WORKER -> REAL PROVIDER OPERATION -> REAL RESULT -> REAL LOG -> REAL ANALYTICS.

Rules: no fake production success; no arbitrary sender spoofing; no secret exposure; no MFA/OAuth bypass; no destructive pCloud validation; removing a pCloud connection must not delete the external account/files; AutoWork deletions are permanent after explicit confirmation.

Required areas: authentication, tenant isolation, RBAC, pCloud, imports, contacts, authenticated sender accounts, templates, attachments, campaigns, Redis/BullMQ, live automation, analytics, logs, Docker and production configuration.

pCloud: verify the documented production authentication method and the exact business operation. Validate real account, folders, files, metadata, selection and one controlled real operation before a 2-5 recipient test.

Imports: parse supported contact data, detect email columns, extract contacts, validate syntax and duplicates, preview and selection.

Sender accounts: typed email is never sufficient. Gmail/Google Workspace requires official OAuth 2.0, mailbox verification, sending permission and a controlled send test before Verified.

Campaign: import -> sender -> recipients -> template -> preview -> components -> review -> launch. Server must revalidate sender, recipients, template, attachments, pCloud account/file, permissions and tenant ownership.

Workers: use Redis/BullMQ for large campaigns. External side effects must be duplicate-safe and retry-aware.

Permanent delete: AutoWork deletion is permanent after confirmation. Deleting provider connections removes AutoWork credential/token material but does not delete the real external account or pCloud files.

Final acceptance: first real test uses one sender, one recipient, one message/template, one file/component and one real provider/pCloud operation. Verify external result, provider reference, queue, worker, execution log and analytics. Only then run a controlled 2-5 recipient test.

Open clarifications: exact pCloud operation; production pCloud authentication architecture; existing developer/application registration and any paid API/developer agreement; whether email is also required; required email provider(s); expected campaign volume; automation examples; production deployment target.
