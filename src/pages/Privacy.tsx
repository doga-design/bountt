import LegalPage, { LegalSection } from "@/components/LegalPage";

const sections: LegalSection[] = [
  {
    id: "what-we-collect",
    title: "What We Collect",
    content: (
      <>
        <p>We collect only what we need.</p>
        <p><strong>Account</strong></p>
        <ul>
          <li>Name and email from Google sign in</li>
          <li>Profile photo if your Google account has one</li>
        </ul>
        <p><strong>Groups and expenses</strong></p>
        <ul>
          <li>Group names and members you add or invite</li>
          <li>Expense details, amounts, dates, and how you split</li>
          <li>Settlements and activity tied to your account</li>
        </ul>
        <p><strong>Technical</strong></p>
        <ul>
          <li>IP, browser, and device type for security</li>
          <li>Light usage stats so we know what to improve</li>
          <li>Error logs when something breaks</li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How We Use Your Data",
    content: (
      <>
        <p>We use data to run Bountt and support you:</p>
        <ul>
          <li>Groups, expenses, splits, and balances</li>
          <li>Showing your name and photo in the app</li>
          <li>Notifications you turn on</li>
          <li>Stopping abuse and fixing bugs</li>
          <li>Anonymous trends to improve the product</li>
          <li>Answering support mail</li>
        </ul>
        <p>
          <strong>We do not sell your data.</strong> No ads. We do not hand your contact info to marketers.
        </p>
      </>
    ),
  },
  {
    id: "who-we-share-with",
    title: "Who We Share It With",
    content: (
      <>
        <p>We use a few vendors who help us run the service. We share only what they need:</p>
        <ul>
          <li>
            <strong>Supabase</strong> hosts our database and auth. Data lives in their certified cloud.
          </li>
          <li>
            <strong>Google</strong> only logs you in. We do not send your Bountt activity to Google for ads.
          </li>
        </ul>
        <p>
          We may also share data if the law requires it, for example a valid court order. We will tell you when we are
          allowed to.
        </p>
        <p>If the company is sold or merged, we will notify you before your data moves under new ownership.</p>
      </>
    ),
  },
  {
    id: "retention",
    title: "Data Retention",
    content: (
      <>
        <p>We keep data while your account is open. After you delete your account:</p>
        <ul>
          <li>Profile and personal fields go away within about 3 to 10 days</li>
          <li>Your expense and group rows go away within about 3 to 10 days</li>
          <li>We may keep anonymous counts forever</li>
          <li>We may keep bits the law requires or that stop fraud</li>
        </ul>
        <p>
          Things your group already saw, like an old expense line, may still show to them after you leave, labeled as
          a deleted user.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <>
        <p>We protect data with:</p>
        <ul>
          <li>TLS in transit</li>
          <li>Encrypted storage where it matters</li>
          <li>Strict internal access</li>
          <li>Supabase infrastructure that meets common audit standards</li>
          <li>Database rules so people only see their own rows</li>
        </ul>
        <p>No site is perfect. If a breach hits your personal data we will tell you within 3 to 10 days of discovery.</p>
        <p>Use a strong Google password and sign out on shared devices.</p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights",
    content: (
      <>
        <p>Depending on where you live you may be able to:</p>
        <ul>
          <li><strong>Access:</strong> ask what we store about you</li>
          <li><strong>Correction:</strong> fix wrong facts</li>
          <li><strong>Deletion:</strong> close your account</li>
          <li><strong>Portability:</strong> get a machine readable export</li>
          <li><strong>Object or restrict:</strong> limit some processing</li>
        </ul>
        <p>
          Mail <a href="mailto:doga@bountt.com">doga@bountt.com</a>. We aim to reply within 3 to 10 days.
        </p>
        <p>In the EU or UK you can also complain to your local privacy regulator.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & Tracking",
    content: (
      <>
        <p>We use cookies and local storage in a small way:</p>
        <ul>
          <li><strong>Session:</strong> keeps you signed in</li>
          <li><strong>Preferences:</strong> remembers settings on your device</li>
        </ul>
        <p>We do not run ad trackers or third party pixels. Any analytics are first party and minimal.</p>
        <p>You can clear cookies in the browser; you will usually be signed out.</p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children's Privacy",
    content: (
      <>
        <p>Bountt is not for children under thirteen. We do not knowingly collect data from them.</p>
        <p>
          If you think a child made an account, write <a href="mailto:doga@bountt.com">doga@bountt.com</a> and we will
          help fast.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "International Transfers",
    content: (
      <>
        <p>We may process data in the United States and other countries where our vendors operate.</p>
        <p>
          If you live in the EU, UK, or similar regions we use approved transfer tools such as Standard Contractual
          Clauses when needed.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    content: (
      <>
        <p>Big updates get email or in app notice 3 to 10 days before they take effect. Small edits may only change the date at the top.</p>
        <p>Staying on Bountt after a change means you accept it. If you do not, delete your account.</p>
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="What we collect, why, and how we keep it fair. No ads, no selling your data."
      lastUpdated="April 1, 2026"
      sections={sections}
      sibling={{ label: "Terms", to: "/terms" }}
      character="alt"
    />
  );
}
