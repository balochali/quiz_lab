import Link from "next/link";
export default function Restricted() {
  return <section className="card stack"><h1>Feature restricted</h1><p>Your platform administrator has disabled this feature for your account.</p><Link href="/admin/dashboard">Back to workspace</Link></section>;
}
