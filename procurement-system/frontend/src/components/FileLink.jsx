/**
 * Opens uploaded files from the API origin (static /uploads).
 * Paths may be stored as "uploads/.." or "/uploads/..".
 */
const apiOrigin =
  (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/i, '')) ||
  'http://localhost:5000';

export default function FileLink({ url, label }) {
  if (!url) {
    return <span className="text-red-500 text-sm">Not uploaded</span>;
  }
  const path = String(url).replace(/^\//, '');
  const href = path.startsWith('http') ? path : `${apiOrigin}/${path}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">
      View {label}
    </a>
  );
}
