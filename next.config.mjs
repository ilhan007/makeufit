/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@ui5/webcomponents",
    "@ui5/webcomponents-react",
    "@ui5/webcomponents-fiori",
    "@ui5/webcomponents-base",
    "@ui5/webcomponents-icons",
    "@ui5/webcomponents-icons-tnt",
    "@ui5/webcomponents-icons-business-suite",
    "@ui5/webcomponents-theming",
  ],
};

export default nextConfig;
