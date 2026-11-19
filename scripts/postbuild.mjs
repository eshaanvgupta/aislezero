import { copyFile, writeFile, mkdir } from "node:fs/promises";
// GitHub Pages serves this fallback for dynamic product/store routes.
await copyFile("dist/index.html", "dist/404.html");
await writeFile("dist/.nojekyll", "");
await writeFile(
  "dist/robots.txt",
  "User-agent: *\nAllow: /\nDisallow: /seller/\nDisallow: /account/\nDisallow: /checkout\n",
);
await mkdir("dist/licenses", { recursive: true });
await copyFile(
  "node_modules/@fontsource/inter/LICENSE",
  "dist/licenses/Inter-LICENSE.txt",
);
await copyFile(
  "node_modules/@fontsource/space-grotesk/LICENSE",
  "dist/licenses/Space-Grotesk-LICENSE.txt",
);
