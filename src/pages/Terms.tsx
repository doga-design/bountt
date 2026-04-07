import LegalPage, { LegalSection } from "@/components/LegalPage";

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to Terms",
    content: (
      <>
        <p>
          By using Bountt you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not
          use the service.
        </p>
        <p>
          These Terms apply to everyone who uses Bountt: visitors, registered users, and group members. Words like
          "Bountt," "we," "us," and "our" mean the company running this service.
        </p>
      </>
    ),
  },
  {
    id: "what-we-do",
    title: "What Bountt Does",
    content: (
      <>
        <p>
          Bountt helps groups log shared costs, split them fairly, and see who owes what, with less awkward chasing.
        </p>
        <p>
          <strong>Important:</strong> Bountt is not a bank or payment company. We do not hold or move money.
          Settlements between people happen outside the app, using methods you choose.
        </p>
        <p>Balances in the app reflect only what you and your group enter.</p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility & Accounts",
    content: (
      <>
        <p>
          You must be at least 13, or the minimum age in your area if that is higher. By signing up you confirm you
          meet that rule.
        </p>
        <p>You agree to:</p>
        <ul>
          <li>Keep your login private</li>
          <li>Give accurate profile information</li>
          <li>Tell us if you think someone else accessed your account</li>
          <li>Accept responsibility for activity on your account</li>
        </ul>
        <p>One person, one account. We may suspend fake or duplicate accounts.</p>
      </>
    ),
  },
  {
    id: "using-bountt",
    title: "Using Bountt",
    content: (
      <>
        <p>You may use Bountt to:</p>
        <ul>
          <li>Create groups and invite members</li>
          <li>Add expenses, splits, and notes</li>
          <li>Add placeholders for people not on the app yet</li>
          <li>Track balances and mark items settled</li>
          <li>See history for your groups</li>
        </ul>
        <p>You may not use Bountt to break the law, harm others, scrape or attack the service, run bots without
          permission, or mislead people about money or splits.</p>
      </>
    ),
  },
  {
    id: "placeholder-members",
    title: "Placeholder Members",
    content: (
      <>
        <p>
          You can add people who are not on Bountt yet. You should only add them when it is fair to do so, get their
          okay to track shared costs, and enter splits honestly.
        </p>
        <p>You can invite them to join anytime so they can manage their own profile.</p>
      </>
    ),
  },
  {
    id: "financial-disclaimer",
    title: "Financial Disclaimer",
    content: (
      <>
        <p>
          Bountt is for records, not legal or tax advice. Balances come from user input. We do not guarantee they are
          complete or correct.
        </p>
        <p>We are not responsible for:</p>
        <ul>
          <li>Fights between members about amounts or splits</li>
          <li>Typos or wrong numbers anyone enters</li>
          <li>Losses you blame on numbers shown in the app</li>
          <li>Payments that fail or conflict outside the app</li>
        </ul>
        <p>Check important amounts directly with the people involved. The app is a helper, not a court record.</p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    content: (
      <>
        <p>
          Our name, logo, product design, and code belong to us and are protected by law. Your notes and group names
          stay yours; you let us host them so the service works.
        </p>
        <p>Do not copy or resell our product without written permission.</p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Service Availability",
    content: (
      <>
        <p>We aim for steady uptime but outages and updates can happen.</p>
        <p>We may change or remove features. We are not liable for downtime or changes, with or without notice.</p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    content: (
      <>
        <p>
          <strong>You can leave anytime.</strong> Delete your account in Profile and Account Settings. We delete your
          personal data within about 3 to 10 days.
        </p>
        <p>
          We may suspend or end your access if you break these rules or harm others. Serious cases may get no
          warning.
        </p>
        <p>If we terminate you for cause, do not open a new account without our OK.</p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    content: (
      <>
        <p>
          Where the law allows, we are not liable for indirect or special damages, including lost profit, data, or
          goodwill, from using or not using Bountt.
        </p>
        <p>
          Our total liability for any claim is capped at the greater of one hundred U.S. dollars or what you paid us
          in the 10 days before the claim, if anything.
        </p>
        <p>Some places do not allow these limits, so parts of this section may not apply to you.</p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing Law",
    content: (
      <>
        <p>
          These Terms follow applicable law. Please try to resolve disputes informally first by writing{" "}
          <a href="mailto:doga@bountt.com">doga@bountt.com</a>. We aim to respond within 3 to 10 days.
        </p>
        <p>
          If that fails, disputes go to binding arbitration for you alone, not as a class. You waive class actions
          where allowed.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    content: (
      <>
        <p>
          We will notify you 3 to 10 days before material changes take effect, by email or in the app. Small edits may post
          without extra notice.
        </p>
        <p>Using Bountt after changes means you accept them. If you disagree, stop using the app and delete your account.</p>
        <p>The date at the top shows when these Terms were last updated.</p>
      </>
    ),
  },
];

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="Short, plain rules for using Bountt. Worth a read."
      lastUpdated="April 1, 2026"
      sections={sections}
      sibling={{ label: "Privacy", to: "/privacy" }}
    />
  );
}
