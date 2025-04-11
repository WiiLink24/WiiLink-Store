// @ts-check
import { defineConfig } from 'astro/config';
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss()],
    },
    site: "https://store.wiilink.ca",
    integrations: [icon({
        iconDir: "public/icons",
        include: {
            "lucide": ["info", "film", "house", "mail-open", "newspaper", "book", "arrow-right", "circle-alert", "server", "package", "package-open", "users", "tag", "id-card", "stamp", "bookmark", "disc", "shield", "feather", "moon", "sun", "arrow-up-right", "menu", "earth", "shopping-basket", "smile", "zap", "chart-pie", "video", "mic", "tv", "circle", "truck", "camera", "bot", "leaf", "chevron-down", "presentation", "umbrella", "mail", "rss", "chevron-left", "chevron-right", "brush", "refresh-cw", "shopping-bag", "shopping-cart", "home", "box"],
            "simple-icons": ["twitter", "bluesky", "instagram", "youtube"]
        }
    })],
});
