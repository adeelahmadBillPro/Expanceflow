import { PageHeader, Card } from '../components/UI';

export default function Terms() {
  return (
    <div>
      <PageHeader title="Terms & Privacy" subtitle="Terms of Service and Privacy Policy for ExpenseFlow" />

      {/* Terms of Service */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Terms of Service</h2>

        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-700 mb-1">1. Data Ownership</h3>
            <p>
              All financial data, invoices, client records, and expense entries you create within ExpenseFlow
              remain your property. We do not claim ownership of any data you upload or generate. You may
              export or delete your data at any time.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">2. Service Availability</h3>
            <p>
              We strive to maintain 99.9% uptime for the ExpenseFlow platform. Scheduled maintenance windows
              will be communicated in advance. We are not liable for temporary disruptions caused by factors
              beyond our control, including network outages or server maintenance.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">3. Acceptable Use</h3>
            <p>
              You agree to use ExpenseFlow solely for lawful business purposes. You must not use the platform
              to store fraudulent financial records, engage in money laundering, or violate any applicable
              Pakistani law including FBR regulations. Each account must represent a legitimate business entity.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">4. Account Security</h3>
            <p>
              You are responsible for maintaining the security of your account credentials. We recommend using
              strong passwords and enabling all available security features. Notify us immediately if you
              suspect unauthorized access to your account.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">5. Termination</h3>
            <p>
              You may terminate your account at any time by contacting support. Upon termination, your data
              will be retained for 30 days to allow recovery, after which it will be permanently deleted.
              We reserve the right to suspend accounts that violate these terms.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">6. FBR Compliance</h3>
            <p>
              ExpenseFlow provides tools to help you maintain records compliant with the Federal Board of
              Revenue (FBR) requirements in Pakistan, including GST tracking and NTN-based invoicing.
              However, you remain solely responsible for the accuracy of your tax filings.
            </p>
          </div>
        </div>
      </Card>

      {/* Privacy Policy */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Privacy Policy</h2>

        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-700 mb-1">1. Data Collection</h3>
            <p>
              We collect only the information necessary to provide our services: your name, email address,
              phone number, business details, and the financial data you enter (expenses, invoices, client
              records). We do not collect data beyond what you explicitly provide.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">2. Data Usage</h3>
            <p>
              Your data is used exclusively to power the ExpenseFlow platform features: generating reports,
              creating invoices, tracking expenses, and managing budgets. We do not sell, share, or monetize
              your data in any way.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">3. Data Storage & Security</h3>
            <p>
              All data is stored on the owner's private server infrastructure. Data is encrypted in transit
              using TLS/SSL. Database backups are encrypted and stored securely. We implement industry-standard
              security practices to protect your information.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">4. Third-Party Services</h3>
            <p>
              We use Resend for transactional email delivery (invoice emails, password resets, notifications).
              Resend processes only the email address and message content required for delivery. No financial
              data is shared with any third-party service.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">5. No Data Sharing</h3>
            <p>
              We do not share your data with advertisers, analytics providers, or any other third parties.
              Your business data stays strictly within the ExpenseFlow platform. We will only disclose
              information if required by Pakistani law or a valid court order.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">6. Data Deletion Rights</h3>
            <p>
              You have the right to request complete deletion of your account and all associated data at any
              time. Upon request, we will permanently delete all your records, invoices, expense entries,
              client data, and any uploaded files within 30 days. Contact support to initiate data deletion.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-1">7. Cookies & Local Storage</h3>
            <p>
              We use browser local storage to maintain your login session and user preferences (such as dark
              mode settings). We do not use tracking cookies or third-party analytics scripts.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
