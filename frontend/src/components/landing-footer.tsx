"use client";

import { useState } from "react";
import Link from "next/link";

// const socBadgeUrl =
//   "https://cdn.prod.website-files.com/65783e649367bc55fecaea2d/658866f735bf2e2e77bbb3ec_21972-312_SOC_NonCPA.png";
// const ycLaunchEmbedUrl =
//   "https://www.ycombinator.com/launches/O5K-getcrux-ai-creative-strategist-to-launch-winning-ads/upvote_embed.svg/";

const productLinks = [
  { label: "Agents", href: "#meetcrux" },
  { label: "Pricing", href: "/pricing" },
];

const companyLinks = [
  { label: "Careers", href: "#", external: false },
  { label: "Privacy Policy", href: "#", external: false },
  { label: "Terms of Service", href: "#", external: false },
  { label: "Team", href: "/about", external: false },
];

const resourceLinks = [
  { label: "Blog", href: "/blogs" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Contact", href: "#contact" },
  { label: "Help Center", href: "#help-center" },
];

export default function LandingFooter() {
  const [email, setEmail] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Subscribe");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setIsSubmitting(true);
    setButtonLabel("Subscribing...");

    window.setTimeout(() => {
      setButtonLabel("Thanks!");
      setEmail("");

      window.setTimeout(() => {
        setButtonLabel("Subscribe");
        setIsSubmitting(false);
      }, 3000);
    }, 1000);
  };

  return (
    <footer className="relative bg-[#0e0e11] px-5 py-24 text-white sm:px-10">
      <div className="mx-auto max-w-[1180px]">
        <div className="flex flex-col items-start justify-between gap-12 lg:flex-row lg:gap-0">
          <div className="flex w-full max-w-[216px] flex-col">
            {/* <p className="mt-6 text-[15px] text-[#a4a4a4]">
              AI Creative Strategist
            </p> */}

            <div className="flex flex-row gap-6">
              {/* <div className="flex flex-col gap-4">
                <span className="text-xs uppercase tracking-[0.18em] text-[rgba(82,82,91,0.8)]">
                  Backed by
                </span>
                <YcCompactMark />
              </div> */}

              <div className="flex flex-col gap-4">
                <span className="text-xs uppercase tracking-[0.18em] text-[rgba(82,82,91,0.8)]">
                  Trusted by
                </span>
                {/* <Image
                  src={socBadgeUrl}
                  alt="SOC badge"
                  width={32}
                  height={32}
                  className="h-8 w-8 opacity-80"
                /> */}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-16 md:flex-row lg:w-auto lg:gap-24">
            <div className="grid grid-cols-2 gap-12 sm:grid-cols-3 lg:gap-16">
              <FooterLinkGroup title="Product" links={productLinks} />
              <FooterLinkGroup title="Company" links={companyLinks} />
              <FooterLinkGroup title="Other Resources" links={resourceLinks} />
            </div>

            <div className="flex w-full max-w-[384px] flex-col gap-6">
              <div>
                <h4 className="text-2xl font-semibold text-white">
                  Join our newsletter
                </h4>
                {/* <p className="mt-1 text-sm text-[#a4a4a4]">
                  AI Creative Strategist
                </p> */}
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="flex-grow rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition-colors placeholder:text-[#a4a4a4] focus:border-[#ff4500] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="whitespace-nowrap rounded-lg border border-white/30 bg-white/5 px-4 py-2 text-sm font-semibold text-[#ff6329] transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {buttonLabel}
                </button>
              </form>

              <div className="opacity-80">
                {/* <a
                  href="https://www.ycombinator.com/launches/O5K-getcrux-ai-creative-strategist-to-launch-winning-ads"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Image
                    src={ycLaunchEmbedUrl}
                    alt="Y Combinator Launch"
                    width={160}
                    height={40}
                    className="w-40"
                    unoptimized
                  />
                </a> */}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-8 md:flex-row">
          {/* <span className="text-xs uppercase tracking-[0.24em] text-[rgba(82,82,91,0.8)]">
            © CRUX TECHNOLOGIES, INC
          </span> */}

          <div className="flex items-center gap-6">
            <SocialLink
              href="https://twitter.com/getcruxai"
              label="X"
              icon={<XIcon />}
            />
            <SocialLink
              href="https://www.youtube.com/@CruxAICopilot"
              label="YouTube"
              icon={<YouTubeIcon />}
            />
            <SocialLink
              href="https://www.linkedin.com/company/getcruxai/"
              label="LinkedIn"
              icon={<LinkedInIcon />}
            />
          </div>
        </div>
      </div>

      <div className="absolute top-0 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-[#ff4500]/50 to-transparent" />
    </footer>
  );
}

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      {links.map((link) =>
        link.href.startsWith("/") ? (
          <Link
            key={link.label}
            href={link.href}
            className="text-sm text-[#a4a4a4] transition-colors hover:text-[#ff4500]"
          >
            {link.label}
          </Link>
        ) : (
          <a
            key={link.label}
            href={link.href}
            className="text-sm text-[#a4a4a4] transition-colors hover:text-[#ff4500]"
            {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {link.label}
          </a>
        ),
      )}
    </div>
  );
}

function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="text-[rgba(82,82,91,0.8)] opacity-40 transition-all hover:text-[#ff4500] hover:opacity-100"
    >
      {icon}
    </a>
  );
}

function XIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 23"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.9455 22.8682L10.396 14.9583L3.44886 22.8682H0.509766L9.09209 13.0993L0.509766 0.868164H8.05571L13.286 8.32318L19.8393 0.868164H22.7784L14.5943 10.1846L23.4914 22.8682H15.9455ZM19.2185 20.6382H17.2398L4.71811 3.09816H6.6971L11.7121 10.1213L12.5793 11.34L19.2185 20.6382Z"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M23.7609 8.06821C23.7609 8.06821 23.5266 6.41353 22.8047 5.68696C21.8906 4.73071 20.8688 4.72603 20.4 4.66978C17.0438 4.42603 12.0047 4.42603 12.0047 4.42603H11.9953C11.9953 4.42603 6.95625 4.42603 3.6 4.66978C3.13125 4.72603 2.10938 4.73071 1.19531 5.68696C0.473438 6.41353 0.24375 8.06821 0.24375 8.06821C0.24375 8.06821 0 10.0135 0 11.9542V13.7729C0 15.7135 0.239062 17.6588 0.239062 17.6588C0.239062 17.6588 0.473437 19.3135 1.19062 20.0401C2.10469 20.9963 3.30469 20.9635 3.83906 21.0667C5.76094 21.2495 12 21.3057 12 21.3057C12 21.3057 17.0438 21.2963 20.4 21.0573C20.8688 21.001 21.8906 20.9963 22.8047 20.0401C23.5266 19.3135 23.7609 17.6588 23.7609 17.6588C23.7609 17.6588 24 15.7182 24 13.7729V11.9542C24 10.0135 23.7609 8.06821 23.7609 8.06821ZM9.52031 15.9807V9.2354L16.0031 12.6198L9.52031 15.9807Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.2234 0.868164H1.77187C0.792187 0.868164 0 1.6416 0 2.59785V23.1338C0 24.09 0.792187 24.8682 1.77187 24.8682H22.2234C23.2031 24.8682 24 24.09 24 23.1385V2.59785C24 1.6416 23.2031 0.868164 22.2234 0.868164ZM7.12031 21.3197H3.55781V9.86348H7.12031V21.3197ZM5.33906 8.30254C4.19531 8.30254 3.27188 7.3791 3.27188 6.24004C3.27188 5.10098 4.19531 4.17754 5.33906 4.17754C6.47813 4.17754 7.40156 5.10098 7.40156 6.24004C7.40156 7.37441 6.47813 8.30254 5.33906 8.30254ZM20.4516 21.3197H16.8937V15.751C16.8937 14.4244 16.8703 12.7135 15.0422 12.7135C13.1906 12.7135 12.9094 14.1619 12.9094 15.6572V21.3197H9.35625V9.86348H12.7687V11.4291H12.8156C13.2891 10.5291 14.4516 9.57754 16.1813 9.57754C19.7859 9.57754 20.4516 11.9494 20.4516 15.0338V21.3197Z"
        fill="currentColor"
      />
    </svg>
  );
}
