import { defineConfig } from "vite";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/cesium/Build/Cesium",
          dest: "" // copy vào /cesium ở thư mục build
        }
      ]
    })
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify("/Cesium")
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  server: {
    //host: "0.0.0.0",
    port: 8080
  }
});