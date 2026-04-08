"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const socBadgeUrl =
  "https://cdn.prod.website-files.com/65783e649367bc55fecaea2d/658866f735bf2e2e77bbb3ec_21972-312_SOC_NonCPA.png";
const ycLaunchEmbedUrl =
  "https://www.ycombinator.com/launches/O5K-getcrux-ai-creative-strategist-to-launch-winning-ads/upvote_embed.svg/";

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
            <Link href="/" className="block" aria-label="Crux home">
              <FooterWordmark />
            </Link>

            <p className="mt-6 text-[15px] text-[#a4a4a4]">
              AI Creative Strategist
            </p>

            <div className="mt-12 flex flex-row gap-6">
              <div className="flex flex-col gap-4">
                <span className="text-xs uppercase tracking-[0.18em] text-[rgba(82,82,91,0.8)]">
                  Backed by
                </span>
                <YcCompactMark />
              </div>

              <div className="flex flex-col gap-4">
                <span className="text-xs uppercase tracking-[0.18em] text-[rgba(82,82,91,0.8)]">
                  Trusted by
                </span>
                <Image
                  src={socBadgeUrl}
                  alt="SOC badge"
                  width={32}
                  height={32}
                  className="h-8 w-8 opacity-80"
                />
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-16 md:flex-row lg:w-auto lg:gap-24">
            <div className="grid grid-cols-2 gap-12 sm:grid-cols-3 lg:gap-16">
              <FooterLinkGroup title="Product" links={productLinks} />
              <FooterLinkGroup title="Company" links={companyLinks} />
              <FooterLinkGroup
                title="Other Resources"
                links={resourceLinks}
              />
            </div>

            <div className="flex w-full max-w-[384px] flex-col gap-6">
              <div>
                <h4 className="text-2xl font-semibold text-white">
                  Join our newsletter
                </h4>
                <p className="mt-1 text-sm text-[#a4a4a4]">
                  AI Creative Strategist
                </p>
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
                <a
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
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-white/5 pt-8 md:flex-row">
          <span className="text-xs uppercase tracking-[0.24em] text-[rgba(82,82,91,0.8)]">
            © CRUX TECHNOLOGIES, INC
          </span>

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
            {...(link.external
              ? { target: "_blank", rel: "noreferrer" }
              : {})}
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

function FooterWordmark() {
  return (
    <svg
      width="140"
      height="40"
      viewBox="0 0 140 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-10 w-[140px]"
      aria-hidden="true"
    >
      <mask id="mask0_logo" maskUnits="userSpaceOnUse" x="0" y="3" width="140" height="34">
        <path d="M140 3.04102H0V36.9578H140V3.04102Z" fill="white" />
      </mask>
      <g mask="url(#mask0_logo)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.745443 13.7174C0.67128 13.7916 0.67128 13.9118 0.745443 13.986L6.11503 19.3555C6.1892 19.4298 6.1892 19.5499 6.11503 19.6242L0.745075 24.9941C0.670912 25.0682 0.670912 25.1885 0.745075 25.2627L7.99509 32.5127C8.06924 32.5868 8.18949 32.5868 8.26366 32.5127L21.1518 19.6245C21.2259 19.5504 21.2259 19.4301 21.1518 19.356L8.26366 6.46774C8.18949 6.39357 8.06924 6.39357 7.99509 6.46774L0.745443 13.7174ZM4.50431 13.9861C4.43014 13.912 4.43014 13.7917 4.50431 13.7176L7.99481 10.2271C8.06896 10.1529 8.18921 10.1529 8.26338 10.2271L11.7539 13.7176C11.828 13.7917 11.828 13.912 11.7539 13.9861L8.26338 17.4766C8.18921 17.5508 8.06896 17.5508 7.99481 17.4766L4.50431 13.9861ZM13.9025 15.8651C13.8284 15.7909 13.7081 15.7909 13.634 15.8651L10.1435 19.3555C10.0693 19.4298 10.0693 19.5499 10.1435 19.6242L13.634 23.1146C13.7081 23.1889 13.8284 23.1889 13.9025 23.1146L17.3931 19.6242C17.4672 19.5499 17.4672 19.4298 17.3931 19.3555L13.9025 15.8651ZM4.50431 25.2627C4.43014 25.1886 4.43014 25.0683 4.50431 24.9942L7.99481 21.5036C8.06896 21.4295 8.18921 21.4295 8.26338 21.5036L11.7539 24.9942C11.828 25.0683 11.828 25.1886 11.7539 25.2627L8.26338 28.7533C8.18921 28.8274 8.06896 28.8274 7.99481 28.7533L4.50431 25.2627ZM17.6612 12.1065C17.5871 12.0323 17.5871 11.9121 17.6612 11.8379L21.1518 8.3474C21.2259 8.27323 21.3462 8.27323 21.4203 8.3474L24.9109 11.8379C24.985 11.9121 24.985 12.0323 24.9109 12.1065L21.4203 15.597C21.3462 15.6711 21.2259 15.6711 21.1518 15.597L17.6612 12.1065ZM21.4203 23.3837C21.3462 23.3094 21.2259 23.3094 21.1518 23.3837L17.6612 26.8741C17.5871 26.9482 17.5871 27.0685 17.6612 27.1428L21.1518 30.6332C21.2259 30.7073 21.3462 30.7073 21.4203 30.6332L24.9109 27.1428C24.985 27.0685 24.985 26.9482 24.9109 26.8741L21.4203 23.3837Z"
          fill="#FF4500"
        />
        <path
          d="M139.942 23.0352H136.294C136.183 23.0352 136.092 23.1259 136.092 23.2378V26.8855C136.092 26.9974 136.183 27.0882 136.294 27.0882H139.942C140.054 27.0882 140.145 26.9974 140.145 26.8855V23.2378C140.145 23.1259 140.054 23.0352 139.942 23.0352Z"
          fill="#FF4500"
        />
        <path
          d="M122.709 27.0769H119.439L124.617 19.6407L119.47 12.0508H122.77L126.524 17.6434L130.187 12.0508H133.427L128.28 19.6407L133.336 27.0769H130.036L126.342 21.5766L122.709 27.0769Z"
          fill="white"
        />
        <path
          d="M113.892 12.0684H116.698V27.0764H113.862V24.5893C113.018 26.1279 111.056 27.184 108.884 27.184C105.445 27.184 103.514 24.8608 103.514 21.2403V12.0684H106.35V20.305C106.35 23.473 107.707 24.6798 109.88 24.6798C112.486 24.2791 113.685 23.0802 113.892 19.8524V12.0684Z"
          fill="white"
        />
        <path
          d="M100.635 12.0508V14.7033H99.3681C96.683 14.7033 95.0235 16.3325 95.0235 19.1685V27.0769H92.1875V12.0508H95.0235V14.4921C95.627 12.9533 97.1009 12.0508 99.1391 12.0508C99.652 12.0508 100.018 12.0508 100.635 12.0508Z"
          fill="white"
        />
        <path
          d="M75.7109 19.6218C75.7109 15.1401 78.5522 12.0352 82.741 12.0352C86.3439 12.0352 88.863 14.0856 89.361 17.2784H86.6075C86.1389 15.4623 84.6742 14.4957 82.8288 14.4957C80.2219 14.4957 78.435 16.4876 78.435 19.5925C78.435 22.6681 80.1047 24.6601 82.7117 24.6601C84.6742 24.6601 86.1389 23.6349 86.6368 21.9359H89.3903C88.8337 25.0408 86.1682 27.1207 82.7117 27.1207C78.4936 27.1207 75.7109 24.1328 75.7109 19.6218Z"
          fill="white"
        />
        <path
          d="M71.5088 27.0772H68.7553V14.3602H65.9434V12.0461H68.7553V8.57422H71.5088V12.0461H74.3208V14.3602H71.5088V27.0772Z"
          fill="white"
        />
        <path
          d="M57.9148 27.1207C53.6967 27.1207 50.7969 24.0743 50.7969 19.6218C50.7969 15.1401 53.6381 12.0352 57.7976 12.0352C61.8693 12.0352 64.5348 14.8472 64.5348 19.0946V20.1198L53.4624 20.149C53.6674 23.1661 55.2492 24.8358 57.9733 24.8358C60.1117 24.8358 61.5177 23.9571 61.9864 22.3167H64.5641C63.8611 25.3924 61.4591 27.1207 57.9148 27.1207ZM57.7976 14.3492C55.3957 14.3492 53.8725 15.7846 53.521 18.3036H61.7814C61.7814 15.931 60.2289 14.3492 57.7976 14.3492Z"
          fill="white"
        />
        <path
          d="M33.5586 19.2411C33.5586 15.1987 36.1656 12.0352 40.3251 12.0352C42.639 12.0352 44.4259 13.0897 45.334 14.8765V12.0908H47.9995V26.1832C47.9995 30.6943 45.2168 33.5648 40.8229 33.5648C36.9271 33.5648 34.2616 31.368 33.7343 27.7358H36.4877C36.8393 29.8448 38.4211 31.075 40.8229 31.075C43.5179 31.075 45.2754 29.3175 45.2754 26.5934V23.7227C44.338 25.3924 42.4633 26.3884 40.2078 26.3884C36.1363 26.3884 33.5586 23.254 33.5586 19.2411ZM36.312 19.1825C36.312 21.8773 37.9817 23.9864 40.6765 23.9864C43.4593 23.9864 45.1583 21.9944 45.1583 19.1825C45.1583 16.429 43.5179 14.4371 40.7058 14.4371C37.9524 14.4371 36.312 16.5461 36.312 19.1825Z"
          fill="white"
        />
      </g>
    </svg>
  );
}

function YcCompactMark() {
  return (
    <svg
      width="121"
      height="25"
      viewBox="0 0 121 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-80"
      aria-label="Y Combinator"
      role="img"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.00195312 24.8658H24.0006V0.867188H0.00195312V24.8658Z"
        fill="#FB651E"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.9753 14.0588V19.391H10.9504V14.0588L5.7832 6.3418H8.25056L11.9703 12.0414L15.6751 6.3418H18.1425L12.9753 14.0588Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M38.082 8.9148C35.8621 8.9148 34.1972 10.6322 34.1972 12.8521C34.1972 15.072 35.8621 16.8044 38.082 16.8044C39.5069 16.8044 40.7443 16.0694 41.4118 14.832L43.3167 15.9644C42.2517 17.7868 40.2569 18.9717 38.082 18.9717C34.6622 18.9642 31.9473 16.2494 31.9473 12.8521C31.9473 9.44727 34.6622 6.73242 38.082 6.73242C40.2794 6.73242 42.2517 7.90235 43.3167 9.73975L41.4118 10.8722C40.7368 9.63476 39.5069 8.9148 38.082 8.9148Z"
        fill="white"
      />
      <path
        d="M48.3224 16.8349C49.6048 16.8349 50.6398 15.785 50.6398 14.3976C50.6398 13.0101 49.6273 11.9602 48.3224 11.9602C46.98 11.9602 45.9675 13.0101 45.9675 14.3976C45.9675 15.785 46.98 16.8349 48.3224 16.8349Z"
        fill="white"
      />
      <path
        d="M48.3224 18.9123C45.795 18.9123 43.7852 16.9024 43.7852 14.3976C43.7852 11.8927 45.795 9.88281 48.3224 9.88281C50.8123 9.88281 52.8222 11.8927 52.8222 14.3976C52.8222 16.9024 50.8123 18.9123 48.3224 18.9123Z"
        fill="white"
      />
      <path
        d="M66.9751 13.6783V18.7181H64.8002V14.0608C64.8002 12.7559 64.1627 11.9309 63.2028 11.9309C62.2203 11.9309 61.5004 12.7559 61.5004 14.0608V18.7181H59.4005V14.0608C59.4005 12.7559 58.7405 11.9309 57.7731 11.9309C56.8056 11.9309 56.1007 12.7559 56.1007 14.0608V18.7181H53.9258V10.0935H56.1007V11.196C56.6331 10.371 57.4581 9.85352 58.4705 9.85352C59.573 9.85352 60.4429 10.476 60.9754 11.4435C61.5229 10.581 62.5353 9.85352 63.8102 9.85352C65.7226 9.85352 66.9751 11.541 66.9751 13.6783Z"
        fill="white"
      />
      <path
        d="M120.301 9.90625V11.9987C118.358 11.9987 117.526 12.9436 117.526 14.181V18.7183H115.426V10.0938H117.526V11.1737C118.118 10.4013 119.071 9.90625 120.301 9.90625Z"
        fill="white"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 23" fill="currentColor" aria-hidden="true">
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
    <svg width="24" height="24" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M23.7609 8.06821C23.7609 8.06821 23.5266 6.41353 22.8047 5.68696C21.8906 4.73071 20.8688 4.72603 20.4 4.66978C17.0438 4.42603 12.0047 4.42603 12.0047 4.42603H11.9953C11.9953 4.42603 6.95625 4.42603 3.6 4.66978C3.13125 4.72603 2.10938 4.73071 1.19531 5.68696C0.473438 6.41353 0.24375 8.06821 0.24375 8.06821C0.24375 8.06821 0 10.0135 0 11.9542V13.7729C0 15.7135 0.239062 17.6588 0.239062 17.6588C0.239062 17.6588 0.473437 19.3135 1.19062 20.0401C2.10469 20.9963 3.30469 20.9635 3.83906 21.0667C5.76094 21.2495 12 21.3057 12 21.3057C12 21.3057 17.0438 21.2963 20.4 21.0573C20.8688 21.001 21.8906 20.9963 22.8047 20.0401C23.5266 19.3135 23.7609 17.6588 23.7609 17.6588C23.7609 17.6588 24 15.7182 24 13.7729V11.9542C24 10.0135 23.7609 8.06821 23.7609 8.06821ZM9.52031 15.9807V9.2354L16.0031 12.6198L9.52031 15.9807Z"
        fill="currentColor"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M22.2234 0.868164H1.77187C0.792187 0.868164 0 1.6416 0 2.59785V23.1338C0 24.09 0.792187 24.8682 1.77187 24.8682H22.2234C23.2031 24.8682 24 24.09 24 23.1385V2.59785C24 1.6416 23.2031 0.868164 22.2234 0.868164ZM7.12031 21.3197H3.55781V9.86348H7.12031V21.3197ZM5.33906 8.30254C4.19531 8.30254 3.27188 7.3791 3.27188 6.24004C3.27188 5.10098 4.19531 4.17754 5.33906 4.17754C6.47813 4.17754 7.40156 5.10098 7.40156 6.24004C7.40156 7.37441 6.47813 8.30254 5.33906 8.30254ZM20.4516 21.3197H16.8937V15.751C16.8937 14.4244 16.8703 12.7135 15.0422 12.7135C13.1906 12.7135 12.9094 14.1619 12.9094 15.6572V21.3197H9.35625V9.86348H12.7687V11.4291H12.8156C13.2891 10.5291 14.4516 9.57754 16.1813 9.57754C19.7859 9.57754 20.4516 11.9494 20.4516 15.0338V21.3197Z"
        fill="currentColor"
      />
    </svg>
  );
}
