export default function ThemeScript() {
  const script = `
    (() => {
      try {
        const key = "deepscan:theme";
        const saved = localStorage.getItem(key);
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const theme = saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light");
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        root.style.colorScheme = theme;
      } catch {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
